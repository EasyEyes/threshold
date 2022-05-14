// import { debug, getTripletCharacters } from "./utils.js";
// import { getTrialInfoStr } from "./trialCounter.js";
// import { instructionsText } from "./instructions.js";
// import { hideCursor, XYPixOfXYDeg } from "./utils.js";
// import { cleanFontName } from "./fonts.js";
// import { getCharacterSetBoundingBox, restrictLevel } from "./bounding.js";
// import { SimulatedObserver } from "./simulatedObserver.js";

export const _identify_trialInstructionRoutineEnd = (
  instructions,
  _takeFixationClick,
  fixation
) => {
  document.removeEventListener("click", _takeFixationClick);
  document.removeEventListener("touchend", _takeFixationClick);
  instructions.setAutoDraw(false);
  fixation.setAutoDraw(false);
};
