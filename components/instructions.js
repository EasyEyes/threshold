import { phrases } from "./i18n.js";
import { replacePlaceholders } from "./multiLang.js";

/**
 * responseType
 *      click   type    keypad    speak
 * 0    x       o       x         x
 * 1    o       x       x         x
 * 2    o       o       x         x
 * 3
 * 4
 * 5
 * 6
 * 7
 * 8
 * 9
 * 10
 * 11
 * 12
 * 13
 * 14
 * 15
 */

export const getResponseType = (click, type, keypad, speak) => {
  const c = click,
    t = type,
    k = keypad,
    s = speak;
  if (!c && t && !k && !s) return 0;
  else if (c && !t && !k && !s) return 1;
  else if (c && t && !k && !s) return 2;
  else return 2;
  // TODO finish other situations
};

export const instructionsText = {
  initial: (L) => {
    return phrases.T_thresholdSoundCheck[L] + `\n\n`;
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
    switch (responseType) {
      case 0:
        return t + phrases.T_continueHitReturn[L];
      case 1:
        return t + phrases.T_continueClickAnywhere[L];
      default:
        return t + phrases.T_continueHitReturnOrClickAnywhere[L];
    }
  },
  edu: (L) => {
    return phrases.T_middleLetterDemo[L];
  },
  eduBelow: (L, responseType = 2) => {
    let t = phrases.T_middleLetterBrief[L];
    switch (responseType) {
      case 0:
        return t + phrases.T_continueHitReturn[L];
      case 1:
        return t + phrases.T_continueClickAnywhere[L];
      default:
        return t + phrases.T_continueHitReturnOrClickAnywhere[L];
    }
  },
  trial: {
    fixate: {
      spacing: (L, responseType = 2) => {
        switch (responseType) {
          case 0:
            return phrases.T_readyPressSpace[L];
          case 1:
            return phrases.T_readyClickCrosshair[L];
          default:
            return phrases.T_readyPressSpaceOrClickCrosshair[L];
        }
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
