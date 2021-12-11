/* eslint-disable @typescript-eslint/no-explicit-any */
import XLSX from "xlsx";
import Papa from "papaparse";

import { validatedCommas, validateExperimentDf } from "./experimentFileChecks";
import { addUniqueLabelsToDf, dataframeFromPapaParsed } from "./utilities";
import { EasyEyesError } from "./errorMessages";
import { splitIntoBlockFiles } from "./blockGen";

export const preprocessExperimentFile = async (
  file: File,
  user: any,
  errors: EasyEyesError[],
  callback: any
) => {
  const completeCallback = (parsed: Papa.ParseResult<any>) => {
    prepareExperimentFileForThreshold(parsed, user, errors, callback, "web");
  };

  if (file.name.includes("xlsx")) {
    const data = await file.arrayBuffer();
    const book = XLSX.read(data);

    for (const sheet in book.Sheets) {
      const csv: any = XLSX.utils.sheet_to_csv(book.Sheets[sheet]);
      Papa.parse(csv, {
        skipEmptyLines: true,
        complete: completeCallback,
      });
      // Only parse the very first sheet
      break;
    }
  } else
    Papa.parse(file, {
      dynamicTyping: false, // check out index 23; make sure null values preserve
      skipEmptyLines: true,
      complete: completeCallback,
    });
};

export const prepareExperimentFileForThreshold = (
  parsed: Papa.ParseResult<any>,
  user: any,
  errors: any[],
  callback: any,
  space: string
) => {
  // Recruitment
  if (
    parsed.data.find((i: string[]) => i[0] == "_participantRecruitmentService")
  ) {
    user.currentExperiment.participantRecruitmentServiceName = parsed.data.find(
      (i: string[]) => i[0] == "_participantRecruitmentService"
    )?.[1];
  }

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

  /* --------------------------------- Errors --------------------------------- */
  if (errors.length) {
    console.log("ERRORS", errors);
    callback([], errors);
  } else {
    callback(splitIntoBlockFiles(df, space), []);
  }
};
