/**
 * Parameter-name normalization.
 *
 * Column-A parameter names are identifiers. Whitespace and invisible
 * characters (zero-width formats, bidi controls, blank glyphs) at their
 * edges are never meaningful, so normalization strips them from the ENDS
 * only. A hidden character inside a name makes it a genuinely different
 * identifier — stripping it would silently merge two names — so interiors
 * are left untouched and interior cases are surfaced by the
 * "Parameter is unrecognized" check with the hidden characters made
 * visible instead.
 */

// Characters that render as nothing (or as a blank) both in spreadsheets
// and in HTML. NBSP and BOM are already covered by JS \s, so they aren't
// listed here; listing BOM would be harmless.
const INVISIBLE_RANGES: [number, number][] = [
  [0x00ad, 0x00ad], // soft hyphen
  [0x034f, 0x034f], // combining grapheme joiner
  [0x180e, 0x180e], // Mongolian vowel separator
  [0x200b, 0x200f], // zero-width space/non-joiner/joiner, LRM, RLM
  [0x202a, 0x202e], // bidi embedding/override controls
  [0x2060, 0x2064], // word joiner, invisible times/separator/plus
  [0x2066, 0x2069], // bidi isolate controls
  [0x2800, 0x2800], // braille pattern blank
  [0x3164, 0x3164], // Hangul filler
  [0xfe00, 0xfe0f], // variation selectors
  [0xffa0, 0xffa0], // halfwidth Hangul filler
];

const INVISIBLE_CHARS = new Set<string>(
  INVISIBLE_RANGES.flatMap(([lo, hi]) =>
    Array.from({ length: hi - lo + 1 }, (_, i) => String.fromCodePoint(lo + i)),
  ),
);

// None of these are regex metacharacters, so joining into a class is safe.
const INVISIBLE_CLASS = [...INVISIBLE_CHARS].join("");
const LEADING = new RegExp(`^[\\s${INVISIBLE_CLASS}]+`, "u");
const TRAILING = new RegExp(`[${INVISIBLE_CLASS}\\s]+$`, "u");

/** Strip whitespace and invisible characters from both ends. Ends only. */
export const normalizeParameterName = (name: string): string =>
  name.replace(LEADING, "").replace(TRAILING, "");

export const containsInvisibleCharacters = (name: string): boolean => {
  for (const ch of name) if (INVISIBLE_CHARS.has(ch)) return true;
  return false;
};

const codePointLabel = (ch: string): string =>
  "U+" + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");

/** Plain text with each invisible character spelled out, e.g. "bloU+200Bck". */
export const revealInvisibleCharacters = (name: string): string =>
  name.replace(/./gu, (ch) =>
    INVISIBLE_CHARS.has(ch) ? codePointLabel(ch) : ch,
  );

/**
 * HTML with each invisible character rendered as a visible red code-point
 * label, using the app's error red (#bb2c22 — AA on the error-card
 * background). Rendered red by htmlToTerminal.
 */
export const annotateInvisibleCharacters = (name: string): string =>
  name.replace(/./gu, (ch) =>
    INVISIBLE_CHARS.has(ch)
      ? `<span style="color: #bb2c22; font-weight: bold;">${codePointLabel(
          ch,
        )}</span>`
      : ch,
  );
