/** @jest-environment node */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createStudyPhraseAnalysisHandler } from "../../../../netlify/functions/study-phrase-analysis/handler";
import { compileExperimentTableLocally } from "../examples/localCompile";
import { loadGlossaryForTests } from "./helpers/glossary";
import { loadPhrasesForTests } from "./helpers/phrases";
import { glossaryAuditFixture } from "./helpers/glossaryAudit";
import { phraseAnalysisIndexFixture } from "./helpers/phraseAnalysis";

let temp: string;
beforeAll(async () => {
  await loadGlossaryForTests();
  await loadPhrasesForTests();
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "ee-audit-reuse-"));
  fs.copyFileSync(
    path.resolve(__dirname, "../examples/tables/minimalExperiment.csv"),
    path.join(temp, "study.csv"),
  );
});
beforeEach(() => {
  // Keep external font availability outside this source-analysis comparison.
  jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("/* font fixture */"));
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

it.each([false, true])(
  "local compilation and the web endpoint share phrase/glossary outcomes (incomplete=%s)",
  async (incomplete) => {
    const site = {
      id: "study:1",
      file: "study.js",
      line: 1,
      keys: ["EE_Translator"],
      guards: [
        {
          truth: true,
          text: 'targetKind === "letter"',
          expression: {
            kind: "===",
            left: { kind: "parameter", name: "targetKind" },
            right: { kind: "literal", value: "letter" },
          },
        },
      ],
    };
    const index = phraseAnalysisIndexFixture({
      sites: [site],
      glossarySites: [{ ...site, keys: ["font"] }],
      parseFailures: incomplete ? ["unparsed source"] : [],
    });
    const local = await compileExperimentTableLocally(
      path.join(temp, "study.csv"),
      {
        resourcesRoot: temp,
        glossaryAudit: glossaryAuditFixture(),
        phraseAnalysisIndex: index,
      },
    );
    const handler = createStudyPhraseAnalysisHandler(index);
    for (const analysis of ["phrases", "glossary"]) {
      const response = await handler(
        new Request("http://localhost/study-phrase-analysis", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            schemaVersion: 1,
            fingerprint: index.fingerprint,
            analysis,
            conditions: [
              { name: "triplet", parameters: { targetKind: "letter" } },
            ],
          }),
        }),
      );
      if (incomplete) {
        expect(response.status).toBe(503);
        expect(local.blockingErrors.map((error) => error.name)).toContain(
          analysis === "phrases"
            ? "Study phrase analysis unavailable"
            : "Study glossary analysis unavailable",
        );
        expect(local.fileStringList).toEqual([]);
      } else {
        expect(response.status).toBe(200);
        expect(local.blockingErrors).toEqual([]);
        expect(local.fileStringList.length).toBeGreaterThan(0);
        const remote = await response.json();
        const report =
          analysis === "phrases"
            ? local.user.currentExperiment.phraseAnalysis
            : local.user.currentExperiment.glossaryAnalysis;
        expect(report).toMatchObject(remote);
        expect(report.candidateKeys).toEqual(
          analysis === "phrases" ? ["EE_Translator"] : ["font"],
        );
      }
    }
  },
);
