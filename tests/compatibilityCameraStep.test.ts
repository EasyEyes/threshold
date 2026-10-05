/**
 * @jest-environment jsdom
 */
// Field bug (studies 127-129, 3 sessions): a browser-side camera failure at
// the Choose Camera step rejects with `TypeError: not granted` (denied
// permission inside Prolific's iframe). runCameraSelectionStep had only
// try/finally — the rejection escaped to the scheduler and terminated the
// session as `_crash:compatChooseCamera:TypeError`. The step must instead
// resolve `false`, so the flow takes the established incompatibility exit
// (ending page + quitPsychoJS "compatibilityNotMet" + Prolific's
// incompatible-submission code), exactly like a declined sound-output choice.
import { runCameraSelectionStep } from "../components/compatibilityFlow";

// Fullscreen utilities — the guard under test (mocked at the seam).
jest.mock("../components/utils", () => ({
  isFullscreen: jest.fn(() => false),
  requestFullscreenSafe: jest.fn(async () => true),
}));
import { isFullscreen, requestFullscreenSafe } from "../components/utils";

jest.mock("../components/useCalibration", () => ({
  formCalibrationList: () => [{ name: "trackDistance", options: {} }],
  willCalibrateDistance: () => true,
}));
jest.mock("../components/headphoneCheck", () => ({
  _needSoundOutput: { current: "headphone" },
  headphoneCheckIsNeeded: () => false,
  renderHeadphoneCheckSummary: () => "",
  runHeadphoneCheck: async () => null,
}));

// global.js uses top-level await (module-only); jest's CJS transform can't.
jest.mock("../components/global", () => ({ status: { currentFunction: "" } }));

// The preview page reads i18n phrases; supply the key as the text.
jest.mock("../components/readPhrases", () => ({
  readi18nPhrases: (key: string) => key,
}));

// buildTestPlan sources willCalibrateDistance from compatibilityUI (not
// useCalibration) — override just that, keep the rest real.
jest.mock("../components/compatibilityUI", () => ({
  ...jest.requireActual("../components/compatibilityUI"),
  willCalibrateDistance: () => true,
}));

const paramReader = { read: jest.fn(() => []) } as any;
const keypad = { handler: {} } as any;

const rcThat = (selectCameraImpl: any) =>
  ({
    selectCamera: selectCameraImpl,
    keypadHandler: {},
    language: { value: "en" },
  }) as any;

describe("runCameraSelectionStep — failure must not escape", () => {
  it("camera rejection (field shape: TypeError 'not granted') resolves the rc: failure label", async () => {
    const rc = rcThat(
      jest.fn().mockRejectedValue(new TypeError("not granted")),
    );

    await expect(
      runCameraSelectionStep({ paramReader, rc, keypad }),
    ).resolves.toBe("rc:selectCameraFailed");
  });

  it("successful selection resolves true", async () => {
    const rc = rcThat(jest.fn().mockResolvedValue(undefined));

    await expect(
      runCameraSelectionStep({ paramReader, rc, keypad }),
    ).resolves.toBe(true);
  });
});

// Field (Acuity24Fonts5-12): 148 sessions stuck at compatChooseCamera —
// participants sat a median 3.3 min (p75 9.4) with an unresponsive page,
// then closed the tab; 102 reloaded and tried again. RemoteCalibrator's
// Choose Camera tiles silently ignore EVERY click while the page is not
// fullscreen (`if (!isFullscreen()) return`), so arriving windowed strands
// the participant with no visible explanation. Ensure fullscreen before
// the page opens.
describe("runCameraSelectionStep — fullscreen guard", () => {
  const clearMocks = () => {
    (isFullscreen as jest.Mock).mockReset().mockReturnValue(false);
    (requestFullscreenSafe as jest.Mock).mockReset().mockResolvedValue(true);
  };

  it("requests fullscreen BEFORE opening the camera page when not fullscreen", async () => {
    clearMocks();
    (isFullscreen as jest.Mock).mockReturnValue(false);
    const selectCamera = jest.fn().mockResolvedValue(undefined);
    const rc = rcThat(selectCamera);

    await runCameraSelectionStep({ paramReader, rc, keypad });

    expect(requestFullscreenSafe).toHaveBeenCalledWith(rc);
    expect(selectCamera).toHaveBeenCalled();
    // Ordering: the page must not open before the request.
    expect(
      (requestFullscreenSafe as jest.Mock).mock.invocationCallOrder[0],
    ).toBeLessThan(selectCamera.mock.invocationCallOrder[0]);
  });

  it("already fullscreen → no request", async () => {
    clearMocks();
    (isFullscreen as jest.Mock).mockReturnValue(true);
    const selectCamera = jest.fn().mockResolvedValue(undefined);

    await runCameraSelectionStep({
      paramReader,
      rc: rcThat(selectCamera),
      keypad,
    });

    expect(requestFullscreenSafe).not.toHaveBeenCalled();
    expect(selectCamera).toHaveBeenCalled();
  });

  it("failed fullscreen request must not block the camera page", async () => {
    clearMocks();
    (requestFullscreenSafe as jest.Mock).mockResolvedValue(false);
    const selectCamera = jest.fn().mockResolvedValue(undefined);

    await expect(
      runCameraSelectionStep({ paramReader, rc: rcThat(selectCamera), keypad }),
    ).resolves.toBe(true);
    expect(selectCamera).toHaveBeenCalled();
  });
});
// Field (Acuity24FontsAddSloan3, 2026-09-25): 12 sessions closed at
// compatChooseCamera WITH the swallowed-click fix live. Prolific feedback:
// "Kept saying my camera wasn't there. it was." RemoteCalibrator hides
// confidently-external webcams (glossary _calibrateDistanceAllowExternalCameraBool
// default FALSE); when every camera is external the Choose Camera page offers
// only Try Again (re-classifies identically — can never succeed) and OK, which
// RESOLVES rc.selectCamera with { selectedCamera: null, experimentEnded: true }.
// EasyEyes ignored the resolved value and continued as if a camera had been
// chosen — with none. The step must fold that into the established
// incompatibility exit under a camera-specific label, and must log the camera
// telemetry RC already attaches to the result (cameraArray, cameraFindTiming):
// field CSVs show ZERO camera columns for all 12 stranded sessions, so the
// next run cannot be diagnosed either.
describe("runCameraSelectionStep — participant ends at the no-camera popup", () => {
  it("selectCamera resolving { experimentEnded: true } → rejection label, not true", async () => {
    const rc = rcThat(
      jest.fn().mockResolvedValue({
        selectedCamera: null,
        experimentEnded: true,
      }),
    );

    const result = await runCameraSelectionStep({
      paramReader,
      rc,
      keypad,
      psychoJS: { experiment: { addData: jest.fn() } },
    });
    expect(result).not.toBe(true);
    expect(String(result)).toMatch(/^rc:/);
  });

  it("camera telemetry riding the result must reach the experiment data", async () => {
    const addData = jest.fn();
    const rc = rcThat(
      jest.fn().mockResolvedValue({
        selectedCamera: null,
        experimentEnded: true,
        cameraArray: [
          {
            name: "Logitech C920",
            class: "external",
            builtInScore: 0,
            externalScore: 7,
          },
        ],
        cameraFindSec: 4.2,
        cameraStartupError: null,
      }),
    );

    await runCameraSelectionStep({
      paramReader,
      rc,
      keypad,
      psychoJS: { experiment: { addData } },
    });

    const logged = Object.fromEntries(
      addData.mock.calls.filter(([k]) => !k.startsWith("warning")),
    );
    // Whatever the camera state was, it must be discoverable in the CSV:
    // the per-camera classification and the find timing.
    expect(JSON.stringify(logged)).toContain("Logitech C920");
    expect(JSON.stringify(logged)).toContain("external");
    expect(String(logged.cameraFindSec ?? "")).toContain("4.2");
  });

  it("telemetry also logged when selectCamera rejects", async () => {
    const addData = jest.fn();
    const rc = rcThat(
      jest.fn().mockRejectedValue(new TypeError("not granted")),
    );
    rc.cameraFindTiming = { cameraPermissionSec: 0.4 };

    await runCameraSelectionStep({
      paramReader,
      rc,
      keypad,
      psychoJS: { experiment: { addData } },
    });

    expect(addData).toHaveBeenCalledWith(
      "cameraFindTiming",
      expect.stringContaining("cameraPermissionSec"),
    );
  });
});

// Flow level: a camera failure must exit the WHOLE compatibility flow with
// the rejection-shaped result (same path as a declined sound-output choice)
// carrying the camera-specific unmetNeeds label, so the caller's
// incompatibility exit labels the session precisely instead of a generic
// "compatibilityNotMet".
import { runDeviceCompatibilityFlow } from "../components/compatibilityFlow";

describe("runDeviceCompatibilityFlow — camera failure wiring", () => {
  it("rejecting selectCamera → rejection-shaped result with rc:selectCameraFailed", async () => {
    const rc = rcThat(
      jest.fn().mockRejectedValue(new TypeError("not granted")),
    );
    const flow = runDeviceCompatibilityFlow({
      paramReader,
      rc,
      psychoJS: {},
      measureMeters: undefined,
      keypad,
      KeypadHandler: function () {},
      _key_resp_event_handlers: { current: [] },
      _key_resp_allKeys: { current: [] },
      ConnectionManager: null,
      ConnectionManagerDisplay: null,
      getConnectionManagerDisplay: null,
      handleLanguageChangeForConnectionManagerDisplay: null,
      keypadRequiredInExperiment: false,
      needPhoneSurveyRef: { current: false },
      needComputerSurveyBoolRef: { current: false },
      EasyEyesPeer: null,
      quitPsychoJS: jest.fn(),
    } as any);
    // Dismiss the compatibility preview page (click its Run button) so the
    // flow advances to the camera step.
    for (let i = 0; i < 40; i++) {
      const btn = document.querySelector(
        ".btn-success",
      ) as HTMLButtonElement | null;
      if (btn) {
        btn.click();
        break;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    const result = await flow;
    expect(result).toMatchObject({
      proceedButtonClicked: true,
      proceedBool: false,
      mic: {},
      loudspeaker: {},
      gotLoudspeakerMatchBool: false,
      unmetNeed: "rc:selectCameraFailed",
    });
  });
});

// The flow returns unmetNeed; the threshold caller must forward it to
// quitPsychoJS — otherwise camera failures land as generic
// "compatibilityNotMet" and the rc: label never reaches the data.
// The step's contract: ANY non-true outcome folds into the flow's
// incompatibility exit (proven above for the rejection path). The gap was
// that a no-camera end RESOLVES — so the step must inspect the result, not
// just catch. Source contract: selectCamera's return value is used.
describe("runCameraSelectionStep inspects selectCamera's resolved value", () => {
  const src = require("fs").readFileSync(
    require("path").join(__dirname, "..", "components", "compatibilityFlow.js"),
    "utf8",
  );
  it("does not discard the resolved result", () => {
    expect(src).toMatch(
      /const\s+cameraResult\s*=\s*await\s+rc\.selectCamera|cameraResult\s*=\s*await\s+rc\.selectCamera/,
    );
  });
});

describe("threshold caller forwards the unmetNeed label", () => {
  const fs = require("fs");
  const path = require("path");
  const src = () =>
    fs.readFileSync(path.join(__dirname, "..", "threshold.js"), "utf8");

  it("destructures unmetNeed from the flow result", () => {
    expect(src()).toMatch(
      /unmetNeed,\s*\n\s*}\s*=\s*await runDeviceCompatibilityFlow/,
    );
  });

  it("quits with the label, falling back to incompatible", () => {
    expect(src()).toMatch(/unmetNeed \|\| "incompatible"/);
  });
});

// Denis 2026-09-27 REQUEST 1: rename the emitted code compatibilityNotMet →
// incompatible (error-column value; unmetNeeds column unchanged; the old
// code remains understood for already-collected results files — Shiny maps
// both, LEGACY_CODES + the old error-table row keep it covered).
describe("termination code rename: compatibilityNotMet → incompatible", () => {
  const fs = require("fs");
  const path = require("path");
  const flowSrc = () =>
    fs.readFileSync(
      path.join(__dirname, "..", "components", "compatibilityFlow.js"),
      "utf8",
    );

  it("flow default result labels the session incompatible", () => {
    expect(flowSrc()).toMatch(
      /incompatibleFlowResult = \(unmetNeed = "incompatible"\)/,
    );
  });

  it("device-incompatible completion-code class accepts the new code", () => {
    // Behavioral coverage lives in tests/lifetime.test.ts; the old
    // "compatibilityNotMet" alternative is removed from the runtime regex
    // (dead — no emitter remains; old results files are never re-read).
    const lifetimeSrc = fs.readFileSync(
      path.join(__dirname, "..", "components", "lifetime.js"),
      "utf8",
    );
    expect(lifetimeSrc).toMatch(/\^\(rc:\|incompatible\|/);
  });

  it("error table documents the new code and keeps the old row", () => {
    const rows = fs
      .readFileSync(
        path.join(__dirname, "..", "errors", "easyeyes-error-table.tsv"),
        "utf8",
      )
      .split(/\r?\n/)
      .map((l) => l.split("\t")[0]);
    expect(rows).toContain("incompatible");
    expect(rows).toContain("compatibilityNotMet");
  });
});

describe("camera selection cancellation", () => {
  const { status } = require("../components/global");
  afterEach(() => {
    status.terminated = false;
  });
  // RC >= 0.9.164 resolves { experimentEnded: true, selectedCamera: null }
  // when the PARTICIPANT ends at the no-camera page (userEnded), with the
  // host alive — that is the no-camera incompatibility exit (with camera
  // telemetry), not a host cancellation. Host termination while the chooser
  // is open is signaled by status.terminated (covered below) and stays
  // rc:cameraSelectionCancelled.
  it("does not treat a participant-ended RC result as a completed check", async () => {
    await expect(
      runCameraSelectionStep({
        paramReader,
        rc: rcThat(
          jest.fn().mockResolvedValue({
            experimentEnded: true,
            selectedCamera: null,
          }),
        ),
        keypad,
      }),
    ).resolves.toBe("rc:noCameraDetected");
  });
  it("does not open the camera picker if Quit happened while entering fullscreen", async () => {
    (isFullscreen as jest.Mock).mockReturnValue(false);
    (requestFullscreenSafe as jest.Mock).mockImplementation(async () => {
      status.terminated = true;
      return true;
    });
    const selectCamera = jest.fn();
    await expect(
      runCameraSelectionStep({ paramReader, rc: rcThat(selectCamera), keypad }),
    ).resolves.toBe("rc:cameraSelectionCancelled");
    expect(selectCamera).not.toHaveBeenCalled();
  });
});

it("Quit removes the compatibility preview and cannot start its camera step", async () => {
  const { status } = require("../components/global");
  const {
    disposeStudyInteractions,
  } = require("../components/interaction/termination");
  const selectCamera = jest.fn();
  const waiting = runDeviceCompatibilityFlow({
    paramReader,
    rc: rcThat(selectCamera),
    psychoJS: {},
    keypad,
    KeypadHandler: function () {},
    _key_resp_event_handlers: { current: [] },
    _key_resp_allKeys: { current: [] },
    keypadRequiredInExperiment: false,
    needPhoneSurveyRef: { current: false },
    needComputerSurveyBoolRef: { current: false },
    quitPsychoJS: jest.fn(),
  } as any);
  expect(document.querySelector(".btn-success")).not.toBeNull();
  status.terminated = true;
  disposeStudyInteractions();
  try {
    const result = await waiting;
    expect(result.proceedBool).toBe(false);
    expect(selectCamera).not.toHaveBeenCalled();
    expect(document.querySelector(".btn-success")).toBeNull();
  } finally {
    status.terminated = false;
  }
});
