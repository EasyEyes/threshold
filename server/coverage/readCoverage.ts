/**
 * Load istanbul coverage maps from the artifacts the coverage scripts write.
 * Shared by the report and track CLIs.
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { mergeCoverageMaps, type CoverageMap } from "./mergeCoverage";
import { parseCoverageJson } from "./harvest";

export const readCoverageJson = (file: string): CoverageMap => {
  if (!existsSync(file)) return {};
  try {
    return parseCoverageJson(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
};

export const readBrowserDumps = (dir: string): CoverageMap => {
  if (!existsSync(dir)) return {};
  const maps = readdirSync(dir)
    .filter((file) => /\.json$/.test(file))
    .map((file) => readCoverageJson(path.join(dir, file)));
  return mergeCoverageMaps(...maps);
};
