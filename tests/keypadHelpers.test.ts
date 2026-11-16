/**
 * Unit coverage for the pure keypad-level helpers of components/keypad.js:
 * needKeypadThisCondition, keypadRequiredInExperiment, and
 * convertAsterisksToList. The KeypadHandler's browser-only dependencies are
 * mocked; the helpers under test run for real.
 */

jest.mock("sweetalert2", () => ({
  __esModule: true,
  default: { fire: jest.fn(), close: jest.fn() },
}));
jest.mock("../components/interaction/inputGate", () => ({
  interactionInputIsBlocked: () => false,
}));
jest.mock("../psychojs/src/core/index.js", () => ({
  KeyPress: class {},
}));
jest.mock("../components/errorHandling.js", () => ({
  warning: jest.fn(),
}));
jest.mock("../components/simulatedState.ts", () => ({
  publishClickAffordance: jest.fn(),
  publishResponseEvent: jest.fn(),
  simulateActive: false,
}));
jest.mock("../components/global", () => ({
  status: { trial: 1, block: 1 },
  targetKind: { current: "identify" },
  rc: { language: { value: "en" } },
  _key_resp_allKeys: { current: [] },
  thisExperimentInfo: {},
  rsvpReadingResponse: {},
  proxyVariable_key_resp_allKeys: [],
}));
jest.mock("../components/readPhrases.js", () => ({
  readi18nPhrases: jest.fn((key: string) => `i18n:${key}`),
}));
jest.mock("../components/useSoundCalibration.js", () => ({
  getButtonsContainer: () => null,
}));
jest.mock("../components/utils", () => ({
  arraysEqual: (a: unknown[], b: unknown[]) =>
    JSON.stringify(a) === JSON.stringify(b),
  isBlockLabel: (label: string) => !isNaN(label as any),
  logger: () => {},
}));
jest.mock("../components/connectAPeer.js", () => ({
  ConnectionManager: class {},
}));

import {
  convertAsterisksToList,
  keypadRequiredInExperiment,
  needKeypadThisCondition,
} from "../components/keypad";

// A paramReader double: reads return per-condition values for block labels
// (arrays) and single values for condition labels.
const makeReader = (rows: Record<string, unknown>[]) => ({
  conditions: rows.map((r) => ({ block_condition: r.__BC })),
  read: (param: string, BC: string) => {
    const row = rows.find((r) => r.__BC === BC);
    return row ? row[param] : undefined;
  },
});

describe("needKeypadThisCondition", () => {
  it("block label: keypad needed when any viewing distance exceeds its threshold", () => {
    const reader = makeReader([
      {
        __BC: "1",
        viewingDistanceDesiredCm: [100, 50],
        needKeypadBeyondCm: [80, 80],
      },
    ]) as any;
    expect(needKeypadThisCondition(reader, "1")).toBe(true);
  });

  it("block label: not needed when no distance exceeds its threshold", () => {
    const reader = makeReader([
      {
        __BC: "1",
        viewingDistanceDesiredCm: [100, 50],
        needKeypadBeyondCm: [120, 80],
      },
    ]) as any;
    expect(needKeypadThisCondition(reader, "1")).toBe(false);
  });

  it("condition label: compares the single distance against the threshold", () => {
    const reader = makeReader([
      {
        __BC: "1_1",
        viewingDistanceDesiredCm: 100,
        needKeypadBeyondCm: 80,
      },
    ]) as any;
    expect(needKeypadThisCondition(reader, "1_1")).toBe(true);
    expect(
      needKeypadThisCondition(
        makeReader([
          {
            __BC: "1_2",
            viewingDistanceDesiredCm: 60,
            needKeypadBeyondCm: 80,
          },
        ]) as any,
        "1_2",
      ),
    ).toBe(false);
  });
});

describe("keypadRequiredInExperiment", () => {
  // reader double: per-param values, applied to every condition
  const readerWith = (values: Record<string, unknown>, BCs: string[]) => ({
    conditions: BCs.map((block_condition) => ({ block_condition })),
    read: (param: string) => values[param],
  });

  it("false when no condition wants a keypad and calibration is off", () => {
    const reader = readerWith(
      {
        viewingDistanceDesiredCm: 60,
        needKeypadBeyondCm: 80,
        _calibrateDistanceCheckBool: [false],
      },
      ["1_1"],
    );
    expect(keypadRequiredInExperiment(reader as any)).toBe(false);
  });

  it("true when any of several conditions needs the keypad", () => {
    // two conditions: 1_1 under threshold, 2_1 beyond — the per-condition
    // map must not collapse keys
    const perCondition: Record<string, Record<string, unknown>> = {
      "1_1": { viewingDistanceDesiredCm: 60, needKeypadBeyondCm: 80 },
      "2_1": { viewingDistanceDesiredCm: 100, needKeypadBeyondCm: 80 },
    };
    const reader = {
      conditions: [{ block_condition: "1_1" }, { block_condition: "2_1" }],
      read: (param: string, BC: string) =>
        param === "_calibrateDistanceCheckBool"
          ? [false]
          : perCondition[BC][param],
    };
    expect(keypadRequiredInExperiment(reader as any)).toBe(true);
  });

  it("true when the distance-check distance exceeds the keypad threshold", () => {
    // condition itself does not need the keypad (60 < 80), but the
    // track-distance check target (100 cm) does
    const reader = readerWith(
      {
        viewingDistanceDesiredCm: 60,
        needKeypadBeyondCm: 80,
        _calibrateDistanceCheckBool: [true],
        _calibrateDistanceCheckCm: ["100, 40"],
      },
      ["1_1"],
    );
    expect(keypadRequiredInExperiment(reader as any)).toBe(true);
  });

  it("handles a scalar (non-list) _calibrateDistanceCheckCm value", () => {
    const base = {
      viewingDistanceDesiredCm: 60,
      needKeypadBeyondCm: 80,
      _calibrateDistanceCheckBool: [true],
    };
    expect(
      keypadRequiredInExperiment(
        readerWith({ ...base, _calibrateDistanceCheckCm: [100] }, [
          "1_1",
        ]) as any,
      ),
    ).toBe(true);
    expect(
      keypadRequiredInExperiment(
        readerWith({ ...base, _calibrateDistanceCheckCm: [40] }, [
          "1_1",
        ]) as any,
      ),
    ).toBe(false);
  });
});

describe("convertAsterisksToList (keypad)", () => {
  it("wraps bullets in a list and closes before a numbered step", () => {
    const out = convertAsterisksToList("* a<br>* b<br>3. go");
    expect(out).toContain("<li>a</li>");
    expect(out).toContain("<li>b</li>");
    expect(out).toMatch(/<\/li><\/ul>3\. go/);
  });

  it("passes through plain text", () => {
    expect(convertAsterisksToList("hello world")).toBe("hello world");
  });
});
