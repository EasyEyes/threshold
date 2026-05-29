import type { GlossaryData, GlossaryEntry } from "../../source/components/types";

let registry: GlossaryData | null = null;

export function initGlossary(data: GlossaryData): void {
  registry = data;
}

export function getGlossary(): Record<string, GlossaryEntry> {
  if (registry === null) {
    throw new Error("getGlossary() called before initGlossary()");
  }
  return registry.glossary;
}

export function getGlossaryVersion(): string | null {
  return registry?.version ?? null;
}

export function getSuperMatchingParams(): string[] {
  if (registry === null) {
    throw new Error("getSuperMatchingParams() called before initGlossary()");
  }
  return registry.superMatchingParams;
}
