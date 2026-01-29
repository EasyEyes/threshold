/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
import { writeFile, existsSync, readFileSync } from "fs";
import { utils } from "xlsx";
import { Auth, sheets_v4 } from "googleapis";
import { promises as dnsPromises } from "dns";
import { cwd } from "process";

const CONFIG = {
  spreadsheetId: "1UFfNikfLuo8bSromE34uWDuJrMPFiJG3VpoQKdCGkII",
  credentialPath: `${cwd()}/server/credentials.json`,
  outputPath: `${cwd()}/components/i18n.js`,
  maxRetries: 7,
  sheetRange: "Translations",
  loadingPlaceholder: "Loading...",
  badValueFromTranslatingEmptyString: "#VALUE!",
  phraseKeyPrefixes: ["T_", "EE_", "RC_"],
  baseRetryDelay: 1.5,
  maxRetryDelay: 10,
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

  async fetchLanguageSheetData() {
    try {
      const rows = await this.googleSheets.spreadsheets.values.get({
        auth: this.auth,
        spreadsheetId: this.config.spreadsheetId,
        range: this.config.sheetRange,
      });

      return utils.sheet_to_json(utils.aoa_to_sheet(rows.data.values), {
        defval: "",
      });
    } catch (error) {
      throw new Error(`Failed to fetch sheet data: ${error.message}`);
    }
  }

  processSheetData(rawData) {
    return rawData.reduce((acc, phrase) => {
      const { language, ...translations } = phrase;
      const source = translations["en"];
      const isEmptySource = source === "";

      if (this.isValidPhraseKey(language)) {
        const processed = Object.fromEntries(
          Object.entries(translations).map(([lang, text]) => [
            lang,
            (isEmptySource || text === this.config.badValueFromTranslatingEmptyString) ? "" : this.processTranslationText(text),
          ])
        );
        acc[language] = processed;
      }
      return acc;
    }, {});
  }

  isValidPhraseKey(key) {
    return this.config.phraseKeyPrefixes.some(prefix => key.includes(prefix));
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

  calculateRetryDelay(retryCount) {
    const exponentialDelay = this.config.baseRetryDelay * Math.pow(2, this.config.maxRetries - retryCount);
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

  async fetchWithRetries(existingData = {}, retries = this.config.maxRetries, fallbackData = null) {
    try {
      // Fetch new data from Google Sheets
      const rawData = await this.fetchLanguageSheetData();
      const processedData = this.processSheetData(rawData);
      const dataWithBadTranslations = await this.filterToGetPhrasesWithBadTranslations(processedData, fallbackData);
      const dataThatWasRecentlyChanged = await this.filterPhrasesByHasChangedSinceFallback(processedData, fallbackData);

      const relevant = (phrase) => phrase in dataThatWasRecentlyChanged || phrase in dataWithBadTranslations;
      const oldRelevantPhrases = Object.fromEntries(Object.entries(existingData).filter(([phrase]) => relevant(phrase)));
      const newRelevantPhrases = Object.fromEntries(Object.entries(processedData).filter(([phrase]) => relevant(phrase)));

      // If no phrases have changed, return the fallback data
      if (!Object.keys(dataThatWasRecentlyChanged).length && !Object.keys(dataWithBadTranslations).length) {
        console.log("No phrases have changed, returning fallback data.");
        return fallbackData;
      }

      // Merge with existing data
      let [mergedData, numUntranslatedPhrasesRemaining] = this.mergeTranslationData(
        oldRelevantPhrases,
        newRelevantPhrases
      );
      mergedData = Object.assign({}, fallbackData, mergedData);

      const cleanText = (obj) => {
        const cleaned = Array.isArray(obj) ? [] : {};

        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === "string") {
            // Remove line and paragraph separator characters
            cleaned[key] = value.replace(/[\u2028\u2029]/g, "");
          } else if (typeof value === "object" && value !== null) {
            // Recursively clean nested objects
            cleaned[key] = cleanText(value);
          } else {
            cleaned[key] = value;
          }
        }
      
        return cleaned;
      }

      mergedData = cleanText(mergedData);
      

      if (numUntranslatedPhrasesRemaining > 0) {
        if (retries > 0) {
          const delaySeconds = this.calculateRetryDelay(retries);
          console.log(
            `Remaining ${numUntranslatedPhrasesRemaining} phrases untranslated. ` +
            `Retrying in ${delaySeconds.toFixed(1)}s, ${retries - 1} retries remaining.`
          );
          
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
          return this.fetchWithRetries(mergedData, retries - 1, fallbackData);
        } else {
          console.error(
            `Failed to translate ${numUntranslatedPhrasesRemaining} phrases ` +
            `after ${this.config.maxRetries} retries.`
          );
          
          // TODO unnecessary, now that we include fallback in object.assign above?
          // Merge with fallback data if available
          if (fallbackData) {
            const [finalData] = this.mergeTranslationData(mergedData, fallbackData);
            return cleanText(finalData);
          }
        }
      }
      return mergedData;
    } catch (error) {
      if (retries > 0) {
        const delaySeconds = this.calculateRetryDelay(retries);
        console.log(
          `Fetch failed: ${error.message}. Retrying in ${delaySeconds.toFixed(1)}s, ` +
          `${retries - 1} retries remaining.`
        );
        
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        return this.fetchWithRetries(existingData, retries - 1, fallbackData);
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
    
    const oldTranslation = oldPhrases[phrase]["en"];
    const newTranslation = newPhrases[phrase]["en"];
    return oldTranslation !== newTranslation;
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
