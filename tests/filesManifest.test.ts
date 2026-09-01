/**
 * The Pavlovia upload manifest (preprocess/files.ts, _loadFiles) must cover
 * every file vite emits into js/, or hosted experiments 404 on missing chunks.
 *
 * @jest-environment node
 */

import * as fs from "fs";
import * as path from "path";
import { describe, expect, test } from "@jest/globals";
import {
  diffManifestVsJsFiles,
  findDuplicates,
  findManifestDrift,
  listJsFiles,
  readManifestFiles,
} from "../server/checkFilesManifest";

describe("diffManifestVsJsFiles", () => {
  const allExist = () => true;

  test("clean when every js/ file is in the manifest", () => {
    const jsFiles = ["threshold.min.js", "first.min.js", "index.js"];
    const manifest = jsFiles.map((f) => `js/${f}`);
    const { missingFromManifest, missingOnDisk } = diffManifestVsJsFiles(
      jsFiles,
      manifest,
      allExist,
    );
    expect(missingFromManifest).toEqual([]);
    expect(missingOnDisk).toEqual([]);
  });

  test("flags a build chunk absent from the manifest (the rng.js bug)", () => {
    const jsFiles = ["threshold.min.js", "rng.js"];
    const manifest = ["js/threshold.min.js"];
    const { missingFromManifest } = diffManifestVsJsFiles(
      jsFiles,
      manifest,
      allExist,
    );
    expect(missingFromManifest).toEqual(["js/rng.js"]);
  });

  test("flags a manifest entry with no file on disk (upload would 404)", () => {
    const jsFiles = ["threshold.min.js"];
    const manifest = ["js/threshold.min.js", "js/sentry-injection.js"];
    const { missingOnDisk } = diffManifestVsJsFiles(
      jsFiles,
      manifest,
      (f) => f === "js/threshold.min.js",
    );
    expect(missingOnDisk).toEqual(["js/sentry-injection.js"]);
  });

  test("flags a matchPattern entry deleted from disk (compiler fetch would 404)", () => {
    const jsFiles = ["threshold.min.js"];
    const manifest = [
      "js/threshold.min.js",
      "components/images/favicon.ico", // force-included, not from the disk walk
    ];
    const { missingOnDisk } = diffManifestVsJsFiles(
      jsFiles,
      manifest,
      (f) => f === "js/threshold.min.js",
    );
    expect(missingOnDisk).toEqual(["components/images/favicon.ico"]);
  });
});

describe("listJsFiles", () => {
  test("recurses into subdirectories (future js/assets/ output)", () => {
    const tmp = fs.mkdtempSync(path.join(__dirname, "tmp-js-"));
    try {
      fs.writeFileSync(path.join(tmp, "threshold.min.js"), "x");
      fs.mkdirSync(path.join(tmp, "assets"));
      fs.writeFileSync(path.join(tmp, "assets", "chunk.js"), "x");
      const files = listJsFiles(tmp).sort();
      expect(files).toEqual(["assets/chunk.js", "threshold.min.js"]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("findManifestDrift", () => {
  test("empty when the two manifest copies agree", () => {
    expect(findManifestDrift(["a", "b"], ["b", "a"])).toEqual([]);
  });
  test("flags entries present in only one copy", () => {
    expect(findManifestDrift(["a", "b"], ["a", "c"])).toEqual([
      "only in threshold/preprocess/files.ts: b",
      "only in source/components/files.ts: c",
    ]);
  });
});

describe("findDuplicates", () => {
  // A duplicated path makes GitLab reject the whole commit body.
  test("empty when all entries are unique", () => {
    expect(findDuplicates(["a", "b", "c"])).toEqual([]);
  });
  test("flags each repeated entry once", () => {
    expect(findDuplicates(["a", "b", "a", "b", "b"])).toEqual(["a", "b"]);
  });
});

describe("readManifestFiles", () => {
  test("parses the real generated file (trailing comma, TS annotation)", () => {
    const files = readManifestFiles(
      path.join(__dirname, "../preprocess/files.ts"),
    );
    expect(files.length).toBeGreaterThan(0);
    expect(files).toContain("js/threshold.min.js");
    expect(files.every((f) => typeof f === "string")).toBe(true);
  });
});

describe("build wiring", () => {
  const root = path.join(__dirname, "..");

  test("server/checkFilesManifest.ts exists", () => {
    expect(fs.existsSync(path.join(root, "server/checkFilesManifest.ts"))).toBe(
      true,
    );
  });

  test("npm run build runs the manifest check after vite build", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    );
    const build: string = pkg.scripts.build;
    const viteIdx = build.indexOf("vite build");
    const checkIdx = build.indexOf("checkFilesManifest");
    expect(viteIdx).toBeGreaterThan(-1);
    expect(checkIdx).toBeGreaterThan(viteIdx);
  });

  test("CLI guard fires for both .ts and .js invocations", () => {
    const src = fs.readFileSync(
      path.join(root, "server/checkFilesManifest.ts"),
      "utf8",
    );
    const guard = src.match(/if \(process\.argv\[1\] && (\/.*\/)\.test/);
    expect(guard).not.toBeNull();
    const re = eval(guard![1]);
    expect(re.test("/x/server/checkFilesManifest.ts")).toBe(true);
    expect(re.test("/x/server/checkFilesManifest.js")).toBe(true);
    expect(re.test("/x/server/other.ts")).toBe(false);
  });
});
