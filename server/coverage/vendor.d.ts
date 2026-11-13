/**
 * istanbul-lib-instrument ships no types and has no @types package; the other
 * istanbul packages used here (lib-coverage, lib-report, reports) resolve their
 * @types packages, already installed transitively via jest. Only the surface
 * this repo uses is declared.
 */

declare module "istanbul-lib-instrument" {
  export interface InstrumenterOptions {
    esModules?: boolean;
    compact?: boolean;
    produceSourceMap?: boolean;
    coverageVariable?: string;
    preserveComments?: boolean;
  }
  export interface Instrumenter {
    instrumentSync(code: string, filename: string): string;
  }
  export function createInstrumenter(
    options?: InstrumenterOptions,
  ): Instrumenter;
}
