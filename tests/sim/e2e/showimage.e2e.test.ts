/**
 * @jest-environment node
 *
 * showImage (display-only) block tests: data-shape preservation across the
 * endLoopIteration restart-seam refactor (A-slim), plus restart-on-
 * recalibration. showImage blocks take an early-return in scheduleOneBlock
 * (no trials loop, historically no endLoopIteration), so they produce zero
 * _trialsData rows today; A-slim must preserve that exactly while adding the
 * restart seam.
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
const SHOW_TABLE = "showimage-recalibrate-sim";
const SHOW_PORT = 5640;

const E2E = RUN_E2E ? describe : describe.skip;

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

const isComplete = async (page: Page): Promise<boolean> => {
  try {
    return await page.evaluate(
      () =>
        (window as any).__SIM_COMPLETE__ === true ||
        document.getElementById("ee-state")?.getAttribute("data-phase") ===
          "complete",
    );
  } catch {
    return false;
  }
};

const waitForCompletion = async (page: Page, timeoutMs: number) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const err = await page
      .evaluate(
        () => document.getElementById("ee-state")?.getAttribute("data-error"),
      )
      .catch(() => null);
    if (err) throw new Error(`Experiment error: ${err}`);
    if (await isComplete(page)) return;
    await page.waitForTimeout(100);
  }
  throw new Error(`Experiment did not complete within ${timeoutMs}ms`);
};

/** Drive one recalibration cycle (start → end) after spoofing a distance. */
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

/** Poll the showImage display counter (incremented each time a showImage
 * block's tasks begin to run — so a restart, which re-schedules the block,
 * drives it to 2). */
const waitForDisplayCount = async (
  page: Page,
  n: number,
  timeoutMs: number,
): Promise<number> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const c = await page.evaluate(
      () => (window as any).__showImageDisplayCount ?? 0,
    );
    if (c >= n) return c;
    await page.waitForTimeout(50);
  }
  throw new Error(`showImage display count did not reach ${n}`);
};

E2E("showImage block data shape + restart", () => {
  let server: ChildProcess;
  let browser: Browser;

  beforeAll(async () => {
    ensureSimTableBuilt({
      name: SHOW_TABLE,
      resources: [{ from: "images/test-show.png", to: "images/test-show.png" }],
    });
    killPortOccupants(SHOW_PORT);
    server = spawn(
      "npm",
      ["start", "--", `--name=${SHOW_TABLE}`, `--port=${SHOW_PORT}`],
      {
        stdio: "ignore",
        detached: true,
        env: { ...process.env, VITE_NO_OPEN: "1" },
      },
    );
    await pollUrl(`http://localhost:${SHOW_PORT}`, 30_000);
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
    killPortOccupants(SHOW_PORT);
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
    await page.goto(experimentIndexUrl(SHOW_PORT, SHOW_TABLE), {
      waitUntil: "commit",
    });
    return page;
  };

  // Column-key signature every row shares (secs is volatile). Captured
  // from current behavior; A-slim (restart seam, no nextEntry) must not
  // change it.
  const EXPECTED_KEYS =
    "EasyEyesID,PavloviaSessionID,ProlificParticipantID,ProlificSessionID," +
    "ProlificStudyID,URL,WebGLUnmaskedRenderer,WebGLVersion,WebGL_Report," +
    "actualPavloviaSessionID,block,blocks.order,blocks.ran,blocks.thisIndex," +
    "blocks.thisN,blocks.thisRepN,blocks.thisTrialN,cameraResolutionXY," +
    "computeRandomMHz,dataSaved,date,debriefDurationSec,deviceBrowser," +
    "deviceBrowserVersion,deviceLanguage,deviceMemoryGB,devicePixelRatio," +
    "deviceSystem,deviceSystemFamily,deviceType,durationOfExperimentSec," +
    "experiment,experimentCompleteBool,experimentFilename," +
    "frameRateReportedByPsychoJS,hardwareConcurrency,longTask," +
    "longTaskDurationSec,longTaskStartSec,maxTextureSize,maxViewportSize," +
    "monitorFrameRate,participant,psychojsWindowDimensions,psychopyVersion," +
    "pxPerCm,screenHeightPx,screenWidthPx,session,sizeCheckJSON,targetKind," +
    "targetTask";

  const rowKeys = (r: Record<string, unknown>): string =>
    Object.keys(r)
      .filter((k) => k !== "secs")
      .sort()
      .join(",");

  test("GREEN: showImage experiment data shape (must be preserved by A-slim)", async () => {
    const page = await openExperiment();
    await waitForCompletion(page, 120_000);
    const rows = await page.evaluate(() => (window as any).__getTrialsData());

    // Shape: 3 rows, every row shares the exact column-key set.
    expect(rows.length).toBe(3);
    for (const r of rows) expect(rowKeys(r)).toBe(EXPECTED_KEYS);

    // Stable values: row 0 is the showImage block's metadata row; row 1 marks
    // experiment completion; row 2 is the trailing entry.
    expect(String(rows[0].block)).toBe("0");
    expect(rows[0]["blocks.thisN"]).toBe(1);
    expect(rows[0].targetKind).toBe("letter");
    expect(rows[0].targetTask).toBe("identify");
    expect(rows[1].experimentCompleteBool).toBe(true);
    expect(rows[2].block).toBe(null);

    await page.context().close();
  }, 180_000);

  // The new capability A-slim adds: recalibration during a display-only
  // showImage block restarts it (the display re-shows), mirroring trial
  // blocks. Without the restart seam in the showImage branch, the display
  // would show once and the experiment would end (count stays 1).
  test("recalibration during a showImage display restarts the block (display re-shows)", async () => {
    const page = await openExperiment();

    // First showImage display.
    await waitForDisplayCount(page, 1, 120_000);

    // Recalibrate mid-display → requestRestartBlock (skipBlock drains the
    // display via toShowCursor; the restart seam re-schedules the block).
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

    // Restart re-shows the display (block re-scheduled → counter → 2).
    await waitForDisplayCount(page, 2, 30_000);

    // The restarted display advances (sim dispatches return) and the
    // experiment completes cleanly.
    await waitForCompletion(page, 120_000);
    expect(
      await page.evaluate(() => (window as any).__showImageDisplayCount),
    ).toBe(2);

    await page.context().close();
  }, 240_000);
});
