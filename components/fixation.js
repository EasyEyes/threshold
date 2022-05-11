import { displayOptions, fixationConfig } from "./global";
import { logger, XYPixOfXYDeg } from "./utils";

export const updateFixationConfig = (reader, BC = undefined) => {
  // TODO implement support for fixationLocationStrategy
  fixationConfig.pos = [0, 0];
  logger("fixationConfig.offset", fixationConfig.offset);

  if (BC) {
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
  } else {
    fixationConfig.markingFixationStrokeLengthDeg = reader.read(
      "markingFixationStrokeLengthDeg",
      "__ALL_BLOCKS__"
    )[0];
    fixationConfig.markingFixationStrokeThicknessDeg = reader.read(
      "markingFixationStrokeThicknessDeg",
      "__ALL_BLOCKS__"
    )[0];
    fixationConfig.markingFixationMotionPeriodSec = reader.read(
      "markingFixationMotionPeriodSec",
      "__ALL_BLOCKS__"
    )[0];
    fixationConfig.markingFixationMotionRadiusDeg = reader.read(
      "markingFixationMotionRadiusDeg",
      "__ALL_BLOCKS__"
    )[0];
    fixationConfig.markingFixationHotSpotRadiusDeg = reader.read(
      "markingFixationHotSpotRadiusDeg",
      "__ALL_BLOCKS__"
    )[0];
    fixationConfig.show = reader.read(
      "markTheFixationBool",
      "__ALL_BLOCKS__"
    )[0];
  }
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

  if (fixationConfig.stim) {
    fixationConfig.stim.setPos(fixationConfig.pos);
    fixationConfig.stim.setVertices(
      getFixationVerticies(fixationConfig.strokeLength)
    );
    fixationConfig.stim.setLineWidth(fixationConfig.strokeWidth);
  }
};

export const getFixationVerticies = (strokeLength) => {
  const half = Math.round(strokeLength / 2);
  return [
    [-half, 0],
    [0, 0],
    [half, 0],
    [0, 0],
    [0, -half],
    [0, 0],
    [0, half],
  ];
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
