/**
 * @jest-environment jsdom
 *
 * Gap 4: Response collection events should be published to #ee-state.
 *
 * Without responseReceived / responseKind / responseCorrect, the observer
 * can't confirm whether a dispatched key/click was actually received and
 * judged. This blocks debugging of response-flow bugs.
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

import {
  setEEState,
  activateSimulation,
} from "../../../components/simulatedState";

function readAttr(name: string): string | null {
  const el = document.getElementById("ee-state");
  return el?.getAttribute(name) ?? null;
}

beforeEach(() => {
  document.body.innerHTML = "";
  activateSimulation();
});

describe("responseReceived (Gap 4)", () => {
  test("publishes keypress response event", () => {
    setEEState({
      responseReceived: "a",
      responseKind: "key",
      responseCorrect: true,
    });
    expect(readAttr("data-response-received")).toBe("a");
    expect(readAttr("data-response-kind")).toBe("key");
    expect(readAttr("data-response-correct")).toBe("true");
  });

  test("publishes click response event", () => {
    setEEState({
      responseReceived: "z",
      responseKind: "click",
      responseCorrect: false,
    });
    expect(readAttr("data-response-received")).toBe("z");
    expect(readAttr("data-response-kind")).toBe("click");
    expect(readAttr("data-response-correct")).toBe("false");
  });

  test("publishes keypad response", () => {
    setEEState({
      responseReceived: "hello",
      responseKind: "keypad",
    });
    expect(readAttr("data-response-kind")).toBe("keypad");
  });

  test("responseCorrect absent when not provided", () => {
    setEEState({ responseReceived: "x", responseKind: "key" });
    expect(readAttr("data-response-received")).toBe("x");
    expect(readAttr("data-response-correct")).toBeNull();
  });

  test("response fields absent when not set", () => {
    setEEState({ phase: "response" });
    expect(readAttr("data-response-received")).toBeNull();
    expect(readAttr("data-response-kind")).toBeNull();
  });
});
