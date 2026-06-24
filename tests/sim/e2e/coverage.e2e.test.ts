/**
 * @jest-environment node
 *
 * Coverage e2e tests: verify the simulated participant can drive every
 * supported targetKind to completion.
 *
 * This test file is OFF by default under `npm test`. It builds each table
 * (cached), starts a dev server on a unique port, and runs the simulator.
 *
 * Opt in with: RUN_E2E=1 npm test
 *
 * ## Expected outcomes
 *
 * Tables in the PASSING group MUST complete with status="completed" and
 * trialsCompleted > 0. A failure here is a regression.
 *
 * Tables in the KNOWN_RED group are EXPECTED to fail — they document known
 * sim-mode gaps (e.g. Arrow key modeling for vernier). Each test asserts
 * completion, so it will fail until the gap is fixed. When the fix lands,
 * the test turns GREEN automatically — move it to the PASSING group.
 *
 * ## Port allocation
 *
 * Each table gets a unique port (5600 + index) to avoid conflicts with
 * smoke.e2e.test.ts (port 5599) and with parallel Jest workers.
 */

import { jest, expect, describe, test } from "@jest/globals";
import { runSimTable, type SimTableSpec } from "./helpers/runSimTable";

const RUN_E2E = process.env.RUN_E2E === "1";

// ── Tables expected to complete successfully ─────────────────────────────────
const PASSING: SimTableSpec[] = [
  { name: "repeatedLetters-identify-sim" },
  { name: "vernier-identify-sim" },
  {
    name: "reading-identify-sim",
    resources: [
      { from: "texts/short-reading.txt", to: "texts/short-reading.txt" },
    ],
  },
  {
    name: "rsvpReading-identify-sim",
    resources: [
      { from: "texts/short-reading.txt", to: "texts/short-reading.txt" },
    ],
  },
];

// ── Tables expected to fail (known gaps) ─────────────────────────────────────
//
// Each entry documents a specific sim-mode coverage gap. The test asserts
// completion, so it WILL fail until the gap is fixed. The RED signal is
// intentional — it tracks unfixed work and ensures regressions are visible.
//
// When you fix a gap, move the entry to PASSING.
const KNOWN_RED: Array<{ spec: SimTableSpec; reason: string }> = [
  {
    spec: {
      name: "image-identify-sim",
      resources: [
        { from: "folders/testImages.zip", to: "folders/testImages.zip" },
      ],
    },
    reason:
      "Pre-existing: targetImageReplacementBool missing from glossary — image.js:331 reads it unconditionally, paramReader throws",
  },
  {
    spec: {
      name: "movie-identify-sim",
      resources: [
        {
          from: "code/tiltedFlickeringGabor.js",
          to: "code/tiltedFlickeringGabor.js",
        },
      ],
    },
    reason:
      "G-movie: XYPxOfDeg undefined in multiple-displays/utils.ts:257 — movie JS needs display calibration properties not stubbed by sim calibration injection",
  },
];

// ── Tests ────────────────────────────────────────────────────────────────────

const E2E = RUN_E2E ? describe : describe.skip;

E2E("Sim coverage (passing)", () => {
  test.each(PASSING)(
    "$name completes",
    async (spec) => {
      const port = 5600 + PASSING.indexOf(spec);
      const result = await runSimTable(spec, {
        port,
        seed: 1,
        stuckTimeoutMs: 20_000,
        headless: true,
      });
      if (result.status !== "completed") {
        const debugMsg = `[DEBUG] ${spec.name}: status=${
          result.status
        } trials=${result.trialsCompleted}/${
          result.trialsTotal
        } warnings=${JSON.stringify(result.warnings)} errors=${JSON.stringify(
          result.consoleErrors.slice(0, 8),
        )} popups=${JSON.stringify(result.sweetAlertPopups)}`;
        process.stdout.write(debugMsg + "\n");
      }
      expect(result.status).toBe("completed");
      expect(result.trialsCompleted).toBeGreaterThan(0);
    },
    180_000, // 3-min Jest timeout (first build ~15s + sim ~30s, cached after).
  );
});

E2E("Sim coverage (known RED — fix to turn GREEN)", () => {
  test.each(KNOWN_RED)(
    "$spec.name completes — $reason",
    async ({ spec }) => {
      const port = 5700 + KNOWN_RED.findIndex((e) => e.spec.name === spec.name);
      const result = await runSimTable(spec, {
        port,
        seed: 1,
        stuckTimeoutMs: 20_000,
        headless: true,
      });
      expect(result.status).toBe("completed");
      expect(result.trialsCompleted).toBeGreaterThan(0);
    },
    60_000, // 1-min timeout (shorter stuck + build).
  );
});
