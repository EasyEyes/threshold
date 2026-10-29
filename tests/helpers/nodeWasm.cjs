// Load the browser's committed WASM artifact without a second Rust build.
// Compile only its ESM glue; the font-processing WASM bytes stay unchanged.
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { pathToFileURL } = require("node:url");
const { compileFunction } = require("node:vm");
const ts = require("typescript");

const gluePath = resolve(__dirname, "../../@rust/pkg/easyeyes_wasm.js");
const source = readFileSync(gluePath, "utf8").replaceAll(
  "import.meta.url",
  JSON.stringify(pathToFileURL(gluePath).href),
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});
const wasm = {};
// Construct initSync's options in the glue's realm (Jest has its own globals).
compileFunction(outputText + "\nexports.initSync({ module: wasmBytes });", [
  "exports",
  "wasmBytes",
])(
  wasm,
  readFileSync(resolve(__dirname, "../../@rust/pkg/easyeyes_wasm_bg.wasm")),
);
module.exports = wasm;
