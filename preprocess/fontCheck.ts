import {
  ERROR_CREATING_TYPEKIT_KIT,
  FONT_FILES_MISSING_WEB,
  GOOGLE_FONT_VARIABLE_SETTINGS_INVALID,
  TYPEKIT_FONT_ONLY_AVAILABLE_WITH_SUBSCRIPTION,
  TYPEKIT_FONTS_MISSING,
} from "./errorMessages";
import { GLOSSARY } from "../parameters/glossary";
import { typekit } from "./global";

/**
 * Standard OpenType variable font registered axes (lowercase).
 * These are the 5 registered axis tags defined in the OpenType specification.
 * All other axes (uppercase) are considered "unique" or custom axes.
 * Reference: https://learn.microsoft.com/en-us/typography/opentype/spec/dvaraxisreg
 */
const STANDARD_AXES = new Set([
  "wght", // Weight - controls thickness of characters (range: 1-1000, normal: 400)
  "wdth", // Width - adjusts horizontal scaling (range: 50%-200%, normal: 100%)
  "slnt", // Slant - specifies angle of oblique characters (range: -90° to +90°, normal: 0°)
  "ital", // Italic - varies between non-italic and italic (range: 0-1, normal: 0)
  "opsz", // Optical Size - optimizes for different text sizes (range: >0, normal: font-specific)
]);

/**
 * Parse fontVariableSettings string into axis-value pairs.
 * Shared utility used by both Google Font and file-based font validation.
 * @param settings - The fontVariableSettings string (e.g., '"wght" 625, "wdth" 100')
 * @returns Array of {axis, value} objects
 */
export const parseFontVariableSettings = (
  settings: string,
): { axis: string; value: number }[] => {
  if (!settings || typeof settings !== "string") return [];

  const cleaned = settings.replace(/["']/g, "").trim();
  if (!cleaned) return [];

  const parts = cleaned.split(",").map((p) => p.trim());
  const result: { axis: string; value: number }[] = [];

  for (const part of parts) {
    const tokens = part.split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length === 2) {
      const axis = tokens[0].trim();
      const value = parseFloat(tokens[1].trim());
      if (axis.length === 4 && !isNaN(value)) {
        result.push({ axis, value });
      }
    }
  }

  return result;
};

/**
 * Check if an axis name is a custom (non-standard) axis
 * @param axis - The axis name (4 characters)
 * @returns true if it's a custom axis, false if standard
 */
function isCustomAxis(axis: string): boolean {
  if (axis.length !== 4) return false;
  return !STANDARD_AXES.has(axis.toLowerCase());
}

/**
 * Extract axis names from fontVariableSettings string
 * @param settings - The fontVariableSettings string
 * @returns Array of axis names found in the settings
 */
function extractAxisNames(settings: string): string[] {
  return parseFontVariableSettings(settings).map((p) => p.axis);
}

/**
 * Convert fontVariableSettings string to Google Fonts API format.
 * Converts "wght" 625, "slnt" -2.3 to wght@625;slnt@-2.3
 * Preserves the case of axis names as provided by the user.
 * @param settings - The fontVariableSettings string (e.g., '"wght" 625, "slnt" -2.3')
 * @returns Formatted string for Google Fonts API (e.g., 'wght@625;slnt@-2.3')
 */
function convertSettingsToGoogleFontsFormat(settings: string): string {
  const parsed = parseFontVariableSettings(settings);
  return parsed.map((p) => `${p.axis}@${p.value}`).join(";");
}

/**
 * Check if fetch is available in the current environment
 * @returns true if fetch is available, false otherwise
 */
function isFetchAvailable(): boolean {
  return typeof fetch !== "undefined";
}

/**
 * Check if CSS text contains font URLs (woff/woff2)
 * @param cssText - The CSS text to check
 * @returns true if font URLs are present, false otherwise
 */
function cssContainsFontUrls(cssText: string): boolean {
  return (
    cssText.includes("url(") &&
    (cssText.includes("woff2") || cssText.includes("woff"))
  );
}

/**
 * Add a condition index to the conditionsByFontAndSettings map
 * @param conditionsByFontAndSettings - Map to add to
 * @param fontName - Font name
 * @param settings - Settings string
 * @param conditionIndex - Condition index to add
 */
function addConditionToMap(
  conditionsByFontAndSettings: Map<
    string,
    { settings: string; conditionIndices: number[] }
  >,
  fontName: string,
  settings: string,
  conditionIndex: number,
): void {
  const key = `${fontName}|${settings}`;
  const existing = conditionsByFontAndSettings.get(key);
  if (existing) {
    existing.conditionIndices.push(conditionIndex);
  } else {
    conditionsByFontAndSettings.set(key, {
      settings,
      conditionIndices: [conditionIndex],
    });
  }
}

/**
 * Validate Google font variable settings by checking if axis@value is accepted by Google Fonts API.
 */
export const validateGoogleFontVariableSettings = async (
  parsed: any,
): Promise<any[]> => {
  const errors: any[] = [];

  let fontRow: string[] = [];
  let fontSourceRow: string[] = [];
  let variableSettingsRow: string[] = [];

  for (const row of parsed.data) {
    if (row[0] === "font") fontRow = row;
    else if (row[0] === "fontSource") fontSourceRow = row;
    else if (row[0] === "fontVariableSettings") variableSettingsRow = row;
  }

  if (!variableSettingsRow.length) return [];

  const defaultFontSource =
    (GLOSSARY["fontSource"]?.default as string) || "google";

  // Group conditions by font name and settings combination
  const conditionsByFontAndSettings = new Map<
    string,
    { settings: string; conditionIndices: number[] }
  >();

  for (
    let i = 2;
    i < Math.max(fontRow.length, variableSettingsRow.length);
    i++
  ) {
    const fontSource = fontSourceRow[i]?.trim() || defaultFontSource;
    const fontName = fontRow[i]?.trim();
    const settings = variableSettingsRow[i]?.trim();

    if (fontSource !== "google" || !fontName || !settings) continue;

    // Check if fetch is available (may not be in older Node.js versions)
    if (!isFetchAvailable()) {
      continue;
    }

    // Convert settings to Google Fonts API format (e.g., "wght" 625, "slnt" -2.3 -> wght@625;slnt@-2.3)
    const axisParam = convertSettingsToGoogleFontsFormat(settings);
    if (!axisParam) {
      continue;
    }

    const encodedName = encodeURIComponent(fontName);
    const url = `https://fonts.googleapis.com/css2?family=${encodedName}:${axisParam}`;

    const conditionIndex = i - 2;
    let response: Response | null = null;
    let status: number | null = null;

    try {
      response = await fetch(url);
      status = response.status;

      // Validated successfully (silent)
    } catch (error) {
      // Fetch failed - could be network error or CORS blocking the request entirely
      // When CORS blocks, the browser console may show a status code (like 400),
      // but JavaScript can't access it because the fetch promise rejects
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isCorsError =
        errorMessage.includes("CORS") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError");

      if (isCorsError) {
        // CORS blocked the request - we can't access the status code programmatically
        // However, if the browser console shows status 400/404, it's likely invalid
        // Since we can't reliably detect this, we'll treat CORS errors as potentially invalid
        // and add them to the error list (user can see the actual status in browser console)
        // Add to errors - the browser console will show the actual status
        // If it's 400/404, this is correct; if it's 200, user will see the error but can check console
        addConditionToMap(
          conditionsByFontAndSettings,
          fontName,
          settings,
          conditionIndex,
        );
      } else {
        // Other network errors - log but don't treat as validation errors
      }
      continue; // Skip to next iteration
    }

    // If we got here, we have a response object
    if (!response || status === null) {
      continue; // Shouldn't happen, but safety check
    }

    // Check status code first - if it's 400/404, likely invalid settings
    // We check the body to handle false positives, but if CORS blocks body access,
    // we can still use the status code as an indicator
    if (status === 400 || status === 404) {
      // Try to read the response body to check for false positives
      // (sometimes API returns 400 but CSS is still valid)
      try {
        const cssText = await response.text();
        const hasFontUrl = cssContainsFontUrls(cssText);

        // CSS content check (silent)

        if (!hasFontUrl) {
          // 400/404 and no font URLs - invalid settings
          addConditionToMap(
            conditionsByFontAndSettings,
            fontName,
            settings,
            conditionIndex,
          );
        } else {
          // 400/404 but CSS contains font URLs - false positive, settings are valid
        }
      } catch (parseError) {
        // Can't read response body (likely CORS error)
        // If status is 400/404 and we can't read the body, treat as invalid
        // This handles the case where CORS blocks body access but status indicates error
        const errorMsg =
          parseError instanceof Error ? parseError.message : String(parseError);
        addConditionToMap(
          conditionsByFontAndSettings,
          fontName,
          settings,
          conditionIndex,
        );
      }
    } else if (response.ok) {
      // Status 200 - check CSS content to verify it contains font URLs
      try {
        const cssText = await response.text();

        // CSS content check (silent)

        // If CSS is completely empty, this might be an API issue rather than invalid settings
        // Some Google Fonts API responses may be empty for valid custom axes
        // Check if CSS has content before validating
        if (cssText.length === 0) {
          // Empty CSS with status 200 - could be valid but API returned empty response
          // Log warning but don't treat as invalid (may be API quirk with custom axes)
          // Don't add error - empty CSS with 200 might be valid for custom axes
        } else {
          const hasFontUrl = cssContainsFontUrls(cssText);

          if (!hasFontUrl) {
            // Status 200 but no font URLs in non-empty CSS - invalid settings
            addConditionToMap(
              conditionsByFontAndSettings,
              fontName,
              settings,
              conditionIndex,
            );
          } else {
            // Status 200 and CSS contains font URLs - settings are valid
          }
        }
      } catch (parseError) {
        // Can't parse response, treat as invalid
        const errorMsg =
          parseError instanceof Error ? parseError.message : String(parseError);
        addConditionToMap(
          conditionsByFontAndSettings,
          fontName,
          settings,
          conditionIndex,
        );
      }
    } else {
      // Other HTTP errors - don't treat as validation errors
    }
  }

  // Create one error per font/settings combination
  for (const [
    key,
    { settings, conditionIndices },
  ] of conditionsByFontAndSettings) {
    const fontName = key.split("|")[0];
    // Check if settings contain lowercase custom axes that might need to be uppercase
    const axes = extractAxisNames(settings);
    const hasLowercaseCustomAxis = axes.some(
      (axis) => isCustomAxis(axis) && axis === axis.toLowerCase(),
    );
    errors.push(
      GOOGLE_FONT_VARIABLE_SETTINGS_INVALID(
        fontName,
        settings,
        conditionIndices,
        hasLowercaseCustomAxis,
      ),
    );
  }

  return errors;
};

export const webFontChecker = async (
  requestedFontListWeb: string[],
): Promise<any[]> => {
  const errorList: any[] = [];
  for (let i = 0; i < requestedFontListWeb.length; i++) {
    const response = await fetchWebFont(
      requestedFontListWeb[i].replace(/\s/g, "+").replace(/(\r\n|\n|\r)/gm, ""),
    );
    if (!response) {
      errorList.push(requestedFontListWeb[i]);
    }
  }

  if (errorList.length > 0) return [FONT_FILES_MISSING_WEB("font", errorList)];
  else return errorList;
};

const fetchWebFont = async (font: string) => {
  const url = `https://fonts.googleapis.com/css?family=${font}`;
  return await fetch(url)
    .then((response) => {
      return true;
    })
    .catch((error) => {
      return false;
    });
};
const createNewKit = async (
  requestedTypekitFonts: string[],
  missingFontList: Record<string, { columns: string[]; blocks: number[] }>,
  experimentName: string,
): Promise<[boolean, string[]]> => {
  // https://typekit.com/api/v1/json/kits?name=Example&domains=*
  // kit name will be the experimentName + timestamp
  //available fonts: find fonts that are in requestedTypekitFonts but not in missingFontList
  const availableFonts = requestedTypekitFonts.filter(
    (font) => !missingFontList[font],
  );
  const fontsWithErrors: string[] = [];
  const kitName = `${experimentName}-${Date.now()}`;
  try {
    const domains = ["localhost", "run.pavlovia.org"];
    // post request to create a new kit
    const response = await fetch(
      `https://easyeyes-cors-proxy-1cf4742aef20.herokuapp.com/https://typekit.com/api/v1/json/kits?name=${kitName}&domains=${domains.join(
        ",",
      )}`,
      {
        method: "POST",
        headers: {
          usetypekittoken: "true",
        },
      },
    ).then((response) => {
      return response.json();
    });

    if (response.kit) {
      // read "kit" from response. Read "id" from "kit"
      const kit = response.kit;
      const kitId = kit.id;
      typekit.kitId = kitId;

      // create a new font family for each font in requestedTypekitFonts
      // https://typekit.com/api/v1/json/kits/:kitID/families/:familyID
      for (let i = 0; i < availableFonts.length; i++) {
        const fontFamily = availableFonts[i];
        const response = await fetch(
          `https://easyeyes-cors-proxy-1cf4742aef20.herokuapp.com/https://typekit.com/api/v1/json/kits/${kitId}/families/${fontFamily}`,
          {
            method: "POST",
            headers: {
              usetypekittoken: "true",
            },
          },
        ).then((response) => {
          return response.json();
        });
        if (response.errors) {
          fontsWithErrors.push(fontFamily);
          continue;
        }
        // save css_names from response.family
        typekit.fonts.set(fontFamily, response.family.css_names[0]);
      }
      if (fontsWithErrors.length > 0) {
        //delete the kit
        await deleteKit(kitId);
        return [false, fontsWithErrors];
      }
      //publish the kit at kits/:kit/publish
      const publishResponse = await fetch(
        `https://easyeyes-cors-proxy-1cf4742aef20.herokuapp.com/https://typekit.com/api/v1/json/kits/${kitId}/publish`,
        {
          method: "POST",
          headers: {
            usetypekittoken: "true",
          },
        },
      )
        .then((response) => {
          return response.json();
        })
        .catch((error) => {
          console.log("error when publishing kit", error);
          return false;
        });
      if (!publishResponse) {
        await deleteKit(kitId);
        return [false, fontsWithErrors];
      }
      return [true, fontsWithErrors];
    } else return [false, fontsWithErrors];
  } catch (error) {
    return [false, fontsWithErrors];
  }
};

const doesTypeKitFontFamilyExist = async (
  fontFamily: string,
): Promise<boolean> => {
  //https://typekit.com/api/v1/json/families/:familyID
  // if 404 return false
  // if 200 return true

  try {
    const response = await fetch(
      `https://easyeyes-cors-proxy-1cf4742aef20.herokuapp.com/https://typekit.com/api/v1/json/families/${fontFamily}`,
      {
        headers: {
          usetypekittoken: "true",
        },
      },
    );

    return response.status === 200;
  } catch (error) {
    return false;
  }
};

const deleteKit = async (kitId: string) => {
  try {
    const response = await fetch(
      `https://easyeyes-cors-proxy-1cf4742aef20.herokuapp.com/https://typekit.com/api/v1/json/kits/${kitId}`,
      {
        method: "DELETE",
        headers: {
          usetypekittoken: "true",
        },
      },
    );
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

export const processTypekitFonts = async (
  requestedTypekitFonts: string[],
  typekitFontColumnMap: Record<string, { columns: string[]; blocks: number[] }>,
  experimentName: string,
): Promise<any[]> => {
  const missingFontList: Record<
    string,
    { columns: string[]; blocks: number[] }
  > = {};
  if (requestedTypekitFonts.length === 0) return [];
  for (let i = 0; i < requestedTypekitFonts.length; i++) {
    const fontFamily = requestedTypekitFonts[i];
    const doesFontFamilyExistBool =
      await doesTypeKitFontFamilyExist(fontFamily);
    if (!doesFontFamilyExistBool) {
      missingFontList[fontFamily] = {
        columns: typekitFontColumnMap[fontFamily].columns,
        blocks: typekitFontColumnMap[fontFamily].blocks,
      };
    }
  }

  if (Object.keys(missingFontList).length === requestedTypekitFonts.length) {
    return [TYPEKIT_FONTS_MISSING("font", missingFontList)];
  } else {
    const [createNewKitBool, fontsWithErrors] = await createNewKit(
      requestedTypekitFonts,
      missingFontList,
      experimentName,
    );
    if (fontsWithErrors.length > 0) {
      const fontList: Record<string, { columns: string[]; blocks: number[] }> =
        {};
      for (let i = 0; i < fontsWithErrors.length; i++) {
        fontList[fontsWithErrors[i]] = {
          columns: typekitFontColumnMap[fontsWithErrors[i]].columns,
          blocks: typekitFontColumnMap[fontsWithErrors[i]].blocks,
        };
      }
      if (Object.keys(missingFontList).length > 0) {
        const missingFontErrors = TYPEKIT_FONTS_MISSING(
          "font",
          missingFontList,
        );
        const fontWithErrors = TYPEKIT_FONT_ONLY_AVAILABLE_WITH_SUBSCRIPTION(
          "font",
          fontList,
        );
        return [missingFontErrors, fontWithErrors];
      }
      return [TYPEKIT_FONT_ONLY_AVAILABLE_WITH_SUBSCRIPTION("font", fontList)];
    } else if (Object.keys(missingFontList).length > 0) {
      return [TYPEKIT_FONTS_MISSING("font", missingFontList)];
    }
    if (!createNewKitBool) return [ERROR_CREATING_TYPEKIT_KIT()];
    return [];
  }
};
