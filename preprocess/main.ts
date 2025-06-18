/* eslint-disable @typescript-eslint/no-explicit-any */
import { read, utils } from "xlsx";
import Papa from "papaparse";

import {
  isFormMissing,
  isFontMissing,
  validatedCommas,
  validateExperimentDf,
  isTextMissing,
  isSoundFolderMissing,
  isCodeMissing,
  getResponseTypedEasyEyesKeypadBool,
  isImageMissing,
  isViewMonitorsXYDegValid,
  isCalibrateTrackDistanceCheckBoolValid,
  areEasyEyesLettersVersionParametersValid,
  isImpulseResponseMissing,
  validateImpulseResponseFile,
  checkImpulseResponsePairs,
  isFrequencyResponseMissing,
  validateFrequencyResponseFile,
} from "./experimentFileChecks";

import {
  dataframeFromPapaParsed,
  getFontNameListBySource,
  getFormNames,
  getTextList,
  getCodeList,
  addNewUnderscoreParam,
  getFolderNames,
  addNewInternalParam,
  getImageNames,
  getColumnValuesOrDefaults,
  getImpulseResponseList,
  getFrequencyResponseList,
  getDesiredSamplingRate,
} from "./utils";
import { normalizeExperimentDfShape } from "./transformExperimentTable";
import { EasyEyesError } from "./errorMessages";
import { splitIntoBlockFiles } from "./blockGen";
import { processTypekitFonts, webFontChecker } from "./fontCheck";
import {
  getImpulseResponseFiles,
  getFrequencyResponseFiles,
  getRequestedFoldersForStructureCheck,
} from "./folderStructureCheck";
import {
  convertLanguageToLanguageCode,
  getCompatibilityInfoForScientistPage,
  getCompatibilityRequirements,
} from "../components/compatibilityCheck.js";
import { compatibilityRequirements } from "./global";
import { durations, EstimateDurationForScientistPage } from "./getDuration";
import { userRepoFiles } from "./constants";

export const preprocessExperimentFile = async (
  file: File,
  user: any,
  errors: EasyEyesError[],
  easyeyesResources: any,
  isCompiledFromArchiveBool: boolean,
  callback: any,
) => {
  const completeCallback = (parsed: Papa.ParseResult<any>) => {
    prepareExperimentFileForThreshold(
      parsed,
      user,
      errors,
      easyeyesResources,
      callback,
      "web",
      isCompiledFromArchiveBool,
      file.name,
    );
  };

  if (file.name.includes("xlsx")) {
    const data = await file.arrayBuffer();
    // Peiling 1110: Not sure if this works.
    const book = read(new Uint8Array(data), {
      type: "array",
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
  isCompiledFromArchiveBool: boolean,
  filename?: string,
  isLocal: boolean = false,
) => {
  parsed.data = discardCommentedLines(parsed);
  parsed.data = discardTrailingWhitespaceLines(parsed);
  parsed.data = discardTrailingWhitespaceColumns(parsed);

  if (!user.currentExperiment) user.currentExperiment = {}; // ? do we need it

  const fillCurrentExperiment = (field: string, parameterName: string) => {
    if (parsed.data.find((i: string[]) => i[0] === parameterName)) {
      user.currentExperiment[field] = parsed.data.find(
        (i: string[]) => i[0] === parameterName,
      )?.[1];
    }
  };

  // ! Recruitment
  // Remove after all CSVs use the new _online1RecruitmentService named field. Maintaining backward compatibility.
  fillCurrentExperiment(
    "participantRecruitmentServiceName",
    "_participantRecruitmentService",
  );
  fillCurrentExperiment(
    "participantRecruitmentServiceName",
    "_online1RecruitmentService",
  );

  fillCurrentExperiment("titleOfStudy", "_online1Title");
  fillCurrentExperiment("descriptionOfStudy", "_online2Description");
  fillCurrentExperiment("_online1InternalName", "_online1InternalName");

  // Remove after all CSVs use the new _online2Minutes named field. Maintaining backward compatibility.
  fillCurrentExperiment(
    "_participantDurationMinutes",
    "_participantDurationMinutes",
  );
  fillCurrentExperiment("_participantDurationMinutes", "_online2Minutes");

  // Remove after all CSVs use the new _online2Participants named field. Maintaining backward compatibility.
  fillCurrentExperiment("_participantsHowMany", "_participantsHowMany");
  fillCurrentExperiment("_participantsHowMany", "_online2Participants");
  fillCurrentExperiment(
    "_pavlovia_Database_ResultsFormatBool",
    "_pavlovia_Database_ResultsFormatBool",
  );

  fillCurrentExperiment("_online5LanguageFluent", "_online5LanguageFluent");
  fillCurrentExperiment("_online5LanguageFirst", "_online5LanguageFirst");
  fillCurrentExperiment("_online5LanguagePrimary", "_online5LanguagePrimary");
  fillCurrentExperiment("_online3DeviceKind", "_online3DeviceKind");
  fillCurrentExperiment("_online3RequiredServices", "_online3RequiredServices");
  fillCurrentExperiment("_online2Pay", "_online2Pay");
  fillCurrentExperiment("_online2PayPerHour", "_online2PayPerHour");
  fillCurrentExperiment("_online4Location", "_online4Location");
  fillCurrentExperiment("_online4CustomAllowList", "_online4CustomAllowList");
  fillCurrentExperiment("_online4CustomBlockList", "_online4CustomBlockList");
  fillCurrentExperiment(
    "_online3PhoneOperatingSystem",
    "_online3PhoneOperatingSystem",
  );
  fillCurrentExperiment("_online5Vision", "_online5Vision");
  fillCurrentExperiment("_online5Dyslexia", "_online5Dyslexia");
  fillCurrentExperiment(
    "_online5HearingDifficulties",
    "_online5HearingDifficulties",
  );
  fillCurrentExperiment(
    "_online5MusicalInstrumentExperience",
    "_online5MusicalInstrumentExperience",
  );
  fillCurrentExperiment(
    "_online5LanguageRelatedDisorders",
    "_online5LanguageRelatedDisorders",
  );
  fillCurrentExperiment("_online5CochlearImplant", "_online5CochlearImplant");

  fillCurrentExperiment("_online5LanguageFluent", "_prolific4LanguageFluent");
  fillCurrentExperiment("_online5LanguageFirst", "_prolific4LanguageFirst");
  fillCurrentExperiment("_online5LanguagePrimary", "_prolific4LanguagePrimary");
  fillCurrentExperiment("_online3DeviceKind", "_prolific2DeviceKind");
  fillCurrentExperiment(
    "_online3RequiredServices",
    "_prolific2RequiredServices",
  );
  fillCurrentExperiment("_online4Location", "_prolific3Location");
  fillCurrentExperiment("_online4CustomAllowList", "_prolific3CustomAllowList");
  fillCurrentExperiment("_online4CustomBlockList", "_prolific3CustomBlockList");
  fillCurrentExperiment(
    "_online3PhoneOperatingSystem",
    "_prolific4PhoneOperatingSystem",
  );
  fillCurrentExperiment("_online5Vision", "_prolific4Vision");
  fillCurrentExperiment("_online5Dyslexia", "_prolific4Dyslexia");
  fillCurrentExperiment(
    "_online5HearingDifficulties",
    "_prolific4HearingDifficulties",
  );
  fillCurrentExperiment(
    "_online5MusicalInstrumentExperience",
    "_prolific4MusicalInstrumentExperience",
  );
  fillCurrentExperiment(
    "_online5LanguageRelatedDisorders",
    "_prolific4LanguageRelatedDisorders",
  );
  fillCurrentExperiment("_online5CochlearImplant", "_prolific4CochlearImplant");
  fillCurrentExperiment("_online5VRExperiences", "_prolific4VRExperiences");
  fillCurrentExperiment("_online5VRHeadset", "_prolific4VRHeadsetOwnership");
  fillCurrentExperiment(
    "_online5VRHeadsetUsage",
    "_prolific4VRHeadsetFrequency",
  );
  fillCurrentExperiment(
    "_online5VisionCorrection",
    "_prolific4VisionCorrection",
  );

  // ! if to streamline the science page
  // from compiling to uploading, to setting mode to running
  if (
    parsed.data.find((i: string[]) => i[0] === "_pavloviaPreferRunningModeBool")
  ) {
    user.currentExperiment.pavloviaPreferRunningModeBool =
      parsed.data.find(
        (i: string[]) => i[0] === "_pavloviaPreferRunningModeBool",
      )?.[1] === "TRUE";
  } else {
    user.currentExperiment.pavloviaPreferRunningModeBool = true;
  }

  // ! if the prolific account, if any, is in workspace mode or not
  // Remove after all CSVs use the new _online2Participants named field. Maintaining backward compatibility.
  if (parsed.data.find((i: string[]) => i[0] === "_prolificProjectID")) {
    // if there's a project id, the account is in workspace mode
    user.currentExperiment.prolificWorkspaceProjectId = parsed.data.find(
      (i: string[]) => i[0] === "_prolificProjectID",
    )?.[1];
    user.currentExperiment.prolificWorkspaceModeBool = true;
  } else {
    user.currentExperiment.prolificWorkspaceModeBool = false;
  }
  if (parsed.data.find((i: string[]) => i[0] === "_online2ProlificProjectID")) {
    // if there's a project id, the account is in workspace mode
    // ! prolificWorkspaceProjectId
    user.currentExperiment.prolificWorkspaceProjectId = parsed.data.find(
      (i: string[]) => i[0] === "_online2ProlificProjectID",
    )?.[1];
    user.currentExperiment.prolificWorkspaceModeBool = true;
  } else if (
    parsed.data.find((i: string[]) => i[0] === "_prolific1ProjectID")
  ) {
    // if there's a project id, the account is in workspace mode
    // ! prolificWorkspaceProjectId
    user.currentExperiment.prolificWorkspaceProjectId = parsed.data.find(
      (i: string[]) => i[0] === "_prolific1ProjectID",
    )?.[1];
    user.currentExperiment.prolificWorkspaceModeBool = true;
  } else {
    user.currentExperiment.prolificWorkspaceModeBool = false;
  }

  const _pavloviaNewExperimentBoolValue = parsed.data.find(
    (i: string[]) => i[0] === "_pavloviaNewExperimentBool",
  )?.[1];
  user.currentExperiment._pavloviaNewExperimentBool =
    _pavloviaNewExperimentBoolValue &&
    _pavloviaNewExperimentBoolValue.toLocaleLowerCase() === "false"
      ? false
      : true;

  //validate viewMonitorsXYDeg
  const viewMonitorsXYDeg = parsed.data.find(
    (i: string[]) => i[0] === "viewMonitorsXYDeg",
  );
  if (viewMonitorsXYDeg && viewMonitorsXYDeg.length > 0) {
    errors.push(...isViewMonitorsXYDegValid(viewMonitorsXYDeg));
  }

  // ! Validate requested fonts
  const requestedFontList: string[] = getFontNameListBySource(
    parsed,
    "file",
  ).fontList;
  const requestedFontListWeb: string[] = getFontNameListBySource(
    parsed,
    "google",
  ).fontList;
  const typekitFonts = getFontNameListBySource(parsed, "adobe");
  const requestedTypekitFonts: string[] = typekitFonts.fontList;
  const typekitFontColumnMap = typekitFonts.fontColumnMap;

  if (space === "web" && !isCompiledFromArchiveBool) {
    errors.push(
      ...isFontMissing(requestedFontList, easyeyesResources.fonts || []),
    );
    const error: any = await webFontChecker(requestedFontListWeb);
    const name = filename ? filename.split(".")[0] : "experiment";
    const typekitError: any = await processTypekitFonts(
      requestedTypekitFonts,
      typekitFontColumnMap,
      name,
    );
    if (!Array.isArray(error)) errors.push(error);
    if (!Array.isArray(typekitError)) errors.push(typekitError);
  }

  const calibrateTrackDistanceCheckBool = parsed.data.find(
    (i: string[]) => i[0] === "calibrateTrackDistanceCheckBool",
  );
  const calibrateTrackDistanceBool = parsed.data.find(
    (i: string[]) => i[0] === "calibrateTrackDistanceBool",
  );

  if (
    calibrateTrackDistanceCheckBool &&
    calibrateTrackDistanceCheckBool.length &&
    calibrateTrackDistanceBool &&
    calibrateTrackDistanceBool.length
  )
    errors.push(
      ...isCalibrateTrackDistanceCheckBoolValid(
        calibrateTrackDistanceCheckBool,
        calibrateTrackDistanceBool,
      ),
    );

  // ! Validate requested forms
  const requestedForms: any = getFormNames(parsed);
  if (
    space === "web" &&
    requestedForms.consentForm &&
    !isCompiledFromArchiveBool
  )
    errors.push(
      ...isFormMissing(
        requestedForms.consentForm,
        easyeyesResources.forms || [],
        "_consentForm",
      ),
    );
  if (
    space === "web" &&
    requestedForms.debriefForm &&
    !isCompiledFromArchiveBool
  )
    errors.push(
      ...isFormMissing(
        requestedForms.debriefForm,
        easyeyesResources.forms || [],
        "_debriefForm",
      ),
    );

  // ! Validate requested text
  const requestedTextList: any[] = getTextList(parsed);
  if (space === "web" && !isCompiledFromArchiveBool)
    errors.push(
      ...isTextMissing(requestedTextList, easyeyesResources.texts || []),
    );

  //validate requested images
  const requestedImageList: any[] = getImageNames(parsed);
  if (space === "web" && !isCompiledFromArchiveBool)
    errors.push(
      ...isImageMissing(requestedImageList, easyeyesResources.images || []),
    );

  // Check if both impulse response parameters are provided when needed
  errors.push(...checkImpulseResponsePairs(parsed));

  // validate requested impulse response files
  const requestedImpulseResponseList: any[] = getImpulseResponseList(parsed);
  if (
    space === "web" &&
    !isCompiledFromArchiveBool &&
    requestedImpulseResponseList.length > 0
  ) {
    const impulseResponseMissingErrors = isImpulseResponseMissing(
      requestedImpulseResponseList,
      easyeyesResources.impulseResponses || [],
      "impulse response files",
    );
    errors.push(...impulseResponseMissingErrors);
    if (impulseResponseMissingErrors.length === 0) {
      // Get the desired sampling rate from the experiment parameters
      const desiredSamplingRate = getDesiredSamplingRate(parsed);

      try {
        // Get full file content for impulse response files
        const impulseResponseFiles = await getImpulseResponseFiles(
          requestedImpulseResponseList,
        );

        // Validate each impulse response file
        for (const file of impulseResponseFiles) {
          const error = await validateImpulseResponseFile(
            file,
            desiredSamplingRate,
          );
          if (error) errors.push(error);
        }
      } catch (error) {
        console.error("Error validating impulse response files:", error);
      }
    }
  }

  // validate requested frequency response files
  const requestedFrequencyResponseList: any[] =
    getFrequencyResponseList(parsed);
  if (
    space === "web" &&
    !isCompiledFromArchiveBool &&
    requestedFrequencyResponseList.length > 0
  ) {
    const frequencyResponseMissingErrors = isFrequencyResponseMissing(
      requestedFrequencyResponseList,
      easyeyesResources.frequencyResponses || [],
      "frequency response files",
    );
    errors.push(...frequencyResponseMissingErrors);
    if (frequencyResponseMissingErrors.length === 0) {
      try {
        // Get full file content for frequency response files
        const frequencyResponseFiles = await getFrequencyResponseFiles(
          requestedFrequencyResponseList,
        );

        // Validate each frequency response file
        for (const file of frequencyResponseFiles) {
          const error = await validateFrequencyResponseFile(file);
          if (error) errors.push(error);
        }
      } catch (error) {
        console.error("Error validating frequency response files:", error);
      }
    }
  }

  // ! validate requested Folders;
  const folderList: any = getFolderNames(parsed);
  const maskerAndTargetFolders: any = {
    maskerSoundFolder: folderList.maskerSoundFolder,
    targetSoundFolder: folderList.targetSoundFolder,
  };
  const missingFolderErrors: any = [];
  if (
    !isCompiledFromArchiveBool &&
    !isLocal &&
    (folderList.maskerSoundFolder.length > 0 ||
      folderList.targetSoundFolder.length > 0)
  ) {
    missingFolderErrors.push(
      ...isSoundFolderMissing(
        maskerAndTargetFolders,
        easyeyesResources.folders || [],
      ),
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
    missingFolderErrors.length === 0 &&
    errors.length === 0
  ) {
    const folderStructureErrors = await getRequestedFoldersForStructureCheck(
      folderList.folderAndTargetKindObjectList,
    );
    if (folderStructureErrors.length > 0) {
      errors.push(...folderStructureErrors);
    }
  }
  // remove duplicates from allRequestedFolderList
  const requestedFolderList = allRequestedFolderList.filter(
    (item, index) => allRequestedFolderList.indexOf(item) === index,
  );

  // ! validate requested code files
  const requestedCodeList: any[] = getCodeList(parsed);
  if (space === "web" && !isCompiledFromArchiveBool)
    errors.push(
      ...isCodeMissing(requestedCodeList, easyeyesResources.code || []),
    );

  // TODO remove if we find no problems are caused by not validating commas
  // Check that every row has the same number of values
  // const unbalancedCommasError = validatedCommas(parsed);

  // Create a dataframe for easy data manipulation.
  let df = dataframeFromPapaParsed(parsed);

  // Run the compiler checks on our experiment
  try {
    errors.push(
      ...validateExperimentDf(df),
      // ...(unbalancedCommasError
      //   ? [unbalancedCommasError, ...validateExperimentDf(df)]
      //   : validateExperimentDf(df))
    );
  } catch (e) {
    console.error(e);
    // if (unbalancedCommasError) errors.push(unbalancedCommasError);
  }

  // Add block_condition labels, populate underscore params, drop first column, populate defaults
  df = normalizeExperimentDfShape(df);

  if (filename) {
    df = addNewInternalParam(df, "!experimentFilename", filename);
  }

  df = addNewInternalParam(
    df,
    "!responseTypedEasyEyesKeypadBool",
    getResponseTypedEasyEyesKeypadBool(df),
  );

  /* --------------------------------- Errors --------------------------------- */
  if (errors.length) {
    callback(
      user,
      requestedForms,
      requestedFontList,
      requestedTextList,
      requestedFolderList,
      requestedImageList,
      requestedCodeList,
      [],
      errors,
      requestedImpulseResponseList,
      requestedFrequencyResponseList,
    );
  } else {
    durations.currentDuration = EstimateDurationForScientistPage(parsed);
    if (parsed.data.find((i: string[]) => i[0] === "_online2Minutes")) {
      durations._online2Minutes = parsed.data.find(
        (i: string[]) => i[0] === "_online2Minutes",
      )?.[1];
    } else {
      durations._online2Minutes = "unknown";
    }
    const durationInMin = Math.round(durations.currentDuration / 60);
    durations.durationForStatusline =
      "EasyEyes=" +
      durationInMin +
      ", " +
      "_online2Minutes=" +
      durations._online2Minutes;
    compatibilityRequirements.parsedInfo =
      getCompatibilityInfoForScientistPage(parsed);
    compatibilityRequirements.L = convertLanguageToLanguageCode(
      compatibilityRequirements.parsedInfo[
        "language" as keyof typeof compatibilityRequirements.parsedInfo
      ],
    );
    compatibilityRequirements.t = getCompatibilityRequirements(
      null,
      compatibilityRequirements.L,
      true,
      null,
      compatibilityRequirements.parsedInfo,
    ).compatibilityRequirements[0];
    callback(
      user,
      requestedForms,
      requestedFontList,
      requestedTextList,
      requestedFolderList,
      requestedImageList,
      requestedCodeList,
      splitIntoBlockFiles(df, space),
      [],
      requestedImpulseResponseList,
      requestedFrequencyResponseList,
    );
  }
};

const discardCommentedLines = (parsed: Papa.ParseResult<any>): string[][] => {
  const commentRegex = /^%/;
  const noncommentedRows = parsed.data.filter(
    (row) => !commentRegex.test(row[0].trim()),
  );
  return noncommentedRows;
};

const discardTrailingWhitespaceLines = (
  parsed: Papa.ParseResult<any>,
): string[][] => {
  const nonwhitespaceRows = parsed.data.filter((row) =>
    row.some((x: any) => x),
  );
  return nonwhitespaceRows;
};

const discardTrailingWhitespaceColumns = (
  parsed: Papa.ParseResult<any>,
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
      row.slice(0, -fewestTrailingEmptyValues),
    );
  return parsed.data;
};
