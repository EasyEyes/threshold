/**
 * FROZEN CONTRACT — engine.compile() (shell ↔ engine interface).
 *
 * See docs/adr/0001-freeze-engine-compile-and-compiled-data-contracts.md.
 *
 * Append-only rules: types in this file may only gain OPTIONAL fields.
 * No field may ever be removed, renamed, or repurposed. Bump
 * CONTRACT_VERSION only when a change would break an older shell.
 */

/**
 * The integer contract version this type definition describes. An engine
 * exposes the contract version it speaks as `contractVersion`; a shell must
 * refuse to drive an engine whose contractVersion is greater than the highest
 * version the shell understands.
 */
export const CONTRACT_VERSION = 1;

/**
 * An opaque named byte payload — the only currency for file content crossing
 * the contract boundary, in either direction.
 */
export interface EngineFile {
  /** POSIX-style path relative to the experiment repo root, e.g. "conditions/block_1.csv". */
  path: string;
  /** Opaque content. Strings are UTF-8 text; Uint8Array is raw bytes. */
  content: string | Uint8Array;
}

/** Resource files and side inputs available to the compiler. */
export interface CompileResources {
  /**
   * Resource files available to this compile, addressed by repo-style path
   * ("fonts/x.woff2", "phrases/y.xlsx", ...). Content is opaque bytes.
   */
  files?: EngineFile[];
  /**
   * Lazy accessor for resources not handed over up front (e.g. a phrase file
   * in the scientist's repo, impulse/frequency-response content). Resolves to
   * null when the resource does not exist.
   */
  fetch?: (path: string) => Promise<EngineFile | null>;
  /**
   * List resource paths under a path prefix (e.g. "folders/") for
   * existence/structure checks. Resolves to [] when nothing matches.
   */
  list?: (prefix: string) => Promise<string[]>;
}

/** Options modulating a single compile. All fields optional. */
export interface CompileOptions {
  /** Compilation environment; "web" (browser shell) or "node" today. */
  mode?: string;
  /** True when re-compiling from a downloaded experiment archive. */
  compiledFromArchive?: boolean;
  /** True when compiling against local (not repo-hosted) resources. */
  local?: boolean;
  /**
   * Auxiliary structured datasets pinned by the release, keyed by name
   * (e.g. "glossary", "phrases"). Values are engine-interpreted.
   */
  data?: Record<string, unknown>;
}

/** The engine handle a shell obtains from a release's engine module. */
export interface ThresholdEngine {
  /** Integer version of this contract the engine speaks. */
  contractVersion: number;
  /**
   * Compile one experiment table plus resources into the file set and
   * manifest for the experiment repo. Must not throw for experiment-author
   * errors — those are reported as manifest diagnostics.
   */
  compile(
    table: EngineFile,
    resources: CompileResources,
    options?: CompileOptions,
  ): Promise<CompileResult>;
}

/** Everything a compile produces. */
export interface CompileResult {
  /** Files to write into the experiment repo (compiled-data format). */
  files: EngineFile[];
  /** Structured metadata about the compile. */
  manifest: CompileManifest;
}

/** Structured, JSON-serializable metadata accompanying the compiled files. */
export interface CompileManifest {
  /** Integer version of this contract the producing engine speaks. */
  contractVersion: number;
  /** Provenance of the engine that produced this compile. */
  engine?: EngineProvenance;
  /**
   * Resources the compiled experiment needs, as repo-style paths. The shell
   * fetches each request and writes it into the experiment repo at that path.
   */
  requests?: ResourceRequest[];
  /**
   * Problems found during compilation. Any diagnostic with kind "error"
   * means the compile is not publishable; "warning" diagnostics are shown
   * to the scientist but do not block.
   */
  diagnostics?: Diagnostic[];
  /**
   * Engine-computed experiment configuration the shell reads (recruitment
   * settings, language and direction, estimated duration, compatibility
   * text, ...). Keys are engine-defined; shells ignore keys they don't know.
   */
  experiment?: Record<string, unknown>;
}

/** Identifies the engine build that produced a compile. */
export interface EngineProvenance {
  name?: string;
  /** Release identifier, e.g. "2026-07-01" or "2026-07-01.2". */
  version?: string;
  /** Ground-truth git commit SHA of the engine source. */
  commit?: string;
}

/** One resource the compiled experiment needs, addressed by repo-style path. */
export interface ResourceRequest {
  path: string;
}

/** One problem found during compilation. */
export interface Diagnostic {
  /** Severity: "error" (blocks publishing) or "warning" (informational). */
  kind: string;
  /** Human-readable description of the problem. */
  message: string;
  /** Short title of the problem. */
  name?: string;
  /** Suggested remedy shown to the scientist. */
  hint?: string;
  /** Where in the compiler the check lives (for support/debugging). */
  context?: string;
  /** Experiment parameter names at fault. */
  parameters?: string[];
}
