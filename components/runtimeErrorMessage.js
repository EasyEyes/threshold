/**
 * Composes the participant-facing HTML of the fatal run-time error dialog.
 *
 * Outline (see notes/how-to-write-a-runtime-error-message.md):
 *
 *   a. Localized: title, summary, and hint.  (skipped when _language is English)
 *   b. English:   title, summary, and hint.  (omitted for localized keyed guidance)
 *   c. English:   technical details.
 *
 * Each part carries an explicit `dir`, because <body dir> is "rtl" for an RTL
 * study and would otherwise lay the English parts out right-to-left — that is
 * what turned earlier Persian-study errors into unreadable English.
 */
import { readi18nPhrases } from "./readPhrases.js";

export const ENGLISH_LANGUAGE_CODE = "en";

// English text of every phrase the dialog needs. A missing or unloaded phrase
// table is itself one of the errors that lands here, so the dialog can never
// depend on a lookup succeeding.
const ENGLISH_TEXT = {
  EE_errorDialogTitle: "Error",
  EE_studyEndedWithError: "The study ended with this error.",
  EE_unspecifiedJavascriptError: "Unspecified JavaScript error",
  EE_ok: "OK",
};

// Advice for the participant. Shown only in the languages the phrase table has
// it in, so adding the key to the phrases sheet is all it takes to turn it on.
// Deliberately does not invite the participant to contact us: one bug would
// then produce many messages, often in languages we cannot read.
const HINT_KEY = "EE_errorHintNotYourFault";

/**
 * Look up a phrase, returning null instead of throwing when it is unavailable.
 * @param {string} key
 * @param {string} language
 * @returns {string|null}
 */
export const phraseOrNull = (key, language) => {
  try {
    const phrase = readi18nPhrases(key, language);
    return typeof phrase === "string" && phrase.trim() ? phrase.trim() : null;
  } catch {
    return null;
  }
};

const phrase = (key, language) =>
  phraseOrNull(key, language) ?? ENGLISH_TEXT[key] ?? key;

/**
 * The language the participant is being tested in, as a code such as "fa".
 * @returns {string}
 */
export const getParticipantLanguage = () => {
  try {
    const code = globalThis?.RemoteCalibrator?.language?.value;
    if (typeof code === "string" && code.trim()) return code.trim();
  } catch {
    // RemoteCalibrator may not have loaded yet; fall through to English.
  }
  return ENGLISH_LANGUAGE_CODE;
};

/**
 * Text direction of a language: "rtl" or "ltr".
 * Falls back to <body dir>, set at startup from the compiled _language
 * direction, so direction survives an unusable phrase table.
 * @param {string} language
 * @returns {string}
 */
export const getLanguageDirection = (language) => {
  const direction = phraseOrNull("EE_LanguageDirection", language);
  if (direction) return direction.toLowerCase() === "rtl" ? "rtl" : "ltr";
  try {
    const bodyDirection = document.body?.getAttribute("dir");
    if (bodyDirection) {
      return bodyDirection.toLowerCase() === "rtl" ? "rtl" : "ltr";
    }
  } catch {
    // No document (unit tests, early failures): assume LTR.
  }
  return "ltr";
};

/**
 * The lines of technical detail for developers, in the order they appear.
 * Shared by the dialog and the copy saved to the CSV, so the participant's
 * screenshot and our data file can never disagree about what happened.
 * @param {Object} context - output of buildErrorContext
 * @returns {string[]} one string per line, English, no markup
 */
export const errorContextLines = (context) => {
  if (!context) return [];
  if (context.contextBuildFailed) {
    return [
      `Context unavailable: ${context.contextBuildError || "unknown error"}`,
    ];
  }

  const lines = [
    `where: ${context.where}`,
    `block: ${context.block}, condition: ${context.condition}, trial: ${context.trial}`,
    `conditionName: ${context.conditionName}`,
    `experiment: ${context.experiment}`,
    `current time: ${context.currentTime}`,
  ];

  if (context.compilerUpdated) {
    lines.push(`Compiler updated ${context.compilerUpdated}`);
  }

  return lines;
};

export const formatErrorContextAsText = (context) =>
  "\n" + errorContextLines(context).join("\n") + "\n";

const escapeHtml = (text) =>
  String(text ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

export const escapeHtmlAttribute = escapeHtml;

const paragraph = (text, style = "", allowBold = false) => {
  const escapedText = escapeHtml(text);
  const html = allowBold
    ? escapedText
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(
          /&lt;strong&gt;([\s\S]*?)&lt;\/strong&gt;/g,
          "<strong>$1</strong>",
        )
    : escapedText;
  return `<p style="margin: 0 0 0.5em 0;${style}">${html}</p>`;
};

/**
 * One language's part of the message: summary, then hint, then (English only)
 * a title, all sharing one explicit direction.
 */
const languageBlock = ({
  language,
  direction,
  title,
  lines,
  allowBold = false,
}) => {
  const alignment = direction === "rtl" ? "right" : "left";
  const heading = title
    ? `<p style="margin: 0 0 0.5em 0; font-weight: bold;">${escapeHtml(
        title,
      )}</p>`
    : "";
  return (
    `<div lang="${escapeHtml(language)}" dir="${direction}" ` +
    `style="text-align: ${alignment}; unicode-bidi: isolate; margin-bottom: 1em;">` +
    heading +
    lines.map((line) => paragraph(line, "", allowBold)).join("") +
    `</div>`
  );
};

const technicalBlock = (lines) =>
  `<div lang="en" dir="ltr" style="text-align: left; unicode-bidi: isolate; ` +
  `font-size: 0.85em; color: #444; overflow-wrap: break-word;">` +
  lines.map((line) => paragraph(line, " margin-bottom: 0.15em;")).join("") +
  `</div>`;

/** Separates participant-facing text from developer-facing text. */
const sectionDivider = `<hr style="border: none; border-top: 1px solid #ccc; margin: 0.75em 0;">`;

/**
 * Compose the fatal error dialog.
 *
 * @param {Object} options
 * @param {string} [options.errorDescription] - the error, in English, as thrown
 * @param {string} [options.participantMessage] - optional recovery guidance
 * @param {string} [options.participantMessageKey] - localized recovery guidance
 * @param {string} [options.buttonTextKey] - localized action button text
 * @param {string[]} [options.contextChain] - PsychoJS nested error contexts
 * @param {Object} [options.context] - output of buildErrorContext
 * @param {string} [options.language] - participant's language code
 * @returns {{title: string, titleDirection: string, titleLanguage: string,
 *            html: string, okText: string}}
 */
export const buildRuntimeErrorMessage = ({
  errorDescription,
  participantMessage,
  participantMessageKey,
  buttonTextKey,
  contextChain = [],
  context,
  language = getParticipantLanguage(),
} = {}) => {
  const isEnglish = language === ENGLISH_LANGUAGE_CODE;
  const direction = getLanguageDirection(language);
  const description =
    typeof errorDescription === "string" && errorDescription.trim()
      ? errorDescription.trim()
      : null;
  const localizedParticipantMessage = participantMessageKey
    ? phrase(participantMessageKey, language)
    : null;
  const englishParticipantMessage = participantMessageKey
    ? phrase(participantMessageKey, ENGLISH_LANGUAGE_CODE)
    : participantMessage;

  // b. English: title, summary, and hint (always present).
  const englishLines = participantMessageKey
    ? [englishParticipantMessage]
    : [ENGLISH_TEXT.EE_studyEndedWithError];
  if (
    !participantMessageKey &&
    typeof participantMessage === "string" &&
    participantMessage.trim()
  ) {
    englishLines.push(participantMessage.trim());
  }
  if (!description) {
    englishLines.push(ENGLISH_TEXT.EE_unspecifiedJavascriptError);
  }
  const englishHint = phraseOrNull(HINT_KEY, ENGLISH_LANGUAGE_CODE);
  if (englishHint) englishLines.push(englishHint);

  // a. Localized: title, summary, and hint (only when _language is not English).
  let localizedBlock = "";
  if (!isEnglish) {
    const localizedLines = participantMessageKey
      ? [localizedParticipantMessage]
      : [phrase("EE_studyEndedWithError", language)];
    if (!description) {
      localizedLines.push(phrase("EE_unspecifiedJavascriptError", language));
    }
    const localizedHint = phraseOrNull(HINT_KEY, language);
    if (localizedHint) localizedLines.push(localizedHint);

    localizedBlock = languageBlock({
      language,
      direction,
      title: phrase("EE_errorDialogTitle", language),
      lines: localizedLines,
      allowBold: Boolean(participantMessageKey),
    });
  }

  const details = [...contextChain];
  if (description) details.push(description);
  details.push(...errorContextLines(context));

  // Participant-facing text is above the divider; developer-facing text below.
  // A localized keyed message already contains the complete recovery guidance,
  // so do not repeat that guidance in English.
  const html =
    `<div class="ee-runtime-error" lang="${escapeHtml(
      language,
    )}" dir="${direction}">` +
    (isEnglish
      ? languageBlock({
          language: ENGLISH_LANGUAGE_CODE,
          direction: "ltr",
          title: ENGLISH_TEXT.EE_errorDialogTitle,
          lines: englishLines,
          allowBold: Boolean(participantMessageKey),
        }) +
        sectionDivider +
        technicalBlock(details)
      : localizedBlock +
        sectionDivider +
        (participantMessageKey
          ? technicalBlock(details)
          : languageBlock({
              language: ENGLISH_LANGUAGE_CODE,
              direction: "ltr",
              title: ENGLISH_TEXT.EE_errorDialogTitle,
              lines: englishLines,
            }) + technicalBlock(details))) +
    `</div>`;

  // Title bar follows the participant's language when non-English; otherwise English.
  return {
    title: isEnglish
      ? ENGLISH_TEXT.EE_errorDialogTitle
      : phrase("EE_errorDialogTitle", language),
    titleDirection: isEnglish ? "ltr" : direction,
    titleLanguage: isEnglish ? ENGLISH_LANGUAGE_CODE : language,
    html,
    okText: buttonTextKey
      ? phrase(buttonTextKey, language)
      : isEnglish
      ? ENGLISH_TEXT.EE_ok
      : phrase("EE_ok", language),
  };
};
