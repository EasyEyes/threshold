import Papa from "papaparse";
import { transpose } from "./utilities";

export const splitIntoBlockFiles = (df: any) => {
  const resultFileList = [];

  // Split up into block files
  const blockIndices: any = { block: [] };
  const uniqueBlock = df.unique("block").toDict()["block"];
  uniqueBlock.forEach((blockId: any, index: any) => {
    // Add an index to our blockCount file (see below) for this block
    blockIndices["block"].push(index);
    // Get the parameters from just this block...
    const blockDf = df.filter((row: any) => row.get("block") === blockId);
    const blockDict = blockDf.toDict();
    const columns = Object.keys(blockDict);
    const data = transpose(columns.map((column) => blockDict[column]));
    // ... and use them to create a csv file for this block.
    const blockCSVString = Papa.unparse({ fields: columns, data: data });
    const blockFileName = "block_" + String(blockId) + ".csv";

    // store block file
    const csvBlob = new Blob([blockCSVString], { type: "text/csv" });
    const csvFile = new File([csvBlob], blockFileName, { type: "text/csv" });
    resultFileList.push(csvFile);

    // Add this block file to the output zip
    // zip.file(blockFileName, blockCSVString);
  });

  // Create a "blockCount" file, just one column with the the indices of the blocks
  const blockCountCSVString = Papa.unparse({
    fields: ["block"],
    data: blockIndices.block.map((x: any) => [x]),
  });
  const blockCountFileName = "blockCount.csv";

  // store blockCount file
  const blockCountBlob = new Blob([blockCountCSVString], { type: "text/csv" });
  const blockCountFile = new File([blockCountBlob], blockCountFileName, {
    type: "text/csv",
  });
  resultFileList.push(blockCountFile);

  return resultFileList;
};
