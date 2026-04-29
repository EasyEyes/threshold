/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
import { writeFile, existsSync, readFileSync } from "fs";
import { Auth, sheets_v4 } from "googleapis";
import { promises as dnsPromises } from "dns";
import { cwd } from "process";

const CONFIG = {
  spreadsheetId: "1UFfNikfLuo8bSromE34uWDuJrMPFiJG3VpoQKdCGkII",
  credentialPath: `${cwd()}/server/credentials.json`,
  outputPath: `${cwd()}/components/i18n.js`,
  maxRetries: 9,
  sheetRange: "Translations",
  loadingPlaceholder: "Loading...",
  badValueFromTranslatingEmptyString: "#VALUE!",
  phraseKeyPrefixes: ["T_", "EE_", "RC_"],
  baseRetryDelay: 1.5,
  maxRetryDelay: 15,
  targetedFetchThreshold: 50,  // only active in late stages, when few phrases remain
};

class TranslationFetcher {
   constructor(config = CONFIG) {
    this.config = { ...CONFIG, ...config };
    this.auth = new Auth.GoogleAuth({
      keyFile: this.config.credentialPath,
      scopes: "https://www.googleapis.com/auth/spreadsheets",
    });
    this.googleSheets = new sheets_v4.Sheets();
    // Use prexisting (hopefully validly-translated) phrases as a fallback
    this.fallbackData = this.loadFallbackData(); // To be used if we retry all the way to the end,
                                                 // and still have untranslated phrases
  }

  rawRowsToJSON(rawRows) {
    if (!rawRows || rawRows.length < 2) return [];
    const headers = rawRows[0];
    return rawRows.slice(1).map((row, i) => {
      const obj = { _rowIndex: i + 2 };
      headers.forEach((h, col) => { obj[h] = row[col] ?? ""; });
      return obj;
    });
  }

  async fetchTargetedRows(rowIndices) {
    const name = this.config.sheetRange;
    const ranges = [`${name}!1:1`, ...rowIndices.map(r => `${name}!${r}:${r}`)];
    const result = await this.googleSheets.spreadsheets.values.batchGet({
      auth: this.auth,
      spreadsheetId: this.config.spreadsheetId,
      ranges,
    });
    const vrs = result.data.valueRanges;
    const headers = vrs[0]?.values?.[0] ?? [];
    return vrs.slice(1).map((vr, i) => {
      const row = vr?.values?.[0] ?? [];
      const obj = { _rowIndex: rowIndices[i] };
      headers.forEach((h, col) => { obj[h] = row[col] ?? ""; });
      return obj;
    });
  }

  async fetchLanguageSheetData(rowIndices = null) {
    try {
      if (rowIndices !== null) {
        try {
          return await this.fetchTargetedRows(rowIndices);
        } catch (error) {
          throw new Error(`Failed to fetch targeted rows: ${error.message}`);
        }
      }
      const rows = await this.googleSheets.spreadsheets.values.get({
        auth: this.auth,
        spreadsheetId: this.config.spreadsheetId,
        range: this.config.sheetRange,
      });
      return this.rawRowsToJSON(rows.data.values);
    } catch (error) {
      throw new Error(`Failed to fetch sheet data: ${error.message}`);
    }
  }

  processSheetData(rawData) {
    const phrases = {}, phraseRowIndex = {};
    for (const row of rawData) {
      const { language, _rowIndex, ...translations } = row;
      if (!this.isValidPhraseKey(language)) continue;
      const isEmptySource = translations["en"] === "";
      phrases[language] = Object.fromEntries(
        Object.entries(translations).map(([lang, text]) => [
          lang,
          (isEmptySource || text === this.config.badValueFromTranslatingEmptyString)
            ? "" : this.processTranslationText(text),
        ])
      );
      if (_rowIndex !== undefined) phraseRowIndex[language] = _rowIndex;
    }
    return { phrases, phraseRowIndex };
  }

  isValidPhraseKey(key) {
    return typeof key === "string" && this.config.phraseKeyPrefixes.some(prefix => key.includes(prefix));
  }

  processTranslationText(text) {
    return text.includes("XX")
      ? text.replace(/XXX/g, "xxx").replace(/XX/g, "xx")
      : text;
  }

  mergeTranslationData(existingData = {}, newData = {}) {
    if (typeof existingData !== 'object' || typeof newData !== 'object') {
      throw new Error('Invalid input: both parameters must be objects');
    }

    let numUntranslatedPhrasesRemaining = 0;
    const mergedData = { ...existingData };

    for (const [phrase, translations] of Object.entries(newData)) {
      if (!translations || typeof translations !== 'object') continue;
      
      if (!mergedData[phrase]) {
        mergedData[phrase] = translations;
      }

      for (const [lang, text] of Object.entries(translations)) {
        if (text === this.config.badValueFromTranslatingEmptyString) {
          mergedData[phrase][lang] = "";
          continue;
        }
        const existingTranslation = mergedData[phrase][lang];
        const isTranslationAlreadyKnown =
          existingTranslation && existingTranslation !== this.config.loadingPlaceholder;
        const isNewTranslationBogus = text === this.config.loadingPlaceholder;
        
        if (!isTranslationAlreadyKnown && isNewTranslationBogus) {
          numUntranslatedPhrasesRemaining++;
        }
        
        if (isTranslationAlreadyKnown || isNewTranslationBogus) continue;
        
        mergedData[phrase][lang] = text;
      }
    }

    return [mergedData, numUntranslatedPhrasesRemaining];
  }

  parsePhrasesFile(fileContent) {
    try {
      // Extract the object from "export const phrases = {...};"
      // The file uses JS object syntax (unquoted keys) due to prettier formatting,
      // so we need to evaluate it as JavaScript, not parse as JSON
      const match = fileContent.match(/export\s+const\s+phrases\s*=\s*(\{[\s\S]*\});?\s*$/);
      if (!match) {
        throw new Error("Could not find 'export const phrases' in file");
      }
      // Use Function constructor to safely evaluate the JS object literal
      // This is safe because we control the file content
      const fn = new Function(`return ${match[1]}`);
      return fn();
    } catch (error) {
      console.error(`Error parsing phrases file:`, error.message);
      throw error;
    }
  }

  loadFallbackData() {
    try {
      const fileContent = readFileSync(this.config.outputPath, "utf8");
      const data = this.parsePhrasesFile(fileContent);
      if (!Object.keys(data).length) throw new Error("TranslationFetcher::loadFallbackData::Fallback data is empty.");
      return data;
    } catch (error) {
      console.warn("Unsuccessful loading fallback data:", error.message);
      return null;
    }
  }

  progressBar(done, total, width = 20) {
    const pct = total > 0 ? done / total : 1;
    const filled = Math.min(width, Math.max(0, Math.round(pct * width)));
    return `[${"█".repeat(filled)}${"░".repeat(width - filled)}] ${Math.round(pct * 100)}%`;
  }

  cleanText(obj) {
    const cleaned = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        cleaned[key] = value.replace(/[\u2028\u2029]/g, "");
      } else if (typeof value === "object" && value !== null) {
        cleaned[key] = this.cleanText(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  calculateRetryDelay(retryCount) {
    const exponentialDelay = this.config.baseRetryDelay * Math.pow(1.5, this.config.maxRetries - retryCount);
    const jitter = Math.random() * 2;
    return Math.min(exponentialDelay + jitter, this.config.maxRetryDelay);
  }

  async filterToGetPhrasesWithBadTranslations(newPhrases, fallbackPhrases) {
    if (!newPhrases || !fallbackPhrases) return Object.assign({}, fallbackPhrases, newPhrases);
    const hasABadTranslation = (phraseObject) => {
      if (!phraseObject || typeof phraseObject !== 'object') return false;
      return Object.values(phraseObject).some(text => text === this.config.loadingPlaceholder);
    };
    return Object.fromEntries(Object.entries(newPhrases).filter(([phrase, translations]) => {
      const newHasBad = hasABadTranslation(translations);
      const fallbackHasBad = fallbackPhrases[phrase] ? hasABadTranslation(fallbackPhrases[phrase]) : false;
      return newHasBad || fallbackHasBad;
    }));
  }
  async filterPhrasesByHasChangedSinceFallback(phrases, fallbackPhrases) {
    if (!fallbackPhrases || !phrases) return phrases;
    const allPhraseNames = Object.keys(phrases);
    const phrasesThatHaveChanged = allPhraseNames.filter((phrase) => this.hasPhraseChangedSinceFallback(phrase, phrases, fallbackPhrases));
    const filteredPhrases = Object.fromEntries(Object.entries(phrases).filter(([phrase]) => phrasesThatHaveChanged.includes(phrase)));
    return filteredPhrases;
  }

  async fetchWithRetries(
    existingData = {},
    retries = this.config.maxRetries,
    fallbackData = null,
    phraseRowIndex = {},
    rowIndicesToFetch = null,
    initialLoadingCells = null
  ) {
    try {
      // Fetch new data from Google Sheets
      const rawData = await this.fetchLanguageSheetData(rowIndicesToFetch);
      const { phrases: processedData, phraseRowIndex: newRowIndex } = this.processSheetData(rawData);
      const mergedPhraseRowIndex = { ...phraseRowIndex, ...newRowIndex };

      const dataWithBadTranslations = await this.filterToGetPhrasesWithBadTranslations(processedData, fallbackData);
      const dataThatWasRecentlyChanged = await this.filterPhrasesByHasChangedSinceFallback(processedData, fallbackData);

      const relevant = (phrase) => phrase in dataThatWasRecentlyChanged || phrase in dataWithBadTranslations;
      const oldRelevantPhrases = Object.fromEntries(Object.entries(existingData).filter(([phrase]) => relevant(phrase)));
      const newRelevantPhrases = Object.fromEntries(Object.entries(processedData).filter(([phrase]) => relevant(phrase)));

      // If no phrases have changed, return the fallback data
      if (!Object.keys(dataThatWasRecentlyChanged).length && !Object.keys(dataWithBadTranslations).length) {
        console.log("✓ All phrases are up to date.");
        return fallbackData;
      }

      // Merge with existing data
      let [mergedData, numUntranslatedPhrasesRemaining] = this.mergeTranslationData(
        oldRelevantPhrases,
        newRelevantPhrases
      );
      mergedData = Object.assign({}, fallbackData, mergedData);
      mergedData = this.cleanText(mergedData);

      if (numUntranslatedPhrasesRemaining > 0) {
        const total = Object.keys(mergedData).length;
        const pendingPhraseKeys = Object.entries(mergedData)
          .filter(([, t]) => Object.values(t).some(v => v === this.config.loadingPlaceholder))
          .map(([key]) => key);
        const pendingCount = pendingPhraseKeys.length;

        // Count loading cells (phrase × language pairs) for accurate progress.
        // Phrase count is a "last-mile" metric — a phrase stays pending until its
        // final language resolves, so it barely moves until the very end.
        const loadingCells = pendingPhraseKeys.reduce(
          (sum, k) => sum + Object.values(mergedData[k]).filter(v => v === this.config.loadingPlaceholder).length, 0
        );
        const cellBaseline = initialLoadingCells ?? loadingCells;

        if (retries > 0) {
          const pendingRowIndices = pendingPhraseKeys
            .map(key => mergedPhraseRowIndex[key])
            .filter(idx => idx !== undefined);

          const nextRowIndices =
            pendingRowIndices.length > 0 &&
            pendingRowIndices.length <= this.config.targetedFetchThreshold
              ? pendingRowIndices
              : null;

          const delaySeconds = this.calculateRetryDelay(retries);
          const bar = this.progressBar(cellBaseline - loadingCells, cellBaseline);
          console.log(
            `  ${bar} — ${loadingCells} cells / ${pendingCount} phrases still loading. ` +
            `Retrying in ${delaySeconds.toFixed(1)}s (${retries - 1} left).`
          );

          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
          return this.fetchWithRetries(mergedData, retries - 1, fallbackData, mergedPhraseRowIndex, nextRowIndices, cellBaseline);
        } else {
          const pct = Math.round(((cellBaseline - loadingCells) / Math.max(cellBaseline, 1)) * 100);
          console.error(
            `✗ ${loadingCells} cells / ${pendingCount} of ${total} phrases still loading after ${this.config.maxRetries} retries (${pct}% translated).`
          );

          // TODO unnecessary, now that we include fallback in object.assign above?
          // Merge with fallback data if available
          if (fallbackData) {
            const [finalData] = this.mergeTranslationData(mergedData, fallbackData);
            return this.cleanText(finalData);
          }
        }
      }
      return mergedData;
    } catch (error) {
      if (retries > 0) {
        const delaySeconds = this.calculateRetryDelay(retries);
        console.log(
          `Fetch failed: ${error.message}. Retrying in ${delaySeconds.toFixed(1)}s (${retries - 1} left).`
        );

        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        return this.fetchWithRetries(existingData, retries - 1, fallbackData, phraseRowIndex, null, initialLoadingCells);
      } else {
        throw new Error(`Failed after ${this.config.maxRetries} retries: ${error.message}`);
      }
    }
  }

  generateOutputFile(data) {
    const exportWarning = `/*
  Do not modify this file! Run \`npm run phrases\` at ROOT of this project to fetch from the Google Sheets.
  Phrases should be read using the "readi18nPhrases" function from "components/readPhrases", to prevent silent breaking errors.
  https://docs.google.com/spreadsheets/d/${this.config.spreadsheetId}/edit#gid=0
*/\n\n`;
    const exportHandle = `export const phrases = `;
    return exportWarning + exportHandle + JSON.stringify(data) + ";\n";
  }

  async writeOutput(data) {
    return new Promise((resolve, reject) => {
      const content = this.generateOutputFile(data);
      
      writeFile(this.config.outputPath, content, (error) => {
        if (error) {
          reject(new Error(`Couldn't write to file: ${error.message}`));
        } else {
          console.log("EasyEyes International Phrases fetched and written successfully.");
          resolve();
        }
      });
    });
  }

  async process() {
    try {
      console.log("Fetching up-to-date phrases ...");
      const fallbackData = await this.fallbackData;
      const data = await this.fetchWithRetries({}, this.config.maxRetries, fallbackData);
      await this.writeOutput(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch phrases:", error.message);
      throw error;
    }
  }
   
  /** 
   * Translating phrases is costly and slow. If the text of a phrase 
   * (ie in English) has not changed (ie pre-existing components/i18n.js 
   * text is the same as the fresh data) then we don't need to
   * wait around until we get (a redundent) translation.
  */
  hasPhraseChangedSinceFallback(phrase, newPhrases, oldPhrases) {
    if (!oldPhrases || !newPhrases) {
      console.warn("oldPhrases or newPhrases is undefined", typeof oldPhrases, typeof newPhrases);
      return true;
    }
    const phraseAdded = !(phrase in oldPhrases) && (phrase in newPhrases);
    const phraseRemoved = (phrase in oldPhrases) && !(phrase in newPhrases);
    if (phraseAdded || phraseRemoved) return true;

    const oldEn = oldPhrases[phrase]["en"];
    const newEn = newPhrases[phrase]["en"];
    if (oldEn !== newEn) return true;

    // Check if any non-English language has a resolved (non-Loading...) value
    // that differs from fallback. This catches hand-translated corrections
    // even when English hasn't changed.
    const newTranslations = newPhrases[phrase];
    for (const lang of Object.keys(newTranslations)) {
      if (lang === "en") continue;
      const newText = newTranslations[lang];
      if (newText === this.config.loadingPlaceholder) continue; // unresolved formula — skip
      const oldText = oldPhrases[phrase]?.[lang];
      if (newText !== oldText) return true; // real value changed
    }

    return false;
  }
}

// Check internet connectivity and credentials, then run
async function main() {
  try {
    await dnsPromises.resolve("www.google.com", "A");
    
    if (!existsSync(CONFIG.credentialPath)) {
      console.error("Failed to fetch PHRASES. No credentials.json found.");
      process.exit(1);
    }
    
    const fetcher = new TranslationFetcher();
    await fetcher.process();
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      console.error("No Internet connection. Skipping phrase fetching.");
    } else {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

// Only run if this file is executed directly
await main();

export { TranslationFetcher, CONFIG };
