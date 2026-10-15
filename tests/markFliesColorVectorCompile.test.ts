/**
 * @jest-environment node
 *
 * Compiler-side verification of glossary 36.0's markFliesColorRGBA type
 * change to `4*numerical`: wrong-count / non-numeric colors must be caught
 * in the compiler's all-errors-at-once pass (not silently shipped to the
 * runtime, which can only skip the flies with a console warning).
 *
 * Uses the REAL glossary (cached/live) via loadGlossaryForTests — this is
 * also the tripwire that fails if the type regresses to `text`.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { loadPhrasesForTests } from "./helpers/phrases";
import { getGlossary } from "../parameters/glossaryRegistry";
import { compileExperimentTableLocally } from "../examples/localCompile";

jest.setTimeout(300_000);

const BASE: Record<string, string> = {
  _about: "markFliesColorRGBA vector-type compile check",
  _authorAffiliations: "NYU",
  _authorEmails: "scientist@example.org",
  _authors: "A Scientist",
  _needBrowser: "Chrome,Safari,Edge",
  _needDeviceType: "desktop",
  _needProcessorCoresMinimum: "4",
  block: "1",
  calibrateScreenSizeBool: "FALSE",
  font: "Roboto Mono",
  fontCharacterSet: "abcd",
  fontSource: "google",
  spacingDirection: "radial",
  spacingOverSizeRatio: "1.4",
  spacingRelationToSize: "typographic",
  targetDurationSec: "0.3",
  targetEccentricityXDeg: "-10",
  targetEccentricityYDeg: "0",
  targetKind: "letter",
  targetMinPhysicalPx: "8",
  targetTask: "identify",
  thresholdBeta: "2.3",
  thresholdDelta: "0.01",
  thresholdGuess: "2",
  thresholdGuessLogSd: "3",
  thresholdParameter: "spacingDeg",
};

let tmpRoot: string;

beforeAll(async () => {
  await loadGlossaryForTests();
  await loadPhrasesForTests();
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "flies-color-compile-"));
  fs.mkdirSync(path.join(tmpRoot, "tables"), { recursive: true });
});

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

const compileWith = async (overrides: Record<string, string>): Promise<any> => {
  const merged = { ...BASE, ...overrides };
  const rows = Object.keys(merged)
    .sort()
    .map((n) => (n.startsWith("_") ? [n, merged[n], ""] : [n, "", merged[n]]));
  const tablePath = path.join(tmpRoot, "tables", "table.csv");
  fs.writeFileSync(tablePath, Papa.unparse(rows));
  return compileExperimentTableLocally(tablePath, { resourcesRoot: tmpRoot });
};

const wrongTypeError = (result: any, parameter: string): any =>
  result.blockingErrors.find(
    (e: any) =>
      e.name === "Parameter contains values of the wrong type" &&
      e.parameters.includes(parameter),
  );

describe("markFliesColorRGBA is a 4*numerical vector type (glossary 36.0)", () => {
  test("the glossary types it 4*numerical (tripwire: fails if it regresses to text)", () => {
    expect(getGlossary()["markFliesColorRGBA"].type).toBe("4*numerical");
  });

  test("a valid four-number color compiles clean", async () => {
    const result = await compileWith({
      markFliesNumber: "3",
      markFliesColorRGBA: " 0, 0, 1, 1",
    });
    expect(wrongTypeError(result, "markFliesColorRGBA")).toBeUndefined();
  });

  test("a three-number color is a blocking wrong-type error", async () => {
    const result = await compileWith({
      markFliesNumber: "3",
      markFliesColorRGBA: " 1, 0, 0",
    });
    expect(wrongTypeError(result, "markFliesColorRGBA")).toBeDefined();
  });

  test("a five-number color is a blocking wrong-type error", async () => {
    const result = await compileWith({
      markFliesNumber: "3",
      markFliesColorRGBA: " 1, 0, 0, 1, 9",
    });
    expect(wrongTypeError(result, "markFliesColorRGBA")).toBeDefined();
  });

  test("a non-numeric color is a blocking wrong-type error", async () => {
    const result = await compileWith({
      markFliesNumber: "3",
      markFliesColorRGBA: " red",
    });
    expect(wrongTypeError(result, "markFliesColorRGBA")).toBeDefined();
  });
});
