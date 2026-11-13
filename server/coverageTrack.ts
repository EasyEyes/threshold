/**
 * Append one coverage line to coverage-history.csv.
 *
 *   npm run coverage          # jest → coverage/jest/coverage-final.json
 *   EE_COVERAGE=1 …           # browser dumps → coverage/browser/*.json (optional)
 *   npm run coverage:track    # append date,tier,pcts,counts
 */

import path from "path";
import { trackCoverage } from "./coverage/track";
import { readBrowserDumps, readCoverageJson } from "./coverage/readCoverage";

const ROOT = process.cwd();

const parseArgs = (argv: string[]) => {
  const args = {
    jest: path.join(ROOT, "coverage", "jest", "coverage-final.json"),
    browser: path.join(ROOT, "coverage", "browser"),
    history: path.join(ROOT, "coverage-history.csv"),
  };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split("=");
    const value = inline ?? argv[++i];
    if (flag === "--jest") args.jest = value;
    else if (flag === "--browser") args.browser = value;
    else if (flag === "--history") args.history = value;
  }
  return args;
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  try {
    const result = trackCoverage({
      jestMap: readCoverageJson(args.jest),
      browserMap: readBrowserDumps(args.browser),
      historyFile: args.history,
    });
    if (result.appended) console.log(`+ ${result.line}`);
    else console.log(`= unchanged: ${result.line}`);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
};

main();
