/* eslint-disable @typescript-eslint/no-explicit-any */
import { read, utils } from "xlsx";
import Papa from "papaparse";

import {
  isFormMissing,
  isFontMissing,
  validatedCommas,
  validateExperimentDf,
  validateExperimentTable,
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
  validateFontFeatureAnalysis,
  checkReadingCorpusLength,
  isPhraseFileMissing,
} from "./experimentFileChecks";
import { validateFontShaping } from "./fontShapingCheck";
import { validateFontLanguageSupport } from "./fontLanguageCheck";
import { createFontDataCache } from "./fontDataCache";

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
  setConditionColumnMapping,
} from "./utils";
import { normalizeExperimentDfShape } from "./transformExperimentTable";
import {
  EasyEyesError,
  PROLIFIC_TITLE_TOO_LONG,
  PROLIFIC_CURRENCY_NOT_SUPPORTED,
  PROLIFIC_PARTICIPANT_GROUP_NOT_FOUND,
  PROLIFIC_API_ERROR,
  LOGGING_REQUIRES_AUTHOR_EMAIL,
  LOGGING_CAUTION,
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
import { readi18nPhrases } from "../components/readPhrases";
import { compatibilityRequirements } from "./global";
import { durations, EstimateDurationForScientistPage } from "./getDuration";
import { userRepoFiles, PROLIFIC_SUPPORTED_CURRENCIES } from "./constants";
import { getGlossary } from "../parameters/glossaryRegistry";
import { GitLabOAuthClient } from "./auth/gitlabOAuthClient";
import { getAuthConfig } from "./auth/config";
import { parsePhraseFile } from "../../source/components/parsePhraseFile";
import type { PhraseTable } from "../../source/components/parsePhraseFile";
import { selectPhraseSource } from "./selectPhraseSource";
import { resolveTildeValues } from "./resolveTildeValues";

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

// The logging parameters that cause the running experiment to POST reports to
// Formspree. _logTrialsBool is listed for the experimenter's awareness even
// though it is not yet implemented in the runtime.
const LOGGING_PARAMETERS = [
  "_logFontBool",
  "_logParticipantsBool",
  "_logTrialsBool",
];

const DEFAULT_FORMSPREE_MONTHLY_QUOTA = 20000;

/**
 * Best-effort lookup of how much of our monthly Formspree submission quota has
 * been used. Backed by the formspree-quota Netlify function, which holds the
 * Formspree API key. Any failure resolves to undefined so that the logging
 * caution warning still shows (just without the dynamic usage figure).
 */
const getFormspreeQuota = async (): Promise<
  { used: number; limit: number } | undefined
> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch("/.netlify/functions/formspree-quota", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return undefined;
    const data = await response.json();
    if (
      !data ||
      data.available === false ||
      typeof data.used !== "number" ||
      typeof data.limit !== "number"
    ) {
      return undefined;
    }
    return { used: data.used, limit: data.limit };
  } catch {
    return undefined;
  }
};

/**
 * If the experiment enables any logging parameter, (1) require _authorEmails so
 * that Formspree reports can be attributed and directed to the experimenter,
 * and (2) emit the (non-blocking) LOGGING CAUTION warning, enriched with the
 * current month's quota usage when available.
 */
const checkLoggingParameters = async (
  parsed: Papa.ParseResult<any>,
  user: any,
  errors: EasyEyesError[],
): Promise<void> => {
  const isTrue = (value: any): boolean =>
    typeof value === "string" && value.trim().toUpperCase() === "TRUE";

  const enabledLoggingParameters = LOGGING_PARAMETERS.filter(
    (parameterName) => {
      const row = parsed.data.find((i: string[]) => i[0] === parameterName);
      return !!row && isTrue(row[1]);
    },
  );

  if (enabledLoggingParameters.length === 0) return;

  const hasEmails = !!user.currentExperiment._authorEmails?.toString().trim();
  if (!hasEmails) {
    errors.push(LOGGING_REQUIRES_AUTHOR_EMAIL(enabledLoggingParameters));
  }

  const quota = await getFormspreeQuota();
  errors.push(LOGGING_CAUTION(enabledLoggingParameters, quota));
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
  try {
    // Column letters in error messages are relative to the original file until
    // disabled conditions are dropped below; start each run with no mapping.
    setConditionColumnMapping(undefined);

    parsed.data = discardCommentedLines(parsed);
    parsed.data = discardTrailingWhitespaceLines(parsed);
    parsed.data = discardTrailingWhitespaceColumns(parsed);

    // sanitize disabled columns early, before any validation or resource gathering can misread them.
    // this is our workaround/debugging tool for the "opt-out" conditionEnabled design flaw.
    parsed.data = applyConditionEnabledBugProcessing(parsed.data);

    // ! Validate block numbering, before dropping disabled conditions
    errors.push(...isBlockPresentAndProper(dataframeFromPapaParsed(parsed)));
    const filtered = filterDisabledConditionsFromParsed(parsed.data);
    parsed.data = filtered.data;
    // From here on, condition indices refer to the filtered table; let
    // column-letter reporting translate back to the original spreadsheet.
    setConditionColumnMapping(filtered.conditionColumnMapping);

    // Build immutable ExperimentTable + run ALL validation checks (pure, no mutation)
    const { ExperimentTable } = await import("./experimentTable");
    let table = new ExperimentTable(parsed.data);

    // Resolve ~tilde values before type validation
    const requestedPhraseFileName = table.colBOrDefault(
      "_languagePhrasesSpreadsheet",
    );
    let phraseTable: PhraseTable | undefined;
    let phraseSourceLanguageCode: string | undefined;
    if (requestedPhraseFileName) {
      const decision = selectPhraseSource(
        requestedPhraseFileName,
        isCompiledFromArchiveBool,
        (easyeyesResources?.phrases as File[]) || [],
      );
      let phraseFile: File | undefined;
      if (decision.kind === "use") {
        phraseFile = decision.file;
      } else if (
        decision.kind === "fetch" &&
        typeof easyeyesResources?.fetchPhraseFromRepo === "function"
      ) {
        phraseFile =
          (await easyeyesResources.fetchPhraseFromRepo(decision.name)) ??
          undefined;
        // Make the repo-fetched file visible to the later presence check too.
        if (phraseFile)
          easyeyesResources.phrases = [
            ...((easyeyesResources.phrases as File[]) || []),
            phraseFile,
          ];
      }
      if (phraseFile) {
        try {
          const parsed = await parsePhraseFile(phraseFile);
          phraseTable = parsed.phraseTable;
          phraseSourceLanguageCode = parsed.sourceLanguageCode;
        } catch (_e) {
          // parse failure — isPhraseFileMissing below will surface the error
        }
      }
    }
    let rawLanguage = table.colBOrDefault("_language");
    if (
      rawLanguage?.startsWith("~") &&
      phraseTable &&
      phraseSourceLanguageCode
    ) {
      const key = rawLanguage.slice(1).toLowerCase();
      const resolvedName = phraseTable.get(key)?.get(phraseSourceLanguageCode);
      if (resolvedName) rawLanguage = resolvedName;
    }
    const tildeLanguageCode = convertLanguageToLanguageCode(rawLanguage);
    const { resolved: tildeResolved, errors: tildeErrors } = resolveTildeValues(
      table,
      phraseTable,
      tildeLanguageCode,
    );
    table = tildeResolved;
    errors.push(...tildeErrors);

    try {
      errors.push(...validateExperimentTable(table));
    } catch (e) {
      console.error(e);
    }

    if (!user.currentExperiment) user.currentExperiment = {};

    const fillCurrentExperiment = (field: string, parameterName: string) => {
      const v = table.colB(parameterName);
      if (v) user.currentExperiment[field] = v;
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

    fillCurrentExperiment("_prolific4LanguageFluent", "_online5LanguageFluent");
    fillCurrentExperiment("_prolific4LanguageFirst", "_online5LanguageFirst");
    fillCurrentExperiment(
      "_prolific4LanguagePrimary",
      "_online5LanguagePrimary",
    );
    fillCurrentExperiment("_prolific2DeviceKind", "_online3DeviceKind");
    fillCurrentExperiment(
      "_prolific2RequiredServices",
      "_online3RequiredServices",
    );
    fillCurrentExperiment("_online2Pay", "_online2Pay");
    fillCurrentExperiment("_online2PayPerHour", "_online2PayPerHour");
    fillCurrentExperiment("_online2PayCurrencyCode", "_online2PayCurrencyCode");
    fillCurrentExperiment("_prolific3Location", "_online4Location");
    fillCurrentExperiment(
      "_prolific3CustomAllowList",
      "_online4CustomAllowList",
    );
    fillCurrentExperiment(
      "_prolific3CustomBlockList",
      "_online4CustomBlockList",
    );
    fillCurrentExperiment(
      "_prolific4PhoneOperatingSystem",
      "_online3PhoneOperatingSystem",
    );
    fillCurrentExperiment("_prolific4Vision", "_online5Vision");
    fillCurrentExperiment("_prolific4Dyslexia", "_online5Dyslexia");
    fillCurrentExperiment(
      "_prolific4HearingDifficulties",
      "_online5HearingDifficulties",
    );
    fillCurrentExperiment(
      "_prolific4MusicalInstrumentExperience",
      "_online5MusicalInstrumentExperience",
    );
    fillCurrentExperiment(
      "_prolific4LanguageRelatedDisorders",
      "_online5LanguageRelatedDisorders",
    );
    fillCurrentExperiment(
      "_prolific4CochlearImplant",
      "_online5CochlearImplant",
    );

    fillCurrentExperiment(
      "_prolific4LanguageFluent",
      "_prolific4LanguageFluent",
    );
    fillCurrentExperiment("_prolific4LanguageFirst", "_prolific4LanguageFirst");
    fillCurrentExperiment(
      "_prolific4LanguagePrimary",
      "_prolific4LanguagePrimary",
    );
    fillCurrentExperiment("_prolific2DeviceKind", "_prolific2DeviceKind");
    fillCurrentExperiment(
      "_prolific2RequiredServices",
      "_prolific2RequiredServices",
    );
    fillCurrentExperiment("_prolific3Location", "_prolific3Location");
    fillCurrentExperiment(
      "_prolific3CustomAllowList",
      "_prolific3CustomAllowList",
    );
    fillCurrentExperiment(
      "_prolific3CustomBlockList",
      "_prolific3CustomBlockList",
    );
    fillCurrentExperiment(
      "_prolific4PhoneOperatingSystem",
      "_prolific4PhoneOperatingSystem",
    );
    fillCurrentExperiment("_prolific4Vision", "_prolific4Vision");
    fillCurrentExperiment("_prolific4Dyslexia", "_prolific4Dyslexia");
    fillCurrentExperiment(
      "_prolific4HearingDifficulties",
      "_prolific4HearingDifficulties",
    );
    fillCurrentExperiment(
      "_prolific4MusicalInstrumentExperience",
      "_prolific4MusicalInstrumentExperience",
    );
    fillCurrentExperiment(
      "_prolific4LanguageRelatedDisorders",
      "_prolific4LanguageRelatedDisorders",
    );
    fillCurrentExperiment(
      "_prolific4CochlearImplant",
      "_prolific4CochlearImplant",
    );
    fillCurrentExperiment("_prolific4VRExperiences", "_prolific4VRExperiences");
    fillCurrentExperiment(
      "_prolific4VRHeadsetOwnership",
      "_prolific4VRHeadsetOwnership",
    );
    fillCurrentExperiment(
      "_prolific4VRHeadsetFrequency",
      "_prolific4VRHeadsetFrequency",
    );
    fillCurrentExperiment(
      "_prolific4VisionCorrection",
      "_prolific4VisionCorrection",
    );
    fillCurrentExperiment("_prolific3ApprovalRate", "_prolific3ApprovalRate");
    fillCurrentExperiment(
      "_prolific3StudyDistribution",
      "_prolific3StudyDistribution",
    );
    fillCurrentExperiment(
      "_prolific3ParticipantInPreviousStudyExclude",
      "_prolific3ParticipantInPreviousStudyExclude",
    );
    fillCurrentExperiment(
      "_prolific3ParticipantInPreviousStudyInclude",
      "_prolific3ParticipantInPreviousStudyInclude",
    );
    fillCurrentExperiment(
      "_prolific3AllowCompletedExperiment",
      "_prolific3AllowCompletedExperiment",
    );
    fillCurrentExperiment(
      "_prolific3AllowAfterHours",
      "_prolific3AllowAfterHours",
    );
    fillCurrentExperiment("_prolific2ScreenerSet", "_prolific2ScreenerSet");
    fillCurrentExperiment("_prolific2StudyLabel", "_prolific2StudyLabel");

    fillCurrentExperiment("_authors", "_authors");
    fillCurrentExperiment("_authorAffiliations", "_authorAffiliations");
    fillCurrentExperiment("_authorEmails", "_authorEmails");
    fillCurrentExperiment(
      "_calibrateMicrophonesBool",
      "_calibrateMicrophonesBool",
    );
    fillCurrentExperiment("_prolific2Aborted", "_prolific2Aborted");
    fillCurrentExperiment(
      "_prolific2CompletionPath",
      "_prolific2CompletionPath",
    );
    fillCurrentExperiment(
      "_prolific2CompletionPathAddToGroup",
      "_prolific2CompletionPathAddToGroup",
    );
    fillCurrentExperiment(
      "_prolific2AbortedAddToGroup",
      "_prolific2AbortedAddToGroup",
    );
    fillCurrentExperiment("_saveSnapshotsBool", "_saveSnapshotsBool");

    await validateProlificParticipantGroupNames(user, errors);

    user.currentExperiment._language = table.colBOrDefault("_language");
    // Direction of the experiment's _language, from the phrases'
    // EE_languageDirection map (e.g. ar → "RTL"). Stored dir-attribute-ready
    // ("rtl"/"ltr") and baked into js/experimentLanguage.js so the page can
    // set <body dir> before the experiment bundle loads.
    {
      const languageCode = convertLanguageToLanguageCode(
        user.currentExperiment._language,
      );
      let direction = "LTR";
      try {
        direction = readi18nPhrases("EE_languageDirection", languageCode);
      } catch {
        // Unknown language code — default to LTR.
      }
      user.currentExperiment.languageDirection =
        String(direction).toUpperCase() === "RTL" ? "rtl" : "ltr";
    }
    user.currentExperiment._stepperBool = table.colBBool("_stepperBool");
    user.currentExperiment.pavloviaPreferRunningModeBool = table.colBBool(
      "_pavloviaPreferRunningModeBool",
    );

    const prolificId =
      table.colB("_online2ProlificProjectID") ||
      table.colB("_prolific1ProjectID") ||
      table.colB("_prolificProjectID");
    if (prolificId) {
      user.currentExperiment.prolificWorkspaceProjectId = prolificId;
      user.currentExperiment.prolificWorkspaceModeBool = true;
    } else {
      user.currentExperiment.prolificWorkspaceModeBool = false;
    }

    user.currentExperiment._pavloviaNewExperimentBool = table.colBBool(
      "_pavloviaNewExperimentBool",
    );

    //validate viewMonitorsXYDeg
    const vmDeg = table.conditionValues("viewMonitorsXYDeg");
    if (vmDeg.length > 0 && vmDeg.some((v) => v !== "")) {
      errors.push(...isViewMonitorsXYDegValid(vmDeg));
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

    const calibrateDistanceCheckBool = table.conditionValues(
      "calibrateDistanceCheckBool",
    );
    const calibrateDistanceBool = table.conditionValues(
      "calibrateDistanceBool",
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

    // ! Logging (Formspree) checks: require experimenter email + caution warning
    await checkLoggingParameters(parsed, user, errors);
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

    // _stepperBool=FALSE is only allowed when _calibrateDistance includes "object" or "blindspot"
    const calibrateDistanceValue = table
      .colBOrDefault("_calibrateDistance")
      .toLowerCase();
    const stepperBoolValue = user.currentExperiment._stepperBool;
    const calibrateDistanceMethods = calibrateDistanceValue
      .split(",")
      .map((s: string) => s.trim());
    const allowsStepperFalse = calibrateDistanceMethods.some(
      (m: string) => m === "object" || m === "blindspot",
    );
    if (stepperBoolValue === false && !allowsStepperFalse) {
      errors.push({
        name: "_stepperBool requires compatible _calibrateDistance",
        message:
          `Setting _stepperBool=FALSE requires _calibrateDistance to be "object" or "blindspot" (not "paper" or "paperOrRuler"). ` +
          `Current _calibrateDistance value is "${calibrateDistanceValue}".`,
        hint: `Either set _stepperBool=TRUE, or change _calibrateDistance to "object" or "blindspot" (not "paper" or "paperOrRuler").`,
        context: "prepareExperimentFileForThreshold",
        kind: "error",
        parameters: ["_stepperBool", "_calibrateDistance"],
      });
    }

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
    const requestedTextList: any[] = getTextList(table);
    if (space === "web" && !isCompiledFromArchiveBool)
      errors.push(
        ...isTextMissing(requestedTextList, easyeyesResources.texts || []),
      );

    const readingCorpusFoilsList = getReadingCorpusFoilsList(table);
    if (space === "web" && !isCompiledFromArchiveBool)
      errors.push(
        ...isTextMissing(
          readingCorpusFoilsList,
          easyeyesResources.texts || [],
          "readingCorpusFoils",
        ),
      );

    // ! Validate requested phrase file
    const requestedPhraseFile: string =
      table.colBOrDefault("_languagePhrasesSpreadsheet") ?? "";
    if (space === "web" && !isCompiledFromArchiveBool)
      errors.push(
        ...isPhraseFileMissing(
          requestedPhraseFile,
          (easyeyesResources.phrases || []).map((f: File) => f.name),
        ),
      );

    // add readingCorpusFoulsList to readingTextList
    readingCorpusFoilsList.forEach((foil: string) => {
      if (!requestedTextList.includes(foil)) {
        requestedTextList.push(foil);
      }
    });

    // ! Validate reading corpus length
    // Check if corpus has enough characters for the requested pages
    if (easyeyesResources.textContents) {
      errors.push(
        ...checkReadingCorpusLength(
          dataframeFromPapaParsed(parsed),
          easyeyesResources.textContents as Record<string, string>,
        ),
      );
    }

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
          const _irClient = GitLabOAuthClient.loadFromStorage(
            getAuthConfig().clientId,
            getAuthConfig().redirectUri,
          );
          if (!_irClient) throw new Error("Not authenticated");
          const impulseResponseFiles = await getImpulseResponseFiles(
            requestedImpulseResponseList,
            _irClient,
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
          const _frClient = GitLabOAuthClient.loadFromStorage(
            getAuthConfig().clientId,
            getAuthConfig().redirectUri,
          );
          if (!_frClient) throw new Error("Not authenticated");
          const frequencyResponseFiles = await getFrequencyResponseFiles(
            requestedFrequencyResponseList,
            _frClient,
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
      const _fscClient = GitLabOAuthClient.loadFromStorage(
        getAuthConfig().clientId,
        getAuthConfig().redirectUri,
      );
      if (!_fscClient) throw new Error("Not authenticated");
      const { errors: folderStructureErrors, files: folderStructureFiles } =
        await getRequestedFoldersForStructureCheck(
          folderList.folderAndTargetKindObjectList,
          _fscClient,
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
            _fscClient,
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
    ) {
      const _imgClient = GitLabOAuthClient.loadFromStorage(
        getAuthConfig().clientId,
        getAuthConfig().redirectUri,
      );
      if (!_imgClient) throw new Error("Not authenticated");
      errors.push(
        ...(await isImageFolderMissing(
          imageFolders,
          easyeyesResources.folders || [],
          _imgClient,
        )),
      );
    }

    imageFolders.targetImageFolderList.forEach((imageFolder: any) => {
      requestedFolderList.push(imageFolder + ".zip");
    });
    // ! validate requested code files
    const requestedCodeList: any[] = getCodeList(parsed);
    if (space === "web" && !isCompiledFromArchiveBool)
      errors.push(
        ...isCodeMissing(requestedCodeList, easyeyesResources.code || []),
      );

    // Build normalized DataFrame from ExperimentTable (no duplicates, clean data)
    let df = _tableToNormalizedDf(table);

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
      // One font-bytes cache for all font validators, so each font file is
      // downloaded at most once per compile
      const fontCache = createFontDataCache(space, fontDirectory);
      const variableFontErrors = await validateVariableFontSettings(
        df,
        space,
        fontDirectory,
        undefined,
        fontCache,
      );
      errors.push(...variableFontErrors);
      // Reject fonts whose OpenType layout tables the browsers' text shaper
      // (HarfBuzz) would silently discard, corrupting rendered text
      const fontShapingErrors = await validateFontShaping(
        df,
        space,
        fontDirectory,
        undefined,
        fontCache,
      );
      errors.push(...fontShapingErrors);

      const fontLanguageErrors = await validateFontLanguageSupport(
        df,
        space,
        fontDirectory,
        {
          textContents: easyeyesResources.textContents as
            | Record<string, string>
            | undefined,
          textDirectory: space === "node" ? "texts" : undefined,
          fontCache,
        },
      );
      errors.push(...fontLanguageErrors);

      const featureAnalysisErrors = await validateFontFeatureAnalysis(
        df,
        space,
        fontDirectory,
        undefined,
        fontCache,
      );
      errors.push(...featureAnalysisErrors);
    }

    // Validate _online1Title length (must be <= 120 characters for Prolific)
    if (
      user.currentExperiment.participantRecruitmentServiceName === "Prolific" &&
      user.currentExperiment.titleOfStudy &&
      user.currentExperiment.titleOfStudy.length > 120
    ) {
      errors.push(
        PROLIFIC_TITLE_TOO_LONG(
          user.currentExperiment.titleOfStudy.length,
          120,
        ),
      );
    }

    // Validate _online2PayCurrencyCode against Prolific. Prolific accounts can
    // only pay in USD or GBP, and there is no API to change the account
    // currency, so any other currency with Prolific is a fatal error.
    if (
      user.currentExperiment.participantRecruitmentServiceName === "Prolific" &&
      user.currentExperiment._online2PayCurrencyCode &&
      !PROLIFIC_SUPPORTED_CURRENCIES.includes(
        user.currentExperiment._online2PayCurrencyCode,
      )
    ) {
      errors.push(
        PROLIFIC_CURRENCY_NOT_SUPPORTED(
          user.currentExperiment._online2PayCurrencyCode,
          PROLIFIC_SUPPORTED_CURRENCIES,
        ),
      );
    }

    /* --------------------------------- Errors --------------------------------- */
    // Warnings (kind === "warning") do not block compilation; only real errors do.
    const hasBlockingError = errors.some((e: any) => e.kind === "error");
    if (hasBlockingError) {
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
        requestedPhraseFile,
      );
    } else {
      durations.currentDuration = EstimateDurationForScientistPage(parsed);
      durations._online2Minutes =
        table.colBOrDefault("_online2Minutes") || "unknown";
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
        // Pass through any non-blocking warnings so they are shown to the
        // experimenter even though compilation proceeded normally.
        errors.filter((e: any) => e.kind === "warning"),
        requestedImpulseResponseList,
        requestedFrequencyResponseList,
        requestedTargetSoundLists,
        requestedPhraseFile,
      );
    }
  } catch (e: any) {
    const message = e?.message || String(e);
    // Handle the case of compiler errors like "Phrase 'badPhrase' not defined"
    const match = message.match(/Phrase\s+"([^"]+)"\s+not defined/i);
    const unexpectedPhrase = match ? match[1] : undefined;
    console.error("Compiler error:", e);
    errors.push({
      name: "Unexpected compiler error.",
      message: message,
      hint: "",
      context: "prepareExperimentFileForThreshold",
      kind: "error",
      parameters: unexpectedPhrase ? [unexpectedPhrase] : [],
    });
    callback(user, {}, [], [], [], [], [], [], errors, [], [], [], "");
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
  const structuralRows = new Set([
    "block",
    "conditionEnabledBool",
    "conditionTrials",
  ]);

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
 * conditionEnabledBool === "FALSE" or conditionTrials === 0. This ensures
 * disabled/empty conditions don't affect resource validation or compiled output.
 * @param parsed - PapaParse result with experiment data
 * @returns Filtered parsed data, plus a mapping from each surviving condition's
 *   index in the filtered data to its condition index in the original data
 *   (undefined when nothing was removed), so error messages can report the
 *   spreadsheet column letters the experimenter actually sees.
 */
export const filterDisabledConditionsFromParsed = (
  data: string[][],
): { data: string[][]; conditionColumnMapping?: number[] } => {
  const conditionEnabledBoolRow = data.find(
    (row: string[]) => row[0]?.trim() === "conditionEnabledBool",
  );
  const conditionTrialsRow = data.find(
    (row: string[]) => row[0]?.trim() === "conditionTrials",
  );
  const isConditionEnabled = (colIndex: number): boolean => {
    if (conditionEnabledBoolRow) {
      const val = conditionEnabledBoolRow[colIndex];
      if (val && val.trim() && val.trim().toUpperCase() === "FALSE")
        return false;
    }
    if (conditionTrialsRow) {
      const val = conditionTrialsRow[colIndex];
      if (val && val.trim() === "0") return false;
    }
    return true;
  };
  const totalConditions = Math.max(...data.map((r) => r.length)) - 1;
  const enabledConditionIndices = [
    0,
    ...Array.from({ length: totalConditions }, (_, i) => i + 1).filter(
      isConditionEnabled,
    ),
  ];
  if (enabledConditionIndices.length === totalConditions + 1) return { data };
  const filteredData = data.map((row: string[]) =>
    enabledConditionIndices.map((colIndex) => row[colIndex] || ""),
  );
  // Raw column index 2 (ie the third column, after the parameter-name and
  // underscore columns) is condition index 0.
  const conditionColumnMapping = enabledConditionIndices
    .slice(2)
    .map((originalColIndex) => originalColIndex - 2);
  return { data: filteredData, conditionColumnMapping };
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

/** Build a normalized DataFrame from ExperimentTable (for blockGen / font checks only). */
const _tableToNormalizedDf = (table: any): any => {
  const { DataFrame } = require("dataframe-js");
  const map = table.toParamValuesMap();
  const columns = [...map.keys()];
  // Include a colB row (row 0) so normalizeExperimentDfShape can drop it,
  // matching the shape produced by dataframeFromPapaParsed.
  // Only underscore params have colB values; non-underscore params get "" in colB.
  const colBRow = columns.map((c: string) =>
    c.startsWith("_") ? table.colBOrDefault(c) : "",
  );
  const conditionRows = Array.from({ length: table.conditionCount }, (_, ci) =>
    columns.map((c: string) => map.get(c)[ci]),
  );
  return new DataFrame([colBRow, ...conditionRows], columns);
};
