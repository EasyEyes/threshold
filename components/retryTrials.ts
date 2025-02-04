import { ParamReader } from "../parameters/paramReader";
import { skipTrialOrBlock } from "./global";

class DefaultMap<K, V> extends Map<K, V> {
  default: () => V;
  constructor(defaultFunction: () => V, entries: [K, V][] | null) {
    super(entries);
    this.default = defaultFunction;
  }
  get(key: K) {
    if (!this.has(key)) this.set(key, this.default());
    return super.get(key);
  }
}
// TODO unify types for global.js, or convert global.js to TypeScript
interface Status {
  block: number;
  block_condition: string;
  condition: object;
  trialCorrect_thisBlock: number;
  trialCompleted_thisBlock: number;
  trialAttempted_thisBlock: number;
  nthTrialByCondition: DefaultMap<string, number>;
  nthTrialAttemptedByCondition: DefaultMap<string, number>;
  currentFunction: string;
  retryThisTrialBool: boolean;
}

export const okayToRetryThisTrial = (
  status: Status,
  paramReader: ParamReader,
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
