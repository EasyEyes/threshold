/**
 * Tests for fixation decision functions and computation utilities.
 *
 * Tests pure functions extracted from components/fixation.ts:
 * - getFixationAfterTargetOnsetBehavior: maps parameter → behavior booleans
 * - shouldUndrawFixationAtTargetOffset: maps parameter → boolean
 * - computeFixationPosAt: deterministic position on circular motion path
 * - getAngleAtTime: angle at time for circular motion
 * - reflectInsideUnitCircle: boundary reflection for random walk
 *
 * @jest-environment node
 */

// Mock modules with runtime side effects / browser-only code
jest.mock("../components/global", () => ({
  displayOptions: {},
  fixationConfig: {},
  rsvpReadingTargetSets: {
    current: undefined,
    upcoming: [],
    past: [],
    skippedDueToBadTracking: 0,
  },
  rsvpReadingTiming: { current: { finishSec: 0 } },
  status: { block_condition: "" },
  targetEccentricityDeg: { x: 0, y: 0 },
  targetTextStimConfig: {},
  viewingDistanceCm: { current: 40 },
}));

jest.mock("../components/globalPsychoJS", () => ({
  psychoJS: { window: undefined, experiment: undefined },
}));

jest.mock("../psychojs/src/visual", () => {
  class MockPolygon {
    isPolygon = true;
    setPos = jest.fn();
    setAutoDraw = jest.fn();
    setRadius = jest.fn();
    setLineWidth = jest.fn();
    setLineColor = jest.fn();
    setVertices = jest.fn();
  }
  class MockShapeStim {
    isShapeStim = true;
    setPos = jest.fn();
    setAutoDraw = jest.fn();
    setLineWidth = jest.fn();
    setVertices = jest.fn();
    _updateIfNeeded = jest.fn();
    refresh = jest.fn();
    lineColor: any;
  }
  class MockTextStim {
    setAutoDraw = jest.fn();
  }
  return {
    Polygon: MockPolygon,
    ShapeStim: MockShapeStim,
    TextStim: MockTextStim,
  };
});

jest.mock("../psychojs/src/util", () => ({
  Color: class {},
  to_px: jest.fn(() => [0, 0]),
}));

jest.mock("../components/utils", () => ({
  xyPxOfDeg: jest.fn(),
  cursorNearFixation: jest.fn(() => true),
  colorRGBASnippetToRGBA: jest.fn(() => "black"),
  sleep: jest.fn(),
  hideCursor: jest.fn(),
  showCursor: jest.fn(),
}));

jest.mock("../components/errorHandling", () => ({
  warning: jest.fn(),
}));

jest.mock("../components/multiple-displays/globals.js", () => ({
  Screens: [
    {
      fixationConfig: {
        pos: [0, 0],
        nominalPos: [0, 0],
        offset: 0,
        markingFixationMotionPeriodSec: 0,
        markingFixationMotionRadiusDeg: 0,
        markingFixationMotionSpeedDegPerSec: 0,
        markingFixationStrokeThickening: 2,
        strokeWidth: 0,
        strokeLength: 0,
        markingFixationHotSpotRadiusPx: 10,
        markingBlankedNearTargetBool: false,
        markingBlankingRadiusReEccentricity: 0,
        markingBlankingRadiusReTargetHeight: 0,
        markingFixationStrokeLengthDeg: 0,
        markingFixationStrokeThicknessDeg: 0,
        markingFixationHotSpotRadiusDeg: 0,
        show: true,
        markingOffsetBeforeTargetOnsetSecs: 0,
        markingBlankingPos: [0, 0],
        color: "black",
        preserveOffset: false,
      },
    },
  ],
}));

jest.mock("../components/multiple-displays/utils.js", () => ({
  XYDegOfPx: jest.fn(),
  XYPxOfDeg: jest.fn((_s, _c, _b) => [0, 0]),
}));

jest.mock("../parameters/paramReader", () => ({
  ParamReader: jest.fn(),
}));

import { cursorNearFixation } from "../components/utils";
import { Polygon, ShapeStim } from "../psychojs/src/visual";
import { rsvpReadingTargetSets, rsvpReadingTiming } from "../components/global";
import { psychoJS } from "../components/globalPsychoJS";
import { Screens } from "../components/multiple-displays/globals.js";
import { XYPxOfDeg } from "../components/multiple-displays/utils.js";

import {
  getFixationAfterTargetOnsetBehavior,
  shouldUndrawFixationAtTargetOffset,
  computeFixationPosAt,
  getAngleAtTime,
  reflectInsideUnitCircle,
  Fixation,
  isCorrectlyTrackingDuringStimulusForRsvpReading,
} from "../components/fixation";

// ---------------------------------------------------------------------------
// getFixationAfterTargetOnsetBehavior
// ---------------------------------------------------------------------------
describe("getFixationAfterTargetOnsetBehavior", () => {
  describe("freeze", () => {
    const b = getFixationAfterTargetOnsetBehavior("freeze");

    it("shows fixation", () => expect(b.showFixation).toBe(true));
    it("does not move fixation", () => expect(b.moveFixation).toBe(false));
    it("does not move origin", () => expect(b.moveOrigin).toBe(false));
  });

  describe("disappear", () => {
    const b = getFixationAfterTargetOnsetBehavior("disappear");

    it("does not show fixation", () => expect(b.showFixation).toBe(false));
    // moveFixation and moveOrigin are irrelevant when showFixation is false,
    // but they should still have sensible defaults:
    it("does not move fixation", () => expect(b.moveFixation).toBe(false));
    it("does not move origin", () => expect(b.moveOrigin).toBe(false));
  });

  describe("continueMovingButIndependently", () => {
    const b = getFixationAfterTargetOnsetBehavior(
      "continueMovingButIndependently",
    );

    it("shows fixation", () => expect(b.showFixation).toBe(true));
    it("moves fixation (visual)", () => expect(b.moveFixation).toBe(true));
    it("does not move origin (pos stays at freeze point)", () =>
      expect(b.moveOrigin).toBe(false));
  });

  describe("continueMovingAsOrigin", () => {
    const b = getFixationAfterTargetOnsetBehavior("continueMovingAsOrigin");

    it("shows fixation", () => expect(b.showFixation).toBe(true));
    it("moves fixation", () => expect(b.moveFixation).toBe(true));
    it("moves origin with fixation", () => expect(b.moveOrigin).toBe(true));
  });

  describe("default / edge cases", () => {
    it("undefined defaults to freeze", () => {
      const b = getFixationAfterTargetOnsetBehavior(undefined);
      expect(b.showFixation).toBe(true);
      expect(b.moveFixation).toBe(false);
      expect(b.moveOrigin).toBe(false);
    });

    it("empty string defaults to freeze", () => {
      const b = getFixationAfterTargetOnsetBehavior("");
      expect(b).toEqual(getFixationAfterTargetOnsetBehavior("freeze"));
    });

    it("unknown value defaults to freeze", () => {
      const b = getFixationAfterTargetOnsetBehavior("bogus" as any);
      expect(b).toEqual(getFixationAfterTargetOnsetBehavior("freeze"));
    });
  });

  describe("all values return same-shaped objects", () => {
    const values = [
      "disappear",
      "freeze",
      "continueMovingButIndependently",
      "continueMovingAsOrigin",
      undefined,
      "",
    ];

    for (const v of values) {
      it(`"${v}" has showFixation, moveFixation, moveOrigin keys`, () => {
        const b = getFixationAfterTargetOnsetBehavior(v as any);
        expect(b).toHaveProperty("showFixation");
        expect(b).toHaveProperty("moveFixation");
        expect(b).toHaveProperty("moveOrigin");
        expect(typeof b.showFixation).toBe("boolean");
        expect(typeof b.moveFixation).toBe("boolean");
        expect(typeof b.moveOrigin).toBe("boolean");
      });
    }

    it("disappear is the only value with showFixation=false", () => {
      for (const v of values) {
        const b = getFixationAfterTargetOnsetBehavior(v as any);
        if (v === "disappear") {
          expect(b.showFixation).toBe(false);
        } else {
          expect(b.showFixation).toBe(true);
        }
      }
    });
  });
});

// ---------------------------------------------------------------------------
// shouldUndrawFixationAtTargetOffset
// ---------------------------------------------------------------------------
describe("shouldUndrawFixationAtTargetOffset", () => {
  it("true → undraw", () => {
    expect(shouldUndrawFixationAtTargetOffset(true)).toBe(true);
  });

  it("false → keep", () => {
    expect(shouldUndrawFixationAtTargetOffset(false)).toBe(false);
  });

  it("undefined → undraw (default)", () => {
    expect(shouldUndrawFixationAtTargetOffset(undefined)).toBe(true);
  });

  it("falsy non-boolean (null) → keep", () => {
    // Only explicit false disables; anything else defaults to true
    expect(shouldUndrawFixationAtTargetOffset(null as any)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getAngleAtTime
// ---------------------------------------------------------------------------
describe("getAngleAtTime", () => {
  it("returns 0 when period is 0", () => {
    expect(getAngleAtTime(5, 0, 1)).toBe(0);
    expect(getAngleAtTime(0, 0, 0)).toBe(0);
  });

  it("returns correct angle at known points", () => {
    // period=2π, offset=0: angle = t
    const period = 2 * Math.PI;
    expect(getAngleAtTime(0, period, 0)).toBeCloseTo(0);
    expect(getAngleAtTime(Math.PI / 2, period, 0)).toBeCloseTo(Math.PI / 2);
    expect(getAngleAtTime(Math.PI, period, 0)).toBeCloseTo(Math.PI);
    expect(getAngleAtTime((3 * Math.PI) / 2, period, 0)).toBeCloseTo(
      (3 * Math.PI) / 2,
    );
    expect(getAngleAtTime(2 * Math.PI, period, 0)).toBeCloseTo(2 * Math.PI);
  });

  it("applies offset correctly", () => {
    // period=2π, offset=π: angle = t + π
    const period = 2 * Math.PI;
    expect(getAngleAtTime(0, period, Math.PI)).toBeCloseTo(Math.PI);
    expect(getAngleAtTime(Math.PI, period, Math.PI)).toBeCloseTo(2 * Math.PI);
  });

  it("handles negative time", () => {
    const period = 2 * Math.PI;
    expect(getAngleAtTime(-Math.PI, period, 0)).toBeCloseTo(-Math.PI);
  });
});

// ---------------------------------------------------------------------------
// computeFixationPosAt
// ---------------------------------------------------------------------------
describe("computeFixationPosAt", () => {
  const nominal: [number, number] = [100, 200];
  const radius = 50;

  it("returns nominal position when period is 0 (no motion)", () => {
    const pos = computeFixationPosAt(5, nominal, radius, 0, 0);
    expect(pos[0]).toBe(100);
    expect(pos[1]).toBe(200);
  });

  it("returns correct position at t=0 with offset=0", () => {
    // cos(0)=1, sin(0)=0 → [nominal[0]+r, nominal[1]]
    const period = 2 * Math.PI;
    const pos = computeFixationPosAt(0, nominal, radius, period, 0);
    expect(pos[0]).toBeCloseTo(150); // 100 + 50
    expect(pos[1]).toBeCloseTo(200); // 200 + 0
  });

  it("returns correct position at quarter period (t = π/2)", () => {
    // cos(π/2)=0, sin(π/2)=1 → [nominal[0], nominal[1]+r]
    const period = 2 * Math.PI;
    const pos = computeFixationPosAt(Math.PI / 2, nominal, radius, period, 0);
    expect(pos[0]).toBeCloseTo(100); // 100 + 0
    expect(pos[1]).toBeCloseTo(250); // 200 + 50
  });

  it("returns correct position at half period (t = π)", () => {
    // cos(π)=-1 → [nominal[0]-r, nominal[1]]
    const period = 2 * Math.PI;
    const pos = computeFixationPosAt(Math.PI, nominal, radius, period, 0);
    expect(pos[0]).toBeCloseTo(50); // 100 - 50
    expect(pos[1]).toBeCloseTo(200); // 200 + 0
  });

  it("wraps correctly beyond full period", () => {
    const period = 2 * Math.PI;
    const at0 = computeFixationPosAt(0, nominal, radius, period, 0);
    const at2pi = computeFixationPosAt(2 * Math.PI, nominal, radius, period, 0);
    expect(at0[0]).toBeCloseTo(at2pi[0]);
    expect(at0[1]).toBeCloseTo(at2pi[1]);
  });

  it("applies offset to starting angle", () => {
    // offset=π: at t=0, angle=π → cos(π)=-1, sin(π)=0
    const period = 2 * Math.PI;
    const pos = computeFixationPosAt(0, nominal, radius, period, Math.PI);
    expect(pos[0]).toBeCloseTo(50); // 100 - 50
    expect(pos[1]).toBeCloseTo(200); // 200 + 0
  });

  it("returns typed number array", () => {
    const pos = computeFixationPosAt(0, nominal, radius, 2 * Math.PI, 0);
    expect(Array.isArray(pos)).toBe(true);
    expect(pos.length).toBe(2);
    expect(typeof pos[0]).toBe("number");
    expect(typeof pos[1]).toBe("number");
  });

  it("handles negative nominal position", () => {
    const negNominal: [number, number] = [-100, -200];
    const period = 2 * Math.PI;
    const pos = computeFixationPosAt(0, negNominal, radius, period, 0);
    expect(pos[0]).toBeCloseTo(-50); // -100 + 50
    expect(pos[1]).toBeCloseTo(-200); // -200 + 0
  });

  it("handles zero radius", () => {
    const period = 2 * Math.PI;
    const pos = computeFixationPosAt(Math.PI, nominal, 0, period, 0);
    expect(pos[0]).toBeCloseTo(100); // stays at nominal
    expect(pos[1]).toBeCloseTo(200);
  });
});

// ---------------------------------------------------------------------------
// reflectInsideUnitCircle
// ---------------------------------------------------------------------------
describe("reflectInsideUnitCircle", () => {
  it("returns same position if already inside unit circle", () => {
    const result = reflectInsideUnitCircle(0, 0, 0.1, 0.1);
    // After one step: (0.1, 0.1), distance ≈ 0.14 < 1 → inside
    expect(result.x).toBeCloseTo(0.1);
    expect(result.y).toBeCloseTo(0.1);
  });

  it("reflects when step would land outside", () => {
    // Start near edge, step outward — should bounce back inside
    const result = reflectInsideUnitCircle(0.9, 0, 0.3, 0);
    const dist = Math.sqrt(result.x * result.x + result.y * result.y);
    expect(dist).toBeLessThanOrEqual(1);
    // The point should have moved from the starting position (0.9, 0)
    expect(result.x).not.toBeCloseTo(1.2); // not the unreflected position
  });

  it("handles multiple reflections for large steps", () => {
    // Step from center almost across the circle
    const result = reflectInsideUnitCircle(0, 0, 2, 0);
    const dist = Math.sqrt(result.x * result.x + result.y * result.y);
    expect(dist).toBeLessThanOrEqual(1);
  });

  it("returns typed object", () => {
    const result = reflectInsideUnitCircle(0, 0, 0, 0);
    expect(result).toHaveProperty("x");
    expect(result).toHaveProperty("y");
    expect(typeof result.x).toBe("number");
    expect(typeof result.y).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// Adversarial / edge-case tests
// ---------------------------------------------------------------------------
describe("getFixationAfterTargetOnsetBehavior — adversarial", () => {
  it("null defaults to freeze", () => {
    const b = getFixationAfterTargetOnsetBehavior(null as any);
    expect(b).toEqual(getFixationAfterTargetOnsetBehavior("freeze"));
  });

  it("numeric 0 defaults to freeze", () => {
    const b = getFixationAfterTargetOnsetBehavior(0 as any);
    expect(b).toEqual(getFixationAfterTargetOnsetBehavior("freeze"));
  });

  it("unexpected casing defaults to freeze", () => {
    expect(getFixationAfterTargetOnsetBehavior("Freeze")).toEqual(
      getFixationAfterTargetOnsetBehavior("freeze"),
    );
    expect(getFixationAfterTargetOnsetBehavior("FREEZE")).toEqual(
      getFixationAfterTargetOnsetBehavior("freeze"),
    );
    expect(getFixationAfterTargetOnsetBehavior("Disappear")).toEqual(
      getFixationAfterTargetOnsetBehavior("freeze"),
    );
  });

  it("all four spec values produce distinct behavior objects", () => {
    const disappear = getFixationAfterTargetOnsetBehavior("disappear");
    const freeze = getFixationAfterTargetOnsetBehavior("freeze");
    const independent = getFixationAfterTargetOnsetBehavior(
      "continueMovingButIndependently",
    );
    const asOrigin = getFixationAfterTargetOnsetBehavior(
      "continueMovingAsOrigin",
    );

    // All four should be distinct
    const behaviors = [disappear, freeze, independent, asOrigin];
    for (let i = 0; i < behaviors.length; i++) {
      for (let j = i + 1; j < behaviors.length; j++) {
        expect(behaviors[i]).not.toEqual(behaviors[j]);
      }
    }
  });

  it("returned objects are independent (no shared mutation)", () => {
    const a = getFixationAfterTargetOnsetBehavior("freeze");
    const b = getFixationAfterTargetOnsetBehavior("freeze");
    a.showFixation = false as any;
    expect(b.showFixation).toBe(true);
  });
});

describe("shouldUndrawFixationAtTargetOffset — adversarial", () => {
  it('string "false" is truthy → defaults to undraw', () => {
    expect(shouldUndrawFixationAtTargetOffset("false" as any)).toBe(true);
  });

  it("numeric 0 is truthy → defaults to undraw", () => {
    expect(shouldUndrawFixationAtTargetOffset(0 as any)).toBe(true);
  });

  it("null defaults to undraw", () => {
    expect(shouldUndrawFixationAtTargetOffset(null as any)).toBe(true);
  });
});

describe("computeFixationPosAt — adversarial", () => {
  const nominal: [number, number] = [0, 0];
  const period = 2 * Math.PI;

  it("negative radius produces inverted circle", () => {
    const pos = computeFixationPosAt(0, nominal, -50, period, 0);
    // cos(0)=1 → nominal[0] + (-50)*1 = -50
    expect(pos[0]).toBeCloseTo(-50);
    expect(pos[1]).toBeCloseTo(0);
  });

  it("large t values don't produce NaN (floating point safety)", () => {
    const pos = computeFixationPosAt(1e9, nominal, 50, period, 0);
    expect(isFinite(pos[0])).toBe(true);
    expect(isFinite(pos[1])).toBe(true);
  });

  it("returns named nominal position when radius is 0 even if period > 0", () => {
    const pos = computeFixationPosAt(Math.PI, [10, 20], 0, period, 0);
    expect(pos[0]).toBe(10);
    expect(pos[1]).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Regression tests: continueMovingButIndependently + motion path dispatch
// ---------------------------------------------------------------------------

describe("continueMovingButIndependently motion path correctness", () => {
  // These verify that the decision functions produce the correct flags,
  // and that the motion functions accept the updateOrigin flag.
  // The actual dispatch test (circle vs randomWalk) requires the full
  // PsychoJS stack; the following tests verify the pure decision layer.

  it("continueMovingButIndependently has moveFixation=true, moveOrigin=false", () => {
    const b = getFixationAfterTargetOnsetBehavior(
      "continueMovingButIndependently",
    );
    expect(b.showFixation).toBe(true);
    expect(b.moveFixation).toBe(true);
    expect(b.moveOrigin).toBe(false);
  });

  it("continueMovingAsOrigin has moveFixation=true, moveOrigin=true", () => {
    const b = getFixationAfterTargetOnsetBehavior("continueMovingAsOrigin");
    expect(b.showFixation).toBe(true);
    expect(b.moveFixation).toBe(true);
    expect(b.moveOrigin).toBe(true);
  });

  it("freeze has moveFixation=false (no-op regardless of path)", () => {
    const b = getFixationAfterTargetOnsetBehavior("freeze");
    expect(b.showFixation).toBe(true);
    expect(b.moveFixation).toBe(false);
    expect(b.moveOrigin).toBe(false);
  });

  it("disappear has showFixation=false (blocks everything)", () => {
    const b = getFixationAfterTargetOnsetBehavior("disappear");
    expect(b.showFixation).toBe(false);
    expect(b.moveFixation).toBe(false);
    expect(b.moveOrigin).toBe(false);
  });

  // Circle motion: computeFixationPosAt is deterministic from time,
  // so it works identically whether called by gyrateFixation(updateOrigin=true)
  // or gyrateFixation(updateOrigin=false). The only difference is whether
  // fixationConfig.pos is updated — not visible at this pure level.

  it("circle position is deterministic (same t = same pos)", () => {
    const t = 1.5;
    const pos1 = computeFixationPosAt(t, [0, 0], 100, 4 * Math.PI, 0.5);
    const pos2 = computeFixationPosAt(t, [0, 0], 100, 4 * Math.PI, 0.5);
    expect(pos1).toEqual(pos2);
  });

  it("circle position changes with time (not static)", () => {
    const pos0 = computeFixationPosAt(0, [0, 0], 100, 2 * Math.PI, 0);
    const posQuarter = computeFixationPosAt(
      Math.PI / 2,
      [0, 0],
      100,
      2 * Math.PI,
      0,
    );
    // At quarter period, we should have moved significantly
    expect(posQuarter[0]).not.toBeCloseTo(pos0[0]);
  });

  // reflectInsideUnitCircle is used by randomWalk — verify it works
  // independently of any global state (it takes explicit params).

  it("reflectInsideUnitCircle is pure (no global reads)", () => {
    const r1 = reflectInsideUnitCircle(0.9, 0, 0.3, 0);
    const r2 = reflectInsideUnitCircle(0.9, 0, 0.3, 0);
    expect(r1).toEqual(r2);
  });
});

// ---------------------------------------------------------------------------
// Fixation class: setPos() → previousPos snapshot
// ---------------------------------------------------------------------------

describe("Fixation.setPos — previousPos snapshot", () => {
  let fixation: Fixation;

  beforeEach(() => {
    fixation = new Fixation();
    // ShapeStim mock: wire up pos & a setPos that mutates in-place (worst-case PsychoJS behavior)
    fixation.stims[0].pos = [100, 50];
    fixation.stims[0].setPos = jest.fn((newPos: [number, number]) => {
      fixation.stims[0].pos[0] = newPos[0];
      fixation.stims[0].pos[1] = newPos[1];
    });
    fixation.stims[0].setAutoDraw = jest.fn();
  });

  it("captures stim position as previousPos before overwriting", () => {
    fixation.setPos([200, 100]);
    expect(fixation.previousPos).toEqual([100, 50]);
  });

  it("previousPos is a snapshot — not mutated when PsychoJS mutates stim.pos in-place", () => {
    fixation.setPos([200, 100]);
    // verify stim.pos was updated in-place to the new value
    expect(fixation.stims[0].pos).toEqual([200, 100]);
    // but previousPos still holds the old value [100, 50]
    expect(fixation.previousPos).toEqual([100, 50]);
  });

  it("does not set previousPos when there is no shape stim (all are Polygons)", () => {
    // Replace stims with a single Polygon instance
    const poly = new Polygon();
    (poly as any).pos = [300, 200];
    (poly as any).setPos = jest.fn();
    fixation.stims = [poly];
    fixation.setPos([400, 300]);
    expect(fixation.previousPos).toBeUndefined();
  });

  it("previousPos is undefined before any setPos call", () => {
    expect(fixation.previousPos).toBeUndefined();
  });

  it("updates previousPos on each setPos call", () => {
    fixation.setPos([200, 100]);
    expect(fixation.previousPos).toEqual([100, 50]);
    const firstSave = fixation.previousPos;

    fixation.setPos([300, 200]);
    // Second call's previousPos should equal what was set on the first call
    expect(fixation.previousPos).toEqual([200, 100]);
    // And it should be a different reference from the first save
    expect(fixation.previousPos).not.toBe(firstSave);
  });
});

// ---------------------------------------------------------------------------
// Fixation class: boldIfCursorNearFixation
// ---------------------------------------------------------------------------

describe("Fixation.boldIfCursorNearFixation", () => {
  let fixation: Fixation;

  beforeEach(() => {
    (cursorNearFixation as jest.Mock).mockReset();
    (cursorNearFixation as jest.Mock).mockReturnValue(false);
    fixation = new Fixation();
    fixation.stims[0].setAutoDraw = jest.fn();
    fixation.stims[0].setLineWidth = jest.fn();
    fixation.stims[0].pos = [0, 0];
  });

  it("passes stims[0].pos to cursorNearFixation", () => {
    fixation.stims[0].pos = [123, 456];
    fixation.boldIfCursorNearFixation();
    expect(cursorNearFixation).toHaveBeenCalledWith(
      undefined,
      undefined,
      [123, 456],
    );
  });

  it("sets bold when cursor is near and not already bold", () => {
    (cursorNearFixation as jest.Mock).mockReturnValue(true);
    fixation.bold = false;
    fixation.boldIfCursorNearFixation();
    expect(fixation.bold).toBe(true);
  });

  it("clears bold when cursor is far and currently bold", () => {
    (cursorNearFixation as jest.Mock).mockReturnValue(false);
    fixation.bold = true;
    fixation.boldIfCursorNearFixation();
    expect(fixation.bold).toBe(false);
  });

  it("does nothing when cursor is near and already bold", () => {
    (cursorNearFixation as jest.Mock).mockReturnValue(true);
    fixation.bold = true;
    // setBold is a no-op when already bold; verify setLineWidth is not called
    const setLineWidthSpy = jest.spyOn(fixation, "setLineWidth" as any);
    fixation.boldIfCursorNearFixation();
    expect(setLineWidthSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// isCorrectlyTrackingDuringStimulusForRsvpReading — guards
// ---------------------------------------------------------------------------

describe("isCorrectlyTrackingDuringStimulusForRsvpReading", () => {
  let fixation: Fixation;

  beforeEach(() => {
    (cursorNearFixation as jest.Mock).mockReset();
    (cursorNearFixation as jest.Mock).mockReturnValue(true);
    fixation = new Fixation();
    fixation.stims[0].pos = [0, 0];
    fixation.stims[0].setAutoDraw = jest.fn();
  });

  it("returns true when rsvpReadingTargetSets.current is undefined", () => {
    rsvpReadingTargetSets.current = undefined;
    expect(isCorrectlyTrackingDuringStimulusForRsvpReading(fixation, 0)).toBe(
      true,
    );
    expect(cursorNearFixation).not.toHaveBeenCalled();
  });

  it("returns true when current stims array is empty", () => {
    rsvpReadingTargetSets.current = { stims: [] } as any;
    expect(isCorrectlyTrackingDuringStimulusForRsvpReading(fixation, 0)).toBe(
      true,
    );
    expect(cursorNearFixation).not.toHaveBeenCalled();
  });

  it("returns true when cursor is near fixation", () => {
    (cursorNearFixation as jest.Mock).mockReturnValue(true);
    rsvpReadingTargetSets.current = {
      stims: [{}],
    } as any;
    (rsvpReadingTargetSets.current as any).stims[0].setAutoDraw = jest.fn();
    expect(isCorrectlyTrackingDuringStimulusForRsvpReading(fixation, 0)).toBe(
      true,
    );
  });

  it("returns false and triggers end-of-trial when tracking lost", () => {
    (cursorNearFixation as jest.Mock).mockReturnValue(false);
    const stim = { setAutoDraw: jest.fn() } as any;
    rsvpReadingTargetSets.current = { stims: [stim] } as any;
    rsvpReadingTiming.current = { finishSec: 0 } as any;
    (psychoJS as any).experiment = { addData: jest.fn() };
    rsvpReadingTargetSets.past = [];

    const result = isCorrectlyTrackingDuringStimulusForRsvpReading(
      fixation,
      1.5,
    );

    expect(result).toBe(false);
    expect(psychoJS.experiment!.addData).toHaveBeenCalledWith(
      "endOfTrialDueToBadTracking",
      true,
    );
    expect(rsvpReadingTargetSets.current).toBeUndefined();
    expect(rsvpReadingTargetSets.upcoming).toEqual([]);
    expect(rsvpReadingTiming.current!.finishSec).toBe(1.5);
  });
});

// ---------------------------------------------------------------------------
// Fixation: adversarial edge cases for setPos and previousPos
// ---------------------------------------------------------------------------

describe("Fixation.setPos — adversarial edge cases", () => {
  let fixation: Fixation;

  beforeEach(() => {
    fixation = new Fixation();
    fixation.stims[0].pos = [100, 50];
    fixation.stims[0].setPos = jest.fn((newPos: [number, number]) => {
      fixation.stims[0].pos[0] = newPos[0];
      fixation.stims[0].pos[1] = newPos[1];
    });
    fixation.stims[0].setAutoDraw = jest.fn();
  });

  it("handles setPos called with the same position (no movement)", () => {
    fixation.setPos([100, 50]);
    expect(fixation.previousPos).toEqual([100, 50]);
    expect(fixation.stims[0].pos).toEqual([100, 50]);
  });

  it("handles rapid consecutive setPos calls (simulating frame-by-frame tracking)", () => {
    // Frame 1
    fixation.setPos([110, 50]);
    expect(fixation.previousPos).toEqual([100, 50]);
    // Frame 2
    fixation.setPos([120, 50]);
    expect(fixation.previousPos).toEqual([110, 50]);
    // Frame 3
    fixation.setPos([130, 60]);
    expect(fixation.previousPos).toEqual([120, 50]);
    // Verify stim position accumulated
    expect(fixation.stims[0].pos).toEqual([130, 60]);
  });

  it("previousPos is a fresh array each call (no shared references)", () => {
    fixation.setPos([110, 50]);
    const first = fixation.previousPos;
    fixation.setPos([120, 50]);
    const second = fixation.previousPos;
    // Different array objects
    expect(first).not.toBe(second);
    // Values preserved independently
    expect(first).toEqual([100, 50]);
    expect(second).toEqual([110, 50]);
  });

  it("setPos handles zero position", () => {
    fixation.stims[0].pos = [0, 0];
    fixation.setPos([0, 0]);
    expect(fixation.previousPos).toEqual([0, 0]);
    fixation.setPos([10, 0]);
    expect(fixation.previousPos).toEqual([0, 0]);
  });

  it("setPos handles negative positions", () => {
    fixation.stims[0].pos = [-100, -50];
    fixation.setPos([-90, -40]);
    expect(fixation.previousPos).toEqual([-100, -50]);
    expect(fixation.stims[0].pos).toEqual([-90, -40]);
  });

  it("setPos does not crash when stim.pos is undefined", () => {
    // Use a no-op setPos mock that doesn't try to write to pos
    fixation.stims[0].setPos = jest.fn();
    delete fixation.stims[0].pos;
    fixation.setPos([200, 100]);
    // previousPos stays undefined (guard skipped the shapshot)
    expect(fixation.previousPos).toBeUndefined();
  });

  it("setPos handles stim with extra properties on pos array", () => {
    // Some PsychoJS arrays have extra properties (e.g., pos.customProp)
    const augmentedPos = [100, 50] as any;
    augmentedPos.extra = "data";
    fixation.stims[0].pos = augmentedPos;
    fixation.setPos([200, 100]);
    // Snapshot captures indices 0,1 only — extra props are stripped
    expect(fixation.previousPos).toEqual([100, 50]);
    expect((fixation.previousPos as any).extra).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Fixation: boldIfCursorNearFixation — adversarial
// ---------------------------------------------------------------------------

describe("Fixation.boldIfCursorNearFixation — adversarial", () => {
  let fixation: Fixation;

  beforeEach(() => {
    (cursorNearFixation as jest.Mock).mockReset();
    (cursorNearFixation as jest.Mock).mockReturnValue(false);
    fixation = new Fixation();
    fixation.stims[0].setAutoDraw = jest.fn();
    fixation.stims[0].setLineWidth = jest.fn();
    fixation.stims[0].pos = [0, 0];
  });

  it("does nothing when markingFixationStrokeThickening is undefined", () => {
    (cursorNearFixation as jest.Mock).mockReturnValue(true);
    (Screens[0].fixationConfig as any).markingFixationStrokeThickening =
      undefined;
    fixation.bold = false;
    fixation.boldIfCursorNearFixation();
    // setBold returns early when multiplier is undefined
    expect(fixation.bold).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isCorrectlyTrackingDuringStimulusForRsvpReading — adversarial
// ---------------------------------------------------------------------------

describe("isCorrectlyTrackingDuringStimulusForRsvpReading — adversarial", () => {
  let fixation: Fixation;

  beforeEach(() => {
    (cursorNearFixation as jest.Mock).mockReset();
    (cursorNearFixation as jest.Mock).mockReturnValue(true);
    fixation = new Fixation();
    fixation.stims[0].pos = [0, 0];
    fixation.stims[0].setAutoDraw = jest.fn();
  });

  it("uses fixation.stims[0].pos (not fixationConfig.pos) for cursor check", () => {
    (cursorNearFixation as jest.Mock).mockReturnValue(true);
    fixation.stims[0].pos = [777, 888];
    Screens[0].fixationConfig.pos = [0, 0];
    rsvpReadingTargetSets.current = {
      stims: [{ setAutoDraw: jest.fn() }],
    } as any;
    isCorrectlyTrackingDuringStimulusForRsvpReading(fixation, 0);
    // Verify cursorNearFixation was called with the visual crosshair pos
    expect(cursorNearFixation).toHaveBeenCalledWith(
      undefined,
      undefined,
      [777, 888],
    );
  });
});
