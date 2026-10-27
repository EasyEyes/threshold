/**
 * EasyEyes Warning Table — the warnings-side companion to
 * errors/easyeyes-error-table.tsv. Shiny popup-explains warnings by prefix.
 * This TSV is the repo-side floor: every runtime warning must have an
 * explanation here before it can ship. Paste new rows into the Google Sheet
 * "Warnings" tab, exactly like the Errors workflow.
 */

import { readFileSync } from "fs";
import path from "path";
import { describe, expect, test } from "@jest/globals";
import {
  EMITTED_INDIRECT_WARNINGS,
  collectWarningCalls,
  warningSourceFiles,
} from "./helpers/warningInventory";

const ROOT = path.join(__dirname, "..");
const TSV = path.join(ROOT, "errors", "easyeyes-warning-table.tsv");

const rows = readFileSync(TSV, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => l.split("\t"));

const body = rows.slice(1);
const names = body.map(([name]) => name);
const covered = (warning: string) =>
  names.some((name) => warning.includes(name));

describe("easyeyes-warning-table.tsv", () => {
  test("parses as unique name TAB explanation rows", () => {
    expect(rows[0]).toEqual(["name", "explanation"]);
    expect(body.length).toBeGreaterThan(10);
    expect(new Set(names).size).toBe(names.length);
    for (const [name, explanation] of body) {
      expect(name).toMatch(/\S/);
      expect(explanation.length).toBeGreaterThan(20);
    }
  });

  test("every literal warning emitter has documented stable text", () => {
    const offenders: string[] = [];
    for (const file of warningSourceFiles()) {
      const rel = path.relative(ROOT, file);
      for (const { prefix, argument, line } of collectWarningCalls(file)) {
        if (!prefix)
          offenders.push(
            `${rel}:${line} → no static prefix: ${argument.slice(0, 80)}`,
          );
        else if (!covered(prefix))
          offenders.push(`${rel}:${line} → ${prefix.slice(0, 140)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("every indirect warning emitter has a documented prefix", () => {
    expect(EMITTED_INDIRECT_WARNINGS.filter((code) => !covered(code))).toEqual(
      [],
    );
  });

  test("the inventory sees direct warning-column writes, not just warning()", () => {
    const lifetimeCalls = collectWarningCalls(
      path.join(ROOT, "components", "lifetime.js"),
    );
    expect(
      lifetimeCalls.some(
        ({ prefix }) =>
          prefix?.startsWith(
            "quitPsychoJS re-entry after termination ignored;",
          ),
      ),
    ).toBe(true);
  });
});
