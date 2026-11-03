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
let preload: string;
let validTable: string;
const originalCaches = new Map<string, Buffer | undefined>();

beforeAll(async () => {
  await loadGlossaryForTests();
  await loadPhrasesForTests();
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "ee-example-audit-"));
  for (const resource of ["glossary", "phrases"]) {
    const file = path.join(examples, ".cache", `${resource}.json`);
    originalCaches.set(
      file,
      fs.existsSync(file) ? fs.readFileSync(file) : undefined,
    );
    const payload = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "__cache__", `${resource}.json`),
        "utf8",
      ),
    );
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
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
            if (mode === "refresh-fetch-failure") return new Response("Unavailable", {status:503});
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
      if (mode === "unused") {
        audit.usedKeys = audit.usedKeys.filter((key) => key !== "font");
        audit.unusedKeys = ["font"];
      }
      return new Response(JSON.stringify(audit));
    };
  `,
  );
  validTable = fs
    .readFileSync(path.join(examples, "tables/minimalExperiment.csv"), "utf8")
    .replace("simple threshold", "EE_Translator simple threshold");
  fs.writeFileSync(table, validTable);
  fs.mkdirSync(otherOutput, { recursive: true });
  fs.writeFileSync(path.join(otherOutput, "preserved.txt"), "other example");
});

afterAll(() => {
  for (const [file, bytes] of originalCaches) {
    if (bytes) fs.writeFileSync(file, bytes);
    else fs.rmSync(file, { force: true });
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
        EE_TEST_AUDIT: mode,
      },
      encoding: "utf8",
      timeout: 30_000,
    },
  );

it("A5/A6/A8 blocks failed audits while preserving the command's original exit code and previous output", () => {
  for (const mode of ["unavailable", "stale", "incomplete", "unused"]) {
    const valid = runExample("matching");
    expect(valid.error).toBeUndefined();
    expect(valid.stdout).toContain("SUCCESS");
    expect(valid.status).toBe(0);
    expect(fs.existsSync(path.join(output, "index.html"))).toBe(true);
    const previous = fs.readFileSync(path.join(output, "index.html"));

    const blocked = runExample(mode);
    expect(blocked.error).toBeUndefined();
    expect(blocked.stdout).toContain(
      mode === "unused"
        ? "Glossary parameter not audited as used"
        : "Glossary audit unavailable",
    );
    expect(blocked.stdout).not.toContain("SUCCESS");
    expect(blocked.status).toBe(0);
    expect(fs.readFileSync(path.join(output, "index.html"))).toEqual(previous);
    expect(
      fs.readFileSync(path.join(otherOutput, "preserved.txt"), "utf8"),
    ).toBe("other example");
  }
  expect(runExample("matching").status).toBe(0);
  const failedBuild = runExample("builder-failure");
  expect(failedBuild.error).toBeUndefined();
  expect(failedBuild.status).toBe(1);
  expect(failedBuild.stderr).toContain("Local source analysis unavailable");
  expect(failedBuild.stdout).not.toContain("SUCCESS");
  expect(fs.existsSync(path.join(output, "index.html"))).toBe(true);
  expect(fs.existsSync(path.join(otherOutput, "preserved.txt"))).toBe(true);
});

it("blocks the same study with an undefined phrase even when its glossary audit passes, then recovers", () => {
  fs.rmSync(output, { recursive: true, force: true });
  fs.writeFileSync(
    table,
    validTable.replace(
      "EE_Translator",
      "EE_LocalAuditUndefinedScenario20261030",
    ),
  );
  const invalid = runExample("matching");
  expect(invalid.error).toBeUndefined();
  expect(invalid.status).toBe(0);
  expect(invalid.stdout).toContain("International phrase not defined");
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
  const payload = JSON.parse(
    fs.readFileSync(path.join(temp, "glossary.json"), "utf8"),
  );
  payload.version = "old-local-cache";
  fs.writeFileSync(
    path.join(examples, ".cache/glossary.json"),
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

it("R2 refreshes mismatched cached catalogs once and reuses the refreshed cache on the next command", () => {
  seedOldGlossaryCache();
  const recovered = runExample("refresh-recover");
  expect(recovered.error).toBeUndefined();
  expect(recovered.status).toBe(0);
  expect(recovered.stdout).toContain("SUCCESS");
  expect(catalogGets()).toHaveLength(2);
  expect(auditGets()).toHaveLength(2);
  const cache = JSON.parse(
    fs.readFileSync(path.join(examples, ".cache/glossary.json"), "utf8"),
  );
  const fresh = JSON.parse(
    fs.readFileSync(path.join(temp, "glossary.json"), "utf8"),
  );
  expect(cache.payload.version).toBe(fresh.version);
  expect(cache.pinnedVersion).toBe(fresh.version);
  const next = runExample("refresh-recover");
  expect(next.stdout).toContain("SUCCESS");
  expect(next.stdout).toContain("Glossary pin unchanged");
  expect(next.stdout).toContain("Phrases pin unchanged");
  expect(catalogGets()).toHaveLength(2);
  expect(auditGets()).toHaveLength(3);
});

it("R3 retries a persistent mismatch only once and preserves earlier output", () => {
  seedOldGlossaryCache();
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(
    path.join(output, "index.html"),
    "previous generated output",
  );
  const previous = fs.readFileSync(path.join(output, "index.html"));
  const blocked = runExample("refresh-still-stale");
  expect(blocked.error).toBeUndefined();
  expect(blocked.status).toBe(0);
  expect(blocked.stdout).not.toContain("SUCCESS");
  expect(blocked.stdout).toContain("Glossary audit unavailable");
  expect(catalogGets()).toHaveLength(2);
  expect(auditGets()).toHaveLength(2);
  expect(blocked.stdout).toContain(
    "does not match completed audit version hosted-audit-behind",
  );
  expect(fs.readFileSync(path.join(output, "index.html"))).toEqual(previous);
});

it.each(["refresh-unavailable", "refresh-incomplete"])(
  "R4 does not refresh catalogs for %s",
  (mode) => {
    seedOldGlossaryCache();
    const blocked = runExample(mode);
    expect(blocked.stdout).toContain("Glossary audit unavailable");
    expect(blocked.stdout).not.toContain("SUCCESS");
    expect(catalogGets()).toHaveLength(0);
    expect(auditGets()).toHaveLength(1);
  },
);

it("R5 shares the one-refresh limit across all tables in a batch", () => {
  seedOldGlossaryCache();
  const secondTable = path.join(examples, "tables", `${name}-other.csv`);
  fs.writeFileSync(secondTable, validTable);
  try {
    const blocked = runExample("refresh-batch-still-stale");
    expect(blocked.error).toBeUndefined();
    expect(blocked.status).toBe(0);
    expect(blocked.stdout).not.toContain("SUCCESS");
    expect(catalogGets()).toHaveLength(2);
    expect(auditGets()).toHaveLength(3);
  } finally {
    fs.rmSync(secondTable, { force: true });
  }
});

it("R6 stops a failed automatic catalog fetch without looping or replacing output", () => {
  seedOldGlossaryCache();
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(
    path.join(output, "index.html"),
    "previous generated output",
  );
  const previous = fs.readFileSync(path.join(output, "index.html"));
  const blocked = runExample("refresh-fetch-failure");
  expect(blocked.error).toBeUndefined();
  expect(blocked.status).toBe(0);
  expect(blocked.stdout).not.toContain("SUCCESS");
  expect(blocked.stderr).toContain("Local catalog refresh failed");
  expect(catalogGets()).toHaveLength(1);
  expect(auditGets()).toHaveLength(1);
  expect(fs.readFileSync(path.join(output, "index.html"))).toEqual(previous);
});
