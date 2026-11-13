/**
 * Source contracts for threshold.js's per-targetKind trialRoutineEnd wiring.
 *
 * threshold.js is a monolith that cannot be unit-imported, so these tests
 * pin the WIRING at the source level: the flags computed in the shared
 * trialRoutineEnd prologue (justPracticingSoResetQuest / justPracticing-
 * SoRetryTrial, threshold.js ~9886-9921) must reach every targetKind's
 * QUEST bookkeeping. A kind that drops them silently breaks
 * thresholdPracticeUntilCorrectBool for that kind (budget never restored,
 * practice responses pollute the QUEST pdf — the same class as the Persian
 * trial-sequence-exhaustion bug).
 */
import { readFileSync } from "fs";
import * as path from "path";

const thresholdSrc = readFileSync(
  path.join(__dirname, "..", "threshold.js"),
  "utf8",
);

/** The switchKind case block for `kind` inside trialRoutineEnd's switch. */
const switchCase = (kind: string): string => {
  const start = thresholdSrc.indexOf(
    `${kind}: () => {`,
    thresholdSrc.indexOf("ending trial routine"),
  );
  expect(start).toBeGreaterThan(0);
  const next = thresholdSrc.indexOf("},\n          ", start + 1);
  return thresholdSrc.slice(start, next);
};

/** The toShowCursor skip block inside trialRoutineEachFrame. */
const skipBlock = (): string => {
  const marker = "A skipped trial is not a completed trial";
  const start = thresholdSrc.indexOf(marker);
  expect(start).toBeGreaterThan(0);
  return thresholdSrc.slice(start, start + 1400);
};

describe("repeatedLetters trialRoutineEnd wiring (source contract)", () => {
  const block = switchCase("repeatedLetters");

  test.failing(
    "F3: _letter_trialRoutineEnd receives the practice flags",
    () => {
      // The letter path passes both flags (~7 args); repeatedLetters currently
      // stops at `letterRespondedEarly` — the flush never reaches QUEST, so a
      // long wrong-answer practice phase starves the staircase budget and
      // pollutes the QUEST pdf (the Persian bug class).
      const call = block.slice(
        block.indexOf("_letter_trialRoutineEnd("),
        block.indexOf(");", block.indexOf("_letter_trialRoutineEnd(")),
      );
      expect(call).toContain("doneWithPracticeSoResetQuest");
      expect(call).toContain("justPracticingSoRetryTrial");
    },
  );
});

describe("skipped-trial path (source contract)", () => {
  // Data integrity: a skipped trial (toShowCursor early return) must not
  // consume the block's trial budget — requeue it via addTrial when retries
  // are allowed, else count it completed so the block still terminates.
  const block = skipBlock();

  test("skip path requeues via addTrial when retries are allowed, else counts completed", () => {
    expect(block).toContain("currentLoop.addTrial(status.block_condition)");
    expect(block).toContain(
      "incrementTrialsCompleted(status.block_condition, paramReader)",
    );
  });

  test("skip path always advances the scheduler (_nextTrial) and skips data save", () => {
    expect(block).toContain("currentLoop._nextTrial()");
    expect(block).toContain("return Scheduler.Event.NEXT");
  });
});

/**
 * `#ee-state[data-target-kind]` comes from the `block.entered` event, and the
 * event projection is authoritative over direct setEEState writes. Publishing
 * `targetKind.current` therefore publishes the PREVIOUS block's kind: the
 * per-block preset happens later in the same routine. In a study that mixes
 * kinds (Compare3Languages: Q&A blocks then reading blocks) the simulated
 * participant then sends RETURN on a reading instruction page, which only
 * advances on SPACE — the c3lFullRun "Stuck at phase=instructions" stall.
 */
describe("block.entered carries the block's own targetKind (source contract)", () => {
  const publishCall = (): string => {
    const start = thresholdSrc.indexOf("publishBlockBegin({");
    expect(start).toBeGreaterThan(0);
    const end = thresholdSrc.indexOf("});", start);
    return thresholdSrc.slice(start, end);
  };

  it("reads targetKind for the current block instead of the stale current", () => {
    const call = publishCall();
    expect(call).not.toMatch(/targetKind:\s*targetKind\.current/);
    expect(call).toMatch(
      /targetKind:\s*paramReader\.read\("targetKind",\s*status\.block\)/,
    );
  });

  it("reads targetTask for the current block", () => {
    const call = publishCall();
    expect(call).not.toMatch(/targetTask:\s*targetTask\.current/);
    expect(call).toMatch(/targetTask:\s*readTargetTask\(/);
  });
});
