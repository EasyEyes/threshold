/**
 * @jest-environment jsdom
 *
 * Direct unit tests for the pure DSP and DOM helpers of
 * components/soundTest.js. Existing suites (soundLevels, soundUtilsPure)
 * mock this module with reimplementations, so the real implementations
 * have no coverage. Only the audio-graph and plotting boundaries are
 * mocked; the level math, compressor model, dropdown logic, and the
 * results table run for real.
 */

jest.mock("../components/global", () => ({
  soundCalibrationLevelDBSPL: { current: undefined },
  soundCalibrationResults: { current: undefined },
  calibrateSoundCheck: {},
  _calibrateSound1000HzBool: {},
  _calibrateSound1000HzDB: {},
  _calibrateSound1000HzPreSec: {},
  _calibrateSound1000HzSec: {},
  _calibrateSound1000HzPostSec: {},
  actualBitsPerSample: { current: undefined },
  actualSamplingRate: { current: undefined },
  microphoneActualSamplingRate: { current: undefined },
  allHzCalibrationResults: {},
  webAudioDeviceNames: {},
  loudspeakerInfo: { current: {} },
  micsForSoundTestPage: {},
  calibrationTime: {},
  flags: {},
  microphoneCalibrationResult: {},
  deviceType: {},
  microphoneInfo: { current: {} },
  loudspeakerBrowserDetails: {},
  microphoneBrowserDetails: {},
  thisExperimentInfo: {},
  _calibrateSoundBurstPreSec: {},
  _calibrateSoundBurstPostSec: {},
  calibrateSoundBurstSec: {},
  calibrateSoundBurstRepeats: {},
  calibrateSoundBurstMLSVersions: {},
  calibrateSoundBackgroundSecs: {},
  calibrateSoundHz: {},
  calibrateSoundBurstDownsample: {},
  calibrateSoundSimulateLoudspeaker: {},
  calibrateSoundSimulateMicrophone: {},
  calibrateSoundIRSec: {},
  calibrateSoundIIRSec: {},
  calibrateSoundIIRPhase: {},
  calibrateSoundSmoothMinBandwidthHz: {},
  calibrateSoundSmoothOctaves: {},
}));
jest.mock("../components/soundTestPlots", () => ({
  plotForAllHz: jest.fn(),
  plotImpulseResponse: jest.fn(),
  plotSoundLevels1000Hz: jest.fn(),
  plotRecordings: jest.fn(),
  plotVolumeRecordings: jest.fn(),
  PlotsForTestPage: jest.fn(),
}));
jest.mock("../components/soundUtils", () => ({
  adjustSoundDbSPL: jest.fn(),
  generatePureTone: jest.fn(),
  generateTones: jest.fn(),
  getAudioBufferFromArrayBuffer: jest.fn(),
  getCurrentTimeString: jest.fn(),
  // Faithful reimplementation of the pure RMS helper (the real module
  // constructs an AudioContext at import time, unusable in jsdom).
  getRMSOfWaveForm: (arr: number[]) =>
    Math.sqrt(arr.reduce((sum, v) => sum + v * v, 0) / arr.length),
  playAudioBuffer: jest.fn(),
  playAudioBufferWithImpulseResponseCalibration: jest.fn(),
  setWaveFormToZeroDbSPL: jest.fn(),
}));
jest.mock("../components/readPhrases", () => ({
  readi18nPhrases: (key: string) => key,
}));
jest.mock("../components/soundCalibrationHelpers", () => ({
  addMicrophoneToFirestore: jest.fn(),
  findGainatFrequency: jest.fn(),
  getCalibrationFile: jest.fn(),
  parseCalibrationFile: jest.fn(),
  readFrqGainFromFirestore: jest.fn(),
}));

import { plotSoundLevels1000Hz } from "../components/soundTestPlots";
import {
  CompressorDb,
  SoundLevelModel,
  calculateDBFromRMS,
  cloneAudioBuffer,
  displayParameters1000Hz,
  getCorrectedInDbAndSoundDBSPL,
  getMax,
  getMaxValueOfAbsoluteValueOfBuffer,
  getGainValue,
  updateMicrophoneDropdown,
} from "../components/soundTest";

const plotMock = plotSoundLevels1000Hz as unknown as jest.Mock;
let consoleLogSpy: jest.SpyInstance;

class FakeAudioBuffer {
  length: number;
  sampleRate: number;
  numberOfChannels: number;
  channels: Float32Array[];

  constructor({
    length,
    sampleRate,
    numberOfChannels,
  }: {
    length: number;
    sampleRate: number;
    numberOfChannels: number;
  }) {
    this.length = length;
    this.sampleRate = sampleRate;
    this.numberOfChannels = numberOfChannels;
    this.channels = Array.from(
      { length: numberOfChannels },
      () => new Float32Array(length),
    );
  }

  getChannelData(channel: number) {
    return this.channels[channel];
  }

  copyToChannel(data: Float32Array, channel: number) {
    this.channels[channel].set(data);
  }
}

beforeAll(() => {
  (globalThis as any).AudioBuffer = FakeAudioBuffer;
});

afterAll(() => {
  delete (globalThis as any).AudioBuffer;
});

beforeEach(() => {
  plotMock.mockReset();
  consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy.mockRestore();
});

describe("decibel arithmetic", () => {
  it("calculateDBFromRMS converts RMS to dB, rounded to one decimal", () => {
    expect(calculateDBFromRMS(1)).toBe(0);
    expect(calculateDBFromRMS(0.5)).toBe(-6.0); // -6.0206 rounds to -6.0
    expect(calculateDBFromRMS(1 / Math.SQRT2)).toBe(-3.0);
    expect(calculateDBFromRMS(0.01)).toBe(-40.0);
    expect(calculateDBFromRMS(2)).toBe(6.0);
  });

  it("getGainValue is the inverse dB-to-linear conversion", () => {
    expect(getGainValue(0)).toBeCloseTo(1, 10);
    expect(getGainValue(20)).toBeCloseTo(10, 10);
    expect(getGainValue(-20)).toBeCloseTo(0.1, 10);
    expect(getGainValue(6)).toBeCloseTo(10 ** 0.3, 10);
    for (const db of [-12, -3, 4.5, 11]) {
      expect(calculateDBFromRMS(getGainValue(db))).toBeCloseTo(db, 1);
    }
  });

  it("getMax scans arrays backwards, tolerating empties and negatives", () => {
    expect(getMax([3, -5, 9, 0])).toBe(9);
    expect(getMax([-3, -1])).toBe(-1);
    expect(getMax([42])).toBe(42);
    expect(getMax([])).toBe(-Infinity);
  });

  it("getMaxValueOfAbsoluteValueOfBuffer returns the peak magnitude", () => {
    expect(getMaxValueOfAbsoluteValueOfBuffer([0.2, -0.8, 0.5])).toBe(0.8);
    expect(getMaxValueOfAbsoluteValueOfBuffer([-1, 1])).toBe(1);
    expect(getMaxValueOfAbsoluteValueOfBuffer([0])).toBe(0);
  });
});

describe("CompressorDb", () => {
  it("compresses levels above the knee by the ratio", () => {
    // T=60, R=2, W=0: inDb 70 -> 60 + 0.5*(70-60) = 65
    expect(CompressorDb(70, 60, 2, 0)).toBeCloseTo(65, 10);
    expect(CompressorDb(80, 60, 4, 0)).toBeCloseTo(65, 10); // 60+10
  });

  it("passes levels below the knee through unchanged", () => {
    expect(CompressorDb(50, 60, 2, 0)).toBe(50);
    expect(CompressorDb(-10, 0, 8, 5)).toBe(-10);
  });

  it("blends smoothly through the soft knee and matches both edges", () => {
    // T=60, W=10, R=2: knee spans [55, 65]. At inDb=60:
    // 60 - (0.5 * (60-55)^2) / (2*10) = 59.375
    expect(CompressorDb(60, 60, 2, 10)).toBeCloseTo(59.375, 10);
    // Continuity at both knee edges
    const lower = CompressorDb(55, 60, 2, 10);
    const upper = CompressorDb(65, 60, 2, 10);
    expect(lower).toBeCloseTo(55, 10);
    expect(upper).toBeCloseTo(60 + 0.5 * (65 - 60), 10); // == 62.5
    // Soft-knee value at the upper edge equals the hard-compression value
    expect(CompressorDb(65, 60, 2, 10)).toBeCloseTo(
      CompressorDb(65, 60, 2, 0),
      10,
    );
  });

  it("treats a negative knee width as zero", () => {
    expect(CompressorDb(70, 60, 2, -5)).toBe(CompressorDb(70, 60, 2, 0));
    expect(CompressorDb(50, 60, 2, -5)).toBe(CompressorDb(50, 60, 2, 0));
  });
});

describe("getCorrectedInDbAndSoundDBSPL", () => {
  // Impulse-like waveform: maxAbs 0.9, rms 0.45 -> crest factor 2 (+6.02 dB)
  const impulse = [0.9, 0, 0, 0];

  it("requests the full target level when it fits without clipping", () => {
    // target 50-60 = -10 dB -> gain 0.316; 2*0.316 < 1, no clipping
    const { inDB, correctedSoundDBSPL } = getCorrectedInDbAndSoundDBSPL(
      50,
      60,
      impulse,
    );
    expect(inDB).toBeCloseTo(-10, 10);
    expect(correctedSoundDBSPL).toBeCloseTo(50, 10);
  });

  it("caps the requested level at full scale when it would clip", () => {
    // target 70-60 = +10 dB would clip; cap is 20*log10(1/2) = -6.0 dB
    const { inDB, correctedSoundDBSPL } = getCorrectedInDbAndSoundDBSPL(
      70,
      60,
      impulse,
    );
    expect(inDB).toBe(-6.0);
    expect(correctedSoundDBSPL).toBeCloseTo(54.0, 10);
  });

  it("bypasses the gain correction when noCorrection is set", () => {
    const clipping = getCorrectedInDbAndSoundDBSPL(70, 60, impulse, true);
    expect(clipping.inDB).toBe(-6.0);
    expect(clipping.correctedSoundDBSPL).toBe(-6.0); // no soundGain added

    const fitting = getCorrectedInDbAndSoundDBSPL(-10, 60, impulse, true);
    expect(fitting.inDB).toBeCloseTo(-10, 10);
    expect(fitting.correctedSoundDBSPL).toBeCloseTo(-10, 10);
  });
});

describe("SoundLevelModel", () => {
  it("composes compression with the transducer gain", () => {
    expect(SoundLevelModel(70, 30, 50, 60, 0, 2)).toBeCloseTo(115, 10);
    expect(SoundLevelModel(50, 30, 50, 60, 0, 2)).toBeCloseTo(100, 10);
    // equals CompressorDb + gain for any operating point
    for (const inDb of [-20, 55, 60, 65, 90]) {
      expect(SoundLevelModel(inDb, 30, 50, 60, 10, 4)).toBeCloseTo(
        CompressorDb(inDb, 60, 4, 10) + 50,
        10,
      );
    }
  });

  it("characterization: backgroundDbSpl does not affect the output", () => {
    // The revised model dropped the background-noise term; pin that so a
    // future change is a conscious one.
    const withBackground = SoundLevelModel(70, 40, 50, 60, 0, 2);
    const withoutBackground = SoundLevelModel(70, -100, 50, 60, 0, 2);
    expect(withBackground).toBe(withoutBackground);
  });
});

describe("cloneAudioBuffer", () => {
  it("copies channel data into an independent buffer with the same format", () => {
    const source = new FakeAudioBuffer({
      length: 3,
      sampleRate: 48000,
      numberOfChannels: 2,
    });
    source.getChannelData(0).set([0.1, -0.2, 0.3]);
    source.getChannelData(1).set([-0.4, 0.5, -0.6]);

    const clone = cloneAudioBuffer(source as any) as unknown as FakeAudioBuffer;
    expect(clone).not.toBe(source);
    expect(clone.length).toBe(3);
    expect(clone.sampleRate).toBe(48000);
    expect(clone.numberOfChannels).toBe(2);
    expect(Array.from(clone.getChannelData(0))).toEqual([
      ...new Float32Array([0.1, -0.2, 0.3]),
    ]);
    expect(Array.from(clone.getChannelData(1))).toEqual([
      ...new Float32Array([-0.4, 0.5, -0.6]),
    ]);

    clone.getChannelData(0)[0] = 99;
    expect(source.getChannelData(0)[0]).toBeCloseTo(0.1, 6); // deep copy
  });
});

describe("updateMicrophoneDropdown", () => {
  const mics = [
    { deviceId: "umik", label: "miniDSP UMIK-1 123456" },
    { deviceId: "builtin", label: "Built-in Microphone" },
    { deviceId: "unlabeled" },
  ];

  const makeDropdown = (previousValue?: string) => {
    const dropdown = document.createElement("select");
    if (previousValue) {
      const option = document.createElement("option");
      option.value = previousValue;
      dropdown.appendChild(option);
      dropdown.value = previousValue;
    }
    return dropdown;
  };

  it("lists every microphone, enabling only UMIK devices", () => {
    const dropdown = makeDropdown();
    updateMicrophoneDropdown(dropdown, mics);

    expect(dropdown.options).toHaveLength(3);
    expect(dropdown.options[0].value).toBe("umik");
    expect(dropdown.options[0].text).toBe("miniDSP UMIK-1 123456");
    expect(dropdown.options[0].disabled).toBe(false);
    expect(dropdown.options[1].disabled).toBe(true);
  });

  it("falls back to a placeholder label for unlabelled devices", () => {
    const dropdown = makeDropdown();
    updateMicrophoneDropdown(dropdown, mics);
    expect(dropdown.options[2].text).toBe("Unknown Microphone");
    expect(dropdown.options[2].disabled).toBe(true);
  });

  it("restores a previous selection that is still listed", () => {
    const dropdown = makeDropdown("builtin");
    updateMicrophoneDropdown(dropdown, mics);
    expect(dropdown.value).toBe("builtin");
  });

  it("selects the first enabled microphone when the previous value is gone", () => {
    const dropdown = makeDropdown("removed-device");
    updateMicrophoneDropdown(dropdown, mics);
    expect(dropdown.value).toBe("umik");
  });

  it("leaves nothing selected when every microphone is disabled", () => {
    const dropdown = makeDropdown();
    updateMicrophoneDropdown(dropdown, [
      { deviceId: "x", label: "Internal mic" },
    ]);
    expect(dropdown.value).toBe("");
    expect(dropdown.options[0].disabled).toBe(true);
  });
});

describe("displayParameters1000Hz", () => {
  const makeElems = () => {
    const citation = document.createElement("div");
    const background = document.createElement("div");
    const soundParametersFromCalibration = document.createElement("div");
    const soundLevelsTable = document.createElement("table");
    const soundLevelsTableContainer = document.createElement("div");
    const soundTestPlots = document.createElement("div");
    soundLevelsTableContainer.appendChild(soundLevelsTable);
    return {
      citation,
      background,
      soundParametersFromCalibration,
      soundLevelsTable,
      soundLevelsTableContainer,
      soundTestPlots,
    };
  };

  const results = {
    outDBSPL1000Values: [65.04, 55.02, 74.98],
    thdValues: [0.0123, 0.0456, 0.001],
    outDBSPLValues: [64.91, 54.87, 74.82],
    parameters: { gainDBSPL: 60, backgroundDBSPL: 30 },
  };
  const soundLevels = ["60", "50", "70"];

  const renderTable = () => {
    const elems = makeElems();
    displayParameters1000Hz(elems as any, soundLevels, results as any);
    return elems;
  };

  it("renders one row per level, sorted descending by input level", () => {
    const elems = renderTable();
    const rows = elems.soundLevelsTable.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(3);
    const firstCells = Array.from(rows[0].querySelectorAll("td")).map(
      (td) => td.innerHTML,
    );
    const lastCells = Array.from(rows[2].querySelectorAll("td")).map(
      (td) => td.innerHTML,
    );
    expect(firstCells).toEqual(["70.0", "5.0", "75.0", "0.10", "74.8"]);
    expect(lastCells).toEqual(["50.0", "5.0", "55.0", "4.56", "54.9"]);
  });

  it("labels the table for the calibration target", () => {
    const elems = renderTable();
    const headers = Array.from(
      elems.soundLevelsTable.querySelectorAll("thead th"),
    ).map((th) => th.innerHTML);
    expect(headers).toEqual([
      "in (dB)",
      "out - in (dB)",
      "out (dB)",
      "THD (%)",
      "out @all Hz (dB)",
    ]);
  });

  it("replaces any previous title and reveals the containers", () => {
    const elems = makeElems();
    const oldTitle = document.createElement("h6");
    oldTitle.innerHTML = "stale title";
    elems.soundLevelsTableContainer.insertBefore(
      oldTitle,
      elems.soundLevelsTable,
    );

    displayParameters1000Hz(elems as any, soundLevels, results as any);

    const titles = elems.soundLevelsTableContainer.querySelectorAll("h6");
    expect(titles).toHaveLength(1);
    expect(titles[0].innerHTML).toBe("Sound Level at 1000 Hz");
    expect(titles[0].nextSibling).toBe(elems.soundLevelsTable);
    expect(elems.citation.style.visibility).toBe("visible");
    expect(elems.background.style.top).toBe("70%");
  });

  it("mounts a fresh canvas and forwards the series to the plot", () => {
    const elems = renderTable();
    const canvas = elems.soundTestPlots.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect((canvas as HTMLCanvasElement).width).toBe(500);
    expect(elems.soundTestPlots.childElementCount).toBe(1);

    expect(plotMock).toHaveBeenCalledTimes(1);
    const [plotCanvas, parameters, levels, outValues, title, goal, isLoud] =
      plotMock.mock.calls[0];
    expect(plotCanvas).toBe(canvas);
    expect(parameters).toBe(results.parameters);
    expect(levels).toBe(soundLevels);
    expect(outValues).toBe(results.outDBSPL1000Values);
    expect(title).toBe("Sound Level at 1000 Hz");
    expect(goal).toBe("speakerAndMic");
    expect(isLoud).toBe(true);
  });
});
