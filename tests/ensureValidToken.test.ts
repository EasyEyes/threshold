import { ensureValidToken } from "../preprocess/auth/ensureValidToken";
import { GitLabOAuthClient } from "../preprocess/auth/gitlabOAuthClient";

jest.mock("../preprocess/auth/config", () => ({
  getAuthConfig: () => ({
    clientId: "test-client",
    redirectUri: "http://localhost/callback",
    scopes: ["api"],
    baseUrl: "https://gitlab.example.com",
  }),
}));

jest.mock("../preprocess/auth/gitlabOAuthClient", () => ({
  GitLabOAuthClient: {
    loadFromStorage: jest.fn(),
  },
}));

const mockLoadFromStorage = GitLabOAuthClient.loadFromStorage as jest.Mock;

function makeClient(resolves = true) {
  return {
    ensureValidToken: jest
      .fn()
      .mockImplementation(() =>
        resolves ? Promise.resolve() : Promise.reject(new Error("AUTH_TOKEN_REFRESH_FAILED")),
      ),
  } as unknown as GitLabOAuthClient;
}

beforeEach(() => jest.clearAllMocks());

// ─── Cycle 1: fresh token ─────────────────────────────────────────────────────

describe("ensureValidToken gate — fresh token", () => {
  it("returns true and does not call onAuthFailure when token is valid", async () => {
    const client = makeClient(true);
    mockLoadFromStorage.mockReturnValue(client);
    const onAuthFailure = jest.fn();

    const result = await ensureValidToken(onAuthFailure);

    expect(result).toBe(true);
    expect(onAuthFailure).not.toHaveBeenCalled();
    expect((client.ensureValidToken as jest.Mock)).toHaveBeenCalledTimes(1);
  });
});

// ─── Cycle 2: no stored session ───────────────────────────────────────────────

describe("ensureValidToken gate — no stored session", () => {
  it("calls onAuthFailure and returns false when loadFromStorage returns null", async () => {
    mockLoadFromStorage.mockReturnValue(null);
    const onAuthFailure = jest.fn();

    const result = await ensureValidToken(onAuthFailure);

    expect(result).toBe(false);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });
});

// ─── Cycle 3: unrecoverable session ───────────────────────────────────────────

describe("ensureValidToken gate — unrecoverable session", () => {
  it("calls onAuthFailure and returns false when refresh token is also expired", async () => {
    const client = makeClient(false); // ensureValidToken throws
    mockLoadFromStorage.mockReturnValue(client);
    const onAuthFailure = jest.fn();

    const result = await ensureValidToken(onAuthFailure);

    expect(result).toBe(false);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
    expect((client.ensureValidToken as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  it("calls onAuthFailure exactly once even if the client throws AUTH_TOKEN_EXPIRED_NO_REFRESH", async () => {
    const client = {
      ensureValidToken: jest.fn().mockRejectedValue(new Error("AUTH_TOKEN_EXPIRED_NO_REFRESH")),
    } as unknown as GitLabOAuthClient;
    mockLoadFromStorage.mockReturnValue(client);
    const onAuthFailure = jest.fn();

    const result = await ensureValidToken(onAuthFailure);

    expect(result).toBe(false);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });
});
