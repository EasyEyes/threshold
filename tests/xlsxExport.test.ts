// @ts-expect-error exceljs does not publish a declaration for this bundle path.
import ExcelJS from "exceljs/dist/exceljs.min.js";
import {
  extractWorkbookFormatting,
  rebuildStyledWorkbook,
} from "../preprocess/xlsxExport";

describe("rebuildStyledWorkbook", () => {
  it("preserves mandatory cell formatting while using processed values", async () => {
    const sourceWorkbook = new ExcelJS.Workbook();
    const sourceSheet = sourceWorkbook.addWorksheet("Experiment");
    sourceSheet.addRows([
      ["parameter", "value"],
      ["condition", "before processing"],
    ]);
    sourceSheet.getCell("A1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" },
    };
    sourceSheet.getCell("A1").font = {
      bold: true,
      italic: true,
      color: { argb: "FFFF0000" },
    };
    sourceSheet.addConditionalFormatting({
      ref: "B2",
      rules: [
        {
          type: "expression",
          formulae: ['B2="after processing"'],
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: { argb: "FF00FF00" },
            },
            font: { color: { argb: "FF0000FF" } },
          },
        },
      ],
    });
    const sourceBuffer = await sourceWorkbook.xlsx.writeBuffer();
    const sourceBase64 = Buffer.from(sourceBuffer).toString("base64");

    const formatting = await extractWorkbookFormatting(sourceBase64);
    const result = await rebuildStyledWorkbook(
      JSON.stringify([
        ["parameter", "value"],
        ["condition", "after processing"],
      ]),
      formatting,
    );
    const exportedWorkbook = new ExcelJS.Workbook();
    await exportedWorkbook.xlsx.load(Buffer.from(result, "base64"));
    const exportedSheet = exportedWorkbook.getWorksheet("Experiment")!;

    expect(exportedSheet.getCell("B2").value).toBe("after processing");
    expect(exportedSheet.getCell("A1").fill).toMatchObject({
      fgColor: { argb: "FFFFFF00" },
    });
    expect(exportedSheet.getCell("A1").font).toMatchObject({
      color: { argb: "FFFF0000" },
      bold: true,
      italic: true,
    });
    expect(exportedSheet.conditionalFormattings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ref: "B2",
          rules: expect.arrayContaining([
            expect.objectContaining({
              formulae: ['B2="after processing"'],
              style: expect.objectContaining({
                font: expect.objectContaining({
                  color: { argb: "FF0000FF" },
                }),
              }),
            }),
          ]),
        }),
      ]),
    );
  });

  it("preserves first-sheet dimensions without retaining unprocessed workbook data", async () => {
    const sourceWorkbook = new ExcelJS.Workbook();
    const firstSheet = sourceWorkbook.addWorksheet("Experiment");
    firstSheet.getCell("A1").value = "old";
    firstSheet.getCell("C3").value = "stale source value";
    firstSheet.getColumn(1).width = 24;
    sourceWorkbook.addWorksheet("Notes").getCell("A1").value = "notes remain";
    const sourceBuffer = await sourceWorkbook.xlsx.writeBuffer();
    const sourceBase64 = Buffer.from(sourceBuffer).toString("base64");

    const formatting = await extractWorkbookFormatting(sourceBase64);
    expect(formatting).not.toContain("notes remain");
    expect(formatting).not.toContain("stale source value");

    const result = await rebuildStyledWorkbook(
      JSON.stringify([["processed"]]),
      formatting,
    );
    const exportedWorkbook = new ExcelJS.Workbook();
    await exportedWorkbook.xlsx.load(Buffer.from(result, "base64"));

    expect(exportedWorkbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Experiment",
    ]);
    expect(
      exportedWorkbook.getWorksheet("Experiment")!.getCell("A1").value,
    ).toBe("processed");
    expect(
      exportedWorkbook.getWorksheet("Experiment")!.getColumn(1).width,
    ).toBe(24);
    expect(
      exportedWorkbook.getWorksheet("Experiment")!.getCell("C3").value,
    ).toBeNull();
  });

  it("does not restore a merge that would discard processed values", async () => {
    const sourceWorkbook = new ExcelJS.Workbook();
    const sourceSheet = sourceWorkbook.addWorksheet("Experiment");
    sourceSheet.getCell("A1").value = "merged";
    sourceSheet.mergeCells("A1:B1");
    const sourceBuffer = await sourceWorkbook.xlsx.writeBuffer();
    const formatting = await extractWorkbookFormatting(
      Buffer.from(sourceBuffer).toString("base64"),
    );

    const result = await rebuildStyledWorkbook(
      JSON.stringify([["processed A", "processed B"]]),
      formatting,
    );
    const exportedWorkbook = new ExcelJS.Workbook();
    await exportedWorkbook.xlsx.load(Buffer.from(result, "base64"));
    const exportedSheet = exportedWorkbook.getWorksheet("Experiment")!;

    expect(exportedSheet.getCell("A1").value).toBe("processed A");
    expect(exportedSheet.getCell("B1").value).toBe("processed B");
    expect(exportedSheet.getCell("B1").isMerged).toBe(false);
  });
});
