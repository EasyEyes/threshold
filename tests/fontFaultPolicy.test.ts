import {
  fontFaultIsTolerated,
  needBrowserMayUseHarfBuzz,
} from "../preprocess/fontFaultPolicy";

describe("fontTolerateFaults shaping policy", () => {
  it("does not tolerate faults by default", () => {
    expect(fontFaultIsTolerated("", "badGSUB")).toBe(false);
    expect(fontFaultIsTolerated(undefined, "badGPOS")).toBe(false);
  });

  it("tolerates only the faults explicitly listed", () => {
    expect(fontFaultIsTolerated("badGSUB", "badGSUB")).toBe(true);
    expect(fontFaultIsTolerated("badGSUB", "badGPOS")).toBe(false);
    expect(fontFaultIsTolerated(" badGSUB, badGPOS ", "badGPOS")).toBe(true);
  });

  it("uses all to tolerate every shaping fault", () => {
    expect(fontFaultIsTolerated("all", "badGSUB")).toBe(true);
    expect(fontFaultIsTolerated("all", "badGPOS")).toBe(true);
    expect(fontFaultIsTolerated("all", "wrongLanguage")).toBe(true);
  });

  it("tolerates wrongLanguage when explicitly listed", () => {
    expect(fontFaultIsTolerated("wrongLanguage", "wrongLanguage")).toBe(true);
    expect(fontFaultIsTolerated("wrongLanguage", "badGSUB")).toBe(false);
  });
});

describe("_needBrowser HarfBuzz policy", () => {
  const knownBrowsers = ["Chrome", "Firefox", "Safari", "EdgeLegacy"];

  it("skips checks for browsers known not to use HarfBuzz", () => {
    expect(needBrowserMayUseHarfBuzz("Safari", knownBrowsers)).toBe(false);
    expect(needBrowserMayUseHarfBuzz("Safari, EdgeLegacy", knownBrowsers)).toBe(
      false,
    );
  });

  it("checks when any permitted browser may use HarfBuzz", () => {
    expect(needBrowserMayUseHarfBuzz("Safari, Chrome", knownBrowsers)).toBe(
      true,
    );
    expect(needBrowserMayUseHarfBuzz("all", knownBrowsers)).toBe(true);
    expect(needBrowserMayUseHarfBuzz("notSafari", knownBrowsers)).toBe(true);
  });

  it("resolves exclusion lists against known browser categories", () => {
    expect(
      needBrowserMayUseHarfBuzz(
        "notChrome, notFirefox, notEdgeLegacy",
        knownBrowsers,
      ),
    ).toBe(false);
  });

  it("handles an exclusion list conservatively without category data", () => {
    expect(needBrowserMayUseHarfBuzz("notChrome")).toBe(true);
  });
});
