import type { EasyEyesError } from "./errorMessages";

/** GitLab/Pavlovia project path limit is 255; leave room for a version suffix. */
export const MAX_REPO_BASE_NAME_LENGTH = 245;

const STARTS_WITH_LETTER_OR_DIGIT = /^[A-Za-z0-9]/;
const CONSECUTIVE_SPECIAL = /[._-]{2,}/;
const ALLOWED_CHAR = /[A-Za-z0-9._-]/;

export const REPO_NAME_RULES_HTML = [
  "Pavlovia repository names (GitLab project slugs) must:",
  "• contain only letters, digits, underscores (_), dots (.), and dashes (-)",
  "• start with a letter or digit (not a dash, underscore, or dot)",
  "• not contain consecutive special characters (for example <code>--</code> or <code>..</code>)",
  `• be at most ${MAX_REPO_BASE_NAME_LENGTH} characters, so the appended version number still fits GitLab's 255-character limit`,
  "Rename the spreadsheet to follow these rules, then compile again. The compiler copies the spreadsheet name as-is; it will not change the name for you.",
].join("<br/>");

export class IllegalRepoNameError extends Error {
  readonly baseName: string;
  readonly reason: string;

  constructor(baseName: string, reason: string) {
    super(
      `The spreadsheet name "${baseName}" is not a legal Pavlovia repository name. ${reason}`,
    );
    this.name = "IllegalRepoNameError";
    this.baseName = baseName;
    this.reason = reason;
  }
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const describeChar = (char: string): string => {
  if (char === " ") return "a space";
  if (char === "\t") return "a tab";
  return `"${char}"`;
};

/**
 * Spreadsheet filename without its last extension. Does not otherwise change
 * the name — a trailing dash in `Acuity2026-.xlsx` is kept.
 */
export const repoBaseNameFromSpreadsheetFileName = (fileName: string): string =>
  fileName.replace(/\.[^.]+$/, "");

/**
 * The spreadsheet name as it will be used for the Pavlovia repo (before the
 * version integer is appended). Throws rather than rewriting illegal names.
 */
export const assertValidRepoBaseName = (name: string): string => {
  if (!name) {
    throw new IllegalRepoNameError(
      name,
      "The spreadsheet has no name besides its extension.",
    );
  }
  if (name.length > MAX_REPO_BASE_NAME_LENGTH) {
    throw new IllegalRepoNameError(
      name,
      `It is ${name.length} characters long; the maximum is ${MAX_REPO_BASE_NAME_LENGTH}.`,
    );
  }
  const badChar = [...name].find((char) => !ALLOWED_CHAR.test(char));
  if (badChar !== undefined) {
    throw new IllegalRepoNameError(
      name,
      `It contains ${describeChar(badChar)}, which is not allowed.`,
    );
  }
  if (!STARTS_WITH_LETTER_OR_DIGIT.test(name)) {
    throw new IllegalRepoNameError(
      name,
      "It must start with a letter or digit, not a dash, underscore, or dot.",
    );
  }
  if (CONSECUTIVE_SPECIAL.test(name)) {
    throw new IllegalRepoNameError(
      name,
      'It contains consecutive special characters (for example "--" or "..").',
    );
  }
  return name;
};

export const maxNumericSuffix = (
  matches: { name: string }[],
  base: string,
): number => {
  let max = 0;
  for (const project of matches) {
    const suffix = project.name.slice(base.length);
    if (/^\d+$/.test(suffix)) max = Math.max(max, parseInt(suffix, 10));
  }
  return max;
};

/**
 * Copy `baseName` faithfully and append the next (or current) version integer.
 */
export const versionedRepoName = (
  baseName: string,
  matches: { name: string }[],
  isNewExperiment: boolean,
): string => {
  const name = assertValidRepoBaseName(baseName);
  const max = maxNumericSuffix(matches, name);
  if (!isNewExperiment) return max === 0 ? `${name}1` : `${name}${max}`;
  return `${name}${max + 1}`;
};

export const illegalRepoNameToEasyEyesError = (
  error: IllegalRepoNameError,
): EasyEyesError => ({
  name: "Illegal Pavlovia repository name",
  message: `The compiler names the Pavlovia repository after your spreadsheet, then appends a version number. It does not change the name. <strong>${escapeHtml(
    error.baseName,
  )}</strong> is not a legal repository name: ${escapeHtml(error.reason)}`,
  hint: REPO_NAME_RULES_HTML,
  context: "preprocessor",
  kind: "error",
  parameters: [],
});
