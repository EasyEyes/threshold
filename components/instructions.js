export const instructionsText = {
  initial: (participantName = null) => {
    return `Hello${
      participantName === null ? "" : ` ${participantName}`
    }. Please make sure this computer's sound is enabled. You can respond by typing the letter.\n\n`;
  },
  initialByThresholdParameter: {
    spacing: () =>
      `When you see three letters, please report just the middle letter.\n\n`,
  },
  initialEnd: () =>
    `Sometimes the letters will be easy to identify. Sometimes they will be nearly impossible. You can't get much more than half right, so relax. Think of it as a guessing game, and just get as many as you can. Type slowly. (Quit anytime by pressing ESCAPE.) Look at the middle of the screen, ignoring the edges of the screen. To continue, please hit RETURN. `,
  block: (block = 0) => {
    return (
      `This is block ${block}.\n\n` +
      `IMPORTANT: Please resist the temptation to type your response as soon as you find a matching response letter. Instead, please hold off responding until your eye is back on the cross. Always wait until you're fixating the cross before responding. To continue hit RETURN.`
    );
  },
  trial: () => `Now, while fixating the cross, hit SPACE.`,
};
