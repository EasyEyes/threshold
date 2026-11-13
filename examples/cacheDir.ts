/**
 * Where `examples/buildExamples.ts` caches the fetched glossary/phrases.
 *
 * The cache is mutable shared state; suites that write it (the audit-command
 * suite) or run builds concurrently must be able to redirect it with
 * EXAMPLES_CACHE_DIR instead of mutating the repo's `examples/.cache`.
 */

import { resolve } from "path";

export function resolveCacheDir(
  env: NodeJS.ProcessEnv = process.env,
  examplesDir: string = resolve(__dirname),
  cwd: string = process.cwd(),
): string {
  const override = env.EXAMPLES_CACHE_DIR;
  if (override) return resolve(cwd, override);
  return resolve(examplesDir, ".cache");
}
