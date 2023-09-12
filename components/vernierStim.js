import { Polygon, ShapeStim } from "../psychojs/src/visual";
import { Color, to_px } from "../psychojs/src/util";
import { psychoJS } from "./globalPsychoJS";
import { displayOptions } from "./global";

import { XYPixOfXYDeg, colorRGBASnippetToRGBA } from "./utils";

export const vernierConfig = {
  color: undefined,
  length: 45,
  width: 2,
  pos: [0, 0],
  show: true,
  targetColorRGBA: undefined,
  targetDurationSec: 999,
  targetEccentricityXDeg: 0,
  targetEccentricityYDeg: 0,
  targetGapDeg: 30,
  targetLengthDeg: undefined,
  targetOffsetDeg: 20,
  targetThicknessDeg: 0.02,
};

export const readTrialLevelVenierParams = (reader, BC) => {
  vernierConfig.targetColorRGBA = reader.read("targetColorRGBA", BC);
  vernierConfig.targetDurationSec = reader.read("targetDurationSec", BC);
  vernierConfig.targetEccentricityXDeg = reader.read(
    "targetEccentricityXDeg",
    BC
  );
  vernierConfig.targetEccentricityYDeg = reader.read(
    "targetEccentricityYDeg",
    BC
  );
  vernierConfig.targetGapDeg = reader.read("targetGapDeg", BC);
  vernierConfig.targetLengthDeg = reader.read("targetLengthDeg", BC);
  vernierConfig.targetThicknessDeg = reader.read("targetThicknessDeg", BC);
};

export const getUpperLineVertices = (vernierConfig) => {
  const upperLineX =
    vernierConfig.targetEccentricityXDeg + vernierConfig.targetOffsetDeg;
  const upperLineY =
    vernierConfig.targetEccentricityYDeg + vernierConfig.targetGapDeg / 2;
  return [
    [upperLineX, upperLineY],
    [upperLineX, upperLineY + vernierConfig.length],
  ];
};

export const getLowerLineVertices = (vernierConfig) => {
  const lowerLineX =
    vernierConfig.targetEccentricityXDeg - vernierConfig.targetOffsetDeg;
  const lowerLineY =
    vernierConfig.targetEccentricityYDeg - vernierConfig.targetGapDeg / 2;
  return [
    [lowerLineX, lowerLineY],
    [lowerLineX, lowerLineY - vernierConfig.length],
  ];
};

export class VernierStim {
  constructor(vernierConfig) {
    this.stims = [
      new ShapeStim({
        name: "upper line",
        win: psychoJS.window,
        lineWidth: 2,
        closeShape: false,
        color: new Color("black"),
        opacity: undefined,
        depth: -6.0,
        vertices: getUpperLineVertices(vernierConfig),
        units: "pix",
      }),
      new ShapeStim({
        name: "lower line",
        win: psychoJS.window,
        lineWidth: 2,
        closeShape: false,
        color: new Color("black"),
        opacity: undefined,
        depth: -6.0,
        vertices: getLowerLineVertices(vernierConfig),
        units: "pix",
      }),
    ];
  }

  setAutoDraw(bool) {
    this.stims.forEach((stim) => stim.setAutoDraw(bool));
  }
  setLineWidth(width) {
    this.stims.forEach((stim) => stim.setLineWidth(width));
  }

  update(directionBool) {
    // Calculate the horizontal displacement based on targetCharacter
    const horizontalOffset = directionBool
      ? vernierConfig.targetOffsetDeg
      : -vernierConfig.targetOffsetDeg;
    const gap =
      XYPixOfXYDeg([0, vernierConfig.targetGapDeg], displayOptions)[0] -
      vernierConfig.targetEccentricityYDeg;
    console.log("gap", gap);
    vernierConfig.length =
      XYPixOfXYDeg([vernierConfig.targetLengthDeg, 0], displayOptions)[0] -
      vernierConfig.targetEccentricityXDeg;
    console.log("length", vernierConfig.length);
    vernierConfig.width =
      XYPixOfXYDeg([0, vernierConfig.targetThicknessDeg], displayOptions)[1] -
      vernierConfig.targetEccentricityYDeg;
    console.log("width", vernierConfig.width);
    vernierConfig.color = colorRGBASnippetToRGBA(vernierConfig.targetColorRGBA);
    console.log("color", vernierConfig.color);
    // Update vertices for the upper line
    const upperLineX = vernierConfig.targetEccentricityXDeg + horizontalOffset;
    const upperLineY = vernierConfig.targetEccentricityYDeg + gap / 2;
    this.stims[0].setVertices([
      [upperLineX, upperLineY],
      [upperLineX, upperLineY + vernierConfig.length],
    ]);

    // Update vertices for the lower line
    const lowerLineX = vernierConfig.targetEccentricityXDeg - horizontalOffset;
    const lowerLineY = vernierConfig.targetEccentricityYDeg - gap / 2;
    this.stims[1].setVertices([
      [lowerLineX, lowerLineY],
      [lowerLineX, lowerLineY - vernierConfig.length],
    ]);

    this.setLineWidth(vernierConfig.width);
    this.setColor(vernierConfig.color);
  }

  setColor(color) {
    color = new Color(color);
    this.stims.forEach((stim) => {
      // Set color of fixation, but not blanking circle
      if (!(stim instanceof Polygon)) {
        stim.setLineColor(color);
      }
    });
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
    this.stims.forEach((stim) => (stim.tStart = t));
  }
  set frameNStart(f) {
    this.stims.forEach((stim) => (stim.frameNStart = f));
  }
}
