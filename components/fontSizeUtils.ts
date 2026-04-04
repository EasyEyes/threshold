/**
 * Binary-search for the largest font size (px) at which `text` fits within
 * the given pixel dimensions, allowing word-wrap.
 *
 * @param {string} text - The text to measure
 * @param {number} widthPx - Available width in pixels
 * @param {number} heightPx - Available height in pixels
 * @param {string} fontFamily - CSS font-family string
 * @param {number} lineHeight - CSS line-height (unitless multiplier, default 1.2)
 * @returns {number} Largest font size in whole pixels that fits
 */

export const getMaxPossibleFontSize = (
  text: string,
  widthPx: number,
  heightPx: number,
  fontFamily: string,
  lineHeight = 1.2,
  fontWeight = "normal",
): number => {
  const testDiv = document.createElement("div");
  testDiv.style.position = "absolute";
  testDiv.style.visibility = "hidden";
  testDiv.style.width = `${widthPx}px`;
  testDiv.style.fontFamily = fontFamily;
  testDiv.style.lineHeight = String(lineHeight);
  testDiv.style.fontWeight = fontWeight;
  testDiv.style.whiteSpace = "pre-wrap";
  testDiv.style.wordBreak = "normal";
  testDiv.style.overflow = "hidden";
  testDiv.style.padding = "0";
  testDiv.style.margin = "0";
  testDiv.textContent = text;
  document.body.appendChild(testDiv);

  let low = 1;
  let high = 200;
  let bestFit = low;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    testDiv.style.fontSize = `${mid}px`;
    const fits =
      testDiv.scrollHeight <= heightPx &&
      testDiv.scrollWidth <= Math.ceil(widthPx);

    if (fits) {
      bestFit = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  document.body.removeChild(testDiv);
  return bestFit;
};

/**
 * Find the largest shared font size for a set of buttons by trying n=1..4
 * virtual line-counts (effective width = clientWidth/n). Picks the n where
 * the minimum font size across all buttons is maximised, then applies that
 * font size and—when n>1—wraps each button's text in a constrained <span>
 * so the browser's own text engine (including CJK) performs the line breaks.
 *
 * @param {HTMLElement[]} buttons - Buttons that must share one font size
 * @param {number} lineHeight - CSS line-height multiplier (default 1.15)
 */
export const getOptimalSharedFontSize = (
  buttons: HTMLElement[],
  lineHeight = 1.15,
): void => {
  if (buttons.length === 0) return;

  // WCAG 2.1 defines "large text" as ≥18pt (24px) normal or ≥14pt (≈19px) bold.
  // 24px is a widely-cited accessible upper bound for body/button text.
  const MAX_FONT_PX = 24;

  let bestFontSize = 0;
  let bestN = 1;

  for (let n = 1; n <= 4; n++) {
    const sizes = buttons.map((b) => {
      const span = b.querySelector(".btn-text") as HTMLElement | null;
      const text = span?.textContent ?? b.textContent ?? "";
      const style = getComputedStyle(b);
      const hPad =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      return getMaxPossibleFontSize(
        text,
        (b.clientWidth - hPad) / n, // subtract padding so test div matches actual text area
        b.clientWidth, // target square-ish buttons; clientHeight is too small (auto-sized to one line)
        style.fontFamily,
        lineHeight,
        style.fontWeight,
      );
    });
    const minSize = Math.min(Math.min(...sizes), MAX_FONT_PX);
    if (minSize > bestFontSize) {
      bestFontSize = minSize;
      bestN = n;
    }
  }

  // Capture widths before applying font (applying a larger font would cause buttons to expand)
  const preWidths = buttons.map((b) => b.clientWidth);

  buttons.forEach((b, i) => {
    b.style.width = `${preWidths[i]}px`; // lock width so larger font doesn't expand the button
    b.style.fontSize = `${bestFontSize}px`;
    if (bestN > 1) {
      let span = b.querySelector(".btn-text") as HTMLElement | null;
      if (!span) {
        span = document.createElement("span");
        span.className = "btn-text";
        span.style.display = "block";
        span.style.setProperty("text-wrap", "balance");
        span.textContent = b.textContent;
        b.textContent = "";
        b.appendChild(span);
      }
      span.style.maxWidth = `${Math.floor(preWidths[i] / bestN)}px`;
    }
  });

  // Post-hoc: verify no element overflows in actual DOM (handles sub-pixel/browser differences)
  while (bestFontSize > 1) {
    const overflows = buttons.some((b) => {
      const span = b.querySelector(".btn-text") as HTMLElement | null;
      const el: HTMLElement = span ?? b;
      return (
        el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight
      );
    });
    if (!overflows) break;
    bestFontSize -= 1;
    buttons.forEach((b) => {
      b.style.fontSize = `${bestFontSize}px`;
    });
  }
};
