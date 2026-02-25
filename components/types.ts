import { GLOSSARY } from "../parameters/glossary";

/**
 * Target kind derived from glossary source of truth.
 * This is the single source of truth for valid target kinds.
 */
export type TargetKind = (typeof GLOSSARY.targetKind.categories)[number];

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

/**
 * Interface for PsychoJS TextStim visual stimulus.
 * Used for type safety when working with text stimuli in EasyEyes.
 */
export interface TextStim {
  setText(text: string): void;
  setPos(pos: [number, number] | number[]): void;
  setColor(color: any): void;
  setAutoDraw(autoDraw: boolean): void;
  getBoundingBox(tight?: boolean): { height: number } | number[];
  status: number;
  _autoDraw: boolean;
  _needUpdate: boolean;
}
