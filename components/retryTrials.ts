import { ParamReader } from "../parameters/paramReader";
import { Status, SkipTrialOrBlock } from "./types";

export const okayToRetryThisTrial = (
  status: Status,
  paramReader: ParamReader,
  skipTrialOrBlock: SkipTrialOrBlock,
) => {
  const trialsAttempted =
    status.nthTrialAttemptedByCondition.get(status.block_condition) ?? 1;
  const trialsCompleted =
    status.nthTrialByCondition.get(status.block_condition) ?? 0;
  const trialsRequested = paramReader.read(
    "conditionTrials",
    status.block_condition,
  );
  const retriesAlreadyDone = Math.max(0, trialsAttempted - trialsCompleted);
  const trialsMax = Math.ceil(
    trialsRequested *
      paramReader.read("thresholdAllowedTrialRatio", status.block_condition),
  );
  const retriesAllowed = trialsMax - trialsRequested;
  const enoughRetriesToRetryBool = retriesAlreadyDone < retriesAllowed;
  // Retrying a skipped trial is allowed, but retrying trials in a skipped block is not
  const skippingThisBlock =
    skipTrialOrBlock.skipBlock && skipTrialOrBlock.blockId === status.block;
  return enoughRetriesToRetryBool && !skippingThisBlock;
};

/**
 * Determines if a condition has reached its target number of good, ie given to QUEST, trials.
 *
 * @param conditionName - The name of the condition to check
 * @param paramReader - The parameter reader instance
 * @param status - The global status object, containing current experiment flow state
 * @param isTrialGood - Whether the current trial is a "good" trial (will be sent to QUEST)
 * @returns Whether the condition has reached or will reach its target number of good trials after this trial
 */
export const isConditionFinished = (
  conditionName: string,
  paramReader: ParamReader,
  status: Status,
  isTrialGood: boolean,
): boolean => {
  if (!isTrialGood) return false;
  const targetTrials = paramReader.read("conditionTrials", conditionName);
  const completedTrials = status.nthTrialByCondition.get(conditionName) ?? 0;
  return completedTrials >= targetTrials;
};
