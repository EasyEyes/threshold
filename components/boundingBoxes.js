import * as visual from "../psychojs/src/visual/index.js";
import * as util from "../psychojs/src/util/index.js";
import { PsychoJS } from "../psychojs/src/core/index.js";
import { logger, norm, Rectangle, toFixedNumber } from "./utils.js";
import { letterConfig } from "./global.js";

/**
 * Generate all the stim objects for the various bounding boxes, ie
 * - the box stims which are sized based on the individual elements of the stimuli, and placed over the stimuli
 * - the box stims which are sized based on the character set union bounding box, and placed over the stimuli
 * - the character and box stims which are sized based on the character set union bounding box, and place over the display character set
 * @param {*} reader
 * @param {*} psychoJS
 * @returns {any[]} [boundingBoxPolies, characterSetBoundingBoxPolies, displayCharacterSetBoundingBoxStims]
 */
export const generateBoundingBoxPolies = (reader, psychoJS) => {
  const boundingConfig = {
    win: psychoJS.window,
    units: "pix",
    width: [1.0, 1.0][0],
    height: [1.0, 1.0][1],
    ori: 0.0,
    pos: [0, 0],
    lineWidth: 1.0,
    // fillColor: "#000000",
    opacity: undefined,
    depth: -10,
    interpolate: true,
    size: 0,
  };
  const targetBoundingPoly = new visual.Rect({
    ...boundingConfig,
    lineColor: new util.Color("blue"),
    name: "targetBoundingPoly",
  });
  const flanker1BoundingPoly = new visual.Rect({
    ...boundingConfig,
    lineColor: new util.Color("blue"),
    name: "flanker1BoundingPoly",
  });
  const flanker2BoundingPoly = new visual.Rect({
    ...boundingConfig,
    lineColor: new util.Color("blue"),
    name: "flanker2BoundingPoly",
  });
  const fontCharacterSetBoundingPoly = new visual.Rect({
    ...boundingConfig,
    lineColor: new util.Color("red"),
    name: "fontCharacterSetBoundingPoly",
  });
  const flanker1CharacterSetBoundingPoly = new visual.Rect({
    ...boundingConfig,
    lineColor: new util.Color("red"),
    name: "flanker1CharacterSetBoundingPoly",
  });
  const flanker2CharacterSetBoundingPoly = new visual.Rect({
    ...boundingConfig,
    lineColor: new util.Color("red"),
    name: "flanker2CharacterSetBoundingPoly",
  });
  const boundingBoxPolies = {
    target: targetBoundingPoly,
    flanker1: flanker1BoundingPoly,
    flanker2: flanker2BoundingPoly,
  };
  const characterSetBoundingBoxPolies = {
    target: fontCharacterSetBoundingPoly,
    flanker1: flanker1CharacterSetBoundingPoly,
    flanker2: flanker2CharacterSetBoundingPoly,
  };
  const displayCharacterSetBoundingBoxPolies = {};
  for (const cond of reader.block_conditions) {
    const characterSet = String(reader.read("fontCharacterSet", cond)).split(
      ""
    );
    if (reader.read("showCharacterSetBoundingBoxBool", cond)) {
      displayCharacterSetBoundingBoxPolies[cond] =
        getDisplayCharacterSetBoundingPolies(
          characterSet,
          boundingConfig,
          psychoJS
        );
    }
  }
  return [
    boundingBoxPolies,
    characterSetBoundingBoxPolies,
    displayCharacterSetBoundingBoxPolies,
  ];
};

const getDisplayCharacterSetBoundingPolies = (
  characterSet,
  boundingConfig,
  psychoJS
) => {
  const [polies, characters] = [[], []];
  for (const character of characterSet) {
    const text = character;
    characters.push(
      new visual.TextStim({
        // alignHoriz: "right",
        // alignVert: "top",
        win: psychoJS.window,
        name: `displayCharacterSet_${character}`,
        text: text,
        font: "Arial",
        units: "pix",
        pos: [0, 0],
        height: 1.0,
        wrapWidth: undefined,
        ori: 0.0,
        color: new util.Color("black"),
        opacity: 1.0,
        depth: -10,
      })
    );
    polies.push(
      new visual.Rect({
        ...boundingConfig,
        lineColor: new util.Color("red"),
        name: `displayCharacterSetBoundingBox-${character}`,
      })
    );
  }
  return { characters: characters, polies: polies };
};

/**
 * Add the bounding box stimulus objects to the trial's components list, ie so they cleaned up with the rest of trial stimuli after the trial
 * @param {boolean} showBoundingBox Whether or not to show the bounding box(s) of the stimuli around the stimuli
 * @param {boolean} showCharacterSetBoundingBox  Whether or not to show the bounding box(s) of the character set around the stimuli
 * @param {PsychoJS.visual.Rect[]} stimulusPolies Array of bounding box rects, placed over the stimulus, sized based on the individual stimulus objects.
 * @param {PsychoJS.visual.Rect[]} characterSetStims Array of bounding box rects, placed over the stimulus, sized based on the union bounding box of the character set.
 * @param {object} displayCharacterSetStims Collection of stims for showing the union bounding box of the charcter set, displayed over the full character set.
 * @param {PsychoJS.visual.TextStim[]} displayCharacterSetStims.characters The character stims for the display charcter set.
 * @param {PsychoJS.visual.Rect[]} displayCharacterSetStims.polies The bounding box rect stims for the display charcter set.
 * @param {string} spacingRelationToSize Experiment parameter of the same name.
 * @param {string} thresholdParameter Experiment parameter of the same name.
 * @param {any[]} trialComponents Array of psychoJS stim objects used in this trial routine
 */
export const addBoundingBoxesToComponents = (
  showBoundingBox,
  showCharacterSetBoundingBox,
  stimulusPolies,
  characterSetPolies,
  displayCharacterSetStims,
  spacingRelationToSize,
  thresholdParameter,
  trialComponents
) => {
  if (showBoundingBox) {
    trialComponents.push(stimulusPolies.target);
    if (
      (spacingRelationToSize === "ratio" || spacingRelationToSize === "none") &&
      thresholdParameter === "spacing"
    ) {
      trialComponents.push(stimulusPolies.flanker1);
      trialComponents.push(stimulusPolies.flanker2);
    }
  }
  if (showCharacterSetBoundingBox) {
    trialComponents.push(characterSetPolies.target);
    if (
      (spacingRelationToSize === "ratio" || spacingRelationToSize === "none") &&
      thresholdParameter === "spacing"
    ) {
      trialComponents.push(characterSetPolies.flanker1);
      trialComponents.push(characterSetPolies.flanker2);
    }
    trialComponents.push(
      ...displayCharacterSetStims.characters,
      ...displayCharacterSetStims.polies
    );
  }
};

/**
 * Check whether each bounding box related stim should be drawn or started at the current time.
 * @param {number} t Current time
 * @param {number} frameRemains (?) Time at which the stimulus should be undrawn
 * @param {number} frameN Int, frame number
 * @param {boolean} showBoundingBox Whether or not to show the bounding boxes based on individual character size.
 * @param {boolean} showCharacterSetBoundingBox Whether or not to show the bounding boxes based on the union character set bounding box size.
 * @param {PsychoJS.visual.Rect{}} boundingBoxPolies Collection (ie {target:Rect, flanker1:Rect, flanker2:Rect}) of the bounding box rects of the stimuli (ie triplet).
 * @param {PsychoJS.visual.Rect{}} characterSetBoundingBoxPolies Array (ie {target:Rect, flanker1:Rect, flanker2:Rect}) of the union character set bounding box rects displayed over the stimuli (ie triplet).
 * @param {object} displayCharacterSetStims Collection of stims for displaying the union character set bounding boxes over a full, display character set.
 * @param {PsychoJS.visual.TextStim[]} displayCharacterSetStims.characters Array of text stims of the full, display character set.
 * @param {PsychoJS.visual.Rect[]} displayCharacterSetStims.polies Array of rect stims of the bounding boxes for the full, display character set.
 * @param {string} spacingRelationToSize Experiment parameter of the same name.
 * @param {number} timeWhenRespondable Time after which responses are accepted.
 */
export const updateBoundingBoxPolies = (
  t,
  frameRemains,
  frameN,
  showBoundingBox,
  showCharacterSetBoundingBox,
  boundingBoxPolies,
  characterSetBoundingBoxPolies,
  displayCharacterSetStims,
  spacingRelationToSize,
  timeWhenRespondable,
  thresholdParameter
) => {
  updateTripletBoundingBoxPolies(
    t,
    frameRemains,
    frameN,
    showBoundingBox,
    showCharacterSetBoundingBox,
    boundingBoxPolies,
    characterSetBoundingBoxPolies,
    spacingRelationToSize,
    thresholdParameter
  );
  if (showCharacterSetBoundingBox)
    updateDisplayCharacterSetBoundingBoxStims(
      displayCharacterSetStims,
      timeWhenRespondable,
      t,
      frameN
    );
};

const updateTripletBoundingBoxPolies = (
  t,
  frameRemains,
  frameN,
  showBoundingBox,
  showCharacterSetBoundingBox,
  boundingBoxPolies,
  characterSetBoundingBoxPolies,
  spacingRelationToSize,
  thresholdParameter
) => {
  const separateFlankers =
    (spacingRelationToSize === "ratio" || spacingRelationToSize === "none") &&
    thresholdParameter === "spacing";
  if (showBoundingBox) {
    const stimsToUpdate = separateFlankers
      ? [
          boundingBoxPolies.target,
          boundingBoxPolies.flanker1,
          boundingBoxPolies.flanker2,
        ]
      : [boundingBoxPolies.target];
    for (const stimulus of stimsToUpdate) {
      if (t >= 0.0 && stimulus.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        stimulus.tStart = t; // (not accounting for frame time here)
        stimulus.frameNStart = frameN; // exact frame index
        stimulus.setAutoDraw(true);
      }
      if (stimulus.status === PsychoJS.Status.STARTED && t >= frameRemains) {
        stimulus.setAutoDraw(false);
      }
    }
  }
  if (showCharacterSetBoundingBox) {
    const stimsToUpdate = separateFlankers
      ? [
          characterSetBoundingBoxPolies.target,
          characterSetBoundingBoxPolies.flanker1,
          characterSetBoundingBoxPolies.flanker2,
        ]
      : [characterSetBoundingBoxPolies.target];
    for (const stimulus of stimsToUpdate) {
      if (t >= 0.0 && stimulus.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        stimulus.tStart = t; // (not accounting for frame time here)
        stimulus.frameNStart = frameN; // exact frame index
        stimulus.setAutoDraw(true);
      }
      if (stimulus.status === PsychoJS.Status.STARTED && t >= frameRemains) {
        stimulus.setAutoDraw(false);
      }
    }
  }
};
const updateDisplayCharacterSetBoundingBoxStims = (
  displayCharacterSetPolies,
  timeWhenRespondable,
  t,
  frameN
) => {
  if (t >= timeWhenRespondable) {
    const characterAndPolygonStims = [
      ...displayCharacterSetPolies.characters,
      ...displayCharacterSetPolies.polies,
    ];
    for (const characterPoly of characterAndPolygonStims) {
      if (characterPoly.status === PsychoJS.Status.NOT_STARTED) {
        // keep track of start time/frame for later
        characterPoly.tStart = t; // (not accounting for frame time here)
        characterPoly.frameNStart = frameN; // exact frame index
        characterPoly.setAutoDraw(true);
      }
    }
  }
};

/**
 * Place and scale all the psychoJS stims related to visualizing bounding boxes
 * @param {object} boundingBoxVisibility Should the bounding boxes be shown based on...
 * @param {boolean} boundingBoxVisibility.stimulus ...the size of the individual stimuli?
 * @param {boolean} boundingBoxVisibility.characterSet ...the size of the full (ie overlayed) character set?
 * @param {object} tripletBoundingStimuli The arrays of bounding box stimuli which will be positioned over the triplet, and sized...
 * @param {visual.Rect{}} tripletBoundingStimuli.stimulus ... based on the individual stimuli sizes, ie a uniquely sized bounding box for each character of the stimulus (eg triplet).
 * @param {visual.Rect{}} tripletBoundingStimuli.characterSet ...based on the bounding box of the full character set, ie all bounding boxes on the stimulus are the same size.
 * @param {object} displayCharacterSetBoundingStimuli The stims for the (response-time) display of the full character set.
 * @param {visual.Rect[]} displayCharacterSetBoundingStimuli.polies The bounding box polygons, one for each character in the character set.
 * @param {visual.TextStim[]} displayCharacterSetBoundingStimuli.characters The stims for the characters of the display character set.
 * @param {visual.TextStim[]} triplet The actual stimulus objects of the target, ie the stimuls shown to the observer.
 * @param {Rectangle} normalizedCharacterSetBoundingRect The normalized bounding box of the union of all characters in the character set.
 * @param {object} trialParameters Collection of parameters relating to the current trial
 * @param {number} trialParameters.heightPx The value used to set the height of the target stim
 * @param {string} trialParameters.spacingRelationToSize Experiment parameter of the same name
 * @param {string} trialParameters.thresholdParameter Experiment parameter of the same name
 * @param {string} trialParameters.font (Correctly escaped) Experiment parameter of the same name
 * @param {[number, number]} trialParameters.windowSize Current dimensions of the window, ie `psychoJS.window._size`
 */
export const sizeAndPositionBoundingBoxes = (
  boundingBoxVisibility,
  tripletBoundingStimuli,
  displayCharacterSetBoundingStimuli,
  triplet,
  normalizedCharacterSetBoundingRect,
  trialParameters
) => {
  sizeAndPositionTripletBoundingBoxes(
    boundingBoxVisibility.stimulus,
    boundingBoxVisibility.characterSet,
    tripletBoundingStimuli.stimulus,
    tripletBoundingStimuli.characterSet,
    triplet,
    normalizedCharacterSetBoundingRect,
    trialParameters.heightPx,
    trialParameters.spacingRelationToSize,
    trialParameters.thresholdParameter
  );
  if (boundingBoxVisibility.characterSet)
    sizeAndPositionDisplayCharacterSet(
      displayCharacterSetBoundingStimuli,
      normalizedCharacterSetBoundingRect,
      trialParameters.font,
      trialParameters.windowSize
    );
};

const sizeAndPositionTripletBoundingBoxes = (
  showBoundingBox,
  showCharacterSetBoundingBox,
  boundingBoxPolies,
  characterSetBoundingBoxPolies,
  triplet,
  normalizedCharacterSetBoundingRect,
  heightPx,
  spacingRelationToSize,
  thresholdParameter
) => {
  if (showBoundingBox) {
    const boundingStims = [boundingBoxPolies.target];
    const targetBB = triplet.target.getBoundingBox(true);
    boundingBoxPolies.target.setPos([targetBB.left, targetBB.top]);
    boundingBoxPolies.target.setSize([targetBB.width, targetBB.height]);
    if (
      ["none", "ratio"].includes(spacingRelationToSize) &&
      thresholdParameter === "spacing"
    ) {
      boundingStims.push(
        boundingBoxPolies.flanker1,
        boundingBoxPolies.flanker2
      );
      const flanker1BB = triplet.flanker1.getBoundingBox(true);
      boundingBoxPolies.flanker1.setPos([flanker1BB.left, flanker1BB.top]);
      boundingBoxPolies.flanker1.setSize([flanker1BB.width, flanker1BB.height]);
      const flanker2BB = triplet.flanker2.getBoundingBox(true);
      boundingBoxPolies.flanker2.setPos([flanker2BB.left, flanker2BB.top]);
      boundingBoxPolies.flanker2.setSize([flanker2BB.width, flanker2BB.height]);
    }
    boundingStims.forEach((c) => c._updateIfNeeded());
  }
  if (showCharacterSetBoundingBox) {
    const separateFlankers =
      ["none", "ratio"].includes(spacingRelationToSize) &&
      thresholdParameter === "spacing";
    const tripletCharacterSetBoundingBoxPositions = separateFlankers
      ? getCharacterSetBoundingBoxPositions(
          [triplet.target, triplet.flanker1, triplet.flanker2],
          normalizedCharacterSetBoundingRect,
          heightPx
        )
      : getCharacterSetBoundingBoxPositions(
          [triplet.target],
          normalizedCharacterSetBoundingRect,
          heightPx
        );
    const characterSetBoundingStims = [characterSetBoundingBoxPolies.target];
    // ASSUMES triplet is sized with scaleToHeightPx
    const characterSetBounds = [
      heightPx * normalizedCharacterSetBoundingRect.width,
      heightPx * normalizedCharacterSetBoundingRect.height,
    ];
    // heightPx *
    //   (normalizedCharacterSetBoundingRect.width /
    //     normalizedCharacterSetBoundingRect.height),
    // heightPx,
    characterSetBoundingBoxPolies.target.setPos(
      tripletCharacterSetBoundingBoxPositions[0]
    );
    characterSetBoundingBoxPolies.target.setSize(characterSetBounds);
    if (
      (spacingRelationToSize === "ratio" || spacingRelationToSize === "none") &&
      thresholdParameter === "spacing"
    ) {
      characterSetBoundingStims.push(
        characterSetBoundingBoxPolies.flanker1,
        characterSetBoundingBoxPolies.flanker2
      );
      characterSetBoundingBoxPolies.flanker1.setPos(
        tripletCharacterSetBoundingBoxPositions[1]
      );
      characterSetBoundingBoxPolies.flanker1.setSize(characterSetBounds);
      characterSetBoundingBoxPolies.flanker2.setPos(
        tripletCharacterSetBoundingBoxPositions[2]
      );
      characterSetBoundingBoxPolies.flanker2.setSize(characterSetBounds);
    }
    characterSetBoundingStims.forEach((c) => c._updateIfNeeded());
  }
};

const sizeAndPositionDisplayCharacterSet = (
  displayCharacterSetStimuli,
  normalizedCharacterSetBoundingRect,
  font,
  windowDims
) => {
  const heightPx = 150;
  // ASSUMES display characters are sized with .setHeight()
  const characterSetBounds = [
    // heightPx * (normalizedCharacterSetBoundingRect.width/normalizedCharacterSetBoundingRect.height),
    // heightPx,
    heightPx * normalizedCharacterSetBoundingRect.width,
    heightPx * normalizedCharacterSetBoundingRect.height,
  ];
  const paddedWidthOfCharacter = characterSetBounds[0] * 1.2;
  const indicies = [...displayCharacterSetStimuli.polies.keys()];
  const middleIndex = Math.floor(indicies.length / 2);
  let y = -windowDims[1] / 8;
  const characterSetBoundingBoxPositions =
    displayCharacterSetStimuli.characters.map((displayCharacter, i) => {
      const x = (i - middleIndex) * paddedWidthOfCharacter;
      const characterPosition = [x, y];
      displayCharacter.setFont(font);
      displayCharacter.setHeight(heightPx);
      displayCharacter.setPos(characterPosition);
      displayCharacter._updateIfNeeded();
      const displayCharacterBoundingBox = displayCharacter.getBoundingBox(true);
      const displayCharacterXY = [
        displayCharacterBoundingBox.x,
        displayCharacterBoundingBox.y,
      ];
      let displayText = displayCharacter.getText();
      return getRelativePosition(
        displayCharacterXY,
        normalizedCharacterSetBoundingRect,
        displayText,
        heightPx
      );
    });

  displayCharacterSetStimuli.polies.forEach((displayCharacterBox, i) => {
    displayCharacterBox.setSize(characterSetBounds);
    const x = (i - middleIndex) * paddedWidthOfCharacter;
    // const boxPosition = [x, tops[largestAscentIdx]];
    const boxPosition = characterSetBoundingBoxPositions[i];
    displayCharacterBox.setPos(boxPosition);
    displayCharacterBox._updateIfNeeded();
  });
};

/**
 * Given an array of (positioned, sized, ie ready) text stims, return the positions which should
 * be used for positioning a character-set bounding rect around each text stim
 * @param {PsychoJS.visual.TextStim[]} stims Array of text stims
 * @returns {[number, number][]}
 */
const getCharacterSetBoundingBoxPositions = (
  stims,
  normalizedCharacterSetBoundingRect,
  height
) => {
  const stimBoxes = stims.map((s) => s.getBoundingBox(true));
  const texts = stims.map((s) => s.getText());
  return stimBoxes.map((b, i) =>
    getRelativePosition(
      [b.x, b.y],
      normalizedCharacterSetBoundingRect,
      texts[i],
      height
    )
  );
};

export const getRelativePosition = (
  stimBoundingBoxXY,
  normalizedCharacterSetRect,
  text,
  height
) => {
  const character =
    text.length > 1
      ? text[Math.floor(text.length / 2)].repeat(text.length)
      : text;
  return [
    stimBoundingBoxXY[0] +
      normalizedCharacterSetRect.centers[character][0] * height,
    stimBoundingBoxXY[1] +
      normalizedCharacterSetRect.centers[character][1] * height,
  ];
};

export const prettyPrintPsychojsBoundingBox = (bb) => {
  return `height : ${toFixedNumber(bb.height, 0)},\
  width : ${toFixedNumber(bb.width, 0)},\
  x: ${toFixedNumber(bb.x)},\
  y: ${toFixedNumber(bb.y)}`;
};
