// Probe: does the post-compile source.zip export (downloadCommonResources)
// include the readingCorpus text files from the experiment project's texts/?
jest.mock("sweetalert2", () => ({
  __esModule: true,
  default: {
    fire: jest.fn(async (opts: any) => {
      if (opts?.didOpen) await opts.didOpen();
      return {};
    }),
    close: jest.fn(),
    showLoading: jest.fn(),
    isVisible: jest.fn(() => false),
    getPopup: jest.fn(),
  },
}));
jest.mock("file-saver", () => ({ saveAs: jest.fn() }));
jest.mock("../components/sentry", () => ({
  captureError: jest.fn(),
  captureMessage: jest.fn(),
  captureCompilerFailure: jest.fn(),
  recordCompilerPhase: jest.fn(),
  getHttpErrorDetails: jest.fn(() => ({})),
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
jest.mock("../preprocess/fetchAllPages", () => ({
  fetchAllPages: jest.fn(),
}));
jest.mock("../preprocess/constants", () => ({
  acceptableExtensions: {},
  acceptableResourcesExtensionsOfTextDataType: ["txt"],
  resourcesFileTypes: ["fonts", "texts"],
  resourcesRepoName: "EasyEyesResources",
  ThresholdRepoFiles: class {},
  userRepoFiles: { requestedFonts: [], requestedTexts: [], blockFiles: [] },
}));
jest.mock("../preprocess/auth/config", () => ({
  getAuthConfig: () => ({ clientId: "test", redirectUri: "http://test" }),
}));
jest.mock("../preprocess/auth/gitlabOAuthClient", () => ({
  GitLabOAuthClient: { loadFromStorage: jest.fn() },
}));
jest.mock("../preprocess/gitlabSearch");

import JSZip from "jszip";
import { saveAs } from "file-saver";
import { downloadCommonResources } from "../preprocess/gitlabUtils";
import { searchProjectByName } from "../preprocess/gitlabSearch";
import { GitLabOAuthClient } from "../preprocess/auth/gitlabOAuthClient";
import { fetchAllPages } from "../preprocess/fetchAllPages";
import {
  getBase64FileDataFromGitLab,
  getTextFileDataFromGitLab,
} from "../preprocess/fileUtils";

const mockSearch = searchProjectByName as jest.Mock;
const mockLoad = GitLabOAuthClient.loadFromStorage as jest.Mock;
const mockFetchAllPages = fetchAllPages as jest.Mock;
const mockGetText = getTextFileDataFromGitLab as jest.Mock;
const mockGetBase64 = getBase64FileDataFromGitLab as jest.Mock;

describe("source.zip export includes readingCorpus texts", () => {
  it("bundles texts/ files from the experiment project", async () => {
    mockSearch.mockResolvedValue({ id: "42", name: "EasyEyesResources" });
    mockLoad.mockReturnValue({
      ensureValidToken: jest.fn(),
      getAccessToken: jest.fn(() => "token"),
    });
    // Tree requests: first call is project root (find original spreadsheet),
    // subsequent calls are resource folder listings.
    mockFetchAllPages.mockImplementation(async (url: string) => {
      if (url.includes("path=%2E"))
        return [{ json: async () => [{ name: "myExp.csv" }] }];
      if (url.includes("path=texts"))
        return [{ json: async () => [{ name: "short-reading.txt" }] }];
      if (url.includes("path=fonts"))
        return [{ json: async () => [{ name: "Sloan.woff2" }] }];
      return [{ json: async () => [] }];
    });
    mockGetBase64.mockImplementation(async (_id: number, path: string) => {
      if (path === "myExp.csv") return btoa("param,value");
      return btoa("FONTBYTES");
    });
    mockGetText.mockResolvedValue("Once upon a time");

    const user: any = {
      accessToken: "t",
      currentExperiment: {},
      userData: { email: "s@s.com" },
    };
    await downloadCommonResources(user, "myExp", "myExp");
    // saveAs fires inside an unawaited generateAsync().then()
    await new Promise((r) => setTimeout(r, 50));

    const blob = (saveAs as jest.Mock).mock.calls[0][0];
    const buf = await (blob as Blob).arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    expect(Object.keys(zip.files).sort()).toEqual([
      "Sloan.woff2",
      "myExp.csv",
      "short-reading.txt",
    ]);
    expect(await zip.file("short-reading.txt")!.async("string")).toBe(
      "Once upon a time",
    );
  });
});
