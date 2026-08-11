/**
 * @jest-environment node
 *
 * End-to-end tests for mid-experiment distance recalibration
 * (Trello card Nov 10, 2024). Drives the REAL experiment code in a real
 * browser: a letter-identification experiment with calibrateDistanceBool=TRUE
 * runs under the simulated participant, and the test invokes the threshold-
 * side recalibration hooks (window.__recalibrationHooks, sim-only surface)
 * mid-experiment — exactly as RemoteCalibrator's nudger recalibrate button
 * will call them.
 *
 * Spec under test (glossary, viewingDistanceAllowedRatio):
 *   - Recalibration must not advance the trial scheduler (frozen trial).
 *   - On end, distance state updates and stimuli are regenerated
 *     (trialInstructionRoutineBegin re-runs).
 *   - If a response was pending, the trial is canceled via skipTrial() and
 *     re-queued by the MultiStairHandler (experiment runs an extra trial).
 *   - The experiment always completes with no errors.
 *
 * OFF by default under `npm test`. Opt in with: RUN_E2E=1 npm test
 */

import {
  jest,
  expect,
  describe,
  test,
  beforeAll,
  afterAll,
} from "@jest/globals";
import { chromium, type Browser, type Page } from "@playwright/test";
import { spawn, execSync, type ChildProcess } from "child_process";
import * as http from "http";
import { ensureSimTableBuilt } from "./helpers/runSimTable";
import { experimentIndexUrl } from "../../../server/simulate";

const RUN_E2E = process.env.RUN_E2E === "1";
const TABLE = "letter-recalibrate-sim";
const PORT = 5610;
const ADJUST_TABLE = "image-adjust-recalibrate-sim";
const ADJUST_PORT = 5620;

// ---------------------------------------------------------------------------
// Driver helpers (minimal, local — server/simulate.ts is observer-only)
// ---------------------------------------------------------------------------

const killPortOccupants = (port: number): void => {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null; true`, {
      shell: "zsh",
    });
  } catch {
    /* nothing listening */
  }
};

const pollUrl = (url: string, timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() - start > timeoutMs)
            reject(new Error(`Server did not come up at ${url}`));
          else setTimeout(tick, 200);
        });
    };
    tick();
  });

interface ObsState {
  phase: string | null;
  trial: number | null;
  currentFunction: string | null;
  error: string | null;
  simComplete: boolean;
}

const readState = async (page: Page): Promise<ObsState | null> => {
  try {
    return await page.evaluate(() => {
      const s = document.getElementById("ee-state");
      const t = s?.getAttribute("data-trial");
      return {
        phase: s?.getAttribute("data-phase") ?? null,
        trial: t === null || t === undefined ? null : parseInt(t),
        currentFunction: s?.getAttribute("data-current-function") ?? null,
        error: s?.getAttribute("data-error") ?? null,
        simComplete: (window as any).__SIM_COMPLETE__ === true,
      };
    });
  } catch {
    // Mid-navigation execution-context destruction — caller retries.
    return null;
  }
};

/** Wait until pred(state) holds; returns the matching state. */
const waitForState = async (
  page: Page,
  pred: (s: ObsState) => boolean,
  timeoutMs: number,
  label: string,
): Promise<ObsState> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const s = await readState(page);
    if (s && pred(s)) return s;
    await page.waitForTimeout(25);
  }
  const last = await readState(page);
  throw new Error(
    `Timed out (${timeoutMs}ms) waiting for ${label}. Last state: ${JSON.stringify(
      last,
    )}`,
  );
};

/** Sample state over a window; returns all distinct (phase,trial,fn) seen. */
const sampleOver = async (
  page: Page,
  durationMs: number,
): Promise<ObsState[]> => {
  const seen: ObsState[] = [];
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    const s = await readState(page);
    if (s) seen.push(s);
    await page.waitForTimeout(25);
  }
  return seen;
};

const waitForCompletion = async (page: Page, timeoutMs: number) => {
  const start = Date.now();
  let maxTrial = -1;
  while (Date.now() - start < timeoutMs) {
    const s = await readState(page);
    if (s) {
      if (s.error) throw new Error(`Experiment error: ${s.error}`);
      if (s.trial !== null && !Number.isNaN(s.trial)) {
        maxTrial = Math.max(maxTrial, s.trial);
      }
      if (s.simComplete || s.phase === "complete")
        return { maxTrial, state: s };
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`Experiment did not complete within ${timeoutMs}ms`);
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

const E2E = RUN_E2E ? describe : describe.skip;

E2E("mid-experiment recalibration (real code, sim participant)", () => {
  let server: ChildProcess;
  let browser: Browser;

  beforeAll(async () => {
    ensureSimTableBuilt({ name: TABLE });
    killPortOccupants(PORT);
    server = spawn(
      "npm",
      ["start", "--", `--name=${TABLE}`, `--port=${PORT}`],
      {
        stdio: "ignore",
        detached: true,
        env: { ...process.env, VITE_NO_OPEN: "1" },
      },
    );
    await pollUrl(`http://localhost:${PORT}`, 30_000);
    browser = await chromium.launch({ headless: true });
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
    if (server?.pid) {
      try {
        process.kill(-server.pid, "SIGKILL");
      } catch {
        /* already gone */
      }
    }
    killPortOccupants(PORT);
  });

  const openExperiment = async (): Promise<Page> => {
    const context = await browser.newContext();
    await context.addInitScript((s: number) => {
      (window as any).__SIM_SEED__ = s;
    }, 1);
    const page = await context.newPage();
    page.on("pageerror", (err) => {
      throw new Error(`pageerror: ${err.message}`);
    });
    await page.goto(experimentIndexUrl(PORT, TABLE), { waitUntil: "commit" });
    return page;
  };

  test("A: recalibration during instruction phase freezes trial, regenerates stimuli, completes", async () => {
    const page = await openExperiment();

    // Wait for the first trial's instruction phase (calibration panel and
    // block instructions come first; the sim clicks through them).
    const s0 = await waitForState(
      page,
      (s) =>
        s.phase === "fixation" &&
        s.currentFunction === "trialInstructionRoutineEachFrame",
      120_000,
      "first trial instruction phase",
    );
    const trialBefore = s0.trial;

    // Simulate RC producing a new measured distance (200cm vs desired 100cm)
    // before the re-track finishes. rc.viewingDistanceCm is a prototype
    // getter (core.js), so shadow it with an own property.
    await page.evaluate(() => {
      Object.defineProperty((window as any).__rc, "viewingDistanceCm", {
        value: { value: 200, method: "sim" },
        configurable: true,
      });
    });

    await page.evaluate(() =>
      (window as any).__recalibrationHooks.onRecalibrateStart(),
    );
    expect(
      await page.evaluate(() =>
        (window as any).__recalibrationHooks.isRecalibrationActive(),
      ),
    ).toBe(true);

    // Frozen: over 2.5s the trial must not advance and no other routine
    // may run.
    const samples = await sampleOver(page, 2_500);
    for (const s of samples) {
      expect(s.phase).toBe("fixation");
      expect(s.trial).toBe(trialBefore);
      expect(s.currentFunction).toBe("trialInstructionRoutineEachFrame");
      expect(s.error).toBeNull();
    }

    // End. Stimulus regeneration MUST happen inside onRecalibrateEnd:
    // assert via the deterministic rerun counter.
    await page.evaluate(() => {
      (window as any).__rerunCount = 0;
    });
    await page.evaluate(() =>
      (window as any).__recalibrationHooks.onRecalibrateEnd(),
    );
    expect(await page.evaluate(() => (window as any).__rerunCount)).toBe(1);

    // Distance state must have been updated from rc (200cm).
    expect(
      await page.evaluate(() => (window as any).__getViewingDistanceCm()),
    ).toBe(200);
    expect(
      await page.evaluate(() =>
        (window as any).__recalibrationHooks.isRecalibrationActive(),
      ),
    ).toBe(false);

    // The experiment resumes and completes all trials with no errors.
    const { maxTrial } = await waitForCompletion(page, 120_000);
    expect(maxTrial).toBeGreaterThanOrEqual(2); // trials 0,1,2 all ran

    await page.context().close();
  }, 300_000);

  test("B: recalibration with response pending cancels trial; staircase retries it", async () => {
    const page = await openExperiment();

    // Catch the trial proper (stimulus or response) — 0.5s target window
    // plus the response wait makes this reliably catchable at 25ms polling.
    const s0 = await waitForState(
      page,
      (s) => /^trialRoutine/.test(s.currentFunction ?? ""),
      120_000,
      "trialRoutine phase",
    );
    const trialBefore = s0.trial;

    await page.evaluate(() =>
      (window as any).__recalibrationHooks.onRecalibrateStart(),
    );

    // Frozen mid-trial: routine stays in trialRoutine, trial unchanged.
    const samples = await sampleOver(page, 2_000);
    for (const s of samples) {
      expect(s.currentFunction).toMatch(/^trialRoutine/);
      expect(s.trial).toBe(trialBefore);
      expect(s.error).toBeNull();
    }

    await page.evaluate(() =>
      (window as any).__recalibrationHooks.onRecalibrateEnd(),
    );
    expect(
      await page.evaluate(() =>
        (window as any).__recalibrationHooks.isRecalibrationActive(),
      ),
    ).toBe(false);

    // The canceled trial is re-queued via MultiStairHandler.addTrial, so
    // the experiment runs a 4th trial (index 3) before completing.
    const { maxTrial } = await waitForCompletion(page, 180_000);
    expect(maxTrial).toBeGreaterThanOrEqual(3);

    await page.context().close();
  }, 360_000);
});

/**
 * Test C: targetTask=adjust — the only block type where the recalibrate
 * button is reachable MID-TRIAL. The pending adjustment must be reset in
 * place (no skipTrial cancellation: adjust blocks are plain TrialHandler
 * and cannot re-queue), the stimulus regenerated at the new distance, and
 * the block must run exactly conditionTrials trials.
 */
E2E("mid-experiment recalibration during adjust (in-place reset)", () => {
  let server: ChildProcess;
  let browser: Browser;

  beforeAll(async () => {
    ensureSimTableBuilt({
      name: ADJUST_TABLE,
      resources: [
        { from: "folders/testImages.zip", to: "folders/testImages.zip" },
      ],
    });
    killPortOccupants(ADJUST_PORT);
    server = spawn(
      "npm",
      ["start", "--", `--name=${ADJUST_TABLE}`, `--port=${ADJUST_PORT}`],
      {
        stdio: "ignore",
        detached: true,
        env: { ...process.env, VITE_NO_OPEN: "1" },
      },
    );
    await pollUrl(`http://localhost:${ADJUST_PORT}`, 30_000);
    browser = await chromium.launch({ headless: true });
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
    if (server?.pid) {
      try {
        process.kill(-server.pid, "SIGKILL");
      } catch {
        /* already gone */
      }
    }
    killPortOccupants(ADJUST_PORT);
  });

  test("C: mid-adjust recalibration resets adjustment in place, regenerates, no trial loss", async () => {
    const context = await browser.newContext();
    await context.addInitScript((s: number) => {
      (window as any).__SIM_SEED__ = s;
    }, 1);
    const page = await context.newPage();
    await page.goto(experimentIndexUrl(ADJUST_PORT, ADJUST_TABLE), {
      waitUntil: "commit",
    });

    // Catch the adjust trial proper with the session active.
    const s0 = await waitForState(
      page,
      (s) => /^trialRoutine/.test(s.currentFunction ?? ""),
      120_000,
      "adjust trialRoutine phase",
    );
    const trialBefore = s0.trial;
    expect(
      await page.evaluate(() => (window as any).__imageAdjustState.active),
    ).toBe(true);
    // Baseline: guess position in px at the sim calibration's distance
    // (null if the stim hasn't bound yet — then the ratio check below is
    // skipped and only direction/sign is asserted).
    const baseline = await page.evaluate(() => ({
      x: (window as any).__imageAdjustState.currentXYPx?.[0] ?? null,
      dist: (window as any).__getViewingDistanceCm(),
    }));

    // Simulate RC producing a new measured distance (200cm).
    await page.evaluate(() => {
      Object.defineProperty((window as any).__rc, "viewingDistanceCm", {
        value: { value: 200, method: "sim" },
        configurable: true,
      });
    });
    await page.evaluate(() => {
      (window as any).__rerunCount = 0;
    });
    await page.evaluate(() =>
      (window as any).__recalibrationHooks.onRecalibrateStart(),
    );

    // Frozen mid-trial (the sim's adjust act fires during this window:
    // arrows are gated, its SPACE sets finished — later revived by reset).
    const samples = await sampleOver(page, 2_000);
    for (const s of samples) {
      expect(s.currentFunction).toMatch(/^trialRoutine/);
      expect(s.trial).toBe(trialBefore);
      expect(s.error).toBeNull();
    }

    await page.evaluate(() =>
      (window as any).__recalibrationHooks.onRecalibrateEnd(),
    );

    // Stimulus regenerated, distance updated.
    expect(await page.evaluate(() => (window as any).__rerunCount)).toBe(1);
    expect(
      await page.evaluate(() => (window as any).__getViewingDistanceCm()),
    ).toBe(200);

    // In-place reset: pending adjustment back to the starting guess
    // (thresholdGuess=3), session alive, finished revived to false.
    const adjust = await page.evaluate(() => {
      const a = (window as any).__imageAdjustState;
      return {
        active: a.active,
        finished: a.finished,
        currentValue: a.currentValue,
        currentXYPx: a.currentXYPx,
        pendingOffsetPx: a.pendingOffsetPx,
      };
    });
    expect(adjust.active).toBe(true);
    expect(adjust.finished).toBe(false);
    expect(adjust.pendingOffsetPx).toBe(0);
    expect(adjust.currentValue).toBeCloseTo(3, 9);
    // The rerun's fresh stim re-binds on the first ungated frame and
    // re-initializes the position at the NEW distance: wait for the
    // rebind, then the guess's px offset must scale by the distance
    // ratio (200cm vs the sim calibration baseline).
    await page.waitForFunction(
      () => (window as any).__imageAdjustState.currentXYPx !== null,
      null,
      { timeout: 10_000, polling: 100 },
    );
    const xAfter = await page.evaluate(
      () => (window as any).__imageAdjustState.currentXYPx[0],
    );
    expect(xAfter).toBeGreaterThan(0);
    if (baseline.x !== null && baseline.dist > 0) {
      const expectedX = baseline.x * (200 / baseline.dist);
      expect(xAfter).toBeCloseTo(expectedX, -1);
    }

    // NO cancellation: skipTrial must never have fired for this trial
    // (adjust restarts in place; skipTrial would also lose the trial
    // entirely since plain TrialHandler cannot re-queue).
    expect(
      await page.evaluate(() => (window as any).__skipTrialOrBlock.skipTrial),
    ).toBe(false);

    // The sim finishes the (restarted) adjust trial; the block runs
    // exactly conditionTrials=3 trials (1-based indices 1,2,3 — no
    // retry, no loss).
    const { maxTrial } = await waitForCompletion(page, 180_000);
    expect(maxTrial).toBe(3);

    await page.context().close();
  }, 360_000);
});
