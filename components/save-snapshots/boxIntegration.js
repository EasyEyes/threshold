import { captureError } from "../../../source/sentry";

export const saveSnapshot = async (image, experimentID, participantID) => {
  try {
    const response = await fetch(getBoxApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image,
        experimentID,
        participantID,
      }),
    });

    if (!response.ok) {
      const err = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      const errorMessage = `Box upload failed: ${err.error} (Status: ${response.status})`;
      captureError(new Error(errorMessage), "Snapshot upload error");
      return null;
    }

    return await response.json();
  } catch (err) {
    captureError(err, "Snapshot upload error")
    return null;
  }
};

const getBaseUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const previewDeployBase = urlParams.get("preview-deploy");

  if (previewDeployBase) return previewDeployBase;
  if (window.location.hostname === "localhost") return "http://localhost:8888";
  return "https://easyeyes.app";
};

const getBoxApiUrl = () => getBaseUrl() + "/.netlify/functions/box-api";
