export const getEasyEyesBaseUrl = (): string => {
  const urlParams = new URLSearchParams(window.location.search);
  const previewDeployBase = urlParams.get("preview-deploy");

  if (previewDeployBase) return previewDeployBase;
  // On localhost (e.g. `npm run start` serving an example via Vite) return an
  // empty string so that calls to `${getEasyEyesBaseUrl()}/.netlify/functions/...`
  // resolve to a same-origin relative URL. Vite's dev server proxies
  // /.netlify/functions/* to the target configured in vite.config.mjs
  // (defaults to https://easyeyes.app, overridable via NETLIFY_PROXY_TARGET
  // for users running `netlify dev` locally on a different port).
  if (window.location.hostname === "localhost") return "http://localhost:8888";
  return "https://easyeyes.app";
};
