import { psychoJS } from "../globalPsychoJS";
import { saveSnapshot } from "./boxIntegration";
import { thisExperimentInfo } from "../global";

// Listen for video frame captures from remote-calibrator.
// Dispatched in remote-calibrator/src/check/captureVideoFrame.js
// with detail: { image: base64JPEG }
export const capturedVideoFrameListener = () => {
  document.addEventListener("rc-video-frame-captured", async (e) => {
    const { image } = e.detail;
    if (!image) return;

    const result = await saveSnapshot(image, experimentId(), participantId());
    addSnapshotsLinkToExperimentResult(result.snapshotsLink);
  });
};

const addSnapshotsLinkToExperimentResult = (snapshotsLink) => {
  if (snapshotsLink && psychoJS?.experiment) {
    const hasSnapshotsLink =
      psychoJS.experiment._currentTrialData.hasOwnProperty("snapshotsLink");
    if (!hasSnapshotsLink) {
      psychoJS.experiment.addData("snapshotsLink", snapshotsLink);
    }
  }
};

const experimentId = () => {
  let experimentID;
  const urlSegments = window.location.pathname.split("/").filter((s) => s);

  if (window.location.hostname === "localhost") {
    // Localhost: http://localhost:5500/examples/generated/TEST-EXPERIMENT-NAME/index.html
    // Dev: find experiment name before /index.html
    const htmlIndex = urlSegments.indexOf("index.html");
    experimentID =
      htmlIndex > 0
        ? urlSegments[htmlIndex - 1]
        : urlSegments[urlSegments.length - 1];
  } else {
    // Production: https://run.pavlovia.org/USERNAME/TEST-EXPERIMENT-NAME
    experimentID = urlSegments[urlSegments.length - 1];
  }
  return experimentID;
};

const participantId = () => {
  return thisExperimentInfo.PavloviaSessionID;
};
