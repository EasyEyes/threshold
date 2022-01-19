import * as visual from "../psychojs/src/visual/index.js";
import * as util from "../psychojs/src/util/index.js";
import { PsychoJS } from "../psychojs/src/core/index.js";

export const generateBoundingBoxPolies = (psychoJS) => {
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
  const targetCharacterSetBoundingPoly = new visual.Rect({
    ...boundingConfig,
    lineColor: new util.Color("green"),
    name: "targetCharacterSetBoundingPoly",
  });
  const flanker1CharacterSetBoundingPoly = new visual.Rect({
    ...boundingConfig,
    lineColor: new util.Color("green"),
    name: "flanker1CharacterSetBoundingPoly",
  });
  const flanker2CharacterSetBoundingPoly = new visual.Rect({
    ...boundingConfig,
    lineColor: new util.Color("green"),
    name: "flanker2CharacterSetBoundingPoly",
  });
  const boundingBoxPolies = {
    target: targetBoundingPoly,
    flanker1: flanker1BoundingPoly,
    flanker2: flanker2BoundingPoly,
  };
  const characterSetBoundingBoxPolies = {
    target: targetCharacterSetBoundingPoly,
    flanker1: flanker1CharacterSetBoundingPoly,
    flanker2: flanker2CharacterSetBoundingPoly,
  };
  return [boundingBoxPolies, characterSetBoundingBoxPolies];
};

/**
 *
 * @param {boolean} showBoundingBox Whether or not to show the bounding box(s) of the stimuli around the stimuli
 * @param {boolean} showCharacterSetBoundingBox  Whether or not to show the bounding box(s) of the character set around the stimuli
 * @param {PsychoJS.visual.Rect[]} stimulusPolies Array of the [target, flanker1, flanker2] stimulus bounding rects
 * @param {PsychoJS.visual.Rect[]} characterSetPolies
 * @param {("ratio" | "typographic" | "none")} spacingRelationToSize
 * @param {any[]} trialComponents
 */
export const addBoundingBoxesToComponents = (
  showBoundingBox,
  showCharacterSetBoundingBox,
  stimulusPolies,
  characterSetPolies,
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
  }
};

export const updateBoundingBoxPolies = (
  t,
  frameRemains,
  frameN,
  showBoundingBox,
  showCharacterSetBoundingBox,
  boundingBoxPolies,
  characterSetBoundingBoxPolies,
  spacingRelationToSize
) => {
  if (showBoundingBox) {
    // // *targetBoundingPoly* updates
    if (
      t >= 0.0 &&
      boundingBoxPolies.target.status === PsychoJS.Status.NOT_STARTED
    ) {
      // keep track of start time/frame for later
      boundingBoxPolies.target.tStart = t; // (not accounting for frame time here)
      boundingBoxPolies.target.frameNStart = frameN; // exact frame index
      boundingBoxPolies.target.setAutoDraw(true);
    }
    if (
      boundingBoxPolies.target.status === PsychoJS.Status.STARTED &&
      t >= frameRemains
    ) {
      boundingBoxPolies.target.setAutoDraw(false);
    }

    // // *flanker1BoundingPoly* updates
    if (
      t >= 0.0 &&
      boundingBoxPolies.flanker1.status === PsychoJS.Status.NOT_STARTED &&
      spacingRelationToSize === "ratio"
    ) {
      // keep track of start time/frame for later
      boundingBoxPolies.flanker1.tStart = t; // (not accounting for frame time here)
      boundingBoxPolies.flanker1.frameNStart = frameN; // exact frame index

      boundingBoxPolies.flanker1.setAutoDraw(true);
    }
    if (
      boundingBoxPolies.flanker1.status === PsychoJS.Status.STARTED &&
      t >= frameRemains
    ) {
      boundingBoxPolies.flanker1.setAutoDraw(false);
    }

    // // *flanker2BoundingPoly* updates
    if (
      t >= 0.0 &&
      boundingBoxPolies.flanker2.status === PsychoJS.Status.NOT_STARTED &&
      spacingRelationToSize === "ratio"
    ) {
      // keep track of start time/frame for later
      boundingBoxPolies.flanker2.tStart = t; // (not accounting for frame time here)
      boundingBoxPolies.flanker2.frameNStart = frameN; // exact frame index

      boundingBoxPolies.flanker2.setAutoDraw(true);
    }
    if (
      boundingBoxPolies.flanker2.status === PsychoJS.Status.STARTED &&
      t >= frameRemains
    ) {
      boundingBoxPolies.flanker2.setAutoDraw(false);
    }
  }
  if (showCharacterSetBoundingBox) {
    // // *targetBoundingPoly* updates
    if (
      t >= 0.0 &&
      characterSetBoundingBoxPolies.target.status ===
        PsychoJS.Status.NOT_STARTED
    ) {
      // keep track of start time/frame for later
      characterSetBoundingBoxPolies.target.tStart = t; // (not accounting for frame time here)
      characterSetBoundingBoxPolies.target.frameNStart = frameN; // exact frame index
      characterSetBoundingBoxPolies.target.setAutoDraw(true);
    }
    if (
      characterSetBoundingBoxPolies.target.status === PsychoJS.Status.STARTED &&
      t >= frameRemains
    ) {
      characterSetBoundingBoxPolies.target.setAutoDraw(false);
    }

    // // *flanker1BoundingPoly* updates
    if (
      t >= 0.0 &&
      characterSetBoundingBoxPolies.flanker1.status ===
        PsychoJS.Status.NOT_STARTED &&
      spacingRelationToSize === "ratio"
    ) {
      // keep track of start time/frame for later
      characterSetBoundingBoxPolies.flanker1.tStart = t; // (not accounting for frame time here)
      characterSetBoundingBoxPolies.flanker1.frameNStart = frameN; // exact frame index

      characterSetBoundingBoxPolies.flanker1.setAutoDraw(true);
    }
    if (
      characterSetBoundingBoxPolies.flanker1.status ===
        PsychoJS.Status.STARTED &&
      t >= frameRemains
    ) {
      characterSetBoundingBoxPolies.flanker1.setAutoDraw(false);
    }

    // // *flanker2BoundingPoly* updates
    if (
      t >= 0.0 &&
      characterSetBoundingBoxPolies.flanker2.status ===
        PsychoJS.Status.NOT_STARTED &&
      spacingRelationToSize === "ratio"
    ) {
      // keep track of start time/frame for later
      characterSetBoundingBoxPolies.flanker2.tStart = t; // (not accounting for frame time here)
      characterSetBoundingBoxPolies.flanker2.frameNStart = frameN; // exact frame index

      characterSetBoundingBoxPolies.flanker2.setAutoDraw(true);
    }
    if (
      characterSetBoundingBoxPolies.flanker2.status ===
        PsychoJS.Status.STARTED &&
      t >= frameRemains
    ) {
      characterSetBoundingBoxPolies.flanker2.setAutoDraw(false);
    }
  }
};

export const sizeAndPositionBoundingBoxes = (
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
    const boundingStims = [targetBoundingPoly];
    const targetBoundingBox = triplet.target.getBoundingBox(true);
    boundingBoxPolies.target.setPos([
      targetBoundingBox.left,
      targetBoundingBox.top,
    ]);
    boundingBoxPolies.target.setSize([
      targetBoundingBox.width,
      targetBoundingBox.height,
    ]);
    if (
      (spacingRelationToSize === "ratio" || spacingRelationToSize === "none") &&
      thresholdParameter === "spacing"
    ) {
      boundingStims.push(
        boundingBoxPolies.flanker1,
        boundingBoxPolies.flanker2
      );
      const flanker1BoundingBox = triplet.flanker1.getBoundingBox(true);
      boundingBoxPolies.flanker1.setPos([
        flanker1BoundingBox.left,
        flanker1BoundingBox.top,
      ]);
      boundingBoxPolies.flanker1.setSize([
        flanker1BoundingBox.width,
        flanker1BoundingBox.height,
      ]);
      const flanker2BoundingBox = flanker2.getBoundingBox(true);
      boundingBoxPolies.flanker2.setPos([
        flanker2BoundingBox.left,
        flanker2BoundingBox.top,
      ]);
      boundingBoxPolies.flanker2.setSize([
        flanker2BoundingBox.width,
        flanker2BoundingBox.height,
      ]);
    }
    boundingStims.forEach((c) => c._updateIfNeeded());
  }
  if (showCharacterSetBoundingBox) {
    const characterSetBoundingStims = [characterSetBoundingBoxPolies.target];
    const characterSetBounds = [
      normalizedCharacterSetBoundingRect.width * heightPx,
      normalizedCharacterSetBoundingRect.height * heightPx,
    ];
    const targetBB = triplet.target.getBoundingBox(true);
    characterSetBoundingBoxPolies.target.setPos([targetBB.left, targetBB.top]);
    characterSetBoundingBoxPolies.target.setSize(characterSetBounds);
    if (
      (spacingRelationToSize === "ratio" || spacingRelationToSize === "none") &&
      thresholdParameter === "spacing"
    ) {
      const flanker1BB = triplet.flanker1.getBoundingBox(true);
      const flanker2BB = triplet.flanker2.getBoundingBox(true);
      characterSetBoundingStims.push(
        characterSetBoundingBoxPolies.flanker1,
        characterSetBoundingBoxPolies.flanker2
      );
      characterSetBoundingBoxPolies.flanker1.setPos([
        flanker1BB.left,
        flanker1BB.top,
      ]);
      characterSetBoundingBoxPolies.flanker1.setSize(characterSetBounds);
      characterSetBoundingBoxPolies.flanker2.setPos([
        flanker2BB.left,
        flanker2BB.top,
      ]);
      characterSetBoundingBoxPolies.flanker2.setSize(characterSetBounds);
    }
    characterSetBoundingStims.forEach((c) => c._updateIfNeeded());
  }
};
