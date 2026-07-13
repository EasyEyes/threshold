/**
 * @file Font shaping-table sanity check.
 *
 * Detects fonts whose OpenType layout tables (GSUB/GPOS) are present in the
 * file but rejected by HarfBuzz — the text-shaping engine used by Chrome,
 * Edge, and Firefox. When HarfBuzz's
 * sanitizer finds a malformed rule it discards the ENTIRE table, so the font
 * silently loses all glyph substitution (cursive joining, ligatures,
 * contextual forms) and falls back to legacy shaping. In connected scripts
 * such as Arabic this can misspell words on screen. Apple's shaper (CoreText,
 * used by Safari/Notes) tolerates such defects, so the font can look perfect
 * on a Mac while misrendering for participants — which makes this failure
 * easy to miss without an automated check.
 *
 * Real-world example: "Al Thuluth.woff2" (built with FontCreator 11.5)
 * contains two chained-context GSUB lookups with an illegal zero-length input
 * sequence. HarfBuzz rejects the whole GSUB; the fallback path renders Arabic
 * "kabir" as "kabiz" and breaks Urdu/Persian yeh joining.
 *
 * The check: load the font into HarfBuzz (the same code browsers run) and
 * compare the script list it reports for GSUB/GPOS against the script list
 * read directly from the raw table bytes. Raw scripts > 0 but HarfBuzz
 * reports none => HarfBuzz rejected the table => fail the compile.
 */

import { EasyEyesError, FONT_SHAPING_TABLE_REJECTED } from "./errorMessages";
import { getGlossary } from "../parameters/glossaryRegistry";
import { getColumnValuesOrDefaults } from "./utils";
import { GitLabOAuthClient } from "./auth/gitlabOAuthClient";
import { getAuthConfig } from "./auth/config";
import {
  getFontFilesForValidation,
  getFontFilesForValidationLocal,
} from "./folderStructureCheck";
import {
  fontFaultIsTolerated,
  needBrowserMayUseHarfBuzz,
  TABLE_TO_FAULT,
} from "./fontFaultPolicy";

import type { OpenTypeLayoutTable } from "./fontFaultPolicy";

export {
  fontFaultIsTolerated,
  needBrowserMayUseHarfBuzz,
} from "./fontFaultPolicy";
export type { FontShapingFault, OpenTypeLayoutTable } from "./fontFaultPolicy";

/* -------------------------------------------------------------------------- */
/*                          Container format handling                          */
/* -------------------------------------------------------------------------- */

const tagAt = (bytes: Uint8Array, offset: number): string =>
  String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
  );

// DecompressionStream is missing from TypeScript 4.9's DOM lib; it exists in
// all modern browsers and Node >= 18
declare const DecompressionStream: {
  new (format: string): { readable: any; writable: any };
};

/** Inflate a zlib/deflate stream using the built-in DecompressionStream
 *  (available in all modern browsers and Node >= 18). */
const inflate = async (data: Uint8Array): Promise<Uint8Array> => {
  const stream = new globalThis.Blob([
    data.slice().buffer as ArrayBuffer,
  ]).stream();
  const decompressed = stream.pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(decompressed).arrayBuffer());
};

interface SfntTable {
  tag: number;
  data: Uint8Array;
}

/** Assemble a raw sfnt (TTF/OTF) from a set of tables. */
const buildSfnt = (flavor: number, tables: SfntTable[]): Uint8Array => {
  // The sfnt table directory must be sorted by tag
  const entries = [...tables].sort((a, b) => (a.tag >>> 0) - (b.tag >>> 0));
  const numTables = entries.length;

  const headerSize = 12 + numTables * 16;
  let total = headerSize;
  for (const e of entries) total += (e.data.length + 3) & ~3;

  const out = new Uint8Array(total);
  const outDv = new DataView(out.buffer);
  outDv.setUint32(0, flavor);
  outDv.setUint16(4, numTables);
  // searchRange/entrySelector/rangeShift (not used by shapers, set correctly anyway)
  const maxPow2 = Math.pow(2, Math.floor(Math.log2(numTables)));
  outDv.setUint16(6, maxPow2 * 16);
  outDv.setUint16(8, Math.log2(maxPow2));
  outDv.setUint16(10, numTables * 16 - maxPow2 * 16);

  let dataOffset = headerSize;
  entries.forEach((e, i) => {
    const p = 12 + i * 16;
    outDv.setUint32(p, e.tag);
    outDv.setUint32(p + 4, 0); // checksum: ignored by shapers
    outDv.setUint32(p + 8, dataOffset);
    outDv.setUint32(p + 12, e.data.length);
    out.set(e.data, dataOffset);
    dataOffset += (e.data.length + 3) & ~3;
  });
  return out;
};

/** Convert a WOFF (v1) file to a raw sfnt (TTF/OTF) byte array. */
const woffToSfnt = async (woff: Uint8Array): Promise<Uint8Array> => {
  const dv = new DataView(woff.buffer, woff.byteOffset, woff.byteLength);
  const flavor = dv.getUint32(4);
  const numTables = dv.getUint16(12);

  const tables: SfntTable[] = [];
  for (let i = 0; i < numTables; i++) {
    const p = 44 + i * 20;
    const tag = dv.getUint32(p);
    const offset = dv.getUint32(p + 4);
    const compLength = dv.getUint32(p + 8);
    const origLength = dv.getUint32(p + 12);
    const raw = woff.subarray(offset, offset + compLength);
    const data = compLength < origLength ? await inflate(raw) : raw;
    tables.push({ tag, data });
  }
  return buildSfnt(flavor, tables);
};

// WOFF2 known table tags, indexed by the 6-bit tag index in the table
// directory (index 63 means an explicit 4-byte tag follows)
// prettier-ignore
const WOFF2_KNOWN_TAGS = [
  "cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post",
  "cvt ", "fpgm", "glyf", "loca", "prep", "CFF ", "VORG", "EBDT",
  "EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea",
  "vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC", "JSTF", "MATH",
  "CBDT", "CBLC", "COLR", "CPAL", "SVG ", "sbix", "acnt", "avar",
  "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar",
  "gvar", "hsty", "just", "lcar", "mort", "morx", "opbd", "prop",
  "trak", "Zapf", "Silf", "Glat", "Gloc", "Feat", "Sill",
];

const tagToNumber = (tag: string): number =>
  (((tag.charCodeAt(0) & 0xff) << 24) |
    ((tag.charCodeAt(1) & 0xff) << 16) |
    ((tag.charCodeAt(2) & 0xff) << 8) |
    (tag.charCodeAt(3) & 0xff)) >>>
  0;

/**
 * Convert a WOFF2 file to a raw sfnt.
 *
 * Parses the WOFF2 table directory, brotli-decompresses the data stream
 * (using the pure-JS brotli decoder; the WASM alternative, wawoff2, hangs
 * under webpack because its emscripten runtime never initializes), and
 * reassembles the untransformed tables. Transformed tables (glyf/loca, and
 * hmtx when its transform is used) are omitted rather than reconstructed:
 * this check only inspects GSUB/GPOS, which WOFF2 never transforms, and
 * HarfBuzz does not need glyph outlines to sanitize them.
 */
const woff2ToSfnt = async (woff2: Uint8Array): Promise<Uint8Array> => {
  const dv = new DataView(woff2.buffer, woff2.byteOffset, woff2.byteLength);
  const flavor = dv.getUint32(4);
  if (flavor === tagToNumber("ttcf"))
    throw new Error("WOFF2 font collections are not supported");
  const numTables = dv.getUint16(12);
  const totalCompressedSize = dv.getUint32(20);

  let pos = 48;
  const readUIntBase128 = (): number => {
    let value = 0;
    for (let i = 0; i < 5; i++) {
      const byte = woff2[pos++];
      value = value * 128 + (byte & 0x7f);
      if ((byte & 0x80) === 0) return value;
    }
    throw new Error("Invalid UIntBase128 in WOFF2 table directory");
  };

  interface Woff2Entry {
    tag: number;
    transformed: boolean;
    length: number; // bytes this table occupies in the decompressed stream
  }
  const entries: Woff2Entry[] = [];
  for (let i = 0; i < numTables; i++) {
    const flags = woff2[pos++];
    const tagIndex = flags & 0x3f;
    const transformVersion = (flags >> 6) & 0x3;
    let tagString: string;
    if (tagIndex === 63) {
      tagString = tagAt(woff2, pos);
      pos += 4;
    } else {
      tagString = WOFF2_KNOWN_TAGS[tagIndex];
    }
    const origLength = readUIntBase128();
    // glyf and loca are transformed when transformVersion is 0 (their null
    // transform is version 3); other tables when transformVersion is nonzero
    const transformed =
      tagString === "glyf" || tagString === "loca"
        ? transformVersion === 0
        : transformVersion !== 0;
    const length = transformed ? readUIntBase128() : origLength;
    entries.push({ tag: tagToNumber(tagString), transformed, length });
  }

  // The single brotli-compressed data block follows the table directory
  const compressed = woff2.subarray(pos, pos + totalCompressedSize);
  const mod: any = await import("brotli/decompress.js");
  const brotliDecompress = mod.default ?? mod;
  const decompressed: Uint8Array = brotliDecompress(compressed);

  const tables: SfntTable[] = [];
  let offset = 0;
  for (const e of entries) {
    if (!e.transformed)
      tables.push({
        tag: e.tag,
        data: decompressed.subarray(offset, offset + e.length),
      });
    offset += e.length;
  }
  return buildSfnt(flavor, tables);
};

/** Return raw sfnt bytes for any supported font container. */
const toSfnt = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const sig = tagAt(bytes, 0);
  if (sig === "wOF2") return await woff2ToSfnt(bytes);
  if (sig === "wOFF") return await woffToSfnt(bytes);
  return bytes; // ttf/otf/ttc: usable as-is
};

/* -------------------------------------------------------------------------- */
/*                              HarfBuzz loading                               */
/* -------------------------------------------------------------------------- */

const isNodeEnvironment = (): boolean =>
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

// harfbuzzjs module (ES module with top-level await), loaded lazily and
// cached. Both branches dodge TypeScript's CommonJS downleveling of
// import(), which turns it into require() — and require() cannot load an
// async (top-level-await) ES module.
let harfbuzzModule: any = null;
const loadHarfbuzz = async (): Promise<any> => {
  if (harfbuzzModule) return harfbuzzModule;
  if (isNodeEnvironment()) {
    // Native ESM import at runtime (ts-node examples builder, jest)
    const dynamicImport = new Function("s", "return import(s)");
    harfbuzzModule = await dynamicImport("harfbuzzjs");
  } else {
    // The .js helper keeps a real import() that webpack can process,
    // emitting the .wasm as an asset (via `new URL("harfbuzz.wasm",
    // import.meta.url)` in the glue code) and awaiting initialization
    const loader: any = await import("./harfbuzzLoader.js");
    harfbuzzModule = await loader.importHarfbuzz();
  }
  return harfbuzzModule;
};

/* -------------------------------------------------------------------------- */
/*                             The actual check                                */
/* -------------------------------------------------------------------------- */

/**
 * Number of scripts declared in the raw bytes of a GSUB/GPOS table.
 * Read directly from the table header, bypassing any sanitization.
 */
const rawScriptCount = (table: Uint8Array): number => {
  if (table.length < 10) return 0;
  const dv = new DataView(table.buffer, table.byteOffset, table.byteLength);
  const scriptListOffset = dv.getUint16(4);
  if (scriptListOffset === 0 || scriptListOffset + 2 > table.length) return 0;
  return dv.getUint16(scriptListOffset);
};

export interface FontShapingReport {
  /** Layout tables present in the file but rejected by HarfBuzz. */
  rejectedTables: OpenTypeLayoutTable[];
}

/**
 * Check whether HarfBuzz (Chrome/Edge/Firefox's shaper) accepts the font's
 * OpenType layout tables. Accepts ttf, otf, ttc, woff, and woff2 data.
 */
export const checkFontShapingTables = async (
  fontData: ArrayBuffer,
): Promise<FontShapingReport> => {
  const sfnt = await toSfnt(new Uint8Array(fontData));
  const hb = await loadHarfbuzz();
  const blob = new hb.Blob(sfnt);
  const face = new hb.Face(blob);

  const rejectedTables: OpenTypeLayoutTable[] = [];
  for (const table of ["GSUB", "GPOS"] as const) {
    // Raw (unsanitized) table bytes straight from the file
    const raw: Uint8Array | undefined = face.referenceTable(table);
    if (!raw) continue; // table absent: nothing to lose
    // Scripts visible to HarfBuzz after its sanitizer has run
    const sanitizedScripts: string[] = face.getTableScriptTags(table);
    if (rawScriptCount(raw) > 0 && sanitizedScripts.length === 0)
      rejectedTables.push(table);
  }
  return { rejectedTables };
};

/* -------------------------------------------------------------------------- */
/*                        Compile-time validation entry                        */
/* -------------------------------------------------------------------------- */

/**
 * Compile-time check of every fontSource="file" font in the experiment.
 * Returns a (blocking) error for each font whose GSUB/GPOS table HarfBuzz
 * rejects, except faults explicitly listed in fontTolerateFaults. The check is
 * skipped when _needBrowser permits only non-HarfBuzz browsers. Fonts that
 * cannot be fetched or analyzed are skipped with a console warning; other
 * checks (e.g. isFontMissing) cover those cases.
 *
 * @param df - The experiment dataframe
 * @param space - The execution space ("web" or "node")
 * @param fontDirectory - Path to local fonts directory (required for "node")
 */
export const validateFontShaping = async (
  df: any,
  space: string = "web",
  fontDirectory?: string,
  gitlabOAuthClient?: GitLabOAuthClient,
): Promise<EasyEyesError[]> => {
  const errors: EasyEyesError[] = [];
  try {
    const fontNames = getColumnValuesOrDefaults(df, "font");
    const fontSources = getColumnValuesOrDefaults(df, "fontSource");
    const faultTolerances = getColumnValuesOrDefaults(df, "fontTolerateFaults");
    const needBrowser = getColumnValuesOrDefaults(df, "_needBrowser")[0];
    const browserCategories = getGlossary()["_needBrowser"]?.categories;
    const knownBrowsers = Array.isArray(browserCategories)
      ? browserCategories.filter(
          (browser): browser is string =>
            typeof browser === "string" &&
            browser !== "all" &&
            !browser.toLowerCase().startsWith("not"),
        )
      : [];

    if (!needBrowserMayUseHarfBuzz(needBrowser, knownBrowsers)) return errors;

    // Conditions per file-sourced font
    const conditionsByFont = new Map<string, number[]>();
    for (let i = 0; i < fontNames.length; i++) {
      const source =
        fontSources[i] || getGlossary()["fontSource"]?.default || "file";
      if (source !== "file") continue;
      const name = fontNames[i];
      if (!name || name.trim() === "") continue;
      const conditions = conditionsByFont.get(name) || [];
      conditions.push(i);
      conditionsByFont.set(name, conditions);
    }
    if (conditionsByFont.size === 0) return errors;

    // "all" (or both currently supported shaping faults) disables this check
    // for a condition. Do not fetch fonts used only by such conditions.
    const fontNamesToAnalyze = Array.from(conditionsByFont.keys()).filter(
      (name) =>
        (conditionsByFont.get(name) || []).some(
          (condition) =>
            !fontFaultIsTolerated(
              faultTolerances[condition],
              TABLE_TO_FAULT.GSUB,
            ) ||
            !fontFaultIsTolerated(
              faultTolerances[condition],
              TABLE_TO_FAULT.GPOS,
            ),
        ),
    );
    if (fontNamesToAnalyze.length === 0) return errors;

    // Fetch font files: local filesystem in node mode, GitLab API in web mode
    let fontFiles: { name: string; data: ArrayBuffer }[];
    if (space === "node" && fontDirectory) {
      fontFiles = await getFontFilesForValidationLocal(
        fontNamesToAnalyze,
        fontDirectory,
      );
    } else {
      const client =
        gitlabOAuthClient ??
        GitLabOAuthClient.loadFromStorage(
          getAuthConfig().clientId,
          getAuthConfig().redirectUri,
        );
      if (!client) throw new Error("Not authenticated");
      fontFiles = await getFontFilesForValidation(fontNamesToAnalyze, client);
    }

    for (const { name, data } of fontFiles) {
      try {
        const report = await checkFontShapingTables(data);
        const conditions = conditionsByFont.get(name) || [];
        const errorsByConditions = new Map<
          string,
          { tables: OpenTypeLayoutTable[]; conditions: number[] }
        >();

        for (const table of report.rejectedTables) {
          const fault = TABLE_TO_FAULT[table];
          const offendingConditions = conditions.filter(
            (condition) =>
              !fontFaultIsTolerated(faultTolerances[condition], fault),
          );
          if (offendingConditions.length === 0) continue;

          // Tables with the same offending conditions can share one error.
          const key = offendingConditions.join(",");
          const group = errorsByConditions.get(key);
          if (group) group.tables.push(table);
          else
            errorsByConditions.set(key, {
              tables: [table],
              conditions: offendingConditions,
            });
        }

        for (const { tables, conditions: offendingConditions } of Array.from(
          errorsByConditions.values(),
        )) {
          errors.push(
            FONT_SHAPING_TABLE_REJECTED(name, tables, offendingConditions),
          );
        }
      } catch (error) {
        console.warn(
          `[Font Shaping Check] Could not analyze font "${name}"; skipping.`,
          error,
        );
      }
    }
  } catch (error) {
    // Never let the sanity check itself break compilation
    console.warn("[Font Shaping Check] Check unavailable; skipping.", error);
  }
  return errors;
};
