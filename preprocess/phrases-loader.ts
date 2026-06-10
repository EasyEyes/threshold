import { wait, getRetryDelayMs } from "./retry";
import { initPhrases } from "../parameters/phrasesRegistry";
import type { PhrasesData } from "../../source/components/types";
import { getEasyEyesBaseUrl } from "../components/easyeyesBaseUrl";

export async function loadPhrases(pathname: string): Promise<PhrasesData> {
  const [username, experimentName] = pathname.split("/").filter(Boolean);
  const base = await getEasyEyesBaseUrl();
  const pinnedUrl = `${base}/.netlify/functions/phrases?pinned=${username}/${experimentName}`;

  let attempt = 0;

  // Step 1: resolve the experiment's pinned version. The pin is mutable, so this
  // endpoint is uncached; retry transient failures, but a missing pin is fatal.
  let version: string;
  while (true) {
    let res: Response;
    try {
      res = await fetch(pinnedUrl);
    } catch {
      await wait(getRetryDelayMs(attempt++));
      continue;
    }

    if (res.status === 404) {
      const body = (await res.json()) as { error?: string };
      if (body.error === "No pinned version") {
        throw new Error(
          `No phrasesVersion pinned for ${username}/${experimentName}. Recompile the experiment.`,
        );
      }
      await wait(getRetryDelayMs(attempt++));
      continue;
    }

    if (!res.ok) {
      await wait(getRetryDelayMs(attempt++));
      continue;
    }

    version = ((await res.json()) as { version: string }).version;
    break;
  }

  // Step 2: fetch the immutable payload for that exact version. This URL is
  // cached forever at the edge and in the browser, shared across participants.
  const versionUrl = `${base}/.netlify/functions/phrases?v=${version}`;
  while (true) {
    let res: Response;
    try {
      res = await fetch(versionUrl);
    } catch {
      await wait(getRetryDelayMs(attempt++));
      continue;
    }

    if (!res.ok) {
      await wait(getRetryDelayMs(attempt++));
      continue;
    }

    const data = (await res.json()) as PhrasesData;
    initPhrases(data);
    return data;
  }
}

export const phrasesData: PhrasesData = await loadPhrases(
  window.location.pathname,
);
