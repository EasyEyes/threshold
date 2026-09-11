import { _retryablePavloviaPost } from "../psychojs/src/core/retryablePavloviaPost";

jest.mock("../preprocess/retry", () => ({
  // Keep the real observer registry (setRetryObserver/notifyRetryAttempt) so
  // the loop's notifications reach subscribers; mock only timing.
  ...jest.requireActual("../preprocess/retry"),
  getRetryDelayMs: jest.fn(() => 0),
  wait: jest.fn().mockResolvedValue(undefined),
  waitForRetryDelay: jest.fn().mockResolvedValue(undefined),
}));

const ok = (status = 200) => ({
  status,
  statusText: "OK",
  ok: true,
  headers: new Headers(),
});
const err = (
  status: number,
  statusText = "Server Error",
  extraHeaders: Record<string, string> = {},
) => ({
  status,
  statusText,
  ok: false,
  headers: new Headers(extraHeaders),
});

beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── transient-failure retries ────────────────────────────────────────────────

describe("_retryablePavloviaPost — transient retry", () => {
  it("resolves after two 503s then a 200", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(503))
      .mockResolvedValueOnce(err(503))
      .mockResolvedValueOnce(ok());

    const response = await _retryablePavloviaPost(
      "https://pavlovia.org/api/v2/data",
      {
        key: "value",
      },
    );

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("resolves after one 502, one 503, one 504 then a 200", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(502))
      .mockResolvedValueOnce(err(503))
      .mockResolvedValueOnce(err(504))
      .mockResolvedValueOnce(ok());

    const response = await _retryablePavloviaPost(
      "https://pavlovia.org/api/v2/data",
      {},
    );

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it("retries 429 the same as 5xx", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(429, "Too Many Requests"))
      .mockResolvedValueOnce(ok());

    const response = await _retryablePavloviaPost(
      "https://pavlovia.org/api/v2/data",
      {},
    );

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

// ─── hard-stop errors ─────────────────────────────────────────────────────────

describe("_retryablePavloviaPost — hard-stop errors", () => {
  it.each([400, 403, 409, 501])(
    "%i throws immediately without retrying",
    async (status) => {
      (global.fetch as jest.Mock).mockResolvedValue(
        err(status, "Client Error"),
      );

      await expect(
        _retryablePavloviaPost("https://pavlovia.org/api/v2/data", {}),
      ).rejects.toMatchObject({ status });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    },
  );
});

// ─── Retry-After ──────────────────────────────────────────────────────────────

describe("_retryablePavloviaPost — Retry-After", () => {
  it("uses server-specified delay instead of exponential backoff on 429", async () => {
    const { waitForRetryDelay } = require("../preprocess/retry");
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        err(429, "Too Many Requests", { "Retry-After": "5" }),
      )
      .mockResolvedValueOnce(ok());

    await _retryablePavloviaPost("https://pavlovia.org/api/v2/data", {});

    expect(waitForRetryDelay).toHaveBeenCalledWith(5000);
  });

  it("uses server-specified delay on 503 with Retry-After header", async () => {
    const { waitForRetryDelay } = require("../preprocess/retry");
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        err(503, "Service Unavailable", { "Retry-After": "10" }),
      )
      .mockResolvedValueOnce(ok());

    await _retryablePavloviaPost("https://pavlovia.org/api/v2/data", {});

    expect(waitForRetryDelay).toHaveBeenCalledWith(10000);
  });
});

// ─── Network TypeError (status 0) ─────────────────────────────────────────────

describe("_retryablePavloviaPost — network TypeError", () => {
  it("retries on TypeError then resolves on 200", async () => {
    const networkErr = new TypeError("Failed to fetch");
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(networkErr)
      .mockRejectedValueOnce(networkErr)
      .mockResolvedValueOnce(ok());

    const response = await _retryablePavloviaPost(
      "https://pavlovia.org/api/v2/data",
      {},
    );

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});

// ─── console.warn ─────────────────────────────────────────────────────────────

describe("_retryablePavloviaPost — console.warn", () => {
  it("emits console.warn on each retry with status and delay", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(503))
      .mockResolvedValueOnce(err(503))
      .mockResolvedValueOnce(ok());

    await _retryablePavloviaPost("https://pavlovia.org/api/v2/data", {});

    expect(console.warn).toHaveBeenCalledTimes(2);
    const [firstCall] = (console.warn as jest.Mock).mock.calls;
    expect(firstCall[0]).toMatch(/503/);
  });

  it("emits console.warn on TypeError retry", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(ok());

    await _retryablePavloviaPost("https://pavlovia.org/api/v2/data", {});

    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});

// ─── AbortController timeout ─────────────────────────────────────────────────

describe("_retryablePavloviaPost — 15 s abort timeout", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("aborts a stalled fetch after 15 s and retries", async () => {
    let capturedSignal: AbortSignal | undefined;

    (global.fetch as jest.Mock)
      .mockImplementationOnce((_url: string, opts: RequestInit) => {
        capturedSignal = opts.signal as AbortSignal | undefined;
        return new Promise<Response>((_resolve, reject) => {
          if (capturedSignal) {
            capturedSignal.addEventListener("abort", () => {
              reject(
                new DOMException("The operation was aborted.", "AbortError"),
              );
            });
          }
        });
      })
      .mockResolvedValueOnce(ok());

    const promise = _retryablePavloviaPost(
      "https://pavlovia.org/api/v2/data",
      {},
    );
    await Promise.resolve();

    expect(capturedSignal).toBeInstanceOf(AbortSignal);

    await jest.advanceTimersByTimeAsync(15_000);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("passes AbortSignal to every fetch attempt", async () => {
    let capturedSignal: AbortSignal | undefined;

    (global.fetch as jest.Mock).mockImplementationOnce(
      (_url: string, opts: RequestInit) => {
        capturedSignal = opts.signal as AbortSignal | undefined;
        return Promise.resolve(ok());
      },
    );

    await _retryablePavloviaPost("https://pavlovia.org/api/v2/data", {});

    expect(capturedSignal).toBeInstanceOf(AbortSignal);
  });
});

// ─── (a) the backoff delay races network recovery ───────────────────────────
import { waitForRetryDelay, setRetryObserver } from "../preprocess/retry";

describe("_retryablePavloviaPost — waitForRetryDelay between attempts", () => {
  it("waits via waitForRetryDelay (not a blind sleep) after a retryable status", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(503))
      .mockResolvedValueOnce(ok());

    await _retryablePavloviaPost("https://pavlovia.org/api/v2/data", {});

    expect(waitForRetryDelay as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it("waits via waitForRetryDelay after a network TypeError", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(ok());

    await _retryablePavloviaPost("https://pavlovia.org/api/v2/data", {});

    expect(waitForRetryDelay as jest.Mock).toHaveBeenCalledTimes(1);
  });
});

// ─── (b) retry observer: the saving indicator shows a live attempt counter ──
describe("_retryablePavloviaPost — retry observer", () => {
  afterEach(() => setRetryObserver(null));

  it("notifies the observer with the attempt number on each retryable status", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(503))
      .mockResolvedValueOnce(err(504))
      .mockResolvedValueOnce(ok());
    const observer = jest.fn();
    setRetryObserver(observer);

    await _retryablePavloviaPost("https://pavlovia.org/api/v2/data", {});

    expect(observer).toHaveBeenCalledTimes(2);
    expect(observer).toHaveBeenNthCalledWith(1, 1, { status: 503 });
    expect(observer).toHaveBeenNthCalledWith(2, 2, { status: 504 });
  });

  it("notifies the observer on network errors too", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(ok());
    const observer = jest.fn();
    setRetryObserver(observer);

    await _retryablePavloviaPost("https://pavlovia.org/api/v2/data", {});

    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer).toHaveBeenCalledWith(1, {});
  });

  it("a null observer never breaks the retry loop", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(503))
      .mockResolvedValueOnce(ok());
    setRetryObserver(null);
    await expect(
      _retryablePavloviaPost("https://pavlovia.org/api/v2/data", {}),
    ).resolves.toBeDefined();
  });
});

// ─── transient 5xx/timeouts that were wrongly hard-stops ────────────────────
// Pavlovia (and proxies in front of it) emit these transiently; a single 500
// must not permanently kill a data upload (card 2NF8G0fD's whole purpose).
describe("_retryablePavloviaPost — 500 and 408 are transient", () => {
  it.each([500, 408])("%i retries and then succeeds", async (status) => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(status, "Transient"))
      .mockResolvedValueOnce(ok());

    const response = await _retryablePavloviaPost(
      "https://pavlovia.org/api/v2/data",
      {},
    );

    expect(response.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
