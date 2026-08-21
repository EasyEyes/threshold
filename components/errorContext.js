import {
  status,
  thisExperimentInfo,
  websiteRepoLastCommitDeploy,
} from "./global.js";

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
  // Get UTC offset in minutes and convert to hours
  const offsetMinutes = date.getTimezoneOffset();
  const offsetHours = -offsetMinutes / 60; // Note: getTimezoneOffset() returns inverse of what we want
  const offsetSign = offsetHours >= 0 ? "+" : "";

  return `UTC${offsetSign}${offsetHours}`;
};

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

/**
 * Build error context as a structured JSON object.
 * @param {Object} paramReader - Parameter reader instance
 * @returns {Object} Error context data
 */
export const buildErrorContext = (paramReader) => {
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
