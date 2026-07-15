/**
 * Per-compile cache of font file bytes, shared by every font validator
 * (variable-font settings, shaping tables, language support, feature
 * analysis) so each font is downloaded at most once per compilation instead
 * of once per validator.
 */
import { GitLabOAuthClient } from "./auth/gitlabOAuthClient";
import { getAuthConfig } from "./auth/config";
import {
  getFontFilesForValidation,
  getFontFilesForValidationLocal,
} from "./folderStructureCheck";

export interface FontFile {
  name: string;
  data: ArrayBuffer;
}

export interface FontDataCache {
  /** Return the available fonts among `fontNames`, fetching uncached ones. */
  getFontData(fontNames: string[]): Promise<FontFile[]>;
}

export const createFontDataCache = (
  space: string,
  fontDirectory?: string,
  gitlabOAuthClient?: GitLabOAuthClient,
): FontDataCache => {
  const dataByName = new Map<string, ArrayBuffer>();
  const attempted = new Set<string>();

  const fetchFonts = (names: string[]): Promise<FontFile[]> => {
    if (space === "node" && fontDirectory) {
      return getFontFilesForValidationLocal(names, fontDirectory);
    }
    const client =
      gitlabOAuthClient ??
      GitLabOAuthClient.loadFromStorage(
        getAuthConfig().clientId,
        getAuthConfig().redirectUri,
      );
    if (!client) throw new Error("Not authenticated");
    return getFontFilesForValidation(names, client);
  };

  return {
    async getFontData(fontNames: string[]): Promise<FontFile[]> {
      const toFetch = fontNames.filter((name) => !attempted.has(name));
      if (toFetch.length > 0) {
        // Fetch before marking attempted, so a thrown error (e.g. not
        // authenticated) surfaces to each caller instead of silently
        // yielding no fonts on later calls.
        const fetched = await fetchFonts(toFetch);
        toFetch.forEach((name) => attempted.add(name));
        for (const file of fetched) dataByName.set(file.name, file.data);
      }
      return fontNames
        .filter((name) => dataByName.has(name))
        .map((name) => ({ name, data: dataByName.get(name)! }));
    },
  };
};
