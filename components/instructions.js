import { phrases } from "./i18n.js";
import {
  clickedContinue,
  fixationConfig,
  modalButtonTriggeredViaKeyboard,
  targetKind,
} from "./global.js";
import { replacePlaceholders } from "./multiLang.js";
import { _onlyClick } from "./response.js";
import { hideCursor, logger } from "./utils.js";
import { psychoJS, psychojsMouse, to_px } from "./globalPsychoJS.js";

export const returnOrClickProceed = (L, responseType, prev = "") => {
  switch (responseType) {
    case 0:
      return prev + phrases.T_continueHitReturn[L];
    case 1:
      return prev + phrases.T_continueClickProceed[L];
    default:
      return prev + phrases.T_continueHitReturnOrClickProceed[L];
  }
};

export const spaceOrCrosshair = (L, responseType, prev = "") => {
  if (targetKind.current === "repeatedLetters") {
    switch (responseType) {
      case 0:
        return prev + phrases.T_readyPressSpaceRepeatedLetters[L];
      case 1:
        return prev + phrases.T_readyClickCrosshairRepeatedLetters[L];
      default:
        return (
          prev + phrases.T_readyPressSpaceOrClickCrosshairRepeatedLetters[L]
        );
    }
  } else {
    switch (responseType) {
      case 0:
        return prev + phrases.T_readyPressSpace[L];
      case 1:
        return prev + phrases.T_readyClickCrosshair[L];
      default:
        return prev + phrases.T_readyPressSpaceOrClickCrosshair[L];
    }
  }
};

export const instructionsText = {
  initial: (L) => {
    return phrases.T_thresholdSoundCheck[L] + `\n\n`;
  },
  vocoderPhraseBegin: (L) => {
    return phrases.T_soundPhraseBlock[L] + "\n\n";
  },
  soundBegin: (L) => {
    return phrases.T_thresholdSoundBeginBlock[L] + "\n\n";
  },
  speechInNoiseBegin: (L) => {
    return (
      phrases.T_sentenceProcedure[L] +
      "\n\n" +
      phrases.T_sentenceGuessingGame[L] +
      "\n\n"
    );
  },
  popularFeatures: (L, takeABreakTrialCreditsThisBlock = 0) => {
    return takeABreakTrialCreditsThisBlock === 0
      ? ""
      : phrases.T_letterPopularDemandFeatures[L] + "\n\n";
  },
  initialByThresholdParameter: {
    spacing: (L, responseType = 2, trialsThisBlock = 0) => {
      const extraSpace = phrases.EE_languageUseSpace[L] ? " " : "";
      let text;
      if (targetKind.current === "repeatedLetters") {
        text = replacePlaceholders(
          phrases.T_thresholdRepeatedLettersBeginBlock[L],
          trialsThisBlock
        );
        switch (responseType) {
          case 0:
            text +=
              extraSpace + `${phrases.T_pressingKeyRepeatedLetters[L]}\n\n`;
            break;
          case 1:
            text +=
              extraSpace + `${phrases.T_clickingLetterRepeatedLetters[L]}\n\n`;
            break;
          default:
            text +=
              extraSpace +
              `${phrases.T_pressingKeyOrClickingLetterRepeatedLetters[L]}\n\n`;
            break;
        }
      } else {
        text = replacePlaceholders(
          phrases.T_thresholdBeginBlock[L],
          trialsThisBlock
        );
        switch (responseType) {
          case 0:
            text += extraSpace + `${phrases.T_pressingKey[L]}\n\n`;
            break;
          case 1:
            text += extraSpace + `${phrases.T_clickingLetter[L]}\n\n`;
            break;
          default:
            text +=
              extraSpace + `${phrases.T_pressingKeyOrClickingLetter[L]}\n\n`;
            break;
        }
      }
      return text;
    },
    timing: (L, responseType = 1, trialsThisBlock = 0) => {
      const extraSpace = phrases.EE_languageUseSpace[L] ? " " : "";
      let text;
      if (targetKind.current === "rsvpReading") {
        text = replacePlaceholders(
          phrases.T_thresholdRsvpReadingBeginBlock[L],
          trialsThisBlock
        );
        switch (responseType) {
          case 0:
            // TODO keypress isn't defined yet
            break;
          case 1:
            text += extraSpace + `${phrases.T_clickingWordRSVPReading[L]}\n\n`;
            break;
        }
      }
      return text;
    },
  },
  initialEnd: (L, responseType = 2) => {
    let t = phrases.T_guessingGame[L] + " ";
    if (_onlyClick(responseType)) t += "\n\n" + phrases.T_whyClick[L] + "\n\n";
    t += phrases.T_escapeToQuit[L] + " ";
    return returnOrClickProceed(L, responseType, t);
  },
  edu: (L) => {
    return phrases.T_middleLetterDemo[L];
  },
  eduBelow: (L, responseType = 2) => {
    let t = phrases.T_middleLetterBrief[L];
    return returnOrClickProceed(L, responseType, t);
  },
  trial: {
    fixate: {
      vocoderPhrase: (L) => {
        return phrases.T_soundPhraseTrial[L];
      },
      sound: (L) => {
        return phrases.T_thresholdSoundNewTrial[L];
      },
      spacing: (L, responseType = 2) => {
        return spaceOrCrosshair(L, responseType, "");
      },
    },
    respond: {
      rsvpReading: (L) => {
        return phrases.T_identifyClickItRsvpReading[L];
      },
      vocoderPhrase: (L) => {
        return phrases.T_soundPhraseResponse[L];
      },
      sound: (L) => {
        return phrases.T_thresholdSoundResponse[L];
      },
      speechInNoise: (L) => {
        return phrases.T_sentenceIdentifyClick[L];
      },
      spacing: (L, responseType = 2) => {
        if (targetKind.current === "repeatedLetters") {
          switch (responseType) {
            case 0:
              return phrases.T_identifyPressItRepeatedLetters[L];
            case 1:
              return phrases.T_identifyClickItRepeatedLetters[L];
            default:
              return phrases.T_identifyPressItOrClickItRepeatedLetters[L];
          }
        } else {
          switch (responseType) {
            case 0:
              return phrases.T_identifyPressIt[L];
            case 1:
              return phrases.T_identifyClickIt[L];
            default:
              return phrases.T_identifyPressItOrClickIt[L];
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
    return phrases.T_readingTask[L].replace("111", pages);
  },
};

/* -------------------------------------------------------------------------- */

export const addBeepButton = (L, synth) => {
  const b = document.createElement("button");
  b.innerText = phrases.T_beep[L];
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
  b.innerText = phrases.T_proceed[L];
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
export const _takeFixationClick = (e) => {
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
  // Analogs to [cX, cY], as determined by psychojs
  const [pX, pY] = to_px(
    psychojsMouse.getPos(),
    "height",
    psychoJS.window,
    true
  );
  // Verify positions are consistent
  if (cX !== pX || cY !== pY)
    console.error(
      `[cX,cY] are inconsistent with mouse position registered by psychoJS, [cX,cY] ${[
        cX,
        cY,
      ]}, [pX, pY] ${[pX, pY]}`
    );
  const clickDistanceFromFixation = Math.hypot(
    cX - fixationConfig.pos[0],
    cY - fixationConfig.pos[1]
  );
  const clickingInFixation =
    clickDistanceFromFixation <= fixationConfig.markingFixationHotSpotRadiusPx;
  if (clickingInFixation) {
    // Clicked on fixation
    movePastFixation();
  } else {
    // wrongSynth.play();
    clickedContinue.current = false;
  }
};

export const movePastFixation = () => {
  hideCursor();
  if (fixationConfig.stim) fixationConfig.stim.setAutoDraw(false);
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
