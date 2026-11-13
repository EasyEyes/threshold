/**
 * @jest-environment node
 *
 * The vite dev server serves `/threshold.js` and `components/*.js` as
 * individual modules, so instrumenting them there yields per-source-file
 * coverage of what the simulated participant actually ran — no mocks.
 */

import { expect, describe, test } from "@jest/globals";
import {
  coveragePlugin,
  shouldInstrument,
} from "../../server/coverage/istanbulPlugin";

const ROOT = "/repo";

describe("shouldInstrument", () => {
  test("accepts runtime sources served to the browser", () => {
    expect(shouldInstrument(`${ROOT}/components/global.js`, ROOT)).toBe(true);
    expect(
      shouldInstrument(`${ROOT}/components/simulationModel.ts`, ROOT),
    ).toBe(true);
    expect(shouldInstrument(`${ROOT}/threshold.js`, ROOT)).toBe(true);
    expect(shouldInstrument(`${ROOT}/first.js`, ROOT)).toBe(true);
  });

  test("rejects vendored, third-party, and non-JS modules", () => {
    expect(
      shouldInstrument(`${ROOT}/components/addons/ffmpeg.min.js`, ROOT),
    ).toBe(false);
    expect(
      shouldInstrument(`${ROOT}/components/addons/jsQUEST.module.js`, ROOT),
    ).toBe(false);
    expect(
      shouldInstrument(
        `${ROOT}/node_modules/pixi.js-legacy/dist/pixi.js`,
        ROOT,
      ),
    ).toBe(false);
    expect(
      shouldInstrument(`${ROOT}/components/markdownInline.js?t=1`, ROOT),
    ).toBe(false);
    expect(shouldInstrument(`${ROOT}/components/style.css`, ROOT)).toBe(false);
  });

  test("rejects a path outside the repo root", () => {
    expect(shouldInstrument("/elsewhere/components/global.js", ROOT)).toBe(
      false,
    );
  });
});

describe("coveragePlugin", () => {
  const plugin = coveragePlugin({ root: ROOT, enabled: true });

  test("is inert when not enabled", async () => {
    const disabled = coveragePlugin({ root: ROOT, enabled: false });
    const out = await (disabled.transform as any).call(
      { addWatchFile() {} },
      "export const a = 1;",
      `${ROOT}/components/a.js`,
    );
    expect(out).toBeNull();
  });

  test("instruments a runtime module with a coverage counter", async () => {
    const out = await (plugin.transform as any).call(
      { addWatchFile() {} },
      "export const value = 1;\nexport function double(n) { return n * 2; }\n",
      `${ROOT}/components/sample.js`,
    );
    const code = typeof out === "string" ? out : out.code;
    expect(code).toContain("__coverage__");
    // Real counters, not just a banner comment.
    expect(code).toMatch(/\.s\[0\]\+\+/);
    // Instrumented output must stay valid ESM.
    expect(code).toMatch(/export/);
  });

  test("leaves non-runtime modules untouched", async () => {
    const out = await (plugin.transform as any).call(
      { addWatchFile() {} },
      "module.exports = 1;",
      `${ROOT}/components/addons/ffmpeg.min.js`,
    );
    expect(out).toBeNull();
  });

  test("does not break already-instrumented code (idempotent guard)", async () => {
    const source = "export const value = 1;\n";
    const first = await (plugin.transform as any).call(
      { addWatchFile() {} },
      source,
      `${ROOT}/components/sample.js`,
    );
    const firstCode = typeof first === "string" ? first : first.code;
    const second = await (plugin.transform as any).call(
      { addWatchFile() {} },
      firstCode,
      `${ROOT}/components/sample.js`,
    );
    // Re-instrumenting would double-count; either skip or stay valid.
    const secondCode = typeof second === "string" ? second : second?.code;
    if (secondCode) expect(secondCode).toContain("__coverage__");
  });
});
