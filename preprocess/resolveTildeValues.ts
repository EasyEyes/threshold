import type { PhraseTable } from "../../source/components/parsePhraseFile";
import { ExperimentTable } from "./experimentTable";
import {
  type EasyEyesError,
  TILDE_WITHOUT_PHRASE_TABLE,
  TILDE_SYMBOL_NOT_FOUND,
  TILDE_LANGUAGE_NOT_IN_TABLE,
  TILDE_RESOLVED_BLANK,
} from "./errorMessages";

export function resolveTildeValues(
  paramTable: ExperimentTable,
  phraseTable: PhraseTable | undefined,
  languageCode: string,
): { resolved: ExperimentTable; errors: EasyEyesError[] } {
  const errors: EasyEyesError[] = [];
  const resolvedRows: string[][] = [];

  for (const name of paramTable.params) {
    for (const rawRow of paramTable.allRawRows(name)) {
      const newRow = (rawRow as readonly string[]).map((cell, i) => {
        if (i === 0) return cell;
        const trimmed = (cell ?? "").trim();
        if (!trimmed.startsWith("~")) return cell;

        if (phraseTable === undefined) {
          errors.push(TILDE_WITHOUT_PHRASE_TABLE(name, trimmed));
          return cell;
        }

        const key = trimmed.slice(1).toLowerCase();
        const langMap = phraseTable.get(key);
        if (!langMap) {
          errors.push(TILDE_SYMBOL_NOT_FOUND(name, trimmed));
          return cell;
        }

        if (!langMap.has(languageCode)) {
          errors.push(TILDE_LANGUAGE_NOT_IN_TABLE(name, trimmed, languageCode));
          return cell;
        }

        const translation = langMap.get(languageCode)!;
        if (translation === "") {
          errors.push(TILDE_RESOLVED_BLANK(name, trimmed, languageCode));
        }
        return translation;
      });
      resolvedRows.push(newRow);
    }
  }

  return { resolved: new ExperimentTable(resolvedRows), errors };
}
