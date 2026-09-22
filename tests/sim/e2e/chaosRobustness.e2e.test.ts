/**
 * @jest-environment node
 *
 * Chaos robustness e2e (Trello: EXPLAIN EVERY FAILURE).
 *
 * Denis's general guarantee: every way of ending a session ends in success
 * or a SPECIFIC recorded reason — never a blank one. This suite throws a
 * deterministic error at a different point of the startup/flow sequence on
 * each seeded run (via ?chaos=<seed>, injected from setCurrentFn) and asserts
 * the outcome contract on the session CSV:
 *   - the run either completed normally (the injection point never occurred
 *     in that flow), or
 *   - it terminated with a NON-BLANK error-column label that is specific
 *     (`_crash:<fn>:<ErrorType>:<topFrame>`), with the crash evidence in the
 *     same `error` column, and the data still saved (CSV downloaded).
 *
 * OFF by default; opt in with RUN_E2E=1.
 */

import { expect, describe, test } from "@jest/globals";
import Papa from "papaparse";
import { runSimTable } from "./helpers/runSimTable";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "letter-sim";
// Unique port: chaos=5660..5665.
const BASE_PORT = 5660;

type Row = Record<string, string> & {
  unmetNeeds?: string;
  experimentCompleteBool?: string;
  currentFunction?: string;
  error?: string;
};

const lastNonEmpty = (rows: Row[], key: string): string => {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i]?.[key];
    if (v !== undefined && v !== "") return v;
  }
  return "";
};

(RUN_E2E ? describe : describe.skip)(
  "chaos robustness — every failure has a specific recorded reason",
  () => {
    const SEEDS = ["1", "2", "3", "4", "5", "6"];

    for (let i = 0; i < SEEDS.length; i++) {
      const seed = SEEDS[i];

      test(`chaos seed ${seed}: completes, or ends with a specific non-blank reason`, async () => {
        const result = await runSimTable(
          { name: TABLE_NAME },
          {
            port: BASE_PORT + i,
            seed: 1,
            stuckTimeoutMs: 60_000,
            // Chaos injection: deterministic error somewhere in the flow.
            urlParams: { chaos: seed },
          },
        );

        // Whatever happened, the session file must exist (data saved).
        const csvNames = Object.keys(result.csvFiles);
        expect(csvNames.length).toBeGreaterThan(0);
        const csvName =
          csvNames.find((n) => !n.includes("quest")) ?? csvNames[0];
        const parsed = Papa.parse<Row>(result.csvFiles[csvName], {
          header: true,
          skipEmptyLines: true,
        });
        const rows = parsed.data;

        const completed =
          lastNonEmpty(rows, "experimentCompleteBool") === "true";
        const termination = lastNonEmpty(rows, "error");

        if (completed) {
          // The seeded injection point never occurred in this flow; the
          // run finished normally. Fine — but then there is no reason row.
          expect(termination === "" || termination === undefined).toBe(true);
          return;
        }

        // Incomplete: the guarantee. Non-blank, specific, located. The
        // harness breaks its polling loop the moment the crash is
        // published — before the sim dismisses the dialog — so the captured
        // CSV ends at the crash row: its error cell carries the machine
        // report (JSON with the thrown message and the where/context
        // fields). The human-readable `_crash:` label rides the quit row,
        // which the field delivers via the later overwrite save
        // (unit-covered in errorHandling.needsUnmet + terminationColumns).
        expect(termination).toContain("CHAOS injected at");
        expect(termination).toContain("where:");
        expect(termination).toContain("stack");
        // The breadcrumb column is present too (where the participant was).
        expect(rows.some((r) => r.currentFunction !== undefined)).toBe(true);
      }, 240_000);
    }
  },
);
