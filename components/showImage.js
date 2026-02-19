import { Scheduler } from "../psychojs/src/util";
import { updateColor } from "./color";
import {
  _key_resp_allKeys,
  clickedContinue,
  instructionFont,
  keypad,
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
import { toShowCursor } from "./utils";

export const createTransparentImage = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  canvas.getContext("2d").clearRect(0, 0, 1, 1);

  const dataUrl = canvas.toDataURL("image/png");
  const img = new Image();
  img.src = dataUrl;
  return img;
};

/********************************************
 * Module-level variables for FLIP_REPEAT   *
 * so we can share state between Begin/Frame *
 ********************************************/
let waitingTransparencyFrames = 0;
let realImageLoaded = false;
let realImageElement = null;
let doneSettingRealImage = false;

let storedArgs = {
  fileName: "",
  resopnseClickedBool: false,
  showCounterBool: false,
  showViewingDistanceBool: false,
  trialCounter: null,
  instructions: null,
  targetSpecs: null,
  colorRGBA: null,
  showImage: null,
  language: "",
};

/*******************************************
 * showImageBegin
 *******************************************/
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
    storedArgs.fileName = fileName;
    storedArgs.resopnseClickedBool = resopnseClickedBool;
    storedArgs.showCounterBool = showCounterBool;
    storedArgs.showViewingDistanceBool = showViewingDistanceBool;
    storedArgs.trialCounter = trialCounter;
    storedArgs.instructions = instructions;
    storedArgs.targetSpecs = targetSpecs;
    storedArgs.colorRGBA = colorRGBA;
    storedArgs.showImage = showImage;
    storedArgs.language = language;

    waitingTransparencyFrames = 0;
    realImageLoaded = false;
    realImageElement = null;
    doneSettingRealImage = false;
    numFrames = 0;

    if (instructions) {
      instructions.setAutoDraw(false);
    }
    if (targetSpecs) {
      targetSpecs.setAutoDraw(false);
    }

    screenBackground.colorRGBA = colorRGBA;
    psychoJS.window.color = new util.Color(screenBackground.colorRGBA);
    psychoJS.window._needUpdate = true;

    showImage.setAutoDraw(false);
    showImage._needUpdate = true;
    showImage.setImage(createTransparentImage());
    showImage.setAutoDraw(true);

    realImageElement = document.createElement("img");
    realImageElement.src = `./images/${fileName}`;
    realImageElement.id = "showImageEle";
    realImageElement.style.display = "block";
    realImageElement.style.margin = "auto";

    realImageElement.onload = () => {
      realImageLoaded = true;
    };

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

/*******************************************
 * showImageEachFrame (uses FLIP_REPEAT)
 *******************************************/
var numFrames = 0;
export const showImageEachFrame = (
  responseTypedBool,
  responseClickedBool,
  language,
) => {
  return async function () {
    if (toShowCursor()) {
      return Scheduler.Event.NEXT;
    }

    numFrames++;

    waitingTransparencyFrames++;

    if (!doneSettingRealImage) {
      if (waitingTransparencyFrames <= 2) {
        return Scheduler.Event.FLIP_REPEAT; // show transparent image again
      }

      if (!realImageLoaded) {
        return Scheduler.Event.FLIP_REPEAT;
      }

      const screenHeight = window.innerHeight;
      const screenWidth = window.innerWidth;
      const imgHeight = realImageElement.naturalHeight;
      const imgWidth = realImageElement.naturalWidth;

      const heightRatio = screenHeight / imgHeight;
      const widthRatio = screenWidth / imgWidth;
      let widthScale, heightScale;

      if (imgWidth * heightRatio > screenWidth) {
        heightScale = imgHeight / imgWidth;
        widthScale = 1;
      } else {
        heightScale = 1;
        widthScale = imgWidth / imgHeight;
      }

      storedArgs.showImage.setImage(realImageElement);
      storedArgs.showImage.setSize([widthScale, heightScale]);
      storedArgs.showImage._needUpdate = true;
      storedArgs.showImage.setAutoDraw(true);

      storedArgs.trialCounter._needUpdate = true;
      storedArgs.trialCounter.setAutoDraw(true);

      if (responseClickedBool) {
        const button = document.createElement("button");
        button.id = "showImageButton";
        button.classList.add("threshold-button", "threshold-proceed-button");
        button.innerHTML = readi18nPhrases("T_proceed", language);
        button.addEventListener("click", () => {
          clickedContinue.current = true;
        });
        document.body.appendChild(button);
      }

      doneSettingRealImage = true;
    }

    const returnKey = psychoJS.eventManager.getKeys({ keyList: ["return"] });
    const keyPadReturn =
      keypad.handler &&
      keypad.handler.inUse(status.block) &&
      _key_resp_allKeys.current
        .map((r) => r.name)
        .some((s) =>
          [
            "return",
            readi18nPhrases("T_RETURN", language).toLowerCase(),
          ].includes(s.toLowerCase()),
        );

    if (
      numFrames > 5 &&
      responseTypedBool &&
      (returnKey.length > 0 || keyPadReturn)
    ) {
      if (keypad.handler) {
        keypad.handler.clearKeys();
      }
      return Scheduler.Event.NEXT;
    }

    if (responseClickedBool && clickedContinue.current) {
      clickedContinue.current = false;
      return Scheduler.Event.NEXT;
    }

    return Scheduler.Event.FLIP_REPEAT;
  };
};

/*******************************************
 * showImageEnd
 *******************************************/
export const showImageEnd = (showImage) => {
  return async function () {
    const imageEle = document.getElementById("showImageEle");
    if (imageEle) imageEle.remove();

    const button = document.getElementById("showImageButton");
    if (button) button.remove();

    showImage.setAutoDraw(false);
    showImage._needUpdate = true;

    return Scheduler.Event.NEXT;
  };
};
