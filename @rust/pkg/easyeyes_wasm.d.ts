/* tslint:disable */
/* eslint-disable */
/**
 * Apply stylistic sets by injecting their GSUB lookups into the calt feature.
 * The calt (Contextual Alternates) feature is typically enabled by default in browsers
 * and runs for all text, making it suitable for applying stylistic set substitutions.
 */
export function apply_stylistic_sets(
  font_data: Uint8Array,
  stylistic_sets: string,
): Uint8Array;
export function generate_static_font_instance(
  font_data: Uint8Array,
  variable_settings: string,
): Uint8Array;
export function process_font(
  font_data: Uint8Array,
  variable_settings: string,
  stylistic_sets: string,
): Uint8Array;
/**
 * Get variable font axes information as JSON.
 * Returns JSON with isVariable flag and axis details (tag, min, max, default).
 * Used by the compiler to validate fontVariableSettings at compile time.
 */
export function get_font_variable_axes(font_data: Uint8Array): string;
/**
 * Initialize the WASM module
 */
export function init(): void;

export type InitInput =
  | RequestInfo
  | URL
  | Response
  | BufferSource
  | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly apply_stylistic_sets: (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => [number, number, number, number];
  readonly generate_static_font_instance: (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => [number, number, number, number];
  readonly process_font: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ) => [number, number, number, number];
  readonly get_font_variable_axes: (
    a: number,
    b: number,
  ) => [number, number, number, number];
  readonly init: () => void;
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
