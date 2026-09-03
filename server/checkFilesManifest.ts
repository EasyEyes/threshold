/**
 * Verifies the Pavlovia upload manifest (preprocess/files.ts) covers every
 * file vite emits into js/. A missing chunk 404s hosted experiments; a stale
 * manifest entry 404s the compiler's fetch. Run after `vite build`
 * (wired into `npm run build`).
 */
import * as fs from "fs";
import * as path from "path";

export interface ManifestJsDiff {
  // Built files a hosted experiment could request but the compiler won't upload
  missingFromManifest: string[];
  // Manifest entries the compiler will try (and fail) to fetch
  missingOnDisk: string[];
}

export const diffManifestVsJsFiles = (
  jsFiles: string[],
  manifestFiles: string[],
  existsOnDisk: (f: string) => boolean,
): ManifestJsDiff => {
  const manifestSet = new Set(manifestFiles);
  return {
    missingFromManifest: jsFiles
      .filter((f) => !manifestSet.has(`js/${f}`))
      .map((f) => `js/${f}`),
    // Every entry is validated: matchPattern force-includes files the
    // disk walk never saw, so any of them can go stale.
    missingOnDisk: manifestFiles.filter((f) => !existsOnDisk(f)),
  };
};

export const listJsFiles = (dir: string, prefix = ""): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? listJsFiles(path.join(dir, e.name), `${prefix}${e.name}/`)
        : e.isFile()
        ? [`${prefix}${e.name}`]
        : [],
    );

// Duplicated paths make GitLab reject the whole commit body.
export const findDuplicates = (list: string[]): string[] => [
  ...new Set(list.filter((f, i) => list.indexOf(f) !== i)),
];

// The compiler also keeps a copy at ../source/components/files.ts.
export const findManifestDrift = (
  thresholdFiles: string[],
  parentFiles: string[],
): string[] => {
  const a = new Set(thresholdFiles);
  const b = new Set(parentFiles);
  return [
    ...thresholdFiles
      .filter((f) => !b.has(f))
      .map((f) => `only in threshold/preprocess/files.ts: ${f}`),
    ...parentFiles
      .filter((f) => !a.has(f))
      .map((f) => `only in source/components/files.ts: ${f}`),
  ];
};

export const readManifestFiles = (filesTsPath: string): string[] => {
  const src = fs.readFileSync(filesTsPath, "utf8");
  const match = src.match(/_loadFiles:\s*string\[\]\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error(`Could not parse _loadFiles from ${filesTsPath}`);
  // Prettier emits a trailing comma, which JSON.parse rejects.
  return JSON.parse(match[1].replace(/,\s*]/, "]"));
};

const main = () => {
  const root = path.join(__dirname, "..");
  const jsDir = path.join(root, "js");
  if (!fs.existsSync(jsDir)) {
    console.error(
      "Build output directory js/ not found — did the vite outDir change?",
    );
    process.exit(1);
  }
  const jsFiles = listJsFiles(jsDir);
  const manifestFiles = readManifestFiles(
    path.join(root, "preprocess/files.ts"),
  );
  const { missingFromManifest, missingOnDisk } = diffManifestVsJsFiles(
    jsFiles,
    manifestFiles,
    (f) => fs.existsSync(path.join(root, f)),
  );
  // Absent in a standalone threshold deploy — skip silently.
  const parentCopy = path.join(root, "..", "source/components/files.ts");
  const parentFiles = fs.existsSync(parentCopy)
    ? readManifestFiles(parentCopy)
    : null;
  const drift = parentFiles
    ? findManifestDrift(manifestFiles, parentFiles)
    : [];
  const duplicates = [
    ...findDuplicates(manifestFiles),
    ...(parentFiles ? findDuplicates(parentFiles) : []),
  ];
  if (duplicates.length)
    console.error(
      `Duplicated manifest entries (GitLab rejects the commit):\n  ${duplicates.join(
        "\n  ",
      )}`,
    );
  if (drift.length)
    console.error(`Manifest copies disagree:\n  ${drift.join("\n  ")}`);
  if (
    missingFromManifest.length ||
    missingOnDisk.length ||
    drift.length ||
    duplicates.length
  ) {
    if (missingFromManifest.length)
      console.error(
        `Build output missing from preprocess/files.ts (would 404 on Pavlovia):\n  ${missingFromManifest.join(
          "\n  ",
        )}`,
      );
    if (missingOnDisk.length)
      console.error(
        `preprocess/files.ts entries with no file on disk (compiler fetch would 404):\n  ${missingOnDisk.join(
          "\n  ",
        )}`,
      );
    console.error(
      "\nFix: run `npm run files` from docs/experiment/ and commit the result.",
    );
    process.exit(1);
  }
  console.log(
    `Manifest check OK: ${jsFiles.length} js/ build files all listed in preprocess/files.ts.`,
  );
};

// Run as CLI when invoked directly (tsx/node), not when imported by tests.
if (process.argv[1] && /checkFilesManifest\.[tj]s$/.test(process.argv[1]))
  main();
