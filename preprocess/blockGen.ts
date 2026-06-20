/* eslint-disable @typescript-eslint/no-explicit-any */
import Papa from "papaparse";
import { transpose } from "./utils";

export const splitIntoBlockFiles = (df: any, space = "web") => {
  const getFile = space === "web" ? getFileOnWeb : getFileNode;
  const resultFileList = [];

  // Split up into block files
  const blockIndices: {
    block: number[];
    targetKind: string[];
    targetTask: string[];
  } = {
    block: [],
    targetKind: [],
    targetTask: [],
  };
  let uniqueBlock = df.unique("block").toDict()["block"];
  // Guard: if no blocks at all, produce a header-only blockCount.csv so
  // Pavlovia resource loading succeeds; runtime safety net handles the empty case.
  if (!uniqueBlock || !Array.isArray(uniqueBlock)) uniqueBlock = [];

  uniqueBlock.forEach((blockId: string) => {
    // Record this block in our blockCount file (see below).
    // CONSERVATION OF THE BLOCK NUMBER: store the ACTUAL block number from the
    // study spreadsheet (not a 0-based index), so the runtime loads block files
    // by their conserved block number and never renumbers them.
    if (blockId && blockId.length) {
      blockIndices["block"].push(Number(blockId));

      // Get the parameters from just this block...
      const blockDf = df.filter((row: any) => row.get("block") === blockId);
      const blockDict = blockDf.toDict();
      const columns = Object.keys(blockDict);

      if (blockDict["targetKind"])
        blockIndices.targetKind.push(blockDict["targetKind"][0]);
      else blockIndices.targetKind.push("letter");

      if (blockDict["targetTask"])
        blockIndices.targetTask.push(blockDict["targetTask"][0]);
      else blockIndices.targetKind.push("identify");

      const data = transpose(columns.map((column) => blockDict[column]));
      // ... and use them to create a csv file for this block.
      const blockCsvString = Papa.unparse({ fields: columns, data: data });
      const blockName = `block_${String(blockId)}.csv`;

      // store block file
      resultFileList.push(getFile(blockCsvString, blockName));

      // Add this block file to the output zip
      // zip.file(blockFileName, blockCsvString);
    }
  });

  // Create a "blockCount" file, whose "block" column holds the actual block
  // numbers (conserved from the spreadsheet), one row per block.
  const blockCountCsvString = Papa.unparse({
    fields: ["block", "targetKind", "targetTask"],
    data: blockIndices.block.map((x: any, index: number) => [
      x,
      blockIndices.targetKind[index],
      blockIndices.targetTask[index],
    ]),
  });

  // store blockCount file
  resultFileList.push(getFile(blockCountCsvString, "blockCount.csv"));

  return resultFileList;
};

const getFileOnWeb = (blockCsvString: string, name: string) => {
  const csvBlob = new Blob([blockCsvString], { type: "text/csv;charset=utf8" });
  const csvFile = new File([csvBlob], name, { type: "text/csv;charset=utf8" });
  return csvFile;
};

const getFileNode = (blockCsvString: string, name: string) => {
  return [blockCsvString, name];
};
