/**
 * displayPrecisionScoring — the pure logic of the visual display-precision
 * test (components/displayPrecisionTest.js): the per-precision digit
 * luminances, the scoring of the participant's response, and the browser's
 * bit-depth hints.
 *
 * Deliberately import-free so unit tests (tests/displayPrecisionTest.unit.
 * test.ts) can run it in node without dragging in PIXI/PsychoJS.
 *
 * THE MEASUREMENT (_screenMeasurePrecision = test1Digit | test2Digits).
 * A number fades from left to right: each precision level contributes one
 * digit (test1Digit, 6 digits total) or two digits (test2Digits, 12 digits
 * total), each drawn one code-LSB of a 7…12-bit pipe — 1/127, 1/255, 1/511,
 * 1/1023, 1/2047, 1/4095 (fraction of white's digital value, R=G=B) — ABOVE
 * a gray pedestal (the rendering detail lives in displayPrecisionTest.js;
 * the pedestal keeps the step off the sRGB toe so its visibility does not
 * depend on the display's black level or ICC profile). With our own dither
 * suspended and the float16 path carrying the values intact to the
 * compositor, the only quantizer left is the output pipe itself (OS
 * compositor, cable, panel — including any panel FRC, which counts as real
 * precision here). A pipe with effective code step D renders pedestal+v as
 * round((pedestal+v)/D)*D; because the pedestal sits ON the pipe's code
 * grid (a multiple of D for every plausible depth — see PEDESTAL_CODE in
 * displayPrecisionTest.js), the digit separates from the pedestal exactly
 * when the pipe resolves a step of v; visibility is therefore monotone
 * left-to-right and every digit is simply visible or absent.
 * Correctly reporting the digit(s) of a level sets a LOWER BOUND on the
 * display's effective precision. One digit per level leaves a 10% guessing
 * rate per level; two digits reduce it to 1% (we anticipate participants
 * will reliably report visible digits and only rarely guess invisible ones).
 */

/**
 * Level k's digit color value (fraction of white, R=G=B) and the display
 * precision implied when it is the faintest fully-reported level. Order
 * matches the on-screen number: leftmost = brightest.
 */
export const DISPLAY_PRECISION_LEVELS = [
  { value: 1 / 127, bits: 7 },
  { value: 1 / 255, bits: 8 },
  { value: 1 / 511, bits: 9 },
  { value: 1 / 1023, bits: 10 },
  { value: 1 / 2047, bits: 11 },
  { value: 1 / 4095, bits: 12 },
];

/**
 * Gray pedestal the digits sit on, in framebuffer code units [0,1]. Each
 * digit is drawn one precision-LSB (DISPLAY_PRECISION_LEVELS) ABOVE this
 * pedestal rather than on true black. Shared by the visual test
 * (displayPrecisionTest.js) and the ColorCAL transfer-function test
 * (colorPipelineTestPage.js, Test 9), which measures exactly these codes.
 * The value must satisfy ALL of:
 *   1. Off the sRGB toe (> ~0.04): near black a code step is a minuscule
 *      amount of light whose rendering is dominated by the display's black
 *      level, ICC profile, and room reflections (a true-black laptop shows
 *      nothing; a mismatched profile lifts the shadows) — so black-based
 *      results depend on "profile tricks". On an above-toe pedestal the
 *      SAME code step lands on a steeper, consistent part of the transfer
 *      curve, at a comfortable absolute luminance above screen-reflection
 *      floors.
 *   2. ON THE OUTPUT PIPE'S CODE GRID at every plausible hardware depth.
 *      A pipe of depth b outputs round(v*(2^b-1)): whether pedestal+step
 *      separates from the pedestal is decided by whether the sum crosses
 *      the next rounding boundary, so a pedestal sitting mid-code promotes
 *      sub-LSB steps into full-code jumps. The first cut (0.08 = 20.40 in
 *      8-bit codes, only 0.096 codes below the boundary at 20.5) did
 *      exactly that: on a pure 8-bit pipe the 9-, 10-, and 11-bit digits
 *      all rounded up to code 21 — exactly as visible as the legitimate
 *      8-bit digit — so an 8-bit display read as 10-bit-effective. The
 *      only above-black values on the code grid of EVERY even bit depth
 *      (3 divides 2^b-1 for even b) are multiples of 1/3; black (0, on
 *      every grid) fails requirement 1. Hence 1/3.
 *   3. Exactly representable in the RGBA16F buffer, so the stored value is
 *      the analyzed value. float16(1/3) = 1365/4096 = 0.333251953125,
 *      which lands 0.021 (8-bit) / 0.083 (10-bit) codes BELOW the integer
 *      code: float16-stored sub-LSB digit codes stay below the rounding
 *      boundary (margins 0.023 / 0.084 codes) while full-LSB digits cross
 *      it (margins ≥ 0.42 codes) — verified for pure 8-bit, pure 10-bit,
 *      and chained 10→8-bit pipes.
 * Tradeoff vs. a dimmer pedestal: lower Weber contrast per step (~2.4% at
 * the 8-bit step, ~0.6% at the 10-bit step) — but an over-read is the
 * harmful direction (undersized dither brings banding back; oversized is
 * merely unbiased noise), and dither sizing only needs 8-vs-10-bit. The
 * perceptual ceiling is ~10–11 bits; beyond that, the photometer (protocol
 * Test 7/9) is the arbiter. If this value must change, the only other
 * on-grid choice is 2/3 (which halves the Weber contrast of every step).
 */
export const PEDESTAL_CODE = 0.333251953125; // = float16(1/3); see above

/**
 * Largest allowed _screenMeasurePrecisionBackground: the brightest digit
 * (background + 1/127) must still fit below white.
 */
export const MAX_PRECISION_BACKGROUND = 1 - 1 / 127;

/**
 * Round to the nearest IEEE half-precision (float16) value, ties to even —
 * what the RGBA16F drawing buffer stores. Used so that the background the
 * scientist requests (_screenMeasurePrecisionBackground) is analyzed and
 * recorded as the value the display actually receives: e.g. 0.3333 and 1/3
 * both become 0.333251953125.
 */
export const toFloat16 = (x) => {
  if (!Number.isFinite(x) || x === 0) return x;
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  if (a >= 65520) return sign * Infinity;
  // Exponent of the binade; subnormals share the fixed spacing 2^-24.
  const e = Math.max(-14, Math.floor(Math.log2(a)));
  const ulp = Math.pow(2, e - 10);
  const q = a / ulp;
  let r = Math.round(q);
  if (q - Math.floor(q) === 0.5 && r % 2 !== 0) r -= 1; // ties to even
  return sign * r * ulp;
};

/**
 * True when a background sits on the output code grid of every even bit
 * depth (8, 10, 12 …): only 0, 1/3, and 2/3 qualify (see PEDESTAL_CODE).
 * Anywhere else, sub-8-bit digit increments can cross a rounding boundary
 * on an 8-bit pipe and show up as whole codes — an over-read.
 */
export const isOnCodeGrid = (background, tolerance = 5e-4) =>
  [0, 1 / 3, 2 / 3].some((g) => Math.abs(background - g) <= tolerance);

/**
 * Parse a _screenMeasurePrecisionBackground value (spreadsheet cell, URL
 * override, or number): a number in [0, MAX_PRECISION_BACKGROUND], returned
 * snapped to float16; undefined when missing or invalid.
 */
export const parsePrecisionBackground = (value) => {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : NaN;
  if (!Number.isFinite(n) || n < 0 || n > MAX_PRECISION_BACKGROUND)
    return undefined;
  return toFloat16(n);
};

/**
 * _screenMeasurePrecisionFlickerHz default: complete flicker cycles
 * (foreground → background → foreground) per second when
 * _screenMeasurePrecisionFlickerBool is TRUE.
 */
export const DEFAULT_FLICKER_HZ = 8;

/**
 * Upper bound for _screenMeasurePrecisionFlickerHz. A complete cycle is two
 * color swaps, and a swap can happen at most once per displayed frame, so a
 * 60 Hz display cannot cycle faster than 30 Hz.
 */
export const MAX_FLICKER_HZ = 30;

/**
 * Parse a _screenMeasurePrecisionFlickerHz value (cell, URL override, or
 * number): a number in (0, MAX_FLICKER_HZ]; undefined when missing/invalid.
 */
export const parseFlickerHz = (value) => {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > MAX_FLICKER_HZ) return undefined;
  return n;
};

/**
 * Which half of the flicker cycle is showing at time t (seconds since the
 * flicker started): 0 = digit carries the step, cell is the pedestal (the
 * ordinary display); 1 = the two colors exchanged. A complete cycle at hz
 * has two halves, so the phase toggles 2·hz times per second.
 */
export const flickerPhaseAt = (tSec, hz) => Math.floor(tSec * hz * 2) % 2;

/** Digits shown per precision level, by _screenMeasurePrecision mode. */
export const digitsPerLevelForMode = (mode) => (mode === "test2Digits" ? 2 : 1);

/**
 * Fallback when the participant reports NO digits (too-bright room,
 * brightness turned down, or participant error): the test learned nothing
 * usable, so keep the compiled 8-bit default. Oversized dither is unbiased
 * (just noisier than optimal); undersized dither brings banding back — so
 * when in doubt, 1/255 is the safe choice.
 */
export const DEFAULT_DITHER_LSB = 1 / 255;

/**
 * A random digit string (e.g. "391607"), adjacent digits distinct so a
 * repeated glyph cannot be misread (or miscounted) as a single digit.
 * Each digit after the first is drawn uniformly from the 9 digits that
 * differ from its predecessor (direct arithmetic, no rejection loop, so
 * any rng — however degenerate — terminates).
 */
export const randomTargetDigits = (nDigits, rng = Math.random) => {
  let out = "";
  let previous = -1;
  for (let i = 0; i < nDigits; i++) {
    let digit;
    if (previous < 0) {
      digit = Math.min(9, Math.floor(rng() * 10));
    } else {
      digit = Math.min(8, Math.floor(rng() * 9));
      if (digit >= previous) digit++;
    }
    out += String(digit);
    previous = digit;
  }
  return out;
};

/** Strip everything that is not a digit. */
export const normalizeResponse = (typed) =>
  String(typed ?? "").replace(/[^0-9]/g, "");

/**
 * Score the typed copy of the fading number. Because visibility is monotone
 * (luminance decreases left to right and quantization preserves order), a
 * correct report is a prefix of the target: we count matching digits from
 * the left and stop at the first mismatch. A precision level counts only
 * when ALL of its digits (1 or 2, per digitsPerLevel) are in that correct
 * prefix.
 *
 * @param {string} target - the displayed digits, brightest level first
 * @param {string} typed - the participant's response
 * @param {number} [digitsPerLevel] - 1 (test1Digit) or 2 (test2Digits)
 * @returns {{response: string, digitsCorrect: number, levelsCorrect: number,
 *   effectiveLsb: number|null, effectiveBits: number|null,
 *   chosenDitherLsb: number}} effectiveLsb/effectiveBits are null when no
 *   level was fully reported; chosenDitherLsb is the dither amplitude to
 *   use (the faintest fully-reported level's value, else
 *   DEFAULT_DITHER_LSB).
 */
export const scoreDisplayPrecisionResponse = (
  target,
  typed,
  digitsPerLevel = 1,
) => {
  const response = normalizeResponse(typed);
  const n = Math.min(target.length, response.length);
  let digitsCorrect = 0;
  while (digitsCorrect < n && response[digitsCorrect] === target[digitsCorrect])
    digitsCorrect++;
  const levelsCorrect = Math.min(
    Math.floor(digitsCorrect / digitsPerLevel),
    DISPLAY_PRECISION_LEVELS.length,
  );
  const faintest =
    levelsCorrect > 0 ? DISPLAY_PRECISION_LEVELS[levelsCorrect - 1] : null;
  return {
    response,
    digitsCorrect,
    levelsCorrect,
    effectiveLsb: faintest ? faintest.value : null,
    effectiveBits: faintest ? faintest.bits : null,
    chosenDitherLsb: faintest ? faintest.value : DEFAULT_DITHER_LSB,
  };
};

/**
 * Browser bit-depth hints, reported in the study results. These are
 * REPORTS, not measurements: screen.colorDepth may say 24 regardless of the
 * panel, and (min-color: 10) cannot distinguish native 10-bit from
 * 8-bit+FRC — which is exactly why the visual test measures effective
 * precision instead of trusting them.
 */
export const browserBitDepthHints = () => {
  const mq = (q) => {
    try {
      return typeof matchMedia === "function"
        ? matchMedia(q).matches
        : undefined;
    } catch (e) {
      return undefined;
    }
  };
  return {
    reportedRGBBits:
      typeof screen !== "undefined" ? screen.colorDepth : undefined,
    reportsAtLeast10BitsPerChannel: mq("(min-color: 10)"),
    reportsHDRCapability: mq("(dynamic-range: high)"),
  };
};
