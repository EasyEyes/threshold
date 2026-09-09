// gatherThresholdCoreFileActions: a Studio compile builds a thin repository
// (runtime loaded from the hosted, immutable copy); a classic compile, or a
// Studio compile that cannot establish the hosted runtime, uploads the full
// copy exactly as before.

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
    "components/images/favicon.ico",
  ],
}));
jest.mock("../preprocess/global", () => ({
  compatibilityRequirements: { parsedInfo: { browser: "any" } },
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
jest.mock("../preprocess/hostedRuntime", () => ({
  fetchCompilerDeploy: jest.fn(),
  resolveHostedRuntime: jest.fn(),
  gatherHostedRuntimeActions: jest.fn(),
}));

import {
  getAssetFileContent,
  getAssetFileContentBase64,
} from "../preprocess/fileUtils";
import {
  clearRuntimeFileCache,
  gatherThresholdCoreFileActions,
} from "../preprocess/gitlabUtils";
import {
  fetchCompilerDeploy,
  gatherHostedRuntimeActions,
  resolveHostedRuntime,
} from "../preprocess/hostedRuntime";
import {
  beginCompile,
  COMPILE_OPTIMIZATIONS_FOR,
  endCompile,
} from "../preprocess/compileMode";

const user = {
  currentExperiment: { _stepperBool: true, _language: "en" },
} as any;

const DEPLOY = {
  id: "6aa064ea90fe8ed10353f05a",
  publishedAt: "2026-09-08T19:48:48.928Z",
  siteName: "easyeyes",
  branch: "main",
  commit: "078e7f9",
  context: "production",
};
const CDN = "https://cdn.jsdelivr.net/npm/@easyeyes/runtime@1.20260909.22295/";
const RELEASE = {
  published: {
    package: "@easyeyes/runtime",
    version: "1.20260909.22295",
    cdn: CDN,
    fingerprint: "df".repeat(32),
    integrity: {},
    files: [],
    publishedAt: "2026-09-09T06:11:35.000Z",
    deploy: {
      id: DEPLOY.id,
      commit: "078e7f9",
      branch: "main",
      context: "production",
    },
  },
  baseUrl: CDN,
  integrity: {},
  hostedFiles: ["js/threshold.min.js", "models/detector/group1-shard1of1.bin"],
  statics: new Map(),
};
const THIN_ACTIONS = [
  {
    action: "create",
    file_path: "index.html",
    content: "<thin index>",
    encoding: "text",
  },
  {
    action: "create",
    file_path: "components/images/favicon.ico",
    content: "b64",
    encoding: "base64",
  },
  {
    action: "create",
    file_path: "EasyEyesRuntime.json",
    content: "{}",
    encoding: "text",
  },
];

const paths = (actions: { file_path: string }[]) =>
  actions.map((a) => a.file_path);

beforeEach(() => {
  jest.clearAllMocks();
  clearRuntimeFileCache();
  delete (globalThis as any).window;
  (getAssetFileContent as jest.Mock).mockImplementation(
    async (path: string) => `text:${path}`,
  );
  (getAssetFileContentBase64 as jest.Mock).mockImplementation(
    async (path: string) => `b64:${path}`,
  );
  (fetchCompilerDeploy as jest.Mock).mockResolvedValue(DEPLOY);
  (resolveHostedRuntime as jest.Mock).mockResolvedValue(RELEASE);
  (gatherHostedRuntimeActions as jest.Mock).mockReturnValue(THIN_ACTIONS);
});

afterEach(() => endCompile());

const FULL_COPY = [
  "index.html",
  "js/threshold.min.js",
  "models/detector/group1-shard1of1.bin",
  "components/images/favicon.ico",
  "CompatibilityRequirements.txt",
  "Duration.txt",
  "js/experimentLanguage.js",
];

describe("classic compile (Compiler tab)", () => {
  beforeEach(() => beginCompile("compiler"));

  it("is a Studio-only optimization until switched on for all", () => {
    expect(COMPILE_OPTIMIZATIONS_FOR.hostedRuntime).toBe("studio");
  });

  it("uploads the full runtime copy and never consults the hosted runtime", async () => {
    const actions = await gatherThresholdCoreFileActions(user);
    expect(paths(actions)).toEqual(FULL_COPY);
    expect(resolveHostedRuntime).not.toHaveBeenCalled();
    expect(gatherHostedRuntimeActions).not.toHaveBeenCalled();
    expect(fetchCompilerDeploy).toHaveBeenCalledTimes(1); // the date, as before
  });
});

describe("Studio compile", () => {
  beforeEach(() => beginCompile("studio"));

  it("commits the thin repository: hosted-runtime files, then the generated files", async () => {
    const ready = jest.fn();
    const actions = await gatherThresholdCoreFileActions(user, ready);
    expect(paths(actions)).toEqual([
      "index.html",
      "components/images/favicon.ico",
      "EasyEyesRuntime.json",
      "CompatibilityRequirements.txt",
      "Duration.txt",
      "js/experimentLanguage.js",
    ]);
    expect(gatherHostedRuntimeActions).toHaveBeenCalledWith(
      RELEASE,
      true, // _stepperBool
      ready,
    );
    // The runtime is not fetched from the compiler at all.
    expect(getAssetFileContent).not.toHaveBeenCalled();
    expect(getAssetFileContentBase64).not.toHaveBeenCalled();
  });

  it("resolves the hosted runtime alongside the published-deploy probe; the requirements file keeps the published date", async () => {
    const actions = await gatherThresholdCoreFileActions(user);
    expect(fetchCompilerDeploy).toHaveBeenCalledTimes(1);
    expect(resolveHostedRuntime).toHaveBeenCalledTimes(1);
    expect(resolveHostedRuntime).toHaveBeenCalledWith();
    const compat = actions.find(
      (a) => a.file_path === "CompatibilityRequirements.txt",
    )!;
    expect(JSON.parse(compat.content as string).compilerUpdateDate).toBe(
      DEPLOY.publishedAt,
    );
  });

  it("falls back to the full copy until the build publishes a runtime (or it cannot be established)", async () => {
    (resolveHostedRuntime as jest.Mock).mockResolvedValue(null);
    const actions = await gatherThresholdCoreFileActions(user);
    expect(paths(actions)).toEqual(FULL_COPY);
    expect(gatherHostedRuntimeActions).not.toHaveBeenCalled();
  });

  it("still builds the thin repository when only the Netlify date probe fails", async () => {
    (fetchCompilerDeploy as jest.Mock).mockResolvedValue(null);
    const actions = await gatherThresholdCoreFileActions(user);
    expect(paths(actions)).toEqual([
      ...paths(THIN_ACTIONS),
      "CompatibilityRequirements.txt",
      "Duration.txt",
      "js/experimentLanguage.js",
    ]);
    const compat = actions.find(
      (a) => a.file_path === "CompatibilityRequirements.txt",
    )!;
    expect(JSON.parse(compat.content as string)).not.toHaveProperty(
      "compilerUpdateDate",
    );
  });
});
