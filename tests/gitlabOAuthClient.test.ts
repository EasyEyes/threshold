import { GitLabOAuthClient } from "../preprocess/auth/gitlabOAuthClient";
import { refreshAccessToken } from "../preprocess/pkceUtils";

jest.mock("../preprocess/retry", () => ({
  getRetryDelayMs: jest.fn(() => 0),
  wait: jest.fn().mockResolvedValue(undefined),
  BASE_DELAY_SEC: 0.2,
  MAX_DELAY_SEC: 5,
}));

jest.mock("../preprocess/pkceUtils", () => ({
  refreshAccessToken: jest.fn(),
}));

jest.mock("../preprocess/auth/storage", () => ({
  saveTokensToStorage: jest.fn(),
  loadTokensFromStorage: jest.fn(),
  clearTokensFromStorage: jest.fn(),
}));

const ok = (status = 200) => ({ status, statusText: "OK", ok: true });
const err = (status: number, statusText = "Internal Server Error") => ({
  status,
  statusText,
  ok: false,
});

function makeClient() {
  return new GitLabOAuthClient({
    clientId: "test-client",
    redirectUri: "http://localhost/callback",
    accessToken: "test-token",
    refreshToken: "test-refresh",
    expiresAt: Date.now() + 3_600_000,
    baseUrl: "https://gitlab.example.com",
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
});

const tokenData = {
  access_token: "new-token",
  refresh_token: "new-refresh",
  expires_in: 3600,
};

// ─── transient-failure retries ────────────────────────────────────────────────

describe("apiRequest — transient retry", () => {
  it("resolves after two 500s then a 200", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(500))
      .mockResolvedValueOnce(err(500))
      .mockResolvedValueOnce(ok());

    const response = await makeClient().apiRequest("/user");

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("throws with status 500 after three 500s", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(err(500));

    await expect(makeClient().apiRequest("/user")).rejects.toMatchObject({
      status: 500,
    });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("resolves after two TypeErrors then a 200", async () => {
    const networkErr = new TypeError("Failed to fetch");
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(networkErr)
      .mockRejectedValueOnce(networkErr)
      .mockResolvedValueOnce(ok());

    const response = await makeClient().apiRequest("/user");

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("rethrows network error after three TypeErrors", async () => {
    const networkErr = new TypeError("ERR_NETWORK_CHANGED");
    (global.fetch as jest.Mock).mockRejectedValue(networkErr);

    await expect(makeClient().apiRequest("/user")).rejects.toBe(networkErr);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("retries 429 the same as 5xx", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(429, "Too Many Requests"))
      .mockResolvedValueOnce(ok());

    const response = await makeClient().apiRequest("/user");

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

// ─── 401 refresh-and-retry ────────────────────────────────────────────────────

describe("apiRequest — 401 refresh", () => {
  it("resolves after a 401 when token refresh succeeds", async () => {
    (refreshAccessToken as jest.Mock).mockResolvedValue(tokenData);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(401, "Unauthorized"))
      .mockResolvedValueOnce(ok());

    const response = await makeClient().apiRequest("/user");

    expect(response.status).toBe(200);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("throws AUTH_TOKEN_INVALID when token refresh fails", async () => {
    (refreshAccessToken as jest.Mock).mockRejectedValue(new Error("network"));
    (global.fetch as jest.Mock).mockResolvedValueOnce(err(401, "Unauthorized"));

    await expect(makeClient().apiRequest("/user")).rejects.toThrow(
      "AUTH_TOKEN_INVALID",
    );
  });

  it("throws AUTH_TOKEN_INVALID when one-shot retry also returns 401", async () => {
    (refreshAccessToken as jest.Mock).mockResolvedValue(tokenData);
    (global.fetch as jest.Mock).mockResolvedValue(err(401, "Unauthorized"));

    await expect(makeClient().apiRequest("/user")).rejects.toThrow(
      "AUTH_TOKEN_INVALID",
    );
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("concurrent 401s trigger exactly one refresh; both resolve", async () => {
    let resolveRefresh!: () => void;
    const refreshDeferred = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    (refreshAccessToken as jest.Mock).mockReturnValueOnce(
      refreshDeferred.then(() => tokenData),
    );

    // First two fetch calls return 401; subsequent calls return 200.
    let callCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      callCount++;
      return Promise.resolve(callCount <= 2 ? err(401, "Unauthorized") : ok());
    });

    const p1 = makeClient();
    // Share the same client instance so refreshPromise is shared.
    const client = makeClient();
    const r1 = client.apiRequest("/a");
    const r2 = client.apiRequest("/b");

    // Drain microtasks until both requests are awaiting the refresh.
    for (let i = 0; i < 20; i++) await Promise.resolve();

    resolveRefresh();

    const [res1, res2] = await Promise.all([r1, r2]);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);

    void p1; // silence unused-variable warning
  });
});
