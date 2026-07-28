// Safe full-Markdown renderer for participant-facing UI strings.
//
// Uses the globally-loaded `marked` library (added via a <script> tag in
// index.html). Supports full Markdown (headings, lists, code, etc.) plus
// inline HTML. Defensive:
//   - Returns "" for null/undefined.
//   - Falls back to the raw string if `marked` is unavailable or throws.
//   - Strips synthetic <p> wrapping added by marked.parse() for single-block
//     plain text, so short strings like "OK" pass through unchanged.
//     User-supplied HTML blocks (no trailing \n) are never stripped.

export const renderMarkdown = (text, markedOptions = undefined) => {
  if (text === undefined || text === null) return "";
  const str = String(text);
  try {
    if (
      typeof marked !== "undefined" &&
      marked &&
      typeof marked.parse === "function"
    ) {
      const html = marked.parse(str, markedOptions);
      // marked.parse wraps single-block plain text in <p>...</p>\n.
      // User-supplied HTML blocks lack the trailing \n. Strip only the
      // synthetic wrapper — when there's a single <p> (no nested </p>).
      const match = html.match(/^<p>([\s\S]*)<\/p>\n$/);
      if (match && !match[1].includes("</p>")) return match[1];
      return html;
    }
  } catch (_e) {
    /* fall through to raw text */
  }
  return str;
};

// Renderer for HTMLTextStim instruction overlays. breaks:true preserves the
// line structure phrases rely on (\n-separated bullet lines, e.g.
// T_readingTask) — parity with the canvas TextStim these overlays replaced.
// The overlays use white-space: break-spaces, so marked's structural
// newlines (inter-tag joins, trailing \n) must be stripped — they would
// otherwise render as spurious blank lines.
export const renderInstructionMarkdown = (text) =>
  renderMarkdown(text, { breaks: true })
    .replace(/>\n+</g, "><")
    .replace(/\n+$/g, "");
