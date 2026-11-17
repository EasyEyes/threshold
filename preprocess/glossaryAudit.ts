import {
  getGlossary,
  getGlossaryVersion,
  getSuperMatchingParams,
} from "../parameters/glossaryRegistry";
import {
  glossaryParameterUrl,
  loadGlossaryRows,
  GLOSSARY_SHEET_URL,
} from "../parameters/glossaryLink";
import { getEasyEyesBaseUrl } from "../components/easyeyesBaseUrl";
import { OBSOLETE_PARAMETER, type EasyEyesError } from "./errorMessages";

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
const escape = (value: string) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

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
): EasyEyesError[] {
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
      `Loaded glossary version ${escape(
        getGlossaryVersion() ?? "unknown",
      )} does not match completed audit version ${escape(
        audit.glossaryVersion,
      )}.`,
    );

  return refs
    .filter(
      (ref) =>
        getGlossary()[ref.key]?.type === "obsolete" || unused.has(ref.key),
    )
    .map((ref) => {
      if (getGlossary()[ref.key]?.type === "obsolete")
        return OBSOLETE_PARAMETER(ref.parameter, ref.key);
      return {
        name: "Glossary parameter not audited as used",
        message: `Parameter <a href="${
          glossaryParameterUrl(ref.key) ?? GLOSSARY_SHEET_URL
        }" target="_blank" rel="noopener noreferrer"><strong>${escape(
          ref.parameter,
        )}</strong></a> is defined in the Parameter Glossary, but no source usage was detected.<span class="diagnostic-section"><strong>Can I run the study?</strong> Compilation is blocked until this parameter is removed or its source usage is confirmed. This finding does not establish that the parameter is obsolete.</span><span class="diagnostic-section"><strong>Report the problem.</strong> If this parameter is required, select “Report bug” at the top of this page to notify the EasyEyes team.</span>`,
        hint: "Check the Glossary entry and remove this parameter if it is not needed.",
        context: "preprocessor",
        kind: "error",
        parameters: [ref.parameter],
      };
    });
}

export async function checkGlossaryAudit(
  rows: readonly (readonly string[])[],
  localAudit?: GlossaryCompilerAudit,
): Promise<EasyEyesError[]> {
  const refs = collectStudyGlossaryReferences(rows);
  if (!refs.length) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    let audit = localAudit;
    if (!audit) {
      const response = await fetch(
        `${await getEasyEyesBaseUrl()}/.netlify/functions/glossary-audit-compiler`,
        { cache: "no-store", signal: controller.signal },
      );
      if (!response.ok) throw new Error("Audit unavailable");
      audit = await response.json();
    }
    if (!audit) throw new Error("Audit missing");
    const errors = validateGlossaryAudit(refs, audit);
    if (!errors.length) return errors;
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
          : "A complete glossary usage audit matching the loaded glossary could not be loaded. Compilation cannot validate the study's glossary parameters.",
        hint: mismatch
          ? "Refresh the local catalogs and retry. If the versions still differ, run a matching Glossary audit from the Glossary spreadsheet's EasyEyes menu."
          : "Try again when the audit service is available. Run a new glossary audit if the glossary version has changed.",
        context: "preprocessor",
        kind: "error",
        parameters: refs.map((ref) => ref.parameter),
      },
    ];
  } finally {
    clearTimeout(timer);
  }
}
