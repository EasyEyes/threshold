/** Bundles the parity oracle (production compiler, driven directly) for node. */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

const shimGitlabUtils = {
  name: "shim-gitlab-utils",
  setup(buildApi) {
    buildApi.onResolve({ filter: /\/gitlabUtils$/ }, () => ({
      path: path.join(here, "../src/shims/gitlabUtils.ts"),
    }));
    buildApi.onResolve({ filter: /nodeLocal\.js$/ }, () => ({
      path: "./nodeLocal.js",
      external: true,
    }));
  },
};

await build({
  entryPoints: [path.join(here, "oracle-entry.ts")],
  outfile: path.join(here, "dist/oracle.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  logLevel: "warning",
  banner: {
    js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);',
  },
  define: { "process.env.debug": "undefined" },
  plugins: [shimGitlabUtils],
});
console.log("oracle built: parity/dist/oracle.mjs");
