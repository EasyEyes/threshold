/**
 * @jest-environment node
 *
 * Characterization (GREEN) tests for the trial-retry budget and
 * condition-finished logic (components/retryTrials.ts) — previously untested
 * despite being central to the Persian crash class.
 *
 * Ground truth: a real experiment table compiled through the real pipeline
 * (normalize → blockGen), read by a real ParamReader; status counters use
 * the real DefaultMap (whose defaults are load-bearing: nthTrialByCondition
 * defaults to 1, "current trial #", not a completion count).
 *
 * Semantics under test (current, correct behavior):
 *   trialsMax        = ceil(conditionTrials × thresholdAllowedTrialRatio)
 *   retriesAllowed   = trialsMax − conditionTrials
 *   retriesDone      = attempted − completed  (completed is 1-based current #)
 *   retry allowed    ⇔ retriesDone < retriesAllowed AND not skipping block
 *   condition done   ⇔ good trial AND currentTrial# ≥ conditionTrials
 *                    (target ≤ 0 → done immediately)
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

/** Fresh real-flavored status: DefaultMaps with production defaults. */
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

describe("okayToRetryThisTrial (real ParamReader over compiled table)", () => {
  let ParamReader: any;
  let okayToRetryThisTrial: any;
  let isConditionFinished: any;

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
    ({ okayToRetryThisTrial, isConditionFinished } = await import(
      "../components/retryTrials"
    ));
  });

  afterAll(() => jest.dontMock("papaparse"));

  // Helper: drive n attempted / m completed via the REAL counter updates
  // (increment semantics matter: nthTrialByCondition increments only on
  // non-retried completions; attempted increments every trial).
  const drive = (
    status: Status,
    bc: string,
    attempted: number,
    completions: number,
  ) => {
    for (let i = 0; i < attempted; i++)
      status.nthTrialAttemptedByCondition.set(bc, i + 1);
    for (let i = 0; i < completions; i++)
      status.nthTrialByCondition.set(bc, i + 1); // 1-based current trial #
  };

  test("budget A (4 trials × 1.5): retriesAllowed = 2", () => {
    new ParamReader("conditions", () => {}); // loads the mocked block files
    const paramReader = new ParamReader("conditions", () => {});
    const status = makeStatus();
    const A = "1_1";

    // First attempt of a fresh condition: no retries done yet → allowed.
    drive(status, A, 1, 0); // attempted 1, current# 1 → done 0
    expect(okayToRetryThisTrial(status, paramReader, NO_SKIP)).toBe(true);

    // After 2 retried bad trials (attempted 3, current# still 1): done 2 → denied.
    drive(status, A, 3, 0);
    expect(okayToRetryThisTrial(status, paramReader, NO_SKIP)).toBe(false);

    // Completions buy budget back: attempted 4, completed 2 → done 2 → denied.
    drive(status, A, 4, 2);
    expect(okayToRetryThisTrial(status, paramReader, NO_SKIP)).toBe(false);

    // attempted 4, completed 3 → done 1 → allowed.
    drive(status, A, 4, 3);
    expect(okayToRetryThisTrial(status, paramReader, NO_SKIP)).toBe(true);
  });

  test("budget B (3 trials × 1): retriesAllowed = 0 → never retry", () => {
    const paramReader = new ParamReader("conditions", () => {});
    const status = makeStatus();
    status.block_condition = "1_2";
    drive(status, "1_2", 1, 0);
    expect(okayToRetryThisTrial(status, paramReader, NO_SKIP)).toBe(false);
  });

  test("budget C (3 trials × 2.4): ceil(7.2) = 8 → retriesAllowed = 5", () => {
    const paramReader = new ParamReader("conditions", () => {});
    const status = makeStatus();
    status.block_condition = "1_3";
    drive(status, "1_3", 5, 0); // done 4 < 5 → allowed
    expect(okayToRetryThisTrial(status, paramReader, NO_SKIP)).toBe(true);
    drive(status, "1_3", 6, 0); // done 5 → denied
    expect(okayToRetryThisTrial(status, paramReader, NO_SKIP)).toBe(false);
  });

  test("skipping this block denies retries; skip-trial alone does not", () => {
    const paramReader = new ParamReader("conditions", () => {});
    const status = makeStatus();
    drive(status, "1_1", 1, 0);
    const skipBlock: SkipTrialOrBlock = {
      ...NO_SKIP,
      skipBlock: true,
      blockId: 1,
    };
    expect(okayToRetryThisTrial(status, paramReader, skipBlock)).toBe(false);
    const skipTrial: SkipTrialOrBlock = {
      ...NO_SKIP,
      skipTrial: true,
      trialId: 1,
    };
    expect(okayToRetryThisTrial(status, paramReader, skipTrial)).toBe(true);
  });
});

describe("isConditionFinished (real ParamReader over compiled table)", () => {
  let ParamReader: any;
  let isConditionFinished: any;

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
  });

  afterAll(() => jest.dontMock("papaparse"));

  test("fresh condition (current# 1 by DefaultMap): good trial finishes iff target 1", () => {
    const paramReader = new ParamReader("conditions", () => {});
    const status = makeStatus();
    // 1_1 target 4: current# 1 < 4 → not finished.
    expect(isConditionFinished("1_1", paramReader, status, true)).toBe(false);
  });

  test("good trial at the target-th trial finishes; one below does not", () => {
    const paramReader = new ParamReader("conditions", () => {});
    const status = makeStatus();
    status.nthTrialByCondition.set("1_1", 3); // current# 3 < 4
    expect(isConditionFinished("1_1", paramReader, status, true)).toBe(false);
    status.nthTrialByCondition.set("1_1", 4); // current# 4 = target
    expect(isConditionFinished("1_1", paramReader, status, true)).toBe(true);
  });

  test("bad (not given to QUEST) trial never finishes the condition", () => {
    const paramReader = new ParamReader("conditions", () => {});
    const status = makeStatus();
    status.nthTrialByCondition.set("1_1", 4);
    expect(isConditionFinished("1_1", paramReader, status, false)).toBe(false);
  });

  test("target ≤ 0 finishes immediately", () => {
    const paramReader = new ParamReader("conditions", () => {});
    const status = makeStatus();
    expect(isConditionFinished("1_1", paramReader, status, false)).toBe(false);
    // No 0-target condition in the fixture; simulate via a fake reader.
    const fake = { read: () => 0 };
    expect(isConditionFinished("1_1", fake as any, status, false)).toBe(true);
  });
});
