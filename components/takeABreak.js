export const prepareTrialBreakPopup = () => {
  const wrapperEle = document.createElement("div");
  wrapperEle.id = "trial-break-container";

  const backgroundEle = document.createElement("div");
  backgroundEle.id = "trial-break-background";
  wrapperEle.appendChild(backgroundEle);

  const popupEle = document.createElement("div");
  popupEle.id = "trial-break-popup";

  const titleEle = document.createElement("h1");
  titleEle.id = "trial-break-title";
  titleEle.innerHTML =
    "Good work! Please take a brief break to relax and blink.";
  popupEle.appendChild(titleEle);

  const continueHintEle = document.createElement("p");
  continueHintEle.id = "trial-break-continue-hint";
  popupEle.appendChild(continueHintEle);

  const continueButtonEle = document.createElement("button");
  continueButtonEle.id = "trial-break-continue-button";
  continueButtonEle.innerHTML = "Proceed";
  popupEle.appendChild(continueButtonEle);

  wrapperEle.appendChild(popupEle);
  document.body.appendChild(wrapperEle);

  return [wrapperEle, titleEle, continueHintEle, continueButtonEle];
};

export const showTrialBreakPopup = () => {
  document.getElementById("trial-break-container").style.display = "block";
};

export const hideTrialBreakPopup = () => {
  document.getElementById("trial-break-container").style.display = "none";
};

export const showTrialBreakProceed = (hintText, canClick) => {
  const hintEle = document.getElementById("trial-break-continue-hint");
  hintEle.innerHTML = hintText;
  hintEle.style.display = "block";
  if (canClick)
    document.getElementById("trial-break-continue-button").style.display =
      "block";
};

export const hideTrialBreakProceed = () => {
  document.getElementById("trial-break-continue-hint").style.display = "none";
  document.getElementById("trial-break-continue-button").style.display = "none";
};

/* -------------------------------------------------------------------------- */

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
