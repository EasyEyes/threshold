/**
 * Publishes the built EasyEyes runtime as an immutable npm package version,
 * the way remote-calibrator is published, so Studio-compiled ("thin")
 * experiments can load it from jsDelivr for as long as npm exists:
 *
 *     https://cdn.jsdelivr.net/npm/@easyeyes/runtime@<version>/js/threshold.min.js
 *
 * Runs at the end of the Netlify runtime build (threshold `netlify:website`).
 * It is a no-op — one log line, exit 0 — unless EASYEYES_RUNTIME_NPM_TOKEN
 * is set in the build environment, and it never fails the build: any error
 * is logged and the compiler simply finds no release file.
 *
 * What it does when the token is present:
 *   1. Hashes the runtime files (the Pavlovia upload manifest,
 *      preprocess/files.ts) into one fingerprint.
 *   2. Looks the fingerprint up on the registry (dist-tag `fp-<hash>`). If a
 *      version with identical content exists it is reused — most deploys
 *      change the website or the compiler, not the runtime, and identical
 *      runtimes should share one version.
 *   3. Otherwise publishes a new version `1.<YYYYMMDD>.<secondOfDay>` (UTC)
 *      containing exactly those files, then tags it with the fingerprint.
 *   4. Writes runtime-release.json next to index.html — served at
 *      /compiler/threshold/runtime-release.json — naming the package,
 *      version, fingerprint, per-file integrity hashes and the deploy. The
 *      compiler reads that file (same origin as the runtime files) to
 *      build thin experiment repositories; without it, it uploads the
 *      classic full copy.
 *
 * Pure helpers are exported for tests; the CLI runs only when invoked
 * directly.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createHash } from "crypto";
import { spawnSync } from "child_process";
import { _loadFiles } from "../preprocess/files";

export const DEFAULT_PACKAGE = "@easyeyes/runtime";
export const RELEASE_FILE = "runtime-release.json";
export const REGISTRY = "https://registry.npmjs.org/";
export const TOKEN_ENV = "EASYEYES_RUNTIME_NPM_TOKEN";
/**
 * Set to "1" to run everything except the actual upload (`npm publish
 * --dry-run`; no dist-tag, no registry verification). The release file is
 * still written, so the whole path can be trialled.
 */
export const DRY_RUN_ENV = "EASYEYES_RUNTIME_PUBLISH_DRY_RUN";
/** Override the runtime folder (tests and trials); default: this repo. */
export const ROOT_ENV = "EASYEYES_RUNTIME_ROOT";

export interface PackagedFile {
  path: string;
  bytes: Buffer;
}

export interface RuntimeRelease {
  package: string;
  version: string;
  /** https://cdn.jsdelivr.net/npm/<package>@<version>/ */
  cdn: string;
  /** sha256 over every file's path and content; identical runtimes share it */
  fingerprint: string;
  /** SRI hashes (sha384-…) per file, for the record and for verification */
  integrity: Record<string, string>;
  files: string[];
  /** true when an existing version with identical content was reused */
  reused: boolean;
  publishedAt: string;
  deploy: {
    id: string | null;
    commit: string | null;
    branch: string | null;
    context: string | null;
  };
}

/* ------------------------------ pure helpers ------------------------------ */

/** The runtime files that go into the package: the upload manifest minus
 *  the per-experiment js/experimentLanguage.js. */
export const packagedPaths = (loadFiles: string[] = _loadFiles): string[] =>
  loadFiles.filter((f) => f !== "js/experimentLanguage.js");

export const sha256Hex = (bytes: Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");

export const sha384Integrity = (bytes: Buffer): string =>
  `sha384-${createHash("sha384").update(bytes).digest("base64")}`;

/** One hash for the whole runtime: sorted "path sha256" lines. */
export const fingerprintOf = (files: PackagedFile[]): string =>
  sha256Hex(
    Buffer.from(
      [...files]
        .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
        .map((f) => `${f.path} ${sha256Hex(f.bytes)}`)
        .join("\n"),
    ),
  );

/** npm dist-tag under which a fingerprint's version is findable. */
export const fingerprintTag = (fingerprint: string): string =>
  `fp-${fingerprint.slice(0, 16)}`;

/**
 * `1.<YYYYMMDD>.<secondOfDay>` in UTC — valid semver (no leading zeros),
 * sorts chronologically, and reads as a date.
 */
export const versionFor = (date: Date): string => {
  const ymd =
    date.getUTCFullYear() * 10000 +
    (date.getUTCMonth() + 1) * 100 +
    date.getUTCDate();
  const secondOfDay =
    date.getUTCHours() * 3600 +
    date.getUTCMinutes() * 60 +
    date.getUTCSeconds();
  return `1.${ymd}.${secondOfDay}`;
};

export const cdnBaseFor = (pkg: string, version: string): string =>
  `https://cdn.jsdelivr.net/npm/${pkg}@${version}/`;

/**
 * The version already holding this fingerprint, from the registry's package
 * document (dist-tag first, then each version's `easyeyes.runtimeFingerprint`
 * field); null when none.
 */
export const findExistingVersion = (
  registryDoc: any,
  fingerprint: string,
): string | null => {
  if (!registryDoc || typeof registryDoc !== "object") return null;
  const tagged = registryDoc["dist-tags"]?.[fingerprintTag(fingerprint)];
  if (typeof tagged === "string" && registryDoc.versions?.[tagged])
    return tagged;
  for (const [version, meta] of Object.entries<any>(registryDoc.versions ?? {}))
    if (meta?.easyeyes?.runtimeFingerprint === fingerprint) return version;
  return null;
};

export const packageJsonFor = (
  pkg: string,
  version: string,
  fingerprint: string,
  deploy: RuntimeRelease["deploy"],
  files: string[],
) => ({
  name: pkg,
  version,
  description:
    "The EasyEyes experiment runtime, as deployed. Each version is one exact runtime build; Studio-compiled experiments load it from https://cdn.jsdelivr.net/npm/" +
    `${pkg}@${version}/`,
  homepage: "https://easyeyes.app",
  repository: { type: "git", url: "https://github.com/EasyEyes/threshold" },
  license: "SEE LICENSE IN LICENSE",
  publishConfig: { access: "public" },
  files,
  easyeyes: {
    runtimeFingerprint: fingerprint,
    deployId: deploy.id,
    commit: deploy.commit,
    branch: deploy.branch,
    context: deploy.context,
  },
});

export const releaseFor = (
  pkg: string,
  version: string,
  files: PackagedFile[],
  fingerprint: string,
  reused: boolean,
  deploy: RuntimeRelease["deploy"],
  now: Date = new Date(),
): RuntimeRelease => ({
  package: pkg,
  version,
  cdn: cdnBaseFor(pkg, version),
  fingerprint,
  integrity: Object.fromEntries(
    files.map((f) => [f.path, sha384Integrity(f.bytes)]),
  ),
  files: files.map((f) => f.path),
  reused,
  publishedAt: now.toISOString(),
  deploy,
});

/* ---------------------------------- IO ----------------------------------- */

const str = (v: string | undefined): string | null => (v ? v : null);

const readPackagedFiles = (root: string): PackagedFile[] =>
  packagedPaths().map((p) => {
    const abs = path.join(root, p);
    if (!fs.existsSync(abs)) throw new Error(`Runtime file missing: ${p}`);
    return { path: p, bytes: fs.readFileSync(abs) };
  });

const fetchRegistryDoc = async (pkg: string): Promise<any> => {
  const response = await fetch(`${REGISTRY}${encodeURIComponent(pkg)}`, {
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`Registry lookup failed: HTTP ${response.status}`);
  return response.json();
};

const run = (
  cmd: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
) => {
  const result = spawnSync(cmd, args, {
    cwd,
    env,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (result.status !== 0)
    throw new Error(
      `${cmd} ${args.join(" ")} failed (${result.status}):\n${
        result.stderr || result.stdout
      }`,
    );
  return result.stdout;
};

const publish = (
  pkg: string,
  version: string,
  fingerprint: string,
  files: PackagedFile[],
  deploy: RuntimeRelease["deploy"],
): void => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "easyeyes-runtime-"));
  try {
    for (const f of files) {
      const abs = path.join(dir, f.path);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, f.bytes);
    }
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify(
        packageJsonFor(
          pkg,
          version,
          fingerprint,
          deploy,
          files.map((f) => f.path),
        ),
        null,
        2,
      ),
    );
    // The token is read from the environment by npm itself; it is never
    // written to disk or echoed.
    const npmrc = path.join(dir, ".npmrc");
    fs.writeFileSync(
      npmrc,
      `//registry.npmjs.org/:_authToken=\${${TOKEN_ENV}}\n`,
    );
    const env = { ...process.env, NPM_CONFIG_USERCONFIG: npmrc };
    const dryRun = process.env[DRY_RUN_ENV] === "1";
    const out = run(
      "npm",
      [
        "publish",
        "--access",
        "public",
        "--ignore-scripts",
        ...(dryRun ? ["--dry-run"] : []),
      ],
      dir,
      env,
    );
    if (dryRun) {
      console.log(`[runtime publish] dry run — nothing uploaded.\n${out}`);
      return;
    }
    try {
      run(
        "npm",
        ["dist-tag", "add", `${pkg}@${version}`, fingerprintTag(fingerprint)],
        dir,
        env,
      );
    } catch (error) {
      // The fingerprint is also in package.json, so lookup still works.
      console.warn("[runtime publish] dist-tag failed:", error);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const verifyOnRegistry = async (
  pkg: string,
  version: string,
): Promise<void> => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const response = await fetch(
      `${REGISTRY}${encodeURIComponent(pkg)}/${version}`,
    );
    if (response.ok) return;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(
    `${pkg}@${version} not visible on the registry after publish`,
  );
};

export const main = async (): Promise<void> => {
  const root = process.env[ROOT_ENV] || path.join(__dirname, "..");
  const dryRun = process.env[DRY_RUN_ENV] === "1";
  const releasePath = path.join(root, RELEASE_FILE);
  // Never leave a stale release file from an earlier run.
  fs.rmSync(releasePath, { force: true });

  if (!process.env[TOKEN_ENV]) {
    console.log(
      `[runtime publish] ${TOKEN_ENV} not set — runtime not published to npm; ` +
        "Studio compiles upload the full runtime copy.",
    );
    return;
  }

  try {
    const pkg = process.env.EASYEYES_RUNTIME_PACKAGE || DEFAULT_PACKAGE;
    const deploy = {
      id: str(process.env.DEPLOY_ID),
      commit: str(process.env.COMMIT_REF),
      branch: str(process.env.BRANCH),
      context: str(process.env.CONTEXT),
    };
    const files = readPackagedFiles(root);
    const fingerprint = fingerprintOf(files);
    const existing = findExistingVersion(
      await fetchRegistryDoc(pkg),
      fingerprint,
    );

    let version: string;
    if (existing) {
      version = existing;
      console.log(
        `[runtime publish] runtime unchanged — reusing ${pkg}@${version}`,
      );
    } else {
      version = versionFor(new Date());
      publish(pkg, version, fingerprint, files, deploy);
      if (!dryRun) await verifyOnRegistry(pkg, version);
      console.log(
        `[runtime publish] published ${pkg}@${version} (${
          files.length
        } files, ${(
          files.reduce((n, f) => n + f.bytes.length, 0) / 1e6
        ).toFixed(1)} MB)`,
      );
    }

    const release = releaseFor(
      pkg,
      version,
      files,
      fingerprint,
      Boolean(existing),
      deploy,
    );
    fs.writeFileSync(releasePath, JSON.stringify(release, null, 2));
    console.log(`[runtime publish] wrote ${RELEASE_FILE} → ${release.cdn}`);
  } catch (error) {
    fs.rmSync(releasePath, { force: true });
    console.warn(
      "[runtime publish] failed; the site deploy continues and Studio compiles " +
        "upload the full runtime copy:",
      error,
    );
  }
};

// Run as CLI when invoked directly (tsx/node), not when imported by tests.
if (process.argv[1] && /publishRuntime\.[tj]s$/.test(process.argv[1]))
  main().then(() => process.exit(0));
