import { displayOptions, fixationConfig } from "./global";
import { logger, XYPixOfXYDeg } from "./utils";

export const updateFixationConfig = (reader, BC) => {
  // TODO implement support for fixationLocationStrategy
  fixationConfig.pos = [0, 0];
  logger("fixationConfig.offset", fixationConfig.offset);

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
