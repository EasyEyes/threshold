import WebFont from "webfontloader";

export const loadFonts = (reader, fontList) => {
  console.log("ulala");
  const fileFonts = [];
  const webFonts = [];
  const googleFonts = [];

  for (let condition of reader.conditions) {
    const conditionName = condition.label;
    _loadNameFromSource(
      reader,
      fontList,
      "targetFont",
      "targetFontSource",
      conditionName,
      fileFonts,
      webFonts,
      googleFonts
    );
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
    _loadNameFromSource(
      reader,
      fontList,
      "readingFont",
      "readingFontSource",
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
    if (!fileFonts.includes(name))
      fetch(fontFilePath)
        .then((response) => {
          // let n = name.split(".")[0];
          fileFonts.push(name);
          fontList[name] = fontFilePath;
        })
        .catch((err) => {
          console.error(`Font file ${name} not found.`);
        });
  } else if (sourceType === "browser") {
    // Don't need to do ny preloading...
  } else if (sourceType === "server") {
  } else if (sourceType === "google") {
    if (!googleFonts.includes(name)) googleFonts.push(name);
  }
};

// Do we need it? Should be done in preprocessor
// const nameIsValidURL = (name) => {
//   return name.includes("http") && name.includes("woff");
// };
