import { fetchAllPages } from "../preprocess/fetchAllPages";
import type { GitLabOAuthClient } from "../preprocess/auth/gitlabOAuthClient";

jest.mock("../components/sentry", () => ({
  captureError: jest.fn(),
}));

function makeResponse(
  opts: { status?: number; ok?: boolean; linkHeader?: string } = {},
): Response {
  const { status = 200, ok = true, linkHeader } = opts;
  const headers = new Headers();
  if (linkHeader) headers.set("Link", linkHeader);
  return { status, ok, headers, json: jest.fn().mockResolvedValue([]) } as unknown as Response;
}

function makeClient(apiRequest: jest.Mock): GitLabOAuthClient {
  return { apiRequest } as unknown as GitLabOAuthClient;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── single page ──────────────────────────────────────────────────────────────

describe("fetchAllPages — single page", () => {
  it("calls apiRequest once with per_page=100 appended and returns one response", async () => {
    const apiRequest = jest.fn().mockResolvedValue(makeResponse());
    const client = makeClient(apiRequest);

    const results = await fetchAllPages("/projects/1/repository/tree", client);

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(
      expect.stringContaining("per_page=100"),
    );
    expect(results).toHaveLength(1);
  });

  it("does not append per_page when caller already set it", async () => {
    const apiRequest = jest.fn().mockResolvedValue(makeResponse());
    const client = makeClient(apiRequest);

    await fetchAllPages("/projects/1/repository/tree?per_page=50", client);

    const calledWith: string = apiRequest.mock.calls[0][0];
    expect(calledWith).toContain("per_page=50");
    expect(calledWith).not.toMatch(/per_page=100/);
  });
});

// ─── multi-page ───────────────────────────────────────────────────────────────

describe("fetchAllPages — multi-page", () => {
  it("follows Link rel=next and returns all pages", async () => {
    const page2Link =
      '<https://gitlab.pavlovia.org/api/v4/projects/1/repository/tree?page=2&per_page=100>; rel="next"';
    const apiRequest = jest
      .fn()
      .mockResolvedValueOnce(makeResponse({ linkHeader: page2Link }))
      .mockResolvedValueOnce(makeResponse());
    const client = makeClient(apiRequest);

    const results = await fetchAllPages("/projects/1/repository/tree", client);

    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
  });

  it("stops when Link header has no rel=next", async () => {
    const otherLink =
      '<https://gitlab.pavlovia.org/api/v4/projects/1/repository/tree?page=1&per_page=100>; rel="first"';
    const apiRequest = jest.fn().mockResolvedValue(makeResponse({ linkHeader: otherLink }));
    const client = makeClient(apiRequest);

    const results = await fetchAllPages("/projects/1/repository/tree", client);

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
  });
});

// ─── per-page transient failure ───────────────────────────────────────────────

describe("fetchAllPages — per-page transient failure", () => {
  it("assembles all pages correctly when apiRequest retries internally", async () => {
    // apiRequest already retried and resolved — fetchAllPages just sees a success
    const page2Link =
      '<https://gitlab.pavlovia.org/api/v4/projects/1/repository/tree?page=2&per_page=100>; rel="next"';
    const apiRequest = jest
      .fn()
      .mockResolvedValueOnce(makeResponse({ linkHeader: page2Link }))
      .mockResolvedValueOnce(makeResponse()); // second page (after internal retry in apiRequest)
    const client = makeClient(apiRequest);

    const results = await fetchAllPages("/projects/1/repository/tree", client);

    expect(results).toHaveLength(2);
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
});

// ─── safety limits ────────────────────────────────────────────────────────────

describe("fetchAllPages — safety limits", () => {
  it("throws on revisited URL (infinite loop detection)", async () => {
    const selfLink =
      '<https://gitlab.pavlovia.org/api/v4/projects/1/repository/tree?per_page=100>; rel="next"';
    const apiRequest = jest.fn().mockResolvedValue(makeResponse({ linkHeader: selfLink }));
    const client = makeClient(apiRequest);

    await expect(
      fetchAllPages("/projects/1/repository/tree", client),
    ).rejects.toThrow(/[Ii]nfinite loop/);
  });
});
