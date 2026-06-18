import { Scheduler } from "../psychojs/src/util";
import { updateColor } from "./color";
import {
  _key_resp_allKeys,
  clickedContinue,
  instructionFont,
  keypad,
  screenBackground,
  showConditionNameConfig,
  status,
  targetKind,
  totalBlocks,
  trialCounterConfig,
  viewingDistanceCm,
} from "./global";
import { drawTargetSpecs, updateTargetSpecs } from "./showTrialInformation";
import { psychoJS } from "./globalPsychoJS";
import { readi18nPhrases } from "./readPhrases";
import { getTrialInfoStr } from "./trialCounter";
import * as util from "../psychojs/src/util/index.js";
import { areQuestionAndAnswerParametersPresent, toShowCursor } from "./utils";
import {
  parseImageQuestionAndAnswer,
  questionAndAnswerForImage,
} from "./image";

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
let qaStarted = false;
let qaFinished = false;

let storedArgs = {
  showImage: null,
  trialCounter: null,
  spareFraction: 0,
  where: "top",
  blockCondition: null,
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
  conditionName,
  showConditionNameBool,
  conditionNameText,
  showTargetSpecsBool,
  colorRGBA,
  showImage,
  language,
  spareFraction = 0,
  where = "top",
  blockCondition = null,
) => {
  return async function () {
    storedArgs.showImage = showImage;
    storedArgs.trialCounter = trialCounter;
    storedArgs.spareFraction = Math.max(
      0,
      Math.min(1, Number(spareFraction) || 0),
    );
    storedArgs.where = ["top", "bottom", "left", "right"].includes(where)
      ? where
      : "top";
    storedArgs.blockCondition = blockCondition;

    waitingTransparencyFrames = 0;
    realImageLoaded = false;
    realImageElement = null;
    doneSettingRealImage = false;
    qaStarted = false;
    qaFinished = false;
    numFrames = 0;

    if (instructions) {
      instructions.setAutoDraw(false);
    }
    if (targetSpecs) {
      targetSpecs.setAutoDraw(false);
    }

    showConditionNameConfig.show = showConditionNameBool;
    showConditionNameConfig.name = conditionNameText;
    showConditionNameConfig.showTargetSpecs = showTargetSpecsBool;
    updateTargetSpecs({
      showImage: fileName,
      showImageSpareFraction: spareFraction,
      showImageWhere: where,
    });
    drawTargetSpecs(targetSpecs, conditionName, blockCondition);

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

      const f = storedArgs.spareFraction;
      const where = storedArgs.where;
      // Window units are "height": 1 unit = min(winW, winH) pixels in BOTH axes.
      // Full screen: height = 1, width = screenAspect (= screenWidth/screenHeight).
      // All computations below produce height-unit values.
      let widthScale,
        heightScale,
        posX = 0,
        posY = 0;
      const effectiveF = Math.max(0, Math.min(1, f));
      const screenAspect = screenWidth / screenHeight;

      // Compute the image region in height units
      let regionW, regionH;
      if (where === "top" || where === "bottom") {
        regionW = screenAspect;
        regionH = 1 - effectiveF;
        posY = where === "top" ? effectiveF / 2 : -effectiveF / 2;
      } else {
        regionW = (1 - effectiveF) * screenAspect;
        regionH = 1;
        posX =
          where === "left"
            ? (-effectiveF * screenAspect) / 2
            : (effectiveF * screenAspect) / 2;
      }

      // Scale image to fill region as large as possible, preserving aspect ratio.
      // Image touches at least one edge of the region, never extends beyond it.
      const imgAspect = imgWidth / imgHeight;
      const regionAspect = regionW / regionH;
      if (imgAspect > regionAspect) {
        // Image is wider than region → constrain by width
        widthScale = regionW;
        heightScale = regionW / imgAspect;
      } else {
        // Image is taller than region → constrain by height
        heightScale = regionH;
        widthScale = regionH * imgAspect;
      }

      storedArgs.showImage.setImage(realImageElement);
      storedArgs.showImage.setSize([widthScale, heightScale]);
      storedArgs.showImage.setPos([posX, posY]);
      storedArgs.showImage._needUpdate = true;
      storedArgs.showImage.setAutoDraw(true);

      storedArgs.trialCounter._needUpdate = true;
      storedArgs.trialCounter.setAutoDraw(true);

      const _BC = storedArgs.blockCondition || status.block_condition;
      const hasQA = _BC && areQuestionAndAnswerParametersPresent(_BC);
      if (responseClickedBool && !hasQA) {
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

    const BC_for_qa = storedArgs.blockCondition || status.block_condition;
    if (
      doneSettingRealImage &&
      !qaStarted &&
      BC_for_qa &&
      areQuestionAndAnswerParametersPresent(BC_for_qa)
    ) {
      qaStarted = true;
      const BC = BC_for_qa;
      (async () => {
        // Reserve space on the side where the progress bar lives so the modal
        // does not overlap it. Progress bar is ~30px wide pinned ~5px from
        // an edge; reserve 60px to leave a comfortable gap.
        const progressEl = document.getElementById(
          "experiment-progress-container",
        );
        const progressOnLeft =
          progressEl &&
          progressEl.style.left &&
          progressEl.style.left !== "auto";
        const padProp = progressOnLeft ? "padding-left" : "padding-right";
        const qaPadStyle = document.createElement("style");
        qaPadStyle.textContent = `.swal2-qa-padded { ${padProp}: 60px !important; box-sizing: border-box !important; }`;
        document.head.appendChild(qaPadStyle);
        try {
          parseImageQuestionAndAnswer(BC, { skipIdentify: true });
          await questionAndAnswerForImage(BC, {
            spareFraction: storedArgs.spareFraction,
            where: storedArgs.where,
            backdrop: false,
            containerClass: "swal2-qa-padded",
          });
        } catch (e) {
          console.warn("showImage QA failed:", e);
        } finally {
          qaPadStyle.remove();
          qaFinished = true;
        }
      })();
    }

    if (qaStarted) {
      if (qaFinished) return Scheduler.Event.NEXT;
      return Scheduler.Event.FLIP_REPEAT;
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
