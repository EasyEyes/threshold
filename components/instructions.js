export const instructionsText = {
  initial: (participantName = null) => {
    return `Hello${
      participantName === null ? "" : ` ${participantName}`
    }. Please make sure this computer's sound is enabled by clicking the Beep button.\n\n`;
  },
  initialByThresholdParameter: {
    spacing: (responseType = 2) => {
      /**
       * responseType
       * 0 - TYPED
       * 1 - CLICKED
       * 2 - TYPED or CLICKED
       */
      let text = `When you see three letters, please report just the middle letter, `;
      switch (responseType) {
        case 0:
          text += `by pressing it in the keyboard.\n\n`;
          break;
        case 1:
          text += `by clicking it in the displayed list of letters.\n\n`;
          break;
        default:
          text += `by pressing it in the keyboard or clicking it in the displayed list of letters.\n\n`;
          break;
      }
      return text;
    },
  },
  initialEnd: (responseType = 2) => {
    let t = `Sometimes the letters will be easy to identify. Sometimes nearly impossible. You can't get much more than half right, so relax. Think of it as a guessing game, and just get as many as you can. (Quit anytime by pressing ESCAPE.) `;
    switch (responseType) {
      case 0:
        return t + `To continue, please hit RETURN.`;
      case 1:
        return t + `To continue, click anywhere.`;
      default:
        return t + `To continue, please hit RETURN or click anywhere.`;
    }
  },
  block: (block = 0) => {
    return (
      `This is block ${block}.\n\n` +
      `IMPORTANT: Please resist the temptation to type your response as soon as you find a matching response letter. Instead, please hold off responding until your eye is back on the crosshair. Always wait until you're fixating the crosshair before responding. To continue hit RETURN.`
    );
  },
  trial: {
    fixate: {
      spacing: (responseType = 2) => {
        switch (responseType) {
          case 0:
            return `While looking directly at the crosshair, please press the SPACE bar.`;
          case 1:
            return `While looking directly at the crosshair, please click on the crosshair.`;
          default:
            return `While looking directly at the crosshair, please press the SPACE bar or click on the crosshair.`;
        }
      },
    },
    respond: {
      spacing: (responseType = 2) => {
        switch (responseType) {
          case 0:
            return `Please identify the middle letter, by pressing it in the keyboard.`;
          case 1:
            return `Please identify the middle letter, by clicking it below.`;
          default:
            return `Please identify the middle letter, by pressing it in the keyboard or clicking it below.`;
        }
      },
    },
  },
};

export const addBeepButton = (synth) => {
  const b = document.createElement("button");
  b.innerText = "Beep";
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
