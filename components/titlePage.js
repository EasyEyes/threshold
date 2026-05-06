// Title page shown at the start of the study, controlled by _showTitlePage.

import { readi18nPhrases } from "./readPhrases";
import { handleLanguage } from "./compatibilityCheck.js";

const TITLE_PAGE_ID = "easyeyes-title-page";
const TITLE_PAGE_BUTTON_ID = "easyeyes-title-page-proceed-button";
const TITLE_PAGE_LANGUAGE_WRAPPER_ID = "title-page-language-wrapper";

const escapeHTML = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderMarkdown = (text) => {
  // marked is loaded globally from a <script> tag in index.html.
  if (typeof window !== "undefined" && typeof window.marked !== "undefined") {
    try {
      return window.marked.parse(text || "");
    } catch (e) {
      // Fall through to plain-text rendering on parse errors.
    }
  }
  return `<p style="white-space: pre-line;">${escapeHTML(text)}</p>`;
};

const isRTLLanguage = (languageValue) =>
  (readi18nPhrases("EE_languageDirection", languageValue) || "LTR")
    .toString()
    .toLowerCase() === "rtl";

// Build the title-page language selector. Mirrors the Choose Camera page
// menu: top-right for LTR, top-left for RTL, with the heading
// (EE_languageChoose) above the dropdown. Returns null when
// _languageSelectionByParticipantBool is FALSE — i.e. the participant is not
// allowed to change the language, so no menu is shown.
const createTitlePageLanguageMenu = (paramReader, rc, onChange) => {
  if (!paramReader.read("_languageSelectionByParticipantBool")?.[0])
    return null;
  if (!rc || !rc.language) return null;

  // Pin font-family / font-size to the body's computed values so the menu
  // looks identical to the one on Choose Camera and Device Compatibility,
  // regardless of any styling our own title-page overlay introduces.
  const bodyStyle = window.getComputedStyle(document.body);
  const bodyFontFamily = bodyStyle.fontFamily;
  const bodyFontSize = bodyStyle.fontSize;

  const wrapper = document.createElement("div");
  wrapper.id = TITLE_PAGE_LANGUAGE_WRAPPER_ID;
  wrapper.style.position = "fixed";
  wrapper.style.top = "10px";
  // Float above our own title-page overlay (z-index 1000000).
  wrapper.style.zIndex = "2147483647";
  wrapper.style.fontFamily = bodyFontFamily;
  wrapper.style.fontSize = bodyFontSize;
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";

  const heading = document.createElement("p");
  heading.id = "title-page-language-title";
  heading.style.fontSize = "1.1rem";
  heading.style.fontWeight = "bold";
  heading.style.marginTop = "0px";
  heading.style.marginBottom = "5px";
  heading.style.fontFamily = "inherit";
  heading.style.alignSelf = "stretch";
  heading.innerHTML = readi18nPhrases("EE_languageChoose", rc.language.value);
  wrapper.appendChild(heading);

  const dropdown = document.createElement("select");
  dropdown.id = "title-page-language-dropdown";
  dropdown.style.width = "fit-content";
  dropdown.style.backgroundColor = "#999";
  dropdown.style.color = "white";
  dropdown.style.borderRadius = "0.3rem";
  dropdown.style.fontFamily = "inherit";

  // RTL → mirror the whole menu to the top-LEFT corner of the viewport;
  // LTR → keep the original top-right corner stacked layout.
  const applyMenuLayout = (rtl) => {
    if (rtl) {
      wrapper.style.left = "20px";
      wrapper.style.right = "";
      heading.style.textAlign = "left";
      heading.style.direction = "rtl";
      dropdown.style.alignSelf = "flex-start";
    } else {
      wrapper.style.left = "";
      wrapper.style.right = "20px";
      heading.style.textAlign = "right";
      heading.style.direction = "ltr";
      dropdown.style.alignSelf = "flex-end";
    }
  };
  applyMenuLayout(isRTLLanguage(rc.language.value));

  const languagesNative = readi18nPhrases("EE_languageNameNative");
  const languagesEnglish = readi18nPhrases("EE_languageNameEnglish");
  Object.keys(languagesNative).forEach((key) => {
    const option = document.createElement("option");
    option.value = languagesNative[key];
    option.innerHTML = `${languagesEnglish[key]} (${languagesNative[key]})`;
    dropdown.appendChild(option);
  });
  dropdown.value = languagesNative[rc.language.value];

  dropdown.addEventListener("change", () => {
    handleLanguage(dropdown.value, rc, /* useEnglishNames= */ false);
    heading.innerHTML = readi18nPhrases("EE_languageChoose", rc.language.value);
    applyMenuLayout(isRTLLanguage(rc.language.value));
    if (typeof onChange === "function") {
      try {
        onChange(rc.language.value);
      } catch (_e) {
        // Caller's re-render shouldn't crash the menu.
      }
    }
  });

  wrapper.appendChild(dropdown);
  return wrapper;
};

/**
 * If _showTitlePage requests it, show the study's title (and optionally
 * description) plus a Proceed button. Resolves once the participant clicks
 * Proceed or presses RETURN. Resolves immediately when _showTitlePage is
 * "none" or unset.
 *
 * When _languageSelectionByParticipantBool is TRUE, also show the standard
 * EasyEyes language selector in the corner; switching the language live
 * updates the title page's direction, text alignment and Proceed button
 * label.
 *
 * @param {object} paramReader paramReader instance from PsychoJS / EasyEyes
 * @param {object} rc          Remote Calibrator instance (or anything with a
 *                             `.language.value` ISO code and `.newLanguage()`)
 * @returns {Promise<void>}
 */
export async function showTitlePage(paramReader, rc) {
  const mode = (paramReader.read("_showTitlePage")?.[0] || "title").trim();

  if (mode === "none") return;

  const title = paramReader.read("_online1Title")?.[0] || "";
  const description =
    mode === "titleAndDescription"
      ? paramReader.read("_online2Description")?.[0] || ""
      : "";

  // If we have nothing to show, treat as "none".
  if (!title && !description) return;

  const getLanguageValue = () => rc?.language?.value || "en";
  const computeProceedLabel = () =>
    readi18nPhrases("T_proceed", getLanguageValue()) ||
    readi18nPhrases("RC_Resume", getLanguageValue()) ||
    "Proceed";

  return new Promise((resolve) => {
    const container = document.createElement("div");
    container.id = TITLE_PAGE_ID;
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #eee;
      z-index: 1000000;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    `;

    const inner = document.createElement("div");
    // Static layout styles. Direction / text-align are applied separately
    // via applyDirection() so they can be flipped live when the
    // participant changes the language from the corner menu.
    inner.style.flex = "1";
    inner.style.maxWidth = "900px";
    inner.style.width = "100%";
    inner.style.margin = "0 auto";
    inner.style.padding = "clamp(20px, 5vh, 60px) clamp(20px, 5vw, 60px)";
    inner.style.boxSizing = "border-box";

    const applyDirection = () => {
      const rtl = isRTLLanguage(getLanguageValue());
      inner.style.direction = rtl ? "rtl" : "ltr";
      inner.style.textAlign = rtl ? "right" : "left";
    };
    applyDirection();

    // Match the standard EasyEyes page-title style (e.g., Device
    // Compatibility): a plain <h3> inside a container with a small bottom
    // margin. Direction/alignment are inherited from `inner`.
    const titleContainer = document.createElement("div");
    titleContainer.style.marginBottom = "8px";
    const titleEl = document.createElement("h3");
    titleEl.textContent = title;
    titleContainer.appendChild(titleEl);
    inner.appendChild(titleContainer);

    if (description) {
      const descEl = document.createElement("div");
      descEl.style.cssText = `
        font-size: clamp(16px, 2vw, 18px);
        line-height: 1.5;
        white-space: pre-line;
        margin-bottom: clamp(20px, 4vh, 40px);
      `;
      descEl.innerHTML = renderMarkdown(description);
      inner.appendChild(descEl);
    }

    const buttonWrapper = document.createElement("div");
    buttonWrapper.style.textAlign = "center";

    const button = document.createElement("button");
    button.id = TITLE_PAGE_BUTTON_ID;
    button.classList.add("btn", "btn-success");
    button.type = "button";
    button.tabIndex = 0;
    button.innerText = computeProceedLabel();
    button.style.width = "fit-content";
    button.style.padding = "10px";
    button.style.margin = "5rem 0";
    buttonWrapper.appendChild(button);
    inner.appendChild(buttonWrapper);
    container.appendChild(inner);
    document.body.appendChild(container);

    // Language selector (top-right LTR / top-left RTL). Only created when
    // _languageSelectionByParticipantBool === TRUE. When the participant
    // switches the language, retranslate everything that depends on the
    // language on this page: direction, alignment, and the Proceed label.
    // The title and description are spreadsheet values
    // (_online1Title / _online2Description) and are not retranslated.
    const langMenu = createTitlePageLanguageMenu(paramReader, rc, () => {
      applyDirection();
      button.innerText = computeProceedLabel();
    });
    if (langMenu) document.body.appendChild(langMenu);

    button.focus({ preventScroll: true });

    let done = false;
    const cleanupAndResolve = () => {
      if (done) return;
      done = true;
      button.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      if (langMenu && langMenu.parentNode)
        langMenu.parentNode.removeChild(langMenu);
      if (container.parentNode) container.parentNode.removeChild(container);
      resolve();
    };

    const onClick = (event) => {
      event.preventDefault();
      cleanupAndResolve();
    };
    const onKeyDown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        cleanupAndResolve();
      }
    };

    button.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
  });
}
