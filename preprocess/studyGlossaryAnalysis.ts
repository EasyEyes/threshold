import { getEasyEyesBaseUrl } from "../components/easyeyesBaseUrl";
import { getGlossaryVersion } from "../parameters/glossaryRegistry";
import { conditionParameters } from "./studyPhraseAnalysis";
import {
  analyseGlossaryPaths,
  type PhraseSourceIndex,
  type PhrasePathReport,
} from "./phrasePathAnalysis";
import type { ExperimentTable } from "./experimentTable";
import type { GlossaryReference } from "./glossaryAudit";
import type { EasyEyesError } from "./errorMessages";

export async function checkStudyGlossaryAnalysis(
  table: ExperimentTable,
  references: GlossaryReference[],
  normalized?: Record<string, string>[],
  localIndex?: PhraseSourceIndex,
): Promise<{
  errors: EasyEyesError[];
  report?: PhrasePathReport & {
    glossaryVersion: string | null;
    studyDefinedParameters: GlossaryReference[];
  };
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const fingerprint =
      localIndex?.fingerprint ?? process.env.PHRASE_ANALYSIS_FINGERPRINT;
    if (!fingerprint)
      throw new Error("Glossary analysis build metadata missing");
    const conditions = conditionParameters(table, normalized);
    let report: PhrasePathReport;
    if (localIndex) report = analyseGlossaryPaths(localIndex, conditions);
    else {
      const response = await fetch(
        `${await getEasyEyesBaseUrl()}/.netlify/functions/study-phrase-analysis`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({
            schemaVersion: 1,
            analysis: "glossary",
            fingerprint,
            conditions,
          }),
        },
      );
      if (!response.ok) throw new Error("Study glossary analysis unavailable");
      report = await response.json();
    }
    if (
      report.schemaVersion !== 1 ||
      report.fingerprint !== fingerprint ||
      report.fullRuntimeAnswerAvailable !== false ||
      !Array.isArray(report.candidateKeys) ||
      !report.candidateKeys.every((key) => typeof key === "string") ||
      !Array.isArray(report.limitations) ||
      !report.limitations.every((item) => typeof item === "string") ||
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
          site.studyPaths.every(
            (path, i) =>
              path.condition === conditions[i].name &&
              ["excluded", "possible", "unresolved"].includes(path.localPath),
          ),
      )
    )
      throw new Error("Invalid study glossary analysis response");
    return {
      errors: [],
      report: {
        ...report,
        glossaryVersion: getGlossaryVersion(),
        studyDefinedParameters: references,
      },
    };
  } catch {
    return {
      errors: [
        {
          name: "Study glossary analysis unavailable",
          message:
            "The study glossary analysis could not be completed with an index matching this compiler build. Compilation is blocked.",
          hint: "Reload the compiler and try again. The deployment must include a complete glossary source index and its API.",
          context: "preprocessor",
          kind: "error",
          parameters: references.map((ref) => ref.parameter),
        },
      ],
    };
  } finally {
    clearTimeout(timer);
  }
}
