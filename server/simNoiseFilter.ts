/**
 * Console-noise gate for the sim harness (server/simulate.ts).
 *
 * Pure decision function so the policy is unit-testable: the harness tells
 * it whether a 402 response from api.short.io was actually observed for
 * the run (via the page "response" listener) — the browser's console text
 * for a failed resource carries no URL, so a 402 is only attributable to
 * the quota-limited link shortener when one was seen. Any other 402
 * (e.g. an experiment endpoint hitting a quota — fatal for phrase
 * loading) must stay visible to the assertions.
 */

const STATIC_NOISE: RegExp[] = [
  /^\[vite\]/, // vite HMR / pre-transform
  /^Download the React DevTools/,
  /^%c/, // styled console spam (banner ads, version banners)
  /Google Maps JS API/,
  /Deviating from/,
];

export const isSimConsoleNoise = (
  text: string,
  shortIoQuota402: boolean,
): boolean => {
  if (STATIC_NOISE.some((p) => p.test(text))) return true;
  // api.short.io keypad-link shortening out of quota (HTTP 402): the
  // product catches it and falls back to the long URL.
  return shortIoQuota402 && /status of 402/.test(text);
};
