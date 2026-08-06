/* eslint-disable @typescript-eslint/no-explicit-any */
import { getGlossary } from "../parameters/glossaryRegistry";
import { shaperglotLanguageIdForFontLanguage } from "./easyeyesShaperglotLanguages";

/**
 * @file fontPixiMetricsString defaults are fontLanguage specific.
 *
 * Any condition can set fontPixiMetricsString directly. The glossary default
 * only says what a condition gets when it names a fontLanguage and leaves
 * fontPixiMetricsString empty. That default is a comma-separated list of
 * (language, metrics string) pairs, e.g.
 *
 *   ar, ٱغ, fa, آژ گچ, ja, 高黒, ur, گھڑی, zh-Hans, 高黑, zh-Hant, 高黑
 *
 * so metrics strings may not contain a comma. A language with no entry, or a
 * condition with no fontLanguage, gets the empty string, i.e. the behavior
 * before per-language defaults existed.
 *
 * Pairs are keyed by canonical EasyEyes language id rather than by the literal
 * code, so one zh-Hans entry also serves fontLanguage=zh-CN.
 */

export interface ParsedFontPixiMetricsStringDefault {
  /** Metrics string by canonical language id, e.g. "zh_Hans" → "高黑". */
  byLanguageId: Map<string, string>;
  /** Odd-numbered entries that name no language EasyEyes knows. */
  unrecognizedLanguages: string[];
  /** A final language with no metrics string after it, if any. */
  unpairedLanguage: string | null;
}

const parseCache = new Map<string, ParsedFontPixiMetricsStringDefault>();

export const parseFontPixiMetricsStringDefault = (
  rawDefault: string,
): ParsedFontPixiMetricsStringDefault => {
  const cached = parseCache.get(rawDefault);
  if (cached) return cached;

  const parsed: ParsedFontPixiMetricsStringDefault = {
    byLanguageId: new Map(),
    unrecognizedLanguages: [],
    unpairedLanguage: null,
  };
  const items =
    rawDefault.trim() === "" ? [] : rawDefault.split(",").map((s) => s.trim());
  for (let i = 0; i < items.length; i += 2) {
    const language = items[i];
    if (i + 1 >= items.length) {
      parsed.unpairedLanguage = language;
      break;
    }
    const languageId = shaperglotLanguageIdForFontLanguage(language);
    if (languageId) parsed.byLanguageId.set(languageId, items[i + 1]);
    else parsed.unrecognizedLanguages.push(language);
  }

  parseCache.set(rawDefault, parsed);
  return parsed;
};

/** The metrics string that `rawDefault` assigns to `fontLanguage`, else "". */
export const fontPixiMetricsStringForLanguage = (
  fontLanguage: string,
  rawDefault: string,
): string => {
  const languageId = shaperglotLanguageIdForFontLanguage(fontLanguage);
  if (!languageId) return "";
  return (
    parseFontPixiMetricsStringDefault(rawDefault).byLanguageId.get(
      languageId,
    ) ?? ""
  );
};

/**
 * An empty cell is filled with the raw glossary default, which is the whole
 * language-keyed list rather than a metrics string. Swap that list for this
 * condition's language-specific entry, and pass any other value through
 * untouched, since the scientist wrote it.
 */
export const resolveFontPixiMetricsString = (
  value: string,
  fontLanguage: string,
  rawDefault: string,
): string => {
  if (rawDefault.trim() === "" || value.trim() !== rawDefault.trim())
    return value;
  return fontPixiMetricsStringForLanguage(fontLanguage, rawDefault);
};

export const glossaryFontPixiMetricsStringDefault = (): string => {
  // getGlossary() throws until the glossary loads, and unit tests exercise
  // runtime call sites without one. No glossary means no default.
  try {
    return (getGlossary()["fontPixiMetricsString"]?.default as string) ?? "";
  } catch {
    return "";
  }
};

/**
 * Read fontPixiMetricsString for one condition, already resolved against its
 * fontLanguage. The compiler resolves the column it writes into the block
 * files, so this normally just returns that value; it still matters when the
 * study table omits fontPixiMetricsString entirely, because then the reader
 * falls back to the raw glossary default. Omit `BC` to read the first
 * condition of the experiment.
 */
export const readFontPixiMetricsString = (reader: any, BC?: string): string => {
  return resolveFontPixiMetricsString(
    readConditionValue(reader, "fontPixiMetricsString", BC),
    readConditionValue(reader, "fontLanguage", BC),
    glossaryFontPixiMetricsStringDefault(),
  );
};

const readConditionValue = (reader: any, name: string, BC?: string): string => {
  const value = BC === undefined ? reader.read(name) : reader.read(name, BC);
  // Reading by block number, or with no BC at all, yields one entry per
  // condition; take the first, as the block-level call sites do.
  const scalar = Array.isArray(value) ? value[0] : value;
  return scalar === undefined || scalar === null ? "" : String(scalar);
};

/**
 * The metrics string that every text stim of one condition must share,
 * whatever its targetKind.
 *
 * PIXI caches font metrics per font+size, so two stims that disagree here
 * evict and re-measure each other's cache entry (see
 * TextStim#_pinFontMetrics), leaving whichever measured last to place both
 * baselines. Measurement stims must therefore agree with the display stims
 * they size, and neighbouring display stims must agree with each other.
 *
 * fontCharacterSet is the fallback because it is the closest available
 * description of the glyphs a condition actually shows; PIXI's own "|ÉqÅ"
 * default measures Latin glyphs, which badly understate the vertical extent
 * of, eg, Arabic-script fonts.
 */
export const readFontMetricsCharacterSet = (
  reader: any,
  BC?: string,
): string => {
  const metricsString = readFontPixiMetricsString(reader, BC);
  if (metricsString !== "") return metricsString;
  const fontCharacterSet = readConditionValue(reader, "fontCharacterSet", BC);
  return fontCharacterSet !== "" ? fontCharacterSet : "|ÉqÅ";
};
