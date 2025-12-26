import {
  status,
  thisExperimentInfo,
  websiteRepoLastCommitDeploy,
} from "./global.js";
import { psychoJS } from "./globalPsychoJS.js";
import { quitPsychoJS } from "./lifetime.js";
import { showCursor } from "./utils.js";
import * as sentry from "./sentry";

export const getFormattedTime = (date) => {
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

const buildErrorContext = (paramReader) => {
  try {
    const BC = status.block_condition;
    let condition = "";
    if (status.block_condition) {
      condition = status.block_condition.split("_")[1];
    }

    let context = `<br>block: ${status.block}, condition: ${condition}, trial: ${status.trial}<br>`;
    context += `conditionName: ${paramReader.read("conditionName", BC)}<br>`;
    context += `experiment: ${thisExperimentInfo.experiment}<br>`;
    //current time
    context += `current time: ${
      new Date().toLocaleString(undefined, {
        dateStyle: "medium",
      }) +
      " " +
      new Date().toLocaleString(undefined, { timeStyle: "short" }) +
      " " +
      getFormattedTime(new Date())
    }<br>`;

    const commit = websiteRepoLastCommitDeploy.current;
    if (commit !== undefined) {
      const time =
        new Date(commit).toLocaleDateString(undefined, {
          dateStyle: "medium",
        }) +
        " " +
        new Date(commit).toLocaleString(undefined, { timeStyle: "short" }) +
        " " +
        getFormattedTime(new Date());
      context += `<br>Compiler updated ${time}<br>`;
    }

    return context;
  } catch (e) {
    console.error("Error when building error context:", e);
    return "<br>Error context unavailable<br>";
  }
};

const hasErrorContent = (error, message = "", stack = "") => {
  return !!(
    (error && typeof error === "object" && (error.message || error.stack)) ||
    (message && message.trim()) ||
    (stack && stack.trim()) ||
    (error && typeof error === "string" && error.trim())
  );
};

const saveErrorData = (errorMessage) => {
  try {
    psychoJS.experiment.addData("error", errorMessage);
    psychoJS.experiment.nextEntry();
    psychoJS.experiment.save();
  } catch (exception) {
    console.error("Failed to save error data:", exception);
  }
};

export const buildWindowErrorHandling = (paramReader) => {
  window.onerror = (message, source, lineno, colno, error) => {
    showCursor();

    // Check if this is a meaningful error
    if (
      !hasErrorContent(error, message) ||
      error === null ||
      error === undefined
    ) {
      sentry.captureMessage("Skipping empty error");
      return true;
    }

    const context = buildErrorContext(paramReader);
    let errorObject = {
      message: message || "",
      source: source || "",
      lineno: lineno || 0,
      colno: colno || 0,
      error: (error?.message || error || "") + context,
      stack: error?.stack || "",
    };
    const errorMessage = JSON.stringify(errorObject);

    sentry.captureError(error, message, errorObject);
    saveErrorData(errorMessage);
    document.body.setAttribute("data-error", errorMessage);

    psychoJS._gui.dialog({
      error: error,
      addErrorToPsychoJS: false,
    });

    setTimeout(() => {
      quitPsychoJS("", false, paramReader);
    }, 5000);

    return true;
  };

  window.onunhandledrejection = (event) => {
    console.log("onunhandledrejection");
    showCursor();

    const error = event.reason;
    const message = error?.message || "";
    const stack = error?.stack || "";

    // Check if this is a meaningful error
    if (!hasErrorContent(error, message, stack)) {
      sentry.captureError(error, "Skipping empty promise rejection");
      return true;
    }

    const context = buildErrorContext(paramReader);
    let errorObject = {
      error: message + context,
      stack: stack,
    };
    const errorMessage = JSON.stringify(errorObject);
    sentry.captureError(error, message, errorObject);

    saveErrorData(errorMessage);
    document.body.setAttribute("data-error", errorMessage);

    psychoJS._gui.dialog({
      error: error,
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
    const failureMessage =
      "Failed to add warning: " +
      message +
      " to experiment data. Perhaps psychoJS.experiment is undefined.";
    sentry.captureError(exception, failureMessage);
  }
};
