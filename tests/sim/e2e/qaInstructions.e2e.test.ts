/**
 * @jest-environment node
 *
 * Spec e2e — ALLOW questionAndAnswer WITH instructionForBlock &
 * instructionForResponse.
 *
 * Card: a questionAndAnswer experiment with instructionForBlock and
 * instructionForResponse set did not show the instructions. They should
 * ALWAYS show, regardless of the task.
 *
 * Table: one pure questionAndAnswer block (no targetKind) with both
 * instruction parameters set to unique marker strings. Expect: experiment
 * completes, the block-instruction marker appears in an instruction overlay
 * at block start, and the response-instruction marker appears in the
 * instruction overlay while each Q&A modal is up (shown via the normal
 * instruction stim, like other tasks' response instructions).
 *
 * OFF by default; opt in with RUN_E2E=1.
 */

import { expect, describe, test, beforeAll, afterAll } from "@jest/globals";
import Papa from "papaparse";
import type { SimulateResult } from "../../../server/simulate";
import { ensureSimTableBuilt, runSimTable } from "./helpers/runSimTable";
import { simE2EPort } from "./helpers/ports";
import { startBackendStub, type BackendStub } from "./helpers/backendStub";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "qa-instructions-sim";
const E2E_PORT = simE2EPort("qaInstructions");
let backend: BackendStub | undefined;
afterAll(() => backend?.stop());

(RUN_E2E ? describe : describe.skip)(
  "questionAndAnswer shows instructionForBlock and instructionForResponse (spec)",
  () => {
    let result: SimulateResult;
    beforeAll(async () => {
      backend = await startBackendStub("qaInstructions");
      result = await runSimTable(
        { name: TABLE_NAME },
        {
          port: E2E_PORT,
          seed: 1,
          stuckTimeoutMs: 45_000,
          urlParams: { "preview-deploy": backend.url },
        },
      );
    }, 240_000);

    test("block-start and per-question instruction overlays both show", () => {
      expect(result.consoleErrors).toHaveLength(0);
      expect(result.status).toBe("completed");

      // instructionForBlock: shown once at the beginning of the block, in an
      // instruction overlay (.ee-html-text-stim), recorded in-page.
      expect(
        result.instructionTexts.some((t) => t.includes("BLOCK MARKER")),
      ).toBe(true);

      // instructionForResponse: shown via the normal instruction stim while
      // each question modal is up (backdrop:false keeps it visible).
      expect(
        result.instructionTexts.some((t) => t.includes("RESPONSE MARKER")),
      ).toBe(true);

      // Sanity: the Q&A modals themselves did appear (questions were asked).
      expect(result.swalPopupTexts.length).toBeGreaterThan(0);
    }, 180_000);

    test("final CSV: every Q&A data row carries a currentFunction breadcrumb", () => {
      expect(result.status).toBe("completed");

      const csvName = Object.keys(result.csvFiles).find((n) =>
        n.includes(".csv"),
      );
      expect(csvName).toBeDefined();
      const raw = (result.csvFiles as Record<string, string>)[
        csvName as string
      ];
      const parsed = Papa.parse<Record<string, string>>(raw.trim(), {
        header: true,
      });
      const dataRows = parsed.data;
      expect(dataRows.length).toBeGreaterThan(0);
      for (const row of dataRows) {
        const cf = row.currentFunction;
        expect(cf && cf.length > 0).toBe(true);
        expect(cf).not.toBe("endLoopIteration");
        // A completed run must record no termination reason.
        expect(row.error ?? "").toBe("");
        expect(row.unmetNeeds ?? "").toBe("");
        // No bare orphan rows: every row carries a value beyond the
        // session/extraInfo baseline.
        const BASELINE = new Set([
          "secs",
          "currentFunction",
          "URL",
          "experiment",
          "date",
          "psychopyVersion",
          "hardwareConcurrency",
          "deviceType",
          "deviceSystem",
          "deviceSystemFamily",
          "deviceBrowser",
          "deviceBrowserVersion",
          "deviceLanguage",
          "psychojsWindowDimensions",
          "participant",
          "session",
          "EasyEyesID",
          "PavloviaSessionID",
          "experimentFilename",
          "monitorFrameRate",
        ]);
        const hasContent = Object.entries(row).some(
          ([k, v]) =>
            !BASELINE.has(k) && v !== "" && v !== null && v !== undefined,
        );
        expect(hasContent).toBe(true);
      }
    }, 180_000);
  },
);

(RUN_E2E ? describe : describe.skip)(
  "reading with simultaneous Q&A response instructions",
  () => {
    test("raises the page-turn hint above a bottom question section", async () => {
      const name = "reading-qa-top-sim";
      ensureSimTableBuilt({
        name,
        resources: [
          { from: "texts/short-reading.txt", to: "texts/short-reading.txt" },
        ],
      });
      const { simulate } = await import("../../../server/simulate");
      const result = await simulate(name, {
        port: E2E_PORT,
        seed: 1,
        stuckTimeoutMs: 45_000,
        headless: true,
      });

      expect(result.status).toBe("completed");
      expect(result.trialsCompleted).toBeGreaterThan(0);
      expect(result.warnings).toHaveLength(0);
      expect(
        result.sweetAlertPopups.some((text) => text.includes("Continue?")),
      ).toBe(true);
      expect(
        result.instructionTexts.some((text) =>
          text.includes("Press Space for next page."),
        ),
      ).toBe(true);
    }, 180_000);
  },
);
