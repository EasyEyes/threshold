import { ShapeStim } from "../psychojs/src/visual";
import { Color } from "../psychojs/src/util";
import { psychoJS } from "./globalPsychoJS";
import { displayOptions, fixationConfig, letterConfig } from "./global";
import { logger, XYPixOfXYDeg } from "./utils";

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
    // TODO implement support for fixationLocationStrategy
    fixationConfig.pos = [0, 0];

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
      fixationConfig.strokeLength = XYPixOfXYDeg(
        [fixationConfig.markingFixationStrokeLengthDeg, 0],
        displayOptions
      )[0];
      fixationConfig.strokeWidth = XYPixOfXYDeg(
        [0, fixationConfig.markingFixationStrokeThicknessDeg],
        displayOptions
      )[1];
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
  setVertices(vertices) {
    vertices.forEach((vertexGroup, i) => {
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
    const screenExtent = [
      displayOptions.window._size[0] / 2,
      displayOptions.window._size[1] / 2,
    ];
    const fix = fixationConfig.pos;
    return [
      // Left
      [
        [-screenExtent[0], fix[1]],
        [-blankingRadiusPx + fix[0], fix[1]],
      ],
      // Right
      [
        [blankingRadiusPx + fix[0], fix[1]],
        [screenExtent[0], fix[1]],
      ],
      // Top
      [
        [fix[0], blankingRadiusPx + fix[1]],
        [fix[0], screenExtent[1]],
      ],
      // Bottom
      [
        [fix[0], -blankingRadiusPx + fix[1]],
        [fix[0], -screenExtent[1]],
      ],
    ];
  } else {
    const half = Math.round(strokeLength / 2);
    return [
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
  }
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
