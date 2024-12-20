/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
/* eslint-disable no-prototype-builtins */
/**
 * @file Validate a Threshold experiment file
 */

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
} from "./utils";
import { normalizeExperimentDfShape } from "./transformExperimentTable";

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

  // Enforce using Column B for the underscore parameters, and Column C and on for conditions
  errors.unshift(...doConditionsBeginInTheSecondColumn(experimentDf));

  // Check for properly formatted _param values, and populate underscore param values to all columns
  errors.push(...checkUnderscoreParams(experimentDf));

  // Check for properly formatted "block" parameter values (check before populating defaults)
  errors.push(...isBlockPresentAndProper(experimentDf));

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
      "needEasyEyesKeypadBeyondCm",
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

const isBlockPresentAndProper = (df: any): EasyEyesError[] => {
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
            isNumeric(s) && Number.isInteger(Number(s));
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
  const keypadDistances = getColumnValuesOrDefaults(
    df,
    "needEasyEyesKeypadBeyondCm",
  );
  // Finding those problematic conditions which...
  const conditionsWithoutResponse: number[] = [];
  conditions.forEach((row: string[], i: number) => {
    // ... don't have a modality explictly allowed by the experimenter
    const [viewingDistanceDesiredCm, needEasyEyesKeypadBeyondCm] = [
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
        viewingDistanceDesiredCm > needEasyEyesKeypadBeyondCm
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

export const isSoundFolderMissing = (
  requestedFolderList: any,
  existingFolderList: string[],
): EasyEyesError[] => {
  const errorList: EasyEyesError[] = [];

  // for(const requestedFolder of requestedFolderList){
  //   if(!existingFolderList.includes(requestedFolder)){
  //     errorList.push(SOUND_FOLDER_MISSING(requestedFolder));
  //   }
  // }
  // console.log("requestedFolderList", requestedFolderList);
  // console.log("existingFolderList", existingFolderList);

  const keys = Object.keys(requestedFolderList);
  const missingFolderList: any[] = [];
  keys.map((key) => {
    requestedFolderList[key].forEach((requestedFolder: any) => {
      if (!existingFolderList.includes(requestedFolder + ".zip")) {
        // console.log(requestedFolder+".zip")
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
  EasyEyesLettersVersion: [],
  spacingRelationToSize: [],
  spacingDirection: [],
  spacingSymmetry: [],
): EasyEyesError[] => {
  const errorList: EasyEyesError[] = [];

  for (let i = 2; i < EasyEyesLettersVersion.length; i++) {
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
  exisitingImageList: string[],
): EasyEyesError[] => {
  const errorList: EasyEyesError[] = [];
  const missingImageList: string[] = [];
  for (let i = 0; i < requestedImageList.length; i++) {
    if (
      !exisitingImageList.includes(requestedImageList[i]) &&
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
): EasyEyesError[] => {
  const errorList: EasyEyesError[] = [];
  const missingText = new Set();

  for (const requested of requestedTextList) {
    if (!existingTextList.includes(requested)) missingText.add(requested);
  }

  if (missingText.size > 0) {
    errorList.push(
      TEXT_FILES_MISSING("readingCorpus", Array.from(missingText) as string[]),
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
  return errors;
};

const _checkThresholdAllowedTrialsOverRequestedGEOne = (
  experimentDf: any,
): EasyEyesError[] => {
  const presentParameters: string[] = experimentDf?.listColumns();
  if (
    !presentParameters ||
    !presentParameters.includes("thresholdAllowedTrialsReRequested")
  )
    return [];
  const thresholdAllowedTrialsReRequested = getColumnValues(
    experimentDf,
    "thresholdAllowedTrialsReRequested",
  );
  const lessThanOne: [string, number][] = [];
  thresholdAllowedTrialsReRequested.forEach((t, i) => {
    if (Number(t) < 1) {
      lessThanOne.push([t, i]);
    }
  });
  if (!lessThanOne.length) return [];
  return [THRESHOLD_ALLOWED_TRIALS_OVER_REQUESTED_LT_ONE(lessThanOne)];
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
  const offendingMask = readingCorpuses.map(
    (s, i) => readingMask[i] && s === "",
  );
  const offendingConditions = offendingMask
    .map((b, i) => i)
    .filter((i) => offendingMask[i]);
  if (!offendingConditions.length) return [];
  return [CORPUS_NOT_SPECIFIED_FOR_READING_TASK(offendingConditions)];
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
  const needEasyEyesKeypadBeyondCm = getColumnValuesOrDefaults(
    df,
    "needEasyEyesKeypadBeyondCm",
  );
  const needKeypad = viewingDistanceDesiredCm.map(
    (v, i) => Number(v) > Number(needEasyEyesKeypadBeyondCm[i]),
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
