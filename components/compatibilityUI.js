import { readi18nPhrases } from "./readPhrases";
import { renderMarkdown } from "./markdownInline.js";

// ---------------------------------------------------------------------------
// Layout constants.
// ---------------------------------------------------------------------------

// Phone-vs-desktop breakpoint. Centralized so the title size, language-menu
// layout, body top offset and top-shield height all flip together.
const isSmallCompatibilityScreen = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(max-width: 480px)").matches;

// Top offset (from the viewport top) at which the scrolling page body must
// sit so it clears the fixed title + language menu. Phones get a larger
// value because the language menu stacks directly below the title (rather
// than sitting in the opposite corner) to avoid horizontal overlap.
export const getCompatibilityBodyTopOffset = () =>
  isSmallCompatibilityScreen() ? "12.5rem" : "8rem";

// Vertical position of the language menu on small screens. Sits just below
// the title (which ends near ~6.6rem on mobile: top 2rem + eyebrow 2.24rem
// + 0.15em gap + h1 2.16rem), with a small buffer.
const LANGUAGE_MENU_TOP_MOBILE = "7.5rem";

// Title styling deliberately mirrors RC's `showCameraTitleInTopRight`.
const TITLE_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";

// ---------------------------------------------------------------------------
// Small pure helpers.
// ---------------------------------------------------------------------------

export const ifTrue = (arr) => {
  if (!arr) return false;
  for (const a of arr) if (a) return true;
  return false;
};

export const tryReadPhrase = (key, lang) => {
  try {
    return readi18nPhrases(key, lang);
  } catch {
    return "";
  }
};

// Replace `[[KEY]]` tokens (e.g. `[[N11]]`, `[[xx1]]`) inside a translated
// phrase with caller-supplied values.
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

export const isLanguageRTL = (lang) =>
  (readi18nPhrases("EE_LanguageDirection", lang) || "LTR")
    .toString()
    .toLowerCase() === "rtl";

// Internal alias so the moved chrome code below reads naturally.
const isRTL = isLanguageRTL;

// Keep <body dir> (set at startup by first.js from the compiled fontDirection)
// in sync with the language the participant picks via
// _languageSelectionByParticipantBool, so inherited element direction follows
// the selected language.
export const setBodyDirForLanguage = (lang) => {
  document.body.setAttribute("dir", isLanguageRTL(lang) ? "rtl" : "ltr");
};

// Join a list of acceptable values with the localized "or" word, e.g.
// "Chrome or Edge".
export const joinWithOr = (items, lang) => {
  const list = (items || []).map((s) => String(s).trim()).filter(Boolean);
  if (list.length <= 1) return list[0] || "";
  const or = tryReadPhrase("EE_or", lang);
  if (!or) return list.join(" or ");
  const space =
    tryReadPhrase("EE_LanguageUsesSpacesBool", lang) === "FALSE" ? "" : " ";
  return list.reduce((acc, item, i) =>
    i === 0 ? item : acc + or + space + item,
  );
};

// Render an HTML+Markdown phrase from i18n.js into safe HTML. Mirrors the
// `marked.parseInline(...)` call used by `displayCompatibilityMessage`, so
// `**word**` becomes `<strong>word</strong>` and inline `<span>` tags are
// preserved. Falls back to the raw string when `marked` is not loaded yet.
export const renderPhraseHTML = (text) => {
  if (!text) return "";
  try {
    if (typeof marked !== "undefined" && marked?.parseInline) {
      return marked.parseInline(text);
    }
  } catch (_e) {
    // Defensive: marked has thrown before on unusual phrases; fall through.
  }
  return text;
};

// ---------------------------------------------------------------------------
// Device-detection primitives. Shared by both pages so neither has to import
// them across the flow/check boundary.
// ---------------------------------------------------------------------------

export const detectBrowser = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;

  let browserName = "Unknown";

  // ---- 1. Basic User Agent Checks ----
  // (Order matters: we check the more specialized browsers first)
  if (/vivaldi/i.test(userAgent)) {
    browserName = "Vivaldi";
  } else if (/Arc\/[\d.]/i.test(userAgent)) {
    // Arc typically includes "Arc/#" in its user agent
    browserName = "Arc";
  } else if (/edg/i.test(userAgent)) {
    // This covers both new (Chromium-based) Edge and the older EdgeHTML version
    browserName = "Edge";
  } else if (/opr\//i.test(userAgent)) {
    browserName = "Opera";
  } else if (/firefox|fxios/i.test(userAgent)) {
    browserName = "Firefox";
  } else if (
    /chrome|crios|chromium/i.test(userAgent) &&
    !/edg/i.test(userAgent)
  ) {
    browserName = "Chrome";
  } else if (
    /safari/i.test(userAgent) &&
    !/chrome|crios|chromium/i.test(userAgent)
  ) {
    browserName = "Safari";
  }

  if (browserName !== "Unknown") {
    return browserName;
  }

  // ---- 2. Simple Feature Detections (can override the user agent guess) ----
  // These can help differentiate browsers that share partial user agent patterns
  if (typeof InstallTrigger !== "undefined") {
    // A known Firefox-only property
    browserName = "Firefox";
  } else if (typeof window.chrome !== "undefined" && !!window.chrome.webstore) {
    // Chrome-like detection (Edge and Opera do not have chrome.webstore)
    browserName = "Chrome";
  } else if (
    typeof window.safari !== "undefined" &&
    /constructor/i.test(window.HTMLElement)
  ) {
    // Safari often has this weird "constructor" on HTMLElement
    browserName = "Safari";
  } else if (/@cc_on!@/i.test(navigator.userAgent) || !!document.documentMode) {
    // This used to detect old IE by its conditional comments
    browserName = "Internet Explorer";
  } else if (!!window.StyleMedia) {
    // Microsoft Edge (EdgeHTML) detection
    browserName = "Edge";
  }
  return browserName;
};

export const getDeviceType = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "desktop";
  }

  const width = window.innerWidth || 0;
  const touch = "ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0;

  const isTabletLike = width >= 768 && width <= 1366; // 768–1366px: typical tablet/laptop overlap

  const uaData = navigator.userAgentData;
  if (uaData && typeof uaData.mobile === "boolean") {
    if (uaData.mobile) return "mobile";

    const platform = (uaData.platform || "").toLowerCase(); // "android", "ios", "windows", "macos", etc.
    if (
      (platform === "android" || platform === "ios") &&
      touch &&
      isTabletLike
    ) {
      return "tablet";
    }
    return "desktop";
  }

  const ua = (navigator.userAgent || "").toLowerCase();

  const isIpadDesktopMode =
    /macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;

  if (/tablet|ipad|playbook|silk/.test(ua) || isIpadDesktopMode) {
    return "tablet";
  }

  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(ua)) {
    return "mobile";
  }

  return "desktop";
};

export const handleLanguage = (lang, rc, useEnglishNames = true) => {
  const englishNames = readi18nPhrases("EE_LanguageEnglishName");
  let languageCode;
  // _language now takes a language code (e.g. "fr"); use it directly.
  if (lang && Object.prototype.hasOwnProperty.call(englishNames, lang)) {
    languageCode = lang;
  } else {
    // Backward compatibility: also accept the full language name.
    const Languages = useEnglishNames
      ? englishNames
      : readi18nPhrases("EE_LanguageNativeName");
    languageCode = Object.keys(Languages).find(
      (key) => Languages[key] === lang,
    );
  }

  // set language code
  if (languageCode) {
    rc.newLanguage(languageCode);
  }
};

// ---------------------------------------------------------------------------
// Shared EasyEyes language selector (a "Choose language" label + a <select>
// listing every UI language by native + English name). Used by BOTH the title
// page and the compatibility-flow chrome so they stay pixel-identical.
//
// The selector positions itself in the top corner opposite the page title and
// mirrors for RTL; on phones it stacks below the title (caller supplies the
// `topMobile` offset). Changing the language switches `rc`, re-translates the
// selector's own label, re-flows its layout, and then calls `onChange(newLang)`
// so the caller can re-translate / re-flow its page-specific chrome.
//
// Returns `{ wrapper, title, dropdown, applyLayout, refreshTitle }`.
// ---------------------------------------------------------------------------
const LANGUAGE_SELECT_TEXT_INSET_PX = 4;

export const createLanguageSelector = ({
  rc,
  id,
  topMobile,
  topDesktop = "2rem",
  zIndex = "2147483647",
  onChange,
}) => {
  const smallScreen = isSmallCompatibilityScreen();
  const bodyStyle = window.getComputedStyle(document.body);

  const wrapper = document.createElement("div");
  if (id) wrapper.id = id;
  wrapper.style.position = "fixed";
  wrapper.style.top = smallScreen ? topMobile : topDesktop;
  wrapper.style.zIndex = zIndex;
  wrapper.style.fontFamily = bodyStyle.fontFamily;
  wrapper.style.fontSize = bodyStyle.fontSize;
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.margin = "0";

  const title = document.createElement("p");
  title.style.fontSize = "1.1rem";
  title.style.fontWeight = "bold";
  title.style.marginTop = "0";
  title.style.marginBottom = "5px";
  title.style.fontFamily = "inherit";
  title.style.alignSelf = "stretch";
  title.style.lineHeight = "1.94rem";
  title.textContent = readi18nPhrases("EE_languageChoose", rc.language.value);
  wrapper.appendChild(title);

  const dropdown = document.createElement("select");
  dropdown.style.width = "fit-content";
  dropdown.style.backgroundColor = "#999";
  dropdown.style.color = "white";
  dropdown.style.borderRadius = "0.3rem";
  dropdown.style.fontFamily = "inherit";

  const languagesNative = readi18nPhrases("EE_LanguageNativeName");
  const languagesEnglish = readi18nPhrases("EE_LanguageEnglishName");
  Object.keys(languagesNative).forEach((key) => {
    const option = document.createElement("option");
    option.value = languagesNative[key];
    option.innerHTML = `${languagesEnglish[key]} (${languagesNative[key]})`;
    dropdown.appendChild(option);
  });
  dropdown.value = languagesNative[rc.language.value];
  wrapper.appendChild(dropdown);

  const applyLayout = () => {
    const rtl = isRTL(rc.language.value);
    if (rtl) {
      if (smallScreen) {
        wrapper.style.right = "3rem";
        wrapper.style.left = "";
        dropdown.style.alignSelf = "flex-end";
      } else {
        wrapper.style.left = "3rem";
        wrapper.style.right = "";
        dropdown.style.alignSelf = "flex-start";
      }
      wrapper.style.textAlign = "right";
      title.style.direction = "rtl";
      title.style.textAlign = "right";
      title.style.paddingLeft = "0";
      title.style.paddingRight = `${LANGUAGE_SELECT_TEXT_INSET_PX}px`;
    } else {
      if (smallScreen) {
        wrapper.style.left = "3rem";
        wrapper.style.right = "";
        dropdown.style.alignSelf = "flex-start";
      } else {
        wrapper.style.right = "3rem";
        wrapper.style.left = "";
        dropdown.style.alignSelf = "flex-end";
      }
      wrapper.style.textAlign = "left";
      title.style.direction = "ltr";
      title.style.textAlign = "left";
      title.style.paddingLeft = `${LANGUAGE_SELECT_TEXT_INSET_PX}px`;
      title.style.paddingRight = "0";
    }
  };
  applyLayout();

  const refreshTitle = () => {
    title.textContent = readi18nPhrases("EE_languageChoose", rc.language.value);
  };

  dropdown.addEventListener("change", () => {
    handleLanguage(dropdown.value, rc, /* useEnglishNames= */ false);
    const newLang = rc.language.value;
    setBodyDirForLanguage(newLang);
    refreshTitle();
    applyLayout();
    if (typeof onChange === "function") {
      try {
        onChange(newLang);
      } catch (_e) {
        // Caller's translator should not be able to crash the selector.
      }
    }
  });

  return { wrapper, title, dropdown, applyLayout, refreshTitle };
};

// ---------------------------------------------------------------------------
// Shared "page chrome" used by the preview page AND the final report page so
// they look pixel-identical to the RemoteCalibrator camera-flow pages.
//
// Title styling deliberately mirrors RC's `showCameraTitleInTopRight`:
//   - <div id="compatibility-chrome-title"> at position: fixed; top: 2rem;
//     left/right: 3rem; pointer-events: none; color: #000; system font stack.
//   - Inside it a small "Device compatibility" eyebrow and an H1 step name.
//
// The optional language selector is mirrored to the opposite corner.
// Body background flips to `#eee` and `#root` is hidden.
//
// Returns `{ titleEl, languageWrapper, setStepTitle, refreshLanguage, unmount }`.
// ---------------------------------------------------------------------------
const CHROME_TITLE_ID = "compatibility-chrome-title";
const CHROME_LANGUAGE_WRAPPER_ID = "compatibility-chrome-language-wrapper";
const CHROME_SHIELD_ID = "compatibility-chrome-shield";

export const mountCompatibilityChrome = ({
  paramReader,
  rc,
  stepTitle,
  onLanguageChange,
  // When false, the small "Device compatibility" eyebrow above the step H1
  // is omitted.
  showEyebrow = true,
}) => {
  document.body.classList.add("easyeyes-gray-bg");
  document.documentElement.classList.add("easyeyes-gray-bg");
  const previousBg = document.body.style.backgroundColor;
  document.body.style.backgroundColor = "#eee";

  // Dismiss first.js's startup loading overlay before the compat chrome
  // renders (it normally lingers until all resources finish downloading).
  if (typeof window.removeLoadingScreen === "function") {
    try {
      window.removeLoadingScreen();
    } catch {}
  }

  const rootEl = document.getElementById("root");
  const previousRootDisplay = rootEl ? rootEl.style.display : null;
  if (rootEl) rootEl.style.display = "none";

  const smallScreen = isSmallCompatibilityScreen();

  // ----- Top shield -----
  // Opaque full-width bar at the top of the viewport so body content that
  // scrolls into the top region is hidden behind it (rather than sliding over
  // the fixed title). Height matches `getCompatibilityBodyTopOffset()`.
  const shieldEl = document.createElement("div");
  shieldEl.id = CHROME_SHIELD_ID;
  shieldEl.style.position = "fixed";
  shieldEl.style.top = "0";
  shieldEl.style.left = "0";
  shieldEl.style.right = "0";
  shieldEl.style.height = getCompatibilityBodyTopOffset();
  shieldEl.style.backgroundColor = "#eee";
  shieldEl.style.zIndex = "10100";
  shieldEl.style.pointerEvents = "none";
  document.body.appendChild(shieldEl);

  // ----- Title ("Device Compatibility" eyebrow + step H1) -----
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
    tryReadPhrase("EE_compatibilityTitle", rc?.language?.value || "en") || "";

  const h1 = document.createElement("h1");
  h1.style.margin = "0";
  h1.style.padding = "0";
  h1.style.fontFamily = TITLE_FONT_FAMILY;
  h1.style.fontSize = sizePageTitleSize;
  h1.style.fontWeight = "400";
  h1.style.color = "#000";
  h1.style.lineHeight = sizePageTitleLineHeight;
  h1.textContent = stepTitle || "";

  if (showEyebrow) titleEl.appendChild(eyebrow);
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
  let languageWrapper = null;
  let languageSelector = null;
  if (paramReader?.read("_languageSelectionByParticipantBool")?.[0]) {
    languageSelector = createLanguageSelector({
      rc,
      id: CHROME_LANGUAGE_WRAPPER_ID,
      topMobile: LANGUAGE_MENU_TOP_MOBILE,
      zIndex: "2147483647",
      onChange: (newLang) => {
        eyebrow.textContent =
          tryReadPhrase("EE_compatibilityTitle", newLang) || "";
        applyTitleDirection();
        if (typeof onLanguageChange === "function") {
          onLanguageChange(newLang);
        }
      },
    });
    languageWrapper = languageSelector.wrapper;
    document.body.appendChild(languageWrapper);
  }

  return {
    /** The fixed title element (eyebrow + step H1). */
    titleEl,
    /** The language menu wrapper (or null when not shown). */
    languageWrapper,
    /** Replace the step name (the H1, not the eyebrow). */
    setStepTitle: (text) => {
      h1.textContent = text || "";
    },
    /** Re-translate caller-managed text after a language change. */
    refreshLanguage: () => {
      const newLang = rc?.language?.value || "en";
      eyebrow.textContent =
        tryReadPhrase("EE_compatibilityTitle", newLang) || "";
      if (languageSelector) languageSelector.refreshTitle();
      applyTitleDirection();
    },
    /** Tear down everything this chrome added. */
    unmount: () => {
      titleEl.remove();
      shieldEl.remove();
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
// participant's compatibility. Shown on BOTH the preview page (before tests)
// and the final report page (after tests) so the participant sees a friendly
// ✓/✗ checklist instead of a dense sentence.
//
// Each entry is a translation-agnostic descriptor:
//   { ok, labelKey, rawValue, detailKey, detailParams }
// `rawValue` is the locale-neutral detected string (e.g. "Chrome 120");
// when null, the rendered detail uses the translated "Unknown" phrase.
// ---------------------------------------------------------------------------
export const summarizeKnownDeviceFacts = (paramReader, rc) => {
  const facts = [];
  const lang = rc?.language?.value || "en";

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
    const browserWrong =
      detectedBrowserRaw && !compatibleBrowser.includes(detectedBrowserRaw);
    let versionTooLow = false;
    if (compatibleBrowserVersionMin > 0) {
      const major = Number(String(detectedBrowserVersionRaw).split(".")[0]);
      versionTooLow =
        Number.isFinite(major) && major < compatibleBrowserVersionMin;
    }
    if (browserWrong || versionTooLow) {
      browserOK = false;
      const allowed = joinWithOr(compatibleBrowser, lang);
      if (compatibleBrowserVersionMin > 0) {
        browserDetailKey = "EE_compatibilityFactDetailStudyNeedsVersion";
        browserDetailParams = {
          XX1: allowed,
          N11: compatibleBrowserVersionMin,
        };
      } else {
        browserDetailKey = "EE_compatibilityFactDetailStudyNeeds";
        browserDetailParams = { XX1: allowed };
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
    osDetailParams = { XX1: joinWithOr(compatibleOS, lang) };
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
    deviceDetailParams = { XX1: joinWithOr(compatibleDevice, lang) };
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

  // CPU cores (hardwareConcurrency).
  const needCoresMin =
    Number(paramReader.read("_needProcessorCoresMinimum")?.[0]) || 0;
  const detectedCoresRaw = Number(rc?.concurrency?.value) || 0;
  if (needCoresMin > 0) {
    const coresOK = detectedCoresRaw > 0 && detectedCoresRaw >= needCoresMin;
    facts.push({
      ok: detectedCoresRaw > 0 ? coresOK : true,
      labelKey: "EE_compatibilityFactCores",
      labelFallback: "CPU cores",
      rawValue: detectedCoresRaw > 0 ? String(detectedCoresRaw) : null,
      detailKey: "EE_compatibilityFactDetailNeedAtLeast",
      detailParams: { N11: needCoresMin },
    });
  }

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
// chosen language. `fact.labelFallback` is a hardcoded English label used when
// the translation key has no entry yet.
export const renderFactRow = (fact, lang) => {
  const label =
    tryReadPhrase(fact.labelKey, lang) || fact.labelFallback || fact.labelKey;
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

// Build a ✓/✗ checklist `<ul>` from `summarizeKnownDeviceFacts` output, in the
// chosen language. Used by both the preview page and the final report page.
export const buildKnownFactsList = (knownFacts, lang) => {
  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.padding = "0";
  ul.style.margin = "0 0 1.5rem 0";
  (knownFacts || []).forEach((f) => {
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
    ul.appendChild(li);
  });
  return ul;
};

// ---------------------------------------------------------------------------
// Resolve which "you'll need a paper / ruler" alert (if any) applies to the
// current study. Mirrors the block in `checkSystemCompatibility` that pushes
// one of EE_DeviceCompatibilityPaper, EE_DeviceCompatibilityPaperAndRuler,
// EE_DeviceCompatibilityRuler or EE_DeviceCompatibilityPaperOrRuler.
//
// Only relevant when at least one block uses `calibrateDistanceBool = TRUE`.
// Returns `{ phraseKey, params }` or `null` if no alert should be shown.
// ---------------------------------------------------------------------------
export const resolvePaperRulerAlert = (paramReader) => {
  if (!ifTrue(paramReader.read("calibrateDistanceBool", "__ALL_BLOCKS__"))) {
    return null;
  }
  const calibrateDistanceValues = paramReader
    .read("_calibrateDistance")?.[0]
    ?.split(",")
    .map((s) => s.trim().toLowerCase());
  if (!calibrateDistanceValues || calibrateDistanceValues.length === 0) {
    return null;
  }
  const checkBool = !!paramReader.read("_calibrateDistanceCheckBool")?.[0];
  const minRulerCm =
    Number(paramReader.read("_calibrateDistanceCheckMinRulerCm")?.[0]) || 0;
  const rulerParams = {
    Nin: String(Math.round(minRulerCm / 2.54)),
    Ncm: String(Math.round(minRulerCm)),
  };

  if (calibrateDistanceValues.includes("paper")) {
    return checkBool
      ? {
          phraseKey: "EE_DeviceCompatibilityPaperAndRuler",
          params: rulerParams,
        }
      : { phraseKey: "EE_DeviceCompatibilityPaper", params: null };
  }
  if (calibrateDistanceValues.includes("paperorruler")) {
    return checkBool
      ? { phraseKey: "EE_DeviceCompatibilityRuler", params: rulerParams }
      : { phraseKey: "EE_DeviceCompatibilityPaperOrRuler", params: null };
  }
  return null;
};
