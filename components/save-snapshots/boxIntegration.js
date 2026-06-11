import { captureError } from "../../../source/sentry";
import { getEasyEyesBaseUrl } from "../easyeyesBaseUrl";

export const saveSnapshot = async (image, experimentID, participantID) => {
  try {
    const response = await fetch(await getBoxApiUrl(), {
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
    captureError(err, "Snapshot upload error");
    return null;
  }
};

const getBoxApiUrl = async () =>
  (await getEasyEyesBaseUrl()) + "/.netlify/functions/box-api";
