/**
 * @jest-environment jsdom
 */

import { jest, expect, describe, test } from "@jest/globals";

import { formatDispatch } from "../../../components/simDispatchLog";

describe("formatDispatch", () => {
  test("formats a key dispatch", () => {
    expect(formatDispatch("key", "Space")).toBe('[sim:dispatch] key="Space"');
  });

  test("formats a single-char key dispatch", () => {
    expect(formatDispatch("key", "Z")).toBe('[sim:dispatch] key="Z"');
  });

  test("formats a click dispatch with element id", () => {
    expect(formatDispatch("click", "#procced-btn")).toBe(
      '[sim:dispatch] click="#procced-btn"',
    );
  });

  test("formats a click dispatch with selector", () => {
    expect(formatDispatch("click", ".swal2-confirm")).toBe(
      '[sim:dispatch] click=".swal2-confirm"',
    );
  });

  test("escapes embedded quotes in detail", () => {
    expect(formatDispatch("key", 'a"b')).toBe('[sim:dispatch] key="a\\"b"');
  });
});
