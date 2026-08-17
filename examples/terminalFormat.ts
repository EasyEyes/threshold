/**
 * Terminal formatting for `npm run examples` CLI output.
 *
 * Compiler error messages contain HTML meant for the web compiler page
 * (<span class="error-parameter">, <br/>, <ul><li>, <b>, styled spans).
 * htmlToTerminal renders those fragments as ANSI-colored plain text.
 * Colors are disabled when stdout is not a TTY or NO_COLOR is set.
 */

const ESC = "\x1b[";
const RESET = `${ESC}0m`;

const wrap =
  (code: string) =>
  (s: string, colors = colorsEnabledByDefault()): string =>
    colors ? `${ESC}${code}m${s}${RESET}` : s;

export const color = {
  bold: wrap("1"),
  dim: wrap("2"),
  red: wrap("31"),
  green: wrap("32"),
  yellow: wrap("33"),
  cyan: wrap("36"),
  magenta: wrap("35"),
  boldRed: wrap("1;31"),
  boldYellow: wrap("1;33"),
  boldCyan: wrap("1;36"),
  // git-diff suggestion colors: bold struck deletion, bold green insertion
  // (same weight as the surrounding error-parameter name)
  redStrike: wrap("1;31;9"),
  boldGreen: wrap("1;32"),
};

export const colorsEnabledByDefault = (): boolean =>
  Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

const decodeEntities = (s: string): string =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

/**
 * Render the compiler's HTML message fragments as terminal text.
 */
export const htmlToTerminal = (
  html: string,
  colors = colorsEnabledByDefault(),
): string => {
  let s = html;
  // Known semantic spans → colored text
  s = s.replace(/<span class="error-parameter">([\s\S]*?)<\/span>/g, (_m, p1) =>
    color.boldYellow(String(p1), colors),
  );
  // Red marker span (empty one marks a position in a list) → red text/marker.
  // Struck variant (diff deletions) must run first → bold red + strikethrough.
  // Property order in the style attribute varies, so match flexibly.
  s = s.replace(
    /<span style="[^"]*#bb2c22[^"]*line-through[^"]*">([\s\S]*?)<\/span>/g,
    (_m, p1) => color.redStrike(String(p1), colors),
  );
  s = s.replace(
    /<span style="[^"]*#bb2c22[^"]*">([\s\S]*?)<\/span>/g,
    (_m, p1) => color.red(String(p1) || "◆", colors),
  );
  // Green insertion span (git-diff suggestions) → bold green
  s = s.replace(
    /<span style="[^"]*#147133[^"]*">([\s\S]*?)<\/span>/g,
    (_m, p1) => color.boldGreen(String(p1), colors),
  );
  // Bold
  s = s.replace(/<b>([\s\S]*?)<\/b>/g, (_m, p1) =>
    color.bold(String(p1), colors),
  );
  // Line breaks and lists
  s = s.replace(/<br\s*\/?>/g, "\n");
  s = s.replace(/<\/?ul>/g, "");
  s = s.replace(/<li>/g, "\n  • ");
  s = s.replace(/<\/li>/g, "");
  // <br/><ul><li> would otherwise leave a blank line before the first bullet
  s = s.replace(/\n\n(?=  \u2022 )/g, "\n");
  // Strip any remaining tags
  s = s.replace(/<\/?[a-zA-Z][^>]*>/g, "");
  return decodeEntities(s);
};
