import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const remoteCalibratorPinFromHtml = (html: string): string =>
  html.match(/remote-calibrator@(\d+\.\d+\.\d+)/)?.[1] ?? "latest";

export const readRemoteCalibratorPin = (): string =>
  remoteCalibratorPinFromHtml(
    readFileSync(resolve(__dirname, "../index.html"), "utf8"),
  );
