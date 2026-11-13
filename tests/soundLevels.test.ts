/**
 * @jest-environment node
 *
 * Sound-level correction for tone-in-melody and speech-in-noise trials: the
 * requested dB SPL is only honoured while the resulting peak stays under the
 * target ceiling; above it the level is recomputed from the ceiling so the
 * stimulus cannot clip.
 */

import { jest, expect, describe, test } from "@jest/globals";

// Faithful, dependency-free versions of the helpers (soundTest.js pulls in the
// whole audio stack; these three are pure math).
const getMaxValueOfAbsoluteValueOfBuffer = (buffer: number[]) =>
  Math.max(...buffer.map((value) => Math.abs(value)));
const getGainValue = (dbSPL: number) => Math.pow(10, dbSPL / 20);
const calculateDBFromRMS = (rms: number) =>
  Math.round(20 * Math.log10(rms) * 10) / 10;

jest.mock("../components/soundTest", () => ({
  calculateDBFromRMS,
  getGainValue,
  getMaxValueOfAbsoluteValueOfBuffer,
  cloneAudioBuffer: jest.fn(),
}));
jest.mock("../components/global", () => ({
  targetSoundListFiles: {},
  targetSoundListMap: {},
  targetSoundListTrialData: [],
}));
jest.mock("../components/soundUtils", () => ({
  setWaveFormToZeroDbSPL: jest.fn(),
  adjustSoundDbSPL: jest.fn(),
  audioCtx: {},
  initSoundFilesWithPromiseAll: jest.fn(),
}));
jest.mock("../components/vocoderPhrase", () => ({
  initVocoderPhraseSoundFiles: jest.fn(),
}));
jest.mock("../components/rng", () => ({ random: jest.fn(() => 0.5) }));
jest.mock("merge-audio-buffers", () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { getCorrectedInDbAndSoundDBSPLForToneInMelody } from "../components/toneInMelody";
import { getCorrectedInDbAndSoundDBSPLForSpeechInNoise } from "../components/speechInNoise";

const quiet = [0.5, -0.5]; // |max| = 0.5
const loud = [1, -1]; // |max| = 1

describe.each([
  ["toneInMelody", getCorrectedInDbAndSoundDBSPLForToneInMelody],
  ["speechInNoise", getCorrectedInDbAndSoundDBSPLForSpeechInNoise],
])("%s level correction", (_name, correct) => {
  test("uses the requested level while the peak stays under the ceiling", () => {
    const { inDB, correctedSoundDBSPL } = correct(70, 20, quiet, 1000);
    // targetDB = 70 - 20 = 50; peak gain ≈ 0.5 * 316 = 158 < 1000.
    expect(inDB).toBe(50);
    expect(correctedSoundDBSPL).toBe(70);
  });

  test("recomputes from the ceiling when the peak would exceed it", () => {
    const { inDB, correctedSoundDBSPL } = correct(70, 20, loud, 100);
    // 1 * 10^(50/20) = 316 > 100 → 20*log10(100) = 40 dB.
    expect(inDB).toBe(40);
    expect(correctedSoundDBSPL).toBe(60);
  });

  test("the ceiling decision is made on the pre-corrected peak", () => {
    const below = correct(70, 20, quiet, 159);
    const above = correct(70, 20, quiet, 157);
    expect(below.inDB).toBe(50);
    expect(above.inDB).toBeLessThan(50);
  });

  test("a quiet buffer at a high ceiling keeps the requested level exactly", () => {
    const { correctedSoundDBSPL } = correct(65, 5, [0.01], 10_000);
    expect(correctedSoundDBSPL).toBe(65);
  });
});
