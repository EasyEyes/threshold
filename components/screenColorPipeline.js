/**
 * screenColorPipeline — threshold-side wiring for the EasyEyes color
 * pipeline (psychojs/src/util/ColorPipeline.js).
 *
 * The pipeline is governed by experiment-wide (underscore) glossary
 * parameters, set by the scientist in the experiment spreadsheet:
 *
 *   _screenColorSpace        ("srgb" | "display-p3", default "srgb")
 *   _screenFloat16Bool       (default FALSE; Chromium-only, ignored elsewhere)
 *   _screenDitherBool        (default FALSE; works in any browser with
 *                             renderable float16 textures)
 *   _screenMeasurePrecision  ("assume8Bit" | "test1Digit" | "test2Digits",
 *                             default "assume8Bit"; resolved by
 *                             resolveScreenMeasurePrecision below and acted
 *                             on by components/displayPrecisionTest.js)
 *
 * URL query overrides (e.g. ?_screenColorSpace=display-p3&
 * _screenFloat16Bool=TRUE&_screenDitherBool=TRUE) are honored ONLY while
 * the color instrumentation is active (?colorPipelineProbe or
 * ?colorPipelineLog): tests and manual probing need to exercise every
 * configuration against a single compiled experiment, but participant runs
 * must be controlled solely by the spreadsheet. Applied overrides are
 * console-logged, never silent.
 *
 * Must run BEFORE psychoJS.openWindow() (the WebGL context is configured at
 * window creation). After the window opens, logScreenColorPipelineReport()
 * records requested-vs-achieved state to the console, to
 * window.__EEcolorPipeline, and (when possible) to the results CSV as
 * `screenColorPipeline`.
 */

import {
  configureColorPipeline,
  getColorPipelineReport,
} from "../psychojs/src/util/ColorPipeline.js";
import { getGlossary } from "../parameters/glossaryRegistry";

const safeGetGlossary = () => {
  try {
    return getGlossary();
  } catch (e) {
    return undefined;
  }
};

// Read an experiment-wide parameter via paramReader. The glossary-membership
// guard protects experiments served with a stale glossary that predates
// these parameters (paramReader.read throws on unknown names); such runs
// simply fall back to the pipeline-off defaults. [0] of an __ALL_BLOCKS__
// read is the first condition's value — correct for experiment-wide
// parameters, and paramReader supplies the glossary default when the
// spreadsheet leaves the column unset.
const readGlobalParam = (paramReader, name) => {
  const glossary = safeGetGlossary();
  if (!glossary || !paramReader || !(name in glossary)) return undefined;
  const value = paramReader.read(name, "__ALL_BLOCKS__");
  return Array.isArray(value) ? value[0] : value;
};

const parseBoolLike = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
  }
  return undefined;
};

const parseColorSpace = (value) =>
  value === "display-p3" || value === "srgb" ? value : undefined;

const urlParam = (name) => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.has(name) ? params.get(name) : undefined;
  } catch (e) {
    return undefined;
  }
};

const urlHas = (name) => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.has(name) || params.has(name.toLowerCase());
  } catch (e) {
    return false;
  }
};

// URL overrides for the pipeline switches exist for the instrumentation
// workflows only (e2e tests, manual probing/photometry). colorPipelineProbe
// and colorPipelineLog themselves remain URL parameters — see
// components/colorPipelineProbe.js.
const instrumentationActive = () =>
  urlHas("colorPipelineProbe") || urlHas("colorPipelineLog");

/**
 * The in-app ColorCAL test page (components/colorPipelineTestPage.js) is
 * requested by the experiment-wide parameter _screenColorCheckBool
 * (or its URL twin, for development against experiments compiled before the
 * glossary gains the parameter). When requested, the color probe installs
 * without any URL parameter, and the _screen* URL overrides are honored so
 * the tester can re-run the same compiled experiment in every pipeline
 * configuration (e.g. the dither-off control).
 */
export const colorPipelineTestRequested = (paramReader) => {
  const fromUrl = urlParam("_screenColorCheckBool");
  if (typeof fromUrl !== "undefined")
    return fromUrl === "" || parseBoolLike(fromUrl) === true;
  return (
    parseBoolLike(readGlobalParam(paramReader, "_screenColorCheckBool")) ===
    true
  );
};

/**
 * Resolve one experiment-wide _screen* parameter: the spreadsheet value via
 * paramReader (glossary-guarded), with a URL override honored only under
 * instrumentation / the in-app test page (see instrumentationActive /
 * colorPipelineTestRequested above).
 */
const resolveScreenParam = (paramReader, name, parser) => {
  const overridesAllowed =
    instrumentationActive() || colorPipelineTestRequested(paramReader);
  if (overridesAllowed) {
    const fromUrl = urlParam(name);
    if (typeof fromUrl !== "undefined") {
      const parsed = parser(fromUrl);
      if (typeof parsed !== "undefined") {
        console.warn(
          `[EasyEyes color pipeline] ${name} = ${fromUrl} from URL override (instrumentation mode)`,
        );
        return parsed;
      }
      console.warn(
        `[EasyEyes color pipeline] ignoring invalid URL override ${name} = ${fromUrl}`,
      );
    }
  }
  const raw = readGlobalParam(paramReader, name);
  const parsed = parser(raw);
  if (typeof parsed === "undefined" && typeof raw !== "undefined" && raw !== "")
    console.warn(
      `[EasyEyes color pipeline] ignoring invalid ${name} value:`,
      raw,
    );
  return parsed;
};

export const configureScreenColorPipeline = (paramReader) => {
  configureColorPipeline({
    colorSpace: resolveScreenParam(
      paramReader,
      "_screenColorSpace",
      parseColorSpace,
    ),
    float16Bool: resolveScreenParam(
      paramReader,
      "_screenFloat16Bool",
      parseBoolLike,
    ),
    ditherBool: resolveScreenParam(
      paramReader,
      "_screenDitherBool",
      parseBoolLike,
    ),
  });
};

// _screenMeasurePrecision values, normalized to the glossary's canonical
// spellings. Tolerant of the singular/plural slip (the spec text used both
// "test2Digit" and "test2Digits"); a real experiment can't reach runtime
// with an off-list value anyway, since the compiler validates against the
// glossary's categories.
const parseMeasurePrecision = (value) => {
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase().replace(/s$/, "");
  if (v === "assume8bit") return "assume8Bit";
  if (v === "test1digit") return "test1Digit";
  if (v === "test2digit") return "test2Digits";
  return undefined;
};

/**
 * _screenMeasurePrecision (default assume8Bit) controls measurement of the
 * display's luminance precision: assume 8 bits, or run the perceptual
 * digit-copying test (components/displayPrecisionTest.js) with one
 * (test1Digit) or two (test2Digits) digits per precision. Resolved like the
 * other _screen* parameters: spreadsheet value (glossary-guarded, so
 * experiments served with an older glossary fall back to the default), URL
 * override only under instrumentation / the in-app test page.
 */
export const resolveScreenMeasurePrecision = (paramReader) =>
  resolveScreenParam(
    paramReader,
    "_screenMeasurePrecision",
    parseMeasurePrecision,
  ) ?? "assume8Bit";

export const logScreenColorPipelineReport = (psychoJS) => {
  const report = getColorPipelineReport();
  console.info("[EasyEyes color pipeline]", report);
  try {
    window.__EEcolorPipeline = report;
  } catch (e) {
    // non-browser context; ignore
  }
  try {
    // Lands in the current results row when the ExperimentHandler exists;
    // silently skipped otherwise (report remains on window/console).
    psychoJS.experiment.addData("screenColorPipeline", JSON.stringify(report));
  } catch (e) {
    // experiment not started yet; ignore
  }
  return report;
};
