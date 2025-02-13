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
