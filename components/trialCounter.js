import { switchKind } from "./blockTargetKind.js";
import { replacePlaceholders } from "./multiLang.js";
import { readi18nPhrases } from "./readPhrases.js";

export function getTrialInfoStr(
  L,
  showCounterBool,
  showViewingDistanceBool,
  currentTrialIndex,
  currentTrialLength,
  currentBlockIndex,
  blockCount,
  viewingDistanceCm,
  taskKind
) {
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
            blockCount
          );
        },
        sound: () => {
          res = replacePlaceholders(
            readi18nPhrases("T_counterTrialBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount
          );
        },
        reading: () => {
          res += replacePlaceholders(
            readi18nPhrases("T_counterReadingPageBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount
          );
        },
        letter: () => {
          // On trial routines, show the trial# and block#...
          res = replacePlaceholders(
            readi18nPhrases("T_counterTrialBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount
          );
        },
        repeatedLetters: () => {
          // On trial routines, show the trial# and block#...
          res = replacePlaceholders(
            readi18nPhrases("T_counterTrialBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount
          );
        },
        rsvpReading: () => {
          res = replacePlaceholders(
            readi18nPhrases("T_counterTrialBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount
          );
        },
        movie: () => {
          res = replacePlaceholders(
            readi18nPhrases("T_counterTrialBlock", L),
            currentTrialIndex,
            currentTrialLength,
            currentBlockIndex,
            blockCount
          );
        },
      });
    } else {
      // ...but on block instructions, just show block#
      res = replacePlaceholders(
        readi18nPhrases("T_counterBlock", L),
        currentBlockIndex,
        blockCount
      );
    }
  }

  if (showViewingDistanceBool && viewingDistanceCm)
    res += replacePlaceholders(
      readi18nPhrases("T_counterCm", L),
      viewingDistanceCm
    );

  return res;
}
