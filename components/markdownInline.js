// Safe inline-markdown renderer for participant-facing UI strings.
//
// Uses the globally-loaded `marked` library (added via a <script> tag in
// index.html, the same one already used by the compatibility pages). It is
// intentionally defensive:
//   - Returns "" for null/undefined.
//   - Falls back to the raw string if `marked` is unavailable or throws, so it
//     can never break rendering.
//   - Uses parseInline (no <p> wrapping) and preserves newlines, so plain-text
//     and HTML-bearing phrases render exactly as before; only markdown syntax
//     (**bold**, *italic*, `code`, [link](url), ~~strike~~) is upgraded.

export const renderInlineMarkdown = (text) => {
  if (text === undefined || text === null) return "";
  const str = String(text);
  try {
    if (
      typeof marked !== "undefined" &&
      marked &&
      typeof marked.parseInline === "function"
    ) {
      // marked's inline lexer collapses a lone "\n"; protect newlines so the
      // previous innerHTML whitespace behaviour is preserved exactly.
      const NL = "\uE000";
      const html = marked.parseInline(str.split("\n").join(NL));
      return html.split(NL).join("\n");
    }
  } catch (_e) {
    /* fall through to raw text */
  }
  return str;
};
