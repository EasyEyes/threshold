/**
 * @jest-environment jsdom
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

// Mock the psychojs + paramReader imports so the module loads cleanly.
jest.mock("../../../psychojs/src/core/MinimalStim.js", () => ({
  MinimalStim: class FakeMinimalStim {},
}));
jest.mock("../../../parameters/paramReader.js", () => ({
  ParamReader: class FakeParamReader {},
}));

import {
  dispatchKey,
  dispatchClick,
} from "../../../components/simulatedParticipant";

beforeEach(() => {
  jest.restoreAllMocks();
});

describe("dispatchClick", () => {
  test("null/undefined element: no click, no log", () => {
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
    dispatchClick(null, "missing");
    dispatchClick(undefined, "missing");
    expect(debugSpy).not.toHaveBeenCalled();
  });

  test("valid element: clicks AND logs exactly once BEFORE click", () => {
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
    const clickOrder: string[] = [];
    const el = document.createElement("button");
    el.addEventListener("click", () => clickOrder.push("click"));
    // Override console.debug to record when it fires relative to click
    debugSpy.mockImplementation(() => clickOrder.push("log"));
    dispatchClick(el, "#test-btn");
    expect(clickOrder).toEqual(["log", "click"]);
    expect(debugSpy).toHaveBeenCalledWith('[sim:dispatch] click="#test-btn"');
  });

  test("escapes special characters in label", () => {
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
    const el = document.createElement("button");
    dispatchClick(el, 'button[data-x="y"]');
    expect(debugSpy).toHaveBeenCalledWith(
      '[sim:dispatch] click="button[data-x=\\"y\\"]"',
    );
  });
});

describe("dispatchKey", () => {
  test("Space: dispatches KeyboardEvent with code=Space and logs key=Space", () => {
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
    const events: KeyboardEvent[] = [];
    window.addEventListener("keydown", (e) => events.push(e));
    dispatchKey(" ");
    expect(events).toHaveLength(1);
    expect(events[0].code).toBe("Space");
    expect(events[0].key).toBe(" ");
    expect(debugSpy).toHaveBeenCalledWith('[sim:dispatch] key="Space"');
  });

  test("letter: dispatches KeyboardEvent with code=KeyX and logs key=X", () => {
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
    const events: KeyboardEvent[] = [];
    window.addEventListener("keydown", (e) => events.push(e));
    dispatchKey("Z");
    expect(events).toHaveLength(1);
    expect(events[0].code).toBe("KeyZ");
    expect(events[0].key).toBe("Z");
    expect(debugSpy).toHaveBeenCalledWith('[sim:dispatch] key="Z"');
  });

  test("logs BEFORE dispatching the event (correlation order)", () => {
    const order: string[] = [];
    jest.spyOn(console, "debug").mockImplementation(() => order.push("log"));
    window.addEventListener("keydown", () => order.push("event"));
    dispatchKey("A");
    expect(order).toEqual(["log", "event"]);
  });
});
