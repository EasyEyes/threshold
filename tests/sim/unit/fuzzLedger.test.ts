import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Ledger } from "../../../server/fuzz/ledger";
import type { GlossarySpec } from "../../../server/fuzz/glossaryAdapter";

const spec: GlossarySpec = {
  version: "1.0",
  params: [
    {
      name: "_seen",
      scope: "global",
      type: "boolean",
      obsolete: false,
      default: "TRUE",
      categories: [],
      example: "",
    },
    {
      name: "_seen",
      scope: "global",
      type: "boolean",
      obsolete: false,
      default: "TRUE",
      categories: [],
      example: "",
    },
    {
      name: "_unfuzzed1",
      scope: "global",
      type: "boolean",
      obsolete: false,
      default: "TRUE",
      categories: [],
      example: "",
    },
    {
      name: "_unfuzzed2",
      scope: "global",
      type: "boolean",
      obsolete: false,
      default: "TRUE",
      categories: [],
      example: "",
    },
  ],
  obsolete: [],
};

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "fuzz-ledger-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("fuzz ledger", () => {
  test("records survive reload; coverage recounted from ledger", () => {
    const l = new Ledger(dir);
    l.appendRecord({
      ts: 1,
      tier: "compiler",
      batch: "b1",
      table: "t1",
      genSeed: 1,
      origin: "tiny.csv",
      outcome: "rejected",
      glossaryVersion: "1.0",
      params: ["_seen", "conditionTrials"],
    });
    const l2 = new Ledger(dir);
    const cov = l2.loadCoverage();
    expect(cov.get("_seen")).toBe(1);
    expect(cov.get("conditionTrials")).toBe(1);
    expect(cov.get("_nope")).toBeUndefined();
  });

  test("findings dedup by signature and count occurrences", () => {
    const l = new Ledger(dir);
    const f1 = l.recordFinding({
      tier: "runtime",
      kind: "runtime-fatal",
      signature: "runtime-fatal|invalid parameter name _tweak",
      glossaryVersion: "1.0",
      tablePath: "fuzz/corpus/x.csv",
      repro: "npm run drill:sim -- x 2",
    });
    expect(f1.filed).toBe(true);
    const f2 = l.recordFinding({
      tier: "runtime",
      kind: "runtime-fatal",
      signature: "runtime-fatal|invalid parameter name _tweak",
      glossaryVersion: "1.0",
      tablePath: "fuzz/corpus/y.csv",
      repro: "npm run drill:sim -- y 2",
    });
    expect(f2.filed).toBe(false); // dedup: same signature
    const folded = new Ledger(dir).loadFindings();
    expect(folded.length).toBe(1);
    expect(folded[0].count).toBe(2);
    expect(folded[0].status).toBe("open");
  });

  test("known issues suppress new findings (substring, case-insensitive)", () => {
    writeFileSync(
      join(dir, "known-issues.json"),
      JSON.stringify([{ pattern: "excludetubetweak", note: "documented bug" }]),
    );
    const l = new Ledger(dir);
    const r = l.recordFinding({
      tier: "runtime",
      kind: "runtime-fatal",
      signature:
        "runtime-fatal|invalid parameter name _calibrateDistanceExcludeTubeTweak",
      glossaryVersion: "31.2",
      tablePath: "fuzz/corpus/z.csv",
      repro: "npm run drill:sim -- z 2",
    });
    expect(r.filed).toBe(false);
    expect(r.suppressed).toBe(true);
  });

  test("report includes batch stats, finding counts, unfuzzed params, and stays capped", () => {
    const l = new Ledger(dir);
    l.appendRecord({
      ts: 1,
      tier: "compiler",
      batch: "b1",
      table: "t1",
      genSeed: 1,
      origin: "tiny.csv",
      outcome: "accepted",
      glossaryVersion: "1.0",
      params: ["_seen"],
    });
    l.recordFinding({
      tier: "compiler",
      kind: "compiler-crash",
      signature: "compiler-crash|x",
      glossaryVersion: "1.0",
      tablePath: "a.csv",
      repro: "npm run fuzz -- compiler --seed 1",
    });
    const report = l.buildReport(spec);
    expect(report).toContain("b1");
    expect(report).toMatch(/finding/i);
    expect(report).toContain("_unfuzzed1");
    expect(report).toContain("_unfuzzed2");
    expect(report.split("\n").length).toBeLessThanOrEqual(80);
  });

  test("ADVERSARIAL: adding a known-issue pattern re-triages an open finding on reload", () => {
    const l = new Ledger(dir);
    const sig = "runtime-fatal|invalid parameter name _futurebug";
    const r1 = l.recordFinding({
      tier: "runtime",
      kind: "runtime-fatal",
      signature: sig,
      glossaryVersion: "1.0",
      tablePath: "fuzz/corpus/x.csv",
      repro: "npm run drill:sim -- x 2",
    });
    expect(r1.filed).toBe(true);
    // Later, the bug is documented and its pattern added to known-issues.
    writeFileSync(
      join(dir, "known-issues.json"),
      JSON.stringify([{ pattern: "_futurebug", note: "now documented" }]),
    );
    const folded = new Ledger(dir).loadFindings();
    expect(folded.find((f) => f.signature === sig)?.status).toBe("known");
  });

  test("ADVERSARIAL: corrupt known-issues.json fails loudly, not silently unsuppressed", () => {
    writeFileSync(join(dir, "known-issues.json"), "{not json");
    const l = new Ledger(dir);
    expect(() => l.isKnown("anything")).toThrow(/known-issues/i);
  });

  test("report with no records still renders", () => {
    const report = new Ledger(dir).buildReport(spec);
    expect(report.length).toBeGreaterThan(0);
  });
});
