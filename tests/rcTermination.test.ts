import { describe, expect, test } from "@jest/globals";

// Item 1 (unmetNeeds what+where): the RC quit reason lives INSIDE the
// unmetNeeds cell (the column Analyze displays as the session's reason):
// `rc:<trigger>:quit(status=…,camera=…,attempts=…,min=…)` — label parseable
// by prefix, detail human-readable, no extra columns (elapsed time, device,
// routine, block all exist in other columns already).
import {
  RC_CAMERA_RECONNECT_POPUP_QUIT,
  fullscreenExitLabel,
  rcMinutesSinceStart,
  rcQuitTriggerFromReason,
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

describe("rcQuitTriggerFromReason + fullscreenExitLabel (overlay-routed RC quits)", () => {
  // An RC onQuit with an unknown/future trigger is routed to the fullscreen
  // pause overlay instead of terminating directly. When the participant then
  // chooses Quit, the label must still name the RC hook that opened the
  // overlay — otherwise the trigger is silently lost (the deployed RC only
  // emits cameraReconnectPopup/chooseScreenQuit today, both handled
  // directly; this carries whatever comes next).
  test("extracts and sanitizes the trigger from a quit reason", () => {
    expect(rcQuitTriggerFromReason({ trigger: "cameraReconnectPopup" })).toBe(
      "cameraReconnectPopup",
    );
    expect(rcQuitTriggerFromReason({ trigger: "weird: trigger!" })).toBe(
      "weirdtrigger",
    );
  });

  test("old RC builds (no reason object) → empty trigger string", () => {
    expect(rcQuitTriggerFromReason(undefined)).toBe("");
    expect(rcQuitTriggerFromReason(null)).toBe("");
    expect(rcQuitTriggerFromReason({})).toBe("");
  });

  test("no trigger → the unchanged legacy fullscreenExit label", () => {
    expect(fullscreenExitLabel("")).toBe("fullscreenExit");
    expect(fullscreenExitLabel(undefined)).toBe("fullscreenExit");
  });

  test("RC trigger rides the label: fullscreenExit(rc:<trigger>)", () => {
    expect(fullscreenExitLabel("futureQuitHook")).toBe(
      "fullscreenExit(rc:futureQuitHook)",
    );
  });

  test("label stays fullscreenExit-prefixed (aborted class, paren-aware split safe)", () => {
    const label = fullscreenExitLabel("weird: trigger,with stuff");
    expect(label).toBe("fullscreenExit(rc:weirdtriggerwithstuff)");
    expect(label.startsWith("fullscreenExit")).toBe(true);
    expect(label.startsWith("rc:")).toBe(false);
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
