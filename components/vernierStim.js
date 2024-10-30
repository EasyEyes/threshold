import { ShapeStim } from "../psychojs/src/visual";
import { Color } from "../psychojs/src/util";
import { psychoJS } from "./globalPsychoJS";
import { targetEccentricityDeg } from "./global";

import {
  degreesToPixels,
  Rectangle,
  colorRGBASnippetToRGBA,
  isRectInRect,
  logger,
} from "./utils";
import { Screens } from "./multiple-displays/globals.ts";
import { XYPxOfDeg } from "./multiple-displays/utils.ts";
export class VernierStim {
  constructor() {
    this.color;
    this.lineWidth = 2;
    this.targetDurationSec;
    this.targetGapDeg;
    this.targetLengthDeg;
    this.targetOffsetDeg;
    this.targetThicknessDeg;
    this.directionBool;
    this.nominalPosPx;
    this._pos;
    this.markingFixationMotionRadiusDeg;
    this.markingFixationMotionSpeedDegPerSec;
    this.stims = [
      new ShapeStim({
        name: "upper line",
        win: psychoJS.window,
        lineWidth: this.lineWidth,
        closeShape: false,
        lineColor: new Color("black"),
        opacity: undefined,
        depth: Infinity,
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
        lineColor: new Color("black"),
        opacity: undefined,
        depth: Infinity,
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
  update(reader, BC, proposedOffsetDeg) {
    this.directionBool = Math.random() > 0.5;
    this.color = colorRGBASnippetToRGBA(reader.read("targetColorRGBA", BC));
    // this.setColor(this.color);
    this.targetDurationSec = reader.read("targetDurationSec", BC);
    this.targetGapDeg = reader.read("targetGapDeg", BC);
    this.targetLengthDeg = reader.read("targetLengthDeg", BC);
    this.targetThicknessDeg = reader.read("targetThicknessDeg", BC);
    this.markingFixationMotionRadiusDeg = reader.read(
      "markingFixationMotionRadiusDeg",
      BC,
    );
    this.markingFixationMotionSpeedDegPerSec = reader.read(
      "markingFixationMotionSpeedDegPerSec",
      BC,
    );
    this.nominalPosPx = XYPxOfDeg(0, [
      targetEccentricityDeg.x,
      targetEccentricityDeg.y,
    ]);
    this._pos = this.nominalPosPx;
    this.targetOffsetDeg = this.restrictOffsetDeg(proposedOffsetDeg);
    const vertices = [
      this.getLowerLineVertices(this.targetOffsetDeg),
      this.getUpperLineVertices(this.targetOffsetDeg),
    ];
    this.setVertices(vertices);
    this.setLineWidth(XYPxOfDeg(0, [this.targetThicknessDeg, 0])[0]);
  }
  restrictOffsetDeg(proposedOffsetDeg) {
    const screenLowerLeft = [
      -Screens[0].window._size[0] / 2,
      -Screens[0].window._size[1] / 2,
    ];
    const screenUpperRight = [
      Screens[0].window._size[0] / 2,
      Screens[0].window._size[1] / 2,
    ];
    let screenRectPx = new Rectangle(screenLowerLeft, screenUpperRight);
    const targetXYDeg = [targetEccentricityDeg.x, targetEccentricityDeg.y];
    const fixationRotationRadiusXYPx =
      this.markingFixationMotionRadiusDeg > 0 &&
      this.markingFixationMotionSpeedDegPerSec > 0
        ? [
            degreesToPixels(
              this.markingFixationMotionRadiusDeg,
              targetXYDeg,
              "horizontal",
            ),
            degreesToPixels(
              this.markingFixationMotionRadiusDeg,
              targetXYDeg,
              "vertical",
            ),
          ]
        : [0, 0];
    screenRectPx = screenRectPx.inset(...fixationRotationRadiusXYPx);
    let targetOffsetDeg = proposedOffsetDeg;
    // Calculate the width of the stimulus based on proposed offset
    const getStimulusRect = (targetOffsetDeg) => {
      const upperLineVertices = this.getUpperLineVertices(targetOffsetDeg);
      const lowerLineVertices = this.getLowerLineVertices(targetOffsetDeg);
      const xs = [
        upperLineVertices[0][0],
        upperLineVertices[1][0],
        lowerLineVertices[0][0],
        lowerLineVertices[1][0],
      ];
      const ys = [
        upperLineVertices[0][1],
        upperLineVertices[1][1],
        lowerLineVertices[0][1],
        lowerLineVertices[1][1],
      ];
      const lowerLeft = [Math.min(...xs), Math.min(...ys)];
      let stimRectPx = new Rectangle(lowerLeft, [
        Math.max(...xs),
        Math.max(...ys),
      ]);
      return stimRectPx;
    };
    // Check if the stimulus fits within the screen boundaries
    while (
      !isRectInRect(getStimulusRect(targetOffsetDeg), screenRectPx) &&
      targetOffsetDeg > 0.000001
    ) {
      console.count("Decreasing targetOffsetDeg");
      targetOffsetDeg *= 0.9; // Adjust the factor as needed
    }
    return targetOffsetDeg;
  }
  setPos(pos) {
    const startingVertices = this.stims.map((stim) => stim.getVertices());
    const nakedVertices = startingVertices.map((vertexPair) =>
      vertexPair.map((vertex) => [
        vertex[0] - this.nominalPosPx[0],
        vertex[1] - this.nominalPosPx[1],
      ]),
    );
    const positionedVertices = nakedVertices.map((pair) =>
      pair.map((vertex) => [vertex[0] + pos[0], vertex[1] + pos[1]]),
    );
    this.nominalPosPx = pos;
    this._pos = this.nominalPosPx;
    this.setVertices(positionedVertices);
  }
  setVertices(vertices) {
    this.stims[0].setVertices(vertices[0]);
    this.stims[1].setVertices(vertices[1]);
  }
  setColor(color) {
    color = new Color(color);
    this.stims.forEach((stim) => stim.setLineColor(color));
  }
  getLowerLineVertices(targetOffsetDeg) {
    const horizontalOffsetDeg = this.directionBool
      ? targetOffsetDeg
      : -targetOffsetDeg;

    const xDeg = targetEccentricityDeg.x + horizontalOffsetDeg;
    const yDeg = targetEccentricityDeg.y - this.targetGapDeg / 2;
    return [
      XYPxOfDeg(0, [xDeg, yDeg]),
      XYPxOfDeg(0, [xDeg, yDeg + this.targetLengthDeg]),
    ];
  }
  getUpperLineVertices(targetOffsetDeg) {
    const horizontalOffsetDeg = this.directionBool
      ? -targetOffsetDeg
      : targetOffsetDeg;
    const xDeg = targetEccentricityDeg.x + horizontalOffsetDeg;
    const yDeg = targetEccentricityDeg.y + this.targetGapDeg / 2;
    return [
      XYPxOfDeg(0, [xDeg, yDeg]),
      XYPxOfDeg(0, [xDeg, yDeg + this.targetLengthDeg]),
    ];
  }
  _updateIfNeeded() {
    this.stims.forEach((stim) => stim._updateIfNeeded());
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
