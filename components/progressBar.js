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
  console.log(`[PROGRESS BAR DEBUG] 🏗️ Creating experiment progress bar`);

  const barContainer = document.createElement("div");
  barContainer.id = "experiment-progress-container";
  barContainer.className = "experiment-progress-container";
  document.body.appendChild(barContainer);

  console.log(`[PROGRESS BAR DEBUG] Created container:`, barContainer);

  const bar = document.createElement("div");
  bar.id = "experiment-progress-bar";
  bar.className = "experiment-progress-bar";
  barContainer.appendChild(bar);

  console.log(`[PROGRESS BAR DEBUG] Created bar:`, bar);
  console.log(`[PROGRESS BAR DEBUG] ✅ Progress bar created successfully`);
};

export const updateExperimentProgressBar = () => {
  console.log(
    `[PROGRESS BAR DEBUG] 🔍 updateExperimentProgressBar called (BLOCK-BASED)`,
  );

  const experimentProgressInfo = window.experimentProgressInfo || [];
  console.log(
    `[PROGRESS BAR DEBUG] experimentProgressInfo:`,
    experimentProgressInfo,
  );

  if (experimentProgressInfo.length === 0) {
    console.log(
      `[PROGRESS BAR DEBUG] ❌ No experimentProgressInfo found, returning`,
    );
    return;
  }

  // Calculate progress based on completed blocks only
  const currentBlock = status.nthBlock; // Sequential block number (1, 2, 3...)
  const totalActiveBlocks = experimentProgressInfo.length;

  // Only count completed blocks (current block is not completed yet)
  const completedBlocks = Math.max(0, currentBlock - 1);

  console.log(
    `[PROGRESS BAR DEBUG] Current block: ${currentBlock} (sequential)`,
  );
  console.log(`[PROGRESS BAR DEBUG] Total active blocks: ${totalActiveBlocks}`);
  console.log(`[PROGRESS BAR DEBUG] Completed blocks: ${completedBlocks}`);

  // Calculate percentage based on completed blocks
  const percentage = Math.min(100, (completedBlocks / totalActiveBlocks) * 100);

  console.log(
    `[EXPERIMENT PROGRESS] Block ${currentBlock}/${totalActiveBlocks}`,
  );
  console.log(
    `[EXPERIMENT PROGRESS] Completed blocks: ${completedBlocks}/${totalActiveBlocks} (${percentage.toFixed(
      1,
    )}%)`,
  );

  // Update progress bar
  const bar = document.getElementById("experiment-progress-bar");
  console.log(`[PROGRESS BAR DEBUG] Progress bar element:`, bar);

  if (bar) {
    console.log(`[PROGRESS BAR DEBUG] Setting height to ${percentage}%`);
    bar.style.height = `${percentage}%`;
    console.log(
      `[PROGRESS BAR DEBUG] Current bar style.height:`,
      bar.style.height,
    );
  } else {
    console.log(`[PROGRESS BAR DEBUG] ❌ Progress bar element not found!`);
  }
};

export const destroyExperimentProgressBar = () => {
  const barContainer = document.getElementById("experiment-progress-container");
  if (barContainer) barContainer.remove();
};
