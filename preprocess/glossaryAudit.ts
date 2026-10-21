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
import type { EasyEyesError } from "./errorMessages";

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

export function validateGlossaryAudit(
  refs: GlossaryReference[],
  audit: GlossaryCompilerAudit,
): EasyEyesError[] {
  if (
    !audit?.id ||
    !audit.generatedAt ||
    audit.glossaryVersion !== getGlossaryVersion() ||
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
  return refs
    .filter((ref) => unused.has(ref.key))
    .map((ref) => {
      const evidence =
        audit.findings?.find((item) => item.key === ref.key)?.removals ?? [];
      return {
        name: "Glossary parameter not audited as used",
        message: `Parameter <a href="${
          glossaryParameterUrl(ref.key) ?? GLOSSARY_SHEET_URL
        }" target="_blank" rel="noopener noreferrer"><strong>${escape(
          ref.parameter,
        )}</strong></a> is classified as unused in glossary audit ${escape(
          audit.id,
        )} (${escape(audit.generatedAt)}).`,
        hint: evidence.length
          ? evidence
              .map((item) =>
                escape(
                  `Removed from ${item.repository} at ${
                    item.removedAt ?? "an unknown date"
                  }.`,
                ),
              )
              .join("<br/>")
          : "No source usage was detected in the completed glossary audit. Check the parameter and the latest audit. This classification is not a proof of every runtime path.",
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
  } catch {
    return [
      {
        name: "Glossary audit unavailable",
        message:
          "A complete glossary usage audit matching the loaded glossary could not be loaded. Compilation cannot validate the study's glossary parameters.",
        hint: "Try again when the audit service is available. Run a new glossary audit if the glossary version has changed.",
        context: "preprocessor",
        kind: "error",
        parameters: refs.map((ref) => ref.parameter),
      },
    ];
  } finally {
    clearTimeout(timer);
  }
}
