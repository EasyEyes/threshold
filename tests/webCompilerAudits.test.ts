import { readFileSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";
import { createStudyPhraseAnalysisHandler } from "../../../../netlify/functions/study-phrase-analysis/handler";
import { prepareExperimentFileForThreshold } from "../preprocess/main";
import type { Alert } from "../preprocess/alerts";
import { loadGlossaryForTests } from "./helpers/glossary";
import { loadPhrasesForTests } from "./helpers/phrases";
import { glossaryAuditFixture } from "./helpers/glossaryAudit";
import { phraseAnalysisIndexFixture } from "./helpers/phraseAnalysis";

const index = phraseAnalysisIndexFixture({
  sites: [
    {
      id: "phrase:1",
      file: "source.js",
      line: 1,
      keys: ["EE_missingAuditTestPhrase"],
      guards: [],
    },
  ],
});
const analyse = createStudyPhraseAnalysisHandler(index);
const study = readFileSync(
  join(__dirname, "../examples/tables/minimalExperiment.csv"),
  "utf8",
);
const originalFingerprint = process.env.PHRASE_ANALYSIS_FINGERPRINT;

beforeAll(async () => {
  await loadGlossaryForTests();
  await loadPhrasesForTests();
});
beforeEach(() => {
  process.env.PHRASE_ANALYSIS_FINGERPRINT = index.fingerprint;
});
afterEach(() => {
  if (originalFingerprint === undefined)
    delete process.env.PHRASE_ANALYSIS_FINGERPRINT;
  else process.env.PHRASE_ANALYSIS_FINGERPRINT = originalFingerprint;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type AuditRequest = "usage" | "phrases" | "glossary";

function mockAuditServices(
  failure?: (request: AuditRequest) => Response | Promise<Response> | undefined,
) {
  const requests: AuditRequest[] = [];
  jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/glossary-audit-compiler")) {
      requests.push("usage");
      return failure?.("usage") ?? Response.json(glossaryAuditFixture());
    }
    if (url.endsWith("/study-phrase-analysis")) {
      const { analysis = "phrases" } = JSON.parse(String(init?.body));
      requests.push(analysis);
      return failure?.(analysis) ?? analyse(new Request(url, init));
    }
    return new Response("/* font fixture */");
  });
  return requests;
}

async function compile(user: Record<string, any> = {}, csv = study) {
  const callback = jest.fn();
  await prepareExperimentFileForThreshold(
    Papa.parse(csv, { skipEmptyLines: true }),
    user,
    [],
    {},
    callback,
    "web",
    false,
    "study.csv",
  );
  expect(callback).toHaveBeenCalledTimes(1);
  const [, , , , , , , files, alerts] = callback.mock.calls[0];
  return { files: files as File[], alerts: alerts as Alert[] };
}

it.each(["phrases", "glossary"] as const)(
  "compiles when %s analysis fails, clears the old report, and retries next time",
  async (unavailable) => {
    const user = {
      currentExperiment: {
        phraseAnalysis: { fingerprint: "old" },
        glossaryAnalysis: { fingerprint: "old" },
      },
    };
    let recovering = false;
    const requests = mockAuditServices((request) =>
      !recovering && request === unavailable
        ? new Response("Unavailable", { status: 503 })
        : undefined,
    );

    const result = await compile(user);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.alerts.filter(({ kind }) => kind === "error")).toEqual([]);
    expect(requests).toEqual(
      expect.arrayContaining(["usage", "phrases", "glossary"]),
    );
    if (unavailable === "phrases") {
      expect(user.currentExperiment.phraseAnalysis).toBeUndefined();
      expect(user.currentExperiment.glossaryAnalysis?.fingerprint).toBe(
        index.fingerprint,
      );
    } else {
      expect(user.currentExperiment.phraseAnalysis?.fingerprint).toBe(
        index.fingerprint,
      );
      expect(user.currentExperiment.glossaryAnalysis).toBeUndefined();
    }

    recovering = true;
    const retried = await compile(user);
    const contents = (files: File[]) =>
      Promise.all(files.map(async (file) => [file.name, await file.text()]));
    expect(await contents(retried.files)).toEqual(await contents(result.files));
    expect(retried.alerts).toContainEqual(
      expect.objectContaining({
        code: "study_phrase_candidates_missing",
        kind: "warning",
      }),
    );
    expect(user.currentExperiment.phraseAnalysis?.fingerprint).toBe(
      index.fingerprint,
    );
    expect(user.currentExperiment.glossaryAnalysis?.fingerprint).toBe(
      index.fingerprint,
    );
  },
);

it("compiles without requesting source analysis when build metadata is missing", async () => {
  delete process.env.PHRASE_ANALYSIS_FINGERPRINT;
  const requests = mockAuditServices();
  const result = await compile();
  expect(result.files.length).toBeGreaterThan(0);
  expect(requests).toEqual(["usage"]);
});

it.each([
  ["service unavailable", () => new Response(null, { status: 503 })],
  ["invalid JSON", () => new Response("not json")],
  [
    "incomplete report",
    () => Response.json({ fingerprint: index.fingerprint }),
  ],
  [
    "stale report",
    () =>
      Response.json({
        schemaVersion: 1,
        fingerprint: "previous-build",
        fullRuntimeAnswerAvailable: false,
        candidateKeys: [],
        limitations: [],
        sites: [],
      }),
  ],
  [
    "connection failure",
    () => {
      throw new Error("Connection failed");
    },
  ],
] as const)(
  "compiles during a %s across the audit services",
  async (_, fail) => {
    const requests = mockAuditServices(fail);
    const result = await compile();
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.alerts.filter(({ kind }) => kind === "error")).toEqual([]);
    expect(requests).toEqual(
      expect.arrayContaining(["usage", "phrases", "glossary"]),
    );
  },
);

it("still blocks invalid study input before calling either audit service", async () => {
  const requests = mockAuditServices();
  const result = await compile(
    {},
    study.replace('conditionTrials,,"4"', "conditionTrials,,invalid"),
  );
  expect(result.files).toEqual([]);
  expect(result.alerts).toContainEqual(
    expect.objectContaining({
      kind: "error",
      parameters: expect.arrayContaining(["conditionTrials"]),
    }),
  );
  expect(requests).toEqual([]);
});

it("still blocks an undefined explicit phrase key during a source audit outage", async () => {
  mockAuditServices(() => new Response(null, { status: 503 }));
  const result = await compile(
    {},
    study.replace("simple threshold", "EE_missingAuditTestPhrase"),
  );
  expect(result.files).toEqual([]);
  expect(result.alerts.filter(({ kind }) => kind === "error")).toEqual([
    expect.objectContaining({ name: "International phrase not defined" }),
  ]);
});

it("bounds a stalled audit response and ignores it if it arrives after compilation", async () => {
  jest.useFakeTimers();
  let signalRequestStarted!: () => void;
  const requestStarted = new Promise<void>((resolve) => {
    signalRequestStarted = resolve;
  });
  let finishResponse!: (body: unknown) => void;
  const stalledBody = new Promise((resolve) => {
    finishResponse = resolve;
  });
  mockAuditServices((request) => {
    if (request !== "glossary") return undefined;
    const response = new Response();
    jest.spyOn(response, "json").mockImplementation(() => {
      signalRequestStarted();
      return stalledBody;
    });
    return response;
  });
  const user: Record<string, any> = {};
  const compilation = compile(user);
  await requestStarted;
  await jest.advanceTimersByTimeAsync(15_000);
  const result = await compilation;
  expect(result.files.length).toBeGreaterThan(0);
  expect(user.currentExperiment.glossaryAnalysis).toBeUndefined();
  expect(user.currentExperiment.phraseAnalysis?.fingerprint).toBe(
    index.fingerprint,
  );
  finishResponse({
    schemaVersion: 1,
    fingerprint: index.fingerprint,
    fullRuntimeAnswerAvailable: false,
    candidateKeys: [],
    limitations: [],
    sites: [],
  });
  await stalledBody;
  expect(user.currentExperiment.glossaryAnalysis).toBeUndefined();
});
