/**
 * Which compile is in flight, and which optimizations it gets.
 *
 * The Studio (beta) and the classic Compiler tab share one compile pipeline
 * (Table.onDrop → handleDrop → handleTable → createPavloviaExperiment →
 * activation). A handful of speed optimizations live inside that pipeline;
 * this module decides whether they are on for the current compile.
 *
 * Today they are on for Studio compiles only. To give every compile an
 * optimization, change its entry in COMPILE_OPTIMIZATIONS_FOR from "studio"
 * to "all" — nothing else needs to change.
 */

export type CompileSource = "compiler" | "studio";

export type CompileOptimization =
  /** performance.mark per phase + console timing table + elapsedMs in Sentry breadcrumbs */
  | "timing"
  /** handleTable preamble round trips (glossary, phrases, resources, project list, resources repo) run concurrently */
  | "parallelPreamble"
  /** runtime files fetched concurrently and cached per deploy; requested resources read concurrently */
  | "runtimeFileCache"
  /**
   * Metadata round trips overlap the work they used to precede: the project
   * list is not waited for before validation; corpus texts are read during
   * the preamble; the repo-name search starts before validation; the phrases
   * pin and the project-list refresh run together; the upload's files are
   * prepared while the repository is being created; the data-folder count
   * does not delay activation.
   */
  | "overlapMetadataCalls"
  /** first Pavlovia readiness check after 1 s instead of 5 s, then every 0.4 s for a while */
  | "fastActivationPolling"
  /**
   * Thin experiment repository: the runtime (js/*.js, source maps, models —
   * ~17 MB, identical for every experiment) is not copied into the
   * repository; index.html loads it, with integrity hashes, from the
   * immutable npm version the build published, served by jsDelivr
   * (hostedRuntime.ts, server/publishRuntime.ts). Falls back to the full
   * copy until the build publishes and whenever the hosted runtime cannot be
   * established.
   */
  | "hostedRuntime";

export const COMPILE_OPTIMIZATIONS_FOR: Record<
  CompileOptimization,
  "studio" | "all"
> = {
  // Timing is on for both so the two paths can be compared like for like; it
  // only records performance marks and prints a console table.
  timing: "all",
  parallelPreamble: "studio",
  runtimeFileCache: "studio",
  overlapMetadataCalls: "studio",
  fastActivationPolling: "studio",
  hostedRuntime: "studio",
};

let compileSource: CompileSource = "compiler";

/** Called when a compile starts (Table.compileFiles). */
export const beginCompile = (source: CompileSource): void => {
  compileSource = source;
};

/** Called when the compile has finished (Pavlovia ready, or failed). */
export const endCompile = (): void => {
  compileSource = "compiler";
};

export const currentCompileSource = (): CompileSource => compileSource;

export const optimizationOn = (name: CompileOptimization): boolean =>
  COMPILE_OPTIMIZATIONS_FOR[name] === "all" || compileSource === "studio";
