/**
 * Terminal formatting for `npm run examples` output.
 * The compiler's error messages contain HTML meant for the web page
 * (<span class="alert-parameter">, <br/>, <ul><li>, <b>, …); the CLI must
 * render them as ANSI-colored plain text instead of literal tags.
 *
 * @jest-environment node
 */

import {
  htmlToTerminal,
  color,
  colorsEnabledByDefault,
} from "../examples/terminalFormat";

const C = true; // force colors on

describe("htmlToTerminal", () => {
  it("strips alert-parameter spans, colorizing the parameter name", () => {
    const out = htmlToTerminal(
      'A valid <span class="alert-parameter">block</span> value must be provided.',
      C,
    );
    expect(out).not.toContain("<span");
    expect(out).not.toContain("</span>");
    expect(out).toContain("block");
    // parameter name is wrapped in ANSI
    expect(out).toBe(
      `A valid ${color.boldYellow("block", C)} value must be provided.`,
    );
  });

  it("converts <br/> to newlines", () => {
    expect(htmlToTerminal("one<br/>two<br>three", C)).toBe("one\ntwo\nthree");
  });

  it("converts <ul><li> to bullet lines", () => {
    const out = htmlToTerminal(
      "files: <br/><ul><li>a.txt</li><li>b.txt</li></ul>",
      C,
    );
    expect(out).toBe("files: \n  • a.txt\n  • b.txt");
  });

  it("converts <b> to bold", () => {
    expect(htmlToTerminal("Use the <b>Select file</b> button.", C)).toBe(
      `Use the ${color.bold("Select file", C)} button.`,
    );
  });

  it("distinguishes alert-value code from parameter names", () => {
    expect(
      htmlToTerminal('Use <code class="alert-value">Chrome Mobile</code>.', C),
    ).toBe(`Use ${color.boldCyan("Chrome Mobile", C)}.`);
    expect(
      htmlToTerminal(
        'Use <code class="alert-value">Chrome Mobile</code>.',
        false,
      ),
    ).toBe("Use Chrome Mobile.");
  });

  it("converts invalid spans to red text, marking empty ones", () => {
    expect(htmlToTerminal('<span class="alert-invalid">bad</span>', C)).toBe(
      color.red("bad", C),
    );
    // empty span marks a position — keep a visible marker
    const out = htmlToTerminal('1,2,<span class="alert-invalid"></span>,', C);
    expect(out).not.toContain("<span");
    expect(out).toContain(color.red("◆", C));
  });

  it("renders diff-colored suggestions: bold green additions, bold struck deletions", () => {
    // The suggestion token from "Parameter is unrecognized": shared part in
    // alert-parameter bold-yellow, deletion bold red+strikethrough, insertion
    // bold green — same weight as the surrounding name.
    const html =
      "The closest supported parameter is " +
      '<span class="alert-parameter">targe</span>' +
      '<span class="alert-deleted">r</span>' +
      '<span class="alert-inserted">t</span>' +
      '<span class="alert-parameter">Kind</span>.';
    expect(htmlToTerminal(html, C)).toBe(
      `The closest supported parameter is ${color.boldYellow("targe", C)}` +
        `${C ? "\u001b[1;31;9mr\u001b[0m" : "r"}` +
        `${C ? "\u001b[1;32mt\u001b[0m" : "t"}` +
        `${color.boldYellow("Kind", C)}.`,
    );
  });

  it("strips unknown tags and decodes entities", () => {
    expect(htmlToTerminal("<div>a &amp; b &lt;ok&gt;</div>", C)).toBe(
      "a & b <ok>",
    );
  });

  it("produces plain text when colors are disabled", () => {
    const out = htmlToTerminal(
      'A valid <span class="alert-parameter">block</span> <b>value</b>.',
      false,
    );
    expect(out).toBe("A valid block value.");
    // eslint-disable-next-line no-control-regex
    expect(out).not.toMatch(/\x1b\[/);
  });
});

describe("colorsEnabledByDefault", () => {
  it("is false when NO_COLOR is set", () => {
    const old = process.env.NO_COLOR;
    process.env.NO_COLOR = "1";
    expect(colorsEnabledByDefault()).toBe(false);
    if (old === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = old;
  });
});

it("preserves semantic diagnostic colors and plain text", () => {
  const html =
    '<span class="alert-deleted">old</span><span class="alert-inserted">new</span><span class="alert-invalid">bad</span>';
  expect(htmlToTerminal(html, false)).toBe("oldnewbad");
  expect(htmlToTerminal(html, true)).toContain("\x1b[");
  expect(htmlToTerminal(html, true)).not.toBe("oldnewbad");
});
