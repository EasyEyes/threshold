import { loadGlossary } from "../preprocess/glossary-loader";
import { wait, getRetryDelayMs } from "../preprocess/retry";

jest.mock("../preprocess/retry", () => ({
  wait: jest.fn().mockResolvedValue(undefined),
  getRetryDelayMs: jest.requireActual("../preprocess/retry").getRetryDelayMs,
}));

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
  (global as any).fetch = jest.fn().mockResolvedValue(makeJsonResponse(mockGlossaryData));
});

describe("loadGlossary — successful fetch", () => {
  it("resolves with GlossaryData on the first attempt", async () => {
    const result = await loadGlossary("/alice/myexp/");

    expect(result).toEqual(mockGlossaryData);
  });

  it("fetches from the correct Netlify URL using raw username and experimentName", async () => {
    await loadGlossary("/alice/myexp/");

    expect((global as any).fetch).toHaveBeenCalledWith(
      "/.netlify/functions/glossary?username=alice&experiment=myexp",
    );
  });
});

describe("loadGlossary — transient failure recovery", () => {
  it("retries on transient failure and resolves when fetch eventually succeeds", async () => {
    (global as any).fetch = jest
      .fn()
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
      .fn()
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
