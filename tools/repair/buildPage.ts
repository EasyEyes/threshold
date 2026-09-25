// @ts-nocheck
/**
 * Build the self-contained repair page:
 *   esbuild page.ts -> IIFE repair.js
 * Output goes to tools/repair/dist/ and, when present, is copied into the
 * EasyEyes website repo (../../.. from threshold = website/docs/repair),
 * which serves it at easyeyes.app/repair.
 */
import { buildSync } from "esbuild";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "dist");
mkdirSync(outDir, { recursive: true });

const result = buildSync({
  entryPoints: [path.join(here, "page.ts")],
  bundle: true,
  format: "iife",
  minify: true,
  outfile: path.join(outDir, "repair.js"),
  loader: { ".ts": "ts" },
  logLevel: "silent",
});
if (result.errors.length) {
  console.error(result.errors);
  process.exit(1);
}
copyFileSync(path.join(here, "index.html"), path.join(outDir, "index.html"));

// Deploy into the website repo when it is checked out next to us:
// threshold/ -> experiment/ -> docs/ (the EasyEyes/website checkout).
const siteRepair = path.resolve(here, "..", "..", "..", "..", "repair");
if (existsSync(path.join(siteRepair, "..", "uni.css"))) {
  mkdirSync(siteRepair, { recursive: true });
  copyFileSync(
    path.join(outDir, "index.html"),
    path.join(siteRepair, "index.html"),
  );
  copyFileSync(
    path.join(outDir, "repair.js"),
    path.join(siteRepair, "repair.js"),
  );
  console.log(`deployed -> ${siteRepair}`);
} else {
  console.log(
    `built -> ${outDir} (website checkout not found; skipped deploy)`,
  );
}
