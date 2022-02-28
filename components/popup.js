// Prepare and show/hide popups for takeABreak, proportionCorrect, etc.

import { canClick, canType } from "./response";
import { safeExecuteFunc } from "./utils";

export const preparePopup = (keyName) => {
  // keyName can be 'trial-break' or 'proportion-correct'
  const wrapperEle = document.createElement("div");
  wrapperEle.id = `${keyName}-container`;
  wrapperEle.className = "popup-container";

  const backgroundEle = document.createElement("div");
  backgroundEle.id = `${keyName}-background`;
  backgroundEle.className = "popup-background";
  wrapperEle.appendChild(backgroundEle);

  const popupEle = document.createElement("div");
  popupEle.id = `${keyName}-popup`;
  popupEle.className = "popup";

  const titleEle = document.createElement("h1");
  titleEle.id = `${keyName}-title`;
  titleEle.className = "popup-title";
  // titleEle.innerHTML =
  //   "Good work! Please take a brief break to relax and blink.";
  popupEle.appendChild(titleEle);

  const subTextEle = document.createElement("p");
  subTextEle.id = `${keyName}-sub-text`;
  subTextEle.className = "popup-sub-text";
  popupEle.appendChild(subTextEle);

  const continueButtonEle = document.createElement("button");
  continueButtonEle.id = `${keyName}-continue-button`;
  continueButtonEle.className = "popup-continue-button";
  continueButtonEle.innerHTML = "Proceed";
  popupEle.appendChild(continueButtonEle);

  wrapperEle.appendChild(popupEle);
  document.body.appendChild(wrapperEle);

  return [wrapperEle, titleEle, subTextEle, continueButtonEle];
};

export const showPopup = (
  keyName,
  title,
  subText,
  hideSubTextAndProceed = false
) => {
  document.getElementById(`${keyName}-container`).style.display = "block";
  document.getElementById(`${keyName}-title`).innerHTML = title;
  document.getElementById(`${keyName}-sub-text`).innerHTML = subText;

  if (hideSubTextAndProceed) hidePopupProceed(keyName);
  else showPopupProceed(keyName, subText, true);
};

export const hidePopup = (keyName) => {
  document.getElementById(`${keyName}-container`).style.display = "none";
};

export const showPopupProceed = (keyName, subText, canClick) => {
  const hintEle = document.getElementById(`${keyName}-sub-text`);
  hintEle.innerHTML = subText;
  hintEle.style.display = "block";
  if (canClick)
    document.getElementById(`${keyName}-continue-button`).style.display =
      "block";
  else
    document.getElementById(`${keyName}-continue-button`).style.display =
      "none";
};

export const hidePopupProceed = (keyName) => {
  console.log(keyName);
  document.getElementById(`${keyName}-sub-text`).style.display = "none";
  document.getElementById(`${keyName}-continue-button`).style.display = "none";
};

/* -------------------------------------------------------------------------- */

export const addPopupLogic = (keyName, responseType, func = null) => {
  const proceed = () => {
    document.getElementById(`${keyName}-continue-button`).onclick = () => {
      /* nothing */
    };
    hidePopupProceed(keyName);
    hidePopup(keyName);

    safeExecuteFunc(func);
  };

  const handleKeyResponse = (e) => {
    e.preventDefault();
    if (e.key === "Enter") {
      proceed();
      document.removeEventListener("keydown", handleKeyResponse);
    }
  };

  if (canClick(responseType))
    document.getElementById(`${keyName}-continue-button`).onclick = proceed;
  if (canType(responseType))
    document.addEventListener("keydown", handleKeyResponse);
};
