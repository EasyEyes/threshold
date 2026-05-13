jest.mock("../preprocess/retry", () => ({
  getRetryDelayMs: jest.fn(() => 0),
  wait: jest.fn().mockResolvedValue(undefined),
}));

import { refreshAccessToken, exchangeCodeForToken } from "../preprocess/pkceUtils";

const tokenBody = {
  access_token: "new-token",
  token_type: "Bearer",
  expires_in: 3600,
  refresh_token: "new-refresh",
  created_at: 1_234_567_890,
};

function makeOkResponse(body: object = tokenBody) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

function makeErrorResponse(status: number, statusText = "Error") {
  return {
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve({ error: statusText }),
    text: () => Promise.resolve(`${status} ${statusText}`),
  };
}

beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
});

// ─── refreshAccessToken ───────────────────────────────────────────────────────

describe("refreshAccessToken — 5xx retry", () => {
  it("resolves after a 500 on the first attempt", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(makeErrorResponse(500, "Internal Server Error"))
      .mockResolvedValueOnce(makeOkResponse());

    const result = await refreshAccessToken(
      "refresh-token",
      "client-id",
      "http://localhost/callback",
    );

    expect(result.access_token).toBe("new-token");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe("refreshAccessToken — 4xx hard-stop", () => {
  it("throws immediately on a 400 without retrying", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      makeErrorResponse(400, "Bad Request"),
    );

    await expect(
      refreshAccessToken("bad-token", "client-id", "http://localhost/callback"),
    ).rejects.toThrow("Token refresh failed: 400");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("refreshAccessToken — TypeError retry", () => {
  it("resolves after a TypeError on the first attempt", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(makeOkResponse());

    const result = await refreshAccessToken(
      "refresh-token",
      "client-id",
      "http://localhost/callback",
    );

    expect(result.access_token).toBe("new-token");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

// ─── exchangeCodeForToken ─────────────────────────────────────────────────────

describe("exchangeCodeForToken — 5xx retry", () => {
  it("resolves after a 503 on the first attempt", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(makeErrorResponse(503, "Service Unavailable"))
      .mockResolvedValueOnce(makeOkResponse());

    const result = await exchangeCodeForToken(
      "auth-code",
      "code-verifier",
      "http://localhost/callback",
      "client-id",
    );

    expect(result.access_token).toBe("new-token");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe("exchangeCodeForToken — 4xx hard-stop", () => {
  it("throws immediately on a 401 without retrying", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      makeErrorResponse(401, "Unauthorized"),
    );

    await expect(
      exchangeCodeForToken(
        "bad-code",
        "code-verifier",
        "http://localhost/callback",
        "client-id",
      ),
    ).rejects.toThrow("Token exchange failed: 401");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("exchangeCodeForToken — TypeError retry", () => {
  it("resolves after a TypeError on the first attempt", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(makeOkResponse());

    const result = await exchangeCodeForToken(
      "auth-code",
      "code-verifier",
      "http://localhost/callback",
      "client-id",
    );

    expect(result.access_token).toBe("new-token");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
