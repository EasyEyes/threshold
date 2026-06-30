import {
  status,
  thisExperimentInfo,
  websiteRepoLastCommitDeploy,
} from "./global.js";
import { psychoJS } from "./globalPsychoJS.js";
import { quitPsychoJS } from "./lifetime.js";
import { showCursor } from "./utils.js";
import * as sentry from "./sentry";
import { simulateActive, setEEState } from "./simulatedState";
import Swal from "sweetalert2";

// Block/trial kept in this module so error reports stay correct even if the
// `status` object seen here ever diverges from the one threshold.js mutates.
// Zero until the first block/trial begins; updated as each block and trial start.
let activeBlock = 0;
let activeTrial = 0;
export const setActiveBlock = (block) => {
  activeBlock = Number.isFinite(block) ? block : 0;
  activeTrial = 0;
};
export const setActiveTrial = (trial) => {
  activeTrial = Number.isFinite(trial) ? trial : 0;
};

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
/**
 * Detect which experiment phase is currently active.
 * Uses DOM presence as a reliable signal since each phase creates/destroys
 * distinctive elements. Falls back to status.currentFunction for later phases.
 */
const detectExperimentWhere = () => {
  // Check pages in reverse chronological order — later pages take priority.
  // If the compat check is showing, we're on the compat check (even if title
  // page elements are also still in the DOM somehow).
  if (document.getElementById("msg-container")) {
    return "compatibilityCheck";
  }
  if (document.getElementById("form-container")) {
    return "consentForm";
  }
  if (document.getElementById("easyeyes-title-page")) {
    return "titlePage";
  }

  // For later stages, rely on status.currentFunction set by setCurrentFn().
  if (status.currentFunction) {
    return status.currentFunction;
  }

  // If we're past all pages but haven't entered a trial function yet,
  // check block number as a rough signal.
  if (activeBlock > 0) {
    return "experiment";
  }

  return "initializing";
};

const buildErrorContext = (paramReader) => {
  try {
    const BC = status.block_condition;
    let condition = "";
    if (BC) {
      condition = BC.split("_")[1];
    }

    const now = new Date();
    const currentTime =
      now.toLocaleString(undefined, { dateStyle: "medium" }) +
      " " +
      now.toLocaleString(undefined, { timeStyle: "short" }) +
      " " +
      getFormattedTime(now);

    const context = {
      where: detectExperimentWhere(),
      block: activeBlock,
      condition: condition,
      trial: activeTrial,
      // When block_condition is undefined (eg between blocks, or early in experiment),
      // paramReader.read defaults to block 1 — so we note that.
      conditionName: BC ? paramReader.read("conditionName", BC) : "",
      conditionNameSource: BC
        ? "block_condition"
        : "unavailable (no active block_condition)",
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
    return { contextBuildFailed: true, contextBuildError: String(e) };
  }
};

/**
 * Format error context object as HTML string
 * @param {Object} context - Error context object from buildErrorContext
 * @returns {string} HTML formatted context string
 */
const formatErrorContextAsHTML = (context) => {
  if (context.contextBuildFailed) {
    return `<br>Context unavailable: ${
      context.contextBuildError || "unknown error"
    }<br>`;
  }

  return `<br>where: ${context.where}<br>`;
};

const formatErrorContextAsText = (context) => {
  if (context.contextBuildFailed) {
    return `\nContext unavailable: ${
      context.contextBuildError || "unknown error"
    }\n`;
  }

  let text = `\nwhere: ${context.where}`;
  text += `\nblock: ${context.block}, condition: ${context.condition}, trial: ${context.trial}`;
  text += `\nconditionName: ${context.conditionName}`;
  text += `\nexperiment: ${context.experiment}`;
  text += `\ncurrent time: ${context.currentTime}`;

  if (context.compilerUpdated) {
    text += `\nCompiler updated ${context.compilerUpdated}`;
  }

  return text + "\n";
};

/**
 * Check if an error contains any useful diagnostic content.
 * Covers: Error objects with message/stack, string errors, and explicit message/stack args.
 * @param {unknown} error - The error value (could be Error, string, object, etc.)
 * @param {string} message - Pre-extracted message string
 * @param {string} stack - Pre-extracted stack string
 * @returns {boolean} True if there's any diagnostic content
 */
const hasErrorContent = (error, message = "", stack = "") => {
  // Error objects with message or stack
  if (error && typeof error === "object" && (error.message || error.stack))
    return true;
  // Non-empty extracted message
  if (message && message.trim()) return true;
  // Non-empty extracted stack
  if (stack && stack.trim()) return true;
  // String errors
  if (error && typeof error === "string" && error.trim()) return true;
  // Non-standard error objects with useful string representation
  if (
    error &&
    typeof error === "object" &&
    !(
      typeof PromiseRejectionEvent !== "undefined" &&
      error instanceof PromiseRejectionEvent
    ) &&
    String(error) !== "[object Object]"
  )
    return true;
  return false;
};

/**
 * Get a descriptive string from any error value, even non-Error rejections.
 * @param {unknown} error - The error value
 * @returns {string} A human-readable description
 */
const describeError = (error) => {
  if (!error) return "Unknown error (falsy value)";
  if (error instanceof Error) return error.message || error.toString();
  if (typeof error === "string") return error;
  if (typeof error === "number" || typeof error === "boolean")
    return String(error);
  // For objects, try to get a meaningful description
  if (typeof error === "object") {
    if (error.message) return String(error.message);
    const str = String(error);
    if (str !== "[object Object]") return str;
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown error object";
    }
  }
  return String(error);
};

/**
 * Capture a synthetic stack trace for non-Error rejections.
 * This provides at least the location where the error was caught.
 * @returns {string} A stack trace string
 */
const captureSyntheticStack = () => {
  try {
    return new Error("Captured at unhandled rejection handler").stack || "";
  } catch {
    return "";
  }
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

/**
 * Hide the experiment canvas and stale UI so the error dialog is the only thing visible.
 * Safe to call even if the window/renderer haven't been created yet.
 */
const hideExperimentUI = () => {
  try {
    // Hide the PIXI canvas (renderer view)
    const rendererView = psychoJS?.window?._renderer?.view;
    if (rendererView) {
      rendererView.style.display = "none";
    }
  } catch (e) {
    // Non-critical — best effort
    console.warn("Could not hide renderer view:", e);
  }

  // Remove the title page if it's still showing (error before participant clicked Proceed).
  // The title page is a fixed full-screen overlay that would obscure the error dialog.
  try {
    const titlePage = document.getElementById("easyeyes-title-page");
    if (titlePage) {
      titlePage.remove();
    }
  } catch (e) {
    console.warn("Could not clean up title page:", e);
  }

  // Remove the compatibility check page if it's still showing (error during compat check).
  // #compatibility-title is appended directly to body; #msg-container holds the grey
  // content box. Both are created by displayCompatibilityMessage().
  try {
    document.getElementById("compatibility-title")?.remove();
    document.getElementById("msg-container")?.remove();
  } catch (e) {
    console.warn("Could not clean up compatibility check:", e);
  }

  // Dismiss any consent/debrief form (z-index 1000005+ covers the error dialog at 1000000).
  try {
    document.getElementById("form-container")?.remove();
    document.getElementById("consent-page-title")?.remove();
  } catch (e) {
    console.warn("Could not clean up form:", e);
  }

  // Dismiss any SweetAlert2 modal (Q&A panel, sound output selection, etc.)
  // so it doesn't sit on top of the error dialog.
  try {
    if (Swal.isVisible()) {
      Swal.close();
    }
    // Remove any lingering Swal DOM if .close() didn't fully clean up.
    document.querySelectorAll(".swal2-container").forEach((el) => el.remove());
  } catch (e) {
    console.warn("Could not dismiss SweetAlert2 modal:", e);
  }

  // Reset grey-background styling applied by title page or compatibility check.
  try {
    document.body.classList.remove("easyeyes-gray-bg");
    document.documentElement.classList.remove("easyeyes-gray-bg");
    document.body.style.backgroundColor = "";
    document.body.style.overflow = "";
  } catch (e) {
    console.warn("Could not reset background styles:", e);
  }
};

export const buildWindowErrorHandling = (paramReader) => {
  window.onerror = (message, source, lineno, colno, error) => {
    showCursor();

    if (
      !hasErrorContent(error, message) ||
      error === null ||
      error === undefined
    ) {
      const described = describeError(error);
      warning(`Skipped empty onerror: ${described}`);
      sentry.captureError(
        error instanceof Error ? error : new Error(described),
        "Skipping empty onerror",
        {
          rejectionValue: described,
          originalMessage: message,
          rejectionType: error === null ? "null" : typeof error,
        },
      );
      return true;
    }

    const contextData = buildErrorContext(paramReader);
    const contextHTML = formatErrorContextAsHTML(contextData);
    const contextText = formatErrorContextAsText(contextData);

    const errorDescription = error?.message || describeError(error);
    let errorObject = {
      message: message || "",
      source: source || "",
      lineno: lineno || 0,
      colno: colno || 0,
      error: errorDescription + contextText,
      stack: error?.stack || "",
    };
    const errorMessage = JSON.stringify(errorObject);

    sentry.captureError(error, message, { ...errorObject, contextData });
    saveErrorData(errorMessage);
    document.body.setAttribute("data-error", errorMessage);

    // Stop the scheduler immediately so the trial loop can't recreate
    // UI elements (e.g. Q&A Swal) while the error dialog is showing.
    psychoJS._scheduler.stop();
    hideExperimentUI();

    psychoJS._gui.dialog({
      error: errorDescription + contextHTML,
      addErrorToPsychoJS: false,
    });

    setTimeout(() => {
      quitPsychoJS("", false, paramReader);
    }, 5000);

    return true;
  };

  window.onunhandledrejection = (event) => {
    showCursor();

    const error = event.reason;
    const message = error?.message || "";
    const stack = error?.stack || "";

    if (
      !hasErrorContent(error, message, stack) ||
      error === null ||
      error === undefined
    ) {
      const described = describeError(error);
      warning(`Skipped empty promise rejection: ${described}`);
      sentry.captureError(
        error instanceof Error ? error : new Error(described),
        "Skipping empty promise rejection",
        {
          rejectionValue: described,
          rejectionType: error === null ? "null" : typeof error,
          hadMessage: !!message,
          hadStack: !!stack,
        },
      );
      return true;
    }

    const contextData = buildErrorContext(paramReader);
    const contextHTML = formatErrorContextAsHTML(contextData);
    const contextText = formatErrorContextAsText(contextData);

    // Use message if available, otherwise describe the error value
    const errorDescription = message || describeError(error);
    // Use original stack if available, otherwise capture a synthetic one
    const effectiveStack = stack || captureSyntheticStack();

    let errorObject = {
      error: errorDescription + contextText,
      stack: effectiveStack,
    };
    const errorMessage = JSON.stringify(errorObject);
    sentry.captureError(error, message, { ...errorObject, contextData });

    saveErrorData(errorMessage);
    document.body.setAttribute("data-error", errorMessage);

    // Stop the scheduler immediately so the trial loop can't recreate
    // UI elements (e.g. Q&A Swal) while the error dialog is showing.
    psychoJS._scheduler.stop();
    hideExperimentUI();
    psychoJS._gui.dialog({
      error: errorDescription + contextHTML,
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
    if (simulateActive) setEEState({ skipReason: message });
  } catch (exception) {
    const failureMessage =
      "Failed to add warning: " +
      message +
      " to experiment data. Perhaps psychoJS.experiment is undefined.";
    sentry.captureError(exception, failureMessage);
  }
};
