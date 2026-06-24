/**
 * @jest-environment jsdom
 *
 * Gap 2: Scheduler events (NEXT, QUIT) should be published to #ee-state.
 *
 * endLoopIteration (threshold.js) fires after every trial/block iteration.
 * lifetime.js quitPsychoJS fires QUIT at experiment end.
 * Without this, automated observers can't confirm trial lifecycle.
 *
 * DOM-level test: verify setEEState({ schedulerEvent }) writes correctly.
 * The integration hooks (in threshold.js, lifetime.js) are lightweight wrappers
 * that call this same function — tested manually via e2e Playwright.
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

describe("schedulerEvent (Gap 2)", () => {
  test('setEEState({ schedulerEvent: "NEXT" }) writes data-scheduler-event', () => {
    setEEState({ schedulerEvent: "NEXT" });
    expect(readAttr("data-scheduler-event")).toBe("NEXT");
  });

  test('setEEState({ schedulerEvent: "QUIT" }) writes data-scheduler-event', () => {
    setEEState({ schedulerEvent: "QUIT" });
    expect(readAttr("data-scheduler-event")).toBe("QUIT");
  });

  test("schedulerEvent is absent when not set", () => {
    setEEState({ phase: "fixation" });
    expect(document.getElementById("ee-state")).not.toBeNull();
    expect(readAttr("data-scheduler-event")).toBeNull();
  });

  test("schedulerEvent overrides previous value", () => {
    setEEState({ schedulerEvent: "NEXT" });
    expect(readAttr("data-scheduler-event")).toBe("NEXT");
    setEEState({ schedulerEvent: "QUIT" });
    expect(readAttr("data-scheduler-event")).toBe("QUIT");
  });
});
