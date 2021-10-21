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

  if (showCounterBool)
    res = replacePlaceholders(
      phrases.T_counterTrialBlock[L],
      currentTrialIndex,
      currentTrialLength,
      currentBlockIndex,
      blockCount
    );

  if (showViewingDistanceBool)
    res += replacePlaceholders(phrases.T_counterCm[L], viewingDistanceCm);

  return res;
}
