import { appendFile } from "node:fs/promises";
import { releaseConfig } from "./config.mjs";
const { base } = releaseConfig(process.env);
const endpoint = `${base}/.netlify/functions/release-manifest?deploymentId=${process.env.NETLIFY_DEPLOY_ID}`;
const response = await fetch(endpoint, { signal: AbortSignal.timeout(30000) });
if (response.ok) {
  const manifest = await response.json();
  if (manifest.source?.thresholdRevision !== process.env.ENGINE_SOURCE_SHA)
    throw new Error("Existing release does not match source revision");
  await appendFile(process.env.GITHUB_OUTPUT, "publish=false\n");
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `Release already published: ${manifest.releaseId}\n`,
  );
} else if (response.status === 404) {
  await appendFile(process.env.GITHUB_OUTPUT, "publish=true\n");
} else throw new Error(`Release endpoint unavailable: ${response.status}`);
