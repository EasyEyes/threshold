/**
 * Global console-noise filter (wired via jest setupFilesAfterEnv).
 *
 * Many suites deliberately exercise failure/fallback paths whose code logs
 * via console.error/warn/log. That output is expected — but it buried real
 * signal (a genuine new console.error was invisible in ~4000 lines of
 * benign noise). This filter suppresses KNOWN-benign messages only; anything
 * unmatched still prints, so new noise stays visible and reviewable.
 *
 * Every entry must say WHY the message is expected. Suites that assert on
 * console output spy locally — spies replace the wrapper and are unaffected.
 */

type ConsoleMethod = "error" | "warn" | "log" | "debug";

const text = (a: unknown): string =>
  typeof a === "string" ? a : a instanceof Error ? a.message : String(a);

const matches = (pattern: RegExp) => (args: unknown[]) =>
  pattern.test(text(args[0]));

const BENIGN: Array<{
  method: ConsoleMethod;
  test: (args: unknown[]) => boolean;
  why: string;
}> = [
  // ── Adversarial tests deliberately trigger these failure paths ──────────
  {
    method: "error",
    test: matches(/^\[paramReader\] Failed to load experiment conditions/),
    why: "paramReaderAdversarial.test.ts 404s block files on purpose",
  },
  {
    method: "error",
    test: matches(/^Experiment will fail\. 'block' parameter not provided/),
    why: "tableToNormalizedDf.test.ts tests the missing-block path",
  },
  {
    method: "error",
    test: matches(/^Token refresh failed:/),
    why: "gitlabOAuthClient.test.ts tests the refresh-failure path",
  },
  {
    method: "warn",
    test: matches(/^\[sim:weibull\] NaN param/),
    why: "simulationModel.test.ts feeds NaN params in bulk loops",
  },
  {
    method: "warn",
    test: matches(/^\[Font Shaping Check\] Check unavailable/),
    why: "font-shaping check degrades gracefully under ts-jest (no WASM)",
  },
  {
    method: "warn",
    test: matches(/^\[EasyEyes WASM\] Module not available/),
    why: "WASM dynamic import unsupported under ts-jest; checks skip by design",
  },
  {
    method: "warn",
    test: matches(/^\[fontProcessor\]/),
    why: "font-instancing suites test 404 → Typekit fallback paths",
  },
  {
    method: "error",
    test: matches(/^\[fontProcessor\]/),
    why: "font-instancing suites test pre-bake failure paths",
  },
  {
    method: "warn",
    test: matches(/^Failed to fetch resources for type/),
    why: "gitlabUtils.test.ts tests the per-type fetch-failure path",
  },
  {
    method: "warn",
    test: matches(/^Could not preserve XLSX formatting/),
    why: "gitlabUtils.test.ts tests the formatting-preservation fallback",
  },

  // ── Verbose instrumentation / progress logging ──────────────────────────
  {
    method: "debug",
    test: matches(/^\[sim:(dispatch|stim)\]/),
    why: "sim instrumentation logs every dispatched action / stim change",
  },
  {
    method: "log",
    test: matches(/^Call to generateVideo took/),
    why: "generate_video timing log fires per test",
  },
  {
    method: "log",
    test: matches(/^targetOrientationDeg/),
    why: "movie-compute fixture code logs per frame",
  },
  {
    method: "log",
    test: matches(/^(Loading stored session|Creating EasyEyesResources)/),
    why: "user.ts session-loading progress logs",
  },
  {
    method: "log",
    test: matches(/^\[Create Pavlovia Experiment\]/),
    why: "repo-preparation progress logs",
  },
  {
    method: "log",
    test: (args) =>
      typeof args[0] === "object" &&
      args[0] !== null &&
      "commit_message" in (args[0] as object),
    why: "pushCommits logs the full commit payload",
  },
];

// One wrapper per method (nested wrappers would pollute stack traces).
const byMethod = new Map<ConsoleMethod, Array<(args: unknown[]) => boolean>>();
for (const { method, test } of BENIGN) {
  byMethod.set(method, [...(byMethod.get(method) ?? []), test]);
}
for (const [method, tests] of byMethod) {
  const original = console[method].bind(console);
  console[method] = ((...args: unknown[]) => {
    if (tests.some((t) => t(args))) return; // benign — see `why` in BENIGN
    original(...args);
  }) as (typeof console)[typeof method];
}
