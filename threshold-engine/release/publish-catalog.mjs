import { appendFile } from "node:fs/promises";
import { digest } from "./config.mjs";

const base = new URL(process.env.EASYEYES_BASE_URL);
if (
  base.protocol !== "https:" ||
  base.pathname !== "/" ||
  base.search ||
  base.hash ||
  !(
    /^[a-f0-9]{24}--easyeyes\.netlify\.app$/.test(base.hostname) ||
    base.hostname === "easyeyes.app"
  )
)
  throw new Error(
    "Catalog release needs a production or immutable preview origin",
  );
if (
  (process.env.RELEASE_CONTEXT === "production") !==
  (base.hostname === "easyeyes.app")
)
  throw new Error("Catalog release context does not match origin");
if (!process.env.RELEASE_MANIFEST_SECRET)
  throw new Error("RELEASE_MANIFEST_SECRET is required");
const endpoint = `${base.origin}/.netlify/functions/release-manifest`;
const json = async (url) => {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(`Catalog release read failed: ${response.status}`);
  return response.json();
};
const previous = await json(`${endpoint}?latest`);
const catalog = async (name) => {
  const address = `${base.origin}/.netlify/functions/${name}`;
  const { version } = await json(`${address}?versionOnly=1`);
  if (typeof version !== "string" || !version)
    throw new Error(`No published ${name} version`);
  return {
    version,
    digest: await digest(
      JSON.stringify(await json(`${address}?v=${encodeURIComponent(version)}`)),
    ),
  };
};
const [phrases, glossary, report] = await Promise.all([
  catalog("phrases"),
  catalog("glossary"),
  json(`${base.origin}/.netlify/functions/catalog-usage-report?latest`),
]);
if (report.freshness?.status !== "current" || !report.publication?.reportId)
  throw new Error("A current catalog usage report is required");
if (
  phrases.version === previous.phrases.version &&
  glossary.version === previous.glossary.version
)
  throw new Error("Neither Phrase nor Glossary version changed");
const manifest = {
  schemaVersion: 1,
  contractVersion: previous.contractVersion,
  engine: previous.engine,
  phrases,
  glossary,
  catalogUsageReportId: report.publication.reportId,
  publishedAt: new Date().toISOString(),
  source: { catalogOnly: true, previousReleaseId: previous.releaseId },
};
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
    `Catalog publication failed: ${response.status} ${await response.text()}`,
  );
const { releaseId } = await response.json();
const published = await json(
  `${endpoint}?release=${encodeURIComponent(releaseId)}`,
);
if (
  published.engine.integrity !== manifest.engine.integrity ||
  published.phrases.version !== phrases.version ||
  published.glossary.version !== glossary.version
)
  throw new Error("Catalog release read-back mismatch");
await appendFile(
  process.env.GITHUB_STEP_SUMMARY,
  `## EasyEyes ${releaseId}\n\n- [Manifest](${endpoint}?release=${encodeURIComponent(
    releaseId,
  )})\n- [Available releases](${endpoint}?list)\n`,
);
