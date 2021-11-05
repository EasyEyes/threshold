import WebFont from "webfontloader";

export const loadFonts = (reader, fontList) => {
  const webFonts = [];
  const googleFonts = [];

  for (let condition of reader.conditions) {
    const conditionName = condition.label;
    const sourceType = reader.read("targetFontSource", conditionName);
    const name = reader.read("targetFont", conditionName);
    const fontFilePath = "fonts/" + name;
    if (sourceType === "file") {
      fetch(fontFilePath)
        .then((response) => {
          // let n = name.split(".")[0];
          fontList[name] = fontFilePath;
        })
        .catch((err) => {
          console.error(`Font file ${name} not found.`);
        });
    } else if (sourceType === "browser") {
      // Don't need to do ny preloading...
    } else if (sourceType === "server") {
    } else if (sourceType === "google") {
      googleFonts.push(name);
    }
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

// Do we need it? Should be done in preprocessor
// const nameIsValidURL = (name) => {
//   return name.includes("http") && name.includes("woff");
// };
