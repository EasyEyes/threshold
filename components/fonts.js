import WebFont from "webfontloader";
import { isBlockLabel, toFixedNumber } from "./utils";
import { font, status, targetKind, typekit } from "./global";
import { paramReader } from "../threshold";
import {
  combineVariableSettingsWithWeight,
  getProcessedFontName,
} from "./variableFontInstances.js";

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
    }
  }

  addFontFaces(fontList);
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
  if (font.source === "adobe") font.name = typekit.fonts.get(font.name);

  // Check for variable font settings OR stylistic sets and use processed font if available
  const variableSettings = paramReader.read("fontVariableSettings", BC) || "";
  const fontWeight = paramReader.read("fontWeight", BC);
  const stylisticSetsRaw = paramReader.read("fontStylisticSets", BC) || "";

  // Normalize stylisticSets to comma-separated string (multicategorical may return array)
  const stylisticSets = Array.isArray(stylisticSetsRaw)
    ? stylisticSetsRaw.join(", ")
    : String(stylisticSetsRaw);
  const combinedVariableSettings = combineVariableSettingsWithWeight(
    variableSettings,
    fontWeight,
  );

  const needsProcessedFont =
    (combinedVariableSettings || stylisticSets) &&
    (font.source === "file" || font.source === "google");

  if (needsProcessedFont) {
    const processedName = getProcessedFontName(
      font.name,
      combinedVariableSettings,
      stylisticSets,
    );
    if (processedName) {
      font.name = processedName;
    }
  }

  font.colorRGBA = paramReader.read("fontColorRGBA", BC);
  font.letterSpacing = paramReader.read("fontTrackingForLetters", BC);
  font.padding = paramReader.read("fontPadding", BC);
  font.ltr = paramReader.read("fontLeftToRightBool", BC);
};
