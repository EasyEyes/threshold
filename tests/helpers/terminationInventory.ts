/**
 * Shared inventory of termination codes emitted by the codebase: every
 * literal written via addData("unmetNeeds"/"error", …) plus every
 * quitPsychoJS 6th-argument code. Used by the grammar guard
 * (terminationCoverage.test.ts) and the EasyEyes Error Table coverage test
 * (errorTable.test.ts) so the two can never drift apart.
 */

import { readFileSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..", "..");

export const sourceFiles = (): string[] => {
  const files = [path.join(ROOT, "threshold.js")];
  const compDir = path.join(ROOT, "components");
  for (const f of readdirSync(compDir)) {
    if (/\.(js|ts)$/.test(f)) files.push(path.join(compDir, f));
  }
  return files;
};

/** Split a balanced-paren argument list into top-level argument strings. */
export const splitArgs = (src: string, openIdx: number): string[] => {
  const args: string[] = [];
  let cur = "";
  let depth = 1;
  let quote: string | null = null;
  for (let j = openIdx; j < src.length && depth > 0; j++) {
    const ch = src[j];
    if (quote) {
      cur += ch;
      if (ch === "\\") {
        cur += src[j + 1] ?? "";
        j++;
      } else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      cur += ch;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      cur += ch;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      if (depth > 0) cur += ch;
    } else if (ch === "," && depth === 1) {
      args.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) args.push(cur);
  return args;
};

const lineOf = (src: string, idx: number): number =>
  src.slice(0, idx).split("\n").length;

/** Strip line and block comments so commented-out code isn't scanned. */
export const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");

export const collectCalls = (file: string) => {
  const src = stripComments(readFileSync(file, "utf8"));
  const calls: { args: string[]; line: number }[] = [];
  const needle = "quitPsychoJS(";
  let i = src.indexOf(needle);
  while (i !== -1) {
    const lineStart = src.lastIndexOf("\n", i) + 1;
    const prefix = src.slice(lineStart, i);
    if (!/\b(import|from|function)\s*$/.test(prefix.trim() + " ")) {
      calls.push({
        args: splitArgs(src, i + needle.length - 1 + 1),
        line: lineOf(src, i),
      });
    }
    i = src.indexOf(needle, i + needle.length);
  }
  return calls;
};

/** Every literal termination code in a source file. */
export const collectLiteralCodes = (
  file: string,
): { code: string; line: number }[] => {
  const src = stripComments(readFileSync(file, "utf8"));
  const out: { code: string; line: number }[] = [];
  // addData("unmetNeeds"|"error", <literal-or-template>) — both columns can
  // carry termination labels.
  const re =
    /addData\(\s*(?:"unmetNeeds"|'unmetNeeds'|"error"|'error')\s*,\s*([`"'][^`"']*[`"'])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    // Dynamic values (crashTerminationLabel(), needsUnmetString) carry no literal;
    // literals only.
    if (!/^\$\{/.test(m[1]))
      out.push({ code: skeleton(m[1]), line: lineOf(src, m.index) });
  }
  // quitPsychoJS 6th-argument codes.
  for (const { args, line } of collectCalls(file)) {
    const code = (args[5] ?? "").trim();
    if (/^["'`]/.test(code)) out.push({ code: skeleton(code), line });
  }
  return out;
};

export const CODE_GRAMMAR = /^[a-z_]+:[A-Za-z0-9_.-]+(?::[A-Za-z0-9_.-]+)*/;

export const LEGACY_CODES = new Set([
  "compatibilityNotMet",
  "soundCalibrationFailed",
  "consentDeclined",
  "emailSendFailed",
  "emailVerificationCancelled",
  "emailVerificationFailed",
  "calibrationObjectUnavailable",
  "escapeKey",
  "fullscreenExit",
  // Pre-existing one-word codes (discovered by this guard); kept verbatim —
  // no mass renames. New codes must use the grammar.
  "noSmartphone",
  "peerConnectCancelled",
  "peerConnectDeclined",
  "peerConnectNoSmartphone",
  "soundCalibrationAborted",
  "soundOutputDisconnected",
  "microphonePermissionDenied",
]);

/** Skeleton a template literal: ${…} → X, drop trailing (detail). */
export const skeleton = (raw: string): string =>
  raw
    .replace(/\$\{[^}]*\}/g, "X")
    .replace(/`/g, "")
    .replace(/["']/g, "")
    .replace(/\([^)]*\)\s*$/, "")
    .trim();

/**
 * Labels composed at runtime (no literal at any addData/quitPsychoJS
 * call site), so the scanner can't see them. Listed by their stable prefix.
 */
export const EMITTED_DYNAMIC_CODES = [
  "_crash", // errorHandling.js crashTerminationLabel()
  "participant:tabClosed", // lifetime.js stampUnloadExit()
  "rc:cameraReconnectPopup:quit", // rcTermination.ts
  "rc:chooseScreenQuit:quit", // threshold.js rc.setOnQuit dispatch
  "rc:", // rcTermination.ts — unknown/other RC triggers
  "fullscreenExit(rc:", // fullscreenPause.js — overlay opened by RC's onQuit
];

/** Labels no longer emitted but present in historical results CSVs. */
export const HISTORICAL_CODES = ["remoteCalibratorQuit"];

/** The catch-all rows (prefix-match everything below them). */
export const CATCH_ALL_ROWS = ["rc:", "_crash", "participant:tabClosed"];
