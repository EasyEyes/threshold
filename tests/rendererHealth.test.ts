/**
 * Renderer health + automatic recovery — context loss is logged, and an
 * unrestored context triggers Window.rebuildRenderer after delayMs, then
 * re-registers on the rebuilt canvas (repeated losses keep recovering).
 *
 * @jest-environment node
 */
jest.mock("../components/errorHandling", () => ({
  warning: jest.fn(),
}));
import { warning } from "../components/errorHandling";
import {
  registerRendererHealthLogging,
  rendererTypeOf,
  rendererContextLossCount,
  beginRendererLossWindow,
  endRendererLossWindow,
  rendererLostDuringTrial,
} from "../components/rendererHealth";

const mkTarget = () => {
  const listeners: Record<string, (() => void)[]> = {};
  return {
    addEventListener: (name: string, fn: () => void) =>
      (listeners[name] ??= []).push(fn),
    dispatch: (name: string) => (listeners[name] ?? []).forEach((fn) => fn()),
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  delete (globalThis as any).__rendererContextLost;
  delete (globalThis as any).__rendererContextRestored;
  delete (globalThis as any).__rendererRebuilt;
  delete (globalThis as any).__rendererContextLossCount;
  delete (globalThis as any).__rendererLossWindowStartCount;
  delete (globalThis as any).__rendererLossWindowClosedLost;
  delete (globalThis as any).__rendererLossWindowWarned;
  delete (globalThis as any).__DISABLE_RENDERER_RECOVERY;
});

describe("registerRendererHealthLogging", () => {
  it("logs context loss and restoration as data columns", () => {
    const target = mkTarget();
    const calls: [string, unknown][] = [];
    registerRendererHealthLogging(
      target as never,
      (key: string, value: unknown) => calls.push([key, value]),
    );
    target.dispatch("webglcontextlost");
    target.dispatch("webglcontextrestored");
    expect(calls.map((c) => c[0])).toEqual([
      "canvasContextLostSec",
      "canvasContextRestoredSec",
    ]);
    expect(typeof calls[0][1]).toBe("number");
    expect((globalThis as any).__rendererContextLost).toBe(true);
    expect((globalThis as any).__rendererContextRestored).toBe(true);
  });

  it("does not set the flag when no loss occurs", () => {
    const target = mkTarget();
    registerRendererHealthLogging(target as never, () => {});
    target.dispatch("webglcontextrestored");
    expect((globalThis as any).__rendererContextLost).toBeUndefined();
  });

  it("tolerates a target without addEventListener", () => {
    expect(() =>
      registerRendererHealthLogging({} as never, () => {}),
    ).not.toThrow();
  });
});

describe("automatic renderer recovery", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("rebuilds IMMEDIATELY by default (no grace period)", () => {
    const target = mkTarget();
    const rebuilt = mkTarget();
    const win = { rebuildRenderer: jest.fn(() => rebuilt), _renderer: {} };
    const calls: Array<[string, unknown]> = [];
    registerRendererHealthLogging(target, (k, v) => calls.push([k, v]), {
      window: win,
    });
    target.dispatch("webglcontextlost");
    // Zero grace: the rebuild runs on the next tick, not after 3000 ms —
    // advancing 0 ms must already have run it (old default: 0 calls here).
    jest.advanceTimersByTime(0);
    expect(win.rebuildRenderer).toHaveBeenCalled();
    expect(calls).toContainEqual([
      "canvasContextRebuiltSec",
      expect.any(Number),
    ]);
  });

  it("rebuilds after delayMs when the context is not restored", () => {
    const target = mkTarget();
    const rebuilt = mkTarget();
    const win = {
      rebuildRenderer: jest.fn(() => rebuilt),
      _renderer: { context: {} },
    };
    const calls: [string, unknown][] = [];
    registerRendererHealthLogging(
      target,
      (key: string, value: unknown) => calls.push([key, value]),
      { window: win, delayMs: 3000 },
    );
    target.dispatch("webglcontextlost");
    expect(win.rebuildRenderer).not.toHaveBeenCalled();
    jest.advanceTimersByTime(3000);
    expect(win.rebuildRenderer).toHaveBeenCalledTimes(1);
    expect((globalThis as any).__rendererRebuilt).toBe(true);
    expect(calls.map((c) => c[0])).toContain("canvasContextRebuiltSec");
    // The rebuild's outcome (may have degraded to canvas2d) is recorded.
    expect(calls).toContainEqual(["canvasContextTypeAfterRebuild", "2d"]);
  });

  it("does not rebuild when the browser restores in time", () => {
    const target = mkTarget();
    const win = { rebuildRenderer: jest.fn() };
    registerRendererHealthLogging(target, () => {}, {
      window: win,
      delayMs: 3000,
    });
    target.dispatch("webglcontextlost");
    jest.advanceTimersByTime(1000);
    target.dispatch("webglcontextrestored");
    jest.advanceTimersByTime(10_000);
    expect(win.rebuildRenderer).not.toHaveBeenCalled();
  });

  it("re-registers on the rebuilt canvas (a second loss recovers too)", () => {
    const target = mkTarget();
    const rebuilt = mkTarget();
    const win = { rebuildRenderer: jest.fn(() => rebuilt) };
    registerRendererHealthLogging(target, () => {}, {
      window: win,
      delayMs: 3000,
    });
    target.dispatch("webglcontextlost");
    jest.advanceTimersByTime(3000);
    win.rebuildRenderer.mockClear();
    rebuilt.dispatch("webglcontextlost");
    jest.advanceTimersByTime(3000);
    expect(win.rebuildRenderer).toHaveBeenCalledTimes(1);
  });

  it("respects the __DISABLE_RENDERER_RECOVERY escape hatch", () => {
    const target = mkTarget();
    const win = { rebuildRenderer: jest.fn() };
    registerRendererHealthLogging(target, () => {}, {
      window: win,
      delayMs: 3000,
    });
    (globalThis as any).__DISABLE_RENDERER_RECOVERY = true;
    target.dispatch("webglcontextlost");
    jest.advanceTimersByTime(10_000);
    expect(win.rebuildRenderer).not.toHaveBeenCalled();
    expect((globalThis as any).__rendererContextLost).toBe(true);
    delete (globalThis as any).__DISABLE_RENDERER_RECOVERY;
  });
});

describe("context-loss trial window (trial invalidation)", () => {
  const registerAndLose = () => {
    const target = mkTarget();
    registerRendererHealthLogging(target as never, () => {});
    target.dispatch("webglcontextlost");
    return target;
  };
  // The loss event itself warns — count only trial-invalidation warnings.
  const stimulusWindowWarnings = () =>
    (warning as jest.Mock).mock.calls.filter(([m]) =>
      /stimulus window/i.test(String(m)),
    );

  it("counts context losses monotonically", () => {
    expect(rendererContextLossCount()).toBe(0);
    const target = registerAndLose();
    expect(rendererContextLossCount()).toBe(1);
    target.dispatch("webglcontextlost");
    expect(rendererContextLossCount()).toBe(2);
  });

  it("flags a loss that happens inside the window", () => {
    beginRendererLossWindow();
    registerAndLose();
    expect(rendererLostDuringTrial()).toBe(true);
  });

  it("ignores a loss that happened before the window opened", () => {
    registerAndLose(); // loss while between trials
    beginRendererLossWindow();
    expect(rendererLostDuringTrial()).toBe(false);
  });

  it("a fresh window starts clean (a loss in trial N does not stain trial N+1)", () => {
    beginRendererLossWindow();
    registerAndLose();
    expect(rendererLostDuringTrial()).toBe(true);
    beginRendererLossWindow();
    expect(rendererLostDuringTrial()).toBe(false);
  });

  it("a loss AFTER the window closed (stimulus undrawn) does not stain the trial", () => {
    beginRendererLossWindow();
    endRendererLossWindow(); // stimulus undrawn, no loss so far
    registerAndLose(); // context dies during the response window
    expect(rendererLostDuringTrial()).toBe(false);
  });

  it("a loss before the window closed latches through the close", () => {
    beginRendererLossWindow();
    registerAndLose();
    endRendererLossWindow();
    expect(rendererLostDuringTrial()).toBe(true);
    // ...and still warns exactly once (the verdict is consumed late)
    expect(stimulusWindowWarnings()).toHaveLength(1);
  });

  it("closing without an open window is a no-op", () => {
    expect(() => endRendererLossWindow()).not.toThrow();
    expect(rendererLostDuringTrial()).toBe(false);
  });

  it("never flags when no window was opened", () => {
    registerAndLose();
    expect(rendererLostDuringTrial()).toBe(false);
  });

  it("warns once per window, not once per call site", () => {
    beginRendererLossWindow();
    registerAndLose();
    expect(rendererLostDuringTrial()).toBe(true);
    expect(rendererLostDuringTrial()).toBe(true); // second consumer, same trial
    expect(stimulusWindowWarnings()).toHaveLength(1);
  });

  it("a loss outside any window does not warn through the trial API", () => {
    registerAndLose();
    // The loss itself warns (context lost), but the trial API must not
    // add trial-invalidation warnings for a window that never opened.
    expect(stimulusWindowWarnings()).toHaveLength(0);
  });
});

describe("rendererTypeOf", () => {
  it("identifies WebGL renderers via .gl", () => {
    expect(rendererTypeOf({ gl: {} })).toBe("webgl"); // no WebGL2 in node
  });
  it("identifies Canvas2D renderers via .context", () => {
    expect(rendererTypeOf({ context: {} })).toBe("2d");
  });
  it("falls back to the pixi type enum, then unknown", () => {
    expect(rendererTypeOf({ type: 1 })).toBe("webgl");
    expect(rendererTypeOf({ type: 2 })).toBe("2d");
    expect(rendererTypeOf({})).toBe("unknown");
    expect(rendererTypeOf(null)).toBe("unknown");
  });
});

describe("adversarial: loss/rebuild edge cases", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("a DUPLICATE lost event does not schedule two rebuilds", () => {
    const target = mkTarget();
    const rebuilt = mkTarget();
    const win = { rebuildRenderer: jest.fn(() => rebuilt), _renderer: {} };
    registerRendererHealthLogging(target, () => {}, {
      window: win,
      delayMs: 3000,
    });
    target.dispatch("webglcontextlost");
    target.dispatch("webglcontextlost"); // duplicate event
    jest.advanceTimersByTime(10_000);
    expect(win.rebuildRenderer).toHaveBeenCalledTimes(1);
  });

  it("recovers from a SECOND loss after a restore (no permanent latch)", () => {
    const target = mkTarget();
    const rebuilt = mkTarget();
    const win = { rebuildRenderer: jest.fn(() => rebuilt), _renderer: {} };
    registerRendererHealthLogging(target, () => {}, {
      window: win,
      delayMs: 3000,
    });
    target.dispatch("webglcontextlost");
    jest.advanceTimersByTime(1000);
    target.dispatch("webglcontextrestored"); // browser saved it in time
    target.dispatch("webglcontextlost"); // and then it died for good
    jest.advanceTimersByTime(10_000);
    expect(win.rebuildRenderer).toHaveBeenCalledTimes(1);
  });

  it("warns when the rebuild yields no re-registrable canvas (not silent)", () => {
    // A degraded rebuild (e.g. a custom rebuildRenderer returning a
    // non-canvas) must not silently leave the new renderer unlogged —
    // the same never-silent contract as registration itself.
    const target = mkTarget();
    const win = { rebuildRenderer: jest.fn(() => ({})) }; // no addEventListener
    registerRendererHealthLogging(target, () => {}, {
      window: win,
      delayMs: 3000,
    });
    target.dispatch("webglcontextlost");
    jest.advanceTimersByTime(3000);
    const { warning } = require("../components/errorHandling");
    expect(warning).toHaveBeenCalledWith(
      expect.stringMatching(/not registered/),
    );
  });

  it("warns when registration is skipped (no renderer view) — not a silent no-op", () => {
    const { warning } = require("../components/errorHandling");
    registerRendererHealthLogging(undefined, () => {});
    expect(warning).toHaveBeenCalled();
  });
});

describe("adversarial: stale canvas after rebuild", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("a late context-lost event on the OLD canvas does not rebuild the NEW one", () => {
    const oldCanvas = mkTarget();
    const rebuiltCanvas = mkTarget();
    const win: any = { _renderer: { view: oldCanvas } };
    win.rebuildRenderer = jest.fn(() => {
      win._renderer = { view: rebuiltCanvas };
      return rebuiltCanvas;
    });
    registerRendererHealthLogging(oldCanvas, () => {}, {
      window: win,
      delayMs: 3000,
    });
    oldCanvas.dispatch("webglcontextlost");
    jest.advanceTimersByTime(10_000); // rebuild #1; re-registered on rebuiltCanvas
    expect(win.rebuildRenderer).toHaveBeenCalledTimes(1);
    // The detached old canvas emits a late lost event — it must be ignored.
    oldCanvas.dispatch("webglcontextlost");
    jest.advanceTimersByTime(10_000);
    expect(win.rebuildRenderer).toHaveBeenCalledTimes(1);
  });
});
