export const loadFonts = (reader, fontList) => {
  for (let condition of reader.conditions) {
    const sourceType = reader.read(
      "targetFontSource",
      condition.conditionName
    )[0];
    const name = reader.read("targetFont", condition.conditionName)[0];
    const fontFilePath = "fonts/" + name;
    if (sourceType === "file") {
      fetch(fontFilePath)
        .then((response) => {
          let n = name.split(".")[0];
          fontList[n] = fontFilePath;
        })
        .catch((err) => {
          console.log("No such font file.");
        });
    } else if (sourceType === "browser") {
    } else if (sourceType === "server") {
    }
  }
};
