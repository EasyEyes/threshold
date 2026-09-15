import type { PhrasesData } from "../../source/components/types";

let registry: PhrasesData | null = null;

export function initPhrases(data: PhrasesData): void {
  registry = data;
}

export function getPhrases(): Record<string, Record<string, string>> {
  if (registry === null) {
    throw new Error("getPhrases() called before initPhrases()");
  }
  return registry.phrases;
}

export function getPhrasesVersion(): string | null {
  return registry?.version ?? null;
}
