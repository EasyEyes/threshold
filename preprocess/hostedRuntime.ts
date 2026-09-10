/**
 * Hosted runtime — the "thin experiment repository".
 *
 * A classic compile copies the whole EasyEyes runtime (threshold.min.js, the
 * WASM bundle, the face-tracking models, … ≈17 MB, identical for every
 * experiment) into each experiment's Pavlovia repository. A Studio compile
 * instead commits only what is specific to the experiment plus a handful of
 * small runtime files that the page must find next to itself, and its
 * index.html loads the runtime from an immutable npm version on jsDelivr —
 * the remote-calibrator pattern:
 *
 *     https://cdn.jsdelivr.net/npm/@easyeyes/runtime@<version>/
 *
 * At the end of a Netlify runtime build, server/publishRuntime.ts publishes
 * the built runtime as an npm version (when the build has an npm token) and
 * writes runtime-release.json next to index.html naming it. npm versions are
 * immutable and never expire; jsDelivr mirrors npm permanently and serves
 * every file with `Access-Control-Allow-Origin: *`, which the two
 * cross-origin module scripts need. They carry Subresource Integrity hashes
 * computed by the compiler from the very bytes jsDelivr serves — and checked
 * against what the build recorded — so a byte that differs and the browser
 * refuses the script. An experiment compiled today therefore runs today's
 * runtime for as long as npm exists: the same guarantee the copy in the
 * repository gave, minus the 17 MB.
 *
 * What stays in the repository (see isHostedRuntimeFile): everything the
 * runtime looks for relative to the page rather than relative to its own
 * script — index.html, coi-serviceworker.js, js/threshold.css,
 * js/experimentLanguage.js (generated per experiment), the images, the
 * multiple-display page, recruitmentServiceConfig.csv, the licenses. What is
 * hosted: js/*.js and their source maps (loaded from index.html, or by the
 * runtime relative to itself, e.g. import("./easyeyes_wasm.js")) and models/
 * (requested by remote-calibrator relative to the page; a small router
 * installed at the top of index.html sends those requests to the hosted copy).
 *
 * The experiment records what it runs in EasyEyesRuntime.json: the runtime
 * URL, npm package and version, the deploy that built it, the integrity
 * hashes and the list of hosted files — enough to re-host or freeze the
 * runtime later (`npm pack <package>@<version>` fetches the exact files).
 *
 * Until the build publishes (no runtime-release.json — the npm token is not
 * set yet), and whenever anything goes wrong here (jsDelivr not serving the
 * version yet, a hash mismatch, an unexpected index.html),
 * resolveHostedRuntime resolves to null and the caller uploads the classic
 * full copy; a compile never fails because of the hosted runtime.
 */

import { Buffer } from "buffer";
import * as sentry from "../components/sentry";
import { _loadDir, _loadFiles } from "./files";
import { markCompilePhase } from "./compileTiming";

/** Netlify site API for the compiler site (public, no token needed). */
export const NETLIFY_SITE_API =
  "https://api.netlify.com/api/v1/sites/7ef5bb5a-2b97-4af2-9868-d3e9c7ca2287/";

/** File written into every thin repository describing the runtime it runs. */
export const RUNTIME_RECORD_PATH = "EasyEyesRuntime.json";

/**
 * Release file the runtime build writes next to index.html
 * (server/publishRuntime.ts), read from the compiler's own origin like the
 * runtime files themselves: /compiler/threshold/runtime-release.json.
 */
export const RELEASE_FILE = "runtime-release.json";

/** The compiler deploy currently published on Netlify. */
export interface CompilerDeploy {
  id: string | null;
  /** ISO publication time; also written to CompatibilityRequirements.txt */
  publishedAt: string | null;
  siteName: string | null;
  branch: string | null;
  commit: string | null;
  /** Netlify deploy context: production, branch-deploy, deploy-preview … */
  context: string | null;
}

/**
 * runtime-release.json: the runtime of a deploy as an immutable npm version,
 * served by jsDelivr, with the deploy that built it and per-file SRI hashes.
 */
export interface PublishedRuntime {
  package: string;
  version: string;
  /** https://cdn.jsdelivr.net/npm/<package>@<version>/ */
  cdn: string;
  /** sha256 over every file's path and content; identical runtimes share it */
  fingerprint: string;
  /** sha384-… per file, as recorded by the build */
  integrity: Record<string, string>;
  files: string[];
  publishedAt: string | null;
  deploy: {
    id: string | null;
    commit: string | null;
    branch: string | null;
    context: string | null;
  };
}

export interface HostedRuntimeRelease {
  published: PublishedRuntime;
  /** Absolute URL of the hosted runtime folder, with trailing slash. */
  baseUrl: string;
  /** SRI hashes of the module scripts index.html loads from the host. */
  integrity: Record<string, string>;
  /** Repository paths served by the host, not committed. */
  hostedFiles: string[];
  /** Small runtime files committed to the repository, fetched from the host. */
  statics: Map<string, { content: string; encoding: "text" | "base64" }>;
}

const runtimeUrl = (baseUrl: string, path: string) => `${baseUrl}${path}`;

/* --------------------------- deploy metadata ------------------------------ */

const str = (v: unknown): string | null =>
  typeof v === "string" && v !== "" ? v : null;

let deployProbe: Promise<CompilerDeploy | null> | null = null;

/**
 * The compiler deploy currently published on Netlify (id, date, commit); null
 * when the probe fails. This is what CompatibilityRequirements.txt has always
 * recorded as compilerUpdateDate. One in-flight probe is shared; the result is
 * not cached across compiles so a new deploy is seen by the next compile.
 */
export const fetchCompilerDeploy = (): Promise<CompilerDeploy | null> => {
  if (deployProbe) return deployProbe;
  deployProbe = (async () => {
    try {
      const response = await fetch(NETLIFY_SITE_API);
      const data = await response.json();
      const published = data?.published_deploy ?? {};
      return {
        id: str(published.id),
        publishedAt: str(published.published_at),
        siteName: str(data?.name),
        branch: str(published.branch),
        commit: str(published.commit_ref),
        context: str(published.context),
      };
    } catch (error) {
      sentry.captureError(
        error,
        "Error fetching Netlify site data for compiler update date: ",
      );
      return null;
    } finally {
      deployProbe = null;
    }
  })();
  return deployProbe;
};

/* ----------------------------- file split -------------------------------- */

/**
 * True for the runtime files a thin repository leaves to the host: the
 * built JavaScript and its source maps (except the per-experiment
 * js/experimentLanguage.js) and the face-tracking models. Everything else in
 * the upload manifest is small and looked up relative to the page, so it is
 * committed as before.
 */
export const isHostedRuntimeFile = (path: string): boolean =>
  path.startsWith("models/") ||
  (/^js\/.*\.(?:js|map)$/.test(path) && path !== "js/experimentLanguage.js");

export const hostedRuntimeFiles = (): string[] =>
  _loadFiles.filter(isHostedRuntimeFile);

export const committedRuntimeFiles = (): string[] =>
  _loadFiles.filter(
    (f) => !isHostedRuntimeFile(f) && f !== "js/experimentLanguage.js",
  );

/* ------------------------------ index.html -------------------------------- */

/**
 * Path prefixes (relative to the page) that the router in index.html sends
 * to the hosted runtime. Only the models: the runtime's own scripts are
 * either loaded by index.html with absolute URLs or imported relative to
 * those scripts, and every other page-relative file is in the repository.
 */
export const ROUTED_PREFIXES = ["models/"];

/**
 * The script placed first in <head>. Records the runtime in
 * window.EasyEyesRuntime and reroutes fetch() calls for the hosted,
 * page-relative paths (the models remote-calibrator asks for as
 * "./models/…") to the hosted copy. Everything else passes through untouched.
 * Deliberately plain ES5 with no dependencies.
 */
export const runtimeRouterScript = (
  release: Pick<HostedRuntimeRelease, "baseUrl" | "published">,
): string => {
  const record = JSON.stringify({
    base: release.baseUrl,
    package: release.published.package,
    version: release.published.version,
  });
  return `<script>
      /* EasyEyes hosted runtime. This experiment loads the EasyEyes runtime from a
         versioned, immutable copy instead of carrying it in this repository — see
         EasyEyesRuntime.json. Requests for the runtime's model files, which are
         made relative to this page, are sent to that copy. */
      (function () {
        var RUNTIME = ${JSON.stringify(release.baseUrl)};
        var HOSTED = ${JSON.stringify(ROUTED_PREFIXES)};
        window.EasyEyesRuntime = ${record};
        var here = new URL("./", location.href).href;
        function reroute(url) {
          try {
            var abs = new URL(url, location.href).href;
            if (abs.indexOf(here) !== 0) return null;
            var rel = abs.slice(here.length);
            for (var i = 0; i < HOSTED.length; i++)
              if (rel.indexOf(HOSTED[i]) === 0) return RUNTIME + rel;
          } catch (e) {}
          return null;
        }
        var nativeFetch = window.fetch;
        if (typeof nativeFetch !== "function") return;
        window.fetch = function (input, init) {
          var isRequest =
            typeof Request !== "undefined" && input instanceof Request;
          var target =
            typeof input === "string"
              ? input
              : isRequest
              ? input.url
              : input && typeof input.href === "string"
              ? input.href
              : null;
          var rerouted = target === null ? null : reroute(target);
          if (rerouted === null) return nativeFetch.call(this, input, init);
          if (isRequest)
            return nativeFetch.call(this, new Request(rerouted, input), init);
          return nativeFetch.call(this, rerouted, init);
        };
      })();
    </script>`;
};

const SCRIPT_TAG = /<script\b[^>]*>/gi;
const SRC_ATTR = /\bsrc\s*=\s*"([^"]*)"/i;

/**
 * Rewrites the runtime page for a thin repository: each <script> whose src is
 * a hosted runtime file gets the absolute hosted URL, its integrity hash and
 * crossorigin="anonymous"; the router is inserted first in <head>. Throws
 * when the page does not look like the runtime's index.html (no <head>, or no
 * hosted module script), so the caller can fall back to the full copy rather
 * than commit a page that would not load.
 */
export const rewriteIndexHtml = (
  html: string,
  release: Pick<HostedRuntimeRelease, "baseUrl" | "published" | "integrity">,
): string => {
  const rewritten: string[] = [];
  let out = html.replace(SCRIPT_TAG, (tag) => {
    const src = SRC_ATTR.exec(tag)?.[1];
    if (!src || /^(?:[a-z]+:)?\/\//i.test(src) || !isHostedRuntimeFile(src))
      return tag;
    const integrity = release.integrity[src];
    if (!integrity) throw new Error(`No integrity hash for ${src}`);
    rewritten.push(src);
    let t = tag.replace(SRC_ATTR, `src="${runtimeUrl(release.baseUrl, src)}"`);
    if (!/\bintegrity\s*=/i.test(t))
      t = t.replace(/\s*>$/, ` integrity="${integrity}">`);
    if (!/\bcrossorigin\b/i.test(t))
      t = t.replace(/\s*>$/, ` crossorigin="anonymous">`);
    return t;
  });
  if (!rewritten.includes("js/threshold.min.js"))
    throw new Error(
      "index.html does not load js/threshold.min.js as expected; not rewriting",
    );
  const head = /<head\b[^>]*>/i.exec(out);
  if (!head) throw new Error("index.html has no <head>; not rewriting");
  const at = head.index + head[0].length;
  out = `${out.slice(0, at)}\n    ${runtimeRouterScript(release)}${out.slice(
    at,
  )}`;
  return out;
};

/* ---------------------------- fetching/hashing --------------------------- */

const fetchOk = async (url: string): Promise<Response> => {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response;
};

const usesBase64 = (path: string) => /\.(?:ico|png|mp3|bin|wasm)$/i.test(path);

export const sha384Integrity = async (bytes: ArrayBuffer): Promise<string> => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto unavailable; cannot hash runtime");
  const digest = await subtle.digest("SHA-384", bytes);
  return `sha384-${Buffer.from(digest).toString("base64")}`;
};

/** Module scripts index.html loads from the host — the files that get SRI. */
const entryScriptsOf = (html: string): string[] => {
  const out: string[] = [];
  for (const tag of html.match(SCRIPT_TAG) ?? []) {
    const src = SRC_ATTR.exec(tag)?.[1];
    if (src && !/^(?:[a-z]+:)?\/\//i.test(src) && isHostedRuntimeFile(src))
      out.push(src);
  }
  return [...new Set(out)];
};

/* ------------------------------- release --------------------------------- */

/**
 * The published npm version of the runtime this compiler serves, from its
 * release file; null when there is none (the build did not publish — no npm
 * token yet — or a dev server) or the file is not what the build writes.
 */
export const fetchPublishedRuntime =
  async (): Promise<PublishedRuntime | null> => {
    try {
      const response = await fetch(runtimeUrl(_loadDir, RELEASE_FILE), {
        cache: "no-cache",
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (
        typeof data?.package !== "string" ||
        typeof data?.version !== "string" ||
        typeof data?.cdn !== "string" ||
        typeof data?.fingerprint !== "string" ||
        !data?.integrity ||
        typeof data.integrity !== "object"
      )
        return null;
      return {
        package: data.package,
        version: data.version,
        cdn: data.cdn,
        fingerprint: data.fingerprint,
        integrity: data.integrity,
        files: Array.isArray(data.files) ? data.files : [],
        publishedAt: str(data.publishedAt),
        deploy: {
          id: str(data.deploy?.id),
          commit: str(data.deploy?.commit),
          branch: str(data.deploy?.branch),
          context: str(data.deploy?.context),
        },
      };
    } catch {
      return null;
    }
  };

/**
 * Builds the release from the CDN copy of the published version: fetches the
 * pages, hashes the entry scripts from the bytes jsDelivr serves (and checks
 * them against what the build recorded), fetches the small committed files,
 * rewrites the pages. Throws when anything is off.
 */
const buildRelease = async (
  published: PublishedRuntime,
): Promise<HostedRuntimeRelease> => {
  const baseUrl = published.cdn;
  // The page tells us which scripts need hashes; fetching it first also
  // proves the CDN serves this version.
  const pageNames = ["index.html", "index-stepper-bool.html"].filter((p) =>
    _loadFiles.includes(p),
  );
  const pages = new Map<string, string>(
    await Promise.all(
      pageNames.map(
        async (page) =>
          [
            page,
            await fetchOk(runtimeUrl(baseUrl, page)).then((r) => r.text()),
          ] as const,
      ),
    ),
  );
  const entryScripts = [
    ...new Set([...pages.values()].flatMap(entryScriptsOf)),
  ];
  if (!entryScripts.includes("js/threshold.min.js"))
    throw new Error("Hosted index.html does not load js/threshold.min.js");

  const [hashes, statics] = await Promise.all([
    Promise.all(
      entryScripts.map(async (path) => {
        const bytes = await fetchOk(runtimeUrl(baseUrl, path)).then((r) =>
          r.arrayBuffer(),
        );
        const hash = await sha384Integrity(bytes);
        if (published.integrity[path] !== hash)
          throw new Error(
            `${path} served by ${baseUrl} differs from the published build`,
          );
        return [path, hash] as const;
      }),
    ),
    Promise.all(
      committedRuntimeFiles()
        .filter((path) => !pages.has(path))
        .map(async (path) => {
          const response = await fetchOk(runtimeUrl(baseUrl, path));
          const base64 = usesBase64(path);
          const content = base64
            ? Buffer.from(await response.arrayBuffer()).toString("base64")
            : await response.text();
          return [
            path,
            { content, encoding: base64 ? "base64" : "text" },
          ] as const;
        }),
    ),
  ]);

  const release: HostedRuntimeRelease = {
    published,
    baseUrl,
    integrity: Object.fromEntries(hashes),
    hostedFiles: hostedRuntimeFiles(),
    statics: new Map(statics),
  };
  for (const [page, html] of pages)
    release.statics.set(page, {
      content: rewriteIndexHtml(html, release),
      encoding: "text",
    });
  return release;
};

let releaseCache: {
  version: string;
  release: Promise<HostedRuntimeRelease | null>;
} | null = null;

/** Forget the resolved release (tests). */
export const clearHostedRuntimeCache = (): void => {
  releaseCache = null;
  deployProbe = null;
};

/**
 * The hosted runtime: the CDN URL of the published version, integrity hashes,
 * and the small runtime files to commit — or null when there is none or it
 * cannot be established (caller then uploads the full runtime). The release
 * file is re-read every time (it is tiny) so a new publication is seen by the
 * next compile; the fetched and hashed runtime is cached per version for the
 * page session, so after the first compile (or the Studio's warm-up) this
 * costs one small same-origin fetch.
 */
export const resolveHostedRuntime =
  async (): Promise<HostedRuntimeRelease | null> => {
    const published = await fetchPublishedRuntime();
    if (!published) {
      releaseCache = null;
      return null;
    }
    const version = `${published.package}@${published.version}`;
    if (releaseCache?.version !== version) {
      const release = buildRelease(published).catch((error) => {
        console.warn(
          `[EasyEyes] Hosted runtime ${version} unavailable; uploading the full runtime.`,
          error,
        );
        sentry.captureError(error, "Hosted runtime unavailable: ");
        releaseCache = null;
        return null;
      });
      releaseCache = { version, release };
    }
    return releaseCache.release;
  };

/** Start resolving in the background (Studio mount) so a compile finds it ready. */
export const warmHostedRuntime = (): void => {
  void resolveHostedRuntime().catch(() => null);
};

/* --------------------------- commit actions ------------------------------ */

/** Minimal shape of gitlabUtils' ICommitAction, to avoid a circular import. */
export interface RuntimeCommitAction {
  action: "create";
  file_path: string;
  content: string;
  encoding: "text" | "base64";
}

/**
 * Human- and machine-readable record of the runtime this experiment runs.
 * The hosted file list and hashes are what one needs to re-host or freeze it.
 */
export const runtimeRecord = (
  release: HostedRuntimeRelease,
  compiledAt: string = new Date().toISOString(),
): string =>
  JSON.stringify(
    {
      about:
        "This experiment loads the EasyEyes runtime from the versioned, immutable npm package at `runtime` instead of carrying it in this repository. `hostedFiles` are served from there; the module scripts index.html loads carry the `integrity` hashes below, so the browser refuses any byte that differs. To freeze the runtime, fetch the exact files with `npm pack <package>@<version>` (or copy `hostedFiles` from `runtime`), place them in this repository and restore the relative script paths in index.html.",
      runtime: release.baseUrl,
      package: release.published.package,
      version: release.published.version,
      runtimeFingerprint: release.published.fingerprint,
      runtimePublishedAt: release.published.publishedAt,
      compilerDeploy: release.published.deploy,
      integrity: release.integrity,
      hostedFiles: release.hostedFiles,
      compiledAt,
    },
    null,
    2,
  );

/**
 * Commit actions for the runtime part of a thin repository: the committed
 * runtime files (index.html chosen by _stepperBool as in the classic path,
 * rewritten to load from the host), and EasyEyesRuntime.json. The generated
 * per-experiment files are added by the caller as in the classic path.
 * onFileReady is called once per manifest entry so progress matches the
 * classic count.
 */
export const gatherHostedRuntimeActions = (
  release: HostedRuntimeRelease,
  stepperBool: boolean,
  onFileReady?: () => void,
): RuntimeCommitAction[] => {
  const actions: RuntimeCommitAction[] = [];
  for (const path of _loadFiles) {
    if (path === "js/experimentLanguage.js") continue;
    onFileReady?.();
    if (isHostedRuntimeFile(path)) continue;
    const source =
      path === "index.html" && !stepperBool ? "index-stepper-bool.html" : path;
    const file = release.statics.get(source);
    if (!file) throw new Error(`Hosted runtime is missing ${source}`);
    actions.push({
      action: "create",
      file_path: path,
      content: file.content,
      encoding: file.encoding,
    });
  }
  actions.push({
    action: "create",
    file_path: RUNTIME_RECORD_PATH,
    content: runtimeRecord(release),
    encoding: "text",
  });
  markCompilePhase("hosted-runtime-ready");
  return actions;
};
