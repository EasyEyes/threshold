import { fetchCompilerAudit } from "./fetchCompilerAudit";
import { getGlossary } from "../parameters/glossaryRegistry";
import { getPhrases, getPhrasesVersion } from "../parameters/phrasesRegistry";
import { ExperimentTable } from "./experimentTable";
import { collectInternationalPhraseReferences } from "./internationalPhraseAudit";
import { internationalPhraseUrl } from "./internationalPhraseLink";
import type { Alert } from "./alerts";
import { alertParameter, alertValueHtml, escapeAlertHtml } from "./alertHtml";
import {
  analysePhrasePaths,
  type PhraseCondition,
  type PhrasePathReport,
  type PhraseSourceIndex,
  type Scalar,
} from "./phrasePathAnalysis";

type Reference = ReturnType<
  typeof collectInternationalPhraseReferences
>[number];
const linkedKey = (key: string) =>
  `<a href="${internationalPhraseUrl(
    key,
    new Map(),
  )}" target="_blank" rel="noopener noreferrer">${escapeAlertHtml(key)}</a>`;

export function validateStudyPhraseDefinitions(
  references: Reference[],
  phrases: Record<string, Record<string, string>>,
): Alert[] {
  return references.flatMap((reference) => {
    if (Object.prototype.hasOwnProperty.call(phrases, reference.key)) return [];
    return [
      {
        name: "International phrase not defined",
        message: `Phrase ${alertValueHtml(
          linkedKey(reference.key),
        )} in ${alertParameter(reference.parameter)} (column ${
          reference.column + 1
        }) is not defined in International Phrases.`,
        hint: "Add the missing key to column A of International Phrases before compiling.",
        context: "preprocessor",
        kind: "error",
        parameters: [reference.parameter],
      } as Alert,
    ];
  });
}

export function conditionParameters(
  table: ExperimentTable,
  normalized?: Record<string, string>[],
): PhraseCondition[] {
  const glossary = getGlossary();
  const required: string[] | undefined = process.env.PHRASE_ANALYSIS_PARAMETERS
    ? JSON.parse(process.env.PHRASE_ANALYSIS_PARAMETERS)
    : undefined;
  return Array.from({ length: table.conditionCount }, (_, condition) => {
    const parameters: Record<string, Scalar> = {};
    for (const [name, entry] of Object.entries(glossary)) {
      if (required && !required.includes(name)) continue;
      const value =
        normalized?.[condition]?.[name] ??
        table.effectiveValue(name, condition);
      if (/[ⓁⓃ~]/u.test(String(value))) continue;
      if (entry.type === "boolean") {
        if (/^(TRUE|FALSE)$/i.test(String(value)))
          parameters[name] = String(value).toUpperCase() === "TRUE";
      } else if (["integer", "numerical"].includes(entry.type)) {
        if (String(value).trim() !== "" && Number.isFinite(Number(value)))
          parameters[name] = Number(value);
      } else parameters[name] = value;
    }
    return {
      name:
        table.effectiveValue("conditionName", condition) ||
        table.blockLabels()[condition],
      parameters,
    };
  });
}

export async function checkStudyPhraseAnalysis(
  table: ExperimentTable,
  references: Reference[],
  normalized?: Record<string, string>[],
  localIndex?: PhraseSourceIndex,
  analysisRequired = true,
): Promise<{
  errors: Alert[];
  report?: PhrasePathReport & {
    phrasesVersion: string | null;
    language: string;
    studyDefinedPhrases: Reference[];
    definitionErrors: Alert[];
    candidateDefinitionIssues: string[];
  };
}> {
  const language = table.colBOrDefault("_language");
  let errors: Alert[] = [];
  try {
    const phrases = getPhrases();
    // Check explicit keys against the catalog even if source analysis is unavailable.
    errors = validateStudyPhraseDefinitions(references, phrases);
    const fingerprint =
      localIndex?.fingerprint ?? process.env.PHRASE_ANALYSIS_FINGERPRINT;
    if (!fingerprint) throw new Error("Phrase analysis build metadata missing");
    const conditions = conditionParameters(table, normalized);
    const report = localIndex
      ? analysePhrasePaths(localIndex, conditions)
      : await fetchCompilerAudit<PhrasePathReport>("study-phrase-analysis", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ schemaVersion: 1, fingerprint, conditions }),
        });
    if (
      report.schemaVersion !== 1 ||
      report.fingerprint !== fingerprint ||
      report.fullRuntimeAnswerAvailable !== false ||
      !Array.isArray(report.candidateKeys) ||
      !report.candidateKeys.every(
        (key) => typeof key === "string" && /^(EE|RC|T)_/.test(key),
      ) ||
      !Array.isArray(report.sites) ||
      !report.sites.every(
        (site) =>
          typeof site.id === "string" &&
          typeof site.file === "string" &&
          Number.isInteger(site.line) &&
          site.runtimeReachability === "unresolved" &&
          Array.isArray(site.keys) &&
          site.keys.every((key) => typeof key === "string") &&
          Array.isArray(site.studyPaths) &&
          site.studyPaths.length === table.conditionCount &&
          site.studyPaths.every((path) =>
            ["excluded", "possible", "unresolved"].includes(path.localPath),
          ),
      ) ||
      !Array.isArray(report.limitations) ||
      !report.limitations.every((item) => typeof item === "string")
    )
      throw new Error("Invalid study phrase analysis response");
    const explicit = new Set(references.map((reference) => reference.key));
    const uncertainMissing = report.candidateKeys.filter(
      (key) =>
        !explicit.has(key) &&
        !Object.prototype.hasOwnProperty.call(phrases, key),
    );
    return {
      errors,
      report: {
        ...report,
        phrasesVersion: getPhrasesVersion(),
        language,
        studyDefinedPhrases: references,
        definitionErrors: errors.filter((error) => error.kind === "error"),
        candidateDefinitionIssues: uncertainMissing,
      },
    };
  } catch (error) {
    if (!analysisRequired) return { errors };
    console.error(
      "[study-phrase-analysis] Validation could not be completed",
      error,
    );
    errors.push({
      name: "Study phrase analysis unavailable",
      message:
        'The study phrase analysis could not be completed with an index matching this compiler build. Compilation is blocked.<span class="alert-section"><strong>For developers.</strong> The deployment must include a complete phrase analysis index and its API.</span>',
      hint: "Reload the compiler and try again.",
      context: "preprocessor",
      kind: "error",
      parameters: [],
    });
    return { errors };
  }
}
