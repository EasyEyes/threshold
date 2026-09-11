import {
  getRetryDelayMs,
  BASE_DELAY_SEC,
  MAX_DELAY_SEC,
} from "../preprocess/retry";

describe("getRetryDelayMs", () => {
  it("returns a value in [computed*0.8, computed*1.2] for attempt 0", () => {
    const computed = BASE_DELAY_SEC * 1000;
    const result = getRetryDelayMs(0);
    expect(result).toBeGreaterThanOrEqual(computed * 0.8);
    expect(result).toBeLessThanOrEqual(computed * 1.2);
  });

  it("returns a value in [computed*0.8, computed*1.2] for attempt 1", () => {
    const computed = BASE_DELAY_SEC * 1.75 * 1000;
    const result = getRetryDelayMs(1);
    expect(result).toBeGreaterThanOrEqual(computed * 0.8);
    expect(result).toBeLessThanOrEqual(computed * 1.2);
  });

  it("returns a value in [computed*0.8, computed*1.2] for attempt 2", () => {
    const computed = BASE_DELAY_SEC * Math.pow(1.75, 2) * 1000;
    const result = getRetryDelayMs(2);
    expect(result).toBeGreaterThanOrEqual(computed * 0.8);
    expect(result).toBeLessThanOrEqual(computed * 1.2);
  });

  it("caps with jitter: large attempt value never exceeds MAX_DELAY_SEC * 1000 * 1.2", () => {
    for (let i = 0; i < 20; i++) {
      expect(getRetryDelayMs(20)).toBeLessThanOrEqual(
        MAX_DELAY_SEC * 1000 * 1.2,
      );
    }
  });

  it("applies jitter: repeated calls return different values", () => {
    const results = new Set(
      Array.from({ length: 20 }, () => getRetryDelayMs(0)),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it("MAX_DELAY_SEC is 30 seconds", () => {
    expect(MAX_DELAY_SEC).toBe(30);
  });
});

// ─── (a) waitForRetryDelay: fire immediately on network recovery ────────────
// A participant whose WiFi drops mid-save must not sit out a 30 s backoff
// after the network returns: the delay races the window "online" event.
import { waitForRetryDelay } from "../preprocess/retry";

describe("waitForRetryDelay", () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  it("resolves after the delay when there is no window (node/compiler)", async () => {
    const t0 = Date.now();
    await waitForRetryDelay(30);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(25);
  });

  it("resolves immediately when 'online' fires, long before the delay", async () => {
    let onlineHandler: (() => void) | null = null;
    const removeEventListener = jest.fn();
    (globalThis as any).window = {
      addEventListener: jest.fn((ev: string, fn: () => void) => {
        if (ev === "online") onlineHandler = fn;
      }),
      removeEventListener,
    };
    let resolved = false;
    const p = waitForRetryDelay(60_000).then(() => {
      resolved = true;
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(resolved).toBe(false);
    onlineHandler!();
    await p;
    expect(resolved).toBe(true);
  });

  it("removes the online listener when the delay elapses", async () => {
    const removeEventListener = jest.fn();
    (globalThis as any).window = {
      addEventListener: jest.fn(),
      removeEventListener,
    };
    await waitForRetryDelay(10);
    expect(removeEventListener).toHaveBeenCalledWith(
      "online",
      expect.any(Function),
    );
  });
});
