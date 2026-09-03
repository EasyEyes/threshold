/**
 * Visual display-precision test (components/displayPrecisionTest.js +
 * components/displayPrecisionScoring.js), gated by _screenMeasurePrecision
 * (assume8Bit = no test; test1Digit / test2Digits run the perceptual test
 * with one or two digits per precision level).
 *
 * Part 1 tests the pure logic directly (the scoring module is deliberately
 * import-free so it loads in node). Part 2 pins source contracts the same
 * way colorPipelineTestPage.unit.test.ts does: parameter gating, scheduling
 * position, the dither-off measurement discipline, i18n with fallback,
 * non-Latin-keyboard support, the results columns, and the simulated
 * participant's stand-down rule. Browser behavior (real suspension of the
 * dither filter, the digits on the canvas, auto-submit) is covered by
 * tests/e2e/displayPrecisionTest.e2e.test.ts.
 *
 * @jest-environment node
 */
import { readFileSync } from "fs";
import * as path from "path";

import {
  DISPLAY_PRECISION_LEVELS,
  DEFAULT_DITHER_LSB,
  digitsPerLevelForMode,
  browserBitDepthHints,
  normalizeResponse,
  randomTargetDigits,
  scoreDisplayPrecisionResponse,
} from "../components/displayPrecisionScoring.js";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

describe("precision levels", () => {
  test("six levels, each the LSB of a 7…12-bit pipe, brightest first", () => {
    expect(DISPLAY_PRECISION_LEVELS).toHaveLength(6);
    expect(DISPLAY_PRECISION_LEVELS.map((l) => l.bits)).toEqual([
      7, 8, 9, 10, 11, 12,
    ]);
    for (const { value, bits } of DISPLAY_PRECISION_LEVELS) {
      expect(value).toBeCloseTo(1 / (2 ** bits - 1), 12);
    }
    // Strictly decreasing left to right: visibility is then monotone and a
    // correct report is a prefix.
    const values = DISPLAY_PRECISION_LEVELS.map((l) => l.value);
    for (let i = 1; i < values.length; i++)
      expect(values[i]).toBeLessThan(values[i - 1]);
    // The exact series: 1/127, 1/255, 1/511, 1/1023, 1/2047, 1/4095.
    expect(values).toEqual([
      1 / 127,
      1 / 255,
      1 / 511,
      1 / 1023,
      1 / 2047,
      1 / 4095,
    ]);
  });

  test("digits per level: 1 for test1Digit, 2 for test2Digits", () => {
    expect(digitsPerLevelForMode("test1Digit")).toBe(1);
    expect(digitsPerLevelForMode("test2Digits")).toBe(2);
  });

  test("fallback dither LSB is the compiled 8-bit default", () => {
    expect(DEFAULT_DITHER_LSB).toBeCloseTo(1 / 255, 12);
  });
});

describe("randomTargetDigits", () => {
  test("all digits, requested length, adjacent digits distinct", () => {
    for (const n of [6, 12]) {
      const s = randomTargetDigits(n);
      expect(s).toMatch(new RegExp(`^[0-9]{${n}}$`));
      for (let i = 1; i < s.length; i++) expect(s[i]).not.toBe(s[i - 1]);
    }
  });

  test("deterministic under a seeded rng", () => {
    const rngA = () => 0.42;
    const rngB = () => 0.42;
    expect(randomTargetDigits(12, rngA)).toBe(randomTargetDigits(12, rngB));
  });
});

describe("scoreDisplayPrecisionResponse — test1Digit (1 digit per level)", () => {
  const TARGET = "391607"; // 6 digits, one per level (7…12 bits)

  test("all six digits reported → 12-bit bound, dither LSB 1/4095", () => {
    const s = scoreDisplayPrecisionResponse(TARGET, "391607", 1);
    expect(s.digitsCorrect).toBe(6);
    expect(s.levelsCorrect).toBe(6);
    expect(s.effectiveBits).toBe(12);
    expect(s.chosenDitherLsb).toBeCloseTo(1 / 4095, 12);
  });

  test("first two digits → 8-bit bound, dither LSB 1/255", () => {
    const s = scoreDisplayPrecisionResponse(TARGET, "39", 1);
    expect(s.digitsCorrect).toBe(2);
    expect(s.levelsCorrect).toBe(2);
    expect(s.effectiveBits).toBe(8);
    expect(s.chosenDitherLsb).toBeCloseTo(1 / 255, 12);
  });

  test("first four digits → 10-bit bound, dither LSB 1/1023", () => {
    const s = scoreDisplayPrecisionResponse(TARGET, "3916", 1);
    expect(s.levelsCorrect).toBe(4);
    expect(s.effectiveBits).toBe(10);
    expect(s.chosenDitherLsb).toBeCloseTo(1 / 1023, 12);
  });

  test("counting stops at the first mismatch", () => {
    const s = scoreDisplayPrecisionResponse(TARGET, "398607", 1);
    expect(s.digitsCorrect).toBe(2);
    expect(s.effectiveBits).toBe(8);
  });

  test("a wrong first digit scores zero even if later digits match", () => {
    const s = scoreDisplayPrecisionResponse(TARGET, "91607", 1);
    expect(s.digitsCorrect).toBe(0);
    expect(s.effectiveBits).toBeNull();
  });

  test("empty response → nothing learned, keep the 1/255 default", () => {
    const s = scoreDisplayPrecisionResponse(TARGET, "", 1);
    expect(s.digitsCorrect).toBe(0);
    expect(s.levelsCorrect).toBe(0);
    expect(s.effectiveBits).toBeNull();
    expect(s.effectiveLsb).toBeNull();
    expect(s.chosenDitherLsb).toBeCloseTo(DEFAULT_DITHER_LSB, 12);
  });

  test("responses are normalized: spaces, punctuation, non-digits", () => {
    expect(normalizeResponse(" 39 16-0a7 ")).toBe("391607");
    const s = scoreDisplayPrecisionResponse(TARGET, " 3 9 1 6", 1);
    expect(s.response).toBe("3916");
    expect(s.digitsCorrect).toBe(4);
  });
});

describe("scoreDisplayPrecisionResponse — test2Digits (2 digits per level)", () => {
  const TARGET = "298713460529"; // 12 digits, two per level

  test("a level counts only when BOTH of its digits are reported", () => {
    // 7 correct digits = 3 full levels + 1 dangling digit → 9-bit bound.
    const s = scoreDisplayPrecisionResponse(TARGET, "2987134", 2);
    expect(s.digitsCorrect).toBe(7);
    expect(s.levelsCorrect).toBe(3);
    expect(s.effectiveBits).toBe(9);
    expect(s.chosenDitherLsb).toBeCloseTo(1 / 511, 12);
  });

  test("eight correct digits → 4 levels → 10-bit bound (the typical case)", () => {
    const s = scoreDisplayPrecisionResponse(TARGET, "29871346", 2);
    expect(s.levelsCorrect).toBe(4);
    expect(s.effectiveBits).toBe(10);
    expect(s.chosenDitherLsb).toBeCloseTo(1 / 1023, 12);
  });

  test("all twelve digits → 12-bit bound", () => {
    const s = scoreDisplayPrecisionResponse(TARGET, TARGET, 2);
    expect(s.digitsCorrect).toBe(12);
    expect(s.levelsCorrect).toBe(6);
    expect(s.effectiveBits).toBe(12);
  });

  test("one lone correct digit is not enough for any level", () => {
    const s = scoreDisplayPrecisionResponse(TARGET, "2", 2);
    expect(s.digitsCorrect).toBe(1);
    expect(s.levelsCorrect).toBe(0);
    expect(s.effectiveBits).toBeNull();
    expect(s.chosenDitherLsb).toBeCloseTo(DEFAULT_DITHER_LSB, 12);
  });
});

describe("browserBitDepthHints", () => {
  afterEach(() => {
    delete (global as any).screen;
    delete (global as any).matchMedia;
  });

  test("node (no screen/matchMedia): every hint is undefined, no throw", () => {
    const hints = browserBitDepthHints();
    expect(hints.reportedRGBBits).toBeUndefined();
    expect(hints.reportsAtLeast10BitsPerChannel).toBeUndefined();
    expect(hints.reportsHDRCapability).toBeUndefined();
  });

  test("reads screen.colorDepth and the two media queries", () => {
    (global as any).screen = { colorDepth: 30 };
    (global as any).matchMedia = (q: string) => ({
      matches: q === "(min-color: 10)",
    });
    const hints = browserBitDepthHints();
    expect(hints.reportedRGBBits).toBe(30);
    expect(hints.reportsAtLeast10BitsPerChannel).toBe(true);
    expect(hints.reportsHDRCapability).toBe(false);
  });
});

describe("display precision test (source contracts)", () => {
  test("_screenMeasurePrecision resolves like the other _screen* parameters", () => {
    const src = read(path.join("components", "screenColorPipeline.js"));
    expect(src).toMatch(/export const resolveScreenMeasurePrecision/);
    // The three canonical values, defaulting to assume8Bit.
    expect(src).toContain('"assume8Bit"');
    expect(src).toContain('"test1Digit"');
    expect(src).toContain('"test2Digits"');
    expect(src).toMatch(
      /resolveScreenParam\(\s*paramReader,\s*"_screenMeasurePrecision"/,
    );
    expect(src).toMatch(/\?\?\s*"assume8Bit"/);
  });

  test("threshold.js schedules the routine between sound calibration and the ColorCAL page", () => {
    const src = read("threshold.js");
    const order = [
      "flowScheduler.add(displayNeedsPage)",
      "flowScheduler.add(startSoundCalibration)",
      "flowScheduler.add(displayPrecisionTestRoutine)",
      "flowScheduler.add(colorPipelineTestPageRoutine)",
      "flowScheduler.add(experimentInit)",
    ].map((s) => src.indexOf(s));
    expect(order.every((i) => i !== -1)).toBe(true);
    expect([...order]).toEqual([...order].sort((a, b) => a - b));
    // The routine gates the page on _screenMeasurePrecision, records the
    // browser hints for every experiment, and re-records the pipeline
    // report once the ExperimentHandler exists (and the LSB is final).
    expect(src).toMatch(/recordDisplayBitDepthHints\(psychoJS\)/);
    expect(src).toMatch(/displayPrecisionTestMode\(paramReader\)/);
    const routineBody = src.slice(
      src.indexOf("async function displayPrecisionTestRoutine"),
      src.indexOf("async function colorPipelineTestPageRoutine"),
    );
    expect(routineBody).toMatch(/showDisplayPrecisionTest\(\{/);
    expect(routineBody).toMatch(/logScreenColorPipelineReport\(psychoJS\)/);
  });

  test("the test suspends dither, measures, sets the LSB, then resumes", () => {
    const src = read(path.join("components", "displayPrecisionTest.js"));
    const suspendAt = src.indexOf("suspendDither()");
    const chooseAt = src.indexOf("setDitherLsb(score.chosenDitherLsb)");
    const resumeAt = src.indexOf("resumeDither()");
    expect(suspendAt).toBeGreaterThan(-1);
    expect(chooseAt).toBeGreaterThan(suspendAt);
    expect(resumeAt).toBeGreaterThan(chooseAt);
    // Restoration lives in finally so an error cannot leave dither off.
    expect(src).toMatch(/finally\s*\{[\s\S]*resumeDither\(\)/);
  });

  test("stimulus follows the spec: 72 pt (96 px) bold Arial digits, LTR, on an on-grid gray pedestal", () => {
    const src = read(path.join("components", "displayPrecisionTest.js"));
    expect(src).toMatch(/DIGIT_HEIGHT_PX = 96/);
    expect(src).toMatch(/Arial/);
    expect(src).toMatch(/bold: true/);
    expect(src).toMatch(/randomTargetDigits/);
    expect(src).toContain('input.dir = "ltr"');
    // Digits sit one code-step above a gray pedestal (off the sRGB toe, so
    // visibility does not depend on the display's black level or ICC
    // profile) that is float16(1/3) EXACTLY: on the code grid of every even
    // bit depth. A mid-code pedestal (e.g. the first-cut 0.08 = 20.40 in
    // 8-bit codes) lets sub-LSB steps cross a rounding boundary and read as
    // full codes — an 8-bit display then over-reads as 10-bit.
    expect(src).toMatch(/PEDESTAL_CODE = 0\.333251953125/);
    expect(src).toMatch(/const code = PEDESTAL_CODE \+ v/);
  });

  test("float16 guard: refuses to run and marks the result invalid without RGBA16F", () => {
    const src = read(path.join("components", "displayPrecisionTest.js"));
    // The run checks the achieved buffer and bails before showing anything.
    expect(src).toMatch(/if \(!bootReport\.float16Backbuffer\)/);
    expect(src).toMatch(/valid: false/);
    expect(src).toMatch(/float16Achieved: false/);
    expect(src).toMatch(/skippedReason/);
    // The successful path marks the run valid.
    expect(src).toMatch(/valid: true/);
    expect(src).toMatch(/float16Achieved: true/);
  });

  test("instructions come from EE_typeNumberToMeasurePrecision with English fallback and bold markdown", () => {
    const src = read(path.join("components", "displayPrecisionTest.js"));
    expect(src).toContain('"EE_typeNumberToMeasurePrecision"');
    expect(src).toContain(
      "Type the fading number into the box below. Then press **Return** or click **Proceed**.",
    );
    // **…** (and the endpoint's pre-converted <strong>) render bold via the
    // codebase-wide phrase renderer.
    expect(src).toMatch(/renderMarkdown\(/);
    expect(src).toMatch(/from "\.\/markdownInline\.js"/);
    // The Proceed button label is the translated T_proceed.
    expect(src).toContain('"T_proceed"');
  });

  test("non-Latin keyboards: clickable digits 0…9 and an on-screen delete", () => {
    const src = read(path.join("components", "displayPrecisionTest.js"));
    expect(src).toContain("eeDisplayPrecisionDigit");
    expect(src).toContain("eeDisplayPrecisionDelete");
    expect(src).toContain("⌫");
  });

  test("results carry the three hint columns and the precision columns", () => {
    const src = read(path.join("components", "displayPrecisionTest.js"));
    for (const column of [
      "reportedRGBBits",
      "reportsAtLeast10BitsPerChannel",
      "reportsHDRCapability",
      "displayPrecisionValid",
      "displayPrecisionTargetString",
      "displayPrecisionResponse",
      "displayPrecisionDigitsCorrect",
      "displayPrecisionBits",
      "displayPrecisionLsb",
      "screenDitherLsb",
      "displayPrecisionTest",
    ])
      expect(src).toMatch(new RegExp(`addData\\(\\s*"${column}"`));
    // Hints come from the recommended browser reports.
    const scoring = read(path.join("components", "displayPrecisionScoring.js"));
    expect(scoring).toContain("screen.colorDepth");
    expect(scoring).toContain("(min-color: 10)");
    expect(scoring).toContain("(dynamic-range: high)");
  });

  test("simulated runs self-drive: page auto-submits, sim loop stands down", () => {
    const page = read(path.join("components", "displayPrecisionTest.js"));
    expect(page).toMatch(/targetString\.slice\(0, 2 \* digitsPerLevel\)/);
    expect(page).toContain("window.__EEdisplayPrecisionSubmit");
    const sim = read(path.join("components", "simulatedParticipant.ts"));
    expect(sim).toContain("[data-ee-display-precision-page]");
  });

  test("blackout detection scales its threshold with the active dither LSB", () => {
    const src = read(path.join("components", "boundingNew.js"));
    const fn = src.slice(src.indexOf("const isPointBlack"));
    expect(fn).toMatch(/getColorPipelineReport\(\)/);
    expect(fn).toMatch(/0\.5 \/ 255 \+[\s\S]*ditherLsb/);
  });
});
