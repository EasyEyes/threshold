/**
 * Variable Font Instance Generator
 * Generates static font instances from variable fonts using Rust/WASM.
 */

import { isVariableFont, cleanFontName } from "./fonts.js";

let wasmModule = null;
const fontInstanceMap = new Map(); // Maps "fontName|variableSettings" -> instancedFontName

/** Initialize WASM module */
async function initWasm() {
  if (wasmModule) return;

  try {
    const wasm = await import("../@rust/pkg/easyeyes_wasm.js");
    await wasm.default();
    wasmModule = wasm;
  } catch (error) {
    console.warn("WASM module unavailable:", error.message);
    wasmModule = {
      generate_static_font_instance: (fontData) => fontData,
    };
  }
}

/** Generate a unique font family name for an instanced font */
function generateInstancedFontName(baseFontName, variableSettings) {
  const cleaned = variableSettings.replace(/["']/g, "").trim();
  const parts = cleaned.split(",").map((p) => p.trim());

  const axisParts = [];
  for (const part of parts) {
    const tokens = part.split(/\s+/);
    if (tokens.length === 2) {
      const axis = tokens[0].trim();
      const value = Math.round(parseFloat(tokens[1].trim()));
      axisParts.push(`${axis}${value}`);
    }
  }

  // Create a shorter, more browser-friendly font name
  const shortBaseName = baseFontName.split(".")[0]; // Remove file extension if present
  const shortName = shortBaseName.includes("BitcountGridSingle")
    ? "BitcountGrid"
    : shortBaseName;

  return axisParts.length > 0
    ? `${shortName}-${axisParts.join("-")}`
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
 * @returns {{data: ArrayBuffer, format: string}|null}
 */
async function loadGoogleFontFile(fontName, variableSettings) {
  const encodedName = encodeURIComponent(fontName);
  // Convert settings to axis@value format for URL (e.g., "YEAR" 1980 -> YEAR@1980)
  const axisParam = variableSettings
    .replace(/["']/g, "")
    .trim()
    .replace(/\s+/, "@");
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodedName}:${axisParam}`;

  try {
    const cssResponse = await fetch(cssUrl);
    if (!cssResponse.ok) {
      console.warn(`[Google Font] Fetch failed: ${cssResponse.status}`);
      return null;
    }

    const cssText = await cssResponse.text();

    // Extract ALL font URLs (latin subset preferred)
    const latinMatch = cssText.match(
      /\/\* latin \*\/[^}]+url\(([^)]+)\)\s*format\(['"]woff2['"]\)/,
    );
    const anyWoff2Match = cssText.match(
      /url\(([^)]+)\)\s*format\(['"]woff2['"]\)/,
    );
    const anyWoffMatch = cssText.match(
      /url\(([^)]+)\)\s*format\(['"]woff['"]\)/,
    );

    let fontUrl = latinMatch?.[1] || anyWoff2Match?.[1] || anyWoffMatch?.[1];
    const format = latinMatch || anyWoff2Match ? "woff2" : "woff";

    if (!fontUrl) {
      console.warn(`!. [Google Font] No font URL in CSS`);
      return null;
    }

    fontUrl = fontUrl.replace(/['"]/g, "");
    const fontResponse = await fetch(fontUrl);
    if (!fontResponse.ok) return null;

    const data = await fontResponse.arrayBuffer();
    return { data, format };
  } catch (error) {
    console.warn(`!. [Google Font] Error: ${error.message}`);
    return null;
  }
}

/** Generate static font instance using WASM */
async function generateStaticInstance(fontData, variableSettings) {
  if (!wasmModule) await initWasm();

  const fontBytes = new Uint8Array(fontData);
  const result = wasmModule.generate_static_font_instance(
    fontBytes,
    variableSettings,
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
    console.warn(`Font "${fontFamilyName}" not available for rendering`);
  }

  return fontFace;
}

/** Generate static font instances for all collected variations */
export async function generateFontInstances(variations) {
  if (!variations?.length) return;

  let successCount = 0;
  const totalStart = performance.now();

  for (const variation of variations) {
    const {
      fontName,
      originalFontName,
      variableSettings,
      fontPath,
      fontSource,
    } = variation;
    const instanceStart = performance.now();

    try {
      let fontData, format;
      const instancedFontName = generateInstancedFontName(
        fontName,
        variableSettings,
      );

      if (fontSource === "google") {
        // Google Fonts: fetch variable font, then instance with WASM
        if (!wasmModule) await initWasm();
        const result = await loadGoogleFontFile(fontName, variableSettings);
        if (!result) continue;
        const instanceData = await generateStaticInstance(
          result.data,
          variableSettings,
        );
        await registerFontFace(instancedFontName, instanceData, result.format);
      } else if (fontSource === "file") {
        // File fonts: use WASM to instance locally
        if (!wasmModule) await initWasm();
        fontData = await loadFontFile(fontPath);
        format = originalFontName.split(".").pop() || "woff2";
        const instanceData = await generateStaticInstance(
          fontData,
          variableSettings,
        );
        await registerFontFace(instancedFontName, instanceData, format);
      }

      fontInstanceMap.set(`${fontName}|${variableSettings}`, instancedFontName);
      successCount++;

      const elapsed = (performance.now() - instanceStart).toFixed(1);
      console.log(`⏱ Font instanced: "${instancedFontName}" in ${elapsed} ms`);
    } catch (error) {
      console.error(`Font instance failed for ${fontName}:`, error.message);
    }
  }

  const totalElapsed = (performance.now() - totalStart).toFixed(1);
  console.log(
    `⏱ Font instancing complete: ${successCount} fonts in ${totalElapsed} ms`,
  );

  return successCount;
}

/**
 * Collect all variable font variations from the parameter reader
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
    const fontSources = reader.read("fontSource", blockIndex);
    const fontNames = reader.read("font", blockIndex);
    const variableSettingsArray = reader.read(
      "fontVariableSettings",
      blockIndex,
    );

    for (
      let conditionIndex = 0;
      conditionIndex < conditionEnabledBools.length;
      conditionIndex++
    ) {
      const conditionEnabledBool = conditionEnabledBools[conditionIndex];
      const fontSource = fontSources[conditionIndex];
      const fontName = fontNames[conditionIndex];
      const variableSettings = variableSettingsArray[conditionIndex] || "";

      if (!conditionEnabledBool) continue;

      if (
        (fontSource === "file" || fontSource === "google") &&
        variableSettings.trim()
      ) {
        const fontPath = fontSource === "file" ? `fonts/${fontName}` : null;

        variations.push({
          fontName: cleanFontName(fontName),
          originalFontName: fontName,
          variableSettings: variableSettings.trim(),
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

export function getInstancedFontName(fontName, variableSettings) {
  if (!variableSettings?.trim()) return null;
  const key = `${fontName}|${variableSettings.trim()}`;
  const result = fontInstanceMap.get(key);
  console.log(
    `!. [Lookup] key="${key}" → ${result ? `"${result}"` : "NOT FOUND"}`,
  );
  if (!result && fontInstanceMap.size > 0) {
    console.log(
      `!. [Lookup] Available keys:`,
      Array.from(fontInstanceMap.keys()),
    );
  }
  return result || null;
}
