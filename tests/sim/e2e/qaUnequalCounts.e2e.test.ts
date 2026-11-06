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

import { expect, describe, test, beforeAll, afterAll } from "@jest/globals";
import { readFileSync } from "node:fs";
import type { SimulateResult } from "../../../server/simulate";
import { ensureSimTableBuilt } from "./helpers/runSimTable";
import { simE2EPort } from "./helpers/ports";
import { parseCsv, csvColumn } from "./helpers/csv";
import { startBackendStub, type BackendStub } from "./helpers/backendStub";

const RUN_E2E = process.env.RUN_E2E === "1";
const TABLE_NAME = "qa-unequal-counts-sim";
const E2E_PORT = simE2EPort("qaUnequalCounts");

let backend: BackendStub | undefined;
afterAll(() => backend?.stop());

(RUN_E2E ? describe : describe.skip)(
  "questionAndAnswer blocks with unequal per-condition question counts",
  () => {
    let result: SimulateResult;
    let lines: string[];

    // One immutable production run supplies every assertion. The local
    // phrases/glossary backend keeps external outages out of this spec suite.
    beforeAll(async () => {
      backend = await startBackendStub("qaUnequalCounts");
      ensureSimTableBuilt({ name: TABLE_NAME });
      const jsonlPath = `/tmp/qa-counter-${process.pid}.jsonl`;
      const { simulate } = await import("../../../server/simulate");
      result = await simulate(TABLE_NAME, {
        port: E2E_PORT,
        seed: 1,
        stuckTimeoutMs: 45_000,
        jsonlPath,
        urlParams: { "preview-deploy": backend.url },
      });
      lines = readFileSync(jsonlPath, "utf8").split("\n");
    }, 240_000);

    test("asks every condition exactly its own questions (2 vs 1 → 3 trials)", () => {
      expect(result.consoleErrors).toHaveLength(0);
      expect(result.status).toBe("completed");
      expect(result.trialsCompleted).toBe(3);
      expect(result.trialsTotal).toBe(3);

      // Every question was asked and recorded — no empty modals.
      const csv = Object.values(result.csvFiles)[0] ?? "";
      for (const nick of ["Q1M", "Q1F", "Q2M"]) {
        expect(csv).toContain(`${nick}-qa`);
      }
    });

    test("keeps each Q&A counter visible instead of overwriting it with stale flags", () => {
      expect(result.status).toBe("completed");
      const stimValue = (prefix: string) =>
        lines
          .filter((line) => line.includes(prefix))
          .map((line) => {
            const event = JSON.parse(line) as { text: string };
            return JSON.parse(event.text.slice(prefix.length)) as string;
          });
      const counterTexts = stimValue("[sim:stim] trialCounter.text = ");
      const counterAutoDraws = stimValue("[sim:stim] trialCounter.autoDraw = ");
      const firstAutoDrawIndex = lines.findIndex((line) =>
        line.includes("[sim:stim] trialCounter.autoDraw = "),
      );
      const firstQaResponseIndex = lines.findIndex(
        (line) =>
          line.includes("[sim:dispatch] qa-") || line.includes("(qa-textarea)"),
      );

      // The counter must enter the draw list before the first answer and
      // remain drawn across all three questions. Text alone proves neither.
      expect(counterAutoDraws).toEqual(["true"]);
      expect(firstAutoDrawIndex).toBeGreaterThanOrEqual(0);
      expect(firstQaResponseIndex).toBeGreaterThanOrEqual(0);
      expect(firstAutoDrawIndex).toBeLessThan(firstQaResponseIndex);
      expect(counterTexts.filter(Boolean)).toEqual([
        expect.stringContaining("Trial 1 of 3"),
        expect.stringContaining("Trial 2 of 3"),
        expect.stringContaining("Trial 3 of 3"),
      ]);
      expect(counterTexts.filter((text) => text === "")).toEqual([]);
    });

    test("long-task census flushes into each Q&A trial's own row", () => {
      // Q&A blocks skip the instruction routine — where the per-trial census
      // flush lives for other blocks. Key by trial number because PsychoJS
      // emits a trailing row repeating the last trial's identity.
      expect(result.status).toBe("completed");
      const rows = parseCsv(Object.values(result.csvFiles)[0] ?? "");
      const census = csvColumn(rows, "longTaskSec");
      const thisN = csvColumn(rows, "trials.thisN");
      const trialRows = thisN
        .map((n, i) => [n, i] as const)
        .filter(([n]) => n !== "");
      const censusByTrial = new Map<string, string[]>();
      for (const [n, i] of trialRows)
        censusByTrial.set(n, [...(censusByTrial.get(n) ?? []), census[i]]);
      expect([...censusByTrial.keys()].sort()).toEqual(["1", "2", "3"]);
      for (const [n, cells] of censusByTrial) {
        if (!cells.some((c) => c !== ""))
          throw new Error(`trial ${n} has no row carrying its longTaskSec`);
      }
    });

    test("every Q&A trial row carries a FRESH heap sample (never blank, never inherited)", () => {
      // Q&A skips the instruction routine used by stimulus trials, so its
      // before-drawing sample must be fresh rather than blank or inherited.
      expect(result.status).toBe("completed");
      const rows = parseCsv(Object.values(result.csvFiles)[0] ?? "");
      const heap = csvColumn(rows, "heapUsedBeforeDrawing (MB)");
      const thisN = csvColumn(rows, "trials.thisN");
      const trialRows = thisN
        .map((n, i) => [n, i] as const)
        .filter(([n]) => n !== "");
      const heapByTrial = new Map<string, string[]>();
      for (const [n, i] of trialRows)
        heapByTrial.set(n, [...(heapByTrial.get(n) ?? []), heap[i]]);
      expect([...heapByTrial.keys()].sort()).toEqual(["1", "2", "3"]);
      for (const [n, cells] of heapByTrial) {
        const vals = cells.filter((c) => c !== "").map(Number);
        if (!vals.some((v) => Number.isFinite(v) && v > 0))
          throw new Error(`trial ${n} has no row carrying a fresh heap sample`);
      }
    });
  },
);
