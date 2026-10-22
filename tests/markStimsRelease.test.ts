/**
 * Marking stims (markDot Dot, markGrid BackGrid, markFlies Swarm) — replaced
 * EVERY trial by getDotAndBackGrid()/getFlies() in trialRoutineBegin. The
 * memory baseline measured +1 GPU geometry / +2 buffers per trial, never
 * disposed, because the old marking stims were only undrawn. Desired
 * behavior: each marking object exposes release() delegating to its stims
 * (the PsychoJS teardown: undraw + pixi destroy + geometry dispose).
 *
 * @jest-environment jsdom
 */

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
  ShapeStim: class {},
  Polygon: class {},
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
  BackGrid,
  Swarm,
  getFlies,
  getDotAndBackGrid,
} from "../components/dotAndGrid";

const fakeStim = () => ({ release: jest.fn(), setAutoDraw: jest.fn() });

/** An instance with injected stims — no constructor side effects. */
const bare = (cls: new (...args: never[]) => unknown) =>
  Object.create(cls.prototype) as any;

describe("marking stim release", () => {
  it("Dot.release() releases its stim", () => {
    const dot = bare(Dot);
    dot.stim = fakeStim();
    dot.release();
    expect(dot.stim.release).toHaveBeenCalled();
  });

  it("BackGrid.release() releases every grid-line stim", () => {
    const grid = bare(BackGrid);
    grid.stims = [fakeStim(), fakeStim(), fakeStim()];
    grid.release();
    for (const s of grid.stims) expect(s.release).toHaveBeenCalled();
  });

  it("Swarm.release() releases every fly stim", () => {
    const swarm = bare(Swarm);
    swarm.stims = [fakeStim(), fakeStim()];
    swarm.release();
    for (const s of swarm.stims) expect(s.release).toHaveBeenCalled();
  });

  it("release() is safe on an instance with no stims yet", () => {
    const dot = bare(Dot);
    dot.stim = undefined;
    expect(() => dot.release()).not.toThrow();
  });
});

describe("factories own release of the replaced instance", () => {
  it("getFlies releases the previous swarm", () => {
    const previous = { release: jest.fn() };
    expect(getFlies(undefined, previous as never)).toBeUndefined();
    expect(previous.release).toHaveBeenCalled();
  });

  it("getDotAndBackGrid releases the previous dot and grid", () => {
    const dot = { release: jest.fn() };
    const grid = { release: jest.fn() };
    // Malformed specs construct nothing, isolating the release behavior.
    const [d, g] = getDotAndBackGrid("malformed", "malformed", [
      dot,
      grid,
    ] as never);
    expect(d).toBeUndefined();
    expect(g).toBeUndefined();
    expect(dot.release).toHaveBeenCalled();
    expect(grid.release).toHaveBeenCalled();
  });

  it("factories accept being first (no previous instance)", () => {
    expect(() => getFlies(undefined)).not.toThrow();
    expect(() => getDotAndBackGrid("malformed", "malformed")).not.toThrow();
  });
});
