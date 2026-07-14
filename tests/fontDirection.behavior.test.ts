/**
 * Behavior tests for the fontLeftToRightBool → fontDirection migration.
 *
 * Track A (GREEN — characterize CURRENT behavior, must keep passing):
 *   A2 updateExperimentProgressBar placeOnLeft mapping
 *   A3 compiler accepts fontDirection as a categorical
 *   B2-lang setFontGlobalState still sets <html lang>
 *
 * Track B (RED — desired NEW behavior, fails now, passes after impl):
 *   B2-dir setFontGlobalState sets <html dir> from fontDirection + font.direction global
 *
 * @jest-environment jsdom
 */
import "@jest/globals";

// ── dependency mocks (hoisted) ───────────────────────────────────────────────
// fonts.js imports the whole threshold app (paramReader) + webfontloader; mock
// them so the module loads under jsdom. global provides a real-enough `font`
// singleton shared with the code under test (same module instance).
jest.mock("webfontloader", () => ({}));
jest.mock("../threshold", () => ({ paramReader: {} }));
jest.mock("../components/fontInstancing", () => ({
  combineVariableSettingsWithWeight: () => "",
  getProcessedFontName: () => null,
}));
// fonts.js imports utils (which transitively pulls the whole PsychoJS app);
// setFontGlobalState only needs isBlockLabel from it.
jest.mock("../components/utils", () => ({
  isBlockLabel: (s: any) => !isNaN(s),
  toFixedNumber: (..._a: any[]) => 0,
}));

const fontSingleton: Record<string, unknown> = {};
jest.mock("../components/global", () => ({
  font: fontSingleton,
  status: { block_condition: "1_1", nthBlock: 1 },
  targetKind: { current: undefined },
  typekit: { fonts: { get: (n: string) => n } },
}));

import { font } from "../components/global";
import { setFontGlobalState } from "../components/fonts";
import {
  createExperimentProgressBar,
  updateExperimentProgressBar,
} from "../components/progressBar";
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/experimentFileChecks";

beforeAll(async () => {
  await loadGlossaryForTests();
});

// A fake paramReader for setFontGlobalState. Returns per-param values,
// defaulting to benign values so the processed-font / adobe paths are skipped.
function makeReader(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    font: "TestFont",
    fontSource: "google",
    fontVariableSettings: "",
    fontWeight: "",
    fontStylisticSets: "",
    fontColorRGBA: "0,0,0,1",
    fontTrackingForLetters: 0,
    fontPadding: 0,
    fontLanguage: "en",
    fontPunctuationRTL: "none",
    // current (fontLeftToRightBool) and new (fontDirection) both provided:
    fontLeftToRightBool: true,
    fontDirection: "ltr",
  };
  const merged = { ...defaults, ...overrides };
  return { read: (name: string) => merged[name] };
}

// ── A2: updateExperimentProgressBar placeOnLeft mapping (GREEN) ──────────────
describe("A2: updateExperimentProgressBar placeOnLeft mapping", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    createExperimentProgressBar();
  });

  // placeOnLeft → left="5px"; !placeOnLeft → right="5px".
  // (The other side is set to "auto", which jsdom normalizes to "" — so we
  // only assert on which side carries "5px", the stable observable.)
  const leftSide = (container: HTMLElement) => container.style.left === "5px";
  const rightSide = (container: HTMLElement) => container.style.right === "5px";

  it("LTR, no location → bar on the right", () => {
    updateExperimentProgressBar("ltr", undefined);
    const c = document.getElementById("experiment-progress-container")!;
    expect(rightSide(c as HTMLElement)).toBe(true);
  });

  it("RTL, no location → bar on the left", () => {
    updateExperimentProgressBar("rtl", undefined);
    const c = document.getElementById("experiment-progress-container")!;
    expect(leftSide(c as HTMLElement)).toBe(true);
  });

  it("instructionLocation upperRight overrides → left", () => {
    updateExperimentProgressBar("ltr", "upperRight");
    const c = document.getElementById("experiment-progress-container")!;
    expect(leftSide(c as HTMLElement)).toBe(true);
  });

  it("instructionLocation upperLeft overrides → right", () => {
    updateExperimentProgressBar("rtl", "upperLeft");
    const c = document.getElementById("experiment-progress-container")!;
    expect(rightSide(c as HTMLElement)).toBe(true);
  });
});

// ── A3: compiler accepts fontDirection as categorical (GREEN) ────────────────
describe("A3: compiler treats fontDirection as a categorical", () => {
  function validate(csv: string) {
    const p = Papa.parse(csv, { skipEmptyLines: true });
    return validateExperimentTable(
      new ExperimentTable(p.data as readonly (readonly string[])[]),
    );
  }
  const typeErrors = (errors: any[]) =>
    errors.filter((e) => e.name.toLowerCase().includes("type"));

  it("accepts fontDirection=rtl and =vertical-rl with no type errors", () => {
    const csv = `_about,t,,
block,,1,1
fontDirection,,rtl,vertical-rl
conditionName,,A,B`;
    expect(typeErrors(validate(csv))).toHaveLength(0);
  });

  it("rejects an invalid fontDirection value with a type error", () => {
    const csv = `_about,t,,
block,,1,1
fontDirection,,sideways,sideways
conditionName,,A,B`;
    expect(typeErrors(validate(csv)).length).toBeGreaterThan(0);
  });

  // Vertical values are valid glossary categories (no type error) but vertical
  // layout isn't implemented — undefined behavior. The compiler blocks with a
  // hard error so the experimenter must pick ltr/rtl.
  const errors = (es: any[]) =>
    es.filter((e) => e.name.toLowerCase().includes("vertical"));

  it("errors (blocks compilation) when fontDirection is vertical-rl / vertical-lr", () => {
    const csv = `_about,t,,
block,,1,1
fontDirection,,vertical-rl,vertical-lr
conditionName,,A,B`;
    const errs = validate(csv);
    // No type error — vertical-* are valid categories.
    expect(typeErrors(errs)).toHaveLength(0);
    // A blocking error about vertical not being implemented.
    const ve = errors(errs);
    expect(ve.length).toBeGreaterThan(0);
    expect(ve[0].kind).toBe("error");
    expect(ve[0].parameters).toContain("fontDirection");
  });

  it("does NOT error for horizontal fontDirection values (ltr/rtl)", () => {
    const csv = `_about,t,,
block,,1,1
fontDirection,,ltr,rtl
conditionName,,A,B`;
    const errs = validate(csv);
    const ve = errors(errs);
    expect(ve).toHaveLength(0);
  });
});

// ── B2: setFontGlobalState dir + font.direction (lang stays GREEN) ───────────
describe("setFontGlobalState — direction wiring", () => {
  beforeEach(() => {
    document.documentElement.dir = "";
    document.documentElement.lang = "";
    for (const k of Object.keys(fontSingleton)) delete fontSingleton[k];
  });

  // GREEN (current behavior, must keep passing)
  it("sets <html lang> from fontLanguage", () => {
    setFontGlobalState("1_1", makeReader({ fontLanguage: "ar" }) as any);
    expect(document.documentElement.lang).toBe("ar");
  });

  // RED (new behavior)
  it("sets <html dir>='rtl' when fontDirection is rtl", () => {
    setFontGlobalState("1_1", makeReader({ fontDirection: "rtl" }) as any);
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("sets <html dir>='ltr' when fontDirection is ltr", () => {
    setFontGlobalState("1_1", makeReader({ fontDirection: "ltr" }) as any);
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("defaults <html dir>='ltr' when fontDirection is blank", () => {
    setFontGlobalState("1_1", makeReader({ fontDirection: "" }) as any);
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("stores the direction string on the global font singleton", () => {
    setFontGlobalState("1_1", makeReader({ fontDirection: "rtl" }) as any);
    expect((font as any).direction).toBe("rtl");
  });
});
