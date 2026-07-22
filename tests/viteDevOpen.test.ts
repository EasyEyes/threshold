/**
 * Source invariant: the vite dev server must not open the user's browser
 * when VITE_NO_OPEN is set.
 *
 * The sim/e2e harness spawns `npm start` (vite) and drives its own headless
 * Chromium. With a hardcoded `open: true`, every sim/e2e run hijacked a tab
 * in the user's default browser. simulate.ts already sets VITE_NO_OPEN=1 —
 * the config must honor it.
 *
 * @jest-environment node
 */

import * as fs from "fs";
import * as path from "path";
import { expect, describe, test } from "@jest/globals";

describe("vite.config.mjs — dev server open behavior", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../vite.config.mjs"),
    "utf8",
  );

  test("no hardcoded `open: true` (must be gated on VITE_NO_OPEN)", () => {
    expect(src).not.toMatch(/open:\s*true/);
  });

  test("open is gated on VITE_NO_OPEN", () => {
    expect(src).toMatch(/open:\s*!process\.env\.VITE_NO_OPEN/);
  });
});
