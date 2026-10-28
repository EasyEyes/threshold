import type { LocalCompileOptions } from "../../examples/localCompile";
import { glossaryAuditFixture } from "./glossaryAudit";
import { phraseAnalysisIndexFixture } from "./phraseAnalysis";

// Completed external-analysis fixtures keep local compiler tests offline.
export const localCompileTestOptions = (
  overrides: LocalCompileOptions = {},
): LocalCompileOptions => ({
  glossaryAudit: glossaryAuditFixture(),
  phraseAnalysisIndex: phraseAnalysisIndexFixture(),
  ...overrides,
});
