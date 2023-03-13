import { Polygon, ShapeStim } from "../psychojs/src/visual";
import { Color, to_px } from "../psychojs/src/util";
import { psychoJS } from "./globalPsychoJS";
import { displayOptions, fixationConfig, letterConfig } from "./global";
import { logger, XYPixOfXYDeg } from "./utils";

export const getFixationPos = (blockN, paramReader) => {
  const locationStrategy = paramReader.read(
    "fixationLocationStrategy",
    blockN
  )[0];
  if (locationStrategy === "centerFixation") return [0, 0];
  const specifiedLocationXYDenisCoords = [
    paramReader.read("fixationLocationXScreen", blockN)[0],
    paramReader.read("fixationLocationYScreen", blockN)[0],
  ];
  const specifiedLocationXYNorm = specifiedLocationXYDenisCoords.map(
    (z) => 2 * z - 1
  );
  const specifiedLocationXYPx = to_px(
    specifiedLocationXYNorm,
    "norm",
    psychoJS.window
  ).map(Math.round);
  return specifiedLocationXYPx;
};

export class Fixation {
  constructor() {
    this.stims = [
      new ShapeStim({
        win: psychoJS.window,
        name: "fixation-0",
        units: "pix",
        vertices: getFixationVertices(fixationConfig.strokeLength),
        lineWidth: fixationConfig.strokeWidth,
        closeShape: false,
        color: new Color("black"),
        opacity: undefined,
        depth: -6.0,
      }),
    ];
  }

  update(reader, BC, targetHeightPx, targetXYPx) {
    fixationConfig.markingBlankedNearTargetBool = reader.read(
      "markingBlankedNearTargetBool",
      BC
    );
    fixationConfig.markingBlankingRadiusReEccentricity = reader.read(
      "markingBlankingRadiusReEccentricity",
      BC
    );
    fixationConfig.markingBlankingRadiusReTargetHeight = reader.read(
      "markingBlankingRadiusReTargetHeight",
      BC
    );
    // TODO find the correct, general across conditions, location
    fixationConfig.markingBlankingPos = fixationConfig.pos;
    fixationConfig.markingFixationStrokeLengthDeg = reader.read(
      "markingFixationStrokeLengthDeg",
      BC
    );
    fixationConfig.markingFixationStrokeThicknessDeg = reader.read(
      "markingFixationStrokeThicknessDeg",
      BC
    );
    fixationConfig.markingFixationMotionPeriodSec = reader.read(
      "markingFixationMotionPeriodSec",
      BC
    );
    fixationConfig.markingFixationMotionRadiusDeg = reader.read(
      "markingFixationMotionRadiusDeg",
      BC
    );
    fixationConfig.markingFixationHotSpotRadiusDeg = reader.read(
      "markingFixationHotSpotRadiusDeg",
      BC
    );
    fixationConfig.show = reader.read("markTheFixationBool", BC);
    fixationConfig.markingOffsetBeforeTargetOnsetSecs = reader.read(
      "markingOffsetBeforeTargetOnsetSecs",
      BC
    );
    if (
      ["pixPerCm", "nearPointXYDeg", "nearPointXYPix"].every(
        (s) => displayOptions[s]
      )
    ) {
      fixationConfig.strokeLength =
        XYPixOfXYDeg(
          [fixationConfig.markingFixationStrokeLengthDeg, 0],
          displayOptions
        )[0] - fixationConfig.pos[0];
      fixationConfig.strokeWidth =
        XYPixOfXYDeg(
          [0, fixationConfig.markingFixationStrokeThicknessDeg],
          displayOptions
        )[1] - fixationConfig.pos[1];
      fixationConfig.markingFixationHotSpotRadiusPx = Math.abs(
        fixationConfig.pos[0] -
          XYPixOfXYDeg(
            [fixationConfig.markingFixationHotSpotRadiusDeg, 0],
            displayOptions
          )[0]
      );
    }
    fixationConfig.offset =
      Math.random() * fixationConfig.markingFixationMotionPeriodSec;

    if (this.stims) {
      this.setPos(fixationConfig.pos);
      const theseVertices = getFixationVertices(
        fixationConfig.strokeLength,
        targetHeightPx,
        targetXYPx
      );
      this.setVertices(theseVertices);
      this.setLineWidth(fixationConfig.strokeWidth);
    }
  }
  /**
   * Given a set of independent groups of vertices,
   * ie the coordinates of the fixation cross and of the fixation blanking circle,
   * set those vertices corresponding to the fixation cross (blanking circle
   * doesn't use vertices), generating new stim objects if necessary.
   * @param {number[][][]} vertices aka vertexGroups, ie list of groups of coordinates
   */
  setVertices(vertices) {
    vertices.forEach((vertexGroup, i) => {
      // Single value represents radius, indicating blanking circle
      if (vertexGroup[0].length == 1) {
        this.stims[i] = new Polygon({
          win: psychoJS.window,
          name: `blanking-fixation-${i}`,
          units: "pix",
          radius: vertexGroup[0][0],
          edges: 99,
          closeShape: true,
          fillColor: psychoJS.window.color,
          lineColor: psychoJS.window.color,
          opacity: undefined,
          depth: -5.0,
          lineWidth: 0,
        });
        // Otherwise, treat as a ShapeStim
      } else {
        if (this.stims[i]) {
          this.stims[i].setVertices(vertexGroup);
        } else {
          this.stims[i] = new ShapeStim({
            win: psychoJS.window,
            name: `fixation-${i}`,
            units: "pix",
            vertices: vertexGroup,
            lineWidth: fixationConfig.strokeWidth,
            closeShape: false,
            color: new Color("black"),
            opacity: undefined,
            depth: -6.0,
          });
        }
      }
    });
    this.stims
      .slice(vertices.length)
      .forEach((stim) => stim.setAutoDraw(false));
    this.stims = this.stims.slice(0, vertices.length);
  }
  setAutoDraw(bool) {
    this.stims.forEach((stim) => stim.setAutoDraw(bool));
  }
  setPos(positionXYPx) {
    this.stims.forEach((stim) => {
      // If this stim is the blanking circle, set it to that position instead
      if (Polygon.prototype.isPrototypeOf(stim)) {
        stim.setPos(fixationConfig.markingBlankingPos);
      } else {
        stim.setPos(positionXYPx);
      }
    });
  }
  _updateIfNeeded() {
    this.stims.forEach((stim) => stim._updateIfNeeded());
  }
  refresh() {
    this.stims.forEach((stim) => stim.refresh());
  }
  setLineWidth(width) {
    this.stims.forEach((stim) => stim.setLineWidth(width));
  }
  get status() {
    return this.stims[0].status;
  }
  get tStart() {
    return this.stims[0].tStart;
  }
  get frameNStart() {
    return this.stims[0].frameNStart;
  }
  set status(s) {
    this.stims.forEach((stim) => (stim.status = s));
  }
  set tStart(t) {
    this.stims.map((stim) => (stim.tStart = t));
  }
  set frameNStart(f) {
    this.stims.map((stim) => (stim.frameNStart = f));
  }
}

export const getFixationVertices = (
  strokeLength,
  targetHeightPx,
  targetXYPx
) => {
  const half = Math.round(strokeLength / 2);
  const vertices = [
    [
      [-half, 0],
      [0, 0],
      [half, 0],
      [0, 0],
      [0, -half],
      [0, 0],
      [0, half],
    ],
  ];
  // If we should blank near the target...
  if (
    fixationConfig.markingBlankedNearTargetBool &&
    targetHeightPx &&
    targetXYPx
  ) {
    const targetEccPx = Math.hypot(
      targetXYPx[0] - fixationConfig.pos[0],
      targetXYPx[1] - fixationConfig.pos[1]
    );
    const eccentricityRadiusValue =
      targetEccPx * fixationConfig.markingBlankingRadiusReEccentricity;
    const targetHeightRadiusValue =
      targetHeightPx * fixationConfig.markingBlankingRadiusReTargetHeight;
    const blankingRadiusPx = Math.max(
      eccentricityRadiusValue,
      targetHeightRadiusValue
    );
    // TODO should not be located at fixation position, but near (all possible locations for) fixation
    vertices.push([[blankingRadiusPx], fixationConfig.pos]);
  }
  return vertices;
};

export const gyrateFixation = (fixation, t, displayOptions) => {
  const rPx = Math.abs(
    fixationConfig.pos[0] -
      XYPixOfXYDeg(
        [fixationConfig.markingFixationMotionRadiusDeg, 0],
        displayOptions
      )[0]
  );
  const period = fixationConfig.markingFixationMotionPeriodSec;
  const newFixationXY = [
    fixationConfig.nominalPos[0] +
      Math.cos((t + fixationConfig.offset) / (period / (2 * Math.PI))) * rPx,
    fixationConfig.nominalPos[1] +
      Math.sin((t + fixationConfig.offset) / (period / (2 * Math.PI))) * rPx,
  ];
  fixationConfig.pos = newFixationXY;
  fixation.setPos(newFixationXY);
};

/**
 * Move the provided stimuli based on the fixation's current position relative to it's nominal position,
 * ie the position based upon which the stimuli were generated.
 * Should be used iff gyrateFixation() is used.
 * @param {psychoJS.VisualStim[]} stims Array of psychojs stims
 */
export const offsetStimsToFixationPos = (stims) => {
  const fixationDisplacement = [
    fixationConfig.pos[0] - fixationConfig.nominalPos[0],
    fixationConfig.pos[1] - fixationConfig.nominalPos[1],
  ];
  for (const stim of stims) {
    const nominalPos = stim.getPos();
    const offsetPos = [
      nominalPos[0] + fixationDisplacement[0],
      nominalPos[1] + fixationDisplacement[1],
    ];
    stim.setPos(offsetPos);
  }
};
