/* eslint-disable @typescript-eslint/no-explicit-any */
import { read, utils } from "xlsx";
import Papa from "papaparse";

import {
  isFormMissing,
  isFontMissing,
  validatedCommas,
  validateExperimentDf,
  isTextMissing,
  populateDefaultValues,
  isSoundFolderMissing,
  isCodeMissing,
} from "./experimentFileChecks";

import { FONT_FILES_MISSING_WEB } from "./errorMessages";
import {
  addUniqueLabelsToDf,
  populateUnderscoreValues,
  dataframeFromPapaParsed,
  getFontNameListBySource,
  getFormNames,
  getTextList,
  getCodeList,
  addNewUnderscoreParam,
  getFolderNames,
} from "./utils";
import { EasyEyesError } from "./errorMessages";
import { splitIntoBlockFiles } from "./blockGen";
import { webFontChecker } from "./fontCheck";
import { getRequestedFoldersForStructureCheck } from "./folderStructureCheck";

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
      "web",
      file.name
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
  space: string,
  filename?: string
) => {
  parsed.data = discardTrailingWhitespaceLines(parsed);
  parsed.data = discardTrailingWhitespaceColumns(parsed);
  parsed.data = discardCommentedLines(parsed);

  if (!user.currentExperiment) user.currentExperiment = {}; // ? do we need it

  // ! Recruitment
  if (
    parsed.data.find((i: string[]) => i[0] == "_participantRecruitmentService")
  ) {
    user.currentExperiment.participantRecruitmentServiceName = parsed.data.find(
      (i: string[]) => i[0] == "_participantRecruitmentService"
    )?.[1];
  }

  // ! if to streamline the science page
  // from compiling to uploading, to setting mode to running
  if (
    parsed.data.find((i: string[]) => i[0] == "_pavloviaPreferRunningModeBool")
  ) {
    user.currentExperiment.pavloviaPreferRunningModeBool =
      parsed.data.find(
        (i: string[]) => i[0] == "_pavloviaPreferRunningModeBool"
      )?.[1] == "TRUE";
  } else {
    user.currentExperiment.pavloviaPreferRunningModeBool = true;
  }

  // ! if the prolific account, if any, is in workspace mode or not
  if (parsed.data.find((i: string[]) => i[0] == "_prolificProjectID")) {
    // if there's a project id, the account is in workspace mode
    user.currentExperiment.prolificWorkspaceProjectId = parsed.data.find(
      (i: string[]) => i[0] == "_prolificProjectID"
    )?.[1];
    user.currentExperiment.prolificWorkspaceModeBool = true;
  } else {
    user.currentExperiment.prolificWorkspaceModeBool = false;
  }

  // ! Validate requested fonts
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

  // ! Validate requested forms
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

  // ! Validate requested text
  const requestedTextList: any[] = getTextList(parsed);
  if (space === "web")
    errors.push(...isTextMissing(requestedTextList, easyeyesResources.texts));

  // ! validate requested Folders;
  // console.log("easyeyesResources.folders", easyeyesResources.folders)
  const folderList: any = getFolderNames(parsed);
  const maskerAndTargetFolders: any = {
    maskerSoundFolder: folderList.maskerSoundFolder,
    targetSoundFolder: folderList.targetSoundFolder,
  };
  if (
    easyeyesResources.folders.length > 0 &&
    folderList.maskerSoundFolder.length > 0 &&
    folderList.targetSoundFolder.length > 0
  )
    errors.push(
      ...isSoundFolderMissing(maskerAndTargetFolders, easyeyesResources.folders)
    );
  const keys = Object.keys(maskerAndTargetFolders);
  const requestedFolderList: any[] = [];
  keys.map((key) => {
    maskerAndTargetFolders[key].forEach((requestedFolder: any) => {
      requestedFolderList.push(requestedFolder + ".zip");
    });
  });

  if (folderList.folderAndTargetKindObjectList.length > 0) {
    const folderStructureErrors = await getRequestedFoldersForStructureCheck(
      folderList.folderAndTargetKindObjectList
    );
    if (folderStructureErrors.length > 0) {
      errors.push(...folderStructureErrors);
    }
  }
  // console.log("requestedFolderList", requestedFolderList);

  // ! validate requested code files
  const requestedCodeList: any[] = getCodeList(parsed);
  if (space === "web")
    errors.push(...isCodeMissing(requestedCodeList, easyeyesResources.code));

  // TODO remove if we find no problems are caused by not validating commas
  // Check that every row has the same number of values
  // const unbalancedCommasError = validatedCommas(parsed);

  // Create a dataframe for easy data manipulation.
  let df = dataframeFromPapaParsed(parsed);

  // Run the compiler checks on our experiment
  try {
    errors.push(
      ...validateExperimentDf(df)
      // ...(unbalancedCommasError
      //   ? [unbalancedCommasError, ...validateExperimentDf(df)]
      //   : validateExperimentDf(df))
    );
  } catch (e) {
    console.error(e);
    // if (unbalancedCommasError) errors.push(unbalancedCommasError);
  }

  if (filename) {
    const extensionOmitted = /(.*\/)*(.*)(\.csv|\.xlsx)/g;
    const experimentNameMatches = [...filename.matchAll(extensionOmitted)][0];
    const _experimentName = experimentNameMatches
      ? experimentNameMatches[experimentNameMatches.length - 2]
      : "";
    df = addNewUnderscoreParam(df, "_experimentName", _experimentName);
    df = addNewUnderscoreParam(df, "_experimentFilename", filename);
  }
  df = addUniqueLabelsToDf(df);
  df = populateUnderscoreValues(df);
  df = populateDefaultValues(df);

  /* --------------------------------- Errors --------------------------------- */
  if (errors.length) {
    // console.log("ERRORS", errors);
    callback(
      user,
      requestedForms,
      requestedFontList,
      requestedTextList,
      requestedFolderList,
      requestedCodeList,
      [],
      errors
    );
  } else {
    callback(
      user,
      requestedForms,
      requestedFontList,
      requestedTextList,
      requestedFolderList,
      requestedCodeList,
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

const discardTrailingWhitespaceLines = (
  parsed: Papa.ParseResult<any>
): string[][] => {
  const nonwhitespaceRows = parsed.data.filter((row) =>
    row.some((x: any) => x)
  );
  return nonwhitespaceRows;
};

const discardTrailingWhitespaceColumns = (
  parsed: Papa.ParseResult<any>
): string[][] => {
  const _numTrailingWhitespaces = (r: string[]) => {
    let v = [...r];
    let n = 0;
    while (v.pop() === "") n++;
    return n;
  };
  const trailingEmptyValues = parsed.data.map(_numTrailingWhitespaces);
  const fewestTrailingEmptyValues = Math.min(...trailingEmptyValues);
  if (fewestTrailingEmptyValues > 0)
    return parsed.data.map((row: string[]) =>
      row.slice(0, -fewestTrailingEmptyValues)
    );
  return parsed.data;
};
