/**
 * Block-0 sound-output routing (v1.5 Phase 5), jsdom tests.
 * Covers the REAL module: target-kind mapping, the armed AudioContext
 * constructor patch (calibration contexts auto-apply the saved sink),
 * live-target broadcast, the compat-exit "Setting sound output device"
 * page (RC_SettingSoundOutput + RC_RemoveHeadphonesBrief /
 * RC_PutOnYourXXXHeadphones), and the reconnect watch
 * (RC_TryToReconnectDevice, Proceed restored on reconnect).
 *
 * @jest-environment jsdom
 */
import { loadPhrasesForTests } from "./helpers/phrases";
import {
  _resetAudioContextSinkPatch,
  armAudioContextSinkPatch,
  applySinkToLiveTargets,
  block0BodyPhrase,
  block0TargetKind,
  registerSoundOutputTarget,
  runSoundOutputBlock0Page,
  setCurrentDesiredSink,
  startSoundOutputReconnectWatch,
} from "../components/soundOutput";
import {
  setSoundOutputSelection,
  lockSoundOutputSelections,
  _resetSoundOutputSelections,
} from "../components/soundOutput";

const AIRPODS = { id: "sim-output-airpods", label: "Denis's AirPods Pro #2" };
const SPEAKERS = { id: "sim-output-speakers", label: "MacBook Pro Speakers" };
const DEVICES = [SPEAKERS, AIRPODS];

let mediaDevicesMock: {
  getUserMedia: jest.Mock;
  enumerateDevices: jest.Mock;
  handlers: Record<string, (() => void)[]>;
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
};

const fireDeviceChange = () => {
  for (const fn of mediaDevicesMock.handlers["devicechange"] ?? []) fn();
};

let liveDevices = DEVICES;

const mkReader = (
  rows: Record<string, string[] | Record<number, string[]>>,
  blockCount = 1,
): any => ({
  _blockCount: blockCount,
  read: (name: string, block?: any) => {
    const v = rows[name];
    if (v === undefined) return [""];
    if (Array.isArray(v)) return v;
    if (block === undefined) return Object.values(v)[0] ?? [""];
    return v[block as number] ?? [""];
  },
});

const rc = { language: { value: "en" } } as any;

const flush = async () => {
  for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0));
};

const $ = <T extends HTMLElement>(sel: string): T | null =>
  document.querySelector(sel) as T | null;

// sink-call recorder shared by fake contexts / elements.
const sinkCalls: { target: string; id: string }[] = [];

beforeAll(async () => {
  await loadPhrasesForTests();
});

beforeEach(() => {
  _resetSoundOutputSelections();
  sinkCalls.length = 0;
  liveDevices = DEVICES;
  document.body.innerHTML = "";
  const handlers: Record<string, (() => void)[]> = {};
  mediaDevicesMock = {
    handlers,
    getUserMedia: jest.fn(async () => ({})),
    enumerateDevices: jest.fn(async () =>
      liveDevices.map(
        (d) =>
          ({
            deviceId: d.id,
            label: d.label,
            kind: "audiooutput",
            groupId: "g",
          }) as MediaDeviceInfo,
      ),
    ),
    addEventListener: (type, fn) => {
      (handlers[type] ??= []).push(fn);
    },
    removeEventListener: (type, fn) => {
      handlers[type] = (handlers[type] ?? []).filter((f) => f !== fn);
    },
  };
  Object.defineProperty(navigator, "mediaDevices", {
    value: mediaDevicesMock,
    configurable: true,
  });
  // Fake AudioContext: setSinkId ON THE PROTOTYPE (mirrors Chrome; the
  // support check looks there).
  (window as any).AudioContext = class {
    constructor(_opts?: unknown) {}
    async setSinkId(id: string) {
      sinkCalls.push({ target: "AudioContext", id });
    }
  };
  _resetAudioContextSinkPatch();
});

afterEach(() => {
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// Pure mappings
// ---------------------------------------------------------------------------
describe("block0TargetKind / block0BodyPhrase", () => {
  const need = (v: string) => mkReader({ _needSoundOutput: [v] });

  it("maps _needSoundOutput to the routed row kind", () => {
    expect(block0TargetKind(need("speaker"))).toBe("loudspeakers");
    expect(block0TargetKind(need("headphone"))).toBe("headphones");
    // Calibration is a loudspeaker activity — loudspeakers win on And.
    expect(block0TargetKind(need("speakerAndHeadphone"))).toBe("loudspeakers");
    // Either-kind and absent demand route nothing specific → no page.
    expect(block0TargetKind(need("speakerOrHeadphone"))).toBeNull();
    expect(block0TargetKind(need(""))).toBeNull();
  });

  it("picks the page body phrase per target kind", () => {
    expect(block0BodyPhrase("loudspeakers")).toBe("RC_RemoveHeadphonesBrief");
    expect(block0BodyPhrase("headphones")).toBe("RC_PutOnYourXXXHeadphones");
  });
});

// ---------------------------------------------------------------------------
// Sink routing: constructor patch + live-target broadcast
// ---------------------------------------------------------------------------
describe("armed AudioContext sink patch", () => {
  it("auto-applies the current desired sink to every NEW AudioContext", () => {
    armAudioContextSinkPatch();
    setCurrentDesiredSink(AIRPODS as any);
    new (window as any).AudioContext();
    expect(sinkCalls).toEqual([{ target: "AudioContext", id: AIRPODS.id }]);
  });

  it("follows sink changes for later contexts; null sink routes nothing", () => {
    armAudioContextSinkPatch();
    setCurrentDesiredSink(null);
    new (window as any).AudioContext();
    expect(sinkCalls).toEqual([]);
    setCurrentDesiredSink(SPEAKERS as any);
    new (window as any).AudioContext();
    expect(sinkCalls).toEqual([{ target: "AudioContext", id: SPEAKERS.id }]);
  });

  it("arming is idempotent (no double wrapping)", () => {
    armAudioContextSinkPatch();
    armAudioContextSinkPatch();
    setCurrentDesiredSink(AIRPODS as any);
    const ctx = new (window as any).AudioContext();
    expect(sinkCalls).toEqual([{ target: "AudioContext", id: AIRPODS.id }]);
    expect(ctx instanceof Object).toBe(true);
  });
});

describe("applySinkToLiveTargets / registerSoundOutputTarget", () => {
  it("broadcasts the sink to registered live targets, skipping dead ones", async () => {
    const media = document.createElement("audio");
    (media as any).setSinkId = async (id: string) =>
      sinkCalls.push({ target: "HTMLMediaElement", id });
    registerSoundOutputTarget(media);
    registerSoundOutputTarget(null); // dead entry is ignored
    registerSoundOutputTarget({}); // no setSinkId — ignored
    await applySinkToLiveTargets(SPEAKERS as any);
    expect(sinkCalls).toEqual([
      { target: "HTMLMediaElement", id: SPEAKERS.id },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Block-0 page (compat exit)
// ---------------------------------------------------------------------------
describe("runSoundOutputBlock0Page", () => {
  it("headphone demand: shows RC_SettingSoundOutput + PutOnYour…body, routes sink, resolves on Proceed", async () => {
    setSoundOutputSelection("headphones", AIRPODS as any);
    lockSoundOutputSelections();
    const reader = mkReader({ _needSoundOutput: ["headphone"] });

    // Simulate the final compatibility report still on screen (it is NOT
    // unmounted when it resolves) — the block-0 page must clear it, else
    // the two overlap and the dead report Proceed eats the clicks.
    const report = document.createElement("div");
    report.id = "msg-container";
    document.body.appendChild(report);

    const done = runSoundOutputBlock0Page({ paramReader: reader, rc });
    await flush();
    expect($("[data-ee-sound-output-step]")).toBeNull(); // not the selection step
    expect(document.getElementById("msg-container")).toBeNull();

    const page = $("[data-ee-sound-output-block0]");
    expect(page).not.toBeNull();
    expect(page!.dataset.eeSoundOutputBlock0Kind).toBe("headphones");
    // Chrome H1 title = RC_SettingSoundOutput.
    const h1 = document.querySelector("#compatibility-chrome-title h1");
    expect(h1?.textContent).toMatch(/Setting sound output device/i);
    // Body phrase RC_PutOnYourXXXHeadphones with the saved device label.
    expect(page!.textContent).toMatch(/Put on your/i);
    expect(page!.textContent).toContain(AIRPODS.label);
    // Routing happened at page open: the armed patch or live broadcast
    // applied the saved sink.
    expect(sinkCalls.some((c) => c.id === AIRPODS.id)).toBe(true);

    const proceed = $<HTMLButtonElement>(
      "[data-ee-sound-output-block0-proceed]",
    )!;
    expect(proceed.classList.contains("btn-success")).toBe(true);
    proceed.click();
    await expect(done).resolves.toBe(true);
    expect($("[data-ee-sound-output-block0]")).toBeNull();
  });

  it("loudspeaker demand: body tells the participant to remove headphones", async () => {
    setSoundOutputSelection("loudspeakers", SPEAKERS as any);
    lockSoundOutputSelections();
    const reader = mkReader({ _needSoundOutput: ["speaker"] });
    const done = runSoundOutputBlock0Page({ paramReader: reader, rc });
    await flush();
    const page = $("[data-ee-sound-output-block0]")!;
    expect(page.dataset.eeSoundOutputBlock0Kind).toBe("loudspeakers");
    expect(page.textContent).toMatch(/Remove any headphones/i);
    expect(page.textContent).toContain(SPEAKERS.label);
    $<HTMLButtonElement>("[data-ee-sound-output-block0-proceed]")!.click();
    await expect(done).resolves.toBe(true);
  });

  it("speakerOrHeadphone (or absent) demand: no page, sink still routed silently", async () => {
    setSoundOutputSelection("headphones", AIRPODS as any);
    lockSoundOutputSelections();
    for (const v of ["speakerOrHeadphone", ""]) {
      const reader = mkReader({ _needSoundOutput: [v] });
      await expect(
        runSoundOutputBlock0Page({ paramReader: reader, rc }),
      ).resolves.toBe(true);
      expect($("[data-ee-sound-output-block0]")).toBeNull();
    }
    // The saved selection was still routed (silent calibration sink).
    expect(sinkCalls.some((c) => c.id === AIRPODS.id)).toBe(true);
  });

  it("no saved selection: no page, no routing, resolves true", async () => {
    const reader = mkReader({ _needSoundOutput: ["headphone"] });
    await expect(
      runSoundOutputBlock0Page({ paramReader: reader, rc }),
    ).resolves.toBe(true);
    expect($("[data-ee-sound-output-block0]")).toBeNull();
    expect(sinkCalls).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Reconnect watch
// ---------------------------------------------------------------------------
describe("startSoundOutputReconnectWatch", () => {
  const armWatch = (quitPsychoJS = jest.fn()) => {
    setSoundOutputSelection("headphones", AIRPODS as any);
    lockSoundOutputSelections();
    const reader = mkReader({ _needSoundOutput: ["headphone"] });
    startSoundOutputReconnectWatch({ paramReader: reader, rc, quitPsychoJS });
    return { quitPsychoJS };
  };

  it("device disappears → RC_TryToReconnectDevice screen with Quit, no Proceed", async () => {
    armWatch();
    await flush();
    expect($("[data-ee-sound-output-reconnect]")).toBeNull();

    liveDevices = [SPEAKERS]; // AirPods unplugged
    fireDeviceChange();
    await flush();

    const overlay = $("[data-ee-sound-output-reconnect]")!;
    expect(overlay).not.toBeNull();
    expect(overlay.dataset.state).toBe("missing");
    expect(overlay.textContent).toContain(AIRPODS.label);
    expect(overlay.textContent).toMatch(/headphones/i);
    expect(overlay.textContent).toMatch(/disappeared/i);
    expect($("[data-ee-sound-output-reconnect-quit]")).not.toBeNull();
    // Proceed hidden while the device is missing.
    const proceed = $<HTMLButtonElement>(
      "[data-ee-sound-output-reconnect-proceed]",
    );
    expect(proceed === null || proceed.offsetParent === null).toBe(true);
  });

  it("device returns → sink re-applied and Proceed restored; click closes overlay", async () => {
    armWatch();
    await flush();
    liveDevices = [SPEAKERS];
    fireDeviceChange();
    await flush();
    expect($("[data-ee-sound-output-reconnect]")).not.toBeNull();

    sinkCalls.length = 0;
    liveDevices = DEVICES; // reconnected
    fireDeviceChange();
    await flush();

    const overlay = $("[data-ee-sound-output-reconnect]")!;
    expect(overlay.dataset.state).toBe("restored");
    // Sink re-applied to live targets after the reconnect.
    expect(sinkCalls.some((c) => c.id === AIRPODS.id)).toBe(true);
    const proceed = $<HTMLButtonElement>(
      "[data-ee-sound-output-reconnect-proceed]",
    )!;
    expect(proceed.classList.contains("btn-success")).toBe(true);
    proceed.click();
    await flush();
    expect($("[data-ee-sound-output-reconnect]")).toBeNull();
  });

  it("Quit ends the study via the provided quitPsychoJS", async () => {
    const { quitPsychoJS } = armWatch();
    liveDevices = [];
    fireDeviceChange();
    await flush();
    $<HTMLButtonElement>("[data-ee-sound-output-reconnect-quit]")!.click();
    expect(quitPsychoJS).toHaveBeenCalled();
  });

  it("initial check catches a device that vanished before the watch started", async () => {
    setSoundOutputSelection("headphones", AIRPODS as any);
    lockSoundOutputSelections();
    liveDevices = [SPEAKERS]; // already gone
    const reader = mkReader({ _needSoundOutput: ["headphone"] });
    startSoundOutputReconnectWatch({
      paramReader: reader,
      rc,
      quitPsychoJS: jest.fn(),
    });
    await flush();
    expect($("[data-ee-sound-output-reconnect]")).not.toBeNull();
  });

  it("nothing routed for block 0 → watch is a no-op even on devicechange", async () => {
    setSoundOutputSelection("headphones", AIRPODS as any);
    lockSoundOutputSelections();
    const reader = mkReader({ _needSoundOutput: ["speakerOrHeadphone"] });
    startSoundOutputReconnectWatch({
      paramReader: reader,
      rc,
      quitPsychoJS: jest.fn(),
    });
    await flush();
    liveDevices = [SPEAKERS];
    fireDeviceChange();
    await flush();
    expect($("[data-ee-sound-output-reconnect]")).toBeNull();
  });
});
