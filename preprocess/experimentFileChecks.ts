/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
/* eslint-disable no-prototype-builtins */
/**
 * @file Validate a Threshold experiment file
 * ## Alphabetical parameters
 * ## Check for duplicate parameters
 * ## All parameters are recognized
 * ## All parameters present are implemented
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
} from "./errorMessages";
import { GLOSSARY, SUPER_MATCHING_PARAMS } from "../parameters/glossary";
import { isNumeric, levDist, arraysEqual } from "./utils";
// import { Modal } from "bootstrap";

let zeroIndexed: boolean;

export const validatedCommas = (
  parsed: Papa.ParseResult<string[]>
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
    (a, b) => rowLengths[Number(b)].length - rowLengths[Number(a)].length
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
        a.parameter === b.parameter ? 0 : a.parameter > b.parameter ? 1 : -1
      )
    );
  }
};

/**
 * Check that the experiment file is correctly structured; provide errors for any problems
 * @param {DateFrame} experimentDf dataframe-js dataframe of the experiment file content
 * @returns {Object[]} Array of all errors found with the experiment file
 */
export const validateExperimentDf = (experimentDf: any): EasyEyesError[] => {
  const parametersToCheck: string[] = [];
  const parameters = experimentDf.listColumns();
  let errors: EasyEyesError[] = [];

  // Check parameters are alphabetical
  const parametersArentAlphabetical = areParametersAlphabetical(parameters);
  if (parametersArentAlphabetical) errors.push(parametersArentAlphabetical);

  // Check validity of parameters
  parametersToCheck.push(...experimentDf.listColumns().sort());
  errors.push(...areParametersDuplicated(parametersToCheck));
  errors.push(...areAllPresentParametersRecognized(parametersToCheck));
  errors.push(...areAllPresentParametersCurrentlySupported(parametersToCheck));

  // Alphabetize experimentDf
  experimentDf = experimentDf.select(...parametersToCheck).restructure(
    experimentDf
      .select(...parametersToCheck)
      .listColumns()
      .sort()
  );

  // Check for properly formatted "block" parameter values
  errors.push(...isBlockPresentAndProper(experimentDf));

  // Check for properly formatted _param values
  let underscoreErrors: EasyEyesError[];
  [experimentDf, underscoreErrors] =
    checkAndCorrectUnderscoreParams(experimentDf);
  errors.push(...underscoreErrors);

  // Populate missing (non-underscore) values with defaults
  experimentDf = populateDefaultValues(experimentDf);

  // Check parameter values
  errors.push(...areParametersOfTheCorrectType(experimentDf));

  // Verify there is at least one response method turned on
  errors.push(...isResponsePossible(experimentDf));

  // Check that relevant parameters have unique values within blocks (ie one value per block)
  errors.push(
    ...areBlockUniqueValuesConsistent(experimentDf, [
      "viewingDistanceDesiredCm",
      "fixationLocationStrategy",
      "fixationLocationXScreen",
      "fixationLocationYScreen",
      "targetKind",
    ])
  );

  // Remove empty errors (FUTURE ought to be unnecessary, find root cause)
  errors = errors
    .filter((error) => error)
    .sort((errorA, errorB) =>
      errorA.parameters[0] > errorB.parameters[0] ? 1 : -1
    );
  return errors;
};

/**
 * Checks that the parameters of the experiment file are in alphabetical order
 * @param {String[]} parameters Array of parameters, as given by the experimenter
 * @returns {Object} Error message, if the parameters aren't in alphabetical order
 */
const areParametersAlphabetical = (
  parameters: string[]
): EasyEyesError | undefined => {
  const originalOrder = [...parameters];
  let previousParameter = originalOrder[0];
  for (let i = 1; i < originalOrder.length; i++) {
    if (originalOrder[i] < previousParameter) {
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
  parameters: string[]
): EasyEyesError[] => {
  const unrecognized: any[] = [];
  const recognized: string[] = [];

  const checkIfRecognized = (parameter: string): any => {
    if (!(parameter in GLOSSARY) && !_superMatching(parameter)) {
      unrecognized.push({
        name: parameter,
        closest: similarlySpelledCandidates(parameter, Object.keys(GLOSSARY)),
      });
    } else {
      recognized.push(parameter);
    }
  };

  parameters.forEach(checkIfRecognized);
  parameters.splice(0, parameters.length, ...recognized);

  return unrecognized.map(UNRECOGNIZED_PARAMETER);
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
  parameters: string[]
): EasyEyesError[] => {
  parameters = parameters.filter((parameter: any) =>
    GLOSSARY.hasOwnProperty(parameter)
  );
  const notYetSupported = parameters.filter(
    (parameter: any) => GLOSSARY[parameter]["availability"] !== "now"
  );

  parameters = parameters.filter(
    (parameter: any) => GLOSSARY[parameter]["availability"] === "now"
  );
  return notYetSupported.map(NOT_YET_SUPPORTED_PARAMETER);
};

const isBlockPresentAndProper = (df: any): EasyEyesError[] => {
  // Can't do other checks when "block" isn't even present
  const blockPresent: boolean = df.listColumns().includes("block");
  if (!blockPresent) return [NO_BLOCK_PARAMETER];

  // Array of the experiment-provided block values
  const blockValues = df
    .select("block")
    .toArray()
    .map((x: any) => Number(x[0]));
  // Array to accumulate the errors we encounter; to be returned
  const blockValueErrors: EasyEyesError[] = [];

  // Check the first value
  // TODO use paramReader -- handling booleans again here is hacky
  zeroIndexed =
    (df.listColumns().includes("zeroBasedNumberingBool") &&
      df.getRow(0).get("zeroBasedNumberingBool").toLowerCase() === "true") ||
    (df.listColumns().includes("_zeroBasedNumberingBool") &&
      df.getRow(0).get("_zeroBasedNumberingBool").toLowerCase() === "true");
  if (
    (!zeroIndexed && blockValues[0] !== 1) ||
    (zeroIndexed && blockValues[0] !== 0)
  ) {
    blockValueErrors.push(
      INVALID_STARTING_BLOCK(blockValues[0], zeroIndexed ? 0 : 1)
    );
  }

  // Check that each value is sequential
  let previous = blockValues[0];
  const nonsequentialValues: {
    value: number;
    previous: number;
    index: number;
  }[] = [];
  blockValues.forEach((value: number, i: number) => {
    if (value < previous || value - previous > 1) {
      nonsequentialValues.push({
        value: value,
        previous: previous,
        index: i,
      });
    }
    previous = value;
  });
  if (nonsequentialValues.length) {
    blockValueErrors.push(
      NONSEQUENTIAL_BLOCK_VALUE(nonsequentialValues, blockValues)
    );
  }
  return blockValueErrors;
};

const checkAndCorrectUnderscoreParams = (df: any): [any, EasyEyesError[]] => {
  const underscoreParams = df.listColumns().filter((s: string) => s[0] === "_");
  const underscoreDf = df.select(...underscoreParams);
  const offendingParams = underscoreParams.filter(
    (parameter: string): boolean => {
      const values = underscoreDf
        .select(parameter)
        .toArray()
        .map((x: string[]) => x[0]);
      return !_valueOnlyInFirstPosition(values, parameter);
    }
  );
  underscoreParams.forEach((p: string) => {
    df = df.withColumn(p, () => underscoreDf.select(p).toArray()[0][0]);
  });
  const errors: EasyEyesError[] = offendingParams.map(
    ILL_FORMED_UNDERSCORE_PARAM
  );
  return [df, errors];
};

const _valueOnlyInFirstPosition = (a: any[], parameter: string): boolean => {
  const unregulatedParameters = ["_about"];
  if (unregulatedParameters.includes(parameter)) return true;
  return !a.some(
    (value: any, i: number) => (i === 0 && !value) || (i !== 0 && value)
  );
};

export const populateDefaultValues = (df: any): any => {
  let populatedDf = df;
  df.listColumns().forEach((columnName: string) => {
    if (GLOSSARY.hasOwnProperty(columnName)) {
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
            .filter((x: any) => x)
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
      const populatedColumn = column.map((x) =>
        x === "" ? GLOSSARY[columnName].default : x
      );
      populatedDf = populatedDf.withColumn(
        columnName,
        (r: any, i: number) => populatedColumn[i]
      );
    }
  });
  return populatedDf;
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
      | "multicategorical",
    categories?: string[]
  ): void => {
    const notType = (s: string): boolean => !typeCheck(s);
    if (column.some(notType)) {
      let offendingValues = column
        .map((e: string, i: number) => {
          return { value: e, block: i };
        })
        .filter((d: { value: string; block: number }) => notType(d.value));
      if (correctType === "multicategorical")
        offendingValues = offendingValues.map((x) => {
          return {
            value: x.value
              .split(" ")
              .filter((s) => !categories?.includes(s))
              .join(" "),
            block: x.block,
          };
        });
      errors.push(
        INCORRECT_PARAMETER_TYPE(
          offendingValues,
          columnName,
          correctType,
          categories
        )
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
            .filter((x: any) => x)
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
          checkType(column, isNumeric, columnName, correctType);
          break;
        case "boolean":
          const isBool = (s: string): boolean =>
            s.toLowerCase() === "true" || s.toLowerCase() === "false";
          checkType(column, isBool, columnName, correctType);
          break;
        case "text":
          // TODO define what a failing, ie non-"text", value would be
          break;
        case "categorical":
          const validCategory = (s: string): boolean =>
            GLOSSARY[columnName]["categories"].includes(s);
          checkType(
            column,
            validCategory,
            columnName,
            correctType,
            GLOSSARY[columnName]["categories"] as string[]
          );
          break;
        case "multicategorical":
          const validMulti = (s: string): boolean =>
            s
              .split(" ")
              .filter((x) => x)
              .every((s) => GLOSSARY[columnName]["categories"].includes(s));
          checkType(
            column,
            validMulti,
            columnName,
            correctType,
            GLOSSARY[columnName]["categories"] as string[]
          );
          break;
        default:
          throw `Unrecognized type '${correctType}' used in the glossary. Please contact the EasyEyes team.`;
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
  numberOfCandidatesToReturn = 4
): string[] => {
  const closest = parameters.sort(
    (a: any, b: any) =>
      levDist(proposedParameter, a) - levDist(proposedParameter, b)
  );

  const candidates = closest.slice(0, numberOfCandidatesToReturn - 1);
  return candidates.map((c) => c.replace(/@/g, "9"));
};

const isResponsePossible = (df: any): EasyEyesError[] => {
  const responseMedia = [
    "responseClickedBool",
    "responseTypedBool",
    "responseTypedEasyEyesKeypadBool",
    "simulateParticipantBool",
  ];
  // Modalities the experimenter specified
  const includedMedia = responseMedia.filter((responseParameter: string) =>
    df.listColumns().includes(responseParameter)
  );
  // Those that they didn't
  const excludedMedia = responseMedia.filter(
    (responseParameter: string) => !df.listColumns().includes(responseParameter)
  );
  // Default values to use for the ones they didn't
  const defaults = excludedMedia.map(
    (modality: string) => GLOSSARY[modality].default as string
  );
  // The values for each included modality, for each condition of the experiment
  const conditions = df.select(...includedMedia).toArray();
  // Finding those problematic conditions which...
  const conditionsWithoutResponse: number[] = [];
  conditions.forEach((row: string[], conditionNumber: number) => {
    // ... don't have a modality explictly allowed by the experimenter
    if (
      !(
        row.some((bool: string) => bool.toLowerCase() === "true") ||
        // ... or a modality which is true by default
        excludedMedia.some(
          (__: string, i: number) => defaults[i].toLowerCase() === "true"
        )
      )
    )
      conditionsWithoutResponse.push(conditionNumber);
  });
  // Return an error if there are any offending conditions
  if (conditionsWithoutResponse.length)
    return [
      NO_RESPONSE_POSSIBLE(
        conditionsWithoutResponse,
        zeroIndexed,
        conditions.length
      ),
    ];
  return [];
};

export const _getDuplicateValuesAndIndicies = (
  l: any[]
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
  df: any
): boolean => {
  if (df.unique(targetColumn) !== df.select(targetColumn)) return false;
  return true;
};

export const isFormMissing = (
  requestedForm: string,
  existingFormList: string[],
  formType: string
): EasyEyesError[] => {
  const errorList: EasyEyesError[] = [];
  if (!existingFormList.includes(requestedForm)) {
    errorList.push(FORM_FILES_MISSING(formType, [requestedForm]));
  }

  return errorList;
};

export const isFontMissing = (
  requestedFontList: string[],
  existingFontList: string[]
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

export const isTextMissing = (
  requestedTextList: string[],
  existingTextList: string[]
): EasyEyesError[] => {
  const errorList: EasyEyesError[] = [];
  const missingText = new Set();

  for (const requested of requestedTextList) {
    if (!existingTextList.includes(requested)) missingText.add(requested);
  }

  if (missingText.size > 0) {
    errorList.push(
      TEXT_FILES_MISSING("readingCorpus", Array.from(missingText) as string[])
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
  blockLevelParameters: string[]
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
