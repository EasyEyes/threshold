/**
 * Blank-character utilities shared by parameter NAMES and VALUES.
 *
 * "Blank" = renders as at most a blank: whitespace or an invisible
 * character (zero-width formats, bidi controls, blank glyphs).
 *
 * One rule for both names and values: blanks at the ENDS are stripped
 * (never meaningful there); blanks elsewhere (interior, comma-adjacent)
 * are preserved — they make a genuinely different string — and are
 * surfaced by diagnostics that reveal each one as a red U+XXXX label:
 * names via "Parameter is unrecognized", values via the wrong-type hint.
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
export const stripBlankEnds = (s: string): string =>
  s.replace(LEADING, "").replace(TRAILING, "");

export const containsInvisibleCharacters = (name: string): boolean => {
  for (const ch of name) if (isHiddenBlank(ch)) return true;
  return false;
};

const codePointLabel = (ch: string): string =>
  "U+" + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");

/** Renders as (at most) a blank: whitespace or an invisible character. */
const isBlank = (ch: string): boolean =>
  /\s/u.test(ch) || INVISIBLE_CHARS.has(ch);

/**
 * Blank and not plain ASCII whitespace (NBSP, BOM, ZWSP, …): renders as
 * nothing at all, so diagnostics must spell it out as U+XXXX.
 */
export const isHiddenBlank = (ch: string): boolean =>
  isBlank(ch) && ch.codePointAt(0)! > 0x7f;

/** String with every blank/invisible character deleted. */
export const stripBlanks = (s: string): string =>
  [...s].filter((ch) => !isBlank(ch)).join("");

/** Plain text with each invisible character spelled out, e.g. "bloU+200Bck". */
export const revealInvisibleCharacters = (name: string): string =>
  name.replace(/./gu, (ch) => (isHiddenBlank(ch) ? codePointLabel(ch) : ch));

export { codePointLabel };

/**
 * HTML with each invisible character rendered as a visible red code-point
 * label, using the app's error red (#bb2c22 — AA on the error-card
 * background). Rendered red by htmlToTerminal.
 */
export const annotateInvisibleCharacters = (name: string): string =>
  name.replace(/./gu, (ch) =>
    isHiddenBlank(ch)
      ? `<span style="color: #bb2c22; font-weight: bold;">${codePointLabel(
          ch,
        )}</span>`
      : ch,
  );
