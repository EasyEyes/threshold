import {
  getGlossary,
  getGlossaryVersion,
  getSuperMatchingParams,
} from "../parameters/glossaryRegistry";
import { loadGlossaryRows } from "../parameters/glossaryLink";
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

class GlossaryAuditVersionMismatch extends Error {}

export function validateGlossaryAudit(
  refs: GlossaryReference[],
  audit: GlossaryCompilerAudit,
): Alert[] {
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
  if (audit.glossaryVersion !== getGlossaryVersion())
    throw new GlossaryAuditVersionMismatch(
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

export async function checkGlossaryAudit(
  rows: readonly (readonly string[])[],
  localAudit?: GlossaryCompilerAudit,
): Promise<Alert[]> {
  const refs = collectStudyGlossaryReferences(rows);
  if (!refs.length) return [];

  // Numbered parameters can inherit an obsolete Glossary definition.
  const glossary = getGlossary();
  const obsolete = refs.filter(({ key }) => glossary[key]?.type === "obsolete");
  if (obsolete.length)
    return obsolete.map(({ parameter, key }) =>
      OBSOLETE_PARAMETER(parameter, key),
    );

  try {
    if (!getGlossaryVersion()) throw new Error("Glossary version missing");
    const audit =
      localAudit ??
      (await fetchCompilerAudit<GlossaryCompilerAudit>(
        "glossary-audit-compiler",
      ));
    const warnings = validateGlossaryAudit(refs, audit);
    if (!warnings.length) return warnings;
    await loadGlossaryRows();
    return validateGlossaryAudit(refs, audit);
  } catch (error) {
    const mismatch = error instanceof GlossaryAuditVersionMismatch;
    return [
      {
        name: "Glossary audit unavailable",
        ...(mismatch ? { code: "glossary_audit_version_mismatch" } : {}),
        message: mismatch
          ? error.message
          : "A complete usage audit for the loaded Glossary version could not be loaded.",
        hint: "Compilation can continue. The Compiler checks the latest completed audit on each attempt.",
        context: "preprocessor",
        kind: "warning",
        parameters: [],
      },
    ];
  }
}
