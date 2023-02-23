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
  dropFirstColumn,
} from "./utils";
import { EasyEyesError } from "./errorMessages";
import { splitIntoBlockFiles } from "./blockGen";
import { webFontChecker } from "./fontCheck";
import { getRequestedFoldersForStructureCheck } from "./folderStructureCheck";
import {
  convertLanguageToLanguageCode,
  getCompatibilityInfoForScientistPage,
  getCompatibilityRequirements,
} from "../components/compatibilityCheck.js";
import { compatibilityRequirements } from "./global";
import { durations, EstimateDurationForScientistPage } from "./getDuration";

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

  const fillCurrentExperiment = (field: string, parameterName: string) => {
    if (parsed.data.find((i: string[]) => i[0] === parameterName)) {
      user.currentExperiment[field] = parsed.data.find(
        (i: string[]) => i[0] === parameterName
      )?.[1];
    }
  };

  // ! Recruitment
  // Remove after all CSVs use the new _online1RecruitmentService named field. Maintaining backward compatibility.
  fillCurrentExperiment(
    "participantRecruitmentServiceName",
    "_participantRecruitmentService"
  );
  fillCurrentExperiment(
    "participantRecruitmentServiceName",
    "_online1RecruitmentService"
  );

  fillCurrentExperiment("titleOfStudy", "_online1Title");
  fillCurrentExperiment("descriptionOfStudy", "_online2Description");

  // Remove after all CSVs use the new _online2Minutes named field. Maintaining backward compatibility.
  fillCurrentExperiment(
    "_participantDurationMinutes",
    "_participantDurationMinutes"
  );
  fillCurrentExperiment("_participantDurationMinutes", "_online2Minutes");

  // Remove after all CSVs use the new _online2Participants named field. Maintaining backward compatibility.
  fillCurrentExperiment("_participantsHowMany", "_participantsHowMany");
  fillCurrentExperiment("_participantsHowMany", "_online2Participants");

  fillCurrentExperiment("_online5LanguageFluent", "_online5LanguageFluent");
  fillCurrentExperiment("_online5LanguageFirst", "_online5LanguageFirst");
  fillCurrentExperiment("_online3DeviceKind", "_online3DeviceKind");
  fillCurrentExperiment("_online3RequiredServices", "_online3RequiredServices");
  fillCurrentExperiment("_online2Pay", "_online2Pay");
  fillCurrentExperiment("_online2PayPerHour", "_online2PayPerHour");
  fillCurrentExperiment("_online4Location", "_online4Location");

  // ! if to streamline the science page
  // from compiling to uploading, to setting mode to running
  if (
    parsed.data.find((i: string[]) => i[0] === "_pavloviaPreferRunningModeBool")
  ) {
    user.currentExperiment.pavloviaPreferRunningModeBool =
      parsed.data.find(
        (i: string[]) => i[0] === "_pavloviaPreferRunningModeBool"
      )?.[1] === "TRUE";
  } else {
    user.currentExperiment.pavloviaPreferRunningModeBool = true;
  }

  // ! if the prolific account, if any, is in workspace mode or not
  // Remove after all CSVs use the new _online2Participants named field. Maintaining backward compatibility.
  if (parsed.data.find((i: string[]) => i[0] === "_prolificProjectID")) {
    // if there's a project id, the account is in workspace mode
    user.currentExperiment.prolificWorkspaceProjectId = parsed.data.find(
      (i: string[]) => i[0] === "_prolificProjectID"
    )?.[1];
    user.currentExperiment.prolificWorkspaceModeBool = true;
  } else {
    user.currentExperiment.prolificWorkspaceModeBool = false;
  }
  if (parsed.data.find((i: string[]) => i[0] === "_online2ProlificProjectID")) {
    // if there's a project id, the account is in workspace mode
    // ! prolificWorkspaceProjectId
    user.currentExperiment.prolificWorkspaceProjectId = parsed.data.find(
      (i: string[]) => i[0] === "_online2ProlificProjectID"
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
  const folderList: any = getFolderNames(parsed);
  const maskerAndTargetFolders: any = {
    maskerSoundFolder: folderList.maskerSoundFolder,
    targetSoundFolder: folderList.targetSoundFolder,
  };
  const missingFolderErrors: any = [];

  if (
    easyeyesResources.folders.length > 0 &&
    folderList.maskerSoundFolder.length > 0 &&
    folderList.targetSoundFolder.length > 0
  ) {
    missingFolderErrors.push(
      ...isSoundFolderMissing(maskerAndTargetFolders, easyeyesResources.folders)
    );
    errors.push(...missingFolderErrors);
  }

  const keys = Object.keys(maskerAndTargetFolders);
  const allRequestedFolderList: any[] = [];
  keys.map((key) => {
    maskerAndTargetFolders[key].forEach((requestedFolder: any) => {
      allRequestedFolderList.push(requestedFolder + ".zip");
    });
  });

  if (
    folderList.folderAndTargetKindObjectList.length > 0 &&
    missingFolderErrors.length === 0
  ) {
    const folderStructureErrors = await getRequestedFoldersForStructureCheck(
      folderList.folderAndTargetKindObjectList
    );
    if (folderStructureErrors.length > 0) {
      errors.push(...folderStructureErrors);
    }
  }
  // remove duplicates from allRequestedFolderList
  const requestedFolderList = allRequestedFolderList.filter(
    (item, index) => allRequestedFolderList.indexOf(item) === index
  );
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
    df = addNewUnderscoreParam(df, "_experimentFilename", filename);
  }
  df = addUniqueLabelsToDf(df);
  df = populateUnderscoreValues(df); // _params copied from Column B
  df = dropFirstColumn(df); // Conditions start in Column C
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
    durations.currentDuration = EstimateDurationForScientistPage(parsed);
    const durationInMin = Math.round(durations.currentDuration / 60);
    if (durationInMin > 1) {
      durations.durationForStatusline = durationInMin + " minutes";
    } else if (durationInMin == 1) {
      durations.durationForStatusline = durationInMin + " minute";
    } else {
      durations.durationForStatusline = "less than 1 minute";
    }
    console.log(durations.durationForStatusline);
    compatibilityRequirements.parsedInfo =
      getCompatibilityInfoForScientistPage(parsed);
    compatibilityRequirements.L = convertLanguageToLanguageCode(
      compatibilityRequirements.parsedInfo[
        "language" as keyof typeof compatibilityRequirements.parsedInfo
      ]
    );
    compatibilityRequirements.t = getCompatibilityRequirements(
      null,
      compatibilityRequirements.L,
      true,
      null,
      compatibilityRequirements.parsedInfo
    ).compatibilityRequirements[0];
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
