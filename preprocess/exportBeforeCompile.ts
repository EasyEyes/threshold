/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Export a study BEFORE (or without) compiling it.
 *
 * The regular export (downloadCommonResources in gitlabUtils.ts) packages a
 * successfully compiled experiment from its Pavlovia project. That is useless
 * when the reason for exporting is that compilation fails. This module builds
 * a {name}.raw.source.zip archive directly from the spreadsheet the scientist
 * selects, plus whatever resources it can find, so a study with compiler
 * errors can still be shared, e.g. to file a bug report.
 *
 * The ".raw" marker distinguishes this uncompiled archive from the
 * rigorous {name}.source.zip produced after a successful compile. It needs no
 * special file handling: the compiler recognizes archives by the *.source.zip
 * or older *.export.zip suffix, which a raw archive still matches, so it
 * compiles like any source archive.
 *
 * Exporting must be very tolerant. It never validates: it tolerantly scans
 * every cell of the spreadsheet for values that name a file in the scientist's
 * EasyEyesResources repository, and bundles the matches. Anything it cannot
 * read or fetch is simply skipped — the export is a courier, not a compiler.
 * Whatever is wrong with the study will be caught later, when the export is
 * eventually compiled.
 */

import JSZip from "jszip";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import { read, utils } from "xlsx";
import Swal from "sweetalert2";
import * as sentry from "../components/sentry";

import type { EasyEyesError } from "./errorMessages";
import { resourcesFileTypes, resourcesRepoName } from "./constants";
import {
  getBase64FileDataFromGitLab,
  getTextFileDataFromGitLab,
  getFileExtension,
} from "./fileUtils";
import { getCommonResourcesNames } from "./gitlabUtils";
import { searchProjectByName } from "./gitlabSearch";
import { GitLabOAuthClient } from "./auth/gitlabOAuthClient";
import { getAuthConfig } from "./auth/config";
import { ensureValidToken } from "./auth/ensureValidToken";
import { redirectToOauth2 } from "./user";

/* -------------------------------- Errors --------------------------------- */
// Export errors reuse the compiler's EasyEyesError shape so Table.js can show
// them in the same list as compiler errors. context === "export" is what makes
// the UI label them "Export error:" instead of "Compiler error:".

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const NO_SPREADSHEET_TO_EXPORT = (
  fileNames: string[],
): EasyEyesError => ({
  name: "No spreadsheet selected",
  message: `Export packages your experiment spreadsheet, together with every resource it mentions (fonts, forms, texts, sounds, images, code), into one raw.source.zip file that is easy to share. ${
    fileNames.length
      ? `None of the selected files (${fileNames
          .map(escapeHtml)
          .join(", ")}) is an experiment spreadsheet.`
      : "No file was selected."
  }`,
  hint: `Click "Select file to download source" and choose your experiment spreadsheet (a .csv or .xlsx file).`,
  context: "export",
  kind: "error",
  parameters: [],
});

export const UNREADABLE_SPREADSHEET_FOR_EXPORT = (
  fileName: string,
  details: string,
): EasyEyesError => ({
  name: "Cannot read spreadsheet",
  message: `EasyEyes cannot read <span class="error-parameter">${escapeHtml(
    fileName,
  )}</span> as a spreadsheet, so it cannot work out which resources your experiment uses.`,
  hint: `${
    details ? escapeHtml(details) + "<br/>" : ""
  }Try re-saving the file as .xlsx or .csv, then export again.`,
  context: "export",
  kind: "error",
  parameters: [],
});

export const EXPORT_FAILED = (
  fileName: string,
  details: string,
): EasyEyesError => ({
  name: "Export failed",
  message: `Something went wrong while exporting <span class="error-parameter">${escapeHtml(
    fileName,
  )}</span>.${details ? ` ${escapeHtml(details)}` : ""}`,
  hint: "Please try again. If the problem persists, refresh the page, log in again, and retry.",
  context: "export",
  kind: "error",
  parameters: [],
});

/* --------------------------- File classification -------------------------- */

// Spreadsheets whose filename marks them as a resource (mirrors dropzone.ts),
// so that e.g. a dropped "x.gainVTime.xlsx" is bundled as a resource rather
// than mistaken for the experiment table.
const isResourceSpreadsheet = (name: string): boolean =>
  /\.(gainVTime|gainVFreq|targetSoundList)\.(xlsx|csv)$/i.test(name) ||
  /\.phrases\.xlsx$/i.test(name);

const isExperimentSpreadsheet = (file: File): boolean => {
  const extension = getFileExtension(file);
  return (
    (extension === "csv" || extension === "xlsx") &&
    !isResourceSpreadsheet(file.name)
  );
};

/* ------------------------- Tolerant spreadsheet scan ---------------------- */

const parseSpreadsheetRows = async (file: File): Promise<string[][]> => {
  const papaParse = (input: any): Promise<string[][]> =>
    new Promise((resolve, reject) => {
      Papa.parse(input, {
        skipEmptyLines: true,
        encoding: "UTF-8",
        complete: (results: Papa.ParseResult<any>) =>
          resolve(results.data as string[][]),
        error: (error: any) => reject(error),
      } as any);
    });

  if (getFileExtension(file) === "xlsx") {
    const data = await file.arrayBuffer();
    const book = read(new Uint8Array(data), { type: "array" });
    const firstSheetName = book.SheetNames[0];
    if (!firstSheetName) throw new Error("The workbook contains no sheets.");
    // Only the first sheet matters, as in preprocessExperimentFile (main.ts).
    return papaParse(utils.sheet_to_csv(book.Sheets[firstSheetName]));
  }
  return papaParse(file);
};

/**
 * Collect every cell value that might name a resource. No knowledge of
 * parameters is used (the glossary may be exactly what's broken), so commented
 * rows and disabled conditions are included too: over-inclusion only makes the
 * export more complete, never invalid.
 */
export const collectResourceTokens = (rows: string[][]): Set<string> => {
  const tokens = new Set<string>();
  for (const row of rows) {
    // Skip column A (parameter names); resources are named in value cells.
    for (const cell of row.slice(1)) {
      if (typeof cell !== "string") continue;
      const trimmed = cell.trim();
      if (!trimmed) continue;
      tokens.add(trimmed.toLowerCase());
      // Some parameters hold comma-separated lists of file names.
      for (const part of trimmed.split(",")) {
        const token = part.trim().toLowerCase();
        if (token) tokens.add(token);
      }
    }
  }
  return tokens;
};

export const isResourceReferenced = (
  tokens: Set<string>,
  resourceFileName: string,
): boolean => {
  const name = resourceFileName.toLowerCase();
  if (tokens.has(name)) return true;
  // Sound and image folders are stored zipped ("noise.zip") but referenced
  // without the extension ("noise") by parameters like maskerSoundFolder.
  return name.endsWith(".zip") && tokens.has(name.slice(0, -".zip".length));
};

/* --------------------------------- Export --------------------------------- */

/**
 * Build and download {spreadsheetName}.raw.source.zip from the selected files.
 * Returns [] on success, or the export errors to display (never throws).
 */
export const exportStudyBeforeCompiling = async (
  user: any,
  droppedFiles: File[],
): Promise<EasyEyesError[]> => {
  // Redirects to OAuth when the session cannot be recovered, like compiling.
  if (!(await ensureValidToken(redirectToOauth2))) return [];

  const files = droppedFiles ?? [];
  const experimentFile = files.find(isExperimentSpreadsheet);
  if (!experimentFile)
    return [NO_SPREADSHEET_TO_EXPORT(files.map((file) => file.name))];

  Swal.fire({
    title: "Downloading ...",
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    let tokens: Set<string>;
    try {
      tokens = collectResourceTokens(
        await parseSpreadsheetRows(experimentFile),
      );
    } catch (error: any) {
      return [
        UNREADABLE_SPREADSHEET_FOR_EXPORT(
          experimentFile.name,
          error?.message || String(error),
        ),
      ];
    }

    const zip = new JSZip();

    // Bundle each referenced resource from the scientist's EasyEyesResources
    // repository. Listing or fetch failures skip that resource: the receiving
    // compile will report whatever turns out to be missing.
    let resourceNamesByType: { [key: string]: string[] | null } = {};
    try {
      resourceNamesByType = await getCommonResourcesNames(user);
    } catch (error) {
      console.warn("Export: could not list EasyEyesResources:", error);
    }

    const client = GitLabOAuthClient.loadFromStorage(
      getAuthConfig().clientId,
      getAuthConfig().redirectUri,
    );
    let resourcesRepoId: number | null = null;
    if (client) {
      try {
        const resourcesRepo = await searchProjectByName(
          user,
          resourcesRepoName,
        );
        if (resourcesRepo) resourcesRepoId = parseInt(resourcesRepo.id);
      } catch (error) {
        console.warn("Export: could not find EasyEyesResources repo:", error);
      }
    }

    if (client && resourcesRepoId !== null) {
      const repoId = resourcesRepoId;
      await Promise.all(
        resourcesFileTypes.map(async (type) => {
          const names = resourceNamesByType[type] || [];
          await Promise.all(
            names
              .filter((name) => isResourceReferenced(tokens, name))
              .map(async (name) => {
                try {
                  const path = `${type}/${name}`;
                  const content =
                    type === "texts"
                      ? await getTextFileDataFromGitLab(repoId, path, client)
                      : await getBase64FileDataFromGitLab(repoId, path, client);
                  if (!content) return;
                  if (
                    content
                      .trim()
                      .indexOf(`{"message":"404 File Not Found"}`) !== -1
                  )
                    return;
                  zip.file(name, content, { base64: type !== "texts" });
                } catch (error) {
                  console.warn(
                    `Export: failed to fetch ${type}/${name}:`,
                    error,
                  );
                }
              }),
          );
        }),
      );
    }

    // The spreadsheet itself, byte-for-byte as selected. Files selected
    // alongside it are bundled verbatim too, and (being added later) win over
    // any same-named copy fetched from the repository.
    zip.file(experimentFile.name, experimentFile);
    for (const extraFile of files)
      if (extraFile !== experimentFile) zip.file(extraFile.name, extraFile);

    const baseName = experimentFile.name.replace(/\.(csv|xlsx)$/i, "");
    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, `${baseName}.raw.source.zip`);
    return [];
  } catch (error: any) {
    sentry.captureError(error, "exportStudyBeforeCompiling failed");
    return [
      EXPORT_FAILED(experimentFile.name, error?.message || String(error)),
    ];
  } finally {
    Swal.close();
  }
};
