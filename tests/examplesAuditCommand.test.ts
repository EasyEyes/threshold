/** @jest-environment node */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";
import { loadGlossaryForTests } from "./helpers/glossary";
import { loadPhrasesForTests } from "./helpers/phrases";
import { glossaryAuditFixture } from "./helpers/glossaryAudit";

jest.setTimeout(120_000);
const root = path.resolve(__dirname, "..");
const examples = path.join(root, "examples");
const name = `node-audit-${process.pid}`;
const output = path.join(examples, "generated", name);
const otherOutput = path.join(examples, "generated", `${name}-other`);
const table = path.join(examples, "tables", `${name}.csv`);
let temp: string;
let cache: string;
let preload: string;
let validTable: string;
const validPhraseKey = "EE_ConsentTitle";
const repoCacheSnapshot = new Map<string, Buffer | undefined>();

beforeAll(async () => {
  await loadGlossaryForTests();
  const phrases = (await loadPhrasesForTests()) as {
    phrases: Record<string, unknown>;
  };
  expect(phrases.phrases).toHaveProperty(validPhraseKey);
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "ee-example-audit-"));
  // Private cache dir: the repo's examples/.cache is read by every concurrent
  // build, so mutating it here leaks into other suites' runs.
  cache = path.join(temp, "cache");
  fs.mkdirSync(cache, { recursive: true });
  for (const resource of ["glossary", "phrases"]) {
    const repoFile = path.join(examples, ".cache", `${resource}.json`);
    repoCacheSnapshot.set(
      repoFile,
      fs.existsSync(repoFile) ? fs.readFileSync(repoFile) : undefined,
    );
    const payload = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "__cache__", `${resource}.json`),
        "utf8",
      ),
    );
    fs.writeFileSync(
      path.join(cache, `${resource}.json`),
      JSON.stringify({
        fetchedAt: Date.now(),
        pinnedVersion: payload.version,
        payload,
      }),
    );
  }
  fs.writeFileSync(
    path.join(temp, "audit.json"),
    JSON.stringify(glossaryAuditFixture()),
  );
  for (const resource of ["glossary", "phrases"])
    fs.copyFileSync(
      path.join(__dirname, "__cache__", `${resource}.json`),
      path.join(temp, `${resource}.json`),
    );
  preload = path.join(temp, "fetch.cjs");
  fs.writeFileSync(
    preload,
    `
    const fs = require("fs");
    if (process.env.EE_TEST_AUDIT?.startsWith("color-")) {
      const Module = require("module");
      const load = Module._load;
      Module._load = function (request, ...args) {
        const imported = load.call(this, request, ...args);
        if (request.endsWith("terminalFormat"))
          Object.defineProperty(process.stdout, "isTTY", {value:true, configurable:true});
        if (process.env.EE_TEST_AUDIT === "color-matching" && request.endsWith("localAnalysisIndex"))
          return {
            ...imported,
            loadLocalAnalysisIndex: (...options) => {
              const index = imported.loadLocalAnalysisIndex(...options);
              return {
                ...index,
                sites: [...index.sites, {
                  id: "terminal-warning-fixture",
                  file: "terminal-warning-fixture.js",
                  line: 1,
                  keys: ["EE_terminalWarningFixture"],
                  guards: []
                }]
              };
            }
          };
        return imported;
      };
    }
    if (process.env.EE_TEST_AUDIT === "builder-failure") {
      const cp = require("child_process");
      const exec = cp.execFileSync;
      cp.execFileSync = (file, args, options) => {
        if (args?.[0]?.endsWith("scripts/phrase-analysis/build.mjs"))
          throw new Error("Source-index builder unavailable");
        return exec(file, args, options);
      };
    }
    if (process.env.EE_TEST_AUDIT === "refresh-batch-still-stale") {
      const readDir = fs.readdirSync;
      fs.readdirSync = (dir, ...args) => String(dir) === "tables/"
        ? [${JSON.stringify(`${name}.csv`)}, ${JSON.stringify(
          `${name}-other.csv`,
        )}]
        : readDir(dir, ...args);
    }
    const audit = JSON.parse(fs.readFileSync(${JSON.stringify(
      path.join(temp, "audit.json"),
    )}, "utf8"));
    globalThis.fetch = async (url, options) => {
      const mode = process.env.EE_TEST_AUDIT;
      if (mode.startsWith("refresh-")) {
        fs.appendFileSync(${JSON.stringify(
          path.join(temp, "requests.jsonl"),
        )}, JSON.stringify({url:String(url),method:options?.method || "GET"}) + "\\n");
      }
        for (const resource of ["glossary", "phrases"]) {
          if (String(url) === "https://easyeyes.app/.netlify/functions/" + resource) {
            if (mode === "refresh-fetch-failure-" + resource) return new Response("Unavailable", {status:503});
            const payload = JSON.parse(fs.readFileSync(${JSON.stringify(
              temp,
            )} + "/" + resource + ".json", "utf8"));
            return new Response(JSON.stringify(options?.method === "PUT" ? {version:payload.version} : payload));
          }
        }
      if (String(url).startsWith("https://fonts.googleapis.com/")) return new Response("/* font catalog fixture */");
      if (String(url).startsWith("https://docs.google.com/spreadsheets/")) return new Response("INPUT PARAMETER,TYPE\\nfont,text");
      if (String(url) !== "https://easyeyes.app/.netlify/functions/glossary-audit-compiler")
        throw new Error("Unexpected network request: " + url);
      if (mode === "refresh-still-stale" || mode === "refresh-batch-still-stale") audit.glossaryVersion = "hosted-audit-behind";
      if (mode === "refresh-unavailable") return new Response("Unavailable", { status: 503 });
      if (mode === "unavailable") return new Response("Unavailable", { status: 503 });
      if (mode === "stale") audit.glossaryVersion = "stale";
      if (mode === "incomplete" || mode === "refresh-incomplete") audit.usedKeys = [];
      if (mode === "unused" || mode === "color-unused") {
        audit.usedKeys = audit.usedKeys.filter((key) => key !== "font");
        audit.unusedKeys = ["font"];
      }
      return new Response(JSON.stringify(audit));
    };
  `,
  );
  validTable = fs
    .readFileSync(path.join(examples, "tables/minimalExperiment.csv"), "utf8")
    .replace("simple threshold", `${validPhraseKey} simple threshold`);
  fs.writeFileSync(table, validTable);
  fs.mkdirSync(otherOutput, { recursive: true });
  fs.writeFileSync(path.join(otherOutput, "preserved.txt"), "other example");
});

afterAll(() => {
  // The suite must never have touched the repo's shared cache.
  for (const [file, bytes] of repoCacheSnapshot) {
    const now = fs.existsSync(file) ? fs.readFileSync(file) : undefined;
    expect(now?.toString()).toBe(bytes?.toString());
  }
  for (const file of [table, output, otherOutput, temp])
    if (file) fs.rmSync(file, { recursive: true, force: true });
});

const runExample = (mode: string) =>
  spawnSync(
    process.execPath,
    [
      "--require",
      preload,
      path.join(root, "node_modules/tsx/dist/cli.mjs"),
      "buildExamples.ts",
      ...(mode === "refresh-batch-still-stale" ? [] : [`${name}.csv`]),
    ],
    {
      cwd: examples,
      env: {
        ...process.env,
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require=${preload}`,
        GLOSSARY_URL: "",
        PHRASES_URL: "",
        EXAMPLES_NO_CACHE: "",
        EXAMPLES_CACHE_DIR: cache,
        EE_TEST_AUDIT: mode,
        NO_COLOR: mode.startsWith("color-") ? "" : process.env.NO_COLOR,
      },
      encoding: "utf8",
      timeout: 30_000,
    },
  );

it.each(["unavailable", "stale", "incomplete", "unused"])(
  "A2/A3/A4 compiles silently when the optional audit report is %s",
  (mode) => {
    fs.rmSync(output, { recursive: true, force: true });
    const result = runExample(mode);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("WARNINGS");
    expect(result.stdout).not.toContain("Glossary audit unavailable");
    expect(result.stdout).not.toContain(
      "Glossary parameter not audited as used",
    );
    expect(result.stdout).toContain("SUCCESS");
    expect(fs.existsSync(path.join(output, "index.html"))).toBe(true);
    expect(
      fs.readFileSync(path.join(otherOutput, "preserved.txt"), "utf8"),
    ).toBe("other example");
  },
);

it("preserves existing output when the source-index build fails", () => {
  const valid = runExample("matching");
  expect(valid.status).toBe(0);
  expect(valid.stdout).toContain("SUCCESS");
  const previous = fs.readFileSync(path.join(output, "index.html"));
  const failedBuild = runExample("builder-failure");
  expect(failedBuild.error).toBeUndefined();
  expect(failedBuild.status).toBe(1);
  expect(failedBuild.stderr).toContain("Local source analysis unavailable");
  expect(failedBuild.stdout).not.toContain("SUCCESS");
  expect(fs.readFileSync(path.join(output, "index.html"))).toEqual(previous);
  expect(fs.existsSync(path.join(otherOutput, "preserved.txt"))).toBe(true);
});

it("blocks the same study with an undefined phrase even when its glossary audit passes, then recovers", () => {
  fs.rmSync(output, { recursive: true, force: true });
  fs.writeFileSync(
    table,
    validTable.replace(
      validPhraseKey,
      "EE_LocalAuditUndefinedScenario20261030",
    ),
  );
  const invalid = runExample("matching");
  expect(invalid.error).toBeUndefined();
  expect(invalid.status).toBe(0);
  expect(invalid.stdout).toContain("International phrase not defined");
  expect(invalid.stdout.split("ERRORS")[1]).not.toContain("audit guidance:");
  expect(invalid.stdout).toContain("EE_LocalAuditUndefinedScenario20261030");
  expect(invalid.stdout).not.toContain("SUCCESS");
  expect(fs.existsSync(output)).toBe(false);
  fs.writeFileSync(table, validTable);
  const corrected = runExample("matching");
  expect(corrected.status).toBe(0);
  expect(corrected.stdout).toContain("SUCCESS");
  expect(fs.existsSync(path.join(output, "index.html"))).toBe(true);
});

const seedOldGlossaryCache = () => {
  fs.writeFileSync(table, validTable);
  const payload = JSON.parse(
    fs.readFileSync(path.join(temp, "glossary.json"), "utf8"),
  );
  payload.version = "old-local-cache";
  fs.writeFileSync(
    path.join(cache, "glossary.json"),
    JSON.stringify({
      fetchedAt: Date.now(),
      pinnedVersion: payload.version,
      payload,
    }),
  );
  fs.writeFileSync(path.join(temp, "requests.jsonl"), "");
};
const requests = () =>
  fs
    .readFileSync(path.join(temp, "requests.jsonl"), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
const catalogGets = () =>
  requests().filter(
    (r) => r.method === "GET" && /\/(glossary|phrases)$/.test(r.url),
  );
const auditGets = () =>
  requests().filter((r) => r.url.endsWith("/glossary-audit-compiler"));

it("refreshes both stale catalogs once, recompiles silently, and reuses the cache", () => {
  seedOldGlossaryCache();
  const recovered = runExample("refresh-recover");
  expect(recovered.error).toBeUndefined();
  expect(recovered.status).toBe(0);
  expect(recovered.stdout).toContain("SUCCESS");
  expect(recovered.stdout).not.toContain("WARNINGS");
  expect(catalogGets()).toHaveLength(2);
  expect(auditGets()).toHaveLength(2);
  for (const resource of ["glossary", "phrases"]) {
    const cached = JSON.parse(
      fs.readFileSync(path.join(cache, `${resource}.json`), "utf8"),
    );
    const fresh = JSON.parse(
      fs.readFileSync(path.join(temp, `${resource}.json`), "utf8"),
    );
    expect(cached.payload).toEqual(fresh);
    expect(cached.pinnedVersion).toBe(fresh.version);
  }
  expect(fs.existsSync(path.join(output, "index.html"))).toBe(true);

  const next = runExample("refresh-recover");
  expect(next.status).toBe(0);
  expect(next.stdout).toContain("SUCCESS");
  expect(next.stdout).not.toContain("WARNINGS");
  expect(catalogGets()).toHaveLength(2);
  expect(auditGets()).toHaveLength(3);
});

it.each(["refresh-unavailable", "refresh-incomplete"])(
  "compiles silently with existing catalogs when the audit is %s",
  (mode) => {
    seedOldGlossaryCache();
    const cacheFile = path.join(cache, "glossary.json");
    const previousCache = fs.readFileSync(cacheFile, "utf8");
    const result = runExample(mode);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("SUCCESS");
    expect(result.stdout).not.toContain("WARNINGS");
    expect(catalogGets()).toHaveLength(0);
    expect(auditGets()).toHaveLength(1);
    expect(fs.readFileSync(cacheFile, "utf8")).toBe(previousCache);
  },
);

it.each([
  ["glossary", 1],
  ["phrases", 2],
])(
  "keeps both cached catalogs when refreshing %s fails",
  (resource, expectedGets) => {
    seedOldGlossaryCache();
    const cacheFiles = ["glossary", "phrases"].map((name) =>
      path.join(cache, `${name}.json`),
    );
    const previousCaches = cacheFiles.map((file) =>
      fs.readFileSync(file, "utf8"),
    );
    const result = runExample(`refresh-fetch-failure-${resource}`);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("SUCCESS");
    expect(result.stdout).not.toContain("WARNINGS");
    expect(result.stderr).not.toContain("Local catalog refresh failed");
    expect(catalogGets()).toHaveLength(expectedGets);
    expect(auditGets()).toHaveLength(1);
    expect(cacheFiles.map((file) => fs.readFileSync(file, "utf8"))).toEqual(
      previousCaches,
    );
  },
);

it("compiles a batch silently and refreshes at most once for a persistent mismatch", () => {
  seedOldGlossaryCache();
  const secondTable = path.join(examples, "tables", `${name}-other.csv`);
  fs.writeFileSync(secondTable, validTable);
  try {
    const result = runExample("refresh-batch-still-stale");
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("SUCCESS");
    expect(result.stdout).not.toContain("WARNINGS");
    expect(catalogGets()).toHaveLength(2);
    expect(auditGets()).toHaveLength(3);
  } finally {
    fs.rmSync(secondTable, { force: true });
  }
});

it.each(["color-unused", "color-matching"])(
  "omits optional audit warnings in colored output for %s",
  (mode) => {
    fs.writeFileSync(table, validTable);
    const result = runExample(mode);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("⚠️");
    expect(result.stdout).not.toContain("audit references:");
    expect(result.stdout).toContain("SUCCESS");
  },
);
