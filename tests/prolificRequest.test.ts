jest.mock("../preprocess/retry", () => {
  const actual = jest.requireActual("../preprocess/retry");
  return {
    ...actual,
    waitForRetryDelay: jest.fn().mockResolvedValue(undefined),
  };
});

import { prolificRequest } from "../preprocess/prolificRequest";
import { waitForRetryDelay } from "../preprocess/retry";

const response = (status: number, retryAfter?: string) =>
  new Response(null, {
    status,
    headers: retryAfter ? { "Retry-After": retryAfter } : {},
  });

beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
});

describe("prolificRequest", () => {
  it("honors the exact Retry-After delay for a GET 429", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(response(429, "5"))
      .mockResolvedValueOnce(response(200));

    await prolificRequest("/participant-groups");

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(waitForRetryDelay).toHaveBeenCalledWith(5000);
  });

  it("uses Prolific's 1 s doubling backoff and jitter without a header", async () => {
    const random = jest.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(response(500))
        .mockResolvedValueOnce(response(500))
        .mockResolvedValueOnce(response(200));

      await prolificRequest("/users/me");

      expect(waitForRetryDelay).toHaveBeenNthCalledWith(1, 1000);
      expect(waitForRetryDelay).toHaveBeenNthCalledWith(2, 2000);
    } finally {
      random.mockRestore();
    }
  });

  it("stops after six GET attempts and returns the last response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response(429));

    const result = await prolificRequest("/participant-groups");

    expect(result.status).toBe(429);
    expect(global.fetch).toHaveBeenCalledTimes(6);
    expect(waitForRetryDelay).toHaveBeenCalledTimes(5);
  });

  it("applies the ±20% jitter to the backoff delays", async () => {
    const random = jest.spyOn(Math, "random").mockReturnValue(0);
    try {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(response(500))
        .mockResolvedValueOnce(response(500))
        .mockResolvedValueOnce(response(200));

      await prolificRequest("/users/me");

      expect(waitForRetryDelay).toHaveBeenNthCalledWith(1, 800);
      expect(waitForRetryDelay).toHaveBeenNthCalledWith(2, 1600);
    } finally {
      random.mockRestore();
    }
  });

  it("does not automatically retry a POST, even on 429", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response(429));

    const result = await prolificRequest("/studies", { method: "POST" });

    expect(result.status).toBe(429);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(waitForRetryDelay).not.toHaveBeenCalled();
  });

  it("retries a GET network failure and then succeeds", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(response(200));

    const result = await prolificRequest("/users/me");

    expect(result.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const delay = (waitForRetryDelay as jest.Mock).mock.calls[0][0];
    expect(delay).toBeGreaterThanOrEqual(800);
    expect(delay).toBeLessThanOrEqual(1200);
  });

  it("does not retry a programming or response-processing exception", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new ReferenceError("Response is not defined"),
    );

    await expect(prolificRequest("/users/me")).rejects.toThrow(
      "Response is not defined",
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(waitForRetryDelay).not.toHaveBeenCalled();
  });

  it("does not retry caller cancellation", async () => {
    const controller = new AbortController();
    (global.fetch as jest.Mock)
      .mockImplementationOnce((_url, options: RequestInit) => {
        const signal = options.signal as AbortSignal;
        return new Promise<Response>((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("Cancelled", "AbortError")),
          );
        });
      })
      .mockResolvedValueOnce(response(200));

    const promise = prolificRequest("/users/me", {
      signal: controller.signal,
    });
    await Promise.resolve();
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(waitForRetryDelay).not.toHaveBeenCalled();
  });
});
