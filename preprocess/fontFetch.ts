/**
 * Compile-time fetch of full (un-subsetted) font bytes for the font-content
 * validators (validateFontFeatureAnalysis, the variable-axis validator). The
 * runtime bake resolves the same sources in components/fontInstancing.js, but
 * that module also pulls in the WASM baker; these pure fetchers keep the
 * compiler lean.
 *
 * Sources:
 *   - google → github.com/google/fonts
 *   - adobe open-source (Source Sans/Serif/Code Pro) → github.com/adobe-fonts
 *   - adobe paid (Typekit-only) → use.typekit.net/<kitId>.css (the kit that
 *     processTypekitFonts already created + published during this compile)
 */

import { typekit } from "./global";

const GITHUB_API = "https://api.github.com/repos";

interface GhFile {
  name: string;
  download_url?: string;
}

async function listDir(apiUrl: string): Promise<GhFile[] | null> {
  try {
    const res = await fetch(apiUrl, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const listing = await res.json();
    return Array.isArray(listing) ? (listing as GhFile[]) : null;
  } catch {
    return null;
  }
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Pick a font file for analysis. Any full font works — a variable font
 * subsumes its statics, and italic shares GSUB with upright — so prefer
 * variable, then Regular, then the first ttf/otf.
 */
function pickFontFile(files: GhFile[]): GhFile | null {
  const ttfs = files.filter(
    (f) => /\.(ttf|otf)$/i.test(f.name) && f.download_url,
  );
  if (ttfs.length === 0) return null;
  return (
    ttfs.find((f) => /\[[^\]]+\]/.test(f.name)) ??
    ttfs.find((f) => /regular/i.test(f.name)) ??
    ttfs[0]
  );
}

/** github repo dir name for a google family: lowercase, alphanumerics only. */
const githubDir = (family: string) =>
  family
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Full google-font bytes from github.com/google/fonts, or null on miss. */
export async function fetchGoogleFontBytes(
  fontName: string,
): Promise<Uint8Array | null> {
  const dir = githubDir(fontName);
  for (const sub of ["ofl", "apache", "ufl"]) {
    const listing = await listDir(
      `${GITHUB_API}/google/fonts/contents/${sub}/${dir}`,
    );
    if (!listing) continue;
    const pick = pickFontFile(listing);
    if (!pick?.download_url) continue;
    const bytes = await fetchBytes(pick.download_url);
    if (bytes) return bytes;
  }
  return null;
}

/** Full adobe-open-source-font bytes from github.com/adobe-fonts, or null. */
export async function fetchAdobeOpenFontBytes(
  fontName: string,
): Promise<Uint8Array | null> {
  const f = fontName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  const stem = f.replace(/-pro$/, "");
  for (const repo of Array.from(new Set([stem, f]))) {
    const listing = await listDir(
      `${GITHUB_API}/adobe-fonts/${repo}/contents/TTF`,
    );
    if (!listing) continue;
    const pick = pickFontFile(listing);
    if (!pick?.download_url) continue;
    const bytes = await fetchBytes(pick.download_url);
    if (bytes) return bytes;
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse a kit CSS (use.typekit.net/<kitId>.css) for the @font-face src URL of
 * the given css_name. Prefers woff2 over woff. Mirrors the runtime parser in
 * components/fontInstancing.js.
 */
function parseAdobeFontUrl(css: string, cssName: string): string | null {
  const familyRegex = new RegExp(
    `@font-face\\s*{[^}]*font-family\\s*:\\s*"?${escapeRegex(cssName)}"?[^}]*}`,
    "gs",
  );
  const blockMatch = css.match(familyRegex);
  if (!blockMatch) return null;
  const block = blockMatch[0];
  const woff2 = block.match(/url\(([^)]+)\)\s*format\(["']woff2["']\)/i);
  if (woff2) return woff2[1].replace(/['"]/g, "");
  const woff = block.match(/url\(([^)]+)\)\s*format\(["']woff["']\)/i);
  if (woff) return woff[1].replace(/['"]/g, "");
  return null;
}

/**
 * Full adobe-font bytes for compile-time validation, github-first:
 *   1. github.com/adobe-fonts (open-source) — no kit-config needed.
 *   2. Typekit kit (paid) — processTypekitFonts created + published the kit
 *      earlier in this compile, populating typekit.kitId and the family →
 *      css_name map. Fetch the kit CSS, parse the family's woff2 URL.
 * Returns null if neither source yields bytes (caller skips that font).
 */
export async function fetchAdobeFontBytes(
  fontName: string,
): Promise<Uint8Array | null> {
  const gh = await fetchAdobeOpenFontBytes(fontName);
  if (gh) return gh;
  const kitId = typekit.kitId;
  if (!kitId) return null;
  const cssName = typekit.fonts.get(fontName) || fontName;
  try {
    const cssRes = await fetch(`https://use.typekit.net/${kitId}.css`);
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const url = parseAdobeFontUrl(css, cssName);
    if (!url) return null;
    return await fetchBytes(url);
  } catch {
    return null;
  }
}
