import { ParamReader } from "../parameters/paramReader";
import { restrictLevel } from "./bounding";
import {
  restrictLevelBeforeFixation,
  restrictLevelAfterFixation,
} from "./boundingNew";
import {
  restrictRepeatedLettersSpacing,
  generateRepeatedLettersStims,
} from "./repeatedLetters";
import { generateRSVPReadingTargetSets } from "./rsvpReading";
import { warning } from "./errorHandling";
import { getTargetStim } from "./letter";
import { logger, readTargetTask } from "./utils";
import { PsychoJS } from "../psychojs/src/core";
import type { TextStim } from "./types";
import type {
  State,
  PartOfTrial,
  StimulusResults,
  LetterState,
  RepeatedLettersState,
  RsvpReadingState,
  VernierState,
  LetterStimulusResults,
  RepeatedLettersStimulusResults,
  RsvpReadingStimulusResults,
  VernierStimulusResults,
  TextStimsLetter,
} from "./stimulus";
import { rc, viewingDistanceCm } from "./global";
import { Screens } from "./multiple-displays/globals";

/**
 * General entry-point for generating the stimuli for a given trial.
 * Specifically, this is the stimulus generation code that is dependent
 * on viewing distance and therefore might need to be rerun during a trial.
 * @param block_condition
 * @param reader
 * @param extraInfo
 * @returns
 */
// NOTE Might throw, use in a catch/try in threshold.js ie with onStimulusGenerated/onStimulusGenerationFailed
export const getStimulus = (
  block_condition: string,
  reader: ParamReader,
  extraInfo: State,
): StimulusResults => {
  const targetKind = reader.read("targetKind", block_condition);
  if (!_isAllNecessaryStateProvided(extraInfo, targetKind)) {
    throw new Error("Failed to get stimulus, missing input parameters");
  }
  viewingDistanceCm.current = rc.viewingDistanceCm
    ? rc.viewingDistanceCm.value
    : Math.min(viewingDistanceCm.desired, viewingDistanceCm.max);
  Screens[0].viewingDistanceCm = viewingDistanceCm.current;
  Screens[0].nearestPointXYZPx =
    rc.improvedDistanceTrackingData !== undefined
      ? rc.improvedDistanceTrackingData.nearestXYPx
      : Screens[0].nearestPointXYZPx;
  switch (targetKind) {
    case "letter":
      return getLettersStimulus(
        block_condition,
        reader,
        extraInfo as LetterState,
      );
    case "repeatedLetters":
      return getRepeatedLettersStimulus(
        block_condition,
        reader,
        extraInfo as RepeatedLettersState,
      );
    case "rsvpReading":
      return getRsvpReadingStimulus(
        block_condition,
        reader,
        extraInfo as RsvpReadingState,
      );
    case "vernier":
      return getVernierStimulus(
        block_condition,
        reader,
        extraInfo as VernierState,
      );
    default:
      throw new Error(
        `targetKind == ${targetKind} not yet supported by getStimulus`,
      );
  }
};

const getLettersStimulus = (
  block_condition: string,
  reader: ParamReader,
  extraInfo: LetterState,
): LetterStimulusResults => {
  const version: number = Number(
    reader.read("EasyEyesLettersVersion", block_condition),
  );

  let level, stimulusParameters, characterSetBoundingRect;
  if (version === 1) {
    const proposedLevel = extraInfo.proposedLevel;
    const characterSetBoundingRect = extraInfo.characterSetBoundingRect;
    ({ level, stimulusParameters } = getLettersStimulusV1(
      block_condition,
      reader,
      proposedLevel,
      characterSetBoundingRect,
    ));
  } else {
    ({ level, stimulusParameters, characterSetBoundingRect } =
      getLettersStimulusV2(
        block_condition,
        reader,
        extraInfo.characterSetBoundingRect,
        extraInfo.stage as PartOfTrial,
        extraInfo.characters.target,
        extraInfo.proposedLevel,
      ));
  }
  let letterTiming: any = {};
  const preRenderFrameN = extraInfo.frameN;
  const stims: TextStimsLetter = _getLetterTextStims(
    reader,
    block_condition,
    stimulusParameters,
    extraInfo.characters,
    extraInfo.textStims,
  );
  // Ready letter stims, by drawing at 0 opacity, and marking preRenderStartSec
  Object.entries(stims).forEach(([key, stim]: [string, TextStim]) => {
    if (key === "target") {
      letterTiming["preRenderStartSec"] = performance.now() / 1000;
    }
    // @ts-ignore
    stim.setOpacity(0);
    stim.setAutoDraw(true);
    stim.status = PsychoJS.Status.NOT_STARTED;
  });
  return {
    level,
    stimulusParameters,
    stims,
    characterSetBoundingRect,
    letterTiming,
    preRenderFrameN,
  };
};

// Post-bounding (which will depend on EasyEyesLetterVersion), get the actual PsychoJS::TextStim objects
const _getLetterTextStims = (
  reader: ParamReader,
  block_condition: string,
  stimulusParameters: any,
  characters: any,
  textStims: any,
) => {
  const stimsToReturn: any = {};
  switch (reader.read("thresholdParameter", block_condition)) {
    // ACUITY
    case "targetSizeDeg":
      stimsToReturn.target = getTargetStim(
        stimulusParameters,
        reader,
        block_condition,
        characters.target,
        textStims.target,
      );
      break;
    // SPACING
    case "spacingDeg":
      switch (reader.read("spacingRelationToSize", block_condition)) {
        case "none":
        case "ratio":
          stimsToReturn.target = getTargetStim(
            stimulusParameters,
            reader,
            block_condition,
            characters.target,
            textStims.target,
          );

          // flanker1 === outer flanker
          stimsToReturn.flanker1 = getTargetStim(
            stimulusParameters,
            reader,
            block_condition,
            characters.flanker1,
            textStims.flanker1,
            1,
          );
          // flanker2 === inner flanker
          stimsToReturn.flanker2 = getTargetStim(
            stimulusParameters,
            reader,
            block_condition,
            characters.flanker2,
            textStims.flanker2,
            2,
          );
          if (textStims.hasOwnProperty("flanker3"))
            stimsToReturn.flanker3 = getTargetStim(
              stimulusParameters,
              reader,
              block_condition,
              characters.flanker3,
              textStims.flanker3,
              3,
            );
          if (textStims.hasOwnProperty("flanker4"))
            stimsToReturn.flanker4 = getTargetStim(
              stimulusParameters,
              reader,
              block_condition,
              characters.flanker4,
              textStims.flanker4,
              4,
            );
          break;
        case "typographic":
          // ...include the flankers in the same string/stim as the target.
          const tripletCharacters =
            characters.flanker1 + characters.target + characters.flanker2;
          stimsToReturn.target = getTargetStim(
            stimulusParameters,
            reader,
            block_condition,
            tripletCharacters,
            textStims.target,
          );
          break;
      }
  }
  return stimsToReturn;
};

const getLettersStimulusV1 = (
  block_condition: string,
  reader: ParamReader,
  proposedLevel: number,
  characterSetBoundingRect: any,
): { level: number; stimulusParameters: any } => {
  const [level, stimulusParameters] = restrictLevel(
    proposedLevel,
    reader.read("thresholdParameter", block_condition),
    characterSetBoundingRect,
    reader.read("spacingDirection", block_condition),
    reader.read("spacingRelationToSize", block_condition),
    reader.read("spacingSymmetry", block_condition),
    reader.read("spacingOverSizeRatio", block_condition),
    reader.read("targetSizeIsHeightBool", block_condition),
    reader.read("spacingIsOuterBool", block_condition),
  );

  return { level, stimulusParameters };
};
const getLettersStimulusV2 = (
  block_condition: string,
  reader: ParamReader,
  characterSetBoundingRectOld: any,
  stage: PartOfTrial,
  targetCharacter?: string,
  proposedLevel?: number,
): {
  level: number;
  stimulusParameters: any;
  characterSetBoundingRect: any;
} => {
  if (stage === "afterFixation" && !(targetCharacter && proposedLevel)) {
    throw new Error(
      `targetCharacter (${targetCharacter}) and proposedLevel (${proposedLevel}) must be provided for afterFixation letter stimulus generation.`,
    );
  }
  let level, stimulusParameters, characterSetBoundingRect;

  if (stage === "beforeFixation") {
    let _levelSeemsToBeUnusedInBeforeFixationATM;
    [
      _levelSeemsToBeUnusedInBeforeFixationATM,
      stimulusParameters,
      characterSetBoundingRect,
    ] = restrictLevelBeforeFixation(
      readTargetTask(block_condition),
      reader.read("targetKind", block_condition),
      reader.read("thresholdParameter", block_condition),
      reader.read("spacingRelationToSize", block_condition),
      reader.read("spacingSymmetry", block_condition),
      reader.read("spacingOverSizeRatio", block_condition),
      reader.read("fontLeftToRightBool", block_condition),
      characterSetBoundingRectOld,
      String(reader.read("fontCharacterSet", block_condition)).split(""),
      reader.read("spacingDirection", block_condition),
      reader.read("targetSizeIsHeightBool", block_condition),
    );
  } else if (stage === "afterFixation") {
    [level, stimulusParameters] = restrictLevelAfterFixation(
      proposedLevel,
      reader.read("thresholdParameter", block_condition),
      characterSetBoundingRectOld,
      reader.read("spacingDirection", block_condition),
      reader.read("spacingRelationToSize", block_condition),
      reader.read("spacingSymmetry", block_condition),
      reader.read("spacingOverSizeRatio", block_condition),
      reader.read("targetSizeIsHeightBool", block_condition),
      reader.read("spacingIsOuterBool", block_condition),
      reader.read("showBoundingBoxBool", block_condition),
      reader.read("fontLeftToRightBool", block_condition),
      readTargetTask(block_condition),
      reader.read("targetKind", block_condition),
      targetCharacter,
      reader.read("fontSizeReferencePx", block_condition),
    );
    characterSetBoundingRect = characterSetBoundingRectOld;
    if (level === "target is offscreen") {
      const {
        targetLocationPx,
        targetEccentricityDeg,
        screenRectPx,
        screenRectDeg,
        fixationXYPX,
        viewingDistanceCm,
        screenWidthCm,
        screenHeightCm,
      } = stimulusParameters as any;
      throw new Error(
        `Target is off screen. Target location ${targetLocationPx} px, eccentricity ${targetEccentricityDeg} deg. Screen rect ${screenRectPx} px = ${screenRectDeg} deg. Fixation ${fixationXYPX} px. Screen size ${screenWidthCm}x${screenHeightCm} cm. Viewing distance ${viewingDistanceCm} cm.`,
      );
    }
  } else {
    throw new Error(`Invalid stage ${stage}`);
  }
  return { level: Number(level), stimulusParameters, characterSetBoundingRect };
};

const getRepeatedLettersStimulus = (
  block_condition: string,
  reader: ParamReader,
  extraInfo: RepeatedLettersState,
): RepeatedLettersStimulusResults => {
  // Restrict the proposed level to physical constraints
  const [level, stimulusParameters] = restrictRepeatedLettersSpacing(
    extraInfo.proposedLevel,
    [
      reader.read("targetEccentricityXDeg", block_condition),
      reader.read("targetEccentricityYDeg", block_condition),
    ],
    extraInfo.characterSetBoundingRect,
  ) as [number, any];

  // Generate the stimuli
  let stims = generateRepeatedLettersStims(stimulusParameters);

  // The stimuli and information there about
  const infoForRepeatedLettersConfig = {
    stims,
    level,
    stimulusParameters,
  };
  return infoForRepeatedLettersConfig;
};
const getRsvpReadingStimulus = (
  block_condition: string,
  reader: ParamReader,
  extraInfo: RsvpReadingState,
) => {
  return {
    targetSets: generateRSVPReadingTargetSets(
      (extraInfo as RsvpReadingState).thisTrialWords,
      (extraInfo as RsvpReadingState).durationSec,
      reader,
      block_condition,
    ),
  };
};
const getVernierStimulus = (
  block_condition: string,
  reader: ParamReader,
  extraInfo: VernierState,
): VernierStimulusResults => {
  const vernier = extraInfo.vernier;
  vernier.update(
    reader,
    block_condition,
    Math.pow(10, extraInfo.proposedLevel),
  );

  return {
    vernier, // Include updated vernier instance
  };
};

// Fn that takes a js object and determines if it has all the
//  properties required by the State type for the given targetKind
const _isAllNecessaryStateProvided = (
  extraInfo: State,
  targetKind: string,
): boolean => {
  switch (targetKind) {
    case "letter":
      if (
        !(
          extraInfo.hasOwnProperty("proposedLevel") &&
          extraInfo.hasOwnProperty("characterSetBoundingRect")
        )
      ) {
        warning(
          `Missing information needed to generate letter stimuli, expected 'proposedLevel' and 'characterSetBoundingRect'. ${extraInfo.toString()}`,
        );
        return false;
      }
      break;
    case "repeatedLetters":
      if (
        !extraInfo.hasOwnProperty("proposedLevel") ||
        !extraInfo.hasOwnProperty("characterSetBoundingRect")
      ) {
        warning(
          `Missing information needed to generate repeated letter stimuli, expected 'proposedLevel' and 'characterSetBoundingRect'. ${extraInfo.toString()}`,
        );
        return false;
      }
      break;
    case "rsvpReading":
      if (
        !extraInfo.hasOwnProperty("thisTrialWords") ||
        !extraInfo.hasOwnProperty("durationSec")
      ) {
        warning(
          `Missing information needed to generate rsvpReading stimuli, expected 'thisTrialWords' and 'durationSec'. ${extraInfo.toString()}`,
        );
        return false;
      }
      break;
    case "vernier":
      if (
        !extraInfo.hasOwnProperty("proposedLevel") ||
        !extraInfo.hasOwnProperty("vernier")
      ) {
        warning(
          `Missing information needed to generate vernier stimuli, expected 'proposedLevel' and 'vernier'. ${extraInfo.toString()}`,
        );
        return false;
      }
      break;
    default:
      warning(
        `targetKind '${targetKind}' not supported by stimulusGeneration::_isAllNecessaryStateProvided.`,
      );
  }

  return true;
};
