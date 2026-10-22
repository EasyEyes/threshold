/**
 * Sound node teardown — playAudioBuffer builds a per-play Web Audio graph
 * (source → analyser → destination) and, historically, never disconnected it:
 * every trial with a target sound left a live analyser connected to the
 * destination for the rest of the session (memory + per-frame processing for
 * hour-long experiments). Desired behavior: the graph tears itself down when
 * the sound ends.
 *
 * @jest-environment jsdom
 */

import { readFileSync } from "node:fs";
import * as path from "node:path";

// soundUtils imports globals whose module has a top-level await.
jest.mock("../components/soundTest", () => ({
  getMaxValueOfAbsoluteValueOfBuffer: () => 0,
}));
jest.mock("../components/readPhrases", () => ({
  readi18nPhrases: () => "",
}));
jest.mock("../parameters/phrasesRegistry", () => ({
  getPhrases: () => ({}),
}));
jest.mock("../threshold", () => ({ paramReader: {} }));
jest.mock("../components/global", () => ({
  _calibrateSoundBurstPostSec: [],
  _calibrateSoundBurstPreSec: [],
  _calibrateSound1000HzPostSec: [],
  _calibrateSound1000HzPreSec: [],
  _calibrateSound1000HzSec: [],
  calibrateSoundBurstMLSVersions: [],
  calibrateSoundBurstRepeats: [],
  calibrateSoundBurstSec: [],
  calibrateSoundBurstsWarmup: [],
  calibrateSoundCheck: {},
  targetSoundListFiles: {},
  targetSoundListMap: {},
}));

/** Capturing fakes for the module-level AudioContext soundUtils creates. */
const made = { sources: [] as any[], analysers: [] as any[] };
class FakeAudioContext {
  destination = { connect: jest.fn(), disconnect: jest.fn() };
  createBufferSource() {
    const source = {
      buffer: null as unknown,
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      onended: null as null | (() => void),
    };
    made.sources.push(source);
    return source;
  }
  createAnalyser() {
    const analyser = {
      frequencyBinCount: 1024,
      connect: jest.fn(),
      disconnect: jest.fn(),
      getFloatTimeDomainData: jest.fn(),
    };
    made.analysers.push(analyser);
    return analyser;
  }
}
(window as any).AudioContext = FakeAudioContext;

// soundUtils creates its AudioContext at import time — install the fake first.
let playAudioBuffer: typeof import("../components/soundUtils").playAudioBuffer;
let audioCtx: import("../components/soundUtils").audioCtx;
beforeAll(async () => {
  ({ playAudioBuffer, audioCtx } = await import("../components/soundUtils"));
});

describe("playAudioBuffer node teardown", () => {
  it("builds source → analyser → destination", () => {
    playAudioBuffer({} as never);
    const source = made.sources.at(-1)!;
    const analyser = made.analysers.at(-1)!;
    expect(source.connect).toHaveBeenCalledWith(analyser);
    expect(analyser.connect).toHaveBeenCalledWith(audioCtx.destination);
  });

  it("disconnects the analyser and the source when the sound ends", () => {
    playAudioBuffer({} as never);
    const source = made.sources.at(-1)!;
    const analyser = made.analysers.at(-1)!;
    expect(typeof source.onended).toBe("function");
    source.onended!();
    expect(analyser.disconnect).toHaveBeenCalled();
    expect(source.disconnect).toHaveBeenCalled();
  });

  it("still stops a mediaRecorder on end (behavior preserved)", () => {
    const mediaRecorder = { stop: jest.fn() };
    playAudioBuffer({} as never, mediaRecorder as never);
    made.sources.at(-1)!.onended!();
    expect(mediaRecorder.stop).toHaveBeenCalled();
  });
});

/** Source-contract sibling: the impulse-response calibration path must
 *  disconnect its node graph too (same leak class, larger graph). */
describe("playAudioBufferWithImpulseResponseCalibration teardown (contract)", () => {
  const src = readFileSync(
    path.join(__dirname, "../components/soundUtils.js"),
    "utf8",
  );
  it("its onended disconnects the analyser graph", () => {
    // Find the IR-calibration onended handler and require a disconnect.
    const handler = src.match(/sourceNode\.onended[^;]*=>\s*{([\s\S]*?)\n  };/);
    expect(handler).not.toBeNull();
    expect(handler![1]).toMatch(/\.disconnect\(\)/);
  });
});
