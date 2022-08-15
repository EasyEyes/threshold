/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-prototype-builtins */
// Initialize dataframe-js module
import { DataFrame } from "dataframe-js";
import { GLOSSARY } from "../parameters/glossary";

/**
 * Get requested consentForm and debriefForm
 * @param {Papa.ParseResult<string[]>} parsed
 * @returns {consentForm: string, debriefForm: string}
 */

export const getFolderNames = (parsed: any): any => {
  let maskedfolderList: string[] = [];
  let targetfolderList: string[] = [];
  let targetTaskList: string[] = [];
  let targetKindList: string[] = [];
  for (let i = 0; i < parsed.data.length; i++) {
    if (parsed.data[i][0] == "maskerSoundFolder") {
      maskedfolderList = [...parsed.data[i]];
    } else if (parsed.data[i][0] == "targetSoundFolder") {
      targetfolderList = [...parsed.data[i]];
    } else if (parsed.data[i][0] == "targetTask") {
      targetTaskList = [...parsed.data[i]];
    } else if (parsed.data[i][0] == "targetKind") {
      targetKindList = [...parsed.data[i]];
    }
  }
  maskedfolderList.shift();
  targetfolderList.shift();
  targetTaskList.shift();
  targetKindList.shift();

  // console.log("targetTaskList", targetTaskList);
  // console.log("targetKindList", targetKindList);
  // console.log("maskedfolderList", maskedfolderList);
  // console.log("targetfolderList", targetfolderList);

  // targetKind:Sound and targetTask:Detect needs masker and target folders

  //targetKind:Sound and targetTask:Identify needs target folder

  //remove duplicates
  maskedfolderList = [...new Set(maskedfolderList)];
  targetfolderList = [...new Set(targetfolderList)];

  //remove empty strings from the lists
  maskedfolderList = maskedfolderList.filter((item: string) => item !== "");
  targetfolderList = targetfolderList.filter((item: string) => item !== "");

  // console.log("maskerFolder",maskedfolderList)
  // console.log("targetFolder",targetfolderList)

  // let folderList: string[] = maskedfolderList.concat(targetfolderList);
  // folderList = folderList.filter(
  //   (item, pos) => folderList.indexOf(item) === pos
  // );
  // folderList = folderList.map((x) => x + ".zip");
  // return folderList;
  return {
    maskerSoundFolder: maskedfolderList,
    targetSoundFolder: targetfolderList,
  };
};

export const getFormNames = (parsed: any): any => {
  let consentFormRow: string[] = [];
  let debriefFormRow: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    if (parsed.data[i][0] == "_consentForm") {
      consentFormRow = parsed.data[i];
    } else if (parsed.data[i][0] == "_debriefForm") {
      debriefFormRow = parsed.data[i];
    }
  }

  const formData: any = {};
  if (consentFormRow[1]) formData["consentForm"] = consentFormRow[1];
  if (debriefFormRow[1]) formData["debriefForm"] = debriefFormRow[1];

  return formData;
};

/**
 * Get list of fonts required with given font source
 * @param {Papa.ParseResult<string[]>} parsed
 * @param {string} fontSource
 * @returns {string[]}
 */
export const getFontNameListBySource = (
  parsed: any,
  fontSource: string
): string[] => {
  const fontList: string[] = [];
  let fontRow: string[] = [];
  let fontSourceRow: string[] = [];
  let foundFontSourceRow = false;

  for (let i = 0; i < parsed.data.length; i++) {
    if (parsed.data[i][0] == "font") {
      fontRow = parsed.data[i];
    } else if (parsed.data[i][0] == "fontSource") {
      fontSourceRow = parsed.data[i];
      foundFontSourceRow = true;
    }
  }

  // read default value if it is absent
  if (!foundFontSourceRow) {
    let defaultValue = GLOSSARY["fontSource"].default;
    if (Array.isArray(defaultValue)) defaultValue = defaultValue[0];
    for (let i = 0; i < fontRow.length; i++) fontSourceRow[i] = defaultValue;
    fontSourceRow[0] = "";
  }

  for (let i = 0; i < fontRow.length; i++) {
    if (fontSourceRow[i].trim() == fontSource && !fontList.includes(fontRow[i]))
      fontList.push(fontRow[i]);
  }

  return fontList;
};

/**
 *
 * @param { Papa.ParseResult<string[]> } parsed
 * @returns { string[] }
 */
export const getTextList = (parsed: any) => {
  const textList = new Set();
  for (const parsedRow of parsed.data) {
    if (parsedRow[0] == "readingCorpus")
      for (const source of parsedRow.slice(1)) textList.add(source.trim());
  }
  // Ignore empty strings
  return [...textList].filter((x) => x);
};

/**
 * Return a transposed copy of a 2D table.
 * CREDIT https://stackoverflow.com/questions/17428587/transposing-a-2d-array-in-javascript
 * @param {*[][]} nestedArray A 2D array (array of arrays of primitives)
 * @returns {*[][]} transposed Transposed transformation of nestedArray
 */
export const transpose = (nestedArray: any[]): any => {
  const transposed = nestedArray[0].map((_: any, colIndex: number) =>
    nestedArray.map((row) => row[colIndex])
  );
  return transposed;
};

/**
 * Check whether an array of file objects contains one with the name of the value of targetFileName
 * @param {File[]} fileList
 * @param {String} targetFileName
 * @returns {Boolean}
 */
export const fileListContainsFileOfName = (
  fileList: File[],
  targetFileName: string
): any => {
  const isFileOfTargetName = (candidateFile: File) =>
    candidateFile.name == targetFileName;
  return fileList.filter(isFileOfTargetName).length > 0;
};

/**
 * Given the content returned by PapaParse on our csv file, provide a dfjs Dataframe
 * @param {Object} parsedContent .csv file as parsed by PapaParse
 * @returns {dfjs.DataFrame}
 */
export const dataframeFromPapaParsed = (parsedContent: any): any => {
  const parsedData = parsedContent.data;
  // Transpose, to get from Denis's row-major convention to the usual column-major
  const transposed = parsedData[0].map((_: any, colIndex: number) =>
    parsedData.map((row: any) => row[colIndex])
  );

  // Separate out the column names from rows of values
  const data = transposed.slice(1); // Rows
  const columns = transposed[0]; // Header
  // Create and return the DataFrame
  return new DataFrame(data, columns);
};

/**
 * Damerau–Levenshtein of two strings
 * @see https://stackoverflow.com/questions/11919065/sort-an-array-by-the-levenshtein-distance-with-best-performance-in-javascript
 * @author James Westgate (https://stackoverflow.com/users/305319/james-westgate)
 * @param {String} s
 * @param {String} t
 * @returns
 */
export const levDist = (s: any, t: any): any => {
  const d: any = []; //2d matrix

  // Step 1
  const n = s.length;
  const m = t.length;

  if (n == 0) return m;
  if (m == 0) return n;

  //Create an array of arrays in javascript (a descending loop is quicker)
  for (let i = n; i >= 0; i--) d[i] = [];

  // Step 2
  for (let i = n; i >= 0; i--) d[i][0] = i;
  for (let j = m; j >= 0; j--) d[0][j] = j;

  // Step 3
  for (let i: any = 1; i <= n; i++) {
    const s_i = s.charAt(i - 1);

    // Step 4
    for (let j: any = 1; j <= m; j++) {
      //Check the jagged ld total so far
      if (i == j && d[i][j] > 4) return n;

      const t_j = t.charAt(j - 1);
      const cost = s_i == t_j ? 0 : 1; // Step 5

      //Calculate the minimum
      let mi = d[i - 1][j] + 1;
      const b = d[i][j - 1] + 1;
      const c = d[i - 1][j - 1] + cost;

      if (b < mi) mi = b;
      if (c < mi) mi = c;

      d[i][j] = mi; // Step 6

      //Damerau transposition
      if (i > 1 && j > 1 && s_i == t.charAt(j - 2) && s.charAt(i - 2) == t_j) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
      }
    }
  }

  // Step 7
  return d[n][m];
};

export const addUniqueLabelsToDf = (df: any): any => {
  if (!df.listColumns().includes("block")) {
    console.error(
      "Experiment will fail. 'block' parameter not provided. Do not run experiment in this state."
    );
    return df;
  }
  const blocks = df.select("block").toArray();
  const blockCounts: any = {};
  const block_conditions: string[] = [];
  blocks.forEach((nestedBlock: number[]) => {
    const block = nestedBlock[0];
    if (blockCounts.hasOwnProperty(block)) {
      blockCounts[block] += 1;
    } else {
      blockCounts[block] = 1;
    }
    block_conditions.push(String(block) + "_" + String(blockCounts[block]));
  });
  df = df.withColumn(
    "block_condition",
    (row: any, index: number) => block_conditions[index]
  );
  return df;
};

/**
 * @see https://stackoverflow.com/questions/175739/built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
 * @author Dan [https://stackoverflow.com/users/17121/dan]
 * @param str
 * @returns
 */
export const isNumeric = (str: string): boolean => {
  if (typeof str != "string") return false; // we only process strings!
  return (
    !isNaN(str as unknown as number) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
  ); // ...and ensure strings of whitespace fail
};

/**
 * Element-wise check of whether two arrays are equal
 * @see https://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript/16430730
 * @param {any[]} a
 * @param {any[]} b
 * @returns {boolean}
 */
export const arraysEqual = <T>(a: T[], b: T[]): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export const verballyEnumerate = (individuals: string[]): string => {
  if (individuals.length === 1) return individuals[0];
  let enumeratedString = "";
  for (let i = 0; i < individuals.length; i++) {
    if (i !== individuals.length - 1) {
      // Not last individual
      enumeratedString += String(individuals[i]) + ", ";
    } else {
      // Last individual
      enumeratedString += "and " + String(individuals[i]);
    }
  }
  return enumeratedString;
};

export const getNumericalSuffix = (n: number): string => {
  switch (Math.abs(Number(n))) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

/**
 * Robust check for whether a file is a CSV/XLSX file
 * https://developer.mozilla.org/en-US/docs/Web/API/File
 * @param {File} file File object to be checked
 * @returns {Boolean}
 */
export const isExpTableFile = (file: File): boolean => {
  return file.name.includes("xlsx") || file.name.includes("csv");
};

export const addNewUnderscoreParam = (
  df: any,
  paramName: string,
  paramValue: any
): any => {
  const columnName = paramName[0] !== "_" ? "_" + paramName : paramName;
  if (df.listColumns().includes(columnName)) return df;
  return df.withColumn(columnName, (_: any, i: number) =>
    i === 0 ? paramValue : ""
  );
};

/**
 * Return a new dataframe in which, for each parameter starting with an underscore, the first value is copied to every column
 * @param {dfjs.DataFrame} df Dataframe describing the experiment
 * @returns  {dfjs.DataFrame}
 * */
export const populateUnderscoreValues = (df: any): any => {
  // Get all the underscore parameters
  const underscoreParams = df.listColumns().filter((s: string) => s[0] === "_");
  // For each one...
  for (const underscoreParameter of underscoreParams) {
    // Get the first value
    const firstValue = df.select(underscoreParameter).toArray()[0][0];
    // And use it, or a blank string if there isn't a defined first value
    const valueToUse = firstValue ? firstValue : "";
    // Set the corresponding column to be all this value
    df = df.withColumn(underscoreParameter, () => valueToUse);
  }
  // Return the modified df
  return df;
};
