/**
 * @jest-environment node
 *
 * Stim-lifecycle memory regression: per-trial stim recreation must not
 * accumulate GPU state. Every trialRoutineBegin recreates the marking stims
 * (markDot Dot, markGrid BackGrid, markFlies Swarm — markDot's default spec
 * creates a Dot per trial) and getTargetStim replaces the letter stims; a
 * memory baseline measured +1 geometry and
 * +2 GPU buffers per trial, never disposed, because the replaced stims were
 * only undrawn. pixi keeps every rendered geometry in
 * GeometrySystem.managedGeometries / BufferSystem.managedBuffers until an
 * explicit destroy — so the count of managed geometries is the leak signal.
 *
 * Opt-in: RUN_E2E=1 npx jest stimLifecycle
 */

import { expect, describe, test } from "@jest/globals";
import { execSync, spawn } from "node:child_process";
import { chromium, type Browser } from "playwright";
import { ensureSimTableBuilt } from "./helpers/runSimTable";
import { experimentIndexUrl, killProcessTree } from "../../../server/simulate";
import { simE2EPort } from "./helpers/ports";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE = "letter-geom-growth-sim";
const ROOT = process.cwd();
const PORT = simE2EPort("stimLifecycle", 0);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Managed-geometry/buffer/texture counts, read from the live renderer. */
const COUNTS = `(() => {
  const r = window.__eePsychoJS?.window?._renderer;
  if (!r) return null;
  return {
    geometries: Object.keys(r.geometry?.managedGeometries ?? {}).length,
    buffers: Object.keys(r.buffer?.managedBuffers ?? {}).length,
    textures: (r.texture?.managedTextures ?? []).length,
  };
})()`;

(RUN_E2E ? describe : describe.skip)(
  "stim lifecycle must not accumulate GPU state (e2e)",
  () => {
    test("managed geometries stay flat across blocks", async () => {
      ensureSimTableBuilt({ name: TABLE });
      try {
        execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null; true`, {
          shell: "zsh",
        });
      } catch {}

      const server = spawn(
        "npm",
        ["start", "--", `--name=${TABLE}`, `--port=${PORT}`],
        {
          cwd: ROOT,
          stdio: ["ignore", "ignore", "pipe"],
          detached: true,
          env: { ...process.env, VITE_NO_OPEN: "1" },
        },
      );
      let browser: Browser | undefined;
      try {
        const deadline = Date.now() + 120_000;
        for (;;) {
          try {
            const r = await fetch(`http://localhost:${PORT}`);
            if (r.status < 500) break;
          } catch {}
          if (Date.now() > deadline) throw new Error("dev server not up");
          await sleep(1000);
        }

        browser = await chromium.launch({
          headless: true,
          args: ["--enable-precise-memory-info"],
        });
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
        });
        await context.addInitScript("window.__SIM_SEED__ = 1");
        const page = await context.newPage();
        await page.goto(experimentIndexUrl(PORT, TABLE), {
          waitUntil: "domcontentloaded",
          timeout: 120_000,
        });

        // Sample the renderer's managed-geometry count at every block
        // boundary; the per-trial stims must be disposed, not accumulated.
        const perBlock: { block: string; counts: number[] }[] = [];
        const t0 = Date.now();
        let lastBlock = "";
        while (Date.now() - t0 < 300_000) {
          const state: { block: string; phase: string } = await page.evaluate(
            "(() => { const e = document.getElementById('ee-state'); " +
              "return { block: e?.getAttribute('data-block') ?? '', " +
              "phase: e?.getAttribute('data-phase') ?? '' }; })()",
          );
          if (
            state.block &&
            state.block !== lastBlock &&
            !["loading", "compatibility"].includes(state.phase)
          ) {
            lastBlock = state.block;
            const c = await page.evaluate(COUNTS);
            if (c) perBlock.push({ block: state.block, counts: c });
            if (perBlock.length >= 4) break;
          }
          if (state.phase === "complete" || state.phase === "debrief") break;
          await sleep(400);
        }

        expect(perBlock.length).toBeGreaterThanOrEqual(3);
        const first = perBlock[0].counts;
        const last = perBlock.at(-1)!.counts;
        process.stdout.write(`GEOM-COUNTS ${JSON.stringify(perBlock)}\n`);
        // Before the fix: +1 geometry and +2 buffers per trial (~+15 over
        // 3 blocks x 5 trials). After: recreation disposes as it replaces.
        expect(last.geometries - first.geometries).toBeLessThanOrEqual(2);
        expect(last.buffers - first.buffers).toBeLessThanOrEqual(4);
      } finally {
        await browser?.close();
        try {
          if (server.pid) await killProcessTree(server.pid, 2000);
        } catch {}
      }
    }, 420_000);
  },
);
