import WebFont from "webfontloader";

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
      googleFonts
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
      googleFonts
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
};

const _loadNameFromSource = (
  reader,
  fontList,
  target,
  source,
  conditionName,
  fileFonts,
  webFonts,
  googleFonts
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
  return name;
};
