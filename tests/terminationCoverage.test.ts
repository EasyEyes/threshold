/**
 * Termination coverage guard: EVERY quitPsychoJS(…) call site must record a
 * termination code (6th argument) unless the call is a completion
 * (isCompleted === true). This is the enforceable form of "every termination
 * is recorded" — labels land in the error column, true needs (_need*…) in
 * unmetNeeds (see terminationColumns.test.ts).
 *
 * Scanner + inventory live in helpers/terminationInventory.ts, shared with
 * the EasyEyes Error Table coverage test (errorTable.test.ts).
 */

import path from "path";
import { describe, expect, test } from "@jest/globals";
import {
  CODE_GRAMMAR,
  LEGACY_CODES,
  collectCalls,
  collectLiteralCodes,
  sourceFiles,
  stripComments,
} from "./helpers/terminationInventory";
import { readFileSync } from "fs";

const ROOT = path.join(__dirname, "..");

describe("every termination records a code", () => {
  test("all quitPsychoJS call sites pass a code (or are completions)", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const rel = path.relative(ROOT, file);
      if (rel === path.join("components", "lifetime.js")) continue; // definition
      for (const { args, line } of collectCalls(file)) {
        const isCompleted = args[1]?.trim() ?? "";
        if (isCompleted === "true") continue; // completion: no reason
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

  test("vague legacy RC quit label `remoteCalibratorQuit` is gone", () => {
    // Renamed to rc:cameraReconnectPopup:quit (what failed + participant
    // action); RC's own detail rides inside the cell itself.
    const hits: string[] = [];
    for (const file of sourceFiles()) {
      const src = stripComments(readFileSync(file, "utf8"));
      if (src.includes("remoteCalibratorQuit"))
        hits.push(path.relative(ROOT, file));
    }
    expect(hits).toEqual([]);
  });
});

// ── grammar guard (card: "many failures are explained too vaguely") ─────────
// Every termination code must be either grammar-conformant
// `<component>:<what>[:<detail>…]` (e.g. rc:cameraReconnectPopup:quit,
// _crash:fn:Error:frame) or on the explicit legacy allow-list. A new vague
// one-word code (e.g. "quit2") fails here, so vagueness can't creep back.
describe("termination code grammar", () => {
  test("every literal termination code is grammar-conformant or legacy", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const rel = path.relative(ROOT, file);
      if (rel === path.join("components", "lifetime.js")) continue; // passthrough only
      for (const { code, line } of collectLiteralCodes(file)) {
        const ok = LEGACY_CODES.has(code) || CODE_GRAMMAR.test(code);
        if (!ok) offenders.push(`${rel}:${line} → "${code}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("no underscore-prefixed labels other than _crash (underscore = need)", () => {
    // Denis's rule: everything in the unmetNeeds column is an underscore
    // glossary parameter. A new underscore-prefixed LABEL would be
    // indistinguishable from a need once the columns split.
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const rel = path.relative(ROOT, file);
      if (rel === path.join("components", "lifetime.js")) continue;
      for (const { code, line } of collectLiteralCodes(file)) {
        if (code.startsWith("_") && !code.startsWith("_crash"))
          offenders.push(`${rel}:${line} → "${code}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
