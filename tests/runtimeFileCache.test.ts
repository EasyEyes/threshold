// getGitlabBodyForThreshold: the runtime files are fetched concurrently and,
// on a deployed site, kept for the page session keyed on the Netlify deploy
// stamp. The commit actions must be identical to a fresh fetch.

jest.mock("sweetalert2", () => ({
  __esModule: true,
  default: {
    fire: jest.fn(),
    close: jest.fn(),
    isVisible: jest.fn(() => false),
  },
}));
jest.mock("file-saver", () => ({ saveAs: jest.fn() }));
jest.mock("jszip");
jest.mock("../components/sentry", () => ({
  captureError: jest.fn(),
  captureMessage: jest.fn(),
  captureCompilerFailure: jest.fn(),
  recordCompilerPhase: jest.fn(),
  getHttpErrorDetails: jest.fn(() => ({})),
}));
jest.mock("../components/compatibilityCheck", () => ({
  convertLanguageToLanguageCode: jest.fn(),
  getCompatibilityRequirements: jest.fn(() => ({
    compatibilityRequirements: [""],
  })),
}));
jest.mock("../parameters/glossaryRegistry", () => ({
  getGlossary: jest.fn(() => ({})),
}));
jest.mock("../preprocess/files", () => ({
  _loadDir: "/compiler/threshold/",
  _loadFiles: [
    "index.html",
    "js/threshold.min.js",
    "js/experimentLanguage.js",
    "models/detector/group1-shard1of1.bin",
  ],
}));
jest.mock("../preprocess/global", () => ({
  compatibilityRequirements: { previousParsedInfo: null, previousL: null },
  typekit: { kitId: "" },
}));
jest.mock("../preprocess/getDuration", () => ({
  durations: {},
  padToSameLength: jest.fn(),
}));
jest.mock("../preprocess/fileUtils", () => ({
  assetUsesBase64: jest.fn((p: string) => p.endsWith(".bin")),
  encodeGitlabFilePath: jest.fn((p: string) => p),
  getAssetFileContent: jest.fn(),
  getAssetFileContentBase64: jest.fn(),
  getBase64Data: jest.fn(),
  getBase64FileDataFromGitLab: jest.fn(),
  getFileExtension: jest.fn(),
  getFileTextData: jest.fn(),
  getTextFileDataFromGitLab: jest.fn(),
  readXLSXFile: jest.fn(),
}));
jest.mock("../preprocess/utils", () => ({
  getDateAndTimeString: jest.fn(() => "2024-01-01"),
  isExpTableFile: jest.fn(),
}));
jest.mock("../preprocess/retry", () => ({
  wait: jest.fn().mockResolvedValue(undefined),
  getRetryDelayMs: jest.fn(() => 0),
}));
jest.mock("../preprocess/fetchAllPages", () => ({ fetchAllPages: jest.fn() }));
jest.mock("../preprocess/constants", () => ({
  acceptableExtensions: {},
  acceptableResourcesExtensionsOfTextDataType: [],
  resourcesFileTypes: [],
  resourcesRepoName: "EasyEyesResources",
  ThresholdRepoFiles: class {},
  userRepoFiles: {},
}));
jest.mock("../preprocess/auth/config", () => ({
  getAuthConfig: () => ({ clientId: "test", redirectUri: "http://test" }),
}));
jest.mock("../preprocess/auth/gitlabOAuthClient", () => ({
  GitLabOAuthClient: { loadFromStorage: jest.fn() },
}));
jest.mock("../preprocess/gitlabSearch");
jest.mock("../preprocess/xlsxExport", () => ({
  extractWorkbookFormatting: jest.fn(),
  rebuildStyledWorkbook: jest.fn(),
}));

import {
  getAssetFileContent,
  getAssetFileContentBase64,
} from "../preprocess/fileUtils";
import {
  clearRuntimeFileCache,
  fetchCompilerDeployStamp,
  getGitlabBodyForCompatibilityRequirementFile,
  getGitlabBodyForThreshold,
} from "../preprocess/gitlabUtils";
import {
  beginCompile,
  COMPILE_OPTIMIZATIONS_FOR,
  endCompile,
} from "../preprocess/compileMode";

const user = { currentExperiment: { _stepperBool: false } } as any;

// This suite runs in the node environment (no window), which the cache treats
// as a deployed site. One test fakes a local dev server's window.
const setWindowHostname = (hostname: string | null) => {
  if (hostname === null) delete (globalThis as any).window;
  else (globalThis as any).window = { location: { hostname } };
};

// Counts how many reads overlap, to tell concurrent from sequential fetching.
const trackConcurrency = () => {
  let inFlight = 0;
  const peak = { max: 0 };
  (getAssetFileContent as jest.Mock).mockImplementation(
    (path: string) =>
      new Promise((resolve) => {
        inFlight++;
        peak.max = Math.max(peak.max, inFlight);
        setTimeout(() => {
          inFlight--;
          resolve(`text:${path}`);
        }, 5);
      }),
  );
  return peak;
};

beforeEach(() => {
  jest.clearAllMocks();
  clearRuntimeFileCache();
  setWindowHostname(null);
  (getAssetFileContent as jest.Mock).mockImplementation(
    async (path: string) => `text:${path}`,
  );
  (getAssetFileContentBase64 as jest.Mock).mockImplementation(
    async (path: string) => `b64:${path}`,
  );
});

afterEach(() => endCompile());

describe("getGitlabBodyForThreshold — classic compile (Compiler tab)", () => {
  beforeEach(() => beginCompile("compiler"));

  it("is only optimized for Studio compiles until switched on for all", () => {
    expect(COMPILE_OPTIMIZATIONS_FOR.runtimeFileCache).toBe("studio");
  });

  it("fetches the files one after another", async () => {
    const peak = trackConcurrency();
    await getGitlabBodyForThreshold(0, 3, user, "deploy-A");
    expect(peak.max).toBe(1);
  });

  it("never caches, even with a deploy stamp", async () => {
    await getGitlabBodyForThreshold(0, 3, user, "deploy-A");
    await getGitlabBodyForThreshold(0, 3, user, "deploy-A");
    expect(getAssetFileContent).toHaveBeenCalledTimes(4);
    expect(getAssetFileContentBase64).toHaveBeenCalledTimes(2);
  });
});

describe("getGitlabBodyForThreshold — Studio compile", () => {
  beforeEach(() => beginCompile("studio"));
  it("builds the same commit actions as before, in manifest order", async () => {
    const actions = await getGitlabBodyForThreshold(0, 3, user, null);
    expect(actions).toEqual([
      {
        action: "create",
        file_path: "index.html",
        // _stepperBool false → the stepper-bool page is uploaded as index.html
        content: "text:/compiler/threshold/index-stepper-bool.html",
        encoding: "text",
      },
      {
        action: "create",
        file_path: "js/threshold.min.js",
        content: "text:/compiler/threshold/js/threshold.min.js",
        encoding: "text",
      },
      {
        action: "create",
        file_path: "models/detector/group1-shard1of1.bin",
        content: "b64:/compiler/threshold/models/detector/group1-shard1of1.bin",
        encoding: "base64",
      },
    ]);
    // experimentLanguage.js is generated separately, never fetched
    expect(getAssetFileContent).not.toHaveBeenCalledWith(
      expect.stringContaining("experimentLanguage"),
      expect.anything(),
    );
  });

  it("fetches the files concurrently rather than one after another", async () => {
    const peak = trackConcurrency();
    await getGitlabBodyForThreshold(0, 3, user, null);
    expect(peak.max).toBeGreaterThan(1);
  });

  it("produces the same commit actions as a classic compile", async () => {
    const studio = await getGitlabBodyForThreshold(0, 3, user, "deploy-A");
    beginCompile("compiler");
    const classic = await getGitlabBodyForThreshold(0, 3, user, "deploy-A");
    expect(studio).toEqual(classic);
  });

  it("reuses fetched files for the same deploy stamp, and refetches for a new one", async () => {
    const first = await getGitlabBodyForThreshold(0, 3, user, "deploy-A");
    expect(getAssetFileContent).toHaveBeenCalledTimes(2);
    expect(getAssetFileContentBase64).toHaveBeenCalledTimes(1);

    const second = await getGitlabBodyForThreshold(0, 3, user, "deploy-A");
    expect(getAssetFileContent).toHaveBeenCalledTimes(2);
    expect(getAssetFileContentBase64).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);

    await getGitlabBodyForThreshold(0, 3, user, "deploy-B");
    expect(getAssetFileContent).toHaveBeenCalledTimes(4);
    expect(getAssetFileContentBase64).toHaveBeenCalledTimes(2);
  });

  it("caches per fetched file, so both index.html variants stay correct", async () => {
    const stepper = { currentExperiment: { _stepperBool: true } } as any;
    await getGitlabBodyForThreshold(0, 0, user, "deploy-A");
    const [withStepper] = await getGitlabBodyForThreshold(
      0,
      0,
      stepper,
      "deploy-A",
    );
    expect(withStepper.content).toBe("text:/compiler/threshold/index.html");
  });

  it("does not cache when the deploy stamp is unknown", async () => {
    await getGitlabBodyForThreshold(0, 3, user, null);
    await getGitlabBodyForThreshold(0, 3, user, null);
    expect(getAssetFileContent).toHaveBeenCalledTimes(4);
  });

  it("does not cache on a local dev server", async () => {
    setWindowHostname("localhost");
    await getGitlabBodyForThreshold(0, 3, user, "deploy-A");
    await getGitlabBodyForThreshold(0, 3, user, "deploy-A");
    expect(getAssetFileContent).toHaveBeenCalledTimes(4);
  });

  it("does not cache a failed read", async () => {
    (getAssetFileContent as jest.Mock)
      .mockResolvedValueOnce(new Error("offline"))
      .mockResolvedValueOnce("text:ok")
      .mockResolvedValue("text:recovered");
    await getGitlabBodyForThreshold(0, 1, user, "deploy-A");
    const actions = await getGitlabBodyForThreshold(0, 1, user, "deploy-A");
    expect(actions.map((a) => a.content)).toEqual([
      "text:recovered",
      "text:ok",
    ]);
  });
});

describe("compiler deploy stamp", () => {
  it("reads published_deploy.published_at, or null when the probe fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        published_deploy: { published_at: "2026-09-08T00:00:00Z" },
      }),
    }) as any;
    expect(await fetchCompilerDeployStamp()).toBe("2026-09-08T00:00:00Z");

    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as any;
    expect(await fetchCompilerDeployStamp()).toBeNull();
  });

  it("CompatibilityRequirements.txt carries the date it was given, without a second probe", async () => {
    global.fetch = jest.fn() as any;
    const [action] = await getGitlabBodyForCompatibilityRequirementFile(
      { a: 1 },
      "2026-09-08T00:00:00Z",
    );
    expect(global.fetch).not.toHaveBeenCalled();
    expect(JSON.parse(action.content as string)).toEqual({
      a: 1,
      compilerUpdateDate: "2026-09-08T00:00:00Z",
    });
  });

  it("CompatibilityRequirements.txt omits the date when the probe failed, as before", async () => {
    const [action] = await getGitlabBodyForCompatibilityRequirementFile(
      { a: 1 },
      null,
    );
    expect(JSON.parse(action.content as string)).toEqual({ a: 1 });
  });
});
