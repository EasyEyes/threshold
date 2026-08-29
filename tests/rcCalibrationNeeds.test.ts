/**
 * @jest-environment jsdom
 *
 * Device-compatibility pages list camera / paper only when RC will run
 * Distance, and the credit card only when RC will run Size (not skipped
 * because a valid EasyEyesScreenSize cache already covers this monitor).
 */

jest.mock("../components/readPhrases.js", () => ({
  readi18nPhrases: jest.fn(() => ""),
}));

jest.mock("../components/markdownInline.js", () => ({
  renderMarkdown: jest.fn((s: string) => s),
}));

import {
  willCalibrateDistance,
  willCalibrateScreenSize,
} from "../components/compatibilityUI.js";

const makeReader = (values: Record<string, any[]>) => ({
  read: (name: string, _blockOrCondition?: any) => values[name],
});

const CACHE_KEY = "EasyEyesScreenSize";

describe("willCalibrateDistance", () => {
  it("is false when calibrateDistanceBool is FALSE everywhere", () => {
    const reader = makeReader({ calibrateDistanceBool: [false] });
    expect(willCalibrateDistance(reader as any)).toBe(false);
  });

  it("is true when any block has calibrateDistanceBool TRUE", () => {
    const reader = makeReader({ calibrateDistanceBool: [false, true] });
    expect(willCalibrateDistance(reader as any)).toBe(true);
  });
});

describe("willCalibrateScreenSize", () => {
  const matchingCache = {
    width: 1512,
    height: 982,
    left: 0,
    top: 0,
    screenWidthCm: 30,
    screenHeightCm: 20,
    screenPpi: 110,
  };

  beforeEach(() => {
    Object.defineProperty(window, "screen", {
      configurable: true,
      value: { width: 1512, height: 982 },
    });
    Object.defineProperty(window, "screenLeft", {
      configurable: true,
      value: 40,
    });
    Object.defineProperty(window, "screenTop", {
      configurable: true,
      value: 80,
    });
    localStorage.clear();
  });

  it("is false when calibrateScreenSizeBool is FALSE everywhere", () => {
    const reader = makeReader({
      calibrateScreenSizeBool: [false],
      _calibrateScreenSizeCacheBool: [true],
    });
    expect(willCalibrateScreenSize(reader as any)).toBe(false);
  });

  it("is true when Size is requested and there is no cache", () => {
    const reader = makeReader({
      calibrateScreenSizeBool: [true],
      _calibrateScreenSizeCacheBool: [true],
    });
    expect(willCalibrateScreenSize(reader as any)).toBe(true);
  });

  it("is false on page 1 (windowed) when the cache was saved in fullscreen with a non-zero top inset", () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...matchingCache, left: 0, top: 25 }),
    );
    const reader = makeReader({
      calibrateScreenSizeBool: [true],
      _calibrateScreenSizeCacheBool: [true],
    });
    expect(willCalibrateScreenSize(reader as any)).toBe(false);
  });

  it("is true when cache exists but caching is disabled", () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(matchingCache));
    const reader = makeReader({
      calibrateScreenSizeBool: [true],
      _calibrateScreenSizeCacheBool: [false],
    });
    expect(willCalibrateScreenSize(reader as any)).toBe(true);
  });

  it("is true when the cached monitor resolution does not match", () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...matchingCache, width: 1920, height: 1080 }),
    );
    const reader = makeReader({
      calibrateScreenSizeBool: [true],
      _calibrateScreenSizeCacheBool: [true],
    });
    expect(willCalibrateScreenSize(reader as any)).toBe(true);
  });
});
