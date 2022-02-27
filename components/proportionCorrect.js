export const prepareProportionCorrectPopup = () => {
  const wrapperEle = document.createElement("div");
  wrapperEle.id = "proportion-correct-container";

  const backgroundEle = document.createElement("div");
  backgroundEle.id = "proportion-correct-background";
  wrapperEle.appendChild(backgroundEle);

  const popupEle = document.createElement("div");
  popupEle.id = "proportion-correct-popup";

  const titleEle = document.createElement("h1");
  titleEle.id = "proportion-correct-title";
  titleEle.innerHTML = "Nice Work! Here is your proportion correct: ";
  popupEle.appendChild(titleEle);

  const continueButtonEle = document.createElement("button");
  continueButtonEle.id = "proportion-correct-continue-button";
  continueButtonEle.innerHTML = "Proceed";
  popupEle.appendChild(continueButtonEle);

  wrapperEle.appendChild(popupEle);
  document.body.appendChild(wrapperEle);

  return [wrapperEle, titleEle, continueButtonEle];
};

export const showProportionCorrectPopup = (proportion) => {
  document.getElementById("proportion-correct-container").style.display =
    "block";
  document.getElementById("proportion-correct-continue-button").style.display =
    "block";
  document.getElementById(
    "proportion-correct-title"
  ).innerHTML = `Nice Work! Here is your proportion correct: ${proportion}`;
};

export const hideProportionCorrectPopup = () => {
  document.getElementById("proportion-correct-container").style.display =
    "none";
};

/* -------------------------------------------------------------------------- */
