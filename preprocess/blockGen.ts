/* eslint-disable @typescript-eslint/no-explicit-any */
import Papa from "papaparse";
import { transpose } from "./utilities";

export const splitIntoBlockFiles = (df: any, space = "web") => {
  const resultFileList = [];

  // Split up into block files
  const blockIndices: any = { block: [] };
  const uniqueBlock = df.unique("block").toDict()["block"];

  uniqueBlock.forEach((blockId: string, index: number) => {
    // Add an index to our blockCount file (see below) for this block
    blockIndices["block"].push(index);

    // Get the parameters from just this block...
    const blockDf = df.filter((row: any) => row.get("block") === blockId);
    const blockDict = blockDf.toDict();
    const columns = Object.keys(blockDict);

    const data = transpose(columns.map((column) => blockDict[column]));
    // ... and use them to create a csv file for this block.
    const blockCSVString = Papa.unparse({ fields: columns, data: data });
    const blockName = "block_" + String(blockId) + ".csv";

    // store block file
    if (space === "web")
      resultFileList.push(getFileOnWeb(blockCSVString, blockName));
    else resultFileList.push(getFileNode(blockCSVString, blockName));

    // Add this block file to the output zip
    // zip.file(blockFileName, blockCSVString);
  });

  // Create a "blockCount" file, just one column with the the indices of the blocks
  const blockCountCSVString = Papa.unparse({
    fields: ["block"],
    data: blockIndices.block.map((x: any) => [x]),
  });

  // store blockCount file
  if (space === "web")
    resultFileList.push(getFileOnWeb(blockCountCSVString, "blockCount.csv"));
  else resultFileList.push(getFileNode(blockCountCSVString, "blockCount.csv"));

  return resultFileList;
};

const getFileOnWeb = (blockCSVString: string, name: string) => {
  const csvBlob = new Blob([blockCSVString], { type: "text/csv" });
  const csvFile = new File([csvBlob], name, { type: "text/csv" });
  return csvFile;
};

const getFileNode = (blockCSVString: string, name: string) => {
  return [blockCSVString, name];
};
