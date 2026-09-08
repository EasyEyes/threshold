import { describe, expect, test } from "@jest/globals";

// Item 1 (unmetNeeds what+where): the RC quit reason lives INSIDE the
// unmetNeeds cell (the column Analyze displays as the session's reason):
// `rc:<trigger>:quit(status=…,camera=…,attempts=…,min=…)` — label parseable
// by prefix, detail human-readable, no extra columns (elapsed time, device,
// routine, block all exist in other columns already).
import {
  RC_CAMERA_RECONNECT_POPUP_QUIT,
  rcMinutesSinceStart,
  rcUnmetNeedsFromReason,
} from "../components/rcTermination";

const popupReason = {
  trigger: "cameraReconnectPopup",
  snapshot: {
    status: "ended",
    trackReadyState: "ended",
    streamActive: true,
  },
  cameraLabel: "HD Webcam",
  resumeAttempts: 0,
  quitAfterFailedResume: false,
};

describe("rcUnmetNeedsFromReason", () => {
  test("old RC (no reason passed) → bare camera reconnect popup label", () => {
    expect(rcUnmetNeedsFromReason(undefined)).toBe(
      RC_CAMERA_RECONNECT_POPUP_QUIT,
    );
    expect(rcUnmetNeedsFromReason(null)).toBe(RC_CAMERA_RECONNECT_POPUP_QUIT);
  });

  test("cameraReconnectPopup trigger → label + detail suffix", () => {
    expect(rcUnmetNeedsFromReason(popupReason, 3.24)).toBe(
      "rc:cameraReconnectPopup:quit(status=ended,camera=HD Webcam,min=3.2)",
    );
  });

  test("failed-resume attempts are included when nonzero", () => {
    expect(
      rcUnmetNeedsFromReason({ ...popupReason, resumeAttempts: 2 }, undefined),
    ).toBe(
      "rc:cameraReconnectPopup:quit(status=ended,camera=HD Webcam,attempts=2)",
    );
  });

  test("any other RC trigger keeps its name: rc:<trigger>:quit", () => {
    expect(rcUnmetNeedsFromReason({ trigger: "chooseScreenQuit" })).toBe(
      "rc:chooseScreenQuit:quit",
    );
  });

  test("trigger and detail values are sanitized (CSV/grammar safe)", () => {
    expect(
      rcUnmetNeedsFromReason({
        trigger: "weird: trigger,with stuff",
        cameraLabel: "cam, (HD) 3000\nseries",
        snapshot: { status: "in,active" },
      }),
    ).toBe(
      "rc:weirdtriggerwithstuff:quit(status=in active,camera=cam HD 3000 series)",
    );
    expect(rcUnmetNeedsFromReason({ trigger: "::," })).toBe(
      RC_CAMERA_RECONNECT_POPUP_QUIT,
    );
  });

  test("prefix stays machine-parseable with a suffix present", () => {
    const cell = rcUnmetNeedsFromReason(popupReason, 1);
    expect(cell.startsWith("rc:")).toBe(true);
    expect(cell.startsWith(RC_CAMERA_RECONNECT_POPUP_QUIT)).toBe(true);
  });
});

describe("rcMinutesSinceStart", () => {
  test("pre-consent (global clock not yet created): falls back to minutes since page load", () => {
    expect(rcMinutesSinceStart(null, 90_000)).toBe(1.5);
    expect(rcMinutesSinceStart(undefined, 90_000)).toBe(1.5);
  });

  test("once the experiment clock exists it wins", () => {
    expect(rcMinutesSinceStart({ getTime: () => 120 }, 999_999)).toBe(2);
  });
});
