export type FontShapingFault = "badGSUB" | "badGPOS" | "wrongLanguage";
export type OpenTypeLayoutTable = "GSUB" | "GPOS";

export const TABLE_TO_FAULT: Record<OpenTypeLayoutTable, FontShapingFault> = {
  GSUB: "badGSUB",
  GPOS: "badGPOS",
};

const NON_HARFBUZZ_BROWSERS = new Set(["safari", "edgelegacy"]);

const commaSeparatedValues = (value: unknown): string[] =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * Whether a condition explicitly tolerates a shaping fault.
 *
 * Parameter values have already been category-validated by this point, but
 * comparison is case-insensitive so this check remains safe in isolation.
 */
export const fontFaultIsTolerated = (
  fontTolerateFaults: unknown,
  fault: FontShapingFault,
): boolean => {
  const tolerated = new Set(
    commaSeparatedValues(fontTolerateFaults).map((item) => item.toLowerCase()),
  );
  return tolerated.has("all") || tolerated.has(fault.toLowerCase());
};

/**
 * Whether any browser permitted by _needBrowser may use HarfBuzz.
 *
 * Safari uses CoreText and legacy Edge used DirectWrite. Other supported
 * browser names either use HarfBuzz or can do so on at least one platform.
 * For an exclusion list, knownBrowsers is used to derive the browsers left
 * after the exclusions.
 */
export const needBrowserMayUseHarfBuzz = (
  needBrowser: unknown,
  knownBrowsers: string[] = [],
): boolean => {
  const requested = commaSeparatedValues(needBrowser);
  if (requested.length === 0) return true;

  const normalized = requested.map((browser) => browser.toLowerCase());
  if (normalized.includes("all")) return true;

  const isExclusionList = normalized.every((browser) =>
    browser.startsWith("not"),
  );
  let allowedBrowsers: string[];
  if (isExclusionList) {
    // Without the glossary's complete category list, an exclusion list must
    // be treated conservatively because it can still permit HarfBuzz.
    if (knownBrowsers.length === 0) return true;
    const excluded = new Set(normalized.map((browser) => browser.slice(3)));
    allowedBrowsers = knownBrowsers.filter(
      (browser) => !excluded.has(browser.toLowerCase()),
    );
  } else {
    allowedBrowsers = requested;
  }

  return allowedBrowsers.some(
    (browser) => !NON_HARFBUZZ_BROWSERS.has(browser.toLowerCase()),
  );
};
