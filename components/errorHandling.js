import { util } from "../psychojs/src/index.js";
import {
  status,
  thisExperimentInfo,
  websiteRepoLastCommitDeploy,
} from "./global.js";
import { psychoJS } from "./globalPsychoJS.js";
import { quitPsychoJS } from "./lifetime.js";
import { showCursor } from "./utils.js";

// ! EXPERIMENTAL
// https://stackoverflow.com/a/73956189
// console.warn(
//   "[EasyEyesPromise] Customized Promise used. This affects the performance and cause errors."
// );
// window.Promise = class EasyEyesPromise extends Promise {
//   constructor() {
//     super(...arguments);
//     this.__creationPoint = new Error().stack;
//   }
// };

const getFormattedTime = (date) => {
  const timeStr = date.toLocaleTimeString("en-US", {
    hour12: true,
    hour: "numeric",
    minute: "numeric",
  });

  // Get UTC offset in minutes and convert to hours
  const offsetMinutes = date.getTimezoneOffset();
  const offsetHours = -offsetMinutes / 60; // Note: getTimezoneOffset() returns inverse of what we want
  const offsetSign = offsetHours >= 0 ? "+" : "";

  return `UTC${offsetSign}${offsetHours}`;
};

export const buildWindowErrorHandling = (paramReader) => {
  window.onerror = (message, source, lineno, colno, error) => {
    console.log("onerror");
    showCursor();

    let errorReport = error;

    try {
      const BC = status.block_condition;
      let condition = "";
      if (status.block_condition) {
        condition = status.block_condition.split("_")[1];
      }
      const text =
        "<br>block: " +
        status.block +
        ", condition: " +
        condition +
        ", trial: " +
        status.trial +
        "<br>" +
        "conditionName: " +
        paramReader.read("conditionName", BC) +
        "<br>" +
        "experiment: " +
        thisExperimentInfo.experiment +
        "<br>";

      errorReport.error += text;
    } catch (e) {
      console.error(
        "Error when trying to add block, condition information to error message: " +
          e,
      );
    }

    try {
      const commit = websiteRepoLastCommitDeploy.current;
      if (commit !== undefined) {
        const time =
          new Date(commit).toLocaleDateString(undefined, {
            dateStyle: "medium",
          }) +
          " " +
          new Date(commit).toLocaleString(undefined, {
            timeStyle: "short",
          }) +
          " " +
          getFormattedTime(new Date());
        errorReport.error += `<br> Compiler updated ${time}<br>`;
      }
    } catch (e) {
      console.error(
        "Error when trying to add compiler updated date information to error message: " +
          e,
      );
    }

    const errorMessage = JSON.stringify({
      message: message,
      source: source,
      lineno: lineno,
      colno: colno,
      error: errorReport,
    });

    // save data
    console.error(error);
    try {
      psychoJS.experiment.addData("error", errorMessage);
      psychoJS.experiment.nextEntry(); // save early
      psychoJS.experiment.save();
    } catch (e) {
      console.error("Error when trying to save error message: " + e);
    }

    // psychoJS default behavior
    document.body.setAttribute("data-error", errorMessage);

    // quit with message
    psychoJS._gui.dialog({ error: error, addErrorToPsychoJS: false });
    setTimeout(() => {
      quitPsychoJS("", false, paramReader);
    }, 5000);

    return true;
  };

  window.onunhandledrejection = function (error) {
    console.log("onunhandledrejection");
    showCursor();

    // save data
    console.log(error);
    let errorReport = "";

    try {
      const BC = status.block_condition;
      let condition = "";
      if (status.block_condition) {
        condition = status.block_condition.split("_")[1];
      }
      const text =
        "<br>block: " +
        status.block +
        ", condition: " +
        condition +
        ", trial: " +
        status.trial +
        "<br>" +
        "conditionName: " +
        paramReader.read("conditionName", BC) +
        "<br>" +
        "experiment: " +
        thisExperimentInfo.experiment +
        "<br>";

      errorReport += text;
    } catch (e) {
      console.error(
        "Error when trying to add block, condition information to error message: " +
          e,
      );
    }

    try {
      const commit = websiteRepoLastCommitDeploy.current;
      console.log("...commit", commit);
      if (commit !== undefined) {
        const time =
          new Date(commit).toLocaleDateString(undefined, {
            dateStyle: "medium",
          }) +
          " " +
          new Date(commit).toLocaleString(undefined, {
            timeStyle: "short",
          }) +
          " " +
          getFormattedTime(new Date());
        errorReport += `<br> Compiler updated ${time}<br>`;
      }
    } catch (e) {
      console.error(
        "Error when trying to add compiler updated date information to error message: " +
          e,
      );
    }

    // psychoJS default behavior
    if (error?.reason?.stack) {
      // stack from reason
      // const errorMessage = `STACK ${JSON.stringify(
      //   error?.reason?.stack || error?.stack,
      // )}\nREASON ${JSON.stringify(error?.reason)}ERROR:${errorReport}`;
      let message = error?.reason?.message || "";
      message += errorReport;
      const errorMessage = JSON.stringify({
        error: message,
        stack: error?.reason?.stack || error?.stack || "",
      });
      document.body.setAttribute("data-error", errorMessage);

      try {
        psychoJS.experiment.addData("error", errorMessage);
        psychoJS.experiment.nextEntry(); // save early
        psychoJS.experiment.save();
      } catch (exception) {
        console.error(
          "Failed to add error to experiment data. Perhaps psychoJS.experiment is undefined.",
          exception,
        );
      }
    } else {
      // no stack from reason
      // const errorMessage = `STACK ${JSON.stringify(
      //   error?.stack,
      // )}\nERROR ${error}\nREASON ${JSON.stringify(error?.reason)}`;

      let message = error?.message || "";
      message += errorReport;
      const errorMessage = JSON.stringify({
        error: message,
        stack: error?.stack || "",
      });

      document.body.setAttribute("data-error", errorMessage);
      try {
        psychoJS.experiment.addData("error", errorMessage);
        psychoJS.experiment.nextEntry(); // save early
        psychoJS.experiment.save();
      } catch (exception) {
        console.error(
          "Failed to add error to experiment data. Perhaps psychoJS.experiment is undefined.",
          exception,
        );
      }
    }

    // quit
    psychoJS._gui.dialog({
      error: error?.reason,
      showOK: true,
      onOK: () => {
        quitPsychoJS("", false, paramReader);
      },
      addErrorToPsychoJS: false,
    });

    return true;
  };
};

/**
 * Log a non-fatal error as a warning, so the experimenter can know that some unspecified behavior occured.
 * @param {string} message Message describing this non-fatal error
 */
export const warning = (message) => {
  try {
    let fullMessage = "";
    if (psychoJS?.experiment?._thisEntry.hasOwnProperty("warning")) {
      fullMessage += psychoJS.experiment._thisEntry["warning"] + "\n";
    }
    fullMessage += message;
    psychoJS.experiment.addData("warning", fullMessage);
    console.warn(message);
  } catch (exception) {
    // TODO should failure to log a warning result in a fatal error?
    console.error(
      "Failed to add warning: " +
        message +
        " to experiment data. Perhaps psychoJS.experiment is undefined.",
      exception,
    );
  }
};

// Similar to console.count, but included in the experiment output data
export const countOccurances = (label) => {
  try {
    const columnName = `${label}Count`;
    let count = psychoJS?.experiment?._thisEntry?.hasOwnProperty(columnName)
      ? Number(psychoJS.experiment._thisEntry[columnName]) + 1
      : 1;
    psychoJS.experiment.addData(columnName, count);
  } catch (e) {
    console.error(`Failed to count occurances of ${label}.`, e);
  }
};
