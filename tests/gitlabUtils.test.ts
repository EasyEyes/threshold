// Heavy browser-only modules must be mocked before gitlabUtils is imported.
jest.mock("sweetalert2", () => ({
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
  getCompatibilityRequirements: jest.fn(() => ({ compatibilityRequirements: [""] })),
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

// ─── Cycle 1: createResourcesRepo confirms creation via search ────────────────

describe("createResourcesRepo — confirms repo exists via search after creation", () => {
  it("returns the repo found by searchProjectByName after createEmptyRepo succeeds", async () => {
    const created = { id: "42", name: "EasyEyesResources" };
    mockLoadFromStorage.mockReturnValue(makeApiClient(created, 201));
    mockSearch.mockResolvedValue(created);

    const user = makeUser();
    const result = await createResourcesRepo(user);

    expect(result).toEqual(created);
    expect(mockSearch).toHaveBeenCalledWith(user, "EasyEyesResources");
  });

  it("throws when searchProjectByName returns null after creation", async () => {
    const created = { id: "42", name: "EasyEyesResources" };
    mockLoadFromStorage.mockReturnValue(makeApiClient(created, 201));
    mockSearch.mockResolvedValue(null);

    await expect(createResourcesRepo(makeUser())).rejects.toThrow(
      "createResourcesRepo (3)",
    );
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
    expect(mockSearch).toHaveBeenCalledWith(expect.anything(), "EasyEyesResources");
  });
});

// ─── Cycle 4: getProlificToken finds repo via search ─────────────────────────

describe("getProlificToken — finds EasyEyesResources via search", () => {
  it("returns empty string when searchProjectByName returns null", async () => {
    mockSearch.mockResolvedValue(null);

    const result = await getProlificToken(makeUser());

    expect(result).toBe("");
    expect(mockSearch).toHaveBeenCalledWith(expect.anything(), "EasyEyesResources");
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
      get projectList() { return projectListSpy(); },
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
