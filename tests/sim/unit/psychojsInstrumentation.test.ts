/**
 * @jest-environment jsdom
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

const setStateCalls: Array<Record<string, unknown>> = [];
jest.mock("../../../components/simulatedState", () => ({
  setEEState: (u: Record<string, unknown>) => setStateCalls.push(u),
}));

import {
  ALLOWLIST,
  serializeStimValue,
  stimChangeToStateUpdate,
  stimChangeReporter,
  enableInstrumentation,
} from "../../../components/psychojsInstrumentation";

beforeEach(() => {
  setStateCalls.length = 0;
});

describe("ALLOWLIST", () => {
  test("includes core stim attrs", () => {
    expect(ALLOWLIST.has("text")).toBe(true);
    expect(ALLOWLIST.has("autoDraw")).toBe(true);
    expect(ALLOWLIST.has("pos")).toBe(true);
    expect(ALLOWLIST.has("size")).toBe(true);
    expect(ALLOWLIST.has("font")).toBe(true);
    expect(ALLOWLIST.has("color")).toBe(true);
  });

  test("includes threshold-relevant attrs (contrast, opacity)", () => {
    expect(ALLOWLIST.has("contrast")).toBe(true);
    expect(ALLOWLIST.has("opacity")).toBe(true);
  });

  test("includes RTL/layout attrs (alignHoriz, letterHeight, wrapWidth, flipHoriz)", () => {
    expect(ALLOWLIST.has("alignHoriz")).toBe(true);
    expect(ALLOWLIST.has("letterHeight")).toBe(true);
    expect(ALLOWLIST.has("wrapWidth")).toBe(true);
    expect(ALLOWLIST.has("flipHoriz")).toBe(true);
  });

  test("excludes units, depth (internal)", () => {
    expect(ALLOWLIST.has("units")).toBe(false);
    expect(ALLOWLIST.has("depth")).toBe(false);
  });
});

describe("serializeStimValue", () => {
  test("arrays → CSV", () => {
    expect(serializeStimValue([100, 200])).toBe("100,200");
  });
  test("strings pass through", () => {
    expect(serializeStimValue("hello")).toBe("hello");
  });
  test("numbers → JSON", () => {
    expect(serializeStimValue(42)).toBe("42");
  });
  test("objects → JSON", () => {
    expect(serializeStimValue({ r: 1, g: 0 })).toBe('{"r":1,"g":0}');
  });
  test('null → empty string (not "null", not undefined)', () => {
    expect(serializeStimValue(null)).toBe("");
  });
  test("undefined → empty string (not the literal undefined)", () => {
    expect(serializeStimValue(undefined)).toBe("");
  });
  test("circular object → safe sentinel (does not throw)", () => {
    const cir: Record<string, unknown> = {};
    cir.self = cir;
    expect(serializeStimValue(cir)).toBe("[unserializable]");
  });
  test("circular array → safe sentinel", () => {
    const cir: unknown[] = [];
    cir.push(cir);
    expect(serializeStimValue(cir)).toBe("[unserializable]");
  });
  test('NaN → "NaN" (distinguishable from null)', () => {
    expect(serializeStimValue(NaN)).toBe("NaN");
  });
  test('Infinity → "Infinity"', () => {
    expect(serializeStimValue(Infinity)).toBe("Infinity");
  });
  test('booleans → "true"/"false"', () => {
    expect(serializeStimValue(true)).toBe("true");
    expect(serializeStimValue(false)).toBe("false");
  });
});

describe("stimChangeToStateUpdate", () => {
  test("text → { stim<Name>Text: value } preserving camelCase", () => {
    expect(
      stimChangeToStateUpdate("trialCounter", "text", "Trial 3/10"),
    ).toEqual({
      stimTrialCounterText: "Trial 3/10",
    });
  });

  test("autoDraw → stringified bool, camelCase preserved", () => {
    expect(stimChangeToStateUpdate("target", "autoDraw", true)).toEqual({
      stimTargetAutoDraw: "true",
    });
  });

  test("pos → CSV", () => {
    expect(stimChangeToStateUpdate("fixation", "pos", [100, 200])).toEqual({
      stimFixationPos: "100,200",
    });
  });

  test("returns null for non-allowlisted attrs", () => {
    expect(stimChangeToStateUpdate("target", "units", "pix")).toBeNull();
    expect(stimChangeToStateUpdate("target", "depth", 0)).toBeNull();
  });

  test("contrast IS allowlisted (threshold-relevant)", () => {
    expect(stimChangeToStateUpdate("target", "contrast", 0.5)).toEqual({
      stimTargetContrast: "0.5",
    });
  });

  test("sanitizes non-alphanumeric stim names", () => {
    const result = stimChangeToStateUpdate("my-stim_1!", "text", "x");
    expect(result).toEqual({ stimMystim1Text: "x" });
  });

  test("preserves internal camelCase (no separators)", () => {
    const result = stimChangeToStateUpdate("trialCounter", "autoDraw", true);
    expect(result).toEqual({ stimTrialCounterAutoDraw: "true" });
  });

  test("handles null/undefined stim name safely (returns null)", () => {
    expect(
      stimChangeToStateUpdate(null as unknown as string, "text", "x"),
    ).toBeNull();
  });
});

describe("stimChangeReporter", () => {
  test("calls setEEState with allowlisted attr", () => {
    stimChangeReporter.call({ _name: "target" }, "autoDraw", true);
    expect(setStateCalls).toHaveLength(1);
    expect(setStateCalls[0]).toEqual({ stimTargetAutoDraw: "true" });
  });

  test("does NOT call setEEState for non-allowlisted attr", () => {
    stimChangeReporter.call({ _name: "target" }, "depth", 0);
    expect(setStateCalls).toHaveLength(0);
  });

  test("emits console.debug for allowlisted attr", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
    stimChangeReporter.call({ _name: "target" }, "autoDraw", true);
    expect(spy).toHaveBeenCalledWith('[sim:stim] target.autoDraw = "true"');
    spy.mockRestore();
  });

  test("does NOT emit console.debug for non-allowlisted attr", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
    stimChangeReporter.call({ _name: "target" }, "depth", 0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("does NOT throw on circular value (logs sentinel)", () => {
    const cir: Record<string, unknown> = {};
    cir.self = cir;
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
    expect(() =>
      stimChangeReporter.call({ _name: "target" }, "color", cir),
    ).not.toThrow();
    expect(setStateCalls[0]).toEqual({ stimTargetColor: "[unserializable]" });
    spy.mockRestore();
  });
});

/**
 * Mirror the post-revert PsychoJS layout: a base "PsychObject" class defines
 * `_setAttribute` returning a hasChanged boolean; the stim subclass inherits
 * it WITHOUT overriding. This is the layout against which Option C must work.
 */
function makeFakeStimHierarchy() {
  // Track calls to the underlying _setAttribute so tests can assert that the
  // wrapper delegates correctly and only fires _reportChange on change.
  const baseCalls: Array<{
    name: string;
    value: unknown;
    self: unknown;
  }> = [];

  class FakePsychObject {
    _name = "";
    _setAttribute(
      name: string,
      value: unknown,
      _log = false,
      _operation?: unknown,
      _stealth?: boolean,
    ): boolean {
      baseCalls.push({ name, value, self: this });
      const k = "_" + name;
      const prev = (this as any)[k];
      (this as any)[k] = value;
      // Mirror PsychObject semantics: undefined-prev → false, else compare.
      return prev !== undefined && prev !== value;
    }
  }

  // MinimalStim: extends PsychObject, does NOT override _setAttribute
  // (matching the threshold-prod PsychoJS state).
  class FakeMinimalStim extends FakePsychObject {
    constructor(name = "target") {
      super();
      this._name = name;
    }
  }

  return { FakePsychObject, FakeMinimalStim, baseCalls };
}

describe("enableInstrumentation (Option C: runtime wrap of inherited _setAttribute)", () => {
  test("BEFORE enableInstrumentation, subclass does NOT shadow _setAttribute", () => {
    const { FakePsychObject, FakeMinimalStim } = makeFakeStimHierarchy();
    // Prototype lookup resolves through the chain to FakePsychObject.
    expect(
      Object.getOwnPropertyDescriptor(
        FakeMinimalStim.prototype,
        "_setAttribute",
      ),
    ).toBeUndefined();
    expect(FakeMinimalStim.prototype._setAttribute).toBe(
      FakePsychObject.prototype._setAttribute,
    );
  });

  test("AFTER enableInstrumentation, subclass shadows _setAttribute with a new wrap", () => {
    const { FakePsychObject, FakeMinimalStim } = makeFakeStimHierarchy();
    const originalInherited = FakeMinimalStim.prototype._setAttribute;
    enableInstrumentation(FakeMinimalStim);
    const after = Object.getOwnPropertyDescriptor(
      FakeMinimalStim.prototype,
      "_setAttribute",
    )?.value;
    expect(typeof after).toBe("function");
    expect(after).not.toBe(originalInherited);
    // The wrap must delegate to the original; it is NOT a re-implementation.
    // (We assert this via behavior in the next tests.)
  });

  test("AFTER enableInstrumentation, _reportChange is installed on the subclass prototype", () => {
    const { FakeMinimalStim } = makeFakeStimHierarchy();
    expect(FakeMinimalStim.prototype._reportChange).toBeUndefined();
    enableInstrumentation(FakeMinimalStim);
    expect(FakeMinimalStim.prototype._reportChange).toBe(stimChangeReporter);
  });

  test("wrapped _setAttribute delegates to the original and returns its value", () => {
    const { FakeMinimalStim, baseCalls } = makeFakeStimHierarchy();
    enableInstrumentation(FakeMinimalStim);
    const stim = new FakeMinimalStim("target");
    // First set: prev is undefined → PsychObject returns false.
    const r1 = stim._setAttribute("text", "hello");
    expect(r1).toBe(false);
    expect(baseCalls).toHaveLength(1);
    expect(baseCalls[0]).toMatchObject({ name: "text", value: "hello" });
    // Second set with a different value: prev exists, different → true.
    const r2 = stim._setAttribute("text", "world");
    expect(r2).toBe(true);
    expect(baseCalls).toHaveLength(2);
  });

  test("wrapped _setAttribute calls _reportChange ONLY when hasChanged is true", () => {
    const { FakeMinimalStim } = makeFakeStimHierarchy();
    enableInstrumentation(FakeMinimalStim);
    const stim = new FakeMinimalStim("target");

    // First set: hasChanged=false (prev undefined) → no stimChangeReporter.
    stim._setAttribute("autoDraw", true);
    expect(setStateCalls).toHaveLength(0);

    // Second set: same value → hasChanged=false → no report.
    stim._setAttribute("autoDraw", true);
    expect(setStateCalls).toHaveLength(0);

    // Third set: different value → hasChanged=true → report fires.
    stim._setAttribute("autoDraw", false);
    expect(setStateCalls).toHaveLength(1);
    expect(setStateCalls[0]).toEqual({ stimTargetAutoDraw: "false" });
  });

  test("wrapped _setAttribute does NOT call _reportChange for non-allowlisted attrs even on change", () => {
    const { FakeMinimalStim } = makeFakeStimHierarchy();
    enableInstrumentation(FakeMinimalStim);
    const stim = new FakeMinimalStim("target");
    // First set establishes prev; second changes it but `units` is excluded.
    stim._setAttribute("units", "pix");
    stim._setAttribute("units", "norm");
    expect(setStateCalls).toHaveLength(0);
  });

  test("wrapped _setAttribute preserves the original's `this` binding", () => {
    const { FakeMinimalStim, baseCalls } = makeFakeStimHierarchy();
    enableInstrumentation(FakeMinimalStim);
    const stim = new FakeMinimalStim("target");
    stim._setAttribute("pos", [1, 2]);
    expect(baseCalls[0].self).toBe(stim);
  });

  test("enableInstrumentation is idempotent (calling twice does not double-wrap)", () => {
    const { FakeMinimalStim, baseCalls } = makeFakeStimHierarchy();
    enableInstrumentation(FakeMinimalStim);
    const wrappedOnce = Object.getOwnPropertyDescriptor(
      FakeMinimalStim.prototype,
      "_setAttribute",
    )?.value;
    enableInstrumentation(FakeMinimalStim);
    const wrappedTwice = Object.getOwnPropertyDescriptor(
      FakeMinimalStim.prototype,
      "_setAttribute",
    )?.value;
    // If idempotent, the second call sees its own wrap as "original" and
    // re-wraps. We assert this does NOT happen — the same wrap is kept and
    // the underlying base method is called exactly once per setAttribute.
    expect(wrappedOnce).toBe(wrappedTwice);
    const stim = new FakeMinimalStim("target");
    stim._setAttribute("autoDraw", true);
    stim._setAttribute("autoDraw", false);
    expect(baseCalls).toHaveLength(2);
  });

  test("base class _setAttribute is NOT mutated (only the subclass prototype)", () => {
    const { FakePsychObject, FakeMinimalStim } = makeFakeStimHierarchy();
    const baseBefore = FakePsychObject.prototype._setAttribute;
    enableInstrumentation(FakeMinimalStim);
    expect(FakePsychObject.prototype._setAttribute).toBe(baseBefore);
    expect(
      Object.getOwnPropertyDescriptor(
        FakePsychObject.prototype,
        "_reportChange",
      ),
    ).toBeUndefined();
  });
});

// ─── Allowlist coverage against real PsychoJS attribute names ─────────────────
//
// PsychoJS's `_addAttribute` (PsychObject.js:348) is the canonical way stim
// attributes are declared. It auto-generates a `setX` method that calls
// `_setAttribute(name, value, log)`, so EVERY `_addAttribute("foo", …)` routes
// through our wrap. This block locks in coverage of the attribute names that
// real PsychoJS uses — particularly the TextStim vs TextBox discrepancy where
// the *same concept* (letter height) is named differently (`height` vs
// `letterHeight`).
//
// Refs:
//   psychojs/src/visual/TextStim.js:156  →  _addAttribute("height", …)
//   psychojs/src/visual/TextBox.js:127   →  _addAttribute("letterHeight", …)
describe("ALLOWLIST covers real PsychoJS attribute names", () => {
  test("'height' (TextStim's letter-height attr) fires setEEState on change", () => {
    const { FakeMinimalStim } = makeFakeStimHierarchy();
    enableInstrumentation(FakeMinimalStim);
    const stim = new FakeMinimalStim("target");
    // Establish prev value (first set → hasChanged=false → no report).
    stim._setAttribute("height", 0.5);
    expect(setStateCalls).toHaveLength(0);
    // Now change it — should fire.
    stim._setAttribute("height", 0.6);
    expect(setStateCalls).toEqual([{ stimTargetHeight: "0.6" }]);
  });

  test("'letterHeight' (TextBox's letter-height attr) fires setEEState on change", () => {
    const { FakeMinimalStim } = makeFakeStimHierarchy();
    enableInstrumentation(FakeMinimalStim);
    const stim = new FakeMinimalStim("target");
    stim._setAttribute("letterHeight", 0.5);
    expect(setStateCalls).toHaveLength(0);
    stim._setAttribute("letterHeight", 0.6);
    expect(setStateCalls).toEqual([{ stimTargetLetterHeight: "0.6" }]);
  });
});
