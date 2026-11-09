const LOCALHOST_BASE_URL = "http://localhost:8888";
const PRODUCTION_BASE_URL = "https://easyeyes.app";

// Cache the localhost probe so we only hit the network once per page load.
let localhostBaseUrlPromise: Promise<string> | undefined;

// Resolve to a local functions server when available, otherwise production.
// The :8888 fallback accepts any response, while the same-origin proxy probe
// above requires OK JSON. Connection failures fall through to production.
const resolveLocalhostBaseUrl = async (): Promise<string> => {
  // Vite and the compiler's webpack server proxy Netlify functions on their
  // own origin. Prefer that path: it needs no Netlify CLI or admin credentials.
  const origin = window.location.origin;
  try {
    const response = await fetch(
      `${origin}/.netlify/functions/glossary-audit-compiler`,
      { method: "HEAD" },
    );
    if (
      response.ok &&
      response.headers.get("content-type")?.includes("application/json")
    )
      return origin;
  } catch {}

  try {
    await fetch(LOCALHOST_BASE_URL, { method: "HEAD", mode: "no-cors" });
    return LOCALHOST_BASE_URL;
  } catch {
    return PRODUCTION_BASE_URL;
  }
};

export const getEasyEyesBaseUrl = async (): Promise<string> => {
  // Node compilation has no page origin; use the hosted audit and catalog APIs.
  if (typeof window === "undefined") return PRODUCTION_BASE_URL;

  const urlParams = new URLSearchParams(window.location.search);
  const previewDeployBase = urlParams.get("preview-deploy");

  if (previewDeployBase) return previewDeployBase;

  // Branch/preview deploys of the EasyEyes site (e.g.
  // language-phrase-glossary--easyeyes.netlify.app) ship their own copy of the
  // Netlify functions, so call them on the page's own origin. Returning
  // production here would make the preview hit easyeyes.app, which may not yet
  // have the branch's functions deployed.
  if (/--easyeyes\.netlify\.app$/.test(window.location.hostname))
    return window.location.origin;

  if (window.location.hostname !== "localhost") return PRODUCTION_BASE_URL;

  if (!localhostBaseUrlPromise)
    localhostBaseUrlPromise = resolveLocalhostBaseUrl();
  return localhostBaseUrlPromise;
};
