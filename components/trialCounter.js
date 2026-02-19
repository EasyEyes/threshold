import { switchKind } from "./blockTargetKind.js";
import { rc, status, viewingDistanceCm } from "./global.js";
import { replacePlaceholders } from "./multiLang.js";
import { Screens } from "./multiple-displays/globals.ts";
import { readi18nPhrases } from "./readPhrases.js";
import { logger } from "./utils.js";

export function getTrialInfoStr(
  L,
  showCounterBool,
  showViewingDistanceBool,
  currentTrialIndex,
  currentTrialLength,
  currentBlockIndex,
  blockCount,
  viewingDistanceCm_,
  taskKind,
) {
  // logger("!. getTrialInfoStr currentTrialIndex", currentTrialIndex);
  let res = "";
  if (showCounterBool) {
    if (currentTrialIndex && currentTrialLength) {
      switchKind(taskKind, {
        vocoderPhrase: () => {
          res = replacePlaceholders(
            readi18nPhrases("T_counterTrialBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        sound: () => {
          res = replacePlaceholders(
            readi18nPhrases("T_counterTrialBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        reading: () => {
          res += replacePlaceholders(
            readi18nPhrases("T_counterReadingPageBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        letter: () => {
          // On trial routines, show the trial# and block#...
          res = replacePlaceholders(
            readi18nPhrases("T_counterTrialBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        repeatedLetters: () => {
          // On trial routines, show the trial# and block#...
          res = replacePlaceholders(
            readi18nPhrases("T_counterTrialBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        rsvpReading: () => {
          res = replacePlaceholders(
            readi18nPhrases("T_counterTrialBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        movie: () => {
          res = replacePlaceholders(
            readi18nPhrases("T_counterTrialBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        vernier: () => {
          res = replacePlaceholders(
            readi18nPhrases("T_counterTrialBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        image: () => {
          res = replacePlaceholders(
            readi18nPhrases("T_counterTrialBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
      });
    } else {
      // ...but on block instructions, just show block#
      res = replacePlaceholders(
        readi18nPhrases("T_counterBlock", L),
        currentBlockIndex,
        blockCount,
      );
    }
  }

  if (showViewingDistanceBool) {
    viewingDistanceCm.current = rc.viewingDistanceCm
      ? rc.viewingDistanceCm.value
      : viewingDistanceCm.desired;
    Screens[0].viewingDistanceCm = viewingDistanceCm.current;
    Screens[0].nearestPointXYZPx =
      rc.improvedDistanceTrackingData !== undefined
        ? rc.improvedDistanceTrackingData.nearestXYPx
        : Screens[0].nearestPointXYZPx;

    res +=
      " " +
      replacePlaceholders(
        readi18nPhrases("T_counterCm", L),
        viewingDistanceCm.current?.toFixed(1) || viewingDistanceCm.current,
      );
  }

  return res;
}

export const liveUpdateTrialCounter = (
  L,
  showCounterBool,
  showViewingDistanceBool,
  currentTrialIndex,
  currentTrialLength,
  currentBlockIndex,
  blockCount,
  viewingDistanceCm,
  taskKind,
  t,
  trialCounterStim,
) => {
  // logger("!. liveUpdateTrialCounter currentTrialIndex", currentTrialIndex);
  const periodMs = 500;
  const tMs = Math.floor(t * 1000);
  if (tMs % periodMs === 0) {
    trialCounterStim.setText(
      getTrialInfoStr(
        L,
        showCounterBool,
        showViewingDistanceBool,
        currentTrialIndex,
        currentTrialLength,
        currentBlockIndex,
        blockCount,
        viewingDistanceCm,
        taskKind,
      ),
    );
  }
};

/// Update trial counters
// Always called at the start of a trial,
// to increment our count of trials attempted.
export const incrementTrialsAttempted = (BC) => {
  const prev = status.nthTrialAttemptedByCondition.get(BC);
  status.nthTrialAttemptedByCondition.set(BC, prev + 1);
};
// Potentially called at the end of a trial, to increment
// our count of trials completed successfully,
// ie given to QUEST
export const incrementTrialsCompleted = (BC, paramReader) => {
  const prev = status.nthTrialByCondition.get(BC);
  status.nthTrialByCondition.set(BC, prev + 1);
  // TODO can this !rsvp&!repeated clause be removed?
  if (
    !["rsvpReading", "repeatedLetters", "image"].includes(
      paramReader.read("targetKind", BC),
    )
  )
    status.trialCompleted_thisBlock++;
};
