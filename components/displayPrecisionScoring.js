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
 * A number is shown on a true-black background, fading from left to right:
 * each precision level contributes one digit (test1Digit, 6 digits total)
 * or two digits (test2Digits, 12 digits total), at the smallest luminance
 * increment available at that precision — the LSB of a 7…12-bit pipe:
 * 1/127, 1/255, 1/511, 1/1023, 1/2047, 1/4095 (fraction of white's digital
 * value, R=G=B). With our own dither suspended and the float16 path
 * carrying the values intact to the compositor, the only quantizer left is
 * the output pipe itself (OS compositor, cable, panel — including any
 * panel FRC, which counts as real precision here). A pipe with effective
 * step D renders value v as round(v/D)*D, i.e. a digit is visible exactly
 * when v >= D/2, so visibility is monotone left-to-right and every digit is
 * simply visible or absent. Correctly reporting the digit(s) of a level
 * sets a LOWER BOUND on the display's effective precision. One digit per
 * level leaves a 10% guessing rate per level; two digits reduce it to 1%
 * (we anticipate participants will reliably report visible digits and only
 * rarely guess invisible ones).
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
