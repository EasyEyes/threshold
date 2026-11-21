import {
  getGlossary,
  getGlossaryVersion,
  getSuperMatchingParams,
} from "../parameters/glossaryRegistry";
import { fetchCompilerAudit } from "./fetchCompilerAudit";
import { OBSOLETE_PARAMETER, type Alert } from "./alerts";
import { alertParameter, escapeAlertHtml } from "./alertHtml";

export type GlossaryReference = { parameter: string; key: string };
export type GlossaryCompilerAudit = {
  id: string;
  generatedAt: string;
  glossaryVersion: string;
  usedKeys: string[];
  unusedKeys: string[];
  findings?: {
    key: string;
    removals?: { repository: string; removedAt?: string }[];
  }[];
};
export function collectStudyGlossaryReferences(
  rows: readonly (readonly string[])[],
): GlossaryReference[] {
  const glossary = getGlossary();
  const families = getSuperMatchingParams().map((key) => ({
    key,
    pattern: new RegExp(
      "^" +
        key
          .split(/(@+)/)
          .map((part) =>
            part.startsWith("@")
              ? `[0-9]{${part.length}}`
              : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          )
          .join("") +
        "$",
    ),
  }));
  const references = new Map<string, GlossaryReference>();
  for (const row of rows) {
    const parameter = String(row[0] ?? "").trim();
    if (!row.slice(1).some((value) => String(value ?? "").trim())) continue;
    const key = Object.prototype.hasOwnProperty.call(glossary, parameter)
      ? parameter
      : families.find((family) => family.pattern.test(parameter))?.key;
    if (key) references.set(parameter, { parameter, key });
  }
  return [...references.values()];
}

function getUnusedGlossaryKeys(
  refs: GlossaryReference[],
  audit: GlossaryCompilerAudit,
): Set<string> {
  if (
    !audit?.id ||
    !audit.generatedAt ||
    typeof audit.glossaryVersion !== "string" ||
    !audit.glossaryVersion ||
    !Array.isArray(audit.usedKeys) ||
    !Array.isArray(audit.unusedKeys) ||
    ![...audit.usedKeys, ...audit.unusedKeys].every(
      (key) => typeof key === "string" && key.length > 0,
    )
  )
    throw new Error("Invalid or stale glossary audit report");
  const used = new Set(audit.usedKeys),
    unused = new Set(audit.unusedKeys);
  if (
    [...used].some((key) => unused.has(key)) ||
    refs.some((ref) => !used.has(ref.key) && !unused.has(ref.key))
  )
    throw new Error("Incomplete glossary audit report");
  return unused;
}

export function validateGlossaryAudit(
  refs: GlossaryReference[],
  audit: GlossaryCompilerAudit,
): Alert[] {
  const unused = getUnusedGlossaryKeys(refs, audit);
  if (audit.glossaryVersion !== getGlossaryVersion())
    throw new Error(
      `Loaded glossary version ${escapeAlertHtml(
        getGlossaryVersion() ?? "unknown",
      )} does not match completed audit version ${escapeAlertHtml(
        audit.glossaryVersion,
      )}.`,
    );

  return refs
    .filter((ref) => unused.has(ref.key))
    .map((ref) => ({
      name: "Glossary parameter not audited as used",
      message: `Parameter ${alertParameter(
        ref.parameter,
        ref.key,
      )} is defined in the Parameter Glossary, but no source usage was detected.`,
      hint: "Review the Glossary entry and remove this parameter if it is unnecessary. If it is required, report it to the EasyEyes team.",
      context: "preprocessor",
      kind: "warning",
      parameters: [ref.parameter],
    }));
}

export function checkObsoleteGlossaryReferences(
  refs: GlossaryReference[],
): Alert[] {
  // Numbered parameters can inherit an obsolete Glossary definition.
  const glossary = getGlossary();
  return refs
    .filter(({ key }) => glossary[key]?.type === "obsolete")
    .map(({ parameter, key }) => OBSOLETE_PARAMETER(parameter, key));
}

export async function hasGlossaryAuditVersionMismatch(
  refs: GlossaryReference[],
  localAudit?: GlossaryCompilerAudit,
): Promise<boolean> {
  const loadedVersion = getGlossaryVersion();
  if (!refs.length || !loadedVersion) return false;
  try {
    const audit =
      localAudit ??
      (await fetchCompilerAudit<GlossaryCompilerAudit>(
        "glossary-audit-compiler",
      ));
    // Refresh local catalogs only when a complete report confirms a mismatch.
    getUnusedGlossaryKeys(refs, audit);
    return audit.glossaryVersion !== loadedVersion;
  } catch {
    return false;
  }
}
