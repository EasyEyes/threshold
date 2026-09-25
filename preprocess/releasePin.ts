import { getEasyEyesBaseUrl } from "../components/easyeyesBaseUrl";

export interface ExperimentReleasePin {
  releaseId: string;
  manifestDigest: string;
  artifactRevision: string;
  pinnedAt: string;
}

export const pinExperimentRelease = async (
  username: string,
  experiment: string,
  releaseId: string,
  artifactRevision: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ExperimentReleasePin> => {
  const response = await fetchImpl(
    `${await getEasyEyesBaseUrl()}/.netlify/functions/release-manifest`,
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        username,
        experiment,
        releaseId,
        artifactRevision,
      }),
    },
  );
  const value = await response.json();
  if (
    !response.ok ||
    value?.releaseId !== releaseId ||
    value?.artifactRevision !== artifactRevision ||
    typeof value?.manifestDigest !== "string"
  ) {
    const error = new Error(value?.code ?? "RELEASE_PIN_MISMATCH");
    (error as Error & { code?: string }).code =
      value?.code ?? "RELEASE_PIN_MISMATCH";
    throw error;
  }
  return value;
};
