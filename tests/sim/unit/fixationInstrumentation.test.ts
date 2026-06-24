/**
 * @jest-environment jsdom
 *
 * Gap 5: Fixation position and gaze measurement should be published to #ee-state.
 *
 * Fixation position drives target placement; gaze measurement validates
 * tracking accuracy. Without these, spatial bugs (Bug 1 RTL) and tracking
 * issues are invisible to the observer.
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

describe("fixation / gaze (Gap 5)", () => {
  test("publishes fixation position", () => {
    setEEState({ fixationPx: "(100, 200)" });
    expect(readAttr("data-fixation-px")).toBe("(100, 200)");
  });

  test("publishes gaze measured in degrees", () => {
    setEEState({ gazeMeasuredDeg: "(-0.5, 1.2, 1.3)" });
    expect(readAttr("data-gaze-measured-deg")).toBe("(-0.5, 1.2, 1.3)");
  });

  test("publishes usingGaze flag", () => {
    setEEState({ usingGaze: true });
    expect(readAttr("data-using-gaze")).toBe("true");
  });

  test("usingGaze false", () => {
    setEEState({ usingGaze: false });
    expect(readAttr("data-using-gaze")).toBe("false");
  });

  test("fields absent when not set", () => {
    setEEState({ phase: "fixation" });
    expect(readAttr("data-fixation-px")).toBeNull();
    expect(readAttr("data-gaze-measured-deg")).toBeNull();
  });

  test("fixation position updates", () => {
    setEEState({ fixationPx: "(0, 0)" });
    expect(readAttr("data-fixation-px")).toBe("(0, 0)");
    setEEState({ fixationPx: "(50, -30)" });
    expect(readAttr("data-fixation-px")).toBe("(50, -30)");
  });
});
