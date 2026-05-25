"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

let writeGlossaryFiles;
beforeAll(() => {
  ({ writeGlossaryFiles } = require("../prepare-glossary.cjs"));
});

describe("writeGlossaryFiles", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "glossary-test-"));
    fs.mkdirSync(path.join(tmpDir, "parameters"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  test("glossary.ts exists on disk when the promise resolves", async () => {
    await writeGlossaryFiles(tmpDir, {}, [], []);
    expect(fs.existsSync(path.join(tmpDir, "parameters", "glossary.ts"))).toBe(true);
  });

  test("glossary-full.ts exists on disk when the promise resolves", async () => {
    await writeGlossaryFiles(tmpDir, {}, [], []);
    expect(fs.existsSync(path.join(tmpDir, "parameters", "glossary-full.ts"))).toBe(true);
  });

  test("resolves (does not reject) when a write fails, and logs the error", async () => {
    const badDir = path.join(tmpDir, "nonexistent");
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await expect(writeGlossaryFiles(badDir, {}, [], [])).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error! Couldn't write to the file.",
      expect.objectContaining({ code: "ENOENT" })
    );
    consoleSpy.mockRestore();
  });
});
