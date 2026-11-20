import { GitLabOAuthClient } from "../preprocess/auth/gitlabOAuthClient";
import { refreshAccessToken } from "../preprocess/pkceUtils";

jest.mock("../preprocess/retry", () => {
  const actual = jest.requireActual("../preprocess/retry");
  return {
    ...actual,
    getRetryDelayMs: jest.fn(() => 0),
    wait: jest.fn().mockResolvedValue(undefined),
    waitForRetryDelay: jest.fn().mockResolvedValue(undefined),
    BASE_DELAY_SEC: 0.2,
    MAX_DELAY_SEC: 5,
  };
});

jest.mock("../preprocess/pkceUtils", () => ({
  refreshAccessToken: jest.fn(),
}));

jest.mock("../preprocess/auth/storage", () => ({
  saveTokensToStorage: jest.fn(),
  loadTokensFromStorage: jest.fn(),
  clearTokensFromStorage: jest.fn(),
}));

const ok = (status = 200) => ({
  status,
  statusText: "OK",
  ok: true,
  headers: new Headers(),
});
const err = (
  status: number,
  statusText = "Internal Server Error",
  extraHeaders: Record<string, string> = {},
) => ({
  status,
  statusText,
  ok: false,
  headers: new Headers(extraHeaders),
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

  it("resolves after five 500s then a 200", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(500))
      .mockResolvedValueOnce(err(500))
      .mockResolvedValueOnce(err(500))
      .mockResolvedValueOnce(err(500))
      .mockResolvedValueOnce(err(500))
      .mockResolvedValueOnce(ok());

    const response = await makeClient().apiRequest("/user");

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(6);
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

  it("resolves after five TypeErrors then a 200", async () => {
    const networkErr = new TypeError("Failed to fetch");
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(networkErr)
      .mockRejectedValueOnce(networkErr)
      .mockRejectedValueOnce(networkErr)
      .mockRejectedValueOnce(networkErr)
      .mockRejectedValueOnce(networkErr)
      .mockResolvedValueOnce(ok());

    const response = await makeClient().apiRequest("/user");

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(6);
  });

  it("stops after six failed fetches rather than retrying forever", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(500))
      .mockResolvedValueOnce(err(500))
      .mockResolvedValueOnce(err(500))
      .mockResolvedValueOnce(err(500))
      .mockResolvedValueOnce(err(500))
      .mockResolvedValueOnce(err(500))
      .mockResolvedValueOnce(ok());

    await expect(makeClient().apiRequest("/user")).rejects.toMatchObject({
      status: 500,
    });
    expect(global.fetch).toHaveBeenCalledTimes(6);
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

// ─── hard-stop errors ─────────────────────────────────────────────────────────

describe("apiRequest — hard-stop errors", () => {
  it.each([403, 404, 409, 422])(
    "%i throws immediately without retrying",
    async (status) => {
      (global.fetch as jest.Mock).mockResolvedValue(
        err(status, "Client Error"),
      );

      await expect(makeClient().apiRequest("/user")).rejects.toMatchObject({
        status,
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    },
  );

  it("unlisted 4xx (e.g. 400) throws immediately without retrying", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(err(400, "Bad Request"));

    await expect(makeClient().apiRequest("/user")).rejects.toMatchObject({
      status: 400,
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("allowlists the GitLab error message for diagnostics", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ message: "404 Tree Not Found" }), {
        status: 404,
        statusText: "Not Found",
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      makeClient().apiRequest("/projects/533619/repository/tree"),
    ).rejects.toMatchObject({
      status: 404,
      responseMessage: "404 Tree Not Found",
      endpoint: "/projects/533619/repository/tree",
      method: "GET",
    });
  });
});

// ─── expectedStatuses ─────────────────────────────────────────────────────────

describe("apiRequest — expectedStatuses", () => {
  it("returns a 404 response instead of throwing when 404 is expected", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(err(404, "Not Found"));

    const response = await makeClient().apiRequest("/file", {
      expectedStatuses: [404],
    });

    expect(response.status).toBe(404);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// ─── Retry-After ──────────────────────────────────────────────────────────────

describe("apiRequest — Retry-After", () => {
  it("uses server-specified delay instead of exponential backoff on 429", async () => {
    const { waitForRetryDelay: wait } = require("../preprocess/retry");
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        err(429, "Too Many Requests", { "Retry-After": "5" }),
      )
      .mockResolvedValueOnce(ok());

    await makeClient().apiRequest("/user");

    expect(wait).toHaveBeenCalledWith(5000);
  });

  it("honors an HTTP-date Retry-After value", async () => {
    const { waitForRetryDelay: wait } = require("../preprocess/retry");
    const now = Date.parse("2026-01-01T00:00:00Z");
    const dateNow = jest.spyOn(Date, "now").mockReturnValue(now);
    try {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(
          err(429, "Too Many Requests", {
            "Retry-After": new Date(now + 5000).toUTCString(),
          }),
        )
        .mockResolvedValueOnce(ok());

      await makeClient().apiRequest("/user");

      expect(wait).toHaveBeenCalledWith(5000);
    } finally {
      dateNow.mockRestore();
    }
  });

  it("falls back to backoff for an invalid Retry-After value", async () => {
    const { waitForRetryDelay: wait } = require("../preprocess/retry");
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        err(429, "Too Many Requests", { "Retry-After": "not-a-date" }),
      )
      .mockResolvedValueOnce(ok());

    const response = await makeClient().apiRequest("/user");

    expect(response.status).toBe(200);
    expect(wait).toHaveBeenCalledWith(0);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not wait past the 30 s request budget for Retry-After", async () => {
    const { waitForRetryDelay: wait } = require("../preprocess/retry");
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        err(429, "Too Many Requests", { "Retry-After": "31" }),
      )
      .mockResolvedValueOnce(ok());

    await expect(makeClient().apiRequest("/user")).rejects.toMatchObject({
      status: 429,
    });
    expect(wait).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);
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

  it("counts time spent refreshing the token against the 30 s budget", async () => {
    jest.useFakeTimers();
    try {
      (refreshAccessToken as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 25_000, tokenData)),
      );
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(err(401, "Unauthorized"))
        .mockImplementationOnce(
          (_url: string, opts: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
              opts.signal!.addEventListener("abort", () =>
                reject(new DOMException("Aborted", "AbortError")),
              );
            }),
        );

      const rejection = expect(
        makeClient().apiRequest("/user"),
      ).rejects.toMatchObject({ name: "AbortError" });
      await jest.advanceTimersByTimeAsync(30_000);
      await rejection;
      expect(global.fetch).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
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

  it.each([429, 500])(
    "retries a transient %i returned after token refresh",
    async (status) => {
      (refreshAccessToken as jest.Mock).mockResolvedValue(tokenData);
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(err(401, "Unauthorized"))
        .mockResolvedValueOnce(err(status, "Transient"))
        .mockResolvedValueOnce(ok());

      const response = await makeClient().apiRequest("/user");

      expect(response.status).toBe(200);
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    },
  );

  it("honors Retry-After when a 429 follows token refresh", async () => {
    const { waitForRetryDelay: wait } = require("../preprocess/retry");
    (refreshAccessToken as jest.Mock).mockResolvedValue(tokenData);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(401, "Unauthorized"))
      .mockResolvedValueOnce(
        err(429, "Too Many Requests", { "Retry-After": "5" }),
      )
      .mockResolvedValueOnce(ok());

    await makeClient().apiRequest("/user");

    expect(wait).toHaveBeenCalledWith(5000);
  });

  it("retries a network TypeError returned after token refresh", async () => {
    (refreshAccessToken as jest.Mock).mockResolvedValue(tokenData);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(401, "Unauthorized"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(ok());

    const response = await makeClient().apiRequest("/user");

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("returns an expectedStatus response obtained after token refresh", async () => {
    (refreshAccessToken as jest.Mock).mockResolvedValue(tokenData);
    const conflict = err(409, "Conflict");
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(401, "Unauthorized"))
      .mockResolvedValueOnce(conflict);

    const response = await makeClient().apiRequest("/projects", {
      method: "POST",
      expectedStatuses: [409],
    });

    expect(response).toBe(conflict);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("refreshes once when a 429 precedes the 401, then succeeds", async () => {
    (refreshAccessToken as jest.Mock).mockResolvedValue(tokenData);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        err(429, "Too Many Requests", { "Retry-After": "1" }),
      )
      .mockResolvedValueOnce(err(401, "Unauthorized"))
      .mockResolvedValueOnce(ok());

    const response = await makeClient().apiRequest("/user");

    expect(response.status).toBe(200);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("bounds persistent post-refresh failures and refreshes only once", async () => {
    (refreshAccessToken as jest.Mock).mockResolvedValue(tokenData);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(401, "Unauthorized"))
      .mockResolvedValueOnce(err(429, "Too Many Requests"))
      .mockResolvedValueOnce(err(429, "Too Many Requests"))
      .mockResolvedValueOnce(err(429, "Too Many Requests"))
      .mockResolvedValueOnce(err(429, "Too Many Requests"))
      .mockResolvedValueOnce(err(429, "Too Many Requests"))
      .mockResolvedValueOnce(ok());

    await expect(makeClient().apiRequest("/user")).rejects.toMatchObject({
      status: 429,
    });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(6);
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

// ─── GET timeout (AbortController) ───────────────────────────────────────────

describe("apiRequest — GET timeout", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("aborts a stalled GET fetch after 15 s and retries", async () => {
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
          // Without a signal the promise never settles — test hangs past this point
        });
      })
      .mockResolvedValueOnce(ok());

    const promise = makeClient().apiRequest("/user");
    await Promise.resolve(); // let ensureValidToken resolve and fetch be called

    expect(capturedSignal).toBeInstanceOf(AbortSignal); // RED without implementation

    await jest.advanceTimersByTimeAsync(15_000);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("AbortError calls getRetryDelayMs with the attempt counter", async () => {
    const { getRetryDelayMs: mockGetRetryDelayMs } =
      require("../preprocess/retry") as { getRetryDelayMs: jest.Mock };

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

    const promise = makeClient().apiRequest("/user");
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(15_000);
    await promise;

    expect(mockGetRetryDelayMs).toHaveBeenCalledWith(0);
  });

  it("aborts a stalled post-refresh GET with a fresh timeout and retries", async () => {
    let refreshReturned!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      refreshReturned = resolve;
    });
    (refreshAccessToken as jest.Mock).mockReturnValueOnce(
      refreshGate.then(() => tokenData),
    );

    let stalledSignal: AbortSignal | undefined;
    let retriedSignal: AbortSignal | undefined;
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(401, "Unauthorized"))
      .mockImplementationOnce((_url: string, opts: RequestInit) => {
        stalledSignal = opts.signal as AbortSignal;
        return new Promise<Response>((_resolve, reject) => {
          stalledSignal!.addEventListener("abort", () =>
            reject(
              new DOMException("The operation was aborted.", "AbortError"),
            ),
          );
        });
      })
      .mockImplementationOnce((_url: string, opts: RequestInit) => {
        retriedSignal = opts.signal as AbortSignal;
        return Promise.resolve(ok());
      });

    const promise = makeClient().apiRequest("/user");
    await jest.advanceTimersByTimeAsync(0); // first fetch issued, 401 back
    refreshReturned();
    await jest.advanceTimersByTimeAsync(0); // refresh settles; loop re-enters
    // The post-refresh fetch must carry its OWN 15 s timer, not the one
    // armed before the refresh.
    await jest.advanceTimersByTimeAsync(15_000);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(retriedSignal).toBeInstanceOf(AbortSignal);
    expect(stalledSignal).not.toBe(retriedSignal);
  });

  it("carries an AbortSignal on the GET fetch that follows a 401 refresh", async () => {
    let secondFetchSignal: AbortSignal | undefined | null = null;

    (refreshAccessToken as jest.Mock).mockResolvedValue(tokenData);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(err(401, "Unauthorized"))
      .mockImplementationOnce((_url: string, opts: RequestInit) => {
        secondFetchSignal = opts.signal as AbortSignal | undefined;
        return Promise.resolve(ok());
      });

    await makeClient().apiRequest("/user");

    expect(secondFetchSignal).toBeInstanceOf(AbortSignal);
  });

  it("timer is cleared after a successful fetch so it cannot fire in a later iteration", async () => {
    // First GET succeeds immediately; second GET stalls until we advance to 15 s.
    // If the first request's timer were not cleared it would also fire at t=15 s,
    // but that abort would target a completed controller and have no observable effect.
    // What we actually verify: the second request's stall is correctly aborted at 15 s
    // and the overall call still resolves — proving each iteration gets a fresh timer.
    let capturedSignal2: AbortSignal | undefined;

    const client = makeClient();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(ok()) // first request: instant success
      .mockImplementationOnce((_url: string, opts: RequestInit) => {
        capturedSignal2 = opts.signal as AbortSignal | undefined;
        return new Promise<Response>((_resolve, reject) => {
          if (capturedSignal2) {
            capturedSignal2.addEventListener("abort", () => {
              reject(
                new DOMException("The operation was aborted.", "AbortError"),
              );
            });
          }
        });
      })
      .mockResolvedValueOnce(ok()); // retry after abort

    await client.apiRequest("/first");

    const promise2 = client.apiRequest("/second");
    await Promise.resolve();

    expect(capturedSignal2).toBeInstanceOf(AbortSignal);

    await jest.advanceTimersByTimeAsync(15_000);
    const response = await promise2;

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3); // first + stall + retry
  });

  it("POST fetch receives no AbortSignal", async () => {
    let capturedSignal: AbortSignal | undefined | null = null; // null = not captured
    (global.fetch as jest.Mock).mockImplementationOnce(
      (_url: string, opts: RequestInit) => {
        capturedSignal = opts.signal as AbortSignal | undefined;
        return Promise.resolve(ok());
      },
    );

    await makeClient().apiRequest("/resource", { method: "POST" });

    expect(capturedSignal).toBeUndefined();
  });

  it("enforces the 30 s total budget across stalled GET retries", async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce((_url: string, opts: RequestInit) => {
        const signal = opts.signal as AbortSignal;
        return new Promise<Response>((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
      })
      .mockImplementationOnce((_url: string, opts: RequestInit) => {
        const signal = opts.signal as AbortSignal;
        return new Promise<Response>((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
      })
      .mockResolvedValueOnce(ok());

    const promise = makeClient().apiRequest("/user");
    const rejection = expect(promise).rejects.toMatchObject({
      name: "AbortError",
    });
    await jest.advanceTimersByTimeAsync(30_000);
    await rejection;
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it.each(["GET", "POST"])(
    "does not retry a caller-cancelled %s request",
    async (method) => {
      const controller = new AbortController();
      (global.fetch as jest.Mock)
        .mockImplementationOnce((_url: string, opts: RequestInit) => {
          const signal = opts.signal as AbortSignal;
          return new Promise<Response>((_resolve, reject) => {
            signal.addEventListener("abort", () =>
              reject(new DOMException("Cancelled by caller", "AbortError")),
            );
          });
        })
        .mockResolvedValueOnce(ok());

      const promise = makeClient().apiRequest("/user", {
        method,
        signal: controller.signal,
      });
      const rejection = expect(promise).rejects.toMatchObject({
        name: "AbortError",
      });
      await Promise.resolve();
      controller.abort();
      await jest.advanceTimersByTimeAsync(15_000);
      await rejection;
      expect(global.fetch).toHaveBeenCalledTimes(1);
    },
  );

  it("stalling POST remains pending after 15 s — no retry", async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise<Response>(() => {
        /* stalls forever */
      }),
    );

    const pending = Symbol("pending");
    const promise = makeClient().apiRequest("/resource", { method: "POST" });

    await Promise.resolve(); // let fetch be called
    await jest.advanceTimersByTimeAsync(15_000);

    const result = await Promise.race([promise, Promise.resolve(pending)]);

    expect(result).toBe(pending);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("TypeError retry still works alongside GET timeout: retries with backoff and eventually succeeds", async () => {
    const networkErr = new TypeError("Failed to fetch");
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(networkErr)
      .mockResolvedValueOnce(ok());

    const response = await makeClient().apiRequest("/user");

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
