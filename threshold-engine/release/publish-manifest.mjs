import { readFile, appendFile } from "node:fs/promises";
import { releaseConfig, digest } from "./config.mjs";
const { base } = releaseConfig(process.env);
const manifest = JSON.parse(await readFile("release-manifest.json", "utf8"));
const artifact = `https://cdn.jsdelivr.net/npm/${manifest.engine.package}@${manifest.engine.version}`;
// CDN propagation can lag npm publication. Never advance latest until it agrees.
let available = false;
for (let attempt = 0; attempt < 18; attempt++) {
  try {
    const response = await fetch(`${artifact}/dist/index.js`, {
      signal: AbortSignal.timeout(15000),
    });
    if (
      response.ok &&
      (await digest(Buffer.from(await response.arrayBuffer()))) ===
        manifest.engine.integrity
    ) {
      available = true;
      break;
    }
  } catch {
    /* Retry transient CDN failures. */
  }
  await new Promise((resolve) => setTimeout(resolve, 10000));
}
if (!available)
  throw new Error(
    "Published engine is not yet available with the expected integrity; rerun this workflow",
  );
const endpoint = `${base}/.netlify/functions/release-manifest`;
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${process.env.RELEASE_MANIFEST_SECRET}`,
  },
  body: JSON.stringify(manifest),
  signal: AbortSignal.timeout(60000),
});
if (!response.ok)
  throw new Error(
    `Manifest publication failed: ${response.status} ${await response.text()}`,
  );
const publication = await response.json();
manifest.releaseId = publication.releaseId;
const readback = await fetch(
  `${endpoint}?release=${encodeURIComponent(manifest.releaseId)}`,
);
const stored = await readback.json();
if (
  !readback.ok ||
  stored.engine?.integrity !== manifest.engine.integrity ||
  stored.engine?.version !== manifest.engine.version
)
  throw new Error("Published release read-back mismatch");
await appendFile(
  process.env.GITHUB_STEP_SUMMARY,
  `## EasyEyes ${
    manifest.releaseId
  }\n\n- [Compiler](${base}/compiler/)\n- [Release manifest](${endpoint}?release=${encodeURIComponent(
    manifest.releaseId,
  )})\n- [Engine](${artifact}/dist/index.js)\n- [Participant runtime](${artifact}/runtime/js/threshold.min.js)\n- [Available releases](${endpoint}?list)\n`,
);
