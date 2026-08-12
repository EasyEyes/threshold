/**
 * @jest-environment node
 *
 * End-to-end tests for mid-experiment distance recalibration → BLOCK RESTART.
 * Drives the REAL experiment code in a real browser: the recalibration hooks
 * (window.__recalibrationHooks, sim-only surface) are invoked mid-experiment
 * exactly as RemoteCalibrator's nudger recalibrate button calls them.
 *
 * Spec under test (Denis Trello card Nov 10, 2024; button copy in all 42
 * languages: "restart this block"):
 *   - While active, recalibration freezes the trial scheduler.
 *   - On end, the current block is abandoned and re-run from trial 1 with a
 *     fresh staircase. The participant sees the block's instruction page
 *     again (phase returns to "instructions"), then all trials from the top.
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
const MULTI_TABLE = "letter-recalibrate-multiblock-sim";
const MULTI_PORT = 5630;

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
  block: number | null;
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
        block:
          typeof (window as any).__getBlockNumber === "function"
            ? ((window as any).__getBlockNumber() as number)
            : null,
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

/** Drive one recalibration cycle (start → end) after spoofing a new distance. */
const recalibrate = async (page: Page, distanceCm: number) => {
  await page.evaluate((d) => {
    Object.defineProperty((window as any).__rc, "viewingDistanceCm", {
      value: { value: d, method: "sim" },
      configurable: true,
    });
  }, distanceCm);
  await page.evaluate(() =>
    (window as any).__recalibrationHooks.onRecalibrateStart(),
  );
};

/** Assert a block restart genuinely re-ran the block's trials (not a hollow
 * re-schedule). The restarted block always completes its conditionTrials=3;
 * the abandoned in-flight trial may or may not be committed to QUEST before
 * the skip (a run-to-run timing race), so the 1-based completed-trial counter
 * grows by exactly 3 or 4. */
const expectRestartRanTrials = async (
  page: Page,
  blockCondition: string,
  countBefore: number,
) => {
  const after = await page.evaluate(
    (c) => (window as any).__getTrialCountByCondition(c),
    blockCondition,
  );
  expect(after).toBeGreaterThanOrEqual(countBefore + 3);
  expect(after).toBeLessThanOrEqual(countBefore + 4);
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

const E2E = RUN_E2E ? describe : describe.skip;

E2E(
  "mid-experiment recalibration restarts the block (letter, real code)",
  () => {
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

    test("recalibration mid-trial freezes, then restarts the block from trial 1", async () => {
      const page = await openExperiment();

      // Catch the trial proper (stimulus/response window).
      const s0 = await waitForState(
        page,
        (s) => /^trialRoutine/.test(s.currentFunction ?? ""),
        120_000,
        "trialRoutine phase",
      );
      const trialBefore = s0.trial;

      // Recalibrate to HALF the current distance: a real change that keeps
      // stimuli viable (recalibrating to 200cm doubled px-per-degree, pushing
      // the -10° eccentricity letter off the sim's small screen — every
      // restarted trial then legitimately failed stimulus generation,
      // producing a hollow restart that the old assertions couldn't detect).
      const d0 = await page.evaluate(() =>
        (window as any).__getViewingDistanceCm(),
      );
      const d1 = Math.round(d0 / 2);
      await recalibrate(page, d1);

      // Frozen mid-trial: routine stays in trialRoutine, trial unchanged.
      const samples = await sampleOver(page, 2_000);
      for (const s of samples) {
        expect(s.currentFunction).toMatch(/^trialRoutine/);
        expect(s.trial).toBe(trialBefore);
        expect(s.error).toBeNull();
      }

      await page.evaluate(() => {
        (window as any).__recalibrationCount = 0;
      });
      const countBefore = await page.evaluate(() =>
        (window as any).__getTrialCountByCondition("1_1"),
      );
      await page.evaluate(() =>
        (window as any).__recalibrationHooks.onRecalibrateEnd(),
      );

      // requestRestartBlock fired exactly once (deterministic signal).
      expect(
        await page.evaluate(() => (window as any).__recalibrationCount),
      ).toBe(1);
      // Distance state updated from rc (half of original).
      expect(
        await page.evaluate(() => (window as any).__getViewingDistanceCm()),
      ).toBe(d1);
      expect(
        await page.evaluate(() =>
          (window as any).__recalibrationHooks.isRecalibrationActive(),
        ),
      ).toBe(false);

      // BLOCK RESTART: the current block is abandoned and re-scheduled, so the
      // block's instruction page shows again (phase returns to "instructions").
      await waitForState(
        page,
        (s) => s.phase === "instructions",
        30_000,
        "block restart (instructions phase)",
      );

      // The restarted block runs to completion and the experiment ends cleanly.
      await waitForCompletion(page, 180_000);

      // Not a hollow restart: the restarted block's 3 trials genuinely re-ran
      // (3 or 4 completions — the abandoned in-flight trial's commit is a race).
      await expectRestartRanTrials(page, "1_1", countBefore);

      await page.context().close();
    }, 360_000);

    // Adversarial: the restarted block's QUEST staircase must be FRESH — back
    // at the start value — not continuing from the abandoned block's estimate.
    // scheduleOneBlock builds a new MultiStairHandler per block, so this holds
    // by construction; this test guards against a future optimization that
    // caches/reuses the handler (the class of bug that hit imageAdjustState).
    test("restarted block's QUEST staircase is fresh, not carried over", async () => {
      const page = await openExperiment();

      // Trial 1: QUEST prior, no responses yet. Read the start value.
      await waitForState(
        page,
        (s) => /^trialRoutine/.test(s.currentFunction ?? ""),
        120_000,
        "trial 1",
      );
      const freshValue = await page.evaluate(() =>
        (window as any).__getQuestValue(),
      );
      expect(freshValue).not.toBeNull();

      // Let the staircase progress: wait for 2 completed trials (always-correct
      // sim → estimate moves), then catch trial 3 mid-flight.
      const deadline = Date.now() + 60_000;
      while (
        Date.now() < deadline &&
        (await page.evaluate(() =>
          (window as any).__getTrialCountByCondition("1_1"),
        )) < 2
      ) {
        await page.waitForTimeout(50);
      }
      await waitForState(
        page,
        (s) => /^trialRoutine/.test(s.currentFunction ?? ""),
        30_000,
        "trial 3 (staircase progressed)",
      );
      const abandonedValue = await page.evaluate(() =>
        (window as any).__getQuestValue(),
      );

      // Recalibrate (half distance) → restart.
      const d0 = await page.evaluate(() =>
        (window as any).__getViewingDistanceCm(),
      );
      await recalibrate(page, Math.round(d0 / 2));
      await page.evaluate(() => {
        (window as any).__recalibrationCount = 0;
      });
      await page.evaluate(() =>
        (window as any).__recalibrationHooks.onRecalibrateEnd(),
      );
      expect(
        await page.evaluate(() => (window as any).__recalibrationCount),
      ).toBe(1);

      // Restart: instructions, then the restarted block's trial 1.
      await waitForState(
        page,
        (s) => s.phase === "instructions",
        30_000,
        "restart instructions",
      );
      await waitForState(
        page,
        (s) => /^trialRoutine/.test(s.currentFunction ?? ""),
        120_000,
        "restarted trial 1",
      );
      const restartedValue = await page.evaluate(() =>
        (window as any).__getQuestValue(),
      );

      // The staircase genuinely moved during the abandoned trials (always-
      // correct sim → spacing estimate shrinks). Proves the test observes real
      // progression; without it the freshness check below would be vacuous.
      expect(Math.abs(abandonedValue - freshValue)).toBeGreaterThan(0.01);
      // FRESH: the restarted block's QUEST is byte-identical to the original
      // start (same deterministic prior — fresh MultiStairHandler). A carried-
      // over staircase would land near abandonedValue (≈0.8 away), not here.
      expect(restartedValue).toBeCloseTo(freshValue, 8);

      await page.context().close();
    }, 360_000);
  },
);

/**
 * Adjust block: recalibration mid-adjust must also restart the block from
 * trial 1 (a fresh TrialHandler), not reset the adjustment in place.
 */
E2E(
  "mid-experiment recalibration restarts the block (adjust, real code)",
  () => {
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

    test("mid-adjust recalibration restarts the block; fresh TrialHandler runs conditionTrials", async () => {
      const context = await browser.newContext();
      await context.addInitScript((s: number) => {
        (window as any).__SIM_SEED__ = s;
      }, 1);
      const page = await context.newPage();
      await page.goto(experimentIndexUrl(ADJUST_PORT, ADJUST_TABLE), {
        waitUntil: "commit",
      });

      // Catch the adjust trial proper.
      await waitForState(
        page,
        (s) => /^trialRoutine/.test(s.currentFunction ?? ""),
        120_000,
        "adjust trialRoutine phase",
      );
      expect(
        await page.evaluate(() => (window as any).__imageAdjustState.active),
      ).toBe(true);

      await recalibrate(page, 200);
      await page.evaluate(() => {
        (window as any).__recalibrationCount = 0;
      });
      await page.evaluate(() =>
        (window as any).__recalibrationHooks.onRecalibrateEnd(),
      );
      expect(
        await page.evaluate(() => (window as any).__recalibrationCount),
      ).toBe(1);

      // BLOCK RESTART: adjust block re-shows its instruction page.
      await waitForState(
        page,
        (s) => s.phase === "instructions",
        30_000,
        "adjust block restart (instructions phase)",
      );

      // The restarted block runs exactly conditionTrials=3 trials and completes.
      const { maxTrial } = await waitForCompletion(page, 180_000);
      expect(maxTrial).toBe(3);

      await page.context().close();
    }, 360_000);

    // Adversarial: the restarted adjust block must start FRESH (re-initialize
    // imageAdjustState), not reuse the abandoned trial's state. The abandoned
    // mid-adjust trial is never finished, so stopImageAdjust() (gated on
    // finished) never runs; prepareImageAdjust()'s `if (active) return` then
    // no-ops for the restarted block, leaving stale state.
    test("restarted adjust block re-initializes imageAdjustState (fresh), not the abandoned trial's stale state", async () => {
      const context = await browser.newContext();
      await context.addInitScript((s: number) => {
        (window as any).__SIM_SEED__ = s;
      }, 1);
      const page = await context.newPage();
      await page.goto(experimentIndexUrl(ADJUST_PORT, ADJUST_TABLE), {
        waitUntil: "commit",
      });

      // First adjust trial: prepareImageAdjust has run (active=true,
      // thresholdGuess read from the table = 3).
      await waitForState(
        page,
        (s) => /^trialRoutine/.test(s.currentFunction ?? ""),
        120_000,
        "adjust trialRoutine phase",
      );
      expect(
        await page.evaluate(() => (window as any).__imageAdjustState.active),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => (window as any).__imageAdjustState.thresholdGuess,
        ),
      ).toBe(3);

      // Sentinel: prepareImageAdjust is the ONLY writer of thresholdGuess, and it
      // runs fresh only when active is false. If the restarted block's
      // prepareImageAdjust re-runs, it overwrites 999 with the table value (3);
      // if it no-ops (active still true from the abandoned trial), 999 survives.
      // The sim's arrow-key adjustments never touch thresholdGuess, so this is
      // deterministic regardless of sim timing.
      await page.evaluate(() => {
        (window as any).__imageAdjustState.thresholdGuess = 999;
      });

      await recalibrate(page, 200);
      await page.evaluate(() => {
        (window as any).__recalibrationCount = 0;
      });
      await page.evaluate(() =>
        (window as any).__recalibrationHooks.onRecalibrateEnd(),
      );

      // Block restarts.
      await waitForState(
        page,
        (s) => s.phase === "instructions",
        30_000,
        "adjust block restart (instructions phase)",
      );

      // Restarted block reaches its first trial — prepareImageAdjust has been
      // called for it by now.
      await waitForState(
        page,
        (s) => /^trialRoutine/.test(s.currentFunction ?? ""),
        120_000,
        "restarted adjust trialRoutine phase",
      );
      await page.waitForTimeout(200);

      // FRESH: prepareImageAdjust re-read thresholdGuess from the table (3).
      // STALE (bug): 999 survives — prepareImageAdjust no-op'd on active=true
      // because the abandoned trial never reset imageAdjustState.
      expect(
        await page.evaluate(
          () => (window as any).__imageAdjustState.thresholdGuess,
        ),
      ).toBe(3);

      await page.context().close();
    }, 360_000);
  },
);

/**
 * Multi-block: recalibration must restart the CURRENT block, not a copy of
 * some other block. The block snapshot used to re-schedule is stashed as each
 * block starts; a scheduling-time stash would point at the LAST block in run
 * order, so this suite (restart in block 1 of 2) is the regression net for
 * that bug: with it, block 1 never restarts and block 2 runs twice.
 */
E2E(
  "mid-experiment recalibration restarts the CURRENT block (multi-block, real code)",
  () => {
    let server: ChildProcess;
    let browser: Browser;

    beforeAll(async () => {
      ensureSimTableBuilt({ name: MULTI_TABLE });
      killPortOccupants(MULTI_PORT);
      server = spawn(
        "npm",
        ["start", "--", `--name=${MULTI_TABLE}`, `--port=${MULTI_PORT}`],
        {
          stdio: "ignore",
          detached: true,
          env: { ...process.env, VITE_NO_OPEN: "1" },
        },
      );
      await pollUrl(`http://localhost:${MULTI_PORT}`, 30_000);
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
      killPortOccupants(MULTI_PORT);
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
      await page.goto(experimentIndexUrl(MULTI_PORT, MULTI_TABLE), {
        waitUntil: "commit",
      });
      return page;
    };

    /** Recalibrate mid-block-N-trial: spoof HALF the current distance (a real
     * change that keeps stimuli viable — smaller distance shrinks on-screen
     * stimuli) and run one recalibration cycle. Returns the pre-restart
     * completed-trial count for that block's first condition. */
    const recalibrateInBlock = async (
      page: Page,
      blockNum: number,
    ): Promise<number> => {
      await waitForState(
        page,
        (s) =>
          s.block === blockNum && /^trialRoutine/.test(s.currentFunction ?? ""),
        120_000,
        `block ${blockNum} trialRoutine`,
      );
      // Captured mid-first-trial, before the abandoned trial is committed to
      // QUEST (same semantics as the single-block letter test). The sim debug
      // surface is defined by now — we are well past page load.
      const bc = `${blockNum}_1`;
      const countBefore = await page.evaluate(
        (c) => (window as any).__getTrialCountByCondition(c),
        bc,
      );
      const d0 = await page.evaluate(() =>
        (window as any).__getViewingDistanceCm(),
      );
      const d1 = Math.round(d0 / 2);
      await recalibrate(page, d1);
      await page.evaluate(() => {
        (window as any).__recalibrationCount = 0;
      });
      await page.evaluate(() =>
        (window as any).__recalibrationHooks.onRecalibrateEnd(),
      );
      expect(
        await page.evaluate(() => (window as any).__recalibrationCount),
      ).toBe(1);
      expect(
        await page.evaluate(() => (window as any).__getViewingDistanceCm()),
      ).toBe(d1);
      return countBefore;
    };

    /** Assert block 1 restarts (instructions re-show for block 1), its trials
     * REALLY re-run (completed-trial count for condition 1_1 grows by
     * conditionTrials=3), then block 2 runs. */
    const expectBlock1RestartThenBlock2 = async (
      page: Page,
      countBefore: number,
    ) => {
      // BLOCK 1 restarts: its instruction page re-shows while block === 1.
      await waitForState(
        page,
        (s) => s.block === 1 && s.phase === "instructions",
        30_000,
        "block 1 restart (instructions phase, block 1)",
      );
      // After the restarted block 1 completes, block 2 runs.
      await waitForState(
        page,
        (s) => s.block === 2 && s.phase === "instructions",
        180_000,
        "block 2 start after restarted block 1",
      );
      // Not a hollow re-schedule: block 1's trials genuinely ran again (3 or 4
      // completions — the abandoned in-flight trial's commit is a timing race).
      await expectRestartRanTrials(page, "1_1", countBefore);
    };

    test("recalibration in block 1 restarts block 1, then block 2 runs", async () => {
      const page = await openExperiment();

      const countBefore = await recalibrateInBlock(page, 1);

      await expectBlock1RestartThenBlock2(page, countBefore);
      await waitForCompletion(page, 180_000);
      // Block 2 ran its own 3 trials for real (1-based counter: 1 + 3 = 4).
      expect(
        await page.evaluate(() =>
          (window as any).__getTrialCountByCondition("2_1"),
        ),
      ).toBe(4);

      await page.context().close();
    }, 420_000);

    test("two consecutive recalibrations in block 1 each restart block 1", async () => {
      const page = await openExperiment();

      await recalibrateInBlock(page, 1);

      // First restart: block 1's instruction page re-shows.
      await waitForState(
        page,
        (s) => s.block === 1 && s.phase === "instructions",
        30_000,
        "first block 1 restart (instructions phase, block 1)",
      );

      // The restarted block 1 reaches a trial: recalibrate AGAIN mid-trial.
      // (recalibrateInBlock waits for block 1's trialRoutine; countBefore is
      // captured inside the helper, mid-trial, before this second restart.)
      const countBefore = await recalibrateInBlock(page, 1);

      // Second restart: block 1 again, its trials re-run, then block 2 runs.
      await expectBlock1RestartThenBlock2(page, countBefore);
      await waitForCompletion(page, 180_000);

      await page.context().close();
    }, 480_000);

    test("recalibration in the LAST block restarts it, then the experiment ends cleanly", async () => {
      const page = await openExperiment();

      // Block 1 runs untouched; recalibrate mid-block-2-trial (the LAST block).
      const countBefore = await recalibrateInBlock(page, 2);

      // Block 2 restarts: its instruction page re-shows while block === 2. This
      // is the load-bearing path — block 2 is the blocksLoop's final entry, so
      // its endLoopIteration runs with snapshot.finished=true. The restart
      // hook's `!restarting` guard must suppress scheduler.stop() here, or the
      // experiment would terminate before the restarted block 2 can run.
      await waitForState(
        page,
        (s) => s.block === 2 && s.phase === "instructions",
        30_000,
        "block 2 restart (instructions phase, block 2)",
      );

      // The restarted block 2 runs to completion and the experiment ends cleanly.
      await waitForCompletion(page, 180_000);

      // Not hollow: block 2's trials genuinely re-ran (3 or 4 completions — the
      // abandoned in-flight trial's commit is a timing race).
      await expectRestartRanTrials(page, "2_1", countBefore);

      await page.context().close();
    }, 420_000);
  },
);
