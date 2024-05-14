import { Scheduler } from "../psychojs/src/util";
import { updateColor } from "./color";
import {
  clickedContinue,
  instructionFont,
  status,
  targetKind,
  totalBlocks,
  trialCounterConfig,
  viewingDistanceCm,
} from "./global";
import { psychoJS } from "./globalPsychoJS";
import { readi18nPhrases } from "./readPhrases";
import { getTrialInfoStr } from "./trialCounter";

export const showImageBegin = (
  fileName,
  resopnseClickedBool,
  showCounterBool,
  showViewingDistanceBool,
  trialCounter,
  instructions,
  targetSpecs,
  language,
) => {
  return async function () {
    if (instructions) {
      instructions.setAutoDraw(false);
    }

    if (targetSpecs) {
      targetSpecs.setAutoDraw(false);
    }

    const imageEle = document.createElement("img");
    imageEle.src = `./images/${fileName}`;
    imageEle.id = "showImageEle";
    imageEle.style.display = "block";
    imageEle.style.margin = "auto";
    document.body.appendChild(imageEle);
    imageEle.style.zIndex = "1000";

    imageEle.onload = () => {
      const screenHeight = window.innerHeight;
      const screenWidth = window.innerWidth;
      const imgHeight = imageEle.naturalHeight;
      const imgWidth = imageEle.naturalWidth;

      const heightRatio = screenHeight / imgHeight;
      const widthRatio = screenWidth / imgWidth;
      const ratio = Math.min(heightRatio, widthRatio);

      imageEle.style.height = `${imgHeight * ratio}px`;
      imageEle.style.width = `${imgWidth * ratio}px`;
      imageEle.style.top = `${(screenHeight - imgHeight * ratio) / 2}px`;
      imageEle.style.left = `${(screenWidth - imgWidth * ratio) / 2}px`;
      imageEle.style.display = "block";
    };

    if (resopnseClickedBool) {
      const button = document.createElement("button");
      button.id = "showImageButton";
      button.classList.add("threshold-button", "threshold-proceed-button");
      button.innerHTML = readi18nPhrases("T_proceed", language);
      button.style.zIndex = "1000";

      button.addEventListener("click", () => {
        clickedContinue.current = true;
      });
      document.body.appendChild(button);
    }
    if (showCounterBool || showViewingDistanceBool) {
      let trialCounterStr = getTrialInfoStr(
        language,
        showCounterBool,
        showViewingDistanceBool,
        undefined,
        undefined,
        status.nthBlock,
        totalBlocks.current,
        viewingDistanceCm.current,
        targetKind.current,
      );
      if (trialCounterStr) {
        trialCounter.setText(trialCounterStr);
        trialCounter.setPos([window.innerWidth / 2, -window.innerHeight / 2]);
        updateColor(trialCounter, "instruction", status.block);
        trialCounter.setAutoDraw(true);
      }
    }
    psychoJS.eventManager.clearKeys();
    return Scheduler.Event.NEXT;
  };
};

var numFrames = 0;
export const showImageEachFrame = (responseTypedBool, responseClickedBool) => {
  // if responseTypedBool is true, then the image will be removed by pressing enter

  return async function () {
    const returnKey = psychoJS.eventManager.getKeys({ keyList: ["return"] });
    //ignore first 5 frames
    if (responseTypedBool && returnKey.length > 0 && numFrames++ > 5) {
      return Scheduler.Event.NEXT;
    }

    if (responseClickedBool && clickedContinue.current) {
      clickedContinue.current = false;
      return Scheduler.Event.NEXT;
    }
    return Scheduler.Event.FLIP_REPEAT;
  };
};

export const showImageEnd = () => {
  return async function () {
    const imageEle = document.getElementById("showImageEle");
    if (imageEle) imageEle.remove();
    const button = document.getElementById("showImageButton");
    if (button) button.remove();
    return Scheduler.Event.NEXT;
  };
};
