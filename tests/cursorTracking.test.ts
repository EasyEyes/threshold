/**
 * @jest-environment jsdom
 *
 * Cursor sampling (@saveCursorPositionBool / saveCursorTrackingHz): the
 * interval lifecycle and the shape of one recorded sample.
 */

import {
  jest,
  expect,
  describe,
  test,
  beforeEach,
  afterEach,
} from "@jest/globals";

const state = {
  status: {
    currentFunction: "trialRoutineEachFrame",
    block: 2,
    block_condition: "2_1",
    trial: 5,
  },
  thisExperimentInfo: { experiment: "My Study", participant: "P1" },
  viewingDistanceCm: { current: 60 },
  showConditionNameConfig: { name: "condition one" },
  cursorTracking: { target: undefined as any, records: [] as any[] },
};

jest.mock("../components/global", () => ({
  get status() {
    return state.status;
  },
  get thisExperimentInfo() {
    return state.thisExperimentInfo;
  },
  get viewingDistanceCm() {
    return state.viewingDistanceCm;
  },
  get showConditionNameConfig() {
    return state.showConditionNameConfig;
  },
  get cursorTracking() {
    return state.cursorTracking;
  },
  fixationConfig: {},
}));

jest.mock("../components/multiple-displays/globals", () => ({
  Screens: [
    {
      fixationConfig: { pos: [10, 20], stim: undefined },
      pxPerCm: 40,
      nearestPointXYZPx: [1, 2],
    },
  ],
}));

jest.mock("../components/eyeTrackingFacilitation", () => ({
  getScreenDimensions: () => [1280, 720],
  getAppleCoordinatePosition: (x: number, y: number) => `${x},${y}`,
}));

jest.mock("../components/utils", () => ({
  getCursorLocation: () => [100, 200],
}));

type Module = typeof import("../components/cursorTracking");

/** Fresh module per test: the sample interval lives in module scope. */
const freshModule = (): Module => {
  let mod: Module;
  jest.isolateModules(() => {
    mod = require("../components/cursorTracking");
  });
  return mod!;
};

const reader = (options: { save?: boolean; hz?: number; hzByBlock?: number }) =>
  ({
    readBoolean: jest.fn(() => [options.save ?? true]),
    readNumber: jest.fn(() => [options.hzByBlock ?? options.hz ?? 10]),
  }) as any;

beforeEach(() => {
  jest.useFakeTimers();
  state.cursorTracking.records = [];
  state.cursorTracking.target = undefined;
  state.status.currentFunction = "trialRoutineEachFrame";
});

afterEach(() => {
  jest.useRealTimers();
});

describe("trackCursor", () => {
  test("samples nothing unless the block asks for it", () => {
    const { trackCursor } = freshModule();
    trackCursor(reader({ save: false }));
    jest.advanceTimersByTime(1000);
    expect(state.cursorTracking.records).toHaveLength(0);
  });

  test("records one sample per interval with the experiment's state", () => {
    const { trackCursor } = freshModule();
    trackCursor(reader({ hz: 10 })); // 100 ms
    jest.advanceTimersByTime(250);

    expect(state.cursorTracking.records).toHaveLength(2);
    const record = state.cursorTracking.records[0];
    expect(record.experiment).toBe("My Study");
    expect(record.pavloviaSessionId).toBe("P1");
    expect(record.blockNumber).toBe(2);
    expect(record.block_condition).toBe("2_1");
    expect(record.conditionNumber).toBe(1);
    expect(record.conditionName).toBe("condition one");
    expect(record.trialNumber).toBe(5);
    expect(record.cursorPositionXYPx).toBe("100,200");
    expect(record.crosshairPositionXYPx).toBe("10,20");
    expect(record.screenWidthPx).toBe(1280);
    expect(record.screenHeightPx).toBe(720);
    expect(record.pxPerCm).toBe("40");
    expect(record.viewingDistanceCm).toBe("60");
    expect(record.nearpointXYPx).toBe("1,2");
    expect(record.trialStep).toBe("trialRoutineEachFrame");
  });

  test("a repeated call does not start a second interval", () => {
    const { trackCursor } = freshModule();
    trackCursor(reader({ hz: 10 }));
    trackCursor(reader({ hz: 10 }));
    jest.advanceTimersByTime(250);
    expect(state.cursorTracking.records).toHaveLength(2);
  });

  test("instruction-phase samples never claim a target or crosshair", () => {
    const { trackCursor } = freshModule();
    state.status.currentFunction = "instructions_instructionRoutineEachFrame";
    trackCursor(reader({ hz: 10 }));
    jest.advanceTimersByTime(100);
    const record = state.cursorTracking.records[0];
    expect(record.targetBool).toBe(false);
    expect(record.crosshairBool).toBe(false);
  });
});

describe("updateTrackCursorHz", () => {
  test("re-arms the interval at the new sampling rate", () => {
    const { trackCursor, updateTrackCursorHz } = freshModule();
    trackCursor(reader({ hz: 10 })); // 100 ms
    updateTrackCursorHz(reader({ hzByBlock: 4 })); // 250 ms
    jest.advanceTimersByTime(500);
    expect(state.cursorTracking.records).toHaveLength(2);
  });

  test("is a no-op before tracking started", () => {
    const { updateTrackCursorHz } = freshModule();
    updateTrackCursorHz(reader({ hzByBlock: 4 }));
    jest.advanceTimersByTime(1000);
    expect(state.cursorTracking.records).toHaveLength(0);
  });
});

describe("defineTargetForCursorTracking", () => {
  test("stores the stimulus that samples will report against", () => {
    const { defineTargetForCursorTracking } = freshModule();
    const stim = { _autoDraw: true, _pos: [5, 6] };
    defineTargetForCursorTracking(stim);
    expect(state.cursorTracking.target).toBe(stim);
  });
});
