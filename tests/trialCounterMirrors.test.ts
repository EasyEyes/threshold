/**
 * Guard tests for the percent-correct counters (showPercentCorrectBool).
 *
 * The end-of-block popup aggregates percent correct across flagged
 * CONDITIONS using status.nthTrial{Correct,Completed}ThisBlockByCondition.
 * Those maps must never diverge from the block-wide totals
 * (status.trial{Correct,Completed}_thisBlock). Two guards:
 *
 *  1. Unit: the increment helpers in components/trialCounter.js keep the
 *     block totals equal to the sum of the per-condition maps, always.
 *  2. Static: no source file may increment the block totals directly —
 *     all increments must funnel through the helpers (single funnel).
 */

import { readFileSync, readdirSync } from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// 1. Unit: mirror invariant
// ---------------------------------------------------------------------------

class DefaultMap<K, V> extends Map<K, V> {
  default: () => V;
  constructor(d: () => V) {
    super();
    this.default = d;
  }
  get(key: K): V {
    if (!this.has(key)) this.set(key, this.default());
    return super.get(key)!;
  }
}

const makeStatus = () => ({
  trialCorrect_thisBlock: 0,
  trialCompleted_thisBlock: 0,
  nthTrialCorrectThisBlockByCondition: new DefaultMap<string, number>(() => 0),
  nthTrialCompletedThisBlockByCondition: new DefaultMap<string, number>(
    () => 0,
  ),
});

describe("incrementTrial{Correct,Completed}ThisBlock — mirror invariant", () => {
  let status: ReturnType<typeof makeStatus>;

  beforeEach(() => {
    jest.resetModules();
    status = makeStatus();
    jest.doMock("../components/global.js", () => ({
      __esModule: true,
      rc: {},
      status,
      viewingDistanceCm: { current: undefined, desired: undefined },
    }));
    jest.doMock("../components/multiple-displays/globals.ts", () => ({
      __esModule: true,
      Screens: [],
    }));
    jest.doMock("../preprocess/phrases-loader", () => ({
      __esModule: true,
      phrasesData: { version: "test", phrases: {} },
    }));
    jest.doMock("../components/readPhrases", () => ({
      __esModule: true,
      readi18nPhrases: () => "",
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const sumMap = (m: Map<string, number>) =>
    [...m.values()].reduce((a, b) => a + b, 0);

  it("block totals always equal the sum of the per-condition maps", async () => {
    const { incrementTrialCorrectThisBlock, incrementTrialCompletedThisBlock } =
      await import("../components/trialCounter");

    const script: Array<["correct" | "completed", string]> = [
      ["completed", "1_1"],
      ["correct", "1_1"],
      ["completed", "1_2"],
      ["completed", "1_1"],
      ["correct", "1_1"],
      ["completed", "1_2"],
      ["correct", "1_2"],
      ["completed", "1_3"],
    ];
    for (const [kind, bc] of script) {
      (kind === "correct"
        ? incrementTrialCorrectThisBlock
        : incrementTrialCompletedThisBlock)(bc);
      // Invariant holds after EVERY increment, not just at block end.
      expect(status.trialCorrect_thisBlock).toBe(
        sumMap(status.nthTrialCorrectThisBlockByCondition),
      );
      expect(status.trialCompleted_thisBlock).toBe(
        sumMap(status.nthTrialCompletedThisBlockByCondition),
      );
    }
    expect(status.trialCorrect_thisBlock).toBe(3);
    expect(status.trialCompleted_thisBlock).toBe(5);
    expect(status.nthTrialCorrectThisBlockByCondition.get("1_1")).toBe(2);
    expect(status.nthTrialCompletedThisBlockByCondition.get("1_2")).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 2. Static: single funnel — no direct increments outside the helpers
// ---------------------------------------------------------------------------

describe("single funnel for block trial counters", () => {
  const ROOT = process.cwd();
  const files = [
    path.join(ROOT, "threshold.js"),
    ...readdirSync(path.join(ROOT, "components"))
      .filter((f) => /\.(js|ts)$/.test(f))
      .map((f) => path.join(ROOT, "components", f)),
  ];

  // Increments of the block totals are only allowed inside the two helpers
  // in components/trialCounter.js.
  const DIRECT_INCREMENT =
    /status\.trial(Correct|Completed)_thisBlock\s*(\+\+|\+=)/g;

  it("no direct status.trial{Correct,Completed}_thisBlock increments outside components/trialCounter.js", () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file.endsWith(path.join("components", "trialCounter.js"))) continue;
      const src = readFileSync(file, "utf8");
      const matches = src.match(DIRECT_INCREMENT);
      if (matches) {
        offenders.push(`${path.relative(ROOT, file)}: ${matches.join(", ")}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("block-end reset of the totals is paired with clearing the per-condition maps", () => {
    // trialsLoopEnd resets status.trial{Correct,Completed}_thisBlock = 0;
    // the maps MUST be cleared at the same time or they go stale next block.
    const src = readFileSync(path.join(ROOT, "threshold.js"), "utf8");
    const resetIdx = src.indexOf("status.trialCorrect_thisBlock = 0;");
    expect(resetIdx).toBeGreaterThan(-1);
    const resetRegion = src.slice(resetIdx, resetIdx + 600);
    expect(resetRegion).toContain("status.trialCompleted_thisBlock = 0;");
    expect(resetRegion).toContain(
      "nthTrialCorrectThisBlockByCondition.clear()",
    );
    expect(resetRegion).toContain(
      "nthTrialCompletedThisBlockByCondition.clear()",
    );
  });
});
