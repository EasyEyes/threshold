/**
 * @jest-environment node
 *
 * SPEC pin (glossary: thresholdAllowedTrialRatio, clause 1): a condition
 * runs "until either 1. the number of GOOD trials reaches conditionTrials,
 * or 2. the total number of trials (good and bad) reaches maxTrials."
 *
 * The completion counter (status.nthTrialByCondition, via
 * incrementTrialsCompleted) feeds isConditionFinished, so it must count
 * GOOD trials — but threshold.js increments it for every non-retried
 * trial, including bad trials whose retry was DENIED (budget exhausted).
 * Real ground truth: real table → real ParamReader → real
 * incrementTrialsCompleted + isConditionFinished.
 *
 * Scheduling-level impact is largely coincident with clause-2 exhaustion
 * in single-condition blocks (see MultiStairHandler.blockScheduling.test.js
 * V3 note); the certain harm is the completion check itself plus the
 * derived UI (visible counter numerator, %correct denominator).
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
    block_condition: "1_1",
    condition: {},
    trialCorrect_thisBlock: 0,
    trialCompleted_thisBlock: 0,
    trialAttempted_thisBlock: 0,
    nthTrialCorrectThisBlockByCondition: new DefaultMap<string, number>(
      () => 0,
      null,
    ),
    nthTrialCompletedThisBlockByCondition: new DefaultMap<string, number>(
      () => 0,
      null,
    ),
    nthTrialByCondition: new DefaultMap<string, number>(() => 1, null),
    nthTrialAttemptedByCondition: new DefaultMap<string, number>(() => 0, null),
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

describe("V3: isConditionFinished must count GOOD trials only (spec clause 1)", () => {
  let ParamReader: any;
  let isConditionFinished: any;
  let incrementTrialsCompleted: any;

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
    ({ isConditionFinished } = await import("../components/retryTrials"));
    // incrementTrialsCompleted lives in trialCounter.js, which transitively
    // imports top-level-await modules (not unit-importable). Its entire body
    // is the one-liner below (prev = get; set prev + 1) over the REAL
    // DefaultMap — mirrored faithfully; the decision logic under test
    // (isConditionFinished) is the real import.
    incrementTrialsCompleted = (BC: string, _reader: any) => {
      const prev = statusMirror.nthTrialByCondition.get(BC);
      statusMirror.nthTrialByCondition.set(BC, prev + 1);
    };
  });

  afterAll(() => jest.dontMock("papaparse"));

  // Fresh status for each test (incrementTrialsCompleted mirror writes here).
  let statusMirror: any;
  beforeEach(() => {
    statusMirror = makeStatus();
  });
  const statusOf = () => statusMirror;

  test.failing(
    "V3: two denied-bad trials must not finish a target-4 condition",
    () => {
      // Script: good, good, bad-retried, bad-retried, bad-DENIED, bad-DENIED,
      // then a GOOD trial arrives. Only 2 good trials exist; spec clause 1
      // needs 4. The condition must not be finished.
      const reader = new ParamReader("conditions", () => {});
      const status = statusOf();
      const BC = "1_1";
      const sequence: Array<{ good: boolean; retried: boolean }> = [
        { good: true, retried: false },
        { good: true, retried: false },
        { good: false, retried: true },
        { good: false, retried: true },
        { good: false, retried: false }, // denied
        { good: false, retried: false }, // denied
      ];
      for (const step of sequence) {
        status.nthTrialAttemptedByCondition.set(
          BC,
          status.nthTrialAttemptedByCondition.get(BC) + 1,
        );
        if (!step.retried) incrementTrialsCompleted(BC, reader);
      }
      // the next trial is GOOD; may it finish the condition?
      expect(isConditionFinished(BC, reader, status, true)).toBe(false);
    },
  );

  test("V3 characterization: the counter currently reaches target with only 2 good trials", () => {
    const reader = new ParamReader("conditions", () => {});
    const status = statusOf();
    const BC = "1_1";
    const sequence: Array<{ good: boolean; retried: boolean }> = [
      { good: true, retried: false },
      { good: true, retried: false },
      { good: false, retried: true },
      { good: false, retried: true },
      { good: false, retried: false }, // denied
      { good: false, retried: false }, // denied
    ];
    for (const step of sequence) {
      status.nthTrialAttemptedByCondition.set(
        BC,
        status.nthTrialAttemptedByCondition.get(BC) + 1,
      );
      if (!step.retried) incrementTrialsCompleted(BC, reader);
    }
    // nthTrialByCondition now reads 5 (1-based default + 2 good + 2 denied)
    // ≥ target 4, so the next GOOD trial falsely finishes the condition.
    expect(status.nthTrialByCondition.get(BC)).toBe(5);
    expect(isConditionFinished(BC, reader, status, true)).toBe(true);
  });

  test("GREEN baseline: good trials alone do finish the condition at target", () => {
    const reader = new ParamReader("conditions", () => {});
    const status = statusOf();
    const BC = "1_1";
    // 3 good non-retried trials: counter 1+3 = 4 = target.
    for (let i = 0; i < 3; i++) {
      status.nthTrialAttemptedByCondition.set(
        BC,
        status.nthTrialAttemptedByCondition.get(BC) + 1,
      );
      incrementTrialsCompleted(BC, reader);
    }
    expect(isConditionFinished(BC, reader, status, true)).toBe(true);
  });
});
