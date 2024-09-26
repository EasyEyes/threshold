export interface Screen_ {
  name: string; // name of the screen. There will be one screen for each monitor in the experiment. "Main" is the default screen.
  usePsychoJSBool: boolean; // declares whether this display is drawn on by PsychoJS (as usual in EasyEyes before now), or is unknown to PsychoJS and must be drawn to independent of PsychoJS.
  pxPerCm: number; // is computed as the ratio widthPx/widthCm at the beginning of every block. For best precision, use whichever is larger, width or height.
  Hz: number; //  is the frame rate. This may be undefined in variable rate displays.
  eyeXYZPxLeft: number[]; // is a 3-vector specifying the position of the center of the left eye’s pupil in screen coordinates. x,y is the point in the screen plane closest to the eye. z is the distance from that point to the eye, extending the pixel grid into space, orthogonal to the screen plane. We track the pupil position using Google FaceMesh, so it changes at 60 Hz.
  eyeXYZPxRight: number[]; // is like eyeXYZPxLeft, but for the right eye.
  fixationXYZPx: number[]; // for fixation, similar to left eye. When we use a moving fixation cross this vector will change from frame to frame.
  nearestPointXYZPx: number[];
  nearestPointXYZDeg: number[];
  eye: string; // is either “left” or “right” and is used to specify which eye’s position is being used for the current trial. In calculating the viewing geometry, we continue the old practice of considering only the eye nearer to the display.
  viewingDistanceCm: number; //  is the distance of the nearer eye from the screen plane. distanceCm =* eyeXYZPx[eye][2] / pxPerCm
  rc: any; // remote calibrator instance for this screen
  window: any; // window object for this screen
  isWindowMaximized: boolean;
  measurements: {
    screenName: string;
    widthCm: number;
    heightCm: number;
    leftMarginCm: number;
    rightMarginCm: number;
    topMarginCm: number;
    bottomMarginCm: number;
    widthPx: number; // web-queried by EasyEyes at the beginning of every block. It is a relatively fixed property of a display, but it changes if the participant changes the display’s resolution
    heightPx: number; // is like widthPx, but for the height of the display
  };
  measurementContainer: any;
  fixationConfig: {
    nominalPos: any; // Nominal, scientist specified position. Only used as a reference point when gyrating fixation.
    pos: any; // Actual, current position XY in psychoJS `pix` units. In general, the only location value one should use.
    offset: any; // Random starting offset
    show: boolean;
    strokeLength: number; // aka fixationStrokeLengthPx
    strokeWidth: number; // aka fixationStrokeThicknessPx
    color: any;
    markingBlankedNearTargetBool: any;
    markingBlankingPos: any;
    markingBlankingRadiusReEccentricity: any;
    markingBlankingRadiusReTargetHeight: any;
    markingFixationHotSpotRadiusDeg: any;
    markingFixationHotSpotRadiusPx: any;
    markingFixationMotionRadiusDeg: any;
    markingFixationMotionPeriodSec: any;
    markingFixationStrokeLengthDeg: any;
    markingFixationStrokeThicknessDeg: any;
    markingFixationStrokeThickening: any;
    markingOffsetBeforeTargetOnsetSecs: any;
    markingOnsetAfterTargetOffsetSecs: any;
    markingFixationMotionSpeedDegPerSec: any;
    stim: any; // EasyEyes Fixation object

    trackingTimeAfterDelay: any;
    preserveOffset: boolean; // If rerunning prestimulus function
    // due to change in viewing distance,
    // use the pre-existing fixation offset
    // (ie starting position), so it doesn't
    // look like it's jumping around when
    // viewing distance changes.
  };
}

// Screens[0] is the main screen
export const Screens: Screen_[] = [
  {
    name: "Main",
    usePsychoJSBool: true,
    pxPerCm: 0,
    Hz: 0,
    eyeXYZPxLeft: [0, 0, 0],
    eyeXYZPxRight: [0, 0, 0],
    fixationXYZPx: [0, 0, 0],
    eye: "Main",
    viewingDistanceCm: 0,
    nearestPointXYZPx: [0, 0],
    nearestPointXYZDeg: [0, 0],
    rc: null, // Currently imported from HTML script tag
    window: window,
    isWindowMaximized: true,
    measurements: {
      screenName: "",
      widthCm: 0,
      heightCm: 0,
      leftMarginCm: 0,
      rightMarginCm: 0,
      topMarginCm: 0,
      bottomMarginCm: 0,
      widthPx: window.innerWidth,
      heightPx: window.innerHeight,
    },
    measurementContainer: null,
    fixationConfig: {
      nominalPos: [0, 0], // Nominal, scientist specified position. Only used as a reference point when gyrating fixation.
      pos: [0, 0], // Actual, current position XY in psychoJS `pix` units. In general, the only location value one should use.
      offset: undefined, // Random starting offset
      show: true,
      strokeLength: 45, // aka fixationStrokeLengthPx
      strokeWidth: 2, // aka fixationStrokeThicknessPx
      color: undefined,
      markingBlankedNearTargetBool: undefined,
      markingBlankingPos: undefined,
      markingBlankingRadiusReEccentricity: undefined,
      markingBlankingRadiusReTargetHeight: undefined,
      markingFixationHotSpotRadiusDeg: undefined,
      markingFixationHotSpotRadiusPx: undefined,
      markingFixationMotionRadiusDeg: undefined,
      markingFixationMotionPeriodSec: undefined,
      markingFixationStrokeLengthDeg: undefined,
      markingFixationStrokeThicknessDeg: undefined,
      markingFixationStrokeThickening: undefined,
      markingOffsetBeforeTargetOnsetSecs: undefined,
      markingOnsetAfterTargetOffsetSecs: undefined,
      markingFixationMotionSpeedDegPerSec: undefined,
      stim: undefined, // EasyEyes Fixation object

      trackingTimeAfterDelay: undefined,
      preserveOffset: false, // If rerunning prestimulus function
      // due to change in viewing distance,
      // use the pre-existing fixation offset
      // (ie starting position), so it doesn't
      // look like it's jumping around when
      // viewing distance changes.
    },
  },
];

export const viewMonitorsXYDeg = {
  values: [], // 3D array of eccentricities in degrees. Each block has a different set of eccentricities.
  //example: values = [[[0, 0], [0, 5], [0, 10]], [[0, 0], [0, 5], [0, 10]]] means that the first block has 3 eccentricities and the second block has 3 eccentricities.
  numberOfMonitorsForCurrentBlock: 0, // number of monitors (length of values)
  maxNumberOfMonitors: 0, // maximum number of monitors in any block
  currentBlockIndex: 0, // index of the current block
};
