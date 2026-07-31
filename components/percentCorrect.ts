/**
 * End-of-block percent-correct popup (showPercentCorrectBool).
 *
 * Spec (glossary): show the popup if the flag is TRUE for ANY condition in
 * the block, reporting the overall percent correct across only the flagged
 * conditions. Never show it when no trials were completed in those
 * conditions (0/0 = NaN).
 */

/**
 * @param readFlag      showPercentCorrectBool for a given block_condition
 * @param blockConditions  all block_condition ids in this block
 * @param correctByCondition   correct-trial count for a block_condition
 * @param completedByCondition completed-trial count for a block_condition
 * @returns rounded percent correct, or null if the popup must not be shown
 */
export const getBlockPercentCorrect = (
  readFlag: (bc: string) => boolean,
  blockConditions: string[],
  correctByCondition: (bc: string) => number,
  completedByCondition: (bc: string) => number,
): number | null => {
  let correct = 0;
  let completed = 0;
  for (const bc of blockConditions) {
    if (!readFlag(bc)) continue;
    correct += correctByCondition(bc);
    completed += completedByCondition(bc);
  }
  if (completed === 0) return null;
  const percent = Math.round((correct / completed + Number.EPSILON) * 100);
  // Never show "NaN%": a stale/missing counter lookup must suppress the popup.
  if (!Number.isFinite(percent)) return null;
  return percent;
};
