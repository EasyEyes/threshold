/** @jest-environment node */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  readRemoteCalibratorPin,
  remoteCalibratorPinFromHtml,
} from "../examples/remoteCalibratorVersion";

test("extracts the pinned Remote Calibrator version", () => {
  const html =
    '<script src="https://cdn.jsdelivr.net/npm/remote-calibrator@0.9.169"></script>';

  expect(remoteCalibratorPinFromHtml(html)).toBe("0.9.169");
});

test("preserves the latest fallback when no version is pinned", () => {
  expect(remoteCalibratorPinFromHtml("<html></html>")).toBe("latest");
});

test("reads the pin from the repository index", () => {
  const html = readFileSync(resolve(__dirname, "../index.html"), "utf8");

  expect(readRemoteCalibratorPin()).toBe(remoteCalibratorPinFromHtml(html));
  expect(readRemoteCalibratorPin()).not.toBe("latest");
});
