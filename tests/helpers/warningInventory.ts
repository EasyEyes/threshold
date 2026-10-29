/**
 * Inventory of warning text written to EasyEyes output data. Literal warning
 * calls are scanned from repo-owned runtime sources; indirect emitters whose
 * text cannot be discovered at a warning() call site are listed explicitly.
 */

import { readFileSync, readdirSync } from "fs";
import path from "path";
import { splitArgs, stripComments } from "./terminationInventory";

const ROOT = path.join(__dirname, "..", "..");

/** Runtime sources, excluding vendored addons with their own warning system. */
export const warningSourceFiles = (): string[] => {
  const files = [path.join(ROOT, "threshold.js")];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "addons") continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(js|ts)$/.test(entry.name) && !entry.name.endsWith(".d.ts"))
        files.push(file);
    }
  };
  walk(path.join(ROOT, "components"));
  return files;
};

const lineOf = (src: string, idx: number): number =>
  src.slice(0, idx).split("\n").length;

/** Stable text following a leading interpolation (e.g. prior warning lines). */
const labelAfterLeadingInterpolation = (argument: string): string | null => {
  const match = /^`\$\{[^}]*\}([^`$]+)/.exec(argument.trim());
  return match?.[1].trim() || null;
};

/** Static text used for matching, with interpolations removed. */
const literalPrefix = (argument: string): string | null => {
  const arg = argument.trim();
  const quote = arg[0];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;
  let body = "";
  for (let i = 1; i < arg.length; i++) {
    const ch = arg[i];
    if (ch === "\\") {
      body += ch + (arg[i + 1] ?? "");
      i++;
    } else if (ch === quote) {
      return (quote === "`" ? body.replace(/\$\{[^}]*\}/g, "") : body).trim();
    } else body += ch;
  }
  return null;
};

export type WarningCall = {
  prefix: string | null;
  argument: string;
  line: number;
};

/** warning(...), the RC-boundary callback, and direct warning-column writes. */
export const collectWarningCalls = (file: string): WarningCall[] => {
  const src = stripComments(readFileSync(file, "utf8"));
  const out: WarningCall[] = [];
  const emitters = ["warning(", "rcBoundaryWarning("];
  for (const emitter of emitters) {
    let i = src.indexOf(emitter);
    while (i !== -1) {
      const args = splitArgs(src, i + emitter.length);
      const argument = (args[0] ?? "").trim();
      out.push({
        prefix: literalPrefix(argument),
        argument,
        line: lineOf(src, i),
      });
      i = src.indexOf(emitter, i + emitter.length);
    }
  }

  // Direct addData("warning", ...) writes bypass warning(). Inventory only
  // static text here; indirect/dynamic writers are registered explicitly below.
  const addData = "addData(";
  let i = src.indexOf(addData);
  while (i !== -1) {
    const args = splitArgs(src, i + addData.length);
    if (/^["']warning["']$/.test((args[0] ?? "").trim())) {
      const argument = (args[1] ?? "").trim();
      const prefix =
        literalPrefix(argument) || labelAfterLeadingInterpolation(argument);
      if (prefix) out.push({ prefix, argument, line: lineOf(src, i) });
    }
    i = src.indexOf(addData, i + addData.length);
  }
  return out;
};

/** Stable prefixes emitted indirectly rather than through warning(...). */
export const EMITTED_INDIRECT_WARNINGS = [
  "tabHiddenAt:", // visibilityBreadcrumb.ts → injected stamp callback
  "tabVisibleAfterMs:", // visibilityBreadcrumb.ts → injected stamp callback
];
