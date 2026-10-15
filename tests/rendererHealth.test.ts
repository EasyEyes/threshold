/**
 * Renderer health logging — WebGL context loss/restoration recorded into
 * the session data. Context loss under long-session memory pressure
 * silently stops ALL drawing (the field's "cross stopped showing"
 * symptom is consistent with it) while experiment logic continues;
 * without this listener the event leaves no trace in the results.
 *
 * @jest-environment node
 */
jest.mock("../components/errorHandling", () => ({
  warning: jest.fn(),
}));
import { registerRendererHealthLogging } from "../components/rendererHealth";

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
      "rendererContextLostSec",
      "rendererContextRestoredSec",
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
