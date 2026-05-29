export const getEasyEyesBaseUrl = (): string => {
  const urlParams = new URLSearchParams(window.location.search);
  const previewDeployBase = urlParams.get("preview-deploy");

  if (previewDeployBase) return previewDeployBase;
  if (window.location.hostname === "localhost") return "http://localhost:8888";
  return "https://easyeyes.app";
};
