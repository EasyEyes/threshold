/**
 * Harvest browser coverage from a simulated-participant run.
 *
 * The instrumented page accumulates counts in `window.__coverage__`, which is
 * recreated on every navigation, so the init script also flushes into
 * sessionStorage (same tab, survives navigation). Both are read at teardown
 * and merged.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { mergeCoverageMaps, type CoverageMap } from "./mergeCoverage";

export const COVERAGE_STORAGE_KEY = "__ee_coverage_store__";

/**
 * Runs in the page, before any experiment script. Must stay self-contained —
 * Playwright serializes the function source.
 */
export function installCoveragePersister(key: string): void {
  let flushed = false;

  const merge = (dst: any, src: any) => {
    for (const file of Object.keys(src || {})) {
      const incoming = src[file];
      if (!incoming || !incoming.s) continue;
      const existing = dst[file];
      if (!existing) {
        dst[file] = incoming;
        continue;
      }
      for (const kind of ["s", "f"]) {
        const target = existing[kind] || (existing[kind] = {});
        const source = incoming[kind] || {};
        for (const index of Object.keys(source)) {
          target[index] = (target[index] || 0) + source[index];
        }
      }
      const branchTarget = existing.b || (existing.b = {});
      const branchSource = incoming.b || {};
      for (const index of Object.keys(branchSource)) {
        const counts = branchTarget[index] || (branchTarget[index] = []);
        (branchSource[index] || []).forEach((count: number, i: number) => {
          counts[i] = (counts[i] || 0) + count;
        });
      }
    }
    return dst;
  };

  const flush = () => {
    // pagehide and beforeunload both fire on navigation; one flush per load.
    if (flushed) return;
    flushed = true;
    try {
      const stored = JSON.parse(window.sessionStorage.getItem(key) || "{}");
      const live = (window as any).__coverage__ || {};
      window.sessionStorage.setItem(key, JSON.stringify(merge(stored, live)));
    } catch {
      // Storage can be full or disabled; never break the experiment.
    }
  };

  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
}

export function coverageEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.EE_COVERAGE === "1";
}

export function coverageDirFor(
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env.EE_COVERAGE_DIR ?? path.join(cwd, "coverage", "browser");
}

export function parseCoverageJson(raw: string | null | undefined): CoverageMap {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: CoverageMap = {};
  for (const [file, value] of Object.entries(parsed as Record<string, any>)) {
    if (value && typeof value === "object" && value.statementMap) {
      out[file] = value;
    }
  }
  return out;
}

/** Merge this page's live coverage with what earlier navigations persisted. */
export function writeBrowserCoverage(
  dir: string,
  label: string,
  live: CoverageMap,
  stored: CoverageMap,
): string | null {
  const merged = mergeCoverageMaps(stored, live);
  if (Object.keys(merged).length === 0) return null;
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `browser-${label}-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(merged));
  return file;
}
