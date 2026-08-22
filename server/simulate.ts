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
import {
  mkdirSync,
  appendFileSync,
  existsSync,
  openSync,
  readFileSync,
} from "fs";
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
  /**
   * Screenshot every distinct screen (phase/trial/dialog/instruction-text
   * change) into screenshotDir, named NN-phase-trial.png. Default false:
   * screenshot only first sight of each response/reading trial.
   */
  screenshotOnChangeBool?: boolean;
  /** Working directory for the dev server (default: process.cwd()). The A/B
   * harness (server/abSimulate.ts) uses this to run a git worktree of a ref. */
  cwd?: string;
  /** JSONL event log file path. Always on; pass /dev/null to disable. */
  jsonlPath?: string;
  /** Record the whole run as a .webm screen recording (saved next to
   * screenshotDir when set, else OS temp). Path lands in result.videoPath. */
  video?: boolean;
  /** Injected in-page as window.__SIM_OPTIONS__ before any script runs.
   * Consumed by simulatedParticipant stubs (soundOutputPolicy, deviceScript,
   * simNoSinkSupport). */
  simOptions?: Record<string, unknown>;
}

export interface SimulateResult {
  status: "completed" | "failed" | "incomplete";
  trialsCompleted: number;
  trialsTotal: number;
  responseStrategy: "typed" | "clicked" | "keypad";
  consoleErrors: string[];
  sweetAlertPopups: string[];
  /** Title texts of custom EasyEyes popups (#threshold-container) seen. */
  eePopupTitles: string[];
  /** Visible compatibility-report ✓/✗ checklist contents (report page). */
  compatFactTexts: string[];
  /** Full texts of Swal popups, recorded in-page by the simulated participant. */
  swalPopupTexts: string[];
  /** Texts of visible instruction overlays (.ee-html-text-stim), recorded in-page. */
  instructionTexts: string[];
  /** Instruction-overlay text → fontFamily at show time, recorded in-page. */
  instructionFonts: Record<string, string>;
  warnings: string[];
  /** Downloaded data files (filename → content), e.g. the results CSV. */
  csvFiles: Record<string, string>;
  /** Ground truth: setSinkId calls recorded in-page
   * ({target, deviceId, label, tMs since boot}). */
  sinkCalls: Array<Record<string, unknown>>;
  /** Ground truth: HTMLMediaElement.play calls ({src, id, tMs}). */
  mediaPlays: Array<Record<string, unknown>>;
  /** Ground truth: sim driver actions on the sound-output step
   * (select / test-button / quit / proceed). */
  soundOutputActions: Array<Record<string, unknown>>;
  /** Path to the .webm screen recording when options.video was set. */
  videoPath: string | null;
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
// Dev-server process-tree lifecycle
// ---------------------------------------------------------------------------
// The sim harness spawns `npm start` → start.mjs → npx → vite. Killing only
// the direct child orphans the grandchildren — detached Vite servers used to
// accumulate and squat on ports (one held [::1]:5500 and hijacked localhost
// from the compiler's webpack-dev-server). The server is therefore spawned
// detached (own process group) and the whole GROUP is killed, with SIGKILL
// escalation for SIGTERM-resistant children.

/** Send `sig` to pid's whole process group (falls back to direct kill). */
function killGroup(pid: number, sig: NodeJS.Signals): void {
  try {
    process.kill(-pid, sig);
  } catch {
    try {
      process.kill(pid, sig);
    } catch {
      /* already gone */
    }
  }
}

/** Does any process in pid's process group still exist? */
function groupAlive(pid: number): boolean {
  try {
    process.kill(-pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Kill an entire process tree rooted at `pid` (the group leader, spawned
 * with detached:true). SIGTERM first, then SIGKILL after `graceMs` if any
 * group member survives. No-op if the group is already gone.
 */
export async function killProcessTree(
  pid: number,
  { graceMs = 1500 }: { graceMs?: number } = {},
): Promise<void> {
  if (!groupAlive(pid)) return;
  killGroup(pid, "SIGTERM");
  const start = Date.now();
  while (groupAlive(pid) && Date.now() - start < graceMs) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (groupAlive(pid)) {
    killGroup(pid, "SIGKILL");
    // SIGKILL delivery/reaping is asynchronous — don't resolve until the
    // group is verifiably gone.
    const killStart = Date.now();
    while (groupAlive(pid) && Date.now() - killStart < 1000) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

/** Synchronous group SIGKILL — safe for `exit` handlers (no awaiting). */
function killProcessTreeSync(pid: number): void {
  killGroup(pid, "SIGKILL");
}

/** Kill whatever is listening on `port` (pre-spawn + post-run backstop). */
function killPortOccupants(port: number): void {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null; true`, {
      shell: "zsh",
    });
  } catch {
    /* lsof found nothing / kill raced — fine */
  }
}

// Live server group-leader pids. If THIS process is interrupted (Ctrl+C,
// SIGTERM, crash-exit), the finally blocks may not run — these global
// handlers guarantee no orphaned dev servers outlive the sim run.
const activeServerPids = new Set<number>();
let globalCleanupInstalled = false;

function installGlobalCleanup(): void {
  if (globalCleanupInstalled) return;
  globalCleanupInstalled = true;
  const killAllSync = () => {
    for (const pid of activeServerPids) killProcessTreeSync(pid);
  };
  process.on("exit", killAllSync);
  process.on("SIGINT", () => {
    killAllSync();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    killAllSync();
    process.exit(143);
  });
}

// ---------------------------------------------------------------------------
// Main simulation
// ---------------------------------------------------------------------------

// Navigate directly to the generated example's index.html with
// ?preview-deploy so the runtime fetches glossary/phrases from production:
// the bare-localhost navigation 302-redirects (dropping query params), and
// the localhost:8888 netlify-dev probe can hang when no such server runs.
export function experimentIndexUrl(
  port: number,
  experimentName: string,
): string {
  const base = `http://localhost:${port}/examples/generated/${experimentName}/index.html`;
  return `${base}?preview-deploy=${encodeURIComponent("https://easyeyes.app")}`;
}

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
    screenshotOnChangeBool = false,
    cwd,
    jsonlPath,
    video = false,
    simOptions,
  } = options;

  if (screenshotDir) mkdirSync(screenshotDir, { recursive: true });

  const consoleErrors: string[] = [];
  const sweetAlertPopups: string[] = [];
  const eePopupTitles: string[] = [];
  const compatFactTexts: string[] = [];
  const swalPopupTexts: string[] = [];
  const instructionTexts: string[] = [];
  const instructionFonts: Record<string, string> = {};
  const warnings: string[] = [];
  let trialsCompleted = 0;
  let trialsTotal = 0;
  let responseStrategy: "typed" | "clicked" | "keypad" = "typed";
  const startedAt = Date.now();

  // Kill anything on port, then start dev server. detached:true makes the
  // child a process-group leader so killProcessTree can reap npm → start.mjs
  // → npx → vite as one unit (plain server.kill() orphans the grandchildren).
  killPortOccupants(port);

  const logFd = (await import("fs")).openSync("/tmp/simulate-server.log", "a");
  const server = spawn(
    "npm",
    ["start", "--", `--name=${experimentName}`, `--port=${port}`],
    {
      stdio: ["ignore", logFd, logFd],
      detached: true,
      cwd: cwd ?? process.cwd(),
      env: { ...process.env, VITE_NO_OPEN: "1" },
    },
  );
  installGlobalCleanup();
  if (server.pid) activeServerPids.add(server.pid);

  const result: SimulateResult = {
    status: "failed",
    trialsCompleted: 0,
    trialsTotal: 0,
    responseStrategy: "typed",
    consoleErrors,
    sweetAlertPopups,
    eePopupTitles,
    compatFactTexts,
    swalPopupTexts,
    instructionTexts,
    instructionFonts,
    warnings,
    csvFiles: {},
    sinkCalls: [],
    mediaPlays: [],
    soundOutputActions: [],
    videoPath: null,
    seed,
    durationMs: 0,
  };

  const browser = await chromium.launch({ headless });
  const videoDir = screenshotDir
    ? path.join(screenshotDir, "_video")
    : path.join(os.tmpdir(), "easyeyes-sim", "video");
  if (video) mkdirSync(videoDir, { recursive: true });
  const context: BrowserContext = await browser.newContext(
    video ? { recordVideo: { dir: videoDir } } : {},
  );

  // Inject __SIM_SEED__ before any page script runs.
  // (FFmpeg.wasm uses the vite-served local @ffmpeg/core automatically on
  // localhost — see getFFmpeg in imageAndVideoGeneration.js.)
  await context.addInitScript((s: number) => {
    (window as any).__SIM_SEED__ = s;
  }, seed);
  if (simOptions) {
    await context.addInitScript((o: Record<string, unknown>) => {
      (window as any).__SIM_OPTIONS__ = o;
    }, simOptions);
  }

  const page = await context.newPage();
  // CSV download detection — the most reliable completion signal. PsychoJS
  // triggers a data-file download when the experiment finishes. This fires
  // even if the page reloads immediately after, unlike ee-state polling.
  let downloadDetected = false;
  const csvFiles: Record<string, string> = {};
  // Settle these before browser.close(): download.path() resolves only after
  // the file lands, and closing first can orphan the read (empty csvFiles).
  const csvReads: Promise<void>[] = [];
  page.on("download", (download) => {
    downloadDetected = true;
    csvReads.push(
      download
        .path()
        .then((p) => {
          if (p && download.suggestedFilename().endsWith(".csv")) {
            csvFiles[download.suggestedFilename()] = readFileSync(p, "utf8");
          }
        })
        .catch(() => {}),
    );
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
    const key = `${state.phase}:${state.trial}:${state.currentFunction ?? ""}`;
    if (key === lastLoggedKey) return;
    lastLoggedKey = key;
    appendFileSync(
      jsonlPath,
      JSON.stringify({ ts: Date.now(), kind: "state", ...state }) + "\n",
    );
  };
  if (jsonlPath) {
    appendFileSync(
      jsonlPath,
      JSON.stringify({
        ts: Date.now(),
        kind: "run-start",
        seed,
        headless,
      }) + "\n",
    );
  }

  try {
    await pollUrl(`http://localhost:${port}`, 100, 30000);
    // 'commit' returns as soon as the first HTTP response is received,
    // avoiding waits for slow CDN scripts (Sentry, 51degrees, peer.easyeyes.app…)
    await page.goto(experimentIndexUrl(port, experimentName), {
      waitUntil: "commit",
    });

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
    let lastFunction: string | null = null;
    let stuckSince: number | null = null;
    const screenshottedKeys = new Set<string>();
    let lastChangeScreenshotSig = "";
    let changeScreenshotN = 0;
    let maxIter = 600;
    let iter = 0;

    while (iter++ < maxIter) {
      // Mid-navigation (HMR reload, post-completion reload) destroys the
      // execution context — skip the tick instead of crashing the run.
      let state: EEState;
      try {
        state = await readEEState(page);
      } catch (e) {
        if (process.env.SIM_DEBUG)
          console.log(
            `[sim] iter=${iter} readEEState threw: ${String(e).slice(0, 150)}`,
          );
        await page.waitForTimeout(100);
        continue;
      }
      logStateEvent(state);
      const phase = state.phase;

      if (process.env.SIM_DEBUG && iter % 20 === 0)
        console.log(
          `[sim] iter=${iter} phase=${phase} trial=${state.trial} ` +
            `err=${state.error ?? ""} complete=${state.simComplete ?? false}`,
        );

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

      // Stuck detection. currentFunction participates: long sub-flows that
      // stay in one phase (the ~30 s Huggins check) publish per-trial
      // function progress, which must reset the stuck clock.
      if (
        phase === lastPhase &&
        state.trial === lastTrial &&
        state.currentFunction === lastFunction
      ) {
        if (!stuckSince) stuckSince = Date.now();
        else if (Date.now() - stuckSince > stuckTimeoutMs) {
          warnings.push(`Stuck at phase=${phase}, trial=${state.trial}`);
          // Self-diagnosing hangs: dump the visible DOM text so the run log
          // shows WHAT the participant was looking at (popup text, button
          // labels) without a human re-running with --interactive.
          try {
            const visText: string = await page.evaluate(() => {
              const vis = (el: Element) =>
                (el as HTMLElement).offsetParent !== null;
              const parts: string[] = [];
              const swal = document.querySelector(".swal2-popup");
              if (swal && vis(swal))
                parts.push("[Swal] " + (swal.textContent || "").trim());
              const ee = document.getElementById("threshold-container");
              if (ee && vis(ee))
                parts.push("[EE-popup] " + (ee.textContent || "").trim());
              parts.push(
                "[body] " +
                  (document.body.innerText || "").trim().slice(0, 500),
              );
              return parts.join("\n");
            });
            if (visText)
              warnings.push(`Stuck screen: ${visText.slice(0, 700)}`);
          } catch {}
          result.status = "incomplete";
          break;
        }
      } else {
        stuckSince = null;
        lastPhase = phase;
        lastTrial = state.trial;
        lastFunction = state.currentFunction;
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

      // Optional screenshot of every DISTINCT screen: fires when the phase,
      // trial, visible instruction-overlay text, or visible Swal text changes.
      // Used by the A/B harness (server/abSimulate.ts) to capture comparable
      // screens across two versions of the code.
      if (screenshotDir && screenshotOnChangeBool) {
        try {
          const [instrText, swalText]: string[] = await page.evaluate(() => {
            const visible = (el: Element) =>
              (el as HTMLElement).offsetParent !== null;
            const instr = Array.from(
              document.querySelectorAll(".ee-html-text-stim"),
            )
              .filter(visible)
              .map((e) => e.textContent?.trim() ?? "")
              .join("|");
            const swal = document.querySelector(".swal2-popup");
            const swalText =
              swal && visible(swal) ? swal.textContent?.trim() ?? "" : "";
            return [instr, swalText];
          });
          const sig = `${phase}:${state.trial}:${instrText}:${swalText}`;
          if (sig !== lastChangeScreenshotSig) {
            lastChangeScreenshotSig = sig;
            changeScreenshotN++;
            // Let fade-in animations (Swal showClass: "fade-in") finish so
            // the captured screen is fully opaque.
            await page.waitForTimeout(400);
            const slug = [phase, state.trial ? `t${state.trial}` : ""]
              .filter(Boolean)
              .join("-")
              .replace(/[^a-zA-Z0-9_-]/g, "_");
            const p = path.join(
              screenshotDir,
              `${String(changeScreenshotN).padStart(2, "0")}-${slug}.png`,
            );
            const buf = await page.screenshot();
            (await import("fs")).writeFileSync(p, buf);
          }
        } catch (e) {
          warnings.push(`Change-screenshot failed: ${e}`);
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

      // Detect custom EasyEyes popups (popup.js: #threshold-container), e.g.
      // the end-of-block percent-correct or take-a-break popup. The popup
      // may open and close between observer polls, so the authoritative
      // record is window.__simEePopupTitles, written by the in-page
      // simulated participant (read after the loop); this is a fallback.
      try {
        const eePopup = page.locator("#threshold-container");
        if (await eePopup.isVisible({ timeout: 100 })) {
          const text =
            (await page.locator("#threshold-title").textContent()) ?? "";
          if (text.trim() && !eePopupTitles.includes(text.trim())) {
            eePopupTitles.push(text.trim());
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

    // Authoritative popup record: written in-page by the simulated
    // participant, which sees every popup regardless of observer polling.
    try {
      const titles: string[] = await page.evaluate(
        () => (window as any).__simEePopupTitles ?? [],
      );
      for (const t of titles) {
        if (t && !eePopupTitles.includes(t)) eePopupTitles.push(t);
      }
      const factTexts: string[] = await page.evaluate(
        () => (window as any).__simCompatFactTexts ?? [],
      );
      for (const t of factTexts) {
        if (t && !compatFactTexts.includes(t)) compatFactTexts.push(t);
      }
      const swalTexts: string[] = await page.evaluate(
        () => (window as any).__simSwalPopupTexts ?? [],
      );
      for (const t of swalTexts) {
        if (t && !swalPopupTexts.includes(t)) swalPopupTexts.push(t);
      }
      const instrTexts: string[] = await page.evaluate(
        () => (window as any).__simInstructionTexts ?? [],
      );
      for (const t of instrTexts) {
        if (t && !instructionTexts.includes(t)) instructionTexts.push(t);
      }
      const instrFonts: Record<string, string> = await page.evaluate(
        () => (window as any).__simInstructionFonts ?? {},
      );
      Object.assign(instructionFonts, instrFonts);
      // Sound-output ground truth (installAudioOutputStub in
      // simulatedParticipant.ts). Sink/media timelines + driver actions.
      try {
        const gt = await page.evaluate(
          () => (window as any).__simGroundTruth?.() ?? null,
        );
        if (gt) {
          // Single pull at end-of-run: assign wholesale. (The previous
          // content-dedupe collapsed two same-ms barks/sink calls into one —
          // timestamps are not unique keys.)
          result.sinkCalls = gt.sinkCalls ?? [];
          result.mediaPlays = gt.mediaPlays ?? [];
          result.soundOutputActions = gt.soundOutputActions ?? [];
        }
      } catch {}
    } catch {}
  } finally {
    // Capture the video path BEFORE closing: the file materializes at
    // context close, but page.video() must be queried while page lives.
    if (video) {
      try {
        // page.video().path() is sync in Playwright's typings and returns the
        // eventual save location — safe to read before the context closes.
        const p = page.video()?.path();
        result.videoPath = p ? await p : null;
      } catch {}
    }
    await Promise.allSettled(csvReads);
    await browser.close();
    if (server.pid) {
      await killProcessTree(server.pid);
      activeServerPids.delete(server.pid);
    }
    // Backstop: nothing may still hold the port after this run.
    killPortOccupants(port);
  }

  result.trialsCompleted = trialsCompleted;
  result.trialsTotal = trialsTotal;
  result.responseStrategy = responseStrategy;
  result.durationMs = Date.now() - startedAt;
  result.csvFiles = csvFiles;
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
  /** Record a .webm screen recording per run. */
  video: boolean;
  /** Parsed --sim-opt=KEY=VALUE pairs → window.__SIM_OPTIONS__. */
  simOptions: Record<string, unknown>;
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
    video: flags.has("--video"),
    simOptions: parseSimOpts(argv),
  };
}

/** Parse repeatable --sim-opt=KEY=VALUE into an options object. JSON values
 * stay structured; bare strings/numbers/booleans are coerced. */
function parseSimOpts(argv: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const a of argv) {
    if (!a.startsWith("--sim-opt=")) continue;
    const kv = a.slice("--sim-opt=".length);
    const eq = kv.indexOf("=");
    if (eq <= 0) continue;
    const key = kv.slice(0, eq);
    const raw = kv.slice(eq + 1);
    let value: unknown = raw;
    try {
      value = JSON.parse(raw);
    } catch {
      /* keep raw string */
    }
    out[key] = value;
  }
  return out;
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
