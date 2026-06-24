/**
 * External Playwright-based simulation CLI.
 *
 * Observer-only: does NOT drive the experiment. The in-browser
 * simulatedParticipant.ts is the single source of truth — this script only
 * starts a dev server, opens the page, and reports what happened via the
 * #ee-state DOM element + console messages.
 *
 * Usage:
 *   npm run simulate -- <experimentName> [--seed=N] [--headless]
 *                                        [--json] [--screenshots]
 *                                        [--port=N] [--stuck-timeout-ms=N]
 *                                        [--interactive]
 *
 * Defaults: headless=on, seed=1, json=off, screenshots=off.
 * Output (text mode): token-efficient key=value lines for LLM consumption.
 * Output (json mode): one JSON object with the full SimulateResult.
 *
 * This module is NOT imported by threshold.js or any browser code.
 */

import { chromium } from "@playwright/test";
import type { Page, BrowserContext } from "@playwright/test";
import { execSync, spawn } from "child_process";
import { mkdirSync, appendFileSync, existsSync, openSync } from "fs";
import * as path from "path";
import * as os from "os";
import * as http from "http";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimulateOptions {
  headless?: boolean;
  port?: number;
  seed?: number;
  stuckTimeoutMs?: number;
  screenshotDir?: string;
  /** JSONL event log file path. Always on; pass /dev/null to disable. */
  jsonlPath?: string;
}

export interface SimulateResult {
  status: "completed" | "failed" | "incomplete";
  trialsCompleted: number;
  trialsTotal: number;
  responseStrategy: "typed" | "clicked" | "keypad";
  consoleErrors: string[];
  sweetAlertPopups: string[];
  warnings: string[];
  seed: number;
  durationMs: number;
}

interface EEState {
  phase: string | null;
  trial: string | null;
  trialTotal: string | null;
  block: string | null;
  responseTyped: boolean;
  validCharsTyped: string;
  responseClicked: boolean;
  validCharsClicked: string;
  keypadUrl: string | null;
  correctResponse: string | null;
  simulationModel: string | null;
  trialLevel: string | null;
  simulationThreshold: string | null;
  simulationBeta: string | null;
  simulationDelta: string | null;
  thresholdProportionCorrect: string | null;
  // One-shot boot metadata (publishBootEvent).
  experimentName: string | null;
  blockCount: string | null;
  conditionCount: string | null;
  language: string | null;
  seed: string | null;
  // Per-block metadata (publishBlockBegin).
  blockCondition: string | null;
  enabled: string | null;
  blockTotal: string | null;
  // Per-trial condition metadata (threshold.js condition-level read).
  conditionName: string | null;
  targetKind: string | null;
  targetTask: string | null;
  // Function-trace + error surfaces.
  currentFunction: string | null;
  error: string | null;
  // Summary (publishSummary on completion).
  trialsCompleted: string | null;
  trialsTotal: string | null;
  blocksSkipped: string | null;
  warnings: string | null;
  /** Persistent completion flag (window.__SIM_COMPLETE__). Survives page reloads. */
  simComplete?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readEEState(page: Page): Promise<EEState> {
  return page.evaluate(() => {
    const s = document.getElementById("ee-state");
    const get = (k: string) => s?.getAttribute(k) ?? null;
    return {
      phase: get("data-phase"),
      trial: get("data-trial"),
      trialTotal: get("data-trial-total"),
      block: get("data-block"),
      responseTyped: get("data-response-typed") === "true",
      validCharsTyped: get("data-valid-chars-typed") ?? "",
      responseClicked: get("data-response-clicked") === "true",
      validCharsClicked: get("data-valid-chars-clicked") ?? "",
      keypadUrl: get("data-keypad-url"),
      correctResponse: get("data-correct-response"),
      simulationModel: get("data-simulation-model"),
      trialLevel: get("data-trial-level"),
      simulationThreshold: get("data-simulation-threshold"),
      simulationBeta: get("data-simulation-beta"),
      simulationDelta: get("data-simulation-delta"),
      thresholdProportionCorrect: get("data-threshold-proportion-correct"),
      // One-shot boot metadata.
      experimentName: get("data-experiment-name"),
      blockCount: get("data-block-count"),
      conditionCount: get("data-condition-count"),
      language: get("data-language"),
      seed: get("data-seed"),
      // Per-block metadata.
      blockCondition: get("data-block-condition"),
      enabled: get("data-enabled"),
      blockTotal: get("data-block-total"),
      // Per-trial condition metadata.
      conditionName: get("data-condition-name"),
      targetKind: get("data-target-kind"),
      targetTask: get("data-target-task"),
      // Function-trace + error.
      currentFunction: get("data-current-function"),
      error: get("data-error"),
      // Summary.
      trialsCompleted: get("data-trials-completed"),
      trialsTotal: get("data-trials-total"),
      blocksSkipped: get("data-blocks-skipped"),
      warnings: get("data-warnings"),
      // Persistent completion signal — survives page reloads where the DOM
      // #ee-state element is rebuilt. Checks both the window property
      // (instant, same-page) and sessionStorage (survives reloads).
      simComplete:
        (window as any).__SIM_COMPLETE__ === true ||
        sessionStorage.getItem("__SIM_COMPLETE__") === "1",
    };
  });
}

function pollUrl(
  url: string,
  intervalMs: number,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode < 400) resolve();
          else retry();
          res.resume();
        })
        .on("error", retry);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs)
        reject(new Error(`Timeout waiting for ${url}`));
      else setTimeout(check, intervalMs);
    };
    check();
  });
}

// ---------------------------------------------------------------------------
// Main simulation
// ---------------------------------------------------------------------------

export async function simulate(
  experimentName: string,
  options: SimulateOptions = {},
): Promise<SimulateResult> {
  const {
    headless = true,
    port = 5500,
    seed = 1,
    stuckTimeoutMs = 20000,
    screenshotDir,
    jsonlPath,
  } = options;

  if (screenshotDir) mkdirSync(screenshotDir, { recursive: true });

  const consoleErrors: string[] = [];
  const sweetAlertPopups: string[] = [];
  const warnings: string[] = [];
  let trialsCompleted = 0;
  let trialsTotal = 0;
  let responseStrategy: "typed" | "clicked" | "keypad" = "typed";
  const startedAt = Date.now();

  // Kill anything on port, then start dev server
  execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null; true`, {
    shell: "zsh",
  });

  const logFd = (await import("fs")).openSync("/tmp/simulate-server.log", "a");
  const server = spawn(
    "npm",
    ["start", "--", `--name=${experimentName}`, `--port=${port}`],
    {
      stdio: ["ignore", logFd, logFd],
      detached: false,
      env: { ...process.env, VITE_NO_OPEN: "1" },
    },
  );

  const result: SimulateResult = {
    status: "failed",
    trialsCompleted: 0,
    trialsTotal: 0,
    responseStrategy: "typed",
    consoleErrors,
    sweetAlertPopups,
    warnings,
    seed,
    durationMs: 0,
  };

  const browser = await chromium.launch({ headless });
  const context: BrowserContext = await browser.newContext();

  // Inject __SIM_SEED__ before any page script runs.
  await context.addInitScript((s: number) => {
    (window as any).__SIM_SEED__ = s;
  }, seed);

  const page = await context.newPage();

  // CSV download detection — the most reliable completion signal. PsychoJS
  // triggers a data-file download when the experiment finishes. This fires
  // even if the page reloads immediately after, unlike ee-state polling.
  let downloadDetected = false;
  page.on("download", () => {
    downloadDetected = true;
  });

  // Console + page-error listeners. Filter out vite HMR noise and CDN
  // warnings that aren't experiment errors.
  const NOISE_PATTERNS = [
    /^\[vite\]/, // vite HMR / pre-transform
    /^Download the React DevTools/,
    /^%c/, // styled console spam (banner ads, version banners)
    /Google Maps JS API/,
    /Deviating from/,
  ];
  function isNoise(text: string): boolean {
    return NOISE_PATTERNS.some((p) => p.test(text));
  }

  page.on("console", (msg) => {
    const t = msg.type();
    const text = msg.text();
    if (isNoise(text)) return;
    if (t === "error") consoleErrors.push(text);
    if (jsonlPath) {
      appendFileSync(
        jsonlPath,
        JSON.stringify({ ts: Date.now(), kind: "console", level: t, text }) +
          "\n",
      );
    }
  });
  page.on("pageerror", (err) => {
    const msg = `pageerror: ${err.message}`;
    consoleErrors.push(msg);
    if (jsonlPath) {
      appendFileSync(
        jsonlPath,
        JSON.stringify({
          ts: Date.now(),
          kind: "error",
          text: msg,
          stack: err.stack?.split("\n").slice(0, 6).join("\n"),
        }) + "\n",
      );
    }
  });

  // JSONL event logger: appends one JSON object per line for every state change.
  let lastLoggedKey = "";
  const logStateEvent = (state: EEState) => {
    if (!jsonlPath) return;
    const key = `${state.phase}:${state.trial}`;
    if (key === lastLoggedKey) return;
    lastLoggedKey = key;
    appendFileSync(
      jsonlPath,
      JSON.stringify({ ts: Date.now(), kind: "state", ...state }) + "\n",
    );
  };

  try {
    await pollUrl(`http://localhost:${port}`, 100, 30000);
    // 'commit' returns as soon as the first HTTP response is received,
    // avoiding waits for slow CDN scripts (Sentry, 51degrees, peer.easyeyes.app…)
    await page.goto(`http://localhost:${port}`, { waitUntil: "commit" });

    // Wait until ee-state exists and has a non-loading phase (up to 60s).
    await page.waitForFunction(
      () => {
        const s = document.getElementById("ee-state");
        const phase = s?.getAttribute("data-phase");
        return !!phase && phase !== "loading";
      },
      null,
      { timeout: 60000, polling: 300 },
    );

    // Observer-only loop. Watch state transitions until "complete" or stuck.
    let lastPhase: string | null = null;
    let lastTrial: string | null = null;
    let stuckSince: number | null = null;
    const screenshottedKeys = new Set<string>();
    let maxIter = 600;
    let iter = 0;

    while (iter++ < maxIter) {
      const state = await readEEState(page);
      logStateEvent(state);
      const phase = state.phase;

      if (state.trialTotal) {
        trialsTotal = parseInt(state.trialTotal) || 0;
        maxIter = Math.max(maxIter, trialsTotal * 5 + 100);
      }
      if (state.trial) {
        trialsCompleted = parseInt(state.trial) || 0;
      }

      // Error takes priority over completion — a crash is not a success.
      if (state.error) {
        result.status = "failed";
        consoleErrors.push(`Experiment error: ${state.error}`);
        break;
      }

      if (state.simComplete || phase === "complete" || downloadDetected) {
        result.status = "completed";
        if (trialsCompleted === 0 && trialsTotal > 0) {
          trialsCompleted = trialsTotal;
        }
        break;
      }

      // Stuck detection
      if (phase === lastPhase && state.trial === lastTrial) {
        if (!stuckSince) stuckSince = Date.now();
        else if (Date.now() - stuckSince > stuckTimeoutMs) {
          warnings.push(`Stuck at phase=${phase}, trial=${state.trial}`);
          result.status = "incomplete";
          break;
        }
      } else {
        stuckSince = null;
        lastPhase = phase;
        lastTrial = state.trial;
      }

      // Optional screenshot at first sight of each new trial/response
      if (screenshotDir && (phase === "response" || phase === "reading")) {
        const key = `${state.trial ?? iter}`;
        if (!screenshottedKeys.has(key)) {
          screenshottedKeys.add(key);
          const p = path.join(
            screenshotDir,
            `trial-${String(key).padStart(3, "0")}.png`,
          );
          try {
            const buf = await page.screenshot();
            (await import("fs")).writeFileSync(p, buf);
          } catch (e) {
            warnings.push(`Screenshot failed (trial ${key}): ${e}`);
          }
        }
      }

      // Detect SweetAlert popups — record but don't act (simulator handles them).
      try {
        const popup = page.locator(".swal2-popup");
        if (await popup.isVisible({ timeout: 100 })) {
          const text = (await popup.textContent()) ?? "";
          if (!sweetAlertPopups.includes(text.trim())) {
            sweetAlertPopups.push(text.trim());
          }
        }
      } catch {}

      // Response strategy tracking (informational only)
      if (phase === "response") {
        if (state.responseClicked) responseStrategy = "clicked";
        else if (state.responseTyped) responseStrategy = "typed";
      }

      await page.waitForTimeout(100);
    }

    if (result.status === "failed" && trialsCompleted > 0) {
      result.status = "incomplete";
    }
  } finally {
    await browser.close();
    server.kill();
  }

  result.trialsCompleted = trialsCompleted;
  result.trialsTotal = trialsTotal;
  result.responseStrategy = responseStrategy;
  result.durationMs = Date.now() - startedAt;
  return result;
}

// ---------------------------------------------------------------------------
// CLI helpers (exported for unit testing)
// ---------------------------------------------------------------------------

export interface CliArgs {
  /** One or more experiment table names (positional args). */
  experimentNames: string[];
  headless: boolean;
  seed: number;
  json: boolean;
  screenshots: boolean;
  interactive: boolean;
  port: number;
  stuckTimeoutMs: number;
  /** Max parallel tables (default: all, capped at 4 by caller). */
  jobs: number;
  /** Skip auto-build phase. */
  noBuild: boolean;
  /** Exit non-zero if any warnings were recorded (stuck trials, etc.). */
  failOnWarnings: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const positional = argv.slice(2).filter((a) => !a.startsWith("--"));
  const flags = new Set(
    argv.filter((a) => a.startsWith("--")).map((a) => a.split("=")[0]),
  );
  const getNum = (name: string, def: number) => {
    const found = argv.find((a) => a.startsWith(`--${name}=`));
    return found ? parseInt(found.split("=")[1], 10) : def;
  };
  // Strip optional .csv suffix from each positional so the user can pass
  // either `myTable` or `myTable.csv`.
  const experimentNames = positional.map((p) =>
    p.endsWith(".csv") ? p.slice(0, -4) : p,
  );
  return {
    experimentNames,
    headless: flags.has("--headless") ? true : !flags.has("--no-headless"),
    seed: getNum("seed", 1),
    json: flags.has("--json"),
    screenshots: flags.has("--screenshots"),
    interactive: flags.has("--interactive"),
    port: getNum("port", 5500),
    stuckTimeoutMs: getNum("stuck-timeout-ms", 20000),
    // Default: 4 parallel tables. Each spawns vite + chromium (~300MB
    // each); 4 keeps total under 1.5GB on typical dev laptops. Override
    // with --jobs=N.
    jobs: getNum("jobs", 4),
    noBuild: flags.has("--no-build"),
    failOnWarnings: flags.has("--fail-on-warnings"),
  };
}

/**
 * Compute the JSONL event-log path for a given experiment + seed.
 * Writes to OS temp dir (NOT project tree) to avoid Vite HMR reload loops.
 */
export function jsonlPathFor(experimentName: string, seed: number): string {
  return path.join(
    os.tmpdir(),
    "easyeyes-sim",
    experimentName,
    `events-${seed}.jsonl`,
  );
}
