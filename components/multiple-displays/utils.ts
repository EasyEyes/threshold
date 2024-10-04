import { viewingDistanceCm } from "../global";
import { Screen_, Screens, viewMonitorsXYDeg } from "./globals";

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
  return PointInRectBool(x, y, [
    0,
    0,
    screen.measurements.widthPx,
    screen.measurements.heightPx,
  ]);
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

const isSinglePoint = (l: number | number[] | number[][]): boolean =>
  Array.isArray(l) &&
  l.length === 2 &&
  typeof l[0] === "number" &&
  typeof l[1] === "number";

const isMultiplePoints = (l: number[] | number[][]): boolean =>
  Array.isArray(l) &&
  Array.isArray(l[0]) &&
  (l as number[][]).every((point: number | number[]) => isSinglePoint(point));

const DeltaXYDegOfPx = (iScreen: number, deltaXYPx: number[]) => {
  // Denis Pelli, September 21, 2024
  // Complete set is  XYPxOfDeg, XYDegOfPx, DeltaXYPxOfDeg, and DeltaXYDegOfPx

  // To support multiple displays, we use a global struct array called "screen".
  // When we have only one display, the array has only one element. The screen
  // array is indexed by the argument iScreen, which is an integer in the range 0
  // to screen.length-1.
  // screen[iScreen}] has (at least) two fields:
  // screen[iScreen}].pxPerCm
  // screen[iScreen}].viewingDistanceCm

  /* The screen plane is the infinite plane in which the screen is embedded. Any
  point in the screen plane has a corresponding visual coordinate. So any finite
  xyPx will yield a finite xyDeg. The reverse is not true. */

  const rPx = Math.sqrt(
    deltaXYPx[0] * deltaXYPx[0] + deltaXYPx[1] * deltaXYPx[1],
  );
  if (rPx == 0) {
    return [0, 0];
  }
  const rRad = Math.atan2(
    rPx / Screens[iScreen].pxPerCm,
    Screens[iScreen].viewingDistanceCm,
  );
  const rDeg = rRad * (180 / Math.PI);
  // Scale px vector to be deg vector.
  return [(deltaXYPx[0] * rDeg) / rPx, (deltaXYPx[1] * rDeg) / rPx];
};

const DeltaXYPxOfDeg = (iScreen: number, deltaXYDeg: number[]): number[] => {
  // Denis Pelli, September 21, 2024
  // Complete set is  XYPxOfDeg, XYDegOfPx, DeltaXYPxOfDeg, and DeltaXYDegOfPx

  // To support multiple displays, we use a global struct array called "screen".
  // When we have only one display, the array has only one element.
  // The screen array is indexed by the argument iScreen,
  // which is an integer in the range 0 to screen.length-1.
  // screen[iScreen}] has (at least) two fields:
  // screen[iScreen}].pxPerCm
  // screen[iScreen}].viewingDistanceCm

  /* DeltaXYPxOfDeg RETURNS [NaN,NaN] FOR ANY VISUAL POINT THAT IS NOT IN THE SCREEN
  PLANE. The screen plane is the infinite plane in which the monitor screen is
  embedded. Any point in the screen plane has a corresponding visual coordinate,
  but a visual coordinates may have no corresponding point in the screen plane. In
  that case DeltaXYPxOfDeg returns xyPx=[NaN,NaN].
  */

  // iScreen in an index into the global "screen" array struct.
  // deltaXYDeg is a 2-vector (x,y)
  const s = Screens[iScreen];
  // Compute the Euclidean length
  const rDeg = Math.sqrt(
    deltaXYDeg[0] * deltaXYDeg[0] + deltaXYDeg[1] * deltaXYDeg[1],
  );
  if (rDeg >= 90) {
    const rCompensation = 89.99999999 / rDeg;
    return DeltaXYPxOfDeg(iScreen, [
      deltaXYDeg[0] * rCompensation,
      deltaXYDeg[1] * rCompensation,
    ]);
    // return [NaN, NaN];
  } // Not in screen plane.
  // Convert deg to px.
  const rPx =
    s.pxPerCm * s.viewingDistanceCm * Math.tan((rDeg * Math.PI) / 180);
  if (rDeg == 0) {
    return [0, 0];
  }
  // Scale deg vector to be px vector.
  const deltaXYPx = [
    (deltaXYDeg[0] * rPx) / rDeg,
    (deltaXYDeg[1] * rPx) / rDeg,
  ];
  return deltaXYPx;
};

export const XYDegOfPx = (
  iScreen: number,
  xyPx: number[][] | number[],
  useRealFixationXY = true,
) => {
  // Denis Pelli, September 21, 2024
  // Complete set is XYPxOfDeg, XYDegOfPx, DeltaXYPxOfDeg, and DeltaXYDegOfPx.

  /* To support multiple displays, we use a global struct array called
	"screen". When we have only one display, the array has only one element.
	The screen array is indexed by the argument iScreen, which is an integer
	in the range 0 to screen.length-1. 
	s=screen[iScreen}] has (at least) four fields:
	s.nearestPointXYPx // 2-vector
	s.fixationXYPx // 2-vector
	s.pxPerCm
	s.viewin gDistanceCm
	*/

  /* The screen plane is the infinite plane in which the screen is embedded.
	Any point in the screen plane has a corresponding visual coordinate. So any
	finite xyPx will yield a finite xyDeg. The reverse is not true. */

  // iScreen must be integer in range 0 ... screen.length-1.
  // "screen" struct for the monitor with index iScreen.
  const s = Screens[iScreen];
  const requiredFields = [
    "nearestPointXYZPx",
    "fixationXYZPx",
    "pxPerCm",
    "viewingDistanceCm",
  ];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (
      !s.hasOwnProperty(field) ||
      s[field as keyof Screen_] === undefined ||
      s[field as keyof Screen_] === null
    ) {
      throw new Error(`XYDegOfPx: First set screen[iScreen].${field}.`);
    }
  }
  // if (xyPx.length !== 2) {
  // 	throw new Error('XYDegOfPx: xyPx argument must have length 2.');
  // }
  const fixationXYPx = useRealFixationXY
    ? s.fixationConfig.pos
    : s.fixationConfig.nominalPos;

  if (s.nearestPointXYZPx.length !== 2) {
    throw new Error(
      "XYDegOfPx: screen[iScreen].nearestPointXYPx must have length 3.",
    );
  }
  if (fixationXYPx.length !== 2) {
    throw new Error(
      "XYDegOfPx: screen[iScreen].fixationXYPx must have length 3.",
    );
  }
  if (!isSinglePoint(xyPx) && !isMultiplePoints(xyPx)) {
    throw new Error(
      "XYDegOfPx: xyPx argument must be a 2-vector or a list of 2-vectors.",
    );
  }

  s.viewingDistanceCm = viewingDistanceCm.current;
  // Compute local nearestPointXYDeg for current fixation and nearest point.
  const deltaFixationXYPx = [
    fixationXYPx[0] - s.nearestPointXYZPx[0],
    fixationXYPx[1] - s.nearestPointXYZPx[1],
  ];
  const deltaFixationXYDeg = DeltaXYDegOfPx(iScreen, deltaFixationXYPx);
  const nearestPointXYDeg = [-deltaFixationXYDeg[0], -deltaFixationXYDeg[1]];

  const getXY = (point: number[]) => {
    const deltaXYPx = [
      point[0] - s.nearestPointXYZPx[0],
      point[1] - s.nearestPointXYZPx[1],
    ];
    const deltaXYDeg = DeltaXYDegOfPx(iScreen, deltaXYPx);
    return [
      deltaXYDeg[0] + nearestPointXYDeg[0],
      deltaXYDeg[1] + nearestPointXYDeg[1],
    ];
  };

  if (isSinglePoint(xyPx)) {
    return getXY(xyPx as number[]);
  }

  const xyDeg = [];
  const points = xyPx as number[][];
  for (let i = 0; i < xyPx.length; i++) {
    xyDeg.push(getXY(points[i]));
  }
  return xyDeg;
};

export const XYPxOfDeg = (
  iScreen: number,
  xyDeg: number[][] | number[],
  useRealFixationXY = true,
) => {
  // Denis Pelli, September 21, 2024
  // Complete set is XYPxOfDeg, XYDegOfPx, DeltaXYPxOfDeg, and DeltaXYDegOfPx.

  // To support multiple displays, we use a global struct array called "screen".
  // When we have only one display, the array has only one element.
  // The "screen' array is indexed by the argument iScreen,
  // which is an integer in the range 0 to screen.length-1.
  // s=screen[iScreen}] has (at least) four fields:
  // s.nearestPointXYPx // 2-vector
  // s.fixationXYPx // 2-vector
  // s.pxPerCm
  // s.viewingDistanceCm

  /* XYPxOfDeg RETURNS [NaN,NaN] FOR ANY VISUAL POINT THAT IS NOT IN THE SCREEN
  PLANE. The screen plane is the infinite plane in which the monitor screen is
  embedded. Any point in the screen plane has a corresponding visual coordinate,
  but a visual coordinates may have no corresponding point in the screen plane. In
  that case XYPxOfDeg returns xyPx=[NaN,NaN].
  */

  // iScreen must be integer in range 0 ... screen.length-1.
  // "screen" struct for the monitor with index iScreen.
  const s = Screens[iScreen];
  const requiredFields = [
    "nearestPointXYZPx",
    "fixationXYZPx",
    "pxPerCm",
    "viewingDistanceCm",
  ];
  // for (let i = 0; i < requiredFields.length; i++) {
  //   const field = requiredFields[i];
  //   if (!s.hasOwnProperty(field) || s[field as keyof Screen_] === undefined || s[field as keyof Screen_] === null) {
  //     throw new Error(`XYPxOfDeg: First set screen[iScreen].${field}.`);
  //   }
  // }
  // if (xyDeg.length !== 2) {
  // 	throw new Error('XYPxOfDeg: xyDeg argument must have length 2.');
  // }
  const fixationXYPx = useRealFixationXY
    ? s.fixationConfig.pos
    : s.fixationConfig.nominalPos;
  if (s.nearestPointXYZPx.length !== 2) {
    throw new Error(
      "XYPxOfDeg: screen[iScreen].nearestPointXYPx must have length 2.",
    );
  }
  if (fixationXYPx.length !== 2) {
    throw new Error(
      "XYPxOfDeg: screen[iScreen].fixationXYPx must have length 2.",
    );
  }

  if (!isSinglePoint(xyDeg) && !isMultiplePoints(xyDeg)) {
    throw new Error(
      "XYPxOfDeg: xyDeg argument must be a 2-vector or a list of 2-vectors.",
    );
  }

  s.viewingDistanceCm = viewingDistanceCm.current;
  // Compute local nearestPointXYDeg for current fixation and nearest point.
  const deltaFixationXYPx = [
    fixationXYPx[0] - s.nearestPointXYZPx[0],
    fixationXYPx[1] - s.nearestPointXYZPx[1],
  ];
  const deltaFixationXYDeg = DeltaXYDegOfPx(iScreen, deltaFixationXYPx);
  const nearestPointXYDeg = [-deltaFixationXYDeg[0], -deltaFixationXYDeg[1]];

  const getXY = (point: number[]) => {
    const deltaXYDeg = [
      point[0] - nearestPointXYDeg[0],
      point[1] - nearestPointXYDeg[1],
    ];
    const deltaXYPx = DeltaXYPxOfDeg(iScreen, deltaXYDeg);
    const xyPx = [
      deltaXYPx[0] + s.nearestPointXYZPx[0],
      deltaXYPx[1] + s.nearestPointXYZPx[1],
    ];
    return xyPx;
  };

  if (isSinglePoint(xyDeg)) {
    return getXY(xyDeg as number[]);
  }

  const xyPx = [];
  const points = xyDeg as number[][];
  for (let i = 0; i < xyDeg.length; i++) {
    xyPx.push(getXY(points[i]));
  }

  return xyPx;
};
