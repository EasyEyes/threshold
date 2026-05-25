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
 */

import Swal from "sweetalert2";
import { readi18nPhrases } from "./readPhrases";
import {
  checkSystemCompatibility,
  createCameraPageLanguageMenu,
  detectBrowser,
  displayCompatibilityMessage,
  getDeviceType,
  handleCantReadQROnError,
  handleLanguage,
  showExperimentEnding,
} from "./compatibilityCheck";
import {
  _needSoundOutput,
  headphoneCheckIsNeeded,
  renderHeadphoneCheckSummary,
  runHeadphoneCheck,
} from "./headphoneCheck";
import { formCalibrationList } from "./useCalibration";

// ---------------------------------------------------------------------------
// Element ids reserved by this module. Kept in one place so we can clean up
// reliably if the participant navigates away mid-flow.
// ---------------------------------------------------------------------------
const PREVIEW_PAGE_ID = "compatibility-preview-page";
const CHROME_TITLE_ID = "compatibility-chrome-title";
const CHROME_LANGUAGE_WRAPPER_ID = "compatibility-chrome-language-wrapper";

const ifTrue = (arr) => {
  if (!arr) return false;
  for (const a of arr) if (a) return true;
  return false;
};

const tryReadPhrase = (key, lang) => {
  try {
    return readi18nPhrases(key, lang);
  } catch {
    return null;
  }
};

// Replace `[[KEY]]` tokens (e.g. `[[N11]]`, `[[XX1]]`) inside a translated
// phrase with caller-supplied values. Mirrors the convention used elsewhere
// in compatibilityCheck.js so the substitution is identical across the
// codebase.
export const fillPhrase = (template, params) => {
  if (!template) return "";
  if (!params) return template;
  let out = String(template);
  for (const [key, value] of Object.entries(params)) {
    out = out.replace(
      new RegExp(`\\[\\[${key}\\]\\]`, "g"),
      String(value ?? ""),
    );
  }
  return out;
};

const isRTL = (lang) =>
  (readi18nPhrases("EE_languageDirection", lang) || "LTR")
    .toString()
    .toLowerCase() === "rtl";

// ---------------------------------------------------------------------------
// Shared "page chrome" used by the preview page AND by the headphone-check
// page so they look pixel-identical to the RemoteCalibrator camera-flow
// pages (Choose Camera / Choose Screen / Camera Resolution). Returns
// helpers that let the caller update the visible eyebrow / step-title
// text and tear everything down.
// ---------------------------------------------------------------------------
//
// Title styling deliberately mirrors RC's `showCameraTitleInTopRight`
// (rc-camera-title-top-right) byte-for-byte:
//   - <div id="compatibility-chrome-title"> at position: fixed;
//     top: 2rem; left/right: 3rem; z-index: 9999999999;
//     pointer-events: none; color: #000; uses the Apple/Segoe/Roboto
//     system font stack inline (no CSS class) so the styling is
//     guaranteed identical regardless of which pages have loaded
//     `forms.css`.
//   - Inside it, a small "Device compatibility" eyebrow
//     (`rc-camera-title-eyebrow`, 1.4rem, weight 400, line-height 1.6,
//     margin-bottom 0.15em) and an H1 step name (1.8rem on mobile,
//     2.5rem on desktop, weight 400, line-height 120%/100%, margin 0).
//
// The optional language selector is mirrored to the opposite corner at
// `top: 2rem; right/left: 3rem` to match `createCameraPageLanguageMenu`.
//
// Body background flips to `#eee` and `#root` is hidden, just like
// every other compatibility / camera page.
//
// Returns `{ setStepTitle, refreshLanguage, unmount }`.
const TITLE_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";

export const mountCompatibilityChrome = ({
  paramReader,
  rc,
  stepTitle,
  onLanguageChange,
}) => {
  document.body.classList.add("easyeyes-gray-bg");
  document.documentElement.classList.add("easyeyes-gray-bg");
  const previousBg = document.body.style.backgroundColor;
  document.body.style.backgroundColor = "#eee";

  const rootEl = document.getElementById("root");
  const previousRootDisplay = rootEl ? rootEl.style.display : null;
  if (rootEl) rootEl.style.display = "none";

  // ----- Title ("Device Compatibility" eyebrow + step H1) -----
  // Hardened to match RC `showCameraTitleInTopRight` exactly.
  const smallScreen = window.matchMedia("(max-width: 480px)").matches;
  const sizePageTitleSize = smallScreen ? "1.8rem" : "2.5rem";
  const sizePageTitleLineHeight = smallScreen ? "120%" : "100%";

  const titleEl = document.createElement("div");
  titleEl.id = CHROME_TITLE_ID;
  titleEl.style.position = "fixed";
  titleEl.style.top = "2rem";
  titleEl.style.zIndex = "9999999999";
  titleEl.style.color = "#000";
  titleEl.style.margin = "0";
  titleEl.style.pointerEvents = "none";
  titleEl.style.fontFamily = TITLE_FONT_FAMILY;

  const eyebrow = document.createElement("div");
  eyebrow.className = "rc-camera-title-eyebrow";
  eyebrow.style.margin = "0 0 0.15em 0";
  eyebrow.style.padding = "0";
  eyebrow.style.fontFamily = TITLE_FONT_FAMILY;
  eyebrow.style.fontSize = "1.4rem";
  eyebrow.style.fontWeight = "400";
  eyebrow.style.color = "#000";
  eyebrow.style.lineHeight = "1.6";
  eyebrow.textContent =
    tryReadPhrase("EE_DeviceCompatibility", rc?.language?.value || "en") ||
    "Device compatibility";

  const h1 = document.createElement("h1");
  h1.style.margin = "0";
  h1.style.padding = "0";
  h1.style.fontFamily = TITLE_FONT_FAMILY;
  h1.style.fontSize = sizePageTitleSize;
  h1.style.fontWeight = "400";
  h1.style.color = "#000";
  h1.style.lineHeight = sizePageTitleLineHeight;
  h1.textContent = stepTitle || "";

  titleEl.appendChild(eyebrow);
  titleEl.appendChild(h1);

  const applyTitleDirection = () => {
    const rtl = isRTL(rc?.language?.value || "en");
    titleEl.dir = rtl ? "rtl" : "ltr";
    if (rtl) {
      titleEl.style.left = "";
      titleEl.style.right = "3rem";
      titleEl.style.textAlign = "right";
      titleEl.style.direction = "rtl";
    } else {
      titleEl.style.right = "";
      titleEl.style.left = "3rem";
      titleEl.style.textAlign = "left";
      titleEl.style.direction = "ltr";
    }
  };
  applyTitleDirection();
  document.body.appendChild(titleEl);

  // ----- Language selector (mirror-positioned to the title) -----
  // Styling matches `createCameraPageLanguageMenu` (camera-flow pages).
  // Pin font-family / font-size to <body>'s computed values so the menu
  // looks identical even when mounted inside a fullscreen container.
  const bodyStyle = window.getComputedStyle(document.body);
  const bodyFontFamily = bodyStyle.fontFamily;
  const bodyFontSize = bodyStyle.fontSize;

  let languageWrapper = null;
  let languageDropdown = null;
  let languageTitle = null;
  if (paramReader?.read("_languageSelectionByParticipantBool")?.[0]) {
    languageWrapper = document.createElement("div");
    languageWrapper.id = CHROME_LANGUAGE_WRAPPER_ID;
    languageWrapper.style.position = "fixed";
    languageWrapper.style.top = "2rem";
    languageWrapper.style.zIndex = "2147483647";
    languageWrapper.style.fontFamily = bodyFontFamily;
    languageWrapper.style.fontSize = bodyFontSize;
    languageWrapper.style.display = "flex";
    languageWrapper.style.flexDirection = "column";
    languageWrapper.style.margin = "0";

    languageTitle = document.createElement("p");
    languageTitle.style.fontSize = "1.1rem";
    languageTitle.style.fontWeight = "bold";
    languageTitle.style.marginTop = "0";
    languageTitle.style.marginBottom = "5px";
    languageTitle.style.fontFamily = "inherit";
    languageTitle.style.alignSelf = "stretch";
    languageTitle.style.lineHeight = "1.94rem";
    languageTitle.textContent = readi18nPhrases(
      "EE_languageChoose",
      rc.language.value,
    );
    languageWrapper.appendChild(languageTitle);

    languageDropdown = document.createElement("select");
    languageDropdown.style.width = "fit-content";
    languageDropdown.style.backgroundColor = "#999";
    languageDropdown.style.color = "white";
    languageDropdown.style.borderRadius = "0.3rem";
    languageDropdown.style.fontFamily = "inherit";

    const languagesNative = readi18nPhrases("EE_languageNameNative");
    const languagesEnglish = readi18nPhrases("EE_languageNameEnglish");
    Object.keys(languagesNative).forEach((key) => {
      const option = document.createElement("option");
      option.value = languagesNative[key];
      option.innerHTML = `${languagesEnglish[key]} (${languagesNative[key]})`;
      languageDropdown.appendChild(option);
    });
    languageDropdown.value = languagesNative[rc.language.value];

    const SELECT_TEXT_INSET_PX = 4;
    const applyLanguageMenuLayout = () => {
      const rtl = isRTL(rc.language.value);
      if (rtl) {
        languageWrapper.style.left = "3rem";
        languageWrapper.style.right = "";
        languageWrapper.style.textAlign = "right";
        languageDropdown.style.alignSelf = "flex-start";
        languageTitle.style.direction = "rtl";
        languageTitle.style.textAlign = "right";
        languageTitle.style.paddingLeft = "0";
        languageTitle.style.paddingRight = `${SELECT_TEXT_INSET_PX}px`;
      } else {
        languageWrapper.style.right = "3rem";
        languageWrapper.style.left = "";
        languageWrapper.style.textAlign = "left";
        languageDropdown.style.alignSelf = "flex-end";
        languageTitle.style.direction = "ltr";
        languageTitle.style.textAlign = "left";
        languageTitle.style.paddingLeft = `${SELECT_TEXT_INSET_PX}px`;
        languageTitle.style.paddingRight = "0";
      }
    };
    applyLanguageMenuLayout();
    languageWrapper.appendChild(languageDropdown);

    languageDropdown.addEventListener("change", () => {
      handleLanguage(languageDropdown.value, rc, /* useEnglishNames= */ false);
      const newLang = rc.language.value;
      eyebrow.textContent =
        tryReadPhrase("EE_DeviceCompatibility", newLang) ||
        "Device compatibility";
      languageTitle.textContent = readi18nPhrases("EE_languageChoose", newLang);
      applyTitleDirection();
      applyLanguageMenuLayout();
      if (typeof onLanguageChange === "function") {
        try {
          onLanguageChange(newLang);
        } catch (_e) {
          // Caller's translator should not be able to crash the chrome.
        }
      }
    });

    document.body.appendChild(languageWrapper);
  }

  return {
    /** Replace the step name (the H1, not the eyebrow). */
    setStepTitle: (text) => {
      h1.textContent = text || "";
    },
    /** Re-translate caller-managed text after a language change. */
    refreshLanguage: () => {
      const newLang = rc?.language?.value || "en";
      eyebrow.textContent =
        tryReadPhrase("EE_DeviceCompatibility", newLang) ||
        "Device compatibility";
      if (languageTitle) {
        languageTitle.textContent = readi18nPhrases(
          "EE_languageChoose",
          newLang,
        );
      }
      applyTitleDirection();
    },
    /** Tear down everything this chrome added. */
    unmount: () => {
      titleEl.remove();
      if (languageWrapper) languageWrapper.remove();
      if (rootEl && previousRootDisplay !== null) {
        rootEl.style.display = previousRootDisplay;
      }
      document.body.style.backgroundColor = previousBg;
    },
  };
};

// ---------------------------------------------------------------------------
// Static, no-user-interaction snapshot of what we already know about the
// participant's compatibility. Shown on the preview page so the participant
// can spot show-stoppers (wrong browser, screen too small, no memory) BEFORE
// running any tests.
//
// Kept deliberately separate from `getCompatibilityRequirements` so we don't
// double-populate the module-level `needsUnmet` array in compatibilityCheck.js.
//
// Each entry is a translation-agnostic descriptor:
//   { ok, labelKey, rawValue, detailKey, detailParams }
// `rawValue` is the locale-neutral detected string (e.g. "Chrome 120");
// when null, the rendered detail uses the translated "Unknown" phrase.
// `detailKey` / `detailParams` carry the optional parenthetical reason
// (e.g. "(this study needs: Chrome)") so the renderer can re-translate
// the entire row when the participant changes language.
// ---------------------------------------------------------------------------
const summarizeKnownDeviceFacts = (paramReader, rc) => {
  const facts = [];

  // Browser
  const _detectedBrowserRaw =
    rc?.browser?.value ||
    (typeof window !== "undefined" ? detectBrowser() : "");
  const detectedBrowserRaw = _detectedBrowserRaw.replace(
    "Microsoft Edge",
    "Edge",
  );
  const detectedBrowserVersionRaw = rc?.browserVersion?.value || "";
  const compatibleBrowser = (paramReader.read("_needBrowser")?.[0] || "all")
    .split(",")
    .map((s) => s.trim());
  const compatibleBrowserVersionMin =
    Number(paramReader.read("_needBrowserVersionMinimum")?.[0]) || 0;
  const browserType = (compatibleBrowser[0] || "all").slice(0, 3);

  let browserOK = true;
  let browserDetailKey = null;
  let browserDetailParams = null;
  const browserValue = detectedBrowserRaw
    ? `${detectedBrowserRaw}${
        detectedBrowserVersionRaw ? " " + detectedBrowserVersionRaw : ""
      }`
    : null;
  if (browserType === "all") {
    // Any browser allowed.
  } else if (browserType === "not") {
    if (
      detectedBrowserRaw &&
      compatibleBrowser.includes("not" + detectedBrowserRaw)
    ) {
      browserOK = false;
      browserDetailKey = "EE_compatibilityFactDetailNotAllowed";
    }
  } else {
    if (detectedBrowserRaw && !compatibleBrowser.includes(detectedBrowserRaw)) {
      browserOK = false;
      browserDetailKey = "EE_compatibilityFactDetailStudyNeeds";
      browserDetailParams = { XX1: compatibleBrowser.join(", ") };
    } else if (compatibleBrowserVersionMin > 0) {
      const major = Number(String(detectedBrowserVersionRaw).split(".")[0]);
      if (Number.isFinite(major) && major < compatibleBrowserVersionMin) {
        browserOK = false;
        browserDetailKey = "EE_compatibilityFactDetailNeedAtLeast";
        browserDetailParams = { N11: compatibleBrowserVersionMin };
      }
    }
  }
  facts.push({
    ok: browserOK,
    labelKey: "EE_compatibilityFactBrowser",
    rawValue: browserValue,
    detailKey: browserDetailKey,
    detailParams: browserDetailParams,
  });

  // Operating system
  const _detectedOSRaw = rc?.systemFamily?.value || "";
  const detectedOSRaw = _detectedOSRaw
    .replace("Mac", "macOS")
    .replace("OS X", "macOS");
  const compatibleOS = (paramReader.read("_needOperatingSystem")?.[0] || "all")
    .split(",")
    .map((s) => s.trim());
  const osType = (compatibleOS[0] || "all").slice(0, 3);
  let osOK = true;
  let osDetailKey = null;
  let osDetailParams = null;
  if (osType === "all") {
    // Any OS allowed.
  } else if (osType === "not") {
    if (detectedOSRaw && compatibleOS.includes("not" + detectedOSRaw)) {
      osOK = false;
      osDetailKey = "EE_compatibilityFactDetailNotAllowed";
    }
  } else if (detectedOSRaw && !compatibleOS.includes(detectedOSRaw)) {
    osOK = false;
    osDetailKey = "EE_compatibilityFactDetailStudyNeeds";
    osDetailParams = { XX1: compatibleOS.join(", ") };
  }
  facts.push({
    ok: osOK,
    labelKey: "EE_compatibilityFactOS",
    rawValue: detectedOSRaw || null,
    detailKey: osDetailKey,
    detailParams: osDetailParams,
  });

  // Device type
  const detectedDevice = getDeviceType();
  const compatibleDevice = (paramReader.read("_needDeviceType")?.[0] || "all")
    .split(",")
    .map((s) => s.trim());
  let deviceOK = true;
  let deviceDetailKey = null;
  let deviceDetailParams = null;
  if (
    compatibleDevice.length &&
    compatibleDevice[0] !== "all" &&
    !compatibleDevice.includes(detectedDevice)
  ) {
    deviceOK = false;
    deviceDetailKey = "EE_compatibilityFactDetailStudyNeeds";
    deviceDetailParams = { XX1: compatibleDevice.join(", ") };
  }
  facts.push({
    ok: deviceOK,
    labelKey: "EE_compatibilityFactDeviceType",
    rawValue: detectedDevice || null,
    detailKey: deviceDetailKey,
    detailParams: deviceDetailParams,
  });

  // Screen size
  const screenW = window.screen?.width || 0;
  const screenH = window.screen?.height || 0;
  facts.push({
    ok: true,
    labelKey: "EE_compatibilityFactScreenResolution",
    rawValue: "",
    detailKey: "EE_compatibilityFactScreenResolutionDetail",
    detailParams: { N11: screenW, N22: screenH },
  });

  // Memory
  const needMemoryGB = Number(paramReader.read("_needMemoryGB")?.[0]) || 0;
  const deviceMemoryGB = navigator.deviceMemory;
  if (needMemoryGB > 0) {
    if (deviceMemoryGB === undefined) {
      facts.push({
        ok: true,
        labelKey: "EE_compatibilityFactMemory",
        rawValue: "",
        detailKey: "EE_compatibilityFactMemoryDetailAtLeast",
        detailParams: { N11: needMemoryGB },
      });
    } else {
      const memOK = deviceMemoryGB >= needMemoryGB;
      facts.push({
        ok: memOK,
        labelKey: "EE_compatibilityFactMemory",
        rawValue: "",
        detailKey: "EE_compatibilityFactMemoryDetailHave",
        detailParams: { N11: deviceMemoryGB, N22: needMemoryGB },
      });
    }
  }

  return facts;
};

// Render one known-fact entry into a `${label}: ${value}` string for the
// chosen language. Called from inside the preview page's translator so
// every row re-renders correctly when the participant flips the language.
const renderFactRow = (fact, lang) => {
  const label = tryReadPhrase(fact.labelKey, lang) || fact.labelKey;
  let value = fact.rawValue;
  if (value === null) {
    value = tryReadPhrase("EE_compatibilityFactUnknown", lang) || "Unknown";
  }
  if (fact.detailKey) {
    const detail = fillPhrase(
      tryReadPhrase(fact.detailKey, lang) || "",
      fact.detailParams,
    );
    if (detail) value = value ? `${value} ${detail}` : detail;
  }
  return `${label}: ${value}`;
};

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
      stepTitle:
        tryReadPhrase(
          "EE_compatibilityPreviewStepTitle",
          rc?.language?.value || "en",
        ) || "Welcome",
      onLanguageChange: (newLang) => {
        chrome.setStepTitle(
          tryReadPhrase("EE_compatibilityPreviewStepTitle", newLang) ||
            "Welcome",
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
    page.style.top = "8rem";
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
    planList.style.margin = "0 0 1.5rem 0";

    const note = document.createElement("p");
    note.style.fontStyle = "italic";
    note.style.opacity = "0.85";

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
    buttonWrapper.appendChild(runButton);

    page.appendChild(knownTitle);
    page.appendChild(knownList);
    page.appendChild(intro);
    page.appendChild(planList);
    page.appendChild(note);
    page.appendChild(buttonWrapper);

    const translatePreviewBody = () => {
      const lang = rc.language.value;
      const rtl = isRTL(lang);
      page.style.direction = rtl ? "rtl" : "ltr";
      page.style.textAlign = rtl ? "right" : "left";

      intro.textContent =
        tryReadPhrase("EE_compatibilityPreviewIntro", lang) ||
        "We need to check whether your device is suitable for this study. " +
          "The following quick tests will run, in order:";

      planList.innerHTML = "";
      testPlan.forEach((step) => {
        const li = document.createElement("li");
        li.textContent = tryReadPhrase(step.labelKey, lang) || step.labelKey;
        li.style.marginBottom = "0.25rem";
        planList.appendChild(li);
      });

      const anyIssue = knownFacts.some((f) => !f.ok);
      knownTitle.textContent = anyIssue
        ? tryReadPhrase("EE_compatibilityPreviewKnownTitleWithIssues", lang) ||
          "Device check (some issues detected)"
        : tryReadPhrase("EE_compatibilityPreviewKnownTitle", lang) ||
          "Device check (what we already know)";

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

      note.textContent = anyIssue
        ? tryReadPhrase("EE_compatibilityPreviewNoteHasIssues", lang) ||
          "Some checks above already failed and won’t be fixed by the tests below. " +
            "You may still run the tests to see the full list of issues before deciding what to do."
        : tryReadPhrase("EE_compatibilityPreviewNoteAllOk", lang) ||
          "If any upcoming test fails, you’ll see all results before deciding whether to continue.";

      runButton.textContent =
        tryReadPhrase("EE_compatibilityPreviewRunButton", lang) || "Run tests";
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
// headphone-check result into the report message before rendering.
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
  const compMsg = await checkSystemCompatibility(
    paramReader,
    rc.language.value,
    rc,
    true,
    psychoJS,
    measureMeters,
    paramReader.read("_needBrowserActualName")[0],
  );

  // Closure that re-renders the headphone-check summary in any language.
  // Passed to `displayCompatibilityMessage` so the participant's language
  // dropdown (and refresh button) can refresh the summary alongside the
  // rest of the report instead of dropping it.
  const headphoneCheckRan = !!(
    headphoneCheckResult && headphoneCheckResult.ran
  );
  const getHeadphoneCheckSummary = headphoneCheckRan
    ? (lang) => {
        const summary = renderHeadphoneCheckSummary(headphoneCheckResult, lang);
        return summary ? "\n\n" + summary : "";
      }
    : null;
  const headphoneCheckMeetsRequirement =
    !headphoneCheckRan || headphoneCheckResult.meetsRequirement;

  if (headphoneCheckRan) {
    compMsg.msg.push(getHeadphoneCheckSummary(rc.language.value));
    if (!headphoneCheckMeetsRequirement) {
      compMsg.proceed = false;
    }
  }

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
          text: readi18nPhrases("RC_cantDrawQR", rc.language.value),
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
    compMsg.msg,
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
