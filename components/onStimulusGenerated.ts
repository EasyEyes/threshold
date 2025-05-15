import {
  prettyPrintPsychojsBoundingBox,
  getBoundingBoxVisualRect,
} from "./boundingBoxes";
import { targetsOverlap } from "./errorMeasurement";
import { pxToPt } from "./readingAddons";
import { warning } from "./errorHandling";
import { defineTargetForCursorTracking } from "./cursorTracking";
import {
  updateTargetSpecs,
  updateTargetSpecsForLetter,
  updateTargetSpecsForRepeatedLetters,
  updateTargetSpecsForRsvpReading,
} from "./showTrialInformation";
import { logLetterParamsToFormspree } from "./letter";
import { sampleWithoutReplacement, norm, logger } from "./utils";
import { setupPhraseIdentification } from "./response";
import { SimulatedObserversHandler } from "./simulatedObserver";
import { ParamReader } from "../parameters/paramReader";
import { RSVPReadingTargetSet, Category } from "./rsvpReading";
import { PsychoJS } from "../psychojs/src/core";
import { recordStimulusPositionsForEyetracking } from "./eyeTrackingFacilitation";
import { getFormspreeLoggingInfoLetter } from "./misc";

import type { TextStim } from "../psychojs/src/visual";
import type { Screen_ } from "./multiple-displays/globals";
import type {
  LetterStimulusResults,
  RepeatedLettersStimulusResults,
  RsvpReadingStimulusResults,
  TextStimsLetter,
  PartOfTrial,
} from "./stimulus";
export const onStimulusGeneratedLetter = (
  stimulus: LetterStimulusResults,
  reader: ParamReader,
  block_condition: string,
  psychoJS: PsychoJS,
  Screens: Screen_[],
  viewingDistanceCm: number,
  characters: any,
  simulatedObservers: SimulatedObserversHandler,
  trialComponents: any[],
  stage: PartOfTrial,
): { letterConfig: any; preRenderFrameN: number; letterTiming: any } => {
  defineTargetForCursorTracking(stimulus.stims.target);
  // To return, for legacy
  const letterConfig: any = {};
  letterConfig.flankerXYDegs = stimulus.stimulusParameters.flankerXYDegs;

  simulatedObservers.update(block_condition, {
    stimulusIntensity: stimulus.level,
    possibleResponses: reader.read("fontCharacterSet", block_condition),
    correctResponses: [characters.target],
  });

  const stimulusTextStims = Object.values(stimulus.stims);
  trialComponents.push(...stimulusTextStims);
  if (reader.read("showBoundingBoxBool", block_condition)) {
    trialComponents.push(...stimulusTextStims.map(getBoundingBoxVisualRect));
  }

  // TODO can we do away with "target is offscreen" value?
  // @ts-ignore
  if (stimulus.level === "target is offscreen") {
    throw new Error(
      `Target is off screen. Target eccentricity in px: ${stimulus.stimulusParameters.targetEccentricityPx}. Target eccentricity in deg: ${stimulus.stimulusParameters.targetEccentricityDeg}. Screen rect in px: ${stimulus.stimulusParameters.screenRectPx}. Screen rect in deg: ${stimulus.stimulusParameters.screenRectDeg}`,
    );
  }

  // Don't save preliminary state, ie V2 beforeFixation
  const version = reader.read("EasyEyesLettersVersion", block_condition);
  if (!(stage === "beforeFixation" && version === 2)) {
    if (reader.read("_logFontBool")[0]) {
      logLetterParamsToFormspree(
        getFormspreeLoggingInfoLetter(
          block_condition,
          reader,
          characters,
          Screens[0],
          viewingDistanceCm,
          stimulus.stimulusParameters,
        ),
      );
    }

    psychoJS.experiment?.addData("level", stimulus.level);

    if (version === 2) {
      psychoJS.experiment?.addData(
        "minTargetSizeDeg",
        stimulus.stimulusParameters.minDeg,
      );
      psychoJS.experiment?.addData(
        "maxTargetSizeDeg",
        stimulus.stimulusParameters.maxDeg,
      );
    }
    if (reader.read("showTargetSpecsBool", block_condition)) {
      updateTargetSpecsForLetter(
        stimulus.stimulusParameters,
        reader.read("!experimentFilename")[0],
      );
    }
    if (reader.read("_trackGazeExternallyBool")[0]) {
      recordStimulusPositionsForEyetracking(
        stimulus.stims.target,
        "trialInstructionRoutineBegin",
      );
    }
    psychoJS.experiment?.addData(
      "fontSizePx",
      stimulus.stimulusParameters.heightPx,
    );
    psychoJS.experiment?.addData(
      "actualSpacingDeg",
      stimulus.stimulusParameters.spacingDeg,
    );
    const spacingRelationToSize_ = reader.read(
      "spacingRelationToSize",
      block_condition,
    );
    const crowdingTriplets =
      spacingRelationToSize_ === "typographic"
        ? characters.target
        : `${characters.flanker1}, ${characters.target}, ${characters.flanker2}`;
    psychoJS.experiment?.addData("crowdingTriplets", crowdingTriplets);

    if (
      reader.read("thresholdParameter", block_condition) === "spacingDeg" &&
      ["none", "ratio"].includes(
        reader.read("spacingRelationToSize", block_condition),
      )
    ) {
      psychoJS.experiment?.addData(
        "flankerLocationsPx",
        stimulus.stimulusParameters.targetAndFlankersXYPx.slice(1),
      );
      // FACTOR getTargetSpacingPx?
      const targetSpacingPx = reader.read("spacingIsOuterBool", block_condition)
        ? norm([
            stimulus.stimulusParameters.targetAndFlankersXYPx[0][0] -
              stimulus.stimulusParameters.targetAndFlankersXYPx[1][0],
            stimulus.stimulusParameters.targetAndFlankersXYPx[0][1] -
              stimulus.stimulusParameters.targetAndFlankersXYPx[1][1],
          ])
        : norm([
            stimulus.stimulusParameters.targetAndFlankersXYPx[0][0] -
              stimulus.stimulusParameters.targetAndFlankersXYPx[2][0],
            stimulus.stimulusParameters.targetAndFlankersXYPx[0][1] -
              stimulus.stimulusParameters.targetAndFlankersXYPx[2][1],
          ]);
      psychoJS.experiment?.addData("targetSpacingPx", targetSpacingPx);
    }

    // Add target bounding box
    psychoJS.experiment?.addData(
      "targetBoundingBox",
      prettyPrintPsychojsBoundingBox(
        stimulus.stims.target.getBoundingBox(true),
      ),
    );
    // Add bounding boxes for flankers
    Object.keys(stimulus.stims)
      .filter((name: string) => name !== "target")
      .forEach((name: string) => {
        const flanker = stimulus.stims[
          name as keyof TextStimsLetter
        ] as TextStim;
        psychoJS.experiment?.addData(
          `${name}BoundingBox`,
          prettyPrintPsychojsBoundingBox(flanker.getBoundingBox(true)),
        );
      });
    const targetsOverlappedThisTrial = targetsOverlap([
      stimulus.stims.target,
      ...Object.values(stimulus.stims).filter(
        (s) => s !== stimulus.stims.target,
      ),
    ]);
    psychoJS.experiment?.addData(
      "targetsOverlappedBool",
      targetsOverlappedThisTrial ? "TRUE" : "FALSE",
    );

    // @ts-ignore
    const fontNominalSizePx = stimulus.stims.target.getHeight();
    const fontNominalSizePt = pxToPt(fontNominalSizePx);
    psychoJS.experiment?.addData("fontNominalSizePx", fontNominalSizePx);
    psychoJS.experiment?.addData("fontNominalSizePt", fontNominalSizePt);
  }
  return {
    letterConfig,
    preRenderFrameN: stimulus.preRenderFrameN,
    letterTiming: stimulus.letterTiming,
  };
};

export const onStimulusGeneratedRepeatedLetters = (
  stimulus: RepeatedLettersStimulusResults,
  reader: ParamReader,
  block_condition: string,
  simulatedObservers: SimulatedObserversHandler,
  fontCharacterSet: any,
  correctAns: string[],
) => {
  defineTargetForCursorTracking(stimulus.stims);

  // Simulated observer
  simulatedObservers.update(block_condition, {
    stimulusIntensity: stimulus.level,
    possibleResponses: fontCharacterSet.current,
    correctResponses: correctAns,
  });

  if (reader.read("showTargetSpecsBool", block_condition)) {
    updateTargetSpecsForRepeatedLetters(stimulus.stimulusParameters);
  }

  if (reader.read("showTargetSpecsBool", block_condition)) {
    updateTargetSpecsForRepeatedLetters(
      stimulus.stimulusParameters,
      reader.read("!experimentFilename")[0],
    );
  }
};

export const onStimulusGeneratedRsvpReading = (
  stimulusResults: RsvpReadingStimulusResults,
  numberOfIdentifications: number,
  simulatedObservers: SimulatedObserversHandler,
  level: number,
  reader: ParamReader,
  block_condition: string,
  psychoJS: PsychoJS,
  silentResponseMode: boolean,
  durationSec: number,
) => {
  if (
    !stimulusResults.targetSets ||
    !Array.isArray(stimulusResults.targetSets) ||
    stimulusResults.targetSets.length === 0
  ) {
    warning("Invalid target sets for RSVP reading");
    return;
  }

  const rsvpReadingTargetSetsToReturn = {
    upcoming: stimulusResults.targetSets,
    past: [],
    identificationTargetSets: sampleWithoutReplacement(
      stimulusResults.targetSets,
      numberOfIdentifications,
      true,
    ),
    current: undefined as RSVPReadingTargetSet | undefined,
  };

  const correctAnsToReturn = {
    current: rsvpReadingTargetSetsToReturn.identificationTargetSets.map((t) =>
      t.word.toLowerCase(),
    ),
  };

  simulatedObservers.update(block_condition, {
    stimulusIntensity: level,
    correctResponses: correctAnsToReturn.current,
    possibleResponses: rsvpReadingTargetSetsToReturn.identificationTargetSets
      .map((t) => [t.word, ...t.foilWords])
      .flat()
      .map((w) => w.toLowerCase()),
  });

  psychoJS.experiment?.addData(
    "rsvpReadingTargetNumberOfSets",
    rsvpReadingTargetSetsToReturn.upcoming.length,
  );
  psychoJS.experiment?.addData(
    "rsvpReadingTargetSets",
    stimulusResults.targetSets.toString(),
  );

  // All categories (ie sets of target and foils)
  const rsvpReadingResponseToReturn: any = {
    categories: rsvpReadingTargetSetsToReturn.upcoming.map(
      (s) => new Category(s.word, s.foilWords),
    ),
    identificationCategories:
      rsvpReadingTargetSetsToReturn.identificationTargetSets.map(
        (s) => new Category(s.word, s.foilWords),
      ),
  };

  psychoJS.experiment?.addData(
    "rsvpReadingResponseCategories",
    rsvpReadingResponseToReturn.identificationCategories.toString(),
  );

  if (silentResponseMode) {
    // Those categories that will be shown to the participant, ie used for response
    rsvpReadingResponseToReturn["screen"] = setupPhraseIdentification(
      rsvpReadingResponseToReturn.identificationCategories,
      reader,
      block_condition,
      rsvpReadingTargetSetsToReturn.upcoming[0]._heightPx,
    );
    psychoJS.experiment?.addData(
      "rsvpReadingResponseScreenHTML",
      rsvpReadingResponseToReturn["screen"].innerHTML,
    );
  }

  rsvpReadingTargetSetsToReturn.current =
    rsvpReadingTargetSetsToReturn.upcoming.shift();
  const rsvpReadingResponseModality = reader.read(
    "responseSpokenToExperimenterBool",
    block_condition,
  )
    ? "spoken"
    : "silent";

  if (reader.read("showTargetSpecsBool", block_condition)) {
    updateTargetSpecsForRsvpReading(reader, block_condition, {
      targetWordDurationSec: durationSec,
      rsvpReadingNumberOfWords: reader.read(
        "rsvpReadingNumberOfWords",
        block_condition,
      ),
      rsvpReadingResponseModality,
    });
  }

  return {
    rsvpReadingTargetSets: rsvpReadingTargetSetsToReturn,
    correctAns: correctAnsToReturn,
    rsvpReadingResponse: rsvpReadingResponseToReturn,
  };
};

export const onStimulusGeneratedVernier = (
  vernier: any,
  reader: ParamReader,
  block_condition: string,
  T_identifyVernierLeft: string,
  T_identifyVernierRight: string,
  psychoJS: PsychoJS,
  simulatedObservers: SimulatedObserversHandler,
) => {
  defineTargetForCursorTracking(vernier);
  if (reader.read("_trackGazeExternallyBool")[0]) {
    recordStimulusPositionsForEyetracking(
      vernier,
      "trialInstructionRoutineBegin",
    );
  }
  const validAnsToReturn = [T_identifyVernierLeft, T_identifyVernierRight];
  const correctAnsToReturn = {
    current: validAnsToReturn[vernier.directionBool ? 0 : 1],
  };
  const levelToReturn = Math.log10(vernier.targetOffsetDeg);
  psychoJS.experiment?.addData("level", levelToReturn);
  if (reader.read("showTargetSpecsBool", block_condition)) {
    updateTargetSpecs({
      targetOffsetDeg: vernier.targetOffsetDeg,
      targetDurationSec: reader.read("targetDurationSec", block_condition),
    });
  }
  simulatedObservers.update(block_condition, {
    stimulusIntensity: levelToReturn,
    possibleResponses: validAnsToReturn,
    correctResponses: [correctAnsToReturn.current],
  });
  return {
    validAns: validAnsToReturn,
    correctAns: correctAnsToReturn,
    level: levelToReturn,
  };
};
