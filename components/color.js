import { util } from "../psychojs/src";
import { paramReader } from "../threshold";
import { colorRGBASnippetToRGBA } from "./utils";

export const updateColor = (stim, instructionOrMarking, blockOrCondition) => {
  if (instructionOrMarking === "instruction") {
    updateInstructionColor(stim, blockOrCondition);
  } else {
    updateMarkingColor(stim, blockOrCondition);
  }
};

const updateInstructionColor = (instructions, blockOrCondition) => {
  let colorString;
  // block
  if (!isNaN(blockOrCondition)) {
    colorString = colorRGBASnippetToRGBA(
      paramReader.read("instructionFontColorRGBA", blockOrCondition)[0]
    );
    // condition
  } else {
    colorString = colorRGBASnippetToRGBA(
      paramReader.read("instructionFontColorRGBA", blockOrCondition)
    );
  }
  const color = new util.Color(colorString);
  instructions.setColor(color);
};
const updateMarkingColor = (markingStim, blockOrCondition) => {
  let colorString;
  // block
  if (!isNaN(blockOrCondition)) {
    colorString = colorRGBASnippetToRGBA(
      paramReader.read("markingColorRGBA", blockOrCondition)[0]
    );
    // condition
  } else {
    colorString = colorRGBASnippetToRGBA(
      paramReader.read("markingColorRGBA", blockOrCondition)
    );
  }
  const color = new util.Color(colorString);
  markingStim.setColor(color);
};
