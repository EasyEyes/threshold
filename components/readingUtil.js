export const readingTaskFields = [
  "readingCorpusURL",
  "readingDefineSingleLineSpacingAs",
  "readingFont",
  "readingFontSource",
  "readingFontStyle",
  "readingLinesPerPage",
  "readingMaxCharactersPerLine",
  "readingMultipleOfSingleLineSpacing",
  "readingNominalSizeDeg",
  "readingNumberOfPossibleAnswers",
  "readingNumberOfQuestions",
  "readingPages",
  "readingSetSizeBy",
  "readingSingleLineSpacingDeg",
  "readingSpacingDeg",
  "readingXHeightDeg",
];

/*
  returns list of pages to be displayed on each page. each page entry contains a list of strings
*/
export const getPageData = async (readingTaskInfo) => {
  const completeText = await readBookText(readingTaskInfo.readingCorpusURL);
  let curVal, localOffset;

  // break text into lines: readingMaxCharactersPerLine characters per line
  const lineList = [];
  curVal = "";
  localOffset = 0;
  for (let i = 0; i < completeText.length; i++) {
    // TODO? handle punctuations/word-breaks
    curVal += completeText[i];
    localOffset += 1;
    if (localOffset == readingTaskInfo.readingMaxCharactersPerLine) {
      lineList.push(curVal);
      curVal = "";
      localOffset = 0;
    }
  }
  if (localOffset > 0) lineList.push(curVal);

  // paginate lines: readingLinesPerPage lines per page
  const pageList = [];
  curVal = [];
  localOffset = 0;
  for (let i = 0; i < lineList.length; i++) {
    curVal.push(lineList[i]);
    localOffset += 1;
    if (localOffset == readingTaskInfo.readingLinesPerPage) {
      pageList.push(curVal);
      curVal = [];
      localOffset = 0;
    }
  }
  if (localOffset > 0) pageList.push(curVal);

  // limit pages: readingPages total pages
  return pageList.slice(0, readingTaskInfo.readingPages);
};

/*
  returns downloaded text data from given url
*/
export const readBookText = async (url) => {
  const response = await axios.get(url);
  return response.data;
};
