/**
 * EasyEyes Device-Compatibility Flow
 *
 * One-stop orchestrator for the participant-facing "Device Compatibility"
 * sequence at the start of every study. Replaces the inline pile of
 * camera-selection / headphone-check / system-check code that used to
 * live directly in `threshold.js`.
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ 1. Compatibility preview page                            │
 *   │    - Lists which compatibility tests are about to run.   │
 *   │    - Shows what EasyEyes already knows about the         │
 *   │      participant's device, including issues that the     │
 *   │      tests cannot fix (e.g. wrong browser, screen too    │
 *   │      small, missing memory). The participant sees ALL    │
 *   │      problems up front so they can decide whether to     │
 *   │      switch device, install headphones, etc.             │
 *   │    - Single "Run tests" button.                          │
 *   └──────────────┬───────────────────────────────────────────┘
 *                  │   (only the steps that the study needs)
 *                  ▼
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ 2. Choose camera (RemoteCalibrator), if calibrateDistance│
 *   │    Bool is enabled. Composed of up to three sub-pages    │
 *   │    rendered by RC: Choose Camera → Choose Screen →       │
 *   │    Camera Resolution.                                    │
 *   └──────────────┬───────────────────────────────────────────┘
 *                  │
 *                  ▼
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ 3. Headphone check (Milne et al. 2020), if               │
 *   │    headphoneCheckIsNeeded() returns true.                │
 *   └──────────────┬───────────────────────────────────────────┘
 *                  │
 *                  ▼
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ 4. Final compatibility report (displayCompatibilityMsg). │
 *   │    The single "OK / rejected" page the participant sees. │
 *   │    Includes the headphone-check verdict folded in.       │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Every sub-page in this flow shares a common "chrome" -- a fixed
 * page title in the upper-left (or upper-right in RTL) that reads
 * "Device Compatibility" + step name, plus an optional language
 * selector mirrored in the opposite corner -- so the participant
 * perceives the whole sequence as one section.
 *
 * The shared chrome and the ✓/✗ "known device facts" checklist live in
 * `compatibilityUI.js` so this preview page and the final report page
 * (`compatibilityCheck.js`) render identically without importing UI from
 * each other.
 */

import Swal from "sweetalert2";
import { readi18nPhrases } from "./readPhrases";
import {
  checkSystemCompatibility,
  createCameraPageLanguageMenu,
  displayCompatibilityMessage,
  handleCantReadQROnError,
  showExperimentEnding,
} from "./compatibilityCheck";
import {
  fillPhrase,
  getCompatibilityBodyTopOffset,
  ifTrue,
  isLanguageRTL as isRTL,
  mountCompatibilityChrome,
  renderFactRow,
  renderPhraseHTML,
  resolvePaperRulerAlert,
  summarizeKnownDeviceFacts,
  tryReadPhrase,
} from "./compatibilityUI";
import {
  _needSoundOutput,
  headphoneCheckIsNeeded,
  renderHeadphoneCheckSummary,
  runHeadphoneCheck,
} from "./headphoneCheck";
import { formCalibrationList } from "./useCalibration";
import { renderMarkdown } from "./markdownInline.js";

// Id reserved by this module's preview-page body container. The shared page
// chrome (title / language menu / shield) ids live in `compatibilityUI.js`.
const PREVIEW_PAGE_ID = "compatibility-preview-page";

// ---------------------------------------------------------------------------
// Plan: which sub-tests will the orchestrator actually run, in order? Driven
// entirely by the spreadsheet parameters. Each entry has a stable `id` and a
// translation key `labelKey`; the visible label is resolved at render time
// so the plan re-translates when the participant flips the language.
// ---------------------------------------------------------------------------
const buildTestPlan = (paramReader) => {
  const plan = [];

  if (ifTrue(paramReader.read("calibrateDistanceBool", "__ALL_BLOCKS__"))) {
    plan.push({
      id: "chooseCamera",
      labelKey: "EE_compatibilityTestChooseCamera",
    });
  }
  _needSoundOutput.current =
    paramReader.read("_needSoundOutput")?.[0] || "headphone";

  if (headphoneCheckIsNeeded(_needSoundOutput.current)) {
    plan.push({
      id: "headphoneCheck",
      labelKey:
        _needSoundOutput.current === "headphone"
          ? "EE_compatibilityTestHeadphoneCheckHeadphone"
          : "EE_compatibilityTestHeadphoneCheckLoudspeaker",
    });
  }

  // Always-on final compatibility report (browser, OS, screen, memory, ...).
  // plan.push({
  //   id: "compatibilityReport",
  //   labelKey: "EE_compatibilityTestReport",
  // });

  return plan;
};

// ---------------------------------------------------------------------------
// Preview page. Resolves when the participant clicks "Run tests".
// Uses the shared chrome so it visually matches every other page in the flow.
// ---------------------------------------------------------------------------
const showCompatibilityPreviewPage = ({
  paramReader,
  rc,
  testPlan,
  knownFacts,
}) =>
  new Promise((resolve) => {
    const chrome = mountCompatibilityChrome({
      paramReader,
      rc,
      showEyebrow: false,
      stepTitle:
        tryReadPhrase(
          "EE_compatibilityTitle1of2",
          rc?.language?.value || "en",
        ) ||
        tryReadPhrase("EE_compatibilityTitle", rc?.language?.value || "en") ||
        "",
      onLanguageChange: (newLang) => {
        chrome.setStepTitle(
          tryReadPhrase("EE_compatibilityTitle1of2", newLang) ||
            tryReadPhrase("EE_compatibilityTitle", newLang) ||
            "",
        );
        translatePreviewBody();
      },
    });

    // ----- Body container (mirrors displayCompatibilityMessage's
    //       msg-container so left/right alignment matches the final page). -----
    const page = document.createElement("div");
    page.id = PREVIEW_PAGE_ID;
    page.style.display = "flex";
    page.style.flexDirection = "column";
    page.style.position = "absolute";
    // Sync with the chrome's shield + language-menu stacking. On phones the
    // body starts lower because the language menu stacks below the title.
    page.style.top = getCompatibilityBodyTopOffset();
    page.style.right = "20vw";
    page.style.left = "20vw";
    page.style.minWidth = "60vw";
    page.style.zIndex = "10001";
    page.style.backgroundColor = "#eee";
    page.style.lineHeight = "1.5";

    const SECTION_TITLE_FONT_SIZE = "1.5rem";
    const SECTION_TITLE_FONT_WEIGHT = "500";
    const SECTION_TITLE_LINE_HEIGHT = "1.4";

    const knownTitle = document.createElement("h2");
    knownTitle.style.margin = "0 0 0.5rem 0";
    knownTitle.style.fontSize = SECTION_TITLE_FONT_SIZE;
    knownTitle.style.fontWeight = SECTION_TITLE_FONT_WEIGHT;
    knownTitle.style.lineHeight = SECTION_TITLE_LINE_HEIGHT;
    const knownList = document.createElement("ul");
    knownList.style.listStyle = "none";
    knownList.style.padding = "0";
    knownList.style.margin = "0 0 1.5rem 0";

    const intro = document.createElement("h2");
    intro.style.margin = "0 0 0.5rem 0";
    intro.style.fontSize = SECTION_TITLE_FONT_SIZE;
    intro.style.fontWeight = SECTION_TITLE_FONT_WEIGHT;
    intro.style.lineHeight = SECTION_TITLE_LINE_HEIGHT;
    const planList = document.createElement("ol");
    planList.style.margin = "0px 0px 0.8rem";

    // "You'll need a paper / ruler" alert. Same phrase shown on the final
    // compatibility page (see EE_DeviceCompatibilityPaper... handling in
    // `checkSystemCompatibility`), hoisted here so the participant sees it
    // BEFORE running any tests. `pre-line` preserves the leading "\n" in
    // each EE_DeviceCompatibility* phrase.
    const paperRulerAlert = resolvePaperRulerAlert(paramReader);
    const paperRulerNote = document.createElement("p");
    // paperRulerNote.style.whiteSpace = "pre-line";
    paperRulerNote.style.margin = "0 0 1.5rem 0";
    if (!paperRulerAlert) paperRulerNote.style.display = "none";

    const note = document.createElement("p");
    note.style.fontStyle = "italic";
    note.style.opacity = "0.85";
    note.style.margin = "0 0 0 0";

    const buttonWrapper = document.createElement("div");
    buttonWrapper.style.display = "flex";
    buttonWrapper.style.alignItems = "center";
    buttonWrapper.style.gap = "1rem";
    buttonWrapper.style.marginTop = "1.5rem";
    const runButton = document.createElement("button");
    runButton.classList.add("btn", "btn-success");
    runButton.style.width = "fit-content";
    runButton.style.padding = "10px";
    runButton.style.minWidth = "9rem";
    runButton.style.fontWeight = "bold";
    buttonWrapper.appendChild(runButton);

    // Prolific compatibility-check footnote. Mirrors the block that
    // `displayCompatibilityMessage` renders on the final compatibility page so
    // participants see the rationale (and Prolific policy URL + study URL) up
    // front, instead of only after the tests run.
    const prolificPolicy = document.createElement("div");
    prolificPolicy.id = "prolific-policy-preview";
    prolificPolicy.style.fontSize = "0.9rem";
    prolificPolicy.style.marginTop = "1.5rem";

    const prolificRule = document.createElement("p");
    prolificRule.id = "prolific-rule-preview";
    prolificRule.style.marginBottom = "2px";
    prolificPolicy.appendChild(prolificRule);

    const prolificPolicyUrl = document.createElement("p");
    prolificPolicyUrl.innerHTML =
      "https://researcher-help.prolific.com/en/article/4ae222";
    prolificPolicyUrl.style.pointerEvents = "none";
    prolificPolicy.appendChild(prolificPolicyUrl);

    // Study URL deliberately omitted from the preview page: the page is
    // not in full-screen mode, so the participant can read the URL straight
    // out of the browser's address bar -- repeating it here is redundant.

    page.appendChild(knownTitle);
    page.appendChild(knownList);
    page.appendChild(intro);
    page.appendChild(planList);
    page.appendChild(paperRulerNote);
    page.appendChild(note);
    page.appendChild(buttonWrapper);
    page.appendChild(prolificPolicy);

    const translatePreviewBody = () => {
      const lang = rc.language.value;
      const rtl = isRTL(lang);
      page.style.direction = rtl ? "rtl" : "ltr";
      page.style.textAlign = rtl ? "right" : "left";

      const hasTests = testPlan.length > 0;
      intro.style.display = hasTests ? "" : "none";
      planList.style.display = hasTests ? "" : "none";
      note.style.display = hasTests ? "" : "none";

      if (hasTests) {
        intro.innerHTML = renderMarkdown(
          tryReadPhrase("EE_compatibilityPreviewIntro", lang) || "",
        );

        planList.innerHTML = "";
        testPlan.forEach((step) => {
          const li = document.createElement("li");
          li.textContent = tryReadPhrase(step.labelKey, lang) || step.labelKey;
          li.style.marginBottom = "0.25rem";
          planList.appendChild(li);
        });
      }

      const anyIssue = knownFacts.some((f) => !f.ok);
      knownTitle.innerHTML = renderMarkdown(
        tryReadPhrase("EE_compatibilityPreviewKnownTitle", lang) || "",
      );

      knownList.innerHTML = "";
      knownFacts.forEach((f) => {
        const li = document.createElement("li");
        li.style.padding = "0.15rem 0";
        const mark = document.createElement("span");
        mark.textContent = f.ok ? "✓ " : "✗ ";
        mark.style.fontWeight = "bold";
        mark.style.color = f.ok ? "#1a7f37" : "#b42318";
        mark.style.marginInlineEnd = "0.5rem";
        const text = document.createElement("span");
        text.textContent = renderFactRow(f, lang);
        li.appendChild(mark);
        li.appendChild(text);
        knownList.appendChild(li);
      });

      if (hasTests) {
        note.innerHTML = renderMarkdown(
          anyIssue
            ? tryReadPhrase("EE_compatibilityPreviewNoteHasIssues", lang) || ""
            : tryReadPhrase("EE_compatibilityPreviewNoteAllOk", lang) || "",
        );
      }

      // Paper / ruler alert (when distance calibration is involved). Same
      // EE_DeviceCompatibility{Paper,Ruler,PaperAndRuler,PaperOrRuler}
      // phrase shown on the final compatibility page; rendered with the
      // same `marked.parseInline` pipeline so inline HTML and `**bold**`
      // substrings come through.
      if (paperRulerAlert) {
        const rawPhrase = tryReadPhrase(paperRulerAlert.phraseKey, lang) || "";
        paperRulerNote.innerHTML = renderPhraseHTML(
          fillPhrase(rawPhrase, paperRulerAlert.params),
        );
        paperRulerNote.style.direction = rtl ? "rtl" : "ltr";
        paperRulerNote.style.textAlign = rtl ? "right" : "left";
      }

      // Mirror the prolific-policy footnote rendered on the final compatibility
      // page (`displayCompatibilityMessage` in compatibilityCheck.js).
      prolificPolicy.style.textAlign = rtl ? "right" : "left";
      prolificPolicy.style.direction = rtl ? "rtl" : "ltr";
      prolificRule.innerHTML = renderMarkdown(
        tryReadPhrase("EE_ProlificCompatibilityRule", lang) || "",
      );

      runButton.textContent = hasTests
        ? tryReadPhrase("EE_compatibilityPreviewRunButton", lang) || ""
        : tryReadPhrase("T_proceed", lang) || "";
    };
    translatePreviewBody();

    document.body.prepend(page);
    runButton.focus({ preventScroll: true });

    let done = false;
    const onClick = () => {
      if (done) return;
      done = true;
      runButton.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown, true);
      page.remove();
      chrome.unmount();
      resolve();
    };
    const onKeyDown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }
    };
    runButton.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown, true);
  });

// ---------------------------------------------------------------------------
// Step: camera selection (RemoteCalibrator). Mirrors the original threshold.js
// snippet exactly, so RC continues to drive the up-to-three-page Choose
// Camera → Choose Screen → Camera Resolution sub-flow. We just provide the
// language menu and the keypad handler bridge.
// ---------------------------------------------------------------------------
const runCameraSelectionStep = async ({ paramReader, rc, keypad }) => {
  const calibrationTasks = formCalibrationList(paramReader);
  const trackDistanceTask = calibrationTasks.find(
    (t) => (typeof t === "string" ? t : t.name) === "trackDistance",
  );
  if (!trackDistanceTask || typeof rc.selectCamera !== "function") return;

  const tdOpts =
    (typeof trackDistanceTask === "object" && trackDistanceTask.options) || {};

  rc.keypadHandler.keypad = keypad.handler;

  const cameraPageLanguageMenu = createCameraPageLanguageMenu(paramReader, rc);
  try {
    await rc.selectCamera(tdOpts);
  } finally {
    cameraPageLanguageMenu?.remove();
  }
};

// ---------------------------------------------------------------------------
// Step: headphone check. Logs the verdict to PsychoJS and returns the result
// so the orchestrator can fold it into the final compatibility report.
// The page styling is owned by `headphoneCheck.js`, which mounts the same
// `mountCompatibilityChrome` so it lines up with the rest of the flow.
// ---------------------------------------------------------------------------
const runHeadphoneCheckStep = async ({ paramReader, rc, psychoJS }) => {
  if (!headphoneCheckIsNeeded(_needSoundOutput.current)) return null;
  try {
    const result = await runHeadphoneCheck({
      requirement: _needSoundOutput.current,
      paramReader,
      rc,
    });
    if (psychoJS) {
      psychoJS.experiment.addData("HeadphoneCheck", JSON.stringify(result));
      psychoJS.experiment.nextEntry();
    }
    return result;
  } catch (e) {
    console.error("Headphone check failed to run:", e);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Step: final compatibility report. Calls into the existing
// `displayCompatibilityMessage` and forwards every dependency that the page
// still needs (PsychoJS, KeypadHandler, ConnectionManager, etc.). Folds the
// headphone-check result into the report notes before rendering.
// ---------------------------------------------------------------------------
const runFinalCompatibilityReportStep = async ({
  paramReader,
  rc,
  psychoJS,
  measureMeters,
  headphoneCheckResult,
  keypad,
  KeypadHandler,
  _key_resp_event_handlers,
  _key_resp_allKeys,
  ConnectionManager,
  ConnectionManagerDisplay,
  getConnectionManagerDisplay,
  handleLanguageChangeForConnectionManagerDisplay,
  keypadRequiredInExperiment,
  needPhoneSurveyRef,
  needComputerSurveyBoolRef,
  EasyEyesPeer,
  quitPsychoJS,
}) => {
  const headphoneCheckRan = !!(
    headphoneCheckResult && headphoneCheckResult.ran
  );
  const headphoneCheckMeetsRequirement =
    !headphoneCheckRan || headphoneCheckResult.meetsRequirement;

  const compMsg = await checkSystemCompatibility(
    paramReader,
    rc.language.value,
    rc,
    true,
    psychoJS,
    measureMeters,
    paramReader.read("_needBrowserActualName")[0],
    headphoneCheckMeetsRequirement,
  );

  // Closure that re-renders the headphone-check summary in any language.
  // Passed to `displayCompatibilityMessage`, which folds it into the friendly
  // ✓/✗ device-facts checklist (NOT appended as a trailing note) so the
  // participant's language dropdown / refresh button can refresh it in place.
  const getHeadphoneCheckSummary = headphoneCheckRan
    ? (lang) => {
        const summary = renderHeadphoneCheckSummary(headphoneCheckResult, lang);
        return summary ? "\n\n" + summary : "";
      }
    : null;

  // TODO: hook these up once the spreadsheet wiring lands. They mirror the
  // values that used to be assembled inline in threshold.js.
  const needAnySmartphone = false;
  const needCalibratedSmartphoneMicrophone = false;

  const needCalibratedSound = (
    paramReader.read("_needCalibratedSound")?.[0] || ""
  ).split(",");

  let compatibilityCheckPeer = null;
  if (needPhoneSurveyRef.current || needAnySmartphone) {
    const params = {
      text: readi18nPhrases("RC_smartphoneOkThanks", rc.language.value),
      onError: () => {
        Swal.fire({
          allowOutsideClick: false,
          html: renderPhraseHTML(
            readi18nPhrases("RC_cantDrawQR", rc.language.value),
          ),
          icon: "error",
          confirmButtonText: readi18nPhrases(
            "RC_cantConnectPhone_Button",
            rc.language.value,
          ),
        }).then(async (result) => {
          if (!result.isConfirmed) return;
          const { mic, loudspeaker } = await handleCantReadQROnError(
            rc,
            psychoJS,
            needPhoneSurveyRef.current,
            needCalibratedSound,
            needComputerSurveyBoolRef.current,
          );
          if (needPhoneSurveyRef.current) {
            psychoJS.experiment.addData(
              "Microphone survey",
              JSON.stringify(mic.phoneSurvey),
            );
            psychoJS.experiment.nextEntry();
          }
          if (needComputerSurveyBoolRef.current) {
            psychoJS.experiment.addData(
              "Loudspeaker survey",
              JSON.stringify(loudspeaker),
            );
            psychoJS.experiment.nextEntry();
          }
          showExperimentEnding();
          quitPsychoJS("", true, paramReader);
        });
      },
    };
    compatibilityCheckPeer = new EasyEyesPeer.ExperimentPeer(params);
    await compatibilityCheckPeer.init();
  }

  return await displayCompatibilityMessage(
    compMsg.notes,
    paramReader,
    rc,
    compMsg.promptRefresh,
    compMsg.proceed,
    compatibilityCheckPeer,
    needAnySmartphone,
    needCalibratedSmartphoneMicrophone,
    needComputerSurveyBoolRef.current,
    needCalibratedSound,
    psychoJS,
    quitPsychoJS,
    keypad,
    KeypadHandler,
    _key_resp_event_handlers,
    _key_resp_allKeys,
    ConnectionManager.handler,
    ConnectionManagerDisplay,
    getConnectionManagerDisplay,
    handleLanguageChangeForConnectionManagerDisplay,
    keypadRequiredInExperiment,
    getHeadphoneCheckSummary,
    headphoneCheckMeetsRequirement,
  );
};

// ---------------------------------------------------------------------------
// Public orchestrator. Pure top-down readability: preview → camera → headphone
// → final report. Returns the same shape that `displayCompatibilityMessage`
// always returned, so threshold.js can keep using the result downstream.
// ---------------------------------------------------------------------------
//
// `needPhoneSurveyRef` / `needComputerSurveyBoolRef` are the global
// `{ current: ... }` refs from `components/global.js`; threshold.js passes
// them straight through.
//
// `EasyEyesPeer` and `quitPsychoJS` are passed in (rather than imported) to
// keep this module loosely coupled to the lifecycle / global script tag.
export const runDeviceCompatibilityFlow = async ({
  paramReader,
  rc,
  psychoJS,
  measureMeters,
  keypad,
  KeypadHandler,
  _key_resp_event_handlers,
  _key_resp_allKeys,
  ConnectionManager,
  ConnectionManagerDisplay,
  getConnectionManagerDisplay,
  handleLanguageChangeForConnectionManagerDisplay,
  keypadRequiredInExperiment,
  needPhoneSurveyRef,
  needComputerSurveyBoolRef,
  EasyEyesPeer,
  quitPsychoJS,
}) => {
  const testPlan = buildTestPlan(paramReader);
  const knownFacts = summarizeKnownDeviceFacts(paramReader, rc);

  await showCompatibilityPreviewPage({
    paramReader,
    rc,
    testPlan,
    knownFacts,
  });

  if (testPlan.some((s) => s.id === "chooseCamera")) {
    await runCameraSelectionStep({ paramReader, rc, keypad });
  }

  const headphoneCheckResult = testPlan.some((s) => s.id === "headphoneCheck")
    ? await runHeadphoneCheckStep({ paramReader, rc, psychoJS })
    : null;

  // Note: the caller (threshold.js) is responsible for the post-result
  // bookkeeping -- copying mic / loudspeaker into the global refs, writing
  // survey rows to PsychoJS, hiding the message, and quitting on rejection.
  // We return the same shape that `displayCompatibilityMessage` always
  // returned so the caller's existing flow keeps working unchanged.
  return await runFinalCompatibilityReportStep({
    paramReader,
    rc,
    psychoJS,
    measureMeters,
    headphoneCheckResult,
    keypad,
    KeypadHandler,
    _key_resp_event_handlers,
    _key_resp_allKeys,
    ConnectionManager,
    ConnectionManagerDisplay,
    getConnectionManagerDisplay,
    handleLanguageChangeForConnectionManagerDisplay,
    keypadRequiredInExperiment,
    needPhoneSurveyRef,
    needComputerSurveyBoolRef,
    EasyEyesPeer,
    quitPsychoJS,
  });
};
