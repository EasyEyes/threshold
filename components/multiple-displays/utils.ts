import { Screen_, viewMonitorsXYDeg } from "./globals";

export const PointInRectBool = (
  x: number,
  y: number,
  rect: [number, number, number, number],
): boolean => {
  const [x0, y0, x1, y1] = rect;
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
};

/*
Returns true/false whether this screen coordinate is on this screen. 
(The answer is independent of eye.) The routine does not check whether 
this display is occluded by another display. The nearest display won’t be occluded.
*/
const PixelIsOnScreenBool = (
  x: number,
  y: number,
  screen: Screen_,
): boolean => {
  return PointInRectBool(x, y, [0, 0, screen.widthPx, screen.heightPx]);
};

/* 
Returns true/false whether this eccentricity is on this screen, for the given eye. 
The routine does not check whether this display is occluded by another display, 
but the nearest display won’t be occluded.
*/

export const EccentricityIsOnScreenBool = (
  x: number,
  y: number,
  screen: Screen_,
  eye: string,
): boolean => {
  screen.eye = eye;
  const [xPx, yPx] = PxOfDegXY(x, y, screen);
  return PixelIsOnScreenBool(xPx, yPx, screen);
};

//TEMP
const PxOfDegXY = (x: number, y: number, screen: Screen_): [number, number] => {
  return [0, 0];
};

const findIndexOfMinValue = (array: number[]): number => {
  return array.indexOf(Math.min(...array));
};

const computeDistance = (xyz1: number[], xyz2: number[]): number => {
  const diff = [xyz1[0] - xyz2[0], xyz1[1] - xyz2[1], xyz1[2] - xyz2[2]];
  return Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1] + diff[2] * diff[2]);
};

/*
For the specified eye, returns the index and distance of the nearest screen with pixels at that eccentricity. 
If no screen has pixels there, then it returns iScreen=-1 or undefined and distance=NaN or undefined.
xyDeg is a 2-vector, the object eccentricity.
screen is the full array of screen structs, one per monitor.
eye is either 0 (left) or 1 (right).
iScreen is an integer index into the screen array, or an illegal value (-1 or undefined) 
when no screen has pixels at that eccentricity.
distanceCm is the distance (cm) from eye to screen at that eccentricity.
 It’s NaN or undefined when no screen has pixels at that eccentricity.
*/

const whichScreen = (
  xyDeg: number[],
  screens: Screen_[],
  eye: string,
): { iScreen: number; distanceCm: number } => {
  const distanceCm = screens.map((s) => {
    s.eye = eye;
    const xyPx = PxOfDegXY(xyDeg[0], xyDeg[1], s);
    if (PixelIsOnScreenBool(xyPx[0], xyPx[1], s)) {
      const dist = computeDistance(s.eyeXYZPxLeft, xyPx) / s.pxPerCm;
      if (isNaN(dist)) return Infinity;
      return dist;
    } else {
      return Infinity;
    }
  });

  const iScreen = findIndexOfMinValue(distanceCm);
  if (isFinite(distanceCm[iScreen]))
    return { iScreen, distanceCm: distanceCm[iScreen] };
  return { iScreen: -1, distanceCm: NaN };
};

export const whichEyeAndScreen = (
  xyDeg: number[],
  screens: Screen_[],
): { eye: string; iScreen: number; distanceCm: number } => {
  const left = whichScreen(xyDeg, screens, "left");
  const right = whichScreen(xyDeg, screens, "right");
  if (isNaN(left.distanceCm) && isNaN(right.distanceCm)) {
    return { eye: "neither", iScreen: -1, distanceCm: NaN };
  }

  if (isNaN(left.distanceCm)) {
    return {
      eye: "right",
      iScreen: right.iScreen,
      distanceCm: right.distanceCm,
    };
  }

  if (isNaN(right.distanceCm)) {
    return { eye: "left", iScreen: left.iScreen, distanceCm: left.distanceCm };
  }

  if (left.distanceCm < right.distanceCm) {
    return { eye: "left", iScreen: left.iScreen, distanceCm: left.distanceCm };
  }

  return { eye: "right", iScreen: right.iScreen, distanceCm: right.distanceCm };
};

export const parseViewMonitorsXYDeg = (paramReader: any) => {
  const data = paramReader.read("viewMonitorsXYDeg");
  //example data: ['0,0;-60,0;60,0','0,0;-60,0;60,0']
  // example output: [[[0, 0], [-60, 0], [60, 0]], [[0, 0], [-60, 0], [60, 0]]]
  console.log(data);
  const parsed = data.map((val: string) => {
    return val.split(";").map((val: string) => {
      return val.split(",").map((val: string) => {
        return parseFloat(val);
      });
    });
  });

  console.log(parsed);
  if (parsed.length === 0) return 0;
  viewMonitorsXYDeg.values = parsed;
  viewMonitorsXYDeg.numberOfMonitorsForCurrentBlock = parsed[0].length;
  viewMonitorsXYDeg.maxNumberOfMonitors = parsed.reduce(
    (acc: number, val: number[]) => {
      return Math.max(acc, val.length);
    },
    0,
  );
  console.log("viewMonitorsXYDeg", viewMonitorsXYDeg);
};
