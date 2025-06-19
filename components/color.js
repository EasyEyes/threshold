import { util } from "../psychojs/src";
import { paramReader } from "../threshold";
import { colorRGBASnippetToRGBA, isBlockLabel } from "./utils";

export const updateColor = (stim, instructionOrMarking, blockOrCondition) => {
  if (instructionOrMarking === "instruction") {
    updateInstructionColor(stim, blockOrCondition);
  } else {
    updateMarkingColor(stim, blockOrCondition);
  }
};

export const getInstructionColor = (blockOrCondition) => {
  let colorString;
  if (isBlockLabel(blockOrCondition)) {
    colorString = colorRGBASnippetToRGBA(
      paramReader.read("instructionFontColorRGBA", blockOrCondition)[0],
    );
  } else {
    colorString = colorRGBASnippetToRGBA(
      paramReader.read("instructionFontColorRGBA", blockOrCondition),
    );
  }
  const color = new util.Color(colorString);
  return color;
};
const updateInstructionColor = (instructions, blockOrCondition) => {
  const color = getInstructionColor(blockOrCondition);
  instructions.setColor(color);
};
const updateMarkingColor = (markingStim, blockOrCondition) => {
  let colorString;
  // block
  if (isBlockLabel(blockOrCondition)) {
    colorString = colorRGBASnippetToRGBA(
      paramReader.read("markingColorRGBA", blockOrCondition)[0],
    );
    // condition
  } else {
    colorString = colorRGBASnippetToRGBA(
      paramReader.read("markingColorRGBA", blockOrCondition),
    );
  }
  const color = new util.Color(colorString);
  markingStim.setColor(color);
};
