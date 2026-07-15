/* tslint:disable */
/* eslint-disable */
/**
 * Initialize the WASM module
 */
export function init(): void;
/**
 * Apply stylistic sets by injecting their GSUB lookups into the calt feature.
 * The calt (Contextual Alternates) feature is typically enabled by default in
 * browsers and runs for all text, making it suitable for applying stylistic
 * set substitutions.
 */
export function apply_stylistic_sets(
  font_data: Uint8Array,
  stylistic_sets: string,
): Uint8Array;
/**
 * Apply OpenType feature settings by injecting each enabled feature's GSUB
 * lookups into the calt feature. The Canvas 2D API has no font-feature-settings,
 * so this "bakes" the features into the font binary. Tags are validated up front
 * by the compiler. Disabling (value 0) clears the feature's lookup indices.
 */
export function apply_feature_settings(
  font_data: Uint8Array,
  feature_settings: string,
): Uint8Array;
export function generate_static_font_instance(
  font_data: Uint8Array,
  variable_settings: string,
): Uint8Array;
/**
 * Process a font: apply variable-font instancing, then bake stylistic sets AND
 * feature settings into `calt` in a single GSUB rebuild (the lookups are
 * deduped, so overlapping features cost nothing extra).
 */
export function process_font(
  font_data: Uint8Array,
  variable_settings: string,
  stylistic_sets: string,
  feature_settings: string,
): Uint8Array;
/**
 * Get variable font axes information as JSON.
 * Returns JSON with isVariable flag and axis details (tag, min, max, default).
 * Used by the compiler to validate fontVariableSettings at compile time.
 */
export function get_font_variable_axes(font_data: Uint8Array): string;
/**
 * Check whether a font supports a shaperglot language id (e.g. "ar_Arab").
 */
export function check_font_language_support(
  font_data: Uint8Array,
  language_id: string,
): string;
/**
 * Check whether every significant character in `text` is covered by the font.
 * Whitespace and default-ignorable characters are skipped.
 */
export function check_font_text_coverage(
  font_data: Uint8Array,
  text: string,
): string;

export type InitInput =
  | RequestInfo
  | URL
  | Response
  | BufferSource
  | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly apply_feature_settings: (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => [number, number, number, number];
  readonly apply_stylistic_sets: (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => [number, number, number, number];
  readonly check_font_language_support: (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => [number, number];
  readonly check_font_text_coverage: (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => [number, number];
  readonly generate_static_font_instance: (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => [number, number, number, number];
  readonly get_font_variable_axes: (
    a: number,
    b: number,
  ) => [number, number, number, number];
  readonly init: () => void;
  readonly process_font: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
    g: number,
    h: number,
  ) => [number, number, number, number];
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(
  module: { module: SyncInitInput } | SyncInitInput,
): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init(
  module_or_path?:
    | { module_or_path: InitInput | Promise<InitInput> }
    | InitInput
    | Promise<InitInput>,
): Promise<InitOutput>;
