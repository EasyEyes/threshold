import "./css/progressBar.css";
import { status } from "./global.js";

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

export const updateExperimentProgressBar = (
  fontLeftToRightBool = true,
  instructionLocation = undefined,
) => {
  let placeOnLeft;
  if (instructionLocation === "upperRight") {
    placeOnLeft = true;
  } else if (instructionLocation === "upperLeft") {
    placeOnLeft = false;
  } else {
    placeOnLeft = !fontLeftToRightBool;
  }

  const container = document.getElementById("experiment-progress-container");
  if (container) {
    if (placeOnLeft) {
      container.style.right = "auto";
      container.style.left = "5px";
    } else {
      container.style.left = "auto";
      container.style.right = "5px";
    }
  }

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

export const showExperimentProgressBar = () => {
  const barContainer = document.getElementById("experiment-progress-container");
  if (barContainer) barContainer.style.display = "block";
};

export const hideExperimentProgressBar = () => {
  const barContainer = document.getElementById("experiment-progress-container");
  if (barContainer) barContainer.style.display = "none";
};
