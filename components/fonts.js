export const loadFonts = (reader, fontList) => {
  for (let condition of reader.conditions) {
    const conditionName = condition.label;
    const sourceType = reader.read("targetFontSource", conditionName);
    const name = reader.read("targetFont", conditionName);
    const fontFilePath = "fonts/" + name;
    if (sourceType === "file") {
      fetch(fontFilePath)
        .then((response) => {
          let n = name.split(".")[0];
          fontList[n] = fontFilePath;
        })
        .catch((err) => {
          console.error(`Font file ${name} not found.`);
        });
    } else if (sourceType === "browser") {
    } else if (sourceType === "server") {
    }
  }
};
