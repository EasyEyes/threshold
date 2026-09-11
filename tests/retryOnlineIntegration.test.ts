/**
 * Integration: the retry loop really does re-fetch immediately when the
 * network returns — real waitForRetryDelay, real loop, only fetch mocked.
 * This is the save path; a bug here costs sessions.
 */
import { jest, expect, describe, test, afterEach } from "@jest/globals";
import { _retryablePavloviaPost } from "../psychojs/src/core/retryablePavloviaPost";
import { waitForRetryDelay } from "../preprocess/retry";

describe("retry fires immediately on network return (integration)", () => {
  afterEach(() => {
    delete (globalThis as any).window;
    jest.restoreAllMocks();
  });

  const fakeWindow = () => {
    const onlineHandlers: (() => void)[] = [];
    const w = {
      addEventListener: jest.fn((_ev: string, fn: () => void) => {
        onlineHandlers.push(fn);
      }),
      removeEventListener: jest.fn((_ev: string, fn: () => void) => {
        const i = onlineHandlers.indexOf(fn);
        if (i >= 0) onlineHandlers.splice(i, 1);
      }),
      __fireOnline: () => onlineHandlers.forEach((f) => f()),
    };
    (globalThis as any).window = w;
    return w;
  };

  test("loop's SECOND fetch starts at network recovery, not after the backoff", async () => {
    const w = fakeWindow();
    let calls = 0;
    const t0 = Date.now();
    let secondFetchAt = 0;
    global.fetch = jest.fn(() => {
      calls++;
      if (calls === 1) return Promise.reject(new TypeError("fetch failed"));
      secondFetchAt = Date.now();
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: new Headers(),
      });
    }) as any;

    const saving = _retryablePavloviaPost(
      "https://pavlovia.org/api/v2/data",
      {},
    );
    // Let attempt 1 fail (~instant), then the wait begin (real backoff ~200 ms),
    // then the network returns at ~30 ms:
    await new Promise((r) => setTimeout(r, 30));
    w.__fireOnline();
    const response = await saving;

    expect(response.ok).toBe(true);
    // Recovery was detected long before the ~160-240 ms backoff elapsed.
    expect(secondFetchAt - t0).toBeLessThan(150);
    // And the wait cleaned up after itself.
    expect(w.removeEventListener).toHaveBeenCalledWith(
      "online",
      expect.any(Function),
    );
  });

  test("sequential waits each race online independently (two recoveries)", async () => {
    const w = fakeWindow();
    let calls = 0;
    global.fetch = jest.fn(() => {
      calls++;
      if (calls <= 2) return Promise.reject(new TypeError("fetch failed"));
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: new Headers(),
      });
    }) as any;

    const saving = _retryablePavloviaPost(
      "https://pavlovia.org/api/v2/data",
      {},
    );
    await new Promise((r) => setTimeout(r, 20));
    w.__fireOnline(); // recover attempt 1's wait
    await new Promise((r) => setTimeout(r, 20));
    w.__fireOnline(); // recover attempt 2's wait
    await saving;

    expect(calls).toBe(3);
  });
});

describe("waitForRetryDelay — listener hygiene", () => {
  afterEach(() => delete (globalThis as any).window);

  test("online path removes its own listener (no stale handlers accumulate)", async () => {
    let handler: (() => void) | null = null;
    const removeEventListener = jest.fn();
    (globalThis as any).window = {
      addEventListener: jest.fn((_e: string, fn: () => void) => (handler = fn)),
      removeEventListener,
    };
    const p = waitForRetryDelay(60_000);
    handler!();
    await p;
    expect(removeEventListener).toHaveBeenCalledTimes(1);
    expect(removeEventListener).toHaveBeenCalledWith("online", handler);
  });

  test("a delay of 0 still completes and cleans up", async () => {
    const removeEventListener = jest.fn();
    (globalThis as any).window = {
      addEventListener: jest.fn(),
      removeEventListener,
    };
    await waitForRetryDelay(0);
    expect(removeEventListener).toHaveBeenCalledWith(
      "online",
      expect.any(Function),
    );
  });
});
