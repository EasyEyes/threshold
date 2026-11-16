/**
 * Append one coverage line to coverage-history.csv.
 *
 *   npm run coverage          # jest → coverage/jest/coverage-final.json
 *   EE_COVERAGE=1 …           # browser dumps → coverage/browser/*.json (optional)
 *   npm run coverage:track    # append date,tier,pcts,counts
 */

import path from "path";
import { existsSync, readFileSync } from "fs";
import { execFileSync } from "child_process";
import { trackCoverage } from "./coverage/track";
import { readBrowserDumps, readCoverageJson } from "./coverage/readCoverage";
import { formatTldr, tldrFromHistory } from "./coverage/tldr";

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

/** The committed history, for a delta the commit message actually wants. */
const readHeadHistory = (historyFile: string): string[] | undefined => {
  try {
    const rel = path.relative(process.cwd(), historyFile) || ".";
    const text = execFileSync(
      "git",
      ["show", `HEAD:./${rel.split(path.sep).join("/")}`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return text.split(/\r?\n/);
  } catch {
    return undefined; // not a repo, file untracked in HEAD, no git
  }
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

    const history = existsSync(args.history)
      ? readFileSync(args.history, "utf8").split(/\r?\n/)
      : [];
    const tldr = tldrFromHistory(history, {
      baseline: readHeadHistory(args.history),
    });
    if (tldr)
      console.log(
        formatTldr(tldr, {
          color: !!process.stdout.isTTY && !process.env.NO_COLOR,
        }),
      );
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
};

main();
