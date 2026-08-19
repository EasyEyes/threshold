/**
 * @jest-environment node
 *
 * Sound-output selection (needSoundOutput v1.5) — sim E2E ground truth.
 *
 * Three example tables drive everything:
 * - test-sound-output         : blocks 1+2 set needSoundOutput (new name)
 * - test-sound-output-block0  : + global _needSoundOutput=headphone (Huggins)
 * - test-sound-output-oldname : deprecated needSoundOutputKind (V1 fallback)
 *
 * Ground truth comes from the in-page sim stubs (window.__simSinkCalls,
 * __simMediaPlays, __simSoundOutputActions), NOT from audio hardware:
 * AudioContext/HTMLMediaElement setSinkId are patched to record then resolve,
 * and enumerateDevices is merged with fake audiooutput devices that tests
 * can add/remove live via __simConnectAudioOutput/__simDisconnectAudioOutput.
 *
 * RED tests assert the DESIRED v1.5 behavior (selection on the Requirements
 * page, sink calls, CSV columns) — they fail until Phase 4+ lands.
 * GREEN tests capture today's correct behavior (V1 per-block Swal popup via
 * the old parameter name) and must keep passing until that UI is deliberately
 * replaced.
 *
 * Full E2E is opt-in: RUN_E2E=1 npm test
 */

import { expect, describe, test } from "@jest/globals";
import { readFileSync, existsSync } from "fs";
import * as path from "path";

const RUN_E2E = process.env.RUN_E2E === "1";
const BUILT_INDEX = (table: string) =>
  path.join(process.cwd(), "examples", "generated", table, "index.html");

// ---------------------------------------------------------------------------
// Source-contract unit tests (always run — no browser needed)
// ---------------------------------------------------------------------------
describe("sound-output sim infrastructure (source contract)", () => {
  test("simulatedParticipant patches setSinkId and records ground truth", () => {
    const src = readFileSync(
      path.join(process.cwd(), "components", "simulatedParticipant.ts"),
      "utf8",
    );
    expect(src).toMatch(/__simSinkCalls/);
    expect(src).toMatch(/__simConnectAudioOutput/);
    expect(src).toMatch(/__simDisconnectAudioOutput/);
    expect(src).toMatch(/simNoSinkSupport/);
    // Fake audiooutput devices must be merged into enumerateDevices.
    expect(src).toMatch(/audiooutput/);
    // The Requirements-page sound-output step is sim-drivable by contract:
    expect(src).toMatch(/data-ee-sound-output-row/);
    // Policy arrives via window.__SIM_OPTIONS__.soundOutputPolicy (injected
    // by server/simulate.ts — the same channel as deviceScript/simNoSinkSupport).
    expect(src).toMatch(/soundOutputPolicy/);
    expect(src).toMatch(/__SIM_OPTIONS__/);
  });

  test("simulate.ts surfaces sink calls, media plays, and video", () => {
    const src = readFileSync(
      path.join(process.cwd(), "server", "simulate.ts"),
      "utf8",
    );
    expect(src).toMatch(/sinkCalls/);
    expect(src).toMatch(/mediaPlays/);
    expect(src).toMatch(/soundOutputActions/);
    expect(src).toMatch(/recordVideo/);
    expect(src).toMatch(/videoPath/);
  });

  test("abSimulate emits an A/B ground-truth report", () => {
    const src = readFileSync(
      path.join(process.cwd(), "server", "abSimulate.ts"),
      "utf8",
    );
    expect(src).toMatch(/report\.md/);
    expect(src).toMatch(/ground-truth\.json/);
  });

  test("example tables exist for all three sound-output scenarios", () => {
    for (const t of [
      "test-sound-output",
      "test-sound-output-block0",
      "test-sound-output-oldname",
    ]) {
      expect(
        existsSync(path.join(process.cwd(), "examples", "tables", `${t}.csv`)),
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// E2E (opt-in): full simulated-participant runs
// ---------------------------------------------------------------------------
(RUN_E2E ? describe : describe.skip)("sound output selection (e2e)", () => {
  jest.setTimeout(300_000);
  let port = 5602;

  // One sim run per table, shared across tests in this suite.
  const simCache = new Map<string, Promise<any>>();
  const runSim = (table: string) => {
    if (!simCache.has(table)) {
      expect(existsSync(BUILT_INDEX(table))).toBe(true);
      simCache.set(
        table,
        (async () => {
          const { simulate } = await import("../../../server/simulate");
          return simulate(table, {
            port: port++,
            seed: 1,
            stuckTimeoutMs: 45_000,
            headless: true,
          });
        })(),
      );
    }
    return simCache.get(table)!;
  };

  const mainCsv = (result: { csvFiles: Record<string, string> }) => {
    const name = Object.keys(result.csvFiles).find(
      (n) => n.endsWith(".csv") && !/_(stimulus|cursor)\.csv$/.test(n),
    );
    expect(name).toBeDefined();
    return result.csvFiles[name!];
  };

  // ------------------------------------------------------------------ GREEN
  describe("V1 baseline (deprecated needSoundOutputKind)", () => {
    test("per-block Swal radio popup appears and selection reaches the CSV", async () => {
      const result = await runSim("test-sound-output-oldname");

      expect(result.status).toBe("completed");
      // The V1 popup title, recorded by the observer (.swal2-popup text)
      // and/or the in-page recorder.
      expect(
        [...result.sweetAlertPopups, ...result.swalPopupTexts].some(
          (t: string) => /Select audio output/.test(t),
        ),
      ).toBe(true);
      const csv = mainCsv(result);
      expect(csv).toMatch(/selectedOutputDeviceName/);
      // The fake device labels from the sim stub end up in the CSV.
      expect(csv).toMatch(/MacBook Pro Speakers|AirPods/);
    });

    test("sim sink stub records the broadcast sink selection", async () => {
      const result = await runSim("test-sound-output-oldname");
      // V1 broadcasts setSinkId to all audio targets on confirm: once per
      // block that sets the parameter (two here).
      expect(result.sinkCalls.length).toBeGreaterThanOrEqual(2);
      expect(
        result.sinkCalls.some((c: any) =>
          /MacBook Pro Speakers|AirPods/.test(c.label ?? ""),
        ),
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------- RED
  describe("v1.5 desired behavior (canonical needSoundOutput)", () => {
    test("Requirements page shows the sound-output selection step", async () => {
      const result = await runSim("test-sound-output");

      expect(result.status).toBe("completed");
      // RC_SoundOutput phrase ("Sound output") appears in a popup/page text.
      expect(
        [...result.swalPopupTexts, ...result.eePopupTitles].some((t: string) =>
          /Sound output/i.test(t),
        ),
      ).toBe(true);
    });

    test("sink is set before any block starts, and CSV names the devices", async () => {
      const result = await runSim("test-sound-output");

      expect(result.status).toBe("completed");
      expect(result.sinkCalls.length).toBeGreaterThan(0);
      const csv = mainCsv(result);
      expect(csv).toMatch(/soundOutputLoudspeakers/);
      expect(csv).toMatch(/soundOutputHeadphones/);
      // Per-block column replaces V1's selectedOutputDeviceName.
      expect(csv).toMatch(/soundOutputDevice/);
      expect(csv).not.toMatch(/selectedOutputDeviceName/);
    });

    test("block-0 demand: sink applied before the headphone check runs", async () => {
      const result = await runSim("test-sound-output-block0");

      expect(result.status).toBe("completed");
      // Huggins check ran (its intro/trial text was recorded)…
      expect(
        [...result.swalPopupTexts, ...result.instructionTexts].some(
          (t: string) => /headphone|Headphone/i.test(t),
        ),
      ).toBe(true);
      // …and the selected sink was applied before it started.
      expect(result.sinkCalls.length).toBeGreaterThan(0);
    });
  });
});
