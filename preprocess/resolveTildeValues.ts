import type { PhraseTable } from "../../source/components/parsePhraseFile";
import { ExperimentTable } from "./experimentTable";
import {
  type EasyEyesError,
  TILDE_WITHOUT_PHRASE_TABLE,
  TILDE_SYMBOL_NOT_FOUND,
  TILDE_LANGUAGE_NOT_IN_TABLE,
} from "./errorMessages";

export function resolveTildeValues(
  paramTable: ExperimentTable,
  phraseTable: PhraseTable | undefined,
  languageCode: string,
): { resolved: ExperimentTable; errors: EasyEyesError[] } {
  const errors: EasyEyesError[] = [];
  const resolvedRows: string[][] = [];

  for (const name of paramTable.params) {
    const glossaryType = paramTable.glossary(name)?.type;
    for (const rawRow of paramTable.allRawRows(name)) {
      const newRow = (rawRow as readonly string[]).map((cell, i) => {
        if (i === 0) return cell;
        const trimmed = (cell ?? "").trim();

        const resolveItem = (item: string): string => {
          if (!item.startsWith("~")) return item;

          if (phraseTable === undefined) {
            errors.push(TILDE_WITHOUT_PHRASE_TABLE(name, item));
            return item;
          }

          const key = item.slice(1).toLowerCase();
          const langMap = phraseTable.get(key);
          if (!langMap) {
            errors.push(TILDE_SYMBOL_NOT_FOUND(name, item));
            return item;
          }

          if (!langMap.has(languageCode)) {
            errors.push(TILDE_LANGUAGE_NOT_IN_TABLE(name, item, languageCode));
            return item;
          }

          return langMap.get(languageCode)!;
        };

        if (glossaryType === "multicategorical") {
          return trimmed
            .split(",")
            .map((item) => resolveItem(item.trim()).trim())
            .filter(Boolean)
            .join(", ");
        }

        if (!trimmed.startsWith("~")) return cell;

        return resolveItem(trimmed);
      });
      resolvedRows.push(newRow);
    }
  }

  return { resolved: new ExperimentTable(resolvedRows), errors };
}
