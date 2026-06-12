import { GitLabOAuthClient } from "../preprocess/auth/gitlabOAuthClient";
import {
  searchProjectByName,
  searchProjectsByName,
  getProjectsPage,
} from "../preprocess/gitlabSearch";

jest.mock("../preprocess/auth/config", () => ({
  getAuthConfig: () => ({ clientId: "test", redirectUri: "http://test" }),
}));

jest.mock("../preprocess/auth/gitlabOAuthClient", () => ({
  GitLabOAuthClient: { loadFromStorage: jest.fn() },
}));

const mockLoadFromStorage = GitLabOAuthClient.loadFromStorage as jest.Mock;

type MockProject = { id: number; name: string };

function makeClient(projects: MockProject[], totalPages = 1) {
  return {
    apiRequest: jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(projects),
      headers: {
        get: jest.fn((h: string) =>
          h === "x-total-pages" ? String(totalPages) : null,
        ),
      },
    }),
  };
}

beforeEach(() => jest.clearAllMocks());

// ─── Cycle 1: tracer bullet ───────────────────────────────────────────────────

describe("searchProjectByName — exact match", () => {
  it("returns the project whose name exactly matches, given multiple similarly-named projects", async () => {
    const projects: MockProject[] = [
      { id: 1, name: "myExp" },
      { id: 2, name: "myExp1" },
      { id: 3, name: "myExp2" },
    ];
    const client = makeClient(projects);
    mockLoadFromStorage.mockReturnValue(client);

    const result = await searchProjectByName({ id: "123" }, "myExp");

    expect(result).toEqual({ id: 1, name: "myExp" });
    expect(client.apiRequest).toHaveBeenCalledWith(
      expect.stringContaining("search=myExp"),
    );
  });
});

// ─── Cycle 2: no match ────────────────────────────────────────────────────────

describe("searchProjectByName — no match", () => {
  it("returns null when no project has an exact name match", async () => {
    const client = makeClient([
      { id: 2, name: "myExp1" },
      { id: 3, name: "myExp2" },
    ]);
    mockLoadFromStorage.mockReturnValue(client);

    const result = await searchProjectByName({ id: "123" }, "myExp");

    expect(result).toBeNull();
  });
});

// ─── Cycle 3: searchProjectsByName ───────────────────────────────────────────

describe("searchProjectsByName — all results", () => {
  it("returns all results unfiltered from the API response", async () => {
    const projects: MockProject[] = [
      { id: 1, name: "myExp" },
      { id: 2, name: "myExp1" },
    ];
    const client = makeClient(projects);
    mockLoadFromStorage.mockReturnValue(client);

    const result = await searchProjectsByName({ id: "123" }, "myExp");

    expect(result).toEqual(projects);
    expect(client.apiRequest).toHaveBeenCalledWith(
      expect.stringContaining("search=myExp"),
    );
  });
});

// ─── Cycle 4 & 5: getProjectsPage ────────────────────────────────────────────

describe("getProjectsPage — pagination", () => {
  it("returns hasMore: true when on page 2 of 3", async () => {
    const client = makeClient([{ id: 1, name: "p1" }], 3);
    mockLoadFromStorage.mockReturnValue(client);

    const result = await getProjectsPage({ id: "123" }, 2);

    expect(result.hasMore).toBe(true);
    expect(client.apiRequest).toHaveBeenCalledWith(
      expect.stringContaining("page=2"),
    );
  });

  it("returns hasMore: false when on the last page (3 of 3)", async () => {
    const client = makeClient([{ id: 1, name: "p1" }], 3);
    mockLoadFromStorage.mockReturnValue(client);

    const result = await getProjectsPage({ id: "123" }, 3);

    expect(result.hasMore).toBe(false);
    expect(result.projects).toEqual([{ id: 1, name: "p1" }]);
  });
});
