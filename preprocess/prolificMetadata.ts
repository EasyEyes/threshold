import { prolificRequest } from "./prolificRequest";

export interface ProlificParticipantGroup {
  id?: string;
  name?: string;
}

const CACHE_TTL_MS = 5 * 60_000;
const participantGroupCache = new Map<
  string,
  { createdAt: number; promise: Promise<ProlificParticipantGroup[]> }
>();

/** A five-minute, in-memory, per-token cache; failures are never retained. */
export const getProlificParticipantGroups = (
  token: string,
): Promise<ProlificParticipantGroup[]> => {
  if (!token) return Promise.resolve([]);
  const cached = participantGroupCache.get(token);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS)
    return cached.promise;

  const promise = (async () => {
    const response = await prolificRequest(
      "/.netlify/functions/prolific/participant-groups/",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          authorization: `Token ${token}`,
        },
      },
    );
    const data = await response.json();
    if (response.ok === false) {
      throw Object.assign(
        new Error(
          `Prolific participant groups failed: ${response.status} ${
            response.statusText ?? ""
          }`,
        ),
        { status: response.status, responseMessage: data?.error },
      );
    }
    return (data?.results ?? []) as ProlificParticipantGroup[];
  })();

  participantGroupCache.set(token, { createdAt: Date.now(), promise });
  promise.catch(() => {
    if (participantGroupCache.get(token)?.promise === promise)
      participantGroupCache.delete(token);
  });
  return promise;
};

/** Start warming metadata without making the caller wait for it. */
export const prefetchProlificParticipantGroups = (
  token: string,
): Promise<ProlificParticipantGroup[]> => getProlificParticipantGroups(token);

export const clearProlificMetadataCache = (token?: string): void => {
  if (token) participantGroupCache.delete(token);
  else participantGroupCache.clear();
};
