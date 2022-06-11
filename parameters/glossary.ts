/*
  Do not modify this file! Run npm `npm run glossary` at ROOT of this project to fetch from the Google Sheets.
  https://docs.google.com/spreadsheets/d/1x65NjykMm-XUOz98Eu_oo6ON2xspm_h0Q0M2u6UGtug/edit#gid=1287694458 
*/

interface Glossary {
  [parameter: string]: { [field: string]: string | string[] };
}

export const GLOSSARY: Glossary = {
  _about: { name: "_about", availability: "now" },
  _authorEmails: { name: "_authorEmails", availability: "now" },
  _authors: { name: "_authors", availability: "now" },
  _compatibleBrowser: { name: "_compatibleBrowser", availability: "now" },
  _compatibleBrowserVersionMinimum: {
    name: "_compatibleBrowserVersionMinimum",
    availability: "now",
  },
  _compatibleDeviceType: { name: "_compatibleDeviceType", availability: "now" },
  _compatibleOperatingSystem: {
    name: "_compatibleOperatingSystem",
    availability: "now",
  },
  _compatibleProcessorCoresMinimum: {
    name: "_compatibleProcessorCoresMinimum",
    availability: "now",
  },
  _compileAsNewExperimentBool: {
    name: "_compileAsNewExperimentBool",
    availability: "now",
  },
  _consentForm: { name: "_consentForm", availability: "now" },
  _daisyChainURLAfterEasyEyes: {
    name: "_daisyChainURLAfterEasyEyes",
    availability: "now",
  },
  _daisyChainURLBeforeEasyEyes: {
    name: "_daisyChainURLBeforeEasyEyes",
    availability: "now",
  },
  _dateCreated: { name: "_dateCreated", availability: "now" },
  _dateModified: { name: "_dateModified", availability: "now" },
  _debriefForm: { name: "_debriefForm", availability: "now" },
  _experimentFilename: { name: "_experimentFilename", availability: "now" },
  _experimentName: { name: "_experimentName", availability: "now" },
  _invitePartingCommentsBool: {
    name: "_invitePartingCommentsBool",
    availability: "now",
  },
  _participantDurationMinutes: {
    name: "_participantDurationMinutes",
    availability: "now",
  },
  _participantIDGetBool: { name: "_participantIDGetBool", availability: "now" },
  _participantIDPutBool: { name: "_participantIDPutBool", availability: "now" },
  _participantPay: { name: "_participantPay", availability: "now" },
  _participantPayCurrency: {
    name: "_participantPayCurrency",
    availability: "now",
  },
  _participantRecruitmentService: {
    name: "_participantRecruitmentService",
    availability: "now",
  },
  _participantRecruitmentServiceAccount: {
    name: "_participantRecruitmentServiceAccount",
    availability: "now",
  },
  _participantsHowMany: { name: "_participantsHowMany", availability: "now" },
  _pavloviaPreferRunningModeBool: {
    name: "_pavloviaPreferRunningModeBool",
    availability: "now",
  },
  _prolificEligibilityRequirements: {
    name: "_prolificEligibilityRequirements",
    availability: "now",
  },
  _prolificProject: { name: "_prolificProject", availability: "now" },
  _prolificStudyType: { name: "_prolificStudyType", availability: "now" },
  _zeroBasedNumberingBool: {
    name: "_zeroBasedNumberingBool",
    availability: "now",
  },
  block: { name: "block", availability: "now" },
  calibrateBlindSpotBool: {
    name: "calibrateBlindSpotBool",
    availability: "now",
  },
  calibrateDistanceCheckBool: {
    name: "calibrateDistanceCheckBool",
    availability: "now",
  },
  calibrateFrameRateUnderStressBool: {
    name: "calibrateFrameRateUnderStressBool",
    availability: "now",
  },
  calibrateGazeCheckBool: {
    name: "calibrateGazeCheckBool",
    availability: "now",
  },
  calibrateScreenSizeBool: {
    name: "calibrateScreenSizeBool",
    availability: "now",
  },
  calibrateScreenSizeCheckBool: {
    name: "calibrateScreenSizeCheckBool",
    availability: "now",
  },
  calibrateSoundLevelBool: {
    name: "calibrateSoundLevelBool",
    availability: "now",
  },
  calibrateTrackDistanceBool: {
    name: "calibrateTrackDistanceBool",
    availability: "now",
  },
  calibrateTrackGazeBool: {
    name: "calibrateTrackGazeBool",
    availability: "now",
  },
  calibrateTrackNearPointBool: {
    name: "calibrateTrackNearPointBool",
    availability: "now",
  },
  conditionGroup: { name: "conditionGroup", availability: "now" },
  conditionName: { name: "conditionName", availability: "now" },
  conditionTrials: { name: "conditionTrials", availability: "now" },
  fixationCheckBool: { name: "fixationCheckBool", availability: "now" },
  fixationLocationStrategy: {
    name: "fixationLocationStrategy",
    availability: "now",
  },
  fixationLocationXScreen: {
    name: "fixationLocationXScreen",
    availability: "now",
  },
  fixationLocationYScreen: {
    name: "fixationLocationYScreen",
    availability: "now",
  },
  fixationRequestedOffscreenBool: {
    name: "fixationRequestedOffscreenBool",
    availability: "now",
  },
  flipScreenHorizontallyBool: {
    name: "flipScreenHorizontallyBool",
    availability: "now",
  },
  font: { name: "font", availability: "now" },
  fontCharacterSet: { name: "fontCharacterSet", availability: "now" },
  fontFeatureSettings: { name: "fontFeatureSettings", availability: "now" },
  fontLeftToRightBool: { name: "fontLeftToRightBool", availability: "now" },
  fontSource: { name: "fontSource", availability: "now" },
  fontStyle: { name: "fontStyle", availability: "now" },
  fontVariationSettings: { name: "fontVariationSettings", availability: "now" },
  fontWeight: { name: "fontWeight", availability: "now" },
  instructionFont: { name: "instructionFont", availability: "now" },
  instructionFontSource: { name: "instructionFontSource", availability: "now" },
  instructionFontStyle: { name: "instructionFontStyle", availability: "now" },
  instructionLanguage: { name: "instructionLanguage", availability: "now" },
  instructionTableURL: { name: "instructionTableURL", availability: "now" },
  invitePartingCommentsBool: {
    name: "invitePartingCommentsBool",
    availability: "now",
  },
  markingBlankedNearTargetBool: {
    name: "markingBlankedNearTargetBool",
    availability: "now",
  },
  markingBlankingRadiusReEccentricity: {
    name: "markingBlankingRadiusReEccentricity",
    availability: "now",
  },
  markingBlankingRadiusReTargetHeight: {
    name: "markingBlankingRadiusReTargetHeight",
    availability: "now",
  },
  markingClippedToStimulusRectBool: {
    name: "markingClippedToStimulusRectBool",
    availability: "now",
  },
  markingFixationHotSpotRadiusDeg: {
    name: "markingFixationHotSpotRadiusDeg",
    availability: "now",
  },
  markingFixationMotionPeriodSec: {
    name: "markingFixationMotionPeriodSec",
    availability: "now",
  },
  markingFixationMotionRadiusDeg: {
    name: "markingFixationMotionRadiusDeg",
    availability: "now",
  },
  markingFixationStrokeLengthDeg: {
    name: "markingFixationStrokeLengthDeg",
    availability: "now",
  },
  markingFixationStrokeThicknessDeg: {
    name: "markingFixationStrokeThicknessDeg",
    availability: "now",
  },
  markingOffsetBeforeTargetOnsetSecs: {
    name: "markingOffsetBeforeTargetOnsetSecs",
    availability: "now",
  },
  markingOnsetAfterTargetOffsetSecs: {
    name: "markingOnsetAfterTargetOffsetSecs",
    availability: "now",
  },
  markingTargetStrokeLengthDeg: {
    name: "markingTargetStrokeLengthDeg",
    availability: "now",
  },
  markingTargetStrokeThicknessDeg: {
    name: "markingTargetStrokeThicknessDeg",
    availability: "now",
  },
  markTheFixationBool: { name: "markTheFixationBool", availability: "now" },
  markThePossibleTargetsBool: {
    name: "markThePossibleTargetsBool",
    availability: "now",
  },
  maskerBaseFrequencyMultiplier: {
    name: "maskerBaseFrequencyMultiplier",
    availability: "now",
  },
  maskerDBSPL: { name: "maskerDBSPL", availability: "now" },
  maskerSoundFolder: { name: "maskerSoundFolder", availability: "now" },
  maskerSoundPhrase: { name: "maskerSoundPhrase", availability: "now" },
  notes: { name: "notes", availability: "now" },
  playNegativeFeedbackBeepBool: {
    name: "playNegativeFeedbackBeepBool",
    availability: "now",
  },
  playPositiveFeedbackBeepBool: {
    name: "playPositiveFeedbackBeepBool",
    availability: "now",
  },
  playPurrWhenReadyBool: { name: "playPurrWhenReadyBool", availability: "now" },
  "questionAndAnswer@@": { name: "questionAndAnswer@@", availability: "now" },
  readingCorpus: { name: "readingCorpus", availability: "now" },
  readingDefineSingleLineSpacingAs: {
    name: "readingDefineSingleLineSpacingAs",
    availability: "now",
  },
  readingFirstFewWords: { name: "readingFirstFewWords", availability: "now" },
  readingLinesPerPage: { name: "readingLinesPerPage", availability: "now" },
  readingMaxCharactersPerLine: {
    name: "readingMaxCharactersPerLine",
    availability: "now",
  },
  readingMultipleOfSingleLineSpacing: {
    name: "readingMultipleOfSingleLineSpacing",
    availability: "now",
  },
  readingNominalSizeDeg: { name: "readingNominalSizeDeg", availability: "now" },
  readingNumberOfPossibleAnswers: {
    name: "readingNumberOfPossibleAnswers",
    availability: "now",
  },
  readingNumberOfQuestions: {
    name: "readingNumberOfQuestions",
    availability: "now",
  },
  readingPages: { name: "readingPages", availability: "now" },
  readingSetSizeBy: { name: "readingSetSizeBy", availability: "now" },
  readingSingleLineSpacingDeg: {
    name: "readingSingleLineSpacingDeg",
    availability: "now",
  },
  readingSpacingDeg: { name: "readingSpacingDeg", availability: "now" },
  readingTargetMaxWordFrequency: {
    name: "readingTargetMaxWordFrequency",
    availability: "now",
  },
  readingXHeightDeg: { name: "readingXHeightDeg", availability: "now" },
  responseAllowedEarlyBool: {
    name: "responseAllowedEarlyBool",
    availability: "now",
  },
  responseClickedBool: { name: "responseClickedBool", availability: "now" },
  responseEscapeOptionsBool: {
    name: "responseEscapeOptionsBool",
    availability: "now",
  },
  responseMustClickCrosshairBool: {
    name: "responseMustClickCrosshairBool",
    availability: "now",
  },
  responseShowIsolatedCharacterInConnectedFormBool: {
    name: "responseShowIsolatedCharacterInConnectedFormBool",
    availability: "now",
  },
  responseSpokenBool: { name: "responseSpokenBool", availability: "now" },
  responseTypedBool: { name: "responseTypedBool", availability: "now" },
  responseTypedEasyEyesKeypadBool: {
    name: "responseTypedEasyEyesKeypadBool",
    availability: "now",
  },
  screenshotBool: { name: "screenshotBool", availability: "now" },
  setResolutionPxPerCm: { name: "setResolutionPxPerCm", availability: "now" },
  setResolutionPxPerDeg: { name: "setResolutionPxPerDeg", availability: "now" },
  showBoundingBoxBool: { name: "showBoundingBoxBool", availability: "now" },
  showCharacterSetBoundingBoxBool: {
    name: "showCharacterSetBoundingBoxBool",
    availability: "now",
  },
  showCharacterSetForAllResponsesBool: {
    name: "showCharacterSetForAllResponsesBool",
    availability: "now",
  },
  showCharacterSetWhere: { name: "showCharacterSetWhere", availability: "now" },
  showCharacterSetWithLabelsBool: {
    name: "showCharacterSetWithLabelsBool",
    availability: "now",
  },
  showConditionNameBool: { name: "showConditionNameBool", availability: "now" },
  showCounterBool: { name: "showCounterBool", availability: "now" },
  showCounterWhere: { name: "showCounterWhere", availability: "now" },
  showFixationMarkBool: { name: "showFixationMarkBool", availability: "now" },
  showFPSBool: { name: "showFPSBool", availability: "now" },
  showFrameRateBool: { name: "showFrameRateBool", availability: "now" },
  showGazeBool: { name: "showGazeBool", availability: "now" },
  showGazeNudgerBool: { name: "showGazeNudgerBool", availability: "now" },
  showGrid: { name: "showGrid", availability: "now" },
  showInstructionsWhere: { name: "showInstructionsWhere", availability: "now" },
  showPercentCorrectBool: {
    name: "showPercentCorrectBool",
    availability: "now",
  },
  showProgressBarWhere: { name: "showProgressBarWhere", availability: "now" },
  showTakeABreakCreditBool: {
    name: "showTakeABreakCreditBool",
    availability: "now",
  },
  showTargetSpecsBool: { name: "showTargetSpecsBool", availability: "now" },
  showText: { name: "showText", availability: "now" },
  showViewingDistanceBool: {
    name: "showViewingDistanceBool",
    availability: "now",
  },
  simulateParticipantBool: {
    name: "simulateParticipantBool",
    availability: "now",
  },
  simulateWithDisplayBool: {
    name: "simulateWithDisplayBool",
    availability: "now",
  },
  simulationBeta: { name: "simulationBeta", availability: "now" },
  simulationDelta: { name: "simulationDelta", availability: "now" },
  simulationModel: { name: "simulationModel", availability: "now" },
  simulationThreshold: { name: "simulationThreshold", availability: "now" },
  soundGainDBSPL: { name: "soundGainDBSPL", availability: "now" },
  spacingDeg: { name: "spacingDeg", availability: "now" },
  spacingDirection: { name: "spacingDirection", availability: "now" },
  spacingForRatioIsOuterBool: {
    name: "spacingForRatioIsOuterBool",
    availability: "now",
  },
  spacingOverSizeRatio: { name: "spacingOverSizeRatio", availability: "now" },
  spacingRelationToSize: { name: "spacingRelationToSize", availability: "now" },
  spacingSymmetry: { name: "spacingSymmetry", availability: "now" },
  takeABreakMinimumDurationSec: {
    name: "takeABreakMinimumDurationSec",
    availability: "now",
  },
  takeABreakTrialCredit: { name: "takeABreakTrialCredit", availability: "now" },
  targetBoundingBoxHorizontalAlignment: {
    name: "targetBoundingBoxHorizontalAlignment",
    availability: "now",
  },
  targetContrast: { name: "targetContrast", availability: "now" },
  targetDurationSec: { name: "targetDurationSec", availability: "now" },
  targetEccentricityXDeg: {
    name: "targetEccentricityXDeg",
    availability: "now",
  },
  targetEccentricityYDeg: {
    name: "targetEccentricityYDeg",
    availability: "now",
  },
  targetImageFolder: { name: "targetImageFolder", availability: "now" },
  targetKind: { name: "targetKind", availability: "now" },
  targetMinimumPix: { name: "targetMinimumPix", availability: "now" },
  targetRepeatsBool: { name: "targetRepeatsBool", availability: "now" },
  targetRepeatsBorderCharacter: {
    name: "targetRepeatsBorderCharacter",
    availability: "now",
  },
  targetRepeatsMaxLines: { name: "targetRepeatsMaxLines", availability: "now" },
  targetRepeatsPracticeBool: {
    name: "targetRepeatsPracticeBool",
    availability: "now",
  },
  targetSafetyMarginSec: { name: "targetSafetyMarginSec", availability: "now" },
  targetSizeDeg: { name: "targetSizeDeg", availability: "now" },
  targetSizeIsHeightBool: {
    name: "targetSizeIsHeightBool",
    availability: "now",
  },
  targetSoundChannels: { name: "targetSoundChannels", availability: "now" },
  targetSoundDBSPL: { name: "targetSoundDBSPL", availability: "now" },
  targetSoundFolder: { name: "targetSoundFolder", availability: "now" },
  targetSoundNoiseBool: { name: "targetSoundNoiseBool", availability: "now" },
  targetSoundNoiseClockHz: {
    name: "targetSoundNoiseClockHz",
    availability: "now",
  },
  targetSoundNoiseDBSPL: { name: "targetSoundNoiseDBSPL", availability: "now" },
  targetSoundNoiseOffsetReTargetSec: {
    name: "targetSoundNoiseOffsetReTargetSec",
    availability: "now",
  },
  targetSoundNoiseOnsetReTargetSec: {
    name: "targetSoundNoiseOnsetReTargetSec",
    availability: "now",
  },
  targetSoundPhrase: { name: "targetSoundPhrase", availability: "now" },
  targetTask: { name: "targetTask", availability: "now" },
  thresholdAllowedDurationRatio: {
    name: "thresholdAllowedDurationRatio",
    availability: "now",
  },
  thresholdAllowedGazeRErrorDeg: {
    name: "thresholdAllowedGazeRErrorDeg",
    availability: "now",
  },
  thresholdAllowedGazeXErrorDeg: {
    name: "thresholdAllowedGazeXErrorDeg",
    availability: "now",
  },
  thresholdAllowedGazeYErrorDeg: {
    name: "thresholdAllowedGazeYErrorDeg",
    availability: "now",
  },
  thresholdAllowedLatencySec: {
    name: "thresholdAllowedLatencySec",
    availability: "now",
  },
  thresholdBeta: { name: "thresholdBeta", availability: "now" },
  thresholdDelta: { name: "thresholdDelta", availability: "now" },
  thresholdGamma: { name: "thresholdGamma", availability: "now" },
  thresholdGuess: { name: "thresholdGuess", availability: "now" },
  thresholdGuessLogSd: { name: "thresholdGuessLogSd", availability: "now" },
  thresholdParameter: { name: "thresholdParameter", availability: "now" },
  thresholdProcedure: { name: "thresholdProcedure", availability: "now" },
  thresholdProportionCorrect: {
    name: "thresholdProportionCorrect",
    availability: "now",
  },
  thresholdRepeatBadBlockBool: {
    name: "thresholdRepeatBadBlockBool",
    availability: "now",
  },
  viewingDistanceAllowedRatio: {
    name: "viewingDistanceAllowedRatio",
    availability: "now",
  },
  viewingDistanceDesiredCm: {
    name: "viewingDistanceDesiredCm",
    availability: "now",
  },
  viewingDistanceMaxForScreenHeightDeg: {
    name: "viewingDistanceMaxForScreenHeightDeg",
    availability: "now",
  },
  viewingDistanceMaxForScreenWidthDeg: {
    name: "viewingDistanceMaxForScreenWidthDeg",
    availability: "now",
  },
  viewingDistanceMinForTargetSizeDeg: {
    name: "viewingDistanceMinForTargetSizeDeg",
    availability: "now",
  },
  viewingDistanceNudgingBool: {
    name: "viewingDistanceNudgingBool",
    availability: "now",
  },
  wirelessKeyboardNeededBool: {
    name: "wirelessKeyboardNeededBool",
    availability: "now",
  },
};

export const SUPER_MATCHING_PARAMS: string[] = ["questionAndAnswer@@"];
