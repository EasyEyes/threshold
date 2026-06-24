/**
 * @jest-environment jsdom
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

const setStateCalls: Array<Record<string, unknown>> = [];
jest.mock("../../../components/simulatedState", () => ({
  setEEState: (u: Record<string, unknown>) => setStateCalls.push(u),
}));

import {
  formatError,
  installErrorReporter,
} from "../../../components/errorInstrumentation";

beforeEach(() => {
  setStateCalls.length = 0;
});

describe("formatError", () => {
  test("formats a simple message", () => {
    expect(formatError("Cannot read property 'x' of undefined")).toBe(
      "[sim:error] Cannot read property 'x' of undefined",
    );
  });

  test("collapses newlines to single spaces", () => {
    expect(formatError("line 1\nline 2\n  line 3")).toBe(
      "[sim:error] line 1 line 2 line 3",
    );
  });

  test("trims leading/trailing whitespace", () => {
    expect(formatError("  padded  ")).toBe("[sim:error] padded");
  });
});

describe("installErrorReporter", () => {
  test("installs without throwing", () => {
    expect(() => installErrorReporter()).not.toThrow();
  });

  test("idempotent: installing twice does not throw or double-register", () => {
    const before = window.removeEventListener;
    installErrorReporter();
    installErrorReporter();
    expect(window.removeEventListener).toBe(before);
  });

  test("captures `error` events via addEventListener", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
    installErrorReporter();
    window.dispatchEvent(
      new ErrorEvent("error", { message: "boom from error event" }),
    );
    expect(spy).toHaveBeenCalledWith("[sim:error] boom from error event");
    expect(setStateCalls).toContainEqual({
      error: "boom from error event",
    });
    spy.mockRestore();
  });

  test("captures `unhandledrejection` events", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
    installErrorReporter();
    // jsdom lacks PromiseRejectionEvent; synthesize one.
    const ev = new Event("unhandledrejection");
    Object.defineProperty(ev, "reason", {
      value: new Error("async boom"),
      configurable: true,
    });
    window.dispatchEvent(ev);
    expect(spy).toHaveBeenCalledWith(
      "[sim:error] Unhandled rejection: async boom",
    );
    expect(setStateCalls).toContainEqual({
      error: "Unhandled rejection: async boom",
    });
    spy.mockRestore();
  });

  test("handles non-Error rejection reasons (string)", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
    installErrorReporter();
    const ev = new Event("unhandledrejection");
    Object.defineProperty(ev, "reason", {
      value: "string reason",
      configurable: true,
    });
    window.dispatchEvent(ev);
    expect(spy).toHaveBeenCalledWith(
      "[sim:error] Unhandled rejection: string reason",
    );
    spy.mockRestore();
  });
});
