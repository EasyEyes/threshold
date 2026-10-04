export const getDevicePixelRatio = () => window.devicePixelRatio || 1;

export const getMaxNominalFontSizePx = (fontMaxPhysicalPx, fontPadding) =>
  fontMaxPhysicalPx / getDevicePixelRatio() / (1 + fontPadding);

export const getShrunkFontMaxPhysicalPx = (
  currentMaxPhysicalPx,
  fontMaxShrinkage,
  failedNominalFontSizePx,
) =>
  Math.min(
    currentMaxPhysicalPx,
    fontMaxShrinkage * getDevicePixelRatio() * failedNominalFontSizePx,
  );
