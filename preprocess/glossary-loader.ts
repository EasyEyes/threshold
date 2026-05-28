import { wait, getRetryDelayMs } from "./retry";
import type { GlossaryData } from "../../source/components/types";
import { getEasyEyesBaseUrl } from "../components/easyeyesBaseUrl";

export async function loadGlossary(pathname: string): Promise<GlossaryData> {
  const [username, experimentName] = pathname.split("/").filter(Boolean);
  const url = `${getEasyEyesBaseUrl()}/.netlify/functions/glossary?username=${username}&experiment=${experimentName}`;

  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url);
      return (await res.json()) as GlossaryData;
    } catch {
      await wait(getRetryDelayMs(attempt++));
    }
  }
}

export const glossaryData: GlossaryData = await loadGlossary(window.location.pathname);
