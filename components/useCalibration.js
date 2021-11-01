export const useCalibration = (reader) => {
  return ifTrue([
    ...reader.read("calibrateBlindSpotBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateDistanceCheckBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateGazeCheckBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateTrackDistanceBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateTrackGazeBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateTrackNearPointBool", "__ALL_BLOCKS__"),
  ]);
};

function ifTrue(arr) {
  for (let a of arr) if (a) return true;
  return false;
}

export const formCalibrationList = (reader) => {
  const tasks = ["screenSize"];
  if (ifTrue(reader.read("calibrateTrackDistanceBool", "__ALL_BLOCKS__")))
    tasks.push({
      name: "trackDistance",
      options: {
        nearPoint: ifTrue(
          reader.read("calibrateTrackNearPointBool", "__ALL_BLOCKS__")
        ),
        showVideo: false,
      },
    });
  if (ifTrue(reader.read("calibrateTrackGazeBool", "__ALL_BLOCKS__")))
    tasks.push({
      name: "trackGaze",
      options: {
        showGazer: false,
        showVideo: false,
      },
    });

  return tasks;
};
