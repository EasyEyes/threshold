import { readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { releaseConfig, digest } from "./config.mjs";
const config = releaseConfig(process.env);
if (!process.env.RELEASE_MANIFEST_SECRET)
  throw new Error("RELEASE_MANIFEST_SECRET is required");
const pkg = JSON.parse(await readFile("package.json", "utf8"));
if (pkg.version !== config.version)
  throw new Error("Assign release version before building the engine");
const json = async (url) => {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(`Release read failed: ${response.status} ${url}`);
  return response.json();
};
const catalog = async (name) => {
  const endpoint = `${config.base}/.netlify/functions/${name}`;
  const { version } = await json(`${endpoint}?versionOnly=1`);
  if (typeof version !== "string" || !version)
    throw new Error(`No published ${name} version`);
  const data = await json(`${endpoint}?v=${encodeURIComponent(version)}`);
  return { version, digest: await digest(JSON.stringify(data)) };
};
const [phrases, glossary, report] = await Promise.all([
  catalog("phrases"),
  catalog("glossary"),
  json(`${config.base}/.netlify/functions/catalog-usage-report?latest`),
]);
if (report.freshness?.status !== "current" || !report.publication?.reportId)
  throw new Error("A current catalog usage report is required");
const { contractVersion } = await import(
  pathToFileURL(path.resolve("dist/index.js")).href
);
const publishedAt = new Date().toISOString();
const manifest = {
  schemaVersion: 1,
  contractVersion,
  engine: {
    package: pkg.name,
    version: pkg.version,
    integrity: await digest(await readFile("dist/index.js")),
  },
  phrases,
  glossary,
  catalogUsageReportId: report.publication.reportId,
  publishedAt,
  source: {
    deploymentId: process.env.NETLIFY_DEPLOY_ID,
    thresholdRevision: process.env.ENGINE_SOURCE_SHA,
    websiteBranch: process.env.WEBSITE_BRANCH,
  },
};
await writeFile(
  "release-manifest.json",
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await appendFile(
  process.env.GITHUB_OUTPUT,
  `tag=${config.tag}\nversion=${config.version}\n`,
);
