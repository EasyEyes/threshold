/**
 * Process-tree cleanup for sim-spawned dev servers.
 *
 * The sim/e2e harness spawns `npm start` (npm → start.mjs → npx → vite).
 * Killing only the direct child (`server.kill()`) orphans the grandchildren —
 * detached Vite servers accumulated and squatted on port 5500, hijacking
 * `localhost:5500` from the compiler's webpack-dev-server (IPv6 [::1] won
 * localhost resolution).
 *
 * These tests assert the DESIRED behavior: cleanup kills the whole process
 * group, escalating to SIGKILL for SIGTERM-resistant children.
 *
 * @jest-environment node
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { expect, describe, test, afterEach } from "@jest/globals";
import { killProcessTree } from "../server/simulate";

/** Does any process in pid's process group still exist? */
const groupAlive = (pid: number): boolean => {
  try {
    process.kill(-pid, 0);
    return true;
  } catch {
    return false;
  }
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Track spawned trees so a failing assertion can't leak sleeps (which keep
// Jest's event loop alive) — the very class of bug this suite guards.
const spawnedPids: number[] = [];
afterEach(async () => {
  for (const pid of spawnedPids.splice(0)) await killProcessTree(pid);
});

describe("killProcessTree", () => {
  test("kills the entire process group, not just the direct child", async () => {
    // Group leader (sh) with a background child — mimics npm → vite.
    const child = spawn("sh", ["-c", "sleep 300 & exec sleep 300"], {
      detached: true,
      stdio: "ignore",
    });
    const pid = child.pid!;
    spawnedPids.push(pid);
    await sleep(300); // let the grandchild spawn
    expect(groupAlive(pid)).toBe(true);

    await killProcessTree(pid);

    // The whole group — leader AND orphaned-grandchild-to-be — must be gone.
    expect(groupAlive(pid)).toBe(false);
  });

  test("escalates to SIGKILL when children ignore SIGTERM", async () => {
    const child = spawn(
      "node",
      [
        "-e",
        "process.on('SIGTERM',()=>{});require('child_process').spawn('sleep',['300']);setInterval(()=>{},1000)",
      ],
      { detached: true, stdio: "ignore" },
    );
    const pid = child.pid!;
    spawnedPids.push(pid);
    await sleep(400);
    expect(groupAlive(pid)).toBe(true);

    await killProcessTree(pid, { graceMs: 500 });

    expect(groupAlive(pid)).toBe(false);
  }, 15000);

  test("is a no-op when the group is already gone", async () => {
    const child = spawn("sleep", ["0.1"], { detached: true, stdio: "ignore" });
    const pid = child.pid!;
    spawnedPids.push(pid);
    await sleep(500);
    expect(groupAlive(pid)).toBe(false);
    await expect(killProcessTree(pid)).resolves.toBeUndefined();
  });
});

describe("simulate.ts — dev-server spawn invariants", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../server/simulate.ts"),
    "utf8",
  );

  test("dev server spawned detached (own process group)", () => {
    expect(src).toMatch(/detached:\s*true/);
  });

  test("cleanup uses killProcessTree, not bare server.kill()", () => {
    expect(src).not.toMatch(/^\s*server\.kill\(\)/m);
  });
});
