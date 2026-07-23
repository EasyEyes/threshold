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
  createPavloviaExperiment,
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

describe("createPavloviaExperiment — request-scoped repository retries", () => {
  const originalFetch = global.fetch;
  const originalDocument = global.document;
  let originalBlockFiles: any[];

  beforeEach(() => {
    global.document = { getElementById: jest.fn(() => null) } as any;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });
    const constants = jest.requireMock("../preprocess/constants");
    originalBlockFiles = constants.userRepoFiles.blockFiles;
    constants.userRepoFiles.blockFiles = [{ name: "block.csv" }];
    mockSearch.mockImplementation((_user, name) =>
      Promise.resolve(
        name === "EasyEyesResources"
          ? { id: "resources-1", name: "EasyEyesResources" }
          : null,
      ),
    );
    const { fetchAllPages } = jest.requireMock("../preprocess/fetchAllPages");
    fetchAllPages.mockResolvedValue([
      { json: jest.fn().mockResolvedValue([]) },
    ]);
  });

  afterEach(() => {
    const constants = jest.requireMock("../preprocess/constants");
    constants.userRepoFiles.blockFiles = originalBlockFiles;
    global.fetch = originalFetch;
    global.document = originalDocument;
  });

  it("creates one repository when upload succeeds after retries", async () => {
    let repositoryCreateCount = 0;
    let commitAttemptCount = 0;
    const client = {
      apiRequest: jest.fn(async (endpoint: string) => {
        if (endpoint === "/projects") {
          repositoryCreateCount++;
          return fakeResponse(
            {
              id: "repo-1",
              path: "myExp",
              name: "myExp",
            },
            201,
          );
        }
        if (endpoint.includes("/repository/commits")) {
          commitAttemptCount++;
          if (commitAttemptCount < 3) {
            throw Object.assign(new Error("temporary upload failure"), {
              status: 503,
            });
          }
          return fakeResponse({ id: "commit-1" }, 201);
        }
        return fakeResponse({}, 200);
      }),
      getAccessToken: jest.fn().mockReturnValue("tok"),
      ensureValidToken: jest.fn().mockResolvedValue(undefined),
    };
    mockLoadFromStorage.mockReturnValue(client);

    const result = await createPavloviaExperiment(
      makeUser(),
      "myExp",
      jest.fn(),
      false,
      null,
      { operation: "pavlovia-upload", operationId: "request-1" },
    );

    expect(repositoryCreateCount).toBe(1);
    expect(commitAttemptCount).toBe(3);
    expect(result).toBe(true);
  });

  it("reconciles the same repository when a committed response is lost", async () => {
    let repositoryCreateCount = 0;
    let commitAttemptCount = 0;
    let repositoryTree: Array<{
      id: string;
      name: string;
      path: string;
      type: "blob";
      mode: string;
    }> = [];
    const { fetchAllPages } = jest.requireMock("../preprocess/fetchAllPages");
    fetchAllPages.mockImplementation(() =>
      Promise.resolve([
        {
          json: jest
            .fn()
            .mockImplementation(() => Promise.resolve(repositoryTree)),
        },
      ]),
    );
    const client = {
      apiRequest: jest.fn(async (endpoint: string, options: any = {}) => {
        if (endpoint === "/projects") {
          repositoryCreateCount++;
          return fakeResponse(
            { id: "repo-1", path: "myExp", name: "myExp" },
            201,
          );
        }
        if (endpoint.includes("/repository/commits")) {
          commitAttemptCount++;
          const actions = JSON.parse(options.body).actions;
          if (commitAttemptCount === 1) {
            repositoryTree = actions
              .filter((action: any) => action.action === "create")
              .map((action: any, index: number) => ({
                id: String(index),
                name: action.file_path.split("/").pop(),
                path: action.file_path,
                type: "blob" as const,
                mode: "100644",
              }));
            throw Object.assign(new Error("response lost after commit"), {
              status: 503,
            });
          }
          expect(
            actions.some((action: any) => action.action === "delete"),
          ).toBe(true);
          return fakeResponse({ id: "commit-2" }, 201);
        }
        return fakeResponse({}, 200);
      }),
      getAccessToken: jest.fn().mockReturnValue("tok"),
      ensureValidToken: jest.fn().mockResolvedValue(undefined),
    };
    mockLoadFromStorage.mockReturnValue(client);

    const result = await createPavloviaExperiment(
      makeUser(),
      "myExp",
      jest.fn(),
      false,
      null,
      { operation: "pavlovia-upload", operationId: "request-lost-response" },
    );

    expect(result).toBe(true);
    expect(repositoryCreateCount).toBe(1);
    expect(commitAttemptCount).toBe(2);
  });

  it("keeps concurrent compilation requests on distinct repositories", async () => {
    let repositoryCreateCount = 0;
    const client = {
      apiRequest: jest.fn(async (endpoint: string) => {
        if (endpoint === "/projects") {
          repositoryCreateCount++;
          const id = `repo-${repositoryCreateCount}`;
          return fakeResponse({ id, path: id, name: id }, 201);
        }
        if (endpoint.includes("/repository/commits")) {
          return fakeResponse({ id: "commit" }, 201);
        }
        return fakeResponse({}, 200);
      }),
      getAccessToken: jest.fn().mockReturnValue("tok"),
      ensureValidToken: jest.fn().mockResolvedValue(undefined),
    };
    mockLoadFromStorage.mockReturnValue(client);
    const callbackA = jest.fn();
    const callbackB = jest.fn();

    const results = await Promise.all([
      createPavloviaExperiment(
        makeUser(),
        "experiment-a",
        callbackA,
        false,
        null,
        { operation: "pavlovia-upload", operationId: "request-a" },
      ),
      createPavloviaExperiment(
        makeUser(),
        "experiment-b",
        callbackB,
        false,
        null,
        { operation: "pavlovia-upload", operationId: "request-b" },
      ),
    ]);

    expect(results).toEqual([true, true]);
    expect(repositoryCreateCount).toBe(2);
    expect(callbackA.mock.calls[0][0].id).not.toBe(
      callbackB.mock.calls[0][0].id,
    );
  });
});
