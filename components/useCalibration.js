export const useCalibration = (reader) => {
  return ifTrue([
    ...reader.read("calibrateBlindSpotBool"),
    ...reader.read("calibrateDistanceCheckBool"),
    ...reader.read("calibrateGazeCheckBool"),
    ...reader.read("calibrateTrackDistanceBool"),
    ...reader.read("calibrateTrackGazeBool"),
    ...reader.read("calibrateTrackNearPointBool"),
  ]);
};

function ifTrue(arr) {
  for (let a of arr) if (a) return true;
  return false;
}

export const formCalibrationList = (reader) => {
  const tasks = ["screenSize"];
  if (ifTrue(reader.read("calibrateTrackDistanceBool")))
    tasks.push({
      name: "trackDistance",
      options: {
        nearPoint: ifTrue(reader.read("calibrateTrackNearPointBool")),
        showVideo: false,
      },
    });
  if (ifTrue(reader.read("calibrateTrackGazeBool")))
    tasks.push({
      name: "trackGaze",
      options: {
        showGazer: false,
        showVideo: false,
      },
    });

  return tasks;
};
