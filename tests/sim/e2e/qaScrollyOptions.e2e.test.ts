/**
 * @jest-environment node
 *
 * A Q&A CHOICE question with more options than fit the viewport (the field
 * shape of Compare3Languages' birth-year question: 86 options, popup 5448px
 * tall on a 720px viewport) must present a list that scrolls INSIDE the
 * modal. Before the fix, .swal2-radio had no height cap: the popup grew past
 * the screen, the only scroll path was the fixed swal2 container (inert for
 * real participants — field: 27/73 sessions wedged at block-1 onset, and
 * completers' birth-year answers collapsed onto the ~12 visible years).
 *
 * RED on the unfixed CSS: .swal2-radio is not a scroll container
 * (clientHeight == scrollHeight) and the last option stays unreachable.
 * GREEN: the list scrolls within the modal (last option hittable after
 * scrollTop; a visible option is hittable before scrolling).
 *
 * OFF by default; opt in with RUN_E2E=1 (spawns a dev server + browser).
 */

import {
  jest,
  expect,
  describe,
  test,
  beforeAll,
  afterAll,
} from "@jest/globals";
import { spawn, spawnSync, ChildProcess } from "child_process";
import { existsSync, statSync, readFileSync } from "fs";
import * as path from "path";
import { chromium } from "@playwright/test";

const RUN_E2E = process.env.RUN_E2E === "1";
// The field table itself: its block-1 birth-year question (86 options) is
// the exact shape under test. Sim build (the table lives in examples/tables;
// rebuilt when missing or older than the table).
const TABLE_NAME = "Compare3Languages";
const PORT = 5661;
const ROOT = process.cwd();

const ensureSimBuild = () => {
  const built = path.join(
    ROOT,
    "examples",
    "generated",
    TABLE_NAME,
    "index.html",
  );
  const table = path.join(ROOT, "examples", "tables", `${TABLE_NAME}.xlsx`);
  // A manual (non-sim) rebuild of the same table satisfies the mtime check
  // but strands the simulated participant at the welcome screen; require the
  // sim marker too.
  const blockCsv = path.join(
    ROOT,
    "examples",
    "generated",
    TABLE_NAME,
    "conditions",
    "block_1.csv",
  );
  const isSimBuild =
    existsSync(blockCsv) &&
    readFileSync(blockCsv, "utf8").includes("simulateParticipantBool");
  if (
    isSimBuild &&
    existsSync(built) &&
    existsSync(table) &&
    statSync(built).mtimeMs > statSync(table).mtimeMs
  )
    return;
  const r = spawnSync(
    "npx",
    ["ts-node", "buildExamples.ts", `${TABLE_NAME}.xlsx`, "--simulate"],
    { cwd: path.join(ROOT, "examples"), stdio: "pipe", timeout: 120_000 },
  );
  if (r.status !== 0)
    throw new Error(
      "build failed: " + (r.stderr?.toString() ?? "").slice(0, 300),
    );
};

const pollUrl = async (url: string, everyMs: number, timeoutMs: number) => {
  const t0 = Date.now();
  for (;;) {
    try {
      const r = await fetch(url, { method: "HEAD" });
      if (r.ok) return;
    } catch {}
    if (Date.now() - t0 > timeoutMs)
      throw new Error(`server not ready: ${url}`);
    await new Promise((r) => setTimeout(r, everyMs));
  }
};

/** Freeze the first big Q&A modal open: swallow the auto-submit confirm
 * click only while a long radio list is on screen, so layout can be
 * inspected (the simulated participant otherwise answers in <1s). */
const FREEZE_BIG_MODAL = `
  const origClick = HTMLButtonElement.prototype.click;
  HTMLButtonElement.prototype.click = function (...a) {
    if (this.classList.contains("swal2-confirm") &&
        document.querySelectorAll(".swal2-radio label").length >= 20) {
      window.__frozen = true;
      return;
    }
    return origClick.apply(this, a);
  };
`;

(RUN_E2E ? describe : describe.skip)(
  "Q&A options list scrolls inside the modal",
  () => {
    let server: ChildProcess;
    let browser: any;
    let page: any;

    beforeAll(async () => {
      ensureSimBuild();
      server = spawn(
        "npm",
        ["start", "--", `--name=${TABLE_NAME}`, `--port=${PORT}`],
        {
          stdio: ["ignore", "ignore", "ignore"],
          detached: true,
          cwd: ROOT,
          env: { ...process.env, VITE_NO_OPEN: "1" },
        },
      );
      await pollUrl(`http://localhost:${PORT}`, 200, 60000);
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      await context.addInitScript((s: number) => {
        (window as any).__SIM_SEED__ = s;
      }, 1);
      await context.addInitScript(FREEZE_BIG_MODAL);
      page = await context.newPage();
      await page.goto(
        `http://localhost:${PORT}/examples/generated/${TABLE_NAME}/index.html?participant=scrolly&session=1`,
        { waitUntil: "commit" },
      );
      // The birth-year-shaped modal: a long radio list.
      await page.waitForFunction(
        `document.querySelectorAll(".swal2-radio label").length >= 20`,
        null,
        { timeout: 90000, polling: 300 },
      );
      await page.waitForTimeout(800); // layout settle
    }, 180000);

    afterAll(async () => {
      try {
        await browser?.close();
      } catch {}
      try {
        if (server?.pid) process.kill(-server.pid, "SIGKILL");
      } catch {}
    });

    const metrics = () =>
      page.evaluate(`(() => {
        const radio = document.querySelector(".swal2-radio");
        const pop = document.querySelector(".swal2-popup");
        const labels = [...document.querySelectorAll(".swal2-radio label")];
        const vis = (el) => { const b = el.getBoundingClientRect();
          return b.width > 0 && b.height > 0 && b.top >= 0 && b.bottom <= innerHeight; };
        const hittable = (el) => { const b = el.getBoundingClientRect();
          const at = document.elementFromPoint(b.x + b.width/2, b.y + b.height/2);
          return !!at && (el === at || el.contains(at) || at.contains(el)); };
        const popupB = pop.getBoundingClientRect();
        const out = {
          popupHeight: Math.round(popupB.height),
          viewportHeight: innerHeight,
          radioClientH: radio.clientHeight,
          radioScrollH: radio.scrollHeight,
          isScrollContainer: radio.scrollHeight > radio.clientHeight,
          nOptions: labels.length,
          visibleBefore: labels.filter(vis).length,
          hittableBefore: labels.filter(hittable).length,
          lastVisibleBefore: vis(labels[labels.length-1]),
        };
        // simulate in-modal scroll
        radio.scrollTop = radio.scrollHeight;
        out.lastVisibleAfterScroll = vis(labels[labels.length-1]);
        out.lastHittableAfterScroll = hittable(labels[labels.length-1]);
        return out;
      })()`);

    test("the popup does not grow past the viewport", async () => {
      const m = await metrics();
      expect(m.popupHeight).toBeLessThanOrEqual(m.viewportHeight);
    });

    test("the options list is a scroll container inside the modal", async () => {
      const m = await metrics();
      expect(m.radioScrollH).toBeGreaterThan(m.radioClientH);
    });

    test("scrolling the list makes the last option reachable", async () => {
      const m = await metrics();
      expect(m.nOptions).toBeGreaterThanOrEqual(20);
      expect(m.lastVisibleAfterScroll).toBe(true);
      expect(m.lastHittableAfterScroll).toBe(true);
    });

    test("some option is hittable without scrolling", async () => {
      const m = await metrics();
      expect(m.hittableBefore).toBeGreaterThan(0);
    });
  },
);
