/*! EasyEyes asset bridge (issue #174).
 *
 * Appended to the coi-serviceworker.js slot of experiments that reference
 * their participant runtime by immutable release URL instead of carrying
 * copies. Same-origin requests for runtime paths (js/, models/,
 * components/) are served from the pinned release on the CDN; compiled
 * data (the experiment table, conditions/, resource kinds, and
 * js/experimentLanguage.js) passes through to the experiment repo.
 *
 * Runs in two contexts, like coi-serviceworker: as a page script it does
 * nothing; as the registered service worker it rewrites fetches. It does
 * not modify COOP/COEP headers — if cross-origin isolation is ever
 * re-enabled (see the coi-serviceworker code above), the bridge must also
 * re-add the header injection.
 */
(() => {
  if (typeof window !== "undefined") return; // page context: nothing to do

  const RUNTIME_BASE = "__EASYEYES_RUNTIME_BASE__";
  const RUNTIME_PREFIXES = ["js/", "models/", "components/"];
  // Compiled data living under a runtime prefix stays in the repo.
  const REPO_PATHS = ["js/experimentLanguage.js"];

  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) =>
    event.waitUntil(self.clients.claim()),
  );

  self.addEventListener("fetch", (event) => {
    const scope = self.registration.scope;
    const url = event.request.url;
    if (!url.startsWith(scope)) return;
    const relativePath = url.slice(scope.length).split(/[?#]/)[0];
    if (REPO_PATHS.includes(relativePath)) return;
    if (!RUNTIME_PREFIXES.some((prefix) => relativePath.startsWith(prefix)))
      return;
    // The versioned release URL is immutable; standard HTTP caching applies
    // (no cache-busting — retiring the legacy no-cache band-aid).
    event.respondWith(fetch(RUNTIME_BASE + relativePath, { mode: "cors" }));
  });
})();
