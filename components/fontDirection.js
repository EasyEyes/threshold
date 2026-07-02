/**
 * Helpers for the `fontDirection` parameter (categorical: ltr, rtl, vertical-rl,
 * vertical-lr), which replaces the boolean `fontLeftToRightBool`.
 *
 * `isFontLTR` reproduces the OLD `fontLeftToRightBool` semantics exactly for the
 * horizontal cases (ltr→true, rtl→false), so every legacy `bool ? A : B` becomes
 * `isFontLTR(dir) ? A : B` with identical behavior. The "left vs right" decision
 * is about the START EDGE: ltr and vertical-lr start on the left; rtl and
 * vertical-rl start on the right.
 *
 * Vertical layout (writing-mode) is NOT yet implemented — vertical-* values get
 * a horizontal fallback here and in `fontDirectionToDirAttr` (HTML `dir` /
 * canvas `ctx.direction` have no vertical mode). See
 * notes/PLAN-fontDirection-replaces-fontLeftToRightBool.md.
 */

// Directions whose start edge is on the RIGHT (→ mirrors old fontLeftToRightBool=FALSE).
const RTL_DIRECTIONS = new Set(["rtl", "vertical-rl"]);

/**
 * Read fontDirection from the experiment, normalizing paramReader's return
 * shape (array for a numeric block, scalar for a condition string) and
 * defaulting to "ltr" (the glossary default) when blank/missing.
 *
 * Case-insensitivity (per the glossary / Denis's request): the HORIZONTAL
 * values accept upper, lower, or mixed case — rtl≈RTL≈Rtl, ltr≈LTR≈Ltr. The
 * vertical-* values stay lowercase-only (vertical-rl, vertical-lr) and are
 * passed through unchanged, so an unknown capitalization surfaces as a
 * categorical-validation error rather than being silently reinterpreted.
 *
 * Normalization happens here (the single read chokepoint) so every downstream
 * consumer (isFontLTR, fontDirectionToDirAttr) sees the canonical lowercase.
 * @param {object} reader - a ParamReader (or anything with a `.read(name, bc)`)
 * @param {string|number} blockOrCondition
 * @returns {string} one of the fontDirection categories, default "ltr"
 */
export const readFontDirection = (reader, blockOrCondition) => {
  const raw = reader.read("fontDirection", blockOrCondition);
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || value === "") return "ltr";
  // Lowercase ONLY the two horizontal values (case-insensitive per the
  // glossary: rtl≈RTL≈Rtl, ltr≈LTR≈Ltr). Leave everything else — including
  // vertical-rl / vertical-lr, which are lowercase-only — untouched, so an
  // unknown capitalization surfaces as a categorical-validation error
  // rather than being silently reinterpreted.
  const lower = String(value).toLowerCase();
  if (lower === "rtl" || lower === "ltr") return lower;
  return String(value);
};

/**
 * Map a fontDirection to the old boolean left-to-right semantics.
 * ltr / vertical-lr → true; rtl / vertical-rl → false.
 * @param {string} direction
 * @returns {boolean}
 */
export const isFontLTR = (direction) => !RTL_DIRECTIONS.has(direction);

/**
 * Map a fontDirection to an HTML `dir` attribute value (ltr|rtl). Only `rtl`
 * yields "rtl"; ltr and both vertical-* yield "ltr" (no vertical dir mode).
 * @param {string} direction
 * @returns {"ltr"|"rtl"}
 */
export const fontDirectionToDirAttr = (direction) =>
  direction === "rtl" ? "rtl" : "ltr";
