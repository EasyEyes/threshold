/**
 * Terminal formatting for `npm run examples` output.
 * The compiler's error messages contain HTML meant for the web page
 * (<span class="error-parameter">, <br/>, <ul><li>, <b>, …); the CLI must
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
  it("strips error-parameter spans, colorizing the parameter name", () => {
    const out = htmlToTerminal(
      'A valid <span class="error-parameter">block</span> value must be provided.',
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

  it("converts red styled spans to red text, marking empty ones", () => {
    expect(htmlToTerminal('<span style="color: #e02401;">bad</span>', C)).toBe(
      color.red("bad", C),
    );
    // empty span marks a position — keep a visible marker
    const out = htmlToTerminal('1,2,<span style="color: #e02401;"></span>,', C);
    expect(out).not.toContain("<span");
    expect(out).toContain(color.red("◆", C));
  });

  it("strips unknown tags and decodes entities", () => {
    expect(htmlToTerminal("<div>a &amp; b &lt;ok&gt;</div>", C)).toBe(
      "a & b <ok>",
    );
  });

  it("produces plain text when colors are disabled", () => {
    const out = htmlToTerminal(
      'A valid <span class="error-parameter">block</span> <b>value</b>.',
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
