/**
 * When a requested resource is missing at upload time, the scientist must be
 * told WHICH resource, and the deterministic failure must not be retried
 * MAX_RETRIES times.
 *
 * @jest-environment jsdom
 */
jest.mock("sweetalert2", () => ({
  __esModule: true,
  default: {
    fire: jest.fn(),
    close: jest.fn(),
    showLoading: jest.fn(),
    isVisible: jest.fn(() => false),
    getPopup: jest.fn(),
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
    requestedTexts: ["missing.txt"],
    requestedFolders: [],
    requestedImages: [],
    requestedCode: [],
    requestedImpulseResponses: [],
    requestedFrequencyResponses: [],
    blockFiles: ["block_1.csv"],
    experiment: { name: "myExp.csv" },
  },
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

import { createPavloviaExperiment } from "../preprocess/gitlabUtils";
import { searchProjectByName } from "../preprocess/gitlabSearch";
import { GitLabOAuthClient } from "../preprocess/auth/gitlabOAuthClient";
import { getTextFileDataFromGitLab } from "../preprocess/fileUtils";
import { fetchAllPages } from "../preprocess/fetchAllPages";

const mockSearch = searchProjectByName as jest.Mock;
const mockLoadFromStorage = GitLabOAuthClient.loadFromStorage as jest.Mock;
const mockGetText = getTextFileDataFromGitLab as jest.Mock;

const makeClient = () => ({
  apiRequest: jest.fn().mockImplementation(async (url: string) => ({
    ok: true,
    status: 201,
    json: async () => (url.includes("/repository/tree") ? [] : { id: 42 }),
    text: async () => "",
    headers: { get: () => null },
  })),
  getAccessToken: jest.fn(() => "tok"),
  ensureValidToken: jest.fn().mockResolvedValue(undefined),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch.mockResolvedValue({ id: "42", name: "repo" });
  mockLoadFromStorage.mockReturnValue(makeClient());
  (fetchAllPages as jest.Mock).mockResolvedValue([{ json: async () => [] }]);
});

it("tells the scientist which resource is missing, without retrying", async () => {
  mockGetText.mockResolvedValue(`{"message":"404 File Not Found"}`);

  const user: any = {
    id: "1",
    accessToken: "",
    projectList: Promise.resolve([]),
    initProjectList: jest.fn().mockResolvedValue(undefined),
    currentExperiment: { _pavloviaNewExperimentBool: true },
    totalProjectPages: 1,
  };

  await createPavloviaExperiment(user, "myExp", jest.fn(), false, null);

  // Sanity: the flow must actually reach the resource fetch.
  expect(mockGetText).toHaveBeenCalled();

  // The failure is deterministic: one attempt, not MAX_RETRIES.
  expect(mockGetText).toHaveBeenCalledTimes(1);

  // The scientist sees WHICH resource, not a generic apology.
  const Swal = jest.requireMock("sweetalert2").default;
  const dialogMentionsMissingResource = Swal.fire.mock.calls.some(
    (args: any[]) =>
      typeof args[0] === "object" &&
      String(args[0].text ?? "").includes("missing.txt"),
  );
  expect(dialogMentionsMissingResource).toBe(true);
}, 60000);
