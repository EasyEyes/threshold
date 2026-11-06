/**
 * Console-noise gate for the sim harness (server/simulate.ts).
 *
 * Pure decision function so the policy is unit-testable: the harness records
 * the exact status returned by api.short.io for the run (via the page
 * "response" listener). Browser console text for a failed resource carries
 * no URL, so only that exact status is attributable to the link shortener.
 * The same status from any other endpoint must stay visible to assertions.
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
  shortIoFailures: ReadonlySet<number>,
): boolean => {
  if (STATIC_NOISE.some((p) => p.test(text))) return true;
  // api.short.io keypad-link shortening failure (402/403): the product
  // catches it and falls back to the long URL. Only the exact observed
  // status is attributable; every other endpoint error stays visible.
  const status = Number(text.match(/status of (\d{3})/)?.[1]);
  return shortIoFailures.has(status);
};
