import WebFont from "webfontloader";
import { isBlockLabel, toFixedNumber } from "./utils";
import { font, status, targetKind, typekit, skipTrialOrBlock } from "./global";
import { paramReader } from "../threshold";
import { getGlossary } from "../parameters/glossaryRegistry";
import { setPunctuationRTL } from "../psychojs/src/visual/punctuationRTL.js";
import {
  combineVariableSettingsWithWeight,
  getProcessedFontName,
  getFailedFontNames,
  bakeAllFonts,
  registerAdobeFontsFromGithubMirror,
} from "./fontInstancing.js";
import { readFontDirection, fontDirectionToDirAttr } from "./fontDirection.js";
import { readFontTextRendering } from "./fontTextRendering.js";

export const loadFonts = async (reader, fontList) => {
  const fileFonts = [];
  const webFonts = [];
  const googleFonts = [];
  const typekitFonts = [];

  for (let condition of reader.conditions) {
    const conditionName = condition.block_condition;
    // if (reader.has("font"))
    _loadNameFromSource(
      reader,
      fontList,
      "font",
      "fontSource",
      conditionName,
      fileFonts,
      webFonts,
      googleFonts,
      typekitFonts,
    );

    // if (reader.has("instructionFont"))
    _loadNameFromSource(
      reader,
      fontList,
      "instructionFont",
      "instructionFontSource",
      conditionName,
      fileFonts,
      webFonts,
      googleFonts,
      typekitFonts,
    );
  }

  if (googleFonts.length) {
    WebFont.load({
      google: {
        families: googleFonts,
      },
      timeout: 3000,
    });
  }

  if (doesExperimentUseSource("adobe") && typekitFonts.length) {
    await fetch("typekit.json")
      .then((response) => {
        if (!response?.ok) throw new Error("typekit.json not found");
        return response.json();
      })
      .then((result) => {
        if (result && result.kitId) {
          typekit.kitId = result.kitId;
        }
        if (result && result.fonts) {
          typekit.fonts = new Map(Object.entries(result.fonts));
        }
        return undefined;
      })
      .catch((error) => {
        return undefined;
      });
    if (typekit.kitId) {
      // const link = document.createElement("link");
      // link.rel = "stylesheet";
      // link.href = `https://use.typekit.net/${typekit.kitId}.css`;
      // document.head.appendChild(link);
      WebFont.load({
        typekit: {
          id: typekit.kitId,
        },
      });
    } else {
      // Dev fallback: no typekit.json (experiment not compiled with an
      // Adobe kit). Register the RAW fonts from the github.com/adobe-fonts
      // open-source mirror so no-settings adobe control blocks render with
      // the right font in local dev. Production is unaffected (typekit.json
      // exists → WebFont.load above runs instead). Blocks WITH settings
      // still get their baked FontFace from bakeAllFonts below.
      await registerAdobeFontsFromGithubMirror(typekitFonts);
    }
  }

  addFontFaces(fontList);

  // Eager pre-bake: fetch every (font, settings) tuple from every
  // condition, bake with WASM, register every FontFace BEFORE trial 1, so
  // the experiment runs end-to-end even if internet cuts out after the
  // asset-load phase. Failed fonts go into a "skipped" set consumed by
  // setFontGlobalState (which calls skipTrial() for affected conditions).
  // No silent fallback to sans-serif — conditions are skipped, not degraded.
  try {
    const result = await bakeAllFonts(reader);
    if (result.failed > 0) {
      console.warn(
        `[fonts] eager pre-bake finished with ${result.failed} failed font(s); their conditions will be skipped.`,
      );
    }
  } catch (err) {
    console.error("[fonts] eager pre-bake crashed:", err);
  }
};

const _loadNameFromSource = (
  reader,
  fontList,
  target,
  source,
  conditionName,
  fileFonts,
  webFonts,
  googleFonts,
  typekitFonts,
) => {
  const sourceType = reader.read(source, conditionName);
  const name = reader.read(target, conditionName);
  const conditionEnabledBool = reader.read(
    "conditionEnabledBool",
    conditionName,
  );
  if (!conditionEnabledBool) return;
  if (reader.read("conditionTrials", conditionName) <= 0) return;
  const fontFilePath = "fonts/" + name;
  if (sourceType === "file") {
    if (!fileFonts.includes(name)) {
      fileFonts.push(name);
      fontList[cleanFontName(name)] = fontFilePath;
    }
    // fetch(fontFilePath)
    //   .then((response) => {
    //     // let n = name.split(".")[0];
    //   })
    //   .catch((err) => {
    //     console.error(`Font file ${name} not found.`);
    //   });
  } else if (sourceType === "browser") {
    // Don't need to do ny preloading...
  } else if (sourceType === "server") {
    // ?
  } else if (sourceType === "google") {
    if (!googleFonts.includes(name)) googleFonts.push(name);
  } else if (sourceType === "adobe") {
    if (!typekitFonts.includes(name)) typekitFonts.push(name);
  }
};

// Do we need it? Should be done in preprocessor
// const nameIsValidURL = (name) => {
//   return name.includes("http") && name.includes("woff");
// };

// removing the regex to fix a bug about fonts not being displayed on the experiment page
// https://stackoverflow.com/questions/15230223/css-font-face-not-working-on-chrome
export const cleanFontName = (name) => {
  // removed suffix to resolve an issue using FontFace api in firefox
  return name.replace(/\.[^.]+$/, "");
};

/**
 * Validate that variableSettings is a non-empty string
 * @param {string} variableSettings - The font-variation-settings string
 * @returns {{isValid: boolean, error?: string}} - Validation result
 */
const validateVariableSettingsString = (variableSettings) => {
  if (!variableSettings || typeof variableSettings !== "string") {
    return {
      isValid: false,
      error: "fontVariableSettings must be a non-empty string",
    };
  }
  const trimmed = variableSettings.trim();
  if (trimmed === "") {
    return { isValid: false, error: "fontVariableSettings cannot be empty" };
  }
  return { isValid: true, trimmed };
};

/**
 * Parse variable settings string into axis-value pairs
 * @param {string} trimmed - Trimmed variable settings string
 * @returns {Array<string>} - Array of axis-value pair strings
 */
const parseVariableSettingsParts = (trimmed) => {
  const cleaned = trimmed.replace(/["']/g, "");
  return cleaned
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
};

/**
 * Validate a single axis-value pair
 * @param {string} part - A single axis-value pair (e.g., "wght 625")
 * @returns {{isValid: boolean, error?: string}} - Validation result
 */
const validateAxisValuePair = (part) => {
  const tokens = part.split(/\s+/).filter((t) => t.length > 0);

  if (tokens.length !== 2) {
    return {
      isValid: false,
      error: `Invalid format in "${part}": expected "axis" value or axis value (two tokens)`,
    };
  }

  const axis = tokens[0].trim();
  const value = tokens[1].trim();

  if (axis.length !== 4) {
    return {
      isValid: false,
      error: `Invalid axis tag "${axis}": must be exactly 4 characters`,
    };
  }

  const numValue = parseFloat(value);
  if (isNaN(numValue) || !isFinite(numValue)) {
    return {
      isValid: false,
      error: `Invalid axis value "${value}" for axis "${axis}": must be a number`,
    };
  }

  return { isValid: true };
};

/**
 * Validate font-variation-settings string format
 * Format: "axis1" value1, "axis2" value2, ...
 * @param {string} variableSettings - The font-variation-settings string
 * @returns {{isValid: boolean, error?: string}} - Validation result
 */
export const validateFontVariableSettings = (variableSettings) => {
  const stringValidation = validateVariableSettingsString(variableSettings);
  if (!stringValidation.isValid) {
    return stringValidation;
  }

  const parts = parseVariableSettingsParts(stringValidation.trimmed);
  if (parts.length === 0) {
    return {
      isValid: false,
      error: "fontVariableSettings must contain at least one axis setting",
    };
  }

  for (const part of parts) {
    const validation = validateAxisValuePair(part);
    if (!validation.isValid) {
      return validation;
    }
  }

  return { isValid: true };
};

/**
 * Check if a font is a variable font based on fontVariableSettings parameter
 * A font is considered variable if fontVariableSettings is provided (non-empty string)
 *
 * @param {string} variableSettings - The fontVariableSettings parameter value
 * @returns {boolean} - True if the font should be treated as a variable font
 *
 * @todo In the future, we should:
 * - Introspect the actual font file to validate that the provided axes are supported by the font
 * - Validate that the values provided are within the font's axis ranges (min/max)
 * - This would require loading the font and checking its fvar table
 */
export const isVariableFont = (variableSettings) => {
  if (!variableSettings || typeof variableSettings !== "string") {
    return false;
  }
  return variableSettings.trim().length > 0;
};

/**
 * Add the required file-specified fonts to the document as css font-faces.
 * @param {Object} fontsRequired
 */
export const addFontFaces = (fontsRequired) => {
  for (let name in fontsRequired) {
    addCSSFontFace(name, fontsRequired[name]);
  }
};

/**
 * Given a font name, remove the extension if present
 * eg fontName.woff2 => fontName
 * @param {string} font
 * @returns string
 */
export const getFontFamilyName = (fontStr) => {
  // If it's an instanced font name (contains hyphen and axis values), use as-is
  if (fontStr.includes("-") && /-wght\d+|-opsz\d+|-wdth\d+/.test(fontStr)) {
    return fontStr;
  }
  // Otherwise, strip file extension if present
  if (fontStr.split(".").length === 1) {
    return fontStr;
  }
  return fontStr.split(".")[0];
};

/**
 * SEE https://stackoverflow.com/questions/11355147/font-face-changing-via-javascript
 * @param {string} name
 * @param {string} filename
 */
const addCSSFontFace = (name, filename) => {
  const familyName = getFontFamilyName(name);
  var newStyle = document.createElement("style");
  newStyle.appendChild(
    document.createTextNode(
      "@font-face{font-family: " +
        familyName +
        "; src: url(" +
        filename +
        ");}",
    ),
  );
  document.head.appendChild(newStyle);
};

export const doesExperimentUseSource = (source) => {
  try {
    for (let condition of paramReader.conditions) {
      const BC = condition.block_condition;
      const sourceType = paramReader.read("fontSource", BC);
      if (sourceType === source) return true;
    }
    return false;
  } catch (error) {
    console.log("error when checking if experiment uses source", error);
    return false;
  }
};

export const addFontGeometryToOutputData = (
  characterSetBoundingRect,
  psychoJS,
) => {
  const rounding = 4;
  const boundingBoxString =
    paramReader.read("EasyEyesLettersVersion", status.block_condition) === 2 &&
    targetKind.current === "letter"
      ? characterSetBoundingRect.stimulusRectPerFontSize.toString(
          rounding,
          true,
        )
      : characterSetBoundingRect.toString(rounding, true);

  psychoJS.experiment.addData(
    "fontBoundingBoxReNominalRect",
    boundingBoxString,
  );
  psychoJS.experiment.addData(
    "fontXHeightReNominal",
    String(toFixedNumber(characterSetBoundingRect.xHeight, rounding)),
  );
  psychoJS.experiment.addData(
    "fontSpacingReNominal",
    String(toFixedNumber(characterSetBoundingRect.spacing, rounding)),
  );
  psychoJS.experiment.addData(
    "fontCharacterSetHeightReNominal",
    String(
      toFixedNumber(characterSetBoundingRect.characterSetHeight, rounding),
    ),
  );
};

export const setFontGlobalState = (blockOrCondition, paramReader) => {
  const BC = isBlockLabel(blockOrCondition)
    ? blockOrCondition + "_1"
    : blockOrCondition;
  font.name = paramReader.read("font", BC);
  font.source = paramReader.read("fontSource", BC);
  if (font.source === "file") font.name = cleanFontName(font.name);
  // NOTE: the adobe css_name mapping is DEFERRED until after the baked-name
  // lookup below, which must use the RAW family name (baked FontFaces are
  // registered under raw-family names like "source-serif-pro-smcp").

  // Check for variable font settings OR stylistic sets and use processed font if available
  const variableSettings = paramReader.read("fontVariableSettings", BC) || "";
  const fontWeight = paramReader.read("fontWeight", BC);
  const stylisticSetsRaw = paramReader.read("fontStylisticSets", BC) || "";
  const featureSettings = paramReader.read("fontFeatureSettings", BC) || "";

  // Normalize stylisticSets to comma-separated string (multicategorical may return array)
  const stylisticSets = Array.isArray(stylisticSetsRaw)
    ? stylisticSetsRaw.join(", ")
    : String(stylisticSetsRaw);
  const combinedVariableSettings = combineVariableSettingsWithWeight(
    variableSettings,
    fontWeight,
  );

  const needsProcessedFont =
    (combinedVariableSettings || stylisticSets || featureSettings) &&
    (font.source === "file" ||
      font.source === "google" ||
      font.source === "adobe");

  // Eager pre-bake failure path: skip the block ONLY if it actually needs
  // the baked font (needsProcessedFont) AND its family failed to bake. The
  // scheduler consumes skipBlock at the next trial boundary. Gating on
  // needsProcessedFont matters: a no-settings block renders the RAW font
  // (WebFont.load / addFontFaces) and must NOT be skipped just because a
  // sibling block with the same family failed to bake — that would be a
  // false-positive skip losing a block that has nothing to do with the bake.
  const failedFonts = getFailedFontNames();
  if (needsProcessedFont && failedFonts.has(font.name)) {
    skipTrialOrBlock.skipBlock = true;
    skipTrialOrBlock.blockId = status.block;
  }

  let bakedName = null;
  if (needsProcessedFont) {
    bakedName = getProcessedFontName(
      font.name,
      combinedVariableSettings,
      stylisticSets,
      featureSettings,
    );
    if (bakedName) {
      font.name = bakedName;
    }
  }

  // Adobe raw-font path (no baked FontFace selected above, i.e. control
  // blocks): map the family to the Typekit css_name so the raw font renders
  // via the kit. No-op in dev (no typekit.json → github mirror name used).
  if (!bakedName && font.source === "adobe" && typekit.fonts.has(font.name)) {
    font.name = typekit.fonts.get(font.name);
  }

  font.colorRGBA = paramReader.read("fontColorRGBA", BC);
  font.letterSpacing = paramReader.read("fontTrackingForLetters", BC);
  font.padding = paramReader.read("fontPadding", BC);
  font.direction = readFontDirection(paramReader, BC);
  font.language = paramReader.read("fontLanguage", BC) || "en";
  font.kerning = paramReader.read("fontKerning", BC);
  font.textRendering = readFontTextRendering(paramReader, BC);
  // fontDirection drives the DOM/CSS base direction (HTML `dir`) for the UI
  // layer (Swal dialogs, response grid, AT). The canvas stimuli get their own
  // direction via TextStim.alignHoriz + ctx.direction.
  document.documentElement.dir = fontDirectionToDirAttr(font.direction);
  document.documentElement.lang = font.language;
  // fontTextRendering: apply as an inherited CSS property on <html> so it
  // cascades to DOM text (Swal dialogs, instructions, response grid). The
  // canvas stimulus gets its own value via ctx.textRendering in TextStim.
  // "auto" is the browser default, so a blank param is a no-op.
  document.documentElement.style.textRendering = font.textRendering;
  // fontFeatureSettings: Canvas has no font-feature-settings, so the WASM
  // baker injects the lookups into the font's `calt` feature (see
  // fontInstancing). The baked font's calt is default-on so canvas
  // text shaping applies the injected lookups automatically. We do NOT set
  // the CSS property on <html> — it would cascade to the canvas and
  // potentially override calt.
  font.featureSettings = featureSettings;

  // fontPunctuationRTL: insert a zero-width RTL mark (RLM/ALM) after final
  // ASCII commas/periods so the bidi algorithm places them correctly in
  // Arabic/Urdu/Persian text. Applied centrally in TextStim.getText().
  // Guarded: no-op (and no throw) until the param exists in the deployed
  // glossary; coerces array/scalar returns; setPunctuationRTL normalizes
  // anything non-{RLM,ALM} to "none".
  let punctuationRTL = "none";
  if ("fontPunctuationRTL" in getGlossary()) {
    const raw = paramReader.read("fontPunctuationRTL", BC);
    punctuationRTL = (Array.isArray(raw) ? raw[0] : raw) || "none";
  }
  font.punctuationRTL = punctuationRTL;
  setPunctuationRTL(punctuationRTL);
};
