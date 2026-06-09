/**
 * @jest-environment jsdom
 *
 * Integration tests: verify renderMarkdown output produces correct
 * DOM structure when assigned to innerHTML.
 *
 * Same zero-mock setup — real marked@4.0.7 via global.
 */
import { marked } from "marked";
import { renderMarkdown } from "../components/markdownInline.js";

beforeAll(() => {
  (globalThis as any).marked = marked;
});

describe("renderMarkdown → DOM", () => {
  test("<br> creates a BR element node, not literal text", () => {
    const div = document.createElement("div");
    div.innerHTML = renderMarkdown("Check compatibility<br>Tests passed");
    expect(div.querySelector("br")).not.toBeNull();
    expect(div.textContent).not.toContain("<br>");
    expect(div.textContent).toContain("Tests passed");
  });

  test("**bold** creates <strong> element in DOM", () => {
    const div = document.createElement("div");
    div.innerHTML = renderMarkdown("Hello **world**");
    const strong = div.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong!.textContent).toBe("world");
  });

  test("plain text produces textContent only, no child elements", () => {
    const div = document.createElement("div");
    div.innerHTML = renderMarkdown("Plain text");
    expect(div.children.length).toBe(0);
    expect(div.textContent).toBe("Plain text");
  });

  test('"OK" in DOM has no extra whitespace or wrapping elements', () => {
    const div = document.createElement("div");
    div.innerHTML = renderMarkdown("OK");
    expect(div.innerHTML).toBe("OK");
    expect(div.textContent).toBe("OK");
    expect(div.children.length).toBe(0);
  });
});
