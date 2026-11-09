/**
 * Source contracts for the unload-save resilience fixes (the 25 unexplained
 * incompletes, Acuity24Fonts5-12):
 *
 * 1. ServerManager's synchronous (page-closing) upload must route through
 *    the beacon→sync-XHR fallback, never a bare navigator.sendBeacon whose
 *    over-quota refusal silently drops the whole results file.
 * 2. threshold must run the periodic partial-save scheduler (honoring
 *    _pavloviaSavePartialResultsBool), and quitPsychoJS must stop it before
 *    the final save, so the final upload is always the last one.
 */

import { readFileSync } from "fs";
import path from "path";
import { describe, expect, test } from "@jest/globals";
import { ExperimentHandler } from "../psychojs/src/data/ExperimentHandler";

const ROOT = path.join(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("close-time upload resilience wiring", () => {
  test("threshold starts the partial-save scheduler (gated on _pavloviaSavePartialResultsBool)", () => {
    const src = read("threshold.js");
    expect(src).toMatch(/startPartialSaveScheduler\(/);
    expect(src).toMatch(/_pavloviaSavePartialResultsBool/);
  });

  test("periodic saves start for PsychoJS's actual SERVER environment symbol", () => {
    const src = read("threshold.js");
    const match = src.match(
      /if\s*\(\s*(psychoJS\.getEnvironment\(\)[\s\S]*?paramReader\.read\("_pavloviaSavePartialResultsBool"\)\[0\])\s*\)\s*\{\s*startPartialSaveScheduler\(/,
    );
    expect(match).not.toBeNull();

    const evaluateGate = new Function(
      "psychoJS",
      "simulateActive",
      "paramReader",
      "ExperimentHandler",
      `return (${match![1]});`,
    );
    const runGate = ({
      environment,
      simulateActive = false,
      savePartialResults = true,
    }) =>
      evaluateGate(
        {
          getEnvironment: () => environment,
          config: { experiment: { status: "RUNNING" } },
          _serverMsg: { has: () => false },
        },
        simulateActive,
        { read: () => [savePartialResults] },
        ExperimentHandler,
      );

    expect(runGate({ environment: ExperimentHandler.Environment.SERVER })).toBe(
      true,
    );
    expect(runGate({ environment: ExperimentHandler.Environment.LOCAL })).toBe(
      false,
    );
    expect(
      runGate({
        environment: ExperimentHandler.Environment.SERVER,
        savePartialResults: false,
      }),
    ).toBe(false);
    expect(
      runGate({
        environment: ExperimentHandler.Environment.SERVER,
        simulateActive: true,
      }),
    ).toBe(false);
  });

  test.each([
    ["a Pavlovia pilot token", "RUNNING", true],
    ["non-RUNNING pilot mode", "PILOTING", false],
  ])(
    "periodic saves remain enabled with %s",
    (_name, status, hasPilotToken) => {
      const src = read("threshold.js");
      const match = src.match(
        /if\s*\(\s*(psychoJS\.getEnvironment\(\)[\s\S]*?paramReader\.read\("_pavloviaSavePartialResultsBool"\)\[0\])\s*\)\s*\{\s*startPartialSaveScheduler\(/,
      );
      expect(match).not.toBeNull();
      const evaluateGate = new Function(
        "psychoJS",
        "simulateActive",
        "paramReader",
        "ExperimentHandler",
        `return (${match![1]});`,
      );
      const psychoJS = {
        getEnvironment: () => ExperimentHandler.Environment.SERVER,
        config: { experiment: { status } },
        _serverMsg: {
          has: (key) => key === "__pilotToken" && hasPilotToken,
        },
      };

      // Pilot saves intentionally download rather than upload. The periodic
      // scheduler uses that same established save path, just as RUNNING uses POST.
      expect(
        evaluateGate(
          psychoJS,
          false,
          { read: () => [true] },
          ExperimentHandler,
        ),
      ).toBe(true);
    },
  );

  test("partial-save failures retain Pavlovia's nested HTTP error detail", () => {
    const src = read("threshold.js");
    const match = src.match(
      /onError:\s*\(error\)\s*=\u003e\s*warning\(\s*`partialResultsSaveFailed: \$\{([^}]+)\}\s*`,?\s*\),/,
    );
    expect(match).not.toBeNull();
    const formatError = new Function("error", `return (${match![1]});`);

    expect(
      String(formatError({ error: "Gateway Timeout (HTTP 504: error)" })),
    ).toContain("504");
    expect(formatError(new Error("Network down"))).toBe("Network down");
  });

  test("quitPsychoJS stops (awaiting any in-flight save) before its final save", () => {
    const src = read(path.join("components", "lifetime.js"));
    expect(src).toMatch(/await stopPartialSaveScheduler\(\)/);
  });
});
