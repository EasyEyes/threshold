export const prepareTrialBreakProgressBar = () => {
  const progressBarWrapper = document.createElement("div");
  progressBarWrapper.id = "trial-break-progress-bar-wrapper";

  const progressEle = document.createElement("div");
  progressEle.id = "trial-break-progress";
  progressEle.style.width = "0%";

  progressBarWrapper.appendChild(progressEle);
  document.body.appendChild(progressBarWrapper);
};

export const showTrialBreakProgressBar = (l = 0) => {
  l = Math.max(Math.min(l, 1), 0);
  document.getElementById("trial-break-progress-bar-wrapper").style.display =
    "block";
  document.getElementById("trial-break-progress").style.width = `${l * 100}%`;
};

export const hideTrialBreakProgressBar = () => {
  document.getElementById("trial-break-progress-bar-wrapper").style.display =
    "none";
};
