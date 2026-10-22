import {
  getGlossary,
  getGlossaryVersion,
} from "../../parameters/glossaryRegistry";
import type { GlossaryCompilerAudit } from "../../preprocess/glossaryAudit";

// External completed-audit boundary for compiler tests; production never fabricates usage.
export function glossaryAuditFixture(
  unusedKeys: string[] = [],
): GlossaryCompilerAudit {
  return {
    id: "test-completed-audit",
    generatedAt: "2026-10-20",
    glossaryVersion: getGlossaryVersion()!,
    usedKeys: Object.keys(getGlossary()).filter(
      (key) => !unusedKeys.includes(key),
    ),
    unusedKeys,
  };
}
