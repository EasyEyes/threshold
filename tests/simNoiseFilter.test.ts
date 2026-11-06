/**
 * @jest-environment node
 *
 * Console-noise gate for the sim harness (server/simulate.ts).
 *
 * The 402/403 cases are subtle: api.short.io (keypad-link shortening) can
 * fail while the product degrades to the long URL, making its network-level
 * console error noise. But the browser's console text carries NO URL, and
 * another endpoint returning the same status could be fatal. The gate
 * therefore requires that exact status to have come from api.short.io.
 */
import { isSimConsoleNoise } from "../server/simNoiseFilter";

describe("isSimConsoleNoise", () => {
  it("vite HMR / devtools banners are noise unconditionally", () => {
    expect(isSimConsoleNoise("[vite] connected", false)).toBe(true);
    expect(isSimConsoleNoise("Download the React DevTools", false)).toBe(true);
    expect(isSimConsoleNoise("%c styled banner", false)).toBe(true);
  });

  it("a 402 resource error is noise ONLY when short.io was seen 402ing", () => {
    const text =
      "Failed to load resource: the server responded with a status of 402 ()";
    expect(isSimConsoleNoise(text, new Set([402]))).toBe(true);
  });

  it("a 402 with no observed short.io 402 response is NOT noise — could be a fatal endpoint quota", () => {
    const text =
      "Failed to load resource: the server responded with a status of 402 ()";
    expect(isSimConsoleNoise(text, new Set())).toBe(false);
  });

  it("a 403 is noise only after short.io itself returns 403", () => {
    const text =
      "Failed to load resource: the server responded with a status of 403 ()";
    expect(isSimConsoleNoise(text, new Set([403]))).toBe(true);
    expect(isSimConsoleNoise(text, new Set())).toBe(false);
    expect(isSimConsoleNoise(text, new Set([402]))).toBe(false);
  });
});
