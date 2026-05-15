import { GitLabOAuthClient } from "../preprocess/auth/gitlabOAuthClient";
import { searchProjectByName } from "../preprocess/gitlabSearch";
import { createResourcesRepo, User } from "../preprocess/gitlabUtils";
import { loadStoredSession, getUserInfo } from "../preprocess/user";

jest.mock("../preprocess/auth/config", () => ({
  getAuthConfig: () => ({ clientId: "cid", redirectUri: "http://redirect" }),
}));

jest.mock("../preprocess/auth/gitlabAuth", () => ({
  GitLabAuth: jest.fn().mockImplementation(() => ({
    startAuthorization: jest.fn(),
  })),
}));

jest.mock("../preprocess/auth/gitlabOAuthClient", () => ({
  GitLabOAuthClient: { loadFromStorage: jest.fn() },
}));

jest.mock("../preprocess/gitlabSearch", () => ({
  searchProjectByName: jest.fn(),
}));

jest.mock("../preprocess/gitlabUtils", () => ({
  createResourcesRepo: jest.fn().mockResolvedValue(undefined),
  getProlificToken: jest.fn().mockResolvedValue("token"),
  getCommonResourcesNames: jest.fn().mockResolvedValue({}),
  isProjectNameExistInProjectList: jest.fn(),
  User: jest.fn(),
}));

jest.mock("../preprocess/constants", () => ({
  resourcesRepoName: "EasyEyesResources",
}));

const mockLoadFromStorage = GitLabOAuthClient.loadFromStorage as jest.Mock;
const mockSearchProjectByName = searchProjectByName as jest.Mock;
const mockCreateResourcesRepo = createResourcesRepo as jest.Mock;
const MockUser = User as jest.Mock;

function makeOAuthClient() {
  return { getAccessToken: jest.fn().mockReturnValue("tok"), clearTokens: jest.fn() };
}

function makeUser() {
  return {
    id: "42",
    initUserDetails: jest.fn().mockResolvedValue(undefined),
    initProjectList: jest.fn(),
    projectList: Promise.resolve([]),
  };
}

beforeEach(() => jest.clearAllMocks());

// ─── Cycle 1: tracer bullet ───────────────────────────────────────────────────

describe("loadStoredSession — repo found via live search", () => {
  it("does not call createResourcesRepo when searchProjectByName finds EasyEyesResources", async () => {
    const oauthClient = makeOAuthClient();
    const user = makeUser();
    mockLoadFromStorage.mockReturnValue(oauthClient);
    MockUser.mockImplementation(() => user);
    mockSearchProjectByName.mockResolvedValue({ id: 1, name: "EasyEyesResources" });

    const result = await loadStoredSession();
    await result![1]; // resolve the lazy resourcesPromise

    expect(mockCreateResourcesRepo).not.toHaveBeenCalled();
  });
});

// ─── Cycle 2: repo absent in loadStoredSession ───────────────────────────────

describe("loadStoredSession — repo absent", () => {
  it("calls createResourcesRepo when searchProjectByName returns null", async () => {
    const oauthClient = makeOAuthClient();
    const user = makeUser();
    mockLoadFromStorage.mockReturnValue(oauthClient);
    MockUser.mockImplementation(() => user);
    mockSearchProjectByName.mockResolvedValue(null);

    const result = await loadStoredSession();
    await result![1];

    expect(mockCreateResourcesRepo).toHaveBeenCalledWith(user);
  });
});

// ─── Cycle 3: getUserInfo repo found ─────────────────────────────────────────

describe("getUserInfo — repo found via live search", () => {
  it("does not call createResourcesRepo when searchProjectByName finds EasyEyesResources", async () => {
    const user = makeUser();
    MockUser.mockImplementation(() => user);
    mockSearchProjectByName.mockResolvedValue({ id: 1, name: "EasyEyesResources" });

    await getUserInfo("access-token");

    expect(mockCreateResourcesRepo).not.toHaveBeenCalled();
  });
});

// ─── Cycle 4: getUserInfo repo absent ────────────────────────────────────────

describe("getUserInfo — repo absent", () => {
  it("calls createResourcesRepo when searchProjectByName returns null", async () => {
    const user = makeUser();
    MockUser.mockImplementation(() => user);
    mockSearchProjectByName.mockResolvedValue(null);

    await getUserInfo("access-token");

    expect(mockCreateResourcesRepo).toHaveBeenCalledWith(user);
  });
});
