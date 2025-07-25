/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-prototype-builtins */
// Initialize dataframe-js module
import { DataFrame } from "dataframe-js";
import { GLOSSARY } from "../parameters/glossary";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { doesFileNameContainIgnoreDirectory } from "./folderStructureCheck";

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

  let folderAndTargetKindObjectList = [];

  // targetKind:Sound and targetTask:Detect needs masker and target folders
  if (maskedfolderList.length > 0 && targetfolderList.length > 0) {
    for (let i = 0; i < maskedfolderList.length; i++) {
      if (
        // targetKindList[i] === "vocoderPhrase" ||
        targetKindList[i] === "sound"
      ) {
        folderAndTargetKindObjectList.push({
          maskerSoundFolder: maskedfolderList[i],
          targetSoundFolder: targetfolderList[i],
          targetTask: targetTaskList[i],
          targetKind: targetKindList[i],
        });
      }
    }
  } else if (targetfolderList.length > 0) {
    for (let i = 0; i < targetfolderList.length; i++) {
      if (
        targetKindList[i] === "vocoderPhrase" ||
        targetKindList[i] === "sound"
      ) {
        folderAndTargetKindObjectList.push({
          targetSoundFolder: targetfolderList[i],
          targetTask: targetTaskList[i],
          targetKind: targetKindList[i],
        });
      }
    }
  }

  //targetKind:Sound and targetTask:Identify needs target folder

  //remove duplicates
  maskedfolderList = [...new Set(maskedfolderList)];
  targetfolderList = [...new Set(targetfolderList)];

  //remove empty strings from the lists
  maskedfolderList = maskedfolderList.filter((item: string) => item !== "");
  targetfolderList = targetfolderList.filter((item: string) => item !== "");

  // let folderList: string[] = maskedfolderList.concat(targetfolderList);
  // folderList = folderList.filter(
  //   (item, pos) => folderList.indexOf(item) === pos
  // );
  // folderList = folderList.map((x) => x + ".zip");
  // return folderList;
  return {
    maskerSoundFolder: maskedfolderList,
    targetSoundFolder: targetfolderList,
    folderAndTargetKindObjectList: folderAndTargetKindObjectList,
  };
};

export const getImageFolderNames = (parsed: any): any => {
  //targetImageFolder
  let targetImageFolderList: string[] = [];
  let targetImageReplacementBoolList: string[] = [];
  let conditionTrialList: string[] = [];
  let conditionEnabledBoolList: string[] = [];
  for (let i = 0; i < parsed.data.length; i++) {
    if (parsed.data[i][0] == "targetImageFolder") {
      targetImageFolderList = [...parsed.data[i]];
    } else if (parsed.data[i][0] == "targetImageReplacementBool") {
      targetImageReplacementBoolList = [...parsed.data[i]];
    } else if (parsed.data[i][0] == "conditionTrials") {
      conditionTrialList = [...parsed.data[i]];
    } else if (parsed.data[i][0] == "conditionEnabledBool") {
      conditionEnabledBoolList = [...parsed.data[i]];
    }
  }
  targetImageFolderList.shift();
  targetImageReplacementBoolList.shift();
  conditionTrialList.shift();
  conditionEnabledBoolList.shift();

  const targetImageObjectList: any[] = [];

  for (let i = 0; i < targetImageFolderList.length; i++) {
    //if conditionEnabledBool is "FALSE", skip the trial
    if (conditionEnabledBoolList[i] === "FALSE") {
      continue;
    }
    targetImageObjectList.push({
      targetImageFolder: targetImageFolderList[i],
      targetImageReplacementBool: targetImageReplacementBoolList[i],
      conditionTrials: parseInt(conditionTrialList[i]),
      columnLetter: toColumnName(i + 1),
    });
  }

  //remove duplicates
  targetImageFolderList = [...new Set(targetImageFolderList)];
  targetImageReplacementBoolList = [...new Set(targetImageReplacementBoolList)];

  //remove empty strings
  targetImageFolderList = targetImageFolderList.filter(
    (item: string) => item !== "",
  );
  targetImageReplacementBoolList = targetImageReplacementBoolList.filter(
    (item: string) => item !== "",
  );

  return {
    targetImageObjectList: targetImageObjectList,
    targetImageFolderList: targetImageFolderList,
    targetImageReplacementBoolList: targetImageReplacementBoolList,
  };
};

export const getCodeList = (parsed: any): any => {
  let codeList: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    if (parsed.data[i][0] === "movieComputeJS") {
      codeList = [...parsed.data[i]];
      break;
    }
  }

  codeList.shift(); // remove the first column
  codeList = [...new Set(codeList)]; // remove duplicates
  codeList = codeList.filter((item: string) => item !== ""); // remove empty strings

  return codeList;
};

export const getImageNames = (parsed: any): any => {
  let imageList: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    if (parsed.data[i][0] === "showImage") {
      imageList = [...parsed.data[i]];
      break;
    }
  }

  imageList.shift(); // remove the first column
  imageList = [...new Set(imageList)]; // remove duplicates
  imageList = imageList.filter((item: string) => item !== ""); // remove empty strings

  return imageList;
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
 * Get list of fonts required with given font source and their column locations with block numbers
 * @param {Papa.ParseResult<string[]>} parsed
 * @param {string} fontSource
 * @returns {{fontList: string[], fontColumnMap: Record<string, {columns: string[], blocks: number[]}>}}
 */
export const getFontNameListBySource = (
  parsed: any,
  fontSource: string,
): {
  fontList: string[];
  fontColumnMap: Record<string, { columns: string[]; blocks: number[] }>;
} => {
  const fontList: string[] = [];
  const fontColumnMap: Record<string, { columns: string[]; blocks: number[] }> =
    {};
  let fontRow: string[] = [];
  let fontSourceRow: string[] = [];
  let blockRow: string[] = [];
  let conditionEnabledRow: string[] = [];
  let foundFontSourceRow = false;

  // Find all relevant rows
  for (let i = 0; i < parsed.data.length; i++) {
    if (parsed.data[i][0] == "font") {
      fontRow = parsed.data[i];
    } else if (parsed.data[i][0] == "fontSource") {
      fontSourceRow = parsed.data[i];
      foundFontSourceRow = true;
    } else if (parsed.data[i][0] == "block") {
      blockRow = parsed.data[i];
    } else if (parsed.data[i][0] == "conditionEnabledBool") {
      conditionEnabledRow = parsed.data[i];
    }
  }

  let defaultFont = GLOSSARY["font"].default as string;
  let defaultFontSource = GLOSSARY["fontSource"].default as string;
  const getRowValues = (row: string[], defaultValue: string) =>
    row.map((s, i) => {
      if (i === 0) return "";
      if (s === "" || typeof s === "undefined") return defaultValue;
      return s;
    });
  fontRow = getRowValues(fontRow, defaultFont);
  fontSourceRow = getRowValues(fontSourceRow, defaultFontSource);

  for (let i = 0; i < fontRow.length; i++) {
    // Skip if conditionEnabled is "FALSE" for this column
    if (
      conditionEnabledRow[i] &&
      conditionEnabledRow[i].trim().toUpperCase() === "FALSE"
    ) {
      continue;
    }

    if (fontSourceRow[i].trim() == fontSource) {
      const fontName = fontRow[i];
      if (!fontList.includes(fontName)) {
        fontList.push(fontName);
      }
      // Track column location and block number (skip index 0 which is parameter name)
      if (i > 0) {
        const columnLetter = toColumnName(i + 1);
        const blockNumber = blockRow[i] ? parseInt(blockRow[i]) : 0;

        if (!fontColumnMap[fontName]) {
          fontColumnMap[fontName] = { columns: [], blocks: [] };
        }
        if (!fontColumnMap[fontName].columns.includes(columnLetter)) {
          fontColumnMap[fontName].columns.push(columnLetter);
          fontColumnMap[fontName].blocks.push(blockNumber);
        }
      }
    }
  }

  // do same thing for instructionFont
  let instructionFontRow: string[] = [];
  let instructionFontSourceRow: string[] = [];
  let foundInstructionFontSourceRow = false;

  for (let i = 0; i < parsed.data.length; i++) {
    if (parsed.data[i][0] == "instructionFont") {
      instructionFontRow = parsed.data[i];
    } else if (parsed.data[i][0] == "instructionFontSource") {
      instructionFontSourceRow = parsed.data[i];
      foundInstructionFontSourceRow = true;
    }
  }

  if (!foundInstructionFontSourceRow) {
    let defaultValue = GLOSSARY["instructionFontSource"].default;
    if (Array.isArray(defaultValue)) defaultValue = defaultValue[0];
    for (let i = 0; i < instructionFontRow.length; i++)
      instructionFontSourceRow[i] = defaultValue;
    fontSourceRow[0] = "";
  }

  for (let i = 0; i < instructionFontRow.length; i++) {
    // Skip if conditionEnabled is "FALSE" for this column
    if (
      conditionEnabledRow[i] &&
      conditionEnabledRow[i].trim().toUpperCase() === "FALSE"
    ) {
      continue;
    }

    if (instructionFontSourceRow[i].trim() == fontSource) {
      const fontName = instructionFontRow[i];
      if (!fontList.includes(fontName)) {
        fontList.push(fontName);
      }
      // Track column location and block number (skip index 0 which is parameter name)
      if (i > 0) {
        const columnLetter = toColumnName(i + 1);
        const blockNumber = blockRow[i] ? parseInt(blockRow[i]) : 0;

        if (!fontColumnMap[fontName]) {
          fontColumnMap[fontName] = { columns: [], blocks: [] };
        }
        if (!fontColumnMap[fontName].columns.includes(columnLetter)) {
          fontColumnMap[fontName].columns.push(columnLetter);
          fontColumnMap[fontName].blocks.push(blockNumber);
        }
      }
    }
  }

  return {
    fontList: [...fontList.filter((s) => s.length > 0)],
    fontColumnMap,
  };
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

export const getReadingCorpusFoilsList = (parsed: any): any => {
  const readingCorpusFoilsList = new Set();
  for (const parsedRow of parsed.data) {
    if (parsedRow[0] == "readingCorpusFoils")
      for (const source of parsedRow.slice(1))
        readingCorpusFoilsList.add(source.trim());
  }
  return [...readingCorpusFoilsList].filter((x) => x);
};

/**
 * Return a transposed copy of a 2D table.
 * CREDIT https://stackoverflow.com/questions/17428587/transposing-a-2d-array-in-javascript
 * @param {*[][]} nestedArray A 2D array (array of arrays of primitives)
 * @returns {*[][]} transposed Transposed transformation of nestedArray
 */
export const transpose = (nestedArray: any[]): any => {
  const transposed = nestedArray[0].map((_: any, colIndex: number) =>
    nestedArray.map((row) => row[colIndex]),
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
  targetFileName: string,
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
  let parsedData = parsedContent.data;
  // Lack of a trailing comma was causing problems in some csv's. Pad with empty strings to fix.
  parsedData = padToLongestLength(parsedData);
  // Transpose, to get from Denis's row-major convention to the usual column-major
  const transposed = parsedData[0].map((_: any, colIndex: number) =>
    parsedData.map((row: any) => row[colIndex]),
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
      "Experiment will fail. 'block' parameter not provided. Do not run experiment in this state.",
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
    (row: any, index: number) => block_conditions[index],
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
  if (individuals.length === 2)
    return individuals[0] + " and " + individuals[1];
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

export const limitedEnumerate = (
  individuals: string[],
  lengthLimit: number = 4,
): string => {
  if (individuals.length <= lengthLimit) return verballyEnumerate(individuals);
  return individuals.slice(0, lengthLimit).join(", ") + "...";
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
  paramValue: any,
): any => {
  const columnName = paramName[0] !== "_" ? "_" + paramName : paramName;
  if (df.listColumns().includes(columnName)) return df;
  return df.withColumn(columnName, (_: any, i: number) =>
    i === 0 ? paramValue : "",
  );
};

export const addNewInternalParam = (
  df: any,
  paramName: string,
  paramValue: any,
): any => {
  const columnName = paramName[0] !== "!" ? "!" + paramName : paramName;
  if (df.listColumns().includes(columnName)) return df;
  if (Array.isArray(paramValue))
    return df.withColumn(columnName, (_: any, i: number) => paramValue[i]);
  return df.withColumn(columnName, (_: any, i: number) => paramValue);
};

/**
 * Takes a positive integer and returns the corresponding column name.
 * @SOURCE https://cwestblog.com/2013/09/05/javascript-snippet-convert-number-to-column-name/
 * @param {number} num  The positive integer to convert to a column name.
 * @return {string}  The column name.
 */
export const toColumnName = (num: number): string => {
  for (var ret = "", a = 1, b = 26; (num -= a) >= 0; a = b, b *= 26) {
    const z = (num % b) / a;
    const y = parseInt(z.toString()) + 65;
    ret = String.fromCharCode(y) + ret;
  }
  return ret;
};

/**
 * Given a (zero-indexed) condition index (ie position in an array of all the block_condition values),
 * return the corresponding column name (where the first condition is found in column C of the experiment
 * table, following column A with the parameter name and column B with underscore parameter values).
 * @param conditionN
 * @return {string}
 */
export const conditionIndexToColumnName = (conditionN: number): string => {
  return toColumnName(conditionN + 3);
};

/**
 * Given an array of arrays which may not be of the same length, pad each so that they are.
 * @param arrays {unknown[][]} Array of arrays
 * @param paddingValue {unknown} The value used to pad arrays to length
 * @returns {unknown[][]} Array of arrays, all of equal length
 */
const padToLongestLength = (
  arrays: unknown[][],
  paddingValue = "",
): unknown[][] => {
  const longestLength = Math.max(...arrays.map((array) => array.length));
  const paddedArrays = arrays.map((array) => [
    ...array,
    ...new Array(longestLength - array.length).fill(paddingValue),
  ]);
  return paddedArrays;
};

export const getDateAndTimeString = (date: Date) => {
  // new Date() -> e.g., 2022-6-13_12-34-56
  return date
    .toLocaleString("zh-CN", { hour12: false })
    .replace(/\//g, "-")
    .replace(/:/g, "-")
    .replace(/ /g, "_");
};

/**
 * Predicate function, determine whether given parameter is an underscore (ie experiment-level) parameter
 * @param paramterName
 * @returns {boolean}
 */
export const isUnderscoreParameter = (paramterName: string): boolean => {
  return paramterName[0] === "_";
};

// Return a column as a flat array
export const getColumnValues = (df: any, columnName: string): string[] => {
  return df
    .select(columnName)
    .toArray()
    .map((x: any[]): any => x[0]);
};

// Return a column as a flat array, with unspecified columns filled in with the default
// TODO should this just be the behavior of getColumnValues?
// TODO should this parse the output, ie with ParamReader.parse()?
export const getColumnValuesOrDefaults = (
  df: any,
  columnName: string,
): string[] => {
  const presentParameters: string[] = df.listColumns();
  const rows = df.dim()[0];
  const defaultValue = GLOSSARY[columnName].default as unknown as string;
  if (presentParameters.includes(columnName))
    return getColumnValues(df, columnName).map((x) =>
      typeof x === "undefined" || x === "" ? defaultValue : x,
    );
  return new Array(rows).fill(defaultValue);
};

/**
 * Get set of all elements which aren't contiguous
 * @param a Array of values
 * @returns
 */
export const getNoncontiguousValues = <T>(a: T[]): Set<T> => {
  let previous = a[0];
  const seen = new Set();
  const noncontiguous: Set<T> = new Set();
  for (let i = 0; i < a.length; i++) {
    let current = a[i];
    if (current === "") {
      previous = current;
      continue;
    }
    if (current !== previous && seen.has(current)) noncontiguous.add(current);
    seen.add(current);
    previous = current;
  }
  return noncontiguous;
};
/**
 * Predicate. Does there exists some element in the array which repeats noncontiguously?
 * @param a Array of values
 * @returns {boolean}
 */
export const valuesContiguous = (a: unknown[]): boolean => {
  return getNoncontiguousValues(a).size === 0;
};

/**
 * Predicate. Is the given string the name of a blockShuffleGroups parameter?
 * @param s {string}
 * @returns {boolean}
 */
export const isBlockShuffleGroupingParam = (s: string): boolean => {
  return /blockShuffleGroups\d$/.test(s);
};

/**
 * Gets names of impulse response files from the experiment table
 * @param parsed experiment table from csv or xlsx file
 * @returns {string[]} names of impulse response files
 *
 * Note: Impulse response files must:
 * 1. End with .gainVTime.xlsx or .gainVTime.csv
 * 2. Have two columns named "time" and "amplitude"
 * 3. Start with time 0 in the first row
 * 4. Have values in all rows for both columns
 * 5. Both _calibrateSoundSimulateLoudspeaker and _calibrateSoundSimulateMicrophone
 *    must be provided for sound simulation to work. You can't specify one without the other.
 */
export const getImpulseResponseList = (parsed: any): string[] => {
  const impulseResponseList: string[] = [];

  // Search for parameters that might reference impulse response files
  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const paramName = row[0];

    // Check for parameters that use impulse response files
    if (
      paramName === "_calibrateSoundSimulateLoudspeaker" ||
      paramName === "_calibrateSoundSimulateMicrophone"
    ) {
      // Check columns for file names (skip the first column which is the parameter name)
      for (let j = 1; j < row.length; j++) {
        const cellValue = row[j];
        if (
          cellValue &&
          typeof cellValue === "string" &&
          cellValue.trim() !== ""
        ) {
          // Check if the value has the expected format for impulse response files
          if (cellValue.match(/\.gainVTime\.(xlsx|csv)$/i)) {
            if (!impulseResponseList.includes(cellValue)) {
              impulseResponseList.push(cellValue);
            }
          }
        }
      }
    }
  }

  return impulseResponseList;
};

export const getDesiredSamplingRate = (parsed: any): number => {
  // _calibrateSoundSamplingDesiredHz. return the value in the second column
  const paramName = "_calibrateSoundSamplingDesiredHz";
  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    if (row[0] === paramName) {
      return row[1];
    }
  }
  return 48000;
};
export const parseImpulseResponseFile = async (_file: any) => {
  try {
    const { name, file } = _file;
    const isXlsx = name.toLowerCase().endsWith(".xlsx");

    // Parse the file contents based on file type
    let data: Record<string, any>[] = [];
    const errors: string[] = [];

    if (isXlsx) {
      // Handle XLSX parsing
      // First convert base64 to array buffer
      const base64Content = file;
      const binaryString = window.atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // Parse the XLSX file
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet) as Record<
        string,
        any
      >[];

      // Trim whitespace from headers and values
      data = rawData.map((row) => {
        const trimmedRow: Record<string, any> = {};
        Object.keys(row).forEach((key) => {
          const trimmedKey = key.trim();
          const value = row[key];
          const trimmedValue = typeof value === "string" ? value.trim() : value;
          trimmedRow[trimmedKey] = trimmedValue;
        });
        return trimmedRow;
      });
    } else {
      // Handle CSV parsing
      const base64Content = file;
      const binaryString = window.atob(base64Content);
      const csvText = binaryString;

      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transform: (value) =>
          typeof value === "string" ? value.trim() : value,
        transformHeader: (header) => header.trim(),
      });
      data = parseResult.data as Record<string, any>[];
    }

    // Verify we have the required columns
    if (!data || data.length < 2) {
      errors.push(`File ${name} doesn't contain enough data rows`);
    }

    const firstRow = data[0];
    if (!("time" in firstRow)) {
      errors.push(`File ${name} is missing the 'time' column`);
    }

    if (!("amplitude" in firstRow)) {
      errors.push(`File ${name} is missing the 'amplitude' column`);
    }

    if (errors.length > 0) {
      return { samplingRate: 0, errors: errors };
    }

    const times = data.map((row) => parseFloat(row.time));

    // Check if times are in ascending order
    for (let i = 1; i < times.length; i++) {
      if (times[i] <= times[i - 1]) {
        errors.push("Time values should be in strictly ascending order");
        break;
      }
    }

    const timeSteps = [];
    //take absolute values to account for negative values
    for (let i = 1; i < times.length; i++) {
      timeSteps.push(Math.abs(times[i] - times[i - 1]));
    }

    const avgTimeStep =
      timeSteps.reduce((sum, step) => sum + step, 0) / timeSteps.length;
    const samplingRate = Math.round(1 / avgTimeStep);

    return { samplingRate: Number(samplingRate), errors: errors };
  } catch (error: unknown) {
    console.error("Error parsing impulse response file:", error);
    return { samplingRate: 0, errors: ["Error parsing impulse response file"] };
  }
};

/**
 * Gets names of frequency response files from the experiment table
 * @param parsed experiment table from csv or xlsx file
 * @returns {string[]} names of frequency response files
 *
 * Note: Frequency response files must:
 * 1. End with .gainVFreq.xlsx or .gainVFreq.csv
 * 2. Have two columns named "frequency" and "gain"
 * 3. Have values in all rows for both columns
 */
export const getFrequencyResponseList = (parsed: any): string[] => {
  const frequencyResponseList: string[] = [];

  // Search for parameters that might reference frequency response files
  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const paramName = row[0];

    // Check for parameters that use frequency response files
    if (
      paramName === "_calibrateSoundSimulateLoudspeaker" ||
      paramName === "_calibrateSoundSimulateMicrophone"
    ) {
      // Check columns for file names (skip the first column which is the parameter name)
      for (let j = 1; j < row.length; j++) {
        const cellValue = row[j];
        if (
          cellValue &&
          typeof cellValue === "string" &&
          cellValue.trim() !== ""
        ) {
          // Check if the value has the expected format for frequency response files
          if (cellValue.match(/\.gainVFreq\.(xlsx|csv)$/i)) {
            if (!frequencyResponseList.includes(cellValue)) {
              frequencyResponseList.push(cellValue);
            }
          }
        }
      }
    }
  }

  return frequencyResponseList;
};

/**
 * Parse a frequency response file to extract frequency and gain data
 * @param file The frequency response file to parse
 * @returns An object containing the parsed data, errors if any, and validation results
 */
export const parseFrequencyResponseFile = async (_file: any) => {
  const errors: string[] = [];
  let frequencyData: number[] = [];
  let gainData: number[] = [];

  try {
    const { name, file } = _file;
    const isXlsx = name.toLowerCase().endsWith(".xlsx");

    // Parse the file contents based on file type
    let data: Record<string, any>[] = [];
    const errors: string[] = [];

    if (isXlsx) {
      // Handle XLSX parsing
      // First convert base64 to array buffer
      const base64Content = file;
      const binaryString = window.atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // Parse the XLSX file
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet) as Record<
        string,
        any
      >[];

      // Trim whitespace from headers and values
      data = rawData.map((row) => {
        const trimmedRow: Record<string, any> = {};
        Object.keys(row).forEach((key) => {
          const trimmedKey = key.trim();
          const value = row[key];
          const trimmedValue = typeof value === "string" ? value.trim() : value;
          trimmedRow[trimmedKey] = trimmedValue;
        });
        return trimmedRow;
      });
    } else {
      // Handle CSV parsing
      const base64Content = file;
      const binaryString = window.atob(base64Content);
      const csvText = binaryString;

      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transform: (value) =>
          typeof value === "string" ? value.trim() : value,
        transformHeader: (header) => header.trim(),
      });
      data = parseResult.data as Record<string, any>[];
    }

    // Validate the data structure
    if (!data || data.length === 0) {
      errors.push(`${name} contains no data`);
      return { frequencyData, gainData, errors };
    }
    // Check required columns
    const firstRow = data[0] as Record<string, unknown>;

    if (!("frequency" in firstRow) || !("gain" in firstRow)) {
      errors.push(`${name} must contain columns named "frequency" and "gain"`);
      return { frequencyData, gainData, errors };
    }

    // Extract frequency and gain values
    frequencyData = data.map((row) => parseFloat(String(row.frequency)));
    gainData = data.map((row) => parseFloat(String(row.gain)));

    // Check for invalid values
    const hasInvalidFrequency = frequencyData.some((val) => isNaN(val));
    const hasInvalidGain = gainData.some((val) => isNaN(val));

    if (hasInvalidFrequency) {
      errors.push(`${name} contains invalid frequency values`);
    }

    if (hasInvalidGain) {
      errors.push(`${name} contains invalid gain values`);
    }

    // Check if frequencies are in ascending order
    for (let i = 1; i < frequencyData.length; i++) {
      if (frequencyData[i] <= frequencyData[i - 1]) {
        errors.push(
          `${name} frequency values should be in strictly ascending order`,
        );
        break;
      }
    }

    return { frequencyData, gainData, errors };
  } catch (error) {
    errors.push(
      `Error parsing ${_file.name}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return { frequencyData, gainData, errors };
  }
};

export const getTargetSoundListList = (
  parsed: any,
): {
  targetSoundList: string;
  targetSoundFolder: string;
  column: string;
  conditionTrials: string;
}[] => {
  const targetSoundData: {
    targetSoundList: string;
    targetSoundFolder: string;
    column: string;
    conditionTrials: string;
  }[] = [];

  let targetSoundListRow: string[] = [];
  let targetSoundFolderRow: string[] = [];
  const targetSoundFolderFiles: any[] = [];
  const targetSoundListFiles: any[] = [];
  let conditionTrialsRow: string[] = [];
  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const paramName = row[0];

    if (paramName === "targetSoundList") {
      targetSoundListRow = [...row];
    } else if (paramName === "targetSoundFolder") {
      targetSoundFolderRow = [...row];
    } else if (paramName === "conditionTrials") {
      conditionTrialsRow = [...row];
    }
  }

  const maxLength = Math.max(
    targetSoundListRow.length,
    targetSoundFolderRow.length,
    conditionTrialsRow.length,
  );

  for (let j = 1; j < maxLength; j++) {
    const targetSoundListValue = targetSoundListRow[j] || "";
    const targetSoundFolderValue = targetSoundFolderRow[j] || "";
    const conditionTrialsValueDefault = GLOSSARY["conditionTrials"]
      .default as string;
    const conditionTrialsValue =
      conditionTrialsRow[j] || conditionTrialsValueDefault;

    if (
      targetSoundListValue &&
      targetSoundListValue.trim() !== "" &&
      targetSoundFolderValue &&
      targetSoundFolderValue.trim() !== ""
    ) {
      targetSoundData.push({
        targetSoundList: targetSoundListValue
          ? targetSoundListValue.trim()
          : "",
        targetSoundFolder: targetSoundFolderValue
          ? targetSoundFolderValue.trim()
          : "",
        conditionTrials: conditionTrialsValue,
        column: toColumnName(j + 1),
      });
    }
  }

  return targetSoundData;
};

export const parseTargetSoundListFile = async (
  _file: any,
  targetSoundFolder: any,
  column: string,
  conditionTrials: string,
) => {
  /**
   *  targetSoundList (default empty) is assigned the filename of a spreadsheet (saved in EasyEyesResources). The spreadsheet is a title row (Left, Right), followed by an ordered list of sounds, one row per trial, first column for left ear and second column for right ear.
   *  Each element is the name of a sound in targetSoundFolder.
   */

  //number of rows (without the header) must match conditionTrials

  const errors: string[] = [];
  let targetSoundList: { left: string; right: string }[] = [];

  try {
    const { name, file } = _file;
    const isXlsx = name.toLowerCase().endsWith(".xlsx");
    let data: Record<string, any>[] = [];
    if (isXlsx) {
      // Handle XLSX parsing
      // First convert base64 to array buffer
      const base64Content = file;
      const binaryString = window.atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // Parse the XLSX file
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        // header: 1,
        defval: "",
      }) as Record<string, any>[];

      // Trim whitespace from headers and values
      data = rawData.map((row) => {
        const trimmedRow: Record<string, any> = {};
        Object.keys(row).forEach((key) => {
          const trimmedKey = key.trim();
          const value = row[key];
          const trimmedValue = typeof value === "string" ? value.trim() : value;
          trimmedRow[trimmedKey] = trimmedValue;
        });
        return trimmedRow;
      });
    } else {
      // Handle CSV parsing
      const base64Content = file;
      const binaryString = window.atob(base64Content);
      const csvText = binaryString;

      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transform: (value) =>
          typeof value === "string" ? value.trim() : value,
        transformHeader: (header) => header.trim(),
      });
      data = parseResult.data as Record<string, any>[];
    }

    // Validate the data structure
    if (!data || data.length === 0) {
      errors.push(`${name} in column ${column} contains no data`);
      return { targetSoundList, errors };
    }

    // Check required columns
    const firstRow = data[0] as Record<string, string>;
    const firstRowKeys = Object.keys(firstRow);
    if (!firstRowKeys.includes("Left") || !firstRowKeys.includes("Right")) {
      errors.push(
        `${name} in column ${column} must contain columns named "Left" and "Right"`,
      );
      return { targetSoundList, errors };
    }

    const conditionTrialsNumber = parseInt(conditionTrials);
    if (isNaN(conditionTrialsNumber)) {
      errors.push(
        `${name} in column ${column} must have a valid number of condition trials`,
      );
      return { targetSoundList, errors };
    }
    if (data.length !== conditionTrialsNumber) {
      errors.push(
        `${name} in column ${column} must have ${conditionTrialsNumber} rows, but has ${data.length}`,
      );
      return { targetSoundList, errors };
    }

    // Check if target sounds exist in targetSoundFolder
    const { targetSoundFiles, errors: targetSoundFolderErrors } =
      await parseTargetSoundFolder(targetSoundFolder);
    if (targetSoundFolderErrors.length > 0) {
      errors.push(...targetSoundFolderErrors);
    } else {
      // Check if all target sounds exist in targetSoundFolder
      const offendingTargetSounds: string[] = [];
      for (const row of data) {
        if (row.Left === "Left" || row.Right === "Right") continue;
        if (row.Left && !targetSoundFiles.includes(row.Left)) {
          offendingTargetSounds.push(row.Left);
        }
        if (row.Right && !targetSoundFiles.includes(row.Right)) {
          offendingTargetSounds.push(row.Right);
        }
      }
      if (offendingTargetSounds.length > 0) {
        errors.push(
          `${name} in column ${column} contains the following target sounds that do not exist in targetSoundFolder: ${offendingTargetSounds.join(
            ", ",
          )}`,
        );
      }
    }

    return { targetSoundList, errors };
  } catch (error) {
    errors.push(
      `Error parsing ${_file.name} in column ${column}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return { targetSoundList, errors };
  }
};

export const parseTargetSoundFolder = async (targetSoundFolder: any) => {
  // get every file in targetSoundFolder zip file with the acceptable file extensions

  const errors: string[] = [];
  const acceptedFileExtensions: string[] = [".wav", ".aac"];
  const ignoredDirectories: string[] = ["__MACOSX"];

  const Zip = new JSZip();
  const targetSoundFiles: string[] = [];
  await Zip.loadAsync(targetSoundFolder, { base64: true }).then(async (zip) => {
    const files = Object.keys(zip.files);
    files.forEach((file) => {
      const isFileExtensionCorrect = acceptedFileExtensions.some((extension) =>
        file.endsWith(extension),
      );
      const isDirectory = zip.files[file].dir;
      const isIgnoreDirectory = doesFileNameContainIgnoreDirectory(
        file,
        ignoredDirectories,
      );
      if (isFileExtensionCorrect && !isDirectory && !isIgnoreDirectory) {
        targetSoundFiles.push(file);
      }
    });
  });

  return { targetSoundFiles, errors };
};
