/**
 * Bundles the engine as a single self-contained ESM file (dist/index.js).
 *
 * Everything the compiler needs — xlsx, papaparse, dataframe-js, and the
 * threshold modules preprocess/ imports from outside its own directory —
 * is bundled in. A bare dynamic import() of the output must work with no
 * further network requests.
 */
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(here, "package.json"), "utf8"));

/**
 * preprocess/main.ts imports getProlificToken from ./gitlabUtils — the one
 * reach into the shell's GitLab commit machinery. Redirect it to the engine
 * shim (see src/shims/gitlabUtils.ts). Any other import of gitlabUtils in
 * the closure would fail the build loudly, which is what we want.
 */
const shimGitlabUtils = {
  name: "shim-gitlab-utils",
  setup(buildApi) {
    buildApi.onResolve({ filter: /\/gitlabUtils$/ }, (args) => ({
      path: path.join(here, "src/shims/gitlabUtils.ts"),
    }));
  },
};

/**
 * Browser-field fixups, mirroring what the production shell's webpack build
 * resolves: d3-request (via dataframe-js) must use its ESM entry, which uses
 * the browser's native XMLHttpRequest — its CJS "main" is the node build,
 * which drags in node builtins. dataframe-js itself declares `fs: false`
 * for browsers.
 */
const browserResolveFixups = {
  name: "browser-resolve-fixups",
  setup(buildApi) {
    const thresholdNodeModules = path.join(here, "../node_modules");
    // Node-only helper, reached solely through guarded dynamic import()s in
    // node mode; the production vite build externalizes it the same way.
    buildApi.onResolve({ filter: /nodeLocal\.js$/ }, () => ({
      path: "./nodeLocal.js",
      external: true,
    }));
    buildApi.onResolve({ filter: /^d3-request$/ }, () => ({
      path: path.join(thresholdNodeModules, "d3-request/index.js"),
    }));
    buildApi.onResolve({ filter: /^fs$/ }, () => ({
      path: "fs",
      namespace: "empty-module",
    }));
    buildApi.onLoad({ filter: /.*/, namespace: "empty-module" }, () => ({
      contents: "export default {};",
      loader: "js",
    }));
  },
};

const result = await build({
  entryPoints: [path.join(here, "src/index.ts")],
  outfile: path.join(here, "dist/index.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  sourcemap: false,
  metafile: true,
  logLevel: "info",
  define: {
    ENGINE_NAME: JSON.stringify(pkg.name),
    ENGINE_VERSION: JSON.stringify(pkg.version),
    // The shell's production builds define this (falsy in production);
    // without it, `process` is undefined in the browser.
    "process.env.debug": "undefined",
  },
  plugins: [shimGitlabUtils, browserResolveFixups],
});

const { writeFileSync, copyFileSync } = await import("node:fs");
writeFileSync(
  path.join(here, "dist/meta.json"),
  JSON.stringify(result.metafile),
);

// The font-introspection wasm is resolved at runtime relative to the module
// URL (`new URL("easyeyes_wasm_bg.wasm", import.meta.url)`), so it ships
// next to dist/index.js. If unavailable, the compiler degrades gracefully
// (same as production: font introspection checks are skipped with a warning).
copyFileSync(
  path.join(here, "../@rust/pkg/easyeyes_wasm_bg.wasm"),
  path.join(here, "dist/easyeyes_wasm_bg.wasm"),
);
