/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AUTHORING ALERTS
 * - `name`: plain text, no HTML or severity icon. `kind` selects presentation.
 * - `message`/`hint`: HTML sentences; end with punctuation. External error
 *   strings may pass through verbatim rather than being parsed for markup.
 * - `parameters`: involved parameter NAMES, never values; deduplicate.
 * - Parameter names: `.alert-parameter` via alertParameter(). A parameter
 *   name used AS A VALUE nests inside alertValueHtml(alertParameter(name)).
 * - Literal values: alertValue()/alertValues(), never delimiter
 *   quotes or ad-hoc emphasis. One table cell is one highlighted value, even
 *   when multicategorical. Helpers escape supplied text.
 * - Offending labels: alertOffendingValuesLabel(); singular/plural
 *   follows DISTINCT columns, not instances or values within a cell.
 * - Renderer owns severity icons, HINT/PARAMETER labels, and dismissal.
 */
import { getGlossary } from "../parameters/glossaryRegistry";
import {
  conditionIndexToColumnName,
  getNumericalSuffix,
  verballyEnumerate,
} from "./utils";
import {
  alertInvalid,
  alertParameter,
  alertValue,
  alertValueHtml,
  alertValues,
  escapeAlertHtml,
} from "./alertHtml";

export interface Alert {
  /** Stable identifier for programmatic recovery; display text may change. */
  code?: string;
  name: string;
  message: string;
  hint: string;
  context: string;
  kind: "error" | "warning" | "correct";
  parameters: string[];
}

export type AlertInput = Pick<Alert, "name"> & Partial<Omit<Alert, "name">>;

/** The single Alert constructor: authoring defaults live here, not callers. */
export const makeAlert = (alert: AlertInput): Alert => ({
  name: alert.name,
  message: alert.message ?? "",
  hint: alert.hint ?? "",
  context: alert.context ?? "preprocessor",
  kind: alert.kind ?? "error",
  parameters: alert.parameters ?? [],
  ...(alert.code ? { code: alert.code } : {}),
});

/** Both table validation and the usage audit use the Glossary's migration advice. */
export const OBSOLETE_PARAMETER = (name: string, glossaryKey = name): Alert => {
  const glossary = getGlossary();
  const explanation = glossary[glossaryKey]?.explanation?.trim();
  const hint = explanation
    ? explanation
        .split(/([A-Za-z_][A-Za-z0-9_@]*)/g)
        .map((text) =>
          Object.prototype.hasOwnProperty.call(glossary, text)
            ? alertParameter(text)
            : escapeAlertHtml(text),
        )
        .join("")
        .replace(/\r?\n/g, "<br/>")
    : "Remove this obsolete parameter. No replacement is specified in the Parameter Glossary.";
  return makeAlert({
    name: "Parameter is obsolete",
    message: "",
    hint,
    parameters: [name],
  });
};

// Convert a 1-based condition number (0 means the underscore column, B) to the
// spreadsheet column label, accounting for any disabled conditions that were
// dropped from the working table (see setConditionColumnMapping in utils.ts).
const blockIndexToColumnLabel = (block: number): string =>
  block >= 1 ? conditionIndexToColumnName(block - 1) : "B";

export const UNBALANCED_COMMAS = (
  offendingParameters: {
    parameter: string;
    length: number;
    correctLength: number;
  }[],
): Alert => {
  const hintBlob: string = offendingParameters
    .map((offenderReport) => {
      const adjustment = offenderReport.length - offenderReport.correctLength;
      const magnitude = Math.abs(adjustment);
      const verb = adjustment < 0 ? "add" : "remove";
      const noun = magnitude > 1 ? "commas" : "comma";
      const preposition = verb === "add" ? "to" : "from";
      return `•${verb} ${magnitude} ${noun} ${preposition} the ${alertParameter(
        offenderReport.parameter,
      )} row.`;
    })
    .join("<br/>");
  return makeAlert({
    name: "Unbalanced commas",
    message:
      "Uh oh, looks like we found an inconsistent number of commas. Each row needs to have the same number of commas, so that we can correctly read your experiment.",
    hint: `Try this:<br/>${hintBlob}`,
    parameters: offendingParameters.map((value) => value.parameter),
  });
};

export const PROLIFIC_TITLE_TOO_LONG = (
  currentLength: number,
  maxLength: number,
): Alert => {
  return makeAlert({
    name: `Prolific study title exceeds maximum length`,
    message: `The value for ${alertParameter("_online1Title")} is ${alertValue(
      currentLength,
    )} characters long. Prolific restricts study titles to ${alertValue(
      maxLength,
    )} characters or less.`,
    hint: `Please shorten the title to ${alertValue(
      maxLength,
    )} characters or less.`,
    parameters: ["_online1Title"],
  });
};

export const PROLIFIC_CURRENCY_NOT_SUPPORTED = (
  currencyCode: string,
  supportedCurrencies: string[],
): Alert => {
  return makeAlert({
    name: `Currency not supported by Prolific`,
    message: `${alertParameter(
      "_online2PayCurrencyCode",
    )} is set to ${alertValue(
      currencyCode,
    )}, but Prolific only supports ${verballyEnumerate(
      supportedCurrencies.map(alertValue),
    )}. Prolific has no API to change your account's currency.`,
    hint: `Set ${alertParameter(
      "_online2PayCurrencyCode",
    )} to match your Prolific account's currency (${supportedCurrencies
      .map(alertValue)
      .join(" or ")}), and adjust ${alertParameter(
      "_online2Pay",
    )} or ${alertParameter(
      "_online2PayPerHour",
    )} to provide the desired compensation. Your Prolific account currency can only be changed by sending a written request to Prolific.`,
    parameters: ["_online2PayCurrencyCode"],
  });
};

export const PROLIFIC_PARTICIPANT_GROUP_NOT_FOUND = (
  parameter: string,
  groupName: string,
): Alert => {
  return makeAlert({
    name: `Prolific participant group not found`,
    message: `The participant group ${alertValue(
      groupName,
    )} specified in ${alertParameter(
      parameter,
    )} was not found in your Prolific workspace.`,
    hint: `Please create the participant group in Prolific first, or correct the group name in your experiment file. Group names are case-sensitive.`,
    parameters: [parameter],
  });
};

export const PROLIFIC_API_ERROR = (
  parameter: string,
  errorMessage: string,
  groupName: string,
): Alert => {
  return makeAlert({
    name: `Failed to verify Prolific participant group`,
    message: `Unable to verify the participant group ${alertValue(
      groupName,
    )} for ${alertParameter(parameter)}.`,
    hint: `Error: Please check your Prolific token and internet connection. ${errorMessage}.`,
    parameters: [parameter],
  });
};

export const LOGGING_REQUIRES_AUTHOR_EMAIL = (
  enabledLoggingParameters: string[],
): Alert => {
  const enabled = enabledLoggingParameters
    .map((name) => alertParameter(name))
    .join(", ");
  return makeAlert({
    name: `Logging requires _authorEmails`,
    message: `${enabled} enables logging, which sends reports to the Formspree server and to the email address in ${alertParameter(
      "_authorEmails",
    )}, which is currently missing.`,
    hint: `Provide the parameter ${alertParameter(
      "_authorEmails",
    )} with a valid email address (or several, separated by semicolons), or disable logging.`,
    parameters: ["_authorEmails", ...enabledLoggingParameters],
  });
};

export const LOGGING_CAUTION = (
  enabledLoggingParameters: string[],
  quota?: { used: number; limit: number },
): Alert => {
  const enabled = enabledLoggingParameters
    .map((name) => alertParameter(name))
    .join(", ");
  let quotaSentence = "";
  if (
    quota &&
    Number.isFinite(quota.used) &&
    Number.isFinite(quota.limit) &&
    quota.limit > 0
  ) {
    const percent = Math.round((quota.used / quota.limit) * 100);
    quotaSentence = ` So far this month we have used ${alertValue(
      quota.used.toLocaleString(),
    )} of our ${alertValue(
      quota.limit.toLocaleString(),
    )} Formspree submissions (${alertValue(`${percent}%`)}).`;
  }
  return makeAlert({
    name: `Logging caution`,
    message:
      `This experiment enables one or more of the logging parameters: ${enabled}. ` +
      `These parameters cause the running experiment to log many details in the Formspree server, which you can review in Analyzer at your leisure. ` +
      `This is very helpful in tracking down the cause of an online crash, since we typically get no results after a crash. ` +
      `Be aware that our current Formspree license allows us only 20,000 submissions per month, and this quota is easily exceeded.${quotaSentence}`,
    hint: `Please enable logging only when you really need it.`,
    kind: "warning",
    parameters: [...enabledLoggingParameters],
  });
};

export const INVALID_FOLDER_STRUCTURE = (
  folderName: string,
  parameter: string,
): Alert => {
  return makeAlert({
    name: "Invalid folder structure",
    message: `The zip file ${alertValue(
      folderName,
    )} specified by ${alertParameter(parameter)} has the wrong structure.`,
    hint: `Just zip the files, with no folder. For more help see ${alertParameter(
      "targetSoundFolder",
    )} in the Input Parameter Glossary.`,
    parameters: [parameter],
  });
};

// TODO Too much duplicated code for similar file missing errors!
export const RESOURCE_LISTING_UNAVAILABLE = (
  resourceType: string,
  filenames: string[],
  parameters: string[] = [],
): Alert => {
  const htmlList = filenames
    .map((filename) => `<li>${alertValue(filename)}</li>`)
    .join("");
  return makeAlert({
    code: "RESOURCE_LISTING_UNAVAILABLE",
    name: "Resource list unavailable",
    message: `Could not verify the following resource${
      filenames.length === 1 ? "" : "s"
    } because the ${alertValue(
      resourceType,
    )} list could not be fetched: <ul>${htmlList}</ul>`,
    hint: "Retry loading EasyEyesResources, or supply the named file with the experiment. An unavailable list is not an empty list.",
    parameters: [...new Set(parameters)],
  });
};

export const FONT_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): Alert => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${alertValue(fileName)}</li>`;
  });
  return makeAlert({
    name: "Font file not found",
    message: `${alertParameter(parameter)} not found in ${alertParameter(
      "fontSource",
    )} ${alertValue("file")}: <ul>${htmlList}</ul>`,
    hint: `Are both font source and name correct?`,
    parameters: [parameter],
  });
};

export const IMAGE_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): Alert => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${alertValue(fileName)}</li>`;
  });
  return makeAlert({
    name: "Image file not found",
    message: `We could not find the following image(s) specified by ${alertParameter(
      parameter,
    )}: <br/><ul>${htmlList}</ul>`,
    hint: `Are all images uploaded? If so, make sure the names match the ones in the experiment file.`,
    parameters: [parameter],
  });
};

export const FONT_FILES_MISSING_WEB = (
  parameter: string,
  missingFileNameList: string[],
): Alert => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${alertValue(fileName)}</li>`;
  });
  return makeAlert({
    name: "Font file not found",
    message: `${alertParameter(parameter)} not found in ${alertParameter(
      "fontSource",
    )} ${alertValue("google")}: <ul>${htmlList}</ul>`,
    hint: `Are both font source and name correct? You can browse through Google Fonts (fonts.google.com) to make sure.`,
    parameters: [parameter],
  });
};

export const ERROR_CREATING_TYPEKIT_KIT = (): Alert => {
  return makeAlert({
    name: "Error creating Adobe Fonts",
    message: `We were unable to create Adobe Fonts kit. Please try again.`,
    hint: `If the problem persists, please contact the EasyEyes team.`,
    parameters: [],
  });
};

export const TYPEKIT_FONT_ONLY_AVAILABLE_WITH_SUBSCRIPTION = (
  parameter: string,
  missingFontList: Record<string, { columns: string[]; blocks: number[] }>,
): Alert => {
  let htmlList = "";
  Object.keys(missingFontList).map((font: string) => {
    const fontInfo = missingFontList[font];
    const columnBlockPairs = fontInfo.columns.map(
      (column, index) => `block ${fontInfo.blocks[index]} in column ${column}`,
    );

    htmlList += `<li>${alertValue(font)} (${columnBlockPairs.join(", ")})</li>`;
  });
  return makeAlert({
    name: "Adobe font only available with subscription",
    message: `The following font(s) with ${alertParameter(
      "fontSource",
    )}=${alertValue(
      "adobe",
    )} are in Adobe Fonts, but only available to paid Creative Cloud subscribers, and you only have a free account. \n<br/><ul>${htmlList}</ul>`,
    hint: `Please subscribe to Creative Cloud to use this font. Adobe offers subscriptions here <a href="https://www.adobe.com/creativecloud/plans.html" target="_blank">https://www.adobe.com/creativecloud/plans.html</a>. \nThey offer educational discounts. \n`,
    parameters: [parameter],
  });
};

export const TYPEKIT_FONTS_MISSING = (
  parameter: string,
  missingFontList: Record<string, { columns: string[]; blocks: number[] }>,
): Alert => {
  let htmlList = "";
  Object.keys(missingFontList).map((font: string) => {
    const fontInfo = missingFontList[font];
    const columnBlockPairs = fontInfo.columns.map(
      (column, index) => `block ${fontInfo.blocks[index]} in column ${column}`,
    );

    htmlList += `<li>${alertValue(font)} (${columnBlockPairs.join(", ")})</li>`;
  });

  return makeAlert({
    name: "Adobe font not found",
    message: `We could not find the following font(s) specified by ${alertParameter(
      parameter,
    )} with ${alertParameter("fontSource")}=${alertValue(
      "adobe",
    )}: <br/><ul>${htmlList}</ul>`,
    hint: `To discover an Adobe font's exact web name, find the font's page in <a href="https://fonts.adobe.com/" target="_blank">https://fonts.adobe.com/</a>. \n In that page's lower right corner, find the ${alertValue(
      "To use this font on your website",
    )} section. Copy the ${alertValue(
      "font-family",
    )} value up to the first comma. E.g. if you see ${alertValue(
      "font-family: proxima-nova, sans-serif;",
    )} copy just ${alertValue("proxima-nova")}.`,
    parameters: [parameter],
  });
};

export const IMAGE_FOLDER_INVALID_NUMBER_OF_FILES = (
  parameter: string,
  folderName: string,
  conditionTrials: number,
  columnLetter: string,
): Alert => {
  return makeAlert({
    name: "Image folder contains invalid number of files",
    message: `The folder ${alertValue(
      folderName,
    )} in column ${columnLetter} does not contain enough files to match the number of trials.`,
    hint: `When ${alertParameter("targetImageReplacementBool")} is ${alertValue(
      "FALSE",
    )}, the folder must contain at least as many files as the number of trials.`,
    parameters: [parameter],
  });
};

export const IMAGE_FOLDER_INVALID_NUMBER_OF_OPTIONS = (
  parameter: string,
  folderName: string,
  totalOptions: number,
  columnLetter: string,
): Alert => {
  return makeAlert({
    name: "Image folder contains invalid number of files",
    message: `The folder ${alertValue(
      folderName,
    )} in column ${columnLetter} does not contain enough files to match the number of options.`,
    hint: `Make sure the folder contains enough files to match the ${alertParameter(
      "targetImageExclude",
    )} and ${alertParameter("targetImageFoilsExclude")} settings.`,
    parameters: [parameter],
  });
};

export const IMAGE_FOLDER_INVALID_EXTENSION_FILES = (
  parameter: string,
  folderName: string,
  columnLetter: string,
): Alert => {
  // the file does not have any files with the accepted image extensions.
  // accepted extensions: .png, .jpg,
  return makeAlert({
    name: "Image folder contains invalid files",
    message: `The folder ${alertValue(
      folderName,
    )} in column ${columnLetter} does not contain any files with the accepted image extensions. Accepted extensions are: ${alertValues(
      [".png", ".jpg"],
    )}. `,
    hint: `Please check the files and make sure they have the correct extension.`,
    parameters: [parameter],
  });
};

export const IMAGE_FOLDER_MISSING = (
  parameter: string,
  requestedFolder: string,
): Alert => {
  return makeAlert({
    name: "Image folder is missing",
    message: `We could not find the following folder specified by ${alertParameter(
      parameter,
    )}: ${alertValue(requestedFolder)}.`,
    hint: `Submit the folder to the drop box above ↑.`,
    parameters: [parameter],
  });
};
export const SOUND_FOLDER_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): Alert => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${alertValue(fileName)}</li>`;
  });
  ``;
  return makeAlert({
    name: "Sound folder is missing",
    message: `We could not find the following folder(s) specified by ${alertParameter(
      parameter,
    )}: <br/><ul>${htmlList}</ul>`,
    hint: `Submit the folder(s) to the drop box above ↑.`,
    parameters: [parameter],
  });
};

export const FORM_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): Alert => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${alertValue(fileName)}</li>`;
  });
  return makeAlert({
    name: "Form file is missing",
    message: `We could not find the following file(s) specified by ${alertParameter(
      parameter,
    )}: <br/><ul>${htmlList}</ul>`,
    hint: `Submit the file(s) to the drop box above ↑.`,
    parameters: [parameter],
  });
};

export const TEXT_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): Alert => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${alertValue(fileName)}</li>`;
  });
  return makeAlert({
    name: "Text file is missing",
    message: `We could not find the following file(s) specified by ${alertParameter(
      parameter,
    )}: <br/><ul>${htmlList}</ul>`,
    hint: `Use the Select file button above to add the missing file(s). One way to do this is to drop the file(s) onto the button.`,
    parameters: [parameter],
  });
};

export const CODE_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): Alert => {
  let htmlList = "";
  missingFileNameList
    .map((fileName: string) => {
      htmlList += `<li>${alertValue(fileName)}</li>`;
    })
    .join("");
  return makeAlert({
    name: "JavaScript code file is missing",
    message: `We could not find the following file(s) specified by ${alertParameter(
      parameter,
    )}: <br/><ul>${htmlList}</ul>`,
    hint: `Submit the file(s) to the drop box above ↑.`,
    parameters: [parameter],
  });
};

// TODO create type to match report object structure

export const NO_BLOCK_PARAMETER: Alert = makeAlert({
  name: "Parameter is not present",
  message: `We weren't able to find a parameter named ${alertParameter(
    "block",
  )}. This parameter is required, as it tells us how to organize your study.`,
  hint: `Be sure to include a ${alertParameter(
    "block",
  )} parameter in your experiment file. The values should be increasing from ${alertValue(
    1,
  )} (or ${alertValue(0)}, if ${alertParameter(
    "zeroBasedNumberingBool",
  )} is set to ${alertValue(
    "true",
  )}). Each condition, ie column, needs one block number, but a block can have any number of conditions.`,
  parameters: ["block"],
});

export const INVALID_STARTING_BLOCK = (actualStartingValue: string): Alert => {
  return makeAlert({
    name: "Invalid initial value",
    message: `The first value in your ${alertParameter(
      "block",
    )} row isn't correct; it is ${alertValue(
      actualStartingValue,
    )}, when it ought to be ${alertValue(1)}.`,
    hint: `Change your ${alertParameter(
      "block",
    )} row to start with ${alertValue(
      1,
    )}, with each subsequent value either the same &#8212 or one larger &#8212 than the previous.`,
    parameters: ["block"],
  });
};

export const EMPTY_BLOCK_VALUES = (emptyValueConditions: number[]): Alert => {
  const offendingConditionLabels = emptyValueConditions.map((i) =>
    conditionIndexToColumnName(i),
  );
  const plural = offendingConditionLabels.length > 1 ? true : false;
  const offendingConditionsString = verballyEnumerate(offendingConditionLabels);
  return makeAlert({
    // Names render as plain text on the compiler page — no HTML here.
    name: "Block value is empty",
    message: `A valid ${alertParameter(
      "block",
    )} value must be provided for every condition.`,
    hint: `Check column${plural ? "s" : ""} ${offendingConditionsString}.`,
    parameters: ["block"],
  });
};

export const NONSEQUENTIAL_BLOCK_VALUE = (
  nonsequentials: { value: number; previous: number; index: number }[],
  blockValues: string[],
): Alert => {
  // let problemStatement: string;
  const illustratedValues = blockValues
    .map((value, i) => {
      const improperValue: boolean = nonsequentials.some(
        (nonsequential) => nonsequential.index === i,
      );
      return improperValue
        ? alertValueHtml(alertInvalid(String(value)))
        : alertValue(value);
    })
    .join(",");
  const nonsequentialIndicies: string[] = nonsequentials.map(
    (nonsequential) => {
      const suffix = getNumericalSuffix(nonsequential.index + 1);
      return `${nonsequential.index + 1}${suffix}`;
    },
  );
  const plural = nonsequentials.length > 1;
  const hintBlob = `${alertParameter("block")},${illustratedValues}<br/>
                    The ${verballyEnumerate(nonsequentialIndicies)} value${
                      plural ? "s are" : " is"
                    } nonsequential.`;
  return makeAlert({
    name: `Nonsequential value${plural ? "s" : ""}`,
    message: `Each value should either be the same as the previous, or 1 larger.`,
    hint: hintBlob,
    parameters: ["block"],
  });
};
/**
 * The glossary default of fontPixiMetricsString is a comma-separated list of
 * (language, metrics string) pairs. Only the languages are checked; a metrics
 * string can be anything without a comma.
 */
export const IMPROPER_GLOSSARY_FONT_PIXI_METRICS_STRING_DEFAULT = (
  unrecognizedLanguages: string[],
  unpairedLanguage: string | null,
): Alert => {
  const faults: string[] = [];
  if (unrecognizedLanguages.length) {
    const plural = unrecognizedLanguages.length > 1;
    faults.push(
      `${verballyEnumerate(unrecognizedLanguages.map(alertValue))} ${
        plural ? "are not languages" : "is not a language"
      } that ${alertParameter("fontLanguage")} accepts`,
    );
  }
  if (unpairedLanguage !== null)
    faults.push(
      `${alertValue(unpairedLanguage)} has no metrics string after it`,
    );
  return makeAlert({
    name: `Default of fontPixiMetricsString in glossary is improper`,
    message: `The glossary's ${alertParameter(
      "fontPixiMetricsString",
    )} default must be a comma-separated list of language and metrics-string pairs, e.g. ${alertValue(
      "ar, ٱغ, ja, 高黒",
    )}, naming the default metrics string for each ${alertParameter(
      "fontLanguage",
    )}. ${verballyEnumerate(faults)}. Please contact the EasyEyes team.`,
    hint: "",
    parameters: ["fontPixiMetricsString"],
  });
};

export interface Offender<T> {
  columnNumber: number;
  offendingValue: T;
}

export const READING_CORPUS_TOO_SHORT = (o: {
  condition: number;
  corpusFile: string;
  corpusCharacters: number;
  requestedPages: number;
  lineLength: number;
  linesPerPage: number;
}): Alert => {
  const charsNeeded = Math.round(
    (o.requestedPages - 0.9) * o.lineLength * o.linesPerPage,
  );
  return makeAlert({
    name: `Reading corpus is too short`,
    message: `The reading corpus does not have enough text for the requested number of pages.`,
    hint: `With current line length (${o.lineLength}) and lines per page (${
      o.linesPerPage
    }), displaying ${o.requestedPages} pages requires at least ${
      o.requestedPages - 0.9
    } pages × ${o.lineLength} × ${
      o.linesPerPage
    } = ${charsNeeded} characters, but there are only ${
      o.corpusCharacters
    } characters in corpus ${alertValue(o.corpusFile)}. Set ${alertParameter(
      "readingPages",
    )}=${alertValue(
      -1,
    )} to read the whole corpus, however many pages that takes. (column ${blockIndexToColumnLabel(
      o.condition,
    )})`,
    parameters: ["readingCorpus", "readingPages"],
  });
};

export const READING_CORPUS_INSUFFICIENT_FOILS = (o: {
  condition: number;
  corpusFile: string;
  uniqueWords: number;
  unavailableWords: number;
  foilsNeeded: number;
  numberOfQuestions: number;
  numberOfAnswers: number;
  cumulativeExclusions?: number;
}): Alert => {
  const supply = o.uniqueWords - o.unavailableWords;
  const cumulative = o.cumulativeExclusions ?? 0;
  const cumulativeClause = cumulative
    ? ` ${cumulative} of the unavailable words were consumed as targets/foils by earlier conditions (per ${alertParameter(
        "readingCorpusFoilsExclude",
      )}).`
    : "";
  return makeAlert({
    name: `Reading corpus has too few unique words for foils`,
    message: `The reading corpus cannot supply enough foil words for the comprehension questions, which would crash the experiment after the reading.`,
    hint: `Foils must be unique words (2+ letters) that were NOT displayed in the passage. With ${alertParameter(
      "readingNumberOfQuestions",
    )} = ${alertValue(o.numberOfQuestions)} and ${alertParameter(
      "readingNumberOfPossibleAnswers",
    )} = ${alertValue(o.numberOfAnswers)}, that requires ${
      o.numberOfQuestions
    } × ${o.numberOfAnswers - 1} = ${o.foilsNeeded} foils, but corpus ${
      o.corpusFile
    } has only ${o.uniqueWords} unique words, of which about ${
      o.unavailableWords
    } are displayed, used as answers, or consumed by earlier conditions, leaving only ${supply}.${cumulativeClause} Use a larger corpus, or reduce ${alertParameter(
      "readingNumberOfQuestions",
    )} or ${alertParameter(
      "readingNumberOfPossibleAnswers",
    )}. (column ${blockIndexToColumnLabel(o.condition)})`,
    parameters: [
      "readingCorpus",
      "readingNumberOfQuestions",
      "readingNumberOfPossibleAnswers",
      ...(cumulative ? ["readingCorpusFoilsExclude"] : []),
    ],
  });
};

export const IMPULSE_RESPONSE_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): Alert => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${alertValue(fileName)}</li>`;
  });
  return makeAlert({
    name: "Impulse response file is missing",
    message: `We could not find the following impulse response file(s) specified by ${alertParameter(
      parameter,
    )}: <br/><ul>${htmlList}</ul>`,
    hint: `Submit the file(s) to the drop box above ↑.`,
    parameters: [parameter],
  });
};

export const IMPULSE_RESPONSE_FILE_INVALID_FORMAT = (
  fileName: string,
  reason: string,
  parameter?: string,
): Alert => {
  return makeAlert({
    name: "Invalid impulse response file format",
    message: `The impulse response file ${alertValue(
      fileName,
    )} has an invalid format: ${reason}.`,
    hint: `Make sure the file includes two columns named ${alertValue(
      "time",
    )} and ${alertValue("amplitude")} with values in all rows.`,
    parameters: parameter ? [parameter] : [],
  });
};

export const FREQUENCY_RESPONSE_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): Alert => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${alertValue(fileName)}</li>`;
  });
  return makeAlert({
    name: "Frequency response file is missing",
    message: `We could not find the following frequency response file(s) specified by ${alertParameter(
      parameter,
    )}: <br/><ul>${htmlList}</ul>`,
    hint: `Submit the file(s) to the drop box above ↑.`,
    parameters: [parameter],
  });
};

export const FREQUENCY_RESPONSE_FILE_INVALID_FORMAT = (
  fileName: string,
  reason: string,
): Alert => {
  return makeAlert({
    name: "Invalid frequency response file format",
    message: `The frequency response file ${alertValue(
      fileName,
    )} has an invalid format: ${reason}.`,
    hint: `Frequency response files must end with ${alertValue(
      ".gainVFreq.xlsx",
    )} or ${alertValue(".gainVFreq.csv")} and contain ${alertValue(
      "frequency",
    )} and ${alertValue("gain")} columns.`,
    parameters: [
      "_calibrateSoundSimulateLoudspeaker",
      "_calibrateSoundSimulateMicrophone",
    ],
  });
};

export const TARGET_SOUND_LIST_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
  columns: string[],
): Alert => {
  let htmlList = "";
  missingFileNameList.map((fileName: string, index: number) => {
    htmlList += `<li>${alertValue(fileName)} in column ${columns[index]}</li>`;
  });
  return makeAlert({
    name: "Target sound list file is missing",
    message: `We could not find the following target sound list file(s) specified by ${alertParameter(
      parameter,
    )}: <br/><ul>${htmlList}</ul>`,
    hint: `Submit the file(s) to the drop box above ↑.`,
    parameters: ["targetSoundList"],
  });
};

export const TARGET_SOUND_LIST_FILE_INVALID_FORMAT = (
  fileName: string,
  reason: string,
): Alert => {
  return makeAlert({
    name: "Invalid target sound list file format",
    message: `The target sound list file ${alertValue(
      fileName,
    )} has an invalid format: ${reason}.`,
    hint: `Target sound list files must end with ${alertValue(
      ".targetSoundList.xlsx",
    )} or ${alertValue(".targetSoundList.csv")} and contain ${alertValue(
      "targetSound",
    )} and ${alertParameter("targetSoundList")} columns.`,
    parameters: ["targetSoundList"],
  });
};

const FONT_GAUNTLET_HINT = `<a href="https://fontgauntlet.com/" target="_blank" rel="noopener">Dinamo Font Gauntlet</a> reports and demonstrates your variable font's axes of variation, and the range and default of each axis.`;

export const GOOGLE_FONT_VARIABLE_SETTINGS_INVALID = (
  fontName: string,
  settings: string,
  offendingConditions: number[],
  hasLowercaseCustomAxis: boolean = false,
): Alert => {
  const plural = offendingConditions.length > 1;
  const offendingString = `Check column${plural ? "s" : ""} ${verballyEnumerate(
    offendingConditions.map((i) => conditionIndexToColumnName(i)),
  )}`;
  const customAxisHint = hasLowercaseCustomAxis
    ? ` Note: Custom axes (non-standard axes like ${alertValues([
        "YEAR",
        "GRAD",
      ])}) must be uppercase in Google Fonts. If you used a lowercase custom axis name, try uppercase (e.g., ${alertValue(
        "YEAR",
      )} instead of ${alertValue("year")}).`
    : "";
  return makeAlert({
    name: "Invalid fontVariableSettings for Google Font",
    message: `Invalid ${alertParameter("fontVariableSettings")} ${alertValue(
      settings,
    )} for Google Font ${alertValue(
      fontName,
    )}. The axis value may be out of range.${customAxisHint}`,
    hint: `${offendingString}. ${FONT_GAUNTLET_HINT}`,
    parameters: ["fontVariableSettings", "font"],
  });
};

export interface FontAxisInfo {
  tag: string;
  min: number;
  max: number;
  default: number;
}

export const FONT_NOT_VARIABLE = (
  fontName: string,
  offendingConditions: number[],
): Alert => {
  const plural = offendingConditions.length > 1;
  const offendingString = `Check column${plural ? "s" : ""} ${verballyEnumerate(
    offendingConditions.map((i) => conditionIndexToColumnName(i)),
  )}`;
  return makeAlert({
    name: `Font is not variable`,
    message: `The font ${alertValue(
      fontName,
    )} is not a variable font, but ${alertParameter(
      "fontVariableSettings",
    )} was specified.`,
    hint: `${offendingString}. ${FONT_GAUNTLET_HINT}`,
    parameters: ["fontVariableSettings", "font"],
  });
};

const SHAPERGLOT_HINT = `The EasyEyes compiler uses Google's ShaperGlot to evaluate your font's language support. To read about ShaperGlot, see the readme here: <a href="https://github.com/googlefonts/shaperglot" target="_blank" rel="noopener">https://github.com/googlefonts/shaperglot</a><br>We recommend asking ShaperGlot directly to get a full report of your font's language support. Just drop your font on SuperGlot's home page: <a href="https://googlefonts.github.io/shaperglot/" target="_blank" rel="noopener">https://googlefonts.github.io/shaperglot/</a><br>The online ShaperGlot only accepts desktop fonts (${alertValues(
  [".TTF", ".OTF"],
)}). If your font license allows it, you can use any of several free online services (Convertio, CloudConvert, or FreeConvert) to convert your web-format font (${alertValues(
  [".WOFF", ".WOFF2"],
)}) to a desktop format (${alertValues([
  ".TTF",
  ".OTF",
])}) that ShaperGlot will accept.`;

export const FONT_SHAPING_TABLE_REJECTED = (
  fontName: string,
  rejectedTables: string[],
  offendingConditions: number[],
): Alert => {
  const plural = offendingConditions.length > 1;
  const offendingString =
    offendingConditions.length > 0
      ? `Check column${plural ? "s" : ""} ${verballyEnumerate(
          offendingConditions.map((i) => conditionIndexToColumnName(i)),
        )}. `
      : "";
  const tables = rejectedTables.join(" and ");
  const tablesPlural = rejectedTables.length > 1;
  const lostCapabilities: string[] = [];
  if (rejectedTables.includes("GSUB"))
    lostCapabilities.push(
      "all glyph substitution (cursive joining, ligatures, and contextual letterforms)",
    );
  if (rejectedTables.includes("GPOS"))
    lostCapabilities.push("all glyph positioning (kerning and mark placement)");
  const toleranceValues = rejectedTables.map((table) =>
    table === "GSUB" ? "badGSUB" : "badGPOS",
  );
  return makeAlert({
    name: `Font has malformed OpenType layout table${tablesPlural ? "s" : ""}`,
    message: `The font ${alertValue(fontName)} contains ${
      tablesPlural ? "" : "a "
    }malformed OpenType ${tables} table${
      tablesPlural ? "s" : ""
    }. HarfBuzz — the text-shaping engine used by Chrome, Edge, and Firefox — rejects ${
      tablesPlural ? "both tables in full" : "the whole table"
    }, so the font silently loses ${verballyEnumerate(
      lostCapabilities,
    )}. In connected scripts such as Arabic this can misspell words on screen. Safari uses CoreText rather than HarfBuzz, so the failure may not appear there or in macOS apps like Notes — visual checks there won't reliably reveal the problem.`,
    hint: `${offendingString}Repair the font (if your license allows it) or use a different one. A font editor (or the fontTools Python library) can locate the offending rules; deleting or rebuilding them usually fixes the font without changing its design. To tolerate ${
      tablesPlural ? "these faults" : "this fault"
    }, add ${alertValues(toleranceValues)} to ${alertParameter(
      "fontTolerateFaults",
    )} for the affected condition${plural ? "s" : ""}. Add ${alertValue(
      "all",
    )} to tolerate every font fault.<br><br>${SHAPERGLOT_HINT}`,
    parameters: ["font", "fontTolerateFaults", "_needBrowser"],
  });
};

export const FONT_WRONG_LANGUAGE = (
  fontName: string,
  fontLanguage: string,
  shaperglotLanguageId: string,
  summary: string,
  problems: string[],
  offendingConditions: number[],
): Alert => {
  const plural = offendingConditions.length > 1;
  const offendingString =
    offendingConditions.length > 0
      ? `Check column${plural ? "s" : ""} ${verballyEnumerate(
          offendingConditions.map((i) => conditionIndexToColumnName(i)),
        )}. `
      : "";
  const problemDetail =
    problems.length > 0
      ? ` ${problems.slice(0, 4).join(". ")}.`
      : summary
      ? ` ${summary}`
      : "";
  return makeAlert({
    name: "Font lacks support for its fontLanguage",
    message: `The font ${alertValue(
      fontName,
    )} does not support the language ${alertParameter(
      "fontLanguage",
    )}=${alertValue(fontLanguage)} (${alertValue(
      shaperglotLanguageId,
    )}).${problemDetail}`,
    hint: `${offendingString}Choose a font that supports ${alertParameter(
      "fontLanguage",
    )}=${alertValue(fontLanguage)}, or add ${alertValue(
      "wrongLanguage",
    )} to ${alertParameter("fontTolerateFaults")} for the affected condition${
      plural ? "s" : ""
    } to tolerate the font's incomplete language support.<br><br>${SHAPERGLOT_HINT}`,
    parameters: ["font", "fontTolerateFaults", "fontLanguage"],
  });
};

export const FONT_READING_CORPUS_CHARACTERS_MISSING = (
  fontName: string,
  corpusName: string,
  missingSample: string,
  missingCount: number,
  offendingConditions: number[],
): Alert => {
  const plural = offendingConditions.length > 1;
  const offendingString =
    offendingConditions.length > 0
      ? `Check column${plural ? "s" : ""} ${verballyEnumerate(
          offendingConditions.map((i) => conditionIndexToColumnName(i)),
        )}. `
      : "";
  return makeAlert({
    name: "Font missing readingCorpus characters",
    message: `The font ${alertValue(
      fontName,
    )} is missing ${missingCount} character${
      missingCount === 1 ? "" : "s"
    } required by ${alertParameter("readingCorpus")} ${alertValue(
      corpusName,
    )} (for example: ${alertValue(missingSample)}).`,
    hint: `${offendingString}Fix this either by choosing a font that supports every character in ${alertParameter(
      "readingCorpus",
    )}, or by removing unsupported characters from ${alertParameter(
      "readingCorpus",
    )}. To use the font despite missing characters, add ${alertValue(
      "missingCharacters",
    )} to ${alertParameter("fontTolerateFaults")} for the affected condition${
      plural ? "s" : ""
    }. Unsupported characters may appear as empty boxes, e.g. □.<br><br>The ${alertValue(
      "wrongLanguage",
    )} setting does not suppress this error; it only tolerates incomplete support for ${alertParameter(
      "fontLanguage",
    )} character shapes.`,
    parameters: ["font", "readingCorpus", "fontTolerateFaults"],
  });
};

/**
 * Format available axes information as a string for error messages
 */
const formatAvailableAxesString = (availableAxes: FontAxisInfo[]): string => {
  return availableAxes.length > 0
    ? availableAxes
        .map(
          (a) =>
            `${alertValue(a.tag)} (${alertValue(a.min)} to ${alertValue(
              a.max,
            )}, default: ${alertValue(a.default)})`,
        )
        .join(", ")
    : "none";
};

export const FONT_AXIS_NOT_FOUND = (
  fontName: string,
  missingAxes: string[],
  availableAxes: FontAxisInfo[],
  offendingConditions: number[],
): Alert => {
  const plural = offendingConditions.length > 1;
  const axesPlural = missingAxes.length > 1;
  const offendingString = `Check column${plural ? "s" : ""} ${verballyEnumerate(
    offendingConditions.map((i) => conditionIndexToColumnName(i)),
  )}`;
  const availableAxesString = formatAvailableAxesString(availableAxes);
  return makeAlert({
    name: `Font axis not found`,
    message: `The font ${alertValue(fontName)} does not have the requested ax${
      axesPlural ? "es" : "is"
    }: ${verballyEnumerate(
      missingAxes.map(alertValue),
    )}. Available axes: ${availableAxesString}.`,
    hint: `${offendingString}. ${FONT_GAUNTLET_HINT}`,
    parameters: ["fontVariableSettings", "font"],
  });
};

export interface AxisValueError {
  axis: string;
  value: number;
  min: number;
  max: number;
  default: number;
}

export const FONT_AXIS_VALUE_OUT_OF_RANGE = (
  fontName: string,
  axisErrors: AxisValueError[],
  availableAxes: FontAxisInfo[],
  offendingConditions: number[],
): Alert => {
  const plural = offendingConditions.length > 1;
  const offendingString = `Check column${plural ? "s" : ""} ${verballyEnumerate(
    offendingConditions.map((i) => conditionIndexToColumnName(i)),
  )}`;
  const errorDetails = axisErrors
    .map(
      (e) =>
        `${alertValue(e.axis)} value ${alertValue(
          e.value,
        )} is outside allowed range ${alertValue(e.min)} to ${alertValue(
          e.max,
        )} (default: ${alertValue(e.default)})`,
    )
    .join("; ");
  const availableAxesString = formatAvailableAxesString(availableAxes);
  return makeAlert({
    name: `Font axis value out of range`,
    message: `The font ${alertValue(
      fontName,
    )} has axis values out of range: ${errorDetails}. Available axes: ${availableAxesString}.`,
    hint: `${offendingString}. ${FONT_GAUNTLET_HINT}`,
    parameters: ["fontVariableSettings", "font"],
  });
};

export const FONT_WEIGHT_NOT_VARIABLE = (
  fontName: string,
  offendingConditions: number[],
): Alert => {
  const plural = offendingConditions.length > 1;
  const offendingString = `Check column${plural ? "s" : ""} ${verballyEnumerate(
    offendingConditions.map((i) => conditionIndexToColumnName(i)),
  )}`;
  return makeAlert({
    name: `Font is not variable`,
    message: `The font ${alertValue(
      fontName,
    )} is not a variable font, but ${alertParameter(
      "fontWeight",
    )} was specified.`,
    hint: `${offendingString}. ${FONT_GAUNTLET_HINT}`,
    parameters: ["fontWeight", "font"],
  });
};

export const FONT_WEIGHT_MISSING_WGHT_AXIS = (
  fontName: string,
  availableAxes: FontAxisInfo[],
  offendingConditions: number[],
): Alert => {
  const plural = offendingConditions.length > 1;
  const offendingString = `Check column${plural ? "s" : ""} ${verballyEnumerate(
    offendingConditions.map((i) => conditionIndexToColumnName(i)),
  )}`;
  const availableAxesString =
    availableAxes.length > 0
      ? availableAxes
          .map(
            (a) =>
              `${alertValue(a.tag)} (${alertValue(a.min)} to ${alertValue(
                a.max,
              )}, default: ${alertValue(a.default)})`,
          )
          .join(", ")
      : "none";
  return makeAlert({
    name: `Font missing wght axis`,
    message: `The font ${alertValue(fontName)} does not have a ${alertValue(
      "wght",
    )} axis, but ${alertParameter(
      "fontWeight",
    )} was specified. Available axes: ${availableAxesString}.`,
    hint: `${offendingString}. ${FONT_GAUNTLET_HINT}`,
    parameters: ["fontWeight", "font"],
  });
};

export const FONT_WEIGHT_OUT_OF_RANGE = (
  fontName: string,
  value: number,
  min: number,
  max: number,
  defaultValue: number,
  offendingConditions: number[],
): Alert => {
  const plural = offendingConditions.length > 1;
  const offendingString = `Check column${plural ? "s" : ""} ${verballyEnumerate(
    offendingConditions.map((i) => conditionIndexToColumnName(i)),
  )}`;
  return makeAlert({
    name: `fontWeight value out of range`,
    message: `The font ${alertValue(fontName)} has ${alertParameter(
      "fontWeight",
    )} value ${alertValue(value)} outside the allowed range ${alertValue(
      min,
    )} to ${alertValue(max)} (default: ${alertValue(defaultValue)}).`,
    hint: `${offendingString}. ${FONT_GAUNTLET_HINT}`,
    parameters: ["fontWeight", "font"],
  });
};

export const PHRASE_FILE_MISSING = (
  parameter: string,
  filename: string,
): Alert => {
  return makeAlert({
    name: "Phrase file is missing",
    message: `We could not find the phrase file ${alertValue(
      filename,
    )} specified by ${alertParameter(
      parameter,
    )}. Submit the file to the drop box above ↑.`,
    hint: `Make sure the filename in ${alertParameter(
      parameter,
    )} matches the uploaded file exactly.`,
    parameters: [parameter],
  });
};

export const TILDE_WITHOUT_PHRASE_TABLE = (
  paramName: string,
  cell: string,
  spreadsheetParameter = "_languagePhrasesSpreadsheet",
): Alert => {
  return makeAlert({
    name: "Symbolic value requires phrase table",
    message: `The value ${alertValue(cell)} in parameter ${alertParameter(
      paramName,
    )} uses a phrase symbol, but ${alertParameter(
      spreadsheetParameter,
    )} is not set.`,
    hint: `Set ${alertParameter(
      spreadsheetParameter,
    )} to the name of a phrase file and upload that file.`,
    parameters: [paramName, spreadsheetParameter],
  });
};

export const TILDE_SYMBOL_NOT_FOUND = (
  paramName: string,
  cell: string,
): Alert => {
  return makeAlert({
    name: "Symbol not found in phrase table",
    message: `The symbol ${alertValue(cell)} in parameter ${alertParameter(
      paramName,
    )} was not found in the phrase table.`,
    hint: `Make sure the phrase file contains a row whose first column matches ${alertValue(
      cell,
    )} (case-insensitive).`,
    parameters: [paramName],
  });
};

export const TILDE_LANGUAGE_NOT_IN_TABLE = (
  paramName: string,
  cell: string,
  languageCode: string,
  selectorParameter = "_language",
): Alert => {
  return makeAlert({
    name: "Phrase column not found",
    message: `The value ${alertValue(languageCode)} from ${alertParameter(
      selectorParameter,
    )} has no column in the phrase table. Encountered while resolving ${alertValue(
      cell,
    )} in parameter ${alertParameter(paramName)}.`,
    hint: `Make sure the phrase file includes a column named ${alertValue(
      languageCode,
    )}.`,
    parameters: [paramName, selectorParameter],
  });
};

/**
 * fontFeatureSettings compile-time validation. The Canvas 2D API has no
 * font-feature-settings, so the value is "baked" into the font at runtime via
 * the Rust GSUB baker. Typos, malformed tags, and unknown tags must be caught
 * here — before the baker runs. All offenders (across all conditions & tags)
 * are reported in a single error.
 */

export const FONT_FEATURE_ANALYSIS_ERROR = (
  warnings: {
    tag: string;
    block: number;
    kind: string;
    fontName: string;
    param: string;
    keyword: string;
  }[],
): Alert => {
  const hintBlob = warnings
    .map((w) => {
      const col = blockIndexToColumnLabel(Number(w.block));
      // Ligature-keyword warnings show the keyword the experimenter typed
      // (they never wrote the raw tag).
      const subject = w.keyword
        ? `${alertValue(w.keyword)} (${alertValue(w.tag)})`
        : alertValue(w.tag);
      switch (w.kind) {
        case "not-in-font":
          return `• ${subject} not found in font ${alertValue(
            w.fontName,
          )} [column ${col}].`;
        case "empty-lookups":
          return `• ${subject} exists in ${alertValue(
            w.fontName,
          )} but has no lookups [column ${col}].`;
        case "empty-subtables":
          return `• ${subject} in ${alertValue(
            w.fontName,
          )} references an empty lookup [column ${col}].`;
        case "has-alternate":
          return `• ${subject} in ${alertValue(
            w.fontName,
          )} uses alternate substitution — the first alternate will be used [column ${col}].`;
        default:
          return `• ${subject} [column ${col}].`;
      }
    })
    .join("<br/>");
  return makeAlert({
    name: `Font feature compatibility`,
    message: `One or more requested features may not work as expected with the specified font.`,
    hint: hintBlob,
    parameters: [...new Set(warnings.map((w) => w.param))],
  });
};
