/* eslint-disable @typescript-eslint/no-explicit-any */
import { GLOSSARY } from "../parameters/glossary";
import { getNumericalSuffix, verballyEnumerate } from "./utils";

export interface EasyEyesError {
  name: string;
  message: string;
  hint: string;
  context: string;
  kind: "error" | "warning" | "correct";
  parameters: string[];
}

export const UNBALANCED_COMMAS = (
  offendingParameters: {
    parameter: string;
    length: number;
    correctLength: number;
  }[]
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

export const ILL_FORMED_UNDERSCORE_PARAM = (
  parameter: string
): EasyEyesError => {
  return {
    name: `_Underscore parameter incorrectly formatted`,
    message: `Experiment-scope parameters, such as <span class="error-parameter">${parameter}</span>, start with an underscore and require exactly one value, as they don't vary across conditions.`,
    hint: `Make sure that you give <span class="error-parameter">${parameter}</span> a value for only the first column.`,
    kind: "error",
    context: "preprocessor",
    parameters: [parameter],
  };
};
export const INCORRECT_PARAMETER_TYPE = (
  offendingValues: { value: string; block: number }[],
  parameter: string,
  correctType:
    | "integer"
    | "numerical"
    | "text"
    | "boolean"
    | "categorical"
    | "multicategorical",
  categories?: string[]
): EasyEyesError => {
  const offendingMessage = offendingValues.map(
    (offending) =>
      ` "${offending.value}" [column ${Number(offending.block) + 1}]`
  );
  let message = `All values for the parameter <span class="error-parameter">${parameter}</span> must be ${correctType}.`;
  if (categories) {
    message = message + ` Valid categories are: ${categories.join(", ")}.`;
  }
  return {
    name: `Parameter contains values of the wrong type`,
    message: message,
    hint: `The erroneous values are: ${offendingMessage}.`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const EXPERIMENT_FILE_NOT_FOUND = (): EasyEyesError => {
  return {
    name: "Unable to identify experiment file",
    context: `preprocessor`,
    message: `Sorry, we weren't able to find an csv file, e.g., "experiment.csv", in the files that you provided. This file is required, as it defines your entire experiment -- we can't make your movie without your don't provide a screenplay.`,
    hint: `Make sure you include exactly one ".csv" file among the files you upload. This file should be in row-major order, ie one row representing each parameter, and should follow the specification laid out in the EasyEyes Threshold Glossary.`,
    kind: "error",
    parameters: ["FILE"],
  };
};

export const NO_CSV_FILE_FOUND: EasyEyesError = {
  name: "No CSV files provided",
  message:
    "When looking for an experiment file, we couldn't even find one .csv file as a candidate.",
  hint: `Make sure you provide a file with the ".csv" extension amongst your files &#8212 this file will be used as your experiment specification.`,
  context: "preprocessor",
  kind: "error",
  parameters: ["FILE"],
};

export const TOO_MANY_CSV_FILES_FOUND: EasyEyesError = {
  name: "Multiple CSV files provided",
  message:
    "When looking for an experiment file, we found more than one .csv file, and we don't know which one to pick!",
  hint: `Make sure you provide a file with the ".csv" extension amongst your files &#8212 this file will be used as your experiment specification.`,
  context: "preprocessor",
  kind: "error",
  parameters: ["FILE"],
};

export const INVALID_FOLDER_STRUCTURE = (
  folderName: string,
  parameter: string
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
  missingFileNameList: string[]
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

export const FONT_FILES_MISSING_WEB = (
  parameter: string,
  missingFileNameList: string[]
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

export const SOUND_FOLDER_MISSING = (
  parameter: string,
  missingFileNameList: string[]
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
  missingFileNameList: string[]
): EasyEyesError => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${fileName}</li>`;
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
  missingFileNameList: string[]
): EasyEyesError => {
  let htmlList = "";
  missingFileNameList.map((fileName: string) => {
    htmlList += `<li>${fileName}</li>`;
  });
  return {
    name: "Text file is missing",
    message: `We could not find the following file(s) specified by ${parameter}: <br/><ul>${htmlList}</ul>`,
    hint: `Submit the file(s) to the drop box above ↑`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const CODE_FILES_MISSING = (
  parameter: string,
  missingFileNameList: string[]
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

export const PARAMETERS_NOT_ALPHABETICAL = (
  firstOffendingParameter: string
): EasyEyesError => {
  return {
    name: "Parameters aren't alphabetical",
    message:
      "Uh oh! Looks like your parameters are out of order. Keeping everything alphabetical will make working with your experiment file easier.",
    hint: `Sort your parameters into alphabetical order. Try starting with <span class="error-parameter">${firstOffendingParameter}</span> &#8212 that's the first misplaced parameter we found.`,
    context: "preprocessor",
    kind: "error",
    parameters: [firstOffendingParameter],
  };
};

export const DUPLICATE_PARAMETER = (parameter: string): EasyEyesError => {
  return {
    name: `Parameter is duplicated`,
    message: `The parameter <span class="error-parameter">${parameter}</span> appears more than once! Unintended behavior lurks ahead...`,
    hint: `Each parameter may only be set once per experiment file, so there's no abiguity in which value to use.`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

// TODO create type to match report object structure
export const UNRECOGNIZED_PARAMETER = (report: any): EasyEyesError => {
  return {
    name: `Parameter is unrecognized`,
    message: `Sorry, we couldn't recognize the parameter <span class="error-parameter">${report.name}</span>. The closest supported parameter is <span class="error-parameter">${report.closest[0]}</span> &#8212 is that what you meant?`,
    hint: `The other closest supported parameters found were <span class="error-parameter">${report.closest[1]}</span> and <span class="error-parameter">${report.closest[2]}</span>. All parameters are case-sensitive.`,
    context: "preprocessor",
    kind: "error",
    parameters: [report.name],
  };
};

export const NOT_YET_SUPPORTED_PARAMETER = (
  parameter: string
): EasyEyesError => {
  return {
    name: `Parameter is not yet supported`,
    message: `Apologies from the EasyEyes team! The parameter <span class="error-parameter">${parameter}</span> isn't supported yet. We hope to implement the parameter ${GLOSSARY[parameter]?.availability}.`,
    hint: `Unfortunately, you won't be able to use this parameter at this time. Please, try again later. If the parameter is important to you, we'd encourage you to reach out to the <a href="mailto:easyeyes.team@gmail.com?subject=Please add support for ${parameter}.">EasyEyes team</a>.`,
    context: "preprocessor",
    kind: "error",
    parameters: [parameter],
  };
};

export const NO_BLOCK_PARAMETER: EasyEyesError = {
  name: "Parameter is not present.",
  message: `We weren't able to find a parameter named <span class="error-parameter">block</span>. This parameter is required, as it tells us how to organize your study.`,
  hint: `Be sure to include a <span class="error-parameter">block</span>block parameter in your experiment file. The values should be increasing from 1 (or 0, if <span class="error-parameter">zeroBasedNumberingBool</span> is set to true). Each condition, ie column, needs one block number, but a block can have any number of conditions.`,
  context: "preprocessor",
  kind: "error",
  parameters: ["block"],
};

export const INVALID_STARTING_BLOCK = (
  actualStartingValue: number,
  correctStartingValue: 0 | 1
): EasyEyesError => {
  const zeroBasedNumberingBool = correctStartingValue ? false : true;
  const complementaryStart = correctStartingValue ? 0 : 1;
  return {
    name: "Invalid initial value",
    message: `The first value in your <span class="error-parameter">block</span> row isn't correct; it is <em>${actualStartingValue}</em>, when it ought to be <em>${correctStartingValue}</em>.`,
    hint: `Change your <span class="error-parameter">block</span> row to start with ${correctStartingValue}, with each value either the same &#8212 or one larger &#8212 than the previous. If you'd like the blocks to start from ${complementaryStart} instead, set <span class="error-parameter">_zeroBasedNumberingBool</span> to ${!zeroBasedNumberingBool}.`,
    context: "preprocessor",
    kind: "error",
    parameters: ["block"],
  };
};

export const NONSEQUENTIAL_BLOCK_VALUE = (
  nonsequentials: { value: number; previous: number; index: number }[],
  blockValues: number[]
): EasyEyesError => {
  // let problemStatement: string;
  const illustratedValues =
    '<span class="error-parameter">' +
    blockValues
      .map((value, i) => {
        const improperValue: boolean = nonsequentials.some(
          (nonsequential) => nonsequential.index === i
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
    }
  );
  const plural = nonsequentials.length > 1;
  const hintBlob = `<span class="error-parameter">block,${illustratedValues}</span><br/>
                    The ${verballyEnumerate(nonsequentialIndicies)} value${
    plural ? "s are" : " is"
  } nonsequential, as highlighted in 
                    <span style="color: #e02401;">red</span>.`;
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

export const NO_RESPONSE_POSSIBLE = (
  conditionsLacking: number[] = [],
  zeroIndexed = false,
  totalNumberOfConditions = 0
): EasyEyesError => {
  const startingCondition = zeroIndexed ? 0 : 1;
  const plural = conditionsLacking.length > 1 ? "s" : "";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const whereNotPermitted =
    conditionsLacking.length &&
    conditionsLacking.length !== totalNumberOfConditions
      ? `the ${verballyEnumerate(
          conditionsLacking.map(
            (x) =>
              String(x + startingCondition) +
              getNumericalSuffix(x + startingCondition)
          )
        )} condition${plural}.`
      : `any condition.`;
  // const hintBlob = `If you intend to collect data from participant, make sure that, in each condition, at least one of <span class="error-parameter">responseClickedBool</span>, <span class="error-parameter">responseTypedBool</span>, or <span class="error-parameter">responseEasyEyesKeypadBool</span> is true. If you'd like to simulate a participant, set <span class="error-parameter">simulateParticipantBool</span> to true instead. In your case, no response modality was permitted in ${whereNotPermitted}`;
  return {
    name: "Experiment lacks any response",
    message:
      "At the moment, your experiment doesn't allow any response to the stimulus, so the test would wait forever. Whether it's a simulated response or the participant typing, clicking, or tapping (their phone), the test needs some kind of response.",
    hint: "",
    context: "preprocessor",
    kind: "error",
    parameters: [
      "responseClickedBool",
      "responseTypedBool",
      "responseTypedEasyEyesKeypadBool",
      "simulateParticipantBool",
    ],
  };
};

export const NONUNIQUE_WITHIN_BLOCK = (
  offendingParameter: string,
  offendingBlocks: string[]
): EasyEyesError => {
  const multiple = offendingBlocks.length > 1;
  return {
    name: "Values are not unique within blocks",
    message: `This parameter requires that all conditions within a block have the same value. Block${
      multiple ? "s" : ""
    } ${verballyEnumerate(offendingBlocks)} request${
      multiple ? "" : "s"
    } different values.`,
    hint: "",
    context: "preprocessor",
    kind: "error",
    parameters: [offendingParameter],
  };
};
