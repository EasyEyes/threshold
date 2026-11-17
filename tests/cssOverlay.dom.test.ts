/**
 * @jest-environment jsdom
 *
 * Unit tests for components/cssOverlay.js — loadCSS and
 * updateCSSAfterContentOfRoot, extracted verbatim from threshold.js's
 * module top level so the startup DOM behavior is unit-testable.
 */
import {
  loadCSS,
  updateCSSAfterContentOfRoot,
} from "../components/cssOverlay.js";

describe("loadCSS", () => {
  test("appends a stylesheet link to head and resolves on load", async () => {
    const p = loadCSS("js/threshold.css");
    const link = document.head.querySelector(
      'link[rel="stylesheet"][href="js/threshold.css"]',
    );
    expect(link).not.toBeNull();
    link!.dispatchEvent(new Event("load"));
    await expect(p).resolves.toBeDefined();
  });

  test("rejects on error", async () => {
    const p = loadCSS("missing.css");
    document.head
      .querySelector('link[href="missing.css"]')!
      .dispatchEvent(new Event("error"));
    await expect(p).rejects.toBeDefined();
  });

  test("each call appends its own link", () => {
    loadCSS("a.css");
    loadCSS("b.css");
    expect(document.head.querySelectorAll('link[href="a.css"]').length).toBe(1);
    expect(document.head.querySelectorAll('link[href="b.css"]').length).toBe(1);
  });
});

describe("updateCSSAfterContentOfRoot", () => {
  test("adds an #root::after rule carrying the content", () => {
    updateCSSAfterContentOfRoot("Loading…");
    const style = document.head.querySelector("style");
    expect(style).not.toBeNull();
    const rule = Array.from(style!.sheet!.cssRules)
      .map((r) => r.cssText)
      .join("\n");
    expect(rule).toContain("#root::after");
    expect(rule).toContain('"Loading…"');
    expect(rule).toContain("position: fixed");
  });
});
