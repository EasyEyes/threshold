/**
 * Shared helpers for source-archive round-trip tests: build an archive the
 * way the web export does, and recompile from it the way the compiler does.
 */
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import JSZip from "jszip";

import { prepareExperimentFileForThreshold } from "../../preprocess/main";
import { buildArchiveResources } from "../../preprocess/archiveResources";
import {
  isResourceReferenced,
  parseSpreadsheetRows,
} from "../../preprocess/exportBeforeCompile";
import type { EasyEyesError } from "../../preprocess/errorMessages";

export interface ArchiveCompileResult {
  blockingErrors: EasyEyesError[];
  requestedTextList: string[];
  blockFileCount: number;
}

/** Zip every file under resourcesRoot/<type> whose name the tokens reference. */
export const addReferencedResources = async (
  zip: JSZip,
  tokens: Set<string>,
  resourcesRoot: string,
  types = ["texts", "phrases", "fonts", "forms"],
): Promise<void> => {
  for (const type of types) {
    const dir = path.join(resourcesRoot, type);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (isResourceReferenced(tokens, name))
        zip.file(name, fs.readFileSync(path.join(dir, name)));
    }
  }
};

/** Recompile from a source archive alone, like dropping a *.source.zip on the compiler. */
export const compileFromArchive = async (
  zipBuffer: Buffer,
  tableFileName: string,
): Promise<ArchiveCompileResult> => {
  const zip = await JSZip.loadAsync(zipBuffer);
  const tableBuffer = await zip.file(tableFileName)!.async("nodebuffer");

  const parsed = Papa.parse("", { skipEmptyLines: true }); // shape only
  parsed.data = tableFileName.endsWith(".xlsx")
    ? await parseSpreadsheetRows(new File([tableBuffer], tableFileName))
    : Papa.parse(tableBuffer.toString("utf8"), {
        skipEmptyLines: true,
      }).data;

  const easyeyesResources = await buildArchiveResources(
    new File([zipBuffer], `${tableFileName}.source.zip`),
  );

  return new Promise((resolvePromise, reject) => {
    prepareExperimentFileForThreshold(
      parsed,
      {},
      [],
      easyeyesResources,
      (
        _user: any,
        _requestedForms: any,
        _fonts: string[],
        requestedTextList: string[],
        _folders: string[],
        _images: string[],
        _code: string[],
        fileStringList: string[][],
        errorList: EasyEyesError[],
      ) => {
        resolvePromise({
          blockingErrors: errorList.filter((e) => e.kind === "error"),
          requestedTextList,
          blockFileCount: fileStringList.length,
        });
      },
      "node",
      true,
      tableFileName,
      true,
    ).catch(reject);
  });
};
