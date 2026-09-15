/**
 * FROZEN CONTRACT — the compiled-data format.
 *
 * The schema of what the participant runtime reads from a compiled
 * experiment repo: block condition CSVs, the block index, generated config
 * files, and resource files.
 *
 * See ADR 0001: Freeze the engine.compile() and compiled-data contracts.
 *
 * Append-only rules: CSV schemas may only gain columns, path unions may only
 * gain members, config objects may only gain optional fields. Nothing may
 * ever be removed, renamed, or repurposed. A repo may contain files beyond
 * these paths (e.g. a legacy copied runtime bundle); this contract covers
 * only the files the runtime reads as data.
 */

/**
 * The integer format version. Its absence from a repo means version 1
 * (equivalently: legacy, pre-versioning).
 */
export const COMPILED_DATA_FORMAT_VERSION = 1;

/** One block's condition file: conditions/block_<N>.csv, N the conserved block number. */
export type BlockFilePath = `conditions/block_${number}.csv`;

/**
 * The resource directories, one per resource kind. Append-only: new kinds
 * may be added; existing names are never removed or repurposed.
 */
export type ResourceDirName =
  | "fonts"
  | "forms"
  | "texts"
  | "folders"
  | "images"
  | "code"
  | "impulseResponses"
  | "frequencyResponses"
  | "targetSoundLists"
  | "phrases";

/** A resource file inside its kind's directory. */
export type ResourcePath = `${ResourceDirName}/${string}`;

/**
 * Every path the runtime reads as data from a compiled experiment repo.
 * The bare `${string}.csv` member is the (cleaned) experiment table
 * republished at the repo root under its original filename.
 */
export type CompiledDataPath =
  | `${string}.csv`
  | BlockFilePath
  | "conditions/blockCount.csv"
  | "CompatibilityRequirements.txt"
  | "Duration.txt"
  | "js/experimentLanguage.js"
  | "typekit.json"
  | "recruitmentServiceConfig.csv"
  | "ProlificStudyId.txt"
  | ResourcePath;

/**
 * One row of a conditions/block_<N>.csv file: one condition. Columns are
 * experiment parameter names (plus internal "!"/"_"-prefixed params added by
 * the compiler); every cell is text. The "block" column always holds the
 * conserved block number from the scientist's spreadsheet — the runtime
 * loads block files by this number and never renumbers.
 */
export interface BlockConditionRow {
  block: string;
  [parameterName: string]: string;
}

/**
 * One row of conditions/blockCount.csv: one per block, in experiment order.
 */
export interface BlockCountRow {
  /** Conserved block number (matches the block file's <N>). */
  block: string;
  targetKind: string;
  targetTask: string;
  /** Append-only: future releases may add columns. */
  [column: string]: string;
}

/** Content of typekit.json (present when the experiment uses Adobe fonts). */
export interface TypekitConfig {
  kitId: string;
}
