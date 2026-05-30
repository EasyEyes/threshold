/**
 * @jest-environment jsdom
 */
import { jest, beforeEach, describe, it, expect } from "@jest/globals";

// Import actual retry BEFORE the mock is registered so we can reuse getRetryDelayMs.
const actualRetry = await import("../preprocess/retry");

await jest.unstable_mockModule("../preprocess/retry", () => ({
  wait: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getRetryDelayMs: actualRetry.getRetryDelayMs,
}));

// These imports resolve to the mocked versions.
const { loadGlossary } = await import("../preprocess/glossary-loader");
const { wait, getRetryDelayMs } = await import("../preprocess/retry");

const mockGlossaryData = {
  version: "1.0",
  glossary: {},
  glossaryFull: [],
  superMatchingParams: [],
};

function makeJsonResponse(data: unknown) {
  return { json: () => Promise.resolve(data) };
}

beforeEach(() => {
  jest.clearAllMocks();
  (global as any).fetch = jest
    .fn<() => Promise<ReturnType<typeof makeJsonResponse>>>()
    .mockResolvedValue(makeJsonResponse(mockGlossaryData));
});

describe("loadGlossary — successful fetch", () => {
  it("resolves with GlossaryData on the first attempt", async () => {
    const result = await loadGlossary("/alice/myexp/");

    expect(result).toEqual(mockGlossaryData);
  });

  it("fetches from the correct Netlify URL using raw username and experimentName", async () => {
    await loadGlossary("/alice/myexp/");

    // On localhost, getEasyEyesBaseUrl() returns "" so the URL is relative;
    // Vite's dev server proxies /.netlify/functions/* to a Netlify backend.
    expect((global as any).fetch).toHaveBeenCalledWith(
      "/.netlify/functions/glossary?username=alice&experiment=myexp",
    );
  });
});

describe("loadGlossary — transient failure recovery", () => {
  it("retries on transient failure and resolves when fetch eventually succeeds", async () => {
    (global as any).fetch = jest
      .fn<() => Promise<ReturnType<typeof makeJsonResponse>>>()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(makeJsonResponse(mockGlossaryData));

    const result = await loadGlossary("/alice/myexp/");

    expect((global as any).fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual(mockGlossaryData);
  });
});

describe("loadGlossary — backoff delay", () => {
  it("calls wait with getRetryDelayMs(attempt) after each failed attempt", async () => {
    (global as any).fetch = jest
      .fn<() => Promise<ReturnType<typeof makeJsonResponse>>>()
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce(makeJsonResponse(mockGlossaryData));

    await loadGlossary("/alice/myexp/");

    const mockWait = wait as jest.Mock;
    expect(mockWait).toHaveBeenCalledTimes(2);
    expect(mockWait).toHaveBeenNthCalledWith(1, getRetryDelayMs(0));
    expect(mockWait).toHaveBeenNthCalledWith(2, getRetryDelayMs(1));
  });
});

describe("glossaryData export — top-level await", () => {
  it("exports glossaryData resolved from loadGlossary(window.location.pathname)", async () => {
    (global as any).fetch = jest
      .fn<() => Promise<ReturnType<typeof makeJsonResponse>>>()
      .mockResolvedValue(makeJsonResponse(mockGlossaryData));
    window.history.pushState({}, "", "/alice/myexp/");

    let glossaryData: unknown;
    await jest.isolateModulesAsync(async () => {
      const retryActual = await import("../preprocess/retry");
      await jest.unstable_mockModule("../preprocess/retry", () => ({
        wait: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        getRetryDelayMs: retryActual.getRetryDelayMs,
      }));
      const mod = await import("../preprocess/glossary-loader");
      glossaryData = mod.glossaryData;
    });

    expect(glossaryData).toEqual(mockGlossaryData);
    expect((global as any).fetch).toHaveBeenCalledWith(
      "/.netlify/functions/glossary?username=alice&experiment=myexp",
    );
  });
});
