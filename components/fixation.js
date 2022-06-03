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
  );
  return specifiedLocationXYPx;
};

export class Fixation {
  constructor() {
    this.stims = [
      new ShapeStim({
        win: psychoJS.window,
        name: "fixation-0",
        units: "pix",
        vertices: getFixationVerticies(fixationConfig.strokeLength),
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
        )[0] - fixationConfig.currentPos[0];
      fixationConfig.strokeWidth =
        XYPixOfXYDeg(
          [0, fixationConfig.markingFixationStrokeThicknessDeg],
          displayOptions
        )[1] - fixationConfig.currentPos[1];
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
      const theseVerts = getFixationVerticies(
        fixationConfig.strokeLength,
        targetHeightPx,
        targetXYPx
      );
      this.setVertices(theseVerts);
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
    this.stims = this.stims.slice(0, vertices.length);
  }
  setAutoDraw(bool) {
    this.stims.forEach((stim) => stim.setAutoDraw(bool));
  }
  setPos(positionXYPx) {
    this.stims.forEach((stim) => stim.setPos(positionXYPx));
  }
  _updateIfNeeded() {
    this.stims.forEach((stim) => stim._updateIfNeeded());
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

export const getFixationVerticies = (
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
    XYPixOfXYDeg(fixationConfig.pos, displayOptions)[0] -
      XYPixOfXYDeg(
        [
          fixationConfig.pos[0] + fixationConfig.markingFixationMotionRadiusDeg,
          fixationConfig.pos[1],
        ],
        displayOptions
      )[0]
  );
  const period = fixationConfig.markingFixationMotionPeriodSec;
  const newFixationXY = [
    fixationConfig.pos[0] +
      Math.cos((t + fixationConfig.offset) / (period / (2 * Math.PI))) * rPx,
    fixationConfig.pos[1] +
      Math.sin((t + fixationConfig.offset) / (period / (2 * Math.PI))) * rPx,
  ];
  fixationConfig.currentPos = newFixationXY;
  fixation.setPos(newFixationXY);
};
