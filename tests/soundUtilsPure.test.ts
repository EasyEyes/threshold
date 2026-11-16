/**
 * @jest-environment jsdom
 *
 * Unit coverage for components/soundUtils.js — waveform math, Web Audio
 * node graphs, sound-list/zip loading, and calibration arithmetic. The
 * module-level AudioContext is faked before import (see soundNodeTeardown
 * tests); zips and CSV lists are REAL archives built in memory with JSZip,
 * so the unzip → parse → store pipeline runs for real. Only fetch and the
 * audio decode (arraybuffer-to-audiobuffer) are stubbed.
 */

jest.mock("arraybuffer-to-audiobuffer", () => ({
  __esModule: true,
  default: jest.fn(async (arrayBuffer: ArrayBuffer) => ({
    decodedFrom: arrayBuffer.byteLength,
  })),
}));
jest.mock("../components/soundTest", () => ({
  getMaxValueOfAbsoluteValueOfBuffer: () => 0,
}));
jest.mock("../components/readPhrases", () => ({
  readi18nPhrases: (key: string) => `i18n:${key}`,
}));
jest.mock("../parameters/paramReader.ts", () => ({
  paramReader: { conditions: [], read: jest.fn() },
}));
jest.mock("../components/global", () => ({
  _calibrateSoundBurstPostSec: { current: 0 },
  _calibrateSoundBurstPreSec: { current: 0 },
  _calibrateSound1000HzPostSec: { current: 0 },
  _calibrateSound1000HzPreSec: { current: 0 },
  _calibrateSound1000HzSec: { current: 0 },
  calibrateSoundBurstMLSVersions: { current: 0 },
  calibrateSoundBurstRepeats: { current: 0 },
  calibrateSoundBurstSec: { current: 0 },
  targetSoundListFiles: {},
  targetSoundListMap: {},
}));

import JSZip from "jszip";
import { paramReader } from "../parameters/paramReader.ts";
import {
  _calibrateSound1000HzPostSec,
  _calibrateSound1000HzPreSec,
  _calibrateSound1000HzSec,
  _calibrateSoundBurstPostSec,
  _calibrateSoundBurstPreSec,
  calibrateSoundBurstMLSVersions,
  calibrateSoundBurstRepeats,
  calibrateSoundBurstSec,
  targetSoundListFiles,
  targetSoundListMap,
} from "../components/global";

/** Minimal Web Audio fakes; soundUtils builds its module ctx at import. */
class FakeAudioContext {
  sampleRate = 96000;
  destination = { connect: jest.fn(), disconnect: jest.fn() };
  sources: any[] = [];
  analysers: any[] = [];
  convolvers: any[] = [];
  createBufferSource() {
    const source = {
      buffer: null as unknown,
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      onended: null as null | (() => void),
    };
    this.sources.push(source);
    return source;
  }
  createAnalyser() {
    const analyser = {
      frequencyBinCount: 1024,
      connect: jest.fn(),
      disconnect: jest.fn(),
      getFloatTimeDomainData: jest.fn(),
    };
    this.analysers.push(analyser);
    return analyser;
  }
  createBuffer(channels: number, length: number) {
    const data = new Float32Array(length);
    return { length, getChannelData: () => data };
  }
  createConvolver() {
    const convolver = {
      normalize: true,
      channelCount: 2,
      buffer: null as unknown,
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
    this.convolvers.push(convolver);
    return convolver;
  }
  close() {
    return Promise.resolve();
  }
}
(window as any).AudioContext = FakeAudioContext;

let S: typeof import("../components/soundUtils");
beforeAll(async () => {
  S = await import("../components/soundUtils");
});

const readMock = paramReader.read as unknown as jest.Mock;
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  readMock.mockReset();
  for (const key of Object.keys(targetSoundListFiles))
    delete targetSoundListFiles[key];
  for (const key of Object.keys(targetSoundListMap))
    delete targetSoundListMap[key];
  jest.useRealTimers();
});

/** Route fetch(url) to a Map of url → Blob. */
const stubFetch = (routes: Record<string, Blob>) => {
  global.fetch = jest.fn(async (url: string) => {
    const blob = routes[url.replace(/^\.\//, "")];
    if (!blob) throw new Error(`no route for ${url}`);
    return { blob: async () => blob } as any;
  }) as any;
};

const zipBlobOf = async (build: (zip: JSZip) => void) => {
  const zip = new JSZip();
  build(zip);
  return new Blob([await zip.generateAsync({ type: "arraybuffer" })]);
};

// ---------------------------------------------------------------------------
// Waveform math
// ---------------------------------------------------------------------------

describe("waveform math", () => {
  it("getRMSOfWaveForm computes the root mean square", () => {
    expect(S.getRMSOfWaveForm([3, 4])).toBeCloseTo(Math.sqrt(12.5), 10);
    expect(S.getRMSOfWaveForm([0, 0])).toBe(0);
    expect(S.getRMSOfWaveForm([2])).toBe(2);
  });

  it("setWaveFormToZeroDbSPL normalizes rms to 1", () => {
    const arr = [3, 4];
    const out = S.setWaveFormToZeroDbSPL(arr);
    expect(out).toBe(arr); // in place
    expect(S.getRMSOfWaveForm(out)).toBeCloseTo(1, 10);
  });

  it("setWaveFormToZeroDbSPL leaves silence untouched", () => {
    expect(S.setWaveFormToZeroDbSPL([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("adjustSoundDbSPL scales by 10^(dB/20)", () => {
    expect(S.adjustSoundDbSPL([1], 20)).toEqual([10]);
    expect(S.adjustSoundDbSPL([1], -20)).toEqual([0.1]);
    expect(S.adjustSoundDbSPL([0.5, 0.25], 0)).toEqual([0.5, 0.25]);
  });
});

// ---------------------------------------------------------------------------
// File-name handling & tone generation
// ---------------------------------------------------------------------------

describe("file names & tones", () => {
  it("verifyFileNameExtension accepts only wav and aac (case-sensitive)", () => {
    expect(S.verifyFileNameExtension("beep.wav")).toBe(true);
    expect(S.verifyFileNameExtension("path/to/beep.aac")).toBe(true);
    expect(S.verifyFileNameExtension("beep.mp3")).toBe(false);
    expect(S.verifyFileNameExtension("beep.WAV")).toBe(false);
    expect(S.verifyFileNameExtension("noext")).toBe(false);
  });

  it("generateTones names each tone", () => {
    expect(S.generateTones([1000, 250])).toEqual([
      { name: "1000.0 Hz", file: {} },
      { name: "250.0 Hz", file: {} },
    ]);
  });

  it("generatePureTone builds a tapered sinusoid at the requested frequency", async () => {
    const { name, file } = await S.generatePureTone(440, 0.02, 96000);
    expect(name).toBe("440.0 Hz");
    const data = file.getChannelData(0);
    expect(data.length).toBe(1920);
    let max = 0;
    for (const v of data) max = Math.max(max, Math.abs(v));
    // Pure tone peaks near ±1 and both ends are tapered to ~0
    expect(max).toBeGreaterThan(0.9);
    expect(max).toBeLessThanOrEqual(1);
    expect(Math.abs(data[0])).toBeLessThan(0.01);
    expect(Math.abs(data[data.length - 1])).toBeLessThan(0.01);
    // frequency: upward zero-crossings ≈ f·duration (440 Hz · 0.02 s = 8.8,
    // plus the one at t=0) — half/double frequency would land at ~4/~17
    let crossings = 0;
    for (let i = 1; i < data.length; i++)
      if (data[i - 1] <= 0 && data[i] > 0) crossings++;
    expect(crossings).toBeGreaterThanOrEqual(8);
    expect(crossings).toBeLessThanOrEqual(10);
  });

  it("getCurrentTimeString strips ' at ' and rewrites GMT→UTC", () => {
    const spy = jest
      .spyOn(Date.prototype, "toLocaleDateString")
      .mockReturnValue("November 13, 2026 at 5:05 AM GMT-05:00");
    expect(S.getCurrentTimeString(new Date())).toBe(
      "November 13, 2026 5:05 AM UTC-05:00",
    );
    spy.mockRestore();
  });

  it("calculateTimeToCalibrate rounds the estimate to whole minutes", () => {
    _calibrateSound1000HzPostSec.current = 1;
    _calibrateSound1000HzPreSec.current = 1;
    _calibrateSound1000HzSec.current = 2;
    calibrateSoundBurstSec.current = 0.5;
    _calibrateSoundBurstPreSec.current = 1.2; // rounds to 1.0
    _calibrateSoundBurstPostSec.current = 0.7; // rounds to 0.5
    calibrateSoundBurstRepeats.current = 10;
    calibrateSoundBurstMLSVersions.current = 2;
    // 1000 Hz: 3 gains × 4.6×4 s = 55.2 s
    // bursts: 23.5 × (1 + 0.5×10 + 0.5) × 2 = 305.5 s
    expect(S.calculateTimeToCalibrate([1, 2, 3])).toBe(
      Math.round((55.2 + 305.5) / 60),
    );
  });
});

// ---------------------------------------------------------------------------
// Web Audio node graphs
// ---------------------------------------------------------------------------

describe("node graphs", () => {
  it("connectAudioNodes chains nodes and returns an analyser tap", () => {
    const source = new FakeAudioContext().createBufferSource();
    const convolver = new FakeAudioContext().createConvolver();
    const { analyser, floatArray } = S.connectAudioNodes([
      source,
      convolver,
    ] as any);
    expect(source.connect).toHaveBeenCalledWith(convolver);
    expect(convolver.connect).toHaveBeenCalledWith(analyser);
    expect(analyser.connect).toHaveBeenCalled();
    expect(floatArray).toBeInstanceOf(Float32Array);
    expect(floatArray.length).toBe(1024);
  });

  it("createAudioNodeFromBuffer wraps a buffer in a source node", () => {
    const buffer = { sample: true } as any;
    const node = S.createAudioNodeFromBuffer(buffer);
    expect(node.buffer).toBe(buffer);
  });

  it("createImpulseResponseFilterNode fills a non-normalized convolver", async () => {
    const ir = new Float32Array([0.1, -0.2, 0.3]);
    const convolver = await S.createImpulseResponseFilterNode(ir as any);
    expect(convolver.normalize).toBe(false);
    expect(convolver.channelCount).toBe(1);
    const data = convolver.buffer.getChannelData(0);
    expect(data.length).toBe(ir.length - 1);
    expect(data[0]).toBeCloseTo(0.1, 6);
    expect(data[1]).toBeCloseTo(-0.2, 6);
  });

  it("playAudioNodeGraph plays and tears down the graph on end", () => {
    const source = new FakeAudioContext().createBufferSource();
    const convolver = new FakeAudioContext().createConvolver();
    S.playAudioNodeGraph([source, convolver] as any);
    expect(source.start).toHaveBeenCalledWith(0);
    source.onended!();
    expect(source.disconnect).toHaveBeenCalled();
    expect(convolver.disconnect).toHaveBeenCalled();
  });

  it("playAudioNodeGraph stops the recorder and reports amplitude on end", () => {
    const source = new FakeAudioContext().createBufferSource();
    const convolver = new FakeAudioContext().createConvolver();
    const mediaRecorder = { stop: jest.fn() };
    const soundAmpl = document.createElement("span");
    S.playAudioNodeGraph(
      [source, convolver] as any,
      mediaRecorder as any,
      soundAmpl,
    );
    source.onended!();
    expect(mediaRecorder.stop).toHaveBeenCalledTimes(1);
    expect(soundAmpl.innerHTML).toBe("0.00000000");
  });

  it("playAudioNodeGraph shows and hides an accompanying image", () => {
    const source = new FakeAudioContext().createBufferSource();
    const showImage = {
      setImage: jest.fn(),
      setSize: jest.fn(),
      setAutoDraw: jest.fn(),
      _needUpdate: false,
    };
    S.playAudioNodeGraph(
      [source] as any,
      null,
      null,
      showImage as any,
      "scene.png",
    );
    const img = showImage.setImage.mock.calls[0][0] as HTMLImageElement;
    expect(img.id).toBe("showImageEle");
    // Landscape image on a portrait screen: width is the limiting factor
    Object.defineProperty(img, "naturalWidth", { value: 2000 });
    Object.defineProperty(img, "naturalHeight", { value: 1000 });
    Object.defineProperty(window, "innerWidth", { value: 1000 });
    Object.defineProperty(window, "innerHeight", { value: 1000 });
    (img.onload as any)();
    expect(showImage.setSize).toHaveBeenCalled();
    expect(showImage.setAutoDraw).toHaveBeenCalledWith(true);
    source.onended!();
    expect(showImage.setAutoDraw).toHaveBeenCalledWith(false);
  });

  it("playAudioBufferWithImpulseResponseCalibration wires source→convolver", async () => {
    const buffer = { b: 1 } as any;
    const ir = new Float32Array([0.5, -0.5, 0.5, 0.5]);
    await S.playAudioBufferWithImpulseResponseCalibration(buffer, ir as any);
    const ctx = S.audioCtx as unknown as FakeAudioContext;
    const source = ctx.sources[ctx.sources.length - 1];
    const convolver = ctx.convolvers[ctx.convolvers.length - 1];
    expect(source.buffer).toBe(buffer);
    expect(source.connect).toHaveBeenCalledWith(convolver);
    expect(source.start).toHaveBeenCalledWith(0);
    expect(convolver.normalize).toBe(false);
    expect(Array.from(convolver.buffer.getChannelData(0))).toEqual([
      0.5, -0.5, 0.5,
    ]);
  });
});

// ---------------------------------------------------------------------------
// Right/wrong feedback
// ---------------------------------------------------------------------------

describe("displayRightOrWrong", () => {
  it("shows localized feedback and removes it after 1 s", async () => {
    jest.useFakeTimers();
    await S.displayRightOrWrong(true, "en", false);
    const h1 = document.querySelector("h1") as HTMLElement;
    expect(h1.innerHTML).toContain("i18n:T_RIGHT");
    expect(h1.style.color).toBe("green");
    jest.advanceTimersByTime(1000);
    expect(document.querySelector("h1")).toBeNull();
  });

  it("wrong answers are red; last trial awaits removal", async () => {
    jest.useFakeTimers();
    const p = S.displayRightOrWrong(false, "en", true);
    let finished = false;
    // wrong answers are red; the isLastTrial promise resolves after removal
    p.then(() => (finished = true));
    const h1 = document.querySelector("h1") as HTMLElement;
    expect(h1.innerHTML).toContain("i18n:T_Wrong");
    expect(h1.style.color).toBe("red");
    expect(finished).toBe(false);
    await jest.advanceTimersByTimeAsync(1000);
    expect(document.querySelector("h1")).toBeNull();
    expect(finished).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sound-list / zip loading (real zips, stubbed fetch + decode)
// ---------------------------------------------------------------------------

describe("initSoundFilesWithPromiseAll", () => {
  it("loads masker and target sounds from folder zips, filtering extensions", async () => {
    const targets = await zipBlobOf((zip) => {
      zip.file("beep.wav", "w");
      zip.file("note.aac", "a");
      zip.file("readme.txt", "t");
    });
    stubFetch({ "folders/targets.zip": targets });
    const { maskers, target } = await S.initSoundFilesWithPromiseAll([
      { block_condition: "1_1", targetSoundFolder: "targets" },
    ]);
    expect(maskers["1_1"]).toEqual([]);
    expect(target["1_1"].map((f: any) => f.name)).toEqual(["beep", "note"]);
    expect(global.fetch).toHaveBeenCalledWith("folders/targets.zip");
  });
});

describe("loadVocoderPhraseSoundFiles", () => {
  it("indexes talker/subfolder/name/frequency from zip depth", async () => {
    const zip = await zipBlobOf((z) => {
      z.file("1_1/T1/word.1000.wav", "w1");
      z.file("1_1/T1/alt/word.2000.aac", "w2");
      z.file("1_1/T1/other.txt", "x");
      z.folder("1_1/T2");
    });
    stubFetch({ "folders/voc.zip": zip });
    const { target, maskerList } = await S.loadVocoderPhraseSoundFiles([
      { block_condition: "1_1", targetSoundFolder: "voc" },
    ]);
    const t1 = target["1_1"]["T1"];
    expect(t1["word"]["1000"].decodedFrom).toBe(2); // "w1"
    expect(t1["alt"]["word"]["2000"].decodedFrom).toBe(2); // "w2"
    expect(t1["other"]).toBeUndefined(); // wrong extension not stored
    expect(target["1_1"]["T2"]).toEqual({}); // bare directory entry
    expect(maskerList["1_1"]).toEqual({}); // no masker folder configured
  });

  it("aliases target to masker when folders match", async () => {
    const zip = await zipBlobOf((z) => {
      z.file("1_1/T1/word.1000.wav", "w");
    });
    stubFetch({ "folders/same.zip": zip });
    const { target, maskerList } = await S.loadVocoderPhraseSoundFiles([
      {
        block_condition: "2_1",
        maskerSoundFolder: "same",
        targetSoundFolder: "same",
      },
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(target["2_1"]).toBe(maskerList["2_1"]);
    expect(target["2_1"]["T1"]["word"]["1000"]).toBeDefined();
  });
});

describe("parseTargetSoundListFolders", () => {
  // parseCsvFile only needs .text(); a real jsdom Blob lacks it in this env.
  const csvBlob = (text: string) => ({ text: async () => text }) as any;

  it("loads folder zip + CSV list and stores the mapping", async () => {
    readMock.mockImplementation((param: string) =>
      param === "targetSoundList" ? "list.csv" : "sounds",
    );
    (paramReader as any).conditions = [{ block_condition: "1_1" }];
    const soundsZip = await zipBlobOf((z) => {
      z.file("beep.wav", "b");
      z.file("boop.wav", "p");
    });
    stubFetch({
      "folders/sounds.zip": soundsZip,
      "targetSoundLists/list.csv": csvBlob("Left,Right\nbeep.wav,boop.wav\n"),
    });
    await S.parseTargetSoundListFolders();
    expect(targetSoundListFiles["1_1"]["beep"]).toBeDefined();
    expect(targetSoundListMap["1_1"].list).toEqual([
      { left: "beep", right: "boop" },
    ]);
  });

  it("is a no-op without sound-list conditions", async () => {
    stubFetch({});
    (paramReader as any).conditions = [{ block_condition: "1_1" }];
    readMock.mockReturnValue("");
    await expect(S.parseTargetSoundListFolders()).resolves.toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects rows referencing missing files", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    readMock.mockImplementation((param: string) =>
      param === "targetSoundList" ? "list.csv" : "sounds",
    );
    (paramReader as any).conditions = [{ block_condition: "1_1" }];
    const soundsZip = await zipBlobOf((z) => z.file("beep.wav", "b"));
    stubFetch({
      "folders/sounds.zip": soundsZip,
      "targetSoundLists/list.csv": csvBlob("Left,Right\nbeep.wav,absent.wav\n"),
    });
    await S.parseTargetSoundListFolders();
    expect(targetSoundListMap["1_1"]).toBeUndefined(); // aborted before storing
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    errSpy.mockRestore();
  });
});

describe("addTrialStaircaseSummariesToDataForSound", () => {
  it("writes the trial QUEST summary columns", () => {
    const experiment = { addData: jest.fn() };
    S.addTrialStaircaseSummariesToDataForSound(
      {
        _currentStaircase: {
          _name: "1_1",
          mean: () => 2,
          sd: () => 0.25,
          quantile: () => 0.5,
          _jsQuest: { quantileOrder: 0.4 },
        },
      } as any,
      { experiment } as any,
    );
    expect(experiment.addData.mock.calls).toEqual([
      ["staircaseName", "1_1"],
      ["questMeanAtEndOfTrial", 2],
      ["questSDAtEndOfTrial", 0.25],
      ["questQuantileOfQuantileOrderAtEndOfTrial", 0.5],
    ]);
  });

  it("does nothing without a current staircase (no throw)", () => {
    const experiment = { addData: jest.fn() };
    expect(() =>
      S.addTrialStaircaseSummariesToDataForSound(
        {} as any,
        {
          experiment,
        } as any,
      ),
    ).not.toThrow();
    expect(experiment.addData).not.toHaveBeenCalled();
  });
});
