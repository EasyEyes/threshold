/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-prototype-builtins */
// Initialize dataframe-js module
import { DataFrame } from "dataframe-js";
import { GLOSSARY } from "../parameters/glossary";
import Papa from "papaparse";
import * as XLSX from "xlsx";

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
    folderAndTargetKindObjectList: folderAndTargetKindObjectList,
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
 * Get list of fonts required with given font source
 * @param {Papa.ParseResult<string[]>} parsed
 * @param {string} fontSource
 * @returns {string[]}
 */
export const getFontNameListBySource = (
  parsed: any,
  fontSource: string,
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
    if (fontSourceRow[i].trim() == fontSource && !fontList.includes(fontRow[i]))
      fontList.push(fontRow[i]);
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
    if (
      instructionFontSourceRow[i].trim() == fontSource &&
      !fontList.includes(instructionFontRow[i])
    )
      fontList.push(instructionFontRow[i]);
  }

  return [...fontList.filter((s) => s.length > 0)];
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
      data = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
    } else {
      // Handle CSV parsing
      const base64Content = file;
      const binaryString = window.atob(base64Content);
      const csvText = binaryString;

      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
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
