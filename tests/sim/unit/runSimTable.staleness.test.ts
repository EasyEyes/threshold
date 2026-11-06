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

import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  utimesSync,
  readFileSync,
} from "fs";
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

const makeSimBuild = (at = T1, simulateValues = ["TRUE"]) => {
  const idx = make(examplesDir, "generated/mytable/index.html");
  touch(idx, at);
  simulateValues.forEach((value, i) => {
    const block = make(
      examplesDir,
      `generated/mytable/conditions/block_${i + 1}.csv`,
      `simulateParticipantBool,block\n${value},${i + 1}\n`,
    );
    touch(block, at);
  });
  return idx;
};

beforeEach(() => {
  assetsDir = mkdtempSync(path.join(tmpdir(), "sim-assets-"));
  examplesDir = mkdtempSync(path.join(tmpdir(), "sim-examples-"));
});

const roots = () => ({ assetsDir, examplesDir, buildInputs: [] });

describe("ensureSimTableBuilt runner", () => {
  test("uses tsx for fresh and stale sim builds", () => {
    const source = readFileSync(
      path.join(__dirname, "../e2e/helpers/runSimTable.ts"),
      "utf8",
    );
    expect(source).toContain('["tsx", "buildExamples.ts"');
    expect(source).not.toContain('["ts-node", "buildExamples.ts"');
  });
});

describe("sim suite build ownership", () => {
  test.each([
    "smoke.e2e.test.ts",
    "c3lFullRun.e2e.test.ts",
    "likertWedge.e2e.test.ts",
    "qaScrollyOptions.e2e.test.ts",
  ])("%s uses the shared builder", (file) => {
    const source = readFileSync(path.join(__dirname, "../e2e", file), "utf8");
    expect(source).toContain("ensureSimTableBuilt");
    expect(source).not.toContain('"ts-node"');
  });
});

describe("isSimBuildStale", () => {
  test("stale when no built index.html exists", () => {
    make(assetsDir, "mytable.csv");
    expect(isSimBuildStale({ name: "mytable" }, roots())).toBe(true);
  });

  test("fresh when index.html is newer than the asset CSV and resources", () => {
    const csv = make(assetsDir, "mytable.csv");
    const res = make(assetsDir, "texts/corpus.txt");
    const idx = makeSimBuild(T1);
    touch(csv, T0);
    touch(res, T0);
    expect(isSimBuildStale({ name: "mytable" }, roots())).toBe(false);
  });

  test("stale when the asset CSV is newer than the built index.html", () => {
    const csv = make(assetsDir, "mytable.csv");
    const idx = makeSimBuild(T1);
    touch(csv, T2); // edited after the last build
    expect(isSimBuildStale({ name: "mytable" }, roots())).toBe(true);
  });

  test("stale when a resource file is newer than the built index.html", () => {
    const csv = make(assetsDir, "mytable.csv");
    const res = make(assetsDir, "texts/corpus.txt");
    const idx = makeSimBuild(T1);
    touch(csv, T0);
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

  test("stale when a compiler/simulation build input is newer", () => {
    const csv = make(assetsDir, "mytable.csv");
    makeSimBuild(T1);
    const input = make(examplesDir, "build/simulateInject.ts");
    touch(csv, T0);
    touch(input, T2);
    expect(
      isSimBuildStale(
        { name: "mytable" },
        { ...roots(), buildInputs: [input] },
      ),
    ).toBe(true);
  });

  test("fresh when every build input is older than the sim build", () => {
    const csv = make(assetsDir, "mytable.csv");
    makeSimBuild(T1);
    const input = make(examplesDir, "build/simulateInject.ts");
    touch(csv, T0);
    touch(input, T0);
    expect(
      isSimBuildStale(
        { name: "mytable" },
        { ...roots(), buildInputs: [input] },
      ),
    ).toBe(false);
  });

  test("stale when cached output has simulation disabled", () => {
    const csv = make(assetsDir, "mytable.csv");
    makeSimBuild(T1, ["FALSE"]);
    touch(csv, T0);
    expect(isSimBuildStale({ name: "mytable" }, roots())).toBe(true);
  });

  test("stale when any condition disables simulation", () => {
    const csv = make(assetsDir, "mytable.csv");
    makeSimBuild(T1, ["TRUE", "FALSE"]);
    touch(csv, T0);
    expect(isSimBuildStale({ name: "mytable" }, roots())).toBe(true);
  });

  test("uses an existing XLSX table as a staleness input", () => {
    const table = make(examplesDir, "tables/mytable.xlsx");
    makeSimBuild(T1);
    touch(table, T2);
    expect(
      isSimBuildStale(
        {
          name: "mytable",
          tableFile: "mytable.xlsx",
          copyTable: false,
        },
        roots(),
      ),
    ).toBe(true);
  });

  test("accepts a fresh sim build from an existing XLSX table", () => {
    const table = make(examplesDir, "tables/mytable.xlsx");
    makeSimBuild(T1);
    touch(table, T0);
    expect(
      isSimBuildStale(
        {
          name: "mytable",
          tableFile: "mytable.xlsx",
          copyTable: false,
        },
        roots(),
      ),
    ).toBe(false);
  });
});
