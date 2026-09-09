// hostedRuntime: a Studio compile's thin repository loads the runtime from the
// immutable npm version the build published (jsDelivr), with integrity hashes,
// and commits only the experiment's own files plus the small runtime files
// the page looks up relative to itself. Without a published version (no npm
// token in the build yet) the classic full copy is uploaded.

import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";

jest.mock("../components/sentry", () => ({
  captureError: jest.fn(),
  captureMessage: jest.fn(),
}));
jest.mock("../preprocess/files", () => ({
  _loadDir: "/compiler/threshold/",
  _loadFiles: [
    "LICENSE",
    "coi-serviceworker.js",
    "components/images/favicon.ico",
    "index-stepper-bool.html",
    "index.html",
    "js/easyeyes_wasm.js",
    "js/easyeyes_wasm.min.js.map",
    "js/experimentLanguage.js",
    "js/first.min.js",
    "js/first.min.js.map",
    "js/threshold.css",
    "js/threshold.min.js",
    "js/threshold.min.js.map",
    "models/README",
    "models/detector/group1-shard1of1.bin",
    "models/detector/model.json",
    "recruitmentServiceConfig.csv",
  ],
}));

import * as sentry from "../components/sentry";
import {
  clearHostedRuntimeCache,
  committedRuntimeFiles,
  fetchCompilerDeploy,
  fetchPublishedRuntime,
  gatherHostedRuntimeActions,
  hostedRuntimeFiles,
  isHostedRuntimeFile,
  NETLIFY_SITE_API,
  RELEASE_FILE,
  resolveHostedRuntime,
  rewriteIndexHtml,
  runtimeRouterScript,
  RUNTIME_RECORD_PATH,
  sha384Integrity,
} from "../preprocess/hostedRuntime";

const DEPLOY = {
  id: "6aa064ea90fe8ed10353f05a",
  publishedAt: "2026-09-08T19:48:48.928Z",
  siteName: "easyeyes",
  branch: "main",
  commit: "078e7f9",
  context: "production",
};

const PKG = "@easyeyes/runtime";
const VERSION = "1.20260909.22295";
const CDN = `https://cdn.jsdelivr.net/npm/${PKG}@${VERSION}/`;
/** Where the compiler reads its own release file from. */
const RELEASE_URL = `/compiler/threshold/${RELEASE_FILE}`;

const PAGE = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script src="coi-serviceworker.js"></script>
    <script
      src="https://js.sentry-cdn.com/abc.min.js"
      crossorigin="anonymous"
      data-lazy="no"
    ></script>
    <link rel="icon" type="image/x-icon" href="components/images/favicon.ico" />
  </head>
  <body>
    <div id="root"></div>
    <script>
      (function () { window._failedScripts = []; })();
    </script>
    <script src="js/experimentLanguage.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/remote-calibrator@0.9.161"></script>
    <script type="module" src="js/first.min.js"></script>
    <script type="module" src="js/threshold.min.js" defer></script>
  </body>
</html>
`;
const STEPPER_PAGE = PAGE.replace(
  "remote-calibrator@0.9.161",
  "remote-calibrator@0.8.881",
);

const sri = (text: string) =>
  `sha384-${createHash("sha384").update(text).digest("base64")}`;

/** The package's files as jsDelivr would serve them. */
const HOSTED: Record<string, string | Uint8Array> = {
  "index.html": PAGE,
  "index-stepper-bool.html": STEPPER_PAGE,
  LICENSE: "MIT",
  "coi-serviceworker.js": "/* coi */",
  "components/images/favicon.ico": new Uint8Array([0, 1, 2, 255]),
  "js/threshold.css": "body{}",
  "recruitmentServiceConfig.csv": "name,url",
  "js/first.min.js": "console.log('first')",
  "js/threshold.min.js": "console.log('threshold')",
};

/** runtime-release.json as server/publishRuntime.ts writes it. */
const published = () => ({
  package: PKG,
  version: VERSION,
  cdn: CDN,
  fingerprint:
    "dfaaeb4f28ca269cc561b0b40e87f0a9ccf634dc2bdaf1592390d5c1d26b81db",
  integrity: Object.fromEntries(
    Object.entries(HOSTED)
      .filter(([, body]) => typeof body === "string")
      .map(([file, body]) => [file, sri(body as string)]),
  ),
  files: Object.keys(HOSTED),
  reused: false,
  publishedAt: "2026-09-09T06:11:35.000Z",
  deploy: {
    id: DEPLOY.id,
    commit: DEPLOY.commit,
    branch: DEPLOY.branch,
    context: DEPLOY.context,
  },
});

const netlifySite = (deploy = DEPLOY) => ({
  name: deploy.siteName,
  published_deploy: {
    id: deploy.id,
    published_at: deploy.publishedAt,
    branch: deploy.branch,
    commit_ref: deploy.commit,
    context: deploy.context,
  },
});

const response = (body: string | Uint8Array, status = 200): Response =>
  new Response(body as any, {
    status,
    headers: { "Content-Type": "text/plain" },
  });

/**
 * fetch() serving the Netlify site API, the compiler's release file (null:
 * none — the build did not publish) and the CDN copy of the package;
 * anything else 404s.
 */
const installFetch = ({
  release = published() as any,
  cdnFiles = HOSTED,
  overrides = {} as Record<string, () => Response | Promise<Response>>,
} = {}) => {
  const calls: string[] = [];
  global.fetch = jest.fn(async (input: any) => {
    const url = typeof input === "string" ? input : input.url;
    calls.push(url);
    if (overrides[url]) return overrides[url]();
    if (url === NETLIFY_SITE_API)
      return new Response(JSON.stringify(netlifySite()));
    if (url === RELEASE_URL)
      return release === null
        ? response("nf", 404)
        : new Response(
            typeof release === "string" ? release : JSON.stringify(release),
          );
    if (url.startsWith(CDN)) {
      const file = url.slice(CDN.length);
      return file in cdnFiles ? response(cdnFiles[file]) : response("nf", 404);
    }
    return response("not found", 404);
  }) as any;
  return calls;
};

beforeEach(() => {
  jest.clearAllMocks();
  clearHostedRuntimeCache();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

describe("which runtime files are hosted", () => {
  it("hosts the built JavaScript, its source maps and the models", () => {
    expect(hostedRuntimeFiles()).toEqual([
      "js/easyeyes_wasm.js",
      "js/easyeyes_wasm.min.js.map",
      "js/first.min.js",
      "js/first.min.js.map",
      "js/threshold.min.js",
      "js/threshold.min.js.map",
      "models/README",
      "models/detector/group1-shard1of1.bin",
      "models/detector/model.json",
    ]);
  });

  it("commits everything the page looks up relative to itself", () => {
    expect(committedRuntimeFiles()).toEqual([
      "LICENSE",
      "coi-serviceworker.js",
      "components/images/favicon.ico",
      "index-stepper-bool.html",
      "index.html",
      "js/threshold.css",
      "recruitmentServiceConfig.csv",
    ]);
    // Generated per experiment, never hosted.
    expect(isHostedRuntimeFile("js/experimentLanguage.js")).toBe(false);
  });
});

describe("rewriteIndexHtml", () => {
  const release = {
    baseUrl: CDN,
    published: published(),
    integrity: {
      "js/first.min.js": "sha384-FIRST",
      "js/threshold.min.js": "sha384-THRESHOLD",
    },
  };

  it("points the runtime's module scripts at the CDN, with integrity and crossorigin", () => {
    const out = rewriteIndexHtml(PAGE, release);
    expect(out).toContain(
      `<script type="module" src="${CDN}js/first.min.js" integrity="sha384-FIRST" crossorigin="anonymous"></script>`,
    );
    expect(out).toContain(
      `<script type="module" src="${CDN}js/threshold.min.js" defer integrity="sha384-THRESHOLD" crossorigin="anonymous"></script>`,
    );
    expect(out).not.toMatch(/src="js\/(first|threshold)\.min\.js"/);
  });

  it("leaves the per-experiment, page-relative and other CDN scripts alone", () => {
    const out = rewriteIndexHtml(PAGE, release);
    expect(out).toContain('<script src="js/experimentLanguage.js"></script>');
    expect(out).toContain('<script src="coi-serviceworker.js"></script>');
    expect(out).toContain(
      '<script src="https://cdn.jsdelivr.net/npm/remote-calibrator@0.9.161"></script>',
    );
    expect(out).toContain('href="components/images/favicon.ico"');
    // Inline scripts untouched
    expect(out).toContain("window._failedScripts = [];");
  });

  it("installs the router as the first thing in <head>", () => {
    const out = rewriteIndexHtml(PAGE, release);
    const head = out.indexOf("<head>");
    const router = out.indexOf("EasyEyes hosted runtime");
    const firstOther = out.indexOf('<meta charset="utf-8" />');
    expect(head).toBeGreaterThan(-1);
    expect(router).toBeGreaterThan(head);
    expect(router).toBeLessThan(firstOther);
    expect(out.match(/EasyEyes hosted runtime/g)).toHaveLength(1);
    expect(out).toContain(`var RUNTIME = "${CDN}";`);
  });

  it("refuses pages that do not look like the runtime's", () => {
    expect(() =>
      rewriteIndexHtml("<html><head></head><body>hi</body></html>", release),
    ).toThrow(/threshold\.min\.js/);
    expect(() =>
      rewriteIndexHtml(
        '<html><body><script type="module" src="js/threshold.min.js"></script></body></html>',
        release,
      ),
    ).toThrow(/<head>/);
    expect(() => rewriteIndexHtml(PAGE, { ...release, integrity: {} })).toThrow(
      /integrity/,
    );
  });

  it("rewrites the real index.html and index-stepper-bool.html", () => {
    for (const page of ["index.html", "index-stepper-bool.html"]) {
      const html = fs.readFileSync(path.join(__dirname, "..", page), "utf8");
      const out = rewriteIndexHtml(html, release);
      expect(out).toContain(`src="${CDN}js/first.min.js"`);
      expect(out).toContain(`src="${CDN}js/threshold.min.js"`);
      expect(out).toContain('src="js/experimentLanguage.js"');
      expect(out.match(/integrity="sha384-(FIRST|THRESHOLD)"/g)).toHaveLength(
        2,
      );
    }
  });
});

describe("the router installed in index.html", () => {
  // Runs the inline script against a fake page at run.pavlovia.org.
  const install = (href: string) => {
    const html = runtimeRouterScript({ baseUrl: CDN, published: published() });
    const body = html.replace(/^\s*<script>/, "").replace(/<\/script>\s*$/, "");
    const native = jest.fn(async () => "response");
    const win: any = { fetch: native };
    new Function("window", "location", "URL", "Request", body)(
      win,
      { href },
      URL,
      Request,
    );
    return { win, native };
  };
  const HERE = "https://run.pavlovia.org/denis/myExp/";

  it("records the runtime on window.EasyEyesRuntime", () => {
    const { win } = install(`${HERE}index.html?participant=7`);
    expect(win.EasyEyesRuntime).toEqual({
      base: CDN,
      package: PKG,
      version: VERSION,
    });
  });

  it("sends the models remote-calibrator asks for to the CDN", async () => {
    const { win, native } = install(`${HERE}index.html?participant=7`);
    await win.fetch("./models/detector/model.json");
    await win.fetch("models/detector/group1-shard1of1.bin", {
      cache: "no-cache",
    });
    await win.fetch(`${HERE}models/landmark/model.json`);
    expect(native.mock.calls.map((c: any[]) => c[0])).toEqual([
      `${CDN}models/detector/model.json`,
      `${CDN}models/detector/group1-shard1of1.bin`,
      `${CDN}models/landmark/model.json`,
    ]);
    expect(native.mock.calls[1][1]).toEqual({ cache: "no-cache" });
  });

  it("works when the page URL is the folder itself", async () => {
    const { win, native } = install(HERE);
    await win.fetch("./models/detector/model.json");
    expect(native.mock.calls[0][0]).toBe(`${CDN}models/detector/model.json`);
  });

  it("passes every other request through untouched", async () => {
    const { win, native } = install(`${HERE}index.html`);
    const req = new Request(`${HERE}conditions/block_1.csv`);
    await win.fetch("conditions/block_1.csv");
    await win.fetch("CompatibilityRequirements.txt");
    await win.fetch("https://api.example.com/models/x");
    await win.fetch(
      `https://run.pavlovia.org/denis/other/models/detector/model.json`,
    );
    await win.fetch(new URL("fonts/Sloan.woff2", HERE));
    await win.fetch(req);
    expect(native.mock.calls.map((c: any[]) => c[0])).toEqual([
      "conditions/block_1.csv",
      "CompatibilityRequirements.txt",
      "https://api.example.com/models/x",
      "https://run.pavlovia.org/denis/other/models/detector/model.json",
      new URL("fonts/Sloan.woff2", HERE),
      req,
    ]);
  });

  it("reroutes Request objects too, keeping their options", async () => {
    const { win, native } = install(`${HERE}index.html`);
    const req = new Request(`${HERE}models/detector/model.json`, {
      headers: { Accept: "application/json" },
    });
    await win.fetch(req);
    const sent: Request = native.mock.calls[0][0];
    expect(sent).toBeInstanceOf(Request);
    expect(sent.url).toBe(`${CDN}models/detector/model.json`);
    expect(sent.headers.get("Accept")).toBe("application/json");
  });
});

describe("fetchCompilerDeploy (CompatibilityRequirements.txt date)", () => {
  it("reads the published deploy's id, date, branch and commit", async () => {
    installFetch();
    expect(await fetchCompilerDeploy()).toEqual(DEPLOY);
  });

  it("is null when the probe fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as any;
    expect(await fetchCompilerDeploy()).toBeNull();
  });

  it("shares one in-flight probe", async () => {
    const calls = installFetch();
    await Promise.all([fetchCompilerDeploy(), fetchCompilerDeploy()]);
    expect(calls.filter((u) => u === NETLIFY_SITE_API)).toHaveLength(1);
  });
});

describe("fetchPublishedRuntime", () => {
  it("reads the compiler's own release file", async () => {
    const calls = installFetch();
    expect(await fetchPublishedRuntime()).toEqual({
      package: PKG,
      version: VERSION,
      cdn: CDN,
      fingerprint: published().fingerprint,
      integrity: published().integrity,
      files: published().files,
      publishedAt: "2026-09-09T06:11:35.000Z",
      deploy: published().deploy,
    });
    expect(calls).toEqual([RELEASE_URL]);
  });

  it("is null when the build published nothing (no release file)", async () => {
    installFetch({ release: null });
    expect(await fetchPublishedRuntime()).toBeNull();
  });

  it("is null for a malformed or foreign release file, or when offline", async () => {
    installFetch({ release: "{not json" });
    expect(await fetchPublishedRuntime()).toBeNull();
    installFetch({ release: { package: PKG } });
    expect(await fetchPublishedRuntime()).toBeNull();
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as any;
    expect(await fetchPublishedRuntime()).toBeNull();
  });
});

describe("resolveHostedRuntime", () => {
  it("is null (full copy uploaded) until the build publishes a version", async () => {
    const calls = installFetch({ release: null });
    expect(await resolveHostedRuntime()).toBeNull();
    // Nothing else is consulted: no Netlify, no CDN.
    expect(calls).toEqual([RELEASE_URL]);
    expect(sentry.captureError).not.toHaveBeenCalled();
  });

  it("loads the runtime from jsDelivr, hashing the bytes it serves", async () => {
    const calls = installFetch();
    const release = (await resolveHostedRuntime())!;
    expect(release.baseUrl).toBe(CDN);
    expect(release.published).toMatchObject({ package: PKG, version: VERSION });
    expect(release.integrity).toEqual({
      "js/first.min.js": sri("console.log('first')"),
      "js/threshold.min.js": sri("console.log('threshold')"),
    });
    expect(await sha384Integrity(new TextEncoder().encode("x").buffer)).toBe(
      sri("x"),
    );
    // The release file from the compiler's origin, everything else from the CDN.
    expect(calls[0]).toBe(RELEASE_URL);
    expect(calls.slice(1).every((u) => u.startsWith(CDN))).toBe(true);
    expect(calls).not.toContain(NETLIFY_SITE_API);
  });

  it("fetches the committed runtime files from the CDN, binary as base64, pages rewritten", async () => {
    installFetch();
    const release = (await resolveHostedRuntime())!;
    expect([...release.statics.keys()].sort()).toEqual(
      committedRuntimeFiles().sort(),
    );
    expect(release.statics.get("LICENSE")).toEqual({
      content: "MIT",
      encoding: "text",
    });
    expect(release.statics.get("components/images/favicon.ico")).toEqual({
      content: Buffer.from([0, 1, 2, 255]).toString("base64"),
      encoding: "base64",
    });
    const index = release.statics.get("index.html")!;
    expect(index.encoding).toBe("text");
    expect(index.content).toContain(
      `src="${CDN}js/threshold.min.js" defer integrity="${sri(
        "console.log('threshold')",
      )}" crossorigin="anonymous"`,
    );
    expect(index.content).toContain(`var RUNTIME = "${CDN}";`);
    expect(release.statics.get("index-stepper-bool.html")!.content).toContain(
      "remote-calibrator@0.8.881",
    );
    expect(release.hostedFiles).toEqual(hostedRuntimeFiles());
  });

  it("is resolved once per published version and reused", async () => {
    const calls = installFetch();
    const a = await resolveHostedRuntime();
    const n = calls.length;
    const b = await resolveHostedRuntime();
    expect(b).toBe(a);
    // Only the small release file again; nothing re-fetched from the CDN.
    expect(calls.slice(n)).toEqual([RELEASE_URL]);
  });

  it("re-resolves when a new version is published", async () => {
    installFetch();
    await resolveHostedRuntime();
    const newer = published();
    newer.version = "1.20260910.100";
    newer.cdn = `https://cdn.jsdelivr.net/npm/${PKG}@${newer.version}/`;
    const calls: string[] = [];
    global.fetch = jest.fn(async (input: any) => {
      const url = typeof input === "string" ? input : input.url;
      calls.push(url);
      if (url === RELEASE_URL) return new Response(JSON.stringify(newer));
      const file = url.slice(newer.cdn.length);
      return file in HOSTED ? response(HOSTED[file]) : response("nf", 404);
    }) as any;
    const release = (await resolveHostedRuntime())!;
    expect(release.baseUrl).toBe(newer.cdn);
    expect(calls.some((u) => u.startsWith(newer.cdn))).toBe(true);
  });

  it("is null while jsDelivr does not serve the version yet, and tries again next time", async () => {
    installFetch({ cdnFiles: {} });
    expect(await resolveHostedRuntime()).toBeNull();
    expect(sentry.captureError).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(`${PKG}@${VERSION} unavailable`),
      expect.anything(),
    );
    // A failure is not cached: the next compile tries again.
    installFetch();
    expect(await resolveHostedRuntime()).not.toBeNull();
  });

  it("refuses a CDN copy whose bytes differ from what the build recorded", async () => {
    installFetch({
      cdnFiles: { ...HOSTED, "js/threshold.min.js": "console.log('tampered')" },
    });
    expect(await resolveHostedRuntime()).toBeNull();
    expect(sentry.captureError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("differs from the published build"),
      }),
      expect.any(String),
    );
  });

  it("is null when the hosted page is not the runtime's", async () => {
    installFetch({
      overrides: {
        [`${CDN}index.html`]: () => response("<html><head></head></html>"),
      },
    });
    expect(await resolveHostedRuntime()).toBeNull();
  });

  it("is null when a committed runtime file is missing on the CDN", async () => {
    installFetch({
      overrides: {
        [`${CDN}recruitmentServiceConfig.csv`]: () => response("nf", 404),
      },
    });
    expect(await resolveHostedRuntime()).toBeNull();
  });

  it("forgets a cached release when the release file disappears", async () => {
    installFetch();
    expect(await resolveHostedRuntime()).not.toBeNull();
    installFetch({ release: null });
    expect(await resolveHostedRuntime()).toBeNull();
  });
});

describe("gatherHostedRuntimeActions", () => {
  it("commits the small runtime files and the record, never the hosted ones", async () => {
    installFetch();
    const release = (await resolveHostedRuntime())!;
    const ready = jest.fn();
    const actions = gatherHostedRuntimeActions(release, false, ready);
    expect(actions.map((a) => a.file_path)).toEqual([
      "LICENSE",
      "coi-serviceworker.js",
      "components/images/favicon.ico",
      "index-stepper-bool.html",
      "index.html",
      "js/threshold.css",
      "recruitmentServiceConfig.csv",
      RUNTIME_RECORD_PATH,
    ]);
    expect(actions.every((a) => a.action === "create")).toBe(true);
    expect(
      actions.find((a) => a.file_path === "components/images/favicon.ico"),
    ).toMatchObject({ encoding: "base64" });
    // Progress: one tick per manifest entry, as the classic count expects
    // (experimentLanguage.js is counted with the generated files).
    expect(ready).toHaveBeenCalledTimes(16);
  });

  it("chooses index.html by _stepperBool like the classic path", async () => {
    installFetch();
    const release = (await resolveHostedRuntime())!;
    const index = (stepper: boolean) =>
      gatherHostedRuntimeActions(release, stepper).find(
        (a) => a.file_path === "index.html",
      )!.content;
    expect(index(true)).toContain("remote-calibrator@0.9.161");
    expect(index(false)).toContain("remote-calibrator@0.8.881");
    // Both are the rewritten, hosted-runtime pages.
    expect(index(true)).toContain(`src="${CDN}js/threshold.min.js"`);
    expect(index(false)).toContain(`src="${CDN}js/threshold.min.js"`);
  });

  it("writes EasyEyesRuntime.json with everything needed to re-host or freeze", async () => {
    installFetch();
    const release = (await resolveHostedRuntime())!;
    const record = gatherHostedRuntimeActions(release, true).find(
      (a) => a.file_path === RUNTIME_RECORD_PATH,
    )!;
    const json = JSON.parse(record.content);
    expect(json).toMatchObject({
      runtime: CDN,
      package: PKG,
      version: VERSION,
      runtimeFingerprint: published().fingerprint,
      runtimePublishedAt: "2026-09-09T06:11:35.000Z",
      compilerDeploy: {
        id: DEPLOY.id,
        context: "production",
        branch: "main",
        commit: "078e7f9",
      },
      integrity: release.integrity,
      hostedFiles: hostedRuntimeFiles(),
    });
    expect(typeof json.compiledAt).toBe("string");
    expect(json.about).toMatch(/npm pack/);
  });
});
