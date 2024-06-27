import {
  font,
  fontCharacterSet,
  letterConfig,
  repeatedLettersConfig,
  repeatedLettersResponse,
  displayOptions,
  fixationConfig,
  correctAns,
  status,
} from "./global";
import { psychoJS } from "./globalPsychoJS";
import {
  logger,
  sampleWithoutReplacement,
  Rectangle,
  XYPixOfXYDeg,
  XYDegOfXYPix,
} from "./utils";
import { getLargestBoundsRatio } from "./bounding";
import { TextStim } from "../psychojs/src/visual";
import { Color } from "../psychojs/src/util";
import { updateColor } from "./color";

export const readTrialLevelRepeatedLetterParams = (reader, BC) => {
  // TODO add a preprocessor check that the border character isn't found in the target character set
  repeatedLettersConfig.targetRepeatsBorderCharacter = String(
    reader.read("targetRepeatsBorderCharacter", BC),
  );
  repeatedLettersConfig.targetRepeatsMaxLines = reader.read(
    "targetRepeatsMaxLines",
    BC,
  );
};

export const generateRepeatedLettersStims = (stimulusParameters) => {
  const targetCharacters = sampleWithoutReplacement(
    fontCharacterSet.current,
    2,
  );
  correctAns.current = targetCharacters.map((c) => c.toLowerCase());
  const stims = stimulusParameters.stimulusLocations.map((stimInfo, i) => {
    const { type, pos } = stimInfo;
    const character =
      type === "border"
        ? repeatedLettersConfig.targetRepeatsBorderCharacter
        : type === "target1"
        ? targetCharacters[0]
        : targetCharacters[1];
    return new TextStim({
      name: `target-${i}-${type}`,
      win: psychoJS.window,
      text: character,
      font: font.name,
      units: "pix",
      pos: pos,
      height: stimulusParameters.heightPx,
      wrapWidth: undefined,
      ori: 0.0,
      color: new Color("black"),
      opacity: 1.0,
      depth: -8.0,
      padding: font.padding,
      characterSet: fontCharacterSet.current.join(""),
    });
  });
  stims.forEach((s) => {
    updateColor(s, "marking", status.block_condition);
    // s.scaleToHeightPx(stimulusParameters.heightPx);
  });
  return stims;
};

export const restrictRepeatedLettersSpacing = (
  proposedLevel,
  targetXYDeg,
  characterSetRectPx,
) => {
  // Calculate the extent of the screen
  const screenLowerLeft = [
    -displayOptions.window._size[0] / 2,
    -displayOptions.window._size[1] / 2,
  ];
  const screenUpperRight = [
    displayOptions.window._size[0] / 2,
    displayOptions.window._size[1] / 2,
  ];
  const screenRectPx = new Rectangle(screenLowerLeft, screenUpperRight);

  // Find pos of target in pixels
  const targetXYPx = XYPixOfXYDeg(targetXYDeg, true);

  // Calculate our implicated spacing
  let spacingDeg = Math.pow(10, proposedLevel);

  // Loop
  for (const _ of [...new Array(200).keys()]) {
    let sizeDeg, heightDeg, widthDeg, heightPx, widthPx, lineSpacingPx;
    // Get character sizes
    switch (letterConfig.spacingRelationToSize) {
      case "none":
      case "ratio":
        if (letterConfig.spacingRelationToSize === "none") {
          // Use specified targetSizeDeg
          sizeDeg = letterConfig.targetSizeDeg;
        } else {
          // Use spacingDeg and spacingOverSizeRatio to set size.
          sizeDeg = spacingDeg / letterConfig.spacingOverSizeRatio;
        }

        if (letterConfig.targetSizeIsHeightBool) {
          heightDeg = sizeDeg;
          const [, topPx] = XYPixOfXYDeg(
            [targetXYDeg[0], targetXYDeg[1] + heightDeg / 2],
            true,
          );
          const [, bottomPx] = XYPixOfXYDeg(
            [targetXYDeg[0], targetXYDeg[1] - heightDeg / 2],
            true,
          );
          heightPx = topPx - bottomPx;
          widthPx =
            (heightPx * characterSetRectPx.width) / characterSetRectPx.height;
        } else {
          widthDeg = sizeDeg;
          const [leftPx, a] = XYPixOfXYDeg(
            [targetXYDeg[0] - widthDeg / 2, targetXYDeg[1]],
            true,
          );
          const [rightPx, b] = XYPixOfXYDeg(
            [targetXYDeg[0] + widthDeg / 2, targetXYDeg[1]],
            true,
          );
          widthPx = rightPx - leftPx;
          heightPx =
            widthPx * (characterSetRectPx.height / characterSetRectPx.width);
          heightDeg =
            XYDegOfXYPix([targetXYPx[0], targetXYPx[1] + heightPx / 2])[1] -
            XYDegOfXYPix([targetXYPx[0], targetXYPx[1] - heightPx / 2])[1];
        }
        lineSpacingPx = heightPx * letterConfig.spacingOverSizeRatio;
        break;
      case "typographic":
        // TODO enforce by a compiler check
        throw "typographic spacingRelationToSize undefined when targetKind is repeatedLetters";
    }

    // Compute lower bound
    if (heightPx < letterConfig.targetMinimumPix) {
      spacingDeg = spacingDeg * (letterConfig.targetMinimumPix / heightPx);
      continue;
    }

    // Horizontal (column) spacing
    const approxSpacingPx =
      XYPixOfXYDeg([targetXYDeg[0] + spacingDeg / 2, targetXYDeg[1]], true)[0] -
      XYPixOfXYDeg([targetXYDeg[0] - spacingDeg / 2, targetXYDeg[1]], true)[0];

    // At least one line, up to targetRepeatsMaxLines
    const maxLines = Math.max(1, repeatedLettersConfig.targetRepeatsMaxLines);
    const minLines = maxLines < 3 ? maxLines : 3;
    let possibleNumbersOfLines = [...new Array(maxLines - minLines + 1).keys()]
      .map((i) => i + minLines)
      .reverse();
    let largestBoundsRatio, numberOfColumns;
    for (const lineNumbers of possibleNumbersOfLines) {
      const stimulusLocations = [];
      if (numberOfColumns === undefined) {
        // Calculate how many columns we can have.
        let spaceAvailable = displayOptions.window._size[0];
        const minimumColumn = 4;
        numberOfColumns = 0;
        while (spaceAvailable >= approxSpacingPx + widthPx / 2) {
          numberOfColumns += 1;
          spaceAvailable -= approxSpacingPx;
        }
        numberOfColumns = Math.max(minimumColumn, numberOfColumns);
      }

      // Calculate bounding box around field of stims
      const stimuliFieldExtentXPx =
        (numberOfColumns - 1) * approxSpacingPx + widthPx;
      const stimuliFieldExtentYPx =
        (lineNumbers - 1) * lineSpacingPx + heightPx;
      const lowerLeftOfStimFieldPx = [
        -stimuliFieldExtentXPx / 2,
        targetXYPx[1] - stimuliFieldExtentYPx / 2,
      ];
      const upperRightOfStimFieldPx = [
        stimuliFieldExtentXPx / 2,
        targetXYPx[1] + stimuliFieldExtentYPx / 2,
      ];
      const stimulusFieldBoundingRectPx = new Rectangle(
        lowerLeftOfStimFieldPx,
        upperRightOfStimFieldPx,
      );

      // Get largestBoundsRatio
      largestBoundsRatio = getLargestBoundsRatio(
        stimulusFieldBoundingRectPx,
        screenRectPx,
        targetXYPx,
        letterConfig.thresholdParameter ?? "spacingDeg",
        letterConfig.spacingRelationToSize,
        widthPx,
        heightPx,
      );
      // Set largestBoundsRatio to some max, so we don't dwarf the value of spacingDeg
      largestBoundsRatio = Math.min(largestBoundsRatio, 1.5);

      // Return level, { targetHeightPx, sizeDeg, spacingDeg, lineNumbers, [{type: pos}]}
      if (largestBoundsRatio <= 1) {
        // Find the location, and type, of each stimulus
        for (const rowId of [...new Array(lineNumbers).keys()]) {
          const yPointer =
            targetXYPx[1] +
            stimuliFieldExtentYPx / 2 -
            Math.round(lineSpacingPx * rowId) -
            heightPx / 2;
          let xPointer =
            -displayOptions.window._size[0] / 2 +
            (displayOptions.window._size[0] - stimuliFieldExtentXPx) / 2 +
            widthPx / 2;
          for (const columnId of [...new Array(numberOfColumns).keys()]) {
            let borderCharcter, endCharacter;
            if ([1, 2].includes(lineNumbers)) {
              borderCharcter = rowId !== 0;
            } else {
              borderCharcter = rowId === 0 || rowId === lineNumbers - 1;
            }
            endCharacter = columnId === 0 || columnId === numberOfColumns - 1;
            const currentCharacterType =
              borderCharcter || endCharacter
                ? "border"
                : (columnId + (rowId % 2 === 0 ? 0 : 1)) % 2 === 0
                ? "target1"
                : "target2";
            const pos = [xPointer, yPointer];
            stimulusLocations.push({
              type: currentCharacterType,
              pos: pos,
            });
            xPointer += approxSpacingPx;
          }
        }
        const stimulusParameters = {
          widthPx: Math.round(widthPx),
          heightPx: Math.round(heightPx),
          stimulusLocations: stimulusLocations,
          sizeDeg: sizeDeg,
          spacingDeg: spacingDeg,
          heightDeg: heightDeg,
        };
        return [Math.log10(spacingDeg), stimulusParameters];
      }
    }
    // Calculate new spacing, ie spacing/largestBoundsRatio
    spacingDeg = spacingDeg / largestBoundsRatio;
  }
  throw "Unable to bound to suitable repeatedLetters stimuli parameters.";
};

export const registerResponseForRepeatedLetters = (
  responseCharacter,
  rt,
  correctAnswers,
  correctSynth,
  recievedResponses,
) => {
  // repeatedLettersResponse.current.push(responseCharacter);
  // repeatedLettersResponse.rt.push(rt);
  if (recievedResponses.includes(responseCharacter)) return;
  const correct = correctAnswers.includes(responseCharacter) ? 1 : 0;
  logger("correct?", correct);
  repeatedLettersResponse.correct.push(correct);

  status.trialCompleted_thisBlock++;
  // Correct press
  if (correct) {
    try {
      correctSynth.play();
    } catch (e) {
      console.error(
        "Failed to play correctSynth in registerResponseForRepeatedLetters",
      );
    }
    status.trialCorrect_thisBlock++;
  }
};
