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
  iscalibrateDistanceCheckBoolValid,
  areEasyEyesLettersVersionParametersValid,
  isImpulseResponseMissing,
  validateImpulseResponseFile,
  checkImpulseResponsePairs,
  isFrequencyResponseMissing,
  validateFrequencyResponseFile,
  isImageFolderMissing,
  isTargetSoundListMissing,
  isBlockPresentAndProper,
  checkFontWeightAndWghtConflict,
  validateVariableFontSettings,
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
  getImageFolderNames,
  getTargetSoundListList,
  getReadingCorpusFoilsList,
} from "./utils";
import { normalizeExperimentDfShape } from "./transformExperimentTable";
import {
  EasyEyesError,
  PROLIFIC_TITLE_TOO_LONG,
  PROLIFIC_PARTICIPANT_GROUP_NOT_FOUND,
  PROLIFIC_API_ERROR,
} from "./errorMessages";
import { splitIntoBlockFiles } from "./blockGen";
import {
  processTypekitFonts,
  validateGoogleFontVariableSettings,
  webFontChecker,
} from "./fontCheck";
import {
  getImpulseResponseFiles,
  getFrequencyResponseFiles,
  getRequestedFoldersForStructureCheck,
} from "./folderStructureCheck";
import { getProlificToken } from "./gitlabUtils";
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

async function validateProlificParticipantGroupNames(user: any, errors: any[]) {
  // Validate Prolific participant group names
  const completionGroupName =
    user.currentExperiment._prolific2CompletionPathAddToGroup?.trim();
  const abortedGroupName =
    user.currentExperiment._prolific2AbortedAddToGroup?.trim();

  if (completionGroupName || abortedGroupName) {
    try {
      // Get Prolific token
      const prolificToken = await getProlificToken(user);

      if (prolificToken) {
        // Fetch participant groups from Netlify function
        const response = await fetch(
          `/.netlify/functions/prolific/participant-groups/`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              authorization: `Token ${prolificToken}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          const participantGroups = data?.results || [];

          // Check completion group
          if (completionGroupName) {
            const completionGroupExists = participantGroups.some(
              (g: any) =>
                g.name?.trim().toLowerCase() ===
                completionGroupName.toLowerCase(),
            );

            if (!completionGroupExists) {
              errors.push(
                PROLIFIC_PARTICIPANT_GROUP_NOT_FOUND(
                  "_prolific2CompletionPathAddToGroup",
                  completionGroupName,
                ),
              );
            }
          }

          // Check aborted group
          if (abortedGroupName) {
            const abortedGroupExists = participantGroups.some(
              (g: any) =>
                g.name?.trim().toLowerCase() === abortedGroupName.toLowerCase(),
            );

            if (!abortedGroupExists) {
              errors.push(
                PROLIFIC_PARTICIPANT_GROUP_NOT_FOUND(
                  "_prolific2AbortedAddToGroup",
                  abortedGroupName,
                ),
              );
            }
          }
        } else {
          // API error - add warning
          if (completionGroupName) {
            errors.push(
              PROLIFIC_API_ERROR(
                "_prolific2CompletionPathAddToGroup",
                `HTTP ${response.status}: ${response.statusText}`,
                completionGroupName,
              ),
            );
          }
          if (abortedGroupName) {
            errors.push(
              PROLIFIC_API_ERROR(
                "_prolific2AbortedAddToGroup",
                `HTTP ${response.status}: ${response.statusText}`,
                abortedGroupName,
              ),
            );
          }
        }
      }
    } catch (error: any) {
      // Network or other error - add warning
      if (completionGroupName) {
        errors.push(
          PROLIFIC_API_ERROR(
            "_prolific2CompletionPathAddToGroup",
            error.message || "Unknown error",
            completionGroupName,
          ),
        );
      }
      if (abortedGroupName) {
        errors.push(
          PROLIFIC_API_ERROR(
            "_prolific2AbortedAddToGroup",
            error.message || "Unknown error",
            abortedGroupName,
          ),
        );
      }
    }
  }
}

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

  // sanitize disabled columns early, before any validation or resource gathering can misread them.
  // this is our workaround/debugging tool for the "opt-out" conditionEnabled design flaw.
  parsed.data = applyConditionEnabledBugProcessing(parsed.data);

  // ! Validate block numbering, before dropping disabled conditions
  errors.push(...isBlockPresentAndProper(dataframeFromPapaParsed(parsed)));
  parsed.data = filterDisabledConditionsFromParsed(parsed.data);
  parsed.data = renumberBlocks(parsed.data);

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

  fillCurrentExperiment("_authors", "_authors");
  fillCurrentExperiment("_authorAffiliations", "_authorAffiliations");
  fillCurrentExperiment("_authorEmails", "_authorEmails");
  fillCurrentExperiment(
    "_calibrateMicrophonesBool",
    "_calibrateMicrophonesBool",
  );
  fillCurrentExperiment("_prolific2Aborted", "_prolific2Aborted");
  fillCurrentExperiment("_prolific2CompletionPath", "_prolific2CompletionPath");
  fillCurrentExperiment(
    "_prolific2CompletionPathAddToGroup",
    "_prolific2CompletionPathAddToGroup",
  );
  fillCurrentExperiment(
    "_prolific2AbortedAddToGroup",
    "_prolific2AbortedAddToGroup",
  );
  fillCurrentExperiment(
    "_saveSnapshotsBool",
    "_saveSnapshotsBool",
  )

  await validateProlificParticipantGroupNames(user, errors);

  const langItem = parsed.data.find((i: string[]) => i[0] === "_language");
  if (langItem) {
    user.currentExperiment._language = langItem[1] || "English";
  }

  if (parsed.data.find((i: string[]) => i[0] === "_stepperBool")) {
    user.currentExperiment._stepperBool =
      parsed.data.find((i: string[]) => i[0] === "_stepperBool")?.[1] ===
      "TRUE";
  }

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
    if (error.length > 0) errors.push(...error);
    if (typekitError.length > 0) errors.push(...typekitError);
  }

  // Validate Google font variable settings in both web and node modes
  if (!isCompiledFromArchiveBool) {
    const variableSettingsErrors =
      await validateGoogleFontVariableSettings(parsed);
    if (variableSettingsErrors.length > 0)
      errors.push(...variableSettingsErrors);
  }

  const calibrateDistanceCheckBool = parsed.data.find(
    (i: string[]) => i[0] === "calibrateDistanceCheckBool",
  );
  const calibrateDistanceBool = parsed.data.find(
    (i: string[]) => i[0] === "calibrateDistanceBool",
  );

  const wantsCalib =
    user.currentExperiment._calibrateMicrophonesBool
      ?.toString()
      .toUpperCase() === "TRUE";
  const hasAuthors = !!user.currentExperiment._authors?.trim();
  const hasAffils = !!user.currentExperiment._authorAffiliations?.trim();
  const hasEmails = !!user.currentExperiment._authorEmails?.trim();

  if (wantsCalib && !(hasAuthors && hasAffils && hasEmails)) {
    const falultyParameters = [];
    if (!hasAuthors) falultyParameters.push("_authors");
    if (!hasAffils) falultyParameters.push("_authorAffiliations");
    if (!hasEmails) falultyParameters.push("_authorEmails");
    errors.push({
      name: "_calibrateMicrophonesBool", // which field triggered
      message:
        "In order to set _calibrateMicrophonesBool=TRUE (which allows you to calibrate microphones), you must also specify _authors, _authorAffiliations, and _authorEmails.",
      hint: "",
      context: "prepareExperimentFileForThreshold", // where the check lives
      kind: "error", // severity
      parameters: falultyParameters, // which params are at fault
    });
  }
  if (
    calibrateDistanceCheckBool &&
    calibrateDistanceCheckBool.length &&
    calibrateDistanceBool &&
    calibrateDistanceBool.length
  )
    errors.push(
      ...iscalibrateDistanceCheckBoolValid(
        calibrateDistanceCheckBool,
        calibrateDistanceBool,
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

  const readingCorpusFoilsList = getReadingCorpusFoilsList(parsed);
  if (space === "web" && !isCompiledFromArchiveBool)
    errors.push(
      ...isTextMissing(
        readingCorpusFoilsList,
        easyeyesResources.texts || [],
        "readingCorpusFoils",
      ),
    );

  // add readingCorpusFoulsList to readingTextList
  readingCorpusFoilsList.forEach((foil: string) => {
    if (!requestedTextList.includes(foil)) {
      requestedTextList.push(foil);
    }
  });

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
    space === "web" &&
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

  const requestedTargetSoundLists: string[] = [];
  const targetSoundListList: {
    targetSoundList: string;
    column: string;
    targetSoundFolder: string;
    conditionTrials: string;
  }[] = getTargetSoundListList(parsed);
  const list = targetSoundListList.map((item) => item.targetSoundList);
  if (list.length > 0) requestedTargetSoundLists.push(...new Set(list));
  if (
    space === "web" &&
    !isCompiledFromArchiveBool &&
    folderList.folderAndTargetKindObjectList.length > 0 &&
    missingFolderErrors.length === 0 &&
    errors.length === 0
  ) {
    const { errors: folderStructureErrors, files: folderStructureFiles } =
      await getRequestedFoldersForStructureCheck(
        folderList.folderAndTargetKindObjectList,
      );
    if (folderStructureErrors.length > 0) {
      errors.push(...folderStructureErrors);
    } else {
      if (targetSoundListList.length > 0) {
        const e = await isTargetSoundListMissing(
          targetSoundListList,
          easyeyesResources.targetSoundLists || [],
          "targetSoundList",
          folderStructureFiles,
        );
        if (e.length > 0) {
          errors.push(...e);
        }
      }
    }
  }
  // remove duplicates from allRequestedFolderList
  const requestedFolderList = allRequestedFolderList.filter(
    (item, index) => allRequestedFolderList.indexOf(item) === index,
  );

  const imageFolders = getImageFolderNames(parsed);
  if (
    space === "web" &&
    !isCompiledFromArchiveBool &&
    imageFolders.targetImageFolderList.length > 0
  )
    errors.push(
      ...(await isImageFolderMissing(
        imageFolders,
        easyeyesResources.folders || [],
      )),
    );

  imageFolders.targetImageFolderList.forEach((imageFolder: any) => {
    requestedFolderList.push(imageFolder + ".zip");
  });
  // ! validate requested code files
  const requestedCodeList: any[] = getCodeList(parsed);
  if (space === "web" && !isCompiledFromArchiveBool)
    errors.push(
      ...isCodeMissing(requestedCodeList, easyeyesResources.code || []),
    );

  // Create a dataframe for easy data manipulation.
  let df = dataframeFromPapaParsed(parsed);

  // Run the compiler checks on our experiment
  try {
    errors.push(...validateExperimentDf(df));
  } catch (e) {
    console.error(e);
  }

  // Add block_condition labels, populate underscore params, drop first column, populate defaults
  df = normalizeExperimentDfShape(df);

  if (filename) {
    df = addNewInternalParam(df, "!experimentFilename", filename);
  }

  // Variable font checks
  errors.push(...checkFontWeightAndWghtConflict(df));
  if (!isCompiledFromArchiveBool) {
    // For node mode, use local "fonts" directory; for web mode, fetch from GitLab
    const fontDirectory = space === "node" ? "fonts" : undefined;
    const variableFontErrors = await validateVariableFontSettings(
      df,
      space,
      fontDirectory,
    );
    errors.push(...variableFontErrors);
  }

  // Validate _online1Title length (must be <= 120 characters for Prolific)
  if (
    user.currentExperiment.participantRecruitmentServiceName === "Prolific" &&
    user.currentExperiment.titleOfStudy &&
    user.currentExperiment.titleOfStudy.length > 120
  ) {
    errors.push(
      PROLIFIC_TITLE_TOO_LONG(user.currentExperiment.titleOfStudy.length, 120),
    );
  }

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
      requestedTargetSoundLists,
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
      requestedTargetSoundLists,
    );
  }
};

/**
 * when _conditionEnabledBug is "better" or "worse", this function sanitizes disabled columns
 * to help surface or mitigate bugs where EasyEyes code incorrectly processes disabled conditions.
 * "better" replaces with empty strings (harmless workaround), "worse" with "DISABLED" (bug detector).
 * block and conditionEnabledBool rows are preserved since they're needed for structure validation.
 */
const applyConditionEnabledBugProcessing = (data: string[][]): string[][] => {
  // underscore params live in column B (index 1), so we grab the value from there
  const conditionEnabledBugRow = data.find(
    (row: string[]) => row[0] === "_conditionEnabledBug",
  );
  const bugMode = conditionEnabledBugRow?.[1]?.trim().toLowerCase() || "normal";

  // "normal" means leave everything as-is, preserving current behavior
  if (bugMode === "normal") return data;

  // we need conditionEnabledBool to know which columns are disabled
  const conditionEnabledBoolRow = data.find(
    (row: string[]) => row[0] === "conditionEnabledBool",
  );
  if (!conditionEnabledBoolRow) return data;

  // columns with conditionEnabledBool=FALSE are the ones we want to sanitize
  const disabledColumnIndices: number[] = conditionEnabledBoolRow
    .slice(1) // skip param name in column A
    .map((value: string, index: number) => ({
      value,
      columnIndex: index + 1,
    }))
    .filter(({ value }) => value?.trim().toUpperCase() === "FALSE")
    .map(({ columnIndex }) => columnIndex);

  // nothing to do if no columns are disabled
  if (disabledColumnIndices.length === 0) return data;

  // "worse" uses "DISABLED" to provoke errors and surface bugs in the compiler;
  // "better" uses empty string as a quiet workaround until those bugs are fixed
  const replacementValue = bugMode === "worse" ? "DISABLED" : "";

  // these rows define the experiment structure and must remain intact for validation
  const structuralRows = new Set(["block", "conditionEnabledBool"]);

  return data.map((row: string[]) => {
    const parameterName = row[0];
    // structural rows stay unchanged so block numbering and disable detection still work
    if (structuralRows.has(parameterName)) {
      return row;
    }
    return row.map((cellValue, colIndex) => {
      // only replace cells in disabled columns
      if (disabledColumnIndices.includes(colIndex)) {
        return replacementValue;
      }
      return cellValue;
    });
  });
};

/**
 * Filter out disabled conditions from parsed data by removing columns where
 * conditionEnabledBool === "FALSE". This ensures disabled conditions don't
 * affect resource validation or compiled output.
 * @param parsed - PapaParse result with experiment data
 * @returns Filtered parsed data with disabled condition columns removed
 */
const filterDisabledConditionsFromParsed = (data: string[][]): string[][] => {
  const conditionEnabledBoolRow = data.find(
    (row: string[]) => row[0] === "conditionEnabledBool",
  );
  if (!conditionEnabledBoolRow) return data;
  const isConditionEnabled = (value: string): boolean =>
    !value || !value.trim() || value.trim().toUpperCase() !== "FALSE";
  const enabledConditionIndices = [
    0,
    ...conditionEnabledBoolRow
      .slice(1)
      .map((value: string, index: number) => ({
        value,
        columnIndex: index + 1,
      }))
      .filter(({ value }: { value: string }) => isConditionEnabled(value))
      .map(({ columnIndex }: { columnIndex: number }) => columnIndex),
  ];
  const filteredData = data.map((row: string[]) =>
    enabledConditionIndices.map((colIndex) => row[colIndex] || ""),
  );
  return filteredData;
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

const renumberBlocks = (data: string[][]): string[][] => {
  const blockRowIndex = data.findIndex((row) => row[0] === "block");
  if (blockRowIndex === -1) return data;

  const blockRow = data[blockRowIndex];
  const uniqueBlocks = [...new Set(blockRow.slice(1).filter(Boolean))];
  const blockMap = new Map(uniqueBlocks.map((b, i) => [b, String(i + 1)]));

  data[blockRowIndex] = [
    blockRow[0],
    ...blockRow.slice(1).map((b) => blockMap.get(b) || b),
  ];
  return data;
};
