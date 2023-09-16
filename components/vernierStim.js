import { Polygon, ShapeStim } from "../psychojs/src/visual";
import { Color, to_px } from "../psychojs/src/util";
import { psychoJS } from "./globalPsychoJS";
import { fixationConfig, displayOptions } from "./global";

import { Rectangle, XYPixOfXYDeg, colorRGBASnippetToRGBA } from "./utils";

export const vernierConfig = {
  color: undefined,
  length: 45,
  width: 2,
  show: true,
  targetColorRGBA: undefined,
  targetDurationSec: 999,
  targetEccentricityXDeg: 0,
  targetEccentricityYDeg: 0,
  targetGapDeg: 0.1,
  targetLengthDeg: undefined,
  targetOffsetDeg: undefined,
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

export const getUpperLineVertices = (directionBool) => {
  const horizontalOffsetDeg = directionBool
    ? vernierConfig.targetOffsetDeg
    : -vernierConfig.targetOffsetDeg;

  const upperLineXDeg =
    vernierConfig.targetEccentricityXDeg + horizontalOffsetDeg;
  const upperLineYDeg =
    vernierConfig.targetEccentricityYDeg + vernierConfig.targetGapDeg / 2;
  const upperXYPix = [
    XYPixOfXYDeg([upperLineXDeg, upperLineYDeg], displayOptions),
    XYPixOfXYDeg(
      [upperLineXDeg, upperLineYDeg + vernierConfig.targetLengthDeg],
      displayOptions
    ),
  ];
  return upperXYPix;
};

export const getLowerLineVertices = (directionBool) => {
  const horizontalOffsetDeg = directionBool
    ? vernierConfig.targetOffsetDeg
    : -vernierConfig.targetOffsetDeg;

  const lowerLineXDeg =
    vernierConfig.targetEccentricityXDeg - horizontalOffsetDeg;
  const lowerLineYDeg =
    vernierConfig.targetEccentricityYDeg - vernierConfig.targetGapDeg / 2;
  const lowerXYPix = [
    XYPixOfXYDeg([lowerLineXDeg, lowerLineYDeg], displayOptions),
    XYPixOfXYDeg(
      [lowerLineXDeg, lowerLineYDeg - vernierConfig.targetLengthDeg],
      displayOptions
    ),
  ];
  return lowerXYPix;
};

export const restrictOffsetDeg = (proposedOffsetDeg, directionBool) => {
  const screenLowerLeft = [
    -displayOptions.window._size[0] / 2,
    -displayOptions.window._size[1] / 2,
  ];
  const screenUpperRight = [
    displayOptions.window._size[0] / 2,
    displayOptions.window._size[1] / 2,
  ];
  const screenRectPx = new Rectangle(screenLowerLeft, screenUpperRight);

  vernierConfig.targetOffsetDeg = proposedOffsetDeg;

  // Calculate the vertices for the upper and lower lines based on the proposed offset
  let upperLineVertices = getUpperLineVertices(vernierConfig, directionBool);
  let lowerLineVertices = getLowerLineVertices(vernierConfig, directionBool);

  // Calculate the width of the stimulus based on vertices
  let stimulusWidthDeg = Math.abs(
    upperLineVertices[0][0] - lowerLineVertices[0][0]
  );

  // Check if the stimulus fits within the screen boundaries
  if (stimulusWidthDeg <= screenRectPx.width) {
    return vernierConfig.targetOffsetDeg;
  }

  while (stimulusWidthDeg > screenRectPx.width) {
    vernierConfig.targetOffsetDeg *= 0.9; // Adjust the factor as needed
    // Recalculate stimulus width
    upperLineVertices = getUpperLineVertices(vernierConfig, directionBool);
    lowerLineVertices = getLowerLineVertices(vernierConfig, directionBool);
    stimulusWidthDeg = Math.abs(
      upperLineVertices[0][0] - lowerLineVertices[0][0]
    );
  }

  return vernierConfig.targetOffsetDeg;
};

export const offsetVernierToFixationPos = (vernier) => {
  const fixationDisplacement = [
    fixationConfig.pos[0] - fixationConfig.nominalPos[0],
    fixationConfig.pos[1] - fixationConfig.nominalPos[1],
  ];

  const vertices = [[], []];
  console.log("offsetVernierToFixationPos");
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      vertices[i].push([
        vernier.stims[i].vertices[j][0] + fixationDisplacement[0],
        vernier.stims[i].vertices[j][1] + fixationDisplacement[1],
      ]);
    }
  }
  vernier.setVertices(vertices);
  console.log("upper offseted", vernier.stims[0].vertices);
  console.log("lower offseted", vernier.stims[1].vertices);
};

export class VernierStim {
  constructor() {
    this.stims = [
      new ShapeStim({
        name: "upper line",
        win: psychoJS.window,
        lineWidth: 2,
        closeShape: false,
        color: new Color("black"),
        opacity: undefined,
        depth: -6.0,
        vertices: [
          [190, 10],
          [190, 50],
        ],
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
        vertices: [
          [210, -10],
          [210, -50],
        ],
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
    const gap =
      XYPixOfXYDeg([0, vernierConfig.targetGapDeg], displayOptions)[1] -
      vernierConfig.targetEccentricityYDeg;
    console.log("gap", gap);
    vernierConfig.length = XYPixOfXYDeg(
      [0, vernierConfig.targetLengthDeg],
      displayOptions
    )[1];
    console.log("length", vernierConfig.length);
    vernierConfig.width = XYPixOfXYDeg(
      [vernierConfig.targetThicknessDeg, 0],
      displayOptions
    )[0];
    console.log("width", vernierConfig.width);
    vernierConfig.color = colorRGBASnippetToRGBA(vernierConfig.targetColorRGBA);
    console.log("color", vernierConfig.color);
    // Update vertices for the upper line

    this.stims[0].setVertices(getUpperLineVertices(directionBool));
    let upper = getUpperLineVertices(directionBool);
    let lower = getLowerLineVertices(directionBool);
    console.log(
      "upper line top",
      Math.round(upper[0][0]),
      Math.round(upper[0][1])
    );
    console.log(
      "upper line bottom",
      Math.round(upper[1][0]),
      Math.round(upper[1][1])
    );
    console.log(
      "lower line top",
      Math.round(lower[0][0]),
      Math.round(lower[0][1])
    );
    console.log(
      "lower line bottom",
      Math.round(lower[1][0]),
      Math.round(lower[1][1])
    );
    // Update vertices for the lower line
    this.stims[1].setVertices(getLowerLineVertices(directionBool));

    this.setLineWidth(vernierConfig.width);
    this.setColor(vernierConfig.color);
  }
  setVertices(vertices) {
    this.stims[0].setVertices(vertices[0]);
    this.stims[1].setVertices(vertices[1]);
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
