export interface Screen_ {
  name: string; // name of the screen. There will be one screen for each monitor in the experiment. "Main" is the default screen.
  usePsychoJSBool: boolean; // declares whether this display is drawn on by PsychoJS (as usual in EasyEyes before now), or is unknown to PsychoJS and must be drawn to independent of PsychoJS.
  widthPx: number; // web-queried by EasyEyes at the beginning of every block. It is a relatively fixed property of a display, but it changes if the participant changes the display’s resolution
  heightPx: number; // is like widthPx, but for the height of the display
  widthCm: number; // is quite stable, even if the screen resolution is changed, but cannot be queried by a web app (e.g. EasyEyes), so we measure it once at the beginning of the experiment using the credit card method from the Li et al. (2021) “virtual chinrest” methods.
  heightCm: number; // is like widthCm, but for the height of the display
  pxPerCm: number; // is computed as the ratio widthPx/widthCm at the beginning of every block. For best precision, use whichever is larger, width or height.
  Hz: number; //  is the frame rate. This may be undefined in variable rate displays.
  eyeXYZPxLeft: number[]; // is a 3-vector specifying the position of the center of the left eye’s pupil in screen coordinates. x,y is the point in the screen plane closest to the eye. z is the distance from that point to the eye, extending the pixel grid into space, orthogonal to the screen plane. We track the pupil position using Google FaceMesh, so it changes at 60 Hz.
  eyeXYZPxRight: number[]; // is like eyeXYZPxLeft, but for the right eye.
  fixationXYZPx: number[]; // for fixation, similar to left eye. When we use a moving fixation cross this vector will change from frame to frame.
  eye: string; // is either “left” or “right” and is used to specify which eye’s position is being used for the current trial. In calculating the viewing geometry, we continue the old practice of considering only the eye nearer to the display.
  distanceCm: number; //  is the distance of the nearer eye from the screen plane. distanceCm =* eyeXYZPx[eye][2] / pxPerCm
  rc: any; // remote calibrator instance for this screen
  window: any; // window object for this screen
  isWindowMaximized: boolean;
  measurements: {
    screenName: string;
    width: number;
    height: number;
    leftMargin: number;
    rightMargin: number;
    topMargin: number;
    bottomMargin: number;
  };
  measurementContainer: any;
}

export const Screens: Screen_[] = [];

export const viewMonitorsXYDeg = {
  values: [], // 3D array of eccentricities in degrees. Each block has a different set of eccentricities.
  //example: values = [[[0, 0], [0, 5], [0, 10]], [[0, 0], [0, 5], [0, 10]]] means that the first block has 3 eccentricities and the second block has 3 eccentricities.
  numberOfMonitorsForCurrentBlock: 0, // number of monitors (length of values)
  maxNumberOfMonitors: 0, // maximum number of monitors in any block
  currentBlockIndex: 0, // index of the current block
};
