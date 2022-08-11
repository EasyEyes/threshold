import {
  font,
  fontCharacterSet,
  letterConfig,
  repeatedLettersConfig,
  displayOptions,
  fixationConfig,
  correctAns,
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

export const duplicateRepeatedLetterConditions = (conditions) => {
  const newConditions = [];
  conditions.forEach((c) => {
    if (c.targetKind === "repeatedLetters") {
      const c1 = Object.assign({ _duplicatedConditionCardinal: 1 }, c);
      const c2 = Object.assign({ _duplicatedConditionCardinal: 2 }, c);
      newConditions.push(c1);
      newConditions.push(c2);
    } else {
      newConditions.push(c);
    }
  });
  return newConditions;
};

export const readTrialLevelRepeatedLetterParams = (reader, BC) => {
  // TODO add a preprocessor check that the border character isn't found in the target character set
  repeatedLettersConfig.targetRepeatsBorderCharacter = reader.read(
    "targetRepeatsBorderCharacter",
    BC
  );
  repeatedLettersConfig.targetRepeatsMaxLines = reader.read(
    "targetRepeatsMaxLines",
    BC
  );
};

export const generateRepeatedLettersStims = (stimulusParameters) => {
  const targetCharacters = sampleWithoutReplacement(
    fontCharacterSet.current,
    2
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
    });
  });
  return stims;
};

export const restrictRepeatedLettersSpacing = (
  proposedLevel,
  targetXYDeg,
  characterSetRectPx
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
  const targetXYPx = XYPixOfXYDeg(targetXYDeg, displayOptions);

  // Calculate our implicated spacing
  let spacingDeg = Math.pow(10, proposedLevel);

  // Loop
  for (const _ of [...new Array(200).keys()]) {
    let sizeDeg, heightDeg, widthDeg, heightPx, widthPx;
    // Get character sizes
    switch (letterConfig.spacingRelationToSize) {
      case "none":
        // Use specified targetSizeDeg
        sizeDeg = letterConfig.targetSizeDeg;
        if (letterConfig.targetSizeIsHeightBool) {
          heightDeg = sizeDeg;
          const [, topPx] = XYPixOfXYDeg(
            [targetXYDeg[0], targetXYDeg[1] + heightDeg / 2],
            displayOptions
          );
          const [, bottomPx] = XYPixOfXYDeg(
            [targetXYDeg[0], targetXYDeg[1] - heightDeg / 2],
            displayOptions
          );
          heightPx = topPx - bottomPx;
          widthPx =
            (heightPx * characterSetRectPx.width) / characterSetRectPx.height;
        } else {
          widthDeg = sizeDeg;
          heightDeg =
            widthDeg * (characterSetRectPx.height / characterSetRectPx.width);
          const [leftPx] = XYPixOfXYDeg(
            [targetXYDeg[0] - widthDeg / 2, targetXYDeg[1]],
            displayOptions
          );
          const [rightPx] = XYPixOfXYDeg(
            [targetXYDeg[0] + widthDeg / 2, targetXYDeg[1]],
            displayOptions
          );
          widthPx = rightPx - leftPx;
          heightPx =
            widthPx * (characterSetRectPx.height / characterSetRectPx.width);
          heightDeg =
            XYDegOfXYPix(
              [fixationConfig.pos[0], fixationConfig.pos[1] + heightPx / 2],
              displayOptions
            )[1] -
            XYDegOfXYPix(
              [fixationConfig.pos[0], fixationConfig.pos[1] - heightPx / 2],
              displayOptions
            )[1];
        }
        break;
      case "ratio":
        // Use spacingDeg and spacingOverSizeRatio to set size.
        sizeDeg = spacingDeg / letterConfig.spacingOverSizeRatio;

        if (letterConfig.targetSizeIsHeightBool) {
          heightDeg = sizeDeg;
          const [, topPx] = XYPixOfXYDeg(
            [targetXYDeg[0], targetXYDeg[1] + heightDeg / 2],
            displayOptions
          );
          const [, bottomPx] = XYPixOfXYDeg(
            [targetXYDeg[0], targetXYDeg[1] - heightDeg / 2],
            displayOptions
          );
          heightPx = topPx - bottomPx;
          widthPx =
            (heightPx * characterSetRectPx.width) / characterSetRectPx.height;
        } else {
          widthDeg = sizeDeg;
          const [leftPx] = XYPixOfXYDeg(
            [targetXYDeg[0] - widthDeg / 2, targetXYDeg[1]],
            displayOptions
          );
          const [rightPx] = XYPixOfXYDeg(
            [targetXYDeg[0] + widthDeg / 2, targetXYDeg[1]],
            displayOptions
          );
          widthPx = rightPx - leftPx;
          heightPx =
            widthPx * (characterSetRectPx.height / characterSetRectPx.width);
          heightDeg =
            XYDegOfXYPix(
              [targetXYPx[0], targetXYPx[1] + heightPx / 2],
              displayOptions
            )[1] -
            XYDegOfXYPix(
              [targetXYPx[0], targetXYPx[1] - heightPx / 2],
              displayOptions
            )[1];
        }
        break;
      case "typographic":
        throw "typographic spacingRelationToSize undefined when targetKind is repeatedLetters";
    }

    // Compute lower bound
    if (heightPx < letterConfig.targetMinimumPix) {
      spacingDeg = spacingDeg * (letterConfig.targetMinimumPix / heightPx);
      continue;
    }

    const approxSpacingPx =
      XYPixOfXYDeg(
        [targetXYDeg[0] + spacingDeg / 2, targetXYDeg[1]],
        displayOptions
      )[0] -
      XYPixOfXYDeg(
        [targetXYDeg[0] - spacingDeg / 2, targetXYDeg[1]],
        displayOptions
      )[0];

    // At least three lines, up to targetRepeatsMaxLines
    let possibleNumbersOfLines = [
      ...new Array(
        Math.max(1, repeatedLettersConfig.targetRepeatsMaxLines - 2)
      ).keys(),
    ]
      .map((i) => i + 3)
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
        (lineNumbers - 1) * approxSpacingPx + heightPx;
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
        upperRightOfStimFieldPx
      );

      // Get largestBoundsRatio
      largestBoundsRatio = getLargestBoundsRatio(
        stimulusFieldBoundingRectPx,
        screenRectPx,
        targetXYPx,
        "spacing",
        letterConfig.spacingRelationToSize,
        widthPx,
        heightPx
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
            Math.round(approxSpacingPx * rowId) -
            heightPx / 2;
          let xPointer =
            -displayOptions.window._size[0] / 2 +
            (displayOptions.window._size[0] - stimuliFieldExtentXPx) / 2 +
            widthPx / 2;
          for (const columnId of [...new Array(numberOfColumns).keys()]) {
            const currentCharacterType =
              rowId === 0 ||
              rowId === lineNumbers - 1 ||
              columnId === 0 ||
              columnId === numberOfColumns - 1
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
