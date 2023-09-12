import {
  clickedContinue,
  fixationConfig,
  instructionFont,
  modalButtonTriggeredViaKeyboard,
  targetKind,
  status,
} from "./global.js";
import { cleanFontName } from "./fonts.js";
import { replacePlaceholders } from "./multiLang.js";
import { _onlyClick } from "./response.js";
import { hideCursor, logger, cursorNearFixation } from "./utils.js";
import { psychoJS } from "./globalPsychoJS.js";
import { readi18nPhrases } from "./readPhrases.js";

export const returnOrClickProceed = (L, responseType, prev = "") => {
  switch (responseType) {
    case 0:
      return prev + readi18nPhrases("T_continueHitReturn", L);
    case 1:
      return prev + readi18nPhrases("T_continueClickProceed", L);
    default:
      return prev + readi18nPhrases("T_continueHitReturnOrClickProceed", L);
  }
};

export const spaceOrCrosshair = (L, responseType, prev = "") => {
  if (targetKind.current === "repeatedLetters") {
    switch (responseType) {
      case 0:
        return prev + readi18nPhrases("T_readyPressSpaceRepeatedLetters", L);
      case 1:
        return (
          prev + readi18nPhrases("T_readyClickCrosshairRepeatedLetters", L)
        );
      case 3:
        return (
          prev + readi18nPhrases("T_readyTrackCrosshairRepeatedLetters", L)
        );
      default:
        return (
          prev +
          readi18nPhrases("T_readyPressSpaceOrClickCrosshairRepeatedLetters", L)
        );
    }
  } else if (targetKind.current === "rsvpReading") {
    switch (responseType) {
      case 0:
        return prev + readi18nPhrases("T_readyPressSpaceRsvpReading", L);
      case 1:
        return prev + readi18nPhrases("T_readyClickCrosshairRsvpReading", L);
      case 3:
        return prev + readi18nPhrases("T_readyTrackCrosshairRsvpReading", L);
      default:
        return (
          prev +
          readi18nPhrases("T_readyPressSpaceOrClickCrosshairRsvpReading", L)
        );
    }
  } else {
    switch (responseType) {
      case 0:
        return prev + readi18nPhrases("T_readyPressSpace", L);
      case 1:
        return prev + readi18nPhrases("T_readyClickCrosshair", L);
      case 3:
        return prev + readi18nPhrases("T_readyTrackCrosshair", L);
      default:
        return prev + readi18nPhrases("T_readyPressSpaceOrClickCrosshair", L);
    }
  }
};

export const instructionsText = {
  initial: (L) => {
    return readi18nPhrases("T_thresholdSoundCheck", L) + `\n\n`;
  },
  vocoderPhraseBegin: (L) => {
    return readi18nPhrases("T_soundPhraseBlock", L) + "\n\n";
  },
  soundBegin: (L) => {
    return readi18nPhrases("T_thresholdSoundBeginBlock", L) + "\n\n";
  },
  speechInNoiseBegin: (L) => {
    return (
      readi18nPhrases("T_sentenceProcedure", L) +
      "\n\n" +
      readi18nPhrases("T_sentenceGuessingGame", L) +
      "\n\n"
    );
  },
  initialByThresholdParameter: {
    spacingDeg: (L, responseType = 2, trialsThisBlock = 0) => {
      const extraSpace = readi18nPhrases("EE_languageUseSpace", L) ? " " : "";
      let text;
      if (targetKind.current === "repeatedLetters") {
        text = replacePlaceholders(
          readi18nPhrases("T_thresholdRepeatedLettersBeginBlock", L),
          trialsThisBlock
        );
        switch (responseType) {
          case 0:
            text +=
              extraSpace +
              `${readi18nPhrases("T_pressingKeyRepeatedLetters", L)}\n\n`;
            break;
          case 1:
            text +=
              extraSpace +
              `${readi18nPhrases("T_clickingLetterRepeatedLetters", L)}\n\n`;
            break;
          default:
            text +=
              extraSpace +
              `${readi18nPhrases(
                "T_pressingKeyOrClickingLetterRepeatedLetters",
                L
              )}\n\n`;
            break;
        }
      } else {
        text = replacePlaceholders(
          readi18nPhrases("T_thresholdMiddleLetterBeginBlock", L),
          trialsThisBlock
        );
        switch (responseType) {
          case 0:
            text += extraSpace + `${readi18nPhrases("T_pressingKey", L)}\n\n`;
            break;
          case 1:
            text +=
              extraSpace + `${readi18nPhrases("T_clickingLetter", L)}\n\n`;
            break;
          default:
            text +=
              extraSpace +
              `${readi18nPhrases("T_pressingKeyOrClickingLetter", L)}\n\n`;
            break;
        }
      }
      return text;
    },
    targetSizeDeg: (L, responseType = 2, trialsThisBlock = 0) => {
      const extraSpace = readi18nPhrases("EE_languageUseSpace", L) ? " " : "";
      let text;
      if (targetKind.current === "repeatedLetters") {
        text = replacePlaceholders(
          readi18nPhrases("T_thresholdRepeatedLettersBeginBlock", L),
          trialsThisBlock
        );
        switch (responseType) {
          case 0:
            text +=
              extraSpace +
              `${readi18nPhrases("T_pressingKeyRepeatedLetters", L)}\n\n`;
            break;
          case 1:
            text +=
              extraSpace +
              `${readi18nPhrases("T_clickingLetterRepeatedLetters", L)}\n\n`;
            break;
          default:
            text +=
              extraSpace +
              `${readi18nPhrases(
                "T_pressingKeyOrClickingLetterRepeatedLetters",
                L
              )}\n\n`;
            break;
        }
      } else {
        text = replacePlaceholders(
          readi18nPhrases("T_thresholdLetterBeginBlock", L),
          trialsThisBlock
        );
        switch (responseType) {
          case 0:
            text += extraSpace + `${readi18nPhrases("T_pressingKey", L)}\n\n`;
            break;
          case 1:
            text +=
              extraSpace + `${readi18nPhrases("T_clickingLetter", L)}\n\n`;
            break;
          default:
            text +=
              extraSpace +
              `${readi18nPhrases("T_pressingKeyOrClickingLetter", L)}\n\n`;
            break;
        }
      }
      return text;
    },
    timing: (L, responseType = 1, trialsThisBlock = 0) => {
      const extraSpace = readi18nPhrases("EE_languageUseSpace", L) ? " " : "";
      let text;
      if (targetKind.current === "rsvpReading") {
        text = replacePlaceholders(
          readi18nPhrases("T_thresholdRsvpReadingBeginBlock", L),
          trialsThisBlock
        );
        logger("responseType", responseType);
        switch (responseType) {
          case 0:
            text +=
              extraSpace +
              `${readi18nPhrases(
                "T_pressingKeyRsvpReading",
                L
              )} ${readi18nPhrases("T_escapeToQuit", L)} ${readi18nPhrases(
                "T_continueHitReturn",
                L
              )}\n\n`;
            break;
          case 1:
            text +=
              extraSpace +
              `${readi18nPhrases(
                "T_clickingWordRsvpReading",
                L
              )} ${readi18nPhrases("T_escapeToQuit", L)} ${readi18nPhrases(
                "T_continueClickProceed",
                L
              )}\n\n`;
            break;
          case 2:
            text +=
              extraSpace +
              `${readi18nPhrases(
                "T_clickingWordRsvpReading",
                L
              )} ${readi18nPhrases("T_escapeToQuit", L)} ${readi18nPhrases(
                "T_continueHitReturnOrClickProceed",
                L
              )}\n\n`;
            break;
        }
      }
      return text;
    },
  },
  initialEnd: (L, responseType = 2) => {
    let t = readi18nPhrases("T_guessingGame", L) + " ";
    if (_onlyClick(responseType))
      t += "\n\n" + readi18nPhrases("T_whyClick", L) + "\n\n";
    t += readi18nPhrases("T_escapeToQuit", L) + " ";
    return returnOrClickProceed(L, responseType, t);
  },
  edu: {
    spacingDeg: (L) => {
      return readi18nPhrases("T_middleLetterDemo", L);
    },
    targetSizeDeg: (L) => {
      return readi18nPhrases("T_letterDemo", L);
    },
  },
  eduBelow: {
    spacingDeg: (L, responseType = 2) => {
      let t = readi18nPhrases("T_middleLetterBrief", L);
      return returnOrClickProceed(L, responseType, t);
    },
    targetSizeDeg: (L, responseType = 2) => {
      let t = readi18nPhrases("T_letterBrief", L);
      return returnOrClickProceed(L, responseType, t);
    },
  },
  trial: {
    fixate: {
      vocoderPhrase: (L) => {
        return readi18nPhrases("T_soundPhraseTrial", L);
      },
      sound: (L) => {
        return readi18nPhrases("T_thresholdSoundNewTrial", L);
      },
      spacingDeg: (L, responseType = 2) => {
        return spaceOrCrosshair(L, responseType, "");
      },
    },
    respond: {
      rsvpReading: (L, responseType) => {
        if (responseType === 0) {
          return readi18nPhrases("T_identifyPressItRsvpReading", L);
        } else {
          return readi18nPhrases("T_identifyClickItRsvpReading", L);
        }
      },
      vocoderPhrase: (L) => {
        return readi18nPhrases("T_soundPhraseResponse", L);
      },
      sound: (L) => {
        return readi18nPhrases("T_thresholdSoundResponse", L);
      },
      speechInNoise: (L) => {
        return readi18nPhrases("T_sentenceIdentifyClick", L);
      },
      spacingDeg: (L, responseType = 2) => {
        if (targetKind.current === "repeatedLetters") {
          switch (responseType) {
            case 0:
              return readi18nPhrases("T_identifyPressItRepeatedLetters", L);
            case 1:
              return readi18nPhrases("T_identifyClickItRepeatedLetters", L);
            default:
              return readi18nPhrases(
                "T_identifyPressItOrClickItRepeatedLetters",
                L
              );
          }
        } else {
          switch (responseType) {
            case 0:
              return readi18nPhrases("T_identifyMiddleLetterPressIt", L);
            case 1:
              return readi18nPhrases("T_identifyMiddleLetterClickIt", L);
            default:
              return readi18nPhrases(
                "T_identifyMiddleLetterPressItOrClickIt",
                L
              );
          }
        }
      },
      targetSizeDeg: (L, responseType = 2) => {
        if (targetKind.current === "repeatedLetters") {
          switch (responseType) {
            case 0:
              return readi18nPhrases("T_identifyPressItRepeatedLetters", L);
            case 1:
              return readi18nPhrases("T_identifyClickItRepeatedLetters", L);
            default:
              return readi18nPhrases(
                "T_identifyPressItOrClickItRepeatedLetters",
                L
              );
          }
        } else {
          switch (responseType) {
            case 0:
              return readi18nPhrases("T_identifyLetterPressIt", L);
            case 1:
              return readi18nPhrases("T_identifyLetterClickIt", L);
            default:
              return readi18nPhrases("T_identifyLetterPressItOrClickIt", L);
          }
        }
      },
      targetOffsetDeg: (L, responseType = 2) => {
        if (targetKind.current === "vernier") {
          switch (responseType) {
            case 0:
              return readi18nPhrases("T_identifyVernierPressIt", L);
            case 1:
              return readi18nPhrases("T_identifyVernierClickIt", L);
            default:
              return readi18nPhrases("T_identifyVernierPressItOrClickIt", L);
          }
        }
      },
    },
  },
  trialBreak: (L, responseType = 2) => {
    return returnOrClickProceed(L, responseType, "");
  },
  /* -------------------------------------------------------------------------- */
  // READING
  readingEdu: (L, pages) => {
    return readi18nPhrases("T_readingTask", L).replace("111", pages);
  },
};

/* -------------------------------------------------------------------------- */

export const addBeepButton = (L, synth) => {
  const b = document.createElement("button");
  b.innerText = readi18nPhrases("T_beep", L);
  b.onclick = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    synth.play();
    b.blur();
  };
  b.className = "threshold-button threshold-beep-button";
  b.id = "threshold-beep-button";

  document.body.appendChild(b);

  return b;
};

export const removeBeepButton = () => {
  const beepButton = document.getElementById("threshold-beep-button");
  if (beepButton) beepButton.remove();
};

/* -------------------------------------------------------------------------- */

export const addProceedButton = (L) => {
  const b = document.createElement("button");
  b.innerText = readi18nPhrases("T_proceed", L);
  b.onclick = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    b.remove();

    clickedContinue.current = true;
  };
  b.className = "threshold-button threshold-proceed-button";
  b.id = "threshold-proceed-button";

  document.body.appendChild(b);

  return b;
};

export const removeProceedButton = () => {
  const proceedButton = document.getElementById("threshold-proceed-button");
  if (proceedButton) proceedButton.remove();
};

/* ----------------------------- CLICK FIXATION ----------------------------- */
// On LETTER trial instructions
const _takeFixationClick = (e) => {
  if (String(e.target.tagName).toLowerCase() !== "canvas") return;

  if (modalButtonTriggeredViaKeyboard.current) {
    // modal button click event triggered by jquery
    modalButtonTriggeredViaKeyboard.current = false;
    return;
  }
  let cX, cY;
  if (e.clientX) {
    cX = e.clientX;
    cY = e.clientY;
  } else if (e.changedTouches) {
    const t = e.changedTouches[0];
    if (t.clientX) {
      cX = t.clientX;
      cY = t.clientY;
    } else {
      clickedContinue.current = false;
      return;
    }
  } else if (e.x) {
    cX = e.x;
    cY = e.y;
  } else {
    clickedContinue.current = false;
    return;
  }
  cX -= Math.round(psychoJS._window._size[0] / 2);
  cY = -cY + Math.round(psychoJS._window._size[1] / 2);
  if (cursorNearFixation(cX, cY)) {
    // Clicked on fixation
    movePastFixation();
  } else {
    // wrongSynth.play();
    clickedContinue.current = false;
  }
};

export const addHandlerForClickingFixation = (reader) => {
  // If fixation is to be clicked (ie not tracked) then add a handler
  if (!reader.read("responseMustTrackCrosshairBool", status.block_condition)) {
    document.addEventListener("click", _takeFixationClick);
    document.addEventListener("touchend", _takeFixationClick);
  }
};
export const removeHandlerForClickingFixation = () => {
  document.removeEventListener("click", _takeFixationClick);
  document.removeEventListener("touchend", _takeFixationClick);
};

export const checkIfCursorIsTrackingFixation = (t, reader) => {
  // When cursor is near fixation...
  if (cursorNearFixation()) {
    // ...set a time at which to move on (if still near fixation), if one isn't set already
    if (typeof fixationConfig.trackingTimeAfterDelay === "undefined") {
      const maxDelaySec = reader.read(
        "responseMustTrackMaxSec",
        status.block_condition
      );
      const minDelaySec = reader.read(
        "responseMustTrackMinSec",
        status.block_condition
      );
      const delaySec =
        Math.random() * (maxDelaySec - minDelaySec) + minDelaySec;
      fixationConfig.trackingTimeAfterDelay = t + delaySec;
      // ... else end the routine if it is that time.
    } else if (t >= fixationConfig.trackingTimeAfterDelay) {
      fixationConfig.trackingTimeAfterDelay = undefined;
      movePastFixation();
    }
    // And reset that time if the cursor moves away from fixation.
  } else {
    if (
      t >= fixationConfig.trackingTimeAfterDelay ||
      reader.read("responseMustTrackContinuouslyBool", status.block_condition)
    ) {
      fixationConfig.trackingTimeAfterDelay = undefined;
    }
  }
};

export const movePastFixation = () => {
  hideCursor();
  clickedContinue.current = true;
  clickedContinue.timestamps.push(performance.now());
};

/* -------------------------------------------------------------------------- */

// Dynamically adjust instruction SIZE

export const dynamicSetSize = (instructionList, initHeight) => {
  let reducedHeight = 1;
  while (
    getSumHeight(instructionList) >
    window.innerHeight * (1 - 0.2 * instructionList.length)
  ) {
    instructionList.forEach((e) => {
      e.setHeight(initHeight - reducedHeight);
    });
    reducedHeight++;
  }
};

const getSumHeight = (instructionList) => {
  let total = 0;
  for (const instruction of instructionList)
    total += instruction.getBoundingBox().height;
  return total;
};

/**
 *
 * @param {"block"|"stimulus"|"response"} when
 * @param {*} instructionStim
 * @param {*} reader
 * @param {*} blockOrCondition
 */
export const getCustomInstructionText = (when, reader, blockOrCondition) => {
  let instructionText;
  switch (when) {
    case "block":
      if (reader.read("instructionForBlock", blockOrCondition).some(Boolean)) {
        instructionText = reader
          .read("instructionForBlock", blockOrCondition)
          .join("\n");
      } else {
        instructionText = "";
      }
      break;
    case "stimulus":
      instructionText = reader.read("instructionForStimulus", blockOrCondition);
      break;
    case "response":
      instructionText = reader.read("instructionForResponse", blockOrCondition);
      break;
  }
  return instructionText;
};

export const getStimulusCustomInstructionPos = (reader, BC) => {
  const requestedPosition = reader.read("instructionForStimulusLocation", BC);
  switch (requestedPosition) {
    case "top":
      return [0, window.innerHeight * 0.4];
    case "upperLeft":
      return [window.innerWidth * -0.4, window.innerHeight * 0.4];
    case "upperRight":
      return [window.innerWidth * 0.4, window.innerHeight * 0.4];
  }
};

export const updateInstructionFont = (
  reader,
  blockOrCondition,
  instructionStims
) => {
  let font = reader.read("instructionFont", blockOrCondition);
  let source = reader.read("instructionFontSource", blockOrCondition);
  if (font instanceof Array) font = font[0];
  if (source instanceof Array) source = source[0];
  instructionFont.current = font;
  if (source === "file")
    instructionFont.current = cleanFontName(instructionFont.current);
  instructionStims.forEach((s) => s.setFont(instructionFont.current));
};
