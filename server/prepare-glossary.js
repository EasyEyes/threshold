const process = require("process");
const fs = require("fs");
const XLSX = require("xlsx");
const google = require("googleapis");

const auth = new google.Auth.GoogleAuth({
  keyFile: `${__dirname}/credentials.json`,
  scopes: "https://www.googleapis.com/auth/spreadsheets",
});

async function processLanguageSheet() {
  const spreadsheetId = "1x65NjykMm-XUOz98Eu_oo6ON2xspm_h0Q0M2u6UGtug";
  const googleSheets = new google.sheets_v4.Sheets();
  const rows = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: "Inputs",
  });

  const rowsJSON = XLSX.utils.sheet_to_json(
    XLSX.utils.aoa_to_sheet(rows.data.values),
    {
      defval: "",
    }
  );

  const data = {};
  for (let parameter of rowsJSON) {
    const parameterName = parameter["INPUT PARAMETERS"];
    const parameterInfo = {
      name: parameterName,
      availability: parameter["Avail."] || "now",
      example: parameter["Example"],
      explanation: parameter["Explanation"],
      type: parameter["Type"],
      default: parameter["Default"],
    };
    // Categories is only relevant for the "categorical" type
    if (parameterInfo.type === "categorical")
      parameterInfo.categories = parameter["Categories"].split(", ");
    // Exclude rows that Denis used for other notes
    if (parameterInfo.name && parameterInfo.type)
      data[parameterName] = parameterInfo;
  }

  const exportWarning = `/*
  Do not modify this file! Run npm \`npm run glossary\` at ROOT of this project to fetch from the Google Sheets.
  https://docs.google.com/spreadsheets/d/1x65NjykMm-XUOz98Eu_oo6ON2xspm_h0Q0M2u6UGtug/edit#gid=1287694458 
*/\n\n`;
  const exportHandle = `interface Glossary {[parameter: string]: { [field: string]: string | string[] };}\n\nexport const GLOSSARY: Glossary =`;

  fs.writeFile(
    `${process.cwd()}/parameters/glossary.ts`,
    exportWarning + exportHandle + JSON.stringify(data) + "\n",
    (error) => {
      if (error) {
        console.log("Error! Couldn't write to the file.", error);
      } else {
        console.log(
          "EasyEyes glossary of inputs fetched and written into files successfully."
        );
      }
    }
  );
}

require("dns").resolve("www.google.com", function (err) {
  if (err) {
    console.log("No internet connection. Skip fetching glossary.");
  } else {
    console.log("Fetching up-to-date glossary...");
    processLanguageSheet();
  }
});
