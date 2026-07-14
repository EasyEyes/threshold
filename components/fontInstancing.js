/**
 * Font Processor
 * Generates static font instances from variable fonts and applies stylistic sets using Rust/WASM.
 */

import { isVariableFont, cleanFontName } from "./fonts.js";

let wasmModule = null;
const fontInstanceMap = new Map(); // Maps "fontName|variableSettings|stylisticSets" -> processedFontName
let fontInstancingTimesMs = []; // Array of times taken to instance each font (in milliseconds)

/** Initialize WASM module */
async function initWasm() {
  if (wasmModule) return;

  try {
    const wasm = await import("../@rust/pkg/easyeyes_wasm.js");
    await wasm.default();
    wasmModule = wasm;
  } catch (error) {
    console.warn(
      "[WASM] FALLBACK ACTIVE - fonts will NOT be processed!",
      error.message,
    );
    wasmModule = {
      generate_static_font_instance: (fontData) => fontData,
      apply_stylistic_sets: (fontData) => fontData,
      process_font: (fontData) => fontData,
    };
  }
}

/** Generate a unique font family name for a processed font */
function generateProcessedFontName(
  baseFontName,
  variableSettings,
  stylisticSets,
  featureSettings,
) {
  const nameParts = [];

  // Process variable settings (e.g., "wght" 625 -> wght625)
  if (variableSettings?.trim()) {
    const cleaned = variableSettings.replace(/["']/g, "").trim();
    const parts = cleaned.split(",").map((p) => p.trim());

    for (const part of parts) {
      const tokens = part.split(/\s+/);
      if (tokens.length === 2) {
        const axis = tokens[0].trim();
        const value = Math.round(parseFloat(tokens[1].trim()));
        nameParts.push(`${axis}${value}`);
      }
    }
  }

  // Process stylistic sets (e.g., "SS01, SS19" -> SS01-SS19)
  if (stylisticSets?.trim()) {
    const cleaned = stylisticSets.replace(/["']/g, "").trim();
    const sets = cleaned
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.startsWith("SS"));
    if (sets.length > 0) {
      nameParts.push(sets.join("-"));
    }
  }

  // Process feature settings (e.g. '"calt" 1, "smcp"' -> calt+smcp)
  if (featureSettings?.trim()) {
    const tags = featureSettings
      .replace(/["']/g, "")
      .split(",")
      .map((s) => s.trim().split(/\s+/)[0])
      .filter(Boolean);
    if (tags.length > 0) {
      nameParts.push(tags.join("+"));
    }
  }

  // Create a shorter, more browser-friendly font name
  const shortBaseName = baseFontName.split(".")[0]; // Remove file extension if present
  const shortName = shortBaseName.includes("BitcountGridSingle")
    ? "BitcountGrid"
    : shortBaseName;

  return nameParts.length > 0
    ? `${shortName}-${nameParts.join("-")}`
    : shortName;
}

/** Load font file as ArrayBuffer */
async function loadFontFile(fontPath) {
  const response = await fetch(fontPath);
  if (!response.ok) throw new Error(`Failed to fetch font: ${fontPath}`);
  return response.arrayBuffer();
}

/**
 * Load Google Font variable font file.
 * Fetches the full variable font (not instanced) for WASM processing.
 * @returns {{data: ArrayBuffer, format: string}|null}
 */
/**
 * Load Google Font variable font file.
 * @param {string} fontName - Font name
 * @param {string} variableSettings - Used to build axis request (e.g., "YEAR" 1980 -> YEAR@1980)
 */
async function loadGoogleFontFile(fontName, variableSettings) {
  const encodedName = encodeURIComponent(fontName);
  // Convert settings to axis@value format for URL (e.g., "YEAR" 1980 -> YEAR@1980)
  const axisParam = variableSettings
    .replace(/["']/g, "")
    .trim()
    .replace(/\s+/, "@");
  // No trailing colon when axisParam is empty (would produce an invalid URL).
  const cssUrl = axisParam
    ? `https://fonts.googleapis.com/css2?family=${encodedName}:${axisParam}`
    : `https://fonts.googleapis.com/css2?family=${encodedName}`;

  try {
    const cssResponse = await fetch(cssUrl);
    if (!cssResponse.ok) {
      console.warn(`[Google Font] Fetch failed: ${cssResponse.status}`);
      return null;
    }

    const cssText = await cssResponse.text();

    // Extract font URL: prefer Latin subset, then any modern format, then woff.
    // Google Fonts serves different formats per User-Agent.
    const latinMatch = cssText.match(
      /\/\* latin \*\/[^}]+url\(([^)]+)\)\s*format\(['"](?:woff2|truetype|opentype|woff)['"]\)/,
    );
    const anyModernMatch = cssText.match(
      /url\(([^)]+)\)\s*format\(['"](?:woff2|truetype|opentype)['"]\)/,
    );
    const anyWoffMatch = cssText.match(
      /url\(([^)]+)\)\s*format\(['"]woff['"]\)/,
    );

    let fontUrl = latinMatch?.[1] || anyModernMatch?.[1] || anyWoffMatch?.[1];
    const format = latinMatch || anyModernMatch ? "woff2" : "woff";

    if (!fontUrl) {
      return null;
    }

    fontUrl = fontUrl.replace(/['"]/g, "");
    const fontResponse = await fetch(fontUrl);
    if (!fontResponse.ok) return null;

    const data = await fontResponse.arrayBuffer();
    return { data, format };
  } catch (error) {
    return null;
  }
}

/** Process font using WASM (variable instancing and/or stylistic sets) */
async function processFont(
  fontData,
  variableSettings,
  stylisticSets,
  featureSettings,
) {
  if (!wasmModule) await initWasm();

  const fontBytes = new Uint8Array(fontData);
  const varSettings = variableSettings?.trim() || "";
  const ssSettings = stylisticSets?.trim() || "";
  const featSettings = featureSettings?.trim() || "";

  const result = wasmModule.process_font(
    fontBytes,
    varSettings,
    ssSettings,
    featSettings,
  );

  if (result instanceof Error) throw new Error(`WASM error: ${result.message}`);
  return new Uint8Array(result);
}

/** Register a font instance as a FontFace */
async function registerFontFace(fontFamilyName, fontData, originalExtension) {
  const formatMap = {
    woff2: "woff2",
    woff: "woff",
    otf: "opentype",
    ttf: "truetype",
  };

  const format = formatMap[originalExtension.toLowerCase()] || "woff2";
  const blob = new Blob([fontData], { type: `font/${originalExtension}` });
  const blobUrl = URL.createObjectURL(blob);

  const fontFace = new FontFace(
    fontFamilyName,
    `url(${blobUrl}) format('${format}')`,
  );

  await fontFace.load();
  document.fonts.add(fontFace);

  const available = await document.fonts.check(`12px "${fontFamilyName}"`);
  if (!available) {
    console.warn(
      `[fontProcessor] Font "${fontFamilyName}" not available after registration`,
    );
  }

  return fontFace;
}

/** Process fonts: apply variable instancing and/or stylistic sets */
export async function generateFontInstances(variations) {
  if (!variations?.length) return;

  // Reset timing array for this run
  fontInstancingTimesMs = [];

  let successCount = 0;
  const totalStart = performance.now();

  for (const variation of variations) {
    const {
      fontName,
      originalFontName,
      variableSettings,
      stylisticSets,
      featureSettings,
      fontPath,
      fontSource,
    } = variation;
    const instanceStart = performance.now();

    try {
      let fontData, format;
      const processedFontName = generateProcessedFontName(
        fontName,
        variableSettings,
        stylisticSets,
        featureSettings,
      );

      if (fontSource === "google") {
        // Google Fonts: fetch font, then process with WASM
        if (!wasmModule) await initWasm();
        const result = await loadGoogleFontFile(fontName, variableSettings);
        if (!result) continue;
        const processedData = await processFont(
          result.data,
          variableSettings,
          stylisticSets,
          featureSettings,
        );
        // Processed output is raw sfnt, not woff2 — register with correct format.
        await registerFontFace(processedFontName, processedData, "ttf");
      } else if (fontSource === "file") {
        // File fonts: use WASM to process locally
        if (!wasmModule) await initWasm();
        fontData = await loadFontFile(fontPath);
        format = (originalFontName.split(".").pop() || "woff2").replace(
          /woff2?/i,
          "ttf",
        );
        const processedData = await processFont(
          fontData,
          variableSettings,
          stylisticSets,
          featureSettings,
        );
        await registerFontFace(processedFontName, processedData, format);
      }

      // Create lookup key including both settings
      const lookupKey = `${fontName}|${variableSettings || ""}|${
        stylisticSets || ""
      }|${featureSettings || ""}`;
      fontInstanceMap.set(lookupKey, processedFontName);
      successCount++;

      const elapsed = performance.now() - instanceStart;
      fontInstancingTimesMs.push(elapsed);
    } catch (error) {
      console.error(`Font processing failed for ${fontName}:`, error.message);
    }
  }

  return successCount;
}

/**
 * Get the times taken to instance each font (in milliseconds)
 * Returns null if fonts haven't been instanced yet
 * @returns {number[]|null} Array of times in milliseconds or null
 */
export function getFontInstancingTimesMs() {
  return fontInstancingTimesMs.length > 0 ? fontInstancingTimesMs : null;
}

/**
 * Get the total time taken to instance all fonts (in milliseconds)
 * Returns null if fonts haven't been instanced yet
 * @returns {number|null} Total time in milliseconds or null
 */
export function getFontInstancingTotalTimeMs() {
  if (fontInstancingTimesMs.length === 0) return null;
  return fontInstancingTimesMs.reduce((sum, time) => sum + time, 0);
}

/**
 * Convert fontWeight to fontVariableSettings format
 * @param {number|string} fontWeight - The font weight value
 * @returns {string} The variableSettings string (e.g., '"wght" 625')
 */
export function fontWeightToVariableSettings(fontWeight) {
  if (fontWeight === "" || fontWeight === undefined || fontWeight === null) {
    return "";
  }
  const weight = Number(fontWeight);
  if (isNaN(weight)) return "";
  return `"wght" ${weight}`;
}

/**
 * Combine fontVariableSettings with fontWeight (converted to wght axis)
 * fontWeight is only used if fontVariableSettings doesn't already contain "wght"
 * @param {string} variableSettings - Existing fontVariableSettings
 * @param {number|string} fontWeight - The font weight value
 * @returns {string} Combined variableSettings string
 */
export function combineVariableSettingsWithWeight(
  variableSettings,
  fontWeight,
) {
  const trimmedSettings = variableSettings?.trim() || "";
  const weightSettings = fontWeightToVariableSettings(fontWeight);

  // If no weight setting, return original
  if (!weightSettings) return trimmedSettings;

  // If no existing settings, use weight setting
  if (!trimmedSettings) return weightSettings;

  // Check if wght is already in variableSettings (compiler should prevent this)
  const hasWght = trimmedSettings
    .toLowerCase()
    .replace(/["']/g, "")
    .includes("wght");
  if (hasWght) return trimmedSettings;

  // Combine: append weight to existing settings
  return `${trimmedSettings}, ${weightSettings}`;
}

/**
 * Collect all font variations requiring WASM processing from the parameter reader
 * @param {Object} reader - The parameter reader
 * @returns {Array} Array of font variation objects
 */
export function collectFontVariations(reader) {
  const variations = [];
  const blockCount = reader.blockCount;

  for (let blockIndex = 1; blockIndex <= blockCount; blockIndex++) {
    const conditionEnabledBools = reader.read(
      "conditionEnabledBool",
      blockIndex,
    );
    const conditionTrialsArr = reader.read("conditionTrials", blockIndex);
    const fontSources = reader.read("fontSource", blockIndex);
    const fontNames = reader.read("font", blockIndex);
    const variableSettingsArray = reader.read(
      "fontVariableSettings",
      blockIndex,
    );
    const fontWeightArray = reader.read("fontWeight", blockIndex);
    const stylisticSetsArray = reader.read("fontStylisticSets", blockIndex);
    const featureSettingsArray = reader.read("fontFeatureSettings", blockIndex);

    for (
      let conditionIndex = 0;
      conditionIndex < conditionEnabledBools.length;
      conditionIndex++
    ) {
      const conditionEnabledBool = conditionEnabledBools[conditionIndex];
      const fontSource = fontSources[conditionIndex];
      const fontName = fontNames[conditionIndex];
      const rawVariableSettings = variableSettingsArray[conditionIndex] || "";
      const fontWeight = fontWeightArray[conditionIndex];

      // Combine fontVariableSettings with fontWeight
      const variableSettings = combineVariableSettingsWithWeight(
        rawVariableSettings,
        fontWeight,
      );

      // Handle stylistic sets - normalize to comma-separated string
      // (multicategorical may return array)
      const stylisticSetsRaw = stylisticSetsArray?.[conditionIndex] || "";
      const stylisticSets = Array.isArray(stylisticSetsRaw)
        ? stylisticSetsRaw.join(", ")
        : String(stylisticSetsRaw);
      const featureSettingsRaw = String(
        featureSettingsArray?.[conditionIndex] || "",
      );
      // CSS 'normal' keyword = no-op (same as empty)
      const featureSettings =
        featureSettingsRaw.trim() === "normal" ? "" : featureSettingsRaw;

      if (!conditionEnabledBool || conditionTrialsArr[conditionIndex] <= 0)
        continue;

      // Process if font has variable settings, stylistic sets, or feature settings
      const needsProcessing =
        variableSettings.trim() ||
        stylisticSets.trim() ||
        featureSettings.trim();

      if (
        (fontSource === "file" || fontSource === "google") &&
        needsProcessing
      ) {
        const fontPath = fontSource === "file" ? `fonts/${fontName}` : null;

        variations.push({
          fontName: cleanFontName(fontName),
          originalFontName: fontName,
          variableSettings: variableSettings.trim(),
          stylisticSets: stylisticSets.trim(),
          featureSettings: featureSettings.trim(),
          fontPath,
          fontSource,
          blockIndex,
          conditionIndex: conditionIndex + 1,
        });
      }
    }
  }

  return variations;
}

export function getProcessedFontName(
  fontName,
  variableSettings,
  stylisticSets,
  featureSettings,
) {
  const varSettings = variableSettings?.trim() || "";
  const ssSettings = stylisticSets?.trim() || "";
  const featSettings = featureSettings?.trim() || "";

  // No processing needed if no setting is provided
  if (!varSettings && !ssSettings && !featSettings) return null;

  const key = `${fontName}|${varSettings}|${ssSettings}|${featSettings}`;
  return fontInstanceMap.get(key) || null;
}

// Backwards compatibility alias
export const getInstancedFontName = (fontName, variableSettings) =>
  getProcessedFontName(fontName, variableSettings, "", "");
