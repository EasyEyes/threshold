import { getRetryDelayMs, BASE_DELAY_SEC, MAX_DELAY_SEC } from "../preprocess/retry";

describe("getRetryDelayMs", () => {
  it("returns BASE_DELAY_SEC * 1000 for attempt 0", () => {
    expect(getRetryDelayMs(0)).toBe(BASE_DELAY_SEC * 1000);
  });

  it("returns BASE_DELAY_SEC * 1.75 * 1000 for attempt 1", () => {
    expect(getRetryDelayMs(1)).toBe(BASE_DELAY_SEC * 1.75 * 1000);
  });

  it("returns BASE_DELAY_SEC * 1.75^2 * 1000 for attempt 2", () => {
    expect(getRetryDelayMs(2)).toBeCloseTo(BASE_DELAY_SEC * Math.pow(1.75, 2) * 1000);
  });

  it("caps at MAX_DELAY_SEC * 1000 for large attempt values", () => {
    expect(getRetryDelayMs(20)).toBe(MAX_DELAY_SEC * 1000);
  });
});
