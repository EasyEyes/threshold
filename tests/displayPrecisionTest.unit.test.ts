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
  DEFAULT_FLICKER_HZ,
  DISPLAY_PRECISION_LEVELS,
  DEFAULT_DITHER_LSB,
  MAX_FLICKER_HZ,
  MAX_PRECISION_BACKGROUND,
  PEDESTAL_CODE,
  digitsPerLevelForMode,
  browserBitDepthHints,
  flickerPhaseAt,
  isOnCodeGrid,
  normalizeResponse,
  parseFlickerHz,
  parsePrecisionBackground,
  randomTargetDigits,
  scoreDisplayPrecisionResponse,
  toFloat16,
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

describe("_screenMeasurePrecisionBackground helpers", () => {
  test("toFloat16 rounds to the RGBA16F value the buffer stores (ties to even)", () => {
    // 1/3 and the glossary default 0.3333 both land on the same float16.
    expect(toFloat16(1 / 3)).toBe(0.333251953125);
    expect(toFloat16(0.3333)).toBe(0.333251953125);
    expect(toFloat16(PEDESTAL_CODE)).toBe(PEDESTAL_CODE);
    // The first-cut background, as the buffer held it (measured 0.0800171).
    expect(toFloat16(0.08)).toBeCloseTo(0.080017089844, 12);
    // Exactly representable values are unchanged.
    for (const v of [0, 0.25, 0.5, 0.75, 1, 1.5, 0.08001708984375]) {
      expect(toFloat16(v)).toBe(v);
    }
    // Ties go to even: 1 + 1.5 ulp (ulp = 2^-10 in [1,2)) → 1 + 2 ulp.
    expect(toFloat16(1 + 1.5 * Math.pow(2, -10))).toBe(
      1 + 2 * Math.pow(2, -10),
    );
    // Subnormals share the fixed spacing 2^-24.
    expect(toFloat16(Math.pow(2, -24) * 3.4)).toBe(Math.pow(2, -24) * 3);
    expect(toFloat16(-0.08)).toBeCloseTo(-0.080017089844, 12);
  });

  test("parsePrecisionBackground: number or string in [0, 1 − 1/127], float16-snapped; else undefined", () => {
    expect(MAX_PRECISION_BACKGROUND).toBeCloseTo(0.992126, 6);
    expect(parsePrecisionBackground("0.3333")).toBe(PEDESTAL_CODE);
    expect(parsePrecisionBackground(1 / 3)).toBe(PEDESTAL_CODE);
    expect(parsePrecisionBackground(" 0 ")).toBe(0);
    expect(parsePrecisionBackground(0.08)).toBeCloseTo(0.080017089844, 12);
    for (const bad of [
      "",
      "  ",
      "abc",
      -0.01,
      0.995,
      1,
      NaN,
      Infinity,
      null,
      undefined,
      true,
    ])
      expect(parsePrecisionBackground(bad as any)).toBeUndefined();
  });

  test("isOnCodeGrid: only 0, 1/3, 2/3 (within 0.0005) sit on every even bit depth's grid", () => {
    for (const ok of [0, 1 / 3, 2 / 3, PEDESTAL_CODE, 0.3333, 0.6667, 0.0004])
      expect(isOnCodeGrid(ok)).toBe(true);
    for (const off of [0.08, 0.5, 0.33, 0.34, 0.25, 0.9])
      expect(isOnCodeGrid(off)).toBe(false);
  });
});

describe("_screenMeasurePrecisionFlicker helpers", () => {
  test("defaults and ceiling: 8 Hz default; 30 Hz = one swap per 60 Hz frame", () => {
    expect(DEFAULT_FLICKER_HZ).toBe(8);
    expect(MAX_FLICKER_HZ).toBe(30);
  });

  test("parseFlickerHz: number or string in (0, 30]; else undefined", () => {
    expect(parseFlickerHz("8")).toBe(8);
    expect(parseFlickerHz(8)).toBe(8);
    expect(parseFlickerHz(" 0.5 ")).toBe(0.5);
    expect(parseFlickerHz(30)).toBe(30);
    for (const bad of [
      "",
      "abc",
      0,
      -1,
      30.01,
      60,
      NaN,
      Infinity,
      null,
      undefined,
    ])
      expect(parseFlickerHz(bad as any)).toBeUndefined();
  });

  test("flickerPhaseAt: two phases per cycle, 2·hz changes per second, phase 0 first", () => {
    // At 8 Hz a half-cycle lasts 62.5 ms.
    expect(flickerPhaseAt(0, 8)).toBe(0);
    expect(flickerPhaseAt(0.03, 8)).toBe(0);
    expect(flickerPhaseAt(0.07, 8)).toBe(1);
    expect(flickerPhaseAt(0.13, 8)).toBe(0);
    // Count phase changes over one second of 1 ms samples: 2·hz.
    for (const hz of [1, 4, 8]) {
      let changes = 0;
      let last = flickerPhaseAt(0, hz);
      for (let ms = 1; ms <= 1000; ms++) {
        const p = flickerPhaseAt(ms / 1000, hz);
        if (p !== last) changes++;
        last = p;
      }
      expect(changes).toBe(2 * hz);
    }
  });
});

describe("display precision test (source contracts)", () => {
  test("_screenMeasurePrecisionFlickerBool/Hz resolve like the other _screen* parameters and drive a color exchange", () => {
    const pipeline = read(path.join("components", "screenColorPipeline.js"));
    expect(pipeline).toMatch(
      /resolveScreenParam\(\s*paramReader,\s*"_screenMeasurePrecisionFlickerBool",\s*parseBoolLike,?\s*\)\s*\?\?\s*false/,
    );
    expect(pipeline).toMatch(
      /resolveScreenParam\(\s*paramReader,\s*"_screenMeasurePrecisionFlickerHz",\s*parseFlickerHz,?\s*\)\s*\?\?\s*DEFAULT_FLICKER_HZ/,
    );
    const threshold = read("threshold.js");
    expect(threshold).toMatch(
      /flicker:\s*resolveScreenMeasurePrecisionFlickerBool\(paramReader\)/,
    );
    expect(threshold).toMatch(
      /flickerHz:\s*resolveScreenMeasurePrecisionFlickerHz\(paramReader\)/,
    );
    const src = read(path.join("components", "displayPrecisionTest.js"));
    expect(src).toMatch(/flicker = false,/);
    expect(src).toMatch(/flickerHz = DEFAULT_FLICKER_HZ,/);
    // A full-block cell per digit, drawn beneath it through the same text
    // path, and the two colors exchanged each half-cycle.
    expect(src).toMatch(/const CELL_GLYPH = "\\u2588"/);
    expect(src).toMatch(/name: `displayPrecisionCell-\$\{i\}`/);
    expect(src).toMatch(
      /digits\[i\]\.setColor\(phase \? pedestalColor : stepColors\[i\]\)/,
    );
    expect(src).toMatch(
      /cells\[i\]\.setColor\(phase \? stepColors\[i\] : pedestalColor\)/,
    );
    expect(src).toMatch(/flickerPhaseAt\(/);
    // Recorded: request, achieved rate, and the CSV columns.
    expect(src).toMatch(/hzMeasured:/);
    expect(src).toMatch(/addData\(\s*"displayPrecisionFlickerBool"/);
    expect(src).toMatch(/addData\(\s*"displayPrecisionFlickerHz"/);
    // The compiler validates the rate and cautions about flicker without a test.
    const validator = read(
      path.join("preprocess", "validateExperimentTable.ts"),
    );
    expect(validator).toMatch(/const checkScreenMeasurePrecisionFlicker/);
    expect(validator).toMatch(/^\s*checkScreenMeasurePrecisionFlicker,$/m);
  });

  test("_screenMeasurePrecisionBackground resolves like the other _screen* parameters and reaches the test", () => {
    const pipeline = read(path.join("components", "screenColorPipeline.js"));
    expect(pipeline).toMatch(
      /export const resolveScreenMeasurePrecisionBackground/,
    );
    expect(pipeline).toMatch(
      /resolveScreenParam\(\s*paramReader,\s*"_screenMeasurePrecisionBackground",\s*parsePrecisionBackground,?\s*\)\s*\?\?\s*PEDESTAL_CODE/,
    );
    // threshold.js hands the resolved value to the routine…
    const threshold = read("threshold.js");
    expect(threshold).toMatch(
      /background:\s*resolveScreenMeasurePrecisionBackground\(paramReader\)/,
    );
    // …which snaps it to float16, defaults to PEDESTAL_CODE, draws the digits
    // one step above it, and records the value used plus its grid status.
    const src = read(path.join("components", "displayPrecisionTest.js"));
    expect(src).toMatch(/background = PEDESTAL_CODE,/);
    expect(src).toMatch(/parsePrecisionBackground\(background\)/);
    expect(src).toMatch(/const stepColor = gray\(pedestal \+ v\)/);
    expect(src).toMatch(
      /pedestalOnCodeGrid: isOnCodeGrid\(pedestal\)|const pedestalOnCodeGrid = isOnCodeGrid\(pedestal\)/,
    );
    expect(src).toMatch(/pedestal,\s*pedestalOnCodeGrid,/);
    expect(src).toMatch(
      /addData\(\s*"displayPrecisionBackground",\s*pedestal\)/,
    );
    // The compiler validates the range and cautions about off-grid values.
    const validator = read(
      path.join("preprocess", "validateExperimentTable.ts"),
    );
    expect(validator).toMatch(/const checkScreenMeasurePrecisionBackground/);
    expect(validator).toMatch(/^\s*checkScreenMeasurePrecisionBackground,$/m);
  });

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
    // full codes — an 8-bit display then over-reads as 10-bit. The constant
    // lives in the import-free scoring module, shared with the ColorCAL
    // transfer-function test (colorPipelineTestPage.js, Test 9).
    const scoringSrc = read(
      path.join("components", "displayPrecisionScoring.js"),
    );
    expect(scoringSrc).toMatch(/export const PEDESTAL_CODE = 0\.333251953125/);
    expect(src).toMatch(
      /import \{[^}]*\bPEDESTAL_CODE\b[^}]*\} from "\.\/displayPrecisionScoring\.js"/,
    );
    // The pedestal is the resolved _screenMeasurePrecisionBackground
    // (default PEDESTAL_CODE); each digit is one precision step above it.
    expect(src).toMatch(/const pedestal = parsedBackground \?\? PEDESTAL_CODE/);
    expect(src).toMatch(/const stepColor = gray\(pedestal \+ v\)/);
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
      "displayPrecisionBackground",
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
