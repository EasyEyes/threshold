type AddData = (name: string, value: string) => void;

const logXY = (name: string, xy: any, addData: AddData): void => {
  if (
    !Array.isArray(xy) ||
    xy.length !== 2 ||
    !xy.every((v) => Number.isFinite(v))
  )
    return;
  addData(name, `${xy[0]}, ${xy[1]}`);
};

/** Log the fixation used by the target transform, not merely the current one. */
export const logFixationXYPxUsedForTarget = (
  screen: any,
  easyEyesLettersVersion: any,
  addData: AddData,
): void => {
  const fc = screen.fixationConfig ?? {};
  const xy =
    Number(easyEyesLettersVersion) === 2
      ? fc.fixationPosAfterDelay ?? fc.nominalPos
      : fc.pos;
  logXY("fixationXYPxUsedForTarget", xy, addData);
};

/** Log the actual crosshair position when the target routine begins. */
export const logFixationXYPxAtStimulusOnset = (
  screen: any,
  addData: AddData,
): void => {
  logXY("fixationXYPxAtStimulusOnset", screen.fixationConfig?.pos, addData);
};
