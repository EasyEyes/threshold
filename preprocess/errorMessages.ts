/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  conditionIndexToColumnName,
  getNumericalSuffix,
  verballyEnumerate,
} from "./utils";

export interface EasyEyesError {
  name: string;
  message: string;
  hint: string;
  context: string;
  kind: "error" | "warning" | "correct";
  parameters: string[];
}
const parameter = (paramName: string): string =>
  `<span class="error-parameter">${paramName}</span>`;

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
): EasyEyesError => {
  const hintBlob: string = offendingParameters
    .map((offenderReport) => {
      const adjustment = offenderReport.length - offenderReport.correctLength;
      const magnitude = Math.abs(adjustment);
      const verb = adjustment < 0 ? "add" : "remove";
      const noun = magnitude > 1 ? "commas" : "comma";
      const preposition = verb === "add" ? "to" : "from";
      return `•${verb} ${magnitude} ${noun} ${preposition} the <span class="error-parameter">${offenderReport.parameter}</span> row`;
    })
    .join("<br/>");
  return {
    name: "Unbalanced commas",
    message:
      "Uh oh, looks like we found an inconsistent number of commas. Each row needs to have the same number of commas, so that we can correctly read your experiment.",
    hint: `Try this:<br/>${hintBlob}`,
    kind: "error",
    context: "preprocessor",
    parameters: offendingParameters.map((value) => value.parameter),
  };
};

export const PROLIFIC_TITLE_TOO_LONG = (
  currentLength: number,
  maxLength: number,
): EasyEyesError => {
  return {
    name: `Prolific study title exceeds maximum length`,
    message: `The value for <span class="error-parameter">_online1Title</span> is ${currentLength} characters long. Prolific restricts study titles to ${maxLength} characters or less.`,
    hint: `Please shorten the title to ${maxLength} characters or less.`,
    context: "preprocessor",
    kind: "error",
    parameters: ["_online1Title"],
  };
};

export const PROLIFIC_CURRENCY_NOT_SUPPORTED = (
  currencyCode: string,
  supportedCurrencies: string[],
): EasyEyesError => {
  return {
    name: `Currency not supported by Prolific`,
    message: `<span class="error-parameter">_online2PayCurrencyCode</span> is set to <strong>${currencyCode}</strong>, but Prolific only supports ${verballyEnumerate(
      supportedCurrencies,
    )}. Prolific has no API to change your account's currency.`,
    hint: `Set <span class="error-parameter">_online2PayCurrencyCode</span> to match your Prolific account's currency (${supportedCurrencies.join(
      " or ",
    )}), and adjust <span class="error-parameter">_online2Pay</span> or <span class="error-parameter">_online2PayPerHour</span> to provide the desired compensation. Your Prolific account currency can only be changed by sending a written request to Prolific.`,
    context: "preprocessor",
    kind: "error",
    parameters: ["_online2PayCurrencyCode"],
  };
};

export const PROLIFIC_PARTICIPANT_GROUP_NOT_FOUND = (
  parameter: string,
  groupName: string,
): EasyEyesError => {
  return {
    name: `Prolific participant group not found`,
    message: `The participant group "<strong>${groupName}</strong>" specified in <span class="error-parameter">${parameter}</span> was not found in your Prolific workspace.`,
    hint: `Please create the participant group in Prolific first, or correct the group name in your experiment file. Group names are case-sensitive.`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const PROLIFIC_API_ERROR = (
  parameter: string,
  errorMessage: string,
  groupName: string,
): EasyEyesError => {
  return {
    name: `Failed to verify Prolific participant group`,
    message: `Unable to verify the participant group "<strong>${groupName}</strong>" for <span class="error-parameter">${parameter}</span>.`,
    hint: `Error: Please check your Prolific token and internet connection. ${errorMessage}.`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const LOGGING_REQUIRES_AUTHOR_EMAIL = (
  enabledLoggingParameters: string[],
): EasyEyesError => {
  const enabled = enabledLoggingParameters.map(parameter).join(", ");
  return {
    name: `Logging requires _authorEmails`,
    message: `This experiment enables logging (${enabled}), which sends reports to the Formspree server. So that we can tell who ran the experiment, any experiment that enables logging must specify the experimenter's email address in <span class="error-parameter">_authorEmails</span>. Formspree reports will be directed to that address.`,
    hint: `Add the parameter <span class="error-parameter">_authorEmails</span> with a valid email address (or several, separated by a semicolon), or disable the logging parameters.`,
    context: "preprocessor",
    kind: "error",
    parameters: ["_authorEmails", ...enabledLoggingParameters],
  };
};

export const LOGGING_CAUTION = (
  enabledLoggingParameters: string[],
  quota?: { used: number; limit: number },
): EasyEyesError => {
  const enabled = enabledLoggingParameters.map(parameter).join(", ");
  let quotaSentence = "";
  if (
    quota &&
    Number.isFinite(quota.used) &&
    Number.isFinite(quota.limit) &&
    quota.limit > 0
  ) {
    const percent = Math.round((quota.used / quota.limit) * 100);
    quotaSentence = ` So far this month we have used <strong>${quota.used.toLocaleString()}</strong> of our <strong>${quota.limit.toLocaleString()}</strong> Formspree submissions (<strong>${percent}%</strong>).`;
  }
  return {
    name: `⚠️ LOGGING CAUTION`,
    message:
      `This experiment enables one or more of the logging parameters: ${enabled}. ` +
      `These parameters cause the running experiment to log many details in the Formspree server, which you can review in Analyzer at your leisure. ` +
      `This is very helpful in tracking down the cause of an online crash, since we typically get no results after a crash. ` +
      `Be aware that our current Formspree license allows us only 20,000 submissions per month, and this quota is easily exceeded.${quotaSentence}`,
    hint: `Please enable logging only when you really need it.`,
    context: "preprocessor",
    kind: "warning",
    parameters: [...enabledLoggingParameters],
  };
};

export const INVALID_FOLDER_STRUCTURE = (
  folderName: string,
  parameter: string,
): EasyEyesError => {
  return {
    name: "Invalid folder structure",
    message: `The zip file "${folderName}" specified by ${parameter} has the wrong structure.`,
    hint: "Just zip the files, with no folder. For more help see targetSoundFolder in the Input Parameter Glossary.",
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

// TODO Too much duplicated code for similar file missing errors!
export const FONT_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): EasyEyesError => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${fileName}</li>`;
  });
  return {
    name: "Font file not found",
    message: `<ul>${htmlList}</ul><br />${parameter} not found in <b>fontSource</b> "file"`,
    hint: `Are both font source and name correct?`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const IMAGE_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): EasyEyesError => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${fileName}</li>`;
  });
  return {
    name: "Image file not found",
    message: `We could not find the following image(s) specified by ${parameter}: <br/><ul>${htmlList}</ul>`,
    hint: `Are all images uploaded? If so, make sure the names match the ones in the experiment file.`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const FONT_FILES_MISSING_WEB = (
  parameter: string,
  missingFileNameList: string[],
): EasyEyesError => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${fileName}</li>`;
  });
  return {
    name: "Font file not found",
    message: `<ul>${htmlList}</ul><br />${parameter} not found in <b>fontSource</b> "google"`,
    hint: `Are both font source and name correct? You can browse through Google Fonts (fonts.google.com) to make sure`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const ERROR_CREATING_TYPEKIT_KIT = (): EasyEyesError => {
  return {
    name: "Error creating Adobe Fonts",
    message: `We were unable to create Adobe Fonts kit. Please try again.`,
    hint: `If the problem persists, please contact the EasyEyes team.`,
    context: "preprocessor",
    kind: "error",
    parameters: [],
  };
};

export const TYPEKIT_FONT_ONLY_AVAILABLE_WITH_SUBSCRIPTION = (
  parameter: string,
  missingFontList: Record<string, { columns: string[]; blocks: number[] }>,
): EasyEyesError => {
  let htmlList = "";
  Object.keys(missingFontList).map((font: string) => {
    const fontInfo = missingFontList[font];
    const columnBlockPairs = fontInfo.columns.map(
      (column, index) => `block ${fontInfo.blocks[index]} in column ${column}`,
    );

    htmlList += `<li><b>${font}</b> (${columnBlockPairs.join(", ")})</li>`;
  });
  return {
    name: "Adobe font only available with subscription",
    message: `The following font(s) with fontSource=adobe are in Adobe Fonts, but only available to paid Creative Cloud subscribers, and you only have a free account. \n<br/><ul>${htmlList}</ul>`,
    hint: `Please subscribe to Creative Cloud to use this font. Adobe offers subscriptions here <a href="https://www.adobe.com/creativecloud/plans.html" target="_blank">https://www.adobe.com/creativecloud/plans.html</a>. \nThey offer educational discounts. \n`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const TYPEKIT_FONTS_MISSING = (
  parameter: string,
  missingFontList: Record<string, { columns: string[]; blocks: number[] }>,
): EasyEyesError => {
  let htmlList = "";
  Object.keys(missingFontList).map((font: string) => {
    const fontInfo = missingFontList[font];
    const columnBlockPairs = fontInfo.columns.map(
      (column, index) => `block ${fontInfo.blocks[index]} in column ${column}`,
    );

    htmlList += `<li><b>${font}</b> (${columnBlockPairs.join(", ")})</li>`;
  });

  return {
    name: "Adobe font not found",
    message: `We could not find the following font(s) specified by "${parameter}" with fontSource=adobe: <br/><ul>${htmlList}</ul>`,
    hint: `To discover an Adobe font's exact web name, find the font's page in <a href="https://fonts.adobe.com/" target="_blank">https://fonts.adobe.com/</a>. \n In that page's lower right corner, find "To use this font on your website". Copy the "font-family" up to the first comma. E.g. if you see font-family: proxima-nova, sans-serif; copy just "proxima-nova".`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const IMAGE_FOLDER_INVALID_NUMBER_OF_FILES = (
  parameter: string,
  folderName: string,
  conditionTrials: number,
  columnLetter: string,
): EasyEyesError => {
  return {
    name: "Image folder contains invalid number of files",
    message: `The folder "${folderName}" in column ${columnLetter} does not contain enough files to match the number of trials.`,
    hint: `When targetImageReplacementBool is "FALSE", the folder must contain at least as many files as the number of trials.`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const IMAGE_FOLDER_INVALID_NUMBER_OF_OPTIONS = (
  parameter: string,
  folderName: string,
  totalOptions: number,
  columnLetter: string,
): EasyEyesError => {
  return {
    name: "Image folder contains invalid number of files",
    message: `The folder "${folderName}" in column ${columnLetter} does not contain enough files to match the number of options.`,
    hint: `Make sure the folder contains enough files to match the targetImageExclude and targetImageFoilsExclude settings.`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const IMAGE_FOLDER_INVALID_EXTENSION_FILES = (
  parameter: string,
  folderName: string,
  columnLetter: string,
): EasyEyesError => {
  // the file does not have any files with the accepted image extensions.
  // accepted extensions: .png, .jpg,
  return {
    name: "Image folder contains invalid files",
    message: `The folder "${folderName}" in column ${columnLetter} does not contain any files with the accepted image extensions. Accepted extensions are: .png, .jpg. `,
    hint: `Please check the files and make sure they have the correct extension.`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const IMAGE_FOLDER_MISSING = (
  parameter: string,
  requestedFolder: string,
): EasyEyesError => {
  return {
    name: "Image folder is missing",
    message: `We could not find the following folder specified by ${parameter}: ${requestedFolder}`,
    hint: `Submit the folder to the drop box above ↑`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};
export const SOUND_FOLDER_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): EasyEyesError => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${fileName}</li>`;
  });
  ``;
  return {
    name: "Sound folder is missing",
    message: `We could not find the following folder(s) specified by ${parameter}: <br/><ul>${htmlList}</ul>`,
    hint: `Submit the folder(s) to the drop box above ↑`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const FORM_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): EasyEyesError => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li><b>${fileName}</b></li>`;
  });
  return {
    name: "Form file is missing",
    message: `We could not find the following file(s) specified by ${parameter}: <br/><ul>${htmlList}</ul>`,
    hint: `Submit the file(s) to the drop box above ↑`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const TEXT_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): EasyEyesError => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${fileName}</li>`;
  });
  return {
    name: "Text file is missing",
    message: `We could not find the following file(s) specified by ${parameter}: <br/><ul>${htmlList}</ul>`,
    hint: `Use the <b>Select file</b> button above to add the missing file(s). One way to do this is to drop the file(s) onto the button.`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const CODE_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): EasyEyesError => {
  let htmlList = "";
  missingFileNameList
    .map((fileName: string) => {
      htmlList += `<li>${fileName}</li>`;
    })
    .join("");
  return {
    name: "JavaScript code file is missing",
    message: `We could not find the following file(s) specified by ${parameter}: <br/><ul>${htmlList}</ul>`,
    hint: `Submit the file(s) to the drop box above ↑`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

// TODO create type to match report object structure

export const NO_BLOCK_PARAMETER: EasyEyesError = {
  name: "Parameter is not present",
  message: `We weren't able to find a parameter named <span class="error-parameter">block</span>. This parameter is required, as it tells us how to organize your study.`,
  hint: `Be sure to include a <span class="error-parameter">block</span>block parameter in your experiment file. The values should be increasing from 1 (or 0, if <span class="error-parameter">zeroBasedNumberingBool</span> is set to true). Each condition, ie column, needs one block number, but a block can have any number of conditions.`,
  context: "preprocessor",
  kind: "error",
  parameters: ["block"],
};

export const INVALID_STARTING_BLOCK = (
  actualStartingValue: string,
): EasyEyesError => {
  return {
    name: "Invalid initial value",
    message: `The first value in your <span class="error-parameter">block</span> row isn't correct; it is <em>${actualStartingValue}</em>, when it ought to be <em>1</em>.`,
    hint: `Change your <span class="error-parameter">block</span> row to start with 1, with each subsequent value either the same &#8212 or one larger &#8212 than the previous.`,
    context: "preprocessor",
    kind: "error",
    parameters: ["block"],
  };
};

export const EMPTY_BLOCK_VALUES = (
  emptyValueConditions: number[],
): EasyEyesError => {
  const offendingConditionLabels = emptyValueConditions.map((i) =>
    conditionIndexToColumnName(i),
  );
  const plural = offendingConditionLabels.length > 1 ? true : false;
  const offendingConditionsString = verballyEnumerate(offendingConditionLabels);
  return {
    name: `${_param("block")} value is empty`,
    message: `A valid ${_param(
      "block",
    )} value must be provided for every condition.`,
    hint: `Check column${plural ? "s" : ""} ${offendingConditionsString}`,
    context: "preprocessor",
    kind: "error",
    parameters: ["block"],
  };
};

export const NONSEQUENTIAL_BLOCK_VALUE = (
  nonsequentials: { value: number; previous: number; index: number }[],
  blockValues: string[],
): EasyEyesError => {
  // let problemStatement: string;
  const illustratedValues =
    '<span class="error-parameter">' +
    blockValues
      .map((value, i) => {
        const improperValue: boolean = nonsequentials.some(
          (nonsequential) => nonsequential.index === i,
        );
        if (!improperValue) return String(value);
        return `<span style="color: #e02401;">${String(value)}</span>`;
      })
      .join(",") +
    "</span>";
  const nonsequentialIndicies: string[] = nonsequentials.map(
    (nonsequential) => {
      const suffix = getNumericalSuffix(nonsequential.index + 1);
      return `${nonsequential.index + 1}${suffix}`;
    },
  );
  const plural = nonsequentials.length > 1;
  const hintBlob = `<span class="error-parameter">block,${illustratedValues}</span><br/>
                    The ${verballyEnumerate(nonsequentialIndicies)} value${
                      plural ? "s are" : " is"
                    } nonsequential.`;
  return {
    name: `Nonsequential value${plural ? "s" : ""}`,
    message: `Looks like we've got ${
      plural ? "some" : "a"
    } nonsequential value${
      plural ? "s" : ""
    }. Each value should either be the same as the previous, or 1 larger.`,
    hint: hintBlob,
    context: "preprocessor",
    kind: "error",
    parameters: ["block"],
  };
};
/**
 * The glossary default of fontPixiMetricsString is a comma-separated list of
 * (language, metrics string) pairs. Only the languages are checked; a metrics
 * string can be anything without a comma.
 */
export const IMPROPER_GLOSSARY_FONT_PIXI_METRICS_STRING_DEFAULT = (
  unrecognizedLanguages: string[],
  unpairedLanguage: string | null,
): EasyEyesError => {
  const faults: string[] = [];
  if (unrecognizedLanguages.length) {
    const plural = unrecognizedLanguages.length > 1;
    faults.push(
      `${verballyEnumerate(
        unrecognizedLanguages.map((language) => `'${language}'`),
      )} ${
        plural ? "are not languages" : "is not a language"
      } that fontLanguage accepts`,
    );
  }
  if (unpairedLanguage !== null)
    faults.push(`'${unpairedLanguage}' has no metrics string after it`);
  return {
    name: `Default of fontPixiMetricsString in glossary is improper`,
    message: `The glossary's <span class="error-parameter">fontPixiMetricsString</span> default must be a comma-separated list of language and metrics-string pairs, e.g. "ar, ٱغ, ja, 高黒", naming the default metrics string for each fontLanguage. ${verballyEnumerate(
      faults,
    )}. Please contact the EasyEyes team.`,
    hint: "",
    context: "preprocessor",
    kind: "error",
    parameters: ["fontPixiMetricsString"],
  };
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
}): EasyEyesError => {
  const charsNeeded = Math.round(
    (o.requestedPages - 0.9) * o.lineLength * o.linesPerPage,
  );
  return {
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
    } characters in corpus ${
      o.corpusFile
    }. Set readingPages=-1 to read the whole corpus, however many pages that takes. (column ${blockIndexToColumnLabel(
      o.condition,
    )})`,
    context: "preprocessor",
    kind: "error",
    parameters: ["readingCorpus", "readingPages"],
  };
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
}): EasyEyesError => {
  const supply = o.uniqueWords - o.unavailableWords;
  const cumulative = o.cumulativeExclusions ?? 0;
  const cumulativeClause = cumulative
    ? ` ${cumulative} of the unavailable words were consumed as targets/foils by earlier conditions (per ${_param(
        "readingCorpusFoilsExclude",
      )}).`
    : "";
  return {
    name: `Reading corpus has too few unique words for foils`,
    message: `The reading corpus cannot supply enough foil words for the comprehension questions, which would crash the experiment after the reading.`,
    hint: `Foils must be unique words (2+ letters) that were NOT displayed in the passage. With ${_param(
      "readingNumberOfQuestions",
    )} = ${o.numberOfQuestions} and ${_param(
      "readingNumberOfPossibleAnswers",
    )} = ${o.numberOfAnswers}, that requires ${o.numberOfQuestions} × ${
      o.numberOfAnswers - 1
    } = ${o.foilsNeeded} foils, but corpus ${o.corpusFile} has only ${
      o.uniqueWords
    } unique words, of which about ${
      o.unavailableWords
    } are displayed, used as answers, or consumed by earlier conditions, leaving only ${supply}.${cumulativeClause} Use a larger corpus, or reduce ${_param(
      "readingNumberOfQuestions",
    )} or ${_param(
      "readingNumberOfPossibleAnswers",
    )}. (column ${blockIndexToColumnLabel(o.condition)})`,
    context: "preprocessor",
    kind: "error",
    parameters: [
      "readingCorpus",
      "readingNumberOfQuestions",
      "readingNumberOfPossibleAnswers",
      ...(cumulative ? ["readingCorpusFoilsExclude"] : []),
    ],
  };
};

export const IMPULSE_RESPONSE_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): EasyEyesError => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${fileName}</li>`;
  });
  return {
    name: "Impulse response file is missing",
    message: `We could not find the following impulse response file(s) specified by ${parameter}: <br/><ul>${htmlList}</ul>`,
    hint: `Submit the file(s) to the drop box above ↑`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const IMPULSE_RESPONSE_FILE_INVALID_FORMAT = (
  fileName: string,
  reason: string,
): EasyEyesError => {
  return {
    name: "Invalid impulse response file format",
    message: `The impulse response file "${fileName}" has an invalid format: ${reason}`,
    hint: `Make sure the file includes two columns named "time" and "amplitude" with values in all rows.`,
    context: "preprocessor",
    kind: "error",
    parameters: [fileName],
  };
};

export const FREQUENCY_RESPONSE_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
): EasyEyesError => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${fileName}</li>`;
  });
  return {
    name: "Frequency response file is missing",
    message: `We could not find the following frequency response file(s) specified by ${parameter}: <br/><ul>${htmlList}</ul>`,
    hint: `Submit the file(s) to the drop box above ↑`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const FREQUENCY_RESPONSE_FILE_INVALID_FORMAT = (
  fileName: string,
  reason: string,
): EasyEyesError => {
  return {
    name: "Invalid frequency response file format",
    message: `The frequency response file "${fileName}" has an invalid format: ${reason}`,
    hint: "Frequency response files must end with .gainVFreq.xlsx or .gainVFreq.csv and contain 'frequency' and 'gain' columns.",
    context: "preprocessor",
    kind: "error",
    parameters: [
      "_calibrateSoundSimulateLoudspeaker",
      "_calibrateSoundSimulateMicrophone",
    ],
  };
};

export const TARGET_SOUND_LIST_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[],
  columns: string[],
): EasyEyesError => {
  let htmlList = "";
  missingFileNameList.map((fileName: string, index: number) => {
    htmlList += `<li>${fileName} in column ${columns[index]}</li>`;
  });
  return {
    name: "Target sound list file is missing",
    message: `We could not find the following target sound list file(s) specified by ${parameter}: <br/><ul>${htmlList}</ul>`,
    hint: `Submit the file(s) to the drop box above ↑`,
    context: "preprocessor",
    kind: "error",
    parameters: ["targetSoundList"],
  };
};

export const TARGET_SOUND_LIST_FILE_INVALID_FORMAT = (
  fileName: string,
  reason: string,
): EasyEyesError => {
  return {
    name: "Invalid target sound list file format",
    message: `The target sound list file "${fileName}" has an invalid format: ${reason}`,
    hint: "Target sound list files must end with .targetSoundList.xlsx or .targetSoundList.csv and contain 'targetSound' and 'targetSoundList' columns.",
    context: "preprocessor",
    kind: "error",
    parameters: ["targetSoundList"],
  };
};

const _param = (parameterName: string): string =>
  `<span class="error-parameter">${parameterName}</span>`;

const FONT_GAUNTLET_HINT = `<a href="https://fontgauntlet.com/" target="_blank" rel="noopener">Dinamo Font Gauntlet</a> reports and demonstrates your variable font's axes of variation, and the range and default of each axis.`;

export const GOOGLE_FONT_VARIABLE_SETTINGS_INVALID = (
  fontName: string,
  settings: string,
  offendingConditions: number[],
  hasLowercaseCustomAxis: boolean = false,
): EasyEyesError => {
  const plural = offendingConditions.length > 1;
  const offendingString = `Check column${plural ? "s" : ""} ${verballyEnumerate(
    offendingConditions.map((i) => conditionIndexToColumnName(i)),
  )}`;
  const customAxisHint = hasLowercaseCustomAxis
    ? ' Note: Custom axes (non-standard axes like YEAR, GRAD) must be uppercase in Google Fonts. If you used a lowercase custom axis name, try uppercase (e.g., "YEAR" instead of "year").'
    : "";
  return {
    name: "Invalid fontVariableSettings for Google Font",
    message: `Invalid fontVariableSettings "${settings}" for Google Font "${fontName}". The axis value may be out of range.${customAxisHint}`,
    hint: `${offendingString}. ${FONT_GAUNTLET_HINT}`,
    context: "preprocessor",
    kind: "error",
    parameters: ["fontVariableSettings", "font"],
  };
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
): EasyEyesError => {
  const plural = offendingConditions.length > 1;
  const offendingString = `Check column${plural ? "s" : ""} ${verballyEnumerate(
    offendingConditions.map((i) => conditionIndexToColumnName(i)),
  )}`;
  return {
    name: `Font is not variable`,
    message: `The font "${fontName}" is not a variable font, but ${_param(
      "fontVariableSettings",
    )} was specified.`,
    hint: `${offendingString}. ${FONT_GAUNTLET_HINT}`,
    context: "preprocessor",
    kind: "error",
    parameters: ["fontVariableSettings", "font"],
  };
};

const SHAPERGLOT_HINT = `The EasyEyes compiler uses Google's ShaperGlot to evaluate your font's language support. To read about ShaperGlot, see the readme here: <a href="https://github.com/googlefonts/shaperglot" target="_blank" rel="noopener">https://github.com/googlefonts/shaperglot</a><br>We recommend asking ShaperGlot directly to get a full report of your font's language support. Just drop your font on SuperGlot's home page: <a href="https://googlefonts.github.io/shaperglot/" target="_blank" rel="noopener">https://googlefonts.github.io/shaperglot/</a><br>The online ShaperGlot only accepts desktop fonts (.TTF or .OTF). If your font license allows it, you can use any of several free online services (Convertio, CloudConvert, or FreeConvert) to convert your web-format font (.WOFF or WOFF2) to a desktop format (.TTF or .OTF) that ShaperGlot will accept.`;

export const FONT_SHAPING_TABLE_REJECTED = (
  fontName: string,
  rejectedTables: string[],
  offendingConditions: number[],
): EasyEyesError => {
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
  return {
    name: `Font has malformed OpenType layout table${tablesPlural ? "s" : ""}`,
    message: `The font "${fontName}" contains ${
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
    }, add "${toleranceValues.join(
      ", ",
    )}" to <b>fontTolerateFaults</b> for the affected condition${
      plural ? "s" : ""
    }. Add "all" to tolerate every font fault.<br><br>${SHAPERGLOT_HINT}`,
    context: "preprocessor",
    kind: "error",
    parameters: ["font", "fontTolerateFaults", "_needBrowser"],
  };
};

export const FONT_WRONG_LANGUAGE = (
  fontName: string,
  fontLanguage: string,
  shaperglotLanguageId: string,
  summary: string,
  problems: string[],
  offendingConditions: number[],
): EasyEyesError => {
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
  return {
    name: "Font lacks support for its fontLanguage",
    message: `The font "${fontName}" does not support the language fontLanguage="${fontLanguage}" (${shaperglotLanguageId}).${problemDetail}`,
    hint: `${offendingString}Choose a font that supports fontLanguage="${fontLanguage}", or add "wrongLanguage" to <b>fontTolerateFaults</b> for the affected condition${
      plural ? "s" : ""
    } to tolerate the font's incomplete language support.<br><br>${SHAPERGLOT_HINT}`,
    context: "preprocessor",
    kind: "error",
    parameters: ["font", "fontTolerateFaults", "fontLanguage"],
  };
};

export const FONT_READING_CORPUS_CHARACTERS_MISSING = (
  fontName: string,
  corpusName: string,
  missingSample: string,
  missingCount: number,
  offendingConditions: number[],
): EasyEyesError => {
  const plural = offendingConditions.length > 1;
  const offendingString =
    offendingConditions.length > 0
      ? `Check column${plural ? "s" : ""} ${verballyEnumerate(
          offendingConditions.map((i) => conditionIndexToColumnName(i)),
        )}. `
      : "";
  return {
    name: "Font missing reading corpus characters",
    message: `The font "${fontName}" is missing ${missingCount} character${
      missingCount === 1 ? "" : "s"
    } required by readingCorpus "${corpusName}" (for example: ${missingSample}).`,
    hint: `${offendingString}Choose a font that covers every character in the reading corpus, or change readingCorpus or font for the affected condition${
      plural ? "s" : ""
    }. To use this font anyway, e.g. to debug a study in a language you can't read, add "missingCharacters" to <b>fontTolerateFaults</b> for the affected condition${
      plural ? "s" : ""
    }; the missing characters will then render as empty boxes. Add "all" to tolerate every font fault. Note that "wrongLanguage" tolerates only incomplete support for fontLanguage, which is a separate check, and won't silence this one.`,
    context: "preprocessor",
    kind: "error",
    parameters: ["font", "readingCorpus", "fontTolerateFaults"],
  };
};

/**
 * Format available axes information as a string for error messages
 */
const formatAvailableAxesString = (availableAxes: FontAxisInfo[]): string => {
  return availableAxes.length > 0
    ? availableAxes
        .map((a) => `"${a.tag}" (${a.min} to ${a.max}, default: ${a.default})`)
        .join(", ")
    : "none";
};

export const FONT_AXIS_NOT_FOUND = (
  fontName: string,
  missingAxes: string[],
  availableAxes: FontAxisInfo[],
  offendingConditions: number[],
): EasyEyesError => {
  const plural = offendingConditions.length > 1;
  const axesPlural = missingAxes.length > 1;
  const offendingString = `Check column${plural ? "s" : ""} ${verballyEnumerate(
    offendingConditions.map((i) => conditionIndexToColumnName(i)),
  )}`;
  const availableAxesString = formatAvailableAxesString(availableAxes);
  return {
    name: `Font axis not found`,
    message: `The font "${fontName}" does not have the requested ax${
      axesPlural ? "es" : "is"
    }: ${verballyEnumerate(
      missingAxes.map((a) => `"${a}"`),
    )}. Available axes: ${availableAxesString}.`,
    hint: `${offendingString}. ${FONT_GAUNTLET_HINT}`,
    context: "preprocessor",
    kind: "error",
    parameters: ["fontVariableSettings", "font"],
  };
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
): EasyEyesError => {
  const plural = offendingConditions.length > 1;
  const offendingString = `Check column${plural ? "s" : ""} ${verballyEnumerate(
    offendingConditions.map((i) => conditionIndexToColumnName(i)),
  )}`;
  const errorDetails = axisErrors
    .map(
      (e) =>
        `"${e.axis}" value ${e.value} is outside allowed range ${e.min} to ${e.max} (default: ${e.default})`,
    )
    .join("; ");
  const availableAxesString = formatAvailableAxesString(availableAxes);
  return {
    name: `Font axis value out of range`,
    message: `The font "${fontName}" has axis values out of range: ${errorDetails}. Available axes: ${availableAxesString}.`,
    hint: `${offendingString}. ${FONT_GAUNTLET_HINT}`,
    context: "preprocessor",
    kind: "error",
    parameters: ["fontVariableSettings", "font"],
  };
};

export const FONT_WEIGHT_NOT_VARIABLE = (
  fontName: string,
  offendingConditions: number[],
): EasyEyesError => {
  const plural = offendingConditions.length > 1;
  const offendingString = `Check column${plural ? "s" : ""} ${verballyEnumerate(
    offendingConditions.map((i) => conditionIndexToColumnName(i)),
  )}`;
  return {
    name: `Font is not variable`,
    message: `The font "${fontName}" is not a variable font, but ${_param(
      "fontWeight",
    )} was specified.`,
    hint: `${offendingString}. ${FONT_GAUNTLET_HINT}`,
    context: "preprocessor",
    kind: "error",
    parameters: ["fontWeight", "font"],
  };
};

export const FONT_WEIGHT_MISSING_WGHT_AXIS = (
  fontName: string,
  availableAxes: FontAxisInfo[],
  offendingConditions: number[],
): EasyEyesError => {
  const plural = offendingConditions.length > 1;
  const offendingString = `Check column${plural ? "s" : ""} ${verballyEnumerate(
    offendingConditions.map((i) => conditionIndexToColumnName(i)),
  )}`;
  const availableAxesString =
    availableAxes.length > 0
      ? availableAxes
          .map(
            (a) => `"${a.tag}" (${a.min} to ${a.max}, default: ${a.default})`,
          )
          .join(", ")
      : "none";
  return {
    name: `Font missing wght axis`,
    message: `The font "${fontName}" does not have a "wght" axis, but ${_param(
      "fontWeight",
    )} was specified. Available axes: ${availableAxesString}.`,
    hint: `${offendingString}. ${FONT_GAUNTLET_HINT}`,
    context: "preprocessor",
    kind: "error",
    parameters: ["fontWeight", "font"],
  };
};

export const FONT_WEIGHT_OUT_OF_RANGE = (
  fontName: string,
  value: number,
  min: number,
  max: number,
  defaultValue: number,
  offendingConditions: number[],
): EasyEyesError => {
  const plural = offendingConditions.length > 1;
  const offendingString = `Check column${plural ? "s" : ""} ${verballyEnumerate(
    offendingConditions.map((i) => conditionIndexToColumnName(i)),
  )}`;
  return {
    name: `fontWeight value out of range`,
    message: `The font "${fontName}" has ${_param(
      "fontWeight",
    )} value ${value} outside the allowed range ${min} to ${max} (default: ${defaultValue}).`,
    hint: `${offendingString}. ${FONT_GAUNTLET_HINT}`,
    context: "preprocessor",
    kind: "error",
    parameters: ["fontWeight", "font"],
  };
};

export const PHRASE_FILE_MISSING = (
  parameter: string,
  filename: string,
): EasyEyesError => {
  return {
    name: "Phrase file is missing",
    message: `We could not find the phrase file <b>${filename}</b> specified by ${parameter}. Submit the file to the drop box above ↑`,
    hint: `Make sure the filename in ${parameter} matches the uploaded file exactly.`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const TILDE_WITHOUT_PHRASE_TABLE = (
  paramName: string,
  cell: string,
): EasyEyesError => {
  return {
    name: "Tilde value requires phrase table",
    message: `The value <strong>${cell}</strong> in parameter <span class="error-parameter">${paramName}</span> uses a tilde prefix, but <span class="error-parameter">_languagePhrasesSpreadsheet</span> is not set.`,
    hint: `Set <span class="error-parameter">_languagePhrasesSpreadsheet</span> to the name of a phrase file and upload that file, or remove the tilde-prefixed value.`,
    context: "preprocessor",
    kind: "error",
    parameters: [paramName, "_languagePhrasesSpreadsheet"],
  };
};

export const TILDE_SYMBOL_NOT_FOUND = (
  paramName: string,
  cell: string,
): EasyEyesError => {
  return {
    name: "Tilde symbol not found in phrase table",
    message: `The symbol <strong>${cell}</strong> in parameter <span class="error-parameter">${paramName}</span> was not found in the phrase table.`,
    hint: `Make sure the phrase file contains a row whose first column matches <strong>${cell}</strong> (case-insensitive).`,
    context: "preprocessor",
    kind: "error",
    parameters: [paramName],
  };
};

export const TILDE_LANGUAGE_NOT_IN_TABLE = (
  paramName: string,
  cell: string,
  languageCode: string,
): EasyEyesError => {
  return {
    name: "Language not in phrase table",
    message: `The language code <strong>${languageCode}</strong> has no column in the phrase table. Encountered while resolving <strong>${cell}</strong> in parameter <span class="error-parameter">${paramName}</span>.`,
    hint: `Make sure the phrase file includes a column for language code <strong>${languageCode}</strong>.`,
    context: "preprocessor",
    kind: "error",
    parameters: [paramName, "_language"],
  };
};

export const TILDE_RESOLVED_BLANK = (
  paramName: string,
  cell: string,
  languageCode: string,
): EasyEyesError => {
  return {
    name: "Tilde resolved to blank",
    message: `The symbol <strong>${cell}</strong> in parameter <span class="error-parameter">${paramName}</span> resolved to a blank string for language <strong>${languageCode}</strong>.`,
    hint: `Add a non-empty translation for <strong>${cell}</strong> and language <strong>${languageCode}</strong> in the phrase file, or remove the tilde value.`,
    context: "preprocessor",
    kind: "error",
    parameters: [paramName],
  };
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
): EasyEyesError => {
  const hintBlob = warnings
    .map((w) => {
      const col = blockIndexToColumnLabel(Number(w.block));
      // Ligature-keyword warnings show the keyword the experimenter typed
      // (they never wrote the raw tag).
      const subject = w.keyword ? `${w.keyword} ("${w.tag}")` : `"${w.tag}"`;
      switch (w.kind) {
        case "not-in-font":
          return `• ${subject} not found in font "${w.fontName}" [column ${col}]`;
        case "empty-lookups":
          return `• ${subject} exists in "${w.fontName}" but has no lookups [column ${col}]`;
        case "empty-subtables":
          return `• ${subject} in "${w.fontName}" references an empty lookup [column ${col}]`;
        case "has-alternate":
          return `• ${subject} in "${w.fontName}" uses alternate substitution — the first alternate will be used [column ${col}]`;
        default:
          return `• ${subject} [column ${col}]`;
      }
    })
    .join("<br/>");
  return {
    name: `Font feature compatibility`,
    message: `One or more requested features may not work as expected with the specified font.`,
    hint: hintBlob,
    context: "preprocessor",
    kind: "error",
    parameters: [...new Set(warnings.map((w) => w.param))],
  };
};
