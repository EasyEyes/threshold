/* eslint-disable @typescript-eslint/no-explicit-any */
import Papa from "papaparse";
import { transpose } from "./utils";

export const splitIntoBlockFiles = (df: any, space = "web") => {
  const getFile = space === "web" ? getFileOnWeb : getFileNode;
  const resultFileList = [];

  // Split up into block files
  const blockIndices: { block: number[]; targetKind: string[] } = {
    block: [],
    targetKind: [],
  };
  const uniqueBlock = df.unique("block").toDict()["block"];

  uniqueBlock.forEach((blockId: string, index: number) => {
    // Add an index to our blockCount file (see below) for this block
    if (blockId && blockId.length) {
      blockIndices["block"].push(index);

      // Get the parameters from just this block...
      const blockDf = df.filter((row: any) => row.get("block") === blockId);
      const blockDict = blockDf.toDict();
      const columns = Object.keys(blockDict);

      // Add an index to our blockCount file (see below) for this block
      // blockIndices.block.push(index);

      if (blockDict["targetKind"])
        blockIndices.targetKind.push(blockDict["targetKind"][0]);
      else blockIndices.targetKind.push("letter");

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

  // Create a "blockCount" file, just one column with the the indices of the blocks
  const blockCountCsvString = Papa.unparse({
    fields: ["block", "targetTask"],
    data: blockIndices.block.map((x: any, index: number) => [
      x,
      blockIndices.targetKind[index],
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
