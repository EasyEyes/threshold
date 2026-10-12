import Papa from "papaparse";

export const INTERNATIONAL_PHRASES_SHEET =
  "https://docs.google.com/spreadsheets/d/1UFfNikfLuo8bSromE34uWDuJrMPFiJG3VpoQKdCGkII/edit#gid=0";

// Read column A from the same sheet as the audit. Preserve blank rows so
// CSV row positions remain sheet row positions. Link lookup never blocks validation.
export async function loadInternationalPhraseRows(): Promise<
  Map<string, number>
> {
  try {
    const response = await fetch(
      "https://docs.google.com/spreadsheets/d/1UFfNikfLuo8bSromE34uWDuJrMPFiJG3VpoQKdCGkII/gviz/tq?tqx=out:csv&gid=0&headers=0&tq=select%20A",
      { signal: AbortSignal.timeout(4000) },
    );
    if (!response.ok) return new Map();
    const rows = Papa.parse<string[]>(await response.text(), {
      skipEmptyLines: false,
    }).data;
    const map = new Map<string, number>();
    rows.forEach((row, index) => {
      const key = row[0]?.trim();
      if (key && /^(EE|RC|T)_/.test(key)) map.set(key, index + 1);
    });
    return map;
  } catch {
    return new Map();
  }
}

export function internationalPhraseUrl(
  key: string,
  rows: Map<string, number>,
): string {
  const row = rows.get(key);
  return Number.isInteger(row) && row! > 0
    ? `${INTERNATIONAL_PHRASES_SHEET}&range=A${row}`
    : INTERNATIONAL_PHRASES_SHEET;
}
