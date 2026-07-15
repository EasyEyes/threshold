import {
  FONT_READING_CORPUS_CHARACTERS_MISSING,
  FONT_WRONG_LANGUAGE,
  type EasyEyesError,
} from "./errorMessages";
import { getGlossary } from "../parameters/glossaryRegistry";
import { getColumnValuesOrDefaults } from "./utils";
import { GitLabOAuthClient } from "./auth/gitlabOAuthClient";
import { fontFaultIsTolerated } from "./fontFaultPolicy";
import { initEasyEyesWasm } from "./wasmFontLoader";
import { shaperglotLanguageIdForFontLanguage } from "./easyeyesShaperglotLanguages";
import { normalizeFontBytesForShaperglot } from "./fontShapingCheck";
import { createFontDataCache, type FontDataCache } from "./fontDataCache";

interface LanguageCheckResult {
  ok: boolean;
  supported: boolean;
  support_level: string;
  summary: string;
  problems: string[];
  error?: string;
}

interface TextCoverageResult {
  ok: boolean;
  supported: boolean;
  missing_characters: string[];
  missing_codepoints: number[];
  error?: string;
}

const loadCorpusContents = async (
  corpusNames: string[],
  space: string,
  textContents?: Record<string, string>,
  textDirectory?: string,
): Promise<Map<string, string>> => {
  const contents = new Map<string, string>();
  for (const name of corpusNames) {
    if (textContents && textContents[name] !== undefined) {
      contents.set(name, textContents[name]);
    }
  }
  if (space === "node" && textDirectory) {
    const fs = await import(/* webpackIgnore: true */ "fs");
    const path = await import(/* webpackIgnore: true */ "path");
    for (const name of corpusNames) {
      if (contents.has(name)) continue;
      const filePath = path.join(textDirectory, name);
      if (!fs.existsSync(filePath)) continue;
      contents.set(name, fs.readFileSync(filePath, "utf8"));
    }
  }
  return contents;
};

const formatMissingCharacters = (chars: string[], limit = 24): string => {
  if (chars.length <= limit) return chars.join("");
  return `${chars.slice(0, limit).join("")}… (+${chars.length - limit} more)`;
};

interface LanguageCheckTask {
  fontName: string;
  fontLanguage: string;
  shaperglotLanguageId: string;
  conditionIndices: number[];
}

interface CorpusCheckTask {
  fontName: string;
  corpusName: string;
  conditionIndices: number[];
}

/**
 * Compile-time font language checks using shaperglot (client-side WASM):
 * 1. Each condition's file-sourced `font` must support that condition's
 *    `fontLanguage` (when set, and unless tolerated via
 *    fontTolerateFaults=wrongLanguage).
 * 2. Every significant character in the condition's `readingCorpus` must be
 *    covered by the condition's file-sourced `font`.
 * Each unique (font, language) and (font, corpus) pair is checked once, with
 * all affected conditions reported in a single error.
 */
export const validateFontLanguageSupport = async (
  df: any,
  space: string = "web",
  fontDirectory?: string,
  options: {
    gitlabOAuthClient?: GitLabOAuthClient;
    textContents?: Record<string, string>;
    textDirectory?: string;
    fontCache?: FontDataCache;
  } = {},
): Promise<EasyEyesError[]> => {
  const errors: EasyEyesError[] = [];
  try {
    const wasm = await initEasyEyesWasm();
    if (!wasm) return errors;

    const fontNames = getColumnValuesOrDefaults(df, "font");
    const fontSources = getColumnValuesOrDefaults(df, "fontSource");
    const faultTolerances = getColumnValuesOrDefaults(df, "fontTolerateFaults");
    const readingCorpuses = getColumnValuesOrDefaults(df, "readingCorpus");
    const fontLanguages = getColumnValuesOrDefaults(df, "fontLanguage");

    // Deduplicated work lists: one language check per (font, language id),
    // one coverage check per (font, corpus), each with merged conditions.
    const languageChecks = new Map<string, LanguageCheckTask>();
    const corpusChecks = new Map<string, CorpusCheckTask>();

    for (let i = 0; i < fontNames.length; i++) {
      const source =
        fontSources[i] || getGlossary()["fontSource"]?.default || "file";
      if (source !== "file") continue;
      const fontName = fontNames[i]?.trim();
      if (!fontName) continue;

      const fontLanguage = fontLanguages[i]?.trim();
      if (
        fontLanguage &&
        !fontFaultIsTolerated(faultTolerances[i], "wrongLanguage")
      ) {
        const shaperglotLanguageId =
          shaperglotLanguageIdForFontLanguage(fontLanguage);
        if (shaperglotLanguageId) {
          const key = `${fontName}|${shaperglotLanguageId}`;
          const existing = languageChecks.get(key);
          if (existing) existing.conditionIndices.push(i);
          else
            languageChecks.set(key, {
              fontName,
              fontLanguage,
              shaperglotLanguageId,
              conditionIndices: [i],
            });
        }
      }

      const corpusName = readingCorpuses[i]?.trim();
      if (corpusName) {
        const key = `${fontName}|${corpusName}`;
        const existing = corpusChecks.get(key);
        if (existing) existing.conditionIndices.push(i);
        else
          corpusChecks.set(key, {
            fontName,
            corpusName,
            conditionIndices: [i],
          });
      }
    }

    if (languageChecks.size === 0 && corpusChecks.size === 0) return errors;

    const uniqueCorpusNames = Array.from(
      new Set(Array.from(corpusChecks.values(), (c) => c.corpusName)),
    );
    const corpusContents = await loadCorpusContents(
      uniqueCorpusNames,
      space,
      options.textContents,
      options.textDirectory,
    );

    const fontNamesToFetch = new Set<string>();
    for (const { fontName } of languageChecks.values()) {
      fontNamesToFetch.add(fontName);
    }
    for (const { fontName, corpusName } of corpusChecks.values()) {
      if (corpusContents.has(corpusName)) fontNamesToFetch.add(fontName);
    }
    if (fontNamesToFetch.size === 0) return errors;

    const fontCache =
      options.fontCache ??
      createFontDataCache(space, fontDirectory, options.gitlabOAuthClient);
    const fontFiles = await fontCache.getFontData(Array.from(fontNamesToFetch));
    const fontFileMap = new Map(fontFiles.map((f) => [f.name, f.data]));

    // Normalized (sfnt) bytes per font; null caches a normalization failure.
    const normalizedFontBytes = new Map<string, Uint8Array | null>();

    const fontBytesFor = async (
      fontName: string,
    ): Promise<Uint8Array | null> => {
      if (normalizedFontBytes.has(fontName)) {
        return normalizedFontBytes.get(fontName)!;
      }
      const fontData = fontFileMap.get(fontName);
      if (!fontData) return null;
      let normalized: Uint8Array | null = null;
      try {
        normalized = await normalizeFontBytesForShaperglot(fontData);
      } catch (error) {
        console.warn(
          `[Font Language Check] Could not normalize font "${fontName}"; skipping.`,
          error,
        );
      }
      normalizedFontBytes.set(fontName, normalized);
      return normalized;
    };

    for (const {
      fontName,
      fontLanguage,
      shaperglotLanguageId,
      conditionIndices,
    } of languageChecks.values()) {
      const fontBytes = await fontBytesFor(fontName);
      if (!fontBytes) continue;

      try {
        const raw = wasm.check_font_language_support(
          fontBytes,
          shaperglotLanguageId,
        );
        const result = JSON.parse(raw) as LanguageCheckResult;
        if (!result.ok) {
          console.warn(
            `[Font Language Check] Could not analyze "${fontName}" for ${shaperglotLanguageId}: ${result.error}`,
          );
        } else if (!result.supported) {
          errors.push(
            FONT_WRONG_LANGUAGE(
              fontName,
              fontLanguage,
              shaperglotLanguageId,
              result.summary,
              result.problems,
              conditionIndices,
            ),
          );
        }
      } catch (error) {
        console.warn(
          `[Font Language Check] Could not analyze font "${fontName}"; skipping.`,
          error,
        );
      }
    }

    for (const {
      fontName,
      corpusName,
      conditionIndices,
    } of corpusChecks.values()) {
      const corpusText = corpusContents.get(corpusName);
      if (!corpusText) continue;
      const fontBytes = await fontBytesFor(fontName);
      if (!fontBytes) continue;

      try {
        const raw = wasm.check_font_text_coverage(fontBytes, corpusText);
        const result = JSON.parse(raw) as TextCoverageResult;
        if (!result.ok) {
          console.warn(
            `[Font Language Check] Could not analyze "${fontName}" against "${corpusName}": ${result.error}`,
          );
          continue;
        }
        if (!result.supported) {
          errors.push(
            FONT_READING_CORPUS_CHARACTERS_MISSING(
              fontName,
              corpusName,
              formatMissingCharacters(result.missing_characters),
              result.missing_characters.length,
              conditionIndices,
            ),
          );
        }
      } catch (error) {
        console.warn(
          `[Font Language Check] Could not analyze font "${fontName}" for corpus "${corpusName}"; skipping.`,
          error,
        );
      }
    }
  } catch (error) {
    console.warn("[Font Language Check] Check unavailable; skipping.", error);
  }
  return errors;
};
