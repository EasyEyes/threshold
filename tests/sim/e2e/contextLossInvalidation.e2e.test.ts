/**
 * @jest-environment node
 *
 * Context-loss trial invalidation — cross-kind coverage.
 *
 * The letter scenario (letterTrackingThrash.e2e.test.ts) proves the
 * addResponseIfTolerableError gate (rendererIntact check) and the letter
 * offset latch. This suite proves the SAME invariant through the other
 * wiring paths:
 *
 *   vernier — inline `isTrialGood` flip in trialRoutineEnd's staircase
 *             branch + the vernier `endRendererLossWindow()` offset site
 *             (trialKind reads bad+practice/trial there).
 *   rsvp    — the composed gate in _rsvpReading_trialRoutineEnd
 *             (`validForQuest && !rendererLostDuringTrial()`); no
 *             trialKind column, so the proof is trialGivenToQuest +
 *             questMean.
 *
 * All staircase kinds write questMeanBeforeThisTrialResponse (via
 * addTrialStaircaseSummariesToData) BEFORE addResponse, so an unchanged
 * QUEST pdf shows as IDENTICAL questMean on the bad row and the next
 * row of the same (single-condition) staircase.
 *
 * Loss trigger: a synthetic webglcontextlost dispatched on the live
 * canvas at the FIRST response phase (published from trialRoutineBegin
 * — after beginRendererLossWindow, ≥500 ms before the simulated
 * participant responds), i.e. deterministically inside trial 1's
 * stimulus window. Recovery stays enabled: the real rebuildRenderer runs
 * mid-trial and the run must still complete.
 *
 * OFF by default under `npm test`. Opt in with RUN_E2E=1.
 */

import { expect, describe, test } from "@jest/globals";
import { execSync, spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { chromium, type Browser } from "playwright";
import { ensureSimTableBuilt, type SimTableSpec } from "./helpers/runSimTable";
import { experimentIndexUrl, killProcessTree } from "../../../server/simulate";
import { isSimConsoleNoise } from "../../../server/simNoiseFilter";
import { simE2EPort } from "./helpers/ports";
import { parseCsv, csvColumn } from "./helpers/csv";

const RUN_E2E = process.env.RUN_E2E === "1";
const ROOT = path.resolve(__dirname, "../../..");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ScenarioOutcome {
  completed: boolean;
  lossDispatched: boolean;
  rendererRebuilt: boolean;
  csv: string | null;
  consoleErrors: string[];
}

async function runLossInvalidationScenario(
  spec: SimTableSpec,
  /** Observable phase inside the trial window: "response" for most
   * kinds; reading/rsvpReading overwrite it with "reading" in the same
   * sync block of trialRoutineBegin (both run after
   * beginRendererLossWindow — either is deterministically in-window). */
  dispatchPhase: "response" | "reading" = "response",
): Promise<ScenarioOutcome> {
  const port = simE2EPort("ctxLossInvalidation", 0);
  const stubPort = simE2EPort("ctxLossInvalidation", 1);
  ensureSimTableBuilt(spec);
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null; true`, {
      shell: "zsh",
    });
  } catch {}
  // Outage immunity: serve phrases/glossary locally when the deployed
  // backend is down (same pattern as the other stub-backed suites).
  const stub = spawn(
    "node",
    ["tests/sim/e2e/helpers/backendStubServer.mjs", String(stubPort)],
    { cwd: ROOT, detached: true, stdio: "ignore" },
  );
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(
        `http://localhost:${stubPort}/.netlify/functions/phrases?pinned=x/y`,
      );
      if (r.ok) break;
    } catch {}
    if (i === 29) throw new Error("backend stub did not start");
    await sleep(500);
  }
  const server = spawn(
    "npm",
    ["start", "--", `--name=${spec.name}`, `--port=${port}`],
    {
      cwd: ROOT,
      stdio: ["ignore", "ignore", "pipe"],
      detached: true,
      env: { ...process.env, VITE_NO_OPEN: "1" },
    },
  );
  let browser: Browser | undefined;
  const consoleErrorsRaw: string[] = [];
  let shortIoQuota402 = false;
  const csvDownloads: string[] = [];
  try {
    for (let deadline = Date.now() + 120_000; ; ) {
      try {
        const r = await fetch(`http://localhost:${port}`);
        if (r.status < 500) break;
      } catch {}
      if (Date.now() > deadline)
        throw new Error(`dev server did not start (${spec.name})`);
      await sleep(1000);
    }
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();
    page.on("download", async (download) => {
      if (!download.suggestedFilename().endsWith(".csv")) return;
      const p = await download.path().catch(() => undefined);
      if (p) csvDownloads.push(fs.readFileSync(p, "utf8"));
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrorsRaw.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrorsRaw.push(String(err)));
    page.on("response", (res) => {
      if (res.url().includes("api.short.io") && res.status() === 402)
        shortIoQuota402 = true;
      else if (res.status() >= 400)
        consoleErrorsRaw.push(`HTTP ${res.status()} ${res.url()}`);
    });
    await page.addInitScript((seed: number) => {
      window.__SIM_SEED__ = seed;
    }, 1);
    // Synthetic loss at the first dispatchPhase observation
    // (trialRoutineBegin publishes it after beginRendererLossWindow
    // opened the window).
    await page.addInitScript((phaseName: string) => {
      let fired = false;
      const check = () => {
        const ph =
          document.getElementById("ee-state")?.getAttribute("data-phase") ?? "";
        if (!fired && ph === phaseName) {
          fired = true;
          const w = window as any;
          const view = w.__eePsychoJS?.window?._renderer?.view;
          try {
            view?.dispatchEvent(new Event("webglcontextlost"));
            w.__lossDispatched = true;
          } catch (e) {
            w.__lossError = String(e);
          }
          return; // one-shot
        }
        setTimeout(check, 100);
      };
      check();
    }, dispatchPhase);
    await page.goto(
      experimentIndexUrl(port, spec.name, {
        "preview-deploy": `http://localhost:${stubPort}`,
      }),
    );

    let completed = false;
    for (let deadline = Date.now() + 300_000; ; ) {
      if (Date.now() > deadline) break;
      completed = await page
        .evaluate(
          () =>
            document.getElementById("ee-state")?.getAttribute("data-phase") ===
            "complete",
        )
        .catch(() => false);
      if (completed) break;
      await sleep(500);
    }
    const lossDispatched = await page
      .evaluate(() => (window as any).__lossDispatched === true)
      .catch(() => false);
    const rendererRebuilt = await page
      .evaluate(() => (window as any).__rendererRebuilt === true)
      .catch(() => false);
    for (let deadline = Date.now() + 90_000; ; ) {
      if (Date.now() > deadline) break;
      if (csvDownloads.length > 0) break;
      await sleep(1000);
    }
    return {
      completed,
      lossDispatched,
      rendererRebuilt,
      csv: csvDownloads.at(-1) ?? null,
      consoleErrors: consoleErrorsRaw.filter(
        (t) => !isSimConsoleNoise(t, shortIoQuota402),
      ),
    };
  } finally {
    await browser?.close().catch(() => {});
    if (server.pid) await killProcessTree(server.pid, 2000);
    if (stub.pid) await killProcessTree(stub.pid, 1000);
  }
}

/** Shared assertions: exactly one invalid trial, it is the FIRST served
 *  trial, QUEST's pdf never saw it (identical questMean into the next
 *  row of the same staircase), and the invalidation is named in a
 *  warning. Returns the parsed rows for kind-specific follow-ups. */
const assertInvalidation = (
  out: ScenarioOutcome,
  what: string,
): { rows: string[][]; given: string[]; badIdx: number } => {
  expect(out.completed).toBe(true);
  expect(out.lossDispatched).toBe(true);
  expect(out.rendererRebuilt).toBe(true);
  expect(out.csv).not.toBeNull();
  const rows = parseCsv(out.csv!);
  const given = csvColumn(rows, "trialGivenToQuest").map((c) =>
    c.toUpperCase(),
  );
  expect(given.filter((c) => c === "FALSE")).toHaveLength(1);
  const thisN = csvColumn(rows, "trials.thisN");
  const badIdx = given.findIndex((c) => c === "FALSE");
  const firstTrialN = Math.min(
    ...thisN.filter((n) => n !== "").map((n) => Number(n)),
  );
  expect(thisN[badIdx]).toBe(String(firstTrialN));
  // QUEST pdf untouched: the mean the next same-staircase row inherits
  // is bit-identical to the bad row's (a pdf update would move it).
  const questMean = csvColumn(rows, "questMeanBeforeThisTrialResponse");
  const nextIdx = given.findIndex((c, i) => i > badIdx && c === "TRUE");
  expect(nextIdx).toBeGreaterThan(-1);
  expect(questMean[nextIdx]).toBe(questMean[badIdx]);
  // Never silent: a warning names the invalidation.
  expect(csvColumn(rows, "warning").join("\n")).toMatch(/stimulus window/i);
  expect(out.consoleErrors).toEqual([]);
  process.stdout.write(
    `CTXLOSS-INVALIDATION ${what} given=${JSON.stringify(given)} ` +
      `questMean=${JSON.stringify([questMean[badIdx], questMean[nextIdx]])} ` +
      `consoleErrs=${out.consoleErrors.length}\n`,
  );
  return { rows, given, badIdx };
};

(RUN_E2E ? describe : describe.skip)(
  "context-loss trial invalidation across target kinds",
  () => {
    test("vernier (inline isTrialGood gate + offset latch)", async () => {
      const out = await runLossInvalidationScenario({
        name: "vernier-identify-sim",
      });
      const { rows, given, badIdx } = assertInvalidation(out, "vernier");
      // The inline staircase branches mark the row via trialKind
      // (bad + practice/trial — practice when the table runs
      // practice-until-correct, like this one's first serve).
      const kind = csvColumn(rows, "trialKind");
      expect(kind[badIdx]).toMatch(/^bad(practice|trial)$/);
      expect(given).toContain("TRUE");
    }, 420_000);

    test("rsvpReading (composed validForQuest gate)", async () => {
      const out = await runLossInvalidationScenario(
        {
          name: "rsvpReading-identify-sim",
          resources: [
            {
              from: "texts/short-reading.txt",
              to: "texts/short-reading.txt",
            },
          ],
        },
        "reading",
      );
      assertInvalidation(out, "rsvpReading");
    }, 420_000);
  },
);
