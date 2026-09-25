/**
 * Which EasyEyes compiler build compiled this experiment — logged to the
 * results CSV (easyEyesVersion; Denis Pelli 2026-09-23 #4). Kept
 * dependency-free: imported by threshold.js at startup and directly
 * unit-testable.
 *
 * Value: the compile-time "Compiler updated" date, i.e. the publication
 * timestamp of the Netlify deploy live at compile time (ISO 8601), stamped as
 * a <meta> by every compile flavor (preprocess/experimentVersion.ts).
 * "local" for npm-run-examples builds; "unknown" for experiments compiled
 * before stamping existed.
 */

export const easyEyesVersion = () =>
  (typeof document !== "undefined" &&
    document.querySelector('meta[name="easyeyes-version"]')?.content) ||
  "unknown";
