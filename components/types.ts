/**
 * Generic DefaultMap class for type-safe maps with default values
 */
export class DefaultMap<K, V> extends Map<K, V> {
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

export interface SkipTrialOrBlock {
  blockId: number | null;
  trialId: number | null;
  skipTrial: boolean;
  skipBlock: boolean;
}

export interface Status {
  block: number | undefined;
  trial: number | undefined;
  block_condition: string;
  condition: object;
  trialCorrect_thisBlock: number;
  trialCompleted_thisBlock: number;
  trialAttempted_thisBlock: number;
  nthTrialByCondition: DefaultMap<string, number>;
  nthTrialAttemptedByCondition: DefaultMap<string, number>;
  currentFunction: string;
  retryThisTrialBool: boolean;
  nthBlock: number | undefined;
}
