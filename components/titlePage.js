// Title page shown at the start of the study, controlled by _showTitlePage.
//
// _showTitlePage values:
//   "none"                 → do not show a title page
//   "title"                → show _online1Title and a Proceed button
//   "titleAndDescription"  → show _online1Title, _online2Description, and a Proceed button
//
// Pressing the Proceed button or RETURN advances to the next step.

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

/**
 * If _showTitlePage requests it, show the study's title (and optionally
 * description) plus a Proceed button. Resolves once the participant clicks
 * Proceed or presses RETURN. Resolves immediately when _showTitlePage is
 * "none" or unset.
 *
 * @param {object} paramReader paramReader instance from PsychoJS / EasyEyes
 * @param {string} languageValue current rc.language.value (e.g. "en")
 * @returns {Promise<void>}
 */
export async function showTitlePage(paramReader, languageValue) {
  const mode = (paramReader.read("_showTitlePage")?.[0] || "title").trim();

  if (mode === "none") return;

  const title = paramReader.read("_online1Title")?.[0] || "";
  const description =
    mode === "titleAndDescription"
      ? paramReader.read("_online2Description")?.[0] || ""
      : "";

  // If we have nothing to show, treat as "none".
  if (!title && !description) return;

  const direction =
    (readi18nPhrases("EE_languageDirection", languageValue) || "LTR")
      .toString()
      .toLowerCase() === "rtl"
      ? "rtl"
      : "ltr";
  const textAlign = direction === "rtl" ? "right" : "left";
  const proceedLabel =
    readi18nPhrases("T_proceed", languageValue) ||
    readi18nPhrases("RC_Resume", languageValue) ||
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
    inner.style.cssText = `
      flex: 1;
      max-width: 900px;
      width: 100%;
      margin: 0 auto;
      padding: clamp(20px, 5vh, 60px) clamp(20px, 5vw, 60px);
      direction: ${direction};
      text-align: ${textAlign};
      box-sizing: border-box;
    `;

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
    button.innerText = proceedLabel;
    button.style.width = "fit-content";
    button.style.padding = "10px";
    button.style.margin = "5rem 0";
    buttonWrapper.appendChild(button);
    inner.appendChild(buttonWrapper);
    container.appendChild(inner);
    document.body.appendChild(container);

    button.focus({ preventScroll: true });

    let done = false;
    const cleanupAndResolve = () => {
      if (done) return;
      done = true;
      button.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
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
