import { phrases } from "./i18n.js";
import { replacePlaceholders } from "./multiLang.js";

export function getTrialInfoStr(
  L,
  showCounterBool,
  showViewingDistanceBool,
  currentTrialIndex,
  currentTrialLength,
  currentBlockIndex,
  blockCount,
  viewingDistanceCm
) {
  let res = "";

  if (showCounterBool) {
    if (currentTrialIndex !== undefined && currentTrialLength !== undefined) {
      // On trial routines, show the trial# and block#...
      res = replacePlaceholders(
        phrases.T_counterTrialBlock[L],
        currentTrialIndex,
        currentTrialLength,
        currentBlockIndex,
        blockCount
      );
    } else {
      // ...but on block instructions, just show block#
      res = replacePlaceholders(
        phrases.T_counterBlock[L],
        currentBlockIndex,
        blockCount
      );
    }
  }

  if (showViewingDistanceBool)
    res += replacePlaceholders(phrases.T_counterCm[L], viewingDistanceCm);

  return res;
}
