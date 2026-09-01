/**
 * @jest-environment node
 *
 * REAL-run guard: a participant load with NO simulation seed must (a) boot
 * cleanly, (b) leave zero sim artifacts — no #ee-state element, no event
 * log, no event-log side effects — and (c) never page-error. Guards the
 * sim-gating of every instrumentation conversion.
 *
 * RUN_E2E-gated like the other sim e2e suites.
 */
import {
  jest,
  expect,
  describe,
  test,
  beforeAll,
  afterAll,
} from "@jest/globals";
import { chromium, type Browser } from "@playwright/test";
import { spawn, execSync, type ChildProcess } from "child_process";
import * as http from "http";
import { experimentIndexUrl } from "../../../server/simulate";

const RUN_E2E = process.env.RUN_E2E === "1";
// NOT a -sim table: demoExperiment has no simulateParticipantBool, so this is
// a genuine real-participant load. (letter-sim et al. self-simulate via the
// table param — using one here would make the probe vacuous.)
const TABLE = "demoExperiment";
const PORT = 5651;

const killPortOccupants = (port: number): void => {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null; true`, {
      shell: "zsh",
    });
  } catch {
    /* nothing listening */
  }
};

(RUN_E2E ? describe : describe.skip)("real (non-simulated) run", () => {
  let browser: Browser;
  let server: ChildProcess;

  beforeAll(async () => {
    // demoExperiment is pre-built in examples/generated (a plain example,
    // not a sim asset) — no build needed.
    killPortOccupants(PORT);
    server = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], {
      stdio: "ignore",
      detached: true,
    });
    await new Promise<void>((resolve) => {
      const ping = setInterval(() => {
        http
          .get(`http://localhost:${PORT}/`, () => {
            clearInterval(ping);
            resolve();
          })
          .on("error", () => {});
      }, 250);
    });
    browser = await chromium.launch();
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
    try {
      process.kill(-server.pid, "SIGKILL");
    } catch {
      /* already gone */
    }
    killPortOccupants(PORT);
  });

  test("boots with zero sim artifacts and no errors", async () => {
    const context = await browser.newContext();
    // NO __SIM_SEED__ init script, NO sim participant — a real participant.
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    await page.goto(experimentIndexUrl(PORT, TABLE), { waitUntil: "commit" });

    // Give the app time to boot past initial script loading.
    await page.waitForTimeout(10_000);

    const artifacts = await page.evaluate(() => ({
      eeStateEl: document.getElementById("ee-state") !== null,
      eeEvents: (window as any).__eeEvents !== undefined,
      simComplete: (window as any).__SIM_COMPLETE__ === true,
      simSeed: (window as any).__SIM_SEED__,
    }));
    expect(pageErrors).toEqual([]);
    expect(artifacts.eeStateEl).toBe(false); // no instrumentation ever ran
    expect(artifacts.eeEvents).toBe(false); // no event log exists
    expect(artifacts.simComplete).toBe(false);
    expect(artifacts.simSeed).toBeUndefined();

    // The app itself must be alive: DOM rendered (title page / instructions /
    // rc panel — whichever screen a real participant would face).
    const alive = await page.evaluate(
      () =>
        document.body.innerHTML.length > 1000 &&
        !!document.querySelector(
          "#easyeyes-title-page, .ee-html-text-stim, #rc-panel, canvas",
        ),
    );
    expect(alive).toBe(true);
    await context.close();
  }, 120_000);
});
