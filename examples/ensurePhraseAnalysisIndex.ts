import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

export const ensurePhraseAnalysisIndex = (): void => {
  const websiteRoot = resolve(__dirname, "../../../..");
  execFileSync(
    process.execPath,
    [resolve(websiteRoot, "scripts/phrase-analysis/build.mjs")],
    { cwd: websiteRoot, stdio: "inherit" },
  );
};
