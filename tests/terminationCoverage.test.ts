/**
 * Termination coverage guard: EVERY quitPsychoJS(…) call site must record a
 * termination code (6th argument) unless the call is a completion
 * (isCompleted === true). This is the enforceable form of "every termination
 * is recorded in the unmetNeeds column".
 */

import { readFileSync, readdirSync } from "fs";
import path from "path";
import { describe, expect, test } from "@jest/globals";

const ROOT = path.join(__dirname, "..");

const sourceFiles = (): string[] => {
  const files = [path.join(ROOT, "threshold.js")];
  const compDir = path.join(ROOT, "components");
  for (const f of readdirSync(compDir)) {
    if (/\.(js|ts)$/.test(f)) files.push(path.join(compDir, f));
  }
  return files;
};

/** Split a balanced-paren argument list into top-level argument strings. */
const splitArgs = (src: string, openIdx: number): string[] => {
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
const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");

const collectCalls = (file: string) => {
  const src = stripComments(readFileSync(file, "utf8"));
  const calls: { args: string[]; line: number }[] = [];
  const needle = "quitPsychoJS(";
  let i = src.indexOf(needle);
  while (i !== -1) {
    const lineStart = src.lastIndexOf("\n", i) + 1;
    const prefix = src.slice(lineStart, i);
    // Skip imports/exports and the definition itself.
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

describe("every termination records an unmetNeeds code", () => {
  test("all quitPsychoJS call sites pass a code (or are completions)", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const rel = path.relative(ROOT, file);
      if (rel === path.join("components", "lifetime.js")) continue; // definition
      for (const { args, line } of collectCalls(file)) {
        const isCompleted = args[1]?.trim() ?? "";
        if (isCompleted === "true") continue; // completion: no unmet need
        const code = (args[5] ?? "").trim();
        if (code.length < 3) {
          offenders.push(
            `${rel}:${line} → args=${args
              .map((a) => a.trim().slice(0, 30))
              .join(" | ")}`,
          );
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
