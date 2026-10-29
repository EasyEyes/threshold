/**
 * checkSystemCompatibility / getCompatibilityRequirements: the failed-needs
 * list must be the CURRENT evaluation's result — returned to the caller,
 * deduplicated, and never an append-only session history. Before this
 * contract, needs accumulated in a module-global array (needsUnmet), so a
 * need that failed an earlier check stayed "unmet" forever, repeat checks
 * duplicated entries, and the incompatible exit read session history
 * instead of the latest verdict.
 *
 * @jest-environment jsdom
 */
jest.mock("../components/global", () => ({ status: { terminated: false } }));
jest.mock("../components/readPhrases", () => ({
  readi18nPhrases: (key: string) =>
    key === "EE_LanguageDirection" ? "ltr" : key,
}));
jest.mock("../parameters/glossaryRegistry", () => ({
  getGlossary: () => ({
    _calibrateSound1000HzBool: { name: "_calibrateSound1000HzBool" },
    _calibrateSoundAllHzBool: { name: "_calibrateSoundAllHzBool" },
  }),
}));
jest.mock("../components/compatibilityUI", () => ({
  ...jest.requireActual("../components/compatibilityUI"),
  getScreenColorPipelineNeeds: () => ({
    wideGamutOk: true,
    float16Ok: true,
    capabilities: {},
  }),
  summarizeKnownDeviceFacts: () => [],
}));
jest.mock("../components/webglRequirements", () => ({
  ...jest.requireActual("../components/webglRequirements"),
  getWebGLRequirements: () => ({
    need: { version: 2, textureSize: 8192, portSize: 16384 },
    capabilities: {
      supported: true,
      version: 2,
      textureSize: 16384,
      portSize: 32767,
    },
    meetsNeed: true,
    unmet: [],
  }),
}));
jest.mock("../components/performanceTests", () => ({
  measureFontRender: async () => 0,
  measureHeapAllocation: async () => 0,
}));
jest.mock("../components/soundOutput.ts", () => ({
  checkBrowserSoundOutputSelectionSupport: () => true,
}));
jest.mock("../components/externalServices.ts", () => ({
  isProlificExperiment: () => false,
}));

import {
  checkSystemCompatibility,
  getCompatibilityRequirements,
} from "../components/compatibilityCheck";
import { getDeviceType } from "../components/compatibilityUI";

const baseRows = (): Record<string, string[]> => ({
  // Passing defaults: "all" ignores browser/OS restrictions; the device
  // type is whatever this environment reports.
  _needBrowser: ["all"],
  _needOperatingSystem: ["all"],
  _needDeviceType: [getDeviceType()],
});
const mkReader = (rows: Record<string, string[]>): any => ({
  read: (name: string) => ({ ...baseRows(), ...rows })[name] ?? [""],
});
const mkRc = (): any => ({
  language: { value: "en" },
  browser: { value: "Chrome" },
  browserVersion: { value: "120" },
  systemFamily: { value: "macOS" },
  concurrency: { value: 8 },
});

beforeEach(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});

const failingCores = { _needProcessorCoresMinimum: ["9999"] };
const passingCores = { _needProcessorCoresMinimum: ["0"] };

describe("checkSystemCompatibility returns the current evaluation's needs", () => {
  test("compatible baseline → empty unmetNeeds, proceed true", async () => {
    const result = await checkSystemCompatibility(
      mkReader(passingCores),
      "en",
      mkRc(),
    );
    expect(result.unmetNeeds).toEqual([]);
    expect(result.proceed).toBe(true);
  });

  test("failed requirement → need in result, proceed false, standalone row", async () => {
    const psychoJS = {
      experiment: { addData: jest.fn(), nextEntry: jest.fn() },
    };
    const result = await checkSystemCompatibility(
      mkReader(failingCores),
      "en",
      mkRc(),
      true,
      psychoJS as any,
    );
    expect(result.unmetNeeds).toEqual(["_needProcessorCoresMinimum"]);
    expect(result.proceed).toBe(false);
    // Diagnostic standalone row (partial-save evidence) still written.
    expect(psychoJS.experiment.addData).toHaveBeenCalledWith(
      "unmetNeeds",
      "_needProcessorCoresMinimum",
    );
    expect(psychoJS.experiment.nextEntry).toHaveBeenCalled();
  });

  test("repeat evaluations do not duplicate needs", async () => {
    await checkSystemCompatibility(mkReader(failingCores), "en", mkRc());
    const second = await checkSystemCompatibility(
      mkReader(failingCores),
      "en",
      mkRc(),
    );
    expect(second.unmetNeeds).toEqual(["_needProcessorCoresMinimum"]);
  });

  test("a need resolved by a later evaluation disappears", async () => {
    const first = await checkSystemCompatibility(
      mkReader(failingCores),
      "en",
      mkRc(),
    );
    expect(first.unmetNeeds).toEqual(["_needProcessorCoresMinimum"]);
    const second = await checkSystemCompatibility(
      mkReader(passingCores),
      "en",
      mkRc(),
    );
    expect(second.unmetNeeds).toEqual([]);
    expect(second.proceed).toBe(true);
  });

  test("no standalone row on the recompute-style call (psychoJS null)", async () => {
    const result = await checkSystemCompatibility(
      mkReader(failingCores),
      "en",
      mkRc(),
      true,
      null,
    );
    expect(result.unmetNeeds).toEqual(["_needProcessorCoresMinimum"]);
  });
});

describe("getCompatibilityRequirements returns its own evaluation's needs", () => {
  test("failure listed; two calls never accumulate", () => {
    const rc = mkRc();
    const first = getCompatibilityRequirements(
      mkReader(failingCores),
      "en",
      false,
      rc,
    ) as any;
    expect(first.unmetNeeds).toEqual(["_needProcessorCoresMinimum"]);
    const second = getCompatibilityRequirements(
      mkReader(passingCores),
      "en",
      false,
      rc,
    ) as any;
    expect(second.unmetNeeds).toEqual([]);
  });
});

describe("report page: OK after refresh carries the LATEST evaluation's needs", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root" style="display:flex"></div>';
    document.body.style.overflowX = "auto";
  });

  it("refresh replaces the initial needs with the re-evaluation's", async () => {
    const { displayCompatibilityMessage } = await import(
      "../components/compatibilityCheck"
    );
    const psychoJS = {
      experiment: { addData: jest.fn(), nextEntry: jest.fn() },
    };
    const waiting = displayCompatibilityMessage(
      [], // notes
      mkReader(failingCores), // re-evaluation will fail _needProcessorCoresMinimum
      mkRc(),
      true, // promptRefresh → refresh button rendered
      false, // proceedBool (failed)
      null,
      false,
      false,
      false,
      [],
      psychoJS as any,
      jest.fn(),
      {},
      function () {},
      { current: [] },
      { current: [] },
      {},
      {},
      async () => {},
      () => {},
      () => false,
      null,
      true,
      ["_needStaleInitialNeed"], // initial evaluation's (stale) needs
    );
    (document.getElementById("refresh-btn") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 100));
    (document.getElementById("procced-btn") as HTMLButtonElement).click();
    const result: any = await waiting;
    expect(result.proceedBool).toBe(false);
    expect(result.unmetNeeds).toEqual(["_needProcessorCoresMinimum"]);
  });
});
