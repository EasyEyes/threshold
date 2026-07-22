import { GitLabOAuthClient } from "../preprocess/auth/gitlabOAuthClient";
import { createResourcesRepo, createUser } from "../preprocess/gitlabUtils";
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

// gitlabSearch is NOT mocked — searchProjectByName runs real code against apiRequest stub

jest.mock("../preprocess/gitlabUtils", () => ({
  createResourcesRepo: jest.fn().mockResolvedValue(undefined),
  // Code uses the createUser() factory (not the User class constructor).
  createUser: jest.fn(),
  getProlificToken: jest.fn().mockResolvedValue("token"),
  getCommonResourcesNames: jest.fn().mockResolvedValue({}),
}));

jest.mock("../preprocess/constants", () => ({
  resourcesRepoName: "EasyEyesResources",
}));

const mockLoadFromStorage = GitLabOAuthClient.loadFromStorage as jest.Mock;
const mockCreateResourcesRepo = createResourcesRepo as jest.Mock;
const mockCreateUser = createUser as jest.Mock;

function makeSearchResponse(projects: any[]) {
  return {
    ok: true,
    json: jest.fn().mockResolvedValue(projects),
    headers: { get: jest.fn(() => null) },
  };
}

// Returns a client usable by both loadStoredSession (getAccessToken) and
// searchProjectByName (apiRequest). projectsFound controls the search result.
function makeOAuthClient(projectsFound: any[]) {
  return {
    getAccessToken: jest.fn().mockReturnValue("tok"),
    clearTokens: jest.fn(),
    apiRequest: jest.fn().mockResolvedValue(makeSearchResponse(projectsFound)),
  };
}

function makeUser() {
  return {
    id: "42",
    initUserDetails: jest.fn().mockResolvedValue(undefined),
    initProjectList: jest.fn(),
  };
}

function makeSessionUser() {
  return {
    ...makeUser(),
    projectList: Promise.resolve([]),
  };
}

beforeEach(() => jest.clearAllMocks());

// ─── Cycle 1: tracer bullet ───────────────────────────────────────────────────

describe("loadStoredSession — repo found via live search", () => {
  it("does not call createResourcesRepo when apiRequest returns EasyEyesResources", async () => {
    const oauthClient = makeOAuthClient([{ id: 1, name: "EasyEyesResources" }]);
    const user = makeSessionUser();
    mockLoadFromStorage.mockReturnValue(oauthClient);
    mockCreateUser.mockReturnValue(user);

    const result = await loadStoredSession();
    await result![1]; // resolve the lazy resourcesPromise

    expect(mockCreateResourcesRepo).not.toHaveBeenCalled();
  });
});

// ─── Cycle 2: repo absent in loadStoredSession ───────────────────────────────

describe("loadStoredSession — repo absent", () => {
  it("calls createResourcesRepo when apiRequest returns empty project list", async () => {
    const oauthClient = makeOAuthClient([]); // no match → searchProjectByName returns null
    const user = makeSessionUser();
    mockLoadFromStorage.mockReturnValue(oauthClient);
    mockCreateUser.mockReturnValue(user);

    const result = await loadStoredSession();
    await result![1];

    expect(mockCreateResourcesRepo).toHaveBeenCalledWith(user);
  });
});

// ─── Cycle 3: getUserInfo never calls initProjectList ────────────────────────

describe("getUserInfo — no initProjectList", () => {
  it("does not call initProjectList", async () => {
    const client = makeOAuthClient([{ id: 1, name: "EasyEyesResources" }]);
    const user = makeUser();
    mockLoadFromStorage.mockReturnValue(client);
    mockCreateUser.mockReturnValue(user);

    await getUserInfo("access-token");

    expect(user.initProjectList).not.toHaveBeenCalled();
  });
});

// ─── Cycle 4: getUserInfo repo found ─────────────────────────────────────────

describe("getUserInfo — repo found via live search", () => {
  it("does not call createResourcesRepo when apiRequest returns EasyEyesResources", async () => {
    const client = makeOAuthClient([{ id: 1, name: "EasyEyesResources" }]);
    const user = makeUser();
    mockLoadFromStorage.mockReturnValue(client);
    mockCreateUser.mockReturnValue(user);

    await getUserInfo("access-token");

    expect(mockCreateResourcesRepo).not.toHaveBeenCalled();
  });
});

// ─── Cycle 5: getUserInfo repo absent ────────────────────────────────────────

describe("getUserInfo — repo absent", () => {
  it("calls createResourcesRepo when apiRequest returns empty project list", async () => {
    const client = makeOAuthClient([]); // no match → searchProjectByName returns null
    const user = makeUser();
    mockLoadFromStorage.mockReturnValue(client);
    mockCreateUser.mockReturnValue(user);

    await getUserInfo("access-token");

    expect(mockCreateResourcesRepo).toHaveBeenCalledWith(user);
  });
});
