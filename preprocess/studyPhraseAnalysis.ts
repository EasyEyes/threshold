import { getEasyEyesBaseUrl } from "../components/easyeyesBaseUrl";
import { getGlossary } from "../parameters/glossaryRegistry";
import { getPhrases, getPhrasesVersion } from "../parameters/phrasesRegistry";
import { ExperimentTable } from "./experimentTable";
import { collectInternationalPhraseReferences } from "./internationalPhraseAudit";
import { internationalPhraseUrl } from "./internationalPhraseLink";
import type { EasyEyesError } from "./errorMessages";
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
const escape = (value: string) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
const linkedKey = (key: string) =>
  `<a href="${internationalPhraseUrl(
    key,
    new Map(),
  )}" target="_blank" rel="noopener noreferrer">${escape(key)}</a>`;

export function validateStudyPhraseDefinitions(
  references: Reference[],
  phrases: Record<string, Record<string, string>>,
  language: string,
): EasyEyesError[] {
  return references.flatMap((reference) => {
    const defined =
      Object.prototype.hasOwnProperty.call(phrases, reference.key) &&
      phrases[reference.key] &&
      typeof phrases[reference.key] === "object" &&
      !Array.isArray(phrases[reference.key]);
    const translation =
      defined &&
      Object.prototype.hasOwnProperty.call(phrases[reference.key], language) &&
      typeof phrases[reference.key][language] === "string";
    if (translation) return [];
    return [
      {
        name: defined
          ? "International phrase translation not defined"
          : "International phrase not defined",
        message: `Phrase ${linkedKey(reference.key)} in ${escape(
          reference.parameter,
        )} (column ${reference.column + 1}) ${
          defined
            ? `has no valid translation for ${escape(language)}`
            : "is absent from the loaded International Phrases data"
        }.`,
        hint: "Define the key and its study-language translation before compiling. Audit usage alone does not establish that a translation exists.",
        context: "preprocessor",
        kind: "error",
        parameters: [reference.parameter],
      } as EasyEyesError,
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
): Promise<{
  errors: EasyEyesError[];
  report?: PhrasePathReport & {
    phrasesVersion: string | null;
    language: string;
    studyDefinedPhrases: Reference[];
    definitionErrors: EasyEyesError[];
    candidateDefinitionIssues: string[];
  };
}> {
  const language = table.colBOrDefault("_language");
  let errors: EasyEyesError[] = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const phrases = getPhrases();
    errors = validateStudyPhraseDefinitions(references, phrases, language);
    const fingerprint =
      localIndex?.fingerprint ?? process.env.PHRASE_ANALYSIS_FINGERPRINT;
    if (!fingerprint) throw new Error("Phrase analysis build metadata missing");
    const conditions = conditionParameters(table, normalized);
    let report: PhrasePathReport;
    if (localIndex) {
      report = analysePhrasePaths(localIndex, conditions);
    } else {
      const response = await fetch(
        `${await getEasyEyesBaseUrl()}/.netlify/functions/study-phrase-analysis`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({ schemaVersion: 1, fingerprint, conditions }),
        },
      );
      if (!response.ok) throw new Error("Study phrase analysis unavailable");
      report = (await response.json()) as PhrasePathReport;
    }
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
        (!Object.prototype.hasOwnProperty.call(phrases, key) ||
          !phrases[key] ||
          typeof phrases[key] !== "object" ||
          Array.isArray(phrases[key]) ||
          !Object.prototype.hasOwnProperty.call(phrases[key], language) ||
          typeof phrases[key][language] !== "string"),
    );
    if (uncertainMissing.length)
      errors.push({
        name: "Potential runtime phrase errors require review",
        message: `The source analysis found ${
          uncertainMissing.length
        } candidate keys without a valid ${escape(
          language,
        )} translation: ${uncertainMissing.map(linkedKey).join(", ")}.`,
        hint: "These source paths have not been proven reachable from the study entry point. This warning does not establish that they will run. Review the source evidence and test the relevant scenarios.",
        context: "preprocessor",
        kind: "warning",
        parameters: [],
      });
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
    console.error(
      "[study-phrase-analysis] Validation could not be completed",
      error,
    );
    errors.push({
      name: "Study phrase analysis unavailable",
      message:
        "The study phrase analysis could not be completed with an index matching this compiler build. Compilation is blocked.",
      hint: "Reload the compiler and try again. The deployment must include a complete phrase analysis index and its API.",
      context: "preprocessor",
      kind: "error",
      parameters: [],
    });
    return { errors };
  } finally {
    clearTimeout(timeout);
  }
}
