/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
/* eslint-disable no-prototype-builtins */
/**
 * @file Validate a Threshold experiment file
 */

import * as XLSX from "xlsx";
import Papa from "papaparse";

import {
  PARAMETERS_NOT_ALPHABETICAL,
  UNRECOGNIZED_PARAMETER,
  NOT_YET_SUPPORTED_PARAMETER,
  DUPLICATE_PARAMETER,
  EasyEyesError,
  INCORRECT_PARAMETER_TYPE,
  ILL_FORMED_UNDERSCORE_PARAM,
  NO_BLOCK_PARAMETER,
  UNBALANCED_COMMAS,
  INVALID_STARTING_BLOCK,
  NONSEQUENTIAL_BLOCK_VALUE,
  NO_RESPONSE_POSSIBLE,
  FORM_FILES_MISSING,
  FONT_FILES_MISSING,
  NONUNIQUE_WITHIN_BLOCK,
  TEXT_FILES_MISSING,
  SOUND_FOLDER_MISSING,
  CODE_FILES_MISSING,
  CONDITION_PARAMETERS_IN_FIRST_COLUMN,
  NONCONTIGUOUS_GROUPING_VALUES,
  NONSUBSET_GROUPING_VALUES,
  CONTRADICTORY_MUTUALLY_EXCLUSIVE_PARAMETERS,
  NEGATIVE_MARKING_FIXATION_STROKE_THICKENING,
  ILLDEFINED_TRACKING_INTERVALS,
  OBSOLETE_PARAMETERS,
  IMPROPER_GLOSSARY_UNRECOGNIZED_TYPE,
  VERNIER_MUST_USE_TARGETOFFSETDEG,
  TARGETOFFSETDEG_MUST_USE_VERNIER,
  INVALID_AUTHOR_EMAIL,
  COMMA_SEPARATED_VALUE_HAS_INCORRECT_LENGTH,
  Offender,
  INVALID_FIXATION_LOCATION,
  IMAGE_FILES_MISSING,
  NO_THRESHOLD_PARAMETER_PROVIDED_FOR_RSVP_READING_TARGET_KIND,
  EMPTY_BLOCK_VALUES,
  FLANKER_TYPES_DONT_MATCH_ECCENTRICITY,
  CORPUS_NOT_SPECIFIED_FOR_READING_TASK,
  INVALID_PARAMETER_VALUE,
  CUSTOM_MESSAGE,
  THRESHOLD_ALLOWED_TRIALS_OVER_REQUESTED_LT_ONE,
  TRACKING_MUST_BE_ON_FOR_MOVING_FIXATION,
  IMPULSE_RESPONSE_FILES_MISSING,
  IMPULSE_RESPONSE_FILE_INVALID_FORMAT,
  IMPULSE_RESPONSE_FILE_NOT_STARTING_AT_ZERO,
  IMPULSE_RESPONSE_MISSING_PAIR,
  QUESTION_AND_ANSWER_MISSING_QUESTION_COLUMN,
  QUESTION_AND_ANSWER_PARAMETERS_NOT_ALLOWED,
  FREQUENCY_RESPONSE_FILES_MISSING,
  FREQUENCY_RESPONSE_FILE_INVALID_FORMAT,
  IMAGE_FOLDER_MISSING,
  IMAGE_FOLDER_NOT_SPECIFIED,
  IMAGE_FOLDER_INVALID_TARGET_TASK,
  SCREEN_SIZE_PARAMETERS_NOT_POSITIVE,
  SCREEN_SIZE_PARAMETER_NEGATIVE,
  TARGET_SOUND_LIST_FILE_INVALID_FORMAT,
  TARGET_SOUND_LIST_FILES_MISSING,
  INVALID_READING_CORPUS_FOILS,
  CALIBRATION_TIMES_CANNOT_BE_ZERO,
  FONT_WEIGHT_AND_WGHT_CONFLICT,
  FONT_NOT_VARIABLE,
  FONT_AXIS_NOT_FOUND,
  FONT_AXIS_VALUE_OUT_OF_RANGE,
  FONT_WEIGHT_NOT_VARIABLE,
  FONT_WEIGHT_MISSING_WGHT_AXIS,
  FONT_WEIGHT_OUT_OF_RANGE,
  FontAxisInfo,
  AxisValueError,
} from "./errorMessages";
import { GLOSSARY, SUPER_MATCHING_PARAMS } from "../parameters/glossary";
import {
  isNumeric,
  levDist,
  arraysEqual,
  getColumnValues,
  getColumnValuesOrDefaults,
  valuesContiguous,
  getNoncontiguousValues,
  isBlockShuffleGroupingParam,
  conditionIndexToColumnName,
  parseImpulseResponseFile,
  parseFrequencyResponseFile,
  parseTargetSoundListFile,
} from "./utils";
import { normalizeExperimentDfShape } from "./transformExperimentTable";
import { getFileTextData } from "./fileUtils";
import {
  folderStructureCheckImage,
  getImageFiles,
  getTargetSoundListFiles,
  getFontFilesForValidation,
  getFontFilesForValidationLocal,
} from "./folderStructureCheck";

// NOTE keep in sync with parser from "../server/prepare-glossary";
const getCategoriesFromString = (str: string) =>
  str
    .split(",")
    .map((s) => s.trim())
    .filter((x) => x);

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

/**
 * Check that the experiment file is correctly structured; provide errors for any problems
 * @param {any} experimentDf dataframe-js dataframe of the experiment file content
 * @returns {Object[]} Array of all errors found with the experiment file
 */
export const validateExperimentDf = (experimentDf: any): EasyEyesError[] => {
  const parametersToCheck: string[] = [];
  const parameters = experimentDf.listColumns().filter((x: any) => x);
  let errors: EasyEyesError[] = [];

  // Check the parameters of the glossary itself
  errors.push(...areGlossaryParametersProper());

  // Check parameters are alphabetical
  const parametersArentAlphabetical = areParametersAlphabetical(parameters);
  if (parametersArentAlphabetical) errors.push(parametersArentAlphabetical);

  // Check validity of parameters
  parametersToCheck.push(...parameters.sort());
  errors.push(...areParametersDuplicated(parametersToCheck));
  errors.push(...areAllPresentParametersRecognized(parametersToCheck));
  errors.push(...areAllPresentParametersCurrentlySupported(parametersToCheck));
  errors.push(...areAuthorizedEmailsValid(experimentDf));
  errors.push(
    ...areCommaSeperatedStringsOfCorrectLength(
      experimentDf,
      commaSeparatedParamLengths,
    ),
  );
  errors.push(...isTrackingOnForMovingFixation(experimentDf));

  // Enforce using Column B for the underscore parameters, and Column C and on for conditions
  errors.unshift(...doConditionsBeginInTheSecondColumn(experimentDf));

  // Check for properly formatted _param values, and populate underscore param values to all columns
  errors.push(...checkUnderscoreParams(experimentDf));

  // Add block_condition labels, populate underscores, drop first column, populate defaults
  experimentDf = normalizeExperimentDfShape(experimentDf);

  // Check types of parameter values
  errors.push(...areParametersOfTheCorrectType(experimentDf));

  // Verify there is at least one response method turned on
  errors.push(...isResponsePossible(experimentDf));

  // Check that relevant parameters have unique values within blocks (ie one value per block)
  const blockShuffleGroupParams = experimentDf
    .listColumns()
    .filter(isBlockShuffleGroupingParam);
  errors.push(
    ...areBlockUniqueValuesConsistent(experimentDf, [
      "viewingDistanceDesiredCm",
      "fixationLocationStrategy",
      "fixationOriginXYScreen",
      "targetKind",
      ...blockShuffleGroupParams,
      "simulateParticipantBool",
      "needKeypadBeyondCm",
    ]),
  );

  // Check that block groupings are contiguous and subsets of outer groups
  errors.push(...areShuffleGroupsContiguous(experimentDf));
  errors.push(...areShuffleGroupsSubsets(experimentDf));

  // Check mutually exclusive parameters. Add additional mutually exclusive groups as arrays of parameters.
  errors.push(
    ...areMutuallyExclusiveParametersNonconflicting(experimentDf, [
      ["responseMustTrackCrosshairBool", "responseMustClickCrosshairBool"],
    ]),
  );

  errors.push(...checkSpecificParameterValues(experimentDf));
  errors.push(...checkVernierUsingCorrectThreshold(experimentDf));
  errors = errors
    .filter((error) => error)
    .sort((errorA, errorB) =>
      errorA.parameters[0] > errorB.parameters[0] ? 1 : -1,
    );
  return errors;
};

/**
 * Checks that the parameters of the experiment file are in alphabetical order
 * @param {String[]} parameters Array of parameters, as given by the experimenter
 * @returns {Object} Error message, if the parameters aren't in alphabetical order
 */
const areParametersAlphabetical = (
  parameters: string[],
): EasyEyesError | undefined => {
  const originalOrder = [...parameters];
  let previousParameter = originalOrder[0];
  for (let i = 1; i < originalOrder.length; i++) {
    if (originalOrder[i].toLowerCase() < previousParameter.toLowerCase()) {
      return PARAMETERS_NOT_ALPHABETICAL(originalOrder[i]);
    }
    previousParameter = originalOrder[i];
  }
};

/**
 * Checks that no parameter appears more than once.
 * @param {String[]} parameters Array of parameters, as given by the experimenter
 * @returns {Object[]} Array of error messages, for any parameter which has a duplicate
 */
const areParametersDuplicated = (parameters: string[]): EasyEyesError[] => {
  const seenParameters = new Set<any>();
  const duplicatesErrors: EasyEyesError[] = [];
  for (const parameter of parameters) {
    // We've seen this parameter before, and haven't yet produced and error
    if (
      seenParameters.has(parameter) &&
      !duplicatesErrors.some((e) => e.parameters.includes(parameter))
    )
      duplicatesErrors.push(DUPLICATE_PARAMETER(parameter));
    seenParameters.add(parameter);
  }

  parameters.splice(0, parameters.length, ...seenParameters);
  return duplicatesErrors;
};

/**
 * Compares the parameters provided to those recognized by Threshold.
 * Returns an error message for each unrecognized parameter present,
 * including recognized parameters which are similar and might have been intended instead.
 * @param {String[]} parameters Array of parameter names, which the experimenter has provided
 * @returns {Object[]} List of error messages for unrecognized parameters
 */
const areAllPresentParametersRecognized = (
  parameters: string[],
): EasyEyesError[] => {
  const unrecognized: any[] = [];
  const recognized: string[] = [];
  const obsolete: any[] = [];

  const checkIfRecognized = (parameter: string): any => {
    if (!(parameter in GLOSSARY) && !_superMatching(parameter)) {
      unrecognized.push({
        name: parameter,
        closest: similarlySpelledCandidates(parameter, Object.keys(GLOSSARY)),
      });
    } else if (
      parameter in GLOSSARY &&
      _superMatching(parameter) &&
      GLOSSARY[parameter]["type"] !== "obsolete"
    ) {
      recognized.push(parameter);
    }
  };

  // parameters if in obsolete list and the new version and do not check for recongnized.

  parameters.forEach((parameter) => {
    if (GLOSSARY?.[parameter]?.["type"] === "obsolete") {
      obsolete.push({
        name: parameter,
      });
    }
  });

  parameters.forEach(checkIfRecognized);
  parameters.splice(0, parameters.length, ...recognized);

  return [
    ...unrecognized.map(UNRECOGNIZED_PARAMETER),
    ...obsolete.map(OBSOLETE_PARAMETERS),
  ];
};

const _superMatching = (parameter: string): boolean => {
  for (const superMatchingParameter of SUPER_MATCHING_PARAMS) {
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

const areAllPresentParametersCurrentlySupported = (
  parameters: string[],
): EasyEyesError[] => {
  parameters = parameters.filter((parameter: any) =>
    GLOSSARY.hasOwnProperty(parameter),
  );
  const notYetSupported = parameters.filter(
    (parameter: any) => GLOSSARY[parameter]["availability"] !== "now",
  );

  parameters = parameters.filter(
    (parameter: any) => GLOSSARY[parameter]["availability"] === "now",
  );
  return notYetSupported.map(NOT_YET_SUPPORTED_PARAMETER);
};

/**
 * Checks that comma-separated strings are of the correct length.
 */
const areCommaSeperatedStringsOfCorrectLength = (
  experiment: any,
  markParameterExpectedLengths: Map<string, number>,
): EasyEyesError[] => {
  const columnNames = experiment.listColumns();
  const markParameters = [...markParameterExpectedLengths.keys()].filter((s) =>
    columnNames.includes(s),
  );
  let markParamErrors = markParameters
    .map((param) => {
      const values = getColumnValues(experiment, param);
      const expectedLength = markParameterExpectedLengths.get(param);

      let offendingColumns: Array<Offender<number>> = [];
      values.forEach((s, i) => {
        if (!s || !s.split) return;
        const length = s.split(",").length;
        if (length !== expectedLength)
          offendingColumns.push({
            columnNumber: i,
            offendingValue: length,
          });
      });
      if (offendingColumns.length) {
        return COMMA_SEPARATED_VALUE_HAS_INCORRECT_LENGTH(
          param,
          //@ts-ignore
          expectedLength,
          offendingColumns,
        );
      }
      return []; // No errors for this parameter
    })
    .flat();
  return markParamErrors;
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

const checkUnderscoreParams = (df: any): EasyEyesError[] => {
  const underscoreParams = df.listColumns().filter((s: string) => s[0] === "_");
  const offendingParams = underscoreParams.filter(
    (parameter: string): boolean => {
      const values = getColumnValues(df, parameter);
      return !_valueOnlyInFirstPosition(values, parameter);
    },
  );
  return offendingParams.map(ILL_FORMED_UNDERSCORE_PARAM);
};

const _valueOnlyInFirstPosition = (a: any[], parameter: string): boolean => {
  const unregulatedParameters = ["_about"];
  if (unregulatedParameters.includes(parameter)) return true;
  return !a.some((value: any, i: number) => i !== 0 && value !== "");
};

const areParametersOfTheCorrectType = (df: any): EasyEyesError[] => {
  const errors: EasyEyesError[] = [];
  const checkType = (
    column: string[],
    typeCheck: (s: string) => boolean,
    columnName: string,
    correctType:
      | "integer"
      | "numerical"
      | "text"
      | "boolean"
      | "categorical"
      | "obsolete"
      | "multicategorical",
    categories?: string[],
  ): void => {
    const notType = (s: string): boolean => !typeCheck(s);
    if (column.some(notType)) {
      let offendingValues = column
        .map((e: string, i: number) => {
          return { value: e, block: i + 1 };
        })
        .filter((d: { value: string; block: number }) => notType(d.value));
      if (correctType === "multicategorical")
        offendingValues = offendingValues.map((x) => {
          return {
            value: getCategoriesFromString(x.value)
              .filter((s: string) => !categories?.includes(s))
              .join(","),
            block: x.block,
          };
        });
      // Only report the single, relevant column for underscore parameters
      if (columnName[0] === "_")
        offendingValues.splice(1, offendingValues.length - 1);
      errors.push(
        INCORRECT_PARAMETER_TYPE(
          offendingValues,
          columnName,
          correctType,
          categories,
        ),
      );
    }
  };
  df.listColumns().forEach((columnName: string) => {
    if (GLOSSARY.hasOwnProperty(columnName) && GLOSSARY[columnName]["type"]) {
      if (
        !arraysEqual(
          df
            .select(columnName)
            .toArray()
            .map((x: any[]): any => x[0]),
          df
            .select(columnName)
            .toArray()
            .map((x: any[]): any => x[0])
            .filter((x: any) => x),
        )
      ) {
        // console.error(
        //   `Undefined values in ${columnName}. Make sure that comma's are balanced across all rows.`
        // );
      }
      const column: string[] = df
        .select(columnName)
        .toArray()
        .map((x: any[]): any => x[0]);
      // .filter((x:any) => x); // Exclude undefined?
      const correctType = GLOSSARY[columnName]["type"];
      switch (correctType) {
        case "integer":
          const isInt = (s: string): boolean =>
            (isNumeric(s) && Number.isInteger(Number(s))) || s === "";
          checkType(column, isInt, columnName, correctType);
          break;
        case "numerical":
          const isNumerical = (s: string): boolean => isNumeric(s) || s === "";
          checkType(column, isNumerical, columnName, correctType);
          break;
        case "boolean":
          const isBool = (s: string): boolean =>
            s.toLowerCase() === "true" || s.toLowerCase() === "false";
          checkType(column, isBool, columnName, correctType);
          break;
        case "text":
          // TODO define what a failing, ie non-"text", value would be
          break;
        case "obsolete":
          break;
        case "categorical":
          const validCategory = (str: string): boolean =>
            getCategoriesFromString(str).every((s: string) =>
              GLOSSARY[columnName]["categories"].includes(s),
            );
          checkType(
            column,
            validCategory,
            columnName,
            correctType,
            GLOSSARY[columnName]["categories"] as string[],
          );
          break;
        case "multicategorical":
          const validMulti = (str: string): boolean =>
            getCategoriesFromString(str).every((s: string) =>
              GLOSSARY[columnName]["categories"].includes(s),
            );
          checkType(
            column,
            validMulti,
            columnName,
            correctType,
            GLOSSARY[columnName]["categories"] as string[],
          );
          break;
        default:
        // default:
        //   console.error(`Unrecognized type '${correctType}' used in the glossary. Please contact the EasyEyes team.`);
      }
    }
  });
  return errors;
};

/**
 * Find some actual parameters, which are similar to the unknown parameter requested
 * @param {String} proposedParameter What the experimerimenter asked for
 * @param {String[]} parameters All the actual parameters, which they might have meant
 * @param {Number} numberOfCandidatesToReturn How many parameters to return
 * @returns {String[]}
 */
const similarlySpelledCandidates = (
  proposedParameter: string,
  parameters: string[],
  numberOfCandidatesToReturn = 4,
): string[] => {
  const closest = parameters.sort(
    (a: any, b: any) =>
      levDist(proposedParameter, a) - levDist(proposedParameter, b),
  );

  const candidates = closest.slice(0, numberOfCandidatesToReturn - 1);
  return candidates.map((c) => c.replace(/@/g, "9"));
};

const isResponsePossible = (df: any): EasyEyesError[] => {
  const responseMedia = [
    "responseClickedBool",
    "responseTypedBool",
    "responseSpokenBool",
    "simulateParticipantBool",
  ];
  // Modalities the experimenter specified
  const includedMedia = responseMedia.filter((responseParameter: string) =>
    df.listColumns().includes(responseParameter),
  );
  // Those that they didn't
  const excludedMedia = responseMedia.filter(
    (responseParameter: string) =>
      !df.listColumns().includes(responseParameter),
  );
  // Default values to use for the ones they didn't
  const defaults = excludedMedia.map(
    (modality: string) => GLOSSARY[modality].default as string,
  );
  // The values for each included modality, for each condition of the experiment
  const conditions = df.select(...includedMedia).toArray();
  const viewingDistances = getColumnValuesOrDefaults(
    df,
    "viewingDistanceDesiredCm",
  );
  const keypadDistances = getColumnValuesOrDefaults(df, "needKeypadBeyondCm");
  // Finding those problematic conditions which...
  const conditionsWithoutResponse: number[] = [];
  conditions.forEach((row: string[], i: number) => {
    // ... don't have a modality explictly allowed by the experimenter
    const [viewingDistanceDesiredCm, needKeypadBeyondCm] = [
      viewingDistances[i],
      keypadDistances[i],
    ];
    if (
      !(
        row.some((bool: string) => bool.toLowerCase() === "true") ||
        // ... or a modality which is true by default
        excludedMedia.some(
          (__: string, i: number) => defaults[i].toLowerCase() === "true",
        ) ||
        // ... or keypad is to be activated
        viewingDistanceDesiredCm > needKeypadBeyondCm
      )
    )
      conditionsWithoutResponse.push(i);
  });
  // Return an error if there are any offending conditions
  if (conditionsWithoutResponse.length)
    return [
      NO_RESPONSE_POSSIBLE(conditionsWithoutResponse, false, conditions.length),
    ];
  return [];
};

export const _getDuplicateValuesAndIndicies = (
  l: any[],
): { [key: string]: number[] } => {
  // const seen: {[key: T]: number[]} = {};
  const seen: any = {};
  l.forEach((c: any, i: number) => {
    if (seen.hasOwnProperty(c)) {
      seen[c].push(i);
    } else {
      seen[c] = [i];
    }
  });
  return seen;
};

export const _areColumnValuesUnique = (
  targetColumn: string,
  df: any,
): boolean => {
  if (df.unique(targetColumn) !== df.select(targetColumn)) return false;
  return true;
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

export const isImageFolderMissing = async (
  imageFoldersObject: any,
  existingFolderList: string[],
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
    const imageFileObjectList = await getImageFiles(availableFolderList);
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

export const areEasyEyesLettersVersionParametersValid = (
  experimentDf: any,
): EasyEyesError[] => {
  const EasyEyesLettersVersion = getColumnValuesOrDefaults(
    experimentDf,
    "EasyEyesLettersVersion",
  );

  const spacingRelationToSize = getColumnValuesOrDefaults(
    experimentDf,
    "spacingRelationToSize",
  );

  const spacingDirection = getColumnValuesOrDefaults(
    experimentDf,
    "spacingDirection",
  );

  const spacingSymmetry = getColumnValuesOrDefaults(
    experimentDf,
    "spacingSymmetry",
  );

  const targetKind = getColumnValuesOrDefaults(experimentDf, "targetKind");

  const errorList: EasyEyesError[] = [];

  for (let i = 2; i < EasyEyesLettersVersion.length; i++) {
    if (targetKind[i] !== "letter") continue;
    if (
      EasyEyesLettersVersion[i] === "2" &&
      spacingRelationToSize[i] === "ratio"
    ) {
      if (spacingSymmetry[i] !== "screen") {
        errorList.push(
          CUSTOM_MESSAGE(
            "Unsupported combination of parameters",
            'Using EasyEyesLettersVersion=2 and spacingRelationToSize=ratio, currently spacingSymmetry must be "screen".',
            "",
            "preprocessor",
            "error",
            [
              "spacingSymmetry",
              "spacingRelationToSize",
              "EasyEyesLettersVersion",
            ],
          ),
        );
      }
      if (
        spacingDirection[i] === "horizontalAndVertical" ||
        spacingDirection[i] === "radialAndTangential"
      ) {
        errorList.push(
          CUSTOM_MESSAGE(
            "Unsupported combination of parameters",
            'Using EasyEyesLettersVersion=2 and spacingRelationToSize=ratio, currently spacingDirection direction cannot be "horizontalAndVertical" or "radialAndTangential". Use "horizontal", "vertical", "radial", or "tangential".',
            "",
            "preprocessor",
            "error",
            [
              "spacingDirection",
              "spacingRelationToSize",
              "EasyEyesLettersVersion",
            ],
          ),
        );
      }
    }
  }

  return errorList;
};

export const isCalibrateTrackDistanceCheckBoolValid = (
  calibrateTrackDistanceCheckBool: [],
  calibrateTrackDistanceBool: [],
): EasyEyesError[] => {
  const errorList: EasyEyesError[] = [];
  if (
    calibrateTrackDistanceCheckBool.length !== calibrateTrackDistanceBool.length
  ) {
    return errorList; // return empty error list
  }

  for (let i = 2; i < calibrateTrackDistanceCheckBool.length; i++) {
    if (
      calibrateTrackDistanceCheckBool[i] === "TRUE" &&
      calibrateTrackDistanceBool[i] === "FALSE"
    ) {
      errorList.push(
        CUSTOM_MESSAGE(
          "Invalid combination of parameters",
          "To check distance tracking you must enable it.",
          "calibrateTrackDistanceCheckBool requires calibrateTrackDistanceBool",
          "preprocessor",
          "error",
          ["calibrateTrackDistanceCheckBool", "calibrateTrackDistanceBool"],
        ),
      );
    }
    break;
  }

  // if (calibrateTrackDistanceCheckBool && !calibrateTrackDistanceBool) {
  //   errorList.push(CUSTOM_MESSAGE("Invalid combination of parameters: calibrateTrackDistanceCheckBool and calibrateTrackDistanceBool", "To check distance tracking you must enable it.", "calibrateTrackDistanceCheckBool requires calibrateTrackDistanceBool", "preprocessor", "error", ["calibrateTrackDistanceCheckBool", "calibrateTrackDistanceBool"]));
  // }
  return errorList;
};

export const isViewMonitorsXYDegValid = (
  viewMonitorsXYDeg: any,
): EasyEyesError[] => {
  const errorList: EasyEyesError[] = [];
  /**
   * There can be zero or more xy coordinates, separated by semicolons.
   * Each coordinate consists of two comma-separated numbers.
   * Each number must be in the range ±180 deg.
   * The tokens are numbers, commas, and semicolons.
   * Spaces between tokens are ignored. So are leading and trailing spaces.
   * Missing numbers are a fatal error.
   */
  // example data: ['viewMonitorsXYDeg', "", 0,0;-60,0;60,0','0,0;-60,0;60,0'...]

  //map through each value of the array: first is the name "viewMonitorsXYDeg", second is an empty value then the actual values
  viewMonitorsXYDeg.forEach((val: string, i: number) => {
    if (i > 1) {
      if (val === "") return;
      //split the string by semicolons
      const xyDegs = val.split(";");
      //map through each xyDegs
      xyDegs.forEach((xyDeg: string, j: number) => {
        //split the string by commas
        const xy = xyDeg.split(",");
        //check if the length of the array is not 2
        if (xy.length !== 2) {
          errorList.push(INVALID_PARAMETER_VALUE("viewMonitorsXYDeg", i - 1));
        } else {
          //check if the values are not numbers
          if (isNaN(Number(xy[0])) || isNaN(Number(xy[1]))) {
            errorList.push(INVALID_PARAMETER_VALUE("viewMonitorsXYDeg", i - 1));
          } else {
            //check if the values are not in the range of -180 to 180
            if (
              Number(xy[0]) < -180 ||
              Number(xy[0]) > 180 ||
              Number(xy[1]) < -180 ||
              Number(xy[1]) > 180
            ) {
              errorList.push(
                INVALID_PARAMETER_VALUE("viewMonitorsXYDeg", i - 1),
              );
            }
          }
        }
      });
    }
  });
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

interface stringToString {
  [index: string]: string;
}
/**
 * Block-level parameters are defined as having only one unique value per block.
 * Check that these parameters are consistent within blocks.
 */
const areBlockUniqueValuesConsistent = (
  df: any,
  blockLevelParameters: string[],
): EasyEyesError[] => {
  const errors: EasyEyesError[] = [];
  for (const blockParam of blockLevelParameters) {
    if (df.listColumns().includes(blockParam)) {
      const inconsistentBlocks: string[] = [];
      const blocks = df
        .select("block")
        .toArray()
        .map(([x]: [string]) => x);
      const values = df
        .select(blockParam)
        .toArray()
        .map(([x]: [string]) => x);
      const valuePerBlock: stringToString = {};
      for (const [i, block] of blocks.entries()) {
        if (
          valuePerBlock.hasOwnProperty(block) &&
          valuePerBlock[block] !== values[i]
        ) {
          inconsistentBlocks.push(block);
        }
        valuePerBlock[block] = values[i];
      }
      if (inconsistentBlocks.length)
        errors.push(NONUNIQUE_WITHIN_BLOCK(blockParam, inconsistentBlocks));
    }
  }
  return errors;
};

/**
 * Check that there are no condition-level parameters (ie non-underscore parameters) in the first
 * column (Column B). The converse, that no experiment-level parameters (ie underscore parameters)
 * in later columns (Column C and beyond), is checked in checkAndCorrectUnderscoreParams
 * @param {any} experiment
 * @returns {EasyEyesError[]}
 */
const doConditionsBeginInTheSecondColumn = (
  experiment: any,
): EasyEyesError[] => {
  const columnNames = experiment.listColumns();
  const columns = experiment.toArray();
  let offendingParameters = [];
  for (let i = 0; i < columnNames.length; i++) {
    const underscoreRow = columnNames[i][0] === "_";
    // Correctness of underscore parameters is checked in `checkAndCorrectUnderscoreParams`
    const valueMisplaced = !underscoreRow && columns[0][i] !== "";
    //@ts-ignore
    if (valueMisplaced) offendingParameters.push(columnNames[i]);
  }
  if (offendingParameters.length)
    return [CONDITION_PARAMETERS_IN_FIRST_COLUMN(offendingParameters)];
  return [];
};

/**
 * Check that all shuffle groups are contiguous.
 * @param experiment
 * @returns {EasyEyesError[]}
 */
const areShuffleGroupsContiguous = (experiment: any): EasyEyesError[] => {
  const groupingParameters: string[] = experiment
    .listColumns()
    .filter(isBlockShuffleGroupingParam);
  const groupings = groupingParameters.map((c) =>
    getColumnValues(experiment, c),
  );
  const groupingsContiguous: boolean[] = groupings.map(valuesContiguous);
  const noncontiguousGroupingParameters = groupingParameters.filter(
    (v, i) => !groupingsContiguous[i],
  );
  const noncontiguousGroupings = groupings
    .filter((v, i) => !groupingsContiguous[i])
    .map((g) => [...getNoncontiguousValues(g)]);
  if (!noncontiguousGroupingParameters.length) return [];
  return [
    NONCONTIGUOUS_GROUPING_VALUES(
      noncontiguousGroupings,
      noncontiguousGroupingParameters,
    ),
  ];
};

const areShuffleGroupsSubsets = (experimentDf: any): EasyEyesError[] => {
  const allGroupingParameters = Object.keys(GLOSSARY).filter(
    isBlockShuffleGroupingParam,
  );
  const presentGroupingParameters: string[] = allGroupingParameters.filter(
    (p) => experimentDf.listColumns().includes(p),
  );
  const unique = (x: string, i: number, arr: string[]) =>
    x && arr.indexOf(x) === i;
  const getNonSubsetGroups = (
    childParam: string,
    parentParam: string,
  ): string[] => {
    const childGroups = getColumnValues(experimentDf, childParam);
    if (!experimentDf.listColumns().includes(parentParam))
      return childGroups.filter(unique);
    const parentGroups = getColumnValues(experimentDf, parentParam);
    return childGroups
      .map((childGroupLabel, i) => {
        const parentGroupLabel = parentGroups[i];
        if (childGroupLabel !== "" && parentGroupLabel === "")
          return childGroupLabel;
        return "";
      })
      .filter(unique);
  };
  const allGroupsAreSubsets = (
    childParam: string,
    parentParam: string,
  ): boolean => {
    return getNonSubsetGroups(childParam, parentParam).length === 0;
  };
  const nonSubsetGroupings = [];
  const nonSubsetGroupingParams = [];
  for (let i = 1; i < allGroupingParameters.length; i++) {
    const currentGroup = allGroupingParameters[i];
    const outerGroup = allGroupingParameters[i - 1];
    if (presentGroupingParameters.includes(currentGroup)) {
      if (
        !presentGroupingParameters.includes(outerGroup) ||
        !allGroupsAreSubsets(currentGroup, outerGroup)
      ) {
        //@ts-ignore
        nonSubsetGroupingParams.push(currentGroup);
        //@ts-ignore
        nonSubsetGroupings.push(getNonSubsetGroups(currentGroup, outerGroup));
      }
    }
  }
  if (!nonSubsetGroupings.length) return [];
  return [
    NONSUBSET_GROUPING_VALUES(nonSubsetGroupings, nonSubsetGroupingParams),
  ];
};

const areMutuallyExclusiveParametersNonconflicting = (
  experimentDf: any,
  mutuallyExclusiveParameterGroups: string[][],
): EasyEyesError[] => {
  const presentColumns = experimentDf.listColumns();
  let offendingParamsInConditions: [string[], string][] = [];
  mutuallyExclusiveParameterGroups.forEach((mutuallyExclusiveParams) => {
    const theseColumns = mutuallyExclusiveParams.filter((p) =>
      presentColumns.includes(p),
    );
    // const theseColumns = ["block_condition", ...mutuallyExclusiveParams.filter(p => presentColumns.includes(p))];
    const rows: string[][] = experimentDf.select(...theseColumns).toArray();
    // TODO generalize way, across the various checks, to account for conditions not being enabled
    const rowsEnabledMap: boolean[] = presentColumns.includes(
      "conditionEnabledBool",
    )
      ? experimentDf
          .select("conditionEnabledBool")
          .toArray()
          .flat()
          .map((s: string) => s.toLowerCase() === "true")
      : rows.map((r) => true);
    // TODO does this break when checking mutually exclusive underscore params?? or not check them at all?
    rows.forEach((r: string[], i: number) => {
      // const values = r.slice(1);
      // const params = theseColumns.slice(1);
      // Start at Column C, and 1 indexed, so +3
      const spreadsheetColumn = conditionIndexToColumnName(i);
      const valuesMap = r.map((v) => (v.toLowerCase() === "true" ? 1 : 0));
      const trueParams = theseColumns.filter((p, i) => valuesMap[i]);
      if (trueParams.length > 1 && rowsEnabledMap[i])
        offendingParamsInConditions.push([trueParams, spreadsheetColumn]);
    });
  });
  if (!offendingParamsInConditions.length) return [];
  const parameters = offendingParamsInConditions.map((x) => x[0]);
  const conditions = offendingParamsInConditions.map((x) => x[1]);
  return [CONTRADICTORY_MUTUALLY_EXCLUSIVE_PARAMETERS(parameters, conditions)];
};

const checkSpecificParameterValues = (experimentDf: any): EasyEyesError[] => {
  const errors: EasyEyesError[] = [];

  errors.push(..._checkCrosshairTrackingValues(experimentDf));
  errors.push(..._checkFixationLocation(experimentDf));
  errors.push(..._requireThresholdParameterForRsvpReading(experimentDf));
  errors.push(..._checkFlankerTypeIsDefinedAtLocation(experimentDf));
  errors.push(..._checkCorpusIsSpecifiedForReadingTasks(experimentDf));
  errors.push(..._checkThresholdAllowedTrialsOverRequestedGEOne(experimentDf));
  errors.push(..._checkCalibrationTimesNotZero(experimentDf));
  errors.push(...areEasyEyesLettersVersionParametersValid(experimentDf));
  errors.push(...areQuestionsProvidedForQuestionAndAnswer(experimentDf));
  errors.push(...areImageTargetKindParametersValid(experimentDf));
  errors.push(...areScreenSizeParametersValid(experimentDf));
  return errors;
};

const areScreenSizeParametersValid = (experimentDf: any): EasyEyesError[] => {
  const errors: EasyEyesError[] = [];
  const presentParameters: string[] = experimentDf?.listColumns();
  if (
    !presentParameters.includes("targetMinPhysicalPx") &&
    !presentParameters.includes("needTargetAsSmallAsDeg") &&
    !presentParameters.includes("needScreenWidthDeg") &&
    !presentParameters.includes("needScreenHeightDeg")
  )
    return [];

  const targetMinPhysicalPx =
    getColumnValuesOrDefaults(experimentDf, "targetMinPhysicalPx") || [];
  const needTargetAsSmallAsDeg =
    getColumnValuesOrDefaults(experimentDf, "needTargetAsSmallAsDeg") || [];
  const needScreenWidthDeg =
    getColumnValuesOrDefaults(experimentDf, "needScreenWidthDeg") || [];
  const needScreenHeightDeg =
    getColumnValuesOrDefaults(experimentDf, "needScreenHeightDeg") || [];

  targetMinPhysicalPx.forEach((x, i) => {
    if (Number(x) <= 0) {
      errors.push(
        SCREEN_SIZE_PARAMETERS_NOT_POSITIVE("targetMinPhysicalPx", [i]),
      );
    }
  });
  needTargetAsSmallAsDeg.forEach((x, i) => {
    if (Number(x) <= 0) {
      errors.push(
        SCREEN_SIZE_PARAMETERS_NOT_POSITIVE("needTargetAsSmallAsDeg", [i]),
      );
    }
  });
  needScreenWidthDeg.forEach((x, i) => {
    if (Number(x) < 0) {
      errors.push(SCREEN_SIZE_PARAMETER_NEGATIVE("needScreenWidthDeg", [i]));
    }
  });
  needScreenHeightDeg.forEach((x, i) => {
    if (Number(x) < 0) {
      errors.push(SCREEN_SIZE_PARAMETER_NEGATIVE("needScreenHeightDeg", [i]));
    }
  });
  return errors;
};

const areQuestionsProvidedForQuestionAndAnswer = (
  experimentDf: any,
): EasyEyesError[] => {
  const presentParameters: string[] = experimentDf?.listColumns();

  const questionParameters = presentParameters.filter(
    (s) => s.includes("questionAndAnswer") || s.includes("questionAnswer"),
  );

  if (questionParameters.length === 0) return [];

  const questionParametersValues = Object.fromEntries(
    questionParameters.map((s) => [s, getColumnValues(experimentDf, s)]),
  );

  const targetTask = getColumnValuesOrDefaults(experimentDf, "targetTask");
  const targetKind = getColumnValuesOrDefaults(experimentDf, "targetKind");

  const errors: EasyEyesError[] = [];
  const offendingColumns: number[] = [];
  const missingQuestionColumns: number[] = [];
  const offendingValues: { value: string; block: number }[] = [];

  for (let i = 0; i < targetTask.length; i++) {
    const hasQuestionAndAnswerValues = questionParameters.some(
      (param) => questionParametersValues[param][i] !== "",
    );

    if (hasQuestionAndAnswerValues) {
      const isAllowed =
        targetTask[i] === "" ||
        (targetTask[i] === "identify" && targetKind[i] === "image");

      if (!isAllowed) {
        offendingValues.push({ value: targetTask[i], block: i });
      }
    }

    if (targetTask[i] === "") {
      const questions = questionParameters.map(
        (param) => questionParametersValues[param][i],
      );
      const noValuefulQuestion = questions.every((s) => s === "");
      if (noValuefulQuestion) {
        // missingQuestionColumns.push(i);
      }
    }
  }

  if (offendingColumns.length > 0) {
    errors.push(QUESTION_AND_ANSWER_PARAMETERS_NOT_ALLOWED(offendingValues));
  }

  if (missingQuestionColumns.length > 0) {
    errors.push(
      QUESTION_AND_ANSWER_MISSING_QUESTION_COLUMN(missingQuestionColumns),
    );
  }

  return errors;
};

const areImageTargetKindParametersValid = (
  experimentDf: any,
): EasyEyesError[] => {
  // 1. when targetKind is "image", then targetImageFolder must be present
  // 2 when targetKind is "image", then targetTask should either be "identify" or "questionAndAnswer"

  const presentParameters: string[] = experimentDf?.listColumns();
  if (!presentParameters.includes("targetKind")) return [];
  if (!presentParameters.includes("targetImageFolder")) return [];
  if (!presentParameters.includes("targetTask")) return [];

  const targetKind = getColumnValues(experimentDf, "targetKind");
  const targetImageFolder = getColumnValues(experimentDf, "targetImageFolder");
  const targetTask = getColumnValues(experimentDf, "targetTask");

  const errors: EasyEyesError[] = [];

  for (let i = 0; i < targetKind.length; i++) {
    if (targetKind[i] === "image") {
      if (!targetImageFolder[i]) {
        errors.push(IMAGE_FOLDER_NOT_SPECIFIED("targetImageFolder"));
      }
      if (targetTask[i] !== "identify" && targetTask[i] !== "") {
        errors.push(
          IMAGE_FOLDER_INVALID_TARGET_TASK("targetTask", targetTask[i]),
        );
      }
    }
  }

  return errors;
};

const _checkThresholdAllowedTrialsOverRequestedGEOne = (
  experimentDf: any,
): EasyEyesError[] => {
  const presentParameters: string[] = experimentDf?.listColumns();
  if (
    !presentParameters ||
    !presentParameters.includes("thresholdAllowedTrialRatio")
  )
    return [];
  const thresholdAllowedTrialRatio = getColumnValues(
    experimentDf,
    "thresholdAllowedTrialRatio",
  );
  const lessThanOne: [string, number][] = [];
  thresholdAllowedTrialRatio.forEach((t, i) => {
    if (Number(t) < 1) {
      lessThanOne.push([t, i]);
    }
  });
  if (!lessThanOne.length) return [];
  return [THRESHOLD_ALLOWED_TRIALS_OVER_REQUESTED_LT_ONE(lessThanOne)];
};

const _checkCalibrationTimesNotZero = (experimentDf: any): EasyEyesError[] => {
  const errors: EasyEyesError[] = [];
  const presentParameters: string[] = experimentDf?.listColumns();

  // Check calibrateScreenSizeTimes
  if (presentParameters.includes("calibrateScreenSizeTimes")) {
    const calibrateScreenSizeTimes = getColumnValues(
      experimentDf,
      "calibrateScreenSizeTimes",
    );
    const zeroColumns: number[] = [];
    calibrateScreenSizeTimes.forEach((value, i) => {
      if (Number(value) === 0) {
        zeroColumns.push(i);
      }
    });
    if (zeroColumns.length > 0) {
      errors.push(
        CALIBRATION_TIMES_CANNOT_BE_ZERO(
          "calibrateScreenSizeTimes",
          zeroColumns,
        ),
      );
    }
  }

  // Check _calibrateTrackDistanceTimes
  if (presentParameters.includes("_calibrateTrackDistanceTimes")) {
    const calibrateTrackDistanceTimes = getColumnValues(
      experimentDf,
      "_calibrateTrackDistanceTimes",
    );
    const zeroColumns: number[] = [];
    calibrateTrackDistanceTimes.forEach((value, i) => {
      if (Number(value) === 0) {
        zeroColumns.push(i);
      }
    });
    if (zeroColumns.length > 0) {
      errors.push(
        CALIBRATION_TIMES_CANNOT_BE_ZERO(
          "_calibrateTrackDistanceTimes",
          zeroColumns,
        ),
      );
    }
  }

  return errors;
};

const _checkCrosshairTrackingValues = (experimentDf: any): EasyEyesError[] => {
  // responseMustTrackMaxSec ≥ responseMustTrackMinSec ≥ 0, andmarkingFixationStrokeThickening ≥ 0.
  const errors = [];

  const presentParameters: string[] = experimentDf.listColumns();
  const BCs = getColumnValues(experimentDf, "block_condition");

  const responseMustTrackMaxSec = getColumnValuesOrDefaults(
    experimentDf,
    "responseMustTrackMaxSec",
  );
  const responseMustTrackMinSec = getColumnValuesOrDefaults(
    experimentDf,
    "responseMustTrackMinSec",
  );
  const markingFixationStrokeThickening = getColumnValuesOrDefaults(
    experimentDf,
    "markingFixationStrokeThickening",
  );

  let negativeThickenings: [string, number][] = [];
  let trackingIntervalImpossible: [string[], number][] = [];
  BCs.forEach((BC: string, i) => {
    if (Number(markingFixationStrokeThickening[i]) < 0)
      negativeThickenings.push([markingFixationStrokeThickening[i], i]);
    if (
      Number(responseMustTrackMaxSec[i]) < Number(responseMustTrackMinSec[i]) ||
      Number(responseMustTrackMinSec[i]) < 0
    )
      trackingIntervalImpossible.push([
        [responseMustTrackMinSec[i], responseMustTrackMaxSec[i]],
        i,
      ]);
  });
  if (negativeThickenings.length)
    errors.push(
      //@ts-ignore
      NEGATIVE_MARKING_FIXATION_STROKE_THICKENING(negativeThickenings),
    );
  if (trackingIntervalImpossible.length)
    //@ts-ignore
    errors.push(ILLDEFINED_TRACKING_INTERVALS(trackingIntervalImpossible));

  return errors;
};

// Normally the specified point must lie in that unit square (enforced by compiler),
// but if fixationRequestedOffscreenBool=TRUE
//     then the specified point can be anywhere.
const _checkFixationLocation = (experiment: any): EasyEyesError[] => {
  const where = "fixationOriginXYScreen";
  const offscreen = "fixationRequestedOffscreenBool";
  const columnNames = experiment.listColumns();
  const fixationParameters = [where, offscreen].filter((s) =>
    columnNames.includes(s),
  );
  // If just using the default values, then no issue
  if (!fixationParameters.includes(where)) return [];
  let offendingColumns: Array<Offender<Array<number>>> = [];
  const positions: Array<Array<number>> = getColumnValuesOrDefaults(
    experiment,
    where,
  ).map((s) => s.split(",").map(Number));
  const alloweds = getColumnValuesOrDefaults(experiment, offscreen);
  positions.forEach((p, i) => {
    if (alloweds[i].toLowerCase() !== "true") {
      if (p.some((z) => z > 1 || z < 0)) {
        offendingColumns.push({ columnNumber: i, offendingValue: p });
      }
    }
  });
  if (!offendingColumns.length) return [];
  return [INVALID_FIXATION_LOCATION(offendingColumns)];
};

const _requireThresholdParameterForRsvpReading = (
  experimentDf: any,
): EasyEyesError[] => {
  const thresholdParameterValues = getColumnValuesOrDefaults(
    experimentDf,
    "thresholdParameter",
  );
  const targetKindValues = getColumnValuesOrDefaults(
    experimentDf,
    "targetKind",
  );
  const rsvpMask = targetKindValues.map((x) =>
    x === "rsvpReading" ? true : false,
  );
  const offendingMask = thresholdParameterValues.map((t, i) =>
    rsvpMask[i] && t === "" ? true : false,
  );
  const offendingConditions = thresholdParameterValues
    .map((t, i) => i)
    .filter((i) => offendingMask[i]);
  if (!offendingConditions.length) return [];
  return [
    NO_THRESHOLD_PARAMETER_PROVIDED_FOR_RSVP_READING_TARGET_KIND(
      offendingConditions,
    ),
  ];
};

const _checkFlankerTypeIsDefinedAtLocation = (df: any): EasyEyesError[] => {
  const targetXDeg = getColumnValuesOrDefaults(df, "targetEccentricityXDeg");
  const targetYDeg = getColumnValuesOrDefaults(df, "targetEccentricityYDeg");
  const targetXYDeg = targetXDeg.map((x, i) => [
    Number(targetXDeg[i]),
    Number(targetYDeg[i]),
  ]);
  const fovealMask = targetXYDeg.map(([x, y]) => x === 0 && y === 0);
  const targetKind = getColumnValuesOrDefaults(df, "targetKind");
  const spacingDirection = getColumnValuesOrDefaults(df, "spacingDirection");
  const targetTask = getColumnValuesOrDefaults(df, "targetTask");
  const thresholdParameter = getColumnValuesOrDefaults(
    df,
    "thresholdParameter",
  );
  const fovealFlankersMask = spacingDirection.map((s) =>
    ["horizontal", "vertical", "horizontalAndVertical"].includes(s),
  );
  const letterMask = targetKind.map((s) => s === "letter");
  const identifyMask = targetTask.map((s) => s === "identify"); // TODO generalize, if crowding code is run in other target tasks
  const spacingMask = thresholdParameter.map((s) => s === "spacingDeg");
  const offendingMap = fovealMask.map(
    (foveal, i) =>
      letterMask[i] &&
      identifyMask[i] &&
      spacingMask[i] &&
      ((foveal && !fovealFlankersMask[i]) ||
        (!foveal && fovealFlankersMask[i])),
  );
  if (!offendingMap.filter((x) => x).length) return [];
  const offendingConditions = offendingMap
    .map((b, i) => i)
    .filter((i) => offendingMap[i]);
  return [FLANKER_TYPES_DONT_MATCH_ECCENTRICITY(offendingConditions)];
};
const _checkCorpusIsSpecifiedForReadingTasks = (df: any): EasyEyesError[] => {
  const targetKinds = getColumnValuesOrDefaults(df, "targetKind");
  const readingMask = targetKinds.map((s) => s.includes("eading"));
  const readingCorpuses = getColumnValuesOrDefaults(df, "readingCorpus");
  const readingCorpusFoils = getColumnValuesOrDefaults(
    df,
    "readingCorpusFoils",
  );
  const readingCorpusFoilsExclude = getColumnValuesOrDefaults(
    df,
    "readingCorpusFoilsExclude",
  );

  const offendingMask = readingCorpuses.map(
    (s, i) => readingMask[i] && s === "",
  );
  const offendingConditions = offendingMask
    .map((b, i) => i)
    .filter((i) => offendingMask[i]);

  // readingCorpusFoils and readingCorpusFoilsExclude are only allowed if targetKind is "rsvpReading"
  const rsvpReadingMask = targetKinds.map((s) => !s.includes("rsvpReading"));
  const offendingMask2 = readingCorpusFoils.map(
    (s, i) => rsvpReadingMask[i] && s !== "",
  );
  const offendingConditions2 = offendingMask2
    .map((b, i) => i)
    .filter((i) => offendingMask2[i]);
  // const offendingMask3 = readingCorpusFoilsExclude.map(
  //   (s, i) => rsvpReadingMask[i] && s !== "none",
  // );
  // const offendingConditions3 = offendingMask3
  //   .map((b, i) => i)
  //   .filter((i) => offendingMask3[i]);

  if (
    !offendingConditions.length &&
    !offendingConditions2.length
    // &&
    // !offendingConditions3.length
  )
    return [];
  const errors = [];
  if (offendingConditions.length)
    errors.push(CORPUS_NOT_SPECIFIED_FOR_READING_TASK(offendingConditions));
  if (offendingConditions2.length)
    errors.push(
      INVALID_READING_CORPUS_FOILS(offendingConditions2, "readingCorpusFoils"),
    );
  // if (offendingConditions3.length)
  //   errors.push(
  //     INVALID_READING_CORPUS_FOILS(
  //       offendingConditions3,
  //       "readingCorpusFoilsExclude",
  //     ),
  //   );
  return errors;
};

const areGlossaryParametersProper = (): EasyEyesError[] => {
  // TODO any other checks on the glossary itself?
  return [..._areGlossaryParametersValidTypes()];
};
const _areGlossaryParametersValidTypes = (): EasyEyesError[] => {
  const validTypes = [
    "integer",
    "numerical",
    "boolean",
    "text",
    "obsolete",
    "categorical",
    "multicategorical",
  ];
  const offendingParams = Object.values(GLOSSARY).filter(
    (p) => !validTypes.includes(p["type"] as string),
  );
  if (!offendingParams.length) return [];
  const names = offendingParams.map((p) => p["name"]) as string[];
  const types = offendingParams.map((p) => p["type"]) as string[];
  return [IMPROPER_GLOSSARY_UNRECOGNIZED_TYPE(names, types)];
};

const checkVernierUsingCorrectThreshold = (df: any): EasyEyesError[] => {
  const presentParameters: string[] = df.listColumns();

  if (
    presentParameters.includes("thresholdParameter") &&
    presentParameters.includes("targetKind")
  ) {
    const thresholdParameter = getColumnValues(df, "thresholdParameter");
    const targetKind = getColumnValues(df, "targetKind");
    for (let i = 0; i < thresholdParameter.length; i++) {
      if (
        thresholdParameter[i] === "targetOffsetDeg" &&
        targetKind[i] !== "vernier"
      ) {
        return [TARGETOFFSETDEG_MUST_USE_VERNIER(targetKind[i], i + 3)];
      }
      if (
        thresholdParameter[i] !== "targetOffsetDeg" &&
        targetKind[i] === "vernier"
      ) {
        return [VERNIER_MUST_USE_TARGETOFFSETDEG(thresholdParameter[i], i + 3)];
      }
    }
  }
  return [];
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

/**
 * Returns an error message if the _authorEmails has an invalid email if _calibrateMicrophonesBool is true.
 * @param {String[]} parameters Array of parameters , which the experimenter has provided
 * @returns {Object[]} List of error messages for unrecognized parameters
 */
const areAuthorizedEmailsValid = (experiment: any): EasyEyesError[] => {
  const columnNames = experiment.listColumns();
  const columns = experiment.toArray();
  let offendingParameters: any = [];
  let hasEmail = false;
  for (let i = 0; i < columnNames.length; i++) {
    if (
      columnNames[i] === "_calibrateMicrophonesBool" &&
      columns[0][i] === "TRUE"
    ) {
      for (let j = 0; j < columnNames.length; j++) {
        if (columnNames[j] === "_authorEmails") {
          const emailText = columns[0][j];
          const emails = emailText.split(";");
          for (const i in emails) {
            if (!emails[i].includes("@")) {
              offendingParameters.push(emails[i]);
            }
          }
          hasEmail = true;
          break;
        }
      }
      if (hasEmail) {
        break;
      } else {
        offendingParameters.push(
          "_authorEmails required when _calibrateMicrophonesBool is TRUE.",
        );
      }
    }
  }
  if (offendingParameters.length)
    return [INVALID_AUTHOR_EMAIL(offendingParameters)];
  return [];
};

// If markingFixationMotionRadiusDeg is not 0, then responseMustTrackContinuouslyBool must be TRUE
const isTrackingOnForMovingFixation = (experimentDf: any): EasyEyesError[] => {
  const presentParameters: string[] = experimentDf.listColumns();
  // If markingFixationMotionRadiusDeg is not present, default of 0 means no motion
  if (!presentParameters.includes("markingFixationMotionRadiusDeg")) return [];
  const markingFixationMotionRadiusDeg = getColumnValuesOrDefaults(
    experimentDf,
    "markingFixationMotionRadiusDeg",
  );
  const responseMustTrackContinuouslyBool = getColumnValuesOrDefaults(
    experimentDf,
    "responseMustTrackContinuouslyBool",
  );
  const offendingMask = markingFixationMotionRadiusDeg.map(
    (r, i) =>
      Number(r) !== 0 &&
      responseMustTrackContinuouslyBool[i].toLowerCase() !== "true",
  );
  if (!offendingMask.some((x) => x)) return [];
  const offendingConditions = offendingMask
    .map((b, i) => i)
    .filter((i) => offendingMask[i]);
  return [TRACKING_MUST_BE_ON_FOR_MOVING_FIXATION(offendingConditions)];
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
      return CUSTOM_MESSAGE(
        "Impulse response file validation error",
        errors.join("\n"),
        "Please check the impulse response file format and try again.",
        "preprocessor",
        "error",
        ["_calibrateSoundSamplingDesiredHz"],
      );
    }
    // Check if sampling rate matches the desired rate
    if (desiredSamplingRate) {
      const fileSamplingRate = samplingRate;

      // Allow for small rounding differences (within 1%)
      const tolerance = 0.01 * desiredSamplingRate;
      const lowerBound = desiredSamplingRate - tolerance;
      const upperBound = desiredSamplingRate + tolerance;

      if (fileSamplingRate < lowerBound || fileSamplingRate > upperBound) {
        return CUSTOM_MESSAGE(
          "Sampling rate mismatch",
          `The impulse response file ${file.name} has a sampling rate of ${fileSamplingRate} Hz, but _calibrateSoundSamplingDesiredHz specifies ${desiredSamplingRate} Hz.`,
          "Please provide a file with the correct sampling rate or adjust the _calibrateSoundSamplingDesiredHz parameter.",
          "preprocessor",
          "error",
          ["_calibrateSoundSamplingDesiredHz"],
        );
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
export const checkImpulseResponsePairs = (
  parsed: Papa.ParseResult<any>,
): EasyEyesError[] => {
  const errors: EasyEyesError[] = [];

  // Find the rows for the loudspeaker and microphone simulation parameters
  let loudspeakerRow: string[] | undefined;
  let microphoneRow: string[] | undefined;

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    if (row[0] === "_calibrateSoundSimulateLoudspeaker") {
      loudspeakerRow = row;
    } else if (row[0] === "_calibrateSoundSimulateMicrophone") {
      microphoneRow = row;
    }
  }

  // Check if one parameter is present but the other is missing
  const hasLoudspeaker =
    loudspeakerRow && loudspeakerRow[1] && loudspeakerRow[1].trim() !== "";
  const hasMicrophone =
    microphoneRow && microphoneRow[1] && microphoneRow[1].trim() !== "";

  if (hasLoudspeaker !== hasMicrophone) {
    // One is defined but the other is not
    errors.push(IMPULSE_RESPONSE_MISSING_PAIR());
  }

  return errors;
};

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
      return CUSTOM_MESSAGE(
        "Frequency response file validation error",
        errors.join("\n"),
        "Please check the frequency response file format and try again.",
        "preprocessor",
        "error",
        [
          "_calibrateSoundSimulateLoudspeaker",
          "_calibrateSoundSimulateMicrophone",
        ],
      );
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
      const targetSoundListFiles = await getTargetSoundListFiles(
        requestedTargetSoundListList.map((item: any) => item.targetSoundList),
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
            CUSTOM_MESSAGE(
              "Target sound list file validation error",
              targetSoundListErrors.join("\n"),
              "Please check the target sound list file format and try again.",
              "preprocessor",
              "error",
              [parameter],
            ),
          );
        }
      }
    } catch (error: unknown) {
      errors.push(
        CUSTOM_MESSAGE(
          "Target sound list file validation error",
          `Failed to parse file`,
          "Please check the target sound list file format and try again.",
          "preprocessor",
          "error",
          [parameter],
        ),
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
export const checkFontWeightAndWghtConflict = (df: any): EasyEyesError[] => {
  const presentParameters: string[] = df.listColumns();

  // If neither parameter is present, no conflict possible
  if (
    !presentParameters.includes("fontWeight") &&
    !presentParameters.includes("fontVariableSettings")
  ) {
    return [];
  }

  const fontWeight = getColumnValuesOrDefaults(df, "fontWeight");
  const fontVariableSettings = getColumnValuesOrDefaults(
    df,
    "fontVariableSettings",
  );

  const offendingConditions: number[] = [];

  for (let i = 0; i < fontWeight.length; i++) {
    const hasWeight = fontWeight[i] !== "" && fontWeight[i] !== undefined;
    const hasWghtInSettings =
      fontVariableSettings[i] &&
      fontVariableSettings[i]
        .toLowerCase()
        .replace(/["']/g, "")
        .includes("wght");

    if (hasWeight && hasWghtInSettings) {
      offendingConditions.push(i);
    }
  }

  if (offendingConditions.length === 0) {
    return [];
  }

  return [FONT_WEIGHT_AND_WGHT_CONFLICT(offendingConditions)];
};

/**
 * Parse fontVariableSettings string into axis-value pairs
 * @param settings - The fontVariableSettings string (e.g., '"wght" 625, "wdth" 100')
 * @returns Array of {axis, value} objects
 */
const parseFontVariableSettings = (
  settings: string,
): { axis: string; value: number }[] => {
  if (!settings || typeof settings !== "string") return [];

  const cleaned = settings.replace(/["']/g, "").trim();
  if (!cleaned) return [];

  const parts = cleaned.split(",").map((p) => p.trim());
  const result: { axis: string; value: number }[] = [];

  for (const part of parts) {
    const tokens = part.split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length === 2) {
      const axis = tokens[0].trim();
      const value = parseFloat(tokens[1].trim());
      if (axis.length === 4 && !isNaN(value)) {
        result.push({ axis, value });
      }
    }
  }

  return result;
};

// WASM module for font validation (loaded lazily)
let fontValidationWasm: any = null;

/**
 * Check if running in Node.js environment
 */
const isNodeEnvironment = (): boolean => {
  return (
    typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null
  );
};

/**
 * Initialize WASM module for font validation in Node.js environment
 * Uses direct WebAssembly APIs to avoid ES module conflicts
 * @returns The WASM module or null if loading fails
 */
const initFontValidationWasmNode = async (): Promise<any> => {
  try {
    const { loadWasmModuleLocal } = await import("./nodeLocal.js");
    const wasm = await loadWasmModuleLocal(
      __dirname,
      "../@rust/pkg/easyeyes_wasm_bg.wasm",
    );
    return wasm;
  } catch (error) {
    console.warn(
      "[Font Validation] WASM module not available in Node.js, skipping font introspection checks",
      error,
    );
    return null;
  }
};

/**
 * Initialize WASM module for font validation in browser environment
 * @returns The WASM module or null if loading fails
 */
const initFontValidationWasmBrowser = async (): Promise<any> => {
  try {
    // Dynamic import of WASM module (webpack handles this)
    const wasmBinary = await import(
      /* webpackMode: "eager" */ "../@rust/pkg/easyeyes_wasm_bg.wasm"
    );
    const wasm = await import(
      /* webpackMode: "eager" */ "../@rust/pkg/easyeyes_wasm.js"
    );
    await wasm.default(wasmBinary.default);
    return wasm;
  } catch (error) {
    console.warn(
      "[Font Validation] WASM module not available, skipping font introspection checks",
      error,
    );
    return null;
  }
};

/**
 * Initialize WASM module for font validation
 * @returns The WASM module or null if loading fails
 */
const initFontValidationWasm = async (): Promise<any> => {
  if (fontValidationWasm) {
    return fontValidationWasm;
  }

  if (isNodeEnvironment()) {
    fontValidationWasm = await initFontValidationWasmNode();
  } else {
    fontValidationWasm = await initFontValidationWasmBrowser();
  }

  return fontValidationWasm;
};

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

  for (let i = 0; i < fontNames.length; i++) {
    const source = fontSources[i] || GLOSSARY["fontSource"]?.default || "file";
    // Only validate file-based fonts (Google fonts are validated by API in fontCheck.ts)
    if (source !== "file") continue;

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
  const wasm = await initFontValidationWasm();
  if (!wasm) {
    // WASM not available, skip font introspection checks
    // The fontWeight/wght conflict check still works
    return [];
  }

  // Get unique font names to fetch (from both fontVariableSettings and fontWeight)
  const uniqueFontNames = Array.from(
    new Set([...conditionsByFont.keys(), ...weightConditionsByFont.keys()]),
  );

  // Fetch font files - use local filesystem for node mode, GitLab API for web mode
  let fontFiles: { name: string; data: ArrayBuffer }[];
  if (space === "node" && fontDirectory) {
    fontFiles = await getFontFilesForValidationLocal(
      uniqueFontNames,
      fontDirectory,
    );
  } else {
    fontFiles = await getFontFilesForValidation(uniqueFontNames);
  }
  const fontFileMap = new Map(fontFiles.map((f) => [f.name, f.data]));

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
