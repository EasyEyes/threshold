/**
 * Wall-clock timing of one compile, from the spreadsheet being accepted to
 * Pavlovia serving the experiment.
 *
 * Purely observational. The compiler already records each phase as a Sentry
 * breadcrumb (recordCompilerPhase); this module timestamps those same phases
 * and prints one console table at the end, so a real compile can be timed
 * without a debugger. It never affects what is compiled or uploaded.
 *
 * Active only when the "timing" optimization is on for the current compile
 * (see compileMode.ts); otherwise every function here is a no-op and the
 * Sentry breadcrumbs are exactly as before.
 */
import { currentCompileSource, optimizationOn } from "./compileMode";

interface PhaseMark {
  phase: string;
  /** ms since the timing started */
  at: number;
}

/** Operations whose phases belong to the compile timeline. */
const TIMED_OPERATIONS = new Set(["experiment-compilation", "pavlovia-upload"]);

let operation: string | null = null;
let startedAt = 0;
let marks: PhaseMark[] = [];

const now = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const perfMark = (name: string) => {
  try {
    performance.mark(`easyeyes-compile:${name}`);
  } catch {
    // performance.mark is unavailable in some test environments; the console
    // table below is the primary output anyway.
  }
};

export const isTimedCompilerOperation = (name: string): boolean =>
  TIMED_OPERATIONS.has(name);

/** Start a fresh timeline. Called when a compile (or upload) operation starts. */
export const startCompileTiming = (operationName: string): void => {
  if (!isTimedCompilerOperation(operationName)) return;
  if (!optimizationOn("timing")) {
    // Not timing this compile; drop any timeline left by an earlier one.
    endCompileTiming();
    return;
  }
  // An upload that continues a compile keeps the compile's timeline, so the
  // summary spans both; a standalone upload starts its own.
  if (
    operation === "experiment-compilation" &&
    operationName === "pavlovia-upload"
  )
    return;
  operation = operationName;
  startedAt = now();
  marks = [];
  perfMark(`${operationName}.started`);
};

/**
 * Record a phase on the current timeline. Returns ms since the timeline
 * started, or null when no compile is being timed (e.g. activating a
 * previously compiled experiment).
 */
export const markCompilePhase = (phase: string): number | null => {
  if (operation === null) return null;
  const at = Math.round(now() - startedAt);
  marks.push({ phase, at });
  perfMark(phase);
  return at;
};

export interface CompileTimingRow {
  phase: string;
  /** ms spent since the previous phase */
  step_ms: number;
  /** ms since the compile started */
  total_ms: number;
}

export const compileTimingRows = (): CompileTimingRow[] =>
  marks.map((m, i) => ({
    phase: m.phase,
    step_ms: m.at - (i === 0 ? 0 : marks[i - 1].at),
    total_ms: m.at,
  }));

const isTestEnvironment = (): boolean =>
  typeof process !== "undefined" && process.env?.NODE_ENV === "test";

/**
 * Print the timeline so far as a console table. Safe to call repeatedly (e.g.
 * once when the upload finishes and again when Pavlovia is ready).
 *
 * Console output is disabled for now (both Studio and Compiler-tab compiles);
 * the performance marks and the per-phase elapsedMs in Sentry breadcrumbs are
 * still recorded. Uncomment to see the table again while measuring.
 */
export const printCompileTiming = (heading: string): void => {
  if (operation === null || marks.length === 0 || isTestEnvironment()) return;
  void heading;
  // const total = marks[marks.length - 1].at;
  // console.log(
  //   `[EasyEyes compile timing] ${currentCompileSource()} compile: ${heading} — ${(
  //     total / 1000
  //   ).toFixed(1)} s total`,
  // );
  // console.table(compileTimingRows());
};

/** Forget the current timeline (after the final summary has been printed). */
export const endCompileTiming = (): void => {
  operation = null;
  marks = [];
};
