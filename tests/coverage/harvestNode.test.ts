/**
 * @jest-environment node
 */

import { expect, describe, test, beforeEach } from "@jest/globals";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import {
  coverageEnabled,
  coverageDirFor,
  writeBrowserCoverage,
} from "../../server/coverage/harvest";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "ee-coverage-"));
});

const counts = (file: string, s: Record<string, number>) => ({
  [file]: {
    path: file,
    statementMap: Object.fromEntries(
      Object.keys(s).map((key) => {
        const [line, column] = key.split(":").map(Number);
        return [
          key,
          {
            start: { line, column },
            end: { line, column: column + 5 },
          },
        ];
      }),
    ),
    s,
    f: {},
    b: {},
  },
});

describe("coverageEnabled", () => {
  test("requires EE_COVERAGE=1", () => {
    expect(coverageEnabled({})).toBe(false);
    expect(coverageEnabled({ EE_COVERAGE: "0" })).toBe(false);
    expect(coverageEnabled({ EE_COVERAGE: "1" })).toBe(true);
  });
});

describe("coverageDirFor", () => {
  test("defaults to <cwd>/coverage/browser and honours an override", () => {
    expect(coverageDirFor("/repo", {})).toBe(
      path.join("/repo", "coverage", "browser"),
    );
    expect(coverageDirFor("/repo", { EE_COVERAGE_DIR: "/tmp/cov" })).toBe(
      "/tmp/cov",
    );
  });
});

describe("writeBrowserCoverage", () => {
  test("merges live and persisted coverage into one dump", () => {
    const out = writeBrowserCoverage(
      dir,
      "demoExperiment",
      counts("/repo/components/a.js", { "1:0": 1 }),
      counts("/repo/components/a.js", { "1:0": 2 }),
    );
    expect(out).not.toBeNull();
    const written = JSON.parse(readFileSync(out!, "utf8"));
    expect(written["/repo/components/a.js"].s["1:0"]).toBe(3);
    expect(existsSync(out!)).toBe(true);
    expect(path.basename(out!)).toMatch(/^browser-demoExperiment-\d+\.json$/);
  });

  test("writes nothing when there is no coverage to record", () => {
    expect(writeBrowserCoverage(dir, "demo", {}, {})).toBeNull();
  });

  test("cleans up its temp dir", () => {
    rmSync(dir, { recursive: true, force: true });
    expect(existsSync(dir)).toBe(false);
  });
});
