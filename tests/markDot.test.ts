/** @jest-environment jsdom */

jest.mock("../components/global", () => ({
  viewingDistanceCm: { current: 50 },
  grid: { current: undefined, units: undefined },
  fixationConfig: { pos: [0, 0], nominalPos: [0, 0] },
  screenBackground: undefined,
}));
jest.mock("../components/utils.js", () => ({
  pxScalar: (d: number) => d * 40,
  xyPxOfDeg: jest.fn(),
  xyDegOfPx: jest.fn(),
  colorRGBASnippetToRGBA: (c: unknown) => c,
  degreesToPixels: (d: number) => d * 40,
  isInRect: jest.fn(),
}));
jest.mock("../components/globalPsychoJS", () => ({
  psychoJS: { window: { getActualFrameRate: () => 60 } },
}));
jest.mock("../psychojs/src/visual/index.js", () => ({
  ShapeStim: class {
    pos: number[];
    constructor(public o: any) {
      this.pos = o.pos;
    }
    setAutoDraw() {}
    setPos(pos: number[]) {
      this.pos = pos;
    }
  },
  Polygon: class {
    pos: number[];
    autoDraw = false;
    constructor(public o: any) {
      this.pos = o.pos;
    }
    setAutoDraw(value: boolean) {
      this.autoDraw = value;
    }
    setPos(pos: number[]) {
      this.pos = pos;
    }
  },
}));
jest.mock("../psychojs/src", () => ({
  util: { Color: class {} },
}));
jest.mock("../psychojs/src/core", () => ({
  PsychoJS: { Status: { NOT_STARTED: 401, STARTED: 402, FINISHED: 403 } },
}));
jest.mock("../psychojs/src/util/index.js", () => ({
  Color: class {
    static COLOR_SPACE = { RGB: 1 };
  },
}));

import {
  Dot,
  getBackGrid,
  getDot,
  updateMarkingStimsEveryFrame,
} from "../components/dotAndGrid";
import type { DotSpec } from "../components/markDotParams";
import { Screens } from "../components/multiple-displays/globals";
import { XYPxOfDeg } from "../components/multiple-displays/utils";
import { PsychoJS } from "../psychojs/src/core";

const NOMINAL = [10, 20];
const MOVING = [100, -40];

const setup = () => {
  Screens[0].pxPerCm = 40;
  Screens[0].viewingDistanceCm = 50;
  Screens[0].nearestPointXYZPx = [0, 0];
  Screens[0].fixationXYZPx = [0, 0, 0];
  Screens[0].fixationConfig.nominalPos = [...NOMINAL];
  Screens[0].fixationConfig.pos = [...MOVING];
};

const spec = (overrides: Partial<DotSpec> = {}): DotSpec => ({
  xyDeg: [1, -2],
  diameterDeg: 0.5,
  colorRGBA: "0,0,0,1",
  trackFixationBool: false,
  ...overrides,
});

describe("getDot and Dot coordinate origin", () => {
  beforeEach(setup);

  test("undefined spec produces no dot", () => {
    expect(getDot(undefined)).toBeUndefined();
  });

  test("trackFixation FALSE positions relative to fixed nominal fixation", () => {
    const dot = getDot(spec({ trackFixationBool: false }))!;
    expect(dot.pos).toEqual(XYPxOfDeg(0, [1, -2], false));
    expect(dot.pos).not.toEqual(XYPxOfDeg(0, [1, -2], true));
  });

  test("trackFixation TRUE positions relative to current crosshair", () => {
    const dot = getDot(spec({ trackFixationBool: true }))!;
    expect(dot.pos).toEqual(XYPxOfDeg(0, [1, -2], true));
  });

  test("tracking dot follows the crosshair every frame", () => {
    const dot = getDot(spec({ trackFixationBool: true }))!;
    Screens[0].fixationConfig.pos = [220, 80];
    dot.everyFrame();
    const expected = XYPxOfDeg(0, [1, -2], true);
    expect(dot.pos).toEqual(expected);
    expect(dot.stim.pos).toEqual(expected);
  });

  test("nominal dot ignores crosshair motion", () => {
    const dot = getDot(spec({ trackFixationBool: false }))!;
    const initial = [...dot.pos];
    const setPos = jest.spyOn(dot.stim, "setPos");
    Screens[0].fixationConfig.pos = [999, 999];
    dot.everyFrame();
    expect(dot.pos).toEqual(initial);
    expect(dot.stim.pos).toEqual(initial);
    expect(setPos).not.toHaveBeenCalled();
  });

  test("diameter and color are transferred to the polygon", () => {
    const dot = getDot(
      spec({ diameterDeg: 1, colorRGBA: "1,0,0,0.25" }),
    ) as any;
    expect(Math.abs(dot.diameterPx)).toBeGreaterThan(0);
    expect(dot.color).toEqual([1, -1, -1]);
    expect(dot.opacity).toBe(0.25);
    expect(dot.stim.o.radius).toBe(dot.diameterPx / 2);
  });

  test("draw toggles autoDraw and status", () => {
    const dot = getDot(spec())!;
    expect(dot.status).toBe(PsychoJS.Status.NOT_STARTED);
    dot.draw();
    expect(dot.status).toBe(PsychoJS.Status.STARTED);
    expect((dot.stim as any).autoDraw).toBe(true);
    dot.draw(false);
    expect(dot.status).toBe(PsychoJS.Status.FINISHED);
    expect((dot.stim as any).autoDraw).toBe(false);
  });
});

describe("marking frame owner", () => {
  beforeEach(setup);

  test("updates the tracking dot and swarm together", () => {
    const dot = getDot(spec({ trackFixationBool: true }))!;
    const swarm = { everyFrame: jest.fn() };
    Screens[0].fixationConfig.pos = [220, 80];

    updateMarkingStimsEveryFrame(dot, swarm as never);

    expect(swarm.everyFrame).toHaveBeenCalledTimes(1);
    expect(dot.pos).toEqual(XYPxOfDeg(0, [1, -2], true));
    expect(dot.stim.pos).toEqual(dot.pos);
  });

  test("accepts trials with no marking stimuli", () => {
    expect(() =>
      updateMarkingStimsEveryFrame(undefined, undefined),
    ).not.toThrow();
  });
});

describe("separate dot and grid factories own replacement release", () => {
  beforeEach(setup);

  test("getDot releases the previous dot", () => {
    const previous = { release: jest.fn() };
    expect(getDot(undefined, previous as never)).toBeUndefined();
    expect(previous.release).toHaveBeenCalled();
  });

  test("getBackGrid releases the previous grid", () => {
    const previous = { release: jest.fn() };
    expect(getBackGrid("malformed", previous as never)).toBeUndefined();
    expect(previous.release).toHaveBeenCalled();
  });

  test("factories accept the first trial without previous instances", () => {
    expect(() => getDot(undefined)).not.toThrow();
    expect(() => getBackGrid("malformed")).not.toThrow();
  });

  test("Dot.release releases its polygon", () => {
    const dot = getDot(spec())!;
    dot.stim.release = jest.fn();
    dot.release();
    expect(dot.stim.release).toHaveBeenCalled();
  });
});
