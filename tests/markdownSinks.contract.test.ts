/**
 * Contract: participant-facing phrase text must go through renderMarkdown
 * before entering the DOM (AGENTS.md text-rendering doctrine).
 *
 * Phrases v20.0 added Markdown (**bold**) to ~140 phrases. Any raw
 * `innerHTML = readi18nPhrases(...)` sink prints literal asterisks — found
 * live in RC_findModel*, EE_DymoHelp, and the QR-explanation messages.
 * This scan fails if any raw phrase→innerHTML sink (re)appears.
 */
import * as fs from "fs";
import * as glob from "glob";

const FILES = [
  ...glob.sync("components/*.js"),
  ...glob.sync("components/*.ts"),
  "threshold.js",
];

// phrase text assigned to innerHTML without renderMarkdown wrapping
const RAW_PATTERNS: Array<{ name: string; re: RegExp }> = [
  {
    name: "innerHTML = readi18nPhrases(",
    re: /innerHTML\s*=\s*readi18nPhrases\(/,
  },
  {
    name: "innerHTML = inst.replace(",
    re: /innerHTML\s*=\s*inst\.replace\(/,
  },
  {
    name: "innerHTML = getMessageForQR(",
    re: /innerHTML\s*=\s*getMessageForQR\(/,
  },
  {
    name: "innerHTML = messageForQr",
    re: /innerHTML\s*=\s*messageForQr\b/,
  },
];

describe("phrase→DOM sinks use renderMarkdown", () => {
  const violations: string[] = [];
  for (const f of FILES) {
    const lines = fs.readFileSync(f, "utf-8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes("renderMarkdown")) return;
      for (const { name, re } of RAW_PATTERNS) {
        if (re.test(line)) violations.push(`${f}:${i + 1}  ${name}`);
      }
    });
  }

  test("no raw phrase→innerHTML sinks", () => {
    expect(violations).toEqual([]);
  });
});
