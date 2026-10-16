/**
 * CSV helpers for results-data e2e assertions. parseCsv is a full RFC4180
 * state machine: quoted commas, embedded newlines (warning cells), and BOM.
 * PsychoJS serializes with sheet_to_csv (proper quoting) and excelSafeRows
 * only inserts spaces after commas, so JSON cells remain parseable.
 */
export const parseCsv = (text: string): string[][] => {
  const t = text.replace(/^\ufeff/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
};

/** All cell values of one column, in row order ([] if the column is absent). */
export const csvColumn = (rows: string[][], name: string): string[] => {
  const idx = rows[0]?.indexOf(name) ?? -1;
  return idx === -1 ? [] : rows.slice(1).map((r) => r[idx] ?? "");
};
