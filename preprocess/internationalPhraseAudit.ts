import {
  loadInternationalPhraseRows,
  internationalPhraseUrl,
} from "./internationalPhraseLink";
import type { EasyEyesError } from "./errorMessages";
import { getEasyEyesBaseUrl } from "../components/easyeyesBaseUrl";

type Reference = { key: string; parameter: string; column: number };
type Audit = {
  id: string;
  generatedAt: string;
  usedKeys: string[];
  findings?: {
    removed?: {
      key: string;
      removals: {
        repository: string;
        removedAt?: string;
        commitUrl?: string | null;
      }[];
    }[];
    missing?: {
      key: string;
      references: {
        repository: string;
        path: string;
        line?: number;
        description?: string;
        url?: string | null;
      }[];
    }[];
  };
};
const escape = (value: string) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

// Inspect source cells before substitution: custom values are literal text,
// not International Phrase references. Never infer aliases by removing prefixes.
export function collectInternationalPhraseReferences(
  rows: readonly (readonly string[])[],
): Reference[] {
  const refs: Reference[] = [];
  for (const row of rows) {
    if (
      [
        "_languagePhrasesSpreadsheet",
        "_phrasesSpreadsheet",
        "_phrasesColumnName",
      ].includes(row[0])
    )
      continue;
    row.slice(1).forEach((cell, index) => {
      const text = String(cell ?? "").replace(/[ⓁⓃ~][^\s,;()[\]{}]+/gu, "");
      for (const match of text.matchAll(/\b(?:EE|RC|T)_[A-Za-z0-9_]+\b/g))
        refs.push({ key: match[0], parameter: row[0], column: index + 1 });
    });
  }
  return refs;
}

export function validateInternationalPhraseAudit(
  refs: Reference[],
  audit: Audit,
  phraseRows = new Map<string, number>(),
): EasyEyesError[] {
  if (
    !audit?.id ||
    !audit.generatedAt ||
    !Array.isArray(audit.usedKeys) ||
    !audit.usedKeys.every((key) => typeof key === "string")
  )
    throw new Error("Invalid International Phrases audit report");
  const used = new Set(audit.usedKeys);
  return refs
    .filter((ref) => !used.has(ref.key))
    .map((ref) => {
      const removed = audit.findings?.removed?.find(
        (item) => item.key === ref.key,
      );
      const missing = audit.findings?.missing?.find(
        (item) => item.key === ref.key,
      );
      const evidence = [
        ...(removed?.removals ?? []).map(
          (item) =>
            `Removed from ${item.repository} at ${
              item.removedAt ?? "an unknown date"
            }. ${item.commitUrl ?? ""}`,
        ),
        ...(missing?.references ?? []).map(
          (item) =>
            `${item.repository}/${item.path}:${item.line ?? ""} ${
              item.description ?? ""
            } ${item.url ?? ""}`,
        ),
      ];
      return {
        name: "International phrase not audited as used",
        message: `Phrase <a href="${internationalPhraseUrl(
          ref.key,
          phraseRows,
        )}" target="_blank" rel="noopener noreferrer"><strong>${escape(
          ref.key,
        )}</strong></a> in ${escape(ref.parameter)} (column ${
          ref.column + 1
        }) is absent from the used keys in audit ${escape(audit.id)} (${escape(
          audit.generatedAt,
        )}).`,
        hint: evidence.length
          ? evidence.map(escape).join("<br/>")
          : "No source or removal evidence is available for this key. Check the phrase name and the latest International Phrases audit.",
        context: "preprocessor",
        kind: "error",
        parameters: [ref.parameter],
      };
    });
}

export async function checkInternationalPhraseAudit(
  rows: readonly (readonly string[])[],
): Promise<EasyEyesError[]> {
  const refs = collectInternationalPhraseReferences(rows);
  if (!refs.length) return [];
  try {
    const response = await fetch(
      `${await getEasyEyesBaseUrl()}/.netlify/functions/phrases-audit-compiler`,
      { cache: "no-store", signal: AbortSignal.timeout(15000) },
    );
    if (!response.ok) throw new Error("Audit unavailable");
    const audit = await response.json();
    const errors = validateInternationalPhraseAudit(refs, audit);
    if (!errors.length) return errors;
    const rows = await loadInternationalPhraseRows();
    return validateInternationalPhraseAudit(refs, audit, rows);
  } catch {
    return [
      {
        name: "International Phrases audit unavailable",
        message:
          "The latest completed International Phrases audit could not be loaded. Compilation cannot validate the study's International Phrase keys.",
        hint: "Try again after the audit service is available and a completed report exists.",
        context: "preprocessor",
        kind: "error",
        parameters: [...new Set(refs.map((ref) => ref.parameter))],
      },
    ];
  }
}
