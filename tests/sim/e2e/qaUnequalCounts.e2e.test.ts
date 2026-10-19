/**
 * @jest-environment node
 *
 * Spec e2e — pure questionAndAnswer blocks with UNEQUAL question counts
 * across conditions (glossary questionAnswer: "Any number of conditions can
 * each have up to 99 questions" — nothing requires the counts to match).
 *
 * One trial per question: the trialList repeats each condition's entry once
 * per ITS questions, randomly interleaved (MultiStairHandler-FULLRANDOM-
 * style scheduling), so conditions drop out as their questions end. Table:
 * qa-unequal-counts-sim (2 conditions, 2 vs 1 questions) → exactly 3
 * trials, no empty question dialogs, and the counter total is 3.
 *
 * OFF by default; opt in with RUN_E2E=1.
 */

import { expect, describe, test, afterAll } from "@jest/globals";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { runSimTable } from "./helpers/runSimTable";
import { simE2EPort } from "./helpers/ports";
import { parseCsv, csvColumn } from "./helpers/csv";

const ROOT = path.resolve(__dirname, "../../..");
const STUB_PORT = simE2EPort("qaUnequalCounts", 1);
let stub: ChildProcess | undefined;
afterAll(() => {
  try {
    if (stub?.pid) process.kill(-stub.pid, "SIGKILL");
  } catch {}
});

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "qa-unequal-counts-sim";
const E2E_PORT = simE2EPort("qaUnequalCounts");

(RUN_E2E ? describe : describe.skip)(
  "questionAndAnswer blocks with unequal per-condition question counts",
  () => {
    test("asks every condition exactly its own questions (2 vs 1 → 3 trials)", async () => {
      const result = await runSimTable(
        { name: TABLE_NAME },
        { port: E2E_PORT, seed: 1, stuckTimeoutMs: 45_000 },
      );

      expect(result.consoleErrors).toHaveLength(0);
      expect(result.status).toBe("completed");
      // One trial per question: 2 + 1 = 3.
      expect(result.trialsCompleted).toBe(3);
      expect(result.trialsTotal).toBe(3);

      // Every question was asked and recorded — no empty modals.
      const csv = Object.values(result.csvFiles)[0] ?? "";
      for (const nick of ["Q1M", "Q1F", "Q2M"]) {
        expect(csv).toContain(`${nick}-qa`);
      }
    }, 180_000);

    test("long-task census flushes into each Q&A trial's own row", async () => {
      // Q&A blocks skip the instruction routine — where the per-trial census
      // flush lives for other blocks — so without a Q&A-path flush, no trial
      // row ever receives the census write (not even the quiet-trial "[]").
      // Pinned per row (trials.thisN): an off-by-one flush (trial N's write
      // landing in trial N-1's row) would leave trial 3's row EMPTY — the
      // old count-based assertion could not tell the two apart.
      // Runs against a local phrases/glossary stub so a backend outage
      // cannot mask the regression.
      stub = spawn(
        "node",
        ["tests/sim/e2e/helpers/backendStubServer.mjs", String(STUB_PORT)],
        { cwd: ROOT, detached: true, stdio: "ignore" },
      );
      for (let i = 0; i < 30; i++) {
        try {
          const r = await fetch(
            `http://localhost:${STUB_PORT}/.netlify/functions/phrases?pinned=x/y`,
          );
          if (r.ok) break;
        } catch {}
        if (i === 29) throw new Error("backend stub did not start");
        await new Promise((r) => setTimeout(r, 500));
      }

      const result = await runSimTable(
        { name: TABLE_NAME },
        {
          port: E2E_PORT,
          seed: 1,
          stuckTimeoutMs: 45_000,
          urlParams: { "preview-deploy": `http://localhost:${STUB_PORT}` },
        },
      );
      expect(result.status).toBe("completed");
      const rows = parseCsv(Object.values(result.csvFiles)[0] ?? "");
      const census = csvColumn(rows, "longTaskSec");
      const thisN = csvColumn(rows, "trials.thisN");
      const trialRows = thisN
        .map((n, i) => [n, i] as const)
        .filter(([n]) => n !== "");
      // PsychoJS emits a trailing row repeating the last trial's identity
      // (empty census), so key by trial number, not by row count.
      const censusByTrial = new Map<string, string[]>();
      for (const [n, i] of trialRows)
        censusByTrial.set(n, [...(censusByTrial.get(n) ?? []), census[i]]);
      expect([...censusByTrial.keys()].sort()).toEqual(["1", "2", "3"]);
      for (const [n, cells] of censusByTrial) {
        // Each trial's own row carries its census: "[]" when quiet, entries
        // when long tasks occurred. No row at all = flush never ran for it
        // (exactly what an off-by-one flush would do to the last trial).
        if (!cells.some((c) => c !== ""))
          throw new Error(`trial ${n} has no row carrying its longTaskSec`);
      }
    }, 180_000);
  },
);
