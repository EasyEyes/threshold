import {
  logFixationXYPxAtStimulusOnset,
  logFixationXYPxUsedForTarget,
} from "../components/fixationPositionLogging";

const screenWith = (fixationConfig: any): any => ({ fixationConfig });

describe("fixation position output data", () => {
  test("V2 logs the predicted position used by target transforms", () => {
    const addData = jest.fn();
    logFixationXYPxUsedForTarget(
      screenWith({
        pos: [10, 20],
        nominalPos: [1, 2],
        fixationPosAfterDelay: [30, 40],
      }),
      2,
      addData,
    );
    expect(addData).toHaveBeenCalledWith("fixationXYPxUsedForTarget", "30, 40");
  });

  test("V2 falls back to nominal fixation when there is no prediction", () => {
    const addData = jest.fn();
    logFixationXYPxUsedForTarget(
      screenWith({ pos: [10, 20], nominalPos: [1, 2] }),
      2,
      addData,
    );
    expect(addData).toHaveBeenCalledWith("fixationXYPxUsedForTarget", "1, 2");
  });

  test("V1 logs the current position used by its target transforms", () => {
    const addData = jest.fn();
    logFixationXYPxUsedForTarget(
      screenWith({ pos: [10, 20], nominalPos: [1, 2] }),
      1,
      addData,
    );
    expect(addData).toHaveBeenCalledWith("fixationXYPxUsedForTarget", "10, 20");
  });

  test("stimulus onset logs the actual frozen crosshair separately", () => {
    const addData = jest.fn();
    logFixationXYPxAtStimulusOnset(
      screenWith({ pos: [10, 20], nominalPos: [1, 2] }),
      addData,
    );
    expect(addData).toHaveBeenCalledWith(
      "fixationXYPxAtStimulusOnset",
      "10, 20",
    );
  });

  test("missing or malformed positions are not fabricated", () => {
    const addData = jest.fn();
    logFixationXYPxUsedForTarget(screenWith({}), 2, addData);
    logFixationXYPxAtStimulusOnset(screenWith({}), addData);
    expect(addData).not.toHaveBeenCalled();
  });
});
