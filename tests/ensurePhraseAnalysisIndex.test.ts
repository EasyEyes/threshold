/** @jest-environment node */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensurePhraseAnalysisIndex } from "../examples/ensurePhraseAnalysisIndex";

jest.mock("node:child_process", () => ({ execFileSync: jest.fn() }));

const execMock = execFileSync as jest.MockedFunction<typeof execFileSync>;

beforeEach(() => {
  jest.clearAllMocks();
});

test("runs the existing website source-index generator", () => {
  ensurePhraseAnalysisIndex();

  const websiteRoot = resolve(__dirname, "../../../..");
  expect(execMock).toHaveBeenCalledTimes(1);
  expect(execMock).toHaveBeenCalledWith(
    process.execPath,
    [resolve(websiteRoot, "scripts/phrase-analysis/build.mjs")],
    { cwd: websiteRoot, stdio: "inherit" },
  );
});

test("the fuzz entry point ensures the index before compiling", () => {
  const source = readFileSync(
    resolve(__dirname, "../server/fuzz/fuzzTables.ts"),
    "utf8",
  );

  expect(source.match(/ensurePhraseAnalysisIndex\(\)/g)).toHaveLength(1);
  expect(source.indexOf("ensurePhraseAnalysisIndex()")).toBeLessThan(
    source.indexOf("loadSpecFromCache(EXAMPLES)"),
  );
});

test("the examples entry point ensures the index once before compiling", () => {
  const source = readFileSync(
    resolve(__dirname, "../examples/buildExamples.ts"),
    "utf8",
  );
  const main = source.match(
    /const main = async \(\) => \{([\s\S]*?)\n\};/,
  )?.[1];

  expect(main).toBeDefined();
  expect(main?.match(/ensurePhraseAnalysisIndex\(\)/g)).toHaveLength(1);
  expect(main?.indexOf("ensurePhraseAnalysisIndex()")).toBeLessThan(
    main!.indexOf("loadGlossaryForNode()"),
  );
});
