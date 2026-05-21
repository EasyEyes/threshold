import { build } from "esbuild";
import { resolve } from "path";

export default async function globalSetup(): Promise<void> {
  await build({
    entryPoints: [resolve(__dirname, "fixture/harness.ts")],
    bundle: true,
    outfile: resolve(__dirname, "fixture/harness.bundle.js"),
    platform: "browser",
    target: "es2020",
    format: "iife",
    // esbuild resolves extensionless imports (.ts, .js) automatically
  });
  console.log("[global-setup] fixture bundle built");
}
