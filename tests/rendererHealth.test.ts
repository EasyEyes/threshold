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
import {
  registerRendererHealthLogging,
  rendererTypeOf,
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
