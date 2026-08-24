/**
 * Staleness detection for cached sim builds (helpers/runSimTable.ts).
 *
 * Editing a sim asset CSV (or resource) during a RED-GREEN loop must force a
 * rebuild on the next runSimTable call — a stale cached build would silently
 * run the old table. Freshness = built index.html is at least as new as the
 * asset CSV and every copied resource.
 *
 * @jest-environment node
 */

import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from "fs";
import { tmpdir } from "os";
import * as path from "path";
import { isSimBuildStale } from "../e2e/helpers/runSimTable";

const T0 = new Date("2026-01-01T00:00:00Z");
const T1 = new Date("2026-01-02T00:00:00Z");
const T2 = new Date("2026-01-03T00:00:00Z");

let assetsDir: string;
let examplesDir: string;

const touch = (p: string, at: Date) => utimesSync(p, at, at);
const make = (root: string, rel: string, content = "x") => {
  const p = path.join(root, rel);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, content);
  return p;
};

beforeEach(() => {
  assetsDir = mkdtempSync(path.join(tmpdir(), "sim-assets-"));
  examplesDir = mkdtempSync(path.join(tmpdir(), "sim-examples-"));
});

const roots = () => ({ assetsDir, examplesDir });

describe("isSimBuildStale", () => {
  test("stale when no built index.html exists", () => {
    make(assetsDir, "mytable.csv");
    expect(isSimBuildStale({ name: "mytable" }, roots())).toBe(true);
  });

  test("fresh when index.html is newer than the asset CSV and resources", () => {
    const csv = make(assetsDir, "mytable.csv");
    const res = make(assetsDir, "texts/corpus.txt");
    const idx = make(examplesDir, "generated/mytable/index.html");
    touch(csv, T0);
    touch(res, T0);
    touch(idx, T1);
    expect(isSimBuildStale({ name: "mytable" }, roots())).toBe(false);
  });

  test("stale when the asset CSV is newer than the built index.html", () => {
    const csv = make(assetsDir, "mytable.csv");
    const idx = make(examplesDir, "generated/mytable/index.html");
    touch(idx, T1);
    touch(csv, T2); // edited after the last build
    expect(isSimBuildStale({ name: "mytable" }, roots())).toBe(true);
  });

  test("stale when a resource file is newer than the built index.html", () => {
    const csv = make(assetsDir, "mytable.csv");
    const res = make(assetsDir, "texts/corpus.txt");
    const idx = make(examplesDir, "generated/mytable/index.html");
    touch(csv, T0);
    touch(idx, T1);
    touch(res, T2); // resource edited after the last build
    expect(
      isSimBuildStale(
        {
          name: "mytable",
          resources: [{ from: "texts/corpus.txt", to: "texts/corpus.txt" }],
        },
        roots(),
      ),
    ).toBe(true);
  });
});
