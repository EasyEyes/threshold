/**
 * Dynamically shrink instruction text until it fits the viewport height.
 * Works on any stim with setHeight(px) + getBoundingBox().height
 * (TextStim or HTMLTextStim).
 */
export const dynamicSetSize = (instructionList, initHeight) => {
  let reducedHeight = 1;
  instructionList.forEach((e) => {
    e.setHeight(initHeight);
  });
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
