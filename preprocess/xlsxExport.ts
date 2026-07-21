import { Buffer } from "buffer";
// The browser bundle avoids Node-only transitive modules and is what Vite ships.
// @ts-expect-error exceljs does not publish a declaration for this bundle path.
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { utils as xlsxUtils } from "xlsx";

interface WorkbookFormatting {
  sheetName: string;
  cells: Array<{ row: number; column: number; style: Record<string, unknown> }>;
  columns: Array<{ index: number; width?: number; hidden?: boolean }>;
  rows: Array<{ index: number; height?: number; hidden?: boolean }>;
  merges: string[];
  themes: Record<string, string>;
  conditionalFormattings: unknown[];
}

/** Extract only first-sheet presentation metadata, never workbook cell content. */
export const extractWorkbookFormatting = async (
  sourceWorkbookBase64: string,
): Promise<string> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(sourceWorkbookBase64, "base64"));
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The source workbook has no sheets.");

  const formatting: WorkbookFormatting = {
    sheetName: sheet.name,
    cells: [],
    columns: [],
    rows: [],
    merges: [...(sheet.model.merges ?? [])],
    themes: workbook.model.themes ?? {},
    conditionalFormattings: sheet.conditionalFormattings ?? [],
  };

  sheet.eachRow({ includeEmpty: true }, (row: any, rowNumber: number) => {
    if (row.height !== undefined || row.hidden !== undefined) {
      formatting.rows.push({
        index: rowNumber,
        height: row.height,
        hidden: row.hidden,
      });
    }
    row.eachCell({ includeEmpty: true }, (cell: any, columnNumber: number) => {
      if (cell.style && Object.keys(cell.style).length > 0) {
        formatting.cells.push({
          row: rowNumber,
          column: columnNumber,
          style: cell.style,
        });
      }
    });
  });

  sheet.columns.forEach((column: any, index: number) => {
    if (column.width !== undefined || column.hidden !== undefined) {
      formatting.columns.push({
        index: index + 1,
        width: column.width,
        hidden: column.hidden,
      });
    }
  });

  return JSON.stringify(formatting);
};

/** Build a single-sheet XLSX from processed values and saved presentation metadata. */
export const rebuildStyledWorkbook = async (
  processedSheetJson: string,
  formattingJson: string,
): Promise<string> => {
  const processedRows = JSON.parse(processedSheetJson);
  if (!Array.isArray(processedRows)) {
    throw new Error("The processed experiment table is not an array.");
  }
  const formatting = JSON.parse(formattingJson) as WorkbookFormatting;

  const workbook = new ExcelJS.Workbook();
  // ExcelJS preserves loaded theme XML internally but exposes no public setter.
  (workbook as any)._themes = formatting.themes;
  const sheet = workbook.addWorksheet(formatting.sheetName || "Sheet1");
  processedRows.forEach((row: unknown[]) => sheet.addRow(row));

  formatting.columns.forEach(({ index, width, hidden }) => {
    const column = sheet.getColumn(index);
    if (width !== undefined) column.width = width;
    if (hidden !== undefined) column.hidden = hidden;
  });
  formatting.rows.forEach(({ index, height, hidden }) => {
    const row = sheet.getRow(index);
    if (height !== undefined) row.height = height;
    if (hidden !== undefined) row.hidden = hidden;
  });
  formatting.cells.forEach(({ row, column, style }) => {
    sheet.getCell(row, column).style = style;
  });
  formatting.merges.forEach((range) => {
    const decoded = xlsxUtils.decode_range(range);
    let subordinateCellsAreEmpty = true;
    for (let row = decoded.s.r; row <= decoded.e.r; row++) {
      for (let column = decoded.s.c; column <= decoded.e.c; column++) {
        if (row === decoded.s.r && column === decoded.s.c) continue;
        const value = processedRows[row]?.[column];
        if (value !== undefined && value !== null && value !== "") {
          subordinateCellsAreEmpty = false;
        }
      }
    }
    if (subordinateCellsAreEmpty) sheet.mergeCells(range);
  });
  sheet.conditionalFormattings = formatting.conditionalFormattings ?? [];

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output).toString("base64");
};
