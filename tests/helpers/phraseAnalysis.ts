import type { PhraseSourceIndex } from "../../preprocess/phrasePathAnalysis";

// Valid empty analysis, independent of network and generated website artifacts.
export const phraseAnalysisIndexFixture = (
  overrides: Partial<PhraseSourceIndex> = {},
): PhraseSourceIndex => ({
  schemaVersion: 2,
  fingerprint: "a".repeat(64),
  parseFailures: [],
  coverage: { limitations: [] },
  sites: [],
  glossarySites: [],
  ...overrides,
});
