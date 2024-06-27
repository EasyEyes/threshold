import WebFont from "webfontloader";
import { toFixedNumber } from "./utils";
import { pxToPt } from "./readingAddons";

export const loadFonts = (reader, fontList) => {
  const fileFonts = [];
  const webFonts = [];
  const googleFonts = [];

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
) => {
  const sourceType = reader.read(source, conditionName);
  const name = reader.read(target, conditionName);
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
export const getFontFamilyName = (font) => {
  if (font.split(".").length === 1) return font;
  return font.split(".")[0];
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

export const addFontGeometryToOutputData = (
  characterSetBoundingRect,
  psychoJS,
) => {
  const rounding = 4;
  const boundingBoxString = characterSetBoundingRect.toString(rounding, true);
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
    String(toFixedNumber(characterSetBoundingRect.characterSetHeight)),
  );
};
