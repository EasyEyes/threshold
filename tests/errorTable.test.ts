/**
 * EasyEyes Error Table floor: every termination label the runtime can write
 * to the error column must have a row (name + explanation) in
 * errors/easyeyes-error-table.tsv. The Google Sheet (tab "Errors", link in
 * notes/) is the team's living document — Shiny reads the sheet, and prose
 * there may outgrow this file. The TSV is the repo-side floor that forces an
 * explanation to exist at the moment a label is added. Workflow when adding
 * or renaming a label: add the TSV row (this suite goes green), then paste
 * that row into the sheet's Errors tab (append under existing rows; never
 * overwrite the team's prose). Rows the runtime does NOT emit are allowed
 * (the team adds other EasyEyes components' errors to the sheet), but names
 * must stay well-formed so Shiny's prefix matching keeps working.
 */

import { readFileSync } from "fs";
import path from "path";
import { describe, expect, test } from "@jest/globals";
import {
  CATCH_ALL_ROWS,
  CODE_GRAMMAR,
  EMITTED_DYNAMIC_CODES,
  HISTORICAL_CODES,
  LEGACY_CODES,
  collectLiteralCodes,
  sourceFiles,
} from "./helpers/terminationInventory";

const TABLE_PATH = path.join(
  __dirname,
  "..",
  "errors",
  "easyeyes-error-table.tsv",
);

type Row = { name: string; explanation: string };

const parseTable = (): Row[] => {
  const text = readFileSync(TABLE_PATH, "utf8");
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  if (lines[0] !== "name\texplanation")
    throw new Error("table must start with header: name<TAB>explanation");
  return lines.slice(1).map((l) => {
    const [name, ...rest] = l.split("\t");
    return { name, explanation: rest.join("\t") };
  });
};

/** Does row `name` prefix-match `code` at a token boundary? (Skeleton
 * placeholders "X" stand in for dynamic parts, so they count as a boundary
 * too.) */
const covers = (name: string, code: string): boolean => {
  if (!code.startsWith(name)) return false;
  const rest = code.slice(name.length);
  return (
    rest === "" ||
    /^[:(]/.test(rest) ||
    /^X+$/.test(rest) ||
    /^X+[():]/.test(rest)
  );
};

describe("EasyEyes Error Table", () => {
  const rows = parseTable();
  const names = rows.map((r) => r.name);

  test("names are unique", () => {
    expect(new Set(names).size).toBe(names.length);
  });

  test("every row has a substantive explanation", () => {
    const offenders = rows
      .filter((r) => r.explanation.trim().length < 20)
      .map((r) => r.name);
    expect(offenders).toEqual([]);
  });

  test("every row name is a well-formed code (legacy, grammar, or historical)", () => {
    const offenders = names.filter(
      (n) =>
        !LEGACY_CODES.has(n) &&
        !CODE_GRAMMAR.test(n) &&
        !CATCH_ALL_ROWS.includes(n) &&
        !HISTORICAL_CODES.includes(n),
    );
    expect(offenders).toEqual([]);

    // The team may add rows for other EasyEyes components — allowed. A
    // name close to, but not equal to, a threshold-emitted code usually
    // means a typo'd rename that would silently lose coverage.
    const emitted = new Set([
      ...EMITTED_DYNAMIC_CODES,
      ...LEGACY_CODES,
      ...HISTORICAL_CODES,
      ...CATCH_ALL_ROWS,
    ]);
    for (const file of sourceFiles())
      for (const { code } of collectLiteralCodes(file)) emitted.add(code);
    const unknown = names.filter(
      (n) => ![...emitted].some((e) => e.startsWith(n) || n.startsWith(e)),
    );
    if (unknown.length)
      console.warn(
        `[error-table] rows not emitted by threshold (fine if intentional):\n  ${unknown.join(
          "\n  ",
        )}`,
      );
  });

  test("every emitted label has a row (literals)", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const rel = path.relative(path.join(__dirname, ".."), file);
      for (const { code } of collectLiteralCodes(file)) {
        if (!rows.some((r) => covers(r.name, code)))
          offenders.push(`${rel} → ${code}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("every emitted label has a row (dynamic + catch-alls)", () => {
    const offenders = EMITTED_DYNAMIC_CODES.filter(
      (code) => !rows.some((r) => covers(r.name, code)),
    );
    expect(offenders).toEqual([]);
  });

  test("historical labels (old results CSVs) still have rows", () => {
    const offenders = HISTORICAL_CODES.filter(
      (code) => !rows.some((r) => r.name === code),
    );
    expect(offenders).toEqual([]);
  });
});
