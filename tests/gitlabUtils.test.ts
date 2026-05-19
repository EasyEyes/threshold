// Heavy browser-only modules must be mocked before gitlabUtils is imported.
jest.mock("sweetalert2", () => ({
  __esModule: true,
  default: {
    fire: jest.fn(),
    close: jest.fn(),
    isVisible: jest.fn(() => false),
    getPopup: jest.fn(),
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
jest.mock("../parameters/glossary", () => ({ GLOSSARY: {} }));
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
    requestedFonts: [],
    requestedForms: [],
    requestedTexts: [],
    requestedFolders: [],
    requestedImages: [],
    requestedCode: [],
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
  createResourcesRepo,
  createOrUpdateCommonResources,
  downloadCommonResources,
  gatherRequestedResourceActions,
  getCommonResourcesNames,
  getProlificToken,
  createOrUpdateProlificToken,
  getCompatibilityRequirementsForProject,
  getDurationForProject,
  getOriginalFileNameForProject,
  getPastProlificIdFromExperimentTables,
  getRecruitmentServiceConfig,
  setRepoName,
} from "../preprocess/gitlabUtils";

const mockLoadFromStorage = GitLabOAuthClient.loadFromStorage as jest.Mock;
const mockSearch = gitlabSearch.searchProjectByName as jest.Mock;
const mockSearchMany = gitlabSearch.searchProjectsByName as jest.Mock;

function makeApiClient(responseData: any, status = 201) {
  return {
    apiRequest: jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: jest.fn().mockResolvedValue(responseData),
      headers: { get: jest.fn().mockReturnValue(null) },
      text: jest.fn().mockResolvedValue(""),
      body: null,
    }),
    getAccessToken: jest.fn().mockReturnValue("tok"),
    ensureValidToken: jest.fn().mockResolvedValue(undefined),
  };
}

function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: "123",
    accessToken: "",
    projectList: Promise.resolve([]),
    initProjectList: jest.fn().mockResolvedValue(undefined),
    currentExperiment: { _pavloviaNewExperimentBool: false },
    totalProjectPages: 1,
    ...overrides,
  } as any;
}

beforeEach(() => jest.clearAllMocks());

// ─── Cycle 1: createResourcesRepo idempotent pre-flight check ────────────────

describe("createResourcesRepo — idempotent pre-flight check", () => {
  it("returns existing repo without making a POST request", async () => {
    const existing = { id: "42", name: "EasyEyesResources" };
    mockSearch.mockResolvedValue(existing);
    const client = makeApiClient({});
    mockLoadFromStorage.mockReturnValue(client);

    const user = makeUser();
    const result = await createResourcesRepo(user);

    expect(result).toEqual(existing);
    const postCalls: string[] = client.apiRequest.mock.calls
      .filter((c: any[]) => (c[1] as any)?.method === "POST")
      .map((c: any[]) => c[0] as string);
    expect(postCalls.some((url) => url === "/projects")).toBe(false);
  });

  it("calls createEmptyRepo and returns its result when repo does not exist", async () => {
    const created = { id: "99", name: "EasyEyesResources" };
    mockSearch.mockResolvedValue(null);
    mockLoadFromStorage.mockReturnValue(makeApiClient(created, 201));

    const result = await createResourcesRepo(makeUser());

    expect(result).toEqual(created);
  });
});

// ─── Cycle 2: createOrUpdateCommonResources skips creation when repo found ────

describe("createOrUpdateCommonResources — skips creation when repo already exists", () => {
  it("does not call createEmptyRepo when searchProjectByName finds the repo", async () => {
    const existingRepo = { id: "99", name: "EasyEyesResources" };
    mockSearch.mockResolvedValue(existingRepo);

    const client = makeApiClient({ id: "99" });
    mockLoadFromStorage.mockReturnValue(client);

    const user = makeUser();
    // createOrUpdateCommonResources with an empty file list hits only the repo lookup + resource list
    await createOrUpdateCommonResources(user, []);

    // POST /projects must NOT have been called (that would be createEmptyRepo)
    const calls: string[] = client.apiRequest.mock.calls.map(
      (c: any[]) => c[0] as string,
    );
    expect(calls.some((url) => url === "/projects")).toBe(false);
  });
});

// ─── Cycle 3: getCommonResourcesNames finds repo via search ──────────────────

describe("getCommonResourcesNames — finds EasyEyesResources via search", () => {
  it("returns empty resources when searchProjectByName returns null", async () => {
    mockSearch.mockResolvedValue(null);

    const result = await getCommonResourcesNames(makeUser());

    expect(result).toEqual({});
    expect(mockSearch).toHaveBeenCalledWith(
      expect.anything(),
      "EasyEyesResources",
    );
  });
});

// ─── Cycle 4: getProlificToken finds repo via search ─────────────────────────

describe("getProlificToken — finds EasyEyesResources via search", () => {
  it("returns empty string when searchProjectByName returns null", async () => {
    mockSearch.mockResolvedValue(null);

    const result = await getProlificToken(makeUser());

    expect(result).toBe("");
    expect(mockSearch).toHaveBeenCalledWith(
      expect.anything(),
      "EasyEyesResources",
    );
  });
});

// ─── Cycle 5: createOrUpdateProlificToken finds repo via search ──────────────

describe("createOrUpdateProlificToken — finds EasyEyesResources via search", () => {
  it("calls searchProjectByName to locate the resources repo", async () => {
    const repo = { id: "99", name: "EasyEyesResources" };
    mockSearch.mockResolvedValue(repo);
    const client = makeApiClient({});
    mockLoadFromStorage.mockReturnValue(client);

    const user = makeUser();
    await createOrUpdateProlificToken(user, "tok123");

    expect(mockSearch).toHaveBeenCalledWith(user, "EasyEyesResources");
  });
});

// ─── Cycle 19: createOrUpdateProlificToken — null guard ──────────────────────

describe("createOrUpdateProlificToken — null guard when EasyEyesResources is missing", () => {
  afterEach(() => mockSearch.mockReset());

  it("does not throw and calls createEmptyRepo when searchProjectByName returns null", async () => {
    const createdRepo = { id: "55", name: "EasyEyesResources" };
    // First call: createOrUpdateProlificToken's own search → null (repo missing)
    // Second call: createResourcesRepo pre-flight → null (still missing, so POST fires)
    mockSearch
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    const client = makeApiClient(createdRepo, 201);
    mockLoadFromStorage.mockReturnValue(client);

    const user = makeUser();
    await expect(createOrUpdateProlificToken(user, "tok-abc")).resolves.not.toThrow();

    const postCalls: string[] = client.apiRequest.mock.calls
      .filter((c: any[]) => (c[1] as any)?.method === "POST")
      .map((c: any[]) => c[0] as string);
    expect(postCalls.some((url) => url === "/projects")).toBe(true);
  });

  it("writes the token using the id from the newly created repo", async () => {
    const createdRepo = { id: "55", name: "EasyEyesResources" };
    mockSearch
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    const client = makeApiClient(createdRepo, 201);
    mockLoadFromStorage.mockReturnValue(client);

    const user = makeUser();
    await createOrUpdateProlificToken(user, "tok-abc");

    // pushCommits posts to /projects/:id/repository/commits — check the id used
    const commitCalls: string[] = client.apiRequest.mock.calls
      .filter((c: any[]) => (c[0] as string).includes("/repository/commits"))
      .map((c: any[]) => c[0] as string);
    expect(commitCalls.some((url) => url.includes("/55/"))).toBe(true);
  });

  it("does not call createEmptyRepo when EasyEyesResources already exists", async () => {
    const existingRepo = { id: "99", name: "EasyEyesResources" };
    mockSearch.mockResolvedValue(existingRepo);
    const client = makeApiClient({});
    mockLoadFromStorage.mockReturnValue(client);

    await createOrUpdateProlificToken(makeUser(), "tok-xyz");

    const postCalls: string[] = client.apiRequest.mock.calls
      .filter((c: any[]) => (c[1] as any)?.method === "POST")
      .map((c: any[]) => c[0] as string);
    expect(postCalls.some((url) => url === "/projects")).toBe(false);
  });
});

// ─── Cycle 6: getCompatibilityRequirementsForProject uses search ──────────────

describe("getCompatibilityRequirementsForProject — finds experiment repo via search", () => {
  it("calls searchProjectByName with the experiment repo name", async () => {
    const repo = { id: "77", name: "myExp1" };
    mockSearch.mockResolvedValue(repo);
    mockLoadFromStorage.mockReturnValue(makeApiClient({}));

    await getCompatibilityRequirementsForProject(makeUser(), "myExp1");

    expect(mockSearch).toHaveBeenCalledWith(expect.anything(), "myExp1");
  });
});

// ─── Cycle 7: getDurationForProject uses search ───────────────────────────────

describe("getDurationForProject — finds experiment repo via search", () => {
  it("calls searchProjectByName with the experiment repo name", async () => {
    const repo = { id: "77", name: "myExp1" };
    mockSearch.mockResolvedValue(repo);
    mockLoadFromStorage.mockReturnValue(makeApiClient({}));

    await getDurationForProject(makeUser(), "myExp1");

    expect(mockSearch).toHaveBeenCalledWith(expect.anything(), "myExp1");
  });
});

// ─── Cycle 8: getOriginalFileNameForProject uses search ──────────────────────

describe("getOriginalFileNameForProject — finds experiment repo via search", () => {
  it("calls searchProjectByName with the experiment repo name", async () => {
    const repo = { id: "77", name: "myExp1" };
    mockSearch.mockResolvedValue(repo);
    const { fetchAllPages: mockFetchAllPages } = jest.requireMock(
      "../preprocess/fetchAllPages",
    );
    mockFetchAllPages.mockResolvedValue([
      { json: jest.fn().mockResolvedValue([]) },
    ]);

    await getOriginalFileNameForProject(makeUser(), "myExp1");

    expect(mockSearch).toHaveBeenCalledWith(expect.anything(), "myExp1");
  });
});

// ─── Cycle 9: getPastProlificIdFromExperimentTables uses search ──────────────

describe("getPastProlificIdFromExperimentTables — finds experiment repo via search", () => {
  it("returns null and calls searchProjectByName when repo not found", async () => {
    mockSearch.mockResolvedValue(null);

    const result = await getPastProlificIdFromExperimentTables(
      makeUser(),
      "myExp1",
      "table.csv",
    );

    expect(result).toBeNull();
    expect(mockSearch).toHaveBeenCalledWith(expect.anything(), "myExp1");
  });
});

// ─── Cycle 10: getRecruitmentServiceConfig uses search ───────────────────────

describe("getRecruitmentServiceConfig — finds experiment repo via search", () => {
  it("calls searchProjectByName with the experiment repo name", async () => {
    const repo = { id: "77", name: "myExp1" };
    mockSearch.mockResolvedValue(repo);
    // apiRequest rejects — the function catches it internally and returns null,
    // allowing us to verify searchProjectByName was reached without hanging on
    // the ReadableStream machinery that requires a browser environment.
    mockLoadFromStorage.mockReturnValue({
      apiRequest: jest.fn().mockRejectedValue(new Error("network")),
      getAccessToken: jest.fn().mockReturnValue("tok"),
    });

    await getRecruitmentServiceConfig(makeUser(), "myExp1");

    expect(mockSearch).toHaveBeenCalledWith(expect.anything(), "myExp1");
  });
});

// ─── Cycle 11: setRepoName (new experiment) uses searchProjectsByName ─────────

describe("setRepoName — new experiment uses searchProjectsByName", () => {
  it("calls searchProjectsByName and returns first suffix not in the result set", async () => {
    // "myExp1" already taken, so the function should return "myExp2"
    mockSearchMany.mockResolvedValue([{ name: "myExp1" }]);

    const user = makeUser({
      currentExperiment: { _pavloviaNewExperimentBool: true },
    });
    const result = await setRepoName(user, "myExp");

    expect(mockSearchMany).toHaveBeenCalledWith(user, "myExp");
    expect(result).toBe("myExp2");
  });

  it("does not await user.projectList", async () => {
    mockSearchMany.mockResolvedValue([]);

    const projectListSpy = jest.fn().mockResolvedValue([]);
    const user: any = {
      id: "123",
      accessToken: "",
      get projectList() {
        return projectListSpy();
      },
      initProjectList: jest.fn(),
      currentExperiment: { _pavloviaNewExperimentBool: true },
      totalProjectPages: 1,
    };
    await setRepoName(user, "myExp");

    expect(projectListSpy).not.toHaveBeenCalled();
  });

  it("returns max+1 when 100 variants exist with no low numbers", async () => {
    const manyVariants = Array.from({ length: 100 }, (_, i) => ({
      name: `myExp${i + 129}`,
    }));
    mockSearchMany.mockResolvedValue(manyVariants);

    const user = makeUser({
      currentExperiment: { _pavloviaNewExperimentBool: true },
    });
    const result = await setRepoName(user, "myExp");

    expect(result).toBe("myExp229");
  });

  it("returns myExp3 when myExp1 and myExp2 exist", async () => {
    mockSearchMany.mockResolvedValue([{ name: "myExp1" }, { name: "myExp2" }]);

    const user = makeUser({
      currentExperiment: { _pavloviaNewExperimentBool: true },
    });
    const result = await setRepoName(user, "myExp");

    expect(result).toBe("myExp3");
  });

  it("returns myExp1 when no variants exist", async () => {
    mockSearchMany.mockResolvedValue([]);

    const user = makeUser({
      currentExperiment: { _pavloviaNewExperimentBool: true },
    });
    const result = await setRepoName(user, "myExp");

    expect(result).toBe("myExp1");
  });

  it("returns max+1 even when there are gaps in numbering", async () => {
    mockSearchMany.mockResolvedValue([{ name: "myExp1" }, { name: "myExp3" }]);

    const user = makeUser({
      currentExperiment: { _pavloviaNewExperimentBool: true },
    });
    const result = await setRepoName(user, "myExp");

    expect(result).toBe("myExp4");
  });

  it("ignores non-numeric suffixes when finding max", async () => {
    mockSearchMany.mockResolvedValue([
      { name: "myExp1abc" },
      { name: "myExp2" },
    ]);

    const user = makeUser({
      currentExperiment: { _pavloviaNewExperimentBool: true },
    });
    const result = await setRepoName(user, "myExp");

    expect(result).toBe("myExp3");
  });
});

// ─── Cycle 13: getCommonResourcesNames — parallel fetch ──────────────────────

const nineTypes = [
  "fonts",
  "forms",
  "texts",
  "folders",
  "images",
  "code",
  "impulseResponses",
  "frequencyResponses",
  "targetSoundLists",
];

describe("getCommonResourcesNames — parallel fetch", () => {
  beforeEach(() => {
    (jest.requireMock("../preprocess/constants") as any).resourcesFileTypes =
      nineTypes;
  });

  afterEach(() => {
    (jest.requireMock("../preprocess/constants") as any).resourcesFileTypes =
      [];
  });

  it("happy path — all nine types resolve with non-null string arrays", async () => {
    mockSearch.mockResolvedValue({ id: "42", name: "EasyEyesResources" });
    mockLoadFromStorage.mockReturnValue(makeApiClient({}));
    const { fetchAllPages: mockFetchAllPages } = jest.requireMock(
      "../preprocess/fetchAllPages",
    );
    mockFetchAllPages.mockResolvedValue([
      { json: jest.fn().mockResolvedValue([{ name: "resource.bin" }]) },
    ]);

    const result = await getCommonResourcesNames(makeUser());

    for (const type of nineTypes) {
      expect(Array.isArray(result[type])).toBe(true);
      expect(result[type]).not.toBeNull();
    }
  });

  it("partial-failure path — failing type is null, remaining eight are populated", async () => {
    mockSearch.mockResolvedValue({ id: "42", name: "EasyEyesResources" });
    mockLoadFromStorage.mockReturnValue(makeApiClient({}));
    const { fetchAllPages: mockFetchAllPages } = jest.requireMock(
      "../preprocess/fetchAllPages",
    );
    mockFetchAllPages.mockImplementation((path: string) => {
      if (path.endsWith("=fonts"))
        return Promise.reject(new Error("network error"));
      return Promise.resolve([
        { json: jest.fn().mockResolvedValue([{ name: "file.bin" }]) },
      ]);
    });

    const result = await getCommonResourcesNames(makeUser());

    expect(result["fonts"]).toBeNull();
    for (const type of nineTypes.filter((t) => t !== "fonts")) {
      expect(Array.isArray(result[type])).toBe(true);
      expect(result[type]).not.toBeNull();
    }
  });
});

// ─── Cycle 12: setRepoName (reuse) uses searchProjectsByName ─────────────────

describe("setRepoName — reuse mode uses searchProjectsByName", () => {
  it("returns myExp228 when 100 variants exist with no low numbers", async () => {
    const manyVariants = Array.from({ length: 100 }, (_, i) => ({
      name: `myExp${i + 129}`,
    }));
    mockSearchMany.mockResolvedValue(manyVariants);

    const user = makeUser({
      currentExperiment: { _pavloviaNewExperimentBool: false },
    });
    const result = await setRepoName(user, "myExp");

    expect(result).toBe("myExp228");
  });

  it("returns myExp1 when one variant exists", async () => {
    mockSearchMany.mockResolvedValue([{ name: "myExp1" }]);

    const user = makeUser({
      currentExperiment: { _pavloviaNewExperimentBool: false },
    });
    const result = await setRepoName(user, "myExp");

    expect(mockSearchMany).toHaveBeenCalledWith(user, "myExp");
    expect(result).toBe("myExp1");
  });

  it("returns myExp1 when no variants exist", async () => {
    mockSearchMany.mockResolvedValue([]);

    const user = makeUser({
      currentExperiment: { _pavloviaNewExperimentBool: false },
    });
    const result = await setRepoName(user, "myExp");

    expect(result).toBe("myExp1");
  });
});

// ─── Cycle 14: downloadCommonResources — single shared client ─────────────────

const allResourceTypes = [
  "fonts",
  "forms",
  "texts",
  "folders",
  "images",
  "code",
  "impulseResponses",
  "frequencyResponses",
  "targetSoundLists",
];

function setupDownloadMocks() {
  (jest.requireMock("../preprocess/constants") as any).resourcesFileTypes =
    allResourceTypes;

  const Swal = jest.requireMock("sweetalert2").default;
  Swal.showLoading = jest.fn();
  Swal.fire.mockImplementation(async (opts: any) => {
    if (opts?.didOpen) await opts.didOpen();
  });

  const JSZip = jest.requireMock("jszip") as jest.MockedClass<any>;
  JSZip.mockImplementation(() => ({
    file: jest.fn(),
    generateAsync: jest.fn().mockResolvedValue(null),
  }));

  const { fetchAllPages: mockFetchAllPages } = jest.requireMock(
    "../preprocess/fetchAllPages",
  );
  mockFetchAllPages.mockImplementation((path: string) => {
    if (path.includes("path=%2E"))
      return Promise.resolve([
        { json: jest.fn().mockResolvedValue([{ name: "experiment.csv" }]) },
      ]);
    return Promise.resolve([{ json: jest.fn().mockResolvedValue([]) }]);
  });

  const { getBase64FileDataFromGitLab } = jest.requireMock(
    "../preprocess/fileUtils",
  );
  (getBase64FileDataFromGitLab as jest.Mock).mockResolvedValue("");
}

function teardownDownloadMocks() {
  (jest.requireMock("../preprocess/constants") as any).resourcesFileTypes = [];
}

describe("downloadCommonResources — single shared client", () => {
  beforeEach(setupDownloadMocks);
  afterEach(teardownDownloadMocks);

  it("calls loadFromStorage exactly 3 times regardless of how many resource types exist", async () => {
    mockSearch.mockResolvedValue({ id: "42", name: "myExp" });
    mockLoadFromStorage.mockReturnValue(makeApiClient({}));

    await downloadCommonResources(makeUser(), "42", "myExp");

    // 1: getOriginalFileNameForProject, 2: dlInnerClient, 3: shared dlClient
    expect(mockLoadFromStorage).toHaveBeenCalledTimes(3);
  });
});

// ─── Cycle 15: downloadCommonResources — all 9 folder listings fire ───────────

describe("downloadCommonResources — all folder listings fire concurrently", () => {
  beforeEach(setupDownloadMocks);
  afterEach(teardownDownloadMocks);

  it("issues fetchAllPages once per resource type with all 9 types present", async () => {
    mockSearch.mockResolvedValue({ id: "42", name: "myExp" });
    mockLoadFromStorage.mockReturnValue(makeApiClient({}));

    const { fetchAllPages: mockFetchAllPages } = jest.requireMock(
      "../preprocess/fetchAllPages",
    );

    const folderFetchPaths: string[] = [];
    mockFetchAllPages.mockImplementation((path: string) => {
      if (path.includes("path=%2E"))
        return Promise.resolve([
          { json: jest.fn().mockResolvedValue([{ name: "experiment.csv" }]) },
        ]);
      folderFetchPaths.push(path);
      return Promise.resolve([{ json: jest.fn().mockResolvedValue([]) }]);
    });

    const { getBase64FileDataFromGitLab } = jest.requireMock(
      "../preprocess/fileUtils",
    );
    (getBase64FileDataFromGitLab as jest.Mock).mockResolvedValue("");

    await downloadCommonResources(makeUser(), "42", "myExp");

    expect(folderFetchPaths).toHaveLength(allResourceTypes.length);
    for (const type of allResourceTypes) {
      expect(
        folderFetchPaths.some((p) =>
          p.includes(encodeURIComponent(`${type}/`)),
        ),
      ).toBe(true);
    }
  });

  it("a slow type does not prevent other types from being fetched", async () => {
    mockSearch.mockResolvedValue({ id: "42", name: "myExp" });
    mockLoadFromStorage.mockReturnValue(makeApiClient({}));

    const { fetchAllPages: mockFetchAllPages } = jest.requireMock(
      "../preprocess/fetchAllPages",
    );

    const resolvedTypes: string[] = [];
    mockFetchAllPages.mockImplementation((path: string) => {
      if (path.includes("path=%2E"))
        return Promise.resolve([
          { json: jest.fn().mockResolvedValue([{ name: "experiment.csv" }]) },
        ]);
      const type = allResourceTypes.find((t) =>
        path.includes(encodeURIComponent(`${t}/`)),
      );
      return new Promise<any[]>((resolve) => {
        // fonts resolves last; all others resolve immediately
        const delay = type === "fonts" ? 20 : 0;
        setTimeout(() => {
          resolvedTypes.push(type ?? "unknown");
          resolve([{ json: jest.fn().mockResolvedValue([]) }]);
        }, delay);
      });
    });

    const { getBase64FileDataFromGitLab } = jest.requireMock(
      "../preprocess/fileUtils",
    );
    (getBase64FileDataFromGitLab as jest.Mock).mockResolvedValue("");

    await downloadCommonResources(makeUser(), "42", "myExp");

    expect(resolvedTypes).toHaveLength(allResourceTypes.length);
    // fonts resolved last only if outer loop is concurrent; serial would put it first
    expect(resolvedTypes[resolvedTypes.length - 1]).toBe("fonts");
  });
});

// ─── Cycle 16: downloadCommonResources — inner file downloads fire concurrently

describe("downloadCommonResources — inner file downloads fire concurrently", () => {
  beforeEach(setupDownloadMocks);
  afterEach(teardownDownloadMocks);

  it("a slow first file does not block later files within the same type", async () => {
    (jest.requireMock("../preprocess/constants") as any).resourcesFileTypes = [
      "images",
    ];

    mockSearch.mockResolvedValue({ id: "42", name: "myExp" });
    mockLoadFromStorage.mockReturnValue(makeApiClient({}));

    const { fetchAllPages: mockFetchAllPages } = jest.requireMock(
      "../preprocess/fetchAllPages",
    );
    mockFetchAllPages.mockImplementation((path: string) => {
      if (path.includes("path=%2E"))
        return Promise.resolve([
          { json: jest.fn().mockResolvedValue([{ name: "experiment.csv" }]) },
        ]);
      return Promise.resolve([
        {
          json: jest
            .fn()
            .mockResolvedValue([{ name: "slow.png" }, { name: "fast.png" }]),
        },
      ]);
    });

    const resolvedFiles: string[] = [];
    const { getBase64FileDataFromGitLab } = jest.requireMock(
      "../preprocess/fileUtils",
    );
    (getBase64FileDataFromGitLab as jest.Mock).mockImplementation(
      (_projectId: number, filePath: string) =>
        new Promise<string>((resolve) => {
          // CSV fetch for the original file; don't track it
          if (!filePath.includes("/")) {
            resolve("data");
            return;
          }
          const delay = filePath.includes("slow") ? 20 : 0;
          setTimeout(() => {
            resolvedFiles.push(filePath);
            resolve("data");
          }, delay);
        }),
    );

    await downloadCommonResources(makeUser(), "42", "myExp");

    expect(resolvedFiles).toHaveLength(2);
    // slow.png resolves last only if inner loop is concurrent; serial puts it first
    expect(resolvedFiles[resolvedFiles.length - 1]).toContain("slow");
  });
});

// ─── Cycle 18: gatherRequestedResourceActions — retryWithCondition uses searchProjectByName ───

describe("gatherRequestedResourceActions — retryWithCondition uses searchProjectByName not isProjectNameExistInProjectList", () => {
  let savedUserRepoFiles: any;

  beforeEach(() => {
    const constants = jest.requireMock("../preprocess/constants") as any;
    savedUserRepoFiles = constants.userRepoFiles;
    constants.userRepoFiles = {
      requestedFonts: ["arial.woff"],
      requestedForms: [],
      requestedTexts: [],
      requestedFolders: [],
      requestedImages: [],
      requestedCode: [],
      requestedImpulseResponses: [],
      requestedFrequencyResponses: [],
      blockFiles: [],
    };
    const { getBase64FileDataFromGitLab } = jest.requireMock(
      "../preprocess/fileUtils",
    );
    (getBase64FileDataFromGitLab as jest.Mock).mockResolvedValue("base64font");
  });

  afterEach(() => {
    (jest.requireMock("../preprocess/constants") as any).userRepoFiles =
      savedUserRepoFiles;
  });

  it("retryWithCondition succeeds on first attempt by calling searchProjectByName after createResourcesRepo", async () => {
    const createdRepo = { id: "99", name: "EasyEyesResources" };

    // Call 1: liveResourcesRepo check in gatherRequestedResourceActions → null (triggers retry block)
    // Call 2: createResourcesRepo pre-flight check → null (repo still absent, so createEmptyRepo runs)
    // Call 3: retry test callback after createEmptyRepo succeeds → repo now visible on Pavlovia
    mockSearch
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createdRepo);

    mockLoadFromStorage.mockReturnValue(makeApiClient(createdRepo, 201));

    // projectList contains the repo so the function doesn't throw after the retry block
    const user = makeUser({ projectList: Promise.resolve([createdRepo]) });

    await gatherRequestedResourceActions(user, false, null);

    // searchProjectByName must have been called three times: initial check + createResourcesRepo pre-flight + retry test
    expect(mockSearch).toHaveBeenCalledTimes(3);
    expect(mockSearch).toHaveBeenNthCalledWith(3, user, "EasyEyesResources");

    // No spurious Sentry error from isProjectNameExistInProjectList receiving a non-array
    const sentry = jest.requireMock("../components/sentry");
    expect(sentry.captureMessage).not.toHaveBeenCalledWith(
      "isProjectNameExistInProjectList: projectList is not an array",
      "error",
    );
  });
});

// ─── Cycle 17: gatherRequestedResourceActions — cache-miss fallback ───────────

describe("gatherRequestedResourceActions — cache-miss falls back to live search result", () => {
  let savedUserRepoFiles: any;

  beforeEach(() => {
    const constants = jest.requireMock("../preprocess/constants") as any;
    savedUserRepoFiles = constants.userRepoFiles;
    // One font so the loop body executes — the crash (or fallback) happens at parseInt(easyEyesResourcesRepo.id)
    constants.userRepoFiles = {
      requestedFonts: ["arial.woff"],
      requestedForms: [],
      requestedTexts: [],
      requestedFolders: [],
      requestedImages: [],
      requestedCode: [],
      requestedImpulseResponses: [],
      requestedFrequencyResponses: [],
      blockFiles: [],
    };
    const { getBase64FileDataFromGitLab } = jest.requireMock(
      "../preprocess/fileUtils",
    );
    (getBase64FileDataFromGitLab as jest.Mock).mockResolvedValue("base64font");
  });

  afterEach(() => {
    (jest.requireMock("../preprocess/constants") as any).userRepoFiles =
      savedUserRepoFiles;
  });

  it("returns commit actions without crashing when cache misses but live search finds EasyEyesResources", async () => {
    // Empty project list → getProjectByNameInProjectList returns undefined (cache miss)
    const user = makeUser({ projectList: Promise.resolve([]) });

    // Live search succeeds — repo exists on Pavlovia
    mockSearch.mockResolvedValue({ id: "42", name: "EasyEyesResources" });
    mockLoadFromStorage.mockReturnValue(makeApiClient({}));

    const result = await gatherRequestedResourceActions(user, false, null);

    expect(Array.isArray(result)).toBe(true);
    // Verify the live repo id was used (parseInt("42") = 42)
    const { getBase64FileDataFromGitLab } = jest.requireMock(
      "../preprocess/fileUtils",
    );
    expect(getBase64FileDataFromGitLab).toHaveBeenCalledWith(
      42,
      expect.any(String),
      expect.anything(),
    );
  });
});
