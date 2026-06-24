function tiltedFlickeringGabor(
  questSuggestedLevel,
  targetCharacter,
  XYPixOfXYDeg,
  XYDegOfXYPix,
  isRectInRect,
  movieRectDeg,
  movieRectPxContainsRectDegBool,
  screenRectPx,
  movieHz,
  movieSec,
  targetDelaySec,
  targetTimeConstantSec,
  targetHz,
  displayOptions,
  targetEccentricityXDeg,
  targetEccentricityYDeg,
  targetSpaceConstantDeg,
  targetCyclePerDeg,
  targetContrast,
  targetPhaseSpatialDeg,
  targetPhaseTemporalDeg,
) {
  movieRectDeg = movieRectDeg.split(",").map((element) => {
    return Number(element);
  });
  switch (targetCharacter) {
    case "H":
      targetOrientationDeg = 90;
      break;
    case "V":
      targetOrientationDeg = 0;
      break;
    case "L":
      targetOrientationDeg = -45;
      break;
    case "R":
      targetOrientationDeg = 45;
      break;
  }
  console.log("targetOrientationDeg", targetOrientationDeg);
  targetContrast = Math.pow(10, questSuggestedLevel);
  if (targetContrast > 1) {
    targetContrast = 1;
  }
  let actualStimulusLevel = Math.log10(targetContrast);
  function ClipRect(a, b) {
    const RectTop = 3;
    const RectBottom = 1;
    const RectLeft = 0;
    const RectRight = 2;
    var newRect = a;
    newRect[RectTop] = Math.max(a[RectTop], b[RectTop]);
    newRect[RectBottom] = Math.min(a[RectBottom], b[RectBottom]);
    newRect[RectLeft] = Math.max(a[RectLeft], b[RectLeft]);
    newRect[RectRight] = Math.min(a[RectRight], b[RectRight]);
    if (newRect[0] > newRect[2] || newRect[1] > newRect[3]) newRect = [0, 0, 0];
    return newRect;
  }
  const xMidDeg = (movieRectDeg[0] + movieRectDeg[2]) / 2;
  const yMidDeg = (movieRectDeg[1] + movieRectDeg[3]) / 2;
  const topXYDeg = [xMidDeg, movieRectDeg[3]];
  const bottomXYDeg = [xMidDeg, movieRectDeg[1]];
  const leftXYDeg = [movieRectDeg[0], yMidDeg];
  const rightXYDeg = [movieRectDeg[2], yMidDeg];
  const topXYPx = XYPixOfXYDeg(topXYDeg, displayOptions);
  const bottomXYPx = XYPixOfXYDeg(bottomXYDeg, displayOptions);
  const leftXYPx = XYPixOfXYDeg(leftXYDeg, displayOptions);
  const rightXYPx = XYPixOfXYDeg(rightXYDeg, displayOptions);
  var movieRectPx;
  if (!movieRectPxContainsRectDegBool) {
    movieRectPx = [leftXYPx[0], bottomXYPx[1], rightXYPx[0], topXYPx[1]];
  } else {
    var lowerLeftXYDeg = movieRectDeg.slice(0, 2);
    var lowerRightXYDeg = [movieRectDeg[2], movieRectDeg[1]];
    var upperRightXYDeg = movieRectDeg.slice(2, 4);
    var upperLeftXYDeg = [movieRectDeg[0], movieRectDeg[3]];
    var lowerLeftXYPx = XYPixOfXYDeg(lowerLeftXYDeg, displayOptions);
    var lowerRightXYPx = XYPixOfXYDeg(lowerRightXYDeg, displayOptions);
    var upperRightXYPx = XYPixOfXYDeg(upperRightXYDeg, displayOptions);
    var upperLeftXYPx = XYPixOfXYDeg(upperLeftXYDeg, displayOptions);
    movieRectPx = [
      Math.min(lowerLeftXYPx[0], upperLeftXYPx[0], leftXYPx[0]),
      Math.min(lowerLeftXYPx[1], lowerRightXYPx[1], bottomXYPx[1]),
      Math.min(lowerRightXYPx[0], upperRightXYPx[0], rightXYPx[0]),
      Math.min(upperRightXYPx[1], upperLeftXYPx[1], topXYPx[1]),
    ];
  }
  if (!isRectInRect(movieRectPx, screenRectPx)) {
    movieRectPx = ClipRect(movieRectPx, screenRectPx);
    const xMidPx = (movieRectPx[0] + movieRectPx[2]) / 2;
    const yMidPx = (movieRectPx[1] + movieRectPx[3]) / 2;
    const topXYPx = [xMidPx, movieRectPx[3]];
    const bottomXYPx = [xMidPx, movieRectPx[1]];
    const leftXYPx = [movieRectPx[0], yMidPx];
    const rightXYPx = [movieRectPx[2], yMidPx];
    const topXYDeg = XYDegOfXYPix(topXYPx, displayOptions);
    const bottomXYDeg = XYDegOfXYPix(bottomXYPx, displayOptions);
    const leftXYDeg = XYDegOfXYPix(leftXYPx, displayOptions);
    const rightXYDeg = XYDegOfXYPix(rightXYPx, displayOptions);
    var movieRectActualDeg = [
      leftXYDeg[0],
      bottomXYDeg[1],
      rightXYDeg[0],
      topXYDeg[1],
    ];
  } else {
    var movieRectActualDeg = movieRectDeg;
  }
  const xCenterDeg = (movieRectActualDeg[0] + movieRectActualDeg[2]) / 2;
  const yCenterDeg = (movieRectActualDeg[1] + movieRectActualDeg[3]) / 2;
  const retinalCenterXYPx = XYPixOfXYDeg(
    [xCenterDeg, yCenterDeg],
    displayOptions,
  );
  const sinRot = Math.sin((targetOrientationDeg * Math.PI) / 180);
  const cosRot = Math.cos((targetOrientationDeg * Math.PI) / 180);
  var xPx = [];
  var yPx = [];
  for (let x = leftXYPx[0]; x <= rightXYPx[0]; x++) {
    xPx.push(x);
  }
  for (let y = bottomXYPx[1]; y <= topXYPx[1]; y++) {
    yPx.push(y);
  }
  const movieFrames = Math.max(1, Math.round(movieHz * movieSec));
  const movieDurationSec = movieFrames / movieHz;
  var tFrame = [];
  for (let t = 0; t < movieFrames; t++) {
    tFrame.push(t);
  }
  var xDeg = [];
  var yDeg = [];
  for (let i = 0; i < xPx.length; i++) {
    xDeg[i] = XYDegOfXYPix([xPx[i], retinalCenterXYPx[1]], displayOptions)[0];
  }
  for (let i = 0; i < yPx.length; i++) {
    yDeg[i] = XYDegOfXYPix([retinalCenterXYPx[0], yPx[i]], displayOptions)[1];
  }
  var tSec = [];
  for (let i = 0; i < tFrame.length; i++) {
    tSec[i] = tFrame[i] / movieHz;
  }
  var xxDeg = [];
  var yyDeg = [];
  for (let i = 0; i < xDeg.length; i++) {
    xxDeg[i] = xDeg[i] - targetEccentricityXDeg;
  }
  for (let i = 0; i < yDeg.length; i++) {
    yyDeg[i] = yDeg[i] - targetEccentricityYDeg;
  }
  var ttSec = [];
  for (let i = 0; i < tSec.length; i++) {
    ttSec[i] = tSec[i] - movieDurationSec / 2;
  }

  var imageNit = new Array(xDeg.length)
    .fill(0)
    .map(() =>
      new Array(yDeg.length).fill(0).map(() => new Array(movieFrames).fill(0)),
    );
  var gx = [];
  for (let xx of xxDeg) {
    gx.push(Math.exp(-1 * (xx / targetSpaceConstantDeg) ** 2));
  }
  var gy = [];
  for (let yy of yyDeg) {
    gy.push(Math.exp(-1 * (yy / targetSpaceConstantDeg) ** 2));
  }
  var gt = [];
  for (let tt of ttSec) {
    gt.push(Math.exp(-1 * (tt / targetTimeConstantSec) ** 2));
  }
  for (let k = 0; k < movieFrames; k++) {
    let ft =
      gt[k] *
      Math.sin(
        2 * Math.PI * (ttSec[k] * targetHz + targetPhaseTemporalDeg / 360),
      );
    for (let j = 0; j < yDeg.length; j++) {
      for (let i = 0; i < xDeg.length; i++) {
        let xxPrimeDeg = xxDeg[i] * cosRot + yyDeg[j] * sinRot;
        let fxy = Math.sin(
          2 *
            Math.PI *
            (xxPrimeDeg * targetCyclePerDeg + targetPhaseSpatialDeg / 360),
        );
        imageNit[i][j][k] =
          (65535 / 2) * (1 + targetContrast * ft * gy[j] * gx[i] * fxy);
      }
    }
  }
  /*console.log("imageNit initializing");
    var imageNit = new Array(10).fill(0).map(() => new Array(10).fill(0).map(() => new Array(1).fill(0)));
    for(let k = 0; k < 1; k++){
        for(let j = 0; j < 10; j++){
            for(let i=0; i < 10; i++){
                imageNit[i][j][k] = 65535 / 2;
            }
        }
    }*/

  return [imageNit, actualStimulusLevel];
}
