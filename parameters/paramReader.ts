import Papa from "papaparse";
import type { GlossaryEntry } from "../../source/components/types";
import { getGlossary, getSuperMatchingParams } from "./glossaryRegistry";
import { INTERNAL_GLOSSARY } from "./internal";
import {
  MatrixValue,
  freezeVectorValue,
  parseVectorType,
  parseVectorValue,
} from "../components/vectorParsing";
import { stripBlankEnds } from "../preprocess/parameterName";

export const ALL_BLOCKS = "__ALL_BLOCKS__" as const;

export type AllBlocksKey = typeof ALL_BLOCKS;
export type ParameterValue =
  | string
  | number
  | boolean
  | number[]
  | MatrixValue
  | null
  | undefined;
export type ParameterReadValue = ParameterValue | ParameterValue[];
export type Condition = Record<string, ParameterValue>;
export type BlockOrCondition = number | string | undefined;
export type BlockReadKey = number | AllBlocksKey;
export type ParamReaderCallback = (reader: ParamReader) => void;
type RuntimeGlossaryEntry = Pick<GlossaryEntry, "default" | "type">;
type PrimitiveKind = "string" | "number" | "boolean";
type PrimitiveValueFor<K extends PrimitiveKind> = K extends "string"
  ? string
  : K extends "number"
  ? number
  : boolean;
type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type IsDigits<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Head extends Digit
    ? Tail extends ""
      ? true
      : IsDigits<Tail>
    : false
  : false;
// An unconstrained string follows the existing condition-label contract.
// Convert dynamically generated block-number strings to number before reading.
type StringReadValue<K extends string, T> = IsDigits<K> extends true ? T[] : T;

const STRING_GLOSSARY_TYPES: ReadonlySet<string> = new Set([
  "text",
  "categorical",
  "multicategorical",
]);
const NUMBER_GLOSSARY_TYPES: ReadonlySet<string> = new Set([
  "integer",
  "numerical",
]);

const unexpectedParameterType = (
  name: string,
  expected: string,
  value: ParameterReadValue,
): TypeError => {
  const actual = Array.isArray(value)
    ? "array"
    : value === null
    ? "null"
    : typeof value;
  return new TypeError(
    `[paramReader] Expected ${name} to be ${expected}; received ${actual}.`,
  );
};

export class ParamReader {
  public _experimentFilePath: string;
  public _experiment: Condition[] | null = null;
  public _blockCount: number | null = null;
  public _loadError: Error | null = null;

  constructor(
    experimentFilePath = "conditions",
    callback?: ParamReaderCallback,
  ) {
    this._experimentFilePath = experimentFilePath;
    this._loadFile(callback);
  }

  read(name: string): ParameterValue[];
  read(name: string, block: BlockReadKey): ParameterValue[];
  read<K extends string>(
    name: string,
    key: K,
  ): StringReadValue<K, ParameterValue>;
  read(name: string, key: BlockOrCondition): ParameterReadValue;
  read(
    name: string,
    blockOrConditionName?: BlockOrCondition,
  ): ParameterReadValue {
    const key = this._normalizeReadKey(blockOrConditionName);
    this._assertReadable(name, key);
    const value = this.has(name)
      ? this._getParam(name, key)
      : this._getParamGlossary(name, key);
    // Vector/matrix values are mutable objects stored on the conditions —
    // hand out copies so a consumer mutating one can't corrupt later reads.
    return this._defensiveCopy(value);
  }

  _defensiveCopy(value: ParameterReadValue): ParameterReadValue {
    if (value instanceof MatrixValue)
      return new MatrixValue(value.data.map((row) => [...row]));
    if (Array.isArray(value))
      return value.map((item: ParameterValue) =>
        item instanceof MatrixValue
          ? new MatrixValue(item.data.map((row) => [...row]))
          : Array.isArray(item)
          ? [...item]
          : item,
      );
    return value;
  }

  // Resolve the read key: no arg → all blocks; "1" → block 1.
  _normalizeReadKey(key: BlockOrCondition): number | string {
    if (typeof key === "undefined") return ALL_BLOCKS;
    // A stringified block number ("1") is a block number, not a
    // condition label — normalize before the string branch swallows it.
    if (typeof key === "string" && /^\d+$/.test(key)) return Number(key);
    return key;
  }

  _assertReadable(name: string, key: number | string): void {
    if (typeof key === "number") {
      // Numbered reads before the block files load would crash on the null
      // condition list with a confusing TypeError — fail loudly instead.
      if (this._experiment === null)
        throw new Error(
          "[paramReader.read] Parameters not loaded yet — read() called before block files finished loading.",
        );
      if (this._blockCount !== null && key > this._blockCount)
        throw new Error("[READER] Invalid Block Number");
    }
    if (
      !(name in getGlossary()) &&
      !this._superMatchParam(name) &&
      !this._matchInternalParam(name)
    )
      throw new Error(`[paramReader.read] Invalid parameter name ${name}`);
  }

  // Given some regex, return a param:value object for all matching params
  readMatching(matchRegex: RegExp): Map<string, ParameterValue[]>;
  readMatching(
    matchRegex: RegExp,
    block: BlockReadKey,
  ): Map<string, ParameterValue[]>;
  readMatching<K extends string>(
    matchRegex: RegExp,
    key: K,
  ): Map<string, StringReadValue<K, ParameterValue>>;
  readMatching(
    matchRegex: RegExp,
    key: BlockOrCondition,
  ): Map<string, ParameterReadValue>;
  readMatching(
    matchRegex: RegExp,
    blockOrConditionName?: BlockOrCondition,
  ): Map<string, ParameterReadValue> {
    // eg matchRegex = /questionAndAnswer/
    // A /g or /y flagged regex is STATEFUL: .test() advances lastIndex, so
    // reusing the SAME regex object across many .test() calls (as Array.filter
    // does here) silently skips ~half the matches — e.g. callers passing
    // /questionAndAnswer.../g saw ~half their params missed, making the Q&A
    // trial counter read "Trial 1 of 1". The g/y flags only matter for
    // matchAll/exec loops, which we don't do here, so strip them for a fresh,
    // stateless membership test. (Leaves i/m/s/u intact.)
    const re = new RegExp(
      matchRegex.source,
      matchRegex.flags.replace(/[gy]/g, ""),
    );
    const allParams = Object.keys(getGlossary());
    const matchingParams = allParams.filter((parameterName) =>
      re.test(parameterName),
    );

    const resultMap = new Map<string, ParameterReadValue>();

    for (const param of matchingParams) {
      // Check if this is a superMatching parameter (contains @@)
      if (param.includes("@@")) {
        // Expand the superMatching parameter to find numbered instances
        const baseParam = param.replace(/@@/g, "");
        let index = 1;
        let foundParam = true;

        while (foundParam) {
          // Generate the numbered parameter name (e.g., questionAndAnswer01, questionAndAnswer02)
          const numberedParam = baseParam + String(index).padStart(2, "0");

          // Check if this numbered parameter exists in the conditions
          if (this.has(numberedParam)) {
            resultMap.set(
              numberedParam,
              this.read(numberedParam, blockOrConditionName),
            );
            index++;
          } else {
            foundParam = false;
          }
        }
      } else {
        // Regular parameter, add it directly
        resultMap.set(param, this.read(param, blockOrConditionName));
      }
    }
    return resultMap;
  }

  readString(name: string): string[];
  readString(name: string, block: BlockReadKey): string[];
  readString<K extends string>(
    name: string,
    key: K,
  ): StringReadValue<K, string>;
  readString(name: string, key: BlockOrCondition): string | string[];
  readString(name: string, key?: BlockOrCondition): string | string[] {
    return this._readPrimitive("string", name, key);
  }

  readNumber(name: string): number[];
  readNumber(name: string, block: BlockReadKey): number[];
  readNumber<K extends string>(
    name: string,
    key: K,
  ): StringReadValue<K, number>;
  readNumber(name: string, key: BlockOrCondition): number | number[];
  readNumber(name: string, key?: BlockOrCondition): number | number[] {
    return this._readPrimitive("number", name, key);
  }

  readBoolean(name: string): boolean[];
  readBoolean(name: string, block: BlockReadKey): boolean[];
  readBoolean<K extends string>(
    name: string,
    key: K,
  ): StringReadValue<K, boolean>;
  readBoolean(name: string, key: BlockOrCondition): boolean | boolean[];
  readBoolean(name: string, key?: BlockOrCondition): boolean | boolean[] {
    return this._readPrimitive("boolean", name, key);
  }

  readStringMatching(matchRegex: RegExp): Map<string, string[]>;
  readStringMatching(
    matchRegex: RegExp,
    block: BlockReadKey,
  ): Map<string, string[]>;
  readStringMatching<K extends string>(
    matchRegex: RegExp,
    key: K,
  ): Map<string, StringReadValue<K, string>>;
  readStringMatching(
    matchRegex: RegExp,
    key?: BlockOrCondition,
  ): Map<string, string | string[]> {
    const result = new Map<string, string | string[]>();
    for (const [name, value] of this.readMatching(matchRegex, key)) {
      this._assertGlossaryType("string", name);
      result.set(
        name,
        this._validatePrimitiveReadValue(
          "string",
          name,
          value,
          this._isArrayReadKey(key),
        ),
      );
    }
    return result;
  }

  private _readPrimitive<K extends PrimitiveKind>(
    kind: K,
    name: string,
    key: BlockOrCondition,
  ): PrimitiveValueFor<K> | PrimitiveValueFor<K>[] {
    this._assertGlossaryType(kind, name);
    return this._validatePrimitiveReadValue(
      kind,
      name,
      this.read(name, key),
      this._isArrayReadKey(key),
    );
  }

  private _validatePrimitiveReadValue<K extends PrimitiveKind>(
    kind: K,
    name: string,
    value: ParameterReadValue,
    arrayExpected: boolean,
  ): PrimitiveValueFor<K> | PrimitiveValueFor<K>[] {
    const validate = (item: ParameterValue): PrimitiveValueFor<K> => {
      if (typeof item !== kind)
        throw unexpectedParameterType(name, `a ${kind}`, item);
      return item as PrimitiveValueFor<K>;
    };
    if (arrayExpected) {
      if (!Array.isArray(value))
        throw unexpectedParameterType(name, "an array", value);
      return value.map(validate);
    }
    if (Array.isArray(value))
      throw unexpectedParameterType(name, `a ${kind}`, value);
    return validate(value);
  }

  private _isArrayReadKey(key: BlockOrCondition): boolean {
    const normalized = this._normalizeReadKey(key);
    return typeof normalized === "number" || normalized === ALL_BLOCKS;
  }

  private _assertGlossaryType(kind: PrimitiveKind, name: string): void {
    const type = this._glossaryType(name);
    const expected =
      kind === "string"
        ? "text, categorical, or multicategorical"
        : kind === "number"
        ? "integer or numerical"
        : "boolean";
    const accepted =
      kind === "string"
        ? STRING_GLOSSARY_TYPES.has(type ?? "")
        : kind === "number"
        ? NUMBER_GLOSSARY_TYPES.has(type ?? "")
        : type === "boolean";
    if (!accepted)
      throw new TypeError(
        `[paramReader] ${name} has glossary type "${
          type ?? "undefined"
        }"; expected ${expected}.`,
      );
  }

  private _glossaryType(name: string): string | undefined {
    const superMatchingParameter = this._superMatchingParameterName(name);
    return (
      this._glossaryEntry(name)?.type ??
      (superMatchingParameter
        ? getGlossary()[superMatchingParameter]?.type
        : undefined)
    );
  }

  has(name: string): boolean {
    if (!this.conditions || this.conditions.length === 0) return false;
    return name in this.conditions[0];
  }

  _getParam(
    name: string,
    blockOrConditionName: number | string,
  ): ParameterReadValue {
    const experiment = this._requireLoadedConditions();
    // ! String - condition name
    if (typeof blockOrConditionName === "string")
      if (blockOrConditionName !== ALL_BLOCKS) {
        for (const b of experiment) {
          if (
            b.block_condition === blockOrConditionName ||
            b.conditionName === blockOrConditionName
          ) {
            return b[name];
          }
        }
        return undefined;
      } else {
        // ! __ALL_BLOCKS__
        const returner: ParameterValue[] = [];
        for (const b of experiment) returner.push(b[name]);
        return returner;
      }

    // ! Number - block
    const returner: ParameterValue[] = [];

    for (const b of experiment)
      if (Number(b.block) === blockOrConditionName) returner.push(b[name]);

    // Underscore (and "!" internal) params are experiment-wide (global):
    // identical across all blocks. If the requested block has no
    // conditions (e.g. block 1 fully disabled), fall back to any
    // remaining condition's value.
    if (
      returner.length === 0 &&
      (name.startsWith("_") || name.startsWith("!")) &&
      experiment.length > 0
    )
      returner.push(experiment[0][name]);

    return returner;
  }

  _validateExperiment(): boolean {
    // Note. CONSERVATION OF THE BLOCK NUMBER: the first block need not be numbered 1
    // (block 1 may be fully disabled, leaving e.g. block 2 first). Consider the
    // experiment loaded once at least one condition is present.
    return Array.isArray(this._experiment) && this._experiment.length > 0;
  }

  private _superMatchingParameterName(parameter: string): string | undefined {
    for (const superMatchingParameter of getSuperMatchingParams()) {
      const possibleSharedString = superMatchingParameter.replace(/@/g, "");
      if (
        parameter.includes(possibleSharedString) &&
        superMatchingParameter.replace(possibleSharedString, "").length ===
          parameter.replace(possibleSharedString, "").length
      )
        return superMatchingParameter;
    }
    return undefined;
  }

  _superMatchParam(parameter: string): boolean {
    return this._superMatchingParameterName(parameter) !== undefined;
  }

  _matchInternalParam(parameter: string): boolean {
    return parameter in INTERNAL_GLOSSARY;
  }

  _getParamGlossary(
    name: string,
    blockOrConditionName: number | string,
  ): ParameterReadValue {
    // String
    if (typeof blockOrConditionName === "string") {
      if (blockOrConditionName !== ALL_BLOCKS) {
        // Unknown condition label (block_condition) → undefined
        // (matching _getParam's label path), never the glossary default.
        // Only decidable once conditions are loaded; pre-load reads stay
        // permissive.
        if (
          Array.isArray(this._experiment) &&
          this._experiment.length > 0 &&
          !this._experiment.some(
            (b) =>
              b.block_condition === blockOrConditionName ||
              b.conditionName === blockOrConditionName,
          )
        )
          return undefined;
        const entry = this._glossaryEntry(name);
        if (!entry) return undefined; // superMatching params absent from CSVs
        return this.parse(entry.default, entry.type);
      }
      // __ALL_BLOCKS__
      const returner: ParameterValue[] = [];
      const entry = this._glossaryEntry(name);
      const experiment = this._requireLoadedConditions();
      for (let i = 0; i < experiment.length; i++) {
        if (entry) returner.push(this.parse(entry.default, entry.type));
      }

      return returner;
    }

    // Number
    const experiment = this._requireLoadedConditions();
    let counter = 0;
    for (const b of experiment) {
      if (Number(b.block) === blockOrConditionName) counter++;
    }

    // Underscore (and "!" internal) params are global: the default is a
    // single experiment-wide value, even when the requested block has no
    // conditions.
    const copies =
      name.startsWith("_") || name.startsWith("!")
        ? Math.max(counter, 1)
        : counter;
    const entry = this._glossaryEntry(name);
    // Parse per copy: vector/matrix defaults are mutable objects, so
    // Array(copies).fill(one) would share a single reference across a
    // block's conditions.
    if (entry)
      return Array.from({ length: copies }, () =>
        this.parse(entry.default, entry.type),
      );
    return Array<ParameterValue>(counter).fill(undefined);
  }

  _loadFile(callback?: ParamReaderCallback): void {
    // Loud load failure: record, log, and surface via a window error event.
    // The callback is NOT called, so the experiment never silently "runs"
    // with zero or garbage conditions.
    const failLoad = (what: string, err?: unknown): void => {
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message?: unknown }).message
          : undefined;
      const detail = message ? String(message) : String(err);
      const error = new Error(
        `[paramReader] Failed to load experiment conditions (${what}): ${detail}`,
      );
      this._loadError = error;
      console.error(error);
      if (typeof window !== "undefined" && window.dispatchEvent) {
        window.dispatchEvent(
          new ErrorEvent("error", { error, message: error.message }),
        );
      }
    };

    Papa.parse<string[]>(`./${this._experimentFilePath}/blockCount.csv`, {
      download: true,
      error: (err) => failLoad("blockCount.csv", err),
      complete: ({ data }) => {
        this._experiment = [];

        // Empty/garbage blockCount.csv — never silently run zero blocks.
        if (!data || data.length === 0) {
          failLoad("blockCount.csv is empty or unreadable");
          return;
        }

        // CONSERVATION OF THE BLOCK NUMBER: blockCount.csv's "block" column holds
        // the ACTUAL block numbers from the spreadsheet (conserved, never
        // renumbered), so disabling/shuffling blocks leaves the numbers intact.
        // We load each block file by its conserved number, which may be sparse
        // (e.g. block_1.csv, block_3.csv when block 2 was fully disabled).
        // Skip the header row (data[0]), any blank/non-numeric rows, and
        // duplicate block numbers (a duplicated row must not duplicate the
        // block's conditions).
        const blockNumbers = Array.from(
          new Set(
            data
              .slice(1)
              .map((row) => parseInt(row[0]))
              .filter((b) => !isNaN(b)),
          ),
        );

        if (blockNumbers.length === 0) {
          failLoad("blockCount.csv lists no blocks");
          return;
        }

        // _blockCount is the highest block number, so reads keyed by block
        // number accept every conserved block number (gaps simply return []).
        this._blockCount = Math.max(...blockNumbers);

        let blocksLoaded = 0;
        for (const blockNumber of blockNumbers) {
          Papa.parse<string[]>(
            `./${this._experimentFilePath}/block_${blockNumber}.csv`,
            {
              download: true,
              error: (err) => failLoad(`block_${blockNumber}.csv`, err),
              complete: ({ data }) => {
                const headlines = data && data[0];
                // A valid block CSV always has a "block" column; anything else
                // (e.g. an HTML 404 page parsed as CSV) is a load failure.
                if (
                  !data ||
                  data.length === 0 ||
                  !Array.isArray(headlines) ||
                  !headlines.includes("block")
                ) {
                  failLoad(`block_${blockNumber}.csv is empty or malformed`);
                  return;
                }

                // Drop ragged rows with a filter — splice-while-iterating
                // skips consecutive bad rows, and the survivor then crashed
                // parse() on undefined.
                const uniformRows = data.filter(
                  (row) => row.length >= headlines.length,
                );

                // Resolve vector specs and scalar types once per column
                // (super-matched params resolve via their super entry).
                const columnTypes = headlines.map((h) => this._glossaryType(h));
                const columnSpecs = columnTypes.map((type) =>
                  type ? parseVectorType(type) : null,
                );

                for (let r = 1; r < uniformRows.length; r++) {
                  const thisCondition: Condition = {};
                  for (let c = 0; c < headlines.length; c++) {
                    // Freeze stored vector/matrix values: readers going
                    // through read() get mutable copies, but consumers
                    // iterating reader.conditions directly must not be able
                    // to silently mutate shared state.
                    const spec = columnSpecs[c];
                    thisCondition[headlines[c]] = spec
                      ? freezeVectorValue(
                          parseVectorValue(spec, uniformRows[r][c] ?? ""),
                        )
                      : this.parse(uniformRows[r][c], columnTypes[c]);
                  }
                  // safety net: compiler should already have removed disabled conditions
                  if (thisCondition.conditionEnabledBool === false) continue;
                  this._requireLoadedConditions().push(thisCondition);
                }

                blocksLoaded++;
                // reached only when all blocks are loaded
                if (blocksLoaded === blockNumbers.length) {
                  // Every row loaded, but nothing usable (e.g. all disabled)
                  // — fail loudly instead of hanging on the validate poll.
                  if (this._requireLoadedConditions().length === 0) {
                    failLoad("no enabled conditions in any block file");
                    return;
                  }
                  if (callback && typeof callback === "function") {
                    const validateInterval = setInterval(() => {
                      if (this._validateExperiment()) {
                        clearInterval(validateInterval);
                        callback(this);
                      }
                    }, 500);
                  }
                }
              },
            },
          );
        }
      },
    });
  }

  _glossaryEntry(name: string): RuntimeGlossaryEntry | undefined {
    // Internal ("!"-prefixed) params fall back to INTERNAL_GLOSSARY when
    // absent from the fetched glossary (e.g. older compiled experiments).
    return getGlossary()[name] || INTERNAL_GLOSSARY[name];
  }

  parse(s: string | null | undefined, type?: string): ParameterValue {
    // Missing cells (ragged CSVs) — pass through instead of crashing.
    if (s === undefined || s === null) return s;
    // Block CSVs are read raw; canonicalize cell ends with the compiler's
    // shared blank rule (defense for hand-edited conditions files).
    const normalized = stripBlankEnds(s);
    // Vector/matrix-typed params cast to number[]/MatrixValue.
    if (type) {
      const spec = parseVectorType(type);
      if (spec) return parseVectorValue(spec, normalized);
    }
    // Text-like params remain strings even when cells look numeric or boolean.
    if (type && STRING_GLOSSARY_TYPES.has(type)) return normalized;
    // Translate TRUE and FALSE
    // Translate number to number
    if (normalized.toLowerCase() === "true") return true;
    if (normalized.toLowerCase() === "false") return false;

    if (!isNaN(Number(normalized)) && normalized !== "")
      return Number(normalized);

    return String(normalized);
  }

  get blockCount(): number | null {
    return this._blockCount;
  }

  get conditions(): Condition[] | null {
    return this._experiment;
  }

  get block_conditions(): string[] {
    return this._requireLoadedConditions().map((condition) => {
      const label = condition.block_condition;
      if (typeof label !== "string")
        throw new Error(
          "[paramReader.block_conditions] Condition is missing a block_condition label.",
        );
      return label;
    });
  }

  private _requireLoadedConditions(): Condition[] {
    if (this._experiment === null)
      throw new Error(
        "[paramReader] Parameters not loaded yet — block files have not finished loading.",
      );
    return this._experiment;
  }
}

/** Assigned by the application entry point before any consumer reads it. */
export let paramReader: ParamReader;

/** The single construction site for the participant runtime's reader. */
export const createRuntimeParamReader = (
  onReady: ParamReaderCallback,
): ParamReader => {
  paramReader = new ParamReader("conditions", onReady);
  return paramReader;
};
