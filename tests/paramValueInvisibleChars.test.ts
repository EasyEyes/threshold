/**
 * Invisible-character diagnostics for parameter VALUES.
 *
 * A value corrupted by a spreadsheet app (Apple Numbers etc.) with an
 * invisible character — NBSP, zero-width space, bidi control — fails
 * categorical/boolean validation, but the error message shows a value
 * that LOOKS identical to a valid category, so the message reads as
 * nonsense ("speakerAndMic must be one of: … speakerAndMic").
 *
 * RED: the wrong-type error must explain that the value differs from a
 * valid category only in invisible characters (revealing each one as a
 * red U+XXXX label with its position), and name the category to copy.
 *
 * @jest-environment node
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import Papa from "papaparse";
import { getGlossary } from "../parameters/glossaryRegistry";
import { loadGlossaryForTests } from "./helpers/glossary";
import { loadPhrasesForTests } from "./helpers/phrases";
import { compileExperimentTableLocally } from "../examples/localCompile";

jest.setTimeout(300_000);

const BASE: Record<string, string> = {
  _about: "invisible value diagnostics",
  _authorAffiliations: "NYU",
  _authorEmails: "scientist@example.org",
  _authors: "A Scientist",
  _calibrateMicrophonesBool: "TRUE",
  _calibrateSoundCheck: "speakerAndMic",
  _needBrowser: "Chrome,Safari,Edge",
  _needDeviceType: "desktop",
  _needProcessorCoresMinimum: "4",
  block: "1",
  calibrateScreenSizeBool: "FALSE",
  calibrateSound1000HzDB: "-50,-40,-30,-25,-20,-15,-10,-3.1",
  conditionEnabledBool: "TRUE",
  conditionName: "Q&A",
  conditionTrials: "1",
  questionAndAnswer01: "Comment||Click Ok to continue.",
  targetSoundFolder: "DecimalSineSounds",
  targetTask: "questionAndAnswer",
};

let tmpRoot: string;

beforeAll(async () => {
  await loadGlossaryForTests();
  await loadPhrasesForTests();

  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ee-invisible-values-"));
  fs.mkdirSync(path.join(tmpRoot, "tables"), { recursive: true });
  fs.mkdirSync(path.join(tmpRoot, "folders"), { recursive: true });

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file("01000.0Hz.wav", Buffer.alloc(44));
  fs.writeFileSync(
    path.join(tmpRoot, "folders", "DecimalSineSounds.zip"),
    await zip.generateAsync({ type: "nodebuffer" }),
  );

  // No glossary parameter uses a vector type yet; inject a stand-in so the
  // compiler's vector path is exercised end-to-end (recognition, type
  // check, hint) exactly as it will run when one is added.
  getGlossary()["zzTestVectorParam"] = {
    name: "zzTestVectorParam",
    availability: "",
    type: "3*numerical",
    default: "0, 0, 0",
    explanation: "test-only vector parameter",
    example: "1, 2, 3",
    categories: [],
  };
  getGlossary()["zzTestMatrixParam"] = {
    name: "zzTestMatrixParam",
    availability: "",
    type: "2x2*numerical",
    default: "0, 0; 0, 0",
    explanation: "test-only matrix parameter",
    example: "1, 2; 3, 4",
    categories: [],
  };
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

describe("RED: invisible corruption in values is explained, not just rejected", () => {
  it("interior NBSP in a categorical value reveals U+00A0 and the valid category", async () => {
    const result = await compileWith({
      _calibrateSoundCheck: "speakerAnd\u00a0Mic",
    });
    const err = wrongTypeError(result, "_calibrateSoundCheck");
    expect(err).toBeDefined();
    expect(err.hint).toContain("U+00A0");
    expect(err.hint.toLowerCase()).toContain("invisible");
    expect(err.hint).toContain("speakerAndMic"); // the valid category it differs from
    expect(err.hint).not.toContain("Replace it"); // no repair instructions
  });

  it("interior zero-width space in a categorical value reveals U+200B", async () => {
    const result = await compileWith({
      _calibrateSoundCheck: "speakerOr\u200bMic",
    });
    const err = wrongTypeError(result, "_calibrateSoundCheck");
    expect(err).toBeDefined();
    expect(err.hint).toContain("U+200B");
    expect(err.hint).toContain("speakerOrMic");
  });

  it("invisible character in a boolean value reveals it and names TRUE/FALSE", async () => {
    const result = await compileWith({
      conditionEnabledBool: "TR\u200bUE",
    });
    const err = wrongTypeError(result, "conditionEnabledBool");
    expect(err).toBeDefined();
    expect(err.hint).toContain("U+200B");
    expect(err.hint).toContain("TRUE");
  });

  it("multicategorical: the corrupted ITEM is explained (not the whole cell)", async () => {
    const result = await compileWith({
      _needBrowser: "Chrome, Saf\u200bari, Edge",
    });
    const err = wrongTypeError(result, "_needBrowser");
    expect(err).toBeDefined();
    expect(err.hint).toContain("U+200B");
    expect(err.hint).toContain("Safari");
  });

  it("comma-ADJACENT invisible character is flagged, not stripped (end-rule boundary)", async () => {
    // Blanks are stripped only at cell ENDS; a ZWSP before a comma is
    // interior, so it must be explained, not silently repaired.
    const result = await compileWith({
      _needBrowser: "Chrome\u200b, Safari",
    });
    const err = wrongTypeError(result, "_needBrowser");
    expect(err).toBeDefined();
    expect(err.hint).toContain("U+200B");
    expect(err.hint).toContain("Chrome");
  });

  it("whitespace-only difference from a spaced category is explained as whitespace", async () => {
    // "Chrome Mobile" is a valid category; interior tab instead of the space.
    const result = await compileWith({
      _needBrowser: "Chrome\tMobile",
    });
    const err = wrongTypeError(result, "_needBrowser");
    expect(err).toBeDefined();
    expect(err.hint.toLowerCase()).toContain("whitespace");
    expect(err.hint).toContain("Chrome Mobile"); // the category to copy
  });

  it("interior ZWSP in a numerical value reveals U+200B and names the intended number", async () => {
    // The raw offending value "4\u200B2" renders as "42" — a seemingly
    // valid number — so the hint must reveal the invisible character.
    const result = await compileWith({ markFliesNumber: "4\u200b2" });
    const err = wrongTypeError(result, "markFliesNumber");
    expect(err).toBeDefined();
    expect(err.hint).toContain("U+200B");
    expect(err.hint).toContain("42");
    expect(err.hint.toLowerCase()).toContain("invisible");
  });

  it("interior NBSP in an integer value reveals U+00A0 and names the intended number", async () => {
    const result = await compileWith({
      _needProcessorCoresMinimum: "4\u00a02",
    });
    const err = wrongTypeError(result, "_needProcessorCoresMinimum");
    expect(err).toBeDefined();
    expect(err.hint).toContain("U+00A0");
    expect(err.hint).toContain("42");
  });

  it("interior plain space in a numerical value is explained as whitespace", async () => {
    const result = await compileWith({ markFliesNumber: "4 2" });
    const err = wrongTypeError(result, "markFliesNumber");
    expect(err).toBeDefined();
    expect(err.hint.toLowerCase()).toContain("whitespace");
    expect(err.hint).toContain("42");
  });

  it("vector: interior ZWSP in an element is revealed with the intended number", async () => {
    // The reason text prints the element raw: "4\u200B2" renders as "42",
    // a seemingly legal number — the hint must reveal the invisible char.
    const result = await compileWith({ zzTestVectorParam: "1, 4\u200b2, 9" });
    const err = wrongTypeError(result, "zzTestVectorParam");
    expect(err).toBeDefined();
    expect(err.hint).toContain("U+200B");
    expect(err.hint).toContain(
      'the number <span class="error-parameter">42</span>',
    );
    expect(err.hint.toLowerCase()).toContain("invisible");
  });

  it("vector: blank at an element END is overcome, not an error", async () => {
    const result = await compileWith({ zzTestVectorParam: "1, 2\u200b, 3" });
    expect(wrongTypeError(result, "zzTestVectorParam")).toBeUndefined();
  });

  it("ADV: vector hint position is relative to the element, not the comma-space before it", async () => {
    // "1, 4\u200B2, 9": within element "4\u200B2" the invisible char is at
    // character 2. Reporting 3 (position inside the space-padded token)
    // points the experimenter one character past the corruption.
    const result = await compileWith({ zzTestVectorParam: "1, 4\u200b2, 9" });
    const err = wrongTypeError(result, "zzTestVectorParam");
    expect(err.hint).toContain("at character 2)");
  });

  it("ADV control: every corrupted element gets its own hint (all errors at once)", async () => {
    const result = await compileWith({
      zzTestVectorParam: "1\u200b1, 2, 3\u200b3",
    });
    const err = wrongTypeError(result, "zzTestVectorParam");
    expect(err.hint).toContain(
      'the number <span class="error-parameter">11</span>',
    );
    expect(err.hint).toContain(
      'the number <span class="error-parameter">33</span>',
    );
  });

  it("ADV control: matrix elements are diagnosed too", async () => {
    const result = await compileWith({
      zzTestMatrixParam: "1, 4\u200b2; 3, 4",
    });
    const err = wrongTypeError(result, "zzTestMatrixParam");
    expect(err).toBeDefined();
    expect(err.hint).toContain("U+200B");
    expect(err.hint).toContain(
      'the number <span class="error-parameter">42</span>',
    );
  });

  it("ADV control: empty or blank-only vector cell requests the default, no error", async () => {
    for (const cell of ["", "\u00a0", "\u200b"]) {
      const result = await compileWith({ zzTestVectorParam: cell });
      expect(wrongTypeError(result, "zzTestVectorParam")).toBeUndefined();
    }
  });

  it("ADV control: text values with interior invisible chars neither error nor hint", async () => {
    // Text params must never reach the numeric hint branch: their values
    // pass through untouched (no stripping, no explaining).
    const result = await compileWith({
      _calibrateDistanceAllowedRangeCm: " 40, 7\u200b0",
    });
    expect(
      wrongTypeError(result, "_calibrateDistanceAllowedRangeCm"),
    ).toBeUndefined();
    expect(
      result.blockingErrors.filter((e: any) =>
        (e.hint ?? "").includes("U+200B"),
      ),
    ).toEqual([]);
  });
});

describe("GREEN: ordinary wrong values keep the plain message (no false claims)", () => {
  it("a plain typo without invisible characters gets no invisible-character hint", async () => {
    const result = await compileWith({
      _calibrateSoundCheck: "banana",
    });
    const err = wrongTypeError(result, "_calibrateSoundCheck");
    expect(err).toBeDefined();
    expect(err.hint.toLowerCase()).not.toContain("invisible");
    expect(err.hint).not.toContain("U+");
  });

  it("a case-only mismatch is not explained as invisible characters", async () => {
    const result = await compileWith({
      _calibrateSoundCheck: "speakerandmic",
    });
    const err = wrongTypeError(result, "_calibrateSoundCheck");
    expect(err).toBeDefined();
    expect(err.hint.toLowerCase()).not.toContain("invisible");
  });

  it("a plainly non-numeric value gets no invisible-character hint", async () => {
    const result = await compileWith({ markFliesNumber: "banana" });
    const err = wrongTypeError(result, "markFliesNumber");
    expect(err).toBeDefined();
    expect(err.hint.toLowerCase()).not.toContain("invisible");
    expect(err.hint).not.toContain("U+");
  });
});
