/**
 * @jest-environment node
 *
 * Quest-flows e2e battery: the retry/practice/QUEST system exercised on the
 * REAL runtime (real threshold.js + psychojs src + jsQUEST module + real
 * frame timing + real ExperimentHandler CSV), as the participant drives it.
 *
 * Every scenario asserts:
 *   - experiment completes, zero console errors (the crash class of the
 *     Persian/Crowding studies surfaced here);
 *   - the downloaded results CSV satisfies the full behavioral contract
 *     (tests/sim/e2e/helpers/trialTrail.ts — budget, target, practice-phase,
 *     retry-follower, finite-level invariants);
 *   - the recorded per-trial MultiStairHandler/QuestHandler internals
 *     (result.loopTrail) satisfy the iterator-safety invariant (a sequence
 *     pointer at the end must come with a finished staircase).
 *
 * Scenarios (each a distinct termination path of the system):
 *   ideal    — all-good trials, no practice: exact target, no retries.
 *   practice — practice ends on first correct (QUEST reset), then target.
 *   budget   — wrong answers + practice that never completes: sequence
 *              exhaustion ends the condition with ZERO test trials
 *              (Persian-shaped; must terminate gracefully, not crash).
 *   twocond  — two interleaved conditions in one block (FULL_RANDOM),
 *              practice on one, none on the other, tight-ish lateness
 *              tolerance for a real good/bad timing mix with retries.
 *
 * OFF by default; opt in with RUN_E2E=1.
 */

import { expect, describe, test } from "@jest/globals";
import { runSimTable } from "./helpers/runSimTable";
import {
  extractTrail,
  trailViolations,
  type TrailSpec,
} from "./helpers/trialTrail";
import {
  loopTrailInvariantViolations,
  type LoopTrailRow,
} from "../../../components/loopTrailSnapshot";

const RUN_E2E = process.env.RUN_E2E === "1";

interface FlowCase {
  name: string;
  port: number;
  spec: TrailSpec;
  /** Scenario-specific ground-truth assertions on the parsed trail. */
  check?: (trail: ReturnType<typeof extractTrail>) => void;
}

const count = (
  trail: ReturnType<typeof extractTrail>,
  kind: string,
  bc?: string,
) => trail.filter((r) => r.trialKind === kind && (!bc || r.bc === bc)).length;

const CASES: FlowCase[] = [
  {
    name: "quest-flow-ideal-sim",
    port: 5653,
    spec: { "1_1": { trials: 4, ratio: 1.5, practice: false } },
    check: (trail) => {
      expect(trail).toHaveLength(4);
      expect(count(trail, "goodtest", "1_1")).toBe(4);
      expect(count(trail, "goodpractice")).toBe(0);
    },
  },
  {
    name: "quest-flow-practice-sim",
    port: 5654,
    spec: { "1_1": { trials: 4, ratio: 1.5, practice: true } },
    check: (trail) => {
      // Practice ends on the first (correct) trial: exactly one practice
      // row, given + reset, then the target good test trials.
      expect(count(trail, "goodpractice", "1_1")).toBe(1);
      expect(trail[0].reset).toBe(true);
      expect(trail[0].correct).toBe(true);
      expect(count(trail, "goodtest", "1_1")).toBe(4);
    },
  },
  {
    name: "quest-flow-budget-sim",
    port: 5655,
    spec: { "1_1": { trials: 4, ratio: 4, practice: true } },
    check: (trail) => {
      // Wrong answers forever: practice never completes, every trial is
      // given (counting) — the sequence exhausts after conditionTrials
      // counting calls plus the rollover call, and the condition ends with
      // zero test trials. Graceful, no crash.
      expect(count(trail, "goodtest", "1_1")).toBe(0);
      expect(count(trail, "badtest", "1_1")).toBe(0);
      expect(count(trail, "goodpractice", "1_1")).toBe(5);
      expect(trail.every((r) => r.bc === "1_1")).toBe(true);
    },
  },
  {
    name: "quest-flow-allbad-sim",
    port: 5659,
    spec: { "1_1": { trials: 4, ratio: 1.5, practice: true } },
    check: (trail) => {
      // Every trial duration-bad: zero given to QUEST, no rollover. The
      // retry queue alone bounds the condition: exactly maxTrials=6 attempts
      // (4 initial + 2 capped retries), 0 good trials, graceful end.
      expect(trail).toHaveLength(6);
      expect(count(trail, "goodtest", "1_1")).toBe(0);
      expect(trail.every((r) => !r.given)).toBe(true);
    },
  },
  {
    name: "quest-flow-drain-sim",
    port: 5657,
    spec: {
      "1_1": { trials: 3, ratio: 4, practice: true },
      "1_2": { trials: 3, ratio: 4, practice: false },
    },
    check: (trail) => {
      // A (1_1): never-correct practice → sequence exhaustion with zero
      // test trials; queued retries for the finished staircase voided.
      expect(count(trail, "goodtest", "1_1")).toBe(0);
      expect(count(trail, "badtest", "1_1")).toBe(0);
      // B (1_2): normal target.
      expect(count(trail, "goodtest", "1_2")).toBe(3);
    },
  },
  {
    name: "quest-flow-multiblock-sim",
    port: 5658,
    spec: {
      "1_1": { trials: 3, ratio: 4, practice: true },
      "2_1": { trials: 3, ratio: 4, practice: true },
    },
    check: (trail) => {
      // Both blocks run practice (first correct → reset) then hit target —
      // proves practice/counters/loop state reset at the block boundary.
      for (const bc of ["1_1", "2_1"]) {
        expect(count(trail, "goodpractice", bc)).toBe(1);
        expect(count(trail, "goodtest", bc)).toBe(3);
      }
    },
  },
  {
    name: "quest-flow-twocond-sim",
    port: 5656,
    spec: {
      "1_1": { trials: 3, ratio: 4, practice: true },
      "1_2": { trials: 3, ratio: 4, practice: false },
    },
    check: (trail) => {
      // Both interleaved conditions get real good trials despite the tight
      // lateness tolerance (retries interleave arbitrarily; exact-target or
      // legitimate-early-end is the oracle's call, not this check's).
      expect(count(trail, "goodtest", "1_1")).toBeGreaterThanOrEqual(2);
      expect(count(trail, "goodtest", "1_2")).toBeGreaterThanOrEqual(2);
      const bcs = new Set(trail.map((r) => r.bc));
      expect(bcs).toEqual(new Set(["1_1", "1_2"]));
    },
  },
];

(RUN_E2E ? describe : describe.skip)(
  "quest-flows battery (real runtime)",
  () => {
    for (const c of CASES) {
      test(`${c.name}: completes, CSV contract holds, iterator invariants hold`, async () => {
        const result = await runSimTable(
          { name: c.name },
          { port: c.port, seed: 1, stuckTimeoutMs: 45_000 },
        );

        expect(result.consoleErrors).toHaveLength(0);
        expect(result.status).toBe("completed");

        const csvEntry = Object.entries(result.csvFiles).find(([, text]) =>
          text.includes("trialKind"),
        );
        expect(csvEntry).toBeDefined();
        const trail = extractTrail(csvEntry![1]);
        expect(trail.length).toBeGreaterThan(0);
        expect(trailViolations(trail, c.spec)).toEqual([]);

        const loopTrail = result.loopTrail as LoopTrailRow[];
        expect(loopTrail.length).toBeGreaterThan(0);
        expect(loopTrailInvariantViolations(loopTrail)).toEqual([]);

        c.check?.(trail);
      }, 180_000);
    }
  },
);
