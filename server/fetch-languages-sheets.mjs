/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
import { writeFile, existsSync } from "fs";
import { utils } from "xlsx";
import { Auth, sheets_v4 } from "googleapis";
import { promises as dnsPromises } from "dns";
import { cwd } from "process";

const credentialPath = `${cwd()}/server/credentials.json`;

const auth = new Auth.GoogleAuth({
  keyFile: credentialPath,
  scopes: "https://www.googleapis.com/auth/spreadsheets",
});

const getLanguageSheetAsJSON = async () => {
  const spreadsheetId = "1UFfNikfLuo8bSromE34uWDuJrMPFiJG3VpoQKdCGkII";
  const googleSheets = new sheets_v4.Sheets();
  const rows = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: "Translations",
  });

  const rowsJSON = utils.sheet_to_json(utils.aoa_to_sheet(rows.data.values), {
    defval: "",
  });
  return rowsJSON;
};

async function processLanguageSheet(existingData = {}, retries = 5) {
  // Get newly fetched data from Google Sheets
  let newData = await getLanguageSheetAsJSON();
  newData = newData.reduce((acc, phrase, phraseNumber) => {
    // NOTE the key is "language", but this variable actually contains the phrase name
    const { language, ...translations } = phrase;
    if (
      language.includes("T_") ||
      language.includes("EE_") ||
      language.includes("RC_")
    ) {
      const processed = Object.fromEntries(
        Object.entries(translations).map(([lang, text]) => [
          lang,
          text.includes("XX")
            ? text.replace(/XXX/g, "xxx").replace(/XX/g, "xx")
            : text,
        ]),
      );
      acc[language] = processed;
    }
    return acc;
  }, {});
  // Merge new data with existing, preserving good translations
  let numUntranslatedPhrasesRemaining = 0;
  const mergedData = { ...existingData };
  for (const [phrase, translations] of Object.entries(newData)) {
    if (!translations) continue;
    if (!mergedData[phrase]) {
      mergedData[phrase] = translations;
    }
    for (const [lang, text] of Object.entries(translations)) {
      const existingTranslation = mergedData[phrase][lang];
      const isTranslationAlreadyKnown =
        existingTranslation && existingTranslation !== "Loading...";
      const isNewTranslationBogus = text === "Loading...";
      if (!isTranslationAlreadyKnown && isNewTranslationBogus)
        numUntranslatedPhrasesRemaining++;
      if (isTranslationAlreadyKnown || isNewTranslationBogus) continue;
      mergedData[phrase][lang] = text;
    }
  }
  if (numUntranslatedPhrasesRemaining > 0) {
    if (retries > 0) {
      const timeoutSec = 5;
      console.log(
        `Remaining ${numUntranslatedPhrasesRemaining} phrases untranslated. Retrying in ${timeoutSec}, ${
          retries - 1
        } retries remaining.`,
      );
      await new Promise((resolve) => setTimeout(resolve, timeoutSec * 1000));
      return processLanguageSheet(mergedData, retries - 1);
    } else {
      // TODO more proper way to handle?
      console.error(
        `Failed to translate ${numUntranslatedPhrasesRemaining} phrases, even after 5 retries.`,
      );
    }
  }
  const data = mergedData;
  const exportWarning = `/*
  Do not modify this file! Run npm \`npm run phrases\` at ROOT of this project to fetch from the Google Sheets.
  Phrases should be read using the "readi18nPhrases" function from "components/readPhrases", to prevent silent breaking errors.
  https://docs.google.com/spreadsheets/d/1UFfNikfLuo8bSromE34uWDuJrMPFiJG3VpoQKdCGkII/edit#gid=0
*/\n\n`;
  const exportHandle = `export const phrases = `;

  writeFile(
    `${cwd()}/components/i18n.js`,
    exportWarning + exportHandle + JSON.stringify(data) + "\n",
    (error) => {
      if (error) {
        console.log("Error! Couldn't write to the file.", error);
      } else {
        console.log(
          "EasyEyes International Phrases fetched and written into files successfully.",
        );
      }
    },
  );
}

await dnsPromises
  .resolve("www.google.com", "A")
  .then(async (res) => {
    try {
      if (existsSync(credentialPath)) {
        console.log("Fetching up-to-date phrases...");
        await processLanguageSheet();
      } else {
        console.log(":( Failed to fetch PHRASES. No credentials.json found.");
      }
    } catch (error) {
      console.error(error);
    }
  })
  .catch((error) => {
    console.error("No Internet connection. Skipping phrase fetching.", error);
  });
