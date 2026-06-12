// Heavy browser-only modules must be mocked before gitlabUtils is imported.
jest.mock("sweetalert2", () => ({
  __esModule: true,
  default: {
    fire: jest.fn(),
    close: jest.fn(),
    isVisible: jest.fn(() => false),
    getPopup: jest.fn(),
    showLoading: jest.fn(),
  },
}));
jest.mock("file-saver", () => ({ saveAs: jest.fn() }));
jest.mock("jszip");
jest.mock("../components/sentry", () => ({
  captureError: jest.fn(),
  captureMessage: jest.fn(),
}));
jest.mock("../components/compatibilityCheck", () => ({
  convertLanguageToLanguageCode: jest.fn(),
  getCompatibilityRequirements: jest.fn(() => ({
    compatibilityRequirements: [""],
  })),
}));
jest.mock("../parameters/glossaryRegistry", () => ({
  getGlossary: jest.fn(() => ({
    _pavlovia_Database_ResultsFormatBool: { default: "FALSE" },
    _language: { default: "English" },
  })),
}));
jest.mock("../preprocess/files", () => ({ _loadDir: [], _loadFiles: [] }));
jest.mock("../preprocess/global", () => ({
  compatibilityRequirements: { previousParsedInfo: null, previousL: null },
  typekit: { kitId: "" },
}));
jest.mock("../preprocess/getDuration", () => ({
  durations: {},
  padToSameLength: jest.fn(),
}));
jest.mock("../preprocess/fileUtils", () => ({
  assetUsesBase64: jest.fn(),
  encodeGitlabFilePath: jest.fn((p: string) => p),
  getAssetFileContent: jest.fn(),
  getAssetFileContentBase64: jest.fn(),
  getBase64Data: jest.fn(),
  getBase64FileDataFromGitLab: jest.fn(),
  getFileExtension: jest.fn((f: any) => f.name?.split(".").pop() ?? ""),
  getFileTextData: jest.fn().mockResolvedValue(""),
  getTextFileDataFromGitLab: jest.fn(),
  readXLSXFile: jest.fn().mockResolvedValue(""),
}));
jest.mock("../preprocess/utils", () => ({
  getDateAndTimeString: jest.fn(() => "2024-01-01"),
  isExpTableFile: jest.fn(),
}));
jest.mock("../preprocess/retry", () => ({
  wait: jest.fn().mockResolvedValue(undefined),
  getRetryDelayMs: jest.fn(() => 0),
}));
jest.mock("../preprocess/fetchAllPages", () => ({
  fetchAllPages: jest.fn(),
}));
jest.mock("../preprocess/constants", () => ({
  acceptableExtensions: {},
  acceptableResourcesExtensionsOfTextDataType: [],
  resourcesFileTypes: [],
  resourcesRepoName: "EasyEyesResources",
  ThresholdRepoFiles: class {},
  userRepoFiles: {
    experiment: { name: "myExp.csv" },
    requestedFonts: [],
    requestedForms: [],
    requestedTexts: [],
    requestedFolders: [],
    requestedImages: [],
    requestedCode: [],
    requestedImpulseResponses: [],
    requestedFrequencyResponses: [],
    requestedTargetSoundLists: [],
    blockFiles: [],
  },
}));
jest.mock("../preprocess/auth/config", () => ({
  getAuthConfig: () => ({ clientId: "test", redirectUri: "http://test" }),
}));
jest.mock("../preprocess/auth/gitlabOAuthClient", () => ({
  GitLabOAuthClient: { loadFromStorage: jest.fn() },
}));
jest.mock("../preprocess/gitlabSearch");

import { GitLabOAuthClient } from "../preprocess/auth/gitlabOAuthClient";
import * as gitlabSearch from "../preprocess/gitlabSearch";
import {
  _createExperimentTask_prepareRepo,
  _createExperimentTask_uploadFiles,
} from "../preprocess/gitlabUtils";

const mockLoadFromStorage = GitLabOAuthClient.loadFromStorage as jest.Mock;
const mockSearch = gitlabSearch.searchProjectByName as jest.Mock;

function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: "123",
    accessToken: "",
    username: "scientist",
    projectList: Promise.resolve([]),
    initProjectList: jest.fn().mockResolvedValue(undefined),
    currentExperiment: {
      _pavloviaNewExperimentBool: true,
      participantRecruitmentServiceName: "",
    },
    totalProjectPages: 1,
    ...overrides,
  } as any;
}

function fakeResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  };
}

function makeSequentialClient(...responses: ReturnType<typeof fakeResponse>[]) {
  let i = 0;
  return {
    apiRequest: jest
      .fn()
      .mockImplementation(() => Promise.resolve(responses[i++])),
    getAccessToken: jest.fn().mockReturnValue("tok"),
    ensureValidToken: jest.fn().mockResolvedValue(undefined),
  };
}

function makeApiClient(responseData: any, status = 201) {
  return {
    apiRequest: jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: jest.fn().mockResolvedValue(responseData),
    }),
    getAccessToken: jest.fn().mockReturnValue("tok"),
    ensureValidToken: jest.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => jest.clearAllMocks());

// ─── Cycle B: prepareRepo retries once on single conflict ─────────────────────

describe("_createExperimentTask_prepareRepo — retries on single name conflict", () => {
  it("returns repoName=myExp2 and correct repo when myExp1 is taken", async () => {
    const myExp2Repo = { id: "88", path: "myExp2", name: "myExp2" };
    const client = makeSequentialClient(
      fakeResponse({ message: { name: ["has already been taken"] } }, 400),
      fakeResponse(myExp2Repo, 201),
    );
    mockLoadFromStorage.mockReturnValue(client);
    mockSearch.mockResolvedValue(null);

    const user = makeUser();
    const result = await _createExperimentTask_prepareRepo(user, "myExp1");

    expect((result as any).repoName).toBe("myExp2");
    expect(result.repo).toEqual(myExp2Repo);
  });
});

// ─── Cycle C: prepareRepo retries across multiple conflicts ────────────────────

describe("_createExperimentTask_prepareRepo — retries across multiple conflicts", () => {
  it("succeeds on the 6th attempt when the first 5 names are taken", async () => {
    const myExp6Repo = { id: "94", path: "myExp6", name: "myExp6" };
    const client = makeSequentialClient(
      ...Array(5).fill(
        fakeResponse({ message: { name: ["has already been taken"] } }, 400),
      ),
      fakeResponse(myExp6Repo, 201),
    );
    mockLoadFromStorage.mockReturnValue(client);
    mockSearch.mockResolvedValue(null);

    const user = makeUser();
    const result = await _createExperimentTask_prepareRepo(user, "myExp1");

    expect((result as any).repoName).toBe("myExp6");
    expect(result.repo).toEqual(myExp6Repo);
  });
});

// ─── Cycle D: prepareRepo throws after cap exceeded ────────────────────────────

describe("_createExperimentTask_prepareRepo — throws after retry cap", () => {
  it("throws after exactly 10 consecutive NameConflictErrors", async () => {
    const client = makeSequentialClient(
      ...Array(10).fill(
        fakeResponse({ message: { name: ["has already been taken"] } }, 400),
      ),
    );
    mockLoadFromStorage.mockReturnValue(client);
    mockSearch.mockResolvedValue(null);

    const user = makeUser();

    await expect(
      _createExperimentTask_prepareRepo(user, "myExp1"),
    ).rejects.toThrow();

    expect(client.apiRequest).toHaveBeenCalledTimes(10);
  });
});

// ─── Cycle E: uploadFiles URL uses newRepo.path, not the original projectName ──

describe("_createExperimentTask_uploadFiles — URL uses newRepo.path", () => {
  const originalFetch = global.fetch;
  const originalDocument = global.document;

  beforeAll(() => {
    global.document = { getElementById: jest.fn(() => null) } as any;
    global.fetch = jest
      .fn()
      .mockResolvedValue({ json: jest.fn().mockResolvedValue({}) });
  });

  afterAll(() => {
    global.fetch = originalFetch;
    global.document = originalDocument;
  });

  it("passes experimentUrl built from newRepo.path to the callback", async () => {
    // newRepo.path is "myExp2" — the name Pavlovia actually assigned.
    // The caller originally attempted "myExp1"; that must NOT appear in the URL.
    const newRepo = { id: 99, path: "myExp2", name: "myExp2" };
    const callback = jest.fn();
    const user = makeUser();

    mockSearch.mockResolvedValue({ id: "42", name: "EasyEyesResources" });
    mockLoadFromStorage.mockReturnValue(makeApiClient({}, 201));

    await _createExperimentTask_uploadFiles(
      user,
      newRepo,
      false,
      null,
      [],
      callback,
    );

    expect(callback).toHaveBeenCalled();
    const experimentUrl: string = callback.mock.calls[0][1];
    expect(experimentUrl).toContain("myExp2");
    expect(experimentUrl).not.toContain("myExp1");
    expect(experimentUrl).toBe("https://run.pavlovia.org/scientist/myExp2");
  });
});
