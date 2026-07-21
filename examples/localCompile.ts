/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Local (Node) experiment-table compiler, faithful to the web compiler
 * (easyeyes.app/compiler). Parses the table exactly like the web entry point
 * (`preprocessExperimentFile` in preprocess/main.ts) and runs the SAME
 * validation checks, sourcing resources from local subfolders of
 * `resourcesRoot` (fonts/, forms/, texts/, folders/, images/, code/,
 * impulseResponses/, frequencyResponses/, targetSoundLists/, phrases/)
 * instead of the experimenter's EasyEyesResources GitLab repo.
 *
 * Used by `npm run examples` (buildExamples.ts) and by
 * tests/localCompileFidelity.test.ts.
 *
 * Checks that are impossible locally (they depend on the experimenter's
 * account, not on the table) are skipped and reported in
 * `result.skippedChecks`.
 */

import { read, utils } from "xlsx";
import Papa from "papaparse";
import { basename, extname, resolve } from "path";
import { existsSync, readdirSync, readFileSync } from "fs";

import { prepareExperimentFileForThreshold } from "../preprocess/main";
import type { EasyEyesError } from "../preprocess/errorMessages";

export interface LocalCompileOptions {
  /** Root holding fonts/, forms/, texts/, … Defaults to this file's dir (examples/). */
  resourcesRoot?: string;
  /** Hook to mutate parsed rows before compiling (e.g. --simulate injection). */
  transformParsedData?: (data: any[]) => any[];
}

export interface LocalCompileResult {
  user: any;
  requestedForms: any;
  requestedFontList: string[];
  requestedTextList: string[];
  requestedFolderList: string[];
  requestedImageList: string[];
  requestedCodeList: string[];
  fileStringList: string[][];
  /** Errors sorted by parameter name, exactly like the web compiler page. */
  blockingErrors: EasyEyesError[];
  warnings: EasyEyesError[];
  /** Descriptions of web-compiler checks that cannot run locally. */
  skippedChecks: string[];
  requestedImpulseResponseList: string[];
  requestedFrequencyResponseList: string[];
  requestedTargetSoundLists: string[];
  requestedPhraseFile: string;
  tableName: string;
}

/** List file names in a subfolder of resourcesRoot ([] when absent). */
const listDir = (resourcesRoot: string, sub: string): string[] => {
  const dir = resolve(resourcesRoot, sub);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name);
};

const readAsBase64 = (resourcesRoot: string, rel: string): string =>
  readFileSync(resolve(resourcesRoot, rel)).toString("base64");

/** Read all .txt corpus files, mirroring the web compiler's textContents. */
const readTextContents = (resourcesRoot: string): Record<string, string> => {
  const contents: Record<string, string> = {};
  for (const name of listDir(resourcesRoot, "texts")) {
    if (!name.toLowerCase().endsWith(".txt")) continue;
    try {
      contents[name] = readFileSync(resolve(resourcesRoot, "texts", name), {
        encoding: "utf-8",
      }) as string;
    } catch {
      // Unreadable file — same as web's silent skip.
    }
  }
  return contents;
};

/**
 * Local replacements for the web compiler's GitLab file fetchers. Return the
 * exact shapes the shared validators expect ({name, file: base64} etc.).
 */
const makeLocalFetchers = (resourcesRoot: string) => ({
  getImpulseResponseFiles: async (names: string[]) =>
    names.map((name) => ({
      name,
      file: readAsBase64(resourcesRoot, `impulseResponses/${name}`),
    })),

  getFrequencyResponseFiles: async (names: string[]) =>
    names.map((name) => ({
      name,
      file: readAsBase64(resourcesRoot, `frequencyResponses/${name}`),
    })),

  getTargetSoundListFiles: async (names: string[]) =>
    names.map((name) => ({
      name,
      file: readAsBase64(resourcesRoot, `targetSoundLists/${name}`),
    })),

  // Mirrors getRequestedFoldersForStructureCheck (folderStructureCheck.ts):
  // files carry name={name,targetKind}, base64 zip content, and parameter.
  getFolderStructureFiles: async (folderAndTargetKindObjectList: any[]) => {
    const seen = new Set<string>();
    const files: any[] = [];
    const push = (
      folderName: string,
      targetKind: string,
      parameter: string,
    ) => {
      if (!folderName) return;
      const key = `${parameter}:${folderName}:${targetKind}`;
      if (seen.has(key)) return;
      seen.add(key);
      try {
        files.push({
          name: { name: folderName, targetKind },
          file: readAsBase64(resourcesRoot, `folders/${folderName}.zip`),
          targetKind,
          parameter,
        });
      } catch {
        // Unreadable zip — presence check has already run; skip content check.
      }
    };
    for (const item of folderAndTargetKindObjectList) {
      if (item.maskerSoundFolder)
        push(item.maskerSoundFolder, item.targetKind, "maskerSoundFolder");
      push(item.targetSoundFolder, item.targetKind, "targetSoundFolder");
    }
    const { folderStructureCheck } = await import(
      "../preprocess/folderStructureCheck"
    );
    const errors = await folderStructureCheck(files);
    return { errors, files };
  },

  // Mirrors getImageFiles: attaches base64 zip content to each folder object.
  getImageFiles: async (folderNamesObjectList: any[]) =>
    folderNamesObjectList.map((folder: any) => {
      let file: string | undefined;
      try {
        file = readAsBase64(
          resourcesRoot,
          `folders/${folder.targetImageFolder}.zip`,
        );
      } catch {
        file = undefined;
      }
      return { ...folder, file };
    }),
});

/**
 * Parse a table file exactly like the web compiler's preprocessExperimentFile:
 * .xlsx → first sheet → sheet_to_csv → PapaParse; .csv → PapaParse directly.
 */
const parseTableFile = (tablePath: string): Papa.ParseResult<any>[] => {
  const results: Papa.ParseResult<any>[] = [];
  const complete = (parsed: Papa.ParseResult<any>) => results.push(parsed);
  if (extname(tablePath).toLowerCase().includes("xlsx")) {
    // Same as the web compiler: read(new Uint8Array(data), { type: "array" })
    const book = read(new Uint8Array(readFileSync(tablePath)), {
      type: "array",
    });
    for (const sheet in book.Sheets) {
      const csv: any = utils.sheet_to_csv(book.Sheets[sheet]);
      Papa.parse(csv, { skipEmptyLines: true, encoding: "UTF-8", complete });
      break; // Only the very first sheet
    }
  } else {
    const text = readFileSync(tablePath, { encoding: "utf-8" }) as string;
    Papa.parse(text, { skipEmptyLines: true, encoding: "UTF-8", complete });
  }
  return results;
};

export const compileExperimentTableLocally = async (
  tablePath: string,
  options: LocalCompileOptions = {},
): Promise<LocalCompileResult> => {
  const resourcesRoot = options.resourcesRoot ?? __dirname;
  const tableName = basename(tablePath);

  const skippedChecks: string[] = [];
  const easyeyesResources: any = {
    fonts: listDir(resourcesRoot, "fonts"),
    forms: listDir(resourcesRoot, "forms"),
    texts: listDir(resourcesRoot, "texts"),
    folders: listDir(resourcesRoot, "folders"),
    images: listDir(resourcesRoot, "images"),
    impulseResponses: listDir(resourcesRoot, "impulseResponses"),
    frequencyResponses: listDir(resourcesRoot, "frequencyResponses"),
    targetSoundLists: listDir(resourcesRoot, "targetSoundLists"),
    code: listDir(resourcesRoot, "code"),
    phrases: [] as File[],
    fetchPhraseFromRepo: async (name: string): Promise<File | null> => {
      const phrasePath = resolve(resourcesRoot, "phrases", name);
      if (!existsSync(phrasePath)) return null;
      const buffer = readFileSync(phrasePath);
      return new File([buffer], name);
    },
    textContents: readTextContents(resourcesRoot),
    localFetchers: makeLocalFetchers(resourcesRoot),
    fontDirectory: resolve(resourcesRoot, "fonts"),
    textDirectory: resolve(resourcesRoot, "texts"),
    skippedChecks,
  };

  const parsedList = parseTableFile(tablePath);
  if (parsedList.length === 0)
    throw new Error(`Failed to parse experiment table: ${tablePath}`);
  const parsed = parsedList[0];
  if (options.transformParsedData)
    parsed.data = options.transformParsedData(parsed.data);

  return new Promise((resolvePromise) => {
    prepareExperimentFileForThreshold(
      parsed,
      {},
      [],
      easyeyesResources,
      (
        user: any,
        requestedForms: any,
        requestedFontList: string[],
        requestedTextList: string[],
        requestedFolderList: string[],
        requestedImageList: string[],
        requestedCodeList: string[],
        fileStringList: string[][],
        errorList: EasyEyesError[],
        requestedImpulseResponseList: string[],
        requestedFrequencyResponseList: string[],
        requestedTargetSoundLists: string[],
        requestedPhraseFile: string,
      ) => {
        // Same split + sort as the web compiler page (source/Table.js):
        // warnings never block; blocking errors sorted by parameter name.
        const blockingErrors = errorList.filter((e: any) => e.kind === "error");
        const warnings = errorList.filter((e: any) => e.kind === "warning");
        blockingErrors.sort((errA: any, errB: any) => {
          if (errA.parameters < errB.parameters) return -1;
          else return 1;
        });
        resolvePromise({
          user,
          requestedForms,
          requestedFontList,
          requestedTextList,
          requestedFolderList,
          requestedImageList,
          requestedCodeList,
          fileStringList,
          blockingErrors,
          warnings,
          skippedChecks,
          requestedImpulseResponseList,
          requestedFrequencyResponseList,
          requestedTargetSoundLists,
          requestedPhraseFile,
          tableName,
        });
      },
      "node",
      false,
      tableName,
      true,
    );
  });
};
