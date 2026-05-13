import { handleDrop } from "../../source/components/dropzone";
import { ensureValidToken } from "../preprocess/auth/ensureValidToken";
import type { User } from "../preprocess/gitlabUtils";

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock("../preprocess/auth/ensureValidToken", () => ({
  ensureValidToken: jest.fn(),
}));

jest.mock("../preprocess/user", () => ({
  redirectToOauth2: jest.fn(),
}));

jest.mock("sweetalert2", () => ({
  __esModule: true,
  default: {
    fire: jest.fn().mockResolvedValue({}),
    close: jest.fn(),
    showLoading: jest.fn(),
  },
}));

jest.mock("../preprocess/gitlabUtils", () => ({
  createOrUpdateCommonResources: jest.fn().mockResolvedValue(undefined),
  getCommonResourcesNames: jest.fn().mockResolvedValue({}),
  User: class {},
}));

jest.mock("../preprocess/fileUtils", () => ({
  getFileExtension: jest.fn(() => "xlsx"),
  isAcceptableExtension: jest.fn(() => true),
  isValidateFileName: jest.fn(() => true),
}));

jest.mock("../preprocess/utils", () => ({
  isExpTableFile: jest.fn(() => true),
}));

jest.mock("../preprocess/constants", () => ({
  userRepoFiles: { impulseResponses: [], frequencyResponses: [], targetSoundLists: [], experiment: null },
}));

jest.mock("jszip", () => ({
  __esModule: true,
  default: jest.fn(() => ({ loadAsync: jest.fn().mockResolvedValue({ files: {} }) })),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockGate = ensureValidToken as jest.Mock;

function makeFile(name: string): File {
  return { name } as unknown as File;
}

function callHandleDrop(
  files: File[],
  overrides: Partial<{ handleExperimentFile: jest.Mock; addResourcesForApp: jest.Mock }> = {},
) {
  const handleExperimentFile = overrides.handleExperimentFile ?? jest.fn();
  const addResourcesForApp = overrides.addResourcesForApp ?? jest.fn();
  return handleDrop(
    {} as User,
    files,
    addResourcesForApp,
    handleExperimentFile,
    jest.fn(),
    jest.fn(),
  ).then(() => ({ handleExperimentFile, addResourcesForApp }));
}

beforeEach(() => jest.clearAllMocks());

// ─── Cycle 4: gate blocks ─────────────────────────────────────────────────────

describe("handleDrop — gate returns false", () => {
  it("returns early without calling handleExperimentFile", async () => {
    mockGate.mockResolvedValue(false);
    const { handleExperimentFile } = await callHandleDrop([makeFile("exp.xlsx")]);
    expect(handleExperimentFile).not.toHaveBeenCalled();
  });
});

// ─── Cycle 5: gate passes ─────────────────────────────────────────────────────

describe("handleDrop — gate returns true", () => {
  it("calls handleExperimentFile when an experiment file is dropped", async () => {
    mockGate.mockResolvedValue(true);
    const file = makeFile("experiment.xlsx");
    const { handleExperimentFile } = await callHandleDrop([file]);
    expect(handleExperimentFile).toHaveBeenCalledWith(file);
  });
});
