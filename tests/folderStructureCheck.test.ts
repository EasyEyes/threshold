import { getImpulseResponseFiles } from "../preprocess/folderStructureCheck";
import { GitLabOAuthClient } from "../preprocess/auth/gitlabOAuthClient";
import { refreshAccessToken } from "../preprocess/pkceUtils";

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock("../preprocess/retry", () => ({
  getRetryDelayMs: jest.fn(() => 0),
  wait: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../preprocess/pkceUtils", () => ({
  refreshAccessToken: jest.fn(),
}));

jest.mock("../preprocess/auth/storage", () => ({
  saveTokensToStorage: jest.fn(),
  loadTokensFromStorage: jest.fn(),
  clearTokensFromStorage: jest.fn(),
}));

jest.mock("../preprocess/user", () => ({
  getUserInfo: jest.fn().mockResolvedValue([
    {
      projectList: Promise.resolve([
        { id: "777", name: "EasyEyesResources" },
      ]),
    },
    {},
  ]),
}));

jest.mock("../preprocess/gitlabUtils", () => ({
  getProjectByNameInProjectList: jest.fn((_list: any[], _name: string) => ({
    id: "777",
  })),
}));

jest.mock("../preprocess/global", () => ({
  tempAccessToken: { t: "test-token" },
}));

jest.mock("../preprocess/auth/config", () => ({
  getAuthConfig: jest.fn(() => ({
    clientId: "test-client",
    redirectUri: "http://localhost/callback",
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeClient(): GitLabOAuthClient {
  return new GitLabOAuthClient({
    clientId: "test-client",
    redirectUri: "http://localhost/callback",
    accessToken: "test-token",
    refreshToken: null,
    expiresAt: Date.now() + 3_600_000,
    baseUrl: "https://gitlab.example.com",
  });
}

function makeFileResponse(content: string): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers(),
    text: () => Promise.resolve(JSON.stringify({ content })),
    json: () => Promise.resolve({ content }),
  } as unknown as Response;
}

function makeErrResponse(status: number): Response {
  return {
    ok: false,
    status,
    statusText: "Internal Server Error",
    headers: new Headers(),
    text: () => Promise.resolve(""),
  } as unknown as Response;
}

// ── Test 5 ────────────────────────────────────────────────────────────────────

describe("getImpulseResponseFiles", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("calls client.apiRequest once per filename instead of raw fetch", async () => {
    const content = Buffer.from("audio-data").toString("base64");
    (global.fetch as jest.Mock).mockResolvedValue(makeFileResponse(content));

    const client = makeClient();
    const apiRequestSpy = jest.spyOn(client, "apiRequest");

    await getImpulseResponseFiles(["ir1.wav", "ir2.wav"], client);

    expect(apiRequestSpy).toHaveBeenCalledTimes(2);
    expect(apiRequestSpy).toHaveBeenCalledWith(expect.stringContaining("ir1"));
    expect(apiRequestSpy).toHaveBeenCalledWith(expect.stringContaining("ir2"));
  });

  it("retries automatically on a transient 500 and eventually resolves", async () => {
    const content = Buffer.from("audio-data").toString("base64");
    // fetch returns 500 on first call, then 200
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(makeErrResponse(500))
      .mockResolvedValue(makeFileResponse(content));

    const client = makeClient();
    const result = await getImpulseResponseFiles(["ir1.wav"], client);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("ir1.wav");
    expect(global.fetch).toHaveBeenCalledTimes(2); // 1 failed + 1 successful retry
  });
});
