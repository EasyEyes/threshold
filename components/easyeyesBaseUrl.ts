const LOCALHOST_BASE_URL = "http://localhost:8888";
const PRODUCTION_BASE_URL = "https://easyeyes.app";

// Cache the localhost probe so we only hit the network once per page load.
let localhostBaseUrlPromise: Promise<string> | undefined;

// Resolve to the localhost base URL if a server is actually answering on
// :8888 (e.g. `netlify dev`), otherwise fall back to production. We only care
// that the server responds at all, not about the status code, so `no-cors` is
// fine — a connection refused / timeout rejects the fetch and we fall back.
const resolveLocalhostBaseUrl = async (): Promise<string> => {
  try {
    await fetch(LOCALHOST_BASE_URL, { method: "HEAD", mode: "no-cors" });
    return LOCALHOST_BASE_URL;
  } catch {
    return PRODUCTION_BASE_URL;
  }
};

const NETLIFY_DEPLOY_RE = /^[a-z0-9-]+--easyeyes\.netlify\.app$/;

export const getEasyEyesBaseUrl = async (): Promise<string> => {
  const urlParams = new URLSearchParams(window.location.search);
  const previewDeployBase = urlParams.get("preview-deploy");

  if (previewDeployBase) return previewDeployBase;
  if (NETLIFY_DEPLOY_RE.test(window.location.hostname))
    return window.location.origin;
  if (window.location.hostname !== "localhost") return PRODUCTION_BASE_URL;

  if (!localhostBaseUrlPromise)
    localhostBaseUrlPromise = resolveLocalhostBaseUrl();
  return localhostBaseUrlPromise;
};
