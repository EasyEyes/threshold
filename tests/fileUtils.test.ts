import {
  getTextFileDataFromGitLab,
  getBase64FileDataFromGitLab,
} from "../preprocess/fileUtils";
import type { GitLabOAuthClient } from "../preprocess/auth/gitlabOAuthClient";

function mockClient(
  apiRequest: jest.Mock,
): Pick<GitLabOAuthClient, "apiRequest"> {
  return { apiRequest };
}

function makeOkTextResponse(body: string): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Test 1: tracer bullet ─────────────────────────────────────────────────────

describe("getTextFileDataFromGitLab", () => {
  it("calls client.apiRequest instead of global fetch", async () => {
    const encoded = Buffer.from("hello").toString("base64");
    const apiRequest = jest.fn().mockResolvedValue(
      makeOkTextResponse(JSON.stringify({ content: encoded })),
    );
    const client = mockClient(apiRequest);

    await getTextFileDataFromGitLab(
      123,
      "path/to/file.txt",
      client as unknown as GitLabOAuthClient,
    );

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns base64-decoded UTF-8 text from response", async () => {
    const original = "experiment text content\nnewline here";
    const encoded = Buffer.from(original, "utf8").toString("base64");
    const apiRequest = jest.fn().mockResolvedValue(
      makeOkTextResponse(JSON.stringify({ content: encoded })),
    );

    const result = await getTextFileDataFromGitLab(
      42,
      "resources/text.txt",
      mockClient(apiRequest) as unknown as GitLabOAuthClient,
    );

    expect(result).toBe(original);
  });
});

// ── Tests 3-4: getBase64FileDataFromGitLab ────────────────────────────────────

describe("getBase64FileDataFromGitLab", () => {
  it("calls client.apiRequest instead of global fetch", async () => {
    const apiRequest = jest.fn().mockResolvedValue(
      makeOkTextResponse(JSON.stringify({ content: "abc123==" })),
    );

    await getBase64FileDataFromGitLab(
      99,
      "sounds/beep.mp3",
      mockClient(apiRequest) as unknown as GitLabOAuthClient,
    );

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns raw base64 content from response", async () => {
    const rawBase64 = "SGVsbG8gV29ybGQ=";
    const apiRequest = jest.fn().mockResolvedValue(
      makeOkTextResponse(JSON.stringify({ content: rawBase64 })),
    );

    const result = await getBase64FileDataFromGitLab(
      99,
      "sounds/beep.mp3",
      mockClient(apiRequest) as unknown as GitLabOAuthClient,
    );

    expect(result).toBe(rawBase64);
  });
});
