import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { PhraseSourceIndex } from "../preprocess/phrasePathAnalysis";

/** Rebuild stale source analysis using the same fingerprint checks as deployment. */
export function loadLocalAnalysisIndex(
  websiteRoot = resolve(__dirname, "../../../.."),
): PhraseSourceIndex {
  try {
    execFileSync(
      process.execPath,
      [resolve(websiteRoot, "scripts/phrase-analysis/build.mjs")],
      { stdio: "pipe", timeout: 120_000 },
    );
    return JSON.parse(
      readFileSync(
        resolve(
          websiteRoot,
          "netlify/functions/study-phrase-analysis/source-index.json",
        ),
        "utf8",
      ),
    ) as PhraseSourceIndex;
  } catch (cause) {
    throw new Error(
      "Local source analysis unavailable. Compilation is blocked. Ensure the website checkout and its dependencies are available, and fix any source-index build errors.",
      { cause },
    );
  }
}
