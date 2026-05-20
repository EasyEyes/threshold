import { getRetryDelayMs, BASE_DELAY_SEC, MAX_DELAY_SEC } from "../preprocess/retry";

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
      expect(getRetryDelayMs(20)).toBeLessThanOrEqual(MAX_DELAY_SEC * 1000 * 1.2);
    }
  });

  it("applies jitter: repeated calls return different values", () => {
    const results = new Set(Array.from({ length: 20 }, () => getRetryDelayMs(0)));
    expect(results.size).toBeGreaterThan(1);
  });

  it("MAX_DELAY_SEC is 30 seconds", () => {
    expect(MAX_DELAY_SEC).toBe(30);
  });
});
