import axios from "axios";

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

const expModeParam = "blockMode";

export const prepareForReading = (reader) => {
  const modes = reader.read(expModeParam, "__ALL_BLOCKS__");

  if (modes.includes("reading")) {
    for (let condition of reader.conditions) {
      const block_condition = condition.block_condition;
      const mode = reader.read(expModeParam, block_condition);
      if (mode === "reading") {
        // Load reading data
      }
    }
    return true;
  }
  return false;
};
