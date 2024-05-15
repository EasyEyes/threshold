import { Scheduler } from "../psychojs/src/util";
import { updateColor } from "./color";
import {
  clickedContinue,
  instructionFont,
  screenBackground,
  status,
  targetKind,
  totalBlocks,
  trialCounterConfig,
  viewingDistanceCm,
} from "./global";
import { psychoJS } from "./globalPsychoJS";
import { readi18nPhrases } from "./readPhrases";
import { getTrialInfoStr } from "./trialCounter";
import * as util from "../psychojs/src/util/index.js";

export const showImageBegin = (
  fileName,
  resopnseClickedBool,
  showCounterBool,
  showViewingDistanceBool,
  trialCounter,
  instructions,
  targetSpecs,
  colorRGBA,
  showImage,
  language,
) => {
  return async function () {
    if (instructions) {
      instructions.setAutoDraw(false);
    }

    if (targetSpecs) {
      targetSpecs.setAutoDraw(false);
    }

    screenBackground.colorRGBA = colorRGBA;
    psychoJS.window.color = new util.Color(screenBackground.colorRGBA);
    psychoJS.window._needUpdate = true;

    const imageEle = document.createElement("img");
    imageEle.src = `./images/${fileName}`;
    imageEle.id = "showImageEle";
    imageEle.style.display = "block";
    imageEle.style.margin = "auto";

    showImage.setImage(imageEle);

    imageEle.onload = () => {
      const screenHeight = window.innerHeight;
      const screenWidth = window.innerWidth;
      const imgHeight = imageEle.naturalHeight;
      const imgWidth = imageEle.naturalWidth;

      // Calculate the scale ratios
      const heightRatio = screenHeight / imgHeight;
      const widthRatio = screenWidth / imgWidth;
      let widthScale, heightScale;

      // Check if scaling by height ratio overflows width
      if (imgWidth * heightRatio > screenWidth) {
        // Width is the limiting factor
        heightScale = imgHeight / imgWidth;
        widthScale = 1 / widthRatio > 1 ? 1 : 1 / widthRatio;
      } else {
        // Height is the limiting factor
        heightScale = 1 / heightRatio > 1 ? 1 : 1 / heightRatio;
        widthScale = imgWidth / imgHeight;
      }

      // Apply the new size to the image
      showImage.setSize([widthScale, heightScale]);

      // Apply the new size to the image
      showImage.setSize([widthScale, heightScale]);
      showImage._needUpdate = true;
      showImage.setAutoDraw(true);

      trialCounter._needUpdate = true;
      trialCounter.setAutoDraw(true);
    };

    if (resopnseClickedBool) {
      const button = document.createElement("button");
      button.id = "showImageButton";
      button.classList.add("threshold-button", "threshold-proceed-button");
      button.innerHTML = readi18nPhrases("T_proceed", language);

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
  return async function () {
    const returnKey = psychoJS.eventManager.getKeys({ keyList: ["return"] });
    if (numFrames++ > 5 && responseTypedBool && returnKey.length > 0) {
      return Scheduler.Event.NEXT;
    }

    if (responseClickedBool && clickedContinue.current) {
      clickedContinue.current = false;
      return Scheduler.Event.NEXT;
    }
    return Scheduler.Event.FLIP_REPEAT;
  };
};

export const showImageEnd = (showImage) => {
  return async function () {
    const imageEle = document.getElementById("showImageEle");
    if (imageEle) imageEle.remove();
    const button = document.getElementById("showImageButton");
    if (button) button.remove();
    showImage.setAutoDraw(false);
    return Scheduler.Event.NEXT;
  };
};
