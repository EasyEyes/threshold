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
  prefix = "~",
  selectorParameter = "_language",
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
          if (!item.startsWith(prefix)) return item;

          if (phraseTable === undefined) {
            errors.push(
              TILDE_WITHOUT_PHRASE_TABLE(
                name,
                item,
                prefix === "Ⓝ"
                  ? "_phrasesSpreadsheet"
                  : "_languagePhrasesSpreadsheet",
              ),
            );
            return item;
          }

          const key = item.toLowerCase();
          const langMap = phraseTable.get(key);
          if (!langMap) {
            errors.push(TILDE_SYMBOL_NOT_FOUND(name, item));
            return item;
          }

          if (!langMap.has(languageCode)) {
            errors.push(
              TILDE_LANGUAGE_NOT_IN_TABLE(
                name,
                item,
                languageCode,
                selectorParameter,
              ),
            );
            return item;
          }

          return langMap.get(languageCode)!;
        };

        if (prefix === "Ⓛ" && cell?.includes(prefix)) {
          return cell.replace(/Ⓛ[^\s,;()[\]{}]+/gu, (token) => {
            let symbol = token;
            let punctuation = "";
            // A question mark can belong to a symbolic name. Try the complete
            // name before treating trailing punctuation as prose.
            while (
              symbol.length > 1 &&
              !phraseTable?.has(symbol.toLowerCase()) &&
              /[.:!?]$/u.test(symbol)
            ) {
              punctuation = symbol.slice(-1) + punctuation;
              symbol = symbol.slice(0, -1);
            }
            return resolveItem(symbol) + punctuation;
          });
        }

        if (glossaryType === "multicategorical") {
          return trimmed
            .split(",")
            .map((item) => resolveItem(item.trim()).trim())
            .filter(Boolean)
            .join(", ");
        }

        if (!trimmed.startsWith(prefix)) return cell;

        return resolveItem(trimmed);
      });
      resolvedRows.push(newRow);
    }
  }

  return { resolved: new ExperimentTable(resolvedRows), errors };
}

/**
 * Resolve current and legacy language symbols unless the requested phrase file
 * is known to be missing. In that case the missing-file error is sufficient;
 * attempting resolution would only add one misleading error per symbol.
 */
export function resolveLanguageValues(
  table: ExperimentTable,
  phraseTable: PhraseTable | undefined,
  languageCode: string,
  phraseFileMissing: boolean,
): { resolved: ExperimentTable; errors: EasyEyesError[] } {
  if (phraseFileMissing) return { resolved: table, errors: [] };

  const current = resolveTildeValues(table, phraseTable, languageCode, "Ⓛ");
  const legacy = resolveTildeValues(
    current.resolved,
    phraseTable,
    languageCode,
  );
  return {
    resolved: legacy.resolved,
    errors: [...current.errors, ...legacy.errors],
  };
}

export function syncResolvedFontRows(
  parsedData: string[][],
  resolvedTable: ExperimentTable,
): string[][] {
  const resolvedFontRows = resolvedTable.allRawRows("font");
  let resolvedFontRowIndex = 0;

  return parsedData.map((row) => {
    if (row[0] !== "font") return row;
    const resolvedFontRow = resolvedFontRows[resolvedFontRowIndex++];
    return resolvedFontRow ? [...resolvedFontRow] : row;
  });
}
