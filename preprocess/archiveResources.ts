/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Zip-backed resource pool for compiling from a *.source.zip archive
 * (*.export.zip is still accepted).
 *
 * A source archive is self-contained: its files ARE the resource folder.
 * This module builds the same `easyeyesResources` shape the web compiler
 * gets from the scientist's EasyEyesResources repo (and the local compiler
 * gets from disk, see examples/localCompile.ts), so
 * `prepareExperimentFileForThreshold` can run the SAME resource validations
 * for archives, sourcing every file from the zip instead of GitLab.
 */
import JSZip from "jszip";

import { flattenZipEntries } from "./zipUtils";
import { acceptableExtensions } from "./constants";
import { getFileExtensionFromFileName } from "./fileUtils";

// Filename-suffix predicates, identical to the routing in
// source/components/dropzone.ts and createOrUpdateCommonResources.
const isImpulseResponseFileName = (name: string): boolean =>
  /\.gainVTime\.(xlsx|csv)$/i.test(name);
const isFrequencyResponseFileName = (name: string): boolean =>
  /\.gainVFreq\.(xlsx|csv)$/i.test(name);
const isTargetSoundListFileName = (name: string): boolean =>
  /\.targetSoundList\.(xlsx|csv)$/i.test(name);
const isPhraseFileName = (name: string): boolean =>
  /\.phrases\.xlsx$/i.test(name);

export const buildArchiveResources = async (
  archivedZip: File,
): Promise<any> => {
  // Read bytes ourselves: JSZip's Blob path needs FileReader, which node
  // (jest) lacks, and modern browsers all have File.arrayBuffer().
  const zip = await new JSZip().loadAsync(await archivedZip.arrayBuffer());
  const entries = flattenZipEntries(zip);
  const entryByName = new Map(entries.map((e) => [e.name, e.entry]));

  const fonts: string[] = [];
  const forms: string[] = [];
  const texts: string[] = [];
  const folders: string[] = []; // "name.zip", like the repo folder listing
  const images: string[] = [];
  const code: string[] = [];
  const impulseResponses: string[] = [];
  const frequencyResponses: string[] = [];
  const targetSoundLists: string[] = [];
  const phrases: File[] = [];
  const textContents: Record<string, string> = {};

  for (const { name, entry } of entries) {
    const ext = getFileExtensionFromFileName(name);
    if (isImpulseResponseFileName(name)) impulseResponses.push(name);
    else if (isFrequencyResponseFileName(name)) frequencyResponses.push(name);
    else if (isTargetSoundListFileName(name)) targetSoundLists.push(name);
    else if (isPhraseFileName(name))
      phrases.push(new File([await entry.async("arraybuffer")], name));
    else if (acceptableExtensions.fonts.includes(ext)) fonts.push(name);
    else if (acceptableExtensions.forms.includes(ext)) forms.push(name);
    else if (acceptableExtensions.texts.includes(ext)) {
      texts.push(name);
      // Corpus content for the reading-length checks, like the web
      // compiler's textContents fetched from the repo.
      try {
        textContents[name] = await entry.async("string");
      } catch {
        // Unreadable entry — same as the web compiler's silent skip.
      }
    } else if (acceptableExtensions.folders.includes(ext)) folders.push(name);
    else if (acceptableExtensions.images.includes(ext)) images.push(name);
    else if (acceptableExtensions.code.includes(ext)) code.push(name);
    // Any remaining xlsx/csv is the experiment table itself, not a resource.
  }

  const readBase64 = async (fileName: string): Promise<string | null> => {
    const entry = entryByName.get(fileName);
    return entry ? entry.async("base64") : null;
  };

  // Same {name, file: base64} shape as the GitLab fetchers in
  // folderStructureCheck.ts; absent names are skipped, like their 404s.
  const collectNamedBase64 = async (
    names: string[],
  ): Promise<{ name: string; file: string }[]> => {
    const files: { name: string; file: string }[] = [];
    for (const name of names) {
      const content = await readBase64(name);
      if (content !== null) files.push({ name, file: content });
    }
    return files;
  };

  const localFetchers = {
    getImpulseResponseFiles: collectNamedBase64,
    getFrequencyResponseFiles: collectNamedBase64,
    getTargetSoundListFiles: collectNamedBase64,

    // Mirrors getRequestedFoldersForStructureCheck (folderStructureCheck.ts):
    // files carry name={name,targetKind}, base64 zip content, and parameter.
    getFolderStructureFiles: async (folderAndTargetKindObjectList: any[]) => {
      const seen = new Set<string>();
      const files: any[] = [];
      const push = async (
        folderName: string,
        targetKind: string,
        parameter: string,
      ) => {
        if (!folderName) return;
        const key = `${parameter}:${folderName}:${targetKind}`;
        if (seen.has(key)) return;
        seen.add(key);
        const content = await readBase64(`${folderName}.zip`);
        // Absent zip — the presence check has already reported it.
        if (content === null) return;
        files.push({
          name: { name: folderName, targetKind },
          file: content,
          targetKind,
          parameter,
        });
      };
      for (const item of folderAndTargetKindObjectList) {
        if (item.maskerSoundFolder)
          await push(
            item.maskerSoundFolder,
            item.targetKind,
            "maskerSoundFolder",
          );
        await push(
          item.targetSoundFolder,
          item.targetKind,
          "targetSoundFolder",
        );
      }
      const { folderStructureCheck } = await import("./folderStructureCheck");
      const errors = await folderStructureCheck(files);
      return { errors, files };
    },

    // Mirrors getImageFiles: attaches base64 zip content to each folder object.
    getImageFiles: async (folderNamesObjectList: any[]) =>
      Promise.all(
        folderNamesObjectList.map(async (folder: any) => ({
          ...folder,
          file:
            (await readBase64(`${folder.targetImageFolder}.zip`)) ?? undefined,
        })),
      ),

    // Font bytes for the variable-font/shaping/language validators
    // (fontDataCache.ts), instead of getFontFilesForValidation's GitLab reads.
    getFontFiles: async (
      names: string[],
    ): Promise<{ name: string; data: ArrayBuffer }[]> => {
      const files: { name: string; data: ArrayBuffer }[] = [];
      for (const name of names) {
        const entry = entryByName.get(name);
        if (entry) files.push({ name, data: await entry.async("arraybuffer") });
      }
      return files;
    },
  };

  return {
    fonts,
    forms,
    texts,
    folders,
    images,
    code,
    impulseResponses,
    frequencyResponses,
    targetSoundLists,
    phrases,
    textContents,
    localFetchers,
  };
};
