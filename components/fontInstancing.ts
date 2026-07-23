/**
 * Font Processor
 *
 * Two entry points:
 *
 *   - bakeAllFonts(reader) — EAGER pre-bake. Runs ONCE on experiment page
 *     load (during the asset-preload phase that already happens before
 *     loadReadingCorpus). Collects every (font, fontSource, settings)
 *     tuple from every condition, dedupes, fetches the bytes per source,
 *     bakes with WASM, registers every baked FontFace BEFORE trial 1
 *     begins. Failed fonts go into a `failedFontNames` set so the
 *     scheduler can mark those conditions for skipTrial(). This is the
 *     architectural principle documented in the `font` glossary entry:
 *     "EasyEyes preloads all fonts... after preload, the experiment
 *     runs with no font-loading delay and no need for internet."
 *
 *   - generateFontInstances(variations) — LEGACY per-block path. Still
 *     exported for back-compat with tests that exercise the cache-key
 *     mechanics. New code should call bakeAllFonts() instead.
 */

import { cleanFontName } from "./fonts.js";
import { mergeLigatureFeatureSettings } from "./fontVariantLigatures.js";

/** Minimal structural type for the ParamReader (tests pass fakes). */
export interface FontParamReader {
  blockCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  read: (name: string, blockOrCondition: string | number) => any;
}

/** A (font, settings) tuple that needs WASM baking. */
export interface FontVariation {
  fontName: string;
  originalFontName: string;
  variableSettings: string;
  stylisticSets: string;
  featureSettings: string;
  fontPath: string | null;
  fontSource: string;
  blockIndex: number;
  conditionIndex: number;
}

/** Raw font bytes plus the input container's extension. */
interface FontBytes {
  bytes: Uint8Array;
  extension: string;
  subdir?: string;
}

/** github Contents API file entry. */
interface GhFile {
  name: string;
  download_url?: string;
}

/** The one WASM export this module uses (plus init via default()). */
interface WasmFontProcessor {
  process_font: (
    fontData: Uint8Array,
    variableSettings: string,
    stylisticSets: string,
    featureSettings: string,
  ) => Uint8Array;
}

const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

let wasmModule: WasmFontProcessor | null = null;
const fontInstanceMap = new Map<string, string>(); // "fontName|variableSettings|stylisticSets|featureSettings" -> processed name
let fontInstancingTimesMs: number[] = []; // Array of times taken to instance each font (in milliseconds)
// Eager pre-bake bookkeeping. Keyed by the ORIGINAL family name (cleanFontName)
// of a font whose pre-bake failed. Consumed by setFontGlobalState to skip
// conditions whose font is in this set. Cleared at the start of every
// bakeAllFonts() call so a re-bake starts fresh.
const failedFontNames = new Set<string>();

/** Initialize WASM module */
async function initWasm(): Promise<void> {
  if (wasmModule) return;

  try {
    const wasm = await import("../@rust/pkg/easyeyes_wasm.js");
    await wasm.default();
    wasmModule = wasm;
  } catch (error) {
    console.warn(
      "[WASM] FALLBACK ACTIVE - fonts will NOT be processed!",
      errorMessage(error),
    );
    wasmModule = {
      process_font: (fontData: Uint8Array) => fontData,
    };
  }
}

/** Generate a unique font family name for a processed font */
export function generateProcessedFontName(
  baseFontName: string,
  variableSettings: string,
  stylisticSets: string,
  featureSettings: string,
): string {
  const nameParts = [];

  // Process variable settings (e.g., "wght" 625 -> wght625)
  if (variableSettings?.trim()) {
    const cleaned = variableSettings.replace(/["']/g, "").trim();
    const parts = cleaned.split(",").map((p) => p.trim());

    for (const part of parts) {
      const tokens = part.split(/\s+/);
      if (tokens.length === 2) {
        const axis = tokens[0].trim();
        const value = Math.round(parseFloat(tokens[1].trim()));
        nameParts.push(`${axis}${value}`);
      }
    }
  }

  // Process stylistic sets (e.g., "SS01, SS19" -> SS01-SS19)
  if (stylisticSets?.trim()) {
    const cleaned = stylisticSets.replace(/["']/g, "").trim();
    const sets = cleaned
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.startsWith("SS"));
    if (sets.length > 0) {
      nameParts.push(sets.join("-"));
    }
  }

  // Process feature settings (e.g. '"calt" 1, "smcp"' -> calt1+smcp1).
  // The VALUE must be in the name: '"liga" 0' and '"liga" 1' bake to
  // different fonts and must not share a FontFace family (the serial bake
  // would let the later registration clobber the earlier one).
  if (featureSettings?.trim()) {
    const tags = featureSettings
      .replace(/["']/g, "")
      .split(",")
      .map((s) => {
        const [tag, value] = s.trim().split(/\s+/);
        return tag ? `${tag}${value ?? "1"}` : "";
      })
      .filter(Boolean);
    if (tags.length > 0) {
      nameParts.push(tags.join("+"));
    }
  }

  // Create a shorter, more browser-friendly font name
  const shortBaseName = baseFontName.split(".")[0]; // Remove file extension if present
  const shortName = shortBaseName.includes("BitcountGridSingle")
    ? "BitcountGrid"
    : shortBaseName;

  return nameParts.length > 0
    ? `${shortName}-${nameParts.join("-")}`
    : shortName;
}

/** Load font file as ArrayBuffer */
async function loadFontFile(fontPath: string): Promise<ArrayBuffer> {
  const response = await fetch(fontPath);
  if (!response.ok) throw new Error(`Failed to fetch font: ${fontPath}`);
  return response.arrayBuffer();
}

/**
 * Load Google Font variable font file.
 * Fetches the full variable font (not instanced) for WASM processing.
 * @returns {{data: ArrayBuffer, format: string}|null}
 */
/**
 * Load Google Font variable font file.
 * @param {string} fontName - Font name
 * @param {string} variableSettings - Used to build axis request (e.g., "YEAR" 1980 -> YEAR@1980)
 */
async function loadGoogleFontFile(
  fontName: string,
  variableSettings: string,
): Promise<{ data: ArrayBuffer; format: string } | null> {
  const encodedName = encodeURIComponent(fontName);
  // Convert settings to axis@value format for URL (e.g., "YEAR" 1980 -> YEAR@1980)
  const axisParam = variableSettings
    .replace(/["']/g, "")
    .trim()
    .replace(/\s+/, "@");
  // No trailing colon when axisParam is empty (would produce an invalid URL).
  const cssUrl = axisParam
    ? `https://fonts.googleapis.com/css2?family=${encodedName}:${axisParam}`
    : `https://fonts.googleapis.com/css2?family=${encodedName}`;

  try {
    const cssResponse = await fetch(cssUrl);
    if (!cssResponse.ok) {
      console.warn(`[Google Font] Fetch failed: ${cssResponse.status}`);
      return null;
    }

    const cssText = await cssResponse.text();

    // Extract font URL: prefer Latin subset, then any modern format, then woff.
    // Google Fonts serves different formats per User-Agent.
    const latinMatch = cssText.match(
      /\/\* latin \*\/[^}]+url\(([^)]+)\)\s*format\(['"](?:woff2|truetype|opentype|woff)['"]\)/,
    );
    const anyModernMatch = cssText.match(
      /url\(([^)]+)\)\s*format\(['"](?:woff2|truetype|opentype)['"]\)/,
    );
    const anyWoffMatch = cssText.match(
      /url\(([^)]+)\)\s*format\(['"]woff['"]\)/,
    );

    let fontUrl = latinMatch?.[1] || anyModernMatch?.[1] || anyWoffMatch?.[1];
    const format = latinMatch || anyModernMatch ? "woff2" : "woff";

    if (!fontUrl) {
      return null;
    }

    fontUrl = fontUrl.replace(/['"]/g, "");
    const fontResponse = await fetch(fontUrl);
    if (!fontResponse.ok) return null;

    const data = await fontResponse.arrayBuffer();
    return { data, format };
  } catch (error) {
    return null;
  }
}

/** Process font using WASM (variable instancing and/or stylistic sets) */
async function processFont(
  fontData: ArrayBuffer | Uint8Array,
  variableSettings: string,
  stylisticSets: string,
  featureSettings: string,
): Promise<Uint8Array> {
  if (!wasmModule) await initWasm();

  const fontBytes = new Uint8Array(fontData);
  const varSettings = variableSettings?.trim() || "";
  const ssSettings = stylisticSets?.trim() || "";
  const featSettings = featureSettings?.trim() || "";

  const result = wasmModule!.process_font(
    fontBytes,
    varSettings,
    ssSettings,
    featSettings,
  );

  if (result instanceof Error) throw new Error(`WASM error: ${result.message}`);
  return new Uint8Array(result);
}

/** Register a font instance as a FontFace */
async function registerFontFace(
  fontFamilyName: string,
  fontData: Uint8Array,
  originalExtension: string,
): Promise<FontFace> {
  const formatMap: Record<string, string> = {
    woff2: "woff2",
    woff: "woff",
    otf: "opentype",
    ttf: "truetype",
  };

  const format = formatMap[originalExtension.toLowerCase()] || "woff2";
  const blob = new Blob([fontData], { type: `font/${originalExtension}` });
  const blobUrl = URL.createObjectURL(blob);

  const fontFace = new FontFace(
    fontFamilyName,
    `url(${blobUrl}) format('${format}')`,
  );

  await fontFace.load();
  document.fonts.add(fontFace);

  const available = await document.fonts.check(`12px "${fontFamilyName}"`);
  if (!available) {
    console.warn(
      `[fontProcessor] Font "${fontFamilyName}" not available after registration`,
    );
  }

  return fontFace;
}

/**
 * Fetch the raw font bytes for a single variation according to its source.
 * Returns the bytes (Uint8Array) plus the source extension (e.g. "ttf",
 * "woff2") so the baker and FontFace register know what they're working
 * with. Throws on fetch failure.
 *
 * - file: GET fonts/<name> from the served Pavlovia repo (relative).
 * - google: GET https://raw.githubusercontent.com/google/fonts/main/<path>
 *           (un-subsetted; the css2 API is forbidden — it serves subsetted
 *           fonts that strip OpenType features).
 * - adobe: fetch the kit CSS, parse woff2 URL for our family, fetch woff2
 *          bytes. The WASM baker accepts woff2 directly (pre-Phase-D
 *          behavior); the bakeAllFonts caller normalizes the format hint
 *          from "woff2" to "ttf" when registering the processed sfnt.
 * - typeSquare: stub — gated behind _typeSquareDistributionKey. Throws
 *               "typeSquare support is in progress".
 * - browser: NOT supported (no byte access); caller should skip.
 */
async function fetchVariationBytes(
  variation: FontVariation,
): Promise<FontBytes> {
  const { fontSource, fontName, fontPath } = variation;
  if (fontSource === "file") {
    const response = await fetch(fontPath!);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch font file: ${fontPath} (HTTP ${response.status})`,
      );
    }
    const data = await response.arrayBuffer();
    return {
      bytes: new Uint8Array(data),
      extension: declaredFontExtension(fontName),
    };
  }
  if (fontSource === "google") {
    // Resolve the actual file on github.com/google/fonts via the Contents
    // API — many families (Inter, Roboto Flex, ...) no longer ship a static
    // TTF, only a variable font; we list the family directory and pick the
    // best file. See familyToGithubUrl for the algorithm.
    const { url } = await familyToGithubUrl(fontName);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch Google font from github: ${url} (HTTP ${response.status})`,
      );
    }
    const data = await response.arrayBuffer();
    return { bytes: new Uint8Array(data), extension: "ttf" };
  }
  if (fontSource === "typeSquare") {
    throw new Error(
      "typeSquare support is in progress — use fontSource=file for now.",
    );
  }
  if (fontSource === "adobe") {
    // Bake-source resolution, GITHUB-FIRST:
    //   1. github.com/adobe-fonts (open-source mirror) — the FULL font with
    //      ALL GSUB features. Preferred for the bake: it's the complete
    //      font, no kit-config step needed.
    //   2. Typekit (closed-source kits, requires typekit.json with kitId) —
    //      fallback for PAID Adobe fonts github doesn't carry. Kits are
    //      created with subset=all (preprocess/fontCheck.ts), so the kit
    //      woff2 is also the full font.
    // This reorder only affects which bytes the BAKE uses; the raw
    // no-settings control-block rendering is unaffected (WebFont.load in
    // production, registerAdobeFontsFromGithubMirror in dev).
    try {
      return await fetchAdobeGithubBytes(fontName);
    } catch (githubErr) {
      const kitId = await getTypekitKitId();
      if (kitId) {
        console.warn(
          `[fontProcessor] github.com/adobe-fonts has no "${fontName}" (${errorMessage(
            githubErr,
          )}); falling back to the Typekit kit.`,
        );
        return await fetchAdobeTypekitBytes(kitId, fontName);
      }
      throw githubErr; // not on github AND no kit → loud failure
    }
  }
  throw new Error(`Unsupported fontSource for runtime bake: ${fontSource}`);
}

/**
 * Read the Typekit kitId from the runtime-fetched typekit.json. Mirrors
 * components/fonts.js's existing fetch('typekit.json') flow. Returns null
 * if the file is missing or has no kitId.
 */
async function getTypekitKitId(): Promise<string | null> {
  try {
    const response = await fetch("typekit.json");
    if (!response.ok) return null;
    const data = await response.json();
    return data && data.kitId ? data.kitId : null;
  } catch (e) {
    return null;
  }
}

/**
 * Typekit (closed-source kit) bake: fetch use.typekit.net/<kitId>.css,
 * parse the @font-face src URL for our family, fetch those bytes. Returns
 * { bytes, extension }. Throws on any failure (caller falls back to
 * github.com/adobe-fonts mirror if applicable).
 */
async function fetchAdobeTypekitBytes(
  kitId: string,
  fontName: string,
): Promise<FontBytes> {
  const cssUrl = `https://use.typekit.net/${kitId}.css`;
  const cssResponse = await fetch(cssUrl);
  if (!cssResponse.ok) {
    throw new Error(
      `Failed to fetch Adobe Typekit kit CSS: ${cssUrl} (HTTP ${cssResponse.status})`,
    );
  }
  const css = await cssResponse.text();
  const fontUrl = parseAdobeFontUrl(css, fontName);
  if (!fontUrl) {
    throw new Error(
      `Adobe Typekit kit CSS has no @font-face for "${fontName}"`,
    );
  }
  const fontResponse = await fetch(fontUrl);
  if (!fontResponse.ok) {
    throw new Error(
      `Failed to fetch Adobe Typekit woff2: ${fontUrl} (HTTP ${fontResponse.status})`,
    );
  }
  const data = await fontResponse.arrayBuffer();
  return { bytes: new Uint8Array(data), extension: "woff2" };
}

const ADOBE_GITHUB_API_BASE = "https://api.github.com/repos/adobe-fonts";
const ADOBE_GITHUB_BRANCH = "release"; // All adobe-fonts repos publish from `release`.

/**
 * Derive candidate adobe-fonts repo names from a family name (e.g.,
 * "source-sans-pro" → ["source-sans", "source-sans-pro"]; "source-serif-pro" →
 * ["source-serif", "source-serif-pro"]). The order tries the stem-first form
 * (which is the actual repo) before the full-name form (in case of repos
 * named after the css_names family verbatim).
 */
function adobeGithubRepoCandidates(family: string): string[] {
  const f = family.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const stem = f.replace(/-pro$/, "");
  return Array.from(new Set([stem, f]));
}

/**
 * Extract the family stem from an adobe-fonts TTF directory listing. Files
 * in TTF/ are named like "<Stem>-<Weight>.ttf" (e.g., "SourceSans3-Regular.ttf"
 * in adobe-fonts/source-sans). We strip the trailing weight to get the stem.
 */
function extractAdobeFamilyStem(files: GhFile[]): string | null {
  // files are GhFile entries { name, download_url }.
  const names = files.map((f) => (typeof f === "string" ? f : f.name));
  const ttfs = names.filter((n) => /\.(ttf|otf)$/i.test(n));
  if (ttfs.length === 0) return null;
  const withoutExt = ttfs.map((n) => n.replace(/\.[a-z]+$/i, ""));
  const stems = withoutExt.map((n) => n.replace(/-[A-Z][A-Za-z]*$/, ""));
  return stems[0] || null;
}

/**
 * Pick the Regular (or first available) weight file for the family stem.
 */
function pickAdobeRegularFile(
  files: GhFile[],
  familyStem: string,
): GhFile | null {
  const candidates = files.filter((f) => {
    const name = typeof f === "string" ? f : f.name;
    return /\.(ttf|otf)$/i.test(name) && name.startsWith(familyStem + "-");
  });
  if (candidates.length === 0) return null;
  const regular = candidates.find((f) => {
    const name = typeof f === "string" ? f : f.name;
    return new RegExp(`^${familyStem}-Regular\\.(ttf|otf)$`, "i").test(name);
  });
  return regular || candidates[0];
}

/**
 * Open-source Adobe font bake: github.com/adobe-fonts mirror. Same algorithm
 * as familyToGithubUrl() (Contents API → pick best file → fetch raw).
 * Throws on miss (unknown family, deleted repo, typo) — caller adds to
 * failedFontNames → condition marked for skipBlock.
 */
async function fetchAdobeGithubBytes(fontName: string): Promise<FontBytes> {
  const repos = adobeGithubRepoCandidates(fontName);
  const tried: string[] = [];
  for (const repo of repos) {
    const apiUrl = `${ADOBE_GITHUB_API_BASE}/${repo}/contents/TTF`;
    try {
      const res = await fetch(apiUrl, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!res.ok) {
        tried.push(`${apiUrl} → HTTP ${res.status}`);
        continue;
      }
      const listing = await res.json();
      if (!Array.isArray(listing)) {
        tried.push(`${apiUrl} → non-array response`);
        continue;
      }
      const stem = extractAdobeFamilyStem(listing);
      if (!stem) {
        tried.push(`${apiUrl} → no ttf/otf files`);
        continue;
      }
      const pick = pickAdobeRegularFile(listing, stem);
      if (!pick?.download_url) {
        tried.push(`${apiUrl} → no Regular variant`);
        continue;
      }
      const fontResponse = await fetch(pick.download_url);
      if (!fontResponse.ok) {
        tried.push(`${pick.download_url} → HTTP ${fontResponse.status}`);
        continue;
      }
      const data = await fontResponse.arrayBuffer();
      return {
        bytes: new Uint8Array(data),
        extension: "ttf",
        subdir: repo,
      };
    } catch (e) {
      tried.push(`${apiUrl} → ${errorMessage(e)}`);
    }
  }
  throw new Error(
    `Adobe font "${fontName}" not found on github.com/adobe-fonts. ` +
      `Tried: ${tried.join("; ")}.`,
  );
}

/**
 * Dev-only fallback: register RAW (unbaked) adobe fonts from the
 * github.com/adobe-fonts open-source mirror, under the ORIGINAL family
 * name. Called from loadFonts when typekit.json is absent (local dev).
 * Production is unaffected — typekit.json exists there, so
 * WebFont.load({typekit}) registers the kit fonts and this is never called.
 *
 * This is a font-LOADING operation, not a bake: bytes are registered
 * unmodified, covering the no-settings control blocks so they render with
 * the right font in dev. Blocks WITH settings still go through bakeAllFonts.
 * Failures are logged (console.error) but do NOT skip the condition — the
 * control block would otherwise hit the pre-existing dev browser-fallback.
 *
 * @param {string[]} families  adobe family names used in the experiment
 * @returns {Promise<string[]>} families successfully registered
 */
export async function registerAdobeFontsFromGithubMirror(
  families: string[],
): Promise<string[]> {
  const registered: string[] = [];
  for (const family of families) {
    try {
      const { bytes, extension } = await fetchAdobeGithubBytes(family);
      await registerFontFace(family, bytes, extension);
      registered.push(family);
    } catch (err) {
      console.error(
        `[fontProcessor] adobe github-mirror registration failed for "${family}":`,
        errorMessage(err),
      );
    }
  }
  return registered;
}

/**
 * Parse the kit CSS (from use.typekit.net/<kitId>.css) and return the
 * @font-face src URL for the given family. Prefers woff2 over woff.
 *
 * Adobe's kit CSS format:
 *   @font-face {
 *     font-family: "<family>";
 *     src: url(<url>) format("woff2"), url(<fallback>) format("woff");
 *     ...
 *   }
 */
function parseAdobeFontUrl(css: string, familyName: string): string | null {
  // Find the @font-face block for the requested family. Adobe uses the
  // family name AS-IS (no normalization), so we match exact strings inside
  // double-quoted font-family declarations.
  const familyRegex = new RegExp(
    `@font-face\\s*{[^}]*font-family\\s*:\\s*"?${escapeRegex(
      familyName,
    )}"?[^}]*}`,
    "gs",
  );
  const blockMatch = css.match(familyRegex);
  if (!blockMatch) return null;
  const block = blockMatch[0];
  // Extract URL+format pairs in priority order. Prefer woff2.
  const woff2Match = block.match(/url\(([^)]+)\)\s*format\(["']woff2["']\)/i);
  if (woff2Match) return woff2Match[1].replace(/['"]/g, "");
  const woffMatch = block.match(/url\(([^)]+)\)\s*format\(["']woff["']\)/i);
  if (woffMatch) return woffMatch[1].replace(/['"]/g, "");
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Decide the file extension from a font name. Mirrors the WASM baker's
 * downstream needs: it accepts sfnt and a hint for the @font-face format
 * registration. WOFF/WOFF2 inputs are first converted to sfnt by the
 * baker; the extension we report here is the .ttf/.otf flavor.
 */
function declaredFontExtension(fontName: string): string {
  const m = fontName.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!m) return "ttf";
  const ext = m[1];
  if (ext === "otf") return "otf";
  if (ext === "ttf") return "ttf";
  if (ext === "ttc")
    throw new Error("TrueType Collections (.ttc) are not supported");
  // WOFF/WOFF2 get brotli/inflate-decompressed inside the baker, then
  // re-registered as sfnt. Report ttf so @font-face uses the right hint.
  return "ttf";
}

/**
 * Map a Google Fonts family name (+ optional axis settings) to a raw URL on
 * github.com/google/fonts. Lists the family directory via the github
 * Contents API, picks the variable font if present (subsumes statics; the
 * baker instances it), else `<Family>-Regular.ttf`, else any Regular, else
 * the first ttf/otf. Throws on miss (e.g., unknown family, deleted family,
 * typo).
 *
 * Why not a static mapping (e.g., always `ofl/<dir>/<Family>.ttf`)?
 * Several families — Inter, Roboto Flex, Recursive — no longer ship a
 * static TTF on github/fonts; only the variable file exists. Hardcoding
 * the static path would 404 for those families. The github Contents API
 * is CORS-open (`Access-Control-Allow-Origin: *`) and returns the actual
 * files in the family directory.
 *
 * @param {string} fontName  family name as used in the EasyEyes font column
 * @param {typeof fetch} [doFetch]  override (tests); defaults to global fetch
 * @returns {Promise<{url: string, file: string, subdir: string}>}
 */
const GITHUB_API_BASE = "https://api.github.com/repos/google/fonts/contents";
const GITHUB_LICENSE_DIRS = ["ofl", "apache", "ufl"];

/** Repo directory name for a family: lowercase, alphanumerics only. Pure. */
const githubDir = (family: string): string =>
  family
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Pick the best font FILE from a github dir listing. Pure.
 * Priority: variable upright > variable italic > static upright > static
 * italic > first ttf/otf. Non-italic is preferred because some families
 * (Inter, Roboto Flex) ship both, and the github API returns them
 * alphabetically — Inter-Italic[...].ttf sorts before Inter[...].ttf, so
 * without this we'd bake every Inter as italic.
 */
const pickFontFile = (files: GhFile[], family: string): GhFile | null => {
  const candidates = files.filter(
    (f) => /\.(ttf|otf)$/i.test(f.name) && f.download_url,
  );
  if (candidates.length === 0) return null;
  const fam = family
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const isItalic = (name: string) => /italic/i.test(name);
  const isVariable = (name: string) =>
    /variablefont/i.test(name) || /\[[^\]]+\]\.(ttf|otf)$/i.test(name);
  const isRegular = (name: string) =>
    /-regular\.(ttf|otf)$/i.test(name) ||
    new RegExp(`^${fam}-regular\\.(ttf|otf)$`, "i").test(name);
  return (
    candidates.find((f) => isVariable(f.name) && !isItalic(f.name)) ??
    candidates.find((f) => isVariable(f.name)) ??
    candidates.find((f) => isRegular(f.name) && !isItalic(f.name)) ??
    candidates.find((f) => isRegular(f.name)) ??
    candidates.find((f) => /regular/i.test(f.name) && !isItalic(f.name)) ??
    candidates.find((f) => /regular/i.test(f.name)) ??
    candidates[0]
  );
};

async function familyToGithubUrl(
  fontName: string,
  doFetch: typeof fetch = globalThis.fetch,
): Promise<{ url: string; file: string; subdir: string }> {
  const dir = githubDir(fontName);
  const tried: string[] = [];
  for (const sub of GITHUB_LICENSE_DIRS) {
    const apiUrl = `${GITHUB_API_BASE}/${sub}/${dir}`;
    try {
      const res = await doFetch(apiUrl, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!res.ok) {
        tried.push(`${apiUrl} \u2192 HTTP ${res.status}`);
        continue;
      }
      const listing = await res.json();
      if (!Array.isArray(listing)) {
        tried.push(`${apiUrl} \u2192 non-array response`);
        continue;
      }
      const pick = pickFontFile(listing, fontName);
      if (pick?.download_url) {
        return { url: pick.download_url, file: pick.name, subdir: sub };
      }
      tried.push(`${apiUrl} \u2192 no ttf/otf file in directory`);
    } catch (e) {
      tried.push(`${apiUrl} \u2192 ${errorMessage(e)}`);
    }
  }
  throw new Error(
    `Google font "${fontName}" not found on github.com/google/fonts. ` +
      `Tried: ${tried.join("; ")}.`,
  );
}

/**
 * Eager pre-bake for ALL conditions in the experiment.
 *
 * Algorithm:
 *   1. collectFontVariations(reader) → all (font, settings) tuples.
 *   2. Dedupe by (family, var, ss, features) — the same key used by
 *      getProcessedFontName, so the legacy lookup path stays consistent.
 *   3. PARALLEL fetch bytes per variation (await Promise.all).
 *   4. SERIAL WASM bake (one at a time) — avoids WASM linear-memory
 *      contention; the Rust module is not thread-safe across calls.
 *   5. Register each baked FontFace in document.fonts.
 *   6. Failed variations land in failedFontNames (consumed by
 *      setFontGlobalState → skipTrial()).
 *
 * Returns { baked: <number>, failed: <number>, failedNames: string[] }
 * so the caller can show progress / loud-error UI.
 *
 * Errors are LOUD — we never silently fall back to sans-serif. A failed
 * font means its conditions will be skipped at runtime.
 */
export async function bakeAllFonts(
  reader: FontParamReader,
): Promise<{ baked: number; failed: number; failedNames: string[] }> {
  fontInstancingTimesMs = [];
  failedFontNames.clear();

  const variations = collectFontVariations(reader);
  if (variations.length === 0) {
    // No font settings anywhere → nothing to bake. Return BEFORE initWasm()
    // so the majority of experiments (which never set fontFeatureSettings /
    // fontVariableSettings / fontStylisticSets) don't pay the ~6.6MB WASM
    // module load. Zero side effects for non-users.
    return { baked: 0, failed: 0, failedNames: [] };
  }

  await initWasm();

  // Dedupe by the cache key (family|var|ss|features). The first
  // variation that produces a baked FontFace satisfies every condition
  // that requested the same combination.
  const seen = new Map();
  const uniqueVariations = [];
  for (const v of variations) {
    const key = `${v.fontName}|${v.variableSettings || ""}|${
      v.stylisticSets || ""
    }|${v.featureSettings || ""}`;
    if (seen.has(key)) continue;
    seen.set(key, true);
    uniqueVariations.push({ variation: v, key });
  }

  let baked = 0;
  let failed = 0;
  const failedNames = [];

  for (const { variation, key } of uniqueVariations) {
    const instanceStart = performance.now();
    try {
      const { bytes, extension } = await fetchVariationBytes(variation);
      const processedFontName = generateProcessedFontName(
        variation.fontName,
        variation.variableSettings,
        variation.stylisticSets,
        variation.featureSettings,
      );
      const processedBytes = await processFont(
        bytes,
        variation.variableSettings,
        variation.stylisticSets,
        variation.featureSettings,
      );
      // The WASM baker returns raw sfnt (processed bytes). The source
      // `extension` describes the INPUT container (woff2 for Adobe,
      // ttf/otf for file). Browsers need the sfnt-format hint for the
      // FontFace, so normalize woff/woff2 input extensions to ttf.
      const sfntFormat = /woff2?/i.test(extension) ? "ttf" : extension;
      await registerFontFace(processedFontName, processedBytes, sfntFormat);
      fontInstanceMap.set(key, processedFontName);
      baked++;
      fontInstancingTimesMs.push(performance.now() - instanceStart);
    } catch (err) {
      console.error(
        `[fontProcessor] eager pre-bake failed for "${variation.fontName}":`,
        errorMessage(err),
      );
      failedFontNames.add(variation.fontName);
      failed++;
      failedNames.push(variation.fontName);
    }
  }

  return { baked, failed, failedNames };
}

/**
 * Returns the set of font family names whose eager pre-bake failed.
 * Consumed by setFontGlobalState in components/fonts.js to mark the
 * matching condition for skipTrial() before trial 1 begins.
 */
export function getFailedFontNames(): Set<string> {
  return failedFontNames;
}

/**
 * Test-only seam: lets unit tests reset the bake state between cases
 * without re-importing the module. Not used in production code.
 */
export function _resetBakeStateForTests(): void {
  fontInstanceMap.clear();
  failedFontNames.clear();
  fontInstancingTimesMs = [];
  // Reset the WASM module handle so tests can assert initWasm() is (or is
  // not) called — otherwise the `if (wasmModule) return` guard masks the
  // call position once any prior test has initialized it.
  wasmModule = null;
}

/** Process fonts: apply variable instancing and/or stylistic sets */
export async function generateFontInstances(
  variations: FontVariation[],
): Promise<number | undefined> {
  if (!variations?.length) return;

  // Reset timing array for this run
  fontInstancingTimesMs = [];

  let successCount = 0;
  const totalStart = performance.now();

  for (const variation of variations) {
    const {
      fontName,
      originalFontName,
      variableSettings,
      stylisticSets,
      featureSettings,
      fontPath,
      fontSource,
    } = variation;
    const instanceStart = performance.now();

    try {
      let fontData, format;
      const processedFontName = generateProcessedFontName(
        fontName,
        variableSettings,
        stylisticSets,
        featureSettings,
      );

      if (fontSource === "google") {
        // Google Fonts: fetch font, then process with WASM
        if (!wasmModule) await initWasm();
        const result = await loadGoogleFontFile(fontName, variableSettings);
        if (!result) continue;
        const processedData = await processFont(
          result.data,
          variableSettings,
          stylisticSets,
          featureSettings,
        );
        // Processed output is raw sfnt, not woff2 — register with correct format.
        await registerFontFace(processedFontName, processedData, "ttf");
      } else if (fontSource === "file") {
        // File fonts: use WASM to process locally
        if (!wasmModule) await initWasm();
        fontData = await loadFontFile(fontPath!);
        format = (originalFontName.split(".").pop() || "woff2").replace(
          /woff2?/i,
          "ttf",
        );
        const processedData = await processFont(
          fontData,
          variableSettings,
          stylisticSets,
          featureSettings,
        );
        await registerFontFace(processedFontName, processedData, format);
      }

      // Create lookup key including both settings
      const lookupKey = `${fontName}|${variableSettings || ""}|${
        stylisticSets || ""
      }|${featureSettings || ""}`;
      fontInstanceMap.set(lookupKey, processedFontName);
      successCount++;

      const elapsed = performance.now() - instanceStart;
      fontInstancingTimesMs.push(elapsed);
    } catch (error) {
      console.error(
        `Font processing failed for ${fontName}:`,
        errorMessage(error),
      );
    }
  }

  return successCount;
}

/**
 * Get the times taken to instance each font (in milliseconds)
 * Returns null if fonts haven't been instanced yet
 * @returns {number[]|null} Array of times in milliseconds or null
 */
export function getFontInstancingTimesMs(): number[] | null {
  return fontInstancingTimesMs.length > 0 ? fontInstancingTimesMs : null;
}

/**
 * Get the total time taken to instance all fonts (in milliseconds)
 * Returns null if fonts haven't been instanced yet
 * @returns {number|null} Total time in milliseconds or null
 */
export function getFontInstancingTotalTimeMs(): number | null {
  if (fontInstancingTimesMs.length === 0) return null;
  return fontInstancingTimesMs.reduce((sum, time) => sum + time, 0);
}

/**
 * Convert fontWeight to fontVariableSettings format
 * @param {number|string} fontWeight - The font weight value
 * @returns {string} The variableSettings string (e.g., '"wght" 625')
 */
export function fontWeightToVariableSettings(
  fontWeight: number | string,
): string {
  if (fontWeight === "" || fontWeight === undefined || fontWeight === null) {
    return "";
  }
  const weight = Number(fontWeight);
  if (isNaN(weight)) return "";
  return `"wght" ${weight}`;
}

/**
 * Combine fontVariableSettings with fontWeight (converted to wght axis)
 * fontWeight is only used if fontVariableSettings doesn't already contain "wght"
 * @param {string} variableSettings - Existing fontVariableSettings
 * @param {number|string} fontWeight - The font weight value
 * @returns {string} Combined variableSettings string
 */
export function combineVariableSettingsWithWeight(
  variableSettings: string,
  fontWeight: number | string,
): string {
  const trimmedSettings = variableSettings?.trim() || "";
  const weightSettings = fontWeightToVariableSettings(fontWeight);

  // If no weight setting, return original
  if (!weightSettings) return trimmedSettings;

  // If no existing settings, use weight setting
  if (!trimmedSettings) return weightSettings;

  // Check if wght is already in variableSettings (compiler should prevent this)
  const hasWght = trimmedSettings
    .toLowerCase()
    .replace(/["']/g, "")
    .includes("wght");
  if (hasWght) return trimmedSettings;

  // Combine: append weight to existing settings
  return `${trimmedSettings}, ${weightSettings}`;
}

/**
 * Collect all font variations requiring WASM processing from the parameter reader
 * @param {Object} reader - The parameter reader
 * @returns {Array} Array of font variation objects
 */
export function collectFontVariations(
  reader: FontParamReader,
): FontVariation[] {
  const variations: FontVariation[] = [];
  const blockCount = reader.blockCount;

  for (let blockIndex = 1; blockIndex <= blockCount; blockIndex++) {
    const conditionEnabledBools = reader.read(
      "conditionEnabledBool",
      blockIndex,
    );
    const conditionTrialsArr = reader.read("conditionTrials", blockIndex);
    const fontSources = reader.read("fontSource", blockIndex);
    const fontNames = reader.read("font", blockIndex);
    const variableSettingsArray = reader.read(
      "fontVariableSettings",
      blockIndex,
    );
    const fontWeightArray = reader.read("fontWeight", blockIndex);
    const stylisticSetsArray = reader.read("fontStylisticSets", blockIndex);
    const featureSettingsArray = reader.read("fontFeatureSettings", blockIndex);
    const variantLigaturesArray = reader.read(
      "fontVariantLigatures",
      blockIndex,
    );

    for (
      let conditionIndex = 0;
      conditionIndex < conditionEnabledBools.length;
      conditionIndex++
    ) {
      const conditionEnabledBool = conditionEnabledBools[conditionIndex];
      const fontSource = fontSources[conditionIndex];
      const fontName = fontNames[conditionIndex];
      const rawVariableSettings = variableSettingsArray[conditionIndex] || "";
      const fontWeight = fontWeightArray[conditionIndex];

      // Combine fontVariableSettings with fontWeight
      const variableSettings = combineVariableSettingsWithWeight(
        rawVariableSettings,
        fontWeight,
      );

      // Handle stylistic sets - normalize to comma-separated string
      // (multicategorical may return array)
      const stylisticSetsRaw = stylisticSetsArray?.[conditionIndex] || "";
      const stylisticSets = Array.isArray(stylisticSetsRaw)
        ? stylisticSetsRaw.join(", ")
        : String(stylisticSetsRaw);
      const featureSettingsRaw = String(
        featureSettingsArray?.[conditionIndex] || "",
      );
      // Union fontFeatureSettings with translated fontVariantLigatures
      // keywords (CSS-only; canvas needs the bake). The merged string is
      // both the bake input and the cache key, so the eager pre-bake key
      // matches the setFontGlobalState lookup key.
      const featureSettings = mergeLigatureFeatureSettings(
        featureSettingsRaw,
        variantLigaturesArray?.[conditionIndex] || "",
      );

      if (!conditionEnabledBool || conditionTrialsArr[conditionIndex] <= 0)
        continue;

      // Emit a variation ONLY when settings are present (variable /
      // stylistic / feature). Most experiments don't set these — those
      // blocks use the standard loadFonts path (WebFont.load for
      // google|adobe, addCSSFontFace for file). The bake pipeline is
      // a niche operation, not the default.
      const needsProcessing =
        variableSettings.trim() ||
        stylisticSets.trim() ||
        featureSettings.trim();

      if (
        (fontSource === "file" ||
          fontSource === "google" ||
          fontSource === "adobe") &&
        needsProcessing
      ) {
        const fontPath = fontSource === "file" ? `fonts/${fontName}` : null;

        variations.push({
          fontName: cleanFontName(fontName),
          originalFontName: fontName,
          variableSettings: variableSettings.trim(),
          stylisticSets: stylisticSets.trim(),
          featureSettings: featureSettings.trim(),
          fontPath,
          fontSource,
          blockIndex,
          conditionIndex: conditionIndex + 1,
        });
      }
    }
  }

  return variations;
}

export function getProcessedFontName(
  fontName: string,
  variableSettings: string,
  stylisticSets: string,
  featureSettings: string,
): string | null {
  const varSettings = variableSettings?.trim() || "";
  const ssSettings = stylisticSets?.trim() || "";
  const featSettings = featureSettings?.trim() || "";

  // No processing needed if no setting is provided
  if (!varSettings && !ssSettings && !featSettings) return null;

  const key = `${fontName}|${varSettings}|${ssSettings}|${featSettings}`;
  return fontInstanceMap.get(key) || null;
}

// Backwards compatibility alias
export const getInstancedFontName = (
  fontName: string,
  variableSettings: string,
): string | null => getProcessedFontName(fontName, variableSettings, "", "");
