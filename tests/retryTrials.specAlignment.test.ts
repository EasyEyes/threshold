/**
 * @jest-environment node
 *
 * SPEC ALIGNMENT: retry-budget arithmetic vs the glossary (the SPEC).
 *
 * thresholdAllowedTrialRatio explanation:
 *   "maxTrials = round(thresholdAllowedTrialRatio ✕ conditionTrials)"
 *
 * The runtime (components/retryTrials.ts okayToRetryThisTrial) computes
 *   trialsMax = Math.ceil(conditionTrials × ratio)
 *
 * These differ for fractional non-half products (e.g. 2.4 × 3 = 7.2:
 * round → 7, ceil → 8 — one extra retry beyond the spec'd bound).
 *
 * These tests assert the SPEC (round). They are RED until the code (or the
 * glossary text) is changed — that decision is the maintainers'.
 */

import fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { normalizeExperimentDfShape } from "../preprocess/transformExperimentTable";
import { splitIntoBlockFiles } from "../preprocess/blockGen";
import {
  dataframeFromPapaParsed,
  addNewInternalParam,
} from "../preprocess/utils";
import { DefaultMap } from "../components/types";
import type { Status, SkipTrialOrBlock } from "../components/types";

const TABLES_DIR = path.resolve(__dirname, "fixtures");

function compileCsvToFiles(filename: string): Map<string, string> {
  const csvRaw = fs.readFileSync(path.join(TABLES_DIR, filename), "utf8");
  const parsed = Papa.parse(csvRaw, { skipEmptyLines: true });
  let data = (parsed.data as unknown[][]).filter(
    (row) => !/^%/.test(((row[0] as string) || "").trim()),
  ) as string[][];
  data = data.filter((row) => row.some((x) => x));
  const numTrailing = (r: string[]) => {
    const v = [...r];
    let n = 0;
    while (v.pop() === "") n++;
    return n;
  };
  const minTrailing = Math.min(...data.map(numTrailing));
  if (minTrailing > 0) data = data.map((row) => row.slice(0, -minTrailing));
  let df = dataframeFromPapaParsed({ data });
  df = normalizeExperimentDfShape(df);
  df = addNewInternalParam(df, "!experimentFilename", filename);
  const rawFiles = splitIntoBlockFiles(df, "node") as [string, string][];
  const fileMap = new Map<string, string>();
  for (const [csv, name] of rawFiles) fileMap.set(`./conditions/${name}`, csv);
  return fileMap;
}

const makeStatus = (): Status =>
  ({
    block: 1,
    trial: 1,
    block_condition: "1_3", // budget-C column: 3 trials × ratio 2.4
    condition: {},
    trialCorrect_thisBlock: 0,
    trialCompleted_thisBlock: 0,
    trialAttempted_thisBlock: 0,
    nthTrialCorrectThisBlockByCondition: new DefaultMap(() => 0, null),
    nthTrialCompletedThisBlockByCondition: new DefaultMap(() => 0, null),
    nthTrialByCondition: new DefaultMap(() => 1, null),
    nthTrialAttemptedByCondition: new DefaultMap(() => 0, null),
    currentFunction: "",
    retryThisTrialBool: false,
    nthBlock: 1,
  }) as unknown as Status;

const NO_SKIP: SkipTrialOrBlock = {
  blockId: null,
  trialId: null,
  skipTrial: false,
  skipBlock: false,
  restartBlock: false,
};

// test.failing: intentionally asserts SPEC (round) against current code
// (ceil) — PENDING MAINTAINER DECISION (glossary text vs code arithmetic;
// see notes/quest-retry-testing-infrastructure.md, VIOLATION 2). If this
// suite starts FAILING because a test turned GREEN, the arithmetic was
// changed — remove the .failing marker (or amend the glossary and delete
// this suite) as decided.
describe("SPEC: maxTrials = round(ratio × conditionTrials) (glossary)", () => {
  let ParamReader: any;
  let okayToRetryThisTrial: any;

  beforeAll(async () => {
    await loadGlossaryForTests();
    const fileMap = compileCsvToFiles("test-retry-budget.csv");
    jest.doMock("papaparse", () => ({
      __esModule: true,
      default: {
        parse: (url: string, config: any) => {
          const csv = fileMap.get(url) ?? "";
          const result = Papa.parse(csv, { skipEmptyLines: true });
          config.complete({ data: result.data });
        },
      },
    }));
    const mod = await import("../parameters/paramReader");
    ParamReader = mod.ParamReader;
    ({ okayToRetryThisTrial } = await import("../components/retryTrials"));
  });

  afterAll(() => jest.dontMock("papaparse"));

  test.failing(
    "ratio 2.4 × 3 trials: maxTrials is 7 (round), so the 5th redo is denied",
    () => {
      // round(7.2) = 7 → retriesAllowed = 7 − 3 = 4. After 4 retried bad
      // trials (attempted 5), a retry must be DENIED. Current code uses
      // ceil(7.2) = 8 → retriesAllowed 5 → allows one retry past the spec.
      const paramReader = new ParamReader("conditions", () => {});
      const status = makeStatus();
      status.nthTrialAttemptedByCondition.set("1_3", 5); // 4 redos done
      status.nthTrialByCondition.set("1_3", 1); // 0 completions
      expect(okayToRetryThisTrial(status, paramReader, NO_SKIP)).toBe(false);
    },
  );

  test("the 4th redo is still allowed under both round and ceil", () => {
    const paramReader = new ParamReader("conditions", () => {});
    const status = makeStatus();
    status.nthTrialAttemptedByCondition.set("1_3", 4); // 3 redos done
    status.nthTrialByCondition.set("1_3", 1);
    expect(okayToRetryThisTrial(status, paramReader, NO_SKIP)).toBe(true);
  });
});
