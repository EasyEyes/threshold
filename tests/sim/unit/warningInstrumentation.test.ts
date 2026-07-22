/**
 * @jest-environment jsdom
 *
 * Gap 1: Warning / skip reasons should be published to #ee-state DOM element
 * so that automated observers can detect why a trial was skipped.
 *
 * Currently warning() writes to console + CSV only — this is RED.
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

// Mock dependencies of errorHandling.js
jest.mock("../../../components/globalPsychoJS", () => ({
  psychoJS: {
    experiment: {
      _thisEntry: {},
      addData: jest.fn(),
    },
  },
}));
jest.mock("../../../components/sentry", () => ({
  captureError: jest.fn(),
  captureMessage: jest.fn(),
}));
jest.mock("../../../components/global", () => ({}));
jest.mock("../../../components/lifetime", () => ({}));
jest.mock("../../../components/utils", () => ({}));
jest.mock("sweetalert2", () => ({}));

import { activateSimulation } from "../../../components/simulatedState";
import { warning } from "../../../components/errorHandling";

beforeEach(() => {
  // warning() console.warns its (arbitrary) message by design; assertions
  // here target addData/setEEState, so silence the passthrough.
  jest.spyOn(console, "warn").mockImplementation(() => {});
  document.body.innerHTML = "";
  activateSimulation();
});

describe("warning (Gap 1 — skip reasons)", () => {
  test("publishes skip reason to ee-state DOM element", () => {
    warning("Target is off screen");
    const el = document.getElementById("ee-state");
    expect(el).not.toBeNull();
    expect(el!.dataset.skipReason).toBe("Target is off screen");
  });

  test("publishes full message with coordinates", () => {
    warning(
      "Target is off screen. Target location (-790, 7) px, eccentricity (-10.0, 0.0) deg.",
    );
    const el = document.getElementById("ee-state")!;
    expect(el.dataset.skipReason).toContain("-790");
    expect(el.dataset.skipReason).toContain("(-10.0, 0.0)");
  });

  test("publishes multiline message", () => {
    warning("Line 1\nLine 2\nLine 3");
    const el = document.getElementById("ee-state")!;
    expect(el.dataset.skipReason).toBe("Line 1\nLine 2\nLine 3");
  });

  test("publishes empty string warning", () => {
    warning("");
    const el = document.getElementById("ee-state")!;
    expect(el.dataset.skipReason).toBe("");
  });
});
