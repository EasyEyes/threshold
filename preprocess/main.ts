/* eslint-disable @typescript-eslint/no-explicit-any */
import XLSX from "xlsx";
import Papa from "papaparse";

import { validatedCommas, validateExperimentDf } from "./experimentFileChecks";
import { addUniqueLabelsToDf, dataframeFromPapaParsed } from "./utilities";
import { EasyEyesError } from "./errorMessages";
import { splitIntoBlockFiles } from "./blockGen";

const userLocal: any = { current: null };
const errorsLocal: any = { current: null };
const callbackLocal: any = { current: null };

export const preprocessExperimentFile = async (
  file: File,
  user: any,
  errors: EasyEyesError[],
  callback: any
) => {
  if (file.name.includes("xlsx")) {
    const data = await file.arrayBuffer();
    const book = XLSX.read(data);

    userLocal.current = user;
    errorsLocal.current = errors;
    callbackLocal.current = callback;

    for (const sheet in book.Sheets) {
      const csv: any = XLSX.utils.sheet_to_csv(book.Sheets[sheet]);
      Papa.parse(csv, {
        skipEmptyLines: true,
        complete: prepareExperimentFileForThreshold,
      });
      // Only parse the very first sheet
      break;
    }
  } else
    Papa.parse(file, {
      dynamicTyping: false, // check out index 23; make sure null values preserve
      skipEmptyLines: true,
      complete: prepareExperimentFileForThreshold,
    });
};

const prepareExperimentFileForThreshold = (parsed: Papa.ParseResult<any>) => {
  // Recruitment
  if (
    parsed.data.find((i: string[]) => i[0] == "_participantRecruitmentService")
  ) {
    userLocal.current.currentExperiment.participantRecruitmentServiceName =
      parsed.data.find(
        (i: string[]) => i[0] == "_participantRecruitmentService"
      )?.[1];
  }

  // Check that every row has the same number of values
  const unbalancedCommasError = validatedCommas(parsed);

  // Create a dataframe for easy data manipulation.
  let df = dataframeFromPapaParsed(parsed);

  // Run the compiler checks on our experiment
  try {
    errorsLocal.current.push(
      ...(unbalancedCommasError
        ? [unbalancedCommasError, ...validateExperimentDf(df)]
        : validateExperimentDf(df))
    );
  } catch (e) {
    console.error(e);
    if (unbalancedCommasError) errorsLocal.current.push(unbalancedCommasError);
  }

  df = addUniqueLabelsToDf(df);

  /* --------------------------------- Errors --------------------------------- */
  console.log(errorsLocal.current);
  if (errorsLocal.current.length) {
    callbackLocal.current([], errorsLocal.current);
  } else {
    callbackLocal.current(splitIntoBlockFiles(df), []);
  }
};
