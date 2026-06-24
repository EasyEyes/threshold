/**
 * Unit tests for server/simulate.ts helpers (argv parsing, JSONL path).
 *
 * Does NOT spin up the dev server or browser — those are integration concerns.
 *
 * @jest-environment node
 */

import {
  simulate,
  parseArgs,
  jsonlPathFor,
  type SimulateResult,
} from "../../../server/simulate";

describe("simulate module surface", () => {
  it("exports simulate() as a function", () => {
    expect(typeof simulate).toBe("function");
  });
});

describe("parseArgs", () => {
  it("parses single experiment name into experimentNames array", () => {
    const a = parseArgs(["node", "simulate.cli.ts", "myExp"]);
    expect(a.experimentNames).toEqual(["myExp"]);
  });

  it("defaults experimentNames to empty array (CLI errors on empty)", () => {
    const a = parseArgs(["node", "simulate.cli.ts"]);
    expect(a.experimentNames).toEqual([]);
  });

  it("parses multiple experiment names as experimentNames array", () => {
    const a = parseArgs(["node", "simulate.cli.ts", "expA", "expB", "expC"]);
    expect(a.experimentNames).toEqual(["expA", "expB", "expC"]);
  });

  it("strips .csv suffix from each table name", () => {
    const a = parseArgs([
      "node",
      "simulate.cli.ts",
      "expA.csv",
      "expB",
      "expC.csv",
    ]);
    expect(a.experimentNames).toEqual(["expA", "expB", "expC"]);
  });

  it("defaults headless=true, seed=1, json=false, screenshots=false", () => {
    const a = parseArgs(["node", "simulate.cli.ts", "exp"]);
    expect(a.headless).toBe(true);
    expect(a.seed).toBe(1);
    expect(a.json).toBe(false);
    expect(a.screenshots).toBe(false);
  });

  it("parses --seed=N", () => {
    const a = parseArgs(["node", "simulate.cli.ts", "exp", "--seed=42"]);
    expect(a.seed).toBe(42);
  });

  it("parses --port=N", () => {
    const a = parseArgs(["node", "simulate.cli.ts", "exp", "--port=6000"]);
    expect(a.port).toBe(6000);
  });

  it("parses --no-headless to disable headless", () => {
    const a = parseArgs(["node", "simulate.cli.ts", "exp", "--no-headless"]);
    expect(a.headless).toBe(false);
  });

  it("parses --headless to enable headless", () => {
    const a = parseArgs(["node", "simulate.cli.ts", "exp", "--headless"]);
    expect(a.headless).toBe(true);
  });

  it("parses --json, --screenshots, --interactive as booleans", () => {
    const a = parseArgs([
      "node",
      "simulate.cli.ts",
      "exp",
      "--json",
      "--screenshots",
      "--interactive",
    ]);
    expect(a.json).toBe(true);
    expect(a.screenshots).toBe(true);
    expect(a.interactive).toBe(true);
  });

  it("parses --stuck-timeout-ms=N", () => {
    const a = parseArgs([
      "node",
      "simulate.cli.ts",
      "exp",
      "--stuck-timeout-ms=45000",
    ]);
    expect(a.stuckTimeoutMs).toBe(45000);
  });

  it("parses --jobs=N for parallel cap", () => {
    const a = parseArgs([
      "node",
      "simulate.cli.ts",
      "expA",
      "expB",
      "--jobs=2",
    ]);
    expect(a.jobs).toBe(2);
  });

  it("defaults jobs to 4 (parallel-by-default, capped for resource use)", () => {
    const a = parseArgs(["node", "simulate.cli.ts", "exp"]);
    expect(a.jobs).toBe(4);
  });

  it("parses --no-build to skip auto-build phase", () => {
    const a = parseArgs(["node", "simulate.cli.ts", "exp", "--no-build"]);
    expect(a.noBuild).toBe(true);
  });

  it("defaults noBuild=false (auto-build is on by default)", () => {
    const a = parseArgs(["node", "simulate.cli.ts", "exp"]);
    expect(a.noBuild).toBe(false);
  });

  it("parses --fail-on-warnings", () => {
    const a = parseArgs([
      "node",
      "simulate.cli.ts",
      "exp",
      "--fail-on-warnings",
    ]);
    expect(a.failOnWarnings).toBe(true);
  });

  it("defaults failOnWarnings=false", () => {
    const a = parseArgs(["node", "simulate.cli.ts", "exp"]);
    expect(a.failOnWarnings).toBe(false);
  });
});

describe("jsonlPathFor", () => {
  it("produces easyeyes-sim/<name>/events-<seed>.jsonl in OS tmp", () => {
    const p = jsonlPathFor("myExp", 42);
    expect(p).toMatch(/easyeyes-sim\/myExp\/events-42\.jsonl$/);
  });

  it("seed=1 by default", () => {
    const p = jsonlPathFor("y", 1);
    expect(p.endsWith("events-1.jsonl")).toBe(true);
  });

  it("different seeds produce different paths", () => {
    const p1 = jsonlPathFor("e", 1);
    const p2 = jsonlPathFor("e", 2);
    expect(p1).not.toBe(p2);
  });

  it("different experiments produce different paths", () => {
    const p1 = jsonlPathFor("exp1", 1);
    const p2 = jsonlPathFor("exp2", 1);
    expect(p1).not.toBe(p2);
  });
});

describe("SimulateResult contract", () => {
  it("has the documented required fields", () => {
    const result: SimulateResult = {
      status: "completed",
      trialsCompleted: 10,
      trialsTotal: 10,
      responseStrategy: "typed",
      consoleErrors: [],
      sweetAlertPopups: [],
      warnings: [],
      seed: 1,
      durationMs: 5000,
    };
    expect(result.status).toBe("completed");
    expect(result.seed).toBe(1);
    expect(typeof result.durationMs).toBe("number");
  });

  it("status is one of completed|failed|incomplete", () => {
    const valid: SimulateResult["status"][] = [
      "completed",
      "failed",
      "incomplete",
    ];
    const r: SimulateResult = {
      status: "incomplete",
      trialsCompleted: 0,
      trialsTotal: 0,
      responseStrategy: "typed",
      consoleErrors: [],
      sweetAlertPopups: [],
      warnings: [],
      seed: 1,
      durationMs: 0,
    };
    expect(valid).toContain(r.status);
  });

  it("responseStrategy is one of typed|clicked|keypad", () => {
    const valid: SimulateResult["responseStrategy"][] = [
      "typed",
      "clicked",
      "keypad",
    ];
    const r: SimulateResult = {
      status: "completed",
      trialsCompleted: 1,
      trialsTotal: 1,
      responseStrategy: "clicked",
      consoleErrors: [],
      sweetAlertPopups: [],
      warnings: [],
      seed: 1,
      durationMs: 100,
    };
    expect(valid).toContain(r.responseStrategy);
  });
});
