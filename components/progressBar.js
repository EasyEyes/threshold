// create a veritcal progress bar on the right edge of the screen that tracks the condition's trial count as
// a fraction of contidionTrials
import "./css/progressBar.css";

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
