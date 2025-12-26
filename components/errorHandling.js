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

/**
 * Build error context as a structured JSON object
 * @param {Object} paramReader - Parameter reader instance
 * @returns {Object} Error context data
 */
const buildErrorContext = (paramReader) => {
  try {
    const BC = status.block_condition;
    let condition = "";
    if (status.block_condition) {
      condition = status.block_condition.split("_")[1];
    }

    const now = new Date();
    const currentTime =
      now.toLocaleString(undefined, { dateStyle: "medium" }) +
      " " +
      now.toLocaleString(undefined, { timeStyle: "short" }) +
      " " +
      getFormattedTime(now);

    const context = {
      block: status.block,
      condition: condition,
      trial: status.trial,
      conditionName: paramReader.read("conditionName", BC),
      experiment: thisExperimentInfo.experiment,
      currentTime: currentTime,
    };

    const commit = websiteRepoLastCommitDeploy.current;
    if (commit !== undefined) {
      const commitDate = new Date(commit);

      context.compilerUpdated =
        commitDate.toLocaleDateString(undefined, { dateStyle: "medium" }) +
        " " +
        commitDate.toLocaleString(undefined, { timeStyle: "short" }) +
        " " +
        getFormattedTime(commitDate);
    }

    return context;
  } catch (e) {
    console.error("Error when building error context:", e);
    return { error: "Error context unavailable" };
  }
};

/**
 * Format error context object as HTML string
 * @param {Object} context - Error context object from buildErrorContext
 * @returns {string} HTML formatted context string
 */
const formatErrorContextAsHTML = (context) => {
  if (context.error) {
    return `<br>${context.error}<br>`;
  }

  let html = `<br>block: ${context.block}, condition: ${context.condition}, trial: ${context.trial}<br>`;
  html += `conditionName: ${context.conditionName}<br>`;
  html += `experiment: ${context.experiment}<br>`;
  html += `current time: ${context.currentTime}<br>`;

  if (context.compilerUpdated) {
    html += `<br>Compiler updated ${context.compilerUpdated}<br>`;
  }

  return html;
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

    const contextData = buildErrorContext(paramReader);
    const contextHTML = formatErrorContextAsHTML(contextData);

    let errorObject = {
      message: message || "",
      source: source || "",
      lineno: lineno || 0,
      colno: colno || 0,
      error: (error?.message || error || "") + contextHTML,
      stack: error?.stack || "",
    };
    const errorMessage = JSON.stringify(errorObject);

    sentry.captureError(error, message, { ...errorObject, contextData });
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

    const contextData = buildErrorContext(paramReader);
    const contextHTML = formatErrorContextAsHTML(contextData);

    let errorObject = {
      error: message + contextHTML,
      stack: stack,
    };
    const errorMessage = JSON.stringify(errorObject);
    sentry.captureError(error, message, { ...errorObject, contextData });

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
