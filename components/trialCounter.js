import { switchKind } from "./blockTargetKind.js";
import { rc, status, viewingDistanceCm } from "./global.js";
import { replacePlaceholdersForTrial } from "./multiLang.js";
import { Screens } from "./multiple-displays/globals.ts";
import { readi18nPhrases } from "./readPhrases.js";

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
  let res = "";
  if (showCounterBool) {
    if (currentTrialIndex && currentTrialLength) {
      switchKind(taskKind, {
        vocoderPhrase: () => {
          res = replacePlaceholdersForTrial(
            readi18nPhrases("T_counterTrialBlock1", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        sound: () => {
          res = replacePlaceholdersForTrial(
            readi18nPhrases("T_counterTrialBlock1", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        reading: () => {
          res += replacePlaceholdersForTrial(
            readi18nPhrases("T_counterReadingPageBlock1", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        letter: () => {
          // On trial routines, show the trial# and block#...
          res = replacePlaceholdersForTrial(
            readi18nPhrases("T_counterTrialBlock1", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        repeatedLetters: () => {
          // On trial routines, show the trial# and block#...
          res = replacePlaceholdersForTrial(
            readi18nPhrases("T_counterTrialBlock1", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        rsvpReading: () => {
          res = replacePlaceholdersForTrial(
            readi18nPhrases("T_counterTrialBlock1", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        movie: () => {
          res = replacePlaceholdersForTrial(
            readi18nPhrases("T_counterTrialBlock1", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
        vernier: () => {
          res = replacePlaceholdersForTrial(
            readi18nPhrases("T_counterTrialBlock1", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount,
          );
        },
      });
    } else {
      // ...but on block instructions, just show block#
      res = replacePlaceholdersForTrial(
        readi18nPhrases("T_counterBlock1", L),
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

    res +=
      " " +
      replacePlaceholdersForTrial(
        readi18nPhrases("T_counterCm1", L),
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
  const periodMs = 500;
  const tMs = Math.floor(t) * 1000;
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

/**
 * Set the value for the current trial of a given condition
 * @param {string} BC
 */
export const trackNthTrialInCondition = (BC) => {
  if (status.nthTrialByCondition.has(BC)) {
    status.nthTrialByCondition.set(BC, status.nthTrialByCondition.get(BC) + 1);
  } else {
    status.nthTrialByCondition.set(BC, 1);
  }
};
