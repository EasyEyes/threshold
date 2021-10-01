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
  initialEnd: () =>
    `Sometimes the letters will be easy to identify. Sometimes they will be nearly impossible. You can't get much more than half right, so relax. Think of it as a guessing game, and just get as many as you can. Type slowly. (Quit anytime by pressing ESCAPE.) Look at the middle of the screen, ignoring the edges of the screen. To continue, please hit RETURN. `,
  block: (block = 0) => {
    return (
      `This is block ${block}.\n\n` +
      `IMPORTANT: Please resist the temptation to type your response as soon as you find a matching response letter. Instead, please hold off responding until your eye is back on the cross. Always wait until you're fixating the cross before responding. To continue hit RETURN.`
    );
  },
  trial: {
    fixate: {
      spacing: (responseType = 2) => {
        switch (responseType) {
          case 0:
            return `While looking directly at the cross, please press the SPACE bar.`;
          case 1:
            return `While looking directly at the cross, please click on the cross.`;
          default:
            return `While looking directly at the cross, please press the SPACE bar or click on the cross.`;
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
  };
  b.className = "threshold-beep-button";
  b.id = "threshold-beep-button";

  document.body.appendChild(b);

  return b;
};

export const removeBeepButton = (button) => {
  document.body.removeChild(button);
};
