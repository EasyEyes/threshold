/**
 * @jest-environment node
 *
 * Sound-calibration helpers with real CSV/XLSX parsing. Network, device,
 * translation, and Firestore boundaries are mocked; the helpers run for real.
 */

jest.mock("../components/readPhrases", () => ({
  readi18nPhrases: jest.fn(),
}));
jest.mock("../components/firebase/firebase.js", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  setDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  Timestamp: class {
    constructor(
      public seconds: number,
      public nanoseconds: number,
    ) {}
    toDate() {
      return new Date(this.seconds * 1000 + this.nanoseconds / 1e6);
    }
  },
}));
jest.mock("../components/global", () => ({
  calibrateSoundUMIKBase_dB: { umik1: 10, umik2: 20 },
  microphoneInfo: {
    current: { micrFullManufacturerName: "Acme", micFullName: "Mic One" },
  },
  invertedImpulseResponse: { current: undefined },
  loudspeakerIR: {},
  allHzCalibrationResults: { component: {} },
  loudspeakerInfo: { current: {} },
  actualBitsPerSample: { current: undefined },
  actualSamplingRate: { current: undefined },
  currentFirestoreProfileDocumentID: {},
}));
jest.mock("../components/globalPsychoJS", () => ({
  psychoJS: { experiment: { addData: jest.fn() } },
}));

import { write, utils as xlsxUtils } from "xlsx";
import { readi18nPhrases } from "../components/readPhrases";
import {
  findGainatFrequency,
  findMaxValue,
  findMinValue,
  getCalibrationFile,
  getDeviceDetails,
  getDeviceString,
  getInstructionText_,
  identifyDevice,
  isFrequencyResponseFile,
  isImpulseResponseFile,
  parseCalibrationFile,
  parseFrequencyResponseFile,
  parseImpulseResponseFile,
  parseImpulseResponseOrFrequencyResponseFile,
  removeElements,
  safeMax,
  safeMin,
} from "../components/soundCalibrationHelpers";

const phraseMock = readi18nPhrases as unknown as jest.Mock;
const originalFetch = global.fetch;
let consoleLogSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

const fetchMock = () => global.fetch as unknown as jest.Mock;

const mockTextResponse = (text: string) => {
  fetchMock().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    text: jest.fn().mockResolvedValue(text),
  });
};

const mockHttpError = () => {
  fetchMock().mockResolvedValue({
    ok: false,
    status: 404,
    statusText: "Not Found",
  });
};

const workbookBytes = (rows: unknown[][]) => {
  const workbook = xlsxUtils.book_new();
  xlsxUtils.book_append_sheet(
    workbook,
    xlsxUtils.aoa_to_sheet(rows),
    "Calibration",
  );
  return write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
};

const mockWorkbookResponse = (rows: unknown[][]) => {
  const bytes = workbookBytes(rows);
  fetchMock().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    arrayBuffer: jest.fn().mockResolvedValue(bytes),
  });
};

beforeEach(() => {
  global.fetch = jest.fn() as any;
  delete (globalThis as any).fod;
  phraseMock.mockReset().mockImplementation((key: string, language: string) => {
    if (key === "RC_microphoneIsInCalibrationLibrary") {
      return "Library [[xxx]]";
    }
    if (key === "RC_BrandDesktopComputer") return "Computer [[BBB]]";
    return `${key}:${language}`;
  });
  consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

afterAll(() => {
  global.fetch = originalFetch;
  delete (globalThis as any).fod;
});

describe("identifyDevice", () => {
  it("maps the device-detector fields used by calibration", async () => {
    (globalThis as any).fod = {
      complete: (callback: (data: any) => void) =>
        callback({
          device: {
            ismobile: false,
            hardwarename: "MacBook",
            hardwarefamily: "MacBook Pro",
            hardwaremodel: "14,3",
            oem: "Apple",
            hardwaremodelvariants: "14,3",
            deviceid: "device-1",
            platformname: "macOS",
            platformversion: "15.0",
            devicetype: "desktop",
          },
        }),
    };

    await expect(identifyDevice()).resolves.toEqual({
      IsMobile: false,
      HardwareName: "MacBook",
      HardwareFamily: "MacBook Pro",
      HardwareModel: "14,3",
      OEM: "Apple",
      HardwareModelVariants: "14,3",
      DeviceId: "device-1",
      PlatformName: "macOS",
      PlatformVersion: "15.0",
      DeviceType: "desktop",
    });
  });

  it("returns null when device detection is unavailable", async () => {
    await expect(identifyDevice()).resolves.toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching or executing script:",
      expect.stringContaining("fod"),
    );
  });
});

describe("localized device instructions", () => {
  it.each([
    ["Android", "RC_findModelAndroid"],
    ["iOS", "RC_findModelIOs"],
    ["Windows", "RC_findModelWindows"],
    ["macOS", "RC_findModelMacOs"],
    ["Linux", "RC_findModelLinux"],
    ["Plan9", "RC_findModelGeneric"],
  ])("selects %s instructions", (platformName, phraseKey) => {
    expect(
      getInstructionText_({ PlatformName: platformName }, "en", false, false),
    ).toBe(`${phraseKey}:en`);
  });

  it("includes microphone-library and computer details for desktop calibration", () => {
    const text = getInstructionText_(
      { PlatformName: "Windows", OEM: "Acme" },
      "en",
      false,
      true,
    );
    expect(text).toContain("Library Acme Mic One");
    expect(text).toContain("Computer Acme");
    expect(text).toContain("RC_findModelWindows:en");
  });

  it("omits library details for smartphones and unknown computer brands", () => {
    const phone = getInstructionText_(
      { PlatformName: "Android", OEM: "PhoneCo" },
      "en",
      true,
      true,
    );
    expect(phone).toBe("RC_findModelAndroid:en");

    const unknown = getInstructionText_(
      { PlatformName: "Windows", OEM: "Unknown" },
      "en",
      false,
      true,
    );
    expect(unknown).toContain("Computer ");
    expect(unknown).not.toContain("Computer Unknown");
  });

  it("formats the device brand string", () => {
    expect(
      getDeviceString({ PlatformName: "Android", OEM: "Acme" }, "fr"),
    ).toBe("<b>RC_brand:fr:</b> Acme <br>");
    expect(phraseMock).toHaveBeenCalledWith("RC_findModelAndroid", "fr");
  });

  it("removes only present elements", () => {
    const first = { remove: jest.fn() };
    const second = { remove: jest.fn() };
    removeElements([first, null, second]);
    expect(first.remove).toHaveBeenCalledTimes(1);
    expect(second.remove).toHaveBeenCalledTimes(1);
  });
});

describe("calibration-file retrieval and parsing", () => {
  it("retrieves calibration text through the CORS proxy", async () => {
    mockTextResponse("Sens Factor =-1dB\nheaders\n1000\t2");
    await expect(getCalibrationFile("calibration.txt")).resolves.toContain(
      "Sens Factor =",
    );
    expect(fetchMock()).toHaveBeenCalledWith(
      "https://easyeyes-cors-proxy-1cf4742aef20.herokuapp.com/calibration.txt",
    );
  });

  it("rejects non-calibration responses and fetch failures", async () => {
    mockTextResponse("not a calibration file");
    await expect(getCalibrationFile("bad.txt")).resolves.toBe(false);
    fetchMock().mockRejectedValue(new Error("offline"));
    await expect(getCalibrationFile("offline.txt")).resolves.toBe(false);
  });

  it("applies sensitivity and the UMIK-1 base gain", () => {
    const file = "Sens Factor =-2.5dB\nignored\n100\t1\n1000\t2\n";
    expect(parseCalibrationFile(file, "UMIK-1")).toEqual({
      Freq: [100, 1000],
      Gain: [8.5, 9.5],
      SensFactor: -2.5,
    });
  });

  it("uses the UMIK-2 base and skips malformed rows", () => {
    const file =
      "No sensitivity\nignored\n100\t1\nbad\t2\n200\tbad\n300\tInfinity\nInfinity\t1\n";
    expect(parseCalibrationFile(file, "UMIK-2")).toEqual({
      Freq: [100],
      Gain: [21],
      SensFactor: null,
    });
  });

  it("preserves samples whose calibrated gain is zero", () => {
    const file = "No sensitivity\nignored\n100\t-1\n1000\t-10\n";
    expect(parseCalibrationFile(file, "UMIK-1")).toEqual({
      Freq: [100, 1000],
      Gain: [9, 0],
      SensFactor: null,
    });
  });
});

describe("findGainatFrequency", () => {
  const frequencies = [100, 1000, 10000];
  const gains = [-10, 0, 20];

  it("clamps targets below and above the measured range", () => {
    expect(findGainatFrequency(frequencies, gains, 50)).toBe(-10);
    expect(findGainatFrequency(frequencies, gains, 20000)).toBe(20);
  });

  it("returns exact samples and linearly interpolates between samples", () => {
    expect(findGainatFrequency(frequencies, gains, 1000)).toBe(0);
    expect(findGainatFrequency(frequencies, gains, 550)).toBe(-5);
    expect(findGainatFrequency(frequencies, gains, 3250)).toBe(5);
  });
});

describe("getDeviceDetails", () => {
  it.each([
    ["iOS", "RC_modelNumberIOs", "RC_findModelIOs"],
    ["macOS", "RC_modelNumberMacOS", "RC_findModelMacOs"],
    ["win", "RC_modelNumberWindows", "RC_findModelWindows"],
    ["Android", "RC_modelNumberAndroid", "RC_findModelAndroid"],
    ["Linux", "RC_modelNumberLinux", "RC_findModelLinux"],
    ["cros", "RC_modelNumber", "RC_findModelGeneric"],
    ["openbsd", "RC_modelNumber", "RC_findModelGeneric"],
    ["Fuchsia", "RC_modelNumber", "RC_findModelGeneric"],
    ["unknown", "RC_modelNumber", "RC_findModelGeneric"],
  ])("maps %s to the correct phrases", (platform, modelKey, findKey) => {
    expect(getDeviceDetails(platform, "de")).toEqual({
      preferredModelNumber: `${modelKey}:de`,
      findModel: `${findKey}:de`,
    });
  });
});

describe("numeric helpers", () => {
  it("finds minima and maxima without sorting or mutating input", () => {
    const values = [3, -2, 8, 1];
    expect(findMinValue(values)).toBe(-2);
    expect(findMaxValue(values)).toBe(8);
    expect(values).toEqual([3, -2, 8, 1]);
  });

  it("handles singleton and empty arrays", () => {
    expect(findMinValue([4])).toBe(4);
    expect(findMaxValue([4])).toBe(4);
    expect(findMinValue([])).toBeUndefined();
    expect(findMaxValue([])).toBeUndefined();
  });

  it("safeMin and safeMax ignore every non-finite argument", () => {
    expect(safeMin(3, NaN, -2, Infinity, 0)).toBe(-2);
    expect(safeMax(3, NaN, -2, -Infinity, 0)).toBe(3);
    expect(safeMin(NaN, Infinity)).toBe(Infinity);
    expect(safeMax(NaN, -Infinity)).toBe(-Infinity);
  });
});

describe("response-file type dispatch", () => {
  it("recognizes impulse and frequency response filenames case-insensitively", () => {
    expect(isImpulseResponseFile("mic.gainVTime.csv")).toBe(true);
    expect(isImpulseResponseFile("mic.GAINVTIME.XLSX")).toBe(true);
    expect(isImpulseResponseFile("mic.gainVFreq.csv")).toBe(false);
    expect(isFrequencyResponseFile("speaker.gainVFreq.csv")).toBe(true);
    expect(isFrequencyResponseFile("speaker.GAINVFREQ.XLSX")).toBe(true);
    expect(isFrequencyResponseFile("speaker.csv")).toBe(false);
  });

  it("dispatches to the matching parser", async () => {
    mockTextResponse("time,amplitude\n0,1\n0.001,0\n");
    await expect(
      parseImpulseResponseOrFrequencyResponseFile("mic.gainVTime.csv"),
    ).resolves.toMatchObject({ samplingRate: 1000, type: "impulseResponse" });

    mockTextResponse("frequency,gain\n100,-2\n1000,0\n");
    await expect(
      parseImpulseResponseOrFrequencyResponseFile("mic.gainVFreq.csv"),
    ).resolves.toEqual({
      frequencies: [100, 1000],
      gains: [-2, 0],
      type: "frequencyResponse",
    });
  });

  it("returns an empty frequency response for unknown filenames", async () => {
    await expect(
      parseImpulseResponseOrFrequencyResponseFile("README.txt"),
    ).resolves.toEqual({
      frequencies: [],
      gains: [],
      type: "frequencyResponse",
    });
    expect(fetchMock()).not.toHaveBeenCalled();
  });
});

describe("parseImpulseResponseFile", () => {
  it("parses trimmed CSV values and derives the average sampling rate", async () => {
    mockTextResponse(
      " time , amplitude \n0, 0.1\n0.0005, -0.2\n0.001, 0.3\n\n",
    );
    await expect(
      parseImpulseResponseFile("mic.gainVTime.csv"),
    ).resolves.toEqual({
      time: [0, 0.0005, 0.001],
      amplitudes: [0.1, -0.2, 0.3],
      samplingRate: 2000,
      type: "impulseResponse",
    });
    expect(fetchMock()).toHaveBeenCalledWith(
      "impulseResponses/mic.gainVTime.csv",
    );
  });

  it("parses XLSX, trims cells, and skips a textual header row", async () => {
    mockWorkbookResponse([
      [" time ", " amplitude "],
      ["0", "1"],
      ["0.001", "-1"],
      ["0.002", "0.5"],
    ]);
    await expect(
      parseImpulseResponseFile("mic.gainVTime.xlsx"),
    ).resolves.toEqual({
      time: [0, 0.001, 0.002],
      amplitudes: [1, -1, 0.5],
      samplingRate: 1000,
      type: "impulseResponse",
    });
  });

  it("returns an empty result for a missing filename", async () => {
    await expect(parseImpulseResponseFile("")).resolves.toEqual({
      time: [],
      amplitudes: [],
      samplingRate: 0,
      type: "impulseResponse",
    });
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("returns an empty result when fetch fails", async () => {
    mockHttpError();
    await expect(
      parseImpulseResponseFile("missing.gainVTime.csv"),
    ).resolves.toEqual({
      time: [],
      amplitudes: [],
      samplingRate: 0,
      type: "impulseResponse",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error parsing impulse response file:",
      expect.objectContaining({ message: expect.stringContaining("404") }),
    );
  });
});

describe("parseFrequencyResponseFile", () => {
  it("parses trimmed CSV frequency and gain columns", async () => {
    mockTextResponse(" frequency , gain \n100, -10\n1000, 0\n10000, 12.5\n\n");
    await expect(
      parseFrequencyResponseFile("speaker.gainVFreq.csv"),
    ).resolves.toEqual({
      frequencies: [100, 1000, 10000],
      gains: [-10, 0, 12.5],
      type: "frequencyResponse",
    });
    expect(fetchMock()).toHaveBeenCalledWith(
      "frequencyResponses/speaker.gainVFreq.csv",
    );
  });

  it("parses XLSX and skips a textual header row", async () => {
    mockWorkbookResponse([
      [" frequency ", " gain "],
      ["100", "-10"],
      ["1000", "0"],
    ]);
    await expect(
      parseFrequencyResponseFile("speaker.gainVFreq.xlsx"),
    ).resolves.toEqual({
      frequencies: [100, 1000],
      gains: [-10, 0],
      type: "frequencyResponse",
    });
  });

  it("returns an empty result for a missing filename", async () => {
    await expect(parseFrequencyResponseFile(undefined)).resolves.toEqual({
      frequencies: [],
      gains: [],
      type: "frequencyResponse",
    });
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("returns an empty result when fetch fails", async () => {
    mockHttpError();
    await expect(
      parseFrequencyResponseFile("missing.gainVFreq.csv"),
    ).resolves.toEqual({
      frequencies: [],
      gains: [],
      type: "frequencyResponse",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error parsing frequency response file:",
      expect.objectContaining({ message: expect.stringContaining("404") }),
    );
  });
});
