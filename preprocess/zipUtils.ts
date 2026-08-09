import JSZip from "jszip";

/**
 * EasyEyes export archives (*.export.zip) are flat: every file sits at the
 * top level of the zip. When scientists unzip an export, edit it, and re-zip
 * it, archive tools often wrap everything in a directory (e.g.
 * "study.export/Sloan.woff2") and add metadata entries (__MACOSX/,
 * AppleDouble "._*" files, .DS_Store, Thumbs.db). Flattening entry paths to
 * their basename and dropping directory and junk entries makes such re-zipped
 * archives behave like the flat archives EasyEyes creates.
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
