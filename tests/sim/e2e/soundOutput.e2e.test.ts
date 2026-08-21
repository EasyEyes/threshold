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
import { readFileSync, existsSync, readdirSync } from "fs";
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

  test("stuck detector resets on currentFunction progress (long compat sub-flows)", () => {
    // The Huggins check runs ~30 s inside phase=compatibility with no
    // phase/trial change; per-trial currentFunction publication is what
    // keeps the 20 s default stuck timeout from killing the run.
    const simSrc = readFileSync(
      path.join(process.cwd(), "server", "simulate.ts"),
      "utf8",
    );
    expect(simSrc).toMatch(
      /phase === lastPhase[\s\S]{0,20}state\.trial === lastTrial[\s\S]{0,80}currentFunction === lastFunction/,
    );
    const hpSrc = readFileSync(
      path.join(process.cwd(), "components", "headphoneCheck.js"),
      "utf8",
    );
    expect(hpSrc).toMatch(/setEEState\(/);
    expect(hpSrc).toMatch(/SIM_PHASE\.COMPATIBILITY/);
    expect(hpSrc).toMatch(/currentFunction: [^,]*headphoneCheck/);
  });

  test("deletion criterion for needSoundOutputKind (D1 tripwire)", async () => {
    // D1: the runtime reads `needSoundOutput`; the deprecated
    // `needSoundOutputKind` is a silent fallback for ONE transition cycle.
    // It may be deleted once BOTH hold:
    //   1. No example table uses the deprecated name.
    //   2. The glossary marks it obsolete (type === "obsolete").
    // While either is unmet, the fallback must stay in the runtime.
    const { loadGlossaryForTests } = await import("../../helpers/glossary");
    const glossary = await loadGlossaryForTests();
    const markedObsolete =
      glossary.glossary.needSoundOutputKind?.type === "obsolete";

    const tablesDir = path.join(process.cwd(), "examples", "tables");
    const stillUsed = readdirSync(tablesDir)
      .filter((f) => f.endsWith(".csv"))
      .filter((f) =>
        readFileSync(path.join(tablesDir, f), "utf8").match(
          /^needSoundOutputKind,/m,
        ),
      );

    if (stillUsed.length === 0 && markedObsolete) {
      throw new Error(
        "needSoundOutputKind is now DELETABLE (no example table uses it and " +
          "the glossary marks it obsolete). Delete the legacy fallback in " +
          "components/soundOutput.ts (readNeedSoundOutput), the " +
          "test-sound-output-oldname example, and this tripwire test.",
      );
    }

    // Transition cycle not over: the silent fallback must remain.
    const src = readFileSync(
      path.join(process.cwd(), "components", "soundOutput.ts"),
      "utf8",
    );
    expect(src).toMatch(/needSoundOutputKind/);
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

  test("V1 leftovers are deleted (Phase 6)", () => {
    // The V1 per-block Swal radio popup, its click sound, and the
    // selectedOutputDeviceName column are gone; selection is
    // Requirements-page only, blocks route/remind via soundOutput section 5.
    const src = readFileSync(
      path.join(process.cwd(), "components", "soundOutput.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/sweetalert2/);
    expect(src).not.toMatch(/testSound64/);
    expect(src).not.toMatch(/showAudioOutputSelectPopup/);
    const th = readFileSync(path.join(process.cwd(), "threshold.js"), "utf8");
    expect(th).not.toMatch(/showAudioOutputSelectPopup/);
    expect(th).not.toMatch(/selectedOutputDeviceName/);
    expect(th).not.toMatch(/audioTargetsToSetSinkId/);
    expect(th).toMatch(/applySoundOutputForBlock/);
    expect(th).toMatch(/soundOutputLoudspeakers/);
    // The sim driver can drive the reminder pages (ground truth: action
    // entries {action: "reminder", kind, text}).
    const driver = readFileSync(
      path.join(process.cwd(), "components", "simulatedParticipant.ts"),
      "utf8",
    );
    expect(driver).toMatch(/data-ee-sound-output-reminder/);
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

  // ------------------------------------------------------------------
  // Deprecated-name parity (Phase 4+): tables using the retired
  // `needSoundOutputKind` get the SAME v1.5 behavior via the resolver's
  // silent fallback — Requirements-page step, no per-block V1 popup.
  describe("deprecated name parity (v1.5 via silent fallback)", () => {
    test("old-name table shows the Requirements-page step, not the per-block popup", async () => {
      const result = await runSim("test-sound-output-oldname");

      expect(result.status).toBe("completed");
      // Requirements-page step ran (compat chrome title recorded in-page).
      expect(
        [...result.swalPopupTexts, ...result.eePopupTitles].some((t: string) =>
          /Sound output/i.test(t),
        ),
      ).toBe(true);
      // The per-block V1 popup is gone (selection happened once, up front).
      expect(
        [...result.sweetAlertPopups, ...result.swalPopupTexts].some(
          (t: string) => /Select audio output/.test(t),
        ),
      ).toBe(false);
      // The V1 CSV column is gone (soundOutputDevice replaces it, Phase 6).
      expect(mainCsv(result)).not.toMatch(/selectedOutputDeviceName/);
      // The driver clicked a bark test button → a sink was applied.
      expect(result.sinkCalls.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------- RED
  // --------------------------------------------------------------------
  // Browsers without setSinkId (e.g. Firefox): per the v1.5 card, MISSING
  // NEEDED APIs IS A REJECTION (RC_BrowserLacksSoundSupport) — but it must
  // be VISIBLE: a ✗ row in the Requirements checklist, not an invisible
  // verdict. The sim's simNoSinkSupport option deletes setSinkId from both
  // prototypes to reproduce Firefox deterministically.
  // --------------------------------------------------------------------
  describe("no setSinkId support (Firefox-like): visible rejection", () => {
    test("study is rejected with a ✗ sound-output row and _needsUnmet marker", async () => {
      const { simulate } = await import("../../../server/simulate");
      const result = await simulate("test-sound-output", {
        port: port++,
        seed: 1,
        stuckTimeoutMs: 45_000,
        headless: true,
        simOptions: { simNoSinkSupport: true },
      });
      // Orderly incompatible ending (the report's Quit path) — no trials.
      expect(result.status).toBe("completed");
      expect(result.trialsCompleted).toBe(0);
      // The rejection is EXPLAINABLE: the ✗ fact row text was on screen and
      // the _needsUnmet CSV marker names the unmet requirement.
      const texts = [
        ...(result.compatFactTexts ?? []),
        ...result.instructionTexts,
        ...result.swalPopupTexts,
      ].join("\n");
      expect(texts).toMatch(/lacks needed sound support/i);
      const csv = Object.values(result.csvFiles).find((c: string) =>
        /_needsUnmet/.test(c),
      );
      expect(csv).toMatch(/_needSoundOutputSelectability/);
      expect(result.sinkCalls ?? []).toEqual([]);
    });
  });

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
      // Huggins check ran (its compat-page chrome title was recorded)…
      expect(
        [
          ...result.swalPopupTexts,
          ...result.instructionTexts,
          ...result.eePopupTitles,
        ].some((t: string) => /headphone|Headphone/i.test(t)),
      ).toBe(true);
      // …and the selected sink was applied before it started.
      expect(result.sinkCalls.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------
  // Phase 5: block-0 "Setting sound output" page + routing + reconnect
  // --------------------------------------------------------------------
  describe("v1.5 block-0 setting/reconnect (Phase 5)", () => {
    test("block-0 page appears only for _needSoundOutput tables; routing hits live contexts", async () => {
      const block0 = await runSim("test-sound-output-block0");
      expect(block0.status).toBe("completed");
      // Page title (RC_SettingSoundOutput) recorded via the chrome-title
      // recorder, and the run still completed (driver clicked Proceed).
      expect(
        (block0.eePopupTitles ?? []).some((t: string) =>
          /Setting sound output/i.test(t),
        ),
      ).toBe(true);
      // Sink routing at compat exit: bark (HTMLMediaElement) + Huggins ctx
      // + block-0 live-context broadcast = ≥2 AudioContext sink calls.
      const audioCtxSinks = (block0.sinkCalls ?? []).filter(
        (s: any) => s.target === "AudioContext",
      );
      expect(audioCtxSinks.length).toBeGreaterThanOrEqual(2);

      // No _needSoundOutput demand → no block-0 page at all.
      const main = await runSim("test-sound-output");
      expect(main.status).toBe("completed");
      expect(
        (main.eePopupTitles ?? []).some((t: string) =>
          /Setting sound output/i.test(t),
        ),
      ).toBe(false);
    });

    test("reconnect: disconnect shows the warning, reconnect restores Proceed and re-applies the sink", async () => {
      const { simulate } = await import("../../../server/simulate");
      const result = await simulate("test-sound-output-block0", {
        port: port++,
        seed: 1,
        stuckTimeoutMs: 45_000,
        headless: true,
        simOptions: {
          soundOutputPolicy: { reconnect: true },
        },
      });
      expect(result.status).toBe("completed");
      const actions = (result.soundOutputActions ?? []).map(
        (a: any) => a.action,
      );
      // The scripted sequence: selection → bark → disconnect → Proceed →
      // reconnect screen seen → device reconnected → Proceed restored.
      expect(actions).toContain("disconnect");
      expect(actions).toContain("reconnect-shown");
      expect(actions).toContain("connect");
      // Sink re-applied after the reconnect (second live-context call).
      const audioCtxSinks = (result.sinkCalls ?? []).filter(
        (s: any) => s.target === "AudioContext",
      );
      expect(audioCtxSinks.length).toBeGreaterThanOrEqual(3);
    });
  });

  // --------------------------------------------------------------------
  // Phase 6: per-block reminder pages + CSV columns
  // --------------------------------------------------------------------
  describe("v1.5 per-block reminders + CSV (Phase 6)", () => {
    const actionsOf = (result: any) => result.soundOutputActions ?? [];

    test("reminders appear when the block kind changes, and not when it repeats", async () => {
      // Block 0 silently reuses the loudspeakers choice (speakerOrHeadphone
      // default) → block 1 (headphones) and block 2 (loudspeakers) each
      // change the kind → exactly two reminders, in order, [[XXX]] filled
      // with the saved device label.
      const main = await runSim("test-sound-output");
      expect(main.status).toBe("completed");
      const reminders = actionsOf(main).filter(
        (a: any) => a.action === "reminder",
      );
      expect(reminders.map((r: any) => r.kind)).toEqual([
        "headphones",
        "loudspeakers",
      ]);
      const selectedLabel = (kind: string) =>
        actionsOf(main).find(
          (a: any) => a.action === "select" && a.kind === kind,
        )?.label;
      for (const r of reminders) {
        expect(r.text).toContain(selectedLabel(r.kind));
      }
      expect(reminders[0].text).toMatch(/headphones/i);
      expect(reminders[1].text).toMatch(/remove/i);

      // The block-0 table already routed headphones at compat exit (its
      // Setting-sound-output page), and its single block demands
      // headphones again → NO reminder.
      const b0 = await runSim("test-sound-output-block0");
      expect(b0.status).toBe("completed");
      expect(actionsOf(b0).filter((a: any) => a.action === "reminder")).toEqual(
        [],
      );
    });
  });
});
