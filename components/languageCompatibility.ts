export const HISTORICAL_LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
  "en-US": "en",
  "en-UK": "en",
  "zh-HK": "zh-TW",
  tl: "fil",
  pt: "pt-pt",
};

// These codes existed in older phrase snapshots but have no direct equivalent
// in the current allowlist. Keep accepting them so historical studies can use
// the monitored English fallback instead of failing validation.
export const HISTORICAL_LANGUAGE_CODES = new Set([
  ...Object.keys(HISTORICAL_LANGUAGE_ALIASES),
  "hy",
  "bg",
  "hr",
  "is",
  "kn",
  "lt",
  "ml",
  "sr",
]);

export type LanguageResolution = {
  requested: string;
  resolved: string;
  reason: "current" | "alias" | "fallback";
};

const findEnglishFallback = (availableCodes: readonly string[]): string =>
  ["en", "en-US", "en-UK"].find((code) => availableCodes.includes(code)) ??
  "en";

export function resolveLanguageCode(
  requested: string,
  availableCodes: readonly string[],
): LanguageResolution {
  if (availableCodes.includes(requested)) {
    return { requested, resolved: requested, reason: "current" };
  }

  const alias = HISTORICAL_LANGUAGE_ALIASES[requested];
  if (alias && availableCodes.includes(alias)) {
    return { requested, resolved: alias, reason: "alias" };
  }

  return {
    requested,
    resolved: findEnglishFallback(availableCodes),
    reason: "fallback",
  };
}

export function isCompatibleLanguageCode(
  code: string,
  currentCodes: readonly string[],
): boolean {
  return currentCodes.includes(code) || HISTORICAL_LANGUAGE_CODES.has(code);
}
