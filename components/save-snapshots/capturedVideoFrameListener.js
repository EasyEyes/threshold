import { thisExperimentInfo } from "../global";

export const saveSnapshotsConfig = {
  enabled: false,
  lastCodeNumber: null,
  lastFileId: null,
};

// Listen for video frame captures from remote-calibrator.
// Dispatched in remote-calibrator/src/check/captureVideoFrame.js
// with detail: { image: base64JPEG }
document.addEventListener("rc-video-frame-captured", async (e) => {
  if (!saveSnapshotsConfig.enabled) return;

  const { image } = e.detail;
  if (!image) return;

  try {
    let boxApi = "/.netlify/functions/box-api";

    // Check for preview-deploy query parameter (e.g., ?preview-deploy=https://deploy-preview-27--easyeyes.netlify.app)
    const urlParams = new URLSearchParams(window.location.search);
    const previewDeployBase = urlParams.get("preview-deploy");

    if (previewDeployBase) {
      boxApi = previewDeployBase + boxApi;
    } else if (window.location.hostname === "localhost") {
      boxApi = "http://localhost:8888" + boxApi;
    }

    let experimentID;
    const urlSegments = window.location.pathname.split("/").filter((s) => s);

    if (window.location.hostname === "localhost") {
      // Localhost: http://localhost:5500/examples/generated/TEST-EXPERIMENT-NAME/index.html
      // Dev: find experiment name before /index.html
      const htmlIndex = urlSegments.indexOf("index.html");
      experimentID = htmlIndex > 0 ? urlSegments[htmlIndex - 1] : urlSegments[urlSegments.length - 1];
    } else {
      // Production: https://run.pavlovia.org/USERNAME/TEST-EXPERIMENT-NAME
      experimentID = urlSegments[urlSegments.length - 1];
    }

    const response = await fetch(boxApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image,
        experimentID,
        participantID: thisExperimentInfo.PavloviaSessionID,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      console.error("Box upload failed:", err.error);
      return;
    }

    const result = await response.json();
    saveSnapshotsConfig.lastCodeNumber = codeNumber;
    saveSnapshotsConfig.lastFileId = result.fileId;
  } catch (err) {
    console.error("Snapshot upload error:", err);
  }
});
