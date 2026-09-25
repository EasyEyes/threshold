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

  it("quits with the label, falling back to compatibilityNotMet", () => {
    expect(src()).toMatch(/unmetNeed \|\| "compatibilityNotMet"/);
  });
});
