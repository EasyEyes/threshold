/**
 * Tests for XYPxOfDeg and XYDegOfPx: coordinate input validation,
 * screen field validation, NaN/Infinity propagation guards, and
 * output finiteness contract.
 *
 * @jest-environment jsdom
 */

import { XYPxOfDeg, XYDegOfPx } from "../components/multiple-displays/utils";
import { Screens } from "../components/multiple-displays/globals";

jest.mock("../components/global", () => ({
  viewingDistanceCm: { current: 40 },
  targetEccentricityDeg: { x: 0, y: 0 },
}));

const validScreen = () => {
  Screens[0].pxPerCm = 40;
  Screens[0].viewingDistanceCm = 40;
  Screens[0].nearestPointXYZPx = [0, 0];
  Screens[0].fixationConfig = {
    ...Screens[0].fixationConfig,
    pos: [0, 0],
    nominalPos: [0, 0],
  };
};

// ---------------------------------------------------------------------------
// XYPxOfDeg
// ---------------------------------------------------------------------------
describe("XYPxOfDeg", () => {
  describe("invalid coordinate inputs", () => {
    beforeEach(validScreen);

    it("throws on undefined x", () => {
      expect(() => XYPxOfDeg(0, [undefined as any, 0])).toThrow(
        /invalid.*coordinate|undefined/i,
      );
    });

    it("throws on undefined y", () => {
      expect(() => XYPxOfDeg(0, [0, undefined as any])).toThrow(
        /invalid.*coordinate|undefined/i,
      );
    });

    it("throws on both undefined", () => {
      expect(() => XYPxOfDeg(0, [undefined as any, undefined as any])).toThrow(
        /invalid.*coordinate|undefined/i,
      );
    });

    it("throws on NaN", () => {
      expect(() => XYPxOfDeg(0, [NaN, 0])).toThrow(/invalid.*coordinate|NaN/i);
    });

    it("throws on null", () => {
      expect(() => XYPxOfDeg(0, [null as any, 0])).toThrow(
        /invalid.*coordinate/i,
      );
    });

    it("throws on boolean", () => {
      expect(() => XYPxOfDeg(0, [true as any, 0])).toThrow(
        /invalid.*coordinate/i,
      );
    });

    it("throws on string", () => {
      expect(() => XYPxOfDeg(0, ["0" as any, 0])).toThrow(
        /invalid.*coordinate/i,
      );
    });

    it("rejects Infinity", () => {
      expect(() => XYPxOfDeg(0, [Infinity, 0])).toThrow();
    });

    it("rejects -Infinity", () => {
      expect(() => XYPxOfDeg(0, [-Infinity, 0])).toThrow();
    });

    it("mentions NaN for 3-element flat array [1, 2, NaN]", () => {
      expect(() => XYPxOfDeg(0, [1, 2, NaN] as any)).toThrow(/NaN/i);
    });
  });

  describe("multi-point edge cases", () => {
    beforeEach(validScreen);

    it("rejects NaN in multi-point arrays", () => {
      expect(() =>
        XYPxOfDeg(0, [
          [NaN, 0],
          [1, 2],
        ]),
      ).toThrow(/invalid.*coordinate|NaN/i);
    });

    it("throws cleanly on null element in multi-point array", () => {
      expect(() => XYPxOfDeg(0, [[1, 2], null as any])).toThrow(
        /invalid.*point/i,
      );
    });

    it("handles single-point-wrapped-as-multi [[0,0]]", () => {
      const r = XYPxOfDeg(0, [[0, 0]]);
      expect(Array.isArray(r)).toBe(true);
      expect(Array.isArray(r[0])).toBe(true);
    });

    it("handles valid multi-point arrays with 3+ points", () => {
      const r = XYPxOfDeg(0, [
        [0, 0],
        [1, 1],
        [2, 2],
      ]);
      expect(Array.isArray(r)).toBe(true);
      expect(r.length).toBe(3);
    });

    it("rejects multi-point with different-length sub-arrays", () => {
      expect(() =>
        XYPxOfDeg(0, [
          [1, 2],
          [3, 4, 5],
        ] as any),
      ).toThrow(/invalid.*point/i);
    });
  });

  describe("screen field validation", () => {
    beforeEach(validScreen);

    it("throws when pxPerCm is missing", () => {
      Screens[0].pxPerCm = undefined as any;
      expect(() => XYPxOfDeg(0, [5, 0])).toThrow(/pxPerCm/i);
    });

    it("throws when pxPerCm is NaN", () => {
      Screens[0].pxPerCm = NaN;
      expect(() => XYPxOfDeg(0, [5, 0])).toThrow(/pxPerCm/i);
    });

    it("throws when pxPerCm is Infinity", () => {
      Screens[0].pxPerCm = Infinity;
      expect(() => XYPxOfDeg(0, [5, 0])).toThrow(/pxPerCm/i);
    });

    it("throws when pxPerCm is 0", () => {
      Screens[0].pxPerCm = 0;
      expect(() => XYPxOfDeg(0, [5, 0])).toThrow(/pxPerCm/i);
    });

    it("throws when pxPerCm is negative", () => {
      Screens[0].pxPerCm = -40;
      expect(() => XYPxOfDeg(0, [5, 0])).toThrow(/pxPerCm/i);
    });

    it("throws when viewingDistanceCm is missing", () => {
      Screens[0].viewingDistanceCm = undefined as any;
      expect(() => XYPxOfDeg(0, [5, 0])).toThrow(/viewingDistance/i);
    });
  });

  describe("screen config NaN/Infinity propagation", () => {
    beforeEach(validScreen);

    it("throws when nearestPointXYZPx is [NaN, NaN]", () => {
      Screens[0].nearestPointXYZPx = [NaN, NaN];
      expect(() => XYPxOfDeg(0, [5, 0])).toThrow();
    });

    it("throws when nearestPointXYZPx contains Infinity", () => {
      Screens[0].nearestPointXYZPx = [Infinity, 0];
      expect(() => XYPxOfDeg(0, [5, 0])).toThrow();
    });

    it("throws when fixationConfig.pos is [NaN, NaN]", () => {
      Screens[0].fixationConfig.pos = [NaN, NaN];
      expect(() => XYPxOfDeg(0, [5, 0])).toThrow();
    });

    it("throws when fixationConfig.pos contains Infinity", () => {
      Screens[0].fixationConfig.pos = [Infinity, Infinity];
      expect(() => XYPxOfDeg(0, [5, 0])).toThrow();
    });
  });

  describe("valid inputs", () => {
    beforeEach(validScreen);

    it("returns [0, 0] for [0, 0]", () => {
      const r = XYPxOfDeg(0, [0, 0]) as number[];
      expect(r[0]).toBe(0);
      expect(r[1]).toBe(0);
    });

    it("returns finite numbers for a peripheral target", () => {
      const r = XYPxOfDeg(0, [5, 3]) as number[];
      expect(r.every(isFinite)).toBe(true);
    });
  });

  describe("output finiteness contract", () => {
    beforeEach(validScreen);

    it("output is finite for 89 degrees eccentricity", () => {
      const r = XYPxOfDeg(0, [89, 0]) as number[];
      expect(r.every(isFinite)).toBe(true);
    });

    it("output is finite for exactly 90 degrees (clamped path)", () => {
      const r = XYPxOfDeg(0, [90, 0]) as number[];
      expect(r.every(isFinite)).toBe(true);
    });

    it("output is finite for very large eccentricity (1000 degrees)", () => {
      const r = XYPxOfDeg(0, [1000, 0]) as number[];
      expect(r.every(isFinite)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// XYDegOfPx
// ---------------------------------------------------------------------------
describe("XYDegOfPx", () => {
  describe("coordinate input validation", () => {
    beforeEach(validScreen);

    it("rejects Infinity input", () => {
      expect(() => XYDegOfPx(0, [Infinity, 0])).toThrow();
    });

    it("rejects null element in multi-point array", () => {
      expect(() => XYDegOfPx(0, [[1, 2], null as any])).toThrow(
        /invalid.*point/i,
      );
    });

    it("converts [0, 0] px to [0, 0] deg", () => {
      const r = XYDegOfPx(0, [0, 0]) as number[];
      expect(r[0]).toBe(0);
      expect(r[1]).toBe(0);
    });
  });

  describe("screen field validation", () => {
    beforeEach(validScreen);

    it("throws when pxPerCm is missing", () => {
      Screens[0].pxPerCm = undefined as any;
      expect(() => XYDegOfPx(0, [100, 100])).toThrow(/pxPerCm/i);
    });

    it("throws when pxPerCm is NaN", () => {
      Screens[0].pxPerCm = NaN;
      expect(() => XYDegOfPx(0, [100, 100])).toThrow(/pxPerCm/i);
    });

    it("throws when pxPerCm is Infinity", () => {
      Screens[0].pxPerCm = Infinity;
      expect(() => XYDegOfPx(0, [100, 100])).toThrow(/pxPerCm/i);
    });

    it("throws when pxPerCm is 0", () => {
      Screens[0].pxPerCm = 0;
      expect(() => XYDegOfPx(0, [100, 100])).toThrow(/pxPerCm/i);
    });

    it("throws when pxPerCm is negative", () => {
      Screens[0].pxPerCm = -40;
      expect(() => XYDegOfPx(0, [100, 100])).toThrow(/pxPerCm/i);
    });
  });
});
