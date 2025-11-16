// create a veritcal progress bar on the right edge of the screen that tracks the condition's trial count as
// a fraction of contidionTrials
import "./css/progressBar.css";
import { status } from "./global.js";

export const createProgressBar = () => {
  const barContainer = document.createElement("div");
  barContainer.id = "barContainer";
  document.body.appendChild(barContainer);

  const bar = document.createElement("div");
  bar.id = "progressBar";
  barContainer.appendChild(bar);
};

export const updateProgressBar = (percentage) => {
  const bar = document.getElementById("progressBar");
  if (bar) bar.style.height = `${percentage}%`;
};

export const destroyProgressBar = () => {
  const barContainer = document.getElementById("barContainer");
  if (barContainer) barContainer.remove();
};

export const hideProgressBar = () => {
  const barContainer = document.getElementById("barContainer");
  if (barContainer) barContainer.style.display = "none";
};

export const showProgressBar = () => {
  const barContainer = document.getElementById("barContainer");
  if (barContainer) barContainer.style.display = "block";
};

// ========== EXPERIMENT-WIDE PROGRESS BAR ==========

export const createExperimentProgressBar = () => {
  const barContainer = document.createElement("div");
  barContainer.id = "experiment-progress-container";
  barContainer.className = "experiment-progress-container";
  document.body.appendChild(barContainer);

  const bar = document.createElement("div");
  bar.id = "experiment-progress-bar";
  bar.className = "experiment-progress-bar";
  barContainer.appendChild(bar);
};

export const updateExperimentProgressBar = () => {
  const experimentProgressInfo = window.experimentProgressInfo || [];

  if (experimentProgressInfo.length === 0) {
    return;
  }

  // Calculate progress based on completed blocks only
  const currentBlock = status.nthBlock; // Sequential block number (1, 2, 3...)
  const totalActiveBlocks = experimentProgressInfo.length;

  // Only count completed blocks (current block is not completed yet)
  const completedBlocks = Math.max(0, currentBlock - 1);

  // Calculate percentage based on completed blocks
  const percentage = Math.min(100, (completedBlocks / totalActiveBlocks) * 100);

  // Update progress bar
  const bar = document.getElementById("experiment-progress-bar");

  if (bar) {
    bar.style.height = `${percentage}%`;
  }
};

export const destroyExperimentProgressBar = () => {
  const barContainer = document.getElementById("experiment-progress-container");
  if (barContainer) barContainer.remove();
};
