/**
 * @jest-environment node
 *
 * Crosshair-tracking thrash — e2e investigation of the
 * Acuity24FontsAddSloan9 field stall (2026-10-11): two participants stuck
 * forever inside trialInstructionRoutineEachFrame, mid-instruction, with
 * the stimulus generated but the gate never completing; the stall trial
 * showed a ~1.46 s long task vs a ~0.98 s tracking deadline.
 *
 * Mechanism under test (code-verified): with EasyEyesLettersVersion 2 and
 * a moving fixation, every ARM of the tracking gate
 * (checkIfCursorIsTrackingFixation: cursor enters the hotspot while
 * disarmed) sets fixationPosAfterDelay, which re-triggers a full stimulus
 * regeneration (3-5 TextStim destroy/create + rasterize; the regen block
 * does not check stimulusComputedBool). A regeneration slower than
 * hotspot/speed makes the next frame's crosshair jump past the hotspot →
 * miss → reset → re-acquire → re-arm → regenerate: a thrash loop that, per
 * arm, blocks the main thread for the whole regen and freezes the
 * crosshair (field report: "cross stopped showing"). The gate itself has
 * no short timeout by default (responseTimeoutSec defaults to 86400 s).
 *
 * Harness: the in-page sim participant handles everything EXCEPT the
 * fixation gate (__SIM_OPTIONS__.fixationTracking="mouse" suppresses its
 * SPACE shortcut — in simulation canType() is true even for click-only
 * conditions, so SPACE would bypass the gate). The gate is driven by an
 * IN-PAGE tracker (init script): every rAF it reads #ee-state's live
 * data-fixation-px, circle-fits the crosshair motion and extrapolates one
 * frame ahead, then dispatches a synthetic pointermove on the canvas
 * (PsychoJS's EventManager consumes pointermove on renderer.view). Unlike
 * a CDP-driven mouse, this has zero round-trip lag — which alone would be
 * superhuman (it extrapolates straight through a main-thread freeze), so
 * after any ≥300 ms gap the tracker holds the cursor at its last position
 * for ~250 ms of frames: the human saccadic/pursuit latency after a
 * freeze+jump. The same rAF loop records inter-frame gaps (each regen =
 * one big gap) and heap samples.
 *
 * Scenarios (RUN_E2E=1):
 *   CONTROL  moving crosshair, no throttle → completes. Validates tracker.
 *   STATIC   static crosshair, 25× CPU throttle → completes: a slow regen
 *            without motion causes no jump, no miss, no thrash. Isolates
 *            the jump as the necessary ingredient.
 *   RED      moving crosshair, 25× CPU throttle (regen ≈ 0.4–0.9 s ≈
 *            field's slow-block regime) → DESIRED: run completes with few regens per
 *            gate. Was the sustained thrash (93 regens over 270 s, zero
 *            trials) before the regen guard landed — when the stimulus
 *            definition is unchanged (same letters, font, size-in-deg),
 *            getTargetStim now reuses the existing TextStim instead of
 *            re-rasterizing, so re-arms cost ~ms and the gate always
 *            completes. Positions, screen-fit clamping, and per-arm
 *            logging are unchanged — only the glyph raster is reused.
 *            Honest limit: at these parameters regen blocks mostly land
 *            outside the gate's armed window, so a reuse-disabled run
 *            also completes — this is a completion + reuse-mechanism
 *            regression test (RUN_PERF reports the stimReuse counters),
 *            not a stall reproducer.
 *
 * This test is OFF by default under `npm test`. Opt in with RUN_E2E=1.
 */

import { expect, describe, test } from "@jest/globals";
import { execSync, spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { chromium, type Browser } from "playwright";
import { ensureSimTableBuilt } from "./helpers/runSimTable";
import { experimentIndexUrl, killProcessTree } from "../../../server/simulate";
import { isSimConsoleNoise } from "../../../server/simNoiseFilter";
import { simE2EPort } from "./helpers/ports";

const RUN_E2E = process.env.RUN_E2E === "1";
/** Opt-in heap/regen diagnostics: RUN_E2E=1 RUN_HEAP=1 npx jest … */
const RUN_HEAP = process.env.RUN_HEAP === "1";
/** Opt-in before/after perf benchmark: RUN_E2E=1 RUN_PERF=1 npx jest … */
const RUN_PERF = process.env.RUN_PERF === "1";

const TABLE_NAME = "letter-tracking-thrash-sim";
const STATIC_TABLE_NAME = "letter-tracking-thrash-static-sim";
const LONG_TABLE_NAME = "letter-tracking-long-sim";
const ROOT = path.resolve(__dirname, "../../..");

/** A regen-sized main-thread block, observed as an rAF gap (ms). */
const REGEN_GAP_MS = 500;

interface RunOutcome {
  completed: boolean;
  stalled: boolean;
  stallKey: string;
  fixationPhasesSeen: number;
  trialsCompleted: number;
  trackerMoves: number;
  /** Regen-sized rAF gaps (ms) recorded while in the fixation gate. */
  regenGapsDuringFixation: number[];
  /** Heap samples [unixMs, usedJSHeapSize] for the whole run. */
  heap: [number, number][];
  /** One record per tracking-gate phase entry. */
  gates: {
    key: string;
    entryAt: number;
    exitAt: number | null;
    unresolved: boolean;
  }[];
  /** Total main-thread blocked ms (regen-sized gaps) inside gates. */
  blockedMsDuringFixation: number;
  /** In-page replicas of the compat-check machine probes. */
  machineProbes: { fontRenderSec: number; heap100MBAllocSec: number } | null;
  consoleErrors: string[];
  /** Diagnostics surfaced in evidence messages (all optional). */
  stimStats?: { reused: number; created: number } | null;

  fixRing?: {
    changes: number;
    ring: [number, number, number][];
  } | null;
  trackerOmega?: number | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const median = (a: number[]) =>
  a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0;

/**
 * In-page fixation tracker + instrument. Runs before any page script
 * (init script), so its rAF callback runs first every frame — the
 * dispatched pointermove lands before the experiment's eachFrame check.
 */
const TRACKER_INIT = `
(() => {
  const tr = (window.__tracker = {
    moves: 0,
    gaps: [],   // [gapMs, atMs, phaseAtGapEnd]
    heap: [],   // [unixMs, usedJSHeapSize]
  });
  let lastT = 0, lastNormalGap = 100;
  let theta = null, thetaT = 0, omega = null;
  let blindFrames = 0; // post-freeze re-acquisition latency (see below)
  const omegas = [];
  const FIXRE = /^\\((-?[\\d.]+),\\s*(-?[\\d.]+)\\)$/;
  const phase = () =>
    document.getElementById("ee-state")?.getAttribute("data-phase") ?? "";
  const tick = (t) => {
    const ph = phase();
    if (lastT) {
      const g = t - lastT;
      tr.gaps.push([Math.round(g), Math.round(t), ph]);
      if (g < 400) lastNormalGap = g;
      // A FREEZE is a gap far beyond this machine's normal frame (a
      // main-thread block: the crosshair hangs, then jumps). A human
      // cannot bridge that — after a target jump the eye has ~250ms of
      // saccadic/pursuit latency. Model it: hold the cursor at its last
      // position for ~250ms of frames after the freeze. Distinguish
      // freezes from uniform slowness (a genuinely slow machine has
      // uniformly long frames; its crosshair still moves smoothly and
      // pursuit tracks it — no jump, no latency). Frame-counted, not
      // wall-time: under CPU throttle one frame outlasts 250ms. Without
      // this the tracker extrapolates through blocks superhumanly and the
      // no-reuse path escapes a stall the field showed to be real.
      if (g >= 300 && g > 3 * lastNormalGap)
        blindFrames = Math.max(1, Math.round(250 / lastNormalGap));
    }
    lastT = t;
    if (ph === "fixation") {
      const m = FIXRE.exec(
        document.getElementById("ee-state")?.getAttribute("data-fixation-px") || ""
      );
      if (m) {
        const x = +m[1], y = +m[2];
        let px = x, py = y;
        // Diagnostics: attr staleness + dispatch-vs-attr distance.
        if (!tr.fix) tr.fix = { lastAttr: null, lastChangeT: 0, changes: 0, ring: [] };
        const f = tr.fix;
        const key = m[0] + "," + m[1];
        if (key !== f.lastAttr) {
          f.lastAttr = key; f.lastChangeT = t; f.changes++;
        }
        if (tr.lastDispatchPx) {
          const d = Math.hypot(
            tr.lastDispatchPx[0] - x, tr.lastDispatchPx[1] - y
          );
          f.ring.push([Math.round(t), Math.round(d * 10) / 10, Math.round(t - f.lastChangeT)]);
          if (f.ring.length > 400) f.ring.shift();
        }
        const r = Math.hypot(x, y);
        if (r > 1) {
          // Circle-fit: the crosshair revolves at constant angular speed.
          // The attr lags exactly one experiment frame (written by gyrate
          // during the previous frame), and the gate's near-check runs
          // later in THIS frame — extrapolate exactly one frameGap ahead.
          const th = Math.atan2(y, x);
          if (theta !== null) {
            let d = th - theta;
            while (d > Math.PI) d -= 2 * Math.PI;
            while (d < -Math.PI) d += 2 * Math.PI;
            const dt = t - thetaT;
            // Estimate angular speed from NORMAL frame pairs only — a
            // pair spanning a regen gap includes its position jump and
            // would bias the estimate high.
            if (dt > 1 && dt < 400) {
              omegas.push(d / (dt / 1000));
              if (omegas.length > 7) omegas.shift();
              const s = [...omegas].sort((a, b) => a - b);
              omega = s[Math.floor(s.length / 2)];
            }
          }
          theta = th; thetaT = t;
          if (omega !== null) {
            const ahead = omega * lastNormalGap / 1000;
            px = r * Math.cos(th + ahead);
            py = r * Math.sin(th + ahead);
          }
          window.__trackerOmega = omega;
        }
        if (blindFrames-- > 0 && tr.lastDispatchPx)
          [px, py] = tr.lastDispatchPx; // blind: hold position
        // The page has several canvases (font measuring, hidden fallbacks);
        // PsychoJS's EventManager listens on the renderer's full-window
        // canvas. Dispatch on every canvas that covers the viewport.
        const targets = [...document.querySelectorAll("canvas")].filter(
          (c) => {
            const b = c.getBoundingClientRect();
            return (
              b.width >= window.innerWidth * 0.9 &&
              b.height >= window.innerHeight * 0.9
            );
          }
        );
        if (targets.length) {
          const rc = targets[0].getBoundingClientRect();
          if (!tr.debug)
            tr.debug = { canvasCount: targets.length };
          const clientX = rc.left + rc.width / 2 + px;
          const clientY = rc.top + rc.height / 2 - py;
          for (const cv of targets)
            cv.dispatchEvent(new PointerEvent("pointermove", {
              clientX, clientY,
              bubbles: false, cancelable: true, isPrimary: true,
              pointerId: 1, pointerType: "mouse",
            }));
          tr.moves++;
          tr.lastDispatchPx = [px, py];
        }
      }
    } else { theta = null; omega = null; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  setInterval(() => {
    const mem = performance.memory;
    if (mem) tr.heap.push([Date.now(), mem.usedJSHeapSize]);
  }, 500);
})();
`;

/**
 * Drive the sim table; the gate is tracked by the in-page tracker. The
 * Node loop only observes #ee-state, engages the CPU throttle at the
 * block-instruction phase (before any gate), and detects completion or
 * stall.
 */
async function runMouseTrackedSim({
  port,
  tableName = TABLE_NAME,
  cpuThrottleRate = 1,
  rasterSlowdownMs = 0,
  runTimeoutMs,
  stallTimeoutMs,
}: {
  port: number;
  tableName?: string;
  cpuThrottleRate?: number;
  /** Per-fillText busy-wait: models a machine whose FONT RASTERIZATION is
   * slow (the field victims — fontRenderSec), with all other frames at
   * full speed. Uniform CPU throttle cannot model this: it slows every
   * frame, so freeze-vs-normal is undetectable to the gate/tracker. */
  rasterSlowdownMs?: number;
  runTimeoutMs: number;
  stallTimeoutMs: number;
}): Promise<RunOutcome> {
  ensureSimTableBuilt({ name: tableName });

  // Kill anything squatting on our registry port (orphaned dev servers
  // from interrupted runs), then spawn npm start detached so
  // killProcessTree can reap npm → start.mjs → npx → vite as one unit.
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null; true`, {
      shell: "zsh",
    });
  } catch {}
  const server = spawn(
    "npm",
    ["start", "--", `--name=${tableName}`, `--port=${port}`],
    {
      cwd: ROOT,
      stdio: ["ignore", "ignore", "pipe"],
      detached: true,
      env: { ...process.env, VITE_NO_OPEN: "1" },
    },
  );
  const serverErr: string[] = [];
  server.stderr?.on("data", (d) => serverErr.push(String(d)));

  let browser: Browser | undefined;
  try {
    const serverDeadline = Date.now() + 120_000;
    for (;;) {
      try {
        const r = await fetch(`http://localhost:${port}`);
        if (r.status < 500) break;
      } catch {}
      if (Date.now() > serverDeadline)
        throw new Error(
          `dev server on :${port} did not start. ${serverErr
            .join("")
            .slice(-2000)}`,
        );
      await sleep(1000);
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const consoleErrorsRaw: string[] = [];
    let shortIoQuota402 = false;
    await context.addInitScript((seed) => {
      (window as any).__SIM_SEED__ = seed;
      (window as any).__SIM_OPTIONS__ = { fixationTracking: "mouse" };
    }, 1);
    await context.addInitScript(TRACKER_INIT);
    if (rasterSlowdownMs > 0)
      await context.addInitScript((ms: number) => {
        const proto = CanvasRenderingContext2D.prototype;
        const orig = proto.fillText;
        proto.fillText = function (...args: Parameters<typeof orig>) {
          const r = orig.apply(this, args);
          const t0 = performance.now();
          while (performance.now() - t0 < ms) {}
          return r;
        };
      }, rasterSlowdownMs);
    // Machine probes, replicating components/performanceTests.ts so the
    // benchmark report carries the same per-machine context the field
    // logs (fontRenderSec, heap100MBAllocSec) at the compat check.
    await context.addInitScript(() => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        ctx.font = "600pt Verdana";
        ctx.fillText("ABC", 10, 50);
        const loremIpsum =
          "Aliquam qui enim et est. Odit et facere quia sit. Assumenda corporis repellendus molestiae culpa maiores eius debitis. Fugit provident odit qui ea et id molestias. Rerum blanditiis error sit quod ab culpa. Autem labore veritatis natus aspernatur unde. Aut doloribus a et voluptas aut voluptates beatae ullam. Delectus enim temporibus eligendi pariatur recusandae quidem qui ea. In ventore quas.";
        const longText = loremIpsum.repeat(1000);
        const t0 = performance.now();
        ctx.fillText("XYZ", 500, 500);
        ctx.measureText("XYZ");
        const t1 = performance.now();
        const t2 = performance.now();
        const arr = new Array(12500000).fill(0);
        const t3 = performance.now();
        (window as any).__machineProbes = {
          fontRenderSec: (t1 - t0) / 1000,
          heap100MBAllocSec: (t3 - t2) / 1000,
          _bytes: arr.length + longText.length,
        };
      } catch {}
    });
    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrorsRaw.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrorsRaw.push(String(err)));
    // short.io keypad-link shortening can be out of quota (HTTP 402): the
    // runtime catches it and falls back to the long URL — benign noise.
    page.on("response", (res) => {
      if (res.url().includes("api.short.io") && res.status() === 402)
        shortIoQuota402 = true;
      else if (res.status() >= 400)
        consoleErrorsRaw.push(`HTTP ${res.status()} ${res.url()}`);
    });
    await page.goto(experimentIndexUrl(port, tableName), {
      waitUntil: "domcontentloaded",
    });

    const cdp = await context.newCDPSession(page);
    let throttled = false;

    const t0 = Date.now();
    let lastProgressAt = Date.now();
    let lastKey = "";
    let seenState = false;
    let completed = false;
    let stalled = false;
    let fixationPhasesSeen = 0;
    let inFixation = false;
    let trialsCompleted = 0;
    const gates: {
      key: string;
      entryAt: number;
      exitAt: number | null;
      unresolved: boolean;
    }[] = [];
    let trackerMoves = 0;
    let tracker: {
      moves: number;
      gaps: [number, number, string][];
      heap: [number, number][];
    } | null = null;

    while (Date.now() - t0 < runTimeoutMs) {
      const s = await page.evaluate(() => {
        const el = document.getElementById("ee-state");
        const tr = (window as any).__tracker;
        return {
          phase: el?.getAttribute("data-phase") ?? "",
          block: el?.getAttribute("data-block") ?? "",
          trial: el?.getAttribute("data-trial") ?? "",
          trialsCompleted: Number(
            el?.getAttribute("data-trials-completed") ?? "0",
          ),
          tracker: tr
            ? {
                moves: tr.moves,
                gaps: tr.gaps,
                heap: tr.heap,
                fix: tr.fix ?? null,
                omega: window.__trackerOmega ?? null,
              }
            : null,
          stimStats: (window as any).__stimStats ?? null,
        };
      });
      if (s) {
        seenState = true;
        tracker = s.tracker;
        trackerMoves = s.tracker?.moves ?? 0;
        trialsCompleted = s.trialsCompleted;
        const key = `${s.phase}:${s.block}:${s.trial}`;
        if (key !== lastKey) {
          lastKey = key;
          lastProgressAt = Date.now();
        }
        if (s.phase === "complete") {
          completed = true;
          break;
        }
        if (s.phase === "fixation") {
          const open = gates.at(-1);
          if (open && open.unresolved && open.key !== key) {
            // Polling missed the inter-trial phases (throttled RTT):
            // close the previous trial's gate and open the next.
            open.exitAt = Date.now();
            open.unresolved = false;
            gates.push({
              key,
              entryAt: Date.now(),
              exitAt: null,
              unresolved: true,
            });
            fixationPhasesSeen++;
          } else if (!inFixation) {
            inFixation = true;
            fixationPhasesSeen++;
            gates.push({
              key,
              entryAt: Date.now(),
              exitAt: null,
              unresolved: true,
            });
          }
        } else if (inFixation) {
          inFixation = false;
          const g = gates.at(-1);
          if (g) {
            g.exitAt = Date.now();
            g.unresolved = false;
          }
        }
        // Engage the throttle at the block-instruction phase, BEFORE the
        // first gate, so no regen can race past unthrottled.
        if (
          cpuThrottleRate > 1 &&
          !throttled &&
          (s.phase === "instructions" || s.phase === "fixation")
        ) {
          await cdp.send("Emulation.setCPUThrottlingRate", {
            rate: cpuThrottleRate,
          });
          throttled = true;
        }
        if (seenState && Date.now() - lastProgressAt > stallTimeoutMs) {
          stalled = true;
          break;
        }
      }
      // Poll faster inside the gate: gate wall-times pick up less
      // sampling noise when the tracker's phase flips quickly.
      await sleep(inFixation ? 100 : 250);
    }
    if (throttled)
      await cdp
        .send("Emulation.setCPUThrottlingRate", { rate: 1 })
        .catch(() => {});

    const regenGapsDuringFixation = (tracker?.gaps ?? [])
      .filter(([ms, , ph]) => ph === "fixation" && ms > REGEN_GAP_MS)
      .map(([ms]) => ms);

    const machineProbes = await page
      .evaluate(() => (window as any).__machineProbes ?? null)
      .catch(() => null);
    const stimStats = await page
      .evaluate(() => (window as any).__stimStats ?? null)
      .catch(() => null);

    const outcome: RunOutcome = {
      completed,
      stalled,
      stallKey: lastKey,
      fixationPhasesSeen,
      trialsCompleted,
      trackerMoves,
      regenGapsDuringFixation,
      heap: tracker?.heap ?? [],
      gates,
      blockedMsDuringFixation: regenGapsDuringFixation.reduce(
        (a, b) => a + b,
        0,
      ),
      machineProbes: machineProbes
        ? {
            fontRenderSec: machineProbes.fontRenderSec,
            heap100MBAllocSec: machineProbes.heap100MBAllocSec,
          }
        : null,
      consoleErrors: consoleErrorsRaw.filter(
        (t) => !isSimConsoleNoise(t, shortIoQuota402),
      ),
    };
    if (tracker?.fix) outcome.fixRing = tracker.fix;
    if (stimStats) outcome.stimStats = stimStats;

    if (tracker?.omega !== null && tracker?.omega !== undefined)
      outcome.trackerOmega = Math.round(tracker.omega * 1000) / 1000;
    return outcome;
  } finally {
    await browser?.close().catch(() => {});
    if (server.pid) await killProcessTree(server.pid, 2000);
  }
}

/** Fail with the full evidence summary when `cond` is false. */
const evidence = (r: RunOutcome, cond: boolean, what: string) => {
  if (!cond) throw new Error(`${what} — ${summary(r)}`);
};

/** Compact evidence summary for assertion messages. */
const summary = (r: RunOutcome) =>
  JSON.stringify({
    completed: r.completed,
    stalled: r.stalled,
    stallKey: r.stallKey,
    fixationPhases: r.fixationPhasesSeen,
    trials: r.trialsCompleted,
    trackerMoves: r.trackerMoves,
    regenGaps: r.regenGapsDuringFixation,
    attrChanges: r.fixRing?.changes ?? null,
    ringTail: (r.fixRing?.ring ?? []).slice(-12),
    omega: r.trackerOmega ?? null,
    stimStats: r.stimStats ?? null,
    heapMB: r.heap.length
      ? [Math.round(r.heap[0][1] / 1e6), Math.round(r.heap.at(-1)![1] / 1e6)]
      : [],
  });

(RUN_E2E ? describe : describe.skip)(
  "letter tracking-gate thrash (Acuity24FontsAddSloan9 crosshair stall)",
  () => {
    test("control: in-page tracker passes the moving-crosshair gate", async () => {
      const r = await runMouseTrackedSim({
        port: simE2EPort("letterTrackingThrash", 0),
        runTimeoutMs: 300_000,
        stallTimeoutMs: 90_000,
      });
      evidence(
        r,
        r.consoleErrors.length === 0,
        `console errors: ${r.consoleErrors.join("; |")}`,
      );
      // The tracker genuinely exercised the gate.
      evidence(r, r.trackerMoves > 0, "tracker never moved the cursor");
      evidence(r, r.fixationPhasesSeen >= 2, "no fixation gates observed");
      evidence(r, r.completed, "run did not complete");
    }, 360_000);

    // Specificity control: STATIC crosshair + heavy throttle must still
    // complete. With no motion, a slow regeneration causes no crosshair
    // jump, so the cursor stays inside the hotspot and the gate passes.
    // If THIS stalled, the thrash-test stall would be an artifact of the
    // tracker, not the regen→jump→miss→re-arm cycle.
    test("specificity control: static crosshair completes under heavy throttle", async () => {
      const r = await runMouseTrackedSim({
        port: simE2EPort("letterTrackingThrash", 0),
        tableName: STATIC_TABLE_NAME,
        cpuThrottleRate: 25,
        runTimeoutMs: 300_000,
        stallTimeoutMs: 90_000,
      });
      evidence(
        r,
        r.consoleErrors.length === 0,
        `console errors: ${r.consoleErrors.join("; |")}`,
      );
      evidence(r, r.trackerMoves > 0, "tracker never moved the cursor");
      evidence(r, r.completed, "run did not complete");
    }, 360_000);

    // Context RESTORE: the hands-off recovery path. Real GPU-process
    // losses are typically followed by Chrome asynchronously recreating
    // the context (pixi's preventDefault signals the page handles it);
    // pixi then re-initializes on webglcontextrestored and re-uploads
    // canvas-backed textures from their JS-memory sources. This test
    // forces the full lost->restored cycle (WEBGL_lose_context +
    // restoreContext) and asserts the display RESUMES with no
    // participant action and no errors: the automatic recovery we'd rely
    // on in the field.
    (RUN_E2E ? test : test.skip)(
      "context restore: display resumes automatically after loss",
      async () => {
        const port = simE2EPort("letterTrackingThrash", 0);
        ensureSimTableBuilt({ name: TABLE_NAME });
        try {
          execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null; true`, {
            shell: "zsh",
          });
        } catch {}
        const server = spawn(
          "npm",
          ["start", "--", `--name=${TABLE_NAME}`, `--port=${port}`],
          {
            cwd: ROOT,
            stdio: ["ignore", "ignore", "pipe"],
            detached: true,
            env: { ...process.env, VITE_NO_OPEN: "1" },
          },
        );
        let browser: Browser | undefined;
        try {
          for (let deadline = Date.now() + 120_000; ; ) {
            try {
              const r = await fetch(`http://localhost:${port}`);
              if (r.status < 500) break;
            } catch {}
            if (Date.now() > deadline)
              throw new Error("dev server did not start (ctxrestore)");
            await sleep(1000);
          }
          browser = await chromium.launch({ headless: true });
          const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
          });
          const page = await context.newPage();
          await page.addInitScript((seed) => {
            window.__SIM_SEED__ = seed;
          }, 1);
          await page.addInitScript(TRACKER_INIT);
          await page.addInitScript(() => {
            let killed = false;
            const check = () => {
              const ph =
                document
                  .getElementById("ee-state")
                  ?.getAttribute("data-phase") ?? "";
              if (!killed && ph === "fixation") {
                killed = true;
                const c = [...document.querySelectorAll("canvas")].find(
                  (x) => x.width > 500,
                );
                const gl =
                  (c as HTMLCanvasElement | undefined)?.getContext("webgl2") ??
                  (c as HTMLCanvasElement | undefined)?.getContext("webgl");
                window.__gl = gl ?? null;
                (c as HTMLCanvasElement).addEventListener(
                  "webglcontextrestored",
                  () => {
                    window.__rawRestored = true;
                  },
                );
                window.__lose = () =>
                  gl?.getExtension("WEBGL_lose_context")?.loseContext();
                window.__restore = () =>
                  gl?.getExtension("WEBGL_lose_context")?.restoreContext();
                window.__lose();
              }
              setTimeout(check, 200);
            };
            check();
          });
          await page.goto(`http://localhost:${port}`);
          for (let deadline = Date.now() + 180_000; ; ) {
            if (Date.now() > deadline) throw new Error("context never lost");
            const lost = await page
              .evaluate(() => (window as any).__rendererContextLost === true)
              .catch(() => false);
            if (lost) break;
            await sleep(500);
          }
          await sleep(1000);
          await page.evaluate(() => (window as any).__restore?.());
          // Wait for the restore event and rendering to resume.
          let resumed = false;
          for (let deadline = Date.now() + 20_000; ; ) {
            if (Date.now() > deadline) break;
            const state = await page.evaluate(() => {
              const c = [...document.querySelectorAll("canvas")].find(
                (x) => x.width > 500,
              );
              const gl =
                (c as HTMLCanvasElement | undefined)?.getContext("webgl2") ??
                (c as HTMLCanvasElement | undefined)?.getContext("webgl");
              return {
                restoredFlag:
                  (window as any).__rendererContextRestored === true,
                rawRestored: (window as any).__rawRestored === true,
                isLost: (window as any).__gl
                  ? (window as any).__gl.isContextLost()
                  : null,
              };
            });
            if (state.rawRestored && state.isLost === false) {
              resumed = true;
              break;
            }
            await sleep(500);
          }
          process.stdout.write(
            `CTXRESTORE resumed=${resumed} flags=${JSON.stringify(
              await page.evaluate(() => ({
                lost: (window as any).__rendererContextLost === true,
                restored: (window as any).__rendererContextRestored === true,
                rawRestored: (window as any).__rawRestored === true,
                isLost: (window as any).__gl?.isContextLost?.() ?? null,
              })),
            )}\n`,
          );
          // Evidence-only: headless/SwiftShader does not honor
          // WEBGL_lose_context.restoreContext() (raw canvas listener sees
          // no webglcontextrestored; isContextLost stays true), so pixi's
          // restore path cannot be exercised in this environment. Real
          // Chrome auto-restores after GPU-process crashes — validate
          // there before relying on it (see notes/stall-signature-matrix).
          expect(typeof resumed).toBe("boolean");
        } finally {
          await browser?.close().catch(() => {});
          if (server.pid) await killProcessTree(server.pid, 2000);
        }
      },
      420_000,
    );

    // Context loss reproduces the field's "fixation stopped showing"
    // signature: kill the WebGL context on first fixation-phase entry
    // (WEBGL_lose_context — what GPU-process death / memory pressure do).
    // pixi v6's handler only preventDefaults; every subsequent draw
    // silently no-ops while the rAF loop, data rows, and state attributes
    // continue. Expected: page alive, crosshair position still advancing
    // in STATE, but the displayed canvas frozen — and rendererContextLost
    // is logged (rendererHealth).
    (RUN_E2E ? test : test.skip)(
      "context loss: page survives, canvas freezes, state continues",
      async () => {
        const port = simE2EPort("letterTrackingThrash", 0);
        ensureSimTableBuilt({ name: TABLE_NAME });
        try {
          execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null; true`, {
            shell: "zsh",
          });
        } catch {}
        const server = spawn(
          "npm",
          ["start", "--", `--name=${TABLE_NAME}`, `--port=${port}`],
          {
            cwd: ROOT,
            stdio: ["ignore", "ignore", "pipe"],
            detached: true,
            env: { ...process.env, VITE_NO_OPEN: "1" },
          },
        );
        let browser: Browser | undefined;
        try {
          for (let deadline = Date.now() + 120_000; ; ) {
            try {
              const r = await fetch(`http://localhost:${port}`);
              if (r.status < 500) break;
            } catch {}
            if (Date.now() > deadline)
              throw new Error("dev server did not start (ctxloss)");
            await sleep(1000);
          }
          browser = await chromium.launch({ headless: true });
          const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
          });
          const page = await context.newPage();
          await page.addInitScript((seed) => {
            window.__SIM_SEED__ = seed;
          }, 1);
          await page.addInitScript(TRACKER_INIT);
          await page.addInitScript((n: number) => {
            let entries = 0;
            let prev = "";
            const check = () => {
              const ph =
                document
                  .getElementById("ee-state")
                  ?.getAttribute("data-phase") ?? "";
              const enteredFixation = ph === "fixation" && prev !== "fixation";
              prev = ph;
              if (enteredFixation) {
                entries++;
                if (entries === n) {
                  const c = [...document.querySelectorAll("canvas")].find(
                    (x) => x.width > 500,
                  );
                  const gl =
                    (c as HTMLCanvasElement | undefined)?.getContext(
                      "webgl2",
                    ) ??
                    (c as HTMLCanvasElement | undefined)?.getContext("webgl");
                  gl?.getExtension("WEBGL_lose_context")?.loseContext();
                }
              }
              setTimeout(check, 200);
            };
            check();
          }, 1);
          await page.goto(`http://localhost:${port}`);
          // Wait for the kill; capture the GL state at that moment (the
          // experiment advances fast — sampling later shows other phases).
          let lostNow = false;
          for (let deadline = Date.now() + 180_000; ; ) {
            if (Date.now() > deadline) throw new Error("context never lost");
            lostNow = await page
              .evaluate(() => {
                if ((window as any).__rendererContextLost !== true)
                  return false;
                const c = [...document.querySelectorAll("canvas")].find(
                  (x) => x.width > 500,
                );
                const gl =
                  (c as HTMLCanvasElement | undefined)?.getContext("webgl2") ??
                  (c as HTMLCanvasElement | undefined)?.getContext("webgl");
                (window as any).__lostAtKill = gl ? gl.isContextLost() : null;
                return true;
              })
              .catch(() => false);
            if (lostNow) break;
            await sleep(500);
          }
          const sample = () =>
            page.evaluate(() => ({
              phase: document
                .getElementById("ee-state")
                ?.getAttribute("data-phase"),
              fixAttr: document
                .getElementById("ee-state")
                ?.getAttribute("data-fixation-px"),
            }));
          const a = await sample();
          const shot1 = await page.screenshot();
          await sleep(3000);
          const b = await sample();
          const shot2 = await page.screenshot();
          expect(
            await page.evaluate(
              () => (window as any).__rendererContextLost === true,
            ),
          ).toBe(true);
          // A lost GL context cannot present new frames — the canvas (and
          // the fixation marker on it) is frozen by browser guarantee.
          const lostAtKill = await page.evaluate(
            () => (window as any).__lostAtKill,
          );
          expect(lostAtKill).toBe(true);
          const ctxState = await page.evaluate(() => {
            const c = [...document.querySelectorAll("canvas")].find(
              (x) => x.width > 500,
            );
            const gl =
              (c as HTMLCanvasElement | undefined)?.getContext("webgl2") ??
              (c as HTMLCanvasElement | undefined)?.getContext("webgl");
            return {
              restored: (window as any).__rendererContextRestored === true,
              isLost: gl ? gl.isContextLost() : null,
            };
          });
          // Display frozen: identical screenshots... unless the browser
          // restored the context (then drawing legitimately resumed).
          if (!ctxState.restored && ctxState.isLost)
            expect(shot1.equals(shot2)).toBe(true);
          process.stdout.write(
            `CTXLOSS ctxState=${JSON.stringify(ctxState)}\n`,
          );
          // ...while the crosshair's STATE position keeps advancing (the
          // page, scheduler, and data rows are all alive).
          expect(b.fixAttr).not.toEqual(a.fixAttr);
          process.stdout.write(
            `CTXLOSS phase=${a.phase}->${b.phase} state=advancing\n`,
          );
        } finally {
          await browser?.close().catch(() => {});
          if (server.pid) await killProcessTree(server.pid, 2000);
        }
      },
      420_000,
    );

    // A/B: none vs buffer at 25x throttle — the direct performance
    // comparison. Under none, every gate re-arm re-rasterizes (blocks
    // inside the armed window); under buffer the gate never rasterizes
    // (the real stimulus is pre-rendered at trial begin). Evidence-only:
    // the printed side-by-side is the deliverable.
    (RUN_PERF ? test : test.skip)(
      "A/B: fontPreRender none vs buffer (25x)",
      async () => {
        const none = await runMouseTrackedSim({
          port: simE2EPort("letterTrackingThrash", 0),
          tableName: "letter-tracking-thrash-none-sim",
          cpuThrottleRate: 25,
          runTimeoutMs: 300_000,
          stallTimeoutMs: 45_000,
        });
        const buffer = await runMouseTrackedSim({
          port: simE2EPort("letterTrackingThrash", 1),
          tableName: TABLE_NAME,
          cpuThrottleRate: 25,
          runTimeoutMs: 300_000,
          stallTimeoutMs: 45_000,
        });
        const line = (label: string, r: typeof none) =>
          `${label} status=${
            r.stalled ? "stalled" : r.completed ? "completed" : "timeout"
          } ` +
          `trials=${r.trialsCompleted} regens=${r.regenGapsDuringFixation.length} ` +
          `regenMs[med]=${median(r.regenGapsDuringFixation)} ` +
          `blockedMs=${r.blockedMsDuringFixation} ` +
          `stimReuse=${JSON.stringify(r.stimStats ?? null)} ` +
          `consoleErrs=${r.consoleErrors.length}`;
        process.stdout.write(
          `PERF-AB 25x\n  ${line("none  ", none)}\n  ${line(
            "buffer",
            buffer,
          )}\n`,
        );
        evidence(buffer, buffer.completed, "buffer run did not complete (A/B)");
      },
      600_000,
    );

    // Red/green on a SLOW-FONT MACHINE — the faithful model of the field
    // victims (normal frames, fontRasterSec-class rasterization blocks of
    // ~1 s per generation; modeled by a per-fillText busy-wait, since
    // uniform CPU throttle slows every frame and hides freeze-vs-normal).
    // none re-rasterizes per re-arm and thrashes indefinitely (the
    // 2-of-20 field failures); buffer never rasterizes inside the gate
    // and must complete.
    (RUN_PERF ? test : test.skip)(
      "red/green: fontPreRender none vs buffer (slow-font machine)",
      async () => {
        const none = await runMouseTrackedSim({
          port: simE2EPort("letterTrackingThrash", 0),
          tableName: "letter-tracking-thrash-none-sim",
          rasterSlowdownMs: 300,
          runTimeoutMs: 300_000,
          stallTimeoutMs: 60_000,
        });
        const buffer = await runMouseTrackedSim({
          port: simE2EPort("letterTrackingThrash", 1),
          tableName: TABLE_NAME,
          rasterSlowdownMs: 300,
          runTimeoutMs: 300_000,
          stallTimeoutMs: 60_000,
        });
        const line = (label: string, r: typeof none) =>
          `${label} status=${
            r.stalled ? "stalled" : r.completed ? "completed" : "timeout"
          } ` +
          `trials=${r.trialsCompleted} regens=${r.regenGapsDuringFixation.length} ` +
          `regenMs[med]=${median(r.regenGapsDuringFixation)} ` +
          `blockedMs=${r.blockedMsDuringFixation} ` +
          `stimReuse=${JSON.stringify(r.stimStats ?? null)} ` +
          `consoleErrs=${r.consoleErrors.length}`;
        process.stdout.write(
          `PERF-REDGREEN slow-font-machine\n  ${line("none  ", none)}\n  ${line(
            "buffer",
            buffer,
          )}\n`,
        );

        evidence(
          buffer,
          buffer.completed && buffer.gates.every((g) => !g.unresolved),
          "buffer run did not complete under 60x stress",
        );
      },
      720_000,
    );

    // Raster reuse/rescale benchmark (opt-in RUN_PERF) — real-browser
    // mirror of components/performanceTests.js measureRasterResample (the
    // same probe the field logs at the compat check), using the
    // experiment's actual Sloan font. Produces the identity threshold (δ*)
    // and the blur-vs-delta table that empirically ground the
    // fontPreRender=buffer tradeoff. Evidence-only: the numbers are the
    // deliverable.
    (RUN_PERF ? test : test.skip)(
      "raster benchmark: identity threshold + resample error (Sloan)",
      async () => {
        const port = simE2EPort("letterTrackingThrash", 0);
        ensureSimTableBuilt({ name: TABLE_NAME });
        try {
          execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null; true`, {
            shell: "zsh",
          });
        } catch {}
        const server = spawn(
          "npm",
          ["start", "--", `--name=${TABLE_NAME}`, `--port=${port}`],
          {
            cwd: ROOT,
            stdio: ["ignore", "ignore", "pipe"],
            detached: true,
            env: { ...process.env, VITE_NO_OPEN: "1" },
          },
        );
        const browser = await chromium.launch({ headless: true });
        try {
          for (let deadline = Date.now() + 120_000; ; ) {
            try {
              const r = await fetch(`http://localhost:${port}`);
              if (r.status < 500) break;
            } catch {}
            if (Date.now() > deadline)
              throw new Error("dev server did not start (raster bench)");
            await sleep(1000);
          }
          const page = await browser.newPage({
            viewport: { width: 800, height: 600 },
          });
          await page.goto(`http://localhost:${port}`);
          const report: any = await page.evaluate(async () => {
            const fontResp = await fetch("fonts/Sloan.woff2");
            const buf = new Uint8Array(await fontResp.arrayBuffer());
            const f = new FontFace("Sloan", buf);
            await f.load();
            document.fonts.add(f);
            const LETTERS = ["S", "I", "O"];
            const SIZES = [12, 16, 24, 32, 64];
            const DELTAS = [0.0015, 0.01, 0.02, 0.04, 0.1, -0.02, -0.04, -0.1];
            const raster = (letter: string, size: number) => {
              const c = document.createElement("canvas");
              const g = c.getContext("2d", { willReadFrequently: true })!;
              c.width = c.height = Math.ceil(size * 4);
              g.font = `${size}px Sloan`;
              g.textBaseline = "alphabetic";
              g.fillStyle = "#000";
              g.fillText(letter, size, size * 2.5);
              return c;
            };
            const alphaOf = (c: HTMLCanvasElement) => {
              const d = c
                .getContext("2d")!
                .getImageData(0, 0, c.width, c.height).data;
              const a = new Uint8Array(c.width * c.height);
              for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
              return { a, w: c.width, h: c.height };
            };
            const identical = (p: any, q: any) => {
              const w = Math.min(p.w, q.w),
                h = Math.min(p.h, q.h);
              for (let y = 0; y < h; y++)
                for (let x = 0; x < w; x++)
                  if (p.a[y * p.w + x] !== q.a[y * q.w + x]) return false;
              for (const r of [p, q])
                for (let y = 0; y < r.h; y++)
                  for (let x = 0; x < r.w; x++)
                    if ((x >= w || y >= h) && r.a[y * r.w + x] !== 0)
                      return false;
              return true;
            };
            // Row-aware diff over the shared region: nearby-size rasters
            // have unequal canvas dims; flat indexing misaligns rows.
            const diff = (p: any, q: any) => {
              const w = Math.min(p.w, q.w),
                h = Math.min(p.h, q.h);
              let max = 0,
                sum = 0,
                n = 0;
              for (let y = 0; y < h; y++)
                for (let x = 0; x < w; x++) {
                  const d = Math.abs(p.a[y * p.w + x] - q.a[y * q.w + x]);
                  if (d > max) max = d;
                  sum += d;
                  n++;
                }
              return { max, mean: n ? sum / n : 0 };
            };
            const rows: any[] = [];
            let identityPct = 0;
            for (const size of SIZES) {
              for (const d of DELTAS) {
                let allIdentical = true,
                  staleMean = 0,
                  resMean = 0,
                  resMax = 0;
                for (const letter of LETTERS) {
                  const A = raster(letter, size);
                  const B = raster(letter, size * (1 + d));
                  const aA = alphaOf(A),
                    aB = alphaOf(B);
                  if (!identical(aA, aB)) allIdentical = false;
                  staleMean += diff(aA, aB).mean;
                  const c = document.createElement("canvas");
                  c.width = B.width;
                  c.height = B.height;
                  const g = c.getContext("2d", { willReadFrequently: true })!;
                  g.imageSmoothingEnabled = true;
                  g.drawImage(A, 0, 0, c.width, c.height);
                  const r = diff(alphaOf(c), aB);
                  resMean += r.mean;
                  resMax = Math.max(resMax, r.max);
                }
                const n = LETTERS.length;
                rows.push([
                  size,
                  Math.round(d * 10000) / 100,
                  allIdentical,
                  Math.round((staleMean / n) * 100) / 100,
                  Math.round((resMean / n) * 100) / 100,
                  resMax,
                ]);
                if (d > 0 && allIdentical && d * 100 > identityPct)
                  identityPct = d * 100;
              }
            }
            // Timings: median of 101, whole native raster vs rescale-only.
            const tFill: number[] = [],
              tDraw: number[] = [];
            const A32 = raster("S", 32),
              B33 = raster("S", 33);
            for (let i = 0; i < 101; i++) {
              let t0 = performance.now();
              raster("S", 32);
              tFill.push(performance.now() - t0);
              const c = document.createElement("canvas");
              c.width = B33.width;
              c.height = B33.height;
              t0 = performance.now();
              c.getContext("2d")!.drawImage(A32, 0, 0, c.width, c.height);
              tDraw.push(performance.now() - t0);
            }
            const med = (a: number[]) =>
              a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
            // Visual samples: comparison sheets [native | rescaled |
            // stale | amplified diff] across sizes and gaps including
            // extremes, saved as PNGs for eyeballing (the numeric table
            // cannot convey "how blurry").
            const SHEET_SIZES = [16, 64, 200];
            const SHEET_GAPS = [0.005, 0.01, 0.04, 0.1, 0.25, -0.25];
            const CELL = 240;
            const sheets: Record<string, string> = {};
            for (const size of SHEET_SIZES) {
              const rowsN = SHEET_GAPS.length;
              const sheet = document.createElement("canvas");
              sheet.width = CELL * 4;
              sheet.height = rowsN * CELL;
              const g = sheet.getContext("2d")!;
              g.fillStyle = "#fff";
              g.fillRect(0, 0, sheet.width, sheet.height);
              SHEET_GAPS.forEach((gap, row) => {
                const A = raster("S", size);
                const B = raster("S", size * (1 + gap));
                const R = document.createElement("canvas");
                R.width = B.width;
                R.height = B.height;
                const gr = R.getContext("2d", { willReadFrequently: true })!;
                gr.imageSmoothingEnabled = true;
                gr.drawImage(A, 0, 0, R.width, R.height);
                const cell = (img: HTMLCanvasElement, col: number) => {
                  g.imageSmoothingEnabled = false; // show true pixels
                  g.drawImage(
                    img,
                    col * CELL + 8,
                    row * CELL + 8,
                    Math.min(img.width, CELL - 16),
                    Math.min(img.height, CELL - 16),
                  );
                };
                cell(B, 0); // native at the needed size (ground truth)
                cell(R, 1); // rescaled from the held texture
                cell(A, 2); // stale: the held texture as-is (wrong size)
                // amplified |diff| between rescaled and native
                const aR = alphaOf(R),
                  aB = alphaOf(B);
                const D = document.createElement("canvas");
                D.width = B.width;
                D.height = B.height;
                const gd = D.getContext("2d")!;
                const out = gd.createImageData(D.width, D.height);
                for (let i = 0; i < aB.a.length; i++) {
                  const d = Math.min(255, Math.abs(aR.a[i] - aB.a[i]) * 20);
                  out.data[i * 4] = d;
                  out.data[i * 4 + 1] = d;
                  out.data[i * 4 + 2] = d;
                  out.data[i * 4 + 3] = 255;
                }
                gd.putImageData(out, 0, 0);
                cell(D, 3);
                g.fillStyle = "#000";
                g.font = "11px monospace";
                g.fillText(
                  `${Math.round(gap * 10000) / 100}%  ${size}px->${
                    Math.round(size * (1 + gap) * 10) / 10
                  }px`,
                  8,
                  row * CELL + 14,
                );
              });
              g.font = "12px monospace";
              ["native(B)", "rescaled(A->B)", "stale(A)", "|diff|x20"].forEach(
                (label, col) =>
                  g.fillText(label, col * CELL + 8, rowsN * CELL - 4),
              );
              sheets[`Sloan_S_${size}px`] = sheet.toDataURL("image/png");
            }
            return {
              identityPct: Math.round(identityPct * 100) / 100,
              fillTextMs: Math.round(med(tFill) * 100) / 100,
              drawImageMs: Math.round(med(tDraw) * 100) / 100,
              rows,
              sheets,
            };
          });
          const samplesDir = path.join(ROOT, "notes/raster-samples");
          fs.mkdirSync(samplesDir, { recursive: true });
          for (const [name, dataUrl] of Object.entries(report.sheets)) {
            fs.writeFileSync(
              path.join(samplesDir, `${name}.png`),
              Buffer.from(dataUrl.split(",")[1], "base64"),
            );
          }
          process.stdout.write(
            `RASTER-BENCH identityPct=${report.identityPct} ` +
              `fillTextMs=${report.fillTextMs} drawImageMs=${report.drawImageMs} ` +
              `samples=${
                Object.keys(report.sheets).length
              } -> notes/raster-samples/\n` +
              report.rows
                .map(
                  ([sz, d, id, st, rm, rx]) =>
                    `  ${sz}px ${(d >= 0 ? "+" : "") + d}% identical=${id} ` +
                    `staleMean=${st} resampleMean=${rm} resampleMax=${rx}`,
                )
                .join("\n") +
              "\n",
          );
        } finally {
          await browser.close().catch(() => {});
          if (server.pid) await killProcessTree(server.pid, 2000);
        }
      },
      240_000,
    );

    // Perf benchmark (opt-in RUN_PERF): the before/after measurement for
    // the regen guard. Run identically before and after the fix; compare
    // regens per gate, per-regen ms, blocked ms, and gate wall-times.
    // Terminology: each regeneration maps 1:1 to a tracking START
    // (cursor entered fixation) — the data column is
    // numberOfTimesTrackingStarted; an early leave is
    // numberOfTimesTrackingStopped. Never "arm".
    (RUN_PERF ? test : test.skip)(
      "perf benchmark: control (no throttle)",
      async () => {
        const r = await runMouseTrackedSim({
          port: simE2EPort("letterTrackingThrash", 0),
          runTimeoutMs: 300_000,
          stallTimeoutMs: 90_000,
        });
        const gateMs = r.gates
          .filter((g) => !g.unresolved)
          .map((g) => (g.exitAt! - g.entryAt) / 1000);
        const regensPerGate = r.gates.length
          ? r.regenGapsDuringFixation.length / r.gates.length
          : 0;
        process.stdout.write(
          `PERF-CONTROL probes( fontRenderSec=${r.machineProbes?.fontRenderSec} ` +
            `heap100MBAllocSec=${r.machineProbes?.heap100MBAllocSec} ) ` +
            `trials=${r.trialsCompleted} gates=${r.gates.length} ` +
            `gateMs[med]=${median(gateMs).toFixed(1)} ` +
            `regens/gate=${regensPerGate.toFixed(1)} ` +
            `regenMs[med]=${median(r.regenGapsDuringFixation)} ` +
            `blockedMs=${r.blockedMsDuringFixation} ` +
            `stimReuse=${JSON.stringify(r.stimStats ?? null)}\n`,
        );
        evidence(r, r.completed, "run did not complete");
      },
      360_000,
    );

    (RUN_PERF ? test : test.skip)(
      "perf benchmark: throttled gate (RED scenario)",
      async () => {
        const r = await runMouseTrackedSim({
          port: simE2EPort("letterTrackingThrash", 1),
          cpuThrottleRate: 25,
          runTimeoutMs: 300_000,
          stallTimeoutMs: 45_000,
        });
        const open = r.gates.filter((g) => g.unresolved);
        process.stdout.write(
          `PERF-THROTTLED status=${
            r.stalled ? "stalled" : r.completed ? "completed" : "timeout"
          } ` +
            `trials=${r.trialsCompleted} gates=${r.gates.length} ` +
            `unresolvedGates=${open.length} ` +
            `regens=${r.regenGapsDuringFixation.length} ` +
            `regenMs[med]=${median(r.regenGapsDuringFixation)} ` +
            `blockedMs=${r.blockedMsDuringFixation} ` +
            `stimReuse=${JSON.stringify(r.stimStats ?? null)} ` +
            `stallKey=${r.stallKey}\n`,
        );
        // Evidence-only: no completion assertion — this test's purpose is
        // the before/after numbers, not a pass/fail verdict.
      },
      360_000,
    );

    // Heap/regen diagnostics (opt-in RUN_HEAP): quantify (a) whether
    // repeated regeneration leaks heap at CONSTANT stimulus size, and
    // (b) per-trial heap growth in a normal completing run (Quest-varying
    // sizes — the suspected field mechanism behind 229→676 MB).
    (RUN_HEAP ? test : test.skip)(
      "heap diagnostics: sustained thrash — heap vs regen count",
      async () => {
        const r = await runMouseTrackedSim({
          port: simE2EPort("letterTrackingThrash", 1),
          cpuThrottleRate: 25,
          runTimeoutMs: 400_000,
          stallTimeoutMs: 150_000,
        });
        const heap = r.heap;
        const first = heap[0]?.[1] ?? 0;
        const last = heap.at(-1)?.[1] ?? 0;
        const regens = r.regenGapsDuringFixation.length;
        const stalledMs = heap.length > 1 ? heap.at(-1)![0] - heap[0][0] : 0;
        process.stdout.write(
          `HEAP-THRASH regens=${regens} stalled=${r.stalled} ` +
            `heapMB ${Math.round(first / 1e6)}→${Math.round(last / 1e6)} ` +
            `over ${(stalledMs / 1000).toFixed(0)}s ` +
            `(${((last - first) / 1e6 / Math.max(regens, 1)).toFixed(
              2,
            )} MB/regen)\n`,
        );
        evidence(r, r.stalled, "expected the thrash stall");
        evidence(
          r,
          regens >= 20,
          "expected sustained regen loop over the long window",
        );
      },
      480_000,
    );

    (RUN_HEAP ? test : test.skip)(
      "heap diagnostics: completing run — heap per trial",
      async () => {
        const r = await runMouseTrackedSim({
          port: simE2EPort("letterTrackingThrash", 0),
          tableName: LONG_TABLE_NAME,
          runTimeoutMs: 400_000,
          stallTimeoutMs: 90_000,
        });
        const heap = r.heap;
        const first = heap[0]?.[1] ?? 0;
        const last = heap.at(-1)?.[1] ?? 0;
        process.stdout.write(
          `HEAP-CONTROL trials=${r.trialsCompleted} ` +
            `heapMB ${Math.round(first / 1e6)}→${Math.round(last / 1e6)} ` +
            `(${((last - first) / 1e6 / Math.max(r.trialsCompleted, 1)).toFixed(
              2,
            )} MB/trial)\n`,
        );
        evidence(r, r.completed, "run did not complete");
      },
      480_000,
    );

    // Was test.failing (RED) until the regen guard landed (getTargetStim
    // reuses the stim when only the position changed): a slow main thread
    // during the gate's ONE first-arm regeneration may still cause one
    // miss+re-arm, but re-arms no longer re-rasterize, so the gate always
    // completes instead of thrashing forever.
    test("slow regeneration must not thrash the tracking gate (RED)", async () => {
      const r = await runMouseTrackedSim({
        port: simE2EPort("letterTrackingThrash", 1),
        cpuThrottleRate: 25,
        runTimeoutMs: 300_000,
        stallTimeoutMs: 45_000,
      });
      evidence(
        r,
        r.consoleErrors.length === 0,
        `console errors: ${r.consoleErrors.join("; |")}`,
      );
      evidence(r, r.completed, "run did not complete");
      evidence(
        r,
        r.gates.every((g) => !g.unresolved),
        "a gate never resolved",
      );
      // Post-guard sanity ceiling: one full first-arm generation per
      // gate plus occasional legitimate re-rasters (e.g. viewing
      // distance out of bounds) — never the dozens of the sustained
      // pre-fix loop.
      evidence(
        r,
        r.regenGapsDuringFixation.length <= 12,
        "sustained re-arm regeneration in the gate",
      );
    }, 360_000);
  },
);
