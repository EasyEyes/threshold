import { fetchAllPages } from "../preprocess/fetchAllPages";
import type { GitLabOAuthClient } from "../preprocess/auth/gitlabOAuthClient";

jest.mock("../components/sentry", () => ({
  captureError: jest.fn(),
}));

function makeResponse(
  opts: {
    status?: number;
    ok?: boolean;
    linkHeader?: string;
    totalPages?: number;
  } = {},
): Response {
  const { status = 200, ok = true, linkHeader, totalPages } = opts;
  const headers = new Headers();
  if (linkHeader) headers.set("Link", linkHeader);
  if (totalPages !== undefined)
    headers.set("X-Total-Pages", String(totalPages));
  return {
    status,
    ok,
    headers,
    json: jest.fn().mockResolvedValue([]),
  } as unknown as Response;
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

  it("forwards caller cancellation to every page request", async () => {
    const controller = new AbortController();
    const apiRequest = jest.fn().mockResolvedValue(makeResponse());
    const client = makeClient(apiRequest);

    await fetchAllPages("/projects/1/repository/tree", client, {
      signal: controller.signal,
    });

    expect(apiRequest).toHaveBeenCalledWith(expect.any(String), {
      signal: controller.signal,
    });
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
    const apiRequest = jest
      .fn()
      .mockResolvedValue(makeResponse({ linkHeader: otherLink }));
    const client = makeClient(apiRequest);

    const results = await fetchAllPages("/projects/1/repository/tree", client);

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
  });
});

describe("fetchAllPages — parallel pagination", () => {
  it("bounds concurrent page fetches and preserves page order", async () => {
    const pending = new Map<number, () => void>();
    const responsesByPage = new Map<number, Response>();
    const firstResponse = makeResponse({ totalPages: 4 });
    const apiRequest = jest.fn().mockImplementation((endpoint: string) => {
      const url = new URL(`https://gitlab.pavlovia.org/api/v4${endpoint}`);
      const page = Number(url.searchParams.get("page") ?? "1");
      if (page === 1) return Promise.resolve(firstResponse);
      return new Promise<Response>((resolve) => {
        pending.set(page, () => {
          const response = makeResponse();
          responsesByPage.set(page, response);
          resolve(response);
        });
      });
    });
    const client = makeClient(apiRequest);

    const promise = fetchAllPages(
      "/projects/1/repository/tree?recursive=true",
      client,
      { parallel: true, maxConcurrent: 2 },
    );
    const requestedPages = () =>
      apiRequest.mock.calls.map(([endpoint]) => {
        const url = new URL(`https://gitlab.pavlovia.org/api/v4${endpoint}`);
        return Number(url.searchParams.get("page") ?? "1");
      });
    const flush = async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    };

    await flush();
    expect(requestedPages()).toEqual([1, 2, 3]);

    pending.get(2)!();
    await flush();
    expect(requestedPages()).toEqual([1, 2, 3, 4]);

    // Page 4 can finish before page 3; results must remain ordered.
    pending.get(4)!();
    await flush();
    let settled = false;
    void promise.then(() => {
      settled = true;
    });
    await flush();
    expect(settled).toBe(false);

    pending.get(3)!();
    const responses = await promise;
    expect(responses).toHaveLength(4);
    expect(responses[0]).toBe(firstResponse);
    expect(responses[1]).toBe(responsesByPage.get(2));
    expect(responses[2]).toBe(responsesByPage.get(3));
    expect(responses[3]).toBe(responsesByPage.get(4));
    expect(requestedPages()).toEqual([1, 2, 3, 4]);
  });

  it("uses the server's next-link URL as the parallel page template", async () => {
    const page2Link =
      '<https://gitlab.pavlovia.org/api/v4/projects/1/repository/tree?recursive=true&page=2&per_page=100&scope=all>; rel="next"';
    const apiRequest = jest
      .fn()
      .mockResolvedValueOnce(
        makeResponse({ totalPages: 2, linkHeader: page2Link }),
      )
      .mockResolvedValueOnce(makeResponse());
    const client = makeClient(apiRequest);

    await fetchAllPages("/projects/1/repository/tree?recursive=true", client, {
      parallel: true,
    });

    expect(apiRequest.mock.calls[1][0]).toContain("page=2");
    expect(apiRequest.mock.calls[1][0]).toContain("scope=all");
  });

  it("falls back to Link navigation without a total-page header", async () => {
    const page2Link =
      '<https://gitlab.pavlovia.org/api/v4/projects/1/repository/tree?page=2&per_page=100>; rel="next"';
    const apiRequest = jest
      .fn()
      .mockResolvedValueOnce(makeResponse({ linkHeader: page2Link }))
      .mockResolvedValueOnce(makeResponse());
    const client = makeClient(apiRequest);

    const results = await fetchAllPages("/projects/1/repository/tree", client, {
      parallel: true,
    });

    expect(results).toHaveLength(2);
    expect(apiRequest).toHaveBeenCalledTimes(2);
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
    const apiRequest = jest
      .fn()
      .mockResolvedValue(makeResponse({ linkHeader: selfLink }));
    const client = makeClient(apiRequest);

    await expect(
      fetchAllPages("/projects/1/repository/tree", client),
    ).rejects.toThrow(/[Ii]nfinite loop/);
  });
});
