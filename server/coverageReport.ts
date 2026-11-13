/**
 * Merge jest coverage with browser coverage harvested from simulated runs.
 *
 *   npm run coverage        # jest → coverage/jest/coverage-final.json
 *   npm run coverage:sim -- <table>   # browser → coverage/browser/*.json
 *   npm run coverage:report # merged text + HTML → coverage/merged/
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import libCoverage from "istanbul-lib-coverage";
import libReport from "istanbul-lib-report";
import reports from "istanbul-reports";
import {
  formatCoverageReport,
  summarizeCoverage,
} from "./coverage/mergeCoverage";
import { readBrowserDumps, readCoverageJson } from "./coverage/readCoverage";

const ROOT = process.cwd();

interface Args {
  jest: string;
  browser: string;
  out: string;
  html: boolean;
}

const parseArgs = (argv: string[]): Args => {
  const args: Args = {
    jest: path.join(ROOT, "coverage", "jest", "coverage-final.json"),
    browser: path.join(ROOT, "coverage", "browser"),
    out: path.join(ROOT, "coverage", "merged"),
    html: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split("=");
    const value = inline ?? argv[++i];
    if (flag === "--jest") args.jest = value;
    else if (flag === "--browser") args.browser = value;
    else if (flag === "--out") args.out = value;
    else if (flag === "--no-html") args.html = false;
  }
  return args;
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const jestMap = readCoverageJson(args.jest);
  const browserMap = readBrowserDumps(args.browser);

  if (
    Object.keys(jestMap).length === 0 &&
    Object.keys(browserMap).length === 0
  ) {
    console.error(
      `No coverage found.\n  jest:    ${args.jest} (run \`npm run coverage\`)\n  browser: ${args.browser} (run \`EE_COVERAGE=1 npm run simulate -- <table>\`)`,
    );
    process.exit(1);
  }

  const summary = summarizeCoverage(jestMap, browserMap, ROOT);
  const report = formatCoverageReport(summary);
  console.log(report);

  mkdirSync(args.out, { recursive: true });
  writeFileSync(path.join(args.out, "summary.txt"), report);
  const merged = summary.merged;
  writeFileSync(
    path.join(args.out, "merged-coverage.json"),
    JSON.stringify(merged),
  );

  if (args.html) {
    // Our CoverageMap is a plain istanbul FileCoverage record; the lib's
    // typing wants its own class type.
    const coverageMap = libCoverage.createCoverageMap(merged as any);
    const context = libReport.createContext({
      dir: path.join(args.out, "html"),
      coverageMap,
    });
    reports.create("html").execute(context);
    console.log(`\nHTML: ${path.join(args.out, "html", "index.html")}`);
  }
};

main();
