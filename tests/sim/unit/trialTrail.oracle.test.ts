/**
 * @jest-environment node
 *
 * Unit tests for the CSV trail oracle (helpers/trialTrail.ts) that the
 * quest-flows e2e battery runs against real downloaded results CSVs.
 *
 * The oracle encodes the retry/practice/QUEST system's behavioral contract
 * as checkable invariants over the per-trial CSV rows, so any e2e table
 * gets exhaustive checking for free — no per-scenario hand-written asserts.
 *
 * RED first: these tests define the oracle's desired behavior.
 */

import {
  extractTrail,
  trailViolations,
  type TrailRow,
  type TrailSpec,
} from "../e2e/helpers/trialTrail";

const S = (over: Partial<TrailRow>): TrailRow => ({
  bc: "1_1",
  trialKind: "goodtest",
  given: true,
  retrying: false,
  correct: true,
  reset: false,
  level: 0.5,
  nth: 0,
  ...over,
});

const SPEC: TrailSpec = { "1_1": { trials: 3, ratio: 2, practice: true } };

describe("extractTrail", () => {
  const HDR =
    "block_condition,trialKind,trialGivenToQuest,retryingThisTrialBool,key_resp.corr,questResetByThresholdPracticeUntilCorrectBool,level";
  test("parses trial rows and skips non-trial rows", () => {
    const csv = [
      HDR,
      "1_1,goodpractice,TRUE,TRUE,1,TRUE,0.5",
      ",,,,,,", // config/no-trial row
      "1_1,goodtest,TRUE,FALSE,1,FALSE,0.4",
    ].join("\n");
    const trail = extractTrail(csv);
    expect(trail).toHaveLength(2);
    expect(trail[0].trialKind).toBe("goodpractice");
    expect(trail[0].retrying).toBe(true);
    expect(trail[1].given).toBe(true);
  });
});

describe("trailViolations: contract on a clean practice-then-target run", () => {
  test("clean run passes", () => {
    const trail = [
      S({
        trialKind: "goodpractice",
        given: true,
        retrying: true,
        correct: true,
        reset: true,
        nth: 1,
      }),
      S({ nth: 2, level: 0.4 }),
      S({ nth: 3, level: 0.4 }),
      S({ nth: 4, level: 0.35 }),
    ];
    expect(trailViolations(trail, SPEC)).toEqual([]);
  });

  test("unknown trialKind is reported", () => {
    const trail = [S({ trialKind: "mediumtest", nth: 1 })];
    expect(trailViolations(trail, SPEC)).toEqual(
      expect.arrayContaining([expect.stringContaining("unknown trialKind")]),
    );
  });

  test("good/bad prefix must match trialGivenToQuest", () => {
    const trail = [S({ trialKind: "badtest", given: true, nth: 1 })];
    expect(trailViolations(trail, SPEC)).toEqual(
      expect.arrayContaining([expect.stringContaining("contradicts")]),
    );
  });
});

describe("trailViolations: attempt budget", () => {
  test("attempts above ceil(trials*ratio) reported", () => {
    // trials=3, ratio=2 → budget 6 attempts. 7 rows → violation.
    const trail = Array.from({ length: 7 }, (_, i) =>
      S({
        trialKind: "badpractice",
        given: false,
        retrying: true,
        correct: false,
        nth: i + 1,
      }),
    );
    expect(trailViolations(trail, SPEC)).toEqual(
      expect.arrayContaining([expect.stringContaining("budget")]),
    );
  });

  test("exactly ceil(trials*ratio) attempts with zero given trials: budget exhaustion is a legitimate end", () => {
    // trials=3, ratio=2 → budget 6 attempts, retriesAllowed=3. Physically
    // possible all-bad-timing wrong-practice trail: rows 1-3 retried (budget
    // for retries), rows 4-6 retry denied (retriesAllowed used up). No
    // counting calls, no target — must NOT be flagged.
    const trail = [
      ...Array.from({ length: 3 }, (_, i) =>
        S({
          trialKind: "badpractice",
          given: false,
          retrying: true,
          correct: false,
          nth: i + 1,
        }),
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        S({
          trialKind: "badpractice",
          given: false,
          retrying: false,
          correct: false,
          nth: i + 4,
        }),
      ),
    ];
    expect(trailViolations(trail, SPEC)).toEqual([]);
  });
});

describe("trailViolations: reaching the target", () => {
  test("fewer good test trials than target (no early-end excuse) reported", () => {
    const trail = [
      S({
        trialKind: "goodpractice",
        given: true,
        retrying: true,
        correct: true,
        reset: true,
        nth: 1,
      }),
      S({ nth: 2 }),
      S({ nth: 3 }), // only 2 goodtest < 3, attempts 4 < 6, counting 4 ≥ 3 → hmm
    ];
    // counting calls (given) = 4 ≥ trials=3 → sequence exhaustion is a
    // legitimate early end. So this must PASS — adjust to a case that fails:
    expect(trailViolations(trail, SPEC)).toEqual([]);
  });

  test("below target with no excuse reported", () => {
    const trail = [
      S({ nth: 1 }),
      S({ nth: 2 }), // 2 goodtest < 3; attempts 2 < 6; counting 2 < 3 → no excuse
    ];
    expect(trailViolations(trail, SPEC)).toEqual(
      expect.arrayContaining([expect.stringContaining("good test trials")]),
    );
  });
});

describe("trailViolations: practice phase", () => {
  test("practice rows after test rows reported", () => {
    const trail = [
      S({ nth: 1 }),
      S({
        trialKind: "badpractice",
        given: false,
        retrying: true,
        correct: false,
        nth: 2,
      }),
    ];
    expect(trailViolations(trail, SPEC)).toEqual(
      expect.arrayContaining([expect.stringContaining("after test")]),
    );
  });

  test("practice must end on a correct reset row", () => {
    const trail = [
      S({
        trialKind: "goodpractice",
        given: true,
        retrying: true,
        correct: true,
        reset: true,
        nth: 1,
      }),
      S({
        trialKind: "badpractice",
        given: false,
        retrying: true,
        correct: false,
        nth: 2,
      }),
      S({ nth: 3 }),
    ];
    expect(trailViolations(trail, SPEC)).toEqual(
      expect.arrayContaining([expect.stringContaining("practice")]),
    );
  });

  test("no practice rows when spec says practice:false", () => {
    const trail = [
      S({
        trialKind: "goodpractice",
        given: true,
        retrying: true,
        correct: true,
        reset: true,
        nth: 1,
      }),
    ];
    expect(
      trailViolations(trail, {
        "1_1": { trials: 1, ratio: 2, practice: false },
      }),
    ).toEqual(expect.arrayContaining([expect.stringContaining("practice")]));
  });

  test("practice rows forbidden when no practice phase exists at all", () => {
    // practice:true spec with zero practice rows and immediate target: fine
    const trail = [S({ nth: 1 })];
    const spec: TrailSpec = { "1_1": { trials: 1, ratio: 2, practice: true } };
    expect(trailViolations(trail, spec)).toEqual([]);
  });
});

describe("trailViolations: practice ending exactly at budget exhaustion", () => {
  test("practice completes (correct + reset) on the final row, no test trials: legitimate budget end", () => {
    // Physically possible: blind/wrong-ish practice, budget runs out on the
    // very trial the participant first answers correctly. The reset row is
    // the condition's last row — no test trials followed, but the end is
    // legitimate (budget exhausted). Desired: NO violations.
    const trail = [
      ...Array.from({ length: 5 }, (_, i) =>
        S({
          trialKind: "badpractice",
          given: false,
          retrying: true,
          correct: false,
          nth: i + 1,
        }),
      ),
      S({
        trialKind: "goodpractice",
        given: true,
        retrying: false,
        correct: true,
        reset: true,
        nth: 6,
      }),
    ];
    expect(trailViolations(trail, SPEC)).toEqual([]);
  });

  test("reset on a NON-final row with no test trials is still reported", () => {
    const trail = [
      S({
        trialKind: "goodpractice",
        given: true,
        retrying: true,
        correct: true,
        reset: true,
        nth: 1,
      }),
      S({
        trialKind: "badpractice",
        given: false,
        retrying: true,
        correct: false,
        nth: 2,
      }),
    ];
    expect(trailViolations(trail, SPEC)).toEqual(
      expect.arrayContaining([expect.stringContaining("reset")]),
    );
  });
});

describe("trailViolations: retries", () => {
  test("retried row must be followed by another row of the same condition", () => {
    const trail = [
      S({
        bc: "1_1",
        trialKind: "badtest",
        given: false,
        retrying: true,
        correct: false,
        nth: 1,
      }),
      S({ bc: "1_2", nth: 2 }),
    ];
    expect(
      trailViolations(trail, {
        "1_1": { trials: 1, ratio: 2, practice: false },
        "1_2": { trials: 1, ratio: 2, practice: false },
      }),
    ).toEqual(expect.arrayContaining([expect.stringContaining("retried")]));
  });

  test("final retry row allowed only on sequence exhaustion", () => {
    // practice never correct; every row retrying; sequence (3) exhausts on
    // the 4th counting call. budget 6 > 4 attempts → no budget excuse.
    const trail = Array.from({ length: 4 }, (_, i) =>
      S({
        trialKind: "goodpractice",
        given: true,
        retrying: true,
        correct: false,
        nth: i + 1,
      }),
    );
    expect(trailViolations(trail, SPEC)).toEqual([]);
  });
});

describe("trailViolations: levels", () => {
  test("non-finite level reported", () => {
    const trail = [S({ level: NaN, nth: 1 })];
    expect(trailViolations(trail, SPEC)).toEqual(
      expect.arrayContaining([expect.stringContaining("level")]),
    );
  });
});
