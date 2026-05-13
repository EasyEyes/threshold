// Title page shown at the start of the study, controlled by _showTitlePage.

import { readi18nPhrases } from "./readPhrases";

const TITLE_PAGE_ID = "easyeyes-title-page";
const TITLE_PAGE_BUTTON_ID = "easyeyes-title-page-proceed-button";

const escapeHTML = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Render description text. The value of _online2Description is sent verbatim
// to Prolific (which accepts an HTML allowlist) and also displayed on the
// title page. We pass it through as raw HTML so that tags like <p>, <ul>,
// <li> work as intended. Newlines between HTML tags are collapsed (standard
// HTML whitespace behaviour), fixing the double-spacing that occurred when
// the text was previously run through the Markdown parser `marked`.
const renderDescription = (text) => {
  if (!text) return "";
  // If the text contains any HTML tag, treat it as HTML.
  if (/<[a-zA-Z][^>]*>/.test(text)) {
    return text;
  }
  // Plain text: escape and wrap in a <p> so it displays correctly.
  return `<p>${escapeHTML(text)}</p>`;
};

const isRTLLanguage = (languageValue) =>
  (readi18nPhrases("EE_languageDirection", languageValue) || "LTR")
    .toString()
    .toLowerCase() === "rtl";

const applyInstructionTitleStyle = (titleEl) => {
  titleEl.style.whiteSpace = "pre-line";
  titleEl.style.textAlign = "start";
  titleEl.style.margin = "0 0 3rem 0";
  titleEl.style.padding = "0";
  titleEl.style.minWidth = "360px";
  titleEl.style.fontWeight = "400";
  titleEl.style.fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";
  if (window.matchMedia("(max-width: 480px)").matches) {
    titleEl.style.fontSize = "1.8rem";
    titleEl.style.lineHeight = "120%";
  } else {
    titleEl.style.fontSize = "2.5rem";
    titleEl.style.lineHeight = "100%";
  }
};

/**
 * If _showTitlePage requests it, show the study's title (and optionally
 * description) plus a Proceed button. Resolves once the participant clicks
 * Proceed or presses RETURN. Resolves immediately when _showTitlePage is
 * "none" or unset.
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
    readi18nPhrases("T_proceed", getLanguageValue()) || "Proceed";

  return new Promise((resolve) => {
    document.body.classList.add("easyeyes-gray-bg");
    document.documentElement.classList.add("easyeyes-gray-bg");
    document.body.style.backgroundColor = "#eee";
    // Suppress body scrollbars while the title page is visible.
    const savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const container = document.createElement("div");
    container.id = TITLE_PAGE_ID;
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #eee;
      z-index: 1000000;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    `;

    const inner = document.createElement("div");
    // Static layout styles. Direction / text-align are applied separately.
    inner.style.flex = "1";
    inner.style.maxWidth = "900px";
    inner.style.boxSizing = "border-box";
    inner.style.padding = "8rem 0 clamp(20px, 5vh, 60px) 0";

    const titleEl = document.createElement("h1");
    titleEl.id = "easyeyes-title-page-title";
    titleEl.classList.add("easyeyes-page-title");
    titleEl.textContent = title;

    const applyDirection = () => {
      const rtl = isRTLLanguage(getLanguageValue());
      const edge = window.matchMedia("(max-width: 480px)").matches
        ? "1rem"
        : "2rem";
      inner.style.direction = rtl ? "rtl" : "ltr";
      inner.style.textAlign = rtl ? "right" : "left";
      // Anchor the inner column to the same edge as the title so the
      // description's start aligns with the title's start.
      if (rtl) {
        inner.style.marginLeft = "0";
        inner.style.marginRight = edge;
      } else {
        inner.style.marginLeft = edge;
        inner.style.marginRight = "0";
      }
      titleEl.classList.toggle("rtl", rtl);
      titleEl.classList.toggle("ltr", !rtl);
    };
    applyDirection();

    container.appendChild(titleEl);

    if (description) {
      const descEl = document.createElement("div");
      descEl.style.cssText = `
        font-size: clamp(16px, 2vw, 18px);
        line-height: 1.5;
        margin-bottom: clamp(20px, 4vh, 40px);
      `;
      descEl.innerHTML = renderDescription(description);
      inner.appendChild(descEl);
    }

    container.appendChild(inner);

    const button = document.createElement("button");
    button.id = TITLE_PAGE_BUTTON_ID;
    button.classList.add("btn", "btn-success");
    button.type = "button";
    button.tabIndex = 0;
    button.innerText = computeProceedLabel();
    button.style.width = "fit-content";
    button.style.padding = "10px";
    button.style.margin = "5rem auto";
    button.style.display = "block";
    container.appendChild(button);
    document.body.appendChild(container);

    button.focus({ preventScroll: true });

    let done = false;
    const cleanupAndResolve = () => {
      if (done) return;
      done = true;
      button.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = savedBodyOverflow;
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
