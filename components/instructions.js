import { phrases } from "./i18n.js";
import { replacePlaceholders } from "./multiLang.js";
import { _responseTypes } from "./response.js";

export const responseHintByResponseType = (L, responseType, prev = "") => {
  switch (responseType) {
    case 0:
      return prev + phrases.T_continueHitReturn[L];
    case 1:
      return prev + phrases.T_continueClickAnywhere[L];
    default:
      return prev + phrases.T_continueHitReturnOrClickAnywhere[L];
  }
};

export const proceedHintByResponseType = (L, responseType, prev = "") => {
  switch (responseType) {
    case 0:
      return prev + phrases.T_readyPressSpace[L];
    case 1:
      return prev + phrases.T_readyClickCrosshair[L];
    default:
      return prev + phrases.T_readyPressSpaceOrClickCrosshair[L];
  }
};

export const instructionsText = {
  initial: (L, takeABreakTrialCreditsThisBlock = 0) => {
    const t1 = phrases.T_thresholdSoundCheck[L] + `\n\n`;
    const t2 =
      takeABreakTrialCreditsThisBlock == 0 ? "" : phrases.T_takingBreaks[L];
    return t1 + t2 + `\n\n`;
  },
  initialByThresholdParameter: {
    spacing: (L, responseType = 2, trialsThisBlock = 0) => {
      const extraSpace = phrases.EE_languageUseSpace[L] ? " " : "";
      let text = replacePlaceholders(
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
      return text;
    },
  },
  initialEnd: (L, responseType = 2) => {
    let t = phrases.T_guessingGame[L] + " ";
    if (_onlyClick(responseType)) t += "\n\n" + phrases.T_whyClick[L] + "\n\n";
    t += phrases.T_escapeToQuit[L] + " ";
    return responseHintByResponseType(L, responseType, t);
  },
  edu: (L) => {
    return phrases.T_middleLetterDemo[L];
  },
  eduBelow: (L, responseType = 2) => {
    let t = phrases.T_middleLetterBrief[L];
    return responseHintByResponseType(L, responseType, t);
  },
  trial: {
    fixate: {
      spacing: (L, responseType = 2) => {
        return proceedHintByResponseType(L, responseType, "");
      },
    },
    respond: {
      spacing: (L, responseType = 2) => {
        switch (responseType) {
          case 0:
            return phrases.T_identifyPressIt[L];
          case 1:
            return phrases.T_identifyClickIt[L];
          default:
            return phrases.T_identifyPressItOrClickIt[L];
        }
      },
    },
  },
  trialBreak: (L, responseType = 2) => {
    return responseHintByResponseType(L, responseType, "");
  },
};

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
  b.className = "threshold-beep-button";
  b.id = "threshold-beep-button";

  document.body.appendChild(b);

  return b;
};

export const removeBeepButton = (button) => {
  document.body.removeChild(button);
};

/* -------------------------------------------------------------------------- */

const _onlyClick = (responseType) => {
  const types = _responseTypes[responseType];
  return types[0] && !types[1] && !types[2] && !types[3];
};
