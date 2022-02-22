export const showTrialBreakWidget = (bodyContent) => {
  const wrapperEl = document.createElement("div");
  wrapperEl.setAttribute("id", "trialBreakContainer");
  wrapperEl.style.visibility = "visible";
  wrapperEl.style.zIndex = 1000005;

  const backgroundEl = document.createElement("div");
  backgroundEl.setAttribute("id", "trialBreakBackground");
  wrapperEl.appendChild(backgroundEl);

  const modalEl = document.createElement("div");
  modalEl.classList.add("trialBreakModal");

  const titleEl = document.createElement("div");
  titleEl.classList.add("trialBreakTitle");
  titleEl.innerHTML =
    "Good work! Please take a brief break to relax and blink.";
  modalEl.appendChild(titleEl);

  const trialBreakPhraseEl = document.createElement("div");
  trialBreakPhraseEl.setAttribute("id", "trialBreakPhrase");
  trialBreakPhraseEl.classList.add("trialBreakBody");
  trialBreakPhraseEl.innerHTML = bodyContent;
  modalEl.appendChild(trialBreakPhraseEl);

  const trialProceedEl = document.createElement("div");
  trialProceedEl.setAttribute("id", "trial-proceed");
  trialProceedEl.classList.add("trialBreakButton");
  modalEl.appendChild(trialProceedEl);

  wrapperEl.appendChild(modalEl);
};

export const hideTrialBreakWidget = () => {
  document.getElementById("trialBreakContainer")?.remove();
};

export const hideTrialProceedButton = () => {
  document.getElementById("trial-proceed")?.remove();
};
export const showTrialProceedButton = () => {
  document.getElementById("trial-proceed")?.remove();
};

export const showTrialBreakProgressBar = (height = 0.0) => {
  height = Math.min(height, 1.0);
  hideTrialBreakProgressBar();

  // wrapper element
  const wrapperEl = document.createElement("div");
  wrapperEl.id = "trialBreakProgressbarWrapper";
  document.body.appendChild(wrapperEl);

  const progressEl = document.createElement("div");
  progressEl.id = "trialBreakProgressbar";
  progressEl.style.height = `${height * 100}%`;
  wrapperEl.appendChild(progressEl);
};

export const hideTrialBreakProgressBar = () => {
  document.getElementById("trialBreakProgressbarWrapper")?.remove();
};
