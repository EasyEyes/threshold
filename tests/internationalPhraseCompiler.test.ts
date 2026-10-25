/** @jest-environment node */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { loadPhrasesForTests } from "./helpers/phrases";
import { glossaryAuditFixture } from "./helpers/glossaryAudit";
import { getPhrases, initPhrases } from "../parameters/phrasesRegistry";
import { compileExperimentTableLocally } from "../examples/localCompile";
import type { PhraseSourceIndex } from "../preprocess/phrasePathAnalysis";

jest.mock("../components/easyeyesBaseUrl", () => ({
  getEasyEyesBaseUrl: async () => "https://easyeyes.app",
}));
jest.setTimeout(120_000);
const sourceIndex: PhraseSourceIndex = {
  schemaVersion: 2,
  fingerprint: "a".repeat(64),
  parseFailures: [],
  coverage: { limitations: [] },
  sites: [],
  glossarySites: [],
};
let root: string;
let phrases: ReturnType<typeof getPhrases>;
let auditRequests: string[];
const originalFetch = global.fetch;

beforeAll(async () => {
  await loadGlossaryForTests();
  await loadPhrasesForTests();
  phrases = getPhrases();
  root = fs.mkdtempSync(
    path.join(os.tmpdir(), "international-phrase-compiler-"),
  );
});
beforeEach(() => {
  initPhrases({ version: "test", phrases });
  auditRequests = [];
  // Only the retired phrase-usage service is stubbed. The compiler, loaded
  // catalogs, validators and local source analysis run normally.
  jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
    if (String(input).includes("/phrases-audit-compiler")) {
      auditRequests.push(String(input));
      return new Response(
        JSON.stringify({
          id: "audit-without-translator",
          generatedAt: "2026-10-17",
          usedKeys: [],
        }),
      );
    }
    return originalFetch(input, init);
  });
});
afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

async function compile(
  key: string,
  language = "en",
  index = sourceIndex,
  options: {
    overrides?: Record<string, string>;
    remoteGlossaryAudit?: boolean;
  } = {},
) {
  const rows = {
    _about: `Production regression: ${key}`,
    _language: language,
    block: "1",
    calibrateDistanceBool: "FALSE",
    conditionName: "triplet",
    conditionTrials: "1",
    font: "Roboto Mono",
    fontCharacterSet: "abcdefghijklmnopqrstuvwxyz",
    fontSource: "google",
    spacingDirection: "radial",
    spacingOverSizeRatio: "1.4",
    spacingRelationToSize: "typographic",
    targetEccentricityXDeg: "-10",
    targetKind: "letter",
    targetTask: "identify",
    thresholdParameter: "spacingDeg",
    ...options.overrides,
  };
  const file = path.join(root, "study.csv");
  fs.writeFileSync(
    file,
    Papa.unparse(
      Object.entries(rows)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) =>
          name.startsWith("_") ? [name, value] : [name, "", value],
        ),
    ),
  );
  return compileExperimentTableLocally(file, {
    resourcesRoot: root,
    glossaryAudit: options.remoteGlossaryAudit
      ? undefined
      : glossaryAuditFixture(),
    phraseAnalysisIndex: index,
  });
}

it("compiles EE_Translator with an empty English translation even when an audit omits it", async () => {
  expect(Object.prototype.hasOwnProperty.call(phrases, "EE_Translator")).toBe(
    true,
  );
  expect(phrases.EE_Translator.en).toBe("");
  const result = await compile("EE_Translator");
  expect(result.blockingErrors).toEqual([]);
  expect(result.fileStringList.length).toBeGreaterThan(0);
  expect(auditRequests).toEqual([]);
});
it("accepts a defined key without any translation columns or an available usage audit", async () => {
  initPhrases({ version: "test", phrases: { ...phrases, EE_Translator: {} } });
  jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
    if (String(input).includes("/phrases-audit-compiler"))
      throw new Error("Audit offline");
    return originalFetch(input, init);
  });
  const result = await compile("EE_Translator", "pcm");
  expect(result.blockingErrors).toEqual([]);
});
it("blocks an explicit key absent from the phrase catalog", async () => {
  const result = await compile("EE_productionVerificationMissing20261025");
  expect(result.blockingErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "International phrase not defined",
        kind: "error",
      }),
    ]),
  );
});
it.each(["not-a-language", "en,fr"])(
  "still blocks invalid _language=%s",
  async (language) => {
    const result = await compile("EE_Translator", language);
    expect(result.blockingErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Parameter contains values of the wrong type",
          parameters: ["_language"],
        }),
      ]),
    );
  },
);

it("warns about a missing source candidate without blocking a defined study key", async () => {
  const result = await compile("EE_Translator", "en", {
    ...sourceIndex,
    sites: [
      {
        id: "source:1",
        file: "source.js",
        line: 1,
        keys: ["EE_missingSourcePhrase"],
        guards: [],
      },
    ],
  });
  expect(result.blockingErrors).toEqual([]);
  expect(result.warnings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "⚠️ WARNING: 1 missing phrase",
        kind: "warning",
      }),
    ]),
  );
});

function mockGlossaryAudit(available: boolean) {
  const requests: string[] = [];
  jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
    if (String(input).includes("/glossary-audit-compiler")) {
      requests.push(String(input));
      return available
        ? new Response(JSON.stringify(glossaryAuditFixture()))
        : new Response("Audit unavailable", { status: 503 });
    }
    return originalFetch(input, init);
  });
  return requests;
}

it.each([
  { _language: "not-a-language" },
  { conditionTrials: "not-a-number" },
  { notAStudyParameter: "TRUE" },
])(
  "reports invalid input before requesting a glossary audit: %j",
  async (overrides) => {
    const requests = mockGlossaryAudit(false);
    const result = await compile("EE_Translator", "en", sourceIndex, {
      overrides,
      remoteGlossaryAudit: true,
    });
    expect(result.blockingErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parameters: expect.arrayContaining(Object.keys(overrides)),
        }),
      ]),
    );
    expect(
      result.blockingErrors.some(
        (error) => error.name === "Glossary audit unavailable",
      ),
    ).toBe(false);
    expect(requests).toEqual([]);
  },
);

it("requests the audit after input is corrected and still blocks when it is unavailable", async () => {
  const requests = mockGlossaryAudit(false);
  const invalid = await compile(
    "EE_Translator",
    "not-a-language",
    sourceIndex,
    {
      remoteGlossaryAudit: true,
    },
  );
  expect(
    invalid.blockingErrors.some((error) =>
      error.parameters.includes("_language"),
    ),
  ).toBe(true);
  expect(requests).toEqual([]);

  const corrected = await compile("EE_Translator", "en", sourceIndex, {
    remoteGlossaryAudit: true,
  });
  expect(requests).toHaveLength(1);
  expect(corrected.blockingErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "Glossary audit unavailable",
        kind: "error",
      }),
    ]),
  );

  const recoveredRequests = mockGlossaryAudit(true);
  const recovered = await compile("EE_Translator", "en", sourceIndex, {
    remoteGlossaryAudit: true,
  });
  expect(recoveredRequests).toHaveLength(1);
  expect(recovered.blockingErrors).toEqual([]);
  expect(recovered.fileStringList.length).toBeGreaterThan(0);
});

it("does not skip the glossary audit for a nonblocking input warning", async () => {
  const requests = mockGlossaryAudit(false);
  const result = await compile("EE_Translator", "en", sourceIndex, {
    remoteGlossaryAudit: true,
    overrides: {
      _screenFloat16Bool: "TRUE",
      _screenMeasurePrecision: "test1Digit",
      _screenMeasurePrecisionBackground: "0.5",
    },
  });
  expect(requests).toHaveLength(1);
  expect(
    result.warnings.some((warning) =>
      warning.name.includes("off the display's code grid"),
    ),
  ).toBe(true);
  expect(result.blockingErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "Glossary audit unavailable",
        kind: "error",
      }),
    ]),
  );
});
