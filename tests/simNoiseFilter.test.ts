/**
 * @jest-environment node
 *
 * Console-noise gate for the sim harness (server/simulate.ts).
 *
 * The 402 case is the subtle one: api.short.io (keypad-link shortening)
 * returns 402 when its quota is exhausted — the product already degrades
 * to the long URL, so the browser's network-level console error is noise.
 * But the browser's console text carries NO URL, and a 402 from anywhere
 * else (e.g. easyeyes.app Netlify functions hitting their own quota —
 * which would CRASH phrase loading for real experiments) prints the exact
 * same line. Filtering 402s unconditionally would let a fatal outage pass
 * the sim tier silently. The gate must therefore be conditional on the
 * harness having actually SEEN a 402 response from api.short.io.
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
    expect(isSimConsoleNoise(text, true)).toBe(true);
  });

  it("a 402 with no observed short.io 402 response is NOT noise — could be a fatal endpoint quota", () => {
    const text =
      "Failed to load resource: the server responded with a status of 402 ()";
    expect(isSimConsoleNoise(text, false)).toBe(false);
  });
});
