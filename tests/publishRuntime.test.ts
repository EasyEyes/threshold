// server/publishRuntime.ts: at the end of a Netlify runtime build, publish the
// built runtime as an immutable npm version (the remote-calibrator pattern)
// for Studio's thin repositories to load from jsDelivr. Inert without a token.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createHash } from "crypto";

jest.mock("../preprocess/files", () => ({
  _loadDir: "/compiler/threshold/",
  _loadFiles: [
    "LICENSE",
    "index.html",
    "js/experimentLanguage.js",
    "js/first.min.js",
    "js/threshold.min.js",
    "models/detector/model.json",
  ],
}));

import {
  cdnBaseFor,
  DEFAULT_PACKAGE,
  DRY_RUN_ENV,
  findExistingVersion,
  fingerprintOf,
  fingerprintTag,
  main,
  packagedPaths,
  packageJsonFor,
  RELEASE_FILE,
  releaseFor,
  ROOT_ENV,
  sha384Integrity,
  TOKEN_ENV,
  versionFor,
} from "../server/publishRuntime";

const file = (p: string, text: string) => ({
  path: p,
  bytes: Buffer.from(text),
});
const DEPLOY = {
  id: "6aa0",
  commit: "078e7f9",
  branch: "main",
  context: "production",
};

describe("what goes into the package", () => {
  it("is the Pavlovia upload manifest minus the per-experiment language file", () => {
    expect(packagedPaths()).toEqual([
      "LICENSE",
      "index.html",
      "js/first.min.js",
      "js/threshold.min.js",
      "models/detector/model.json",
    ]);
  });
});

describe("fingerprint", () => {
  const a = [file("js/threshold.min.js", "T"), file("js/first.min.js", "F")];

  it("is the same for the same content regardless of order", () => {
    expect(fingerprintOf(a)).toBe(fingerprintOf([...a].reverse()));
    expect(fingerprintOf(a)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when any byte or path changes", () => {
    expect(fingerprintOf([a[0], file("js/first.min.js", "F2")])).not.toBe(
      fingerprintOf(a),
    );
    expect(fingerprintOf([a[0], file("js/first2.min.js", "F")])).not.toBe(
      fingerprintOf(a),
    );
  });

  it("has a short dist-tag form", () => {
    const fp = fingerprintOf(a);
    expect(fingerprintTag(fp)).toBe(`fp-${fp.slice(0, 16)}`);
  });
});

describe("version", () => {
  it("is valid semver that reads as a UTC date and sorts chronologically", () => {
    expect(versionFor(new Date("2026-09-09T06:11:35Z"))).toBe(
      `1.20260909.${6 * 3600 + 11 * 60 + 35}`,
    );
    // No leading zeros (semver forbids them): first second of the day is 0.
    expect(versionFor(new Date("2026-01-01T00:00:00Z"))).toBe("1.20260101.0");
    const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
    expect(versionFor(new Date("2026-01-01T00:00:00Z"))).toMatch(semver);
    expect(versionFor(new Date("2026-12-31T23:59:59Z"))).toMatch(semver);
  });

  it("maps to the jsDelivr folder URL", () => {
    expect(cdnBaseFor(DEFAULT_PACKAGE, "1.20260909.22295")).toBe(
      "https://cdn.jsdelivr.net/npm/@easyeyes/runtime@1.20260909.22295/",
    );
  });
});

describe("reusing an identical published runtime", () => {
  const fp = "ab".repeat(32);

  it("finds it by dist-tag", () => {
    const doc = {
      "dist-tags": { latest: "1.2.3", [fingerprintTag(fp)]: "1.2.2" },
      versions: { "1.2.2": {}, "1.2.3": {} },
    };
    expect(findExistingVersion(doc, fp)).toBe("1.2.2");
  });

  it("finds it by the fingerprint recorded in package.json", () => {
    const doc = {
      "dist-tags": { latest: "1.2.3" },
      versions: {
        "1.2.2": { easyeyes: { runtimeFingerprint: fp } },
        "1.2.3": { easyeyes: { runtimeFingerprint: "other" } },
      },
    };
    expect(findExistingVersion(doc, fp)).toBe("1.2.2");
  });

  it("is null for a new runtime, a new package, or a dangling tag", () => {
    expect(findExistingVersion(null, fp)).toBeNull();
    expect(findExistingVersion({ versions: {} }, fp)).toBeNull();
    expect(
      findExistingVersion(
        { "dist-tags": { [fingerprintTag(fp)]: "9.9.9" }, versions: {} },
        fp,
      ),
    ).toBeNull();
  });
});

describe("package.json and the release file", () => {
  const files = [
    file("index.html", "<html>"),
    file("js/threshold.min.js", "T"),
  ];
  const fp = fingerprintOf(files);

  it("describes the package as public, with the fingerprint and deploy recorded", () => {
    const pkg = packageJsonFor(DEFAULT_PACKAGE, "1.2.3", fp, DEPLOY, [
      "index.html",
    ]);
    expect(pkg).toMatchObject({
      name: "@easyeyes/runtime",
      version: "1.2.3",
      publishConfig: { access: "public" },
      files: ["index.html"],
      easyeyes: { runtimeFingerprint: fp, deployId: "6aa0", commit: "078e7f9" },
    });
    expect(pkg.description).toContain(
      "cdn.jsdelivr.net/npm/@easyeyes/runtime@1.2.3/",
    );
  });

  it("records what the compiler needs: cdn, fingerprint, per-file SRI", () => {
    const release = releaseFor(
      DEFAULT_PACKAGE,
      "1.2.3",
      files,
      fp,
      false,
      DEPLOY,
      new Date("2026-09-09T06:11:35Z"),
    );
    expect(release).toEqual({
      package: "@easyeyes/runtime",
      version: "1.2.3",
      cdn: "https://cdn.jsdelivr.net/npm/@easyeyes/runtime@1.2.3/",
      fingerprint: fp,
      integrity: {
        "index.html": sha384Integrity(Buffer.from("<html>")),
        "js/threshold.min.js": `sha384-${createHash("sha384")
          .update("T")
          .digest("base64")}`,
      },
      files: ["index.html", "js/threshold.min.js"],
      reused: false,
      publishedAt: "2026-09-09T06:11:35.000Z",
      deploy: DEPLOY,
    });
  });
});

describe("main (the build step)", () => {
  let root: string;
  const env = { ...process.env };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "publish-runtime-test-"));
    process.env[ROOT_ENV] = root;
    delete process.env[TOKEN_ENV];
    delete process.env[DRY_RUN_ENV];
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    process.env = { ...env };
    jest.restoreAllMocks();
  });

  it("does nothing but log when there is no token, and removes a stale release file", async () => {
    fs.writeFileSync(path.join(root, RELEASE_FILE), "{}");
    await main();
    expect(fs.existsSync(path.join(root, RELEASE_FILE))).toBe(false);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining(`${TOKEN_ENV} not set`),
    );
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("never throws: a broken build (file missing) is logged and leaves no release file", async () => {
    process.env[TOKEN_ENV] = "token";
    global.fetch = jest.fn().mockResolvedValue(new Response("{}")) as any;
    await expect(main()).resolves.toBeUndefined();
    expect(fs.existsSync(path.join(root, RELEASE_FILE))).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("failed"),
      expect.objectContaining({ message: expect.stringContaining("missing") }),
    );
  });

  it("reuses an identical published version instead of publishing again", async () => {
    process.env[TOKEN_ENV] = "token";
    for (const p of packagedPaths()) {
      fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
      fs.writeFileSync(path.join(root, p), `content of ${p}`);
    }
    const fp = fingerprintOf(
      packagedPaths().map((p) => file(p, `content of ${p}`)),
    );
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          "dist-tags": { [fingerprintTag(fp)]: "1.20260901.100" },
          versions: { "1.20260901.100": {} },
        }),
      ),
    ) as any;
    await main();
    const release = JSON.parse(
      fs.readFileSync(path.join(root, RELEASE_FILE), "utf8"),
    );
    expect(release).toMatchObject({
      package: DEFAULT_PACKAGE,
      version: "1.20260901.100",
      cdn: "https://cdn.jsdelivr.net/npm/@easyeyes/runtime@1.20260901.100/",
      fingerprint: fp,
      reused: true,
    });
    expect(release.files).toEqual(packagedPaths());
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("reusing @easyeyes/runtime@1.20260901.100"),
    );
  });
});
