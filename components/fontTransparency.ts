/**
 * fontTransparency — how transparent the font (text) is drawn.
 *
 * Glossary: fontTransparency (default 1, range 0 to 1) scales the "A" of
 * fontColorRGBA. With color A and fontTransparency a, the text is drawn with
 * effective transparency a*A, and each fully covered pixel shows
 *
 *   a*A * (R, G, B) + (1 - a*A) * background
 *
 * ("transparency" is the glossary's word; a larger value is MORE opaque.)
 *
 * fontTransparency affects only text. targetContrast is a separate
 * parameter that has no effect on text.
 *
 * thresholdParameter=fontTransparency hands the value to QUEST, which works
 * in log10 units: level = log10(fontTransparency).
 */
import { getGlossary } from "../parameters/glossaryRegistry";

const TRANSPARENCY_PARAM = "fontTransparency";

type Reader = { read: (name: string, blockCondition: string) => unknown };

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

// A compiled experiment runs against the glossary version it was compiled
// with, and reading a parameter that glossary lacks throws. Experiments
// compiled before fontTransparency existed must keep running unchanged.
const inGlossary = (name: string): boolean => {
  try {
    return name in getGlossary();
  } catch {
    return false;
  }
};

/**
 * The "A" of an "R, G, B, A" color cell, clamped to 0…1. A color with no
 * fourth number, or one that isn't a number, is opaque.
 */
export const alphaOfColorRGBA = (colorRGBA: unknown): number => {
  const alpha = parseFloat(String(colorRGBA ?? "").split(",")[3]);
  return Number.isFinite(alpha) ? clamp01(alpha) : 1;
};

/**
 * The condition's fixed fontTransparency, clamped to 0…1. It is 1 (no
 * effect) when the experiment's glossary predates the parameter.
 */
export const readFontTransparency = (
  reader: Reader,
  blockCondition: string,
): number => {
  if (!inGlossary(TRANSPARENCY_PARAM)) return 1;
  const value = Number(reader.read(TRANSPARENCY_PARAM, blockCondition));
  return Number.isFinite(value) ? clamp01(value) : 1;
};

/** Is QUEST controlling this condition's fontTransparency? */
export const isFontTransparencyThreshold = (
  reader: Reader,
  blockCondition: string,
): boolean =>
  reader.read("thresholdParameter", blockCondition) === TRANSPARENCY_PARAM;

/**
 * QUEST's proposed level (log10 of fontTransparency), restricted to what
 * can be shown: transparency cannot exceed 1, so the level cannot exceed 0.
 * The returned level is the one to report back to QUEST. A non-finite
 * proposal is passed through for the trial-end guard to reject.
 */
export const constrainFontTransparencyLevel = (proposedLevel: number): number =>
  Math.min(proposedLevel, 0);

/**
 * Effective transparency of the text: fontTransparency times the "A" of
 * fontColorRGBA. This is the opacity to give the stim.
 */
export const getFontOpacity = (
  fontColorRGBA: unknown,
  fontTransparency: number,
): number =>
  alphaOfColorRGBA(fontColorRGBA) *
  (Number.isFinite(fontTransparency) ? clamp01(fontTransparency) : 1);
