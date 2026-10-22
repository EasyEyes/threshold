/**
 * MinimalStim.release — the PsychoJS-level stim teardown. A per-trial
 * memory baseline showed stims
 * released only "flag-off": release() destroyed the pixi representation but
 * never removed the stim from the window's draw list or root container, so
 * the window kept referencing a stim without a pixi object — and any stim
 * merely dropped (no release) kept its geometry in pixi's
 * managedGeometries/managedBuffers forever. Desired behavior: release()
 * undraws (draw list + root container) AND destroys the pixi representation.
 *
 * @jest-environment node
 */

jest.mock("../psychojs/src/core/PsychoJS.js", () => ({
  PsychoJS: { Status: { NOT_STARTED: 0, STARTED: 1, STOPPED: 2, FINISHED: 3 } },
}));
jest.mock("log4javascript", () => ({}), { virtual: true });

import { MinimalStim } from "../psychojs/src/core/MinimalStim.js";
import { PsychoJS } from "../psychojs/src/core/PsychoJS.js";

const makeWindow = () => ({
  _psychoJS: {},
  autoLog: false,
  _drawList: [] as unknown[],
  _rootContainer: {
    addChild: jest.fn(),
    removeChild: jest.fn(),
  },
});

/** A drawn stim: in the draw list, parented, with a live pixi object. */
const drawStim = (win: ReturnType<typeof makeWindow>) => {
  const stim = new MinimalStim({ win: win as never, name: "s" });
  const pixi = { destroy: jest.fn() };
  (stim as any)._pixi = pixi;
  win._drawList.push(stim);
  return { stim, pixi };
};

describe("MinimalStim.release", () => {
  it("destroys the pixi representation and drops the reference", () => {
    const win = makeWindow();
    const { stim, pixi } = drawStim(win);
    stim.release();
    expect(pixi.destroy).toHaveBeenCalledWith(true);
    expect((stim as any)._pixi).toBeUndefined();
  });

  it("removes the stim from the window draw list", () => {
    const win = makeWindow();
    const { stim } = drawStim(win);
    stim.release();
    expect(win._drawList).not.toContain(stim);
  });

  it("removes the pixi representation from the root container", () => {
    const win = makeWindow();
    const { stim, pixi } = drawStim(win);
    stim.release();
    expect(win._rootContainer.removeChild).toHaveBeenCalledWith(pixi);
  });

  it("clears autoDraw", () => {
    const win = makeWindow();
    const { stim } = drawStim(win);
    (stim as any)._setAttribute("autoDraw", true);
    stim.release();
    expect((stim as any)._autoDraw).toBe(false);
  });

  it("is safe on a stim with no pixi representation (never drawn)", () => {
    const win = makeWindow();
    const stim = new MinimalStim({ win: win as never, name: "s" });
    expect(() => stim.release()).not.toThrow();
  });

  it("refuses resurrection: setAutoDraw(true) after release is ignored", () => {
    const win = makeWindow();
    const { stim } = drawStim(win);
    stim.release();
    stim.setAutoDraw(true);
    expect((stim as any)._autoDraw).toBe(false);
    expect(win._drawList).not.toContain(stim);
  });

  it("refuses resurrection: draw() after release never rebuilds pixi", () => {
    const win = makeWindow();
    const { stim } = drawStim(win);
    stim.release();
    stim.draw();
    expect((stim as any)._pixi).toBeUndefined();
    expect(win._drawList).not.toContain(stim);
    expect((stim as any).status).toBe(PsychoJS.Status.STOPPED); // not STARTED
  });

  it("release() is idempotent", () => {
    const win = makeWindow();
    const { stim } = drawStim(win);
    expect(() => {
      stim.release();
      stim.release();
    }).not.toThrow();
  });
});
