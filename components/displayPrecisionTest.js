/**
 * displayPrecisionTest — visual measurement of the display's EFFECTIVE
 * luminance precision, gated by the experiment-wide parameter
 * _screenMeasurePrecision (default assume8Bit = no test; test1Digit and
 * test2Digits run the perceptual test with one or two digits per
 * precision). threshold.js schedules it after the compatibility page, RC
 * calibration, and sound calibration, before the first block (and before
 * the _screenColorCheckBool ColorCAL page, so that page measures the
 * pipeline in its final, chosen configuration).
 *
 * WHY. The noisy-bit dither's amplitude (ColorPipeline ditherLsb) must
 * equal the output pipe's own quantization step — 1/255 on an
 * 8-bit-effective pipe, 1/1023 on a 10-bit-effective one (see
 * tests/e2e/COLOR_PIPELINE_PHOTOMETER_PROTOCOL.md, Test 7). Browser hints
 * (screen.colorDepth, (min-color: 10), (dynamic-range: high)) are reports,
 * not measurements, and cannot distinguish a native 10-bit panel from a
 * dithered (FRC) 8-bit one — so we don't try. We MEASURE the effective
 * precision, whatever produces it, and size the dither to match.
 *
 * HOW. Requires a real float16 (RGBA16F) drawing buffer — otherwise the
 * sub-8-bit codes are quantized in our own backbuffer before reaching the
 * display, so the test would characterize the browser, not the panel. If
 * the buffer is not float16 (Safari/Firefox/old Chrome, or the request was
 * declined) the test refuses to run, keeps the compiled dither default, and
 * records valid:false. When it does run, it SUSPENDS our own dither (it
 * would synthesize the very sub-LSB steps we are trying to measure) and
 * shows a number in 72 pt (96 px) bold Arial, fading left to right: each
 * precision level contributes 1 digit (test1Digit; 6 digits) or 2 digits
 * (test2Digits; 12 digits, guessing rate 1% instead of 10%). A digit's code
 * is one precision-LSB above a gray PEDESTAL — 1/127 (7 bit), 1/255 (8),
 * 1/511 (9), 1/1023 (10), 1/2047 (11), 1/4095 (12) — NOT on true black:
 * near black those steps are a minuscule, ICC-profile- and
 * black-level-dependent amount of light (a true-black laptop shows nothing;
 * a mismatched profile or a raised-black panel lifts them), whereas on an
 * above-toe pedestal the same code step lands on a steeper, consistent
 * part of the transfer curve and stays visible without depending on the
 * display profile. The pedestal is the experiment-wide parameter
 * _screenMeasurePrecisionBackground (default 0.3333 → float16(1/3) =
 * PEDESTAL_CODE), which sits ON the code grid of every plausible pipe depth
 * — a mid-code pedestal lets sub-LSB steps cross a rounding boundary and
 * read as full codes, inflating the measured precision, so the compiler
 * cautions about any value other than 0, 1/3, or 2/3 and the result records
 * pedestalOnCodeGrid. It still measures a code-space step (what the dither
 * operates on).
 *
 * FLICKER (_screenMeasurePrecisionFlickerBool, default FALSE; rate
 * _screenMeasurePrecisionFlickerHz, default 8 complete cycles per second).
 * The two colors of each digit — its own (pedestal + step) and its
 * background's (pedestal) — are exchanged repeatedly: half a cycle showing
 * the digit one step above the field, the other half showing a step-colored
 * cell with a pedestal-colored digit cut out of it. The cell is a FULL BLOCK
 * glyph drawn behind the digit through the same float text path, sized so
 * the cells tile the row. The visual system is most sensitive to contrast
 * that alternates at a few Hz, so flicker may lower the edge threshold and
 * let fainter steps be reported. Swaps happen at most once per displayed
 * frame; the achieved rate is recorded (flicker.hzMeasured). Every digit is visible or absent — the participant copies
 * the fading number into a same-size same-font box (translated
 * instructions: EE_typeNumberToMeasurePrecision), typing or clicking the
 * on-screen digit buttons 0…9 for non-Latin keyboards; Backspace/Delete and
 * an on-screen ⌫ button erase. Digits are always LTR, in every language.
 * The faintest fully-reported level bounds the display's precision from
 * below; ColorPipeline.setDitherLsb() then pins the dither amplitude to it
 * before dither resumes.
 *
 * Results CSV columns: reportedRGBBits, reportsAtLeast10BitsPerChannel,
 * reportsHDRCapability (browser hints — written for every experiment by
 * recordDisplayBitDepthHints), displayPrecisionValid,
 * displayPrecisionBackground (the pedestal actually used),
 * displayPrecisionFlickerBool, displayPrecisionFlickerHz (achieved rate),
 * displayPrecisionTargetString, displayPrecisionResponse,
 * displayPrecisionDigitsCorrect, displayPrecisionBits, displayPrecisionLsb,
 * screenDitherLsb, and the full displayPrecisionTest JSON. The final
 * pipeline state (including the chosen ditherLsb) also lands in the
 * screenColorPipeline column.
 *
 * Simulated runs (simulateParticipantBool) auto-submit the two brightest
 * levels' digits after a short delay — the deterministic 8-bit answer, so
 * the dither keeps its compiled 1/255 default and unattended e2e runs
 * never block. e2e can also drive the page via
 * window.__EEdisplayPrecisionSubmit.
 */

import * as visual from "../psychojs/src/visual/index.js";
import * as util from "../psychojs/src/util/index.js";
import {
  getColorPipelineReport,
  setDitherLsb,
  suspendDither,
  resumeDither,
} from "../psychojs/src/util/ColorPipeline.js";
import { resolveScreenMeasurePrecision } from "./screenColorPipeline.js";
import { readi18nPhrases } from "./readPhrases.js";
import { renderMarkdown } from "./markdownInline.js";
import { simulateActive } from "./simulatedState";
import {
  DEFAULT_FLICKER_HZ,
  DISPLAY_PRECISION_LEVELS,
  PEDESTAL_CODE,
  digitsPerLevelForMode,
  browserBitDepthHints,
  flickerPhaseAt,
  isOnCodeGrid,
  parseFlickerHz,
  parsePrecisionBackground,
  randomTargetDigits,
  scoreDisplayPrecisionResponse,
} from "./displayPrecisionScoring.js";

// 72 pt at the CSS reference density of 96 px/inch (1 pt = 4/3 px).
const DIGIT_HEIGHT_PX = 96;
// Widely available font, bold. Arial's digits share one (tabular) advance
// width, so per-digit stims line up like a single typed number.
const FONT_FAMILY = "Arial, Helvetica, sans-serif";
// Digit-row center, in PsychoJS pix (y up from canvas center); the
// response field sits below the canvas center.
const DIGIT_ROW_Y_PX = 90;

// The gray pedestal the digits sit on comes from the experiment-wide
// parameter _screenMeasurePrecisionBackground (resolved by
// screenColorPipeline.resolveScreenMeasurePrecisionBackground, passed in as
// `background`). Its default, float16(1/3) = 0.333251953125, is
// PEDESTAL_CODE, defined with its full rationale (off the sRGB toe, on the
// 8- and 10-bit code grids, float16-exact) in displayPrecisionScoring.js —
// shared with the ColorCAL transfer-function test (Test 9), which measures
// exactly these codes with a photometer.

const PAGE_ID = "display-precision-test-page";

// English fallbacks for phrase sets that predate these keys
// (readi18nPhrases throws on unknown names).
const FALLBACK_INSTRUCTIONS =
  "Type the fading number into the box below. Then press **Return** or click **Proceed**.";
const FALLBACK_PROCEED = "Proceed";

const phraseOrFallback = (name, lang, fallback) => {
  try {
    const phrase = readi18nPhrases(name, lang);
    if (typeof phrase === "string" && phrase.trim()) return phrase;
  } catch (e) {
    // Phrase (or language) not in this experiment's phrase set.
  }
  return fallback;
};

/** [0,1] RGB triplet → the "rgb(...)" string EasyEyes feeds to util.Color,
 * keeping full float precision (same convention as colorPipelineProbe). */
const rgbString = ([r, g, b]) => `rgb(${r * 255},${g * 255},${b * 255})`;

/**
 * The test mode requested by _screenMeasurePrecision: "test1Digit" or
 * "test2Digits", or null when the experiment assumes 8-bit precision
 * (assume8Bit, the default — also the fallback for experiments served with
 * a glossary that predates the parameter).
 */
export const displayPrecisionTestMode = (paramReader) => {
  const mode = resolveScreenMeasurePrecision(paramReader);
  return mode === "test1Digit" || mode === "test2Digits" ? mode : null;
};

/**
 * Write the browser's bit-depth hints into the study results — for EVERY
 * experiment, tested or not (they cost nothing and contextualize any
 * precision measurement). Names follow the hint sources:
 *   reportedRGBBits                = screen.colorDepth
 *   reportsAtLeast10BitsPerChannel = matchMedia("(min-color: 10)").matches
 *   reportsHDRCapability           = matchMedia("(dynamic-range: high)").matches
 */
export const recordDisplayBitDepthHints = (psychoJS) => {
  const hints = browserBitDepthHints();
  try {
    psychoJS.experiment.addData("reportedRGBBits", hints.reportedRGBBits);
    psychoJS.experiment.addData(
      "reportsAtLeast10BitsPerChannel",
      hints.reportsAtLeast10BitsPerChannel,
    );
    psychoJS.experiment.addData(
      "reportsHDRCapability",
      hints.reportsHDRCapability,
    );
  } catch (e) {
    // ExperimentHandler unavailable; the hints remain in the console.
  }
  console.info("[EasyEyes display precision] browser bit-depth hints", hints);
  return hints;
};

/**
 * Advance width (px) of `text` in the stimulus font at `heightPx`, measured
 * with the same canvas font machinery PIXI rasterizes with. Arial digits are
 * tabular (one shared advance), so one measurement positions every digit.
 * `fallbackEm` is used when measurement is unavailable (non-browser).
 */
const measureAdvancePx = (
  text,
  { heightPx = DIGIT_HEIGHT_PX, bold = true, fallbackEm = 0.556 } = {},
) => {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = `${bold ? "bold " : ""}${heightPx}px ${FONT_FAMILY}`;
    const w = ctx.measureText(text).width;
    if (Number.isFinite(w) && w > 0) return w;
  } catch (e) {
    /* fall through to the default */
  }
  return heightPx * fallbackEm;
};

// Flicker cells: the "background" half of each digit's color exchange is a
// FULL BLOCK glyph (U+2588) drawn behind the digit through the same float
// text path, so its color is as exact as the digit's. Its font size is
// chosen so the block's advance equals the digit advance: the cells then
// tile the row edge to edge, and the block (which fills its em box) is
// still taller than the digit's ink.
const CELL_GLYPH = "\u2588";
const cellHeightPx = (digitAdvancePx) => {
  const blockAdvanceAtDigitHeight = measureAdvancePx(CELL_GLYPH, {
    bold: false,
    fallbackEm: 0.6,
  });
  const h = (DIGIT_HEIGHT_PX * digitAdvancePx) / blockAdvanceAtDigitHeight;
  return Number.isFinite(h) && h > 0 ? h : DIGIT_HEIGHT_PX;
};

const el = (tag, style = {}, text = "") => {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text) node.textContent = text;
  return node;
};

// Dim button chrome (dark adaptation: no bright UI on this page).
const dimButtonStyle = {
  background: "#222",
  color: "#aaa",
  border: "1px solid #555",
  borderRadius: "6px",
  cursor: "pointer",
  pointerEvents: "auto",
};

/**
 * Mount the response UI (translated instructions, digits-only input field,
 * clickable digit buttons 0…9 with an on-screen ⌫ for non-Latin keyboards,
 * and a Proceed button) and resolve with the raw typed string. The page is
 * transparent — the fading number lives on the PsychoJS canvas beneath —
 * and deliberately DIM so it does not fight the participant's dark
 * adaptation.
 *
 * The input and buttons are anchored to the CANVAS rect (not the
 * viewport): the digits render relative to the canvas center, and in a
 * fullscreen run the two coincide, but in windowed/debug/simulated runs
 * the canvas may not fill the viewport and the response field must stay
 * under the number. The number, the input, and the digit buttons are
 * always LTR — numbers are written left to right in every supported
 * language — while the instructions follow their language's direction
 * (dir=auto).
 */
const collectResponse = ({
  advancePx,
  targetLength,
  canvasRect,
  instructionsHtml,
  proceedLabel,
  autoSubmitText,
}) =>
  new Promise((resolve) => {
    const page = el("div", {
      position: "fixed",
      inset: "0",
      zIndex: "99990",
      background: "transparent",
      pointerEvents: "none",
    });
    page.id = PAGE_ID;
    page.dataset.eeDisplayPrecisionPage = "";

    const canvasCenterX = canvasRect.left + canvasRect.width / 2;
    const canvasCenterY = canvasRect.top + canvasRect.height / 2;

    const instructions = el("div", {
      position: "absolute",
      left: "50%",
      top: "6%",
      transform: "translateX(-50%)",
      width: "min(80vw, 900px)",
      color: "#aaa",
      background: "transparent",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: "1.25rem",
      lineHeight: "1.5",
      textAlign: "center",
      pointerEvents: "auto",
    });
    // Translated phrase; **bold** marks key/button names (see
    // boldMarkdownToHtml). RTL languages lay the sentence out RTL.
    instructions.dir = "auto";
    instructions.innerHTML = instructionsHtml;
    page.appendChild(instructions);

    // The digits sit DIGIT_ROW_Y_PX above the canvas center (PsychoJS y is
    // up); the response field starts 40 px below the canvas center,
    // comfortably clear of the digits.
    const input = el("input", {
      position: "absolute",
      left: `${Math.round(canvasCenterX)}px`,
      top: `${Math.round(canvasCenterY + 40)}px`,
      transform: "translateX(-50%)",
      width: `${Math.ceil(advancePx * targetLength + 40)}px`,
      boxSizing: "border-box",
      background: "transparent",
      color: "#fff",
      caretColor: "#fff",
      border: "2px solid #555",
      borderRadius: "8px",
      padding: "8px 16px",
      fontFamily: FONT_FAMILY,
      fontWeight: "bold",
      fontSize: `${DIGIT_HEIGHT_PX}px`,
      textAlign: "center",
      outline: "none",
      pointerEvents: "auto",
    });
    input.type = "text";
    input.maxLength = targetLength;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.inputMode = "numeric";
    input.dir = "ltr";
    input.dataset.eeDisplayPrecisionInput = "";
    page.appendChild(input);

    let done = false;
    const submit = () => {
      if (done) return;
      done = true;
      const typed = input.value;
      try {
        delete window.__EEdisplayPrecisionSubmit;
      } catch (e) {
        /* ignore */
      }
      page.remove();
      resolve(typed);
    };

    const setValue = (value) => {
      input.value = value.replace(/[^0-9]/g, "").slice(0, targetLength);
    };

    // On-screen digits 0…9 plus ⌫, as on the crowding-response screen, so
    // the test works on computers with non-Latin keyboards. ⌫ (erase left)
    // is language-neutral; there is no translated Delete phrase.
    const digitRow = el("div", {
      position: "absolute",
      left: `${Math.round(canvasCenterX)}px`,
      // Placeholder; moved just under the input once layout exists.
      top: `${Math.round(canvasCenterY + 200)}px`,
      transform: "translateX(-50%)",
      display: "flex",
      gap: "8px",
      pointerEvents: "auto",
    });
    digitRow.dir = "ltr";
    const digitButton = (label) => {
      const button = el(
        "button",
        {
          ...dimButtonStyle,
          minWidth: "56px",
          padding: "8px 0",
          fontFamily: FONT_FAMILY,
          fontWeight: "bold",
          fontSize: "36px",
          lineHeight: "1.2",
        },
        label,
      );
      // Keep the input focused: a plain click would steal focus on
      // mousedown and bounce it back through the blur guard.
      button.addEventListener("mousedown", (e) => e.preventDefault());
      return button;
    };
    for (let d = 0; d <= 9; d++) {
      const button = digitButton(String(d));
      button.dataset.eeDisplayPrecisionDigit = String(d);
      button.addEventListener("click", () => {
        setValue(input.value + String(d));
        input.focus();
      });
      digitRow.appendChild(button);
    }
    const deleteButton = digitButton("⌫");
    deleteButton.dataset.eeDisplayPrecisionDelete = "";
    deleteButton.setAttribute("aria-label", "Delete");
    deleteButton.addEventListener("click", () => {
      setValue(input.value.slice(0, -1));
      input.focus();
    });
    digitRow.appendChild(deleteButton);
    page.appendChild(digitRow);

    const proceed = el(
      "button",
      {
        ...dimButtonStyle,
        position: "absolute",
        left: `${Math.round(canvasCenterX)}px`,
        // Placeholder; moved under the digit row once layout exists.
        top: `${Math.round(canvasCenterY + 280)}px`,
        transform: "translateX(-50%)",
        padding: "10px 24px",
        fontSize: "1.1rem",
      },
      proceedLabel,
    );
    proceed.dataset.eeDisplayPrecisionProceed = "";
    page.appendChild(proceed);

    // Keep the response digits out of the experiment's own key listeners
    // (PsychoJS event manager, escape handling): stop propagation here, and
    // the caller clears the PsychoJS event buffer after the page closes.
    // Backspace and Delete work natively in the input.
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    });
    input.addEventListener("keyup", (e) => e.stopPropagation());
    input.addEventListener("input", () => {
      const cleaned = input.value.replace(/[^0-9]/g, "").slice(0, targetLength);
      if (input.value !== cleaned) input.value = cleaned;
    });
    // Typing is this page's whole point: reclaim focus if a stray click on
    // the canvas steals it (button clicks still land — click fires after
    // the refocus timeout, and the buttons suppress mousedown focus theft).
    input.addEventListener("blur", () =>
      setTimeout(() => {
        if (!done && document.body.contains(input)) input.focus();
      }, 0),
    );
    proceed.addEventListener("click", submit);

    document.body.appendChild(page);
    // Now that the input has a layout box, stack the digit row and the
    // Proceed button beneath it.
    const inputRect = input.getBoundingClientRect();
    if (inputRect.height > 0) {
      digitRow.style.top = `${Math.round(inputRect.bottom + 24)}px`;
      const rowRect = digitRow.getBoundingClientRect();
      proceed.style.top = `${Math.round(
        (rowRect.height > 0 ? rowRect.bottom : inputRect.bottom + 84) + 24,
      )}px`;
    }
    input.focus();

    // e2e hook: drive the page programmatically.
    window.__EEdisplayPrecisionSubmit = (text) => {
      if (typeof text === "string") setValue(text);
      submit();
    };

    // Simulated participant: deterministic auto-response after a short
    // delay (long enough for e2e to observe the mounted page).
    if (typeof autoSubmitText === "string") {
      setTimeout(() => {
        if (done) return;
        setValue(autoSubmitText);
        submit();
      }, 600);
    }
  });

/**
 * Run the visual display-precision test. Resolves with the result object
 * (also published as window.__EEdisplayPrecision and written to the
 * results CSV); resolves null when the window/renderer is unavailable.
 * Restores everything it touched (window color, page chrome, dither) even
 * on error.
 *
 * @param {{psychoJS: any, rc?: any, mode?: "test1Digit"|"test2Digits",
 *   background?: number, flicker?: boolean, flickerHz?: number}} options —
 *   `background` is the resolved _screenMeasurePrecisionBackground
 *   (0…1−1/127; default PEDESTAL_CODE); `flicker`/`flickerHz` are the
 *   resolved _screenMeasurePrecisionFlickerBool/Hz (default off / 8).
 */
export const showDisplayPrecisionTest = async ({
  psychoJS,
  rc,
  mode = "test1Digit",
  background = PEDESTAL_CODE,
  flicker = false,
  flickerHz = DEFAULT_FLICKER_HZ,
} = {}) => {
  const win = psychoJS?.window;
  if (!win || !win._renderer) {
    console.warn(
      "[EasyEyes display precision] test requested but no window/renderer; skipped",
    );
    return null;
  }

  const language = rc?.language?.value ?? "en";
  const hints = browserBitDepthHints();
  const digitsPerLevel = digitsPerLevelForMode(mode);

  // The pedestal, as the RGBA16F buffer will hold it (float16-snapped), so
  // the value recorded is the value displayed. An out-of-range or malformed
  // value falls back to the default rather than aborting the test.
  const parsedBackground = parsePrecisionBackground(background);
  const pedestal = parsedBackground ?? PEDESTAL_CODE;
  if (parsedBackground === undefined)
    console.warn(
      `[EasyEyes display precision] invalid background ${background}; using the default ${PEDESTAL_CODE}`,
    );
  const pedestalOnCodeGrid = isOnCodeGrid(pedestal);
  if (!pedestalOnCodeGrid)
    console.warn(
      `[EasyEyes display precision] background ${pedestal} is not on the 8-/10-bit code grid (0, 1/3, 2/3): on an 8-bit display, sub-8-bit digits can round up to a whole code and the measured precision may be overestimated`,
    );

  // Flicker: exchange each digit's color with its background's, at hz
  // complete cycles per second (two swaps per cycle).
  const flickerEnabled = flicker === true;
  const parsedHz = parseFlickerHz(flickerHz);
  const hz = parsedHz ?? DEFAULT_FLICKER_HZ;
  if (flickerEnabled && parsedHz === undefined)
    console.warn(
      `[EasyEyes display precision] invalid flicker rate ${flickerHz} Hz; using the default ${DEFAULT_FLICKER_HZ} Hz`,
    );

  // Float16 guard. The measurement is only trustworthy on a real RGBA16F
  // drawing buffer: without it, the sub-8-bit digit codes are quantized to
  // 8 bits in OUR backbuffer before they ever reach the display, so the
  // test would characterize the browser's buffer, not the panel — and any
  // "precision" it reported would be an artifact. _screenFloat16Bool is
  // Chromium-122+ only, so Safari/Firefox/old Chrome land here even when the
  // scientist requested it. Refuse to run, keep the safe compiled dither
  // default, and record the reason — never publish a bogus measurement.
  const bootReport = getColorPipelineReport();
  if (!bootReport.float16Backbuffer) {
    const result = {
      mode,
      digitsPerLevel,
      pedestal,
      pedestalOnCodeGrid,
      flicker: { enabled: flickerEnabled, hz },
      valid: false,
      float16Achieved: false,
      skippedReason:
        "float16 drawing buffer unavailable (needs Chrome/Edge \u2265 122 with _screenFloat16Bool=TRUE); kept the default dither LSB",
      hints,
      simulated: simulateActive === true,
      pipelineDuringTest: bootReport,
    };
    try {
      psychoJS.experiment.addData("displayPrecisionValid", false);
      psychoJS.experiment.addData(
        "displayPrecisionTest",
        JSON.stringify(result),
      );
    } catch (e) {
      // ExperimentHandler unavailable; result remains on window/console.
    }
    try {
      window.__EEdisplayPrecision = result;
    } catch (e) {
      /* non-browser context */
    }
    console.warn(
      `[EasyEyes display precision] ${result.skippedReason}`,
      result,
    );
    return result;
  }

  const targetString = randomTargetDigits(
    DISPLAY_PRECISION_LEVELS.length * digitsPerLevel,
  );

  // Dither OFF for the duration: it would synthesize sub-LSB steps
  // regardless of the display (we would be re-measuring our own dither).
  // Float16 stays on — it is part of the pipe under test only insofar as it
  // REMOVES the 8-bit chokepoints we control, leaving the display's own
  // quantization as the one being measured.
  const ditherWasActive = suspendDither();
  const savedColor = win._color;

  // The compatibility/calibration flow leaves the page chrome gray via the
  // easyeyes-gray-bg class (background #eee !important — it beats the inline
  // color the Window setter writes). Lift the class for the duration so the
  // area around the canvas matches the dim pedestal, not light gray.
  const grayBgWasOnBody = document.body.classList.contains("easyeyes-gray-bg");
  const grayBgWasOnHtml =
    document.documentElement.classList.contains("easyeyes-gray-bg");
  document.body.classList.remove("easyeyes-gray-bg");
  document.documentElement.classList.remove("easyeyes-gray-bg");

  const stims = [];
  let stopped = false;
  let rafId = 0;
  try {
    // Gray pedestal (_screenMeasurePrecisionBackground) through the float
    // background path; this also sets the body's inline background to the
    // same gray. Digits are drawn one code-step brighter than this pedestal
    // (see below).
    win.color = new util.Color(rgbString([pedestal, pedestal, pedestal]));
    win.render();
    win.render();

    const advancePx = measureAdvancePx("0");
    const gray = (code) => new util.Color(rgbString([code, code, code]));
    const pedestalColor = gray(pedestal);
    const digitX = (i) => (i - (targetString.length - 1) / 2) * advancePx;

    // Flicker cells go in first so they draw BENEATH the digits. In phase 0
    // a cell is pedestal-colored (indistinguishable from the field); in
    // phase 1 it takes the digit's step color while the digit takes the
    // pedestal's — the two colors exchanged.
    const cells = [];
    if (flickerEnabled) {
      const cellPx = cellHeightPx(advancePx);
      for (let i = 0; i < targetString.length; i++) {
        const cell = new visual.TextStim({
          win,
          name: `displayPrecisionCell-${i}`,
          text: CELL_GLYPH,
          font: FONT_FAMILY,
          units: "pix",
          height: cellPx,
          pos: [digitX(i), DIGIT_ROW_Y_PX],
          color: pedestalColor,
          wrapWidth: Infinity,
          autoLog: false,
        });
        cell.setAutoDraw(true);
        stims.push(cell);
        cells.push(cell);
      }
    }

    const digits = [];
    const stepColors = [];
    for (let i = 0; i < targetString.length; i++) {
      const v = DISPLAY_PRECISION_LEVELS[Math.floor(i / digitsPerLevel)].value;
      // One precision-LSB above the pedestal: if the display resolves this
      // code step, the digit is one code brighter than the field and faintly
      // visible; if not, it quantizes back to the pedestal and vanishes.
      const stepColor = gray(pedestal + v);
      const stim = new visual.TextStim({
        win,
        name: `displayPrecisionDigit-${i}`,
        text: targetString[i],
        font: FONT_FAMILY,
        bold: true,
        units: "pix",
        height: DIGIT_HEIGHT_PX,
        pos: [digitX(i), DIGIT_ROW_Y_PX],
        color: stepColor,
        wrapWidth: Infinity,
        autoLog: false,
      });
      stim.setAutoDraw(true);
      stims.push(stim);
      digits.push(stim);
      stepColors.push(stepColor);
    }

    // Exchange the two colors of every digit/cell pair. With the float
    // color path a color change is a uniform write — no re-rasterization.
    const applyFlickerPhase = (phase) => {
      for (let i = 0; i < digits.length; i++) {
        digits[i].setColor(phase ? pedestalColor : stepColors[i]);
        cells[i].setColor(phase ? stepColors[i] : pedestalColor);
      }
    };

    // Keep rendering while the page is up, exactly like the probe sweeps:
    // resilient to compositor events, and the state is live, not a frozen
    // frame. When flickering, each frame shows the phase the clock calls
    // for (2·hz phase changes per second, so swaps are frame-quantized) and
    // the swaps are counted to report the rate actually achieved.
    const flickerStart = performance.now();
    let flickerPhase = 0;
    let flickerSwaps = 0;
    const loop = () => {
      if (stopped) return;
      if (flickerEnabled) {
        const phase = flickerPhaseAt(
          (performance.now() - flickerStart) / 1000,
          hz,
        );
        if (phase !== flickerPhase) {
          flickerPhase = phase;
          flickerSwaps++;
          applyFlickerPhase(phase);
        }
      }
      win.render();
      rafId = requestAnimationFrame(loop);
    };
    loop();

    const pipelineDuringTest = getColorPipelineReport();

    // Anchor the response UI to the canvas: that is where the number is.
    // In a fullscreen run the canvas covers the viewport, so this equals
    // viewport-centering; in windowed/simulated runs it keeps the field
    // under the number.
    const canvasRect = (
      win._renderer.view ?? document.querySelector("canvas")
    )?.getBoundingClientRect?.() ?? {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const typed = await collectResponse({
      advancePx,
      targetLength: targetString.length,
      canvasRect,
      // International Phrases mark emphasis (key and button names) with
      // MarkDown bold — **Return**, **Proceed** — because ALL CAPS has no
      // equivalent in non-Latin alphabets; the phrases endpoint may serve
      // them pre-converted to <strong>. renderMarkdown (the codebase-wide
      // phrase renderer) handles both.
      instructionsHtml: renderMarkdown(
        phraseOrFallback(
          "EE_typeNumberToMeasurePrecision",
          language,
          FALLBACK_INSTRUCTIONS,
        ),
      ),
      proceedLabel: phraseOrFallback("T_proceed", language, FALLBACK_PROCEED),
      // The simulated participant reports the two brightest levels — the
      // deterministic 8-bit answer, keeping the compiled 1/255 default.
      autoSubmitText: simulateActive
        ? targetString.slice(0, 2 * digitsPerLevel)
        : undefined,
    });

    const score = scoreDisplayPrecisionResponse(
      targetString,
      typed,
      digitsPerLevel,
    );
    // Size the noisy-bit dither to the measured output-pipe quantization
    // step. Sticky: renderer re-creations (changeResolution etc.) rebuild
    // the filter from this config value.
    setDitherLsb(score.chosenDitherLsb);

    // Achieved flicker rate: complete cycles (two swaps) per second over the
    // time the page was up. Frame-quantized swaps make this a little below
    // the request when hz does not divide the refresh rate.
    const flickerSec = (performance.now() - flickerStart) / 1000;
    const flickerInfo = {
      enabled: flickerEnabled,
      hz,
      swaps: flickerSwaps,
      hzMeasured:
        flickerEnabled && flickerSec > 0
          ? Number((flickerSwaps / 2 / flickerSec).toFixed(3))
          : null,
    };

    const result = {
      mode,
      digitsPerLevel,
      pedestal,
      pedestalOnCodeGrid,
      flicker: flickerInfo,
      valid: true,
      float16Achieved: true,
      targetString,
      levelValues: DISPLAY_PRECISION_LEVELS.map((l) => l.value),
      ...score,
      hints,
      ditherWasActive,
      simulated: simulateActive === true,
      pipelineDuringTest,
    };

    try {
      const experiment = psychoJS.experiment;
      experiment.addData("displayPrecisionValid", true);
      experiment.addData("displayPrecisionBackground", pedestal);
      experiment.addData("displayPrecisionFlickerBool", flickerEnabled);
      experiment.addData(
        "displayPrecisionFlickerHz",
        flickerEnabled ? flickerInfo.hzMeasured ?? hz : "",
      );
      experiment.addData("displayPrecisionTargetString", targetString);
      experiment.addData("displayPrecisionResponse", score.response);
      experiment.addData("displayPrecisionDigitsCorrect", score.digitsCorrect);
      experiment.addData("displayPrecisionBits", score.effectiveBits ?? "");
      experiment.addData("displayPrecisionLsb", score.effectiveLsb ?? "");
      experiment.addData("screenDitherLsb", score.chosenDitherLsb);
      experiment.addData("displayPrecisionTest", JSON.stringify(result));
    } catch (e) {
      // ExperimentHandler unavailable; result remains on window/console.
    }

    try {
      window.__EEdisplayPrecision = result;
    } catch (e) {
      /* non-browser context */
    }
    console.info(
      `[EasyEyes display precision] ${mode} target=${targetString} typed=${
        score.response
      } digitsCorrect=${score.digitsCorrect} levelsCorrect=${
        score.levelsCorrect
      } → ${
        score.effectiveBits
          ? `≥${score.effectiveBits}-bit-effective`
          : "unknown"
      } display; ditherLsb=${score.chosenDitherLsb}`,
      result,
    );
    return result;
  } finally {
    stopped = true;
    cancelAnimationFrame(rafId);
    for (const stim of stims) {
      try {
        stim.setAutoDraw(false);
      } catch (e) {
        /* ignore */
      }
    }
    try {
      win.color = savedColor;
    } catch (e) {
      /* ignore */
    }
    if (grayBgWasOnBody) document.body.classList.add("easyeyes-gray-bg");
    if (grayBgWasOnHtml)
      document.documentElement.classList.add("easyeyes-gray-bg");
    if (ditherWasActive) resumeDither();
    try {
      win.render();
      win.render();
    } catch (e) {
      /* ignore */
    }
    // Response keystrokes must not leak into the next routine's buffer.
    try {
      psychoJS.eventManager.clearEvents();
    } catch (e) {
      /* ignore */
    }
  }
};
