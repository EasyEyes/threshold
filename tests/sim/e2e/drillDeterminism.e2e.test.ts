/**
 * Determinism drill (1g-LITE): run letter-sim N times with the SAME seed,
 * diff the event streams pairwise, assert ZERO divergences. This is the CI
 * tripwire — any nondeterminism (unseeded draw, timing leak, iteration
 * order) lands here as a first-divergence report, not a mystery flake.
 *
 * RUN_E2E-gated (each run ~30-90s).
 */
import { jest, expect, describe, test } from "@jest/globals";
import { simulate } from "../../../server/simulate";
import { diffStreams, type EventEnvelope } from "../../../server/diffEvents";
import { ensureSimTableBuilt } from "./helpers/runSimTable";

const RUN_E2E = process.env.RUN_E2E === "1";
const TABLE = "letter-sim";

(RUN_E2E ? describe : describe.skip)("determinism drill", () => {
  jest.setTimeout(600_000);
  const RUNS = 2;

  test(`same seed × ${RUNS} runs → event streams identical`, async () => {
    ensureSimTableBuilt({ name: TABLE });
    const streams: EventEnvelope[][] = [];
    for (let i = 0; i < RUNS; i++) {
      const result = await simulate(TABLE, { seed: 1, headless: true });
      expect(result.status).toBe("completed");
      const events = result.events as EventEnvelope[];
      // Sanity: the stream exists, is non-empty, seqs are gapless from 1.
      expect(events.length).toBeGreaterThan(10);
      events.forEach((env, i) => expect(env.seq).toBe(i + 1));
      streams.push(events);
    }
    // Pairwise diff against run 0.
    for (let i = 1; i < RUNS; i++) {
      const r = diffStreams(streams[0], streams[i]);
      if (!r.equal) {
        console.error(
          `DIVERGENCE run1 vs run${i + 1}:`,
          JSON.stringify(r.divergence, null, 2),
        );
      }
      expect(r.equal).toBe(true);
    }
  });
});
