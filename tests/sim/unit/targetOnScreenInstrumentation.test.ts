/**
 * @jest-environment jsdom
 *
 * Gap 6: Target on-screen check result should be published to #ee-state.
 *
 * boundingNew.js:792-814 determines whether the target fits on screen,
 * returning coordinates + eccentricity + fixation info when offscreen.
 * Without this, the 8 "Target is off screen" skips in our Playwright run
 * were only visible via console.error fishing.
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

describe("targetOnScreen (Gap 6)", () => {
  test("writes targetOnScreen=false with location, eccentricity, fixation", () => {
    setEEState({
      targetOnScreen: false,
      targetLocationPx: "(-790, 7)",
      targetEccentricityDeg: "(-10.0, 0.0)",
      fixationPx: "(0, 0)",
    });
    expect(readAttr("data-target-on-screen")).toBe("false");
    expect(readAttr("data-target-location-px")).toBe("(-790, 7)");
    expect(readAttr("data-target-eccentricity-deg")).toBe("(-10.0, 0.0)");
    expect(readAttr("data-fixation-px")).toBe("(0, 0)");
  });

  test("writes targetOnScreen=true", () => {
    setEEState({ targetOnScreen: true });
    expect(readAttr("data-target-on-screen")).toBe("true");
  });

  test("targetOnScreen absent when not set", () => {
    setEEState({ phase: "stimulus" });
    expect(readAttr("data-target-on-screen")).toBeNull();
    expect(readAttr("data-target-location-px")).toBeNull();
  });

  test("targetOnScreen overrides previous", () => {
    setEEState({ targetOnScreen: false, targetLocationPx: "(-790, 7)" });
    expect(readAttr("data-target-on-screen")).toBe("false");
    setEEState({ targetOnScreen: true, targetLocationPx: "(200, 5)" });
    expect(readAttr("data-target-on-screen")).toBe("true");
    expect(readAttr("data-target-location-px")).toBe("(200, 5)");
  });

  test("clear targetOnScreen with empty string", () => {
    setEEState({ targetOnScreen: true });
    setEEState({ targetOnScreen: undefined });
    expect(readAttr("data-target-on-screen")).toBe("");
  });
});
