/* eslint-disable @typescript-eslint/no-explicit-any */
import { read, utils } from "xlsx";
import Papa from "papaparse";

import {
  isFormMissing,
  isFontMissing,
  validatedCommas,
  validateExperimentDf,
} from "./experimentFileChecks";

import { FONT_FILES_MISSING_WEB } from "./errorMessages";
import {
  addUniqueLabelsToDf,
  populateUnderscoreValues,
  dataframeFromPapaParsed,
  getFontNameListBySource,
  getFormNames,
} from "./utilities";
import { EasyEyesError } from "./errorMessages";
import { splitIntoBlockFiles } from "./blockGen";
import { webFontChecker } from "./fontCheck";

export const preprocessExperimentFile = async (
  file: File,
  user: any,
  errors: EasyEyesError[],
  easyeyesResources: any,
  callback: any
) => {
  const completeCallback = (parsed: Papa.ParseResult<any>) => {
    prepareExperimentFileForThreshold(
      parsed,
      user,
      errors,
      easyeyesResources,
      callback,
      "web"
    );
  };

  if (file.name.includes("xlsx")) {
    const data = await file.arrayBuffer();
    const book = read(data, {
      type: "string",
    });

    for (const sheet in book.Sheets) {
      const csv: any = utils.sheet_to_csv(book.Sheets[sheet]);

      Papa.parse(csv, {
        skipEmptyLines: true,
        encoding: "UTF-8",
        complete: completeCallback,
      });
      // Only parse the very first sheet
      break;
    }
  } else
    Papa.parse(file, {
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: completeCallback,
    });
};

export const prepareExperimentFileForThreshold = async (
  parsed: Papa.ParseResult<any>,
  user: any,
  errors: any[],
  easyeyesResources: any,
  callback: any,
  space: string
) => {
  parsed.data = discardCommentedLines(parsed);
  // Recruitment
  if (
    parsed.data.find((i: string[]) => i[0] == "_participantRecruitmentService")
  ) {
    if (!user.currentExperiment) user.currentExperiment = {};
    user.currentExperiment.participantRecruitmentServiceName = parsed.data.find(
      (i: string[]) => i[0] == "_participantRecruitmentService"
    )?.[1];
  }
  if (
    parsed.data.find(
      (i: string[]) => i[0] == "_pavloviaOfferPilotingOptionBool"
    )
  ) {
    if (!user.currentExperiment) user.currentExperiment = {};
    user.currentExperiment.pavloviaOfferPilotingOptionBool =
      parsed.data.find(
        (i: string[]) => i[0] == "_pavloviaOfferPilotingOptionBool"
      )?.[1] == "TRUE";
  }
  // Validate requested fonts
  const requestedFontList: string[] = getFontNameListBySource(parsed, "file");
  const requestedFontListWeb: string[] = getFontNameListBySource(
    parsed,
    "google"
  );
  if (space === "web") {
    errors.push(...isFontMissing(requestedFontList, easyeyesResources.fonts));
    const error: any = await webFontChecker(requestedFontListWeb);
    if (!Array.isArray(error)) errors.push(error);
  }

  // Validate requested forms
  const requestedForms: any = getFormNames(parsed);
  if (space === "web" && requestedForms.consentForm)
    errors.push(
      ...isFormMissing(
        requestedForms.consentForm,
        easyeyesResources.forms,
        "_consentForm"
      )
    );
  if (space === "web" && requestedForms.debriefForm)
    errors.push(
      ...isFormMissing(
        requestedForms.debriefForm,
        easyeyesResources.forms,
        "_debriefForm"
      )
    );

  // Check that every row has the same number of values
  const unbalancedCommasError = validatedCommas(parsed);

  // Create a dataframe for easy data manipulation.
  let df = dataframeFromPapaParsed(parsed);

  // Run the compiler checks on our experiment
  try {
    errors.push(
      ...(unbalancedCommasError
        ? [unbalancedCommasError, ...validateExperimentDf(df)]
        : validateExperimentDf(df))
    );
  } catch (e) {
    console.error(e);
    if (unbalancedCommasError) errors.push(unbalancedCommasError);
  }

  df = addUniqueLabelsToDf(df);
  df = populateUnderscoreValues(df);

  /* --------------------------------- Errors --------------------------------- */
  if (errors.length) {
    // console.log("ERRORS", errors);
    callback(requestedForms, requestedFontList, [], errors);
  } else {
    callback(
      requestedForms,
      requestedFontList,
      splitIntoBlockFiles(df, space),
      []
    );
  }
};

const discardCommentedLines = (parsed: Papa.ParseResult<any>): string[][] => {
  const commentRegex = /^%/;
  const noncommentedRows = parsed.data.filter(
    (row) => !commentRegex.test(row[0].trim())
  );
  return noncommentedRows;
};
