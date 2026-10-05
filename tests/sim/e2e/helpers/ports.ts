/**
 * Central dev-server port registry for the sim e2e suites.
 *
 * Jest runs e2e suites in parallel worker processes, so ports cannot be
 * negotiated across suites at runtime — every suite declares how many ports
 * it needs in PORT_NEEDS below, and this module lays the blocks out
 * contiguously starting at FIRST_PORT. A suite uses
 * `simE2EPort("<suite>", offset)`; an offset past the suite's declared block
 * throws instead of silently borrowing the next suite's port.
 *
 * Blocks start at 5598: 5500 is the `npm start` / simulate.ts default port
 * (orphaned dev servers squat it), so the registry keeps clear of it.
 *
 * When adding a suite (or scenarios to one), bump its PORT_NEEDS entry —
 * never declare a literal port in a test file (guarded by ports.test.ts).
 */

/** Ports needed per suite, in no particular order (layout is computed). */
export const SIM_E2E_PORT_NEEDS = {
  resultsCsvShape: 1,
  smoke: 1,
  rtl: 1,
  /** PASSING specs at offset 0..19, KNOWN_RED specs at offset 20+. */
  coverage: 36,
  /** One per distinct table (port++ per sim); tests share runs. */
  soundOutput: 12,
  recalibration: 4,
  showimage: 1,
  rsvpTracking: 1,
  percentCorrectAnyCondition: 1,
  realRunNoSimArtifacts: 1,
  qaInstructions: 1,
  questExhaustion: 1,
  qaInstructionsFont: 1,
  qaUnequalCounts: 1,
  noneResponseInstruction: 1,
  questFlows: 7,
  chaosRobustness: 6,
  qaScrollyOptions: 1,
  c3lFullRun: 1,
  likertWedge: 1,
  fontGeometryColumns: 1,
  cameraFailures: 5,
  drillDeterminism: 1,
  /** Sequential sim runs inside the fuzz CLI; one per run, plus headroom. */
  fuzzSmoke: 4,
} as const;

export type SimE2ESuite = keyof typeof SIM_E2E_PORT_NEEDS;

const FIRST_PORT = 5598;

/** Contiguous, disjoint port blocks: suite → first port of its block. */
export const SIM_E2E_PORT_BASES: Record<SimE2ESuite, number> = (() => {
  const bases = {} as Record<SimE2ESuite, number>;
  let next = FIRST_PORT;
  for (const [suite, need] of Object.entries(SIM_E2E_PORT_NEEDS) as [
    SimE2ESuite,
    number,
  ][]) {
    bases[suite] = next;
    next += need;
  }
  return bases;
})();

/** The port for `suite`'s scenario at `offset` within its block. */
export const simE2EPort = (suite: SimE2ESuite, offset = 0): number => {
  const need = SIM_E2E_PORT_NEEDS[suite];
  if (!Number.isInteger(offset) || offset < 0 || offset >= need) {
    throw new Error(
      `sim e2e port offset ${offset} is outside ${suite}'s block of ${need} ` +
        `port(s) — bump SIM_E2E_PORT_NEEDS.${suite} in helpers/ports.ts.`,
    );
  }
  return SIM_E2E_PORT_BASES[suite] + offset;
};
