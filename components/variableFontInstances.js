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
    const wasm = await import("../@rust/font-instancer/pkg/font_instancer.js");
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
 * Load Google Font file by directly fetching from Google Fonts API.
 * Cross-origin stylesheets block cssRules access, so we fetch the CSS ourselves.
 * @returns {{data: ArrayBuffer, format: string}|null}
 */
async function loadGoogleFontFile(fontName) {
  console.log(`[Google Font] Loading: "${fontName}"`);

  // Build Google Fonts CSS API URL with variable font axis range
  const encodedName = encodeURIComponent(fontName);
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodedName}:wght@100..900`;

  try {
    const cssResponse = await fetch(cssUrl);
    if (!cssResponse.ok) {
      console.warn(`[Google Font] CSS fetch failed: ${cssResponse.status}`);
      return null;
    }

    const cssText = await cssResponse.text();
    console.log(`[Google Font] Got CSS (${cssText.length} chars)`);

    // Extract font URL from CSS (prefer woff2)
    const woff2Match = cssText.match(/url\(([^)]+\.woff2[^)]*)\)/);
    const woffMatch = cssText.match(/url\(([^)]+\.woff[^)]*)\)/);
    const ttfMatch = cssText.match(/url\(([^)]+\.ttf[^)]*)\)/);

    let fontUrl = woff2Match?.[1] || woffMatch?.[1] || ttfMatch?.[1];
    let format = woff2Match ? "woff2" : woffMatch ? "woff" : "ttf";

    if (!fontUrl) {
      console.warn(`[Google Font] No font URL in CSS`);
      console.log(`[Google Font] CSS: ${cssText.substring(0, 300)}...`);
      return null;
    }

    // Clean URL (remove quotes)
    fontUrl = fontUrl.replace(/['"]/g, "");
    console.log(`[Google Font] URL: ${fontUrl.substring(0, 80)}...`);

    const fontResponse = await fetch(fontUrl);
    if (!fontResponse.ok) {
      console.warn(`[Google Font] Font fetch failed: ${fontResponse.status}`);
      return null;
    }

    const data = await fontResponse.arrayBuffer();
    console.log(
      `[Google Font] Loaded "${fontName}": ${data.byteLength} bytes (${format})`,
    );
    return { data, format };
  } catch (error) {
    console.warn(`[Google Font] Error: ${error.message}`);
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

  try {
    await initWasm();
  } catch (error) {
    console.error("WASM init failed:", error.message);
    return;
  }

  let successCount = 0;

  for (const variation of variations) {
    const {
      fontName,
      originalFontName,
      variableSettings,
      fontPath,
      fontSource,
    } = variation;

    try {
      let fontData;
      let format;

      if (fontSource === "file") {
        fontData = await loadFontFile(fontPath);
        format = originalFontName.split(".").pop() || "woff2";
      } else if (fontSource === "google") {
        const result = await loadGoogleFontFile(fontName);
        if (!result) {
          console.warn(`[Google Font] Skipping instancing for "${fontName}"`);
          continue;
        }
        fontData = result.data;
        format = result.format;
      }

      if (!fontData) continue;

      const instanceData = await generateStaticInstance(
        fontData,
        variableSettings,
      );
      const instancedFontName = generateInstancedFontName(
        fontName,
        variableSettings,
      );

      await registerFontFace(instancedFontName, instanceData, format);
      fontInstanceMap.set(`${fontName}|${variableSettings}`, instancedFontName);

      if (fontSource === "google") {
        console.log(`[Google Font] Instance created: "${instancedFontName}"`);
      }
      successCount++;
    } catch (error) {
      console.error(`Font instance failed for ${fontName}:`, error.message);
    }
  }

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

        if (fontSource === "google") {
          console.log(
            `[Google Font] Queued for instancing: "${fontName}" with "${variableSettings.trim()}"`,
          );
        }
      }
    }
  }

  return variations;
}

export function getInstancedFontName(fontName, variableSettings) {
  if (!variableSettings?.trim()) return null;
  const key = `${fontName}|${variableSettings.trim()}`;
  return fontInstanceMap.get(key) || null;
}
