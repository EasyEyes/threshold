/**
 * Source invariant: Excel-safe cell formatting is a SAVE-TIME transform.
 *
 * excelSafeRows() is applied where rows become output (json_to_sheet in
 * ExperimentHandler.save and saveCSV, and the database documents derived
 * from the same `data`), never at record time (addData/nextEntry store raw
 * values). This makes "every emitted cell has spaced commas" hold by
 * construction — no value can reach output without passing the chokepoint —
 * and keeps in-memory trial data unmodified.
 *
 * @jest-environment node
 */

import * as fs from "fs";
import * as path from "path";
import { describe, expect, test } from "@jest/globals";

describe("ExperimentHandler — save-time Excel-safe transform", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../psychojs/src/data/ExperimentHandler.js"),
    "utf8",
  );

  test("save()'s worksheet consumes the data formatted above", () => {
    // save() formats once via the assignment; its worksheet site must not
    // re-wrap (redundant double transform).
    const saveBody = src.slice(
      src.indexOf("async save("),
      src.indexOf("saveCSV("),
    );
    expect(
      saveBody.match(/json_to_sheet\(excelSafeRows\(data\)\)/g),
    ).toBeNull();
  });

  test("saveCSV() formats its external rows at the worksheet", () => {
    // saveCSV receives caller-supplied rows that never passed through
    // save()'s assignment, so its worksheet must wrap directly.
    const saveCsvBody = src.slice(src.indexOf("saveCSV("));
    expect(
      saveCsvBody.match(/json_to_sheet\(\s*excelSafeRows\(data\)\s*\)/g)
        ?.length,
    ).toBe(1);
  });

  test("saveCSV's database upload also derives from formatted rows", () => {
    // DATABASE saveFormat is reachable on Pavlovia (set via the dashboard
    // by the compiler from _pavlovia_Database_ResultsFormatBool); no
    // emission may bypass the transform.
    const saveCsvBody = src.slice(src.indexOf("saveCSV("));
    expect(saveCsvBody).toMatch(
      /uploadData\('results', JSON\.stringify\(excelSafeRows\(data\)\)/,
    );
  });

  test("save() formats data once, right after _orderOutput", () => {
    expect(src).toMatch(
      /_orderOutput\(this\._trialsData, attributes\)\);[\s\S]{0,500}data = excelSafeRows\(data\);/,
    );
  });

  test("no record-time transformation: addData/nextEntry store raw values", () => {
    // The cell-level helper is never referenced; the only references to
    // excelSafeRows are its import and the two call sites (comments aside,
    // which cannot introduce behavior).
    expect(src).not.toMatch(/excelSafeCellValue/);
    expect(src).toMatch(
      /^import \{ excelSafeRows \} from "\.\/excelSafe\.js";$/m,
    );
  });

  test("addData keeps upstream Array→JSON.stringify behavior", () => {
    expect(src).toMatch(/if \(Array\.isArray\(value\)\)/);
  });
});
