/**
 * Per-block sound-output routing + reminder pages (v1.5 Phase 6), jsdom.
 * Covers the REAL modules: block0RoutedKind (the reminder baseline),
 * lastAppliedSoundOutputKind store state, and applySoundOutputForBlock —
 * route the block's audio to the Requirements-page device, remind the
 * participant only when the demanded KIND changes (put on / take off
 * headphones), and name the device in the block's CSV rows.
 *
 * @jest-environment jsdom
 */
import { loadPhrasesForTests } from "./helpers/phrases";
import {
  _resetSoundOutputSelections,
  block0RoutedKind,
  formatSoundOutputSelection,
  getLastAppliedSoundOutputKind,
  setLastAppliedSoundOutputKind,
  setSoundOutputSelection,
} from "../components/soundOutput";
import { applySoundOutputForBlock } from "../components/soundOutput";
import {
  registerSoundOutputTarget,
  _resetAudioContextSinkPatch,
} from "../components/soundOutput";

const AIRPODS = { id: "sim-output-airpods", label: "Denis's AirPods Pro #2" };
const SPEAKERS = { id: "sim-output-speakers", label: "MacBook Pro Speakers" };

const mkReader = (rows: Record<string, string[]>, blockCount = 2): any => ({
  _blockCount: blockCount,
  read: (name: string, block?: any) => {
    // Per-block rows are keyed "name:block"; global rows are plain arrays.
    for (const k of [`${name}:${block}`, name]) {
      if (rows[k] !== undefined) return rows[k];
    }
    return [""];
  },
});

const rc = { language: { value: "en" } } as any;

const flush = async () => {
  for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0));
};

const $ = <T extends HTMLElement>(sel: string): T | null =>
  document.querySelector(sel) as T | null;

const sinkCalls: { target: string; id: string }[] = [];
let saved: [string, string][] = [];
const addData = (label: string, value: string) => saved.push([label, value]);

beforeAll(async () => {
  await loadPhrasesForTests();
});

beforeEach(() => {
  _resetSoundOutputSelections();
  _resetAudioContextSinkPatch();
  sinkCalls.length = 0;
  saved = [];
  document.body.innerHTML = "";
  (window as any).AudioContext = class {
    constructor(_opts?: unknown) {}
    async setSinkId(id: string) {
      sinkCalls.push({ target: "AudioContext", id });
    }
  };
  // A live target standing in for threshold.js's registered contexts.
  registerSoundOutputTarget({
    setSinkId: async (id: string) => {
      sinkCalls.push({ target: "live", id });
    },
  });
});

afterEach(() => {
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// Reminder baseline: what kind did block 0 route?
// ---------------------------------------------------------------------------
describe("block0RoutedKind (lastApplied baseline)", () => {
  const need = (v: string) =>
    mkReader({ [`_needSoundOutput:undefined`]: [v], _needSoundOutput: [v] });

  it("maps a specific _needSoundOutput to the demanded kind", () => {
    expect(block0RoutedKind(need("speaker"))).toBe("loudspeakers");
    expect(block0RoutedKind(need("headphone"))).toBe("headphones");
    // Loudspeakers win on And — calibration is a loudspeaker activity.
    expect(block0RoutedKind(need("speakerAndHeadphone"))).toBe("loudspeakers");
  });

  it("reuses whichever saved choice supplies the speakerOrHeadphone device", () => {
    const reader = need("speakerOrHeadphone");
    expect(block0RoutedKind(reader)).toBeNull();
    setSoundOutputSelection("headphones", AIRPODS as any);
    expect(block0RoutedKind(reader)).toBe("headphones");
    setSoundOutputSelection("loudspeakers", SPEAKERS as any);
    expect(block0RoutedKind(reader)).toBe("loudspeakers");
  });

  it("is null when nothing is routed", () => {
    expect(block0RoutedKind(need(""))).toBeNull();
  });
});

describe("lastAppliedSoundOutputKind state", () => {
  it("starts null, is settable, and resets with the selections", () => {
    expect(getLastAppliedSoundOutputKind()).toBeNull();
    setLastAppliedSoundOutputKind("headphones");
    expect(getLastAppliedSoundOutputKind()).toBe("headphones");
    _resetSoundOutputSelections();
    expect(getLastAppliedSoundOutputKind()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// applySoundOutputForBlock
// ---------------------------------------------------------------------------
describe("applySoundOutputForBlock", () => {
  const blockReader = (b1: string, b2 = "") =>
    mkReader({
      [`needSoundOutput:1`]: [b1],
      [`needSoundOutput:2`]: [b2],
    });

  it("defers the sink switch until the reminder is dismissed (no mid-beep device jump)", async () => {
    setSoundOutputSelection("headphones", AIRPODS as any);
    setSoundOutputSelection("loudspeakers", SPEAKERS as any);
    // Block 1 routed headphones; block 2 demands loudspeakers.
    setLastAppliedSoundOutputKind("headphones");

    let done = false;
    applySoundOutputForBlock({
      block: 2,
      paramReader: blockReader("", "loudspeakers"),
      rc,
      saveToOutputCSVFn: addData,
    }).then(() => (done = true));
    await flush();

    // Reminder up, but the loudspeaker sink must NOT be live yet — the
    // previous block's final response sound may still be playing on the
    // headphones, and an early broadcast would reroute its tail.
    expect($("[data-ee-sound-output-reminder]")).not.toBeNull();
    expect(sinkCalls.filter((c) => c.id === SPEAKERS.id)).toEqual([]);
    expect(getLastAppliedSoundOutputKind()).toBe("headphones");
    // CSV cell is still written up-front.
    expect(saved).toContainEqual([
      "soundOutputDevice",
      formatSoundOutputSelection(SPEAKERS as any),
    ]);

    // Dismiss the reminder → now route.
    $<HTMLButtonElement>("[data-ee-sound-output-reminder-proceed]")!.click();
    await flush();
    expect(done).toBe(true);
    expect(sinkCalls).toContainEqual({ target: "live", id: SPEAKERS.id });
    expect(getLastAppliedSoundOutputKind()).toBe("loudspeakers");
  });

  it("shows a reminder only when the demanded kind differs from the last applied", async () => {
    setSoundOutputSelection("headphones", AIRPODS as any);

    // Block 1 (headphones) vs nothing applied yet → reminder page.
    let done = false;
    applySoundOutputForBlock({
      block: 1,
      paramReader: blockReader("headphones", "headphones"),
      rc,
      saveToOutputCSVFn: addData,
    }).then(() => (done = true));
    await flush();

    const page = $<HTMLElement>("[data-ee-sound-output-reminder]");
    expect(page).not.toBeNull();
    expect(page!.dataset.kind).toBe("headphones");
    // Body phrase RC_PutOnYourXXXHeadphones, [[XXX]] filled with the label.
    expect(page!.textContent).toContain(AIRPODS.label);
    expect(page!.textContent).toContain("headphones");
    // Proceed button present (btn-success).
    const proceed = $<HTMLButtonElement>(
      "[data-ee-sound-output-reminder-proceed]",
    );
    expect(proceed).not.toBeNull();
    expect(proceed!.classList.contains("btn-success")).toBe(true);
    expect(done).toBe(false);
    // Routing waits for the reminder's dismissal — the previous block's
    // response sound may still be playing on the old device.
    expect(sinkCalls).toEqual([]);
    // The block's CSV rows name the device.
    expect(saved).toContainEqual([
      "soundOutputDevice",
      formatSoundOutputSelection(AIRPODS as any),
    ]);

    proceed!.click();
    await flush();
    expect(done).toBe(true);
    expect(sinkCalls).toContainEqual({ target: "live", id: AIRPODS.id });
    await flush();
    expect(done).toBe(true);
    expect($("[data-ee-sound-output-reminder]")).toBeNull();
    expect(getLastAppliedSoundOutputKind()).toBe("headphones");

    // Block 2 same kind → silent re-apply, no page.
    await applySoundOutputForBlock({
      block: 2,
      paramReader: blockReader("headphones", "headphones"),
      rc,
      saveToOutputCSVFn: addData,
    });
    expect($("[data-ee-sound-output-reminder]")).toBeNull();
    expect(
      sinkCalls.filter((s) => s.id === AIRPODS.id).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("reminds again when the kind changes (headphones → loudspeakers)", async () => {
    setSoundOutputSelection("headphones", AIRPODS as any);
    setSoundOutputSelection("loudspeakers", SPEAKERS as any);
    const reader = blockReader("headphones", "loudspeakers");
    // Baseline as if block 0 routed headphones (e.g. _needSoundOutput=headphone).
    setLastAppliedSoundOutputKind("headphones");

    // Block 1 same kind → completes with no page.
    await applySoundOutputForBlock({
      block: 1,
      paramReader: reader,
      rc,
      saveToOutputCSVFn: addData,
    });
    expect($("[data-ee-sound-output-reminder]")).toBeNull();
    expect(getLastAppliedSoundOutputKind()).toBe("headphones");

    let done = false;
    const p = applySoundOutputForBlock({
      block: 2,
      paramReader: reader,
      rc,
      saveToOutputCSVFn: addData,
    }).then(() => (done = true));
    await flush();
    const page = $<HTMLElement>("[data-ee-sound-output-reminder]");
    expect(page).not.toBeNull();
    expect(page!.dataset.kind).toBe("loudspeakers");
    // Body phrase RC_RemoveHeadphonesBrief names the loudspeakers.
    expect(page!.textContent).toContain(SPEAKERS.label);
    expect(page!.textContent).toContain("Remove");
    $<HTMLButtonElement>("[data-ee-sound-output-reminder-proceed]")!.click();
    await flush();
    expect(done).toBe(true);
    expect(getLastAppliedSoundOutputKind()).toBe("loudspeakers");
    await p;
  });

  it("a block with no demand routes nothing and writes no cell (no new columns)", async () => {
    setSoundOutputSelection("headphones", AIRPODS as any);
    const sinkCount = sinkCalls.length;
    await applySoundOutputForBlock({
      block: 1,
      paramReader: blockReader(""),
      rc,
      saveToOutputCSVFn: addData,
    });
    expect($("[data-ee-sound-output-reminder]")).toBeNull();
    expect(sinkCalls.length).toBe(sinkCount);
    // addData would register the column for EVERY study — only demanding
    // blocks may write it (see the showImage CSV-shape test).
    expect(saved).toEqual([]);
  });

  it("a demand with nothing saved (no compat flow) records an empty cell", async () => {
    await applySoundOutputForBlock({
      block: 1,
      paramReader: blockReader("headphones"),
      rc,
      saveToOutputCSVFn: addData,
    });
    expect($("[data-ee-sound-output-reminder]")).toBeNull();
    expect(sinkCalls).toEqual([]);
    expect(saved).toContainEqual(["soundOutputDevice", ""]);
  });

  it("resolves the legacy needSoundOutputKind demand too", async () => {
    setSoundOutputSelection("loudspeakers", SPEAKERS as any);
    const reader = mkReader({
      [`needSoundOutputKind:1`]: ["loudspeakers"],
    });
    let done = false;
    const p = applySoundOutputForBlock({
      block: 1,
      paramReader: reader,
      rc,
      saveToOutputCSVFn: addData,
    }).then(() => (done = true));
    await flush();
    expect($("[data-ee-sound-output-reminder]")).not.toBeNull();
    // Routing waits for the reminder's dismissal.
    expect(getLastAppliedSoundOutputKind()).toBeNull();
    $<HTMLButtonElement>("[data-ee-sound-output-reminder-proceed]")!.click();
    await flush();
    expect(getLastAppliedSoundOutputKind()).toBe("loudspeakers");
    expect(done).toBe(true);
    await p;
  });
});
