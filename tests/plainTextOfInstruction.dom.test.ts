/**
 * @jest-environment jsdom
 *
 * Unit tests for plainTextOfInstruction (components/markdownInline.js),
 * extracted from threshold.js — the plain-text projection of instruction
 * markdown used for the canvas-rendered imageAdjust instructions.
 *
 * Uses the real marked@4.0.7 (same as the CDN script tag), set as a
 * global, mirroring renderMarkdown.test.ts.
 */
import { marked } from "marked";
import { plainTextOfInstruction } from "../components/markdownInline.js";

beforeAll(() => {
  (globalThis as any).marked = marked;
});

describe("plainTextOfInstruction", () => {
  test("null / undefined → empty string", () => {
    expect(plainTextOfInstruction(null)).toBe("");
    expect(plainTextOfInstruction(undefined)).toBe("");
  });

  test("plain text passes through", () => {
    expect(plainTextOfInstruction("Press space to begin")).toBe(
      "Press space to begin",
    );
  });

  test("markdown emphasis is stripped to its text", () => {
    expect(plainTextOfInstruction("Choose the **larger** patch")).toBe(
      "Choose the larger patch",
    );
  });

  test("headings become their text", () => {
    expect(plainTextOfInstruction("# Part 2")).toBe("Part 2");
  });

  test.each([
    ["l1<br>l2", "l1\nl2"],
    ["l1<br/>l2", "l1\nl2"],
    ["l1<br />l2", "l1\nl2"],
    ["l1<BR>l2", "l1\nl2"],
  ])("%p → %p (br variants become newlines)", (input, expected) => {
    expect(plainTextOfInstruction(input)).toBe(expected);
  });

  test("markdown line breaks (breaks:true) also become newlines", () => {
    // renderInstructionMarkdown parses with breaks:true, so a single \n
    // inside a paragraph is a <br>.
    expect(plainTextOfInstruction("line one\nline two")).toBe(
      "line one\nline two",
    );
  });

  test("bulleted list items survive as text", () => {
    const out = plainTextOfInstruction("- one\n- two");
    expect(out).toContain("one");
    expect(out).toContain("two");
    expect(out).not.toContain("<li>");
  });
});
