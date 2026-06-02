import { wait, getRetryDelayMs } from "./retry";
import { initPhrases } from "../parameters/phrasesRegistry";
import type { PhrasesData } from "../../source/components/types";
import { getEasyEyesBaseUrl } from "../components/easyeyesBaseUrl";

export async function loadPhrases(pathname: string): Promise<PhrasesData> {
  const [username, experimentName] = pathname.split("/").filter(Boolean);
  const base = await getEasyEyesBaseUrl();
  const url = `${base}/.netlify/functions/phrases?pinned=${username}/${experimentName}`;

  let attempt = 0;
  while (true) {
    let res: Response;
    try {
      res = await fetch(url);
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

    const data = (await res.json()) as PhrasesData;
    initPhrases(data);
    return data;
  }
}

export const phrasesData: PhrasesData = await loadPhrases(
  window.location.pathname,
);
