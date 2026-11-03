import type { EasyEyesError } from "../preprocess/errorMessages";
import { GLOSSARY_SHEET_URL } from "../parameters/glossaryLink";
import { INTERNATIONAL_PHRASES_SHEET } from "../preprocess/internationalPhraseLink";
import {
  color,
  colorsEnabledByDefault,
  htmlToTerminal,
} from "./terminalFormat";

const glossaryGuide =
  "https://github.com/EasyEyes/website/blob/main/scripts/glossary-audit/README.md";
const indexBuilder =
  "https://github.com/EasyEyes/website/blob/main/scripts/phrase-analysis/build.mjs";

type AuditGuidance = {
  warning?: boolean;
  action: string;
  references: [string, string][];
};
const guidance = new Map<string, AuditGuidance>([
  [
    "study_phrase_candidates_missing",
    {
      warning: true,
      action:
        "Review the listed phrase keys and their translations in International Phrases. Source-analysis candidates do not prove runtime use. Add required missing phrases or report outdated source references. This remains a warning and does not block compilation.",
      references: [["International Phrases", INTERNATIONAL_PHRASES_SHEET]],
    },
  ],
  [
    "Glossary audit unavailable",
    {
      action:
        "Retry if the audit service is unavailable. If no matching completed audit exists, use EasyEyes > Run Glossary audit in the editable Glossary spreadsheet, check View Glossary audit report, and rerun the examples command after completion.",
      references: [
        ["Published Glossary reference", GLOSSARY_SHEET_URL],
        ["Glossary audit instructions", glossaryGuide],
      ],
    },
  ],
  [
    "Glossary parameter not audited as used",
    {
      action:
        "Review the affected parameter and the completed audit evidence. Correct the study if the parameter is unintended; if it is required, investigate its source references and rerun the audit after correcting the cause.",
      references: [["Glossary audit instructions", glossaryGuide]],
    },
  ],
  [
    "Study glossary analysis unavailable",
    {
      action:
        "Check the website checkout and its source-analysis dependencies. Fix source-index build or parse errors, then rerun the examples command. Local compilation requires a complete index of the current source.",
      references: [["Local source-index builder", indexBuilder]],
    },
  ],
  [
    "Study phrase analysis unavailable",
    {
      action:
        "Check the website checkout and its source-analysis dependencies. Fix source-index build or parse errors, then rerun the examples command. This is local source analysis, not the hosted International Phrases audit.",
      references: [
        ["Local source-index builder", indexBuilder],
        ["International Phrases", INTERNATIONAL_PHRASES_SHEET],
      ],
    },
  ],
]);

/** Add terminal references only for audit diagnostics; ordinary errors stay unchanged. */
export function formatAuditDetails(
  error: EasyEyesError,
  colors = colorsEnabledByDefault(),
): string[] {
  const audit = guidance.get(error.code ?? "") ?? guidance.get(error.name);
  if (!audit || error.kind !== (audit.warning ? "warning" : "error")) return [];
  const references = new Map<string, string>();
  for (const fragment of [error.message, error.hint]) {
    for (const match of fragment.matchAll(
      /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi,
    )) {
      try {
        const url = new URL(htmlToTerminal(match[2], false));
        if (url.protocol !== "https:" && url.protocol !== "http:") continue;
        const label = htmlToTerminal(match[3], false)
          .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
          .trim();
        const previous = references.get(url.href);
        if (!previous) references.set(url.href, label || "Audit reference");
        else if (label && !previous.split(", ").includes(label))
          references.set(url.href, `${previous}, ${label}`);
      } catch {
        // Invalid links must not hide the diagnostic or prevent compilation reporting.
      }
    }
  }
  for (const [label, url] of audit.references)
    if (!references.has(url)) references.set(url, label);
  const style = error.kind === "error" ? color.red : color.yellow;
  return [
    `  audit guidance: ${audit.action}`,
    "  audit references:",
    ...[...references].map(([url, label]) => `    ${label}: ${url}`),
  ].map((line) => style(line, colors));
}
