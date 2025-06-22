/********************
 * Imports & Globals *
 ********************/
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

/**
 * Creates and returns a 1×1 fully transparent HTMLImageElement.
 */
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
    // Store the function arguments in our module-level object so we can read them in eachFrame.
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

    // Reset state for the FLIP_REPEAT logic
    waitingTransparencyFrames = 0;
    realImageLoaded = false;
    realImageElement = null;
    doneSettingRealImage = false;
    numFrames = 0; // Also reset your typed-key count

    // Hide old instructions and target specs
    if (instructions) {
      instructions.setAutoDraw(false);
    }
    if (targetSpecs) {
      targetSpecs.setAutoDraw(false);
    }

    // Set screen background color
    screenBackground.colorRGBA = colorRGBA;
    psychoJS.window.color = new util.Color(screenBackground.colorRGBA);
    psychoJS.window._needUpdate = true;

    // First, hide the old image and replace with transparent
    showImage.setAutoDraw(false);
    showImage._needUpdate = true;
    showImage.setImage(createTransparentImage());
    showImage.setAutoDraw(true);

    // Create & start loading the real image asynchronously
    realImageElement = document.createElement("img");
    realImageElement.src = `./images/${fileName}`;
    realImageElement.id = "showImageEle";
    realImageElement.style.display = "block";
    realImageElement.style.margin = "auto";

    // When real image is loaded, we set a flag (we do not scale or set it yet).
    realImageElement.onload = () => {
      realImageLoaded = true;
    };

    // If we want to show a trial counter or viewing distance, we can set that text now
    // (It won't be aligned to the real image yet, but typically that's okay.)
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

    // Clear any leftover key events
    psychoJS.eventManager.clearKeys();

    // Move on to showImageEachFrame (which will FLIP_REPEAT until we're done)
    return Scheduler.Event.NEXT;
  };
};

/*******************************************
 * showImageEachFrame (uses FLIP_REPEAT)
 *******************************************/
var numFrames = 0; // track how many frames have elapsed since we started
export const showImageEachFrame = (
  responseTypedBool,
  responseClickedBool,
  language,
) => {
  return async function () {
    // Check for block skip request (from Command+Shift+Right Arrow)
    if (toShowCursor()) {
      return Scheduler.Event.NEXT;
    }

    // We'll increment numFrames each call
    numFrames++;

    // We'll also use our waitingTransparencyFrames to ensure at least 1 blank frame
    waitingTransparencyFrames++;

    // If we have NOT yet set the real image:
    if (!doneSettingRealImage) {
      // We want at least 1 frame of transparency. So if waitingTransparencyFrames <= 1, keep flipping.
      if (waitingTransparencyFrames <= 2) {
        return Scheduler.Event.FLIP_REPEAT; // show transparent image again
      }

      // If the real image is NOT yet loaded, keep waiting
      if (!realImageLoaded) {
        return Scheduler.Event.FLIP_REPEAT;
      }

      // Otherwise, the image is loaded, and we've waited at least 1 frame. Let's set the real image now.
      const screenHeight = window.innerHeight;
      const screenWidth = window.innerWidth;
      const imgHeight = realImageElement.naturalHeight;
      const imgWidth = realImageElement.naturalWidth;

      // Calculate scale ratios
      const heightRatio = screenHeight / imgHeight;
      const widthRatio = screenWidth / imgWidth;
      let widthScale, heightScale;

      // Check if scaling by height ratio overflows width
      if (imgWidth * heightRatio > screenWidth) {
        // Width is limiting factor
        heightScale = imgHeight / imgWidth;
        widthScale = 1;
      } else {
        // Height is limiting factor
        heightScale = 1;
        widthScale = imgWidth / imgHeight;
      }

      // Now set the real image on showImage
      storedArgs.showImage.setImage(realImageElement);
      storedArgs.showImage.setSize([widthScale, heightScale]);
      storedArgs.showImage._needUpdate = true;
      storedArgs.showImage.setAutoDraw(true);

      // Also ensure the trialCounter is drawn (in case it was turned off before)
      storedArgs.trialCounter._needUpdate = true;
      storedArgs.trialCounter.setAutoDraw(true);

      // If we need a "Proceed" button, create it now
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

      // Mark that we've switched from transparent -> real
      doneSettingRealImage = true;
    }

    // ---------------------------
    // Now handle typed/clicked logic
    // ---------------------------
    const returnKey = psychoJS.eventManager.getKeys({ keyList: ["return"] });
    const keyPadReturn =
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
      keypad.handler.clearKeys();
      return Scheduler.Event.NEXT;
    }

    if (responseClickedBool && clickedContinue.current) {
      clickedContinue.current = false;
      return Scheduler.Event.NEXT;
    }

    // If none of the conditions to end are met, keep flipping frames
    return Scheduler.Event.FLIP_REPEAT;
  };
};

/*******************************************
 * showImageEnd
 *******************************************/
export const showImageEnd = (showImage) => {
  return async function () {
    // Remove the real <img> element from the DOM if it exists
    const imageEle = document.getElementById("showImageEle");
    if (imageEle) imageEle.remove();

    // Remove the proceed button if it exists
    const button = document.getElementById("showImageButton");
    if (button) button.remove();

    // Hide the PsychoJS ImageStim
    showImage.setAutoDraw(false);
    showImage._needUpdate = true;

    return Scheduler.Event.NEXT;
  };
};
