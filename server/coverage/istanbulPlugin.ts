/**
 * Instrument runtime modules in the vite dev server so a simulated-participant
 * run reports real per-source-file coverage into `window.__coverage__`.
 *
 * Only active when EE_COVERAGE=1. Production builds are never instrumented.
 */

import { createInstrumenter } from "istanbul-lib-instrument";
import type { Plugin } from "vite";

const RUNTIME_ENTRIES = new Set(["threshold.js", "first.js"]);

const EXCLUDED = [
  /^components\/addons\//, // vendored ffmpeg/jsQUEST
  /\.min\.js$/, // pre-built bundles
  /^node_modules\//,
];

/** Should this vite module id be instrumented? */
export function shouldInstrument(id: string, root: string): boolean {
  const rootPrefix = root.replace(/\\/g, "/").replace(/\/$/, "") + "/";
  const normalized = id.replace(/\\/g, "/");
  // Vite query suffixes (?t=, ?raw) serve non-module variants.
  if (normalized.includes("?")) return false;
  if (!normalized.startsWith(rootPrefix)) return false;
  const rel = normalized.slice(rootPrefix.length);
  if (!/\.(js|ts)$/.test(rel)) return false;
  if (EXCLUDED.some((re) => re.test(rel))) return false;
  return rel.startsWith("components/") || RUNTIME_ENTRIES.has(rel);
}

export interface CoveragePluginOptions {
  root?: string;
  enabled?: boolean;
}

export function coveragePlugin(options: CoveragePluginOptions = {}): Plugin {
  const root = options.root ?? process.cwd();
  const enabled = options.enabled ?? process.env.EE_COVERAGE === "1";
  const instrumenter = createInstrumenter({
    esModules: true,
    compact: false,
    produceSourceMap: false,
    coverageVariable: "__coverage__",
  });

  return {
    name: "ee-coverage-instrument",
    apply: "serve",
    enforce: "post",
    transform(code, id) {
      if (!enabled) return null;
      if (!shouldInstrument(id, root)) return null;
      // Double instrumentation doubles every count.
      if (code.includes("__coverage__")) return null;
      return { code: instrumenter.instrumentSync(code, id), map: null };
    },
  };
}
