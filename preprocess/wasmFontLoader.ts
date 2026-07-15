/**
 * Lazy loader for the EasyEyes Rust WASM module (@rust/pkg).
 * Shared by font variable settings, language support, and corpus checks.
 */

let easyEyesWasm: any = null;

const isNodeEnvironment = (): boolean =>
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

const initEasyEyesWasmBrowser = async (): Promise<any> => {
  const wasm = await import("../@rust/pkg/easyeyes_wasm.js");
  await wasm.default();
  return wasm;
};

// The imports below are hidden from webpack via new Function: TypeScript's
// downleveling of import() drops /* webpackIgnore */ magic comments, so
// webpack saw "the request of a dependency is an expression" and emitted a
// Critical dependency warning while trying to bundle these Node-only
// imports. Same pattern as loadHarfbuzz in fontShapingCheck.ts.
const initEasyEyesWasmNode = async (): Promise<any> => {
  const dynamicImport = new Function("s", "return import(s)") as (
    specifier: string,
  ) => Promise<any>;
  const fs = await dynamicImport("fs");
  const path = await dynamicImport("path");
  const { pathToFileURL } = await dynamicImport("url");
  const wasmJsPath = path.resolve(__dirname, "../@rust/pkg/easyeyes_wasm.js");
  const wasm = await dynamicImport(pathToFileURL(wasmJsPath).href);
  const wasmBytes = fs.readFileSync(
    path.join(path.dirname(wasmJsPath), "easyeyes_wasm_bg.wasm"),
  );
  wasm.initSync({ module: wasmBytes });
  return wasm;
};

/** Load and initialize the EasyEyes WASM module once. */
export const initEasyEyesWasm = async (): Promise<any | null> => {
  if (easyEyesWasm) return easyEyesWasm;
  try {
    easyEyesWasm = isNodeEnvironment()
      ? await initEasyEyesWasmNode()
      : await initEasyEyesWasmBrowser();
    return easyEyesWasm;
  } catch (error) {
    console.warn(
      "[EasyEyes WASM] Module not available; skipping font checks that require it.",
      error,
    );
    return null;
  }
};
