export const showTrialBreakWidget = (bodyContent) => {
  console.log("showTrialBreakWidget");
  // wrapper container
  let el = document.getElementById("trialBreakContainer");
  el.style.visibility = "visible";
  el.style.zIndex = 1000005;

  // set body content
  el = document.getElementById("trialBreakPhrase");
  el.innerHTML = bodyContent;
};

export const hideTrialBreakWidget = () => {
  console.log("hideTrialBreakWidget");
  document.getElementById("trialBreakContainer").style.visibility = "hidden";
};

export const hideTrialProceedButton = () => {
  console.log("hideTrialProceedButton");
  document.getElementById("trial-proceed").style.visibility = "hidden";
};
export const showTrialProceedButton = () => {
  console.log("showTrialProceedButton");
  document.getElementById("trial-proceed").style.visibility = "visible";
};
