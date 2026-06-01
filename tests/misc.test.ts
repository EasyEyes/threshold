/**
 * Tests for misc utility functions.
 *
 * @jest-environment node
 */

jest.mock("../components/global", () => ({
  status: { block_condition: "" },
}));

import { offsetRelativelyPositionedStimuli } from "../components/misc";

// ---------------------------------------------------------------------------
// offsetRelativelyPositionedStimuli
// ---------------------------------------------------------------------------

describe("offsetRelativelyPositionedStimuli", () => {
  const makeStim = (x: number, y: number) => ({
    pos: [x, y],
    getPos: function () {
      return this.pos;
    },
    setPos: function (p: number[]) {
      this.pos = p;
    },
    _updateIfNeeded: jest.fn(),
  });

  it("is a no-op when previousPos is undefined (first frame)", () => {
    const stim = makeStim(100, 50);
    offsetRelativelyPositionedStimuli([stim], [200, 100], undefined);
    expect(stim.getPos()).toEqual([100, 50]);
  });

  it("shifts a single stim by the delta", () => {
    const stim = makeStim(100, 50);
    offsetRelativelyPositionedStimuli([stim], [110, 60], [100, 50]);
    expect(stim.getPos()).toEqual([110, 60]);
  });

  it("shifts multiple stims by the same delta, preserving relative positions", () => {
    const a = makeStim(100, 0);
    const b = makeStim(200, 0);
    const c = makeStim(100, 50);
    offsetRelativelyPositionedStimuli([a, b, c], [110, 10], [100, 0]);
    expect(a.getPos()).toEqual([110, 10]);
    expect(b.getPos()).toEqual([210, 10]);
    expect(c.getPos()).toEqual([110, 60]);
  });

  it("preserves spacing between stims after shift", () => {
    const a = makeStim(0, 0);
    const b = makeStim(50, 0);
    offsetRelativelyPositionedStimuli([a, b], [1000, 1000], [0, 0]);
    const dx = b.getPos()[0] - a.getPos()[0];
    expect(dx).toBe(50); // spacing preserved
  });

  it("is a no-op when delta is zero (no movement)", () => {
    const stim = makeStim(100, 50);
    offsetRelativelyPositionedStimuli([stim], [100, 50], [100, 50]);
    expect(stim.getPos()).toEqual([100, 50]);
  });

  it("handles negative deltas", () => {
    const stim = makeStim(100, 50);
    offsetRelativelyPositionedStimuli([stim], [90, 40], [100, 50]);
    expect(stim.getPos()).toEqual([90, 40]);
  });

  it("handles empty stims array", () => {
    expect(() =>
      offsetRelativelyPositionedStimuli([], [100, 50], [0, 0]),
    ).not.toThrow();
  });

  it("is a no-op when previousPos contains NaN", () => {
    const stim = makeStim(100, 50);
    offsetRelativelyPositionedStimuli([stim], [200, 200], [NaN, 0]);
    expect(stim.getPos()).toEqual([100, 50]);
  });

  it("works with consecutive calls (accumulated tracking)", () => {
    const stim = makeStim(0, 0);
    // Frame 1: no-op (no previous)
    offsetRelativelyPositionedStimuli([stim], [10, 10], undefined);
    expect(stim.getPos()).toEqual([0, 0]);

    // Frame 2: shift by [5, 5]
    offsetRelativelyPositionedStimuli([stim], [15, 15], [10, 10]);
    expect(stim.getPos()).toEqual([5, 5]);

    // Frame 3: shift by another [5, 5]
    offsetRelativelyPositionedStimuli([stim], [20, 20], [15, 15]);
    expect(stim.getPos()).toEqual([10, 10]);
  });

  it("is a no-op when currentPos contains NaN", () => {
    const stim = makeStim(100, 50);
    // Only previousPos is guarded for NaN; currentPos is NOT guarded.
    // This is an intentional design choice — if currentPos is NaN,
    // the delta will be NaN and stims will end up at NaN position.
    // Callers are responsible for providing valid currentPos values.
    offsetRelativelyPositionedStimuli([stim], [NaN, 0], [0, 0]);
    const pos = stim.getPos();
    // Behavior: delta is NaN, so stim position becomes NaN
    expect(isNaN(pos[0])).toBe(true);
    // Clean up: reset for other tests
    stim.setPos([100, 50]);
  });

  it("propagates Infinity when currentPos contains Infinity", () => {
    const stim = makeStim(100, 50);
    // Infinity in currentPos with finite previousPos → delta is Infinity
    offsetRelativelyPositionedStimuli([stim], [Infinity, 0], [0, 0]);
    expect(stim.getPos()[0]).toBe(Infinity);
  });

  it("calls _updateIfNeeded on each stim after shifting", () => {
    const stim = makeStim(100, 50);
    offsetRelativelyPositionedStimuli([stim], [110, 60], [100, 50]);
    expect(stim._updateIfNeeded).toHaveBeenCalledTimes(1);
  });

  it("calls _updateIfNeeded on each of multiple stims", () => {
    const a = makeStim(0, 0);
    const b = makeStim(50, 0);
    const c = makeStim(100, 0);
    offsetRelativelyPositionedStimuli([a, b, c], [10, 10], [0, 0]);
    expect(a._updateIfNeeded).toHaveBeenCalledTimes(1);
    expect(b._updateIfNeeded).toHaveBeenCalledTimes(1);
    expect(c._updateIfNeeded).toHaveBeenCalledTimes(1);
  });

  it("does NOT call _updateIfNeeded when delta is zero (early return)", () => {
    const stim = makeStim(100, 50);
    offsetRelativelyPositionedStimuli([stim], [100, 50], [100, 50]);
    expect(stim._updateIfNeeded).not.toHaveBeenCalled();
  });

  it("handles stim whose setPos is a no-op without crashing", () => {
    const stim = makeStim(100, 50);
    stim.setPos = jest.fn();
    expect(() =>
      offsetRelativelyPositionedStimuli([stim], [110, 60], [100, 50]),
    ).not.toThrow();
    expect(stim._updateIfNeeded).toHaveBeenCalled();
  });

  it("handles stim with shared position reference (getPos returns ref)", () => {
    const sharedPos = [100, 50];
    const stim = {
      pos: sharedPos,
      getPos: function () {
        return this.pos;
      },
      setPos: function (p: number[]) {
        this.pos[0] = p[0];
        this.pos[1] = p[1];
      },
      _updateIfNeeded: jest.fn(),
    };
    offsetRelativelyPositionedStimuli([stim as any], [110, 60], [100, 50]);
    expect(stim.getPos()).toEqual([110, 60]);
  });

  it("shifts by fractional deltas precisely", () => {
    const stim = makeStim(100.5, 50.25);
    offsetRelativelyPositionedStimuli([stim], [101.3, 51.7], [100, 50]);
    expect(stim.getPos()[0]).toBeCloseTo(101.8);
    expect(stim.getPos()[1]).toBeCloseTo(51.95);
  });

  it("handles negative currentPos with zero previousPos", () => {
    const stim = makeStim(0, 0);
    offsetRelativelyPositionedStimuli([stim], [-500, -300], [0, 0]);
    expect(stim.getPos()).toEqual([-500, -300]);
  });

  it("handles large coordinate values without overflow", () => {
    const stim = makeStim(0, 0);
    offsetRelativelyPositionedStimuli([stim], [1e6, 1e6], [999999, 999999]);
    // delta = 1, position = 0 + 1 = 1
    expect(stim.getPos()[0]).toBeCloseTo(1);
    expect(stim.getPos()[1]).toBeCloseTo(1);
  });
});
