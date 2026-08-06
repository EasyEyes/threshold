/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
/* eslint-disable no-prototype-builtins */
/**
 * @file Validate a Threshold experiment file
 */

import * as XLSX from "xlsx";
import Papa from "papaparse";

import {
  EasyEyesError,
  NO_BLOCK_PARAMETER,
  UNBALANCED_COMMAS,
  INVALID_STARTING_BLOCK,
  NONSEQUENTIAL_BLOCK_VALUE,
  FORM_FILES_MISSING,
  FONT_FILES_MISSING,
  TEXT_FILES_MISSING,
  SOUND_FOLDER_MISSING,
  CODE_FILES_MISSING,
  IMAGE_FILES_MISSING,
  EMPTY_BLOCK_VALUES,
  IMPULSE_RESPONSE_FILES_MISSING,
  IMPULSE_RESPONSE_FILE_INVALID_FORMAT,
  FREQUENCY_RESPONSE_FILES_MISSING,
  FREQUENCY_RESPONSE_FILE_INVALID_FORMAT,
  IMAGE_FOLDER_MISSING,
  TARGET_SOUND_LIST_FILE_INVALID_FORMAT,
  TARGET_SOUND_LIST_FILES_MISSING,
  READING_CORPUS_TOO_SHORT,
  READING_CORPUS_INSUFFICIENT_FOILS,
  FONT_NOT_VARIABLE,
  FONT_AXIS_NOT_FOUND,
  FONT_AXIS_VALUE_OUT_OF_RANGE,
  FONT_WEIGHT_NOT_VARIABLE,
  FONT_WEIGHT_MISSING_WGHT_AXIS,
  FONT_WEIGHT_OUT_OF_RANGE,
  FontAxisInfo,
  AxisValueError,
  PHRASE_FILE_MISSING,
  FONT_FEATURE_ANALYSIS_ERROR,
} from "./errorMessages";
import { parseFontVariableSettings } from "./fontCheck";
import {
  getGlossary,
  getSuperMatchingParams,
} from "../parameters/glossaryRegistry";
import {
  getColumnValues,
  getColumnValuesOrDefaults,
  parseImpulseResponseFile,
  parseFrequencyResponseFile,
  parseTargetSoundListFile,
} from "./utils";
import { parseFontPixiMetricsStringDefault } from "./fontPixiMetricsStringDefault";
import {
  normalizeVariantLigatures,
  variantLigaturesToFeatureEntries,
} from "../components/fontVariantLigatures";
import { analyzeFontFeatureSettings } from "./fontFeatureAnalysis";
import { fetchAdobeFontBytes, fetchGoogleFontBytes } from "./fontFetch";
import { GitLabOAuthClient } from "./auth/gitlabOAuthClient";
import { ExperimentTable } from "./experimentTable";
import { makeError } from "./validateExperimentTable";

import {
  folderStructureCheckImage,
  getImageFiles,
  getTargetSoundListFiles,
} from "./folderStructureCheck";
import { createFontDataCache, type FontDataCache } from "./fontDataCache";
import {
  canonical,
  preprocessCorpusToWordList,
  preprocessRawCorpus,
} from "../components/readingTokenizer";

let zeroIndexed: boolean;

// NOTE add parameters which are represented by comma-separated strings,
//      along with the correct length (ie number of values that the cs string should encode)
const commaSeparatedParamLengths = new Map([
  ["markDot", 7],
  ["markGrid", 7],
  ["markFlies", 10],
  ["fixationOriginXYScreen", 2],
]);

export const validatedCommas = (
  parsed: Papa.ParseResult<string[]>,
): EasyEyesError | undefined => {
  // Map all row-lengths with the rows of that length
  // A correctly formatted experiment would all be off the same length
  const rowLengths: { [key: number]: number[] } = {};
  parsed.data.forEach((row: string[], i: number): void => {
    if (!rowLengths.hasOwnProperty(row.length)) {
      rowLengths[row.length] = [i];
    } else {
      rowLengths[row.length].push(i);
    }
  });
  // All the different row lengths found, sorted most common first.
  const lengthOrdering = Object.keys(rowLengths).sort(
    (a, b) => rowLengths[Number(b)].length - rowLengths[Number(a)].length,
  );
  // There should only be one unique row length, ie every row needs the same number of commas
  if (lengthOrdering.length > 1) {
    const offendingParams: {
      parameter: string;
      length: number;
      correctLength: number;
    }[] = [];
    Object.entries(rowLengths)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([length, _]) => length !== lengthOrdering[0])
      .forEach(([badLength, rowNums]) => {
        const offendingOfThisLength = rowNums.map((i) => {
          return {
            parameter: parsed.data[i][0],
            length: Number(badLength),
            correctLength: Number(lengthOrdering[0]),
          };
        });
        offendingParams.push(...offendingOfThisLength);
      });
    // Create an error message... just alphabetize the offending parameters first
    return UNBALANCED_COMMAS(
      offendingParams.sort((a, b) =>
        a.parameter === b.parameter ? 0 : a.parameter > b.parameter ? 1 : -1,
      ),
    );
  }
};

export const _superMatching = (parameter: string): boolean => {
  for (const superMatchingParameter of getSuperMatchingParams()) {
    const possibleSharedString = superMatchingParameter.replace(/@/g, "");
    if (
      parameter.includes(possibleSharedString) &&
      superMatchingParameter.replace(possibleSharedString, "").length ===
        parameter.replace(possibleSharedString, "").length
    )
      return true;
  }
  return false;
};

export const isBlockPresentAndProper = (df: any): EasyEyesError[] => {
  // Can't do other checks when "block" isn't even present
  const blockPresent: boolean = df.listColumns().includes("block");
  if (!blockPresent) return [NO_BLOCK_PARAMETER];

  // Array of the experiment-provided block values
  const blockValues = getColumnValues(df, "block").slice(1); // Drop the first (ie underscore) column

  // Array to accumulate the errors we encounter; to be returned
  const blockValueErrors: EasyEyesError[] = [];

  // Check the first value
  if (blockValues[0] !== "1") {
    blockValueErrors.push(INVALID_STARTING_BLOCK(blockValues[0]));
  }

  // Check for empty values
  if (blockValues.filter((b, i) => b === "").length) {
    const emptyBlockConditions = blockValues
      .map((b, i) => [b, i])
      .filter((x) => x[0] === "")
      .map((x) => x[1] as unknown as number);
    blockValueErrors.push(EMPTY_BLOCK_VALUES(emptyBlockConditions));
  }

  // Check that each value is sequential
  let previous = Number(blockValues[0]);
  const nonsequentialValues: {
    value: number;
    previous: number;
    index: number;
  }[] = [];
  blockValues.forEach((value: string, i: number) => {
    const current = Number(value);
    if (current < previous || current - previous > 1) {
      nonsequentialValues.push({
        value: current,
        previous: previous,
        index: i,
      });
    }
    previous = current;
  });
  if (nonsequentialValues.length) {
    blockValueErrors.push(
      NONSEQUENTIAL_BLOCK_VALUE(nonsequentialValues, blockValues),
    );
  }
  return blockValueErrors;
};

export const isFormMissing = (
  requestedForm: string,
  existingFormList: string[],
  formType: string,
): EasyEyesError[] => {
  const errorList: EasyEyesError[] = [];
  if (!existingFormList.includes(requestedForm)) {
    errorList.push(FORM_FILES_MISSING(formType, [requestedForm]));
  }

  return errorList;
};

export const isImageMissing = (
  requestedImageList: string[],
  existingImageList: string[],
): EasyEyesError[] => {
  const errorList: EasyEyesError[] = [];
  const missingImageList: string[] = [];
  for (let i = 0; i < requestedImageList.length; i++) {
    if (
      !existingImageList.includes(requestedImageList[i]) &&
      !missingImageList.includes(requestedImageList[i])
    ) {
      missingImageList.push(requestedImageList[i]);
    }
  }
  if (missingImageList.length > 0) {
    errorList.push(IMAGE_FILES_MISSING("showImage", missingImageList));
  }

  return errorList;
};

export const isTextMissing = (
  requestedTextList: string[],
  existingTextList: string[],
  parameter: string = "readingCorpus",
): EasyEyesError[] => {
  const errorList: EasyEyesError[] = [];
  const missingText = new Set();

  for (const requested of requestedTextList) {
    if (!existingTextList.includes(requested)) missingText.add(requested);
  }

  if (missingText.size > 0) {
    errorList.push(
      TEXT_FILES_MISSING(parameter, Array.from(missingText) as string[]),
    );
  }

  return errorList;
};

export const isCodeMissing = (
  requestedCodeList: string[],
  existingCodeList: string[],
): EasyEyesError[] => {
  const errorList: EasyEyesError[] = [];
  const missingCode = new Set();

  for (const requested of requestedCodeList) {
    if (!existingCodeList.includes(requested)) missingCode.add(requested);
  }

  if (missingCode.size > 0) {
    errorList.push(
      CODE_FILES_MISSING("movieComputeJS", Array.from(missingCode) as string[]),
    );
  }

  return errorList;
};

export const isImageFolderMissing = async (
  imageFoldersObject: any,
  existingFolderList: string[],
  gitlabOAuthClient: GitLabOAuthClient,
  fetchImageFiles?: (folderNamesObjectList: any[]) => Promise<any[]>,
): Promise<EasyEyesError[]> => {
  const errorList: EasyEyesError[] = [];
  const missingFolderList: string[] = [];
  const targetImageFolderList = imageFoldersObject.targetImageFolderList;

  for (let i = 0; i < targetImageFolderList.length; i++) {
    if (!existingFolderList.includes(targetImageFolderList[i] + ".zip")) {
      missingFolderList.push(targetImageFolderList[i]);
      errorList.push(
        IMAGE_FOLDER_MISSING("targetImageFolder", targetImageFolderList[i]),
      );
    }
  }

  if (missingFolderList.length !== targetImageFolderList.length) {
    // available folders: mentioned in imageFoldersObjectList (requested) and not in missingFolderList
    const imageFoldersObjectList = imageFoldersObject.targetImageObjectList;
    const availableFolderList = imageFoldersObjectList.filter(
      (folder: any) =>
        folder.targetImageFolder !== "" &&
        !missingFolderList.includes(folder.targetImageFolder),
    );
    const imageFileObjectList = fetchImageFiles
      ? await fetchImageFiles(availableFolderList)
      : await getImageFiles(availableFolderList, gitlabOAuthClient);
    const errors = await folderStructureCheckImage(imageFileObjectList);
    errorList.push(...errors);
  }

  return errorList;
};

export const isSoundFolderMissing = (
  requestedFolderList: any,
  existingFolderList: string[],
): EasyEyesError[] => {
  const errorList: EasyEyesError[] = [];

  const keys = Object.keys(requestedFolderList);
  const missingFolderList: any[] = [];
  keys.map((key) => {
    requestedFolderList[key].forEach((requestedFolder: any) => {
      if (!existingFolderList.includes(requestedFolder + ".zip")) {
        missingFolderList.push(requestedFolder + ".zip");
      }
    });
    if (missingFolderList.length)
      errorList.push(SOUND_FOLDER_MISSING(key, missingFolderList));
    missingFolderList.splice(0);
  });

  return errorList;
};

export const isFontMissing = (
  requestedFontList: string[],
  existingFontList: string[],
): EasyEyesError[] => {
  const errorList: EasyEyesError[] = [];
  const missingFontList: string[] = [];
  for (let i = 0; i < requestedFontList.length; i++) {
    if (
      !existingFontList.includes(requestedFontList[i]) &&
      !missingFontList.includes(requestedFontList[i])
    ) {
      missingFontList.push(requestedFontList[i]);
    }
  }
  if (missingFontList.length > 0) {
    errorList.push(FONT_FILES_MISSING("font", missingFontList));
  }

  return errorList;
};

export const isPhraseFileMissing = (
  requestedPhraseFile: string,
  existingPhraseFileList: string[],
): EasyEyesError[] => {
  if (!requestedPhraseFile) return [];
  if (existingPhraseFileList.includes(requestedPhraseFile)) return [];
  return [
    PHRASE_FILE_MISSING("_languagePhrasesSpreadsheet", requestedPhraseFile),
  ];
};

interface stringToString {
  [index: string]: string;
}

/**
 * Check that each reading corpus has enough characters for the requested pages.
 * Called at compile time (preprocessor) with corpus content available.
 * Character-based criterion: language-independent (works for Chinese, Japanese, etc.).
 *
 * @param df Parsed experiment table (dataframe)
 * @param corpusContents Map of corpus filename -> text content
 */
export const checkReadingCorpusLength = (
  df: any,
  corpusContents: Record<string, string> = {},
): EasyEyesError[] => {
  const targetKinds = getColumnValuesOrDefaults(df, "targetKind");
  const readingPages = getColumnValuesOrDefaults(df, "readingPages");
  const readingLinesPerPage = getColumnValuesOrDefaults(
    df,
    "readingLinesPerPage",
  );
  const readingLineLength = getColumnValuesOrDefaults(df, "readingLineLength");
  const readingLineLengthUnits = getColumnValuesOrDefaults(
    df,
    "readingLineLengthUnit",
  );
  const readingCorpuses = getColumnValuesOrDefaults(df, "readingCorpus");
  const readingCorpusEndlessBools = getColumnValuesOrDefaults(
    df,
    "readingCorpusEndlessBool",
  );
  const readingFirstFewWordsList = getColumnValuesOrDefaults(
    df,
    "readingFirstFewWords",
  );

  const offendingConditions: {
    condition: number;
    corpusFile: string;
    corpusCharacters: number;
    requestedPages: number;
    lineLength: number;
    linesPerPage: number;
  }[] = [];

  for (let i = 0; i < targetKinds.length; i++) {
    // Only check reading (not rsvpReading, which has its own word management)
    if (targetKinds[i] !== "reading") continue;

    const corpus = readingCorpuses[i]?.trim();
    if (!corpus) continue; // missing corpus is caught elsewhere

    // Skip if corpus loops endlessly — it never runs out
    const endlessBool =
      String(readingCorpusEndlessBools[i])?.toLowerCase() === "true";
    if (endlessBool) continue;

    const content = corpusContents[corpus];
    if (content === undefined) continue; // can't check without content

    // Only applicable when line length is in characters.
    // For deg/pt units, the character budget is unknowable at compile time.
    const lineLengthUnit =
      (readingLineLengthUnits[i] as string)?.trim()?.toLowerCase() ||
      "character";
    if (lineLengthUnit !== "character") continue;

    // Count non-whitespace characters in the corpus.
    // This is language-independent (no word-length assumptions).
    const totalCharacters = content.replace(/\s/g, "").length;

    // If readingFirstFewWords is set, the corpus starts after that phrase,
    // so some characters are skipped. Account for the worst case (earliest occurrence).
    let availableCharacters = totalCharacters;
    const firstFewWords = (readingFirstFewWordsList[i] as string)?.trim();
    if (firstFewWords) {
      const splitIdx = content.indexOf(firstFewWords);
      if (splitIdx >= 0) {
        const skippedCharacters = content
          .substring(0, splitIdx)
          .replace(/\s/g, "").length;
        availableCharacters = totalCharacters - skippedCharacters;
      }
    }

    const pages = Number(readingPages[i]) || 1;
    const linesPerPage = Number(readingLinesPerPage[i]) || 1;
    const lineLength = Number(readingLineLength[i]) || 1;

    // Character-based estimate: characters needed ≈ lineLength × linesPerPage × pages
    // Allow the last page to be incomplete: subtract 0.9 pages worth of characters
    const charactersPerPage = lineLength * linesPerPage;
    const charactersNeeded = charactersPerPage * (pages - 0.9);

    if (availableCharacters < charactersNeeded) {
      offendingConditions.push({
        condition: i,
        corpusFile: corpus,
        corpusCharacters: availableCharacters,
        requestedPages: pages,
        lineLength,
        linesPerPage,
      });
    }
  }

  if (offendingConditions.length === 0) return [];
  return offendingConditions.map((c) => READING_CORPUS_TOO_SHORT(c));
};

/**
 * Unique canonical words (2+ letters) in the text — the foil-eligible pool.
 * Uses the runtime tokenizers so compile-time counts match the experiment.
 */
const uniqueFoilEligibleWords = (text: string): Set<string> => {
  const words = preprocessCorpusToWordList(preprocessRawCorpus(text));
  return new Set(words.filter((w) => w.length >= 2).map((w) => canonical(w)));
};

/**
 * Check that each reading corpus can supply enough unique foil words for the
 * requested comprehension questions. Without this check, an under-supplied
 * corpus crashes MID-STUDY ("Failed to construct a new question. [not enough
 * foils]", thrown by prepareReadingQuestions after the reading).
 *
 * Foil rules (components/reading.ts): foils are unique canonical words of 2+
 * letters, distinct across questions, that were NOT displayed in the passage
 * (glossary: foils "were not in that passage") and are not correct answers.
 * So: supply = uniqueWords − max(displayedWords, numberOfQuestions), and we
 * need supply ≥ numberOfQuestions × (numberOfPossibleAnswers − 1).
 *
 * Displayed words are estimated as the unique words in the first
 * readingPages × readingLinesPerPage × readingLineLength characters (only
 * knowable when readingLineLengthUnit is "character"; otherwise we count
 * only the Q answer words as unavailable, which can never false-alarm).
 *
 * Not modeled (safe direction — can only miss errors, never false-alarm):
 * conditions with readingCorpusEndlessBool skip cumulative tightening (the
 * looping corpus makes overlap between past and current displayed words
 * unknowable), rsvpReading blocks' own target/foil consumption is not
 * counted toward later reading conditions, and shuffled corpora use the
 * same first-N-chars estimate.
 *
 * Cumulative model (readingCorpusFoilsExclude): the runtime past-target/foil
 * sets are GLOBAL (not per-corpus) and each block consumes exactly Q targets
 * + Q×(A−1) foils — randomness picks WHICH words, never HOW MANY, so counts
 * are deterministic. Same-corpus past targets are re-displayed in later
 * conditions (the corpus cursor is per-condition) hence already excluded,
 * UNLESS the corpus was shuffled; cross-corpus past targets always consume.
 *
 * @param df Parsed experiment table (dataframe)
 * @param corpusContents Map of corpus filename -> text content
 */
export const checkReadingFoils = (
  df: any,
  corpusContents: Record<string, string> = {},
): EasyEyesError[] => {
  const targetKinds = getColumnValuesOrDefaults(df, "targetKind");
  const readingCorpuses = getColumnValuesOrDefaults(df, "readingCorpus");
  const numberOfQuestions = getColumnValuesOrDefaults(
    df,
    "readingNumberOfQuestions",
  );
  const numberOfAnswers = getColumnValuesOrDefaults(
    df,
    "readingNumberOfPossibleAnswers",
  );
  const readingPages = getColumnValuesOrDefaults(df, "readingPages");
  const readingLinesPerPage = getColumnValuesOrDefaults(
    df,
    "readingLinesPerPage",
  );
  const readingLineLength = getColumnValuesOrDefaults(df, "readingLineLength");
  const readingLineLengthUnits = getColumnValuesOrDefaults(
    df,
    "readingLineLengthUnit",
  );
  const readingFirstFewWordsList = getColumnValuesOrDefaults(
    df,
    "readingFirstFewWords",
  );
  const foilsExcludes = getColumnValuesOrDefaults(
    df,
    "readingCorpusFoilsExclude",
  );
  const shuffleBools = getColumnValuesOrDefaults(
    df,
    "readingCorpusShuffleBool",
  );
  const endlessBools = getColumnValuesOrDefaults(
    df,
    "readingCorpusEndlessBool",
  );
  const blockOrder = getColumnValuesOrDefaults(df, "block");

  const offendingConditions: {
    condition: number;
    corpusFile: string;
    uniqueWords: number;
    unavailableWords: number;
    foilsNeeded: number;
    numberOfQuestions: number;
    numberOfAnswers: number;
    cumulativeExclusions: number;
  }[] = [];

  // Reading conditions execute in block order; each consumes exactly Q targets
  // + Q×(A−1) foils into the GLOBAL past-sets, constraining later conditions
  // whose readingCorpusFoilsExclude is pastTargets/pastTargetsAndFoils.
  // Randomness picks WHICH words, never HOW MANY, so counts are deterministic.
  // A past word only consumes from THIS condition if it lands in this pool,
  // so consumption is min(count, pool∩pool) — never a flat cross-corpus
  // subtraction (would false-alarm on multi-language experiments).
  const readingOrder = targetKinds
    .map((_: any, i: number) => i)
    .filter((i: number) => targetKinds[i] === "reading")
    .sort(
      (a: number, b: number) =>
        (Number(blockOrder[a]) || 0) - (Number(blockOrder[b]) || 0) || a - b,
    );
  const consumed: {
    corpus: string;
    shuffled: boolean;
    targetCount: number;
    targetPool: Set<string>; // estimated displayed words (targets ⊂ these)
    foilCount: number;
    foilPool: Set<string>; // estimated eligible non-displayed words
  }[] = [];

  const intersectionSize = (a: Set<string>, b: Set<string>): number => {
    let n = 0;
    for (const w of a) if (b.has(w)) n++;
    return n;
  };

  for (const i of readingOrder) {
    const corpus = readingCorpuses[i]?.trim();
    if (!corpus) continue; // missing corpus is caught elsewhere

    const content = corpusContents[corpus];
    if (content === undefined) continue; // can't check without content

    const Q = Number(numberOfQuestions[i]) || 0;
    const A = Number(numberOfAnswers[i]) || 0;
    if (Q <= 0 || A <= 1) continue; // no foils needed

    const foilsNeeded = Q * (A - 1);
    const eligibleSet = uniqueFoilEligibleWords(content);
    const uniqueWords = eligibleSet.size;
    const shuffled = String(shuffleBools[i])?.trim()?.toLowerCase() === "true";
    const endless = String(endlessBools[i])?.trim()?.toLowerCase() === "true";

    // Estimate displayed (hence foil-ineligible) words from the page budget
    // (only knowable when readingLineLengthUnit is "character").
    const lineLengthUnit =
      (readingLineLengthUnits[i] as string)?.trim()?.toLowerCase() ||
      "character";
    let startIdx = 0;
    const firstFewWords = (readingFirstFewWordsList[i] as string)?.trim();
    if (firstFewWords) {
      // The corpus starts after that phrase (see checkReadingCorpusLength)
      const splitIdx = content.indexOf(firstFewWords);
      if (splitIdx >= 0) startIdx = splitIdx;
    }
    const charactersDisplayed =
      (Number(readingPages[i]) || 1) *
      (Number(readingLinesPerPage[i]) || 1) *
      (Number(readingLineLength[i]) || 1);
    const displayedSet =
      lineLengthUnit === "character"
        ? uniqueFoilEligibleWords(
            content.substring(startIdx, startIdx + charactersDisplayed),
          )
        : new Set<string>();
    const displayedWords = displayedSet.size;

    // Answers are drawn from displayed words, so at least Q words are lost.
    let unavailableWords = Math.max(displayedWords, Q);

    // Cumulative consumption via readingCorpusFoilsExclude (skipped for
    // endlessBool: looping makes overlap unknowable — stay lenient).
    let cumulativeExclusions = 0;
    const exclude = (foilsExcludes[i] as string)?.trim() || "none";
    const foilPoolJ = new Set(
      [...eligibleSet].filter((w) => !displayedSet.has(w)),
    );
    if (
      !endless &&
      (exclude === "pastTargets" || exclude === "pastTargetsAndFoils")
    ) {
      for (const c of consumed) {
        // Shuffled corpora display a random sample, defeating the pool
        // estimate — fall back to the flat worst case.
        if (c.shuffled || shuffled) {
          if (c.corpus !== corpus || c.shuffled)
            cumulativeExclusions += c.targetCount;
          continue;
        }
        // Same corpus: past targets are re-displayed (per-condition cursor
        // restarts the corpus) → empty intersection naturally.
        cumulativeExclusions += Math.min(
          c.targetCount,
          intersectionSize(c.targetPool, foilPoolJ),
        );
      }
    }
    if (!endless && exclude === "pastTargetsAndFoils")
      for (const c of consumed)
        cumulativeExclusions += Math.min(
          c.foilCount,
          intersectionSize(c.foilPool, foilPoolJ),
        );
    unavailableWords += cumulativeExclusions;

    if (uniqueWords - unavailableWords < foilsNeeded) {
      offendingConditions.push({
        condition: i,
        corpusFile: corpus,
        uniqueWords,
        unavailableWords,
        foilsNeeded,
        numberOfQuestions: Q,
        numberOfAnswers: A,
        cumulativeExclusions,
      });
    }

    // This block's own consumption constrains later conditions regardless of
    // its own exclude setting (the runtime sets are global).
    consumed.push({
      corpus,
      shuffled,
      targetCount: Q,
      targetPool: displayedSet,
      foilCount: foilsNeeded,
      foilPool: foilPoolJ,
    });
  }

  return offendingConditions.map((c) => READING_CORPUS_INSUFFICIENT_FOILS(c));
};

export const getResponseTypedEasyEyesKeypadBool = (df: any): boolean[] => {
  const viewingDistanceDesiredCm = getColumnValuesOrDefaults(
    df,
    "viewingDistanceDesiredCm",
  );
  const needKeypadBeyondCm = getColumnValuesOrDefaults(
    df,
    "needKeypadBeyondCm",
  );
  const needKeypad = viewingDistanceDesiredCm.map(
    (v, i) => Number(v) > Number(needKeypadBeyondCm[i]),
  );
  return needKeypad;
};

export const isImpulseResponseMissing = (
  requestedImpulseResponseList: string[],
  existingImpulseResponseList: string[],
  parameter: string,
): EasyEyesError[] => {
  const errors: EasyEyesError[] = [];
  const missingFileNames: string[] = [];

  if (requestedImpulseResponseList.length === 0) {
    return errors;
  }

  for (const requestedFile of requestedImpulseResponseList) {
    // Check if the filename has the correct suffix .gainVTime.xlsx or .gainVTime.csv
    if (!requestedFile.match(/\.gainVTime\.(xlsx|csv)$/i)) {
      errors.push(
        IMPULSE_RESPONSE_FILE_INVALID_FORMAT(
          requestedFile,
          "Filename must end with .gainVTime.xlsx or .gainVTime.csv",
        ),
      );
      continue;
    }

    if (
      !existingImpulseResponseList.some(
        (existingFile) =>
          existingFile.toLowerCase() === requestedFile.toLowerCase(),
      )
    ) {
      missingFileNames.push(requestedFile);
    }
  }

  if (missingFileNames.length > 0) {
    errors.push(IMPULSE_RESPONSE_FILES_MISSING(parameter, missingFileNames));
  }

  return errors;
};

export const validateImpulseResponseFile = async (
  file: any,
  desiredSamplingRate: number = 48000,
): Promise<EasyEyesError | null> => {
  try {
    // Parse the impulse response file to get sampling rate and validate format
    const result = await parseImpulseResponseFile(file);
    const samplingRate = result.samplingRate;
    const errors = result.errors;
    if (errors.length > 0) {
      return makeError({
        name: "Impulse response file validation error",
        message: errors.join("\n"),
        hint: "Please check the impulse response file format and try again.",
        parameters: ["_calibrateSoundSamplingDesiredHz"],
      });
    }
    // Check if sampling rate matches the desired rate
    if (desiredSamplingRate) {
      const fileSamplingRate = samplingRate;

      // Allow for small rounding differences (within 1%)
      const tolerance = 0.01 * desiredSamplingRate;
      const lowerBound = desiredSamplingRate - tolerance;
      const upperBound = desiredSamplingRate + tolerance;

      if (fileSamplingRate < lowerBound || fileSamplingRate > upperBound) {
        return makeError({
          name: "Sampling rate mismatch",
          message: `The impulse response file ${file.name} has a sampling rate of ${fileSamplingRate} Hz, but _calibrateSoundSamplingDesiredHz specifies ${desiredSamplingRate} Hz.`,
          hint: "Please provide a file with the correct sampling rate or adjust the _calibrateSoundSamplingDesiredHz parameter.",
          parameters: ["_calibrateSoundSamplingDesiredHz"],
        });
      }
    }

    return null;
  } catch (error: unknown) {
    // If there was an error parsing the file, return a format error
    return IMPULSE_RESPONSE_FILE_INVALID_FORMAT(
      file.name,
      `Failed to parse file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

/**
 * Checks that if one of the sound simulation parameters is used, both are provided
 * Sound simulation requires both loudspeaker and microphone impulse responses
 */

export const isFrequencyResponseMissing = (
  requestedFrequencyResponseList: string[],
  existingFrequencyResponseList: string[],
  parameter: string,
): EasyEyesError[] => {
  const errors: EasyEyesError[] = [];
  const missingFileNames: string[] = [];

  if (requestedFrequencyResponseList.length === 0) {
    return errors;
  }

  for (const requestedFile of requestedFrequencyResponseList) {
    // Check if the filename has the correct suffix .gainVFreq.xlsx or .gainVFreq.csv
    if (!requestedFile.match(/\.gainVFreq\.(xlsx|csv)$/i)) {
      errors.push(
        FREQUENCY_RESPONSE_FILE_INVALID_FORMAT(
          requestedFile,
          "Filename must end with .gainVFreq.xlsx or .gainVFreq.csv",
        ),
      );
      continue;
    }

    if (
      !existingFrequencyResponseList.some(
        (existingFile) =>
          existingFile.toLowerCase() === requestedFile.toLowerCase(),
      )
    ) {
      missingFileNames.push(requestedFile);
    }
  }

  if (missingFileNames.length > 0) {
    errors.push(FREQUENCY_RESPONSE_FILES_MISSING(parameter, missingFileNames));
  }

  return errors;
};

export const validateFrequencyResponseFile = async (
  file: any,
): Promise<EasyEyesError | null> => {
  try {
    // Parse the frequency response file to validate format
    const result = await parseFrequencyResponseFile(file);
    const errors = result.errors;
    if (errors.length > 0) {
      return makeError({
        name: "Frequency response file validation error",
        message: errors.join("\n"),
        hint: "Please check the frequency response file format and try again.",
        parameters: [
          "_calibrateSoundSimulateLoudspeaker",
          "_calibrateSoundSimulateMicrophone",
        ],
      });
    }

    return null;
  } catch (error: unknown) {
    // If there was an error parsing the file, return a format error
    return FREQUENCY_RESPONSE_FILE_INVALID_FORMAT(
      file.name,
      `Failed to parse file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

export const isTargetSoundListMissing = async (
  requestedTargetSoundListList: {
    targetSoundList: string;
    column: string;
    targetSoundFolder: string;
    conditionTrials: string;
  }[],
  existingTargetSoundListList: string[],
  parameter: string,
  targetSoundFoldersFiles: any,
  gitlabOAuthClient: GitLabOAuthClient,
  fetchTargetSoundListFiles?: (names: string[]) => Promise<any[]>,
): Promise<EasyEyesError[]> => {
  const errors: EasyEyesError[] = [];
  const missingFileNames: string[] = [];
  const missingColumns: string[] = [];
  if (requestedTargetSoundListList.length === 0) {
    return errors;
  }

  for (const requestedFile of requestedTargetSoundListList) {
    // Check if the filename has the correct suffix .targetSoundList.xlsx or .targetSoundList.csv
    if (
      !requestedFile.targetSoundList.match(/\.targetSoundList\.(xlsx|csv)$/i)
    ) {
      errors.push(
        TARGET_SOUND_LIST_FILE_INVALID_FORMAT(
          requestedFile.targetSoundList,
          "Filename must end with .targetSoundList.xlsx or .targetSoundList.csv",
        ),
      );
      continue;
    }

    if (
      !existingTargetSoundListList.some(
        (existingFile) =>
          existingFile.toLowerCase() ===
          requestedFile.targetSoundList.toLowerCase(),
      )
    ) {
      missingFileNames.push(requestedFile.targetSoundList);
      missingColumns.push(requestedFile.column);
    }
  }

  if (missingFileNames.length > 0) {
    errors.push(
      TARGET_SOUND_LIST_FILES_MISSING(
        parameter,
        missingFileNames,
        missingColumns,
      ),
    );
  } else {
    try {
      const targetSoundFolders = targetSoundFoldersFiles.filter(
        (file: any) => file.parameter === "targetSoundFolder",
      );
      const targetSoundListFiles = fetchTargetSoundListFiles
        ? await fetchTargetSoundListFiles(
            requestedTargetSoundListList.map(
              (item: any) => item.targetSoundList,
            ),
          )
        : await getTargetSoundListFiles(
            requestedTargetSoundListList.map(
              (item: any) => item.targetSoundList,
            ),
            gitlabOAuthClient,
          );

      for (const requestedTargetSoundList of requestedTargetSoundListList) {
        const { targetSoundList, errors: targetSoundListErrors } =
          await parseTargetSoundListFile(
            targetSoundListFiles.find(
              (file: any) =>
                file.name === requestedTargetSoundList.targetSoundList,
            ),
            targetSoundFolders.find(
              (file: any) =>
                file.name.name === requestedTargetSoundList.targetSoundFolder,
            ).file,
            requestedTargetSoundList.column,
            requestedTargetSoundList.conditionTrials,
          );
        if (targetSoundListErrors.length > 0) {
          errors.push(
            makeError({
              name: "Target sound list file validation error",
              message: targetSoundListErrors.join("\n"),
              hint: "Please check the target sound list file format and try again.",
              parameters: [parameter],
            }),
          );
        }
      }
    } catch (error: unknown) {
      errors.push(
        makeError({
          name: "Target sound list file validation error",
          message: `Failed to parse file`,
          hint: "Please check the target sound list file format and try again.",
          parameters: [parameter],
        }),
      );
    }
  }
  return errors;
};

/**
 * Check that fontWeight and fontVariableSettings "wght" are not both used in the same condition.
 * @param df - The experiment dataframe
 * @returns Array of errors for conditions with conflicting settings
 */

// Blackout detection samples pixels for pure black; on a black screen every
// trial would false-positive as a blackout. Only letter/repeatedLetters run
// the runtime check. Missing targetKind is treated as letter (the default).

import { initEasyEyesWasm } from "./wasmFontLoader";

/**
 * Validate fontVariableSettings and fontWeight for file-based fonts.
 * Checks:
 * 1. Font is a variable font (has fvar table)
 * 2. Requested axes exist in the font
 * 3. Requested axis values are within allowed ranges
 * 4. For fontWeight: font has "wght" axis and value is in range
 *
 * @param df - The experiment dataframe
 * @param space - The execution space ("web" or "node")
 * @param fontDirectory - Optional path to local fonts directory (required for "node" space)
 * @returns Array of errors for invalid font variable settings
 */
export const validateVariableFontSettings = async (
  df: any,
  space: string = "web",
  fontDirectory?: string,
  gitlabOAuthClient?: GitLabOAuthClient,
  fontCache?: FontDataCache,
): Promise<EasyEyesError[]> => {
  const errors: EasyEyesError[] = [];
  const presentParameters: string[] = df.listColumns();

  const hasFontVariableSettings = presentParameters.includes(
    "fontVariableSettings",
  );
  const hasFontWeight = presentParameters.includes("fontWeight");

  // Check if either fontVariableSettings or fontWeight is present
  if (!hasFontVariableSettings && !hasFontWeight) {
    return [];
  }

  const fontNames = getColumnValuesOrDefaults(df, "font");
  const fontSources = getColumnValuesOrDefaults(df, "fontSource");
  const variableSettings = hasFontVariableSettings
    ? getColumnValuesOrDefaults(df, "fontVariableSettings")
    : [];
  const fontWeights = hasFontWeight
    ? getColumnValuesOrDefaults(df, "fontWeight")
    : [];

  // Collect conditions using fontVariableSettings with fontSource="file"
  interface FontCondition {
    fontName: string;
    settings: string;
    parsedSettings: { axis: string; value: number }[];
    conditionIndex: number;
  }

  // Collect conditions using fontWeight with fontSource="file"
  interface FontWeightCondition {
    fontName: string;
    weight: number;
    conditionIndex: number;
  }

  const fontConditions: FontCondition[] = [];
  const fontWeightConditions: FontWeightCondition[] = [];
  const fontSourceByFont = new Map<string, string>();

  for (let i = 0; i < fontNames.length; i++) {
    const source =
      fontSources[i] || getGlossary()["fontSource"]?.default || "file";
    // Validate file and adobe fonts. Google variable settings are validated
    // separately (css2 API in fontCheck.ts); browser/typeSquare aren't
    // bakeable, so there's nothing to check.
    if (source !== "file" && source !== "adobe") continue;
    fontSourceByFont.set(fontNames[i], source);

    // Collect fontVariableSettings conditions
    const settings = variableSettings[i];
    if (settings && settings.trim() !== "") {
      fontConditions.push({
        fontName: fontNames[i],
        settings: settings,
        parsedSettings: parseFontVariableSettings(settings),
        conditionIndex: i,
      });
    }

    // Collect fontWeight conditions
    const weight = fontWeights[i];
    if (weight !== "" && weight !== undefined && !isNaN(Number(weight))) {
      fontWeightConditions.push({
        fontName: fontNames[i],
        weight: Number(weight),
        conditionIndex: i,
      });
    }
  }

  if (fontConditions.length === 0 && fontWeightConditions.length === 0) {
    return [];
  }

  // Group conditions by font name
  const conditionsByFont = new Map<string, FontCondition[]>();
  for (const condition of fontConditions) {
    const existing = conditionsByFont.get(condition.fontName) || [];
    existing.push(condition);
    conditionsByFont.set(condition.fontName, existing);
  }

  // Group fontWeight conditions by font name
  const weightConditionsByFont = new Map<string, FontWeightCondition[]>();
  for (const condition of fontWeightConditions) {
    const existing = weightConditionsByFont.get(condition.fontName) || [];
    existing.push(condition);
    weightConditionsByFont.set(condition.fontName, existing);
  }

  // Try to load WASM module
  const wasm = await initEasyEyesWasm();
  if (!wasm) {
    // WASM not available, skip font introspection checks
    // The fontWeight/wght conflict check still works
    return [];
  }

  // Get unique font names to fetch (from both fontVariableSettings and fontWeight)
  const uniqueFontNames = Array.from(
    new Set([...conditionsByFont.keys(), ...weightConditionsByFont.keys()]),
  );

  // Fetch file fonts via the shared repo cache; adobe fonts from github
  // (open-source) / the Typekit kit (paid) via fetchAdobeFontBytes.
  const cache =
    fontCache ?? createFontDataCache(space, fontDirectory, gitlabOAuthClient);
  const fileFontNames = uniqueFontNames.filter(
    (n) => fontSourceByFont.get(n) === "file",
  );
  const adobeFontNames = uniqueFontNames.filter(
    (n) => fontSourceByFont.get(n) === "adobe",
  );
  const fontFiles = await cache.getFontData(fileFontNames);
  const fontFileMap = new Map(fontFiles.map((f) => [f.name, f.data]));
  for (const name of adobeFontNames) {
    const bytes = await fetchAdobeFontBytes(name);
    if (bytes) fontFileMap.set(name, bytes.buffer as ArrayBuffer);
  }

  // Validate each font
  for (const fontName of uniqueFontNames) {
    const fontData = fontFileMap.get(fontName);
    if (!fontData) {
      // Font file not found - this is handled by isFontMissing check
      continue;
    }

    try {
      // Call WASM to get font axes info
      const axesJsonStr = wasm.get_font_variable_axes(new Uint8Array(fontData));
      const axesInfo = JSON.parse(axesJsonStr);

      const conditions = conditionsByFont.get(fontName) || [];
      const weightConditions = weightConditionsByFont.get(fontName) || [];

      if (!axesInfo.isVariable) {
        // Font is not variable but fontVariableSettings was specified
        if (conditions.length > 0) {
          const offendingConditions = conditions.map((c) => c.conditionIndex);
          errors.push(FONT_NOT_VARIABLE(fontName, offendingConditions));
        }
        // Font is not variable but fontWeight was specified
        if (weightConditions.length > 0) {
          const offendingConditions = weightConditions.map(
            (c) => c.conditionIndex,
          );
          errors.push(FONT_WEIGHT_NOT_VARIABLE(fontName, offendingConditions));
        }
        continue;
      }

      // Build map of available axes
      const availableAxes = new Map<string, FontAxisInfo>();
      for (const axis of axesInfo.axes) {
        availableAxes.set(axis.tag.toLowerCase(), axis);
      }

      // Validate fontVariableSettings conditions
      if (conditions.length > 0) {
        // Check each condition for missing axes and out-of-range values
        const missingAxesByCondition = new Map<number, string[]>();
        const outOfRangeByCondition = new Map<number, AxisValueError[]>();

        for (const condition of conditions) {
          const missingAxes: string[] = [];
          const outOfRange: AxisValueError[] = [];

          for (const { axis, value } of condition.parsedSettings) {
            const axisLower = axis.toLowerCase();
            const axisInfo = availableAxes.get(axisLower);

            if (!axisInfo) {
              missingAxes.push(axis);
            } else if (value < axisInfo.min || value > axisInfo.max) {
              outOfRange.push({
                axis,
                value,
                min: axisInfo.min,
                max: axisInfo.max,
                default: axisInfo.default,
              });
            }
          }

          if (missingAxes.length > 0) {
            missingAxesByCondition.set(condition.conditionIndex, missingAxes);
          }
          if (outOfRange.length > 0) {
            outOfRangeByCondition.set(condition.conditionIndex, outOfRange);
          }
        }

        // Group missing axes errors - all conditions missing same axes get one error
        if (missingAxesByCondition.size > 0) {
          // Get all unique missing axes
          const allMissingAxes = new Set<string>();
          for (const axes of missingAxesByCondition.values()) {
            axes.forEach((a) => allMissingAxes.add(a));
          }
          const allConditions = Array.from(missingAxesByCondition.keys());
          errors.push(
            FONT_AXIS_NOT_FOUND(
              fontName,
              Array.from(allMissingAxes),
              Array.from(availableAxes.values()),
              allConditions,
            ),
          );
        }

        // Group out-of-range errors
        if (outOfRangeByCondition.size > 0) {
          // Combine all axis errors
          const allAxisErrors: AxisValueError[] = [];
          for (const axisErrors of outOfRangeByCondition.values()) {
            for (const err of axisErrors) {
              // Avoid duplicates
              if (
                !allAxisErrors.some(
                  (e) =>
                    e.axis === err.axis &&
                    e.value === err.value &&
                    e.min === err.min &&
                    e.max === err.max,
                )
              ) {
                allAxisErrors.push(err);
              }
            }
          }
          const allConditions = Array.from(outOfRangeByCondition.keys());
          errors.push(
            FONT_AXIS_VALUE_OUT_OF_RANGE(
              fontName,
              allAxisErrors,
              Array.from(availableAxes.values()),
              allConditions,
            ),
          );
        }
      }

      // Validate fontWeight conditions
      if (weightConditions.length > 0) {
        const wghtAxis = availableAxes.get("wght");

        if (!wghtAxis) {
          // Font doesn't have wght axis but fontWeight was specified
          const offendingConditions = weightConditions.map(
            (c) => c.conditionIndex,
          );
          errors.push(
            FONT_WEIGHT_MISSING_WGHT_AXIS(
              fontName,
              Array.from(availableAxes.values()),
              offendingConditions,
            ),
          );
        } else {
          // Check each fontWeight value is in range
          const outOfRangeConditions: number[] = [];
          let outOfRangeValue: number | null = null;

          for (const condition of weightConditions) {
            if (
              condition.weight < wghtAxis.min ||
              condition.weight > wghtAxis.max
            ) {
              outOfRangeConditions.push(condition.conditionIndex);
              if (outOfRangeValue === null) {
                outOfRangeValue = condition.weight;
              }
            }
          }

          if (outOfRangeConditions.length > 0 && outOfRangeValue !== null) {
            errors.push(
              FONT_WEIGHT_OUT_OF_RANGE(
                fontName,
                outOfRangeValue,
                wghtAxis.min,
                wghtAxis.max,
                wghtAxis.default,
                outOfRangeConditions,
              ),
            );
          }
        }
      }
    } catch (error) {
      console.error(`Error validating font ${fontName}:`, error);
      // Don't add error for parse failures - the font may just not be uploaded yet
    }
  }

  return errors;
};

// ============================================================================
// ExperimentTable-based validators
// ============================================================================

/** Run all validation checks against an ExperimentTable. Pure — no mutation. */

// -- fontFeatureSettings font-compatibility analysis (compile-time) --
// For fontSource=file, parse the font binary and check that each requested
// feature actually exists in the font's GSUB/GPOS tables. Catches no-ops
// (feature not in font, empty lookups) and degraded behavior (Type 3 alternate).
export const validateFontFeatureAnalysis = async (
  df: any,
  space: string = "web",
  fontDirectory?: string,
  gitlabOAuthClient?: GitLabOAuthClient,
  fontCache?: FontDataCache,
): Promise<EasyEyesError[]> => {
  const presentParameters: string[] = df.listColumns();
  const hasFeatures = presentParameters.includes("fontFeatureSettings");
  const hasSets = presentParameters.includes("fontStylisticSets");
  const hasLigatures = presentParameters.includes("fontVariantLigatures");
  if (!hasFeatures && !hasSets && !hasLigatures) return [];

  const featureSettings = hasFeatures
    ? getColumnValuesOrDefaults(df, "fontFeatureSettings")
    : [];
  // fontStylisticSets (ss01…) are GSUB features too — validate them against
  // the font with the same analysis, since an absent ss feature silently
  // no-ops exactly like an absent fontFeatureSettings tag.
  const stylisticSets = hasSets
    ? getColumnValuesOrDefaults(df, "fontStylisticSets")
    : [];
  // fontVariantLigatures keywords are translated to GSUB tags (same bake).
  // The unit of intent is the KEYWORD, so an error is raised only when
  // NONE of a keyword's enabled tags exist in the font (e.g. Plex lacks
  // clig but has liga, so common-ligatures still works — CSS behaves the
  // same in browsers). DISABLE entries (value 0, from no-*/none) are
  // skipped — disabling a feature the font lacks is harmless.
  const variantLigatures = hasLigatures
    ? getColumnValuesOrDefaults(df, "fontVariantLigatures")
    : [];
  const fontNames = getColumnValuesOrDefaults(df, "font");
  const fontSources = getColumnValuesOrDefaults(df, "fontSource");
  const rowCount = Math.max(
    featureSettings.length,
    stylisticSets.length,
    variantLigatures.length,
  );

  const conditionsByFont = new Map<
    string,
    {
      block: number;
      settings: string;
      ligatureRaw: string;
      source: string;
    }[]
  >();
  for (let i = 0; i < rowCount; i++) {
    // Combine both feature-bearing params into one settings string; each tag
    // is validated independently downstream.
    const settings = [featureSettings[i], stylisticSets[i]]
      .map((s) => (s ?? "").trim())
      .filter((s) => s.length > 0)
      .join(", ");
    const ligatureRaw = variantLigatures[i] ?? "";
    if (!settings && !normalizeVariantLigatures(ligatureRaw).length) continue;
    const source =
      fontSources[i] || getGlossary()["fontSource"]?.default || "file";
    // Only the bakeable sources can be feature-checked. file fonts come from
    // the repo's fonts/ dir (via fontCache); google and open-source adobe
    // fonts are fetched full from github. browser / typeSquare can't be
    // baked, so there's nothing to validate.
    if (source !== "file" && source !== "google" && source !== "adobe")
      continue;
    const fontName = fontNames[i];
    if (!fontName) continue;
    if (!conditionsByFont.has(fontName)) conditionsByFont.set(fontName, []);
    conditionsByFont.get(fontName)!.push({
      block: i + 1,
      settings,
      ligatureRaw,
      source,
    });
  }
  if (conditionsByFont.size === 0) return [];

  // Fetch only the FILE fonts via the shared repo cache (google/adobe fonts
  // aren't in the fonts/ dir — they're fetched from github below).
  const fileFontNames = Array.from(conditionsByFont.keys()).filter((name) =>
    conditionsByFont.get(name)!.some((c) => c.source === "file"),
  );
  const cache =
    fontCache ?? createFontDataCache(space, fontDirectory, gitlabOAuthClient);
  const fontFiles = await cache.getFontData(fileFontNames);
  const fontFileMap = new Map(fontFiles.map((f) => [f.name, f.data]));

  const warnings: {
    tag: string;
    block: number;
    kind: string;
    fontName: string;
    param: string;
    keyword: string;
  }[] = [];
  for (const [fontName, conditions] of conditionsByFont) {
    const source = conditions[0].source;
    let fontData: Uint8Array | null = null;
    if (source === "file") {
      const d = fontFileMap.get(fontName);
      fontData = d ? new Uint8Array(d) : null;
    } else if (source === "google") {
      fontData = await fetchGoogleFontBytes(fontName);
    } else if (source === "adobe") {
      // github-first (open-source), Typekit-kit fallback (paid). Paid fonts
      // use the kit processTypekitFonts already published this compile.
      fontData = await fetchAdobeFontBytes(fontName);
    }
    if (!fontData) continue;
    for (const { block, settings, ligatureRaw } of conditions) {
      for (const w of analyzeFontFeatureSettings(fontData, settings)) {
        warnings.push({
          tag: w.tag,
          block,
          kind: w.kind,
          fontName,
          param: "fontFeatureSettings",
          keyword: "",
        });
      }
      // Per keyword: error only when EVERY enabled tag is ineffective.
      for (const keyword of normalizeVariantLigatures(ligatureRaw)) {
        const entries = variantLigaturesToFeatureEntries(keyword).filter(
          ([, value]) => value === 1,
        );
        if (!entries.length) continue;
        const keywordSettings = entries
          .map(([tag, value]) => `"${tag}" ${value}`)
          .join(", ");
        const keywordWarnings = analyzeFontFeatureSettings(
          fontData,
          keywordSettings,
        );
        if (keywordWarnings.length !== entries.length) continue;
        for (const w of keywordWarnings) {
          warnings.push({
            tag: w.tag,
            block,
            kind: w.kind,
            fontName,
            param: "fontVariantLigatures",
            keyword,
          });
        }
      }
    }
  }
  return warnings.length ? [FONT_FEATURE_ANALYSIS_ERROR(warnings)] : [];
};
