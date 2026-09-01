/**
 * Wiring guard: every trials-loop handler (TrialHandler + MultiStairHandler)
 * must derive a PER-BLOCK seed — handlerSeed(`trials-b${status.block}`) — so
 * multi-block runs don't replay identical condition interleavings in every
 * block. A bare handlerSeed("trials") compiles and runs fine, which is
 * exactly why it needs a source-level guard (style: resultsCsvShape e2e).
 */
import { readFileSync } from "fs";
import * as path from "path";
import { expect, describe, test } from "@jest/globals";

const SRC = readFileSync(path.join(process.cwd(), "threshold.js"), "utf8");

describe("trials handler seeds are block-scoped", () => {
  test('no bare (block-invariant) handlerSeed("trials") at constructions', () => {
    expect(SRC).not.toMatch(/seed: handlerSeed\("trials"\),/);
    expect(SRC).not.toMatch(/randomSeed: handlerSeed\("trials"\),/);
  });

  test("handler seeds include the block number", () => {
    const wired = SRC.match(/handlerSeed\(`trials-b\$\{status\.block\}`\)/g);
    expect(wired?.length ?? 0).toBeGreaterThanOrEqual(10);
  });
});
