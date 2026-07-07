/**
 * Helper for the `fontTextRendering` parameter (categorical:
 * auto | optimizeLegibility | geometricPrecision; glossary default "" →
 * conceptually "auto"). `ctx.textRendering` is a standard
 * `CanvasRenderingContext2D` property, so — unlike `fontFeatureSettings` /
 * `fontVariantLigatures` (CSS-only) — this param reaches the canvas stimulus
 * directly via `applyTextRenderingAcrossResizes`. See
 * notes/PLAN-opentype-params-nastaliq.md §6.
 *
 * `readFontTextRendering` is the single read chokepoint: it normalizes
 * paramReader's return shape (array for a numeric block, scalar for a condition
 * string) and defaults blank/missing to "auto" (the browser/canvas default), so
 * every downstream consumer sees a concrete value.
 */

/**
 * Read fontTextRendering from the experiment.
 * @param {object} reader - a ParamReader (or anything with a `.read(name, bc)`)
 * @param {string|number} blockOrCondition
 * @returns {string} one of "auto" | "optimizeLegibility" | "geometricPrecision"
 *   (or whatever categorical value was set), defaulting to "auto" when blank.
 */
export const readFontTextRendering = (reader, blockOrCondition) => {
  const raw = reader.read("fontTextRendering", blockOrCondition);
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value === null || value === "") return "auto";
  return String(value);
};
