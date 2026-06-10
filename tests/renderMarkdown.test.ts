/**
 * Tests for the canonical Markdown+HTML rendering function.
 *
 * Zero mocking: we use the real marked@4.0.7 library (same version as the
 * CDN <script> tag in index.html). The only setup is setting it as a global,
 * mirroring what the CDN script would do in browser.
 *
 * renderMarkdown checks `typeof marked` at CALL time (inside the function
 * body), so the module imports fine even without the global set.
 *
 * @jest-environment node
 */
import { marked } from "marked";
import { renderMarkdown } from "../components/markdownInline.js";

beforeAll(() => {
  (globalThis as any).marked = marked;
});

describe("renderMarkdown", () => {
  describe("full markdown support", () => {
    test("**bold** → <strong>", () => {
      expect(renderMarkdown("Hello **bold**")).toContain(
        "<strong>bold</strong>",
      );
    });

    test("# heading → <h1>", () => {
      expect(renderMarkdown("# Heading")).toContain("<h1");
      expect(renderMarkdown("# Heading")).toContain("Heading</h1>");
    });

    test("- list → <ul><li>", () => {
      const result = renderMarkdown("- one\n- two");
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>one</li>");
      expect(result).toContain("<li>two</li>");
    });

    test("mixed markdown + HTML", () => {
      const result = renderMarkdown("<br>**bold** and *italic*");
      expect(result).toContain("<br>");
      expect(result).toContain("<strong>bold</strong>");
      expect(result).toContain("<em>italic</em>");
    });
  });

  describe("HTML handling", () => {
    test("<br> passes through", () => {
      expect(renderMarkdown("Hello<br>World")).toContain("<br>");
    });

    test("inline HTML tags pass through untouched", () => {
      expect(renderMarkdown('<span style="color:red">text</span>')).toContain(
        '<span style="color:red">text</span>',
      );
    });
  });

  describe("no spurious <p> wrapping or newlines added", () => {
    test('"OK" is unchanged (no <p>, no newlines)', () => {
      const result = renderMarkdown("OK");
      expect(result).toBe("OK");
      expect(result).not.toContain("<p>");
      expect(result).not.toContain("</p>");
      expect(result).not.toMatch(/\n$/);
    });

    test('"Hello World" is unchanged', () => {
      const result = renderMarkdown("Hello World");
      expect(result).toBe("Hello World");
      expect(result).not.toContain("<p>");
    });

    test("**bold** has no <p> wrapper, no trailing newline", () => {
      const result = renderMarkdown("Hello **bold**");
      expect(result).not.toContain("<p>");
      expect(result).not.toContain("</p>");
      expect(result).not.toMatch(/\n$/);
      expect(result).toContain("<strong>bold</strong>");
    });

    test("<br> text has no <p> wrapper, no trailing newline", () => {
      const result = renderMarkdown("Hello<br>World");
      expect(result).not.toContain("<p>");
      expect(result).not.toContain("</p>");
      expect(result).not.toMatch(/\n$/);
      expect(result).toContain("<br>");
    });

    test("multi-paragraph text DOES get <p> wrapping (correct behavior)", () => {
      const result = renderMarkdown("Hello\n\nWorld");
      expect(result).toContain("<p>Hello</p>");
      expect(result).toContain("<p>World</p>");
    });

    test("user-supplied <p> tags are NOT stripped", () => {
      const result = renderMarkdown("<p>Hello</p>");
      expect(result).toContain("<p>Hello</p>");
    });
  });

  describe("defensive behavior", () => {
    test('null → ""', () => {
      expect(renderMarkdown(null)).toBe("");
    });

    test('undefined → ""', () => {
      expect(renderMarkdown(undefined)).toBe("");
    });

    test('empty string → ""', () => {
      expect(renderMarkdown("")).toBe("");
    });

    test("falls back to raw string when marked unavailable", () => {
      const saved = (globalThis as any).marked;
      (globalThis as any).marked = undefined;
      try {
        expect(renderMarkdown("**bold**")).toBe("**bold**");
      } finally {
        (globalThis as any).marked = saved;
      }
    });

    test("falls back to raw string when marked throws", () => {
      const saved = (globalThis as any).marked;
      (globalThis as any).marked = {
        parse: () => {
          throw new Error("parse error");
        },
      };
      try {
        expect(renderMarkdown("**bold**")).toBe("**bold**");
      } finally {
        (globalThis as any).marked = saved;
      }
    });
  });
});
