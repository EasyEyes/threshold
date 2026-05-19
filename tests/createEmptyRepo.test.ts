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
import { createEmptyRepo } from "../preprocess/gitlabUtils";

const mockLoadFromStorage = GitLabOAuthClient.loadFromStorage as jest.Mock;

function makeUser(id = "123") {
  return { id, accessToken: "" } as any;
}

function fakeResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  };
}

function makeClient(...responses: ReturnType<typeof fakeResponse>[]) {
  let i = 0;
  return {
    apiRequest: jest
      .fn()
      .mockImplementation(() => Promise.resolve(responses[i++])),
    getAccessToken: jest.fn().mockReturnValue("tok"),
  };
}

beforeEach(() => jest.clearAllMocks());

// ─── Cycle 1: 400 "already been taken" + fallback finds project ───────────────

describe('createEmptyRepo — "already been taken" with fallback match', () => {
  it("returns the existing project found via fallback search", async () => {
    const existing = { id: "77", name: "myExp1" };
    const client = makeClient(
      fakeResponse({ message: { name: ["has already been taken"] } }, 400),
      fakeResponse([existing]),
    );
    mockLoadFromStorage.mockReturnValue(client);

    const result = await createEmptyRepo("myExp1", makeUser());

    expect(result).toEqual(existing);
  });
});

// ─── Cycle 3: 400 unrecognized error → full response body in thrown message ───

describe("createEmptyRepo — 400 unrecognized error includes full body", () => {
  it("includes non-message fields from the response body in the error", async () => {
    const errorBody = {
      message: "Namespace not found",
      code: "namespace_not_found",
    };
    const client = makeClient(fakeResponse(errorBody, 400));
    mockLoadFromStorage.mockReturnValue(client);

    await expect(createEmptyRepo("myExp1", makeUser())).rejects.toThrow(
      /namespace_not_found/,
    );
  });
});

// ─── Cycle 2: 400 "already been taken" + fallback finds nothing ───────────────

describe('createEmptyRepo — "already been taken" with no fallback match', () => {
  it("throws an actionable error naming the conflicting project", async () => {
    const client = makeClient(
      fakeResponse({ message: { name: ["has already been taken"] } }, 400),
      fakeResponse([]), // fallback search returns empty list
    );
    mockLoadFromStorage.mockReturnValue(client);

    await expect(createEmptyRepo("myExp1", makeUser())).rejects.toThrow(
      /myExp1.*already taken/i,
    );
  });
});
