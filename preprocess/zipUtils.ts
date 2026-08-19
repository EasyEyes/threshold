import JSZip from "jszip";

/**
 * Study archives EasyEyes writes as *.source.zip (formerly *.export.zip,
 * including *.lax.source.zip). Both .source.zip and older .export.zip
 * suffixes are accepted so older archives still compile when dropped onto
 * the compiler.
 */
export const isSourceArchiveFileName = (fileName: string): boolean =>
  /\.(export|source)\.zip$/i.test(fileName);

/**
 * EasyEyes source archives (*.source.zip, formerly *.export.zip) are flat:
 * every file sits at the top level of the zip. When scientists unzip an
 * archive, edit it, and re-zip it, archive tools often wrap everything in a
 * directory (e.g. "study.source/Sloan.woff2") and add metadata entries
 * (__MACOSX/, AppleDouble "._*" files, .DS_Store, Thumbs.db). Flattening
 * entry paths to their basename and dropping directory and junk entries
 * makes such re-zipped archives behave like the flat archives EasyEyes
 * creates.
 */

export interface FlattenedZipEntry {
  /** Basename of the entry, e.g. "Sloan.woff2" for "study/Sloan.woff2". */
  name: string;
  entry: JSZip.JSZipObject;
}

const junkFileNames = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

export const flattenZipEntries = (zip: JSZip): FlattenedZipEntry[] => {
  const flattened: FlattenedZipEntry[] = [];
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || path.endsWith("/")) continue;
    const segments = path.split(/[\\/]/).filter((s) => s.length > 0);
    if (segments.includes("__MACOSX")) continue;
    const name = segments[segments.length - 1];
    if (!name || name.startsWith("._") || junkFileNames.has(name)) continue;
    flattened.push({ name, entry });
  }
  return flattened;
};
