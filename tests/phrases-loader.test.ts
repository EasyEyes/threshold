/**
 * @jest-environment jsdom
 */
import { jest, beforeEach, describe, it, expect } from "@jest/globals";
import type { PhrasesData } from "../../source/components/types";

const mockPhrasesData: PhrasesData = {
  version: "1.0",
  phrases: { greeting: { en: "Hello", fr: "Bonjour" } },
};

type MockResponse = { status: number; ok: boolean; json: () => Promise<unknown> };

function makeOkResponse(data: unknown): MockResponse {
  return { status: 200, ok: true, json: () => Promise.resolve(data) };
}

function makeErrorResponse(status: number, data: unknown): MockResponse {
  return { status, ok: false, json: () => Promise.resolve(data) };
}

// Set global.fetch before importing phrases-loader so the module-level TLA resolves.
(global as any).fetch = jest
  .fn<() => Promise<MockResponse>>()
  .mockResolvedValue(makeOkResponse(mockPhrasesData));

const actualRetry = await import("../preprocess/retry");

await jest.unstable_mockModule("../preprocess/retry", () => ({
  wait: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getRetryDelayMs: actualRetry.getRetryDelayMs,
}));

await jest.unstable_mockModule("../parameters/phrasesRegistry", () => ({
  initPhrases: jest.fn<(data: PhrasesData) => void>(),
  getPhrases: jest.fn(),
  getPhrasesVersion: jest.fn(),
}));

await jest.unstable_mockModule("../components/easyeyesBaseUrl", () => ({
  getEasyEyesBaseUrl: jest.fn<() => Promise<string>>().mockResolvedValue(""),
}));

const { loadPhrases } = await import("../preprocess/phrases-loader");
const { wait, getRetryDelayMs } = await import("../preprocess/retry");
const { initPhrases } = await import("../parameters/phrasesRegistry");

beforeEach(() => {
  jest.clearAllMocks();
  (global as any).fetch = jest
    .fn<() => Promise<MockResponse>>()
    .mockResolvedValue(makeOkResponse(mockPhrasesData));
});

describe("loadPhrases — successful fetch", () => {
  it("resolves with PhrasesData on the first attempt", async () => {
    const result = await loadPhrases("/alice/myexp/");

    expect(result).toEqual(mockPhrasesData);
  });

  it("fetches from the correct Netlify URL using pinned param", async () => {
    await loadPhrases("/alice/myexp/");

    expect((global as any).fetch).toHaveBeenCalledWith(
      "/.netlify/functions/phrases?pinned=alice/myexp",
    );
  });

  it("calls initPhrases with the fetched data", async () => {
    await loadPhrases("/alice/myexp/");

    expect(initPhrases).toHaveBeenCalledWith(mockPhrasesData);
  });
});

describe("loadPhrases — transient failure recovery", () => {
  it("retries on network error and resolves when fetch eventually succeeds", async () => {
    (global as any).fetch = jest
      .fn<() => Promise<MockResponse>>()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(makeOkResponse(mockPhrasesData));

    const result = await loadPhrases("/alice/myexp/");

    expect((global as any).fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual(mockPhrasesData);
  });
});

describe("loadPhrases — backoff delay", () => {
  it("calls wait with getRetryDelayMs(attempt) after each failed attempt", async () => {
    (global as any).fetch = jest
      .fn<() => Promise<MockResponse>>()
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce(makeOkResponse(mockPhrasesData));

    await loadPhrases("/alice/myexp/");

    const mockWait = wait as jest.Mock;
    expect(mockWait).toHaveBeenCalledTimes(2);
    expect(mockWait).toHaveBeenNthCalledWith(1, getRetryDelayMs(0));
    expect(mockWait).toHaveBeenNthCalledWith(2, getRetryDelayMs(1));
  });
});

describe("loadPhrases — hard fail on missing pin", () => {
  it("throws immediately when endpoint returns 404 No pinned version", async () => {
    (global as any).fetch = jest
      .fn<() => Promise<MockResponse>>()
      .mockResolvedValue(makeErrorResponse(404, { error: "No pinned version" }));

    await expect(loadPhrases("/alice/myexp/")).rejects.toThrow(
      /no phrasesVersion pinned/i,
    );
  });

  it("does not retry on 404 No pinned version", async () => {
    (global as any).fetch = jest
      .fn<() => Promise<MockResponse>>()
      .mockResolvedValue(makeErrorResponse(404, { error: "No pinned version" }));

    await expect(loadPhrases("/alice/myexp/")).rejects.toThrow();
    expect((global as any).fetch).toHaveBeenCalledTimes(1);
  });
});

describe("phrasesData export — top-level await", () => {
  it("exports phrasesData resolved from loadPhrases(window.location.pathname)", async () => {
    (global as any).fetch = jest
      .fn<() => Promise<MockResponse>>()
      .mockResolvedValue(makeOkResponse(mockPhrasesData));
    window.history.pushState({}, "", "/alice/myexp/");

    let phrasesData: unknown;
    await jest.isolateModulesAsync(async () => {
      const retryActual = await import("../preprocess/retry");
      await jest.unstable_mockModule("../preprocess/retry", () => ({
        wait: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        getRetryDelayMs: retryActual.getRetryDelayMs,
      }));
      await jest.unstable_mockModule("../parameters/phrasesRegistry", () => ({
        initPhrases: jest.fn(),
        getPhrases: jest.fn(),
        getPhrasesVersion: jest.fn(),
      }));
      await jest.unstable_mockModule("../components/easyeyesBaseUrl", () => ({
        getEasyEyesBaseUrl: jest
          .fn<() => Promise<string>>()
          .mockResolvedValue(""),
      }));
      const mod = await import("../preprocess/phrases-loader");
      phrasesData = mod.phrasesData;
    });

    expect(phrasesData).toEqual(mockPhrasesData);
    expect((global as any).fetch).toHaveBeenCalledWith(
      "/.netlify/functions/phrases?pinned=alice/myexp",
    );
  });
});
