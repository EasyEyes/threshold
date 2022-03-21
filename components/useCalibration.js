import { debug, ifTrue } from "./utils";

export const useCalibration = (reader) => {
  return ifTrue([
    ...reader.read("calibrateBlindSpotBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateScreenSizeBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateTrackDistanceBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateTrackGazeBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateTrackNearPointBool", "__ALL_BLOCKS__"),
  ]);
};

/* -------------------------------------------------------------------------- */

export const ifAnyCheck = (reader) => {
  return ifTrue([
    ...reader.read("calibrateScreenSizeCheckBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateDistanceCheckBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateGazeCheckBool", "__ALL_BLOCKS__"),
  ]);
};

export const formCalibrationList = (reader) => {
  const tasks = [];

  if (ifTrue(reader.read("calibrateScreenSizeBool", "__ALL_BLOCKS__")))
    ////
    tasks.push({
      name: "screenSize",
      options: {
        fullscreen: !debug,
        check: reader.read("calibrateScreenSizeCheckBool")[0],
      },
    });
  if (ifTrue(reader.read("calibrateBlindSpotBool", "__ALL_BLOCKS__")))
    tasks.push({
      name: "measureDistance",
      options: {
        fullscreen: !debug,
        sparkle: true,
        check: reader.read("calibrateDistanceCheckBool")[0],
        showCancelButton: false,
      },
    });
  if (ifTrue(reader.read("calibrateTrackDistanceBool", "__ALL_BLOCKS__")))
    ////
    tasks.push({
      name: "trackDistance",
      options: {
        nearPoint: ifTrue(
          reader.read("calibrateTrackNearPointBool", "__ALL_BLOCKS__")
        ),
        showVideo: false,
        desiredDistanceCm: reader.has("viewingDistanceDesiredCm")
          ? reader.read("viewingDistanceDesiredCm")[0]
          : undefined,
        desiredDistanceTolerance: reader.read("viewingDistanceAllowedRatio")[0],
        desiredDistanceMonitor: reader.has("viewingDistanceDesiredCm"),
        fullscreen: !debug,
        sparkle: true,
        check: reader.read("calibrateDistanceCheckBool")[0],
        showCancelButton: false,
      },
    });
  if (ifTrue(reader.read("calibrateTrackGazeBool", "__ALL_BLOCKS__")))
    ////
    tasks.push({
      name: "trackGaze",
      options: {
        showGazer: ifTrue(reader.read("showGazerBool", "__ALL_BLOCKS__")),
        showVideo: false,
        calibrationCount: 3,
        fullscreen: !debug,
      },
    });

  return tasks;
};

export const saveCalibratorData = (reader, rc, psychoJS) => {
  if (ifTrue(reader.read("calibrateScreenSizeBool", "__ALL_BLOCKS__"))) {
    psychoJS.experiment.addData(
      `screenWidthByObjectCm`,
      rc.screenWidthCm ? rc.screenWidthCm.value : 0
    );
    psychoJS.experiment.addData(
      `screenHeightByObjectCm`,
      rc.screenHeightCm ? rc.screenHeightCm.value : 0
    );
  }

  if (rc.viewingDistanceCm) {
    for (let viewingDistanceData of rc.viewingDistanceData) {
      if (viewingDistanceData.method === "BlindSpot") {
        psychoJS.experiment.addData(
          `viewingDistanceByBlindSpotCm`,
          viewingDistanceData.value
        );
      }
    }
  }
};

export const saveCheckData = (rc, psychoJS) => {
  // rc.checkData is a list of objects { timestamp: "", value: { field1: value1, filed2: value2 } }
  for (let data of rc.checkData) {
    // psychoJS.experiment.addData(
    //   `calibrationCheck_${data.measure}_timestamp`,
    //   data.timestamp.getTime ? data.timestamp.getTime() : data.timestamp
    // );
    if (data.measure === "screenSize") {
      if (data.value.horizontal)
        psychoJS.experiment.addData(
          "screenWidthByRulerCm",
          (getCmValue(
            data.value.horizontal.numerical,
            data.value.horizontal.unit
          ) *
            screen.width) /
            data.value.horizontal.arrowWidthPx
        );
      if (data.value.vertical)
        psychoJS.experiment.addData(
          "screenHeightByRulerCm",
          (getCmValue(data.value.vertical.numerical, data.value.vertical.unit) *
            screen.height) /
            data.value.vertical.arrowHeightPx
        );
    } else if (
      data.measure === "measureDistance" ||
      data.measure === "trackDistance"
    ) {
      psychoJS.experiment.addData(
        "viewingDistanceByRulerCm",
        getCmValue(data.value.numerical, data.value.unit)
      );
    }
  }
};

/* -------------------------------------------------------------------------- */

const getCmValue = (numericalValue, unit) => {
  if (unit === "cm") return numericalValue;
  else return numericalValue * 2.54;
};
