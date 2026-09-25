import type { GlossaryData } from "../../../source/components/types";
import { matchesSuperMatchingParameter } from "../../preprocess/experimentFileChecks";

export interface StudyCatalogRequirements {
  schemaVersion: 1;
  phraseKeys: string[];
  phraseFamilies: string[];
  parameterNames: string[];
  languages: string[];
  customPhraseKeys: string[];
}

const sortedUnique = (values: Iterable<string>): string[] =>
  [...new Set(values)].filter(Boolean).sort();

const cells = (rows: unknown[][]): string[] =>
  rows.flatMap((row) => row.map((value) => String(value ?? "").trim()));

export const buildStudyCatalogRequirements = (
  rows: unknown[][],
): StudyCatalogRequirements => {
  const parameterNames = rows
    .map((row) => String(row[0] ?? "").trim())
    .filter(
      (name) =>
        name &&
        !name.startsWith("//") &&
        !name.startsWith("%") &&
        name !== "block",
    );
  const allCells = cells(rows);
  const phraseKeys = allCells.filter((value) =>
    /^EE_[A-Za-z0-9_]+$/.test(value),
  );
  const customPhraseKeys = allCells
    .filter((value) => /^~[^\s]+$/.test(value))
    .map((value) => value.slice(1).toLowerCase());
  const phraseFamilies = phraseKeys
    .map((key) => key.match(/^(.*?)(\d{2})$/)?.[1] ?? "")
    .filter(Boolean);
  const languageRow = rows.find(
    (row) => String(row[0] ?? "").trim() === "_language",
  );

  return {
    schemaVersion: 1,
    phraseKeys: sortedUnique(phraseKeys),
    phraseFamilies: sortedUnique(phraseFamilies),
    parameterNames: sortedUnique(parameterNames),
    languages: sortedUnique((languageRow ?? []).slice(1).map(String)),
    customPhraseKeys: sortedUnique(customPhraseKeys),
  };
};

export const validateStudyCatalogRequirements = (
  requirements: StudyCatalogRequirements,
  glossaryData: Pick<GlossaryData, "glossary" | "superMatchingParams"> & {
    aliases?: Record<string, string>;
  },
  phrases: Record<string, unknown>,
) => {
  const { glossary, superMatchingParams, aliases = {} } = glossaryData;
  const missingParameters = sortedUnique(
    requirements.parameterNames.filter(
      (name) =>
        !(name in glossary) &&
        !(name in aliases && aliases[name] in glossary) &&
        !matchesSuperMatchingParameter(name, superMatchingParams),
    ),
  );

  return [
    ...(missingParameters.length > 0
      ? [
          {
            schemaVersion: 1,
            code: "PARAMETER_DEFINITION_MISSING",
            kind: "error" as const,
            context: "catalog-validation",
            name: "Parameter definition missing.",
            message: `The selected Glossary release does not define: ${missingParameters.join(
              ", ",
            )}.`,
            hint: "Choose a Glossary release that contains these parameters or remove them from the study.",
            parameters: missingParameters,
          },
        ]
      : []),
    ...requirements.phraseKeys
      .filter((key) => !(key in phrases))
      .map((key) => ({
        schemaVersion: 1,
        code: "PHRASE_DEFINITION_MISSING",
        kind: "error" as const,
        context: "catalog-validation",
        name: "Phrase definition missing.",
        message: `The selected release does not define phrase ${key}.`,
        hint: "Choose a release that contains this phrase or remove the reference.",
        parameters: [key],
      })),
  ];
};
