/** @jest-environment node */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";
import { loadGlossaryForTests } from "./helpers/glossary";
import { loadPhrasesForTests } from "./helpers/phrases";

jest.setTimeout(120_000);
const root = path.resolve(__dirname, "..");
const examples = path.join(root, "examples");
const originals = new Map<string, Buffer | undefined>();
let temp: string;

beforeAll(async () => {
  await loadGlossaryForTests();
  await loadPhrasesForTests();
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "ee-fuzz-index-"));
  for (const resource of ["glossary", "phrases"]) {
    const file = path.join(examples, ".cache", `${resource}.json`);
    originals.set(
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
});
afterAll(() => {
  for (const [file, bytes] of originals) {
    if (bytes) fs.writeFileSync(file, bytes);
    else fs.rmSync(file, { force: true });
  }
  if (temp) fs.rmSync(temp, { recursive: true, force: true });
});

it("M4 validates the source index once and shares it across a real fuzz compiler batch", () => {
  const log = path.join(temp, "calls.jsonl");
  const preload = path.join(temp, "preload.cjs");
  fs.writeFileSync(
    preload,
    `
    const fs = require("fs");
    const record = (value) => fs.appendFileSync(${JSON.stringify(
      log,
    )}, JSON.stringify(value)+"\\n");
    const cp = require("child_process");
    const exec = cp.execFileSync;
    cp.execFileSync = (file,args,options) => {
      if (args?.[0]?.endsWith("scripts/phrase-analysis/build.mjs")) record({builder:true});
      return exec(file,args,options);
    };
    const Module = require("module");
    const load = Module._load;
    Module._load = function(request,...args) {
      const original = load.call(this,request,...args);
      if (request === "./ledger") return {...original, Ledger: class extends original.Ledger {
        constructor() {super(${JSON.stringify(path.join(temp, "ledger"))});}
      }};
      if (request.endsWith("/localCompile")) return {...original,
        compileExperimentTableLocally: async (table,options) => {
          record({fingerprint:options.phraseAnalysisIndex?.fingerprint ?? null});
          return original.compileExperimentTableLocally(table,options);
        }
      };
      return original;
    };
    globalThis.fetch = async (url) => {
      if (String(url).startsWith("https://fonts.googleapis.com/")) return new Response("/* font fixture */");
      if (String(url).startsWith("https://docs.google.com/spreadsheets/")) return new Response("INPUT PARAMETER,TYPE\\nfont,text");
      if (String(url).endsWith("/.netlify/functions/glossary-audit-compiler")) {
        const glossary = JSON.parse(fs.readFileSync(${JSON.stringify(
          path.join(examples, ".cache/glossary.json"),
        )},"utf8")).payload;
        return new Response(JSON.stringify({id:"fuzz-test-audit",generatedAt:"2026-11-03",glossaryVersion:glossary.version,usedKeys:Object.keys(glossary.glossary),unusedKeys:[]}));
      }
      throw new Error("Unexpected test request: "+url);
    };
  `,
  );
  const result = spawnSync(
    process.execPath,
    [
      "--require",
      preload,
      path.join(root, "node_modules/tsx/dist/cli.mjs"),
      "server/fuzz/fuzzTables.ts",
      "compiler",
      "-n",
      "2",
      "--seed",
      "42",
      "--invalid-frac",
      "1",
      "--no-minimize",
    ],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
      env: {
        ...process.env,
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require=${preload}`,
      },
    },
  );
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  const calls = fs
    .readFileSync(log, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(calls.filter((call) => call.builder)).toHaveLength(1);
  const tables = calls.filter((call) => "fingerprint" in call);
  expect(tables).toHaveLength(2);
  expect(typeof tables[0].fingerprint).toBe("string");
  expect(tables[1].fingerprint).toBe(tables[0].fingerprint);
});
