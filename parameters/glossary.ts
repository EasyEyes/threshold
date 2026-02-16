/*
  Do not modify this file! Run npm `npm run glossary` at ROOT of this project to fetch from the Google Sheets.
  https://docs.google.com/spreadsheets/d/1x65NjykMm-XUOz98Eu_oo6ON2xspm_h0Q0M2u6UGtug/edit#gid=1287694458 
*/

interface Glossary {
  [parameter: string]: { [field: string]: string | string[] };
}

export const GLOSSARY: Glossary = {
  _about: {
    name: "_about",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "_about (no default) is an optional, brief description of the whole experiment. Ignored by EasyEyes, but saved with results. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
  },
  _authorAffiliations: {
    name: "_authorAffiliations",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "_authorAffiliations (no default) is optional, semicolon-separated list, specifying the name of the affiliated institution for each author. ",
  },
  _authorEmails: {
    name: "_authorEmails",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "_authorEmails (no default) is optional, semicolon-separated email addresses of the authors.  The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on. ",
  },
  _authors: {
    name: "_authors",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "_author (no default) is optional, the names of all the authors, separated by semicolons. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
  },
  _calibrateDistance: {
    name: "_calibrateDistance",
    availability: "now",
    type: "multicategorical",
    default: "object",
    explanation:
      '⭑ _calibrateDistance (default object) selects one or more of several methods for initial distance calibration. If any condition sets calibrateDistance to any method(s), then the calibration(s) occurs only once, by the selected method(s), before the first trial of first block. If more than one method is selected, EasyEyes does them serially and then takes the median. After the initial calibration, by any combination of methods, EasyEyes automatically uses the webcam and Google FaceMesh to track viewing distance for the rest of experiment.\n\nFor the initial calibration, the choices are "blindspot", "object", "creditCard", "justCreditCard", and "typical". You can specify any combination from none to all. They specify how to do the initial calibration, after which distance is continuously tracked by Google FaceMesh. For the initial calibration, selecting:\n• "blindspot" uses the Li et al. (2021) "virtual chinrest" method of mapping the blind spot to estimate viewing distance. \n• "object" measures the length of any handy object whose length may greatly exceed the screen width, and the participant then uses that object to set an iniitial viewing distance for calibration of Google FaceMesh.\n• "creditCard" is a streamlined version of the object method, using a credit card (8.56 cm wide) as the object. This size for credit cards and drivers licenses is specified by international standard ISO/IEC 7810 ID-1.\n• "justCreditCard" uses the long side of credit card as the known distance, and the the short side the known length (size) to measure (fVpx / horizontalVpx).\n• "autoCreditCard" Gedion\'s draft method to automatically detect the credit card.\n• "typical" uses the the mode ipdCm=6.3 across the US adult population, the mode fRatio = (fVpx / horizontalVpx)=?? across many computers, and the particular computer\'s horizontalVpx, to calculate \nfactorVpxCm = ipdCm * fRatio * horizontalVpx\n• "paper" offers radio buttons to allow selection among objects of known length, especially a US Letter (8.5x11 inch) and A4 (210 × 297 mm), plus common rulers. Type length in inches or cm.\n\nNOTE: Each condition must set calibrateDistanceBool=TRUE in order to use nudging to control viewing distance, as specified by viewingDistanceAllowedRatio. ',
    categories: [
      "object",
      "blindspot",
      "creditCard",
      "autoCreditCard",
      "justCreditCard",
      "typical",
      "paper",
    ],
  },
  _calibrateDistanceAllowedRangeCm: {
    name: "_calibrateDistanceAllowedRangeCm",
    availability: "now",
    type: "text",
    default: " 30, 70",
    explanation:
      "_calibrateDistanceAllowedRangeCm (default 30,70). Rejects unusualy hight and low measurements of viewing distance during calibration. Specifies the allowed range of viewing distance during the intial calibration. If the measured distance is outside this range, then the calibration must be redone. \nIf either test fails (_calibrateDistanceAllowedRatio or _calibrateDistanceAllowedRangeCm), then redo both measurements (left and right, or test and retest), from scratch.  \n\nWHEN ENTERING SEVERAL NUMBERS IN ONE CELL, WE STRONGLY SUGGEST BEGINNING WITH A SPACE, AND PUTTING A SPACE AFTER EVERY COMMA. THIS PREVENTS EXCEL FROM MISINTERPRETING THE STRING AS A SINGLE NUMBER, USING THE EUROPEAN INTERPRETATION OF THE COMMA AS A DECIMAL POINT.",
  },
  _calibrateDistanceAllowedRatio: {
    name: "_calibrateDistanceAllowedRatio",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateDistanceAllowedRatioFOverWidth instead.",
  },
  _calibrateDistanceAllowedRatioCm: {
    name: "_calibrateDistanceAllowedRatioCm",
    availability: "now",
    type: "numerical",
    default: "1.05",
    explanation:
      "_calibrateDistanceAllowedRatioCm (default 1.05) rejects bad estimates of object length (cm) during calibration, by specifying the tolerance between two successive estimates. \nAccept the first cm length estimate. Starting with the second estimate, compare the current (M2) with the previous (M1), and reject both if their ratio is too far from 1:\nabs(log10(M1/M2)) > log10(_calibrateDistanceAllowedRatioCm)\nDisplay a pop up that reports the rejected ratio M1/M2, say “Try again”, and wait for OK. Reduce the page count appropriately. Keep measuring until we have a complete set.",
  },
  _calibrateDistanceAllowedRatioFOverWidth: {
    name: "_calibrateDistanceAllowedRatioFOverWidth",
    availability: "now",
    type: "numerical",
    default: "1.15",
    explanation:
      "_calibrateDistanceAllowedRatioFOverWidth (default 1.15) rejects bad measurements of fOverWidth during calibration (use object to set distance from eye to screen), by specifying the tolerance between two successive measurements. When calibrateDistance=blindspot, the measurements are left, then right eye. \nAccept the first fOverWidth estimate. Starting with the second estimate, compare the current (M2) with the previous (M1), and reject both if their ratio is too far from 1:\nabs(log10(M1/M2)) > log10(_calibrateDistanceAllowedRatioFOverWidth)\nDisplay a pop up that reports the rejected ratio M1/M2, say “Try again”, and wait for OK. Reduce the page count appropriately. Keep measuring until we have a complete set.",
  },
  _calibrateDistanceAllowedRatioHalfCm: {
    name: "_calibrateDistanceAllowedRatioHalfCm",
    availability: "now",
    type: "numerical",
    default: "1.07",
    explanation:
      "_calibrateDistanceAllowedRatioHalfCm (default 1.07), assuming participant is matching HALF object length, rejects bad estimates of object length (cm) during calibration, by specifying the tolerance between estimated and expected length. \nCompare the estimated with the expected lengths, and accept the estimate if\nabs(log10(estimate/expected)) > log10(_calibrateDistanceAllowedRatioHalfCm)\nIf rejected, display a pop up that reports the rejected ratio estimated/rejected, say “Try again”, and wait for OK. ",
  },
  _calibrateDistanceAllowedRatioLength: {
    name: "_calibrateDistanceAllowedRatioLength",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateDistanceAllowedRatioPxPerCm instead.",
  },
  _calibrateDistanceAllowedRatioObject: {
    name: "_calibrateDistanceAllowedRatioObject",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateDistanceAllowedRatioCm instead.",
  },
  _calibrateDistanceAllowedRatioPxPerCm: {
    name: "_calibrateDistanceAllowedRatioPxPerCm",
    availability: "now",
    type: "numerical",
    default: "1.05",
    explanation:
      "_calibrateDistanceAllowedRatioPxPerCm (default 1.05) rejects bad estimates of pxPerCm based on length production during calibration (adjust image to match credit card or ruler), by specifying the tolerance between two successive estimates of pxPerCm. \nAccept the first pxPerCm estimate. Starting with the second estimate, compare the current (M2) with the previous (M1), and reject both if their ratio is too far from 1:\nabs(log10(M1/M2)) > log10(_calibrateDistanceAllowedRatioPxPerCm)\nDisplay a pop up that reports the rejected ratio M1/M2, say “Try again”, and wait for OK. Reduce the page count appropriately. Keep measuring until we have a complete set.",
  },
  _calibrateDistanceBlindspotDiameterDeg: {
    name: "_calibrateDistanceBlindspotDiameterDeg",
    availability: "now",
    type: "numerical",
    default: "4",
    explanation:
      '_calibrateDistanceBlindspotDiameterDeg (default 3) specifies the width of the blinking red diamond used to map the blindspot. This is relevant only when\n_calibrateDistance===blindspot\n\nChatGPT says: "The blindspot extends roughly 5–7° horizontally and 7–9° vertically, so the exact “center” can shift a little between people. Most mapping studies converge on 14–16° temporal, 1–2° below horizontal as the standard."\n\nLi et al. (2020, "virtual chinrest") say, "The center of the blind spot is located at a relatively consistent angle of\nα = 15° horizontally\n(14.33° ± 1.3° in Wang et al. 22,\n15.5° ± 1.1° in Rohrschneider 23,\n15.48° ± 0.95° in Safran et al. 24,\nand 15.52° ± 0.57° in Ehinger et al. 25).',
  },
  _calibrateDistanceCameraHz: {
    name: "_calibrateDistanceCameraHz",
    availability: "now",
    type: "numerical",
    default: "15",
    explanation:
      "_calibrateDistanceCameraHz (default 15) specifies the ideal webcam frame rate for distance tracking. EasyEyes will set the resolution and frame rate as near as possible to what is requested by _calibrateDistanceCameraResolution and _calibrateDistanceCameraHz. See _calibrateDistanceCameraResolution for the joint optimization of spatial and temporal resolution. ChatGPT tells me that the available choices of spatial and temporal resolution interact strongly in available webcams.",
  },
  _calibrateDistanceCameraResolution: {
    name: "_calibrateDistanceCameraResolution",
    availability: "now",
    type: "text",
    default: "1920, 1080",
    explanation:
      "_calibrateDistanceCameraResolution (default \"1920,1080\") specifies the ideal webcam resolution for distance tracking. EasyEyes will set the resolution and frame rate as near as possible to what is requested by _calibrateDistanceCameraResolution and _calibrateDistanceCameraHz.  No error is thrown, no matter how bad the match is. There is a protocol for a web app to set the webcam resolution, but not all requests are granted. Each webcam typically supports a limited number of discrete resolutions and frame rates. Also, other apps (e.g. Zoom) may be running concurrently and exerting their own resolution and frame rate control.\n\nUntil today, based on general principles, I assumed that FaceMesh would locate the eyes more precisely with HIGHER webcam resolution. Previously our code was supposed to always deliver maximum webcam resolution, but by chance yesterday I got 640x480 in one session. I'm suprised to find, in those measurements, that the low camera resolution gave more accurate distance measurements, and preserved accuracy better across the range of distances (11 to 28 inches). Implementing _calibrateDistanceCameraResolution and _calibrateDistanceCameraHz will allow me to do more tests and discover what resolution and frame rate is best.\n\nTo find the available resolution and frame rate closest to that requested, we need a cost function:\nThe cost of any given webcam resolution tryX, tryY, and frame rate tryHz is\n\ncost = log10(tryX/desiredX)**2 + log10(tryY/desiredY)**2 + log10(tryHz/desiredHz)**2 + unavailabilityTax(tryX,tryY)\n\nwhere [desiredX, desiredY] is the value provided by _calibrateDistanceCameraResolution, desiredHz is provided by _calibrateDistanceCameraHz, and the unavailabilityTax=0 if tryX, tryY, tryHz is available and =100 if unavailable.\nEasyEyes must explore values of tryX, tryY, tryHz to minimize the cost. Our cost function is not smooth, with many local minima, so I don't know if any of the available minimizing routines will be helpful.",
  },
  _calibrateDistanceCameraToBlueLineCm: {
    name: "_calibrateDistanceCameraToBlueLineCm",
    availability: "now",
    type: "numerical",
    default: "2",
    explanation:
      "_calibrateDistanceCameraToBlueLineCm (default 2)  is for _calibrateDistance === justCreditCard.  It specifies the downward offset from camera to horizontal blue line that indicates where to place the credit card edge on the screen below the camera. It's a horizontal dashed blue line with the same length as the short side of a credit card.",
  },
  _calibrateDistanceCameraToCardCm: {
    name: "_calibrateDistanceCameraToCardCm",
    availability: "now",
    type: "numerical",
    default: "2",
    explanation:
      "_calibrateDistanceCameraToCardCm (default 2) is for _calibrateTrackDistance=justCreditCard. It specifies the vertical offset from camera to credit card edge on the screen below the camera. That is marked by a horizontal dashed blue line with the length of the short side of a credit card.",
  },
  _calibrateDistanceCardTopVideoFraction: {
    name: "_calibrateDistanceCardTopVideoFraction",
    availability: "now",
    type: "numerical",
    default: "0.75",
    explanation:
      "_calibrateDistanceCardTopVideoFraction (default 0.75) is for _calibrateTrackDistance=justCreditCard. It specifies the initial height of the green line (corresponding to the top of the credit card image) in the webcam video, as a fraction of the video height. The participant has two ways to adjust the green line. Using ◀▶adjusts the green line width, without affecting height. Dragging the ends of the green line may change its height.",
  },
  _calibrateDistanceCenterYourEyesBool: {
    name: "_calibrateDistanceCenterYourEyesBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_calibrateDistanceCenterYourEyesBool (default FALSE) determines whether we ask the participant to tilt and swivel the screen to center their eyes in the video.",
  },
  _calibrateDistanceCheckBool: {
    name: "_calibrateDistanceCheckBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      'Set _calibrateDistanceCheckBool TRUE (default FALSE), to request checking of the distance calibration by the participant, who must have a tape measure or measuring stick. After the distance calibration, if _calibrationDistanceCheckBool is TRUE, then we ask the participant if they have an appropriate measuring device (ideally a tape measure, meter stick, or yard stick), and, if so, how long is it, and what are its units: cm or inches. If no ruler or tape measure, then we skip the check. IOur instructions say, "Use your ruler, stick, or tape to produce" several exact viewing distances (selected by _calibrateDistance) that we measure with the webcam. ',
  },
  _calibrateDistanceCheckCm: {
    name: "_calibrateDistanceCheckCm",
    availability: "now",
    type: "text",
    default: " 30, 35, 40, 45, 50",
    explanation:
      "_calibrateDistanceCheckCm (default 30, 35, 40, 45, 50) is a comma-separated list of viewing distances (in cm) that the participant will be asked to produce if _calibrateDistanceCheckBool=TRUE. The participant must have a measuring tape or stick. Each request will be rounded to an integer length in their chosen units: cm or inches. Will skip requests that exceed the length of the participant's measuring tape/stick.\n\n30 cm (about 12 inches) is about as close as the face can be to the screen center and still allow the camera to capture the face geometry.\n\n⚠️ A few participants (5%) repeatedly press the SPACE bar to get through this, producing equal lengths and ruining this check. To prevent this noncompliance, EasyEyes checks each pair of settings. If the two requested lengths differ by less than 20%, skip this numerical check. If the requests differ by at least 20% and the settings differ by less than 10% then EasyEyes rejects all the length settings so far by this participant, and invites them to start again with the first setting.\n\n⚠️  WHEN ENTERING SEVERAL NUMBERS IN ONE CELL, WE STRONGLY SUGGEST BEGINNING WITH A SPACE, AND PUTTING A SPACE AFTER EVERY COMMA. THIS PREVENTS EXCEL FROM MISINTERPRETING THE STRING AS A SINGLE NUMBER, USING THE EUROPEAN INTERPRETATION OF THE COMMA AS A DECIMAL POINT.",
  },
  _calibrateDistanceChecking: {
    name: "_calibrateDistanceChecking",
    availability: "now",
    type: "multicategorical",
    default: "camera",
    explanation:
      "_calibrateDistanceChecking (default \"camera\"). Multicategorical. \n• If “tiltAndSwivel” is present, then the participant is asked to tilt and swivel the screen to center their eyes around the red cross in the video during calibration and any calibration check. This option affects only the text displayed to the participant. It doesn’t affect any calculation. This helps us check the trigonometric calculations that account for the projected locations of the eyes, because that code has hardly any effect when the projected location of the eye is near the camera.\n• Either “camera” or “center” can be present, indicating from where in the screen plane the participant measures viewing distance during the calibration check. Default is “center”. It is an error to request both camera and center.  This affects three things:\n1. It affects the calibration and production instructions given to the participant, who is asked to measure viewing distance from screen center or the camera. Among the international phrases, use a version with TiltAndSwivel if and only if calibrateDistanceChecking includes “tiltAndSwivel”. Use a version with “Camera”  if and only if calibrateDistanceChecking includes “camera”.\n2. It affects the location of the video. While the participant produces distances, \n• If _calibrateDistanceChecking includes “center” then the video should be centered in the screen. \n• If _calibrateDistanceChecking includes “camera” then the video should be as close as possible to cameraXYPx, which will typically place the video at top center of the screen.\n3. The only effect of _calibrateDistanceChecking on the calculations is:\nif (includes(_calibrateDistanceChecking,'camera')){\n  measuredDistanceCm = eyeToCameraCm;\n};\nif (includes(_calibrateDistanceChecking,'center')){\n  measuredDistanceCm = eyeToCenterCm;\n};",
    categories: ["tiltAndSwivel", "camera", "center"],
  },
  _calibrateDistanceCheckLengthCm: {
    name: "_calibrateDistanceCheckLengthCm",
    availability: "now",
    type: "text",
    default: " +10, 15, 25",
    explanation:
      '_calibrateDistanceCheckLengthCm (default +10, 15, 25) is a comma-separated list of tape lengths (in cm) that the participant will be asked to produce (in an on-screen tape) if _calibrateDistanceCheckBool=TRUE. Each request will be rounded to an integer length in their chosen units: cm or inches. Also, all the requests will be scaled down, if necessary, so that the largest does not exceed the screen width and the length of the participant\'s ruler/tape.\n\n1. For pxPerCm, compute the ratio\nr = median(calibration) / median(check)\n2. If the participant selected "inches" and\nabs (log10(r/2.54)) < log10(1.2)\nthen display a pop up saying RC_screenSizeNotInches, with an OK button.\nWhen they click OK or press RETURN, take them back to the page where they select inches vs cm.\n3. Otherwise, if the participant selected "cm" and \nabs (log10(r*2.54)) < 1og10(1.2)\nthen display a pop up saying RC_screenSizeNotCm, with an OK button.\nWhen they click OK or press RETURN, take them back to the page where they select inches vs cm.\n4. If we passed steps 1-3, then accept the first setting. Each pxPerCm setting after the first is compared with the previous. They must agree to within 8%. If they don\'t agree then discard both. Keep going until all the requested settings are made and accepted.\n\n⚠️ A few participants (5%) repeatedly press the SPACE bar to get through this, producing equal distances and ruining this check. To prevent this noncompliance, EasyEyes checks each pair of settings. If the two requested distances differ by less than 20%, skip this numerical check. If the requests differ by at least 20% and the settings differ by less than 10% then EasyEyes rejects all the distance settings so far by this participant, and invites them to start again with the first setting.\n\n⚠️ Excel wants to interpret the three numbers as a date. To discourage that, we prefix SPACE PLUS " +" to the first number. \nWHEN ENTERING SEVERAL NUMBERS IN ONE CELL, WE STRONGLY SUGGEST BEGINNING WITH A SPACE, AND PUTTING A SPACE AFTER EVERY COMMA. THIS PREVENTS EXCEL FROM MISINTERPRETING THE STRING AS A SINGLE NUMBER, TAKING THE COMMA TO BE A EUROPEAN DECIMAL POINT.',
  },
  _calibrateDistanceCheckLengthSDLogAllowed: {
    name: "_calibrateDistanceCheckLengthSDLogAllowed",
    availability: "now",
    type: "numerical",
    default: "0.02",
    explanation:
      '_calibrateDistanceCheckLengthSDLogAllowed (default 0.01) sets the maximum of sd(log10(estimatedPixelDensity)) that is considered "reliable". Data from reliable measurers will be plotted with solid lines, unreliable with data lines.',
  },
  _calibrateDistanceCheckSecs: {
    name: "_calibrateDistanceCheckSecs",
    availability: "now",
    type: "numerical",
    default: "1",
    explanation:
      "_calibrateDistanceCheckSecs (default 1).  EasyEyes will prevent premature taps by ignoring keypad/keyboard input until calibrateDistanceCheckSecs after the previous ready-to-measure response. For the first response, measure time from when the instructions are first displayed.",
  },
  _calibrateDistanceGreenLineVideoFraction: {
    name: "_calibrateDistanceGreenLineVideoFraction",
    availability: "now",
    type: "numerical",
    default: "0.5",
    explanation:
      "_calibrateDistanceGreenLineVideoFraction (default 0.5) is for _calibrateDistance === justCreditCard. It specifies the height of the green line (corresponding to the top of the credit card image) in the webcam video, as a fraction of the video height. The participant uses◀▶to adjust the dashed green line length.\n⚠️ CAUTION: The current version of the calibration algorithm ASSUMES that this is 0.5, which places the upper card edge and its image on the camera's optical axis. This simplifies the optical calculation. Don't change it unless you know what you're doing.",
  },
  _calibrateDistanceIpdUsesZBool: {
    name: "_calibrateDistanceIpdUsesZBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_calibrateDistanceIpdUsesZBool (default FALSE) tells EasyEyes, when computing ipdVpx, whether to include the Z coordinate, in the X,Y,Z eye coordinates for each eye from Google Facemesh.",
  },
  _calibrateDistanceIsCameraMinRes: {
    name: "_calibrateDistanceIsCameraMinRes",
    availability: "now",
    type: "numerical",
    default: "1280",
    explanation:
      "_calibrateDistanceIsCameraMinRes (default 1280) smallest width (px) of camera image that EasyEyes accepts without complaint. If the resolution is lower, then we show RC_ImprovingCameraResolution, and try to improve the resolution. Then EasyEyes proceeds with the best resolution it can get, even if it's below _calibrateDistanceIsCameraMinRes.",
  },
  _calibrateDistanceIsCameraTopCenterBool: {
    name: "_calibrateDistanceIsCameraTopCenterBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      '_calibrateDistanceIsCameraTopCenterBool (default FALSE) determines whether we show the page that asks where the camera is.\n"3. Is your camera at the top center?\no Yes o No o Don\'t know."',
  },
  _calibrateDistanceLocations: {
    name: "_calibrateDistanceLocations",
    availability: "now",
    type: "multicategorical",
    default: "camera, center",
    explanation:
      "_calibrateDistanceLocations (default: camera, center) specifies any number of target locations for the calibration. Each location can be camera, center, topCenter, topOffsetLeft, topOffsetRight, topOffsetDown. It specifies a target point on the screen: camera is center of top edge, center is screen center, topCenter is the center of the video when it's horizontally centered and abutting the top edge. topOffsetLeft, topOffsetRight, and topOffsetDown specify a target point that is offset in the named direction by a distance _calibrateDistanceOffsetCm from the topCenter location.",
    categories: [
      "camera",
      "center",
      "topCenter",
      "topOffsetLeft",
      "topOffsetRight",
      "topOffsetDown",
      "cameraLeftEye",
      "cameraRightEye",
      "topCenterLeftEye",
      "topCenterRightEye",
      "centerLeftEye",
      "centerRightEye",
    ],
  },
  _calibrateDistanceObjectMinMaxCm: {
    name: "_calibrateDistanceObjectMinMaxCm",
    availability: "now",
    type: "numerical",
    default: "40, 70",
    explanation:
      "_calibrateDistanceObjectMinMaxCm (default 40, 70) are the minimum and maximum object length allowed. Accuracy improves with length, so it's good to insist on at least 30 cm. Beyond 60 cm, it's hard to reach the keyboard, but we won't enforce that.\n\nAt least with the MacBook Pro's (14\", 2021) built-in camera, Google FaceMesh always fails to analyze a face nearer than 18 cm, and due to hysteresis, sometimes fails with faces 18 to 25 cm away. If you approach from afar it succeeds down to 18 cm. If you recede from nearer, it fails out to 25 cm.\n\nSatisfying _calibrateDistanceAllowedRatio is not easy. At 1.03, it's very hard, but easier at longer distance. I failed many times at 30 cm and succeeded quickly at 60 cm. Sajjad failed for 10 minutes at 25 cm.\n",
  },
  _calibrateDistanceOffsetCm: {
    name: "_calibrateDistanceOffsetCm",
    availability: "now",
    type: "numerical",
    default: "4",
    explanation:
      "_calibrateDistanceOffsetCm (default 4) specifies how far left, right, or down the target (video) is offset by the _calibrateDistanceLocations options topOffsetLeft, topOffsetRight, and topOffsetDown.",
  },
  _calibrateDistancePupil: {
    name: "_calibrateDistancePupil",
    availability: "now",
    type: "categorical",
    default: "eyeCorners",
    explanation:
      "_calibrateDistancePupil (default eyeCorners) selects the way that we estimate the pupil position from the face mesh provided by Google FaceMesh software.\neyeCorners = midpoint between corners of the eye, points 33 and 133 (right eye) and points 362 and 163 (left eye).\niris = center of iris, point 468 (right eye) and 473 (left eye). These points are provided by the optional Google FaceMesh Iris module, which (slowly) estimates iris position.\n\nThere's a tradeoff. We expect \"iris\" to be more accurate that \"eyeCorners\", but it's much more computationally intensive. You can observe this directly. When _calibrateDistancePupil=iris and _showIrisesBool=TRUE, you'll notice that the artificial blue iris lags behind your true iris when you move your head quickly. Also, when the camera was running at 60 Hz, a fast computer (MacBook Pro, 14\" 2021, 64 GB memory) was logging a lot of warnings in the Console while _calibrateDistancePupil=iris. \n[Violation] remote-calibrator@0.8.15:2\n' requestAnimationFrame' handler took 71ms\n\nEasyEyes has been modified to request a camera frame rate of 30 Hz or below (25 Hz in europe), and this eliminated those warnings on the MacBook Pro, but slower computers might still give warnings at 25/30 Hz. We plan to add code to detect these warnings and report that in the CSV results file. Also, in the future, we are considering automatically downgrading from iris to eyeCorners, if the computer isn't coping with the computational load.\n\nNOTE: “Left” and “right” refer to the participant's left and right.",
    categories: ["eyeCorners", "iris"],
  },
  _calibrateDistanceQuadBaseRatio: {
    name: "_calibrateDistanceQuadBaseRatio",
    availability: "now",
    type: "numerical",
    default: "2.14",
    explanation:
      "_calibrateDistanceQuadBaseRatio (default 2.14) is the ratio of two lengths. The numerator is that of the bottom of the quadilateral. The denominator is that of the top of the quadrilateral. The quadrilateral is drawn, in green, on the video. The top is fixed at _calibrateDistanceCardTopVideoFraction, a fraction from bottom to top of the video. The participant uses the ◀▶ keys to adjust the length of the dashed top of the quadrilateral. The height and bottom width are proportional to the top. This parameter is the proportionality constant for the bottom.",
  },
  _calibrateDistanceShowBool: {
    name: "_calibrateDistanceShowBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_calibrateDistanceShowBool (default FALSE). When TRUE it shows a white pop-over with results of the the distance calibration. It remains until dismissed by clicking its close icon ☒.",
  },
  _calibrateDistanceShowEyeFeetBool: {
    name: "_calibrateDistanceShowEyeFeetBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_calibrateDistanceShowEyeFeetBool (default FALSE) controls whether or not we draw each eye's perpendicular foot on the screen during distance tracking. We also display the distance of each foot from its eye, and, near the camera, we also display the smaller distance of the camera to the two eyes.\nThis is meant for debugging, to assess how well we track the eyes.\nNOTE: The feet are displayed only AFTER distance calibration. ",
  },
  _calibrateDistanceShowRulerUnitsBool: {
    name: "_calibrateDistanceShowRulerUnitsBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_calibrateDistanceShowRulerUnitsBool (default FALSE). When TRUE,  EasyEyes displays the object length, and the ruler has standard units, cm or inch, as chosen by the participant. When FALSE, the length is not displayed, and the ruler has arbitrary units. Hiding the length and units makes it harder for the participant to match two settings without using a real object. The changes below affect only the ruler’s appearance. EasyEyes will still record object length as the tape (or ruler) length (cm) when the SPACE bar is pressed.\n\nIf (_calibrateDistanceShowDistanceBool===FALSE) then do the following:\n1. Hide the inch vs. cm selector.\n2. Remove the dimension line and its numerical display of length.\n3. Use a new unit length, replacing inch and cm.\nintervalCm = (screenWidthCm-1)*(0.8+0.2*rand());\nUse a fresh value of rand for each measurement, i.e. keep it until the participant presses SPACE.\n4. As usual, print numbered tick marks on the tape, but now at intervals of intervalCm. The new spacing is so large that only one or two ticks will be visible at once.\n5. Replace the tape's uniform yellow background, with a ruler's wood texture.",
  },
  _calibrateDistanceSpotDebugBool: {
    name: "_calibrateDistanceSpotDebugBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_calibrateDistanceSpotDebugBool (default FALSE) displays a line and circle to help check spot position. Strictly for debugging of the blindspot mapping code. The line goes through the center of fixation and the center of the diamond. The circle marks the center of the diamond. Some live stats about the diamond are also reported at one end of the line.",
  },
  _calibrateDistanceSpotMinMaxDeg: {
    name: "_calibrateDistanceSpotMinMaxDeg",
    availability: "now",
    type: "text",
    default: "3, 16",
    explanation:
      '_calibrateDistanceSpotMinMaxDeg (default 3,16) specifies the minimum and maximum width of the blinking red diamond used to map the blindspot. This is relevant only when\n_calibrateDistance===blindspot\n\nChatGPT says: "The blindspot extends roughly 5–7° horizontally and 7–9° vertically, so the exact “center” can shift a little between people. Most mapping studies converge on 14–16° temporal, 1–2° below horizontal as the standard."\n\nLi et al. (2020, "virtual chinrest") say, "The center of the blind spot is located at a relatively consistent angle of \nα = 15° horizontally\n(14.33° ± 1.3° in Wang et al. 22, \n15.5° ± 1.1° in Rohrschneider 23, \n15.48° ± 0.95° in Safran et al. 24, \nand 15.52° ± 0.57° in Ehinger et al. 25).',
  },
  _calibrateDistanceSpotXYDeg: {
    name: "_calibrateDistanceSpotXYDeg",
    availability: "now",
    type: "text",
    default: "  15.5,  -1.5",
    explanation:
      '_calibrateDistanceSpotXYDeg (default "15.5, -1.5") specifies the typical eccentricity of the center of the right eye\'s blindspot. For left eye, negate the X coordinate. This is relevant only when\n_calibrateDistance===blindspot\n\nChatGPT says: "The blindspot extends roughly 5–7° horizontally and 7–9° vertically, so the exact “center” can shift a little between people. Most mapping studies converge on 14–16° temporal, 1–2° below horizontal as the standard."\n\nLi et al. (2020, "virtual chinrest") say, "The center of the blind spot is located at a relatively consistent angle of \nα = 15° horizontally\n(14.33° ± 1.3° in Wang et al. 22, \n15.5° ± 1.1° in Rohrschneider 23, \n15.48° ± 0.95° in Safran et al. 24, \nand 15.52° ± 0.57° in Ehinger et al. 25).',
  },
  _calibrateDistanceTimes: {
    name: "_calibrateDistanceTimes",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceLocations instead.",
  },
  _calibrateMicrophoneKeywords: {
    name: "_calibrateMicrophoneKeywords",
    availability: "now",
    type: "categorical",
    default:
      "UMIK-1, UMIK-2, Bluetooth, Headset, Headphones, Wireless, On-Ear, Over-Ear, In-Ear, Buds, Earbuds, AirPods, Eardrops, Air, Cloud, MIDI, Line-in, Audeze, Audio-Technica, Blackwire, Beats, beyerdynamic, Blue Satellite, BlueParrot, Bowers & Wilkins, Caymuller, Bose, Conambo, COOSII, Cowin, Discover, Focal, HD, HEIBAS, HIFIMAN, HyperX, Jabra, JBL, Koss, LEVN, Logitech, Meze, Monolith, NANAMI, Poly Voyager, Porta, Raycon, Sennheiser, Shure, Sony, Soundcore, TOZO, Trucker, Vibe, Yealink",
    explanation:
      '🕑 _calibrateMicrophoneKeywords (see default below) is a list of keywords used to interpret the list of input devices returned by Web Audio on a mobile phone. On a desktop, Web Audio identifies which input device is in use. On a mobile device, Web Audio just gives a list of available input devices, which may include use of the loudspeaker as a microphone. For calibration purposes, EasyEyes assumes that the phone is using either its main built-in microphone or a connected external microphone. When connected to a smartphone by the QR-code technique, EasyEyes scans the enumerated list of sound input device "labels" returned by web audio. Any enumerated device whose label includes a keyword from the _calibrateMicrophoneKeywords list will be assumed to be the active external microphone, and that name will be reported as the web audio name of the Microphone. Keyword matching ignores case. If no label matches a keyword, then EasyEyes assumes that the microphone enumerated as "mics:0" is default and active, and returns its name, which on some phones is "Default". \n\nIf EasyEyes fails to detect a particular phone\'s microphone, you may be able help EasyEyes to catch it by adding a keyword to the default list and using that extended list. Conversely, if our list inadvertently contains a keyword that is causing a false alarm because it appears in a participant\'s phone\'s label for an internal sound-input source, you can create and use a new list without the problematic keyword. Please tell denis.pelli@nyu.edu for possible improvement of the default list below.\n\nDEFAULT (matching ignores case): "UMIK-1, UMIK-2, Bluetooth, Headset, Headphones, Wireless, On-Ear, Over-Ear, In-Ear, Buds, Earbuds, AirPods, Eardrops, Air, Cloud, MIDI, Line-in, Audeze, Audio-Technica, Blackwire, Beats, beyerdynamic, Blue Satellite, BlueParrot, Bowers & Wilkins, Caymuller, Bose, Conambo, COOSII, Cowin, Discover, Focal, HD, HEIBAS, HIFIMAN, HyperX, Jabra, JBL, Koss, LEVN, Logitech, Meze, Monolith, NANAMI, Poly, Porta, Raycon, Sennheiser, Shure, Sony, Soundcore, TOZO, Trucker, Vibe, Voyager, Yealink"        ',
    categories: [],
  },
  _calibrateMicrophonesBool: {
    name: "_calibrateMicrophonesBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_calibrateMicrophonesBool (default FALSE) enables calibration of new microphones, typically smartphone microphones. This is intended solely for use by a few sound experts (for now, Denis Pelli and his assistants), and requires a manufacturer-calibrated USB-connected miniDSP UMIK-1 or UMIK-2 microphone (available from Amazon for one or two hundred dollars) to calibrate the computer's loudspeakers. Then the calibrated loudspeakers are used to calibrate, one by one, any number of smartphone microphones. Each new calibration file is added to the EasyEyes microphone calibration library, with credit to the author of the calibration. In order to set _calibrateMicrophonesBool=TRUE (which allows you to calibrate microphones), you must also specify _authors, _authorAffiliations, and _authorEmails.\n",
  },
  _calibrateScreenSizeCacheBool: {
    name: "_calibrateScreenSizeCacheBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      '🕑 _calibrateScreenSizeCacheBool (default TRUE) saves the scientist time by saving the screen calibration of screen size (in cm), and thereafter retrieving the size from a local cache instead of re-calibrating. It enables EasyEyes saving and reading a "cookie" (in the participant computer browser\'s localStorage) containing the screen position (px), resolution (px), and size (cm), e.g. (0,0) px; 3024✕1964 px, and 24.5✕16 cm. The "cookie" is only read if _calibrateScreenSizeCacheBool==TRUE. If read, the "cookie" is considered valid only if it reports a screen position (left, top) px and resolution (width ✕ height px) that match the current screen\'s position and resolution. \n\nIf calibrateScreenSizeBool==TRUE, and there\'s a valid cookie, then EasyEyes takes the screen size (width ✕ height cm) from the cookie instead of measuring it. (EasyEyes measures screen size by adjusting the size of a credit card drawing to match the size of a real credit card.) At the end of size calibration, if _calibrateScreenSizeCacheBool==TRUE, then a "cookie" is saved, containing the screen position, resolution, and size. \n\nEasyEyes checks validity because it needs the size of the current screen, but the computer might have several screens, and the browser window could be opened on any of them. Similarly, the participant might replace a second screen. If the participant changes the screen resolution, then the "cookie" match will fail, and they\'ll have to recalibrate size. Similarly, localStorage is browser-specific, so if the participant switches browser, they\'ll have to recalibrate size. Those rare events represent only a minor inconvenience. This scheme is good because it is unlikely to mistake a new screen for an old one, and it uses one screen calibration to test many participants.\n\nThe credit card test measures only pxPerCm. We compute size (width and height in cm) from pxPerCm and the known resolution (width and height in px). Even so, screen size in cm is the more permanent property of the monitor because it is conserved when the participant uses an OS control panel to change to a new resolution with the same ratio of width to height. (If the new resolution has a different ratio of width to height, then the change in resolution will also slightly change the display area, i.e. size in cm.) ',
  },
  _calibrateSound1000HzBool: {
    name: "_calibrateSound1000HzBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "⭑ Set _calibrateSound1000HzBool TRUE (default FALSE) to request loudspeaker (and possibly _calibrateMicrophonesBool) sound gain calibration (db SPL re numerical dB) at 1 kHz, using the participant's pre-calibrated microphone (either in a smartphone or a USB-connected microphone). If the participant offers a smartphone, EasyEyes checks its library for that model in its library of microphone calibrations. Many sound levels are tested to calibrate the effect of clipping and dynamic gain control. Early exit if no calibrated microphone is available. Calibration is done only once, at the beginning, before block 1, if any condition(s) in the whole experiment requests it. Each condition uses the 1000 Hz calibration if and only if it sets calibrateSound1000HzBool=TRUE. The parameters calibrateSound1000HzBool and calibrateSoundAllHzBool are independent and complementary. The 1000 Hz calibration measures gain at many sound levels; the all-Hz calibration measures gain at all frequencies, at one sound level. We anticipate that most sound conditions will use both. Before block 1, once the loudspeaker is calibrated, if _calibrateMicrophonesBool is TRUE, then EasyEyes offers to calibrate microphones, one at a time.",
  },
  _calibrateSound1000HzDB: {
    name: "_calibrateSound1000HzDB",
    availability: "now",
    type: "text",
    default: " -50, -40, -30, -25, -20, -15, -10, -3.1",
    explanation:
      "⭑ _calibrateSound1000HzDB, used with _calibrateSound1000HzBool, is a comma-separated list of digital RMS amplitudes, in dB, of the sinewave used to calibrate the sound gain. WHEN ENTERING SEVERAL NUMBERS IN ONE CELL, WE STRONGLY SUGGEST BEGINNING WITH A SPACE, AND PUTTING A SPACE AFTER EVERY COMMA. THIS PREVENTS EXCEL FROM MISINTERPRETING THE STRING AS A SINGLE NUMBER. Default is -60, -50, -40, -30, -20, -15,- 10, -3.1 (dB), where levelDB = 20*log10(rms), and rms is the root mean square of the digital sound vector. A sinewave with range -1 to +1, the highest amplitude that won't be clipped, has rms -3.1 dB. Microphones clip and may have dynamic range compression, so we measure the gain at many amplitudes and fit a model to the data. The model allows for an additive environmental background noise and dynamic range compression and clipping of the recoding with three degrees of fredom (T,W,R). Digital sound cannot exceed ±1 without clipping. Thus sin(2*pi*f*t) is at maximum amplitude. It has RMS amplitude of 0.707, which is -3.1 dB. IMPORTANT. Order your calibration sound levels so that loudness increases. The iPhone microphone has a slow dynamic range compression and measurement of a given digital sound level (e.g. -50 dB) made after measuring a much louder sound can be 6 dB lower than after a quiet sound. Your smartphone's clipping and dynamic range compression are not part of your experiment; we just need to get good sound level measurements during calibration. ",
  },
  _calibrateSound1000HzMaxSD_dB: {
    name: "_calibrateSound1000HzMaxSD_dB",
    availability: "now",
    type: "numerical",
    default: "1.5",
    explanation:
      "_calibrateSound1000HzMaxSD_dB (default 1.5). When a 1000 Hz recording at a given sound level has an SD exceeding _calibrateSound1000HzMaxSD_dB, the recording is redone up to a total of _calibrateSound1000HzMaxTries times. The last recording is used regardless of its SD.",
  },
  _calibrateSound1000HzMaxTries: {
    name: "_calibrateSound1000HzMaxTries",
    availability: "now",
    type: "integer",
    default: "4",
    explanation:
      "_calibrateSound1000HzMaxTries (default 4). When a 1000 Hz recording at a given sound level has an SD exceeding _calibrateSound1000HzMaxSD_dB, the recording is redone up to a total of _calibrateSound1000HzMaxTries times. The last recording is used regardless of its SD.",
  },
  _calibrateSound1000HzPostSec: {
    name: "_calibrateSound1000HzPostSec",
    availability: "now",
    type: "numerical",
    default: "0.5",
    explanation:
      'calibrateSound1000HzPostSec (default 0) specifies the duration, after the part that is analyzed, of the 1 kHz sound at each sound level. This allows for some discrepancy between the clocks used to drive sound playing and recording. Making the sound longer than the recording allows us to be sure of getting a full recording despite modest discrepany in loudspeaker and microphone clocks.\nNOTE: Because of the uncertainty in synchronizing the loudspeaker and recording onsets we record for 20% longer than the whole requested duration: _calibrateSound1000HzPreSec+_calibrateSound1000HzSec+_calibrateSound1000HzPostSec. In the EasyEyes plots of power over time, the excess duration beyond _calibrateSound1000HzPreSec+_calibrateSound1000HzSec is assigned to the "post" interval, so the plotted "post" interval will be longer than requested by _calibrateSound1000HzSec by 20% of the whole requested duration._',
  },
  _calibrateSound1000HzPreSec: {
    name: "_calibrateSound1000HzPreSec",
    availability: "now",
    type: "numerical",
    default: "2.5",
    explanation:
      "_calibrateSound1000HzPreSec (default 1) specifies the duration of the 1 kHz sound played as warmup, before the part that is analyzed at each sound level. Looking at plots of power variation vs time for my iPhone 15 pro, setting the pre interval to 1.0 sec is barely enough.  It might turn out that some phones need more.",
  },
  _calibrateSound1000HzSec: {
    name: "_calibrateSound1000HzSec",
    availability: "now",
    type: "numerical",
    default: "2.5",
    explanation:
      "_calibrateSound1000HzSec (default 1) specifies the duration, after warmup, of the 1 kHz sound that is analyzed at each sound level. ",
  },
  _calibrateSoundAgainOptionBool: {
    name: "_calibrateSoundAgainOptionBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      '🕑 _calibrateSoundAgainOptionBool (default FALSE), if TRUE, then the "Again" button is ALWAYS offered at the top of the Sound Calibration Results page. If FALSE, then the "Again" button is shown only if _calibrateMicrophonesBool==TRUE or the loudspeaker correction is unacceptable, because SD > _calibrateSoundTolerance_dB.',
  },
  _calibrateSoundAllHzBool: {
    name: "_calibrateSoundAllHzBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "⭑ Set _calibrateSoundAllHzBool TRUE (default FALSE) to request loudspeaker (and possibly _calibrateMicrophonesBool) sound gain calibration (db SPL re numerical dB) at all frequencies, relative to 1000 Hz, using the participant's pre-calibrated smartphone microphone or USB-connected microphone. If the participant offers a smartphone, EasyEyes checks our library for that smartphone model in its library of microphone calibrations. The microphone is used to measure the loudspeaker's impuse response. The impulse response yields the gain (db SPL re numerical dB) at every frequency. Early exit if no pre-calibrated microphone is available. It's ok for the pariticipant try several smartphones before finding one that's in the EasyEyes microphone calibration library. Calibration is done once, before block 1, if any condition(s) in the whole experiment requests it. Each condition uses this calibration only if it sets _calibrateSoundAllHzBool TRUE.  _calibrateSound1000HzBool and _calibrateSoundAllHzBool are independent and complementary. The 1000 Hz calibration measures gain at many sound levels; the allHz calibration measures gain at all frequencies, at one sound level. We anticipate that most sound conditions will use both. Once, the loudspeaker is calibrated, if _calibrateMicrophonesBool is TRUE, then EasyEyes offers to calibrate microphones, one at a time.",
  },
  _calibrateSoundAllHzDB: {
    name: "_calibrateSoundAllHzDB",
    availability: "now",
    type: "text",
    default: "-13.1",
    explanation:
      "_calibrateSoundAllHzDB, used with _calibrateSoundAllHzBool, is a comma-separated list of digital RMS amplitudes, in dB, of the sinewave used to calibrate the sound gain. Default is -23.1 (in dB), where levelDB = 20*log10(rms), and rms is the root mean square of the digital sound vector. A sinewave with range -1 to +1, the highest amplitude that won't be clipped, has rms -3.1 dB. Built-in  speakers in laptop computers are typically small with severe dynamic range compression, so we need to measure the gain at many amplitudes since gain will drop at high sound levels. Digital sound cannot exceed ±1 without clipping. Thus sin(2*pi*f*t) is at maximum amplitude. It has RMS amplitude of 0.707, which is -3 dB.",
  },
  _calibrateSoundBackgroundSecs: {
    name: "_calibrateSoundBackgroundSecs",
    availability: "now",
    type: "numerical",
    default: "2",
    explanation:
      "_calibrateSoundBackgroundSecs (default 2) records the background sound for the specified duration. This is used to estimate the background spectrum, which we subtract from spectra of other recordings. This recording is made if and only if _calibrateSoundBackgroundSecs>0 and calibrateSoundAllHzBool==TRUE.",
  },
  _calibrateSoundBurstDb: {
    name: "_calibrateSoundBurstDb",
    availability: "now",
    type: "numerical",
    default: "-30",
    explanation:
      "__calibrateSoundBurstDb (default -30) sets the digital input sound level (in dB) at which to play the MLS during calibration. If _calibrateSoundBurstDbIsRelativeBool==TRUE then  _calibrateSoundBurstDb is relative to the input threshold of the dynamic range compression model, otherwise it's absolute power of the digital sound input. The MLS is synthesized as ±1, and its amplitude is scaled to yield the desired power level. The digital input sound power will be \nif _calibrateSoundBurstDbIsRelativeBool==FALSE then power_dB=_calibrateSoundBurstDb.\nif _calibrateSoundBurstDbIsRelativeBool==TRUE then power_dB=_calibrateSoundBurstDb+(T-soundGainDbSPL).\nThe unfiltered MLS amplitude is ±10^(power_dB/20). At the default of power_dB=-18 dB, the unfiltered MLS amplitude is ±0.126. power_dB specifies the digital power before any filtering by the inverse impulse response (IIR). Within EasyEyes, the IIR is normalized to have an expected gain of 0 dB at 1 kHz.",
  },
  _calibrateSoundBurstDbIsRelativeBool: {
    name: "_calibrateSoundBurstDbIsRelativeBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "⚠WORKS BUT NOT RECOMMENDED. _calibrateSoundBurstDbIsRelativeBool (default FALSE) when TRUE the burst sound level is\n _calibrateSoundBurstDb+(T-soundGainDbSPL), \nwhere T is the output threshold in the dynamic range compression model and T - soundGainDbSPL is the input threshold. When FALSE the burst sound level is _calibrateSoundBurstDb. ",
  },
  _calibrateSoundBurstDownsample: {
    name: "_calibrateSoundBurstDownsample",
    availability: "now",
    type: "integer",
    default: "1",
    explanation:
      "_calibrateSoundBurstDownsample (default 1) is a positive integer N that specifies a lower MLS sample frequency of fMLS=fs/N, where fs is the sample frequency _calibrateSoundSamplingDesiredHz used by the loudspeaker and microphone. This is implemented by using fMLS instead of fs for synthesis and analysis of the MLS. Existing code yields an MLS sequence with the desired duration at a sampling frequency of fMLS. Then we replace each MLS sample, with associated rate fMLS, by N replicas of the sample, with associated rate fs=N*fMLS, which preserves duration. The sound is played and recorded at fs, and then downsampled by replacing each successive group of N samples by their average. The downsampled waveform has sampling frequency fMLS. We use our existing code to analyze the original MLS sequence and downsampled recording. \n\nEXPLANATION. Web audio allows setting of the sampling rate, but has only a few choices, the lowest of which is 44.1 kHz. I anticipate that when calibrating we'll use an N of 2. An fMLS = 24 kHz will yield an MLS with a white spectrum up to 12 kHz, which is well matched to our current upper cut off of 10 kHz. Halving the bandwidth at fixed power (and amplitude) doubles the power spectral density. That's a 6 dB improvement in the signal against the fixed background noise of the room.\n\nALSO SEE _calibrateSoundBurstFilteredExtraDb.\n\nCOMPILER SHOULD FLAG ERROR FOR ANY VALUE THAT IS NOT AN INTEGER GREATER THAN ZERO.",
  },
  _calibrateSoundBurstFilteredExtraDb: {
    name: "_calibrateSoundBurstFilteredExtraDb",
    availability: "now",
    type: "numerical",
    default: "5",
    explanation:
      "_calibrateSoundBurstFilteredExtraDb (default 5) specifies how much higher the level of the digital filtered MLS is allowed to be over that of the digital unfiltered MLS. This is important in avoiding saturation (more likely of the loudspeaker than the microphone) which distorts the recording. The system identification approach used here assumes linearity, so nonlinear saturation distorts the derived impulse response. EasyEyes respects this limit by low pass filtering the filtered MLS. For a flat spectrum (like the MLS before filtering) power is proportional to bandwidth. The lowest possible bandwidth is slightly over 1 kHz because we use gain at 1 kHz as a reference, and that scheme would break if we filtered out 1 kHz. \nALSO SEE _calibrateSoundBurstDownsample.",
  },
  _calibrateSoundBurstLevelReTBool: {
    name: "_calibrateSoundBurstLevelReTBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "⚠ WORKS BUT NOT RECOMMENDED. _calibrateSoundBurstLevelReTBool (default FALSE) when TRUE the burst sound level is \n_calibrateSoundBurstDb+(T - soundGainDbSPL), \nwhere T is the output threshold in the dynamic range compression model and T-soundGainDbSPL is the input threshold. When FALSE the burst sound level is _calibrateSoundBurstDb. ",
  },
  _calibrateSoundBurstMaxSD_dB: {
    name: "_calibrateSoundBurstMaxSD_dB",
    availability: "now",
    type: "numerical",
    default: "2",
    explanation:
      '_calibrateSoundBurstMaxSD_dB (default 2) causes EasyEyes to remeasure the MLS response once, if the SD of the power over the "use" interval exceeds _calibrateSoundBurstMaxSD_dB. The second attempt is final.',
  },
  _calibrateSoundBurstMLSVersions: {
    name: "_calibrateSoundBurstMLSVersions",
    availability: "now",
    type: "numerical",
    default: "1",
    explanation:
      "_calibrateSoundBurstMLSVersions (default 1) is the number N of different MLS sequences to use, doing the whole Novak et al. MLS calibration (including _calibrateSoundBurstRepeats) to get an impulse response for each MLS sequence. EasyEyes will save the N impulse responses in the profile library and in the JSON file. EasyEyes will also save, in both places, the combined impulse response, for further analysis, which is the median at each time point of the several impulse response functions. As of January 27, 2024, we only have experience with N=1. Based on Vanderkooy (1994), we hope that increasing N to 3 will greatly reduce MLS artifacts. \n\nVanderkooy, J. (1994). Aspects of MLS measuring systems. Journal of the Audio Engineering Society, 42(4), 219-231.",
  },
  _calibrateSoundBurstNormalizeBy1000HzGainBool: {
    name: "_calibrateSoundBurstNormalizeBy1000HzGainBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "_calibrateSoundBurstNormalizeBy1000HzGainBool (default TRUE) if true, then divides the MLS-measured frequency transfer function gain by the separately measured 1000 Hz sinewave gain.",
  },
  _calibrateSoundBurstPostSec: {
    name: "_calibrateSoundBurstPostSec",
    availability: "now",
    type: "numerical",
    default: "1",
    explanation:
      "_calibrateSoundBurstPostSec (default 0.5) requests playing the burst periodically through a post interval that is rounded up to an integer multiple of the burst period. To tolerate some onset asynchrony, we record the playing of seamless repetition of the burst throughout the whole pre, used, and post iterval.",
  },
  _calibrateSoundBurstPreSec: {
    name: "_calibrateSoundBurstPreSec",
    availability: "now",
    type: "numerical",
    default: "2.5",
    explanation:
      "_calibrateSoundBurstPreSec (default 0.5) requests playing the burst periodically through a pre interval rounded up to an integer multiple of the burst period.  To provides time for the hardware to warm up, and to tolerate some onset asynchrony, we record the playing of seamless repetition of the burst throughout the whole pre, used, and post iterval.",
  },
  _calibrateSoundBurstRecordings: {
    name: "_calibrateSoundBurstRecordings",
    availability: "now",
    type: "numerical",
    default: "1",
    explanation:
      "❌ _calibrateSoundBurstRecordings (default 1) is the desired number of recordings, where each recording consists of _calibrateSoundBurstRepeats. Each recording includes its own warm up _calibrateSoundBurstsWarmup. WE NOW THINK THIS SHOULD ALWAYS BE 1, BECAUSE AVERAGING THE TIME-BASED IR IS NOT RECOMMENDED.",
  },
  _calibrateSoundBurstRepeats: {
    name: "_calibrateSoundBurstRepeats",
    availability: "now",
    type: "numerical",
    default: "2",
    explanation:
      "_calibrateSoundBurstRepeats (default 4) is the number of times to play the sound burst for analysis.\n_calibrateSoundBurstPreSec and _calibrateSoundBurstPostSec are rounded up to be an integer multiple of the burst period. EasyEyes adds an extra warm-up rep, at the beginning, that is also recorded, but not used in estimation of the impulse response, and an extra 10% of the requested duration, at the end, to allow for any small difference in start time between the loudspeaker and microphone.  \nIMPORTANT: The Novak et al. (2012) algorithm to deal with an asychronous loudspeaker and microphone requires that we analyze at least two repeats of the MLS period, so make sure that\n_calibrateSoundBurstRepeats ≥ 2\nWe plan to have the EasyEyes compiler enforce this.",
  },
  _calibrateSoundBurstScalar_dB: {
    name: "_calibrateSoundBurstScalar_dB",
    availability: "now",
    type: "numerical",
    default: "101.4",
    explanation:
      "_calibrateSoundBurstScalar_dB (default +101.4). This dB offset will be added to the gain (in dB) at every frequency of the gain profile measured with the MLS burst. Using intuitive names, reported gain level at each frequency is \ngain_dB = scalar_dB + output_dB - input_dB\nUsing actual input parameter names, this is\ngain_dB =_calibrateSoundBurstScalar_dB + output_dB - _calibrateSoundBurstDb\nThe idea is that we know that the gain measured with 1000 Hz sine is correct, whereas there is an unknown frequency-independent scale factor for gain of the All-Hz path, so we use this fudge factor to make its gain at 1000 Hz agree with the gain measured with 1000 Hz sine.  We measure and set _calibrateSoundBurstScalar_dB once, for all time, so it's not a liability.",
  },
  _calibrateSoundBurstSec: {
    name: "_calibrateSoundBurstSec",
    availability: "now",
    type: "numerical",
    default: "2",
    explanation:
      "_calibrateSoundBurstSec (default 1) is the desired length of one sound burst (currently an MLS sequence) for sound calibration. To be useful, it should be longer than the impulse response that you want to measure. Excess length improves the signal to noise ratio. MLS sequences can only be certain lengths, in steps of roughly doubling, so EasyEyes will pick the shortest MLS length that, with the actual sampling rate, produces a burst duration at least as long as _calibrateSoundBurstSec.",
  },
  _calibrateSoundBurstsWarmup: {
    name: "_calibrateSoundBurstsWarmup",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "❌ _calibrateSoundBurstsWarmup (default 1) is the number of extra sound bursts, not recorded, before the recorded series of bursts. The warmup is NOT part of the _calibrateSoundBurstRepeats. There will be _calibrateSoundBurstsWarmup+_calibrateSoundBurstRepeats sound bursts, and only the final _calibrateSoundBurstRepeats are recorded and analyzed. Having a warmup burst is traditional among professionals who use MLS to measure concert halls. It's meant to give the loudspeaker and microphone time to reach a stationary state before recording for analysis. It is common to set this to 1 (for very accurate measurement) or 0 (to save time). We can't think of any reason to use another value.",
  },
  _calibrateSoundCheck: {
    name: "_calibrateSoundCheck",
    availability: "now",
    type: "categorical",
    default: "speakerOrMic",
    explanation:
      '_calibrateSoundCheck (default "speakerOrMic") optionally check the flatness of the spectrum produced by playing the MLS (which has a white spectrum) with frequency-response correction in place. Correction is performed by convolving the digital sound with the inverse impulse response (IIR) computed during sound calibration for the speaker, mic, or speaker+mic. _calibrateSoundCheck must be set to one of three values: none, speakerOrMic, or speakerAndMic.\n• “none” skips this check. \n• “speakerOrMic” checks using the IIR corresponding to the component being calibrated, either loudspeaker or microphone.\n• “speakerAndMic” checks using the IIR corresponding to the combination of loudspeaker and microphone.\nThe test results are displayed on the Calibration Results page, and (if _calibrateSoundSaveJSONBool=TRUE) saved as a JSON file in the participant\'s Downloads folder.\nAll tests actually play a filtered MLS through the combination of speaker and microphone. When our interest is focussed on speaker or microphone, we factor out the other, from the recording, based on prior calibration. ',
    categories: ["none", "speakerOrMic", "speakerAndMic"],
  },
  _calibrateSoundCheckShow: {
    name: "_calibrateSoundCheckShow",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "_calibrateSoundCheckShow (default TRUE) indicates whether to print sound calibration (and checking) results on the Sound Results page.",
  },
  _calibrateSoundCopyToDownloadsBool: {
    name: "_calibrateSoundCopyToDownloadsBool",
    availability: "now",
    type: "obsolete",
    default: "FALSE",
    explanation:
      "_calibrateSoundCopyToDownloadsBool is obsolete. Use _calibrateSoundSaveJSONBool instead.",
  },
  _calibrateSoundDialogEstimatedSec: {
    name: "_calibrateSoundDialogEstimatedSec",
    availability: "now",
    type: "numerical",
    default: "60",
    explanation:
      "_soundCalibrationDialogEstimatedSec (default 60) is used to predict for the user how long calibration will take. The prediction is the sum _soundCalibrationDialogEstimatedSec + soundCalibrationMeasurementEstimatedSec, where \nsoundCalibrationMeasurementEstimatedSec = 57 + 6 * _calibrateSoundBurstMLSVersions * _calibrateSoundBurstRepeats * _calibrateSoundBurstSec.",
  },
  _calibrateSoundFavoriteAuthors: {
    name: "_calibrateSoundFavoriteAuthors",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '🕑 _calibrateSoundFavoriteAuthors (default is empty) optionally provides a comma-separated list of email addresses of trusted authors of microphone calibrations in the EasyEyes calibration library. Each calibration is stamped with the authors\' email. The list is ordered so that preference diminishes farther down the list. An empty list indicates that you\'ll accept any calibration file in the EasyEyes library that matches your microphone model. If you list one or more emails, then the first is your top preference, and so on. At the end you can list "any", or not. "any" indicates that if your favorite authors have not calibrated this device, then you\'ll accept any available calibration.',
  },
  _calibrateSoundIIRPhase: {
    name: "_calibrateSoundIIRPhase",
    availability: "now",
    type: "categorical",
    default: "linear",
    explanation:
      '🕑 _calibrateSoundIIRPhase (default "linear") selects the algorithm used to compute the inverse impulse response from the impulse response. We implemented linear-phase first, and have just added minimum phase.',
    categories: ["linear", "minimum"],
  },
  _calibrateSoundIIRSec: {
    name: "_calibrateSoundIIRSec",
    availability: "now",
    type: "numerical",
    default: "0.3",
    explanation:
      "_calibrateSoundIIRSec (default 0.3) specifies the desired length of the inverse impulse response (IIR). Correcting low frequencies or a big room requires a long inverse impulse response. The speed of sound is 343 m/s, so travel time for sound to echo from a wall 10 m away is 20/343=58 ms. The default 0.3 s duration is long enough to correct for the initial echo from a wall 48 m away.\nCAUTION: The server may crash with values of _calibrateSoundIIRSec, greater than 1 sec. Proceed with caution.",
  },
  _calibrateSoundIRSec: {
    name: "_calibrateSoundIRSec",
    availability: "now",
    type: "numerical",
    default: "0.3",
    explanation:
      "_calibrateSoundIRSec (default 0.3) specifies the desired length of the impulse response (IR). Correcting low frequencies or a big room requires a long impulse response. The speed of sound is 343 m/s, so travel time for sound to echo from a wall 10 m away is 20/343=58 ms. The default 0.3 s duration is long enough to correct for the initial echo from a wall 48 m away.\nCAUTION: The server may crash with values of _calibrateSoundIRSec, greater than 1 sec. Proceed with caution.",
  },
  _calibrateSoundLimit: {
    name: "_calibrateSoundLimit",
    availability: "now",
    type: "numerical",
    default: "1.0",
    explanation:
      "_calibrateSoundLimit (default 1.0). If filtered MLS amplitude, i.e. max(abs(filteredMLS)), would exceed _calibrateSoundLimit, then EasyEyes attenuates the filteredMLS to make its amplitude equal to _calibrateSoundLimit.\nIF maxAbsFilteredMLS > _calibrateSoundLimit THEN\ngain = _calibrateSoundLimit/maxAbsFilteredMLS;\nELSE\ngain = 1;\nEND\nThe recorded microphone output will be scaled back up by dividing out the gain. _calibrateSoundLimit applies solely to filtered MLS; it does not affect the amplitude of the 1000 Hz sine or the unfiltered MLS. The attenuation is reported in the output parameter \ncalibrateSoundAttenuationXXXDb = -20*log10(gain)\nThe XXX part of the name depends on what we’re correcting:\ncalibrateSoundAttenuationSpeakerAndMicDb\ncalibrateSoundAttenuationLoudspeakerDb\ncalibrateSoundAttenuationMicrophoneDb\nThis value will always be positive, because this parameter only attenuates, never amplifies, i.e. the gain ≤ 1.",
  },
  _calibrateSoundMaxHz: {
    name: "_calibrateSoundMaxHz",
    availability: "now",
    type: "numerical",
    default: "10000",
    explanation:
      "_calibrateSoundMaxHz (default 10000) is the upper cut-off frequency applied to the inverse impulse response function. That's a low-pass filter. The cut off frequency is the break point at the meeting of straight lines to the transfer function expressed as dB gain vs. log frequency. Must be at least 1000. No low-pass filter is applied if _calibrateSoundMaxHz exceeds the Nyquist frequency _calibrateSoundSamplingDesiredHz/_calibrateSoundBurstDownsample.",
  },
  _calibrateSoundMinHz: {
    name: "_calibrateSoundMinHz",
    availability: "now",
    type: "numerical",
    default: "200",
    explanation:
      "_calibrateSoundMinHz (default 40) is the lower cut-off frequency applied to the inverse impulse response function. That's a high-pass filter. The cut off frequency is the break point at the meeting of straight lines to the transfer function expressed as dB gain vs. log frequency. Must be positive and no more than 999.5. No high-pass filter is applied if _calibrateSoundMinHz=0.",
  },
  _calibrateSoundPowerBinDesiredSec: {
    name: "_calibrateSoundPowerBinDesiredSec",
    availability: "now",
    type: "numerical",
    default: "0.1",
    explanation:
      "_calibrateSoundPowerBinDesiredSec (default 0.1) sets the bin size for estimation of power to plot power vs. time during each MLS recording, filtered or unfiltered. You want the bin size to be short enough to reveal changes over time, but long enough to average out the random variations of the MLS itself, so you get a smooth curve.",
  },
  _calibrateSoundPowerDbSDToleratedDb: {
    name: "_calibrateSoundPowerDbSDToleratedDb",
    availability: "now",
    type: "numerical",
    default: "100",
    explanation:
      '_calibrateSoundPowerDbSDToleratedDb (default 1) sets maximum for SD of power (in dB) during the "used" (i.e. analyzed) part of the recording, when recording filtered or unfiltered MLS. If the recording is rejected, then the recording begins again.',
  },
  _calibrateSoundSamplingDesiredBits: {
    name: "_calibrateSoundSamplingDesiredBits",
    availability: "now",
    type: "integer",
    default: "24",
    explanation:
      "_calibrateSoundSamplingDesiredBits (default 24) specifies the desired number of bits per sample in recording during sound calibration. Some devices allow selection of number of bits, e.g. the miniDSP UMIK-2 offers 24 or 32 bits. The UMIK-1 is fixed at 24 bits. \n⚠ The web audio calls to read the number of sampling bits are unreliable. When I use Apple's (reliable) Audio MIDI app to set the UMIK-2 bits to 32, the web audio API erroneously reports 16 bits, which is crazy, because the microphone offers only two bit depths: 24 and 32. Avoiding the unreliably web audio API for sampling bits, EasyEyes merely asks the participant to set the sampling bits, and trusts that it's done, since EasyEyes has no reliable way to check. Thus, EasyEyes reports only the \"desired\" bits per sample. In fact the setting is stable inside the UMIK-2 microphone, arrives from the factory in 24-bit mode, and we recommend leaving it at 24-bit mode. So there's not reason for it to ever change.\n❌ ⚠. 32-BIT MODE OF miniDSP UMIK-2 NOT RECOMMENDED. I've collected most of my data using the UMIK-2 set to 24 bits (at 48 kHz). Today (January 2025) I calibrated my loudspeaker more than six times with 24 and 32 bits, to compare. I focused on measured gain (in dB) at 1000 Hz, measured with sine or MLS.  I expected the change from 24 to 32 bits to preserve mean and slightly reduce the SD. To my surprise, with 32 bits, the mean measured gain is several dB lower, and the SD is much higher. Measuring with 1000 Hz sine, the mean gain dropped 2.3±0.3 dB, and the SD grew from 0.3 to 0.9 dB. Measuring with MLS, the mean gain at 1000 Hz dropped 5.2±1.4 dB, and the SD grew from 2.7 to 3.7 dB. I have not examined the actual 24- and 32-bit samples to try to figure out what the problem is. I made the measurements on only one of my UMIK-2 microphones (810-4281). However, more than a year ago, I noticed on several occasions that I get better data with 24 than with 32 bits. At the time, I thought this might be a data rate issue, but that's just a wild guess. One could test the data-rate hypothesis by redoing the comparison at a much lower sampling rate. 48 kHz is a very common sampling rate in audio work, so I'm surprised that 32 bits works poorly at this rate. It's also possible that the UMIK-2 works fine with apps, and that I'm hitting a limit unique to web apps. My computer is a MacBook Pro 14\" MacBookPro18,4 with M1 chip and 64 GB memory, which should perform well at high data rates. Thus, I'm unsure what the problem is, or how general it is, but I'm avoiding it by sticking to 24 bits, and I'm warning anyone who plans to use the UMIK-2 at 32 bits to first check that it works at least as well as at 24 bits.",
  },
  _calibrateSoundSamplingDesiredHz: {
    name: "_calibrateSoundSamplingDesiredHz",
    availability: "now",
    type: "numerical",
    default: "48000",
    explanation:
      "_calibrateSoundSamplingDesiredHz (default 48000) specifies the desired sampling rate of sound production and recording during sound calibration. Using the web API we can play with a sampling rate of up to 96000 Hz, but recording is often limited to a max of 48000 Hz. EasyEyes will pick the sampling rate nearest to this desired value that is available for both playing and recording.",
  },
  _calibrateSoundSaveCSVBool: {
    name: "_calibrateSoundSaveCSVBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "If _calibrateSoundSaveCSVBool === TRUE (default FALSE) then save the digital sound stimuli and sound recordings in CSV file(s) on Pavlovia for further analysis.",
  },
  _calibrateSoundSaveJSON: {
    name: "_calibrateSoundSaveJSON",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_calibrateSoundSaveJSON (default empty) specifies where ("local", "online", or both: "local, online") to save the 100 MB JSON sound-calibration results when EasyEyes reaches the Sound Calibration Results page. Currently the JSON is used solely for debugging, not to document the calibration chain.\n• local saves the JSON in the participant\'s Downloads folder\n• online saves the JSON in the experiment\'s Pavlovia repository.',
    categories: ["local", "online"],
  },
  _calibrateSoundSaveJSONBool: {
    name: "_calibrateSoundSaveJSONBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_calibrateSoundSaveJSONBool (default FALSE) requests saving of sound-calibration results in a large JSON file (50 to 100 MB) for the just-calibrated device when EasyEyes reaches the Sound Calibration Results page. Currently the JSON is saved to the participant's Download folder. Ideally it would instead be saved to the experiment's repository on Pavlovia.",
  },
  _calibrateSoundShowBool: {
    name: "_calibrateSoundShowBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "_calibrateSoundShowBool (default TRUE) controls display, on the Sound Calibration Results page, of the results of calibration and calibration check.",
  },
  _calibrateSoundShowParametersBool: {
    name: "_calibrateSoundShowParametersBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "_showSoundParametersBool (default TRUE) adds to every sound plot a formatted display of time stamps and several input parameters, including:\n_calibrateSoundBurstDb\n_calibrateSoundBurstSec\n_calibrateSoundBurstRepeats\n_calibrateSoundBurstMLSVersions\n_calibrateSoundlIRSec",
  },
  _calibrateSoundShowResultsBool: {
    name: "_calibrateSoundShowResultsBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "_calibrateSoundShowBool (default TRUE) requests displaying the plots and tables of the calibration results (and any checks controlled by _calibrateSoundCheck) immediately after each sound calibration (the loudspeaker and each microphone). These plots and tables are impressive, and might interest the participant. If that seems distracting, this switch allows the scientist to disable that display. Each sound calibration includes either or both sound level (at 1000 Hz) and frequency response (at all Hz), and is followed by display of results (if _calibrateSoundShowBool===TRUE) and the Sound Test page (if _calibrateSoundShowTestPageBool===TRUE).",
  },
  _calibrateSoundShowTestPageBool: {
    name: "_calibrateSoundShowTestPageBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_showSoundTestPageBool (default FALSE) displays the Sound Test Page button, after each sound calibration (including profile retrieval), to allow the user (typically the scientist) to pop up a control panel to check the accuracy of sound calibration. It can produce various sounds at arbitrary sound levels, typically while measuring with a calibrated USB microphone. \n\nLoudspeaker calibration can be done with a USB microphone or a phone, or by using a matching profile from our server. Each sound calibration (of the loudspeaker and each microphone) includes both sound level (at 1000 Hz) and frequency response (at all Hz). That is followed by:\n1. Display of results if _showSoundCalibrationResultsBool===TRUE.\n2. Sound Test Page button is shown if _showSoundTestPageBool===TRUE.",
  },
  _calibrateSoundSimulateLoudspeaker: {
    name: "_calibrateSoundSimulateLoudspeaker",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '_calibrateSoundSimulateLoudspeaker (default empty) allows you to provide the filename of a CSV or XLSX file specifying a loudspeaker-simulation filter for sound calibration (1000 Hz and All Hz). This and the similar microphone-simulation file are only used if the runtime user selects simulation (instead of device calibration).\n◦ The simulated output sound is the input sound convolved with both the loudspeaker and microphone impulse responses. You can only simulate both or neither. Either or both can approximate the identity (an impulse response with a 1 at time zero and 0.0001 at the next time step). EasyEyes crashes with a true delta function (an impulse response with just a 1 at time zero). Analyses that isolate the loudspeaker or microphone will convolve with the inverse impulse response (IIR) of the other transducer. \n◦ Like other EasyEyes resources (e.g. fonts), the filter file itself must be uploaded by the EasyEyes compiler. You can either include the filter file with the experiment spreadsheet in a zip file, or directly feed the filter file to the compiler before feeding the experiment spreadsheet to the compiler. When uploaded in a zip, the filter file is retained only for that experiment. When uploaded separately, it is retained forever in the "sound files" folder in your Pavlovia account\'s EasyEyesResources repository. \n◦ The filter file can be an impulse response function (i.e. gain vs. time) OR a frequency response (i.e. gain vs. frequency). The end of the filename (before the .csv or .xlsx extension) must be ".gainVTime" (indicating impuse response) or ".gainVFreq" (indicating frequency response). \n◦ The gainVFreq file format is the industry standard that we already use to save gain profiles. \n     * Each line of calibration data must have a frequency (in Hz) and a gain (in dB). A phase value (in deg) is optional.\n     * The (positive) frequencies can be arbitrary, but must increase from row to row. \n     * There must be at least two freq, gain data pairs.\n     * Only lines which begin with a number are loaded, others are ignored\n◦ The gainVTime file format is new. \n     * The first row is headings, which must be time and amplitude. \n     * The first column is time (sec) and the second column is amplitude. \n     * Currently the sampling frequency must equal _calibrateSoundSamplingDesiredHz, \n     * but later we may allow any sampling frequency and automatically resample at frequency _calibrateSoundSamplingDesiredHz. \n◦ COMPILER REQUIRES: Simulation files must be provided for both loudspeaker and microphone or neither. Filename (before extension .csv or .xlsx) must end in ".gainVTime" or ".gainVFreq".',
  },
  _calibrateSoundSimulateMicrophone: {
    name: "_calibrateSoundSimulateMicrophone",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "_calibrateSoundSimulateMicrophone (default empty) allows you to provide a CSV or XLSX file specifying a microphone simulation for sound calibration (1000 Hz and All Hz). This is like _calibrateSoundSimulateLoudspeaker, but for the microphone instead of the loudspeaker.",
  },
  _calibrateSoundSmoothMinBandwidthHz: {
    name: "_calibrateSoundSmoothMinBandwidthHz",
    availability: "now",
    type: "numerical",
    default: "200",
    explanation:
      '_calibrateSoundSmoothMinBandwidthHz (default 200) places a lower bound on the bandwidth (in Hz) of the intervals generated by _calibrateSoundSmoothOctaves, which specifies the bandwidth, in octaves, of the smoothing of the component spectrum output by Splitter (our deconvolver). Setting _calibrateSoundSmoothMinBandwidthHz=0 causes this parameter to have no effect. Simiarly, setting _calibrateSoundSmoothOctaves=0 requests no smoothing, regardless of _calibrateSoundSmoothMinBandwidthHz. EasyEyes smooths by replacing each power gain by the average power gain within the specified band, always centered, in log frequency, about the frequency whose gain we are smoothing. At any frequency f at which the bandwidth in Hz of the _calibrateSoundSmoothOctaves-octave interval is less than _calibrateSoundSmoothMinBandwidthHz, EasyEyes computes a new interval, still symmetric about f in log frequency, with linear bandwidth _calibrateSoundSmoothMinBandwidthHz.\n\nMATH. Suppose f is the trequeny (e.g. 100 Hz), f+a is the high end of the interval, w is the bandwidth (in Hz), and the interval is [f+a-w, f+a]. The interval must be symmetric in log frequency about the frequency f, i.e.\n(f+a)/f = f/(f+a-w)\nSolving for "a" requires solving a quadratic equation, so we get two values of "a".\na = {-(2*f-w) ± sqrt((2*f-w)^2+4*f*w)}/2\nThe final solution is the interval\n[f+a-w, f+a]\nWe consider only positive f, w, and a, which leaves only one solution\na = {-(2*f-w) + sqrt((2*f-w)^2+4*f*w)}/2\nThe ± became +. The other solution yields negative "a" and generates the corresponding interval in negative frequency. The power spectrum is symmetric in frequency so we safely ignore negative frequency.',
  },
  _calibrateSoundSmoothOctaves: {
    name: "_calibrateSoundSmoothOctaves",
    availability: "now",
    type: "numerical",
    default: "0.3333333",
    explanation:
      "_calibrateSoundSmoothOctaves (default 1/3) specifies the bandwidth, in octaves, of the smoothing of the component spectrum output by Splitter (our deconvolver). The value zero requests no smoothing. We smooth by replacing each power gain by the average power gain within the specified frequency interval, centered, in log frequency, about the frequency whose gain we are smoothing.\n\n At any frequency f at which the bandwidth in Hz of the _calibrateSoundSmoothOctaves-octave interval is less than _calibrateSoundSmoothMinBandwidthHz, EasyEyes computes a new interval, still symmetric about f in log frequency, with linear bandwidth _calibrateSoundSmoothMinBandwidthHz.\n\nSuppose that at frequeny f, the linear bandwidth (in Hz) of the _calibrateSoundSmoothOctaves-octave interval is less than w=_calibrateSoundSmoothMinBandwidthHz. Then compute\na = {-(2*f-w) + sqrt((2*f-w)^2+4*f*w)}/2\nThe new interval is [f+a-w, f+a].",
  },
  _calibrateSoundTaperSec: {
    name: "_calibrateSoundTaperSec",
    availability: "now",
    type: "numerical",
    default: "0.01",
    explanation:
      "_calibrateSoundTaperSec (default 0.01) smooths onset and offset of sounds (1000 kHz sine and MLS wide-band burst). The onset taper is sin**2, which begins at zero and ends at 1. The offset taper is cos**2, which begins at 1 and ends at zero. \n\nSounds provided by the scientist already have built-in taper. Sounds synthesized by EasyEyes should be tapered on and off. That means gradually increasing the volume from zero or back down to zero. The only degree of freedom is the taper time. We use 10 ms. That's 0.01 seconds.\n\nHere is MATLAB code to compute the onset and offset tapers. The beginning of the sound should be multiplied by the onset taper and the end of the sound should be multiplied by the offset taper.\n\n% COMPUTE ONSET AND OFFSET TAPERS\ntaperSec=0.010;\nclockFrequencyHz=96000;\ntaperTime=0:(1/clockFrequencyHz):taperSec;\nfrequency=1/(4*taperSec); % sin period is 4 times taper duration.\nonsetTaper=sin(2*pi*frequency*taperTime).^2;\noffsetTaper=cos(2*pi*frequency*taperTime).^2;\ntaperLength=length(taperTime);\n",
  },
  _calibrateSoundToleranceDB: {
    name: "_calibrateSoundToleranceDB",
    availability: "now",
    type: "numerical",
    default: "1.5",
    explanation:
      '🕑 _calibrateSoundToleranceDB (default 1.5) specified the maximum allowed RMS dB error in the fit to the data for sound levels in and out of the louspeaker, i.e. output sound dB SPL vs. digital input dB. If the RMS fitting error exceeds this toleranance then the calibration must be repeated.\n\nCopied from another not-implemented version: (default 1.5) is the maximum acceptable SD of the speaker correction test. If the SD is less than or equal to this level then the participant is congratulated and offered the "Proceed to experiment" button. If the SD exceeds this level then we don\'t congratulate, and we show a "Record again immediately" button.',
  },
  _calibrateSoundUMIK1Base_dB: {
    name: "_calibrateSoundUMIK1Base_dB",
    availability: "now",
    type: "numerical",
    default: "-124.8",
    explanation:
      "_calibrateSoundUMIK1Base_dB (default -124.8) is the base gain (dB power out re dB SPL power in) of a UMIK-1 microphone (miniDSP, Hong Kong). It is used solely to interpret the serial-number-indexed UMIK-1 calibration file available online from miniDSP. For example:\nhttps://www.minidsp.com/scripts/umikcal/umik90.php/7114754_90deg.txt\nThe microphone gain at frequency f_Hz is \ngain_dB(f_Hz) = _calibrateSoundUMIK1Base_dB + SensFactor_dB + sensitivity_dB(f_Hz)\nwhere gain_dB is the level increase of digital power level out (dB) from sound level in (dB SPL), SensFactor_dB is read from the header of the microphone's calibration file, e.g. it's -1.198 dB in this header\n\"Sens Factor =-1.198dB, SERNO: 7114754\", \nand sensitivity_dB is read from the calibration file's table, which has one row per frequency.\n     _calibrateSoundUMIK1Base_dB was determined for my two UMIK-1 microphones by using my 1 kHz 94 dB SPL Center 326 calibrator (which accepts any microphone tip diameter) and comparing with the free REW sound calibration app. The free REW app works with my two UMIK-1 mics and correctly reports my 1000 Hz 94 dB SPL Center 326 calibrator as 94 dB SPL (Z). So I worked out what value of _calibrateSoundUMIK1Base_dB makes EasyEyes consistent with REW. That empirical approach succeeds, and replaces my earlier unsuccessful attempt to follow miniDSP's and REW's hard-to-read and apparently inconsistent documentation of what the \"Sens Factor\" means.\n     NOTE: _calibrateSoundUMIK1Base_dB = -124.8 is much less than _calibrateSoundUMIK2Base_dB = -100.\n     Center 326 Calibrator (accepts any microphone diameter up to 0.5\")\nhttps://www.akulap.de/joomla/index.php/de/shop/product/view/7/1",
  },
  _calibrateSoundUMIK2Base_dB: {
    name: "_calibrateSoundUMIK2Base_dB",
    availability: "now",
    type: "numerical",
    default: "-100",
    explanation:
      '_calibrateSoundUMIK2Base_dB (default -100) is the base gain (dB power out re dB SPL power in) of a UMIK-2 microphone (miniDSP, Hong Kong). It is used solely to interpret the serial-number-indexed UMIK-2 calibration file available online from miniDSP. The microphone gain at frequency fHz is \ngain_dB = _calibrateSoundUMIK1Base_dB + SensFactor_dB + sensitivity_dB(fHz)\nwhere gain_dB is the level increase of digital power level out (in dB) from sound level in (in dB SPL), SensFactor_dB is read from the header of the microphone\'s calibration file, e.g. it\'s -10.58 in this header\n"Sens Factor =-10.58dB, AGain =18dB, SERNO: 8104281"., and sensitivity_dB is read from the table, which has one row per frequency. EasyEyes ignores "AGain" (see note below).\n     _calibrateSoundUMIK2Base_dB was determined by observing the free REW sound calibration app using my two UMIK-2 microphones recording my Reed R8090 Calibrator playing 1 kHz at 94 dB SPL. The free REW app works with my two UMIK-2 mics and correctly reports my 94±0.5 dB SPL Reed R8090 calibrator as either 93.7 or 94.2 dB SPL (Z). So I worked out what value of _calibrateSoundUMIK2Base_dB makes EasyEyes consistent with REW. The value of _calibrateSoundUMIK2Base_dB is approximately -100, which is consistent with a blog comment apparently by John Mulcahy, who seems to run REW. miniDSP speaks highly of Mulcahy and his REW software.\nhttps://www.hometheatershack.com/threads/understanding-spl-offset-umik-1.134857/post-1319361\nThat empirical approach succeeds, and replaces my earlier unsuccessful attempt to follow miniDSP\'s and REW\'s hard-to-read and apparently inconsistent documentation of what the "Sens Factor" means.\n     "AGain" NOTE: Supposedly the gain of the UMIK-2 can be changed (maybe by opening the mic and setting a switch or by software, e.g. REW or Apple\'s "Audio MIDI Setup App"), and I suppose that "AGain=18dB" in the calibration file refers to that setting. However, I never changed the gain, and EasyEyes ignores the "AGain" parameter when reading the miniDSP UMIK-2 calibration file. "AGain" does not appear in the UMIK-1 calibration file.\n     NOTE: _calibrateSoundUMIK1Base_dB=-124.8 is much less than _calibrateSoundUMIK2Base_dB=-100.\n',
  },
  _calibrateTimingNumberAndSecs: {
    name: "_calibrateTimingNumberAndSecs",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '🕑 _calibrateTimingNumberAndSecs accepts a text string containing an even number of comma-separated arguments, n1,s1,n2,s2, etc. Each pair of arguments n,s, requests that EasyEyes generate n intervals of duration s, where s is in seconds, and measure how long each interval actually was, in seconds. Save the results in the CSV file. Use one column per series. Name each column by the duration in sec, e.g. "timing0.15". The column length will be n. This should run on the Device Compatibility page, since its sole purpose is to work out the parameters of a compatibility test.',
  },
  _calibrateTrackDistance: {
    name: "_calibrateTrackDistance",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistance instead.",
  },
  _calibrateTrackDistanceAllowedRangeCm: {
    name: "_calibrateTrackDistanceAllowedRangeCm",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceAllowedRangeCm instead.",
  },
  _calibrateTrackDistanceAllowedRatio: {
    name: "_calibrateTrackDistanceAllowedRatio",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceAllowedRatio instead.",
  },
  _calibrateTrackDistanceAllowedRatioObject: {
    name: "_calibrateTrackDistanceAllowedRatioObject",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceAllowedRatioObject instead.",
  },
  _calibrateTrackDistanceBlindspotDiameterDeg: {
    name: "_calibrateTrackDistanceBlindspotDiameterDeg",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceBlindspotDiameterDeg instead.",
  },
  _calibrateTrackDistanceCameraToBlueLineCm: {
    name: "_calibrateTrackDistanceCameraToBlueLineCm",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceCameraToBlueLineCm instead.",
  },
  _calibrateTrackDistanceCameraToCardCm: {
    name: "_calibrateTrackDistanceCameraToCardCm",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceCameraToCardCm instead.",
  },
  _calibrateTrackDistanceCardTopVideoFraction: {
    name: "_calibrateTrackDistanceCardTopVideoFraction",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceCardTopVideoFraction instead.",
  },
  _calibrateTrackDistanceCenterYourEyesBool: {
    name: "_calibrateTrackDistanceCenterYourEyesBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceCenterYourEyesBool instead.",
  },
  _calibrateTrackDistanceCheckBool: {
    name: "_calibrateTrackDistanceCheckBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceCheckBool instead.",
  },
  _calibrateTrackDistanceCheckCm: {
    name: "_calibrateTrackDistanceCheckCm",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceCheckCm instead.",
  },
  _calibrateTrackDistanceChecking: {
    name: "_calibrateTrackDistanceChecking",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceChecking instead.",
  },
  _calibrateTrackDistanceCheckLengthCm: {
    name: "_calibrateTrackDistanceCheckLengthCm",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceCheckLengthCm instead.",
  },
  _calibrateTrackDistanceCheckLengthSDLogAllowed: {
    name: "_calibrateTrackDistanceCheckLengthSDLogAllowed",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceCheckLengthSDLogAllowed instead.",
  },
  _calibrateTrackDistanceCheckPoint: {
    name: "_calibrateTrackDistanceCheckPoint",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceCheckPoint instead.",
  },
  _calibrateTrackDistanceCheckSecs: {
    name: "_calibrateTrackDistanceCheckSecs",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceCheckSecs instead.",
  },
  _calibrateTrackDistanceGreenLineVideoFraction: {
    name: "_calibrateTrackDistanceGreenLineVideoFraction",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceGreenLineVideoFraction instead.",
  },
  _calibrateTrackDistanceIsCameraMinRes: {
    name: "_calibrateTrackDistanceIsCameraMinRes",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceIsCameraMinRes instead.",
  },
  _calibrateTrackDistanceIsCameraTopCenterBool: {
    name: "_calibrateTrackDistanceIsCameraTopCenterBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceIsCameraTopCenterBool instead.",
  },
  _calibrateTrackDistanceMinCm: {
    name: "_calibrateTrackDistanceMinCm",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceObjectMinMaxCm instead.",
  },
  _calibrateTrackDistanceObjectMinMaxCm: {
    name: "_calibrateTrackDistanceObjectMinMaxCm",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceObjectMinMaxCm instead.",
  },
  _calibrateTrackDistancePupil: {
    name: "_calibrateTrackDistancePupil",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistancePupil instead.",
  },
  _calibrateTrackDistanceQuadBaseRatio: {
    name: "_calibrateTrackDistanceQuadBaseRatio",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceQuadBaseRatio instead.",
  },
  _calibrateTrackDistanceShowLengthBool: {
    name: "_calibrateTrackDistanceShowLengthBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceShowLengthBool instead.",
  },
  _calibrateTrackDistanceSpotDebugBool: {
    name: "_calibrateTrackDistanceSpotDebugBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceSpotDebugBool instead.",
  },
  _calibrateTrackDistanceSpotMinMaxDeg: {
    name: "_calibrateTrackDistanceSpotMinMaxDeg",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceSpotMinMaxDeg instead.",
  },
  _calibrateTrackDistanceSpotXYDeg: {
    name: "_calibrateTrackDistanceSpotXYDeg",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceSpotXYDeg instead.",
  },
  _calibrateTrackDistanceTimes: {
    name: "_calibrateTrackDistanceTimes",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateDistanceTimes instead.",
  },
  _canMeasureMeters: {
    name: "_canMeasureMeters",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "_canMeasureMeters (default 0) states that the participant can measure distance (in meters) up to _canMeasureMeters. When greater than zero, this implies that the participant has a meter stick or metric tape measure. (Use _needMeasureMeters to demand a minimum measuring ability on the Device Compatibility page. In that case, you can use _canMeasureMeters to specify a default value for the participant's actual measuring capability, which the participant is asked to type in.)\n\nWe introduced this for development of multiple-monitor support. Initially we'll require a meter or two. Later, we'll use Google FaceMesh on each monitor's camera to minimize the need for manual measurement.",
  },
  _conditionEnabledBug: {
    name: "_conditionEnabledBug",
    availability: "now",
    type: "categorical",
    default: "normal",
    explanation:
      '_conditionEnabledBug (default "normal") accepts one of three values: normal, better, worse. Any column in the experiment spreadsheet is considered "disabled" if conditionEnabledBool=FALSE. Alas, some parts of EasyEyes fail to ignore disabled columns (i.e. conditions), which is a bug. The three possible values have these effects:\n• “normal”: Do nothing. \n• “better” or “worse”: The EasyEyes Compiler immediately replaces the content of the disabled columns (sparing only the block and conditionEnabledBool rows) with either an empty cell (if "better") or the word “DISABLED” (if "worse"). \n• better: The empty value is a work-around. It\'s meant to be innocuous, to minimize the effects of the failure to ignore the disabled columns. \n• worse: The "DISABLED" string helps to find bugs, to fix them. It\'s meant to break the bad code in the EasyEyes compiler that fails to ignore disabled columns. The unexpected "DISABLED" string is likely to provoke an error, hopefully with an error message including the word “DISABLED”.',
    categories: ["normal", "better", "worse"],
  },
  _consentForm: {
    name: "_consentForm",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "⭑ _consentForm (no default) is an optional brief description of the whole experiment that asks the participant to give informed consent (yes or no) before participating. Normally this form should be approved by your institution's Institutional Review Board (IRB) for human research. Many IRB's suggest also obtaining agreement with a final debrief form as well (see _debriefForm).",
  },
  _daisyChainURLAfter: {
    name: "_daisyChainURLAfter",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "🕑 _daisyChainURLAfter (no default) is a URL (with query parameters) that will add to a daisy chain of testing apps. This single or cascade of URLs will run after the EasyEyes study. Typically the last step is the completion page in Prolific (or MTurk), delivering a completion code that makes the participant eligible for payment. The study URL returned by EasyEyes will run the whole cascade, including _daisyChainURLBefore, the EasyEyes study, and _daisyChainURLAfter. Thanks to Becca Hirst at Open Science Tools for suggesting that EasyEyes should support Daisy chaining. \n\nIMPLEMENTATION: Currently the same EasyEyes study URL can be run locally on the scientist's computer or provided to Prolific. I hope we can maintain this convenience. Thus, if the participant came from Prolific, EasyEyes will cascade the link back to Prolific on top of whatever the scientist specifies in _daisyChainURLAfter. Thus, as now, EasyEyes will arrange that each Prolific participant eventually gets back to Prolific, with no Prolific link in the Experiment spreadsheet.",
  },
  _daisyChainURLBefore: {
    name: "_daisyChainURLBefore",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "_daisyChainURLBefore (no default) is a URL (with query parameters) that will begin a daisy chain of testing apps. This single or cascade of URLs will run first, before the EasyEyes study. The study URL returned by EasyEyes will run the whole cascade, including _daisyChainURLBefore, the EasyEyes study, and _daisyChainURLAfter. Thanks to Becca Hirst at Open Science Tools for suggesting that EasyEyes should support daisy chaining.",
  },
  _dateCreated: {
    name: "_dateCreated",
    availability: "now",
    type: "text",
    default: " ",
    explanation:
      "_dateCreated (no default) is the optional date of creation. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
  },
  _dateModified: {
    name: "_dateModified",
    availability: "now",
    type: "text",
    default: " ",
    explanation:
      "_dateModified (no default) is the optional date of latest modification. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
  },
  _debriefForm: {
    name: "_debriefForm",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "⭑ _debriefForm is the file name of your PDF (or plain-text Markdown with extension MD) debrief document in the folder EasyEyesResources/forms/ in your Pavlovia account. The EasyEyes.app/threshold page makes it easy to upload your debrief form(s) to that folder. The compiler will check that a file with this name is present in your EasyEyesResources/ConsentForms folder on Pavlovia. See consent in Glossary for information about testing minors and children. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
  },
  _debugBool: {
    name: "_debugBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_debugBool enables features that only the scientist should see. This includes extra calibration tests and buggy new features that are still under development.",
  },
  _invitePartingCommentsBool: {
    name: "_invitePartingCommentsBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 _invitePartingCommentsBool. At the end of the experiment, invite the participant to make parting comments. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
  },
  _language: {
    name: "_language",
    availability: "now",
    type: "categorical",
    default: "English",
    explanation:
      '⭑ _language (default "English") is the English name of the initial language of the experiment, e.g. English, Italian, French, or Arabic. EasyEyes currently supports 41 languages, and it would be easy to add more. All translation is done on the EasyEyes Google sheet for International Phrases :\nhttps://docs.google.com/spreadsheets/d/e/2PACX-1vRYca5lLyfoYjgL1aVktCftp9GCebMGuqELWCZ4lFYFQb0etqzRrQ1a51Bzhqo-YOJ4fduHq6wWhVtv/pubhtml\nThe translations by Google Translate (blue) and GPT_TRANSLATE (green) are imperfect, so in some cases we pasted in better translations for key phrases (white). If _languageSelectionByParticipantBool==TRUE then the initial Device Compatibility page allows the participant to choose any language for the rest of the experiment. Otherwise the language remains as set by _language.',
    categories: [
      "Arabic",
      "Armenian",
      "Bulgarian",
      "Chinese (Simplified)",
      "Chinese (Traditional)",
      "Croatian",
      "Czech",
      "Danish",
      "Dutch",
      "English",
      "Finnish",
      "French",
      "German",
      "Greek",
      "Hebrew",
      "Hindi",
      "Hungarian",
      "Icelandic",
      "Indonesian",
      "Italian",
      "Japanese",
      "Kannada",
      "Korean",
      "Lithuanian",
      "Malay",
      "Malayam",
      "Norwegian",
      "Persian",
      "Polish",
      "Portuguese",
      "Romanian",
      "Russian",
      "Serbian",
      "Spanish",
      "Sudanese",
      "Swahili",
      "Swedish",
      "Tagalog",
      "Turkish",
      "Urdu",
    ],
  },
  _languageSelectionByParticipantBool: {
    name: "_languageSelectionByParticipantBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_languageSelectionByParticipantBool (default FALSE), when TRUE, tell the Device Compatibility page to offer the participant a pull-down menu to select the language for the rest of the experiment. The experiment always begins with the language specified by _language, and the participant's option to change language appears only on the Device Compatibility page and if  _languageSelectionByParticipantBool=TRUE. The participant selects among the native names of the languages, e.g. English, Deutsch, عربي. EasyEyes currently offers 77 languages, and it would be easy to add more. If there's demand, we could add another parameter to allow you to specify the list of languages to offer to the participant. (The compiler would issue an error if any listed language is missing.)",
  },
  _logFontBool: {
    name: "_logFontBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_logFontBool (default FALSE), when TRUE, records several parameters (block, conditionName, and trial, plus font rendering details) in the FormSpree server for each font-rendering for stimulus generation, which, for the crowding task, occurs at least once per trial. Initially this will apply to just the crowding task. This is meant to identify font-rendering crashes. More generally, after any kind of crash, we don't get a CSV results file, but the FormSpree record will identify which trial, conditionName, and block crashed. Before each text rendering, EasyEyes will save the parameters relevant to the rendering request on FormSpree. If there is a crash then the last saved value may represent the request that crashed.\n\nThe data saved in FormSpree can be exampined directly from the \"FormSpree\" menu with\nhttp://easyeyes.app\nAnalyze >> FormSpree\n\nMore conveniently, the Shiny's Sessions page displays one session per row, integrating data from: any Pavlovia CSV results files (one per session), and any Prolific demographic file, and the FormSpree data, all linked by the Pavlovia session ID.\nAnalyze >> Sessions\nSeveral columns are devoted to values from FormSpree.\n\nThere are nine parameters. Eight describe the request:\nfont the parameter\nfontPadding the parameter\nfontPt the font size in pt\nfontMaxPx the parameter\nfontString the string that will be drawn\nblock the parameter\nconditionName the parameter\ntrial the parameter\nThe ninth parameter,\nfontLatencySec will be initialized as NAN.\nThe nine parameters are saved to FormSpree BEFORE rendering.\n\nAFTER rendering, the value of fontLatencySec is updated with the measured rendering time (sec). The NAN is replaced by the measured value. After a crash, seeing fontLatencySec===NAN indicates that the rendering did not finish. It's a smoking gun.\n\nEach EasyEyes experiment session will provide the nine parameters to FormSpree hundreds of times. We are primarily interested in the last set of six parameters saved, which Shiny will display in its one-session-per-row console. Shiny will also use the complete data set to produce graphs of latency vs size.FormSpree will save the nine parameters in nine arrays, and add a new element to each array each time EasyEyes sends the 9 parameters by bumping the index of all the arrays. Sending fontLatencySec will NOT bump the index, because it's an update that will be poked into the last set saved.\n\n⚠ Our contract with FormSpree entitles us to only 20,000 log entries per month, including all EasyEyes users. So please only use this when you need it.\n⚠ It's under investigation, but at the moment we suspect that _logFontBool and/or _logParticipantBool adds 0.2 s to 1 s to the target duration. Check pilot data before enabling this during serious data collection.\nAlso see _logParticipantsBool.",
  },
  _logParticipantsBool: {
    name: "_logParticipantsBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "⚠ _logParticipantsBool (default FALSE), when TRUE, record each participant in the FormSpree server. The data saved there survive a crash of the session. We use this to investigate discrepancies between the number of studies reported by Prolific and Pavlovia.  The results are automatically included by Shiny, so it effortlessly makes the Shiny display more complete. \n⚠ Our contract with FormSpree entitles us to only 20,000 log entries per month, including all EasyEyes users. So please only use this when you need it.\n⚠ It's under investigation, but at the moment we suspect that _logFontBool and/or _logParticipantBool adds 0.2 s to 1 s to the target duration. Check pilot data before enabling this during serious data collection.\nAlso see _logFontBool.",
  },
  _logTrialsBool: {
    name: "_logTrialsBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 _logTrialsBool (default FALSE), if TRUE, at the beginning of each trial, EasyEyes saves three parameters and unix time to FormSpree:\nblock, conditionName, trial, unixTime\nAfter a crash, we don't get a CSV results file, but the FormSpree record identifies which trial, condition, and block crashed. The Shiny console displayed by Analyze, incorporates any reports from Prolific, Pavlovia, and FormSpree to show one row per session, including block, conditionName, and trial.\n\nEach EasyEyes experiment session will provide the parameters to FormSpree hundreds of times. We are primarily interested in the last set of parameters saved, which Shiny will display in its one-session-per-row console. FormSpree will save the four values in four arrays, adding a new element to each array each time EasyEyes sends a new set.\n\n⚠ Our contract with FormSpree entitles us to only 20,000 log entries per month, including all EasyEyes users. So please only use this when you need it.\n\nAlso see _logFontBool, _logParticipantsBool.",
  },
  _needBrowser: {
    name: "_needBrowser",
    availability: "now",
    type: "multicategorical",
    default: "Chrome, Edge",
    explanation:
      "⭑ _needBrowser (default Chrome) is a comma-separated list either of compatible browsers or of incompatible browsers. The list can be 'all', or just compatible browsers by name, or just incompatible browsers each preceded by \"not\". When compatibles are listed, anything not listed is deemed incompatible. When incompatibles are listed, anything not listed is deemed compatible. Before asking for consent, if the participant's device is incompatible, the Device Compatibility page reject the participant's device by issuing a fatal explanatory error message to the participant (asking the Prolific participant to \"return\" this study), which ends the session (with no pay). \nTO THE SCIENTIST RECRUITING ONLINE: After compiling your experiment, copy the Device Compatibility statement from the Compiler page into your _online2Description to inform online participants in advance of all Device Compatibility requirements. Prolific requires this, and, in any case, it's a good working practice.\nBROWSER NOTES\nTor is incompatible with sound calibration because it does not allow any localhost to run. (Tor is all about hiding your identity and local open ports can fingerprint the user.) Thanks to Nati Tsegaye.\nSafari, when running on a Macintosh, by default, uses the camera of a connected iPhone, which is a problem when trying to use the screen camera with Google Facemesh. We aim to fix this by allowing the user to select the camera, overriding the default.",
    categories: [
      "all",
      "Chrome",
      "Chrome Mobile",
      "Safari",
      "Firefox",
      "Opera",
      "Edge",
      "Chromium",
      "Arc",
      "Tor",
      "Duckduckgo",
      "Brave",
      "Vivaldi",
      "Midori",
      "SamsungInternet",
      "UCBrowser",
      "Android",
      "QQBrowser",
      "Instabridge",
      "WhaleBrowser",
      "Puffin",
      "YandexBrowser",
      "EdgeLegacy",
      "CocCoc",
      "notChrome",
      "notSafari",
      "notFirefox",
      "notOpera",
      "notEdge",
      "notChromium",
      "notTor",
      "notDuckduckgo",
      "notBrave",
      "notVivaldi",
      "notMidori",
      "notSamsungInternet",
      "notUCBrowser",
      "notAndroid",
      "notFirefox",
      "notQQBrowser",
      "notInstabridge",
      "notWhaleBrowser",
      "notPuffin",
      "notYandexBrowser",
      "notEdgeLegacy",
      "notEdge",
      "notCocCoc",
    ],
  },
  _needBrowserActualName: {
    name: "_needBrowserActualName",
    availability: "now",
    type: "categorical",
    default: "allowSpoofing",
    explanation:
      '🕑 _needBrowserActualName (default allowSpoofing) specifies what measures to take to overcome spoofing to accurately identify the browser. The _needBrowserActualName setting affects which browser name the _needBrowser test is applied to. Currently, the Chrome and Opera browsers correctly identify themselves as "Chrome" and "Opera", but Vivaldi and Arc spoof, to identify themselves as "Chrome". They do this to enhance compatibility of these less popular browsers. _needBrowserActualName offers three ways to handle spoofing:\n• allowSpoofing (default). Accept whatever name the browser offers.\n• overcomeSpoofing. Use diagnostic code to identify the browser. Diagnostic features change, so this may be unreliable.\n• writeIn. Display the name produced by our diagnostic code, and allow the participant to type in the correct browser name, which, in macOS, is visible in the upper left corner of the screen. Beware that many participants are anxious to participate, so some might type in whatever browser name they think we want. ',
    categories: ["allowSpoofing", "overcomeSpoofing", "writeIn"],
  },
  _needBrowserVersionMinimum: {
    name: "_needBrowserVersionMinimum",
    availability: "now",
    type: "integer",
    default: "0",
    explanation:
      "_needBrowserVersionMinimum (default 0) is the needed minimum integer version number of the browser. \nTO THE SCIENTIST RECRUITING ONLINE: After compiling your experiment, copy the Device Compatibility statement from the Compiler page into your _online2Description to inform online participants in advance of all Device Compatibility requirements. Prolific requires this, and, in any case, it's a good working practice.",
  },
  _needCalibratedSound: {
    name: "_needCalibratedSound",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_needCalibratedSound (default empty) allows scientist to require a "microphone" (in smartphone), or "loudspeaker" (in computer), or either ("microphone, loudspeaker") whose model is in the EasyEyes profile library. If both are listed, EasyEyes tries first to match the microphone, because we expect the microphone profiles to be more reliable.\nCurrently, this parameter is ignored if _calibrateMicrophonesBool==TRUE. In the future, when _calibrateMicrophonesBool==TRUE, the only acceptable microphone match will be a UMIK-1 or UMIK-2 microphone, and the only acceptable loudspeaker match will be an exact match, for this particular computer. ',
    categories: ["microphone", "loudspeaker"],
  },
  _needCameraBool: {
    name: "_needCameraBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "🕑 _needCameraBool (default TRUE) tells EasyEyes whether to require presence of a camera. We use the camera to track viewing distance (and gaze) so most vision experiments need it. Use of the camera requires permission of the participant, and some will refuse. Before asking, we show an assurance that we won't retain the photos themselves and will retain only the position and orientation of the eyes (which includes \"head\" position--i.e. midpoint between eyes-- and pupillary distance). Currently we get permission in the Remote Calibrator, but it would be better to do that in the earlier Device Compatibility page so people don't waste time calibrating if their camera is broken, or EasyEyes can't find it, or they won't give permission. (At least one participant reported via Prolific that EasyEyes couldn't find their camera.) \nTO THE SCIENTIST RECRUITING ONLINE: After compiling your experiment, copy the Device Compatibility statement from the Compiler page into your _online2Description to inform online participants in advance of all compatibility requirements. Prolific requires this, and, in any case, it's a good practice.",
  },
  _needColorimeterBool: {
    name: "_needColorimeterBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 _needColorimeterBool (default FALSE) requires a Cambridge Research Systems Ltd. ColorCAL Colorimeter attached to a USB port. \nhttps://www.crsltd.com/tools-for-vision-science/light-measurement-display-calibation/colorcal-mkii-colorimeter/",
  },
  _needComputerSurveyBool: {
    name: "_needComputerSurveyBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_needComputerSurveyBool (default TRUE) if TRUE then the Device Compatibility page asks the participant to identify the computer's model name and number, and proceeds. In a typical use, there is no calibration and no other data collection.",
  },
  _needCookiesBool: {
    name: "_needCookiesBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "🕑 _needCookiesBool (default TRUE) requires cookie support in the browser. Most browsers allow the user to block or enable cookies. Some parts of EasyEyes (e.g. _participantIDPutBool) use cookies, and won't run if cookies are blocked. If _needCookiesBool==TRUE and cookies are blocked, the Device Compatibility page alerts the participant, who is allowed to proceed if they enable cookies. Otherwise they cannot proceed beyond the Device Compatibility page, and they are asked to return the study to Prolific.",
  },
  _needDeviceType: {
    name: "_needDeviceType",
    availability: "now",
    type: "multicategorical",
    default: "desktop",
    explanation:
      '⭑ _needDeviceType (default desktop) is a comma-separated list of compatible devices types. Note that "desktop" includes laptops. Anything not listed is deemed incompatible. If incompatible, we reject by issuing a fatal explanatory error message to the participant (asking Prolific participants to "return" this study), which ends the session before asking for consent. NOTE: The value "all" is not yet implemented. \nTO THE SCIENTIST RECRUITING ONLINE: After compiling your experiment, copy the Device Compatibility statement from the Compiler page into your _online2Description to inform online participants in advance of all Device Compatibility requirements. Prolific requires this, and, in any case, it\'s a good working practice.\nIMPLEMENTATION: If using Prolific, EasyEyes tells it to pre-screen, only allowing participants with the requested device type(s). In any case, EasyEyes also screens out participants who don\'t meet the requested device type(s). Our algorithm was written by ChatGPT to use modern calls, if available.',
    categories: ["desktop", "tablet", "mobile"],
  },
  _needDisplay: {
    name: "_needDisplay",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      "🕑 _needDisplay (default empty) demands support (on the Device Compatibility page) for key display features:\nHDRMovie: Browser must support HDR movies.\ntenBit: Display must support 10-bit imaging. https://trello.com/c/VxGHyxDa\ncodec: I'm not sure whether we should explicitly list the codecs we support or just write \"codec\" and have EasyEyes check that the browser supports at least one of the video codecs supported by EasyEyes. EasyEyes's list of compatible codecs may grow. \nAfter compiling your experiment, copy the Device Compatibility statement from the Compiler page into your _online2Description to satisfy Prolific's rule that all Device Compatibility requirements be declared in the study's Description.\n\nNOTE ON CODEC COMPATIBILITY. Note that even if the browser supports HDR movies, it typically is compatible with only one video codec, which we might not support. Currently we support two video codecs, one supported by Chrome, the other by Safari. Currently we manage this compatibility by specifying the compatible browsers. To keep up with browsers that add support for more codecs, it might be better to specify compatible codecs. However, when we reject a participant's browser, it will be more helpful to tell the participant which browsers we support, rather than which codecs, because hardly anyone knows which browsers support any given codec. Ideally, EasyEyes would read an online table of which codecs each browsers supports to offer the participant an up-to-date list of compatible browsers. We can support any codec that FFMPEG supports, but it may require a bit of code that is custom to the codec.",
    categories: ["hdrMovie", "tenBit"],
  },
  _needDoNotDisturbBool: {
    name: "_needDoNotDisturbBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 _needDoNotDisturbBool (default FALSE) if TRUE and the Device Compatibility page gives approval (by showing the ✅) then EasyEyes displays a pop-up with a message (below) and an Ok button. When the button is clicked, the pop-up disappears. That’s it. The pop-up merely tells the participant to enable their computer's Do Not Disturb mode. We have no way of confirming that they did it. \n\nIn principle, it'd be great to prevent interruptions, but in practice, on my MacBook Pro, I haven't noticed any improvement from setting \"Do not disturb\". \n\nRC_DoNotDisturb\nDO NOT DISTURB. Avoid unwanted sounds and interruption of this study.\n\n On a Macintosh, near the right end of the menu bar, click the Control Center icon 🟰. Click “Focus”. Click “Do Not Disturb”.\n\n⊞ In Windows, select Start  > Settings  > System  > Notifications. Turn on “Do not disturb”.",
  },
  _needIncognitoBool: {
    name: "_needIncognitoBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 _needIncognitoBool (default FALSE) requires that the browser window be in \"incognito\" mode. Alas Safari always returns FALSE, so this will reject Safari. (When we reject for not having incognito, many participants will try again, by starting again in a new incognito window. They need to know that EasyEyes can't detect incognito in Safari.) In general, EasyEyes includes only participants whose equipment is known to meet the scientist's stated needs (by _needXXX statements in the experiment spreadsheet). \nhttps://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/extension/inIncognitoContext",
  },
  _needMeasureMeters: {
    name: "_needMeasureMeters",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "_needMeasureMeters (default 0) requires that the participant be able to measure distance (in meters) up to _needMeasureMeters. When greater than zero, this requires that the participant have a meter stick or metric tape measure and type in the maximum length, in meters, that they can measure. (Use _canMeasureMeters to specify a default value for the participant's actual measuring capability, so it doesn't need to be typed on each run.)\n\nWe introduced this for development of multiple-monitor support. Initially we'll require a meter or two. Later, we'll use Google FaceMesh on each monitor's camera to minimize the need for manual measurement.",
  },
  _needMemoryGB: {
    name: "_needMemoryGB",
    availability: "now",
    type: "numerical",
    default: "8",
    explanation:
      '_needMemoryGB (default 8) requires that a participant computer running Windows or macOS have at least this many GB of memory, as reported by navigator.deviceMemory, but the requirement is halved for any other OS. We currently have memory-related issues only on Windows, so, if the browser, like Safari and Firefox, does not support navigator.deviceMemory, then we reject Windows, and accept any other OS. (When the Requiremenst page rejects a Windows computer because the browser doesn\'t support navigator.deviceMemory, the participant is invited to switch to Chrome or Edge, which do support it.)\n\n⚠ CAUTION: Setting _needMemoryGB>8 will reject all computers. That\'s because, to preserve privacy, the value returned by navigator.deviceMemory is rounded to the nearest discrete level: 0.25, 0.5, 1, 2, 4, 8. Thus, for a MacBook Pro with 64 GB, it returns 8.\n\nnavigator.deviceMemory is supported by the browsers Chrome, Edge, Opera, and Samsung, but is not supported by Safari and Firefox.\nhttps://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory\n\nI asked ChatGPT to estimate the mean amounts of memory under several OSes: \n        •        Windows 10: Average 8 GB, with a wide range due to diverse user requirements.\n        •        macOS: Average 16 GB, following Apple’s recent standardization.\n        •        ChromeOS: Average 4 to 8 GB, reflecting the lightweight nature of Chromebooks.\n        •        Linux: Average 4 GB, considering the prevalence of mid-range systems.\nBased on results from 7 Windows computers, requiring 8 GB may achieve quick rendering of large fonts for Windows. macOS computers have been sold with at least 8GB for many years. It appears that ChromeOS and Linux use memory more efficiently, so we require just _needMemoryGB/2 under any other OS. \n\nDevice Compatibility statement FOR DEVICE COMPATIBILITY PAGE\n111 is needed memory, the value _needMemoryGB scaled appropriately for the OS.\n222 is memory reported by navigator.deviceMemory\n\n1. If the browser supports navigator.deviceMemory, then either accept with this:\nEE_needMemoryEnough\n"The 111-GB memory requirement is satisfied by having 222 GB."\n2. or reject with this:\nEE_needMemoryNotEnough\n"❌ At least 111 GB of memory are required, but only 222 GB are present."\n3. If the browser doesn\'t support navigator.deviceMemory, and OS is is not Windows then approve and say nothing.  \n4. If the browser doesn\'t support navigator.deviceMemory, and OS is Windows, then reject and say:\nEE_needBrowserSupportOfMemoryAPI\n"❌ Browser support of "navigator.deviceMemory" is required. Try the Chrome or Edge browser."\n\nDevice Compatibility statement FOR DESCRIPTION\n111 is  _needMemoryGB\n222 is  _needMemoryGB/2\nEE_needMemory\n”This study needs a computer with at least 111 GB of memory under Windows or macOS, or 222 GB under any other operating system.”',
  },
  _needOperatingSystem: {
    name: "_needOperatingSystem",
    availability: "now",
    type: "multicategorical",
    default: "all",
    explanation:
      "⭑ _needOperatingSystem (default all) is a comma-separated list either of compatible or incompatible operating systems. The list can be 'all', or compatible OSes by name, or incompatible OSes each preceded by \"not\". No mixing allowed. The default is 'all'. If compatible, then anything not listed is deemed incompatible. If incompatible, then anything not listed is deemed compatible. If not compatible, the Device Compatibility page rejects by issuing a fatal explanatory error message to the participant (asking Prolific participants to \"return\" this study), which ends the session before asking for consent. After compiling your experiment, copy the Device Compatibility statement from the EasyEyes compiler page into your _online2Description to satisfy Prolific's rule that all Device Compatibility requirements be declared in the study's Description.",
    categories: [
      "all",
      "macOS",
      "Windows",
      "ChromeOS",
      "ChromiumOS",
      "AndroidOS",
      "iOS",
      "SamsungOS",
      "KaiOS",
      "NokiaOS",
      "Series40OS",
      "Linux",
      "Ubuntu",
      "FreeBSD",
      "Debian",
      "Fedora",
      "Solaris",
      "CentOS",
      "Deepin",
      "notmacOS",
      "notWindows",
      "notChromeOS",
      "notChromiumOS",
      "notAndroidOS",
      "notiOS",
      "notSamsungOS",
      "notKaiOS",
      "notNokiaOS",
      "notSeries40OS",
      "notLinux",
      "notUbuntu",
      "notFreeBSD",
      "notDebian",
      "notFedora",
      "notSolaris",
      "notCentOS",
      "notDeepin",
    ],
  },
  _needPhoneBrowser: {
    name: "_needPhoneBrowser",
    availability: "now",
    type: "text",
    default: "Safari, 12, Chrome, 131",
    explanation:
      '_needPhoneBrowser (default "Safari, 12, Chrome, 131"), for sound calibration, specifies which browsers on the attached smartphone our Listener page supports. Each browser name is followed by the minimum integer version number. Each entry after the first browser name is separated by a comma and optional space. Allowed browsers are: Chrome, Safari, Edge, Firefox, Samsung Internet, DuckDuckGo, MIUI, Oppo.\nNOTE: The format and browser names will be enforced by the compiler.\nNOTE: I abbreviated Google Chrome" and "Microsoft Edge" by stripping the manufacturer. \nNOTE: Don\'t strip "Samsung Internet".\nNOTE. I abbreviated "MIUI Browser", "Oppo Browser" by stripping the word "Browser".\nNOTE: So far, we\'ve only tested Safari. Edge is usually very similar to Chrome. DuckDuckGo enhances security by adding many restrictsions, which might prevent our Listener page from working as expected.',
  },
  _needPopupsBool: {
    name: "_needPopupsBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "🕑 _needPopupsBool (default TRUE) requires pop-up window support in the browser. Most browsers allow the user to block or enable pop-ups. Some parts of EasyEyes (e.g. Remote Calibrator and sound calibration) use pop-ups extensively, and won't run if pop-ups are blocked. If _needPopupsBool==TRUE and pop-ups are blocked, the participant is alerted and is allowed to proceed if they enable pop-ups. Otherwise they cannot proceed beyond the Device Compatibility page, and they are asked to return the study to Prolific.",
  },
  _needProcessorCoresMinimum: {
    name: "_needProcessorCoresMinimum",
    availability: "now",
    type: "integer",
    default: "6",
    explanation:
      "_needProcessorCoresMinimum (default 6) tries to exclude slow computers. The number of cores is a positive integer, also called \"hardwareConcurrency,\" whose value is returned by all modern browsers except Safari. When the API is not supported (i.e. on Safari), we estimate its value by doubling and rounding the rate (in MHz) at which the computer generates random numbers. That conversion is based on a correlation that we've observed between hardwareConcurrency and  computeRandomMHz. https://en.wikipedia.org/wiki/Multi-core_processor\n\nUPDATE. January 11, 2025. We just improved stimulus generation for acuity and crowding to pre-render the stimulus during the fixation task with opacity 0 and then show the target by merely setting its opacity to 1. This has greatly improved timing, i.e. targetMeasuredDurationSec and targetMeasuredLatenessSec. We also added a new parameter _needMemoryGB, which we recommend setting to 8. That will exclude Windows 10 computers that have only 4 GB. A quick test of timing with unconstrained cores shows that macOS produces bad latency and duration if it has only 2 or 4 cores. So, the default has been increased to 6.\n\nHISTORY. We were experiencing excess targetMeasuredDurationSec and targetMeasuredLatenessSec. We assumed that the excess time was a result of the computer being slow. After months of research, we conclude, instead, that the excess time is spent on heap allocation. Huge letters require allocating 100 or 200 MB of heap space for rendering, and heap allocation takes a time proportional to the allocation size, on the order of 100 ms for 100 MB. Furthermore, the amount of time needed to allocate that much heap space is strongly dependent on the amount of memory the computer has. Excluding Windows 10 computers with only 4 GB helps a lot.\n\nUsing Prolific, our experiments are occasionally invoked on slow computers that produce late and prolonged stimuli. EasyEyes measures lateness and duration and reports them as targetMeasuredLatenessSec and targetMeasuredDurationSec in the CSV file. We find that setting _needProcessorCoresMinimum=6 nearly eliminated bad timing, but it also eliminates quite a few computers with good timing. You may prefer to set _needProcessorCoresMinimum lower, e.g. 4, to include most computers, and weed out the slow computers later, during data analysis, based on mean and SD of  targetMeasuredLatenessSec and targetMeasuredDurationSec. \nNOTE: To make your computer harder to track, the Chrome extension DuckDuckGo spoofs the number of cores to 2. Any experiment requiring 3 or more cores will reject any participant whose computer spoofs having 2 cores. \nHIGH REJECTION RATE: As of January 2024, our experiments requiring 6 cores have good timing but their Device Compatibility page rejects about as many participants as it accept. EasyEyes records the reason for rejection\n\nTO THE SCIENTIST RECRUITING ONLINE: After compiling your experiment, copy the Device Compatibility statement from the EasyEyes compiler page into your spreadsheet's _online2Description to inform online participants in advance of all Device Compatibility requirements. Prolific requires this, and, in any case, it's a good working practice.",
  },
  _needRecordingControls: {
    name: "_needRecordingControls",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      "🕑 _needRecordingControls (default empty) is for sound recording. It's multicategorical and allows the scientist to demand control of echoCancellation, autoGainControl, and noiseSuppression. Not all browsers offer such control. We need to turn these features off for sound calibration because they seriously distort the recording. In principle we'd be happy with a rudimentary browser that didn't do these things, and thus wouldn't offer control over them, but in practice the industry norm is to do these things by default, so the only way to be sure a feature is off is for the browser to report control, and then to use that control to disable the feature. Our calibration code always tries to turn the features off, but some browsers will ignore the request. This need statement admits only browsers that support the requests.",
    categories: ["echoCancellation", "autoGainControl", "noiseSuppression"],
  },
  _needScreenSizeMinimumPx: {
    name: "_needScreenSizeMinimumPx",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation:
      '🕑 _needScreenSizeMinimumPx is just a placeholder in this Glossary. Any attempt to use it in your experiment will be rejected by the compiler as "obsolete". In each block, needScreenHeightDeg and needScreenWidthDeg are each combined with needTargetAsSmallAsDeg to compute a needed screen resolution, which is enforced in the initial Device Compatibility page. ',
  },
  _needSmartphoneCheckBool: {
    name: "_needSmartphoneCheckBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "❌ _needSmartphoneCheckBool (default FALSE) if TRUE then the Device Compatibility page uses a QR code to check any needed phone. Once this works reliably then _needSmartphoneCheckBool will always be TRUE. \n\nI'M NOT SURE WE EVER NEED THIS. WE USE A PHONE FOR THREE THINGS:\nkeypad (controlled by needEasyEyesKeypadBeyondCm)\nsurvey (controlled by _needSmartphoneSurveyBool)\nmicrophone, for sound calibration (controlled by relevant code).\nI THINK _needSmartphoneCheckBool WORKS, BUT I CAN'T THINK OF A SITUATION IN WHICH IT HELPS.\n\nAs of May 2024, I set this FALSE when I set needEasyEyesKeypadBeyondCm=50. It's my impression that when combined, _needSmartphoneCheckBool and needEasyEyesKeypadBeyondCm frequently lose the phone connection. However, we plan to serve all the QR connects with one universal subroutine, which should eliminate all flakey interactions between flavors of connection.",
  },
  _needSmartphoneSurveyBool: {
    name: "_needSmartphoneSurveyBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_needSmartphoneSurveyBool (default FALSE) if TRUE then the Device Compatibility page uses a QR code (or link typed into browser) to identify a smartphone. EasyEyes saves the data, and proceeds. In a typical use, there is no calibration and no other data collection.\nIf _needSmartphoneSurveyBool then show RC_inDescription, followed by a space, followed by RC_surveyPhoneSurvey:\n”This study is surveying smartphones.”",
  },
  _needSmartphoneTooBool: {
    name: "_needSmartphoneTooBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 If TRUE, _needSmartphoneTooBool (default FALSE) asks the participant if, in addition to whatever device is running the experiment, they have a smartphone available for use by EasyEyes (either for sound calibration or remote keypad). EasyEyes just asks, without verifying. Verification will happen later, when the QR code is shown to recruit the smartphone. \n[We have not yet considered, in the case of an experiment running on a smartphone, whether we could use its built-in mic to calibrate its loudspeaker, eliminating the need for a second device.] \nAfter compiling your experiment, copy the Device Compatibility statement from the Compiler page into your _online2Description to satisfy Prolific's rule that all Device Compatibility requirements be declared in the study's Description.",
  },
  _needSoundOutput: {
    name: "_needSoundOutput",
    availability: "now",
    type: "categorical",
    default: "",
    explanation:
      '🕑 _needSoundOutput (no default) complements needSoundOutput, which is for blocks, to allow the scientist to indicate whether setting up for the experiment (e.g. sound calibration) requires either headphones (including earbuds) or speakers. Think of the processing before block 1 as "block 0". Set _needSoundOutput for block 0 in the same way that you set needSoundOutput for other blocks. \nSee needSoundOutput.',
    categories: ["headphones", "loudspeakers"],
  },
  _needTimingToleranceSec: {
    name: "_needTimingToleranceSec",
    availability: "now",
    type: "numerical",
    default: "0.05",
    explanation:
      "🕑 _needTimingToleranceSec (default 0.05) is the largest acceptable RMS error in generating a 0.15-second interval. We suspect that this depends on both the CPU speed and the number of processes being timeshared, and thus can be reduced by closing other browser windows, and quitting other apps. In practice, we discovered that requiring 6 cpu cores (_needProcessorCoresMinimum) has eliminated bad timing. (Currently our experiments reject about as many participants as they accept. I suspect this is due to the cores requirement. We currently have no data on participants rejected by the Device Compatibility page. We're changing that to get data on the rejected computers, so we can figure out why they're rejected.) We prefer that solution because the participant can understand in a study description that we need a certain number of cores (and can check themselves), whereas they can't check timing themselves. We try to minimize the number of participants that we turn away at the Nees page (to not waste their time, and to avoid creating a situation where participants try to work around the Device Compatibility page limits), so it's better to require things that allow participants to assess elibility themselves, before reaching the Device Compatibility page.",
  },
  _needWeb: {
    name: "_needWeb",
    availability: "now",
    type: "categorical",
    default: "",
    explanation:
      "🕑 _needWeb (no default) is a comma-separated list of web features (APIs and dictionary properties) that the browser must provide, e.g. WakeLock, echoCancellation. Web feature support depends on the browser, not the OS or hardware platform. Most of the _needWeb features are supported by most current browsers, so the participant typically can add support for a needed web feature by updating their browser or switching to the Chrome browser. For a list of compatible browsers, search for the feature in https://developer.mozilla.org/, and consult the compatibility table at the bottom of the page. The easy compatibility check just asks the browser if a feature is supported. However, that can be misleading because browsers disable features for various reasons, including low battery. Since any feature requested here might be mission-critical, if the browser says it's available, we should also confirm that we can actually set it. That might take a second, and it's worth it.\n\nThe need for these features in EasyEyes is asymmetric. Test only the features selected by the parameter arguments, and test only that we can enable WakeLock, and disable echoCancellation, noiseSuppression, and autoGainControl. It's fine to test them all together in a batch, since we won't use them independently. I bet that ChatGPT, if asked, will write the code we need.",
    categories: [
      "WakeLock",
      "echoCancellation",
      "noiseSuppression",
      "autoGainControl",
    ],
  },
  _needWebGL: {
    name: "_needWebGL",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "🕑 _needWebGL (default 2, 16385, 32767) allows you to specify your experiment's WebGL requirements as three minimum values: version, textureSize, portSize. \n\nEach EasyEyes report csv file includes WebGL_Report, which is a long (JSON?) string that provides values for many parameters. Four of those are also reported separately: WebGLVersion, maxTextureSize, maxPortSize, and WebGLUnmaskedRenderer. _needWebGL allows you to specify minimum values for the first three.\n\nWebGLUnmaskedRenderer reports what code actually does the rendering. I found a big difference in timing for rendering of huge characters between computers whose WebGLUnmaskedRenderer mentioned Metal vs. OpenGL. Metal is newer and supposedly faster, but in this case OpenGL was quick and Metal was terribly small. Note that the two computers I was comparing both had only 2 cores and maxPortSize=16385.\n\nWe had anticipated that time to render huge characters might depends stongly on the WebGL version and texture and port sizes, but so far we haven't observed any correlation between those values and targetMeasuredLatenessSec.",
  },
  _needWebPhone: {
    name: "_needWebPhone",
    availability: "now",
    type: "categorical",
    default: "",
    explanation:
      "🕑 _needWebPhone (no default) is a comma-separated list of needed web features (APIs and dictionary properties) that the browser of the attached phone must provide, e.g. WakeLock, echoCancellation. The rest of this explanation is identical to that for _needWeb, above.",
    categories: [
      "WakeLock",
      "echoCancellation",
      "noiseSuppression",
      "autoGainControl",
    ],
  },
  _online1InternalName: {
    name: "_online1InternalName",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '_online1InternalName [Prolific "Give your study an internal name (only visible to you)"] (default is beginning of your study URL: net id and experiment name) specifies the internal name, as a text string, instead of letting Prolific assign it from your study URL. ',
  },
  _online1RecruitmentService: {
    name: "_online1RecruitmentService",
    availability: "now",
    type: "categorical",
    default: "none",
    explanation:
      '⭑ _online1RecruitmentService (default none). Name of recruitment service: Prolific, SONA, MTurk.  The key idea is two URLs that carry parameters. The Study URL (a link to our experiment) carries parameters provided by the recruitment service (e.g. Prolific). The Completion URL (a link to the completion page of the recruitment service) carries the completion code certifying that the participant completed the study. \nnone - Just produce a study URL.\nProlific - integrate with Prolific, which is suggested by the PsychoPy manual. https://www.psychopy.org/online/prolificIntegration.html\nNOT YET IMPLEMENTED: MTurk - currently equivalent to "none".\nNOT YET IMPLEMENTED: SONA - currenlty equivalent to "none".',
    categories: ["none", "Prolific"],
  },
  _online1Title: {
    name: "_online1Title",
    availability: "now",
    type: "text",
    default: "UNKNOWN TITLE",
    explanation:
      '⭑ _online1Title [Prolific: "What is the title of your study?" Length ≤ 120 characters] (default is "UNKNOWN TITLE") is the brief title for this study that will be used to recruit new participants. In deciding whether to participate, potential participants know only the _online1Title, _online2PayPerHour, _online2Minutes, and _online2Description. Participants often mention selecting one of my studies by how interesting it sounds and its pay per hour.',
  },
  _online2Description: {
    name: "_online2Description",
    availability: "now",
    type: "text",
    default: "***",
    explanation:
      "⭑ _online2Description [Prolific \"Describe what participants will be doing in this study.\"] (default is \"***\") is a (typically long) description of the study, used to recruit new participants. In deciding whether to participate, Prolific members will consider _online0Title, _online2Pay, _online2Minutes, and _online2Description. However, several Prolific participants told me that when the pay exceeds $15/hour, the jobs are filled quickly, so they often accept these without reading the study description. So you might want to have your study verify that participants actually satisfy any requirements stated in your description. The EasyEyes _needXXX parameters may be helpful in this regard. IMPORTANT: Prolific's recruitment policy demands advance statement of the study's Device Compatibility requirements before the participant accepts. Thus any _needXXX should be mentioned in your study's Description in Prolific, which is copied from this parameter. EasyEyes helps you to do this, by offering a Device Compatibility statement of the study's needs on the scientist page that you can copy and include here.",
  },
  _online2Minutes: {
    name: "_online2Minutes",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      '⭑ _online2Minutes [Prolific "How long will your study take to complete?"] (default 0) is the expected study duration, in minutes, in your offer to each potential participant. EasyEyes uses a rule of thumb to estimate the duration of your study and displays it on the scientist page so you can copy it and paste it here. In deciding whether to participate, potential participants will consider _online2PayPerHour, _online0Title, _online2Description, and _online2Minutes. The total payment is fixed when the study begins. If the median duration of your study is much greater than your estimate then Prolific will invite you to proportionally increase the pay. But we suspect that participants are happier if your time estimate is accurate, because that makes the deal businesslike, whereas the increase, since it\'s not enforced, may seem like charity.',
  },
  _online2Participants: {
    name: "_online2Participants",
    availability: "now",
    type: "integer",
    default: "1",
    explanation:
      '⭑ _online2Participants [Prolific "Recruit participants"] (default 1) Number of people you want to test.',
  },
  _online2Pay: {
    name: "_online2Pay",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      '_online2Pay [Prolific "How much do you want to pay them?"] USE _online2PayPerHour INSTEAD BECAUSE THAT\'S WHAT PARTICIPANTS CARE ABOUT MOST. _online2Pay (default zero) specifies the payment (a number) to offer to each participant. The currency is specified by _online2PayCurrency.  If _online2Pay and _online2PayPerHour are both nonzero, then the participant is offered the sum of the two contributions.  In deciding whether to participate, potential participants mainly consider _online2PayPerHour, _online0Title, _online2Description, and _online2Minutes. Some participants mentioned selecting my study because it seemed interesting. Others said that in their rush to sign up for $15/hour studies, they often skip the description. ',
  },
  _online2PayCurrency: {
    name: "_online2PayCurrency",
    availability: "now",
    type: "categorical",
    default: "USD",
    explanation:
      "🕑 _online2PayCurrency (default USD) specifies the currency of the payment: US Dollars (USD) or Great Britain Pounds (GBP). Prolific has no API to change this, but EasyEyes will confirm that Prolific is using the currency declared by _online2PayCurrency. Prolific allows your user account to be in USD or GBP, and you can change an account's currency in response to a written request, but only rarely. Some users of EasyEyes will be in UK and will likely prefer to pay Prolific and participants in GBP. EasyEyes can't change Prolific's choice of currency, but by setting this parameter you can ask EasyEyes to make sure that Prolific is using the currency assumed by your spreadsheet. If not, then EasyEyes will flag this as a fatal error before deployment. You can then fix the currency in your experiment, and adjust the numeric pay to provide the desired compensation. ",
    categories: ["USD", "GBP"],
  },
  _online2PayCurrencySymbol: {
    name: "_online2PayCurrencySymbol",
    availability: "now",
    type: "text",
    default: "$",
    explanation:
      '_online2PayCurrencySymbol (default "$"). Ignored by Prolific, but usefull when recruiting directly. Specifies the currency of payment. Used in the statement shown below the Consent form: EE_BelowConsentReportPayAndDuration. This appears before the numerical amount to be paid, e.g. "$14.51". The format is text, for flexibility, e.g. €, £, $, USD, US$.\n\n',
  },
  _online2PayPerHour: {
    name: "_online2PayPerHour",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      '⭑ _online2PayPerHour (default zero) specifies the hourly rate (a number) that determines (with _online2Minutes) the payment offered to each participant. [In Prolific, EasyEyes computes and fills in "How much do you want to pay them?"] The currency is specified by _online2PayCurrency. If _online2Pay and _online2PayPerHour are both nonzero, then the participant is offered the sum of the two contributions. The pay is specified with two decimals (e.g. 11.01), rounding up to the next cent, so the hourly rate offered will never be less than specified by the experiment. Prolific lists the study titles and pay per hour for selection by prospective participants. Some participants mentioned selecting my study because it seemed interesting. Others said that in their rush to sign up for $15/hour studies, they often skip the description. ',
  },
  _participantIDGetBool: {
    name: "_participantIDGetBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_participantIDGetBool (default FALSE). Multi-session experiments require a way to link a participant's several sessions. When _participantIDGetBool is TRUE, we ask the participant to provide their EasyEyesID from a previous session. To facilitate this, EasyEyes checks for the most recent EasyEyesID cookie, and, if found, offers it to the participant for approval. The participant can approve it (if found), or select an EasyEyesID file from the computer's disk, or type in an EasyEyesID, or type in any ASCII alphanumeric string (also allowing underscore, dash, and period) without whitespace to use as their EasyEyesID. If EasyEyes cannot get an EasyEyesID, it exits the experiment. A participant who moves from one computer to another between sessions should take an EasyEyesID file with them, or write down the EasyEyesID. \nAlso see _participantIDPutBool below.",
  },
  _participantIDPutBool: {
    name: "_participantIDPutBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_participantIDPutBool (default FALSE). EasyEyes always saves an EasyEyesID cookie in the browser’s local storage, in the participant's computer. The cookie is browser-specific, and is lost when the participant clears cookies. If _participantIDPutBool is TRUE, then an EasyEyesID text file (example below) is also saved in their Downloads Folder. The browser informs the participant when this file is placed in their Downloads folder, and some participant suppose that it's a record of their results, not just their ID number. They may email it to you as evidence of participating in your study. We didn't foresee that use, so we are enhancing the file's data to better serve that purpose. \n\nFor example, one Downloads folder has a file:\nEasyEyes_0001_Denis123.txt\nwhich contains:\n\nPlease keep this file to facilitate participation in future sessions. When an experiment has several sessions, this file helps you to connect them, while retaining your anonymity. \n\nEasyEyesID              Denis123\nEasyEyesSession         0001\nparticipant             Denis123\n\nfile                    ArabicFontsCrwdngRdngCmfrtBty.xlsx\ndate                    2025-08-15_16h45.14.907 EDT\n\nProlificParticipantID   null\nProlificSession         null\nProlificStudyID         null\n\nUSEFUL\nEasyEyesID                  serves to link a participant's sessions. Very useful.\nProlificParticipantID  useful when recruiting through Prolific.\nProlificSession           useful when recruiting through Prolific.\nProlificStudyID           useful when recruiting through Prolific.\n\nTO BE ADDED SOON\nPavloviaSessionID\nexperiment\ndate of this session\nduration of this session\nlastBlock\ncompleteBool\n\nUSELESS, TO BE REMOVED\nEasyEyesSession\nparticipant\nfile\ndate\n\nAlso see _participantIDGetBool above.",
  },
  _pavlovia_Database_ResultsFormatBool: {
    name: "_pavlovia_Database_ResultsFormatBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_pavlovia_Database_ResultsFormatBool (default FALSE) allows the scientist to select which results format Pavlovia will use when reporting the results of this experiment. After the participants run the experiment, Pavlovia's \"Database\" results format returns one merged CSV file with all participant results. The alternative \"CSV\" results format returns one CSV file for each participant.\n\nIMPLEMENTATION. As the experiment is compiled (into a newly created repository in Pavlovia bearing the experiment's name), the compiler will use the current value (default or assigned) of _pavlovia_Database_ResultsFormatBool to set the Results Format in the experiment's Pavlovia dashboard to either “CSV” or “Database”.\n\nTHIS WAS IMPLEMENTED TO WORK AROUND A TEMPORARY PROBLEM (March 26 to April 18, 2024) IN PAVLOVIA'S CSV RESULTS FORMAT: Pavlovia’s CSV results format was broken, so that in columns after \"targeTask\" (roughly the 37th), the headers are one row down and begin again from the first header. Pavlovia’s Database results format is fine. Since the problem was fixed on April 18, the default of _pavlovia_Database_ResultsFormatBool is FALSE.\n\nSPLITTING THE DATABASE FORMAT. The EasyEyes “Download results” button has been enhanced to download either kind of CSV file, as appropriate, and split any “Download”-style merged CSV into individual CSV files, practically equivalent to the CSV files that were returned by the “CSV”-mode when it worked properly.\n\nMANUAL OVERRIDE. We can't think of a reason to do so, but the scientist can use the manual control in the Pavlovia dashboard to change the experiment's results format, overriding whatever was selected in the experiment spreadsheet.\n\nNOTE: To download a cursor file (_saveCursorPositionBool=TRUE), Pavlovia must use the CSV results format (_pavlovia_Database_ResultsFormatBool=FALSE, the default). Otherwise the cursor data file will not appear. At some point we'll enhance the compiler to raise an error when both are true.",
  },
  _pavloviaNewExperimentBool: {
    name: "_pavloviaNewExperimentBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "_pavloviaNewExperimentBool (default TRUE) can be set to FALSE to reuse the current Pavlovia repository. This is helpful when it's important to retain the same Pavlovia URL for your experiment, because another experiment links to it. It's also helpful for users without an institutional Pavlovia license, because assignment of credits in Pavlovia is specific to the repository, so it's more convenient to keep using the same repository.\n\nWithout an institutional license, Pavlovia requires assigning credit (money) to each experiment before it can run in RUNNING mode. (PILOTING mode is free, but only accessible manually within Pavlovia.) \n\nIf _pavloviaNewExperimentBool=TRUE (the default), then, when EasyEyes compiles your experiment, EasyEyes appends the smallest possible integer (at least 1) to the spreadsheet filename (without extension) to create a unique (unused) experiment name. That keeps versions apart, and keeps the data from each version in its own repository. \n     Setting _pavloviaNewExperimentBool=FALSE will reuse the old repo, instead of creating a new repo every time you compile. The downside is that if you collect data, edit the experiment, and collect more data, the data files will all be together in the same repo, distinguished only by date.\n     When _pavloviaNewExperimentBool=FALSE, scientists without an institutional license only need to assign credit the first time they compile (when it's a new repo). Once it has credits, they can keep testing, through countless compiles, without visiting Pavlovia, until the experiment runs out of credits. \n     This flag doesn't affect PILOTING mode, which is always free and can only be used from within Pavlovia. \n     Also, any users concerned over the huge proliferation of repos might like to set _pavloviaNewExperimentBool=FALSE to minimize the number of repos created by EasyEyes.\n\nSee _pavloviaPreferRunningModeBool for a more advice on working without an institutional Pavlovia site license.",
  },
  _pavloviaPreferRunningModeBool: {
    name: "_pavloviaPreferRunningModeBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "_pavloviaPreferRunningModeBool helps EasyEyes optimize its behavior by indicating your preference for use of RUNNING or PILOTING mode while testing. Pavlovia offers two modes (RUNNING and PILOTING) for running your study. Remote data collection requires RUNNING mode. PILOTING mode is meant for checking and debugging and runs only from the Pavlovia console on the scientist's computer. The only advantage of the PILOTING mode is that it's always free. Unless your institution has a Pavlovia site license, RUNNING mode costs 22 pence per participant (in 2024), and requires assigning credits (money) in advance to each experiment. (Setting _pavloviaNewExperiment=FALSE allows you to request that EasyEyes keep reusing the same experiment name, as you compile new versions, so you can assign credits once to the experiment, when you begin testing, instead of before each compile.) Thus scientists with a site license will always prefer RUNNING mode. Without that license, scientists can save money by using PILOTING mode during development, and switch to RUNNING mode to test remote participants. The parameter _pavloviaPreferRunningModeBool allows you to express your preference. With an institutional site license, you'll always want the default TRUE. Without an institutional site license, you can save money by setting _pavloviaPreferRunningModeBool=FALSE during development, and TRUE for the actual remote testing. Without a site license, if you don't mind the 22 p expense, you can use RUNNING mode throughout (use the default _pavloviaPreferRunningModeBool=TRUE), and set _compileAsNewExperiment=FALSE to minimize the frequency at which you must assign credits to the experiment.\n\nOLD EXPLANATION. Setting _pavloviaPreferRunningModeBool TRUE (the default) streamlines the use of Pavlovia's RUNNING mode, and setting it FALSE streamlines the use of Pavlovia's PILOTING mode. _pavloviaPreferRunningModeBool helps EasyEyes anticipate your preference in optimizing the EasyEyes user interface. EasyEyes uses a Pavlovia repository to hold your experiment. Pavlovia offers two modes for running your experiment, PILOTING and RUNNING. PILOTING mode is free, but can only be run directly from the Pavlovia dashboard, which prevents remote testing. RUNNING mode costs 20 pence per participant (this fee is waived if your instititution has a site license), and you get a URL for your study that you can send to your online participants. It is our guess that most EasyEyes users (like current Pavlovia users) will belong to institutions with Pavlovia site licenses, and thus have no usage fee. Thus, for most users, we suggest letting _pavloviaPreferRunningModeBool be TRUE (the default) to streamline the EasyEyes scientist page for RUNNING mode. When _pavloviaPreferRunningModeBool is TRUE, you just submit your table to the EasyEyes compiler to receive your study URL, with no more clicks. That includes setting your experiment to RUNNING mode in Pavlovia. If _pavloviaPreferRunningModeBool is FALSE, then your experiment remains in the INACTIVE mode, waiting for you to click the \"Go to Pavlovia\" button, where you'll use the Pavlovia dashboard to set your experiment to PILOTING mode and run it. (Pavlovia has no API by which EasyEyes could do this for you.) If your experiment is already in RUNNING mode you can still switch to PILOTING mode. ",
  },
  _pavloviaSavePartialResultsBool: {
    name: "_pavloviaSavePartialResultsBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "🕑 _pavloviaSavePartialResultsBool (default TRUE) determines whether partial results are saved. This is a feature in Pavlovia that should be enabled or disabled by EasyEyes using the Pavlovia API. Pavlovia (and EasyEyes) charges one credit per saved session. Incomplete sessions are free if they are not saved.",
  },
  _prolific1ProjectID: {
    name: "_prolific1ProjectID",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "⭑ _prolific1ProjectID. To use Prolific with EasyEyes, you must figure out whether your Prolific account is in the new (since mid-2022) \"Workspace\" mode or it's older non-Workspace mode (which may become obsolete). \nhttps://researcher-help.prolific.co/hc/en-gb/articles/4500057146140-Workspaces-\nBefore Prolific's Workspace mode arrived, there was no Project ID. In Workspace mode you assign funds to a folder which has a name and a project ID (a roughly 24-digit hexadecimal number). You can have multiple studies in one project folder; they all share the same project ID. If your experiment table includes an _prolific1ProjectID number, then EasyEyes will use it and call Prolific in Workspace mode. If _prolific1ProjectID is empty or absent, then EasyEyes will call Prolific in pre-Workspace mode.  If you provide a wrong Project ID then you'll get an invalid address (404) when EasyEyes tries to access your Prolific workspace. EasyEyes assumes that Prolific is locked into one mode or the other. (In fact, Prolific allows you to upgrade your Prolific account from pre-Workspace into Workspace mode, but you cannot downgrade, which is fine since Workspace mode is better.) If EasyEyes calls Prolific in the wrong mode, the call fails to transfer vital information for your study, which you'll notice when you try to publish your study in Prolific. Currently EasyEyes can't tell which mode your Prolific account is in, and expects you to provide a _prolific1ProjectID if and only if Prolific is in Workspace mode. So if you arrive in Prolific, and find Prolific ignorant of your study, you probably guessed wrong about the mode of your Prolific account. Does your study in Prolific have a Prolific Project ID? If yes, then your Prolific account is in Workspace mode, otherwise not. You can run all studies with the same _prolific1ProjectID, or have several projects eash with their own _prolific1ProjectID.",
  },
  _prolific2Aborted: {
    name: "_prolific2Aborted",
    availability: "now",
    type: "categorical",
    default: "requestAReturn",
    explanation:
      "_prolific2Aborted (default requestAReturn) specify handling after participant aborts the study.",
    categories: ["manuallyReview", "approveAndPay", "requestAReturn"],
  },
  _prolific2AbortedAddToGroup: {
    name: "_prolific2AbortedAddToGroup",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "_prolific2AbortedAddToGroup (default empty) is the name of an existing Prolific participant group. When participant aborts study, if a group is specified, Prolific will add the participant to it.",
  },
  _prolific2CompletionPath: {
    name: "_prolific2CompletionPath",
    availability: "now",
    type: "categorical",
    default: "approveAndPay",
    explanation:
      "_prolific2CompletionPath (default approveAndPay). When participant completes study (with a completion code), Prolific will put them in either the Review column (waiting for review and approval by the scientist) or the Approved column.",
    categories: ["manuallyReview", "approveAndPay"],
  },
  _prolific2CompletionPathAddToGroup: {
    name: "_prolific2CompletionPathAddToGroup",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "_prolific2CompletionPathAddToGroup (default empty) is the name of an existing Prolific participant group. When participant completes study (with a completion code), if a group is specified, Prolific will add the participant to it.",
  },
  _prolific2DeviceKind: {
    name: "_prolific2DeviceKind",
    availability: "now",
    type: "multicategorical",
    default: "desktop",
    explanation:
      '⭑ _prolific2DeviceKind (default desktop) [Prolific "Which devices can participants use to take your study?"] is a comma-separated list of acceptable answers (see Categories) to this Prolific query:\nWhich devices can participants use to take your study?\nmobile\ntablet\ndesktop\nThe parameter value will be a comma-separated list of none to all of: mobile, tablet, desktop.',
    categories: ["mobile", "tablet", "desktop"],
  },
  _prolific2RequiredServices: {
    name: "_prolific2RequiredServices",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '⭑ _prolific2RequiredServices (no default) [Prolific "Does your study require any of the following?"] (no default) is a comma-separated list of technical requirements corresponding to this Prolific query, "Does your study require any of the following?"\nThe parameter value will be a comma-separated list of none to all of: audio, camera, microphone, download.',
    categories: ["audio", "camera", "microphone", "download"],
  },
  _prolific2ScreenerSet: {
    name: "_prolific2ScreenerSet",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "🕑 _prolific2ScreenerSet (default none) allows you, the scientist, to provide the name of a screener set that you created in Prolific. This gives you immediate access to all Prolific parameters, as soon as they appear on Prolific. Using a screener set causes Prolific to ignore all other screener requests, including all the EasyEyes _prolific3XXX and _prolific4XXX parameters. The twenty EasyEyes _prolific3XXX and _prolific4XXX parameters are useful, but represent only a small fraction of the screeners offered by Prolific.",
  },
  _prolific2StudyLabel: {
    name: "_prolific2StudyLabel",
    availability: "now",
    type: "categorical",
    default: "",
    explanation:
      "🕑 _prolific2StudyLabel (default empty) provides an optional label (from Prolific's growing list) to help participants select a study.",
    categories: ["Survey", "Writing task", "Annotation", "Interview", "Other"],
  },
  _prolific2SubmissionApproval: {
    name: "_prolific2SubmissionApproval",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _prolific2CompletionPath instead.",
  },
  _prolific3AllowAfterHours: {
    name: "_prolific3AllowAfterHours",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "🕑 _prolific3AllowAfterHours (default 0) requires that at least the specified (floating) number of hours pass since completion of the _prolific3AllowCompletedExperiment before the participant’s ID is added to the allowList.",
  },
  _prolific3AllowCompletedExperiment: {
    name: "_prolific3AllowCompletedExperiment",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "🕑 _prolific3AllowCompletedExperiment (default empty) specifies a comma-separated list of experiments (typically just one) in your Pavlovia account. (The compiler will check the experiment names.) A minimum time _prolific3AllowAfterHours after a participant completes (or has completed) one or more of the named experiments, EasyEyes will add their Prolific participant ID to the current experiment’s allowList. Adding continues until the new experiment completes. If _prolific3AllowCompletedExperiment is not empty, then participants are recruited solely through the allowList. If _prolific3CustomAllowList is not empty, then it adds its IDs to the allowList.",
  },
  _prolific3ApprovalRate: {
    name: "_prolific3ApprovalRate",
    availability: "now",
    type: "text",
    default: " 0, 100",
    explanation:
      '🕑 _prolific3ApprovalRate [Prolific "Approval rate"] (default 0,100) is a comma-separated list of two numbers (each in the range 0 to 100) that specify the minimum and maximum acceptable precent approval rate of the participant. \nApproval Rate\nApproval rate is the percentage of studies for which the participant has been approved. We use the upper bound of the 95% confidence interval to calculate approval rate.\n\nCreate a range using the sliders below:\n———————————\nMinimum Approval Rate: 0, Maximum Approval Rate: 100 (inclusive)',
  },
  _prolific3CustomAllowList: {
    name: "_prolific3CustomAllowList",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '_prolific3CustomAllowList [Prolific "Custom allowlist"] (no default) is a comma-separated list of Prolific participant IDs. ONLY these participants will be eligible for this study, unless _prolific3AllowCompletedExperiment is not empty, in which case both contribute to the allowList of participants.',
  },
  _prolific3CustomBlockList: {
    name: "_prolific3CustomBlockList",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '_prolific3CustomBlockList [Prolific "Custom blocklist"] (no default) is a comma-separated list of Prolific participant IDs who will not be invited to this study.',
  },
  _prolific3Location: {
    name: "_prolific3Location",
    availability: "now",
    type: "multicategorical",
    default: "All countries available",
    explanation:
      '_prolific3Location [Prolific "Location"] (default All countries available) is a comma-separated list of acceptable answers (see Categories) to this Prolific query:\nLocation\nWhere should your participants be located?\nAll countries available\nUSA\nUK\n...\nThe answer can include many countries, which are combined by an OR rule.\nNOTE: _prolific3Location accepts "Venezuela" which is automatically converted to Prolific\'s "Venezuela, Bolivarian Republic of". ',
    categories: [
      "All countries available",
      "USA",
      "UK",
      "Ireland",
      "Germany",
      "France",
      "Spain",
      "Afghanistan",
      "Aland Islands",
      "Albania",
      "Algeria",
      "American Samoa",
      "Andorra",
      "Angola",
      "Anguilla",
      "Antarctica",
      "Antigua and Barbuda",
      "Argentina",
      "Armenia",
      "Aruba",
      "Australia",
      "Austria",
      "Azerbaijan",
      "Bahamas",
      "Bahrain",
      "Bangladesh",
      "Barbados",
      "Belarus",
      "Belgium",
      "Belize",
      "Benin",
      "Bermuda",
      "Bhutan",
      "Bolivia",
      "Bonaire",
      "Bosnia and Herzegovina",
      "Botswana",
      "Bouvet Island",
      "Brazil",
      "British Indian Ocean Territory",
      "Brunei Darussalam",
      "Bulgaria",
      "Burkina Faso",
      "Burundi",
      "Cambodia",
      "Cameroon",
      "Canada",
      "Cape Verde",
      "Cayman Islands",
      "Central African Republic",
      "Chad",
      "Chile",
      "China",
      "Christmas Island",
      "Cocos (Keeling) Islands",
      "Colombia",
      "Comoros",
      "Congo",
      "Congo the Democratic Republic of the",
      "Cook Islands",
      "Costa Rica",
      "Cote d'Ivoire",
      "Croatia",
      "Cuba",
      "Curacao",
      "Cyprus",
      "Czech Republic",
      "Denmark",
      "Djibouti",
      "Dominica",
      "Dominican Republic",
      "Ecuador",
      "Egypt",
      "El Salvador",
      "Equatorial Guinea",
      "Eritrea",
      "Estonia",
      "Ethiopia",
      "Falkland Islands (Malvinas)",
      "Faroe Islands",
      "Fiji",
      "Finland",
      "French Guiana",
      "French Polynesia",
      "French Southern Territories",
      "Gabon",
      "Gambia",
      "Georgia",
      "Ghana",
      "Gibraltar",
      "Greece",
      "Greenland",
      "Grenada",
      "Guadeloupe",
      "Guam",
      "Guatemala",
      "Guernsey",
      "Guinea",
      "Guinea-Bissau",
      "Guyana",
      "Haiti",
      "Heard Island and McDonald Islands",
      "Holy See (Vatican City State)",
      "Honduras",
      "Hong Kong",
      "Hungary",
      "Iceland",
      "India",
      "Indonesia",
      "Iran",
      "Iraq",
      "Isle of Man",
      "Israel",
      "Italy",
      "Jamaica",
      "Japan",
      "Jersey",
      "Jordan",
      "Kazakhstan",
      "Kenya",
      "Kiribati",
      "Korea",
      "Kuwait",
      "Kyrgyzstan",
      "Lao People's Democratic Republic",
      "Latvia",
      "Lebanon",
      "Lesotho",
      "Liberia",
      "Libya",
      "Liechtenstein",
      "Lithuania",
      "Luxembourg",
      "Macao",
      "Macedonia",
      "Madagascar",
      "Malawi",
      "Malaysia",
      "Maldives",
      "Mali",
      "Malta",
      "Marshall Islands",
      "Martinique",
      "Mauritania",
      "Mauritius",
      "Mayotte",
      "Mexico",
      "Micronesia",
      "Moldova",
      "Monaco",
      "Mongolia",
      "Montenegro",
      "Montserrat",
      "Morocco",
      "Mozambique",
      "Myanmar",
      "Namibia",
      "Nauru",
      "Nepal",
      "Netherlands",
      "New Caledonia",
      "New Zealand",
      "Nicaragua",
      "Niger",
      "Nigeria",
      "Niue",
      "Norfolk Island",
      "Northern Mariana Islands",
      "Norway",
      "Oman",
      "Pakistan",
      "Palau",
      "Palestinian Territory",
      "Panama",
      "Papua New Guinea",
      "Paraguay",
      "Peru",
      "Philippines",
      "Pitcairn",
      "Poland",
      "Portugal",
      "Puerto Rico",
      "Qatar",
      "Reunion",
      "Romania",
      "Russian Federation",
      "Rwanda",
      "Saint Barthelemy",
      "Saint Helena",
      "Saint Kitts and Nevis",
      "Saint Lucia",
      "Saint Martin (French part)",
      "Saint Pierre and Miquelon",
      "Saint Vincent and the Grenadines",
      "Samoa",
      "San Marino",
      "Sao Tome and Principe",
      "Saudi Arabia",
      "Senegal",
      "Serbia",
      "Seychelles",
      "Sierra Leone",
      "Singapore",
      "Sint Maarten (Dutch part)",
      "Slovakia",
      "Slovenia",
      "Solomon Islands",
      "Somalia",
      "South Africa",
      "South Georgia and the South Sandwich Islands",
      "South Sudan",
      "Sri Lanka",
      "Sudan",
      "Suriname",
      "Svalbard and Jan Mayen",
      "Swaziland",
      "Sweden",
      "Switzerland",
      "Syrian Arab Republic",
      "Taiwan",
      "Tajikistan",
      "Tanzania",
      "Thailand",
      "Timor-Leste",
      "Togo",
      "Tokelau",
      "Tonga",
      "Trinidad and Tobago",
      "Tunisia",
      "Turkey",
      "Turkmenistan",
      "Turks and Caicos Islands",
      "Tuvalu",
      "Uganda",
      "Ukraine",
      "United Arab Emirates",
      "United States Minor Outlying Islands",
      "Uruguay",
      "Uzbekistan",
      "Vanuatu",
      "Venezuela",
      "Vietnam",
      "Wallis and Futuna",
      "Western Sahara",
      "Yemen",
      "Zambia",
      "Zimbabwe",
    ],
  },
  _prolific3ParticipantInPreviousStudyExclude: {
    name: "_prolific3ParticipantInPreviousStudyExclude",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '🕑 _prolific3ParticipantInPreviousStudyExclude [Prolific "Exclude participants from previous studies"] (no default) is a comma-separated list of Experiment names (Prolific internal study names) in response to this Prolific prescreening query:\nExclude participants from previous studies. This screener will exclude all participants from the selected studies regardless of their submission status. Please note this list only includes studies which are completed. Read about how to prevent certain participants from accessing your study.',
  },
  _prolific3ParticipantInPreviousStudyInclude: {
    name: "_prolific3ParticipantInPreviousStudyInclude",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '🕑 _prolific3ParticipantInPreviousStudyInclude [Prolific "Include participants from previous studies"] (no default) is a comma-separated list of Experiment names (Prolific internal study names)  in response to this Prolific prescreening query:\nInclude participants from previous studies. Only participants with approved submissions will be included. To add participants whose responses weren\'t approved, please instead use a custom allowlist. Please note this list only includes studies which are completed. Read about how to invite specific participants to your study.',
  },
  _prolific3StudyDistribution: {
    name: "_prolific3StudyDistribution",
    availability: "now",
    type: "categorical",
    default: "Standard sample",
    explanation:
      '🕑 _prolific3StudyDistribution [Prolific "Study distribution"] (default Standard sample) is a comma-separated list of acceptable answers (see Categories) to this Prolific query:\nStudy distribution. How do you want to distribute your sample?\nRepresentative sample\nBalanced sample\nStandard sample\nApparently "Representative sample" is automatically assigned to either UK or USA.\nThe scientist chooses a sample of participants that is one of: Representative of USA or UK, Balanced 50/50 between sexes, or Standard (whoever is available). Prolific charges more for representative samples.',
    categories: ["Representative sample", "Balanced sample", "Standard sample"],
  },
  _prolific4CochlearImplant: {
    name: "_prolific4CochlearImplant",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_prolific4CochlearImplant [Prolific "Cochlear implant"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nCochlear implant\nParticipants were asked the following question: Do you have a cochlear implant?\nYes\nNo\nRather not say',
    categories: ["Yes", "No", "Rather not say"],
  },
  _prolific4Dyslexia: {
    name: "_prolific4Dyslexia",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_prolific4Dyslexia [Prolific "Dyslexia"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nDyslexia\nParticipants were asked the following question: Have you received a medical diagnosis for dyslexia?\n\nYes, I have been medically diagnosed with dyslexia\nNo, but I am in the process of being diagnosed\nNo, but I strongly suspect I have undiagnosed dyslexia\nNo\nRather not say\nThe value will be a comma-separated list of none or any number of: diagnosed, being diagnosed, suspect but undiagnosed, no, not saying',
    categories: ["diagnosed", "being diagnosed", "suspect", "no", "not saying"],
  },
  _prolific4HearingDifficulties: {
    name: "_prolific4HearingDifficulties",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_prolific4HearingDifficulties [Prolific "Hearing difficulties"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nHearing difficulties\nParticipants were asked the following question: Do you have any hearing loss or hearing difficulties?\nYes\nNo\nRather not say\n• The parameter value will be a comma-separated list of: Yes, No, Rather not say.',
    categories: ["Yes", "No", "Rather not say"],
  },
  _prolific4LanguageFirst: {
    name: "_prolific4LanguageFirst",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_prolific4LanguageFirst [Prolific "First language"] (no default) is a comma-separated list of acceptable languages. Prolific uses OR to combine values within a parameter, and AND to combine across parameters. Prolific is international but based in UK; Enlish is the native language of a large fraction of their participants.',
    categories: [
      "Afrikaans",
      "Albanian",
      "Amharic",
      "Arabic",
      "Armenian",
      "Basque",
      "Belarusian",
      "Bengali",
      "Bulgarian",
      "Burmese",
      "Cantonese",
      "Catalan",
      "Chinese",
      "Croatian",
      "Czech",
      "Danish",
      "Dari",
      "Dutch",
      "Dzongkha",
      "English",
      "Esperanto",
      "Estonian",
      "Faroese",
      "Farsi",
      "Finnish",
      "French",
      "Gaelic",
      "Galician",
      "Georgian",
      "German",
      "Greek",
      "Gujarati",
      "Hakka",
      "Hebrew",
      "Hindi",
      "Hungarian",
      "Icelandic",
      "Indonesian",
      "Inuktitut",
      "Italian",
      "Japanese",
      "Khmer",
      "Korean",
      "Kurdish",
      "Laotian",
      "Lappish",
      "Latvian",
      "Lithuanian",
      "Macedonian",
      "Malay",
      "Malayalam",
      "Maltese",
      "Mandarin",
      "Nepali",
      "Norwegian",
      "Papiamento",
      "Pashto",
      "Polish",
      "Portuguese",
      "Punjabi",
      "Romanian",
      "Russian",
      "Scots",
      "Serbian",
      "Slovak",
      "Slovenian",
      "Somali",
      "Spanish",
      "Swahili",
      "Swedish",
      "Tagalog-Filipino",
      "Tajik",
      "Tamil",
      "Telugu",
      "Thai",
      "Tibetan",
      "Tigrinya",
      "Tongan",
      "Turkish",
      "Turkmen",
      "Twi",
      "Ukrainian",
      "Urdu",
      "Uzbek",
      "Vietnamese",
      "Welsh",
      "Other",
    ],
  },
  _prolific4LanguageFluent: {
    name: "_prolific4LanguageFluent",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_prolific4LanguageFluent [Prolific "Fluent languages"] (no default) is a comma-separated list of acceptable languages. Prolific uses OR to combine values within a parameter, and AND to combine across parameters. Prolific is international but based in UK; Enlish is the native language of a large fraction of their participants.',
    categories: [
      "Afrikaans",
      "Albanian",
      "Amharic",
      "Arabic",
      "Armenian",
      "Basque",
      "Belarusian",
      "Bengali",
      "Bulgarian",
      "Burmese",
      "Cantonese",
      "Catalan",
      "Chinese",
      "Croatian",
      "Czech",
      "Danish",
      "Dari",
      "Dutch",
      "Dzongkha",
      "English",
      "Esperanto",
      "Estonian",
      "Faroese",
      "Farsi",
      "Finnish",
      "French",
      "Gaelic",
      "Galician",
      "Georgian",
      "German",
      "Greek",
      "Gujarati",
      "Hakka",
      "Hebrew",
      "Hindi",
      "Hungarian",
      "Icelandic",
      "Indonesian",
      "Inuktitut",
      "Italian",
      "Japanese",
      "Khmer",
      "Korean",
      "Kurdish",
      "Laotian",
      "Lappish",
      "Latvian",
      "Lithuanian",
      "Macedonian",
      "Malay",
      "Malayalam",
      "Maltese",
      "Mandarin",
      "Nepali",
      "Norwegian",
      "Papiamento",
      "Pashto",
      "Polish",
      "Portuguese",
      "Punjabi",
      "Romanian",
      "Russian",
      "Scots",
      "Serbian",
      "Slovak",
      "Slovenian",
      "Somali",
      "Spanish",
      "Swahili",
      "Swedish",
      "Tagalog-Filipino",
      "Tajik",
      "Tamil",
      "Telugu",
      "Thai",
      "Tibetan",
      "Tigrinya",
      "Tongan",
      "Turkish",
      "Turkmen",
      "Twi",
      "Ukrainian",
      "Urdu",
      "Uzbek",
      "Vietnamese",
      "Welsh",
      "Other",
    ],
  },
  _prolific4LanguagePrimary: {
    name: "_prolific4LanguagePrimary",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_prolific4LanguagePrimary [Prolific "Primary language"] (no default) is a comma-separated list of acceptable languages. Prolific uses OR to combine values within a parameter, and AND to combine across parameters. Prolific is international but based in UK; Enlish is the native language of a large fraction of their participants.',
    categories: [
      "Afrikaans",
      "Albanian",
      "Amharic",
      "Arabic",
      "Armenian",
      "Basque",
      "Belarusian",
      "Bengali",
      "Bulgarian",
      "Burmese",
      "Cantonese",
      "Catalan",
      "Chinese",
      "Croatian",
      "Czech",
      "Danish",
      "Dari",
      "Dutch",
      "Dzongkha",
      "English",
      "Esperanto",
      "Estonian",
      "Faroese",
      "Farsi",
      "Finnish",
      "French",
      "Gaelic",
      "Galician",
      "Georgian",
      "German",
      "Greek",
      "Gujarati",
      "Hakka",
      "Hebrew",
      "Hindi",
      "Hungarian",
      "Icelandic",
      "Indonesian",
      "Inuktitut",
      "Italian",
      "Japanese",
      "Khmer",
      "Korean",
      "Kurdish",
      "Laotian",
      "Lappish",
      "Latvian",
      "Lithuanian",
      "Macedonian",
      "Malay",
      "Malayalam",
      "Maltese",
      "Mandarin",
      "Nepali",
      "Norwegian",
      "Papiamento",
      "Pashto",
      "Polish",
      "Portuguese",
      "Punjabi",
      "Romanian",
      "Russian",
      "Scots",
      "Serbian",
      "Slovak",
      "Slovenian",
      "Somali",
      "Spanish",
      "Swahili",
      "Swedish",
      "Tagalog-Filipino",
      "Tajik",
      "Tamil",
      "Telugu",
      "Thai",
      "Tibetan",
      "Tigrinya",
      "Tongan",
      "Turkish",
      "Turkmen",
      "Twi",
      "Ukrainian",
      "Urdu",
      "Uzbek",
      "Vietnamese",
      "Welsh",
      "Other",
    ],
  },
  _prolific4LanguageRelatedDisorders: {
    name: "_prolific4LanguageRelatedDisorders",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_prolific4LanguageRelatedDisorders [Prolific "Language related disorders"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nDo you have any language related disorders?\nreading difficulty\nwriting difficulty\nother language related disorder\nnone\nnot applicable',
    categories: [
      "reading difficulty",
      "writing difficulty",
      "other language related disorder",
      "none",
      "not applicable",
    ],
  },
  _prolific4MusicalInstrumentExperience: {
    name: "_prolific4MusicalInstrumentExperience",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_prolific4MusicalInstrumentExperience [Prolific "Experience with musical instruments"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nExperience with musical instruments\nParticipants were asked the following question: Do you play a musical instument, if so for how many years?\n\nNo. I don\'t play a musical instrument\nYes. For 0-1 years.\nYes. For 1-2 years.\nYes. For 2-3 years.\nYes. For 3-4 years.\nYes. For 5+ years.',
    categories: ["No", "0-1", "1-2", "2-3", "3-4", "5+"],
  },
  _prolific4PhoneOperatingSystem: {
    name: "_prolific4PhoneOperatingSystem",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      "_prolific4PhoneOperatingSystem [Prolific \"Phone operating system\"] is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nPhone Operating System\nParticipants were asked the following question: What operating system (OS) does your primary mobile phone have?\nAndroid\niOS (iPhone)\nWindows\nOther/Not Applicable\nDon't Know\n\nNOTE: This selector is in the _prolific4 group because it's important for EasyEyes sound experiments. EasyEyes uses the participant's smartphone to calibrate the loudspeaker of the participant's desktop computer.\n",
    categories: ["Android", "iOS", "Windows", "Other", "Don't Know"],
  },
  _prolific4Vision: {
    name: "_prolific4Vision",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_prolific4Vision [Prolific "Vision"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nVision. Do you have normal or corrected-to-normal vision?\nYes\nNo\nRather not say\n• The parameter value will be a comma-separated list of: Yes, No, Rather not say.',
    categories: ["Yes", "No", "Rather not say"],
  },
  _prolific4VisionCorrection: {
    name: "_prolific4VisionCorrection",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_prolific4VisionCorrection [Prolific "Corrected vision"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nCorrected vision\nParticipants were asked the following question: I currently use glasses or contact lenses to correct my vision\nI mainly use glasses\nI mainly use contact lenses\nI use both glasses and contact lenses\nI do not use glasses or contact lenses',
    categories: ["glasses", "contacts", "both", "neither"],
  },
  _prolific4VRExperiences: {
    name: "_prolific4VRExperiences",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_prolific4VRExperiences [Prolific "Simulated experiences"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nSimulated Experiences\nParticipants were asked the following question: Have you engaged in any of the following simulated experiences before? Choose all that apply:\nVirtual reality\nAugmented reality\nMixed reality\nOther\nNot applicable / rather not say',
    categories: [
      "Virtual reality",
      "Augmented reality",
      "Mixed reality",
      "Other",
      "Not applicable",
    ],
  },
  _prolific4VRHeadsetFrequency: {
    name: "_prolific4VRHeadsetFrequency",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_prolific4VRHeadsetFrequency [Prolific "VR headset (frequency)"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query: \nVR headset (frequency)\nParticipants were asked the following question: In a given month, how frequently do you use a VR headset?\n0 times\n1-5 times\n6-10 times\n11-15 times\nmore than 15 times\nNot applicable / rather not say',
    categories: [
      "0 times",
      "1-5 times",
      "6-10 times",
      "11-15 times",
      "more than 15 times",
      "Not applicable / rather not say",
    ],
  },
  _prolific4VRHeadsetOwnership: {
    name: "_prolific4VRHeadsetOwnership",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      '_prolific4VRHeadsetOwnership [Prolific "VR headset (ownership)"] (no default), controls Prolific "VR Headset Ownership" and is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query: \nVR headset (ownership)\nParticipants were asked the following question: Do you own a VR (Virtual Reality) headset?\nYes\nNo\nDon\'t know / other\nNot applicable / rather not say',
    categories: [
      "Yes",
      "No",
      "Don't know / other",
      "Not applicable / rather not say",
    ],
  },
  _saveCursorPositionBool: {
    name: "_saveCursorPositionBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_saveCursorPositionBool (default FALSE) records cursor and crosshair position at every display frame throughout the experiment. At the end of the experiment, EasyEyes saves a CSV file to the \"data\" folder in the experiment's Pavlovia repository. (Based on the similar, but now deprecated _trackGazeExternallyBool.)\nCURSOR CSV TABLE. Each row of the EasyEyes CSV “cursor” table records posix time (in secs, floating point), x,y position (px) of the: crosshair, cursor, and (if present) target. We also include viewing distance (cm), x,y of closest point (px) to observer's eyes, experiment name, Pavlovia session ID, block number, condition number, conditionName, and trial number.\nNOTE: To download a cursor file (_saveCursorPositionBool=TRUE), Pavlovia must use the CSV results format (_pavlovia_Database_ResultsFormatBool=FALSE, the default). Otherwise the cursor data file will not appear. At some point we'll enhance the compiler to raise an error when both are true.",
  },
  _saveEachBlockBool: {
    name: "_saveEachBlockBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      '❌ _saveEachBlockBool works, but isn\'t recommended. Use _logFontsBool instead. \nWhen _saveEachBlockBool=TRUE (default is FALSE), the experiment will save to CSV as it begins each block. Thus, even if the participant abruptly quits or the computer freezes, the CSV file will always include the last active block. Usually _saveEachBlockBool will be FALSE because, unless absolutely necessary, we don’t want to use the internet in the middle of the session (to minimize delay and make the experiment more robust). But scientists will enable it when they want to know which block failed. \nSAVING. The extra saves enabled by _saveEachBlockBool are in addition to the always-performed saves at the beginning and "end" of the session. ("End" includes a shift of attention aways from the Compiler page, which is not the end if the participant returns.) All saves are alike in saving all currently known rows and parameters to the CSV file, and all saves are cumulative, only adding new data. The CSV file on Pavlovia is readable throughout, and grows in length with successive saves. EasyEyes first saves after the Requirements check, before the remote calibration (regardless of whether the remote calibrator runs), which is before the first block, and again at the "end," which includes four cases: 1. completion, 2. orderly termination through an error message or the escape mechanism including waiting out the "saving" window at the end, 3. closing the EasyEyes window before completion or termination, and 4. shift of browser focus away from the Compiler page before completion or termination. Saving does not end the experiment.  After shifting attention away, the participant can shift attention back to EasyEyes and continue the experiment, which will save again in any of the four ways. This can happen again and again. \nCAUTION: We introduced this in order to track down what happened to participants that are logged by Prolific and not Pavlovia. It helped, but some participants still escaped detection by Pavlovia. Also, we have the impression that enabling _saveEachBlockBool increased the probability of EasyEyes failing. So we introduced a new method, _logParticipantsBool, which is better. It seems not to cause failure and is more successful in detecting the participants who were undetected by Pavlovia. _logParticipantsBool saves a bit of data about the participant in a FormSpree server.  The data remains on that server and is automatically aggregated by Shiny when it analyzes the Pavlovia results. Shiny also aggregates the Proflific report if its included in the *.results.zip file of Pavlovia results. Our current advice is to enable _logParticipantsBool only if you\'re worried about Pavlovia failing to record participants that are logged by Prolific. ',
  },
  _saveSnapshotsBool: {
    name: "_saveSnapshotsBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      '🕑 _saveSnapshotsBool (default FALSE) controls whether snapshots are saved. We take a "snapshot" every time we call Google FaceMesh. Before January 2026 no image was saved. Going forward _saveSnapshotsBool will determine. When FALSE, we assure participants of photo privacy, promising that no image is saved, and we fullfil that promise. When TRUE, we save each snapshot as an image on a secure photo archive. In that case, EasyEyes removes the assurances of photo privacy, and the Consent form explains that the software will "capture one or more still images using your webcam." \n\nWe should save the images in a secure photo archive distinct from where we save the CSV file (so a break in of one does not imply a break in of the other). The CSV file includes the Prolific Participant ID, which if there were a security failure at Prolific, could be linked to the participant\'s name and email. We promise in the consent form that the photo is saved with just a code number. So EasyEyes should assign a code number to each photo when it\'s saved in the photo archive. We also promise to save photos for at most ten years, so we should include each photo\'s expiration date in its filename. The CSV file should include the code number for each image saved to the photo archive. \n\nShort IRB text for webcam images\nThis study uses your webcam to capture still images for research purposes. Images are used only by the research team, are stored securely, and are not used to identify you. You may stop participation at any time.\n\nFull IRB text for webcam images \nDuring this study, the computer may capture one or more still images using your webcam. The images will be used solely for research purposes related to this study (to verify viewing position and task performance). Unpublished images will not be used for identification, will not be shared outside the research team, and will not be used for any purpose other than those described here. Participation is voluntary, and you may choose not to continue the study at any time without penalty. The images will be stored securely (without identifying information beyond a code number) and will be accessible only to authorized members of the research team. Images will be kept for no longer than 10 years.\n\n',
  },
  _showDistanceCalibrationBool: {
    name: "_showDistanceCalibrationBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 _showDistanceCalibrationBool (default FALSE). When TRUE it shows a white pop-over with results of the the distance calibration. It remains until dismissed by clicking its close icon ☒.",
  },
  _showIrisesBool: {
    name: "_showIrisesBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "_showIrisesBool (default TRUE) controls whether to draw artificial irises on the face video throughout the whole experiment (not just after calibration). The presence and correct position of the artificial irises indicates to the participant that tracking is now in synch. Regardless of _showIrisBool, EasyEyes ignores any attempt to take a snapshot when tracking is out of synch. Hearing the shutter sound tells the participant that a snapshot was taken, so absence of the sound, when you press SPACE, signals that you need to press again (once the artificial irises catch up with your eyes).\nALSO see _showPerpendicularFootBool.",
  },
  _showPerpendicularFeetBool: {
    name: "_showPerpendicularFeetBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateDistanceShowEyeFeetBool instead.",
  },
  _showResourceLoadingBool: {
    name: "_showResourceLoadingBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      '🕑 _showResourceLoadingBool (default TRUE). As each EasyEyes study begins, before the "Initializing ..." message, the study shows a blank page while it loads all resources needed by the experiment. This can take many minutes if the internet connection is slow (e.g. 3 MB/s), which can seem broken. _showResourceLoadingBool mitigates the possibly long wait by showing the participant that EasyEyes is busy loading resources, e.g. "8:20:27 AM. Loading consentForm …". Turn this off if seeing your resource names might have an undesired effect on your participants, e.g. reveal your hypothesis. STATUS. Ritika worked on this, but did not succeed in getting it to work.',
  },
  _showSoundCalibrationResultsBool: {
    name: "_showSoundCalibrationResultsBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateSoundShowResultsBool instead.",
  },
  _showSoundParametersBool: {
    name: "_showSoundParametersBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use \n_calibrateSoundShowParametersBool instead.\n\n",
  },
  _showSoundTestPageBool: {
    name: "_showSoundTestPageBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateSoundShowTestPageBool instead.",
  },
  _soundCalibrationDialogEstimatedSec: {
    name: "_soundCalibrationDialogEstimatedSec",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "❌ Use _calibrateSoundDialogEstimatedSec instead.",
  },
  _stepperBool: {
    name: "_stepperBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_stepperBool (default FALSE) Enable runtime text handler that presents instructions step by step, and asks participant to use ▼ key to step through them. ▲ key goes back.",
  },
  _stepperHistory: {
    name: "_stepperHistory",
    availability: "now",
    type: "integer",
    default: "1",
    explanation:
      "_stepperHistory (default 1) If the new runtime text handler is enabled, this parameter determines how many old items are shown. ",
  },
  _textUsesHTMLBool: {
    name: "_textUsesHTMLBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "_textUsesHTMLBool (default FALSE) tells EasyEyes to use the HTML capability of PIXIJS text rendering. This allows us to use CSS, which we need to support variable fonts.",
  },
  _timeoutNewPhoneSec: {
    name: "_timeoutNewPhoneSec",
    availability: "now",
    type: "numerical",
    default: "15",
    explanation:
      "⭑ _timeoutNewPhoneSec (default 15) indicates how long to wait before timing out the connection of the computer to a new phone. If the phone's browser is too old to support our web page, it may freeze, so timing out is essential.",
  },
  _timeoutSec: {
    name: "_timeoutSec",
    availability: "now",
    type: "numerical",
    default: "1.00E+06",
    explanation:
      "❌ _timeoutSec is obsolete. Default 1e6. Use  _timeoutSoundCalibrationSec or _timeoutNewPhoneSec instead.",
  },
  _timeoutSoundCalibrationSec: {
    name: "_timeoutSoundCalibrationSec",
    availability: "now",
    type: "numerical",
    default: "1.00E+06",
    explanation:
      "⭑ _timeoutSoundCalibrationSec (default 1e6) indicates how long to wait before timing out. We set it long to allow for slow internet connections. This is for development. Ultimately EasyEyes should always cope with slow internet connections, but this aids our search for a general solution.\nIMPORTANT: The 1000 Hz sound calibration fails with _timeoutSoundCalibrationSec=20, and works with _timeoutSoundCalibrationSec=1e6. Experiments that need sound calibration should set _timeoutSoundCalibrationSec=1e6 to be safe until a lower safe value is found. (I'd guess that 60 would be enough, depending on how long the 1000 Hz recordings are.)",
  },
  _trackGazeExternallyBool: {
    name: "_trackGazeExternallyBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "When _trackGazeExternallyBool is TRUE (default is FALSE), then EasyEyes uses a RESTful node to turn on gaze tracking at onset of experiment and turn it off at end of experiment. And, at the end of the experiment, EasyEyes saves a CSV file to the Downloads folder. \nSTIMULUS CSV TABLE. Each row of the EasyEyes CSV “stimulus” table records posix time (in secs, floating point), x,y position (px) of the: crosshair, cursor, and (if present) target. We also include viewing distance (cm), x,y of closest point (px), experiment name, Pavlovia session ID, block number, condition number, conditionName, and trial number.\nGAZE CSV TABLE. We assume that the external gaze tracker creates another csv file. We have a MATLAB program for this. Each row of that “gaze” table records posix time (in secs, floating point) and x,y gaze position (px), roughly every 10 ms. \n\nEasyEyes and MATLAB drop their CSV tables into the Downloads folder. EasyEyes (“stimulus”) and MATLAB (“gaze”) each generate one file for the whole experiment.",
  },
  block: {
    name: "block",
    availability: "now",
    type: "integer",
    default: "1",
    explanation:
      '⭑ The block number (default 1) is required in every condition. The first condition (column C) must have block==1. After the first condition, each successive condition (column) rightward must have the same block number as the one preceding it, or increased by +1.\n\nExcel can automatically compute the block number for each condition after the first. The first condition (in column C) is block 1. Assuming "block" is in cell A7, then set Excel cell C7 to 1. The next condition\'s block is in cell D7. If it\'s the same block, set it to "=C7". If it\'s a new block, set it to "=C7+1". Doing that for the block number in all your conditions will make it easier to edit your experiment.\n\nSHUFFLING. Shuffling preserves the total number of blocks and conditions. Despite shuffling by blockShuffleGroups1, blockShuffleGroups2, etc., each block retains its original block number in the CSV results file. Blocks are performed and reported in the shuffled column order, left to right, so in the CSV results, the block number sequence will be nonmonotonic and will vary across participants, but the block numbers will correspond between the experiment spreadsheet and results files.',
  },
  blockShuffleGroups1: {
    name: "blockShuffleGroups1",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      'blockShuffleGroups1 (default is empty) requests shuffling the order of groups of blocks within the experiment. A "group" is a set of contiguous blocks whose included conditions all have the same "group name" (an alphanumeric string).\n\nPINNING. Any group whose name begins with underscore "_" is pinned. For example, groups "_A" and "_group1" would be pinned. Unlike unpinned groups, a pinned group is not shuffled (with the other groups in its depth). Groups inside a pinned group still shuffle within it, as usual.\n\nThe number N at the end of the blockShuffleGroups(N) parameter name is its "depth". Larger numbers are "deeper". For example, blockShuffleGroups3 has depth 3 and is deeper than blockShuffleGroups2.\n\nThe implicit depth zero has one nameless group containing all blocks. For depth N, in the range 1 to 6, a group is defined by putting the same group name in all the conditions in one or more contiguous whole blocks in a blockShuffleGroups(N) row. blockShuffleGroups1 can be used alone. At greater depth, each group at depth N must be a subset of a containing group at depth N-1.\n\nblockShuffleGroups(N) specifies the groups at depth N. The groups will have various numbers of blocks. Order follows the left-to-right positions of the columns. Not all blocks need be in groups. Within each containing group (in the row immediately above), EasyEyes counts the groups (from left to right) \nwhose names don\'t start with underscore, creates a shuffled list of the numbers from 1 to n, where n is the total count, and then replaces the i-th group by the group whose index is i-th in the shuffled list. \n\nDeeper groups are shuffled before shallower groups. Shuffling preserves the total number of blocks and conditions. To ease analysis, despite shuffling, each block retains its original block number in the CSV results file. Blocks are performed and reported in the shuffled column order, left to right, so in the CSV results, the block number sequence will be nonmonotonic and will vary across participants.\n\nEasyEyes compiler requirements. Each cell in any blockShuffleGroups(N) row must be empty or have a group name. All the cells in a block must be the same. All the blocks in a group must be contiguous, and have the same group name.  Imagine an implicit row at depth zero with one group containing all blocks.  Each group defined at a depth N (in range 1 to 6) must be a subset of a containing group at depth N-1.',
  },
  blockShuffleGroups2: {
    name: "blockShuffleGroups2",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      'blockShuffleGroups2 (default is empty) allows the scientist to join one or more contiguous blocks by giving all the included conditions the same "group name" (an alphanumeric string), and requests shuffling the order of those groups within the blockShuffleGroups1 group that contains them. \n\nSee blockShuffleGroups1.',
  },
  blockShuffleGroups3: {
    name: "blockShuffleGroups3",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      'blockShuffleGroups3 (default is empty) allows the scientist to join one or more contiguous blocks by giving all the included conditions the same "group name" (an alphanumeric string), and requests shuffling the order of those groups within the blockShuffleGroups2 group that contains them. \n\nSee blockShuffleGroups1.',
  },
  blockShuffleGroups4: {
    name: "blockShuffleGroups4",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      'blockShuffleGroups4 (default is empty) allows the scientist to join one or more contiguous blocks by giving all the included conditions the same "group name" (an alphanumeric string), and requests shuffling the order of those groups within the blockShuffleGroups3 group that contains them. \n\nSee blockShuffleGroups1.',
  },
  blockShuffleGroups5: {
    name: "blockShuffleGroups5",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      'blockShuffleGroups5 (default is empty) allows the scientist to join one or more contiguous blocks by giving all the included conditions the same "group name" (an alphanumeric string), and requests shuffling the order of those groups within the blockShuffleGroups4 group that contains them. \n\nSee blockShuffleGroups1.',
  },
  blockShuffleGroups6: {
    name: "blockShuffleGroups6",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      'blockShuffleGroups6 (default is empty) allows the scientist to join one or more contiguous blocks by giving all the included conditions the same "group name" (an alphanumeric string), and requests shuffling the order of those groups within the blockShuffleGroups5 group that contains them. \n\nSee blockShuffleGroups1.',
  },
  calibrateBlindSpotBool: {
    name: "calibrateBlindSpotBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      '⚠ MOST PEOPLE SHOULD USE calibrateTrackDistanceBool INSTEAD. Set calibrateBlindSpotBool TRUE (default FALSE) to make an initial measurement of viewing distance by mapping the blind spot, as suggested by the Li et al. (2020) "Virtual chinrest" paper, enhanced by flickering the target and manual control of target position. Use calibrateTrackDistanceBool or calibrateBlindSpotBool, not both. calibrateTrackDistanceBool maps the blind spot AND tracks viewing distance for the whole experiment. That\'s what most scientists want.',
  },
  calibrateDistanceBool: {
    name: "calibrateDistanceBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "⭑ Set calibrateDistanceBool TRUE (default FALSE) to calibrate and use the webcam to track viewing distance. This is enabled independently for each condition. Calibration is done at the beginning of the experiment if any condition sets calibrateDistanceBool=TRUE. _calibrateDistance specifies which method calibrateDistanceBool uses to get distance initially. From then on, it uses Google FaceMesh to track viewing distance. Use \n_calibrateDistance=blindspot\nor\n=object\nor \n=blindspot, object\nfor both. In preliminary testing (one participant), accuracy is better than 5% at viewing distances of 40 to 130 cm. \n\nNOTE: Set calibrateDistanceBool=TRUE in each condition for which you want to use nudging to control viewing distance, as specified by viewingDistanceAllowedRatio.",
  },
  calibrateDistanceCheckBool: {
    name: "calibrateDistanceCheckBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateDistanceCheckBool instead.",
  },
  calibrateFrameRateUnderStressBool: {
    name: "calibrateFrameRateUnderStressBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "⚠ WORKS BUT FAILS TO PREDICT TIMING PROBLEMS, SO NOT USEFUL. Set calibrateFrameRateUnderStressBool TRUE (default FALSE) to ask the Remote Calibrator (which runs at beginning of the experiment) to run a several-second-long test of graphics speed. The test is run if any condition requests it, and is only run once, regardless of the number of requests. This value is reported by the output parameter frameRateUnderStress in the CSV data file⚠",
  },
  calibrateGazeCheckBool: {
    name: "calibrateGazeCheckBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "To check gaze tracking we don’t need a measuring device, and hardly any instructions. I think we could just put up our fixation cross in a few random places and ask them to click on it. It will be very similar to the training and we don’t need to tell the participant that we progressed from training to checking.",
  },
  calibratePupillaryDistanceBool: {
    name: "calibratePupillaryDistanceBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use calibrateBlindSpotBool instead.        ",
  },
  calibrateScreenSizeAllowedRatio: {
    name: "calibrateScreenSizeAllowedRatio",
    availability: "now",
    type: "numerical",
    default: "1.03",
    explanation:
      "calibrateScreenSizeAllowedRatio (default 1.03) rejects bad measurement of credit card and object length during calibration, by specifying the tolerance between two measurements. \ncalibrateScreenSizeAllowedRatio sets the maximum ratio of the two measurements, M1 and M2.\nM1 = lengthCm in first calibration\nM2 = lengthCm in second calibration\nThe test fails if \nmax(M1/M2, M2/M1) > max(calibrateScreenSizeAllowedRatio, calibrateScreenSizeAllowedRatio). \nIf the test fails, then EasyEyes doesn’t accept the measurements.\nIn that case, increment by 1 the number of measurements N to make, and do the measurement.",
  },
  calibrateScreenSizeBool: {
    name: "calibrateScreenSizeBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "⭑ calibrateScreenSizeBool (default TRUE). Before block 1, gets the participant's help to measure the screen size, by matching the size of an image to a real credit card (or USB-A or USB-C connector). EasyEyes computes pxPerCm from this. Screen resolution (number of pixels) is known, so this gives us screen size in cm. Thanks to Li et al. 2020.",
  },
  calibrateScreenSizeCheckBool: {
    name: "calibrateScreenSizeCheckBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "Setting calibrateScreenSizeCheckBool TRUE (default FALSE) asks the participant to use a ruler, yardstick, meter stick, or tape measure to measure the distance directly to assess accuracy.",
  },
  calibrateScreenSizeTimes: {
    name: "calibrateScreenSizeTimes",
    availability: "now",
    type: "categorical",
    default: "1",
    explanation:
      "calibrateScreenSizeTimes (default 1). Specify how many times (N) to measure credit-card (or USB) size. Randomize the initial credit-card size each time, and place the credit-card image at a different random location on the screen each time, but avoid awkward locations (top third of screen).\nN ≤ 0. Not allowed. Compiler error.\nN = 1. One measurement is always accepted.\nN ≥ 2. Make N measurements. After N, keep measuring until at least two measurements (of all made) are consistent. Report the geometric mean of the consistent measurements (can be more than 2).\n\nSave all measurements in calibrateScreenSizeJSON.",
    categories: ["1", "2"],
  },
  calibrateSound1000HzBool: {
    name: "calibrateSound1000HzBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateSound1000HzBool instead.",
  },
  calibrateSound1000HzDB: {
    name: "calibrateSound1000HzDB",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateSound1000HzDB instead.",
  },
  calibrateSound1000HzMaxSD_dB: {
    name: "calibrateSound1000HzMaxSD_dB",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateSound1000HzMaxSD_dB instead.",
  },
  calibrateSound1000HzPostSec: {
    name: "calibrateSound1000HzPostSec",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateSound1000HzPostSec instead.",
  },
  calibrateSound1000HzPreSec: {
    name: "calibrateSound1000HzPreSec",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateSound1000HzPreSec instead.",
  },
  calibrateSound1000HzSec: {
    name: "calibrateSound1000HzSec",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateSound1000HzSec instead.",
  },
  calibrateSoundAllHzBool: {
    name: "calibrateSoundAllHzBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateSoundAllHzBool instead.",
  },
  calibrateSoundAllHzDB: {
    name: "calibrateSoundAllHzDB",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateSoundAllHzDB instead.",
  },
  calibrateSoundMaxHz: {
    name: "calibrateSoundMaxHz",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateSoundMaxHz instead.",
  },
  calibrateSoundMinHz: {
    name: "calibrateSoundMinHz",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateSoundMinHz instead.",
  },
  calibrateSoundSaveToCSVBool: {
    name: "calibrateSoundSaveToCSVBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateSoundSaveCSVBool instead.",
  },
  calibrateSoundToleranceDB: {
    name: "calibrateSoundToleranceDB",
    availability: "now",
    type: "numerical",
    default: "1.5",
    explanation: "Use _calibrateSoundToleranceDB instead.",
  },
  calibrateTrackDistanceBool: {
    name: "calibrateTrackDistanceBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _calibrateDistanceBool instead.",
  },
  calibrateTrackGazeBool: {
    name: "calibrateTrackGazeBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "⚠ WORKS BUT NOT RECOMMENDED BECAUSE ACCURACY IS ABOUT 3 DEG (better if camera has more pixels), AND IT REQUIRES FREQUENT RECALIBRATION, WHICH THE PARTICIPANTS FIND TIRESOME. Set calibrateTrackGazeBool TRUE (default FALSE) to calibrate and use the webcam for gaze tracking. Calibration occurs once for the whole block, before the first trial, if any condition(s) set calibrateTrackGazeBool=TRUE. Gaze tracking uses the built-in webcam to monitor where the participant's eyes are looking. To be clear, in gaze tracking, the webcam looks at your eyes to figure out where on the screen your eyes are looking. It estimates that screen location. Gaze-contingent experiments change the display based on where the participant is looking. Peripheral vision experiments typically require good fixation and may discard trials for which fixation was too far from the fixation mark. Precision is low, with a typical error of 3 deg at 50 cm. We expect the error, in deg, to be proportional to viewing distance.",
  },
  closestPointEccentricitySetting: {
    name: "closestPointEccentricitySetting",
    availability: "now",
    type: "categorical",
    default: "",
    explanation:
      "🕑 closestPointEccentricitySetting (no default). VIEWING GEOMETRY\nviewingDistanceCm = distance from eye to closest point.\nclosestPointXYInUnitSquare=[0.8 0.5]; % Rough location of closest point in screenRect re lower left corner.\nclosestPointXYPix % screen coordinate of point on screen closest to viewer's eyes. Y goes down.\nclosestPointXYDeg % eccentricity of closest point re fixation. Y goes up.\nclosestPointEccentricitySetting\n1. Set closestPointXYPix according to closestPointXYInUnitSquare.\n2. If closestPointEccentricitySetting==\n'target', then set closestPointXYDeg=eccentricityXYDeg\n'fixation', then set closestPointXYDeg=[0 0].\n'value', then assume closestPointXYDeg is already set.\n3. Ask viewer to adjust display so desired closest point is at desired\nviewing distance and orthogonal to line of sight from eye.\n4. If using off-screen fixation, put fixation at same distance from eye\nas the closest point, and compute its position relative to closest point.",
    categories: ["target", "fixation", "value"],
  },
  conditionEnabledBool: {
    name: "conditionEnabledBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      '⭑ conditionEnabledBool (default TRUE) allows you to easily and reversibly omit individual conditions from your experiment. Block-number checking ignores conditionEnabledBool. Except for that, any condition (column C or greater in the experiment table) containing conditionEnabledBool===FALSE is ignored. The compiler ignores conditionEnabledBool when it checks for consecutive block numbering. [From left to right, the first condition column (C) must have block=1, and the block number of each further nonempty column must be the same as or one more than the block number of the column to its left.] Use conditionEnabledBool to easily and reversibly omit conditions during development without deleting columns or renumbering blocks.\n     conditionEnabledBool ignores a column. To ignore a row, insert % as its first character in column A.\n     EXAMPLE. As noted above, disabling a column, unlike deleting it, doesn\'t affect block numbering. If you have three blocks and disable block 2, you\'ll be left with blocks 1 and 3 active, and the compiler won\'t complain. If, instead, you deleted block 2 then you\'d have to renumber block "3" to be "2", or get a compiler error about non-consecutive block numbering.\n     NOTE. The compiler\'s enforcement of consecutive block numbering ignores conditionEnabledBool. Other than that, values in ignored columns (conditionEnabledBool==FALSE) should not affect the compiled program. If you find such an effect, please report it as a bug. Send a short experiment that exhibits the problem to denis.pelli@nyu.edu with subject "EASYEYES BUG".',
  },
  conditionGroup: {
    name: "conditionGroup",
    availability: "now",
    type: "integer",
    default: "0",
    explanation:
      '🕑 conditionGroup (empty default) imposes consistent screen markings across a set of conditions. Screen markings before and during stimulus presentation indicate the positions of the fixation and possible targets. There are many parameters, below, whose names begin with "marking" that allow you to customize markings.  Within a block, all conditions with the same nonzero conditionGroup number are presented with the same markings (fixation cross "+" and target "x") to avoid giving any clue as to which of the possible targets will appear on this trial. Thus, one can implement uncertainty among the targets in any set simply by putting them all in one block, with one condition for each target, giving all the conditions the same nonzero conditionGroup number. There can be any number of conditions in a condition group, and there can be any number of condition groups in a block. Every condition belongs to a condition group. A condition with a zero or unique conditionGroup number belongs to a condition group with just that condition.',
  },
  conditionLanguage: {
    name: "conditionLanguage",
    availability: "now",
    type: "categorical",
    default: "English",
    explanation:
      "conditionLanguage (default English) allows you to specify the language associated with this condition. Currently EasyEyes doesn't use this, but it will be very helpful for plotting data in Shiny. We already find it very helpful, when plotting, to automatically assign a different color to each font. That also distinguishes English and Arabic. But it would also be useful to distinguish English and Italian. Setting conditionLanguage makes it easy to implement the desired behavior in Shiny. ",
    categories: [
      "Arabic",
      "Armenian",
      "Bulgarian",
      "Chinese (Simplified)",
      "Chinese (Traditional)",
      "Croatian",
      "Czech",
      "Danish",
      "Dutch",
      "English",
      "Finnish",
      "French",
      "German",
      "Greek",
      "Hebrew",
      "Hindi",
      "Hungarian",
      "Icelandic",
      "Indonesian",
      "Italian",
      "Japanese",
      "Kannada",
      "Korean",
      "Lithuanian",
      "Malay",
      "Malayam",
      "Norwegian",
      "Persian",
      "Polish",
      "Portuguese",
      "Romanian",
      "Russian",
      "Serbian",
      "Spanish",
      "Sudanese",
      "Swahili",
      "Swedish",
      "Tagalog",
      "Turkish",
      "Urdu",
    ],
  },
  conditionName: {
    name: "conditionName",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "⭑ conditionName (no default) labels each condition in your data as a potential guide to subsequent data analysis. Need not be unique. It's fine to give several (possibly identical) conditions the same conditionName, to guide analysis. Not used by EasyEyes, but reported in any error message. Set showConditionNameBool=TRUE to display it on screen during each trial. The R software that we are developing to analyze CSV results files will parse any conditionNames that include a period into a first and second part, before and after the period. This will identify factors that the scientist wants to use in analysis. ",
  },
  conditionTrials: {
    name: "conditionTrials",
    availability: "now",
    type: "integer",
    default: "35",
    explanation:
      "⭑ conditionTrials (no default) is the number of trials of this condition requested in this block. Each condition can have a different number of trials. They are all randomly interleaved. \n\nBAD TRIALS. Several parameters, including fontDetectBlackoutBool, thresholdAllowedDuration and thresholdAllowedLateness, can reject trials for various reasons, e.g. blackout or disallowed duration or lateness. When a trial is rejected, we call it \"bad\", and it's not passed to Quest, and won't be part of the threshold estimate. The CSV file retains the bad trial's result so you could reanalyze your data including the bad trials.\n\nHOW MANY REDOS? Up to a limit, EasyEyes will schedule a new trial of this condition to replace the bad trial. This is called a \"redo\" trial. conditionTrials tells EasyEyes how many trials you want to send to Quest. Use the parameter thresholdReplacementReRequestedTrials to set the number of redos that you'll allow. The max number of redos is \nthresholdReplacementReRequestedTrials ✕ conditionTrials.\n\nNOTE: conditionTrials is ignored when targetKind==reading.\n\nSee also thresholdReplacementReRequestedTrials, fontDetectBlackoutBool, thresholdAllowedDuration, thresholdAllowedLateness.",
  },
  digits: {
    name: "digits",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      'digits (default “0123456789٠١٢٣٤٥٦٧٨٩”) lists the characters that should be called "digits", as opposed to "letters", in instructions, 0123456789 are the "Arabic" numerals used in most languages. "٠١٢٣٤٥٦٧٨٩" are the digits in standard Arabic. (Arabic is mostly read right to left, but Arabic digits are read left to right.) Set "digits" to any list of characters that you want to call "digits".',
  },
  EasyEyesLettersVersion: {
    name: "EasyEyesLettersVersion",
    availability: "now",
    type: "categorical",
    default: "2",
    explanation:
      "EasyEyesLettersVersion (default 2) selects the version of the software (1 or 2) for generating letter stimuli. Version 2 supports acuity, typographic crowding, and screen-symmetric ratio crowding. Also, ratio crowding in version 2 currently supports only 3 letters, not 9, i.e. you can't yet set spacingDirection=horizontalAndVertical or =radialAndTangential. You select version independtly for each condition. Version 1 works quite well, with some letters falling partly off screen, and partial letters. Version 2 has just been deployed and is being tested now. We expect it to be accurate.\n\nUsing EasyEyesLettersVersion=2 and spacingRelationToSize=ratio, currently spacingSymmetry must be “screen” and spacingDirection cannot be “horizontalAndVertical” or “radialAndTangential”. Use “horizontal”, “vertical”, “radial”, or “tangential”.",
    categories: ["1", "2"],
  },
  errorBool: {
    name: "errorBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "FOR DEBUGGING. errorBool (default FALSE) throws a fatal error in the first condition for which this parameter is TRUE. This is used to check out the EasyEyes error reporting.",
  },
  errorEndsExperimentBool: {
    name: "errorEndsExperimentBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      '🕑 errorEndsExperimentBool (default FALSE) determines what happens after a fatal error in a condition. Every error report is a pop up that names the error and offers only one button, i.e. no choice. If errorEndsExperimentBool=TRUE then a "Save and Exit" button tells EasyEyes to terminate the experiment. If FALSE then a "Next Block" button tells EasyEyes to continue at the next block. The participant has no choice. The scientist sets this independently for each condition throughout the experiment.\n\nIf an error occurs outside of a condition (i.e. before first block or in a block before first trial), then use TRUE.\n\nCOMPLETION CODE AT END OF EXPERIMENT WITH ERROR. We’re going to change our handling of the completion code. Currently when there’s a fatal error, EasyEyes does NOT return a completion code. That makes the participant’s contribution seem suspect in the Prolific dash board, even though the error is practically always due to a fault in EasyEyes, marring a best-faith effort by the participant. That denial of “completion” seems unfair to the participant. NEW POLICY: If we have an error in the middle, but eventually finish normally (including the case of an error in the last block), EasyEyes will consider the experiment “complete”, and return the completion code. That’s more fair to participants, graphically confirming that they did the work. Thus “completion” will refer to the orderly return from EasyEyes back to the caller (e.g. Prolific), even though some blocks (conceivably all blocks) may have been skipped due to errors. Prolific will declare the experiment as complete, and give it a green check. Properly handled errors will be invisible to Prolific. When we issue the completion code we also set a flag in the CSV file, indicating that it ended normally. Shiny reports this in the Shiny Sessions table.',
  },
  fixationCheckBool: {
    name: "fixationCheckBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "🕑 fixationCheckBool (default FALSE). Display a foveal triplet that is easy to read if the participant's eye is on fixation, and hard to read if the eye is elsewhere.",
  },
  fixationLocationStrategy: {
    name: "fixationLocationStrategy",
    availability: "now",
    type: "categorical",
    default: "centerFixation",
    explanation:
      '🕑  fixationLocationStrategy (default centerFixation) specifies the strategy by which EasyEyes places the fixation point, which is the origin of the visual coordinate system relative to the fixationOriginXYScreen. Most experimenters will choose centerFixation, the default, which simply places fixation at the fixationOriginXYScreen. For peripheral testing, you might set fixationOriginXYScreen near one edge of the display to maximize the eccentricity of a target at the opposite edge. Fixation, whether on- or off-screen, is always internally specified as a point in (x,y) display coordinates in the plane of the display (origin at lower left corner). (When the crosshair moves, fixation moves with it. In that case we also refer to the fixed "nominal" fixation at the static center of the motion.) The compiler requires that all conditions in a block have the same fixation point, fixationLocationStrategy, and fixationOriginXYScreen.\n• centerFixation places fixation at the fixationOriginXYScreen. This is the default.\n🕑 • centerTargets sets the (possibly offscreen) fixation location so as to maximize the screen margin around the edges of all the possible targets.  We consider all possible targets across all conditions within the block.  \n🕑 • centerFixationAndTargets places fixation so as to maximize the screen margin around the fixation and the edges of all the possible targets within the block. We consider all possible targets across all conditions within the block.  \n🕑 To test even farther into the periphery, you might want to set fixationRequestedOffscreenBool TRUE and place the fixation off-screen by putting tape on a bottle or a box and drawing a fixation cross on it.\n\nSatisfying centerTargets or centerFixationAndTargets may be impossible beyond a certain maximum viewing distance (in cm) proportional to screen size (in cm). We generally don\'t know the screen size at compile time, as each participant has their own computer. Currently the scientist can only specify viewing distance as a fixed number of cm. \n\n[Since short viewing distances are uncomfortable, it might be useful to be able to request the maximize viewing distance such that the screen will have a needed visual subtense. In effect, this requests a viewing distance that is a multiple of screen width or height.]',
    categories: ["centerFixation", "centerFixationAndTargets", "centerTargets"],
  },
  fixationOriginXYScreen: {
    name: "fixationOriginXYScreen",
    availability: "now",
    type: "text",
    default: "0.5, 0.5",
    explanation:
      "fixationOriginXYScreen (default 0.5, 0.5). If fixationLocationStrategy is centerFixation (which is the default), then fixationOriginXYScreen specifies fixation's X,Y coordinate in the screen plane, as a fraction of screen width and height. The lower left corner is (0,0), and the upper right corner is (1,1). Normally the specified point must lie in that unit square (enforced by compiler), but if fixationRequestedOffscreenBool==TRUE then the specified point can be anywhere. WHEN ENTERING SEVERAL NUMBERS IN ONE CELL, WE STRONGLY SUGGEST BEGINNING WITH A SPACE, AND PUTTING A SPACE AFTER EVERY COMMA. THIS PREVENTS EXCEL FROM MISINTERPRETING THE STRING AS A SINGLE NUMBER. ",
  },
  fixationRequestedOffscreenBool: {
    name: "fixationRequestedOffscreenBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 fixationRequestedOffscreenBool (default FALSE). To test the far periphery, with help from the participant, it may be worth the trouble of setting up an off-screen fixation mark. Set fixationRequestedOffscreenBool TRUE and EasyEyes will ask the participant to put tape on a bottle or box and draw a crosshair on it. To figure out where the crosshair is, EasyEyes will display arrows on the display and ask the participant to drag the arrow heads to point to the crosshair.",
  },
  flankerCharacterSet: {
    name: "flankerCharacterSet",
    availability: "now",
    type: "text",
    default: "abcdefghijklmnopqrstuvwxyz",
    explanation:
      "🕑 flankerCharacterSet (default is the fontCharacterSet) is like fontCharacterSet but for the flankers. ",
  },
  flankerFont: {
    name: "flankerFont",
    availability: "now",
    type: "text",
    default: "Roboto Mono",
    explanation:
      "🕑 flankerFont (default is the font) is like font, but for the flankers. ",
  },
  flankerFontSource: {
    name: "flankerFontSource",
    availability: "now",
    type: "categorical",
    default: "google",
    explanation:
      "🕑 flankerFontSource (default is google) is like fontSource, but for the flankers. ",
    categories: ["file", "google", "browser"],
  },
  flankerNumber: {
    name: "flankerNumber",
    availability: "now",
    type: "integer",
    default: "1",
    explanation:
      "🕑 flankerNumber (default 1) is the number of flanker characters on each side of the target. Flankers are added on radial lines radiating from the target and going through each initial flanker. Each flanker is a random sample without replacement from flankerCharacterSet, if defined, otherwise from fontCharacterSet. Note that when drawing from fontCharacterSet the flankers are all different from the target. When drawing from flankerCharacterSet there is no target-based restriction.",
  },
  flankerSpacingDeg: {
    name: "flankerSpacingDeg",
    availability: "now",
    type: "numerical",
    default: "",
    explanation:
      "🕑 flankerSpacingDeg (default is the spacingDeg) is the center-to-center spacing between repeated flankers, as determined by flankerNumber. This is independent of spacingDeg, which specifies the center-to-center spacing of the target and each adjacent flanker.",
  },
  flipScreenHorizontallyBool: {
    name: "flipScreenHorizontallyBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 Set flipScreenHorizontallyBool to TRUE (default is FALSE) when the display is seen through a mirror.",
  },
  font: {
    name: "font",
    availability: "now",
    type: "text",
    default: "Roboto Mono",
    explanation:
      '⭑ font specifies the font used to draw the target and text for reading. The compiler checks for font availability and issues a compile-time error if this fails. (However, fontSource="browser" can only be checked at runtime.) How you specify the font depends on the chosen fontSource:\n\nfile: font is the filename (including the extension: .woff2, .woff, .otf, or .ttf) of a font file in your EasyEyes Resources:Fonts folder in your Pavlovia account. Web font experts strongly recommend that you use the WOFF2 format, if you have it, instead of any other, because it\'s the smallest (half of OTF), for fast download, and is supported by all modern browsers. The compiler will download the font file from your Fonts folder in your Pavlovia EasyEyesResources repo to your temporary local Experiment folder, which is then uploaded to a new Pavlovlia repo for your experiment.  (Other font types, e.g. SVG and EOT, are not widely supported by browser implementations of the @font-face command.)\nhttps://developer.mozilla.org/en-US/docs/Web/CSS/@font-face\n\ngoogle: font is the filename (without extension) of a font file provided by the free Google Font server. \n\nadobe: font contains the web font name as recognized by the Adobe Fonts server. \n• To discover an Adobe font’s exact web name, find the font’s page in https://fonts.adobe.com/.  In that page’s lower right corner, find “To use this font on your website”. Copy the “font-family” up to the first comma. E.g. if you see font-family: proxima-nova, sans-serif; copy just “proxima-nova”.\n• Some Adobe fonts are free and can be accessed through a free Adobe Creative Cloud account. Most require a paid Adobe Creative Cloud account. Adobe offers full-price and educationally-discounted subscriptions.\nhttps://www.adobe.com/creativecloud/plans.html\n\ntypeSquare: font contains the font name as recognized by the TypeSquare Fonts server (primarily for Japanese fonts). TypeSquare requires an account. TypeSquare allows limited free use. \nhttps://typesquare.com/en/\n\nbrowser: The experiment will pass the font preference string that you place in font to the participant\'s browser and accept whatever the browser provides.  Your string can include several font names, separated by commas, first choice first, to help the browser find something close to your intent. This is the usual way to select a font on the web, and never generates an error.  Specify just the family name, like "Verdana", and use the "fontStyle" to select italic, bold, or bold-italic. Some "web safe" fonts (e.g. Arial, Verdana, Helvetica, Tahoma, Trebuchet MS, Times New Roman, Georgia, Garamond, Courier New, Brush Script MT) are available in most browsers. In ordinary browsing, it\'s helpful that browsers freely substitute fonts so that you almost always get something readable in the web page you\'re reading. In the scientific study of perception, we usually don\'t want data with a substituted font. So, normally, you should specify "file" or "server" so you\'ll know exactly what was shown to the participant. \n\nEasyEyes preloads all fonts. At the beginning of the experimen, EasyEyes preloads all needed fonts, for the whole experiment (all conditions), so, after preload, the experiment runs with no font-loading delay and no need for internet, except to save data at the end.\n\nLICENSING. Fonts are intellectual property, and you normally need a license to use them. Buying a font for "desktop" use typically gets you an OTF or TTF font file and a license for desktop use. Buying for "web" use typically gets you WOFF and WOFF2 font files and a license for web use. Using a font with EasyEyes is web use. If you don\'t have a WOFF or WOFF2 file, an OTF or TTF file will work, but beware of the possibility that you may not have a license to use it on the web. Most font designer struggle to make a living. We should pay the license fees to use their fonts.\n\nZAPFINO. EasyEyes works well with all but one of the many fonts we\'ve tried. The exception is Zapfino. Zapfino text is always left of where it should be by 14% of the nominal font size. The error is surprising. We don\'t have a theory to explain it. We implemented fontPixiMetricsString to fix this, but it has no effect. [Note that Zapfino requires fontPadding of at least 0.5.] ',
  },
  fontBoundingScalar: {
    name: "fontBoundingScalar",
    availability: "now",
    type: "numerical",
    default: "1",
    explanation:
      "⚠ fontBoundingScalar (default 1.0) was a temporary workaround used to prevent letters from falling partly offscreen. It allows the scientist to scale up the font’s bounding box. We rewrote the code that lays out text for typographic crowding, so there should no longer be any need for this hask.",
  },
  fontCharacterSet: {
    name: "fontCharacterSet",
    availability: "now",
    type: "text",
    default: "abcdefghijklmnopqrstuvwxyz",
    explanation:
      "⭑ fontCharacterSet is a string of unicode characters. \nLETTER IDENTIFICATION: On each trial, the target and flankers are randomly drawn from this character set, without replacement. Allowed responses are restricted to this character set. The other keys on the keyboard are dead. Letters may appear more than once in the string, to increase their probability of being drawn, but once one is drawn any identical letters are removed with it, so the drawn samples won't have any repeats. (We have no experience using repeats in the fontCharacterSet.)\nREADING: The fontCharacterSet string is used to estimate typical spacing. For English I use lowercase a-z. ",
  },
  fontColorRGBA: {
    name: "fontColorRGBA",
    availability: "now",
    type: "text",
    default: "0, 0, 0, 1",
    explanation:
      'fontColorRGBA (default 0, 0, 0, 1 i.e. black) is a comma-separated list of four numbers (each ranging from 0 to 1) that specify font color for each condition. "RGB" are the red, green, and blue channels; "A" controls opacity (0 to 1). 0, 0, 0, 1 is black and 1, 1, 1, 1 is white.  Use screenColorRGBA to control the background color. The ColorRGBA controls include fontColorRGBA, instructionFontColorRGBA, markingColorRGBA, screenColorRGBA, and targetColorRGBA. WHEN ENTERING SEVERAL NUMBERS IN ONE CELL, WE STRONGLY SUGGEST BEGINNING WITH A SPACE, AND PUTTING A SPACE AFTER EVERY COMMA. THIS PREVENTS EXCEL FROM MISINTERPRETING THE STRING AS A SINGLE NUMBER. ',
  },
  fontContextualAlternativesBool: {
    name: "fontContextualAlternativesBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      '🕑 fontContextualAlternativesBool (default FALSE) will implement the OpenType feature called "contextual alternatives", which is either on or off. It is not yet implemented. We have a Trello card for it. \nhttps://trello.com/c/zC1FCp4o',
  },
  fontDirection: {
    name: "fontDirection",
    availability: "now",
    type: "categorical",
    default: "ltr",
    explanation:
      'fontDirection (default "ltr") replaces fontLeftToRightBool, to expand the choices to include vertical as well as horizontal writing directions.\nfontDirection= "ltr";         /* horizontal, left to right */\nfontDirection= "rtl";         /* horizontal, right to left */\nfontDirection= "vertical-rl"; /* vertical, top to bottom, columns right to left */\nfontDirection="vertical-lr";  /* vertical, top to bottom, columns left to right */\nThe immediate motivation for adding fontDirection is to more fully support Japanese, which can be written either ltr or vertical-rl.',
    categories: ["ltr", "rtl", "vertical-rl", "vertical-lr"],
  },
  fontFeatureSettings: {
    name: "fontFeatureSettings",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '🕑 fontFeatureSettings (no default) allows the scientist to specify how the font should use its glyphs to render a script or language. fontFeatureSettings receives a string. The default is the empty string. A typical value is\n"calt" 1\nor\n"calt" 1, "smcp", "zero"\nEach line above is a string that is passed to the CSS function "font-variation-settings". The (single or double) quote marks are required. Each four letter code is taken from a long list of possible font features. "calt" enables the font’s "contextual alternates", especially connections between adjacent letters in a script font. "smcp" enables small caps. "zero" requests a slash through the zero character to distinguish it from capital O. Most font features are Boolean and accept an argument of 0 for off and 1 for on. Some accept an integer with a wider range. Supported by all modern browsers, and even Internet Explorer.\nhttps://developer.mozilla.org/en-US/docs/Web/CSS/font-feature-settings\nhttps://docs.microsoft.com/en-us/typography/opentype/spec/features_ae#tag-calt\nhttps://helpx.adobe.com/in/fonts/using/open-type-syntax.html\nhttps://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-ligatures\nhttps://en.wikipedia.org/wiki/Ligature_(writing)\nhttps://stackoverflow.com/questions/7069247/inserting-html-tag-in-the-middle-of-arabic-word-breaks-word-connection-cursive/55218489#55218489',
  },
  fontKerning: {
    name: "fontKerning",
    availability: "now",
    type: "text",
    default: "normal",
    explanation:
      "🕑 fontKerning (default auto) uses the fontKerning Canvas command to enable or disable kerning: auto (yes/no as dictated by browser), normal (yes), or none (no).\nhttps://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fontKerning",
  },
  fontLatencyPt: {
    name: "fontLatencyPt",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "🕑 fontLatencyPt (default empty) accepts a comma-separated list of point sizes, and, at the beginning of the block, for each size, measures how long it takes to draw the fontLatencyString using this condition's font, fontMaxPx, and fontRenderMaxPx. At the beginning of the block, before the first trial, measure how long it takes (sec) to draw each size on the screen. It's ok for this to temporarily take over the screen. A block can have several conditions, and each can set fontLatencyPt. Before running the block's first trial, measure timing for all the conditions in the block that requested fontLatencyPt. Save the results in the CSV file. We will plot latency (s) vs. size (pt), so the results.csv file should provide the two vectors.",
  },
  fontLatencyString: {
    name: "fontLatencyString",
    availability: "now",
    type: "text",
    default: "abc",
    explanation:
      "fontLatencyString (default 'abc') accepts a string to be drawn by fontLatencyPt.",
  },
  fontLeftToRightBool: {
    name: "fontLeftToRightBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "Set fontLeftToRightBool (default TRUE) to TRUE for languages that, like English, are written from left to right, and to FALSE for right-to-left languages, like Arabic and Hebrew.  When targetTask and targetKind are identify letter, all the fontCharacterSet letters will be placed on the response screen according to fontLeftToRightBool. For reading, left-to-right text is left-aligned, and right-to-left text is right aligned. If fontLeftToRightBool is set incorrectly for reading, text may fall off the screen.                                                                                                                                           ",
  },
  fontMaxPhysicalPx: {
    name: "fontMaxPhysicalPx",
    availability: "now",
    type: "numerical",
    default: "2000",
    explanation:
      "🕑 fontMaxPhysicalPx (default 2000) places an upper limit on font size. Expressed in CSS pixels, the limit is\nfontNominalSizePx ≤ (fontMaxPhysicalPx/devicePixelRatio)/(1+fontPadding)\nDepending on the font, rendering at huge size may result in crashing, blackout, lateness, or excess duration. You can avoid these problems by using fontMaxPhysicalPx to limit the maximum size. The maximum safe size depends on the font and computer, especially the amount of available heap memory provided by the browser. Some crashes might be in PIXI.js or PsychoJS; we're not sure. \"Blackout\" refers to display of a solid black screen instead of the desired text for the correct text duration. Lacy fonts (e.g. Ballet and Zapfino) take a long time to draw at huge size and might cause the trial to be discarded for excess duration or lateness. See thresholdAllowedLatenessSec. \n\nIt's common to set a high thresholdGuess, which causes the QUEST-controlled block to begin at the largest possible size, and quickly descend to smaller sizes after correct responses on subsequent trials. \n\nThe default of 2000 is a rough estimate of the threshold for trouble, but it depends on the font and computer. For a particular font, you may be able to set fontMaxPhysicalPx higher without encountering problems. If you enable FormSpree logging (by setting _logFontBool=TRUE), then, after an online crash, the Sessions page in Analyze will report the font and size immediately before the crash. Beware that our FormSpree license sets a ceiling on usage that is easily exceeded, so use _logFontBool sparingly.\n\nIn word processing, font size is specified in points (pt). \npt is 1/72 inch, a typographers point. \npx is a CSS pixel.\nphysicalPx is a hardware pixel, the resolution at which fonts are rendered.\ndevicePixelRatio is the linear number of physicalPx per px. In 2024, values included 1, 1.25, 1.5, 2, 3, 4. Typically 2 in Macintosh.\npxPerCm of the display is reported in the results.csv file. \nTo convert size in physical px to pt,\nsizePt=72*sizePhysicalPx/devicePixelRatio/pxPerCm/2.54\n\nAlso see targetMinPhysicalPx, fontMaxPhysicalPx, fontMaxPxShrinkage, fontDetectBlackoutBool, \nthresholdAllowedLatenessSec, thresholdAllowedDurationRatio, thresholdAllowedReplacementReRequestedTrials, and conditionTrials.",
  },
  fontMaxPx: {
    name: "fontMaxPx",
    availability: "now",
    type: "numerical",
    default: "1000",
    explanation:
      'fontMaxPx (default 1000) places an upper limit on font size. Expressed in pixels, the limit is\nfontNominalSizePx ≤ fontMaxPx/(1+fontPadding)\nDepending on the font, rendering at huge size may result in crashing, blackout, or lateness. You can avoid the problems by using fontMaxPx to limit the maximum size. The maximum safe size depends on the font and computer, especially the amount of available heap memory provided by the browser. \nThe crash may declare "out of memory" or not. It might be in PIXI.js or PsychoJS; we\'re unsure. "Blackout" refers to display of a solid black screen instead of the desired text. Lacy fonts (Ballet and Zapfino) take a long time to draw at huge size and might cause the trial to be discarded for excess lateness. See thresholdAllowedLatenessSec. \n\nIt\'s common to set a high thresholdGuess, which causes the QUEST-controlled block to begin at the largest possible size, and quickly descend to smaller sizes.\n\nThe default of 1000 is a rough estimate of the threshold for trouble, but it depends on the font. For a particular font, you may be able to set fontMaxPx higher without encountering problems. If you enable FormSpree logging (by setting _logFontBool=TRUE), then, after an online crash, the Sessions page in Analyze will report the font and size immediately before the crash. Beware that our FormSpree license sets a ceiling on usage that is easily exceeded, so use _logFontBool sparingly.\n\nIn word processing, font size is specified in points (pt). \npt is 1/72 inch, a typographers point. \npx is a CSS pixel.\nphysicalPx is a hardware pixel, the resolution at which fonts are rendered.\ndevicePixelRatio is the linear number of physicalPx per px.\npxPerCm of the display is reported in the results.csv file. \nTo convert size in physical px to pt,\nsizePt=72*sizePhysicalPx/devicePixelRatio/pxPerCm/2.54\n\nSince 2010, when HiDPI displays, like Apple\'s Retina, first appeared, screen coordinates are expressed in "CSS" pixels, which each may contain more than one "physical" pixel, but fonts are rendered more finely, at the resolution of (small) physical pixels. In the world, and in this Glossary, unqualified references to "pixels" or "px" mean the (big) CSS pixels. A length of devicePixelRatio physical px is one CSS px. EasyEyes saves devicePixelRatio in the results CSV file.  Among displays available in 2024, devicePixelRatio may be 1, 1.5, 2, 3, or 4. \n\nI think that fontMaxPhysicalPx is probably a more reliable predictor of needed memory and computational effort, so it would be good to replace \n\nAlso see targetMinPhysicalPx, fontMaxPx, fontMaxPxShrinkage, fontDetectBlackoutBool, \nthresholdAllowedLatenessSec, thresholdAllowedDurationRatio, thresholdAllowedReplacementReRequestedTrials, and conditionTrials.',
  },
  fontMaxPxShrinkage: {
    name: "fontMaxPxShrinkage",
    availability: "now",
    type: "numerical",
    default: "0.8",
    explanation:
      "fontMaxPxShrinkage (default: 0.8) reduces a condition’s fontMaxPx after detecting a bad text rendering  (i.e., a blackout, or disallowed duration or lateness). Over several trials, successive reductions will eventually find a safe text size. Bad text rendering occurs when rendering very large letters and is resolved by reducing fontMaxPx. The largest safe size depends on the font, the character string, the computer’s rendering speed, and the amount of heap space provided by the browser to the EasyEyes web app. fontMaxPxShrinkage must be a positive fraction between zero and 1. A value of 1 risks redoing the same bad trial again and again until all allocated trials are wasted. The number of allocated trials is conditionTrials + conditionTrials*thresholdRepeatedReRequestedTrials.\n\nThe default fontMaxPx value is chosen to be safe for most fonts and computers. When EasyEyes detects a bad text stimulus, it sets fontMaxPx to the product of fontMaxPxShrinkage and the nominal font size (in px) of the failed stimulus. Since the current font size is always less than or equal to fontMaxPx, reductions are cumulative, progressively shrinking fontMaxPx as needed. \n\nWhen the text stimulus was bad, EasyEyes does not pass the trial to Quest. However, without input, Quest would suggest the same stimulus strength on the next trial, which would likely fail again. This could waste the remaining trials in the block by repeatedly presenting oversized stimuli. By successively reducing fontMaxPx after each failure, fontMaxPxShrinkage ensures that, over several trials, the condition converges on a safe size.\n\nAlso see fontMaxPx, fontMaxPxShrinkage, fontDetectBlackoutBool, \nthresholdAllowedLatenessSec, thresholdAllowedDurationRatio, thresholdAllowedReplacementReRequestedTrials, and conditionTrials.",
  },
  fontMaxShrinkage: {
    name: "fontMaxShrinkage",
    availability: "now",
    type: "numerical",
    default: "0.8",
    explanation:
      "🕑 fontMaxShrinkage (default: 0.8) reduces a condition’s fontMaxPhysicalPx after detecting a bad text rendering  (i.e., a blackout, or disallowed duration or lateness). Over several trials, successive reductions will eventually find a safe text size. Bad text rendering occurs when rendering very large letters and is resolved by reducing fontMaxPhysicalPx. The largest safe size depends on the font, the character string, the computer’s rendering speed, and the amount of heap space provided by the browser to the EasyEyes web app. fontMaxShrinkage must be a positive fraction between zero and 1. A value of 1 risks redoing the same bad trial again and again until all allocated trials are wasted. The number of allocated trials is conditionTrials + conditionTrials*thresholdRepeatedReRequestedTrials.\n\nThe default fontMaxPhysicalPx value is chosen to be safe for most fonts and computers. When EasyEyes detects a bad text stimulus, it sets fontMaxPhysicalPx to the product of fontMaxShrinkage, devicePixelRatio, and the nominal font size (in px) of the failed stimulus. Since the current font size is always less than or equal to fontMaxPhysicalPx, reductions are cumulative, progressively shrinking fontMaxPhysicalPx as needed. \n\nWhen the text stimulus was bad, EasyEyes does not pass the trial to Quest. However, without input, Quest would suggest the same stimulus strength on the next trial, which would likely fail again. This could waste the remaining trials in the block by repeatedly presenting oversized stimuli. By successively reducing fontMaxPhysicalPx after each failure, fontMaxShrinkage ensures that, over several trials, the condition converges on a safe size.\n\nAlso see fontMaxPhysicalPx, fontMaxShrinkage, fontDetectBlackoutBool, \nthresholdAllowedLatenessSec, thresholdAllowedDurationRatio, thresholdAllowedReplacementReRequestedTrials, and conditionTrials.",
  },
  fontMedialShapeResponseBool: {
    name: "fontMedialShapeResponseBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "fontMedialShapeResponseBool (default FALSE) is for Arabic, Persian, Urdu, Pashto, etc. When TRUE, it asks that each response character (possible choice) be displayed in medial form (i.e. with connectors) instead of isolated form (no connectors). This has the intended effect with Arabic, and has no effect in the Roman alphabet. To test crowding we set thresholdParameter=spacingDeg and targetKind=letter. When we identify crowded Arabic letters in typographic mode, the target character is displayed in medial shape (i.e. connected) as a stimulus. If fontMedialShapeResponseBool is TRUE (the default) then the response screen also shows each response letter in its medial shape. If FALSE, then the response letter is shown in its isolated shape (i.e. disconnected). Having the target letter change shape between stimulus and response screens may make it harder to identify, especially by less fluent readers. To achieve this, when fontMedialShapeResponseBool is TRUE we precede the response character by a tatweel joiner character (U+0640) and follow it by a zero-width joiner (ZWJ) character (U+200D). For more on these characters in Arabic typesetting see https://www.w3.org/TR/alreq/#h_joining_enforcement\nALSO SEE: fontMedialShapeTargetBool",
  },
  fontMedialShapeTargetBool: {
    name: "fontMedialShapeTargetBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "fontMedialShapeTargetBool (default FALSE) is for Arabic. When TRUE, it asks that each target character be displayed in medial form (i.e. with connectors) instead of isolated form (no connectors). See fontMedialShapeResponseBool for details. This is not needed for crowding, because the target is the middle letter, so medial. However, we want to collect acuity data (thresholdParameter=targetSizeDeg, targetKind=letter) comparable to our crowding data (thresholdParameter=spacingDeg, targetKind=letter). Without this parameter, the acuity letter would be displayed in isolated form. fontMedialShapeTargetBool allows us to measure acuity, like crowding, with the target letter shown in medial form.",
  },
  fontPadding: {
    name: "fontPadding",
    availability: "now",
    type: "numerical",
    default: "0.2",
    explanation:
      "⭑ fontPadding (default 0.2) is a positive number specifying how much padding PIXI.js should add around each string to avoid clipping, at the cost of increased risk of crashing or bad trials. ⚠ Large fontPadding may produce a crash, or bad trials, due to lateness, excess duration, or blackout, but you can overcome this by restricting fontMaxPhysicalPx.\n\n1. CLIPPING. Find the smallest value of fontPadding that renders all your font’s characters without clipping. More lacy fonts with long flourishes need more fontPadding to avoid clipping. For each of 23 fonts here is the minimum value of fontPadding for no clipping (Maria Pombo, September, 2024).\nFont        Foundry        fontPadding\nAgoesa        Megatype        0\nArial Regular        Monotype        0\nExtenda 10 Pica        Zetafonts        0\nFrutiger Pro 55 Roman        Linotype        0\nHaut Relief        Nick's Fonts        0\nLetraflex Regular        Art Grootfontein        0\nMuseo Sans 500        exljbris Font Foundry        0\nTiny 5x3 100        Velvetyne        0\nBaskerville Pro Regular        Paratype        0.1\nCourier Prime        Google        0.1\nGeorgia Regular        Microsoft        0.1\nLiebeLotte        LiebeFonts        0.1\nOMFUG        Catkie        0.1\nProxima Nova        Mark Simonson Studio        0.1\nSabon Next Pro Regular        Linotype        0.1\nScarlet Wood Bold        supertype        0.1\nThe Sans Plain        LucasFonts        0.1\nTimes New Roman        Monotype        0.1\nAdobe Caslon Regular        Adobe        0.2\nLe Monde Livre Std Regular        Typofonderie        0.2\nRollerscript Smooth        G-Type        0.2\nEdwardian Script ITC Pro Regular        ITC        0.4\nPelli        denis.pelli@nyu.edu        0.5\nZapfino Extra Pro Regular        Linotype        0.5\nRed indicates that the font require more than the default (0.2) fontPadding to render without clipping.\n\n2. TIMEOUTS. By \"timeout\", we mean excess target lateness or a duration that is unacceptably short or long, relative to the requested targetDurationSec. The scientist sets timeout limits by assigning values to thresholdAllowedDurationRatio (default 1.5) and thresholdAllowedLatenessSec (default 0.1). A trial that exceeds any of these bounds is recorded in the CSV results file, but is not passed on to QUEST, so it doesn't contribute to the threshold estimate. Ideally EasyEyes would schedule a replacement trial, but PsychoJS doesn't yet support that (though PsychoPy does). You may have to reduce fontPadding, accepting some clipping, to minimize the loss of trials on slower computers. If possible, switch to a faster font, i.e. one that times out less. For a value of 0.5 of a lacy font, 62% of Prolific participants had no timeouts, 31% had timeouts in less than 10% of the trials, and the remaining 7% of participant lost most trials due to timeouts. Most timeouts were caused by a high targetMeasuredLatenessSec. Slower computer tolerate less fontPadding of large lacy fonts.\n\n3. ASSESSMENT. For your chosen font and fontPadding, at the largest size you need, assess timeouts by plotting histograms of targetMeasuredLatenessSec and targetMeasuredDurationSec from the CSV results file. (Press \"Download results\" button on the EasyEyes compiler page.) To analyze crashes use _logFontBool, which saves the details of every font rendering, so you can examine the last one before the crash. (Use EasyEyes > Analyze to examine crash results.) The maximum safe value of fontPadding will be lower for slower computers, which are common online. Use thresholdAllowedDurationRatio and thresholdAllowedLatenessSec to specify what's acceptable.",
  },
  fontPixiMetricsString: {
    name: "fontPixiMetricsString",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "fontPixiMetricsString (default empty) allows the scientist to provide a string that will be pushed into the variable PIXI.TextMetrics.METRICS_STRING. An empty fontPixiMetricsString is ignored. To render text, EasyEyes uses PsychoJS, which in turn uses PIXI.js. PIXI uses the metrics string (default |Éq) to measure font metrics, including ascender and descender. Some fonts give unexpected results with that string, in which case you might want to override it with your own metrics string. See PIXI documentation \nhttps://pixijs.download/v4.8.9/docs/PIXI.TextMetrics.html#.METRICS_STRING",
  },
  fontPositionalShapeResponse: {
    name: "fontPositionalShapeResponse",
    availability: "now",
    type: "categorical",
    default: "normal",
    explanation:
      'fontPositionalShapeResponse (default normal) is for Arabic, Persian, Urdu, Pashto, etc. Does nothing when "normal". When it\'s "target", it imposes the target letter\'s positional form on every response alternative. Having the target letter change shape between stimulus and response screens may make it harder to identify, especially by less fluent readers. To achieve this, when fontPositionalShapeResponse === target, we check the triplet containing the target and impose the target\'s positional form on the single response characters. We induce a prefix connection using the tatweel joiner character (U+0640). We induce a suffix connectio using the zero-width joiner (ZWJ) character (U+200D). For more on these characters in Arabic typesetting see https://www.w3.org/TR/alreq/#h_joining_enforcement\nALSO SEE: fontMedialShapeTargetBool',
    categories: ["normal", "target"],
  },
  fontPreRender: {
    name: "fontPreRender",
    availability: "now",
    type: "categorical",
    default: "none",
    explanation:
      "fontPreRender (default none) controls pre-rendering of the text stimulus.\nnone: Status quo on December 24, 2024.\ncache: Renders the text stimulus twice, first before the fixation task, hoping the cache will speed up the second rendering.\nbuffer: Renders it once, in an offscreen buffer, before the fixation task. The stimulus is displayed by copying from the buffer to the screen.",
    categories: ["none", "cache", "buffer"],
  },
  fontRenderMaxPx: {
    name: "fontRenderMaxPx",
    availability: "now",
    type: "numerical",
    default: "1.00E+10",
    explanation:
      "⚠ NOT RECOMMENDED. fontRenderMaxPx (default 1e10) uses faster coarser rendering when nominal font size (in px) exceeds fontRenderMaxPx. Normally, EasyEyes uses PIXI.text, but when the size exceeds fontRenderMaxPx, then EasyEyes instead uses PIXI.bitmapfont, which we thought would be faster and coarser. In fact, we found no advantage to using PIXI.bitmapfont (and compromised rendering), so we don't recommend using it. We keep this here solely for future testing of text rendering. \n     fontRenderMaxPx somewhat affects the displayed size (only discrete values, not continuous), and mostly affects speed and resolution. The complementary fontMaxPx (default 950) imposes an upper limit on the font size. When QUEST requests a size bigger than fontMaxPx, EasyEyes uses size fontMaxPx. ",
  },
  fontSizeReferencePx: {
    name: "fontSizeReferencePx",
    availability: "now",
    type: "numerical",
    default: "300",
    explanation:
      'fontSizeReferencePx (default 300) is the (moderate) font size used to compute a normalized bounding rect around the stimulus, which is later scaled and shifted. Smaller is quicker, but worsens the effect of pixel-quantization. Pixel quantization has two effects: \n1. a fractional error of up to ±0.5/fontSizeReferencePx in each side of the bounding rect. We should avoid underestimating the bounding box by "growing" it by half a pixel outward on every side. \n2. a loss of thin less-than-one-pixel-thick tips.\n\nIn October 2024, Maria Pombo found no effect on timing of increasing fontSizeReferencePx from 50 to 300 (the current default).',
  },
  fontSource: {
    name: "fontSource",
    availability: "now",
    type: "categorical",
    default: "",
    explanation:
      "⭑ fontSource must be file, google, adobe, typeSquare, or browser (empty by default). Browsers silently substitute for unavailable or slow-to-load fonts. That's great for keeping the web going, but terrible for perception experiments, so we encourage you to provide access to a specific font, either provided as a file or retrieved from a font server. For each condition that has fontSource file, the compiler checks for presence of the font in your Fonts folder (in your Pavlovia account). That folder is persistent, and you can add more fonts to it at any time, through the EasyEyes.app. The supported font formats are TrueType (.ttf), OpenType (.otf), and Web Open Font Format (.woff and .woff2). For quickest upload, we recommend using .woff2, which is the most compressed. \n\nfile: font contains the filename (with extension) of a file in the Fonts folder in the EasyEyesResources repository in your Pavlovia account. Font availability is checked by the EasyEyes compiler, to avoid runtime surprises. LIMITATION: The font filename should not have any spaces. \n\ngoogle: font contains the font name as recognized by the Google Fonts server. Google fonts are free, so you don't need an account. https://fonts.google.com/\n\nadobe: font contains the font name as recognized by the Adobe Fonts server. Some Adobe fonts are free and can be access through a free Adobe Creative Cloud account. Most require a paid Adobe Creative Cloud account. https://fonts.adobe.com/\n\ntypeSquare: font contains the font name as recognized by the TypeSquare Fonts server (primarily for Japanese fonts). TypeSquare requires an account. TypeSquare allows limited use for free. \nhttps://typesquare.com/en/\n\nbrowser: font is a font-preference string that is passed to the participant's browser. This never produces an error; we accept whatever font the browser chooses. Your font string can include several font names, separated by commas, to help the browser find something close to your intent. This is the usual way to select a font on the web, and never generates an error. (There are complex ways to discover whether the browser is providing a particular font, but EasyEyes doesn't check when fontSource=browser, so the scientist will never know. This limitation applies only to fontsource=browser. In the rest, EasyEyes verifies the font name.) ",
    categories: ["file", "google", "adobe", "typeSquare", "browser"],
  },
  fontStyle: {
    name: "fontStyle",
    availability: "now",
    type: "categorical",
    default: "regular",
    explanation:
      '🕑 fontSyle can be regular (default), bold, italic, or boldItalic. \n• If font is a file name that already specifies the style you want, then don\'t specify a style here. Just leave fontStyle as default. Otherwise the participant\'s browser might try to "helpfully" synthesize the new style by tilting or thickening what the font file renders. It\'s safer to switch to the font file whose name specifies the style you want. \n• Alternatively, if fontSource is "browser", and font specifies only a font family name (e.g. Verdana), or several (e.g. Verdana;Arial), then you can use fontStyle to select among the four standard styles.',
    categories: ["regular", "bold", "italic", "boldItalic"],
  },
  fontStylisticSets: {
    name: "fontStylisticSets",
    availability: "now",
    type: "multicategorical",
    default: "",
    explanation:
      'fontStylisticSets (no default) accepts a string to select one or more OpenType stylistic sets for this font. Each font can offer up to 20 stylistic sets: SS01, SS02, ..., SS20, and each condition can request any number of sets offered. EasyEyes accepts a comma-separated list of SS "numbers", e.g. SS01, SS19. Each comma must be followed by a space. I haven\'t tried it yet, but the web app https://fontgauntlet.com/ appears to make it easy to explore the OpenType features of any font.\n\n🕑 FUTURE. Ideally, the compiler would confirm that the font offers stylistic sets.\n\n🕑 NO NAMES. Some stylistic sets are also named, e.g. "all connections off". It would be nice if EasyEyes also accepted the human-readable name of a stylistic set. However, these names can include commas and quote marks (also most of unicode except control characters), so it might be hard to devise a general scheme to separate several names in the single string provided to fontStylisticSets. ',
    categories: [
      "SS01",
      "SS02",
      "SS03",
      "SS04",
      "SS05",
      "SS06",
      "SS07",
      "SS08",
      "SS09",
      "SS10",
      "SS11",
      "SS12",
      "SS13",
      "SS14",
      "SS15",
      "SS16",
      "SS17",
      "SS18",
      "SS19",
      "SS20",
    ],
  },
  fontTrackingForLetters: {
    name: "fontTrackingForLetters",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      'fontTrackingForLetters (default 0) adjusts the gap between letters. It adds a positive or negative value to whatever the font would do otherwise. This is closely related to what Microsoft Word calls "tracking". The distance inserted is the product of the value provided and the nominal point size of the font. It applies only to reading experiments (both ordinary reading, targetTask=identify, targetKind=reading, and RSVP reading, targetTask=identify, targetKind=rsvpReading) and letter experiments (targetTask=identify, targetKind=letter, spacingRelationToSize=typographic). Scientist must manually adjust parameters to ensure that the stimulus does not expand beyond the window.\n\nFor example, with the Sloan font (whose nominal size equals the letter width and height, and which by default has no gap between letters), setting fontTrackingForLetters=1 separates letters by one letter width. In many fonts the x height is approximately equal to half the nominal size. In that case setting fontTrackingForLetters=0.5 will insert an x-height worth of spacing between letters.\n\nUses the relatively new "letterSpacing" Canvas command to adjust the spacing between letters. "letterSpacing" is part of the new CanvasRenderingContext2D, which is now (April 2025) supported by all major browsers.\nhttps://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/letterSpacing',
  },
  fontTrackingForWords: {
    name: "fontTrackingForWords",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      '🕑 fontTrackingForWords (default 0) uses the "wordSpacing" Canvas command to adjust the spacing between words.\nhttps://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/wordSpacing\nThe distance inserted (in px) is the product of the value provided and the point side of the font. This works for Chrome, Edge, and Samsung, not for Safari and Firefox.',
  },
  fontVariableSettings: {
    name: "fontVariableSettings",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      'fontVariableSettings accepts a string to control a variable font (default is the empty string). All modern browsers support variable fonts, but Internet Explorer does not. Variable fonts have one or more axes of variation, and fontVariableSettings allows you to pick any numerical value along each axis to control the font rendering. You set all the axes at once. Any axis you don\'t set will revert to the font\'s built-in default. Each axis has a four-character name. Standard axes have lowercase names, like \'wght\' for weight. Novel axes are called "unique" and have UPPERCASE names, like \'GRAD\', which typically adjusts letter weight without affecting line length. \n\nHOW TO USE IT\nfontVariableSettings receives a text string. A typical value is\n"wght" 625\nor\n"wght" 625, "slnt" -2.3\nSet as many axes as you like. You pass the whole line as a string, INCLUDING the quote marks, but not the RETURN. The string is passed to the CSS function "font-variation-settings". The (single or double) quote marks are required. Each four-letter code represents an axis of variation supported by the particular variable font. "wght" is weight, which allows you to select any weight from hairline, to thin, to regular, to bold, to ultra black. "slnt" is slant, like italic. \n\n⚠️ COMPILER CHECKS\nWhen you set fontVariableSettings, the EasyEyes compiler will throw an error if: \n• the font is not variable. \n• the font lacks any of the requested font axes. The error message will report the font name and the name and range of every available axis.\n• any requested value for a font axis is out of its the allowed range. The error message will report the font name and the name and range of every available axis.\n• the condition uses fontVariableSetting "wght" and also sets fontWeight to any non-empty value. \n\nYOUR FONT\'S AXES\nhttps://fontgauntlet.com/ reports and demonstrates your variable font\'s axes of variation, and the range and default of each axis\nOr assign your font to some text in Adobe Illustrator or inDesign. Illustrator\'s Character pane (in the Properties window) has a tiny variable-font icon consisting of a narrow and a wide T above a slider. Clicking that icon pops up a panel with a slider for each of your font\'s variable axes. \n\nFREE VARIABLE FONTS\nGoogle\'s (free) Roboto Flex variable font has 11 axes.\nhttps://fonts.google.com/specimen/Roboto+Flex\nDavid Berlow\'s free Decovar variable font has 15 axes:\nhttps://v-fonts.com/fonts/decovar\n\nFURTHER READING\nhttps://abcdinamo.com/news/using-variable-fonts-on-the-web \nhttps://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-variation-settings',
  },
  fontWeight: {
    name: "fontWeight",
    availability: "now",
    type: "integer",
    default: "",
    explanation:
      'fontWeight (default is empty) accepts a positive integer that sets the weight of a variable font. It is equivalent (a short cut) to calling fontVariableSettings "wght" to make the same setting. I\'m guessing that the range is something like 50 for hairline to 1000 for extra black. I\'m confident that stroke thickness will increase monotonically with requested weight over the allowed range, but I don\'t know whether the increase will be closer to linear or logarithmic. It could be different for every font. If you don\'t set fontWeight to a non-empty value and don\'t set fontVariableSettings "wght", then the font\'s weight will revert to its built-in "regular" weight. \n\n⚠️ COMPILER CHECKS. When a condition sets fontWeight, the EasyEyes compiler will throw an error if: \n• the font is not variable or doesn\'t support the "wght" axis. \n• the requested weight is out of the allowed range. The error message will report the allowed range of the "wght" axis.\n• the condition tries to use both fontWeight (providing any non empty value) and fontVariableSettings "wght".\n\nSee fontVariableSettings for more information about variable fonts, including how to discover the range and default of the "wght" axis.',
  },
  instructionFont: {
    name: "instructionFont",
    availability: "now",
    type: "text",
    default: "Verdana",
    explanation:
      'instructionFont (default Verdana) sets the font used to display instructions to the participant. The compiler should check for font availability and issue a compile-time error if it fails. (However, instructionFontSource=browser can only be checked at runtime.) Another parameter, font, applies to the target and stimulus text. instructionFont applies to the instructional text. Four cases are selected by instructionFontSource=\n\nfile:  instructionFont is the complete file name (including extension .woff2, .woff, .otf, or .ttf) of a font that you have already uploaded to your Pavlovia account, e.g. "Sloan.woff2". \n\ngoogle: instructionFont is the name (without extension) of a font available on the Google Fonts server, e.g. "Roboto Mono".\n\nbrowser: instructionFont should be a string for the browser expressing your font preference, "e.g. "Ariel".\n\n🕑 server (not yet implemented): instructionFont is a URL pointing to the desired font on a font server, e.g. Adobe. \n\n     Noto Fonts. The EasyEyes International Phrases table recommends the appropriate "Noto" font, available from Google and Adobe at no charge. Wiki says, "Noto is a font family comprising over 100 individual fonts, which are together designed to cover all the scripts encoded in the Unicode standard." Various fonts in the Noto serif family cover all the worlds languages that are recognized by unicode. https://en.wikipedia.org/wiki/Noto_fonts  \nWe plan to use the free Google Fonts server, which serves all the Noto fonts.\n     Runtime language selection. To allow language selection by the participant at runtime, we will ask the Google Fonts server to serve an appropriate font (from the Noto Serif family) as specified by the EasyEyes International Phrases sheet. \n     Fonts load early. EasyEyes gets the browser to load all needed fonts at the beginning of the experiment, so the rest of the experiment can run without internet or font-loading delay. ',
  },
  instructionFontColorRGBA: {
    name: "instructionFontColorRGBA",
    availability: "now",
    type: "text",
    default: "0, 0, 0, 1",
    explanation:
      'instructionFontColorRGBA (default 0, 0, 0, 1, i.e. black) is a comma-separated list of four numbers (each ranging from 0 to 1) that specify the color of the text generated by several instructional parameters, including instructionFor*, showConditionNameBool, showCounterBool, showViewingDistanceBool, and showTargetSpecsBool. The "RGB" values are the red, green, and blue channels. The "A" value controls opacity (0 to 1). Use screenColorRGB to control the background color. The foreground color controls are fontColorRGBA, instructionFontColorRGBA, markingColorRGBA, and targetColorRGBA. The background color control is screenColorRGBA. WHEN ENTERING SEVERAL NUMBERS IN ONE CELL, WE STRONGLY SUGGEST BEGINNING WITH A SPACE, AND PUTTING A SPACE AFTER EVERY COMMA. THIS PREVENTS EXCEL FROM MISINTERPRETING THE STRING AS A SINGLE NUMBER. ',
  },
  instructionFontLeftToRightBool: {
    name: "instructionFontLeftToRightBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "instructionFontLeftToRightBool should be set to TRUE for most languages, including English, which are written from left to right, and should be set to FALSE for Arabic, Hebrew, and other right-to-left languages. The default value is TRUE. For identifying letters, the letters will be placed accordingly on the response screen. For reading, it's important to set this correctly, or text may fall off the screen: left-to-right text will be left-aligned, and right-to-left text will be right aligned.                                                                                                                                                                                      ",
  },
  instructionFontPadding: {
    name: "instructionFontPadding",
    availability: "now",
    type: "numerical",
    default: "0.5",
    explanation:
      "instructionFontPadding (default 0.5) is just like fontPadding, but for instructions.",
  },
  instructionFontSizePt: {
    name: "instructionFontSizePt",
    availability: "now",
    type: "numerical",
    default: "17",
    explanation:
      "🕑 instructionFontSizePt (default 25) specifies the point size of the font used for instructions.",
  },
  instructionFontSource: {
    name: "instructionFontSource",
    availability: "now",
    type: "categorical",
    default: "browser",
    explanation:
      'instructionFontSource (default is browser) must be file, google, server, or browser. 🕑 "server" not yet implemented. See fontSource for explanation.',
    categories: ["file", "google", "browser"],
  },
  instructionForBlock: {
    name: "instructionForBlock",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "⭑ instructionForBlock (empty default, which has no effect) is instructional text to be presented once at the beginning of the block, before running any trial of any condition. This text replaces whatever were the condition's default instructions, which depend on targetTask and targetKind. An empty field requests the default text, so write #NONE to suppress block instructions for this condition. The text is line-wrapped to fit, and any carriage returns in the text are expressed. Use the string #PAGE_BREAK to insert a page break. You can use an unlimited number of pages. You should normally end each page with the symbol #PROCEED, which will be replaced by text telling the participant how to continue to the next page: offering one or both of hitting RETURN and clicking the PROCEED button, as appropriate given the setting of the responseClickedBool and responseTypedBool parameters (see https://trello.com/c/OI2CzqX6). If the block has multiple conditions, then EasyEyes will present every unique set of block instructions, one after another, before the first trial. FUTURE: Support Markdown to allow simple formatting, including italic and bold. FUTURE: We add a new parameter instructionURL that accepts a URL to a Google Sheets doc, similar to EasyEyes International Phrases, but set up by the Scientist, and when it's provided, instructionForXXX, rather than text, expects a phrase name, like EE_Welcome, and  pulls from that Sheets doc the named phrase in the current language. \n",
  },
  instructionForExperiment: {
    name: "instructionForExperiment",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "🕑 instructionForExperiment (empty default, which has no effect) is instructional text to be presented once at the beginning of the whole experiment, before beginning the first block. It can appear in any condition, e.g. in the last condition of the last block, but is presented first, before the first first block. If instructionForExperiment is defined in more than one condition in the experiment, then the several instances are concatenated, in their order of appearance in the experiment spreadsheet after shuffling. ",
  },
  instructionForResponse: {
    name: "instructionForResponse",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "⭑ instructionForResponse (empty default, which has no effect) is instructional text, to be presented after each stimulus of this condition, that reminds the participant how to respond to the stimulus, e.g. clicking or typing to identify, detect, or rate. This text replaces whatever were the condition's default instructions, which depend on targetTask and targetKind. An empty field requests the default text, so write #NONE to suppress response instructions for this condition. The text is line-wrapped to fit, and any carriage returns in the text are expressed. We typically ask the participant to respond by clicking one or more buttons indicating their selection(s). We rarely use the standard #PROCEED symbol here. FUTURE: Support Markdown to allow simple formating, including italic and bold. FUTURE: If the participant has requested translation to another language, then we use Google Translate to do so. ",
  },
  instructionForResponseLocation: {
    name: "instructionForResponseLocation",
    availability: "now",
    type: "categorical",
    default: "topLeft",
    explanation:
      '🕑 instructionForResponseLocation can be topLeft (the default), bottomLeft, or none. This is shown after the stimulus disappears, to instruct the participant how to respond. A typical instruction for the identification task is: "Type your best guess for what middle letter was just shown." ',
    categories: ["none", "topLeft", "bottomLeft"],
  },
  instructionForStimulus: {
    name: "instructionForStimulus",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "⭑ instructionForStimulus (empty default, which has no effect) is instructional text, to be shown immediately before each stimulus of this condition, that tells the participant how to request the stimulus. This text replaces whatever were the condition's default instructions, which depend on targetTask and targetKind. An empty field requests the default text, so write #NONE to suppress stimulus instructions for this condition. The text is line-wrapped to fit, and any carriage returns in the text are expressed. To initiate a trial we typically ask the participant to click the center of a crosshair or hit the SPACE BAR. We rarely use the standard #PROCEED symbol here. If the participant has requested translation to another language, then we use Google Translate to do so. FUTURE: Support Markdown to allow simple formating, including italic and bold. FUTURE: If the participant has requested translation to another language, then use Google Translate to do so. ",
  },
  instructionForStimulusLocation: {
    name: "instructionForStimulusLocation",
    availability: "now",
    type: "categorical",
    default: "upperLeft",
    explanation:
      "instructionForStimulusLocation (default upperLeft) indicates where the stimulus instructions should be placed on the screen: top, upperLeft, or upperRight. If you select top, then the text will be at the top of the screen, using the full width of the screen (allowing modest right and left margins), aligned with the left or right side of the display, as guided by whether instructionFontLeftToRightBool is TRUE or FALSE. When you select upperLeft or upperRight, EasyEyes will break the text up into short lines of text, to present it as a roughly square block of text in the upper left or right corner, which may help keep the text far from the target.",
    categories: ["top", "upperLeft", "upperRight"],
  },
  instructionLanguage: {
    name: "instructionLanguage",
    availability: "now",
    type: "categorical",
    default: "English",
    explanation:
      '🕑 English name for the language used for instructions to the participant. It must be "participant" or match one of the entries in the second row of the EasyEyes International phrases sheet. If you enter "participant", then the participant will be allowed to select the instruction language from a pull-down menu.',
    categories: [],
  },
  internationalPhrasesURL: {
    name: "internationalPhrasesURL",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "🕑 internationalPhrasesURL accepts a URL to a Google Sheets doc, similar to EasyEyes International Phrases, but set up by the Scientist. When it's provided in a condition, the instructionForXXX parameters for that condition, rather than literal text, accept a phrase name, like EE_Welcome, and pull the named phrase in the current language from the Sheets doc pointed to by internationalPhrasesURL. internationalPhrasesURL can provide a URL (same or different) for each condition that needs it. Each condition operates independently of the rest. For the table to be valid it must include the first 4 rows of the EasyEyes International Phrases: language, EE_languageDirection, EE_languageUseSpace, EE_languageFont. Allowing multiple phrase tables with different language coverage seems needlessly confusing for all concerned, so just copy the first four rows (all the columns) of the EasyEyes International Phrases spreadsheet, and add new rows below, one for each new phrase. Our international phrases doc is designed to make it easy for us to add new languages (by adding a new column for each language). Please send your request to denis.pelli@nyu.edu. He will need to know: the ISO two-letter code for the language (https://www.sitepoint.com/iso-2-letter-language-codes/), the language direction (left to right or right to left), and whether it uses spaces. Once EasyEyes adds a new language, the EasyEyes compiler will insist that every scientist's internationalPhrasesURL Google Sheets doc also include that language. ",
  },
  internationalTableURL: {
    name: "internationalTableURL",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '🕑 internationalTableURL (default is URL of this table) is the URL of a Google Sheets table of international phrases to be used to give instructions throughout the experiment. A scientist can substitute her own table, presumably a modified copy of this one (the EasyEyes International Phrases Table). https://docs.google.com/spreadsheets/d/1UFfNikfLuo8bSromE34uWDuJrMPFiJG3VpoQKdCGkII/edit#gid=0\nThis table allows the Participant page to make all non-stimulus text international. In every place that it displays instruction text, the Participant page looks up the mnemonic code for the needed phrase in the instruction table, to find a unicode phrase in the selected instructionLanguage (e.g. English, German, or Arabic). It\'s a Google Sheets file called "EasyEyes International Phrases".\nhttps://docs.google.com/spreadsheets/d/1AZbihlk-CP7sitLGb9yZYbmcnqQ_afjjG8h6h5UWvvo/edit#gid=0\nThe first column has mnemonic phrase names. Each of the following columns gives the corresponding text in a different language. After the first column, each column represents one language. Each row is devoted to one phrase. The second row is languageNameEnglish, with values: English, German, Polish, etc. The third row is languageNameNative, with values: English, Deutsch, Polskie, etc. \n     We incorporate the latest "EasyEyes International Phrases" file when we compile threshold.js. For a particular experiment, we only need the first column (the mnemonic name) and the column whose heading matches instructionLanguage. We should copy those two columns into a Javascript dictionary, so we can easily look up each mnemonic phrase name to get the phrase in the instructionLanguage. To display any instruction, we will use the dictionary to convert a mnemonic name to a unicode phrase. \n     languageDirection. Note that most languages are left to right (LTR), and a few (e.g. Arabic, Urdu, Farsi, and Hebrew) are right to left (RTL). Text placement may need to take the direction into account. The direction (LTR or RTL) is provided by the languageDirection field.\n     languageNameNative. If we later allow the participant to choose the language, then the language selection should be based on the native language name, like Deustch or Polskie, i.e. using languageNameNative instead of languageNameEnglish.',
  },
  invitePartingCommentsBool: {
    name: "invitePartingCommentsBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 Setting invitePartingCommentsBool (default FALSE) TRUE tells EasyEyes, at the end of this block, to invite the participant to make parting comments. ",
  },
  logQuestBool: {
    name: "logQuestBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "logQuestBool (default FALSE) enables logging of Quest activity in the browser Console.",
  },
  markDot: {
    name: "markDot",
    availability: "now",
    type: "text",
    default: "0, 0, 0, 0, 0, 0, 1",
    explanation:
      '❌ WILL SOON BE REPLACED BY A SET OF PARAMETERS, e.g. markDotDiameterDeg, WHICH OFFER THE SAME SERVICE WITH SELF-DOCUMENTING PARAMETER NAMES. markDot: Until the target appears, display a dot. It accepts several arguments as comma-separated values. Diameter zero (the default) request no dot.\n▶ xDeg, yDeg, diameterDeg, colorRGBA\nxDeg and yDeg (default 0,0) are coordinates of the dot center relative to the nominal fixation location (which a moving crosshair circles around).  \ndiameterDeg (default 0) is the dot diameter. Diameter zero requests no dot.\ncolorRGBA (default black) is four comma separated values. 0,0,0,1 is black, 1,1,1,1 is white. The fourth number "A" is alpha, which weights the blending; use 1 for 100% color. Each of the four values ranges 0 to 1.',
  },
  markDotColorRGBA: {
    name: "markDotColorRGBA",
    availability: "now",
    type: "text",
    default: "0, 0, 0, 1",
    explanation:
      '🕑 markDotColorRGBA (default 0, 0, 0, 1 i.e. black) is a comma-separated list of four numbers (each ranging from 0 to 1) that specify the color of the dot. "RGB" are the red, green, and blue channels. "A" controls opacity (0 to 1). 0,0,0,1 is black and 1,1,1,1 is white. The ColorRGBA controls include fontColorRGBA, instructionFontColorRGBA, markingColorRGBA, screenColorRGBA, and targetColorRGBA. WHEN ENTERING SEVERAL NUMBERS IN ONE CELL, WE STRONGLY SUGGEST BEGINNING WITH A SPACE, AND PUTTING A SPACE AFTER EVERY COMMA. THIS PREVENTS EXCEL FROM MISINTERPRETING THE STRING AS A SINGLE NUMBER. ',
  },
  markDotDiameterDeg: {
    name: "markDotDiameterDeg",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "🕑 markDotDiameterDeg (default 0) is the dot diameter. Display a dot until the target appears. Diameter zero disables the dot.",
  },
  markDotTrackFixationBool: {
    name: "markDotTrackFixationBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 markDotTrackFixationBool (default FALSE) specfies:\nif FALSE, that the dot position is relative to the fixed nominal fixation or, \nif TRUE, relative to the (possibly moving) crosshair location. In this case, when the crosshair moves, the dot will move with it.",
  },
  markDotXYDeg: {
    name: "markDotXYDeg",
    availability: "now",
    type: "text",
    default: "0, 0",
    explanation:
      "🕑 markDotXYDeg (default 0, 0) is the (x,y) coordinate of the dot center relative to the origin, which is selected by markDotTrackFixationBool. WHEN ENTERING SEVERAL NUMBERS IN ONE CELL, WE STRONGLY SUGGEST BEGINNING WITH A SPACE, AND PUTTING A SPACE AFTER EVERY COMMA. THIS PREVENTS EXCEL FROM MISINTERPRETING THE STRING AS A SINGLE NUMBER. ",
  },
  markFlies: {
    name: "markFlies",
    availability: "now",
    type: "text",
    default: "0, 1, 0.3, FALSE, 0.05, 2, 0, 0, 1, 1",
    explanation:
      '❌ WILL SOON BE REPLACED BY A SET OF PARAMETERS, e.g. markFliesNumber, WHICH OFFER THE SAME SERVICE WITH SELF-DOCUMENTING PARAMETER NAMES. markFlies: Until the target appears, display a swarm of moving "flies" (each like a crosshair) that make it hard to get the cursor to track the real crosshair (typically moving) unless your eye is on it. The flies are confined to a circular area with radius radiusDeg centered on either the actual (typically moving) crosshair or the (static) nominal fixation position at the center of the crosshair motion. Each fly moves a fixed radial distance degPerSec/fHz from frame to frame, where fHz is the frame rate (e.g. 60) and degPerSec is the speed. On each frame, each fly moves in a random direction. Any fly whose center is more than radiusDeg from the circle\'s center disappears (dies) and is replaced by a new fly at a random location in the circle. markFlies accepts several arguments as comma separated values:\n▶ n, radiusDeg, degPerSec, centeredOnNominalFixationBool, thicknessDeg, lengthDeg, colorRGBA\ncenteredOnNominalFixationBool (default TRUE) centers the circular fly area on, if TRUE, the nominal fixation location (that the crosshair circles around), otherwise centers on the moving crosshair.\nn (default 0, i.e. none) is the number of flies. Setting n=0, the default, disables markFlies.\nradiusDeg (default 1) is the radius of the circular area that the flies are confined to.\ndegPerSec (default 0.3) is the speed (change in position from one frame to next per frame duration).\nthicknessDeg (default 0.05) is the line thickness.\nlengthDeg (default 2) is the length of each of the two lines that make one "fly".\ncolorRGBA (default blue: 0,0,1,1) follows the same conventions as targetColorRGBA. "0,0,0,1" is black, "1,1,1,1" is white; "1,0,0,1" is red. Last number is alpha, the weight assigned to this color (instead of what\'s behind it).',
  },
  markFliesColorRGBA: {
    name: "markFliesColorRGBA",
    availability: "now",
    type: "text",
    default: "0, 0, 1, 1",
    explanation:
      '🕑 markFliesColorRGBA (default 0, 0, 0, 1 i.e. black) is a comma-separated list of four numbers (each ranging from 0 to 1) that specify the color of the dot. RGB are the red, green, and blue channels. "A" controls opacity (0 to 1). 0, 0, 0, 1 is black, 1, 1, 1, 1 is white. We recommend blue flies: 0, 0, 1, 1. They are obviously different from a fixated black crosshair, yet strongly group with a peripherally viewed crosshair. The ColorRGBA controls include fontColorRGBA, instructionFontColorRGBA, markingColorRGBA, screenColorRGBA, and targetColorRGBA. WHEN ENTERING SEVERAL NUMBERS IN ONE CELL, WE STRONGLY SUGGEST BEGINNING WITH A SPACE, AND PUTTING A SPACE AFTER EVERY COMMA. THIS PREVENTS EXCEL FROM MISINTERPRETING THE STRING AS A SINGLE NUMBER. ',
  },
  markFliesGravity: {
    name: "markFliesGravity",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "markFliesGravity (default 0) simulates gravitational attraction (or repulsion) between flies. This modifies the path of flies generated by markFliesNumber, and does nothing if there are no flies. In physics the gravitational constant is positive. Here the scientist will usually want negative gravity, so the flies repel one another, to fill voids in fly coverage. This is implemented at each frame update by running a loop that considers all the possible pairings of flies. For each pair, a vector is added to each fly's position. Each vector is colinear with the line connecting the two flies. The two vectors have equal length hDeg and opposite directions. Compute the distance dDeg between two flies. Both displacement vectors have length hDeg,  \nhDeg=gravity/(fHz*dDeg^2).\nPositive gravity is attraction, and the vectors point inwards, from one fly to the other. Negative gravity is repulsion, and the vectors point outward. ",
  },
  markFliesLengthDeg: {
    name: "markFliesLengthDeg",
    availability: "now",
    type: "numerical",
    default: "2",
    explanation:
      '🕑 markFliesLengthDeg (default 2) is the length of each of the two lines that make the cross that is one "fly".',
  },
  markFliesNumber: {
    name: "markFliesNumber",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      '🕑 markFliesNumber (default 0): Until the target appears, display a swarm of moving "flies" (each a cross, like the crosshair) that make it hard to get the cursor to track the moving crosshair unless your eye is on it. The flies are confined to a circular area with radius radiusDeg centered on either the actual (typically moving) crosshair or the (static) nominal fixation position at the center of the crosshair motion. On each frame, each fly moves a fixed distance degPerSec/fHz in a random direction where fHz is the frame rate (e.g. 60) and degPerSec is the speed. Any fly whose center is more than radiusDeg from the circle\'s center disappears (dies) and is replaced by a new fly at a random location in the circle. Each fly is a cross. Several parameters specify the flies and their motion.\nmarkFliesColorRGBA (default blue: 0, 0, 1, 1) follows the same conventions as targetColorRGBA. "0, 0, 0, 1" is black, "1, 1, 1, 1" is white; "1,0,0,1" is red. Last number is alpha, the weight assigned to this color (instead of what\'s behind it).\nmarkFliesGravity (default 0) simulates positive or negative gravity among the flies. Negative gravity (repulsion) helps the flies fill the space more uniformly, making it less likely that the crosshair will be in an area without flies.\nmarkFliesLengthDeg (default 2) is the length of each of the two lines that make one "fly".\nmarkFliesRadiusDeg (default 1) is the radius of the circular area that the flies are confined to.\nmarkFliesThicknessDeg (default 0.05) is the line thickness.\nmarkFliesTrackFixationBool (default FALSE) centers the circular fly area on, if FALSE, the fixed nominal fixation location (that the crosshair circles around), otherwise centers on the (possibly moving) crosshair.',
  },
  markFliesRadiusDeg: {
    name: "markFliesRadiusDeg",
    availability: "now",
    type: "numerical",
    default: "1.5",
    explanation:
      "🕑 markFliesRadiusDeg (default 1.5) is the radius of the circular area that the flies are confined to.",
  },
  markFliesSpeedDegPerSec: {
    name: "markFliesSpeedDegPerSec",
    availability: "now",
    type: "numerical",
    default: "0.2",
    explanation:
      "🕑 markFliesSpeedDegPerSec (default 0.3) is the speed (change in position from one frame to next per frame duration).",
  },
  markFliesThicknessDeg: {
    name: "markFliesThicknessDeg",
    availability: "now",
    type: "numerical",
    default: "0.05",
    explanation:
      "🕑 markFliesThicknessDeg (default 0.05) is the line thickness.",
  },
  markFliesTrackFixationBool: {
    name: "markFliesTrackFixationBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 markFliesTrackFixationBool (default FALSE) centers the circular fly area on:\nif FALSE, the fixed nominal fixation location (that the crosshair circles around), \nif TRUE, centers on the (possibly moving) crosshair.",
  },
  markGrid: {
    name: "markGrid",
    availability: "now",
    type: "text",
    default: "0.5, 0.05, 0, 0, 0, 0, 1",
    explanation:
      'markGrid: Until the target appears, display a square grid as a static background centered on the nominal fixation location (which the moving crosshair circles around). Grid center is midway between two gridlines.  markGrid accepts several arguments as comma-separated values:\n▶ spacingDeg, thicknessDeg, lengthDeg, colorRGBA\nspacingDeg (default 0.5) is the center-to-center line spacing in both x and y.\nthicknessDeg (default 0.03) is the line thickness.\nlengthDeg (default 0, i.e. no grid) is the length of each grid line.\ncolorRGBA has same rules as targetColorRGBA. "0, 0, 0, 1" is black; "1, 0, 0, 1" is red; "1, 1, 1, 1" is white. Last number is alpha, the weight (0 to 1) assigned to this color (as opposed to what\'s behind it). \nWHEN ENTERING SEVERAL NUMBERS IN ONE CELL, WE STRONGLY SUGGEST BEGINNING WITH A SPACE, AND PUTTING A SPACE AFTER EVERY COMMA. THIS PREVENTS EXCEL FROM MISINTERPRETING THE STRING AS A SINGLE NUMBER. ',
  },
  markingBlankedNearTargetBool: {
    name: "markingBlankedNearTargetBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      '⭑ Setting markingBlankedNearTargetBool TRUE (default FALSE) suppresses any parts of the fixation cross or target X that are too close to the possible targets in this conditionGroup. This enables both meanings of "too close": markingBlankingRadiusReEccentricity and markingBlankingRadiusReTargetHeight.\nUseful with any target eccentricity.',
  },
  markingBlankingRadiusReEccentricity: {
    name: "markingBlankingRadiusReEccentricity",
    availability: "now",
    type: "numerical",
    default: "0.5",
    explanation:
      "⭑ So that markings don't crowd the target, the closest that a marking pixel can be to the target center is specified by setting markingBlankingRadiusReEccentricity to the fraction (default 0.5) of the target's radial eccentricity.\nUseful with a peripheral target.",
  },
  markingBlankingRadiusReTargetHeight: {
    name: "markingBlankingRadiusReTargetHeight",
    availability: "now",
    type: "numerical",
    default: "1",
    explanation:
      "⭑ So that markings don't mask the target, the closest that a marking pixel can be to the traget center is specified by setting markingBlankingRadiusReTargetHeight (default 1) to the fraction of target height.\nUseful with any target eccentricity.",
  },
  markingClippedToStimulusRectBool: {
    name: "markingClippedToStimulusRectBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      '⭑ markingClippedToStimulusRectBool TRUE requests that fixation and target marking be restricted to the stimulus rect, protecting the screen margins. Otherwise they are allowed to extend to the screen edges, a "full bleed".',
  },
  markingColorRGBA: {
    name: "markingColorRGBA",
    availability: "now",
    type: "text",
    default: "0, 0, 0, 1",
    explanation:
      'markingColorRGBA (default 0, 0, 0, 1 i.e. black) is a comma-separated list of four numbers (each ranging from 0 to 1) that specify the color of the marks (for fixation, target, etc.). "RGB" are the red, green, and blue channels. "A" controls opacity (0 to 1). 0,0,0,1 is black, 1, 1, 1, 1 is white. Use screenColorRGBA to control the background color. The ColorRGBA controls include fontColorRGBA, instructionFontColorRGBA, markingColorRGBA, screenColorRGBA, and targetColorRGBA. WHEN ENTERING SEVERAL NUMBERS IN ONE CELL, WE STRONGLY SUGGEST BEGINNING WITH A SPACE, AND PUTTING A SPACE AFTER EVERY COMMA. THIS PREVENTS EXCEL FROM MISINTERPRETING THE STRING AS A SINGLE NUMBER. ',
  },
  markingFixationAfterTargetOffsetBool: {
    name: "markingFixationAfterTargetOffsetBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "🕑 markingFixationAfterTargetOffsetBool (default TRUE) determines whether the crosshair (if present) is erased along with the target. ",
  },
  markingFixationAfterTargetOnset: {
    name: "markingFixationAfterTargetOnset",
    availability: "now",
    type: "categorical",
    default: "freeze",
    explanation:
      "markingFixationAfterTargetOnset (default freeze) determines what happens to the crosshair when the target appears. There are four cases:\n* disappear: At target onset the crosshair is erased.\n* freeze: At target onset the crosshair stops moving and persists. \n* continueMovingButIndependently: At target onset the crosshair continues moving (or not moving) but the origin (of the deg coordinate system) remains at the point where the crosshair was when the target appeared, so the crosshairs motion won’t affect the target etc. For a static crosshair this option is equivalent to freeze.\n* continueMovingAsOrigin: At target onset the crosshair continues moving (or not moving) and the origin (of the deg coordinate system) moves with it as usual. For a static crosshair this option is equivalent to freeze.\n",
    categories: [
      "disappear",
      "freeze",
      "continueMovingButIndependently",
      "continueMovingAsOrigin",
    ],
  },
  markingFixationDuringTargetBool: {
    name: "markingFixationDuringTargetBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "markingFixationDuringTargetBool (default TRUE) causes the crosshair to remain visible during the target presentation. If FALSE, then the crosshair is erased at target onset.",
  },
  markingFixationHotSpotRadiusDeg: {
    name: "markingFixationHotSpotRadiusDeg",
    availability: "now",
    type: "numerical",
    default: "0.1",
    explanation:
      "markingFixationHotSpotRadiusDeg (default 0.3 deg) is the radius, in deg, of the hot spot in the fixation cross. The hot spot is the disk-shaped area that can be clicked with the tip of the cursor.\n     Used with responseMustTrackContinuouslyBool=TRUE.\n     Tracking a moving crosshair demands good eye-hand coordination. Teenagers can handle a hot-spot raidus of 0.1 deg. People over 30 need at least 0.15 deg. We anticipate that children will need 0.2 or more deg.\n     Typically you’ll want to limit the success of the participant strategy (invented by Maria Pombo) that fixates the crosshair to place the cursor on it, and then looks away (e.g. to the anticipated target location). This strategy relies on the crosshair moving so slowly that the cursor remains within the hotspot for the required interval. We can defeat that strategy by making the minimum crosshair travel distance (product of speed and min tracking duration) at least double the hotspot radius.\nresponseTrackingMinSec*markingFixationMotionSpeedDegPerSec > 2*markingFixationHotSpotRadiusDeg\nObeying this rule of thumb, I’m currently using a minimum tracking duration of 1 sec, a speed of 0.4 deg/sec, and a hot spot radius of 0.2 deg.",
  },
  markingFixationMotionPath: {
    name: "markingFixationMotionPath",
    availability: "now",
    type: "categorical",
    default: "circle",
    explanation:
      '⚠ markingFixationMotionPath (default circle) selects which kind of path the moving crosshair follows. In both cases, markingFixationMotionRadiusDeg specifies the radius of a circle centered on the fixed nominal fixation point.\n• circle: the crosshair moves along the circle with speed markingFixationMotionSpeedDegPerSec. The starting point on the circle is random.\nWARNING!! CURRENTLY OUR STIMULUS GENERATION CODE SUPPORTS ONLY "circle", AND WILL GIVE WRONG TARGET PLACEMENT FOR "randomWalk". WE COULD ENHANCE THIS TO SUPPORT "randomWalk" IF THERE IS INTEREST. WRITE TO denis.pelli@nyu.edu.\n• randomWalk: on each frame, the crosshair takes a step in a random direction with speed markingFixationMotionSpeedDegPerSec. If the step would land outside the circle, it instead reflects off the circle back into the circular area. One step can have many reflections. The initial starting point is a random location in the circular area.\nUsed with responseMustTrackContinuouslyBool=TRUE.',
    categories: ["circle"],
  },
  markingFixationMotionRadiusDeg: {
    name: "markingFixationMotionRadiusDeg",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "markingFixationMotionRadiusDeg (default 0 deg, i.e. no motion) is the radius of the circular trajectory of the crosshair about the origin. When the radius is zero, there is no motion. A negative radius should generate a compiler error. Used with responseMustTrackContinuouslyBool =TRUE. \nNOTE: The compiler allows motion to be enabled (i.e. markingFixationMotionRadiusDeg>0) only if responseMustTrackContinuouslyBool=TRUE. So when responseMustTrackContinuouslyBool=FALSE, there is no fixation motion.",
  },
  markingFixationMotionSpeedDegPerSec: {
    name: "markingFixationMotionSpeedDegPerSec",
    availability: "now",
    type: "numerical",
    default: "0.3",
    explanation:
      "markingFixationMotionSpeedDegPerSec (default 0.3) is the speed, in deg/sec, of the crosshair as it revolves around the origin. The time to do a full revolution (sec), i.e. one period, will be 2*pi*markingFixationMotionRadiusDeg/markingFixationMotionSpeedDegPerSec. Used with responseMustTrackContinuouslyBool=TRUE. \n• Don't zero this to disable motion. To disable motion, set markingFixationMotionRadiusDeg = 0 (which is the default).",
  },
  markingFixationStrokeLengthDeg: {
    name: "markingFixationStrokeLengthDeg",
    availability: "now",
    type: "numerical",
    default: "2",
    explanation:
      "⭑ markingFixationStrokeLengthDeg (default 2 deg) specifies the stroke length in the fixation cross. The cross consists of two strokes, one horizontal, one vertical. Thus this is a diameter, unless the other marking parameters, which are mostly radii. Setting this to a large value (e.g. 100) will produce a fixation cross that extends from edge to edge of the display, which may help restore salience of a cross despite blanking of the cross near possible target locations. You can avoid colliding with a peripheral target by setting this short, or by leaving it long and setting markingBlankingRadiusReTargetHeight.",
  },
  markingFixationStrokeThickening: {
    name: "markingFixationStrokeThickening",
    availability: "now",
    type: "numerical",
    default: "1.4",
    explanation:
      'markingFixationStrokeThickening (default 1.4) specifies a thickness multiplier when the fixation mark is "bold". Currently the bold effect is only used to indicate that the cursor is in the hotspot (i.e. the cursor tip is within markingFixationHotSpotRadiusDeg of the center of the crosshair). The multiplier is greater than or equal to zero, so it can shrink or expand the crosshair stroke thickness. Setting it to 1, the default, disables bolding. ',
  },
  markingFixationStrokeThicknessDeg: {
    name: "markingFixationStrokeThicknessDeg",
    availability: "now",
    type: "numerical",
    default: "0.05",
    explanation:
      "markingFixationStrokeThicknessDeg (default 0.05 deg) sets stroke thickness in the fixation cross.",
  },
  markingOffsetBeforeTargetOnsetSecs: {
    name: "markingOffsetBeforeTargetOnsetSecs",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "⭑ Pause for markingOffsetBeforeTargetOnsetSecs before target onset to minimize forward masking of the target by the preceding fixation and target markings. IMPORTANT: This must be zero (default) when the target is peripheral, because you don't want to give the participant time to foveate the peripheral target. Set it to a nonzero value ONLY when the target is foveal. When the target is foveal,  we suggest allowing enough time (e.g. 0.35 s) to prevent forward masking of the target by the fixation cross. \nNOTE. Forward masking of the target by the fixation cross can also be reduced by blanking the cross near the target, as controlled by markingBlankedNearTargetBool. Especially useful with a foveal target.\n\nNOTE: The compiler will soon enforce a new rule: markingOffsetBeforeTargetOnsetSecs must be zero when target eccentricity (targetEccentricityXDeg,targetEccentricityYDeg) is nonzero.\n\nThe complementary markingOnsetAfterTargetOffsetSecs protects the target from backward masking by the response screen. That works equally well regardless of whether the target is foveal or peripheral.\n\nSINCE THE GOAL IS TO PREVENT FORWARD MASKING:\nIf we don't already, we should suspend nudging during markingOffsetBeforeTargetOnsetSecs and markingOnsetAfterTargetOffset.",
  },
  markingOnsetAfterTargetOffsetSecs: {
    name: "markingOnsetAfterTargetOffsetSecs",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "⭑ Pause for markingOnsetAfterTargetOffsetSecs (default 0): after target offset. This is before onset of response screen or fixation and target markings to minimize backward masking of the target. Especially useful with a foveal target.\nAlso see responseAllowedEarlyBool.\n\nSINCE THE GOAL IS TO PREVENT BACKWARD MASKING: If we don't already, we should suspend nudging during markingOffsetBeforeTargetOnsetSecs and markingOnsetAfterTargetOffset.",
  },
  markingShowCursorBool: {
    name: "markingShowCursorBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "markingShowCursorBool (default TRUE) when TRUE requests that the cursor be shown while waiting for the stimulus. When FALSE, the cursor remains hidden until the response screen, which shows the cursor or not depending on responseClickBool.",
  },
  markingTargetStrokeLengthDeg: {
    name: "markingTargetStrokeLengthDeg",
    availability: "now",
    type: "numerical",
    default: "1",
    explanation:
      "markingTargetStrokeLengthDeg (default 1) set the stroke length in the X marking the possible target location. ",
  },
  markingTargetStrokeThicknessDeg: {
    name: "markingTargetStrokeThicknessDeg",
    availability: "now",
    type: "numerical",
    default: "0.03",
    explanation:
      "markingTargetStrokeThicknessDeg (default 0.03) set the atroke thickness in the X marking the possible target location.",
  },
  markTheFixationBool: {
    name: "markTheFixationBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "markTheFixationBool (default TRUE), when true, draws a fixation cross. This will collide with a foveal target unless you prevent collision by using markingBlankingRadiusReTargetHeight or markingOffsetBeforeTargetOnsetSecs and markingOnsetAfterTargetOffsetSecs. Regardless of this parameter, we don't show fixation when targetRepeatsBool is TRUE. In that can we cover a large area of the screen with repeated targets. ",
  },
  markThePossibleTargetsBool: {
    name: "markThePossibleTargetsBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "Setting markThePossibleTargetsBool TRUE (default FALSE), draws an X at every possible target location, considering all conditions in this conditionGroup. ",
  },
  maskerBaseFrequencyMultiplier: {
    name: "maskerBaseFrequencyMultiplier",
    availability: "now",
    type: "numerical",
    default: "2",
    explanation:
      "maskerBaseFrequencyMultiplier (default 2). Compute base frequency of a mask melody by multiplying the target frequency by this factor. If there are two melodies then the second melody has base frequency given by target frequency divided by this factor.",
  },
  maskerSoundDBSPL: {
    name: "maskerSoundDBSPL",
    availability: "now",
    type: "numerical",
    default: "-100",
    explanation:
      "⭑ maskerSoundDBSPL (default -100) is sound level of the masker in dB SPL.",
  },
  maskerSoundFolder: {
    name: "maskerSoundFolder",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "⭑ The name of a folder of sound files (each file can be in WAV or AAC format), to be used when targetKind is sound. The folder is submitted as a zip archive to the EasyEyes drop box, and saved in the Pavlovia account in the Folders folder. The name of the zip archive, without the extension, must match the value of maskSoundFolder. See targetSoundFolder for comments on the WAV and ACC file formats.",
  },
  maskerSoundPhrase: {
    name: "maskerSoundPhrase",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      'maskerSoundPhrase is a text phrase that is used when targetKind is 16ChannelSound. The phrase consists of a series of words and category names, with each category name preceded by #. Currently the maskerSoundPhrase is "Ready #CallSign GoTo #Color #Number Now". Every word must appear as a sound file with that name, and every category must appear as a folder with that name, both in the current talker folder in the maskerSoundFolder.',
  },
  measureLuminanceBool: {
    name: "measureLuminanceBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "measureLuminanceBool (default FALSE) turns on sampling by the photometer during stimulus presentation. (It is currently implemented solely for targetKind='movie'.) This uses the Cambridge Research Systems Colorimeter, which must be plugged into a USB port of the computer and pointed at whatever you want to measure. (Tip: An easy way to stably measure from a laptop screen is to lay the screen on its back and rest the photocell, gently, directly on the screen.) Use measureLuminanceDelaySec and measureLuminanceHz to set the start time from movie onset and sampling rate. After sampling the stimulus, EasyEyes saves a data file called luminance-EXPERIMENT-BLOCK-CONDITIONNAME-TRIAL.csv into the Downloads folder, where EXPERIMENT is the experiment name, BLOCK is the block number, CONDITIONNAME is the conditionName, and TRIAL is the trial number in the block. \nThe luminance*.csv file has four columns: \nframeTimeSec, movieValue, luminanceTimeSec, luminanceNits\n• frameTimeSec is when  (in fractional seconds) the frame is presented, relative to beginning of movie. The first value is zero, and it increments by 1/movieHz. There is one frame (and frameTimeSec value) for each value of movieValues.\n• movieValues is copied from the input parameter array movieValues. \n• luminanceTimeSec is time of measurement relative to the beginning of movie. Its first value is measureLuminanceDelaySec and each subsequent value increases by 1/measureLuminanceHz.\n• luminanceNits is measured luminance in nits. (A nit is also called cd/m^2, candelas per meter squared.) \nNOTES: measureLuminanceDelaySec and thus luminanceTimeSec can be negative. The frameTimeSec and luminanceTimeSec columns will be aligned only when measureLuminanceHz == movieHz.",
  },
  measureLuminanceDelaySec: {
    name: "measureLuminanceDelaySec",
    availability: "now",
    type: "numerical",
    default: "5",
    explanation:
      "measureLuminanceDelaySec (default 5) sets the delay (which can be negative) from stimulus onset to taking of the first luminance sample. Note that the CRS Colorimeter is designed for slow precise measurements. To achieve better than 12-bit precision, if you want the reading of a new luminance to be unaffected by the prior luminance, we recommend allowing 5 s for the device to settle at the new luminance before taking a reading. Thus, if targetKind=='movie', you might run your movie with 6 s per frame (i.e. movieHz=measureLuminanceHz=1/6) and set measureLuminanceDelaySec=5.",
  },
  measureLuminanceHz: {
    name: "measureLuminanceHz",
    availability: "now",
    type: "numerical",
    default: "1",
    explanation:
      "measureLuminanceHz (default 1) sets the rate that the photometer is sampled. Note that the CRS Colorimeter is designed for slow precise measurements. If the stimulus is a movie, you'll typically set this frequency to match the frame rate of the movie. We recommend a slow frame rate, e.g. movieHz=measureLuminanceHz=1/6.",
  },
  measureLuminancePretendBool: {
    name: "measureLuminancePretendBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "measureLuminancePretendBool (default FALSE) allows testing of the timing of the luminance measurement without a photometer. The luminance returned is always -1. Strictly for debugging.",
  },
  movieComputeJS: {
    name: "movieComputeJS",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '⭑ movieComputeJS holds the filename (including extension “.js”) of a JavaScript program to compute an HDR movie. A one-frame movie will display a static image for the specified targetDurationSec. movieComputeJS is used if and only if the targetKind is movie. When the experiment is compiled, the movie program must already have been uploaded through the EasyEyes submission box. The program must define and fill the “movieNit” array. The program can use several predefined variables, including: movieRectPx, tSec, xyDeg, xDeg, and yDeg, as well as the EasyEyes input parameters targetContrast, targetEccentricityXDeg, targetEccentricityYDeg, targetCyclePerDeg, targetHz, targetPhaseDeg, targetOrientationDeg (clockwise from vertical), targetSpaceConstantDeg (the 1/e radius), targetTimeConstantSec, movieRectDeg, and movieLuminanceNit. When EasyEyes reads your compute js file, it processes the list of argument in the function definition. You can include any of the INPUT PARAMETERS defined in this GLOSSARY in your list of arguments. At runtime, EasyEyes will retrieve their values and provide whichever input parameters the argument list specifies.\n\nTIMING: Each movie trial reports timing data in the CSV results file. Each movie trial, computes a movie by first running the scientist\'s movieComputeJS and then passing it through the ffMPEG encoder. Here are some results using tiltedFlickeringGrating.js on Chrome on a MacBook Pro (13-inch, M1, 2020), asking ffMPEG to use the avc1 : libx264 codec. Total prep time (watching the wait icon) grows linearly with the product of pixels per frame and number of frames. \ntimeSec = 1 + MPix*frames/4\nwhere timeSec is the prep time in seconds, MPix means a mega pixel, i.e. one million pixels, and frames is the number of frames in the movie. 25% of this is the runtime of the tiltedFlickeringGrating.js, and 75% is ffMPEG. The formula for just ffMPEG is\nffMpegSec = 0.7 + MPix*frames/6\nThe 6 MPix/s rate seems fine. The fixed 0.7 s overhead is surprising. We don\'t yet know what it\'s doing during that time.\n\nTIMING DATA IN CSV FILE, for each trial\ncomputeMovieArraySec, e.g. 1.1. The time (in sec) spent in the scientist’s movie.js to prepare compute the movie for this trial.\ncomputeFfmpegSec, e.g. 2.1, The time (in sec) spent in ffMPEG to encode the movie for this trial\ncomputeTotalSec, e.g. 3.2, Total time (in sec) preparing the movie for this trial.\ncomputePixels, e.g., 1000000, The number of pixels in each frame.\ncomputeFrames, e.g. 10, The number of frames in the movie.\ncomputeCodec is the name is of the codec, different for Chrome and Safari.\n\n(NOT UP TO DATE) ADVICE ON HOW TO WRITE YOUR JavaScript MOVIE ROUTINE\nxyDeg is a 2*width*height float array, which provides the exact x,y visual coordinate of each screen pixel in movieRectPx. \nxDeg and yDeg are float vectors, which provide approximate visual coordinates of the screen pixels in movieRectPx. \nTo compute a (possibly one-frame) movie as a visual stimulus, we usually need the visual coordinate of each pixel. EasyEyes provides the width*height*2 array xyDeg[i,j,k], where each 2-number element (indexed by k) is the x,y position in deg of pixel i,j. Use of the xyDeg array does not allow speed up by computational separation of x and y, so you may prefer to use the separable approximation provided by the width-long vector xDeg and height-long vector yDeg, which provide approximate visual coordinates of the pixels in movieRectPx. (Note: xyDeg takes time and space for EasyEyes to compute, and not all movieComputeJS programs need it, so EasyEyes skips making xyDeg if the string  "xyDeg" is not found in the movieComputeJS file.)\n\nEXAMPLE: movieComputeJS might contain the filename "VerticalGrating.js", and that file might contain:\n// Compute vertical Gabor.\nvar imageNit = new Array(xDeg.length).fill(0)\n        .map(() => new Array(yDeg.length).fill(0));\nvar gx = [];\nvar gy = [];\nfor (const x of xDeg) {\n        gx.push(\n                Math.exp(-((x-targetEccentrictyXDeg)/targetSpaceConstantDeg)**2)\n        );\n}\nfor (const y of yDeg) {\n        gy.push(\n                Math.exp(-((y-targetEccentrictyYDeg)/targetSpaceConstantDeg)**2)\n        );\n}\nvar fx = [];\nfor (i = 0; i < xDeg.length; i++) {\n        fx[i]=gx[i]*Math.sin(\n                2*Math.PI*((xDeg[i]-targetEccentrictyXDeg)*targetCyclePerDeg + targetPhase/360)\n        )\n}\nfor (j = 0; j < yDeg.length; j++) {\n        for (i = 0; i < xDeg.length; i++) {\n                imageNit[i][j] = (255/2) * (1 + targetContrast * gy[j] * fx[i]);\n        }\n}',
  },
  movieHz: {
    name: "movieHz",
    availability: "now",
    type: "numerical",
    default: "60",
    explanation:
      "⭑ movieHz is the desired frame rate of the movie. Most displays run at 60 Hz, some are faster, and some have variable frame rate. movieHz set the number of computed movie frames per second. Each computed frame could be displayed for several display frames. For example, one might save computation time by setting movieHz to 15 for display on a 60 Hz display. Not to be confused with the desired flicker frequency of the target, targetHz, which is independent.",
  },
  movieLuminanceNit: {
    name: "movieLuminanceNit",
    availability: "now",
    type: "numerical",
    default: "-1",
    explanation:
      "movieLuminanceNit (default -1) is the desired screen luminance in cd/m^2, i.e. nits. Specifying luminance will only be practical when we use an HDR codec supporting PQ. More typically, we'll want to use the display at the background luminance it was designed for, often 500 cd/m^2 in 2022, or half that. The default -1 value indicates that we should use the display at whatever background luminance we find it in.",
  },
  moviePQEncodedBool: {
    name: "moviePQEncodedBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "moviePQEncodedBool (default FALSE) determines whether to use the PQ transfer function. With PQ each pixels specified its own absolute l",
  },
  movieRectDeg: {
    name: "movieRectDeg",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "⭑ movieRectDeg (default is empty, indicating whole screen) indicates the desired approximate movie size and location in the visual field. It consists of four float numbers separated by commas, stored as text. All number are in deg relative to fixation. deg are positive above and to the right of fixation. The sequence is left,bottom,right,top. Whatever is requested will be mapped to pixels and clipped by screenRectPx. \n     Note that movieRectDeg is a rect on the retina, which will be curved on the screen, and tthe movie's screen pixels are specified as the screen rect, movieRectDeg. Guided by movieRectPxContainsRectDegBool, EasyEyes creates screenRectPx to be a reasonable approximation to movieRectDeg.\n     The scientist provides movieRectDeg, which defines a rect in visual coordinates (i.e. deg on the retina). Note that straight lines in visual space generally correspond to curves in pixel space. However, the HDR movie must be a screen rect (horizontal & vertical rectangle), so EasyEyes defines the movieRectPx screen rect approximation to movieRectDeg. movieRectDeg is rectangular on the retina, and movieRectPx is rectangular on the screen. \n     movieRectPx is the screen rect used for the movie. It is derived from movieRectDeg according to movieRectPxContainsDegBool, and then clipped by screenRectPx. If movieRectDeg is empty (the default) then movieRectPx is the whole screen, ie screenRectPx.\n     The movie bounds are movieRectPx. To compute a movie, we usually need to know the visual coordinate of each pixel. If needed, EasyEyes provides the 2*width*height array xyDeg, where array xyDeg(i,j) is the x,y position in deg of pixel (i,j).",
  },
  movieRectPxContainsRectDegBool: {
    name: "movieRectPxContainsRectDegBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "If movieRectPxContainsRectDegBool (default FALSE) is FALSE then movieRectPx is the bounding box of the four screen points that correspond to the four midpoints (on the retina) of the four sides of movieRectDeg. If it's TRUE then movieRectPx is the screen bounding box containing the four midpoints and the four corners of movieRectDeg. So movieRectPx will contain practically all the pixels in movieRectDeg. The issue, of course, is that a rect on the screen (px coordinates) when mapped to the retina (deg coordinates) is not a rect, all four sides are curved. Similarly, a rect on the retina (deg coordinates) when mapped to the screen (px coordinates) is not a rect, all four sides are curved. Despite the imprerfect correspondence, rects are convenient, so movieRectPxContainsRectDegBool selects how to approximate the correspondence. Usually the scientist will want to specify in deg coordinates, but want the efficiciency of implementation in px coordinates.",
  },
  movieSec: {
    name: "movieSec",
    availability: "now",
    type: "numerical",
    default: "60",
    explanation:
      "⭑ movieSec is the desired duration of the movie. The actual duration will be an integer number of frames. EasyEyes will compute n=round(movieHz*movieSec) frames, with a duration of n/movieHz. The movieSec duration is normally longer than the requested targetDurationSec. \nNOTE: movieSec is ignored if movieValues is not empty.",
  },
  movieTargetDelaySec: {
    name: "movieTargetDelaySec",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "movieTargetDelaySec (default is 0) specified the target delay (positive or negative) relative to being centered in the movie duration movieSec.",
  },
  movieValues: {
    name: "movieValues",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      'movieValues (default empty) is a comma-separated list of numbers. The movie will have one frame of per number. This vector offers the scientist a handy way to provide a series of numbers to the scientist\'s movieCompute.js program to control, e.g. the contrast, of each frame of a movie, with one frame per value in this list. If movieMeasureLuminanceBool==TRUE then the movieValues vector is reproduced as a column in the "luminances*.csv" data file that is dropped into the Downloads folder. The movieValues column will be aligned with the other columns only when measureLuminanceHz == movieHz.\nNOTE: movieSec is ignored if movieValues is not empty.',
  },
  needBatteryFullPowerModeBool: {
    name: "needBatteryFullPowerModeBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 needBatteryFullPowerModeBool (default FALSE), when TRUE, requires that the phone not be in low-power mode. If it is in low power mode, then we encourage the participant to charge the phone, and they’re allowed to PROCEED when the phone switches from low-power to full-power mode. Relies on a requestAnimationFrame test recommended by Stack Overflow that we hope will work on all phones.",
  },
  needBatteryLevel: {
    name: "needBatteryLevel",
    availability: "now",
    type: "numerical",
    default: "0.1",
    explanation:
      "🕑 needBatteryLevel (default 0.1) specifies the required minimum battery level (where 0 is empty and 1.0 is full). If the battery is below required level, then we encourage the participant to charge the phone, and they’re allowed to PROCEED when the battery reaches the required level. Based on the web URL BatteryManager.level which is available on all Android and Samsung browsers, and not available on iOS. needBatteryLevel is ignored when the battery manager API is not supported.",
  },
  needEasyEyesKeypadBeyondCm: {
    name: "needEasyEyesKeypadBeyondCm",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use needKeypadBeyondCm instead.",
  },
  needKeypadBeyondCm: {
    name: "needKeypadBeyondCm",
    availability: "now",
    type: "numerical",
    default: "70",
    explanation:
      "needKeypadBeyondCm (default 75). If any block has \nviewingDistanceDesiredCm > needKeypadBeyondCm, \nEasyEyes will recruit the participant's smartphone once on the Device Compatibility page for the whole experiment. EasyEyes will provide a keypad on that phone during each block that requires it. The phone remains connected through the whole experiment. The keypad is enabled only for blocks with a viewingDistanceDesiredCm that exceeds needKeypadBeyondCm. While the keypad is enabled, the participant is free to type on either or both the computer's keyboard and the phone keypad. Set needKeypadBeyondCm to zero to enable the keypad regardless of viewingDistanceDesiredCm. Set it to a huge value to never provide a keypad.\n\nAs of May 2024, I'm setting _needSmartphoneCheckBool=FALSE when I set needKeypadBeyondCm=50. It's my impression that I keep losing the phone connection when _needSmartphoneCheckBool=TRUE.\n\nThe SPACE and RETURN keys get the bottom row, each taking half the row. The rest of the keys are laid out in a regular grid, using the largest possible key size. Each key (except SPACE and RETURN) has the aspect ratio specified by responseTypedKeypadWidthOverHeight. The smartphone connection is established at the beginning of the experiment, before nudging begins. \n\nPROGRAMMER: All tasks accept text (if responseTypedBool=TRUE) regardless of source (keyboard or keypad). The availability of the keypad is controlled centrally by this switch, not by conditionals in the code for each task.\n",
  },
  needScreenHeightCm: {
    name: "needScreenHeightCm",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "🕑 needScreenHeightCm (default 0) specifies the minimum acceptable screen height in cm for this condition. Less tall screens will be rejected at the device compatibility page.",
  },
  needScreenHeightDeg: {
    name: "needScreenHeightDeg",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "needScreenHeightDeg (default 0) specifies the minimum acceptable screen height in deg for this condition. This is used in two way, first, in the Device Compatibility page, to reject a computer screen lacking enough pixels, and second, at the beginning of each block, to reduce viewing distance, if necessary, to provide the needed angular screen height.\n\n1. REQUIRE SCREEN PIX IN Device Compatibility page. For each block, needScreenHeightDeg, needTargetAsSmallAsDeg, and targetMinPhysicalPx are combined to compute a minimum screen-height px. The max across blocks is enforced in the Device Compatibility page. Note that needTargetAsSmallAsDeg is used solely for this resolution requirement, so you can eliminate the resolution requirement by setting needTargetAsSmallAsDeg to a large value, e.g. 10.\n\n2. ADJUST VIEWING DISTANCE OF EACH BLOCK. needScreenHeightDeg is also used at the beginning of each block, to reduce  viewing distance, if necessary, so that the screen will have (at least) the specified height in deg. The default of needScreenHeightDeg is zero, which is ignored. \n\nSee needScreenWidthDeg for details.                                                     ",
  },
  needScreenWidthCm: {
    name: "needScreenWidthCm",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "🕑 needScreenWidthCm (default 0) specifies the minimum acceptable screen width in cm for this condition. Less wide screens will be rejected at the device compatibility page.",
  },
  needScreenWidthDeg: {
    name: "needScreenWidthDeg",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "needScreenWidthDeg (default 0) specifies the minimum acceptable screen width in deg for this condition. This is used in two way, first, in the Device Compatibility page, to reject a computer screen that doesn't have enough pixels, and second, at the beginning of each block, to reduce viewing distance below viewingDistanceDesiredCm, if necessary, to provide the needed angular screen width.\n\n1. REQUIRE SCREEN RESOLUTION ON DEVICE-COMPATIBILITY PAGE, i.e. set minimum width and height in px. The Device Compatibility page computes and enforces a minimum screen resolution. For each block, needScreenWidthDeg, needScreenHeightDeg, needTargetAsSmallAsDeg, and targetMinPhysicalPx are combined to compute minimum screen-width px and screen-height pix. The max width and height across all blocks is enforced in the Device Compatibility page.\n\nIf you use needScreenWidthDeg solely to control viewing distance, with no desire to set a minimum screen resolution, just set needTargetAsSmallAsDeg to a large value, e.g. 1, since needTargetAsSmallAsDeg is used solely to set the required screen resolution.\n\nEasyEyes ignores any conditions disabled by conditionEnabledBool = FALSE, and similarly ignores any block disabled by virtue of having all its conditions disabled.\n\nRequired screen resolution is computed from five parameters from the experiment spreadsheet, conditionEnabledBool, targetMinPhysicalPx, needTargetAsSmallAsDeg, needScreenWidthDeg, and needScreenHeightDeg, plus the monitor's physicalPxPerPx, retrieved by a web API. For each block, EasyEyes first computes max of the required target pixel density (px/deg) across enabled conditions:\nminPxPerDeg = max((targetMinPhysicalPx / physicalPxPerPx) / needTargetAsSmallAsDeg)\nacross enabled conditions in the block. Then it computes max of the required screen subtense (deg) across enabled conditions in each block:\nminScreenHeightDeg = max(needScreenHeightDeg)\nand\nminScreenWidthDeg = max(needScreenWidthDeg)\nHaving computed minPxPerDeg, minScreenHeightDeg, and minScreenWidthDeg for each block, EasyEyes computes the minimum screen resolution for each block:\nminScreenWidthPx = minPxPerDeg * tand(minScreenWidthDeg/2) / tand(1/2)\nminScreenHeightPx = minPxPerDeg * tand(minScreenHeightDeg/2) / tand(1/2)\nwhere tand is the tangent function modified to accept the angle in deg, i.e.\ntand(x) = tan(x*pi/180)\nThe required minimum resolution for the experiment is the max required resolution \nmax(minScreenWidthPx)\nand\nmax(minScreenHeightPx)\nacross all enabled blocks. These requirements are declared and enforced on the Device Compatibility page, which rejects any computer screen with insufficient resolution (i.e. pixels).\n\n2. ADJUST VIEWING DISTANCE OF EACH BLOCK. The EasyEyes compiler requires viewingDistanceDesiredCm to be the same across conditions in a block, but allows it to differ across blocks. needScreenWidthDeg is used, at the beginning of each block, to reduce viewing distance below viewingDistanceDesiredCm, if necessary, so that the screen will have at least the requested width in deg. Default is zero, which is ignored. \nmaxViewingDistanceCm = screenWidthCm/(2*tand(needScreenWidthDeg/2)).\nSet the block's viewing distance to \nmin(maxViewingDistanceCm, viewingDistanceDesiredCm).\n\n3. PRACTICAL ADVICE. Modern displays have a lot of pixels, so you might be tempted to do all your testing at one viewing distance. However, no display on the market has enough pixels for you to use the same viewing distance to measure foveal acuity (with needTargetAsSmallAsDeg=0.03) and peripheral crowding (with needScreenWidthDeg=30). The solution is to use a block with long viewing distance to measure foveal acuity (needTargetAsSmallAsDeg=0.03), and another block, with short viewing distance, to measure peripheral vision (with needScreenWidthDeg=30).\n\n3. TEST SOFTWARE. The TestScreenResolution.xlsx spreadsheet emulates the EasyEye Display Compatibility page computation of required screen resolution (px).\n\nAlso see needScreenHeightDeg, needScreenWidthDeg, needTargetAsSmallAsDeg, targetMinPhysicalPx",
  },
  needSoundOutput: {
    name: "needSoundOutput",
    availability: "now",
    type: "categorical",
    default: "",
    explanation:
      '🕑 needSoundOutput (no default) allows the scientist to indicate whether a block requires either headphones (including earbuds) or speakers. Three values are allowed. Empty "" demands nothing; "loudspeakers" demands speakers; and "headphones" demands headphones or earbuds. Some blocks need headphones (or ear buds) in order to get good separation of the sound channels to the two ears. Other blocks need speakers, because they can be calibrated with a calibrated microphone. A single experiment might need both, headphones for one block (e.g. for a dichotic hearing test) and speakers for another (e.g. to use a calibrated microphone to calibrate the speakers and then measure an audiogram).\n\nWithin a block you may not have a condition demanding loudspakers and another demanding headphones.\n\n',
    categories: ["loudspeakers", "headphones"],
  },
  needSoundOutputKind: {
    name: "needSoundOutputKind",
    availability: "now",
    type: "categorical",
    default: "",
    explanation: "Use needSoundOutput instead.",
    categories: ["loudspeakers", "headphones"],
  },
  needTargetAsSmallAsDeg: {
    name: "needTargetAsSmallAsDeg",
    availability: "now",
    type: "numerical",
    default: "1",
    explanation:
      "needTargetAsSmallAsDeg (default 1 deg) specifies (along with targetSizeIsHeightBool) the smallest target size needed by this condition of the experiment. This is used solely in the Device Compatibility page, to reject screens lacking enough pixels. The screen must satisfy every block's needed: needTargetAsSmallAsDeg, targetMinPhysicalPx, needScreenHeightDeg, and needScreenWidthDeg. The parameters are combined in each block to compute the screen resolution needed by that block. The max of each across all blocks is enforced in the Device Compatibility page. \n\nNote that needTargetAsSmallAsDeg is used solely for the resolution requirement (screen width and height in pixels), so you can eliminate the resolution requirement by setting needTargetAsSmallAsDeg to a large value, e.g. 10.\n\nFor more details see: needScreenWidthDeg.",
  },
  notes: {
    name: "notes",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "notes provides a place in the experiment spreadsheet to add comments about the condition that you want preserved in the data file. Ignored by EasyEyes, and saved with results.",
  },
  "omitPsychoJS.window.monitorFramePeriodBool": {
    name: "omitPsychoJS.window.monitorFramePeriodBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "omitPsychoJS.window.monitorFramePeriodBool (default FALSE), when TRUE omits the term psychoJS.window.monitorFramePeriod from the calculation of remaining time for stimulus presentation. This is temporary, for debugging.",
  },
  "questionAndAnswer@@": {
    name: "questionAndAnswer@@",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      'questionAndAnswer01 ... questionAndAnswer99 each consist of several strings, separated by vertical bars like |, that specify: \nnickname, \ncorrectAnswer (may be empty), \na question to be asked, \nand perhaps several possible answers.\n\nquestionAndAnswer supports only two situations:\n1. targetTask is empty (the default)\n2. targetTask===identify AND targetKind===image\nThe compiler will soon enforce this. New cases could be added. Just ask.\n\nThe nickname is used solely to name the column of responses in the saved data. The correctAnswer may be omitted, in which case the vertical bars before and after it will be contiguous. The nickname and question are required; the correct answer and possible answers are optional. If no possible answers are specified, then the question accepts a free-form text answer. If multiple answers are specified, then they are offered to the participant as multiple-choice alternatives, a button devoted to each one. Specifying just one answer is currently an error, but this may change in a future enhancement. (We might use the single-answer field to specify the single-answer type, e.g. logical, numerical, integer, text.)\nIMPORTANT: You can have many questionAndAnswers in one condition, e.g.  questionAndAnswer01, questionAndAnswer02, questionAndAnswer03, but the block may not include any other condition. The EasyEyes compiler will soon enforce this.\n• FREE-FORM: Provide just a nickname, an empty correctAnswer, and a question, no answer. For example, "DESCRIPTION||Describe a recent birthday." The participant is invited to type their answer into a text box.\n• MULTIPLE CHOICE: Provide a nickname, a correctAnswer, a question, and at least two possible answers. The participant must click on one. For example:\nFRUIT|apple|Which of the following is a fruit?|house|sky|apple|father|country\nBEAUTY||How much beauty do you get from this image right now?|1|2|3|4|5|6|7\nor\nKIND||What kind of image is it?|figurative painting|abstract painting|photograph\n\nEasyEyes supports questionAndAnswer01 ... questionAndAnswer99, so you can have up to 99 questions in one block. You can use questionAndAnswers in any number of blocks, each with up to 99 new questions. The parameters must be serial, starting with 01, and cannot skip numbers. ',
  },
  "questionAnswer@@": {
    name: "questionAnswer@@",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '🕑 questionAnswer01 ... questionAnswer99 each parameter asks a question and gets a reply. You provide a long string to the parameter consisting of several substrings separated by vertical bars |, like this:\nquestionAnswer01     nickname|question|value1|answer1|value2|answer2 ...\nThe substrings are:\nnickname is used as the column title in the results CSV file.\nquestion is presented to the participant.\nvalue is a number to be associated with the immediately following answer. If omitted it defaults to zero.\nanswer is a text string.\n\nYou provide zero or several answers, each with an optional value. When a value is omitted, the vertical bars remain. The default value is zero. Assign values as you please, but they must be numerical. When only one of the answers is correct, you might assign value 1 to the correct answer and let the rest be zero.\nAWAKE|You are?||asleep|1|awake\n\nThe nickname is used solely to name the two columns (nickname and nickname.value) of responses in the saved data. The nickname and question are required; the allowed answers (each with optional value) are optional. The default answer value is zero. If no answers are provided, then the question accepts a free-form text answer. If multiple answers are provided, then they are offered to the participant as multiple-choice alternatives, a button devoted to each one. You can use questionAnswerLayout to arrange the answers in a row, rather than the column default. Values are not revealed to the participant. Specifying just one answer is currently an error, but this may change in a future enhancement. [We might use the single-answer field to specify type of the single answer type, e.g. logical, numerical, integer, text.]\n\nHISTORY. questionAnswer is new and replaces the old, and now-deprecated, questionAndAnswer, which had a slightly different syntax. \n\nquestionAndAnswer is supported for only these cases:\n1. targetTask is empty (the default)\n2. targetTask===identify AND targetKind===image\n3. In the future, we’ll add further cases, as needed.\nThe compiler will soon enforce this.\nEasyEyes supports questionAnswer01 ... questionAnswer99, i.e. you can have up to 99 questions in one condition. The questions you use must start with the ending 01 and cannot skip numbers.  Any number of conditions can each have up to 99 questions. [We should, but I don\'t know whether we currently support having several questionAnswer conditions in one block.] The parameters questionAnswerShuffleQuestionsBool and questionAnswerShuffleAnswersBool allow you to randomize the order of questions and answers.\n\nEXAMPLES\nFREE-FORM: Provide just a nickname and a question, no answer. For example, \nDESCRIPTION|What is your impression of the painting?\nThe participant is invited to type their answer into a text box.\nMULTIPLE CHOICE: Provide a nickname, a question, and at least two possible answers (each may have a value). The participant must click on one of the answers. For example:\nFRUIT|Which of the following is a fruit?|0|house|0|sky|1|apple|0|father|0|country\nBEAUTY|How much beauty do you get from this image right now?||1||2||3||4||5||6||7\nor\nKIND|What kind of image is it?||figurative painting||abstract painting||photograph\n\nLANGUAGE AND ALIGNMENT. If fontDirection (the text direction of the language) is left-to-right (ltr) then each question and its answers (whether in a row or column) is left aligned, otherwise it is right-aligned.\n\nOUTPUT. EasyEyes will produce two columns for each question: NICKNAME and NICKNAME.value, where NICKNAME stands for the nickname provided to QuestionAnswer. The NICKNAME column records what the participant typed or selected. The NICKNAME.value column reports its value. WHen there is no answer then there is no NICKNAME.value column.\n\nUSE THESE PARAMETERS TO SET OPTIONS\nquestionAnswerLayout (default "vertical") if "horizontal" then lay out the several answers in a row. If "vertical" then lay them out in a column.\nquestionAnswerShuffleAnswersBool (default FALSE) if TRUE then randomize order of answers for each question.\nquestionAnswerShuffleQuestionsBool (default FALSE) if TRUE then randomize the order of the questions in this condition.\n\nCOMBINE WITH showImage\nYou can combine showImage with questionAnswer. Use showImageSpareFraction to determine what fraction of the screen to reserve for the text. Use showImageWhere to determine how to divide up the screen into image and text. ',
  },
  questionAnswerLayout: {
    name: "questionAnswerLayout",
    availability: "now",
    type: "categorical",
    default: "vertical",
    explanation:
      '🕑 questionAnswerLayout (default vertical) modifies questionAnswer. If "horizontal" then lay out the several answers horizontally in a row. If "vertical" , then vertically in a column.',
    categories: ["horizontal", "vertical"],
  },
  questionAnswerShuffleAnswersBool: {
    name: "questionAnswerShuffleAnswersBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 questionAnswerShuffleAnswersBool (default FALSE) modifies questionAnswer. If TRUE then randomize the order of the answers for each question.",
  },
  questionAnswerShuffleQuestionsBool: {
    name: "questionAnswerShuffleQuestionsBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 questionAnswerShuffleQuestionsBool (default FALSE) modifies questionAnswer. If TRUE then randomize the order of the questions in this condition.",
  },
  readingCorpus: {
    name: "readingCorpus",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "⭑ readingCorpus (default is empty) is the complete filename (with extension) of a text file (must be separately uploaded to Pavlovia). The text file should be a story or book's worth of readable text. We typically use one of the ten IReST stories, each about 100 words long, and available in dozens of languages. They are closely matched in difficulty across stories and languages.\n     After EasyEyes reads in the corpus text, it does two analyses to facilitate its use.\n1. CONCORDANCE. Prepare a concordance. This is a two-column table. The first column is a unique list of all the corpus words. The second column is frequency, i.e. the number of times that the word appears in the corpus. For this purpose we should ignore capitalization and leading and trailing punctuation. The table is sorted by decreasing frequency.\n2. WORD INDEX. Use a regex search to make a one-column  list of the index, in the corpus, of every word. For this purpose, a word consists of an alphanumeric character plus all leading and trailing non-whitespace characters.\n??IMPORTANT: Currently, leaving the readingCorpus field blank causes a fatal error in EasyEyes when that condition runs. We plan to add a compiler check to detect the problem at compile time, before your study runs.",
  },
  readingCorpusEndlessBool: {
    name: "readingCorpusEndlessBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 readingCorpusEndlessBool (default FALSE). We simulate an infinite corpus by simulating an endless series of copies of the corpus glued together. If we're using a shuffled corpus then each copy is independently shuffled.",
  },
  readingCorpusFoils: {
    name: "readingCorpusFoils",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "readingCorpusFoils (default empty). Optional. The complete filename (with extension) of a text file(must be separately uploaded to Pavlovia). The file contains a list of words from which each foil is randomly selected. The list may or may not include target words. When readingCorpusFoils is a filename, the foils are drawn from that file; when it's empty (not a filename), the foils are drawn from the readingCorpus. Foil selection always respects readingCorpusFoilExclude. Each foil drawn from readingCorpus is selected to match frequency of the target it will appear with. When foils are drawn from readingCorpusFoils, they are selected randomly, with no regard for frequency.",
  },
  readingCorpusFoilsExclude: {
    name: "readingCorpusFoilsExclude",
    availability: "now",
    type: "categorical",
    default: "none",
    explanation:
      'readingCorpusFoilsExclude (default none). In selecting foils from readingCorpusFoils or readingCorpus exclude:\n1. none. No exclusion.\n2. pastTargets. Exclude former targets in this session. \n3. pastTargetsAndFoils. Exclude former targets and foils in this session. \n\nThe task asks the participant to identify the target word among foil words. All the words (foils) offered with the target are different from the target and each other. readingCorpusFoilsExclude specifies which words are excluded in foil selection. If readingCorpusFoils is a filename (i.e. not empty), then the foils are randomly sampled from words in the readingCorpusFoils (regardless of frequency).  If it\'s empty, then the foils are sampled from words in the readingCorpus that have approximately equal frequency in the readingCorpus as the target.  \n\nIMPLEMENTATION: To implement readingCorpusFoilsExclude throughout the session (i.e. experiment), EasyEyes makes a cumulative list of presented targets, "pastTargets", and another cumulative list of presented foilds, "pastFoils". It accumulates across all conditions, past and present, in this session. pastTargets accumulates targets, and pastFoils accumulates foils. Each condition can have different readingCorpus and readingCorpusFoils.',
    categories: ["none", "pastTargets", "pastTargetsAndFoils"],
  },
  readingCorpusShuffleBool: {
    name: "readingCorpusShuffleBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      'readingCorpusShuffleBool (default FALSE), when TRUE requests that the condition be run from a shuffled copy of the corpus that is created and shuffled at the beginning of the block and discarded at the end of the block. If several interleaved conditions use the same readingCorpus and set readingCorpusShuffleBool=TRUE, then each uses its own independently shuffled copy. For shuffling, each string of non-whitespace characters is a "word", and every string of whitespace characters is replaced by a space. The word order is shuffled in the copy, which is used for all trials of this condition in this block. \n(IT\'S TEMPTING TO REMOVE TRAILING PUNCTUATION, BUT THIS WOULD DAMAGE ABBREVIATIONS LIKE DR. AND INC.)',
  },
  readingCorpusTargetsExclude: {
    name: "readingCorpusTargetsExclude",
    availability: "now",
    type: "categorical",
    default: "none",
    explanation:
      '🕑 readingCorpusTargetsExclude (default none). In selecting targets from readingCorpus exclude:\n1. none. No exclusion.\n2. pastTargets. Exclude former targets in this session. \n3. pastTargetsAndFoils. Exclude former targets and foils in this session. \n\nNOT YET FULLY IMPLEMENTED:  https://trello.com/c/M1bTdadq\n\nThe task asks the participant to identify the target word among foil words. All the words (foils) offered with the target are different from the target and each other. readingCorpusTargetsExclude specifies which words are excluded in target selection. The targets are sampled, in serial order, from words in the working copy of the readingCorpus. If readingCorpusShuffelBool===TRUE, then the working copy of readingCorpus is shuffled before the block begins.\n\nIMPLEMENTATION: To implement readingCorpusTargetsExclude, throughout the session, EasyEyes makes a cumulative list of presented targets, "pastTargets", and another cumulative list of presented foils, "pastFoils". It accumulates across all conditions, past and present, in this session, regardless of the source files. pastTargets accumulates targets, and pastFoils accumulates foils. Each condition can have different readingCorpus and readingCorpusFoils settings.',
    categories: ["none", "pastTargets", "pastTargetsAndFoils"],
  },
  readingDefineSingleLineSpacingAs: {
    name: "readingDefineSingleLineSpacingAs",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use readingLineSpacingDefineSingleAs instead.",
  },
  readingFirstFewWords: {
    name: "readingFirstFewWords",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '⭑ readingFirstFewWords (default empty) specifies the beginning of the reading in the corpus by its first few words, a string. The matching is exact, including case and punctuation. Default is the empty string, in which case we read from the beginning of the corpus. The EasyEyes compiler flags an error if a nonempty string is not found in the corpus. If the (nonempty) string appears more than once in the corpus, EasyEyes will randomly pick among the instances, independently for each reading. Thus, for an English-language corpus, one might reasonably set readingFirstFewWords to "The ", to begin each reading at a randomly chosen sentence that begins with "The ".',
  },
  readingLineLength: {
    name: "readingLineLength",
    availability: "now",
    type: "numerical",
    default: "57",
    explanation:
      'readingLineLength (default 57) is the maximum line length in units specified by readingLineLengthUnit. Line breaking is based on maxPixPerLine, which is computed from readingLineLength.\n1. If readingLineLengthUnit==="character", then we compute an average character width as the width in pixels of fontCharacterSet divided by the number of characters in that string. The maximum line length (px) is the product of readingLineLength and that average character width (px):\n     maxPixPerLine = readingLineLength*averageCharacterWidthPx\n2. If readingLineLengthUnit==="deg", then we convert the xy deg of the two ends of the line of text to xy px, then set\n      maxPixPerLine = the width, i.e difference in x coordinate.\n3. If readingLineLengthUnit==="pt", then \n     maxPixPerLine = pxPerCm*2.54*readingLineLength/72\n\nTypographers reckon that text is easiest to read in a column that is 8-10 words wide. Average English word length is 5 characters. Adding the space between words yields 6 characters per word. Multiplying 8-10 by 6 yields 48 to 60 letter widths per line. Line breaking without hyphenation will produce an average line length about half a word less than the max. To get an average line length of 9 words, set the max to 9.5 words, or 9.5*6 = 57 characters.  \n\nTEXT PLACEMENT. We want text placement for ordinary reading to cope with a wide range of sizes of window and text block. We want the text placement to have consistent margins from page to page, independent of the actual text. So, using only the provided parameters, EasyEyes computes the expected width and height of the block of text, and centers that rect in the window. The expected width of the text block is \nreadingBlockWidthPx = maxPixPerLine, \nwhose computation is explained above. The expected height of the text block is \nreadingBlockHeightPx = readingLinespacingPx*readingLinesPerPage\nCenter that invisible rect in the window. The baseline of the first line of text is fontAscenderPt below the top of the rect, where\nfontAscenderPt=fontNominalSizePt * fontBoundingBoxReNominalRect(3)\n(You’ll need to convert the pt to px.) The subscript (3) is meant to select the last element of the rect, which should correspond to the top of the bounding rect. Left-to-right languages begin at the left. Right-to-left languages begin at the right.\n\nTEXT PLACEMENT DEPENDS SOLEY ON WINDOW SIZE, font, AND reading* PARAMETERS, INDEPENDENT OF THE TEXT ITSELF. Occasionally the corpus will run out, providing fewer lines than requested by readingLinesPerPage. Do NOT re-center based on the reduced number of lines. Placement is based on the parameters, independent of the text itself.',
  },
  readingLineLengthCharacters: {
    name: "readingLineLengthCharacters",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation:
      "Use readingLineLength instead, with readingLineLengthUnit=character (the default).",
  },
  readingLineLengthUnit: {
    name: "readingLineLengthUnit",
    availability: "now",
    type: "categorical",
    default: "character",
    explanation:
      "readingLineLengthUnit (default character) is the unit for readingLineLength. Allowed values are character, deg, and pt.",
    categories: ["character", "deg", "pt"],
  },
  readingLineSpacingDefineSingleAs: {
    name: "readingLineSpacingDefineSingleAs",
    availability: "now",
    type: "categorical",
    default: "nominalSize",
    explanation:
      "readingLineSpacingDefineSingleAs (default nominalSize) selects a definition of single line spacing (baseline to baseline) of the text to be read. The actual line spacing in deg will be the output parameter readingLinespacingDeg, which is the product of readingLineSpacingSingleDeg and readingMultipleOfSingleLineSpacing. However, we convert readingLinespacingDeg to readingLineSpacingPx in the center of the text box, and use a fixed value of readingLineSpacingPx throughout the text box.\nIMPLEMENTED\n• font defines single line spacing as the default PsychoJS line spacing for this font and size, which can be enormous in fonts with large flourishes. \nNOT YET IMPLEMENTED\n• nominalSize is the industry standard, which defines single line spacing as the nominal point size at which we are rendering the font. E.g. single spaced 12 pt Helvetica has 12 pt line spacing.\n• explicit defines single line spacing as readingLineSpacingSingleDeg.\n• twiceXHeight defines single line spacing as twice the font's x-height. (Many fonts, e.g. Times New Roman, have x-height equal to half their nominal size. For those fonts, nominalSize and twiceXHeight will produce the same line spacing.)\nNote that the calculation of readingLineSpacingPx needs to be done fresh for each text object because it may depend on font, font size, and screen location, which can change from trial to trial. We use the center of the text object as the reference location for converting between deg and px.",
    categories: ["nominalSize", "explicit", "font"],
  },
  readingLineSpacingMultipleOfSingle: {
    name: "readingLineSpacingMultipleOfSingle",
    availability: "now",
    type: "numerical",
    default: "1.2",
    explanation:
      'readingLineSpacingMultipleOfSingle (default 1.2) sets the line spacing (baseline to baseline) to be this multiple of "single" line spacing, which is set by readingDefineSingleLineSpacingAs. 1.2 is the default in many typography apps, including Adobe inDesign.',
  },
  readingLineSpacingSingleDeg: {
    name: "readingLineSpacingSingleDeg",
    availability: "now",
    type: "numerical",
    default: "1",
    explanation:
      "readingLineSpacingSingleDeg (default 1) set the single line spacing in deg, but only if readingLineSpacingDefineSingleAs==explicit. Otherwise it's ignored.",
  },
  readingLinesPerPage: {
    name: "readingLinesPerPage",
    availability: "now",
    type: "numerical",
    default: "4",
    explanation:
      "⭑ readingLinesPerPage (default 4) is the number of lines of text per page.",
  },
  readingMaxCharactersPerLine: {
    name: "readingMaxCharactersPerLine",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation:
      "Use readingLineLength instead, and set readingLineLengthUnit=character.",
  },
  readingMultipleOfSingleLineSpacing: {
    name: "readingMultipleOfSingleLineSpacing",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use readingLineSpacingMultipleOfSingle instead.",
  },
  readingNominalSizeDeg: {
    name: "readingNominalSizeDeg",
    availability: "now",
    type: "numerical",
    default: "1",
    explanation:
      'readingNominalSizeDeg (default 1) sets the nominal size of the text in deg, provided readingSetSizeBy=="nominalDeg". It sets the font\'s point size to the product readingNominalSizeDeg*pxPerDeg.',
  },
  readingNominalSizePt: {
    name: "readingNominalSizePt",
    availability: "now",
    type: "numerical",
    default: "12",
    explanation:
      'readingNominalSizePt (default 12) sets the nominal point size of the text, provided readingSetSizeBy=="nominalPt". One "point" is 1/72 inch.',
  },
  readingNumberOfPossibleAnswers: {
    name: "readingNumberOfPossibleAnswers",
    availability: "now",
    type: "integer",
    default: "5",
    explanation:
      '⭑ readingNumberOfPossibleAnswers (default 4) is the number of possible answers for each question (which of these words did you read just now?). Only one of the possible answers is right. The rest are "foils". The foils have approximately the same frequency in the corpus as the target.',
  },
  readingNumberOfQuestions: {
    name: "readingNumberOfQuestions",
    availability: "now",
    type: "integer",
    default: "3",
    explanation:
      '⭑ After the participant reads a passage, EasyEyes will ask readingNumberOfQuestions (default 3), each on a new screen, to assess retention. Each retention question offers several words and asks the participant which word (the target) was in the passage just read. The other words (foils) were not in that passage but do appear in the corpus. The target word is presented with enough foils to offer N=readingNumberOfPossibleAnswers. The words are arranged in alphabetical order below the question. The participant responds by clicking on the chosen word. It\'s "forced choice"; the participant must click a word. We give a "correct" beep if the answer is right. We repeat this several times, as specified by readingNumberOfQuestions.\n     IGNORE FIRST & LAST PAGES. Performance on the first and last pages of the passage might not be representative because timing of the space bar press might be less regular, and primacy and recency would make words on those pages more memorable. So we analyze only the middle pages, excluding the first and last both from the estimate of reading speed and the retention test. [Thus each word in the corpus is read and tested, read and not tested, or not read.]\n     CONCORDANCE. As explained in readingCorpus, we will, once, compute a concordance, the frequency of every word in the corpus. It is a two-column table (word and number of instances in the corpus), sorted by frequency. \n     CANDIDATES FOR TARGET. For a given passage, each question uses a different target word. We pick candidate target words randomly from the passage just read  (in which many words appear more than once), and check each for suitability. We reject some candidates, so we keep picking candidates until we have accepted the desired number, readingNumberOfQuestions. As potential target or foil words we reject any strings in the concordance that include a hyphen.\n     CHOOSE FOILS. We pick a random integer from 1 to N to determine the rank order frequency of the target among the foils. We reduce the concordance by striking out all the words that were read (whether to be tested or not), except the target, which remains. As our answer set, we take N consecutive words from the reduced concordance, including the target, chosen so that the target has the randomly specified frequency rank (1 to N). If the target frequency is so high or low that the reduced concordance lacks N successive words with the target at the designated rank order, then we reject that target and pick another, using the same random rank. The passage read will typically have hundreds of words, so there are lots of candidate targets for the retention questions.\n      \n\n\n',
  },
  readingPages: {
    name: "readingPages",
    availability: "now",
    type: "numerical",
    default: "4",
    explanation:
      "⭑ readingPages (default 4) is the number of pages to be read. The CSV file reports the number of characters and number of seconds for each page.",
  },
  readingSetSize: {
    name: "readingSetSize",
    availability: "now",
    type: "numerical",
    default: "0.5",
    explanation:
      "🕑 ⭑ readingSetSize (default 0.5) is the desired value, with units set by readingSetSizeUnit. Together they determine the size of the text to be read. ",
  },
  readingSetSizeBy: {
    name: "readingSetSizeBy",
    availability: "now",
    type: "categorical",
    default: "spacingDeg",
    explanation:
      "⭑ readingSetSizeBy (default spacingDeg) determines how you specify the size of the text to be read. \"Typographer's point\" is abbreviated \"pt\", and 1 pt=1/72 inch. x-height is a well-defined text property. However, when you typeset a named font (e.g. Helvetica) at a particular font size (e.g. 12 pt), every metric of the typeset characters varies across fonts, because typographic industry conventions allow the type designer an arbitrary size scale factor, so here we call the typeset size (e.g. 12 pt), the \"nominal\" type size.\n• nominalPt sets the font's point size to readingNominalSizePt.\n• nominalDeg sets the font's point size to subtend readingNominalSizeDeg. The formula is \nnominalPt = (72/2.54)*2*tan(0.5*readingNominalSizeDeg*3.14159/180)*viewingDistanceCm.\n• xHeightPt sets the font's point size to achieve the x-height (the height of lowercase x) specified by readingXHeightPt \n• xHeightDeg sets the font's point size to achieve the x-height (the height of lowercase x) specified by readingXHeightDeg.\n• spacingPt sets the font's point size to achieve the specified average letter-center-to-letter-center spacing readingSpacingPt.\n• spacingDeg sets the font's point size to achieve the specified average letter-center-to-letter-center spacing readingSpacingDeg.",
    categories: [
      "nominalPt",
      "nominalDeg",
      "xHeightPt",
      "xHeightDeg",
      "spacingPt",
      "spacingDeg",
    ],
  },
  readingSetSizeUnit: {
    name: "readingSetSizeUnit",
    availability: "now",
    type: "categorical",
    default: "spacingDeg",
    explanation:
      '🕑 ⭑ readingSetSizeUnit (default spacingDeg) pairs with readingSetSize to specify the size of the text to be read. "Typographer\'s point" is abbreviated "pt", and 1 pt = 1/72 inch. "x-height" is a metric property of text, the height of the lowercase x. Unlike x-height, when you typeset a particular font (e.g. Helvetica) at a particular font "size" (e.g. 12 pt), all metrics of the typeset characters vary across fonts, because typographic tradition allows the type designer to choose an arbitrary size for (say) 12 pt type. All other dimensions are proportional. Here we call the typeset size (e.g. 12 pt) "nominal"; it\'s a length in pts. \n• nominalPt sets the font\'s point size to readingSetSize.\n• nominalDeg sets the font\'s point size so that the nominal size, in deg, equals readingSetSize. The formula is \nnominalPt = (72/2.54)*2*tan(0.5*readingSetSize*3.14159/180)*viewingDistanceCm. \n• xHeightPt sets the font\'s point size to achieve the x-height (the height of lowercase x), in pt, specified by readingSetSize. \n• xHeightDeg sets the font\'s point size to achieve the x-height (the height of lowercase x), in deg, specified by readingSetSize.\n• spacingPt sets the font\'s point size so that the average letter-center-to-letter-center spacing (pt) is approximately readingSetSize. In fact, we adjust font size so that the width of the fontCharacterSet string, in pt, divided by the string length in characters equals readingSetSize.\n• spacingDeg sets the font\'s point size so that the specified average letter-center-to-letter-center spacing (deg) is approximately readingSetSize.  In fact, we adjust point size so that the width of the fontCharacterSet string divided by the string length in chracters equals readingSetSize.',
    categories: [
      "nominalPt",
      "nominalDeg",
      "xHeightPt",
      "xHeightDeg",
      "spacingPt",
      "spacingDeg",
    ],
  },
  readingSingleLineSpacingDeg: {
    name: "readingSingleLineSpacingDeg",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use readingLineSpacingSingleDeg instead.",
  },
  readingSpacingDeg: {
    name: "readingSpacingDeg",
    availability: "now",
    type: "numerical",
    default: "0.5",
    explanation:
      "⭑ readingSpacingDeg (default 0.5) sets the average center-to-center letter spacing, provided readingSetSizeBy is spacingDeg. It sets the point size of the text to make this approximately the average center-to-center spacing (deg) of neighboring characters in words displayed. In fact, we adjust so that the width of the fontCharacterSet string divided by the number of numbers in the string equals readingSpacingDeg.",
  },
  readingSpacingPt: {
    name: "readingSpacingPt",
    availability: "now",
    type: "numerical",
    default: "12",
    explanation:
      "readingSpacingPt (default 12) sets the average center-to-center letter spacing, provided readingSetSizeBy is spacingPt. It sets the point size of the text to make this approximately the average center-to-center spacing (deg) of neighboring characters in words displayed. In fact, we adjust so that the width of the fontCharacterSet string divided by the number of numbers in the string equals readingSpacingPt.",
  },
  readingTargetMaxWordFrequency: {
    name: "readingTargetMaxWordFrequency",
    availability: "now",
    type: "numerical",
    default: "4.30E-04",
    explanation:
      "readingTargetMaxWordFrequency. When reading, it is hard to notice or remember common words, so we exclude common words as the target for retention testing. When selecting a target, we keep drawing candidate targets randomly from the passage that was read until we find one that's acceptable. We reject any candidate target whose frequency in the corpus exceeds **readingTargetMaxWordFrequency**.\n     DEFAULT VALUE. In the classic Kucera and Francis concordance,\nhttps://en.wikipedia.org/wiki/Brown_Corpus\nthe words _water, think, night_ have frequencies about 430*10^-6, which would be a good cut off for a large corpus. That's about 1 in 2326, so this criterion excludes every word in any corpus with fewer than 2,326 words.",
  },
  readingXHeightDeg: {
    name: "readingXHeightDeg",
    availability: "now",
    type: "numerical",
    default: "0.5",
    explanation:
      'If readingSetSizeBy is "xHeightDeg", then set the font\'s point size to achieve this specified x-height (the height of lowercase x). ',
  },
  readingXHeightPt: {
    name: "readingXHeightPt",
    availability: "now",
    type: "numerical",
    default: "6",
    explanation:
      'If readingSetSizeBy is "xHeightPt", then set the font\'s point size to achieve this specified x-height (the height of lowercase x) in typographic "points" (1/72 inch). ',
  },
  responseAllowedEarlyBool: {
    name: "responseAllowedEarlyBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "When responseAllowedEarlyBool is TRUE, the participant can respond at any time after target onset. When FALSE, the participant can only respond after target offset plus markingOnsetAfterTargetOffsetSecs. For demos and debugging, it is handy to set responseAllowedEarlyBool to TRUE with a long targetDurationSec (e.g. 999) so that the stimulus stays up while the audience examines it, yet you can quickly click through several stimuli to see the progression. Note that enabling early response while clicked responses are allowed forces EasyEyes to show the characterSet early, since clicking requires something to click on. And if responseRequiresCharacterSetBool is TRUE then setting responseAllowedEarlyBool TRUE will force early display of the fontCharacterSet regardless of which response modalities are enabled.\nAlso see markingOnsetAfterTargetOffsetSecs.",
  },
  responseClickedBool: {
    name: "responseClickedBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "⭑ responseClickedBool (default TRUE). Allow participant to respond at every occasion by clicking (e.g. clicking the target letter in the fontCharacterSet). When ready for stimulus, allow clicking fixation instead of hitting SPACE. The various response modes are not exclusive. Enable as many as you like. And simulateParticipantBool can provide responses too. Note that, just for initiating the trial, responseMustTrackContinuouslyBool overrides other responseXXX settings so that the only way to initiate the trial is by tracking with the cursor; it has no effect on other screens, including the stimulus response at the end of the trial. ",
  },
  responseEscapeOptionsBool: {
    name: "responseEscapeOptionsBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation:
      "Once debugged, responseEscapeOptionsBool will be TRUE by default. If TRUE, then pressing SHIFT RIGHT-ARROW (⇧▶) offers two or three options. The mildest option is to continue from where ⇧▶ was presssed, deleting any trial for which the response was not yet collected. The middle option is only presented if we suppose that we're testing the scientist, not a typical participant. This option skips to the next block. The last option ends testing and goes to debriefing (if requested). Our rule for supposing that the participant is the scientist is either that the Prolific URL parameters are absent or we are in Prolific Preview mode.\n     If responseEscapeOptionsBool is TRUE, then, at any prompt, the participant can hit <SHIFT RIGHT-ARROW> to be asked whether to cancel the trial (hit space), the block (hit return), or the whole experiment (hit SHIFT RIGHT-ARROW again).",
  },
  responseIdentifyBy: {
    name: "responseIdentifyBy",
    availability: "now",
    type: "multicategorical",
    default: "name, image",
    explanation:
      'responseIdentifyBy (default "image") specifies how participant will identify the target. Valid choices are:\n"" = requests default value.\nimage = participant will identify by image.\nname = participant will identify by name.\nname, image = participant will identify by the combination of name and image.',
    categories: [],
  },
  responseMaxOptions: {
    name: "responseMaxOptions",
    availability: "now",
    type: "integer",
    default: "100",
    explanation:
      "responseMaxOptions (default 100). Currently used only for identification, targetKind=letter and targetKind=image. Specifies the maximum number of options offered for the answer. The target is a random sample from the targetImageFolder. The foils are possible alternatives for the target. Duplicates are suppressed. Only the displayed target and foils count as the number of options.\nFor example, you could set responseMaxOptions=10, when working with a full alphabet of 26 letters, so each answer screen will show only 10 letters, one of which is the target. \n\n[FUTURE: I think this could replace rsvpNumberOfOptions and readingNumberOfOptions.]\n",
  },
  responseMustClickCrosshairBool: {
    name: "responseMustClickCrosshairBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "⚠ responseMustClickCrosshairBool (default FALSE) requires the participant to click the crosshair in order to initiate the trial. For initiating a trial, responseMustClickCrosshairBool overrides the settings of responseTypedBool and responseClickedBool; it has no effect on other screens, including the stimulus response at the end of the trial. \nNOT RECOMMENDED. We're not sure what responseMustClickCrosshairBool might be good for. We're keeping the code for the time being. It turns out that this is not a good way to get fixation of the crosshair at the moment of target presentation. We discovered that some participants learn to plan BOTH the hand and eye movements at once: the manual click on the crosshair and the eye movement to fixate the anticipated target location, so, if their anticipation was right, they end up with their eye on the target at target onset. If you want good fixation use responseMustTrackContinuouslyBool instead. The success of that method is reported by Kurzawski, Pombo, and others (2023).",
  },
  responseMustTrackContinuouslyBool: {
    name: "responseMustTrackContinuouslyBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "⭑ responseMustTrackContinuouslyBool (default FALSE), when TRUE, imposes a special way of initiating a trial that is designed to yield good fixation. For each trial, it selects a random-length waiting interval by taking a fresh random sample from the uniform distribution over the range responseMustTrackMinSec to responseMustTrackMaxSec. The motion is controlled by markingFixationMotionRadiusDeg and markingFixationMotionSpeedDegPerSec.  responseMustTrackContinuouslyBool requires that the cursor tip be in the hotspot (within markingFixationHotSpotRadiusDeg of the crosshair center) for the entire waiting interval.  Whenever the cursor is outside the hotspot, the software resets the waiting process, first waiting for the cursor to enter the hotspot, which begins a new waiting interval (whose duration is a fresh random sample). For initiating a trial, responseMustTrackContinuouslyBool overrides the settings of responseTypedBool and responseClickedBool; it has no effect on other screens, including the stimulus response at the end of the trial. We published an article in Journal of Vision about the excellent fixation achieved with responseMustTrackContinuouslyBool (Kurzawski, Pombo, et al., 2023).\nNOTE: The compiler allows motion to be enabled (i.e. markingFixationMotionRadiusDeg>0) only if responseMustTrackContinuouslyBool=TRUE. So when responseMustTrackContinuouslyBool=FALSE, there is no fixation motion.",
  },
  responseMustTrackMaxSec: {
    name: "responseMustTrackMaxSec",
    availability: "now",
    type: "numerical",
    default: "1.25",
    explanation:
      "When responseMustTrackCrosshairBool=TRUE, the participant’s required tracking time to get target presentation is a random sample from the interval responseMustTrackMinSec to responseMustTrackMaxSec. The EasyEyes compiler requires that\nresponseMustTrackMaxDelaySec ≥ responseMustTrackMinDelaySec ≥ 0.",
  },
  responseMustTrackMinSec: {
    name: "responseMustTrackMinSec",
    availability: "now",
    type: "numerical",
    default: "0.75",
    explanation:
      "When responseMustTrackCrosshairBool=TRUE, the participant’s required tracking time to get target presentation is a random sample from the interval responseMustTrackMinSec to responseMustTrackMaxSec. The EasyEyes compiler requires that\nresponseMustTrackMaxDelaySec ≥ responseMustTrackMinDelaySec ≥ 0.",
  },
  responseNegativeFeedbackBool: {
    name: "responseNegativeFeedbackBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "When responseNegativeFeedbackBeepBool (default FALSE) is TRUE, after a mistaken response, provide negative feedback (sound is a pure 500 Hz tone for 0.5 sec at amplitude 0.05; word is wrong). Default is FALSE, as we typically give only positive feedback.",
  },
  responsePositiveFeedbackBool: {
    name: "responsePositiveFeedbackBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "When responsePositiveFeedbackBool (default TRUE) is TRUE, after each correct response, provide positive feedback (sound is a pure 2000 Hz tone for 0.05 sec at amplitude 0.05; word is RIGHT). WORKING FOR SOUND TASKS; NOT YET IMPLEMENTED FOR VISION TASKS.",
  },
  responsePurrWhenReadyBool: {
    name: "responsePurrWhenReadyBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "When responsePurrWhenReadyBool (default FALSE) is TRUE, play a purring sound to alert the observer while we await their response. Pure 200 Hz tone indefinitely at amplitude 1. Stop purring when they respond.",
  },
  responseSkipBlockForWhom: {
    name: "responseSkipBlockForWhom",
    availability: "now",
    type: "categorical",
    default: "scientist",
    explanation:
      '⭑ responseSkipBlockForWhom (default scientist) allows the scientist to skip a block by pressing SHIFT RIGHT ARROW ⇧▶. This is disabled if ProlificSessionID is not empty. There are three possible values: \n• noone: ⇧▶ is ignored.\n• child: Assume that the participant is a child accompanied by a scientist. Pressing ⇧▶ on keyboard skips the block. This allows the scientist sitting with the child to skip the block if the child is exhausted or discouraged. Skipping from the keypad is impossible.\n• scientist: Assume that the participant is the scientist, who is skimming the experiment. Pressing ⇧▶ on keyboard or a "Skip block" key on the keypad (if active) skips the block. This allows the scientist, before collecting data, to quickly review all the conditions of an experiment. \n\nNOTE: The "scientist" default is safe when collect your data using Prolific. Prolific participants cannot skip blocks. If you test participants without using Prolific (e.g. by sending them a URL directly) then set responseSkipBlockForWhom=noone to be sure they can\'t skip blocks.',
    categories: ["noone", "scientist", "child"],
  },
  responseSkipTrialButtonBool: {
    name: "responseSkipTrialButtonBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      'responseSkipTrialButtonBool (default FALSE) displays a button visible only before trial is initiated that, when pressed, skips the trial. We are exploring the difficulty of many variants on the cursor tracking of the moving crosshair and anticipate that some conditions will be impossible, so we want to offer the participant a way to move on. The button will say "Skip Trial" (international phrase T_skipTrial) and will be big in the upper right corner of the screen. You might also consider using responseTimeoutSec.',
  },
  responseSpokenBool: {
    name: "responseSpokenBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 responseSpokenBool allows participant to respond  verbally at every occasion, e.g. by verbally naming the target. The various response modes are not exclusive. Enable as many as you like. But responseMustClickCrosshairBool overrides all other settings.",
  },
  responseSpokenToExperimenterBool: {
    name: "responseSpokenToExperimenterBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "If responseSpokenToExperimenterBool=TRUE (default FALSE) and targetKind=rsvpReading then an experimenter sits next to the child participant. The child sees the RSVP stimulus and reads the words aloud. The experimenter scores the child’s report of each target word as right or wrong. This is done discreetly, so as not to discourage the child. \n\nThe experimenter listens to the child, and uses the keyboard to score each word. Once the child finishes speaking, the experimenter should tap the SHIFT key to  initiate scoring. Each target word will be presented for scoring. Once scored, it is replaced by the next unscored word, until there are none left to show. Then the experimenter can proceed to the next trial. \n\nThe response screen shows one tiny circle per word (e.g. three).  For each word,  the experimenter uses the up-arrow key for “right”, making the circle green, or the down-arrow key for “wrong”, making the circle pink. The experimenter makes one keypress per word. There’s no way to go back or change the answers.",
  },
  responseTimeoutSec: {
    name: "responseTimeoutSec",
    availability: "now",
    type: "numerical",
    default: "86400",
    explanation:
      "responseTimeoutSec (default 86400, i.e. a day) automatically skips the trial if the participant doesn't initiate it within the timeout interval. We need timeout to handle the situation where EasyEyes requires cursor tracking of the crosshair to initiate the trial, but the participant can't keep up, possibly because the hot spot is too small, or the motion is too fast or curvy. Instead of remaining stuck there, we want the participant to proceed to the rest of the trials and finish the test. You might also consider using responseSkipTrialButtonBool.",
  },
  responseTypedBool: {
    name: "responseTypedBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      'responseTypedBool allows the participant to respond at every occasion by pressing a key in the keyboard/keypad. The various response modes are not exclusive. Enable as many as you like. Note that, just for initiating the trial, responseMustTrackContinuouslyBool overrides other responseXXX settings so that the only way to initiate the trial is by tracking with the cursor. \nOVERRRIDE: Setting simulateParticipantBool to TRUE or showGrid to other than "disabled" enables type as a response method, regardless of the setting of responseTypedBool. \n',
  },
  responseTypedKeypadWidthOverHeight: {
    name: "responseTypedKeypadWidthOverHeight",
    availability: "now",
    type: "numerical",
    default: "1",
    explanation:
      "responseTypedKeypadWidthOverHeight (default 1) is the aspect ratio of each key in the keypad, except the Space and Return keys, which together occupy the bottom row, each occupying half the row.",
  },
  rsvpReadingFlankerCharacterSet: {
    name: "rsvpReadingFlankerCharacterSet",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "rsvpReadingFlankerCharacterSet is a possibly empty (the default) string of characters. If empty then there are no flankers. If nonempty then the target is surrounded with independent random samples from this string. Thus, if the string is only one character then the flankers are all the same character.",
  },
  rsvpReadingFlankTargetWithLettersBool: {
    name: "rsvpReadingFlankTargetWithLettersBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "❌ OBSOLETE. RETAINED SOLELY FOR REPLICATION OF BUG REPORTED IN TRELLO CARD. https://trello.com/c/xKZaBnEV",
  },
  rsvpReadingNumberOfIdentifications: {
    name: "rsvpReadingNumberOfIdentifications",
    availability: "now",
    type: "numerical",
    default: "3",
    explanation:
      "NOT RECOMMENDED. rsvpReadingNumberOfIdentifications\nAdded December 18, 2023. Still awaiting documentation here. I think this was used when RSVP presented part of a story. I don't think it's used now that RSVP simply presents 3 random words. After the words are presented serially, with a word duration controlled by Quest, the observer is presented a menu to identify each target word among foils.",
  },
  rsvpReadingNumberOfResponseOptions: {
    name: "rsvpReadingNumberOfResponseOptions",
    availability: "now",
    type: "numerical",
    default: "5",
    explanation:
      "rsvpReadingNumberOfResponseOptions is the number of different words (only one of which is correct) provided as possible responses (in alphabetical order) when targetKind is rsvpReading. The foils have approximately the same frequency in the corpus as the target. This parameter is used only when responseSpokenToExperimenterBool is FALSE.\nWhen rsvpReadingNumberOfResponseOptions==0 don't ask any questions.",
  },
  rsvpReadingNumberOfWords: {
    name: "rsvpReadingNumberOfWords",
    availability: "now",
    type: "numerical",
    default: "3",
    explanation:
      "⭑ rsvpReadingNumberOfWords specifies how many words are shown during each rsvpReading trial. Each word counts as a Quest trial. Currently must be consistent across rsvpReading conditions within a block due to implementation restrictions. Let us know if that's a problem.",
  },
  rsvpReadingRequireUniqueWordsBool: {
    name: "rsvpReadingRequireUniqueWordsBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "If rsvpReadingRequireUniqueWordsBool is TRUE, only select words for the target sequence and foil words which have not yet been used as a target or foil. If FALSE, draw words directly from the corpus, even if those words have already been used in this condition.",
  },
  saveCursorTrackingBool: {
    name: "saveCursorTrackingBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 saveCursorTrackingBool (default FALSE), during each trial of this condition, records the time and x,y pixel position of the crosshair and cursor plus boolean presence/absence of the target (6 numbers per sample) at a frequency set by saveCursorTrackingHz. The time stamp is floating point absolute time in sec. The record should begin when EasyEyes starts moving the crosshair and tracking the cursor, and should end at target offset.",
  },
  saveCursorTrackingHz: {
    name: "saveCursorTrackingHz",
    availability: "now",
    type: "numerical",
    default: "60",
    explanation:
      "🕑 saveCursorTrackingHz (default 60) specifies the rate at which the cursor and crosshair position are sampled. Has no effect when saveCursorTrackingBool==FALSE.",
  },
  screenColorRGBA: {
    name: "screenColorRGBA",
    availability: "now",
    type: "text",
    default: "0.92, 0.92, 0.92, 1",
    explanation:
      '⭑ screenColorRGBA (default 0.94, 0.94, 0.94, 1, i.e. 94% white) is a comma-separated list of four numbers (each ranging from 0 to 1) that specify the color of the screen background for each condition. "RGB" are the red, green, and blue channels; "A" controls opacity (0 to 1). 0,0,0,1 is black and 1,1,1,1 is white. This is used to set the background of the rest of the screen, e.g. to match the background of a movie. The ColorRGBA controls include fontColorRGBA, instructionFontColorRGBA, markingColorRGBA, screenColorRGBA, and targetColorRGBA. WHEN ENTERING SEVERAL NUMBERS IN ONE CELL, WE STRONGLY SUGGEST BEGINNING WITH A SPACE, AND PUTTING A SPACE AFTER EVERY COMMA. THIS PREVENTS EXCEL FROM MISINTERPRETING THE STRING AS A SINGLE NUMBER. ',
  },
  screenshotBool: {
    name: "screenshotBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      '🕑 screenshotBool requests saving a full-screen screenshot of each stimulus and response display of this condition, plus each instruction display of the block. (Currently all instruction displays belong to the block, not to any condition.) Each filename should be E.B.C.TA.png, where E stands for the experiment name, B stands for the block number, C stands for the condition number, T stands for the trial number of the condition in the block, and A is "s" for stimulus or "r" for response. If the display is instructional then A is "i", C is 0, and T is a counter that starts at 1 at the beginning of the block. screenshotBool is condition-specific, but if several conditions enable it, EasyEyes still saves only one copy of each instructional screen. Screenshots are useful for debugging and to show the stimuli in talks and papers. It is expected that taking screenshots will severely degrade timing, so it should not be requested while a participant is being tested in earnest. Instead the scientist will test herself (or use simulateParticipantBool) to collect the images she needs.\n     Can we save these files to a "Screenshots" folder in the participant computer\'s Downloads folder or in the experiment repository on Pavlovia? ',
  },
  setResolution: {
    name: "setResolution",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "setResolution (default 0) sets display resolution to allow us to study perception and readability of text rendered with low pixel density. The setResolution value (e.g. 98) is used with the setResolutionUnit unit (e.g. pxPerCm). We just render on a smaller canvas and expand that for display on the participant's (high resolution) screen. In use, it will be a lot like using System Preferences: Display to set resolution, but will allow much lower resolutions. For reference, the 2022 MacBook Pro screens have 98 px/cm. If setResolution is zero then we use the screen in whatever resolution it's in.\n🕑 setResolution (default 0), with setResolutionUnit, sets display pixel density to study perception and readability of text rendered with low pixel density. In effect, we render on a smaller canvas (fewer pixels) and expand that for display on the participant's (higher resolution) screen. In use, it will be a lot like using System Preferences: Display to set resolution, but will allow much lower resolutions. For reference, the 2022 MacBook Pro screens have 98 px/cm. If setResolution is zero then we use the screen in whatever resolution it's in.\n\nIf setResolutionUnit === \"pxPerCm\" then \n{desiredPxPerCm = setResolution;}\nif setResolutionUnit === \"pxPerDeg\" then\n{\n  // Compute desiredPxPerCm at the near point, \n  // the point on screen that is closest to the nearer eye.\n  degPerCm = 10 * atand(0.1/viewingDistanceCm)\n  desiredPxPerCm = setResolution * degPerCm;\n}",
  },
  setResolutionSmoothBool: {
    name: "setResolutionSmoothBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "setResolutionSmoothBool (default FALSE) determines whether the display is smoothed, or left blocky as results from pixel replication.\nIgnored unless setResolution is nonzero.",
  },
  setResolutionSmoothingBool: {
    name: "setResolutionSmoothingBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "setResolutionSmoothingBool (default FALSE) determines whether the display is smoothed, or left blocky as results from pixel replication.\nIgnored unless setResolution is nonzero.",
  },
  setResolutionUnit: {
    name: "setResolutionUnit",
    availability: "now",
    type: "categorical",
    default: "pxPerDeg",
    explanation:
      "setResolutionUnit (default pxPerDeg) sets unit of display resolution to either pxPerDeg or pxPerCm. If setResolution is zero/empty then we use the screen in whatever resolution it's in.",
    categories: ["pxPerCm", "pxPerDeg"],
  },
  showBackGrid: {
    name: "showBackGrid",
    availability: "now",
    type: "text",
    default: "0.5, 0.03, 1000",
    explanation:
      "❌ showBackGrid, only until we display the target, displays a square grid as a static background. Grid center is midway between two gridlines.  It accepts five arguments as comma separated values:\nspacingDeg, thicknessDeg, lengthDeg, xCenterPx, yCenterPx, \nspacingDeg (default 0.5) is the center-to-center line spacing in both x and y.\nthicknessDeg (default 0.03) is the line thickness.\nlengthDeg (default 1000, i.e. whole screen) is the length of each grid line.\nxCenterPx and yCenterPx (default middle of screen) are the pixel coordinates of the grid center. ",
  },
  showBeepButtonOnBlockInstructionBool: {
    name: "showBeepButtonOnBlockInstructionBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "🕑 showBeepButtonOnBlockInstructionBool (default TRUE) shows a Beep button in the upper right corner of the block-instruction page. Typically every trial beeps when the response was correct, so it's good to give the participant a chance to get the sound working before beginning the block. However, some tasks, e.g. rating, do not use sound at all, and then the Beep button is superfluous.",
  },
  showBoundingBoxBool: {
    name: "showBoundingBoxBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      'showBoundingBoxBool (default:FALSE). For debugging purposes, setting showBoundingBoxBool=TRUE displays one or two bounding boxes around the stimulus. What\'s included depends on whether spacingRelationToSize is "ratio" or "typographic".\n\nBLUE. EasyEyes uses the PsychoJS getBoundingBox method, using tight=true, to draw a blue outline around either the target character (if spacing is set to "ratio") or the flanker-target-flanker triplet (if spacing is "typographic"). \n\nBLACK. Additionally, when  spacing is "typographic", a further black bounding box displays the scaled bounding box computed internally. Internally, EasyEyes first measures the triplet bounding box at size fontSizeReferencePx, and then scales it up to the target font size, and shifts it to the target location. ',
  },
  showCharacterSetBoundingBoxBool: {
    name: "showCharacterSetBoundingBoxBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "showCharacterSetBoundingBoxBool displays the bounding box of the whole fontCharacterSet.",
  },
  showCharacterSetForAllResponsesBool: {
    name: "showCharacterSetForAllResponsesBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "showCharacterSetForAllResponsesBool (default FALSE). It's obvious that identifying a letter by clicking requires display of a character set to click on. However, sometimes we show a foreign characterSet with Roman labels, to enable use of a Roman keyboard, or the scientist may just want the actual letter shapes to be visible while the participant types. This flag tells EasyEyes to display the fontCharacterSet whenever the participant is responding.",
  },
  showCharacterSetLocation: {
    name: "showCharacterSetLocation",
    availability: "now",
    type: "categorical",
    default: "bottom",
    explanation:
      '🕑 showCharacterSetLocation (default bottom) can be bottom, top, left, or right. After a trial, this shows the observer the allowed responses. If the target was a letter then the possible letters are called the "characterSet". If the target is a gabor, the characterSet might display all the possible orientations, each labeled by a letter to be pressed.',
    categories: ["none", "bottom", "top", "left", "right"],
  },
  showCharacterSetWhere: {
    name: "showCharacterSetWhere",
    availability: "now",
    type: "categorical",
    default: "bottom",
    explanation:
      'showCharacterSetWhere (default bottom) can be bottom, top, left, or right. After a trial, this shows the observer the allowed responses. If the target was a letter then the possible letters are called the "characterSet". If the target is a gabor, the characterSet might display all the possible orientations, each labeled by a letter to be pressed.',
    categories: ["none", "bottom", "top", "left", "right"],
  },
  showCharacterSetWithLabelsBool: {
    name: "showCharacterSetWithLabelsBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 showCharacterSetWithLabelsBool (default FALSE). For foreign or symbol characterSets, we add Roman labels that the observer can type on an ordinary (Roman) keyboard.",
  },
  showConditionNameBool: {
    name: "showConditionNameBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "⭑ showConditionNameBool (default FALSE). If TRUE, then display condition name as text at lower-left corner, or, if showTargetSpecsBool is TRUE, above target specs. See showTargetSpecsBool. The point size of condition-name text should be 1.4x bigger than we use for target specs. We have several text messages that stack up in the lower left corner. If all four are present, then showText on top, above showConditionNameBool, above showExperimentNameBool, above showTargetSpecsBool.",
  },
  showCounterBool: {
    name: "showCounterBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      '⭑ showCounterBool. If TRUE display something like,"Trial 31 of 120. Block 2 of 3. At 32 cm." (The trailing part about distance is included only if showViewingDistanceBool is TRUE.) The trial counter counts all trials in the block, which may have several conditions. If the block has three conditions with 40 blocks each, then there are 120 trials in the block. ',
  },
  showCounterLocation: {
    name: "showCounterLocation",
    availability: "now",
    type: "categorical",
    default: "bottomRight",
    explanation:
      "🕑 showCounterLocation (default bottomRight). Can be bottomLeft, bottomCenter, or bottomRight. This location is used for both the trial count AND the viewing distance. ",
    categories: ["bottomLeft", "bottomRight", "bottomCenter"],
  },
  showCounterWhere: {
    name: "showCounterWhere",
    availability: "now",
    type: "categorical",
    default: "bottomRight",
    explanation:
      "showCounterWhere (default bottomRight). Can be bottomLeft, bottomCenter, or bottomRight. This location is used for both the trial count AND the viewing distance. ",
    categories: ["bottomLeft", "bottomRight", "bottomCenter"],
  },
  showDistanceCalibrationBool: {
    name: "showDistanceCalibrationBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "showDistanceCalibrationBool (default FALSE). When TRUE it shows a white pop-over with results of the the distance calibration. It remains until dismissed by clicking its close icon ☒.",
  },
  showExperimentNameBool: {
    name: "showExperimentNameBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "🕑 showExperimentNameBool (default FALSE) is useful when making screenshots to show the experimentName (i.e. the name of the Pavlovia repository, e.g. crowding3). It should go in the lower left corner. We have several text messages that stack up there. If all four are present, then showText on top, above showConditionNameBool, above showExperimentNameBool, above showTargetSpecsBool.",
  },
  showFPSBool: {
    name: "showFPSBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation: "❌ Obsolete, but EasyEyes crashes if we remove it.",
  },
  showGazeBool: {
    name: "showGazeBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "showGazeBool shows a red dot indicating latest estimated gaze position. (It is delayed by processing time.)",
  },
  showGazeNudgerBool: {
    name: "showGazeNudgerBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "After recording the participant's trial response, if showGazeNudgerBool is TRUE and abs(gazeMeasuredXDeg) > thresholdAllowedGazeXErrorDeg then EasyEyes displays a red arrow going from the recorded gaze position (gazeMeasuredXDeg, gazeMeasuredYDeg) to the crosshair and a popup window mentioning that the estimated gaze position was too far from the crosshair.",
  },
  showGrid: {
    name: "showGrid",
    availability: "now",
    type: "categorical",
    default: "disabled",
    explanation:
      "⭑ showGrid (default is disabled) displays a full-screen grid that aids visual checking of location and size (both live and in screen shots). [pt & inch NOT YET IMPLEMENTED.] Set showGrid to:\n• 'none' for no grid\n• 'disabled' to prevent any grid\n• 'px' for a pixel grid\n• 'pt' for a typographic \"points\" grid (72 pt per inch)\n• 'cm' for a centimeter grid\n• 'inch' for an inch grid\n• 'mmV4' for a cortical grid, \n• 'deg' or 'degDynamic' for a degrees grid. When the crosshair moves, the 'degDynamic' grid moves with it, and the 'deg' grid does not. 'degDynamic' specifies degrees relative to the (possibly) moving crosshair. 'deg' specifies degrees relative to the nominal fixation, which is the fixed point that the moving crosshair circles around.\n\nUnless 'disabled', repeatedly pressing the backquote key (below ESCAPE on a macOS keyboard) cycles through all states except disabled: none, px, cm, pt, inch, deg, degDynamic, mmV4. The 'px', 'cm', 'pt', and 'inch' grids have their origin at lower left. The 'deg', 'degDynamic', and 'mmV4' grids have their origin at fixation. \n\nCAUTION: The grids are for stimulus checking, not human testing. The visual grid is likely to mask your stimulus, and drawing the grid can take time, especially when the crosshair moves, which might compromise stimulus timing (lateness and wrong duration). So turn off grids when you check timing or collect human data.",
    categories: [
      "px",
      "pt",
      "cm",
      "in",
      "deg",
      "degDynamic",
      "mmV4",
      "none",
      "disabled",
    ],
  },
  showImage: {
    name: "showImage",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      'showImage (no default) accepts the filename of an image, including the extension, which is shown centered as large as possible with all image pixels visible, against a screenColorRGBA background. The image remains until dismissed. Accept the RETURN key if typing is enabled (responseTypedBool==TRUE). If clicking is enabled (responseClickedBool==TRUE), superimpose a "Proceed" button near bottom middle, and accept a click of the Proceed button. In either case, proceed to next block. Often both will be enabled. Typing on the keypad is equivalent to typing on the keyboard. The compiler requires that the image has previously been uploaded to the Pavlovia EasyEyesResources repo by submission through the "Select file" button. NOTE: the text for the "Proceed" button name is the international phrase T_proceed.  The commands showConditionNameBool, showCounterBool, showViewingDistanceBool, and showTargetSpecsBool are supported as usual.\nAccepts image file extentions: PNG, JPG, JPEG, and SVG.\n\nWe use it to present a storybook narrative when testing children. \n\nUse screenColorRGBA to specify the color of any visible background (when image doesn\'t fill screen). Use instructionFontColorRGBA to set the color of any text produced by showConditionNameBool, showCounterBool and showViewingDistanceBool, and showTargetSpecsBool.\n\nWhen both responseClickedBool=responseTypedBool=FALSE the compiler should report that as an error.\n\nYou can combine showImage with questionAnswer. Use showImageSpareFraction to determine what fraction of the screen to reserve for the text. Use showImageWhere to determine how to divide up the screen into image and text.',
  },
  showImageSpareFraction: {
    name: "showImageSpareFraction",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "showImageSpareFraction (default 0) what fraction of the screen area is spared for another use (eg questionAnswer). I'm guessing that with questionAnswer we'll typically devote 0.3 to the text.",
  },
  showImageWhere: {
    name: "showImageWhere",
    availability: "now",
    type: "categorical",
    default: "top",
    explanation:
      "showImageWhere (default top) determines which part of the screen gets the image. It can be left, right, top, or bottom. If it’s left or right then the screen will have left and right parts. If it’s top or bottom then the screen will have top and bottom parts. This makes no difference when showImageSpareFraction=0.",
    categories: ["top", "right", "bottom", "left"],
  },
  showMeasuredSoundLevelBool: {
    name: "showMeasuredSoundLevelBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "showMeasuredSoundLevelBool (default FALSE) if TRUE then gets ready before first block, by asking for connection of a miniDSP UMIK-1 or 2 microphone, and getting its profile. Later, in every condition that set showMeasuredSoundLevelBool=TRUE, record the sound during stimulus presentation and report the sound level in dB SPL on-screen (on the Response page, NOT the pre-stimulus or stimulus page) and in the results CSV file. Onscreen display shows requested sound levels of target, masker, and noise @ear, and measured sound level @mic and (estimated) @ear. The sound level @ear is the level @mic plus soundDistanceDecayDb. \nIMPORTANT: soundDistanceDecayDb is dynamic because it depends on distance, which is estimated 60 times per second. It's crucial that showMeasuredSoundLevelBool use the same value as was used in presenting the sound.\n\nTo allow for alignment and startup issues, showMeasuredSoundLevelBool records for targetDurationSec, and discards calibrateSound1000HzPreSec from the beginning and calibrateSound1000HzPostSec from the end of the recording. If nothing is left, the user is alerted that the duration was too brief. showMeasuredSoundLevelBool computes digital power, in dB, of the recording. It then uses the microphone's profile to convert dB to dB SPL at the microphone, and adds soundDistanceDecayDb to convert that to dB SPL at the ear.\n\nconst soundDistanceDecayDb = -20*log10(soundEarCm/soundMicCm);\nsoundMicCm, provided by the scientist, is the distance from loudspeaker to microphone.\nsoundEarCm, an internal parameter, is the estimated distance from loudspeaker to participant’s ear.\nsoundEarCm = viewingDistanceCm;\nIMPORTANT: viewingDistanceCm is dynamic, measured 60 times a second, so soundEarCm is also dynamic.",
  },
  showNearestPointsBool: {
    name: "showNearestPointsBool",
    availability: "now",
    type: "obsolete",
    default: "",
    explanation: "Use _showPerpendicularFeetBool instead.",
  },
  showPageTurnInstructionBool: {
    name: "showPageTurnInstructionBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      'showPageTurnInstructionBool (default TRUE), during ordinary reading displays "Press SPACE for next page.", appropriately translated, at bottom center of page.\nINTERNATIONAL PHRASE:\nT_readingNextPage\n”Press SPACE for next page.”',
  },
  showParameters: {
    name: "showParameters",
    availability: "now",
    type: "categorical",
    default: "",
    explanation:
      "🕑 showParameters (no default) accepts a comma-separated list of parameter names. Its display is in the style of showTargetSpecsBool, but it allows the scientist to specify which parameters to display. All the parameters are displayed at the left edge of the screen, bottom-aligned, one per row, each with its value. At the moment, we only allow input parameters, but we will extend this list to include internal parameters.",
    categories: [],
  },
  showPercentCorrectBool: {
    name: "showPercentCorrectBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "⭑ If showPercentCorrectBool (default TRUE) is TRUE for any condition in this block, then, at the end of the block, EasyEyes presents a pop-up window reporting the overall percent correct (across all conditions for which showPercentCorrectBool is TRUE) in that block. The participant dismisses the window by hitting RETURN or clicking its Proceed button. This feature was requested by maybe a third of the participants who sent comments. Adults like this, and we routinely include it. Experts say this should not be used with children as they might be discouraged by getting a low percent. For children the messages should be reliably encouraging, regardless of actual performance level.\n\nHmm. Maybe, for children, we should say \n“Congratulations you just finished 333 difficult trials!” \nand, for adults, expand that to: \n“Congratulations you just finished 333 difficult trials, getting 444 right.”",
  },
  showProgressBarBool: {
    name: "showProgressBarBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      '⭑ showProgressBarBool (default FALSE) was originally meant for children, but everyone likes it. When TRUE, EasyEyes displays a vertical green bar that tracks the trial count for the experiment. The outline goes from bottom to top of the screen and it gradually fills up with green liquid, empty at zero trials, and filled to the top after the last trial of the experiment. Sometimes we tell the child that the green liquid is "spaceship fuel for Jamie the astronaut".',
  },
  showTakeABreakCreditBool: {
    name: "showTakeABreakCreditBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "showTakeABreakCreditBool (default FALSE). MANY PARTICIPANTS REPORT LIKING THIS. Intended for long blocks, over 50 trials. Participants seem to spontaneously pause betwen blocks to catch their breath and blink their eyes, but they don't do it within a long block, and they may complain that they feel stressed and that their eyes hurt (they sting because they didn't blink during the block, which dries out the cornea), so we added this feature to force a break every so often. If showTakeABreakCreditBool (default FALSE) then display the value of takeABreakCredit as a graphical icon next to the trial counter. A black box that gradually fills, from the bottom up, with glowing green. Empty for zero and full for 1. The box is currently centered at bottom of screen, but we plan to make it contiguous to the trial counter display.",
  },
  showTargetSpecsBool: {
    name: "showTargetSpecsBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "showTargetSpecsBool (default FALSE). For debugging. If TRUE, showTargetSpecsBool (default FALSE) displays various target parameters, including size, spacing, and duration, in lower left corner, similar to the trial/block counter. We have several text messages that stack up in the lower left corner. If all four are present, then showText is on top, above showConditionNameBool, above showExperimentNameBool, above showTargetSpecsBool.",
  },
  showText: {
    name: "showText",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "🕑 showText (no default). Display the provided text (no default) as a left-aligned string. It'd be great to allow basic MD formatting.",
  },
  showTimingBarsBool: {
    name: "showTimingBarsBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      'showTimingBarsBool (default FALSE): When TRUE, displays four solid rectangles (bars) along the left edge of the screen. This parameter affects only the condition that includes it. Each bar is black or white, indicating the presence or absence of a specified element: Gap, Fixation, Target request, or Target. Each bar is 2 inches wide and 1.25 inches high, with static text labels ("Gap", "Fixation", "Target request", "Target") to the right of each box, describing its purpose. The bars and labels overwrite whatever was there before. The bars update dynamically based on the following conditions:\n(Gap): Turns white at end of the fixation task (before markingOffsetToTargetOnsetSec) and black when the target appears.\n(Fixation): Turns white when the crosshair is present, regardless of its motion, and black when the crosshair is absent.\n(Target request): Turns white when the target is requested (after markingOffsetToTargetOnsetSec) and stays on until target offset. Lateness can be measured by the onset asynchrony between this request bar and the target bar.\n(Target): Turns white when the target is present and black when the target is absent.\n\nThese bars are designed be detected by the photocells of the BBTK to measure stimulus timing. \n\nTo check display timing, the gold standard is the Black Box Toolkit (BBTK). \nhttps://www.blackboxtoolkit.com/  \nMaria has one, and has figured out how to use it. It includes two (fast) photosensors that can be placed on the display, held in place by elastic cords. The Black Box Toolkit has its own clock and accepts many kinds of input, including sound and the two photocells. The bars displayed by showTimingBarsBool match the size of the photosensors. \n\nWith the Black Box Toolkit we can measure latency and duration with 1 ms accuracy. It\'s hard for the computer generating the display to know exactly when each frame is displayed, so the computer can only estimate the actual timing of the displayed stimulus. The Black Box Toolkit measurements of the displayed image allow us to discover any errors in the current EasyEyes computer-based measurements of lateness and duration.',
  },
  showViewingDistanceBool: {
    name: "showViewingDistanceBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      '⭑ showViewingDistanceBool (default FALSE). If TRUE display something like "Trial 31 of 120. Block 2 of 3. At 32 cm." (The trial and block counters appear only if showCounterBool is TRUE.) Without distance tracking, this is a subtle reminder to the participant of the distance they are supposed to be at. With distance tracking, it allows both the participant and the experimenter to monitor the dynamic viewing distance. It\'s updated only once or twice per trial, to avoid drawing attention away from the stimulus.',
  },
  simulateParticipantBool: {
    name: "simulateParticipantBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "⭑ simulateParticipantBool (default FALSE). Use the software model specifed by simulationModel to generate observer responses. The test runs without human intervention. SIDE EFFECT: Setting simulateParticipantBool to TRUE enables typed responses, regardless of the setting of responseTypedBool. Implemented for targetKind: letter, repeatedLetter, and rsvp targetKind. ",
  },
  simulateWithDisplayBool: {
    name: "simulateWithDisplayBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "simulateWithDisplayBool (default TRUE). If TRUE, then display the stimuli as though a participant were present. If FALSE, then skip display to run as fast as possible. ",
  },
  simulationBeta: {
    name: "simulationBeta",
    availability: "now",
    type: "numerical",
    default: "2.3",
    explanation:
      "simulationBeta (default 2.3). Used by the Weibull observer model. Usually, you'll want this to match thresholdBeta.",
  },
  simulationDelta: {
    name: "simulationDelta",
    availability: "now",
    type: "numerical",
    default: "0.01",
    explanation:
      "simulationDelta (default 0.01). Used by the Weibull observer model. Usually, you'll want this to match thresholdDelta.",
  },
  simulationModel: {
    name: "simulationModel",
    availability: "now",
    type: "categorical",
    default: "ideal",
    explanation:
      "⭑ simulationModel (default ideal). For debugging and checking, it is often helpful to simulate the observer. simulationModel can be: \n• right: Always right.\n• wrong: Always wrong.\n• blind: This model presses a random response key. \n• ideal: This model does the same task as the human, picking the best response (i.e. maximizing expected proportion correct) given the stimulus. The ideal knows the target probabilities and the noise statistics. Its threshold is a useful point of reference in analyzing human data. Without noise, the ideal will always be right. Since noise hasn't yet been implemented in EasyEyes, for now, this model just gives the right answer.\n• weibull: This model gets the trial right with a probability given by the Weibull function, which is frequently fit to human data. The QUEST staircase asssumes the Weibull model, so QUEST should accurately estimate its (unknown to Quest) threshold, when the rest of the QUEST parameters match: simulationBeta, simulationDelta. Both use the same gamma=1/fontCharacterSet.len. https://psychopy.org/api/data.html#psychopy.data.QuestHandler\nIn MATLAB, the Weibull model observer is: \nfunction response=SimulateWeibull(q,tTest,tActual)\n   t=tTest-tActual+q.epsilon;\n   P=q.delta*q.gamma+(1-q.delta)*(1-(1-q.gamma)*exp(-10.^(q.beta*t)));\n   response= P > rand(1);\nend\nresponse=1 means right, and response=0 means wrong. \nP=probability of a correct response\nq is a struct holding all the Weibull parameters. \nq.beta=simulationBeta\nq.delta=simulationDelta\nq.epsilon is set (once) so that P=thresholdProportionCorrect when tTest-tActual=0. \nq.gamma=probability of blindly guessing the correct answer, =1/fontCharacterSet.len.\ntTest is the stimulus intensity level (usually log10 of physical parameter).\ntActual=log10(simulationThreshold) is the true threshold of the simulation.\nrand(1) returns a random sample from the uniform distribution from 0 to 1.\nThe source code for our simulation model is here:\nhttps://github.com/EasyEyes/threshold/blob/a9ea5a6c64d3c5ff0aacfc01c86b6a5aecf64369/components/simulatedObserver.js",
    categories: ["right", "wrong", "blind", "weibull", "ideal"],
  },
  simulationThreshold: {
    name: "simulationThreshold",
    availability: "now",
    type: "numerical",
    default: "2",
    explanation:
      "simulationThreshold (default 2). The actual threshold of the simulated observer in linear units (not log). We test the implementation of Quest by testing how well it estimates simulationThreshold.",
  },
  soundGainDBSPL: {
    name: "soundGainDBSPL",
    availability: "now",
    type: "numerical",
    default: "125",
    explanation:
      'soundGainDBSPL (default 125) is the assumed loudspeaker gain (dB SPL) at 1000 Hz from digital sound (inDb) to physical sound (outDbSpl),\noutDbSpl=inDb+soundGainDbSpl.\nThe "level" of a sound vector is 10*log10(P) dB, where the power is P=mean(S^2), and S is the sound vector. The scientist will normally set calibrate1000HzDBSPLBool=TRUE to measure soundGainDBSPL on the participant\'s computer at several sound levels at 1000 Hz, and calibrateAllHzDBSPLBool=TRUE for the other frequencies. If calibrate1000HzDBSPLBool=FALSE then EasyEyes uses soundGainDBSPL as the default. Running with calibrate1000HzDBSPLBool=TRUE calibrates at 1000 Hz and sets soundGainDBSPL to fit what was measured at 1000 Hz. Running calibrateAllHzDBSPLBool measures the impulse response, computes the inverse impulse response (over some range, perhaps 250 to 8000 Hz), normalizes filter amplitude to have unit gain at 1000 Hz, and installs that filter. Thus, in that case, soundGainDBSPL will be correct for all frequencies (over some range like 250 to 8000 Hz).',
  },
  soundMicCm: {
    name: "soundMicCm",
    availability: "now",
    type: "numerical",
    default: "38.5",
    explanation:
      "soundMicCm (default 38.5) is the assumed distance from the loudspeaker to the calibration microphone. This is used to compute the lower sound level at the participants' ears, which are farther than the mic.\nconst soundEarCm= viewingDistanceCm;\nconst farDecayDb = -20*log10(soundEarCm/soundMicCm);\nThe value 38.5 cm is for a miniDSP UMIK-1 or 2 microphone. POINT MICROPHONE UP. Attach the microphone to its tripod. The microphone should be vertical, pointing up to the ceiling. Push the microphone upward into the holder until its bottom end is flush with the holder. Place it on the table between you and your computer. Position it so two of the tripod legs are near the edge of your computer's keyboard. Ensure that the microphone itself is on the side of the tripod that is farthest from the keyboard.",
  },
  spacingDeg: {
    name: "spacingDeg",
    availability: "now",
    type: "numerical",
    default: "2",
    explanation:
      "spacingDeg (default 2) specifies the spacing, in degrees, center-to-center from target to a flanker. This input value is ignored when you use Quest to measure the spacing threshold. If spacingDirection is tangential then spacingDeg is spacing to either flanker, as the spacings are equal. If spacingDirection is radial then then spacingIsOuterBool (default FALSE) determines whether spacingDeg is the spacing from target to outer (or inner) flanker.",
  },
  spacingDirection: {
    name: "spacingDirection",
    availability: "now",
    type: "categorical",
    default: "radial",
    explanation:
      'spacingDirection (default radial). When eccentricity is nonzero then spacingDirection can be horizontal, vertical, horizontalAndVertical, radial, tangential, or radialAndTangential. When eccentricity is zero then spacingDirection can be horizontal, vertical, or horizontalAndVertical. The "...And..." options display four flankers, distributed around the target. It is an error to request radial or tangential or radialAndTangential spacingDirection at eccentricity zero, because they are undefined there.',
    categories: [
      "horizontal",
      "vertical",
      "horizontalAndVertical",
      "radial",
      "tangential",
      "radialAndTangential",
    ],
  },
  spacingIsOuterBool: {
    name: "spacingIsOuterBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "spacingIsOuterBool (default FALSE). When spacingDirection is radial, there are two flankers, inner and outer. In general each has a different (center to center) spacing to the target. To replicate CriticalSpacing data, set thresholdPameter=spacingDeg, spacingSymmetry=cortex, and spacingRelationToSize=ratio or typographic, and set spacingIsOuterBool (default FALSE) to determine whether the reported spacingDeg reflects the inner (FALSE) or outer (TRUE) spacing. ",
  },
  spacingOverSizeRatio: {
    name: "spacingOverSizeRatio",
    availability: "now",
    type: "numerical",
    default: "1.4",
    explanation:
      "⭑ spacingOverSizeRatio (default 1.4) specifies the ratio of spacing (in deg, center of target to center of inner flanker) to size (in deg, can be width or height as specified by targetSizeIsHeightBool). Ignored unless spacingRelationToSize is ratio. In that case, target size is spacing/spacingOverSizeRatio.",
  },
  spacingRelationToSize: {
    name: "spacingRelationToSize",
    availability: "now",
    type: "categorical",
    default: "ratio",
    explanation:
      '⭑ spacingRelationToSize (default ratio) can be none, ratio, or typographic. When thresholdParameter is "spacingDeg", spacingRelationToSize specifies how target size depend on center-to-center target-flanker spacing. And when thresholdParameter is "targetSizeDeg", spacingRelationToSize specifies how spacing depend on size.\n• none means no dependence. Size and spacing are set independently. \n• ratio means accept the thresholdParameter (which is either spacingDeg or targetSizeDeg) and adjust the other one to satisfy the specified spacingOverSizeRatio. There are two flankers, inner and outer. In general each has a different (center to center) spacing to the target. "ratio" refers to the ratio of spacing to target size. Set spacingIsOuterBool to choose whether size scales with inner (FALSE) or outer (TRUE) spacing.\n• typographic prints the triplet (flanker, target, flanker) as a (horizontal) string (horizontally) centered on the specified target eccentricity. By "horizontal" and "vertical", we just mean the orientation of the baseline, and orthogonal to it. ("Vertically," the fontCharacterSet bounding box is centered on the eccentric location, and all letters in the string are on same baseline.) If thresholdParameter is "spacingDeg" then the font size of string is adjusted so that the width of the string is 3× the specified spacing. Works with both left-to-right and right-to-left fonts. [If thresholdParameter is "targetSizeDeg" then EasyEyes adjusts the font size of the string to achieve the specified target size.] \n\nTYPOGRAPHIC. Rule for positioning the stimulus string (one acuity letter or three crowding letters) in typographic mode.\nHORIZONTALLY. It’s a string and EasyEyes doesn’t know where one letter ends and the next begins. At the beginning of the trial, before the fixation task, set font size to fontReferenceSizePx (i.e. convert px to pt, and use that to set font size), and ask PIXI for our string\'s "width" in px. Width is the (horizontal) displacement from initial to final pen position when the string is drawn. For generality, divide it by fontReferenceSizePx,  \nwidthPxReFontSize = width / fontReferenceSizePx\nLooking ahead, we will take the horizontal midpoint of the string to be halfway between the start and end pen positions. \nVERTICALLY. In the spirit of good typography, we believe that the vertical position of the text baseline should be independent of the particular letters being displayed. To achieve that, the vertical positioning of the target string is based on the whole alphabet in use, which is conserved from trial to trial. At the beginning of the block, EasyEyes sets the font size to fontReferenceSizePx and measures a true bounding box for the fontCharacterSet string. Retain only topPx and bottomPx. For generality, subtract initial pen y position and normalize by fontReferenceSizePx. This gives us \ntopPxReFontSize = (topPx-penY)/fontReferenceSizePx\nand\nbottomPxReFontSize = (bottomPx-penY)/fontReferenceSizePx\nWe will need it later, so also use the code below to get "ascent" from PIXI, and compute\nascentPxReFontSize = ascent / fontReferenceSizePx.\n\nNow create\nboundsRectReFontSize=\n  [[0,bottomPxReFontSize], [widthPxReFontSize,topPxReFontSize]]\nBefore drawing the target, EasyEyes scales the rect up to the actual font size, \nboundsRect=fontSIzePx*boundsRectReFontSize\nand computes a new rect like boundsRect, but centered on the target eccentricity.\ncenteredRect=boundsRect - CenterOfRect(boundsRect) + targetEccentricityXYPx\nIf showBoundingBoxBool==TRUE then draw centeredRect with a blue line. \nCompute the pen position, typically a bit above the upper left corner of our rect.\npenX = centeredRect[0,0] - boundsRect[0,0];\npenY = centeredRect[1,1] - boundsRect[1,1];\nand draw the text there. It should fit the bounding box quite well. [Vertically our bounds allow for any character in fontCharacterSet, and horizontally, our bounding box considers only the pen positions, ignoring any long horizontal flourishes.]\nIf showBoundingBoxBool==TRUE also draw a horizontal green line representing the baseline, from end of end of our bounding box, at height baselinePx\nbaselinePx = penY - fontSIzePx*ascentPxReFontSize\n\nEXPLAINING THE BASELINE \nIn digital typography, the "pen position" at start and end of drawing a string is traditionally on the baseline. This is true of HTML Canvas, but currently EasyEyes is built on PsychoJS which renders text using PIXI.js which considers the pen position to be the upper left corner of the "bounding box" around the string. (I think the vertical extent of their "bounding box" is sized to hold any characters, not the just the ones in your string.) In PIXI, the baseline is "ascender" px below the pen position. Here is javascript code from ChatGTP to get the value of ascender from PIXI.\n\n// 1. Create text style\nconst textStyle = new PIXI.TextStyle({\n  fontFamily: \'Arial\',\n  fontSize: 24,\n  fill: \'black\',\n});\n\n// 2. Create text object\nconst textObj = new PIXI.Text(\'Hello World\', textStyle);\ntextObj.x = 100; // Pen position x\ntextObj.y = 50;  // Pen position y (top-left corner)\n\n// 3. Measure text\nconst metrics = PIXI.TextMetrics.measureText(textObj.text, textObj.style);\n\n// 4. Get ascent (vertical offset to baseline)\nconst ascent = metrics.fontProperties.ascent;\n\n// 5. Calculate baseline position\nconst baselineY = textObj.y + ascent;\n\n// 6. Output the results\nconsole.log(\'Pen Position (Top-Left Corner):\', textObj.x, textObj.y);\nconsole.log(\'Vertical Offset to Baseline (Ascent):\', ascent);\nconsole.log(\'Baseline Position Y:\', baselineY);',
    categories: ["none", "ratio", "typographic"],
  },
  spacingSymmetry: {
    name: "spacingSymmetry",
    availability: "now",
    type: "categorical",
    default: "screen",
    explanation:
      '⭑ spacingSymmetry (default screen) can be screen, retina, or cortex. This is ignored unless radial eccentrity is nonzero and spacingDirection is radial, which means that the target lies between two flankers, all on a radial line. The "inner" flanker is closer to fixation than the target. The "outer" flanker is farther than the target. We refer to the center-to-center spacing from target to inner and outer flankers as the inner and outer spacings. Parameter spacingDeg specifies the outer spacing. spacingSymmetry affects only the inner spacing, which is calculated to make the two flanker spacings symmetric in one of three ways: at the screen (i.e. equal in pixels), at the retina (i.e. equal in deg), or at the cortex, i.e.  log(outer+eccDeg + 0.15)-log(eccDeg + 0.15)=log(eccDeg + 0.15)-log(eccDeg-inner + 0.15), where eccDeg is the target\'s radial eccentricity in deg. To check the spacing symmetry, you may want to show a corresponding grid by setting parameter showGrid to px or cm (for screen), deg (for retina), and mm (for cortex).',
    categories: ["screen", "retina", "cortex"],
  },
  takeABreakMinimumDurationSec: {
    name: "takeABreakMinimumDurationSec",
    availability: "now",
    type: "numerical",
    default: "2",
    explanation:
      "takeABreakMinimumDurationSec (default 2). The minimum duration when EasyEyes takes a break. The main purpose of the break is to blink, so 2 sec is enough. See takeABreakTrialCredit.",
  },
  takeABreakTrialCredit: {
    name: "takeABreakTrialCredit",
    availability: "now",
    type: "numerical",
    default: "0.05",
    explanation:
      'takeABreakTrialCredit (default 0.05) controls how many trials between breaks. takeABreakTrialCredit is the fraction of the credit needed for one break that the participant gets from performing each trial of this condition. The default credit of 0.05=1/20 gives a break every 20 trials. Set it to zero for no breaks. The block\'s running total, regardless of condition, is kept in the internal parameter takeABreakCredit, which is zero at the beginning of each block. When takeABreakCredit exceeds 1, EasyEyes immediately subtracts 1 and takes a break. \nTHE BREAK\nEasyEyes displays a pop-up window with a dark surround, "Good work! Please take a brief break to relax and blink." Responses and viewing-distance nudging are suspended for the time specified by takeABreakMinimumDurationSec. Then EasyEyes reenables responses, adds a Proceed button, and adds text, "To continue hit Proceed or RETURN." The participant can take as long as they need. When they hit Proceed (or RETURN), EasyEyes closes the pop up window, reenables the nudger (if it was formerly active), and resumes testing. \nAlso see showTakeABreakBool.',
  },
  targetBoundingBoxHorizontalAlignment: {
    name: "targetBoundingBoxHorizontalAlignment",
    availability: "now",
    type: "categorical",
    default: "center",
    explanation:
      'targetBoundingBoxHorizontalAlignment (default center). When computing the characterSet bounding box as the union of the bounding box of each letter, align the bounding boxes horizontally by "center" or "origin". The bounding boxes are always vertically aligned by baseline.',
    categories: ["center", "origin"],
  },
  targetColorRGBA: {
    name: "targetColorRGBA",
    availability: "now",
    type: "text",
    default: "0, 0, 0, 1",
    explanation:
      'targetColorRGBA (default 0, 0, 0, 1 i.e. black) is a comma-separated list of four numbers (each ranging from 0 to 1) that specify traget color for each condition. "RGB" are the red, green, and blue channels; "A" controls opacity (0 to 1). 0,0,0,1 is black and 1, 1, 1, 1 is white. For Venier, screenColorRGBA="0, 0, 0, 1" sets the background black, and targetColorRGBA="1, 1, 1, 1" sets the target white, markingColorRGBA=”1, 1, 1, 1” sets the fixation mark white, and instructionFontColorRGBA=”1, 1, 1, 1” set the instructions white. The ColorRGBA controls include fontColorRGBA, instructionFontColorRGBA, markingColorRGBA, screenColorRGBA, and targetColorRGBA. WHEN ENTERING SEVERAL NUMBERS IN ONE CELL, WE STRONGLY SUGGEST BEGINNING WITH A SPACE, AND PUTTING A SPACE AFTER EVERY COMMA. THIS PREVENTS EXCEL FROM MISINTERPRETING THE STRING AS A SINGLE NUMBER. ',
  },
  targetContrast: {
    name: "targetContrast",
    availability: "now",
    type: "numerical",
    default: "-1",
    explanation:
      "targetContrast (default 1) is the desired luminance contrast of the target. For letters we use Weber contrast, \nc=(LLetter-LBackground)/LBackground. \nA white letter has contrast +1; a black letter has contrast -1.\nFor gabors, we use Michelson contrast, \nc=(LMax-LMin)/(LMax+LMin).\nFor scientist-supplied images, the image is presented faithfully when targetContrast is 1, and scaled in contrast proportionally when targetContrast is not 1.\nNOTE: Until we shift to using HDR movies, contrast is only accurate for values of -1, 0, and 1.",
  },
  targetCyclePerDeg: {
    name: "targetCyclePerDeg",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "targetCyclePerDeg (default 0) is the target spatial frequency in cycles per deg. Sine of zero is zero and cosine of zero is 1, so if you're using zero targetCyclePerDeg to get a Gaussian blob, then set targetPhaseDeg to 90.",
  },
  targetDelaySec: {
    name: "targetDelaySec",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "targetDelaySec (default 0) delays presentation of the target in a movie. By default, time is zero at the middle of the movie. EasyEyes will subtract targetDelaySec from that default to produce the time coordinate used to compute the target (and envelope). This is unlike targetPhaseTemporalDeg which affects only the target, not the envelope.",
  },
  targetDurationSec: {
    name: "targetDurationSec",
    availability: "now",
    type: "numerical",
    default: "0.15",
    explanation:
      "⭑ targetDurationSec (default 0.15) is the duration of target presentation. For demos and debugging, it is handy to set responseAllowedEarlyBool to TRUE with a long targetDurationSec (e.g. 999) so that the stimulus stays up while you examine it, yet you can quickly click through several stimuli to see the progression. Set responseAllowedEarlyBool to FALSE if you want to allow response only after target offset.",
  },
  targetEccentricityXDeg: {
    name: "targetEccentricityXDeg",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "⭑ targetEccentricityXDeg (default 0) is the x location of the target center, relative to fixation. The target center is defined as the center of the bounding box for the letters in the fontCharacterSet. (See targetBoundingBoxHorizontalAlignment.)",
  },
  targetEccentricityYDeg: {
    name: "targetEccentricityYDeg",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "⭑ targetEccentricityYDeg (default 0) is the y location of the target center, relative to fixation.",
  },
  targetGapDeg: {
    name: "targetGapDeg",
    availability: "now",
    type: "numerical",
    default: "0.167",
    explanation:
      "targetGapDeg (default 10/60=0.167) vertical gap separating the upper and lower Vernier lines.",
  },
  targetHz: {
    name: "targetHz",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "targetHz (default 0) is the target temporal frequency in Hz. Not to be confused with the movie's frame rate, movieHz, which is independent.",
  },
  targetImageExclude: {
    name: "targetImageExclude",
    availability: "now",
    type: "categorical",
    default: "pastTargets",
    explanation:
      "🕑 targetImageExclude (default pastTargets). Select a policy for reuse of target images.\nWhen selecting a new target from the targetImageFolder, exclude images:\nnone. No exclusion. An image can appear as target more than once.\npastTargets: Exclude any image previously shown as a target, in any condition, in this session.\npastTargetsAndFoils: Exclude any image previously shown as a target or foil, in any condition, in this session.\n\nNOTE: For each targetImageFolder, EasyEyes records the use of targets and foils by all conditions together, regardless of targetImageExclude and targetImageFoilsExclude.",
    categories: ["none", "pastTargets", "pastTargetsAndFoils"],
  },
  targetImageFoilsExclude: {
    name: "targetImageFoilsExclude",
    availability: "now",
    type: "categorical",
    default: "none",
    explanation:
      "🕑 targetImageFoilsExclude (default none). Select policy for reusing images from the targetImageFolder as foils. A foil is offered in an identification task, as an alternative to the target, like a police lineup.  In all cases, the foils used in a trial are all different from each other and the target.\nWhen selecting new foils from the targetImageFolder, exclude images:\nnone. Past use as target or foil is disregarded.\npastTargets. Exclude past targets.\npastTargetsAndFoils. Exclude past targets and foils.\n\nNOTE: For each targetImageFolder, EasyEyes records the use of targets and foils by all conditions together, regardless of targetImageExclude and targetImageFoilsExclude.",
    categories: ["none", "pastTargets", "pastTargetsAndFoils"],
  },
  targetImageFolder: {
    name: "targetImageFolder",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      " targetImageFolder (empty default) names a folder of images that may be used when targetKind==image. On each trial, the target image is sampled randomly, with out without replacement (following targetImageReplacementBool), from the images in the image folder. (\"Without replacement\" considers all the trials of this condition of this block. Other conditions and blocks are independent.)\n\nThe folder is submitted as a zip archive to the EasyEyes drop box, and saved in the EasyEyesResources repository of the scientist's Pavlovia account. To be clear: The scientist creates a suitably named folder full of images, and zips that; the zip archive inherits the name of the folder. Each file in the folder must have one of the allowed image-file extensions: APNG, AVIF, GIF, JPEG, JPG, JP2, PNG (can be 16 bit), SVG, or WebP. (JPG is just an abbreviation of the JPEG extension; JP2 indicates JPEG 2000.) Different files can have different extensions. No subfolders are allowed. An experiment uses the folder by setting targetImageFolder to the name of the zip archive, without the extension.\n\nCOLOR MANAGEMENT. 16-bit png or jpeg2000 are rendered with 10-bit rendering (on capable hardware) and HDR. The browser's color-managed rendering will take into account the ICC color profiles of the image and display (including a stub RGB profile referring to the standard RGB profile.). For accurate image rendering, each image should have an embedded ICC color profile. (The informal convention of assuming an sRGB profile when none is embedded seems too unreliable, across browsers, for research-grade stimuli.) \n\nHDR. A large proportion of computer displays produced in recent years support 10 bits per color channel, and most browsers now use the 10 bits when displaying HDR (High dynamic range) images using the HTML <img> tag. Several Netflix engineers studied how to achieve 10-bit display on current browsers using available image formats.\nhttps://netflixtechblog.com/enhancing-the-netflix-ui-experience-with-hdr-1e7506ad3e8\nThey recommend using 16-bit PNG or JPEG 2000. 16-bit PNG is supported by the several browsers we tested. As of September 2022, Safari was the only browser supporting JPEG 2000.\nhttps://caniuse.com/jpeg2000\nSurprisingly, another web page claims that JPEG2000 is also supported by Chrome and Firefox.\nhttps://fileinfo.com/extension/jp2\n\nFUTURE: When the images have diverse size the scientist can instead specify image pixels per degree.\n[FUTURE: Instead of the zip archive, we could also allow our submit box to accept a folder, which it copies, including all the directly enclosed files.]        ",
  },
  targetImageReplacementBool: {
    name: "targetImageReplacementBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation: "targetImageReplacementBool",
  },
  targetKind: {
    name: "targetKind",
    availability: "now",
    type: "categorical",
    default: "letter",
    explanation:
      '⭑ targetKind (default letter) specifies the kind of target.\n\n= letter. On each trial, the target is a randomly selected character from the fontCharacterSet displayed in the specified font.\n\n= repeatedLetter. Display many copies of two targets, alternating across the screen. The observer reports both. Thus each presentation gets two responses, which count as two trials. The two target letters alternate for as many lines as fit on the screen and within targetRepeatsMaxLines. The last character at both ends of each line is targetRepeatsBorderCharacter. Neighboring lines are complementary so that the nearest letter from one line to a neighboring line is the other target.  David Regan and colleagues (1992) reported that in testing foveal acuity of patients with poor fixation (e.g. nystagmus) it helps to have a "repeat-letter format" eye chart covered with letters of the same size, so that no matter where the eye lands, performance is determined by the letter nearest to the point of fixation, where acuity is best. We here extend that idea to crowding. We cover some part of the screen with an alternating pattern of two letters, like a checkerboard, so that the letters can crowd each other, and ask the observer to report both letters. Again, we expect performance to be determined by the letters nearest to the (unpredictable) point of fixation, where crowding distance is least. HORIZONTALLY, the two targets alternate, forming a line, and size and spacing are specified in the usual way. VERTICALLY. If there is more than one line, then the line spacing (baseline to baseline) is the product of spacingOverSizeRatio and the height of the bounding box of fontCharacterSet.\nIMPORTANT: Some fonts may require increased fontPadding higher than its default value in order to avoid clipping of the letters. Such a high padding may cause errors in target lateness and duration. EasyEyes reports targetMeasuredLatenessSec and targetMeasuredDurationSec in the CSV file. \n\n= image. An image is randomly drawn, for this condition in this block, from a folder whose name is specified by targetImageFolder.\n* The random draw is with or without replacement, according to targetImageReplacementBool. \n* The image is displayed according to targetSizeDeg, targetSizeIsHeightBool, targetDurationSec, targetEccentricityXDeg, and targetEccentricityYDeg. The image aspect ratio is preserved. \n* If this condition includes one or more questionAndAnswers, they apply to this image. In that case one of the questionAndAnswers can be "identify" and the observer will be asked to identify the image by clicking one of several names. \n* One name is based on the target image\'s filename. The rest are foils, names based on randomly drawn (without replacement) image files in the targetImageFolder. The displayed name is the initial part of the image filename, not including the first period and the rest of the filename.\n* The number of trials is specified by conditionTrials, modified by thresholdPracticeUntilCorrectBool and thresholdAllowedTrialRatio.\n* Each targetKind=image trial uses HTML <image> to present the image with color management at given size, eccentricity, and duration: targetSizeDeg, targetSizeIsHeightBool, targetDurationSec, targetEccentricityXDeg, and targetEccentricityYDeg.\n* On each trial, ask all the questions: questionAndAnswer01, questionAndAnswer02, etc. Can be any number of questions. Each can be a rating, multiple choice, or free text.\n* Image identification task. The task shows the image briefly and the participant identifies its name in a menu of abbreviated filenames. Score each trial right/wrong. In displaying each filename as a choice, abbreviated by suppressing the first period whatever follows it. There can be more than one file with the same initial part. Duplicate initial parts are suppressed on the answer screen. For example, suppose you have four images: living.duck.jpg, living.elephant.jpg, inanimate.rock, inanimate.car. The initial parts, before period, suppressing duplicates, are “living” and “inanimate”. EasyEyes will randomly show one of the four images, but the answer screen will offer only two choices: living and inanimate. The participant’s answer will be scored as right or wrong.\n* Except for serial ordering, the tasks of identifying and asking questions are independent, and you request them independently.\n* To identify, set targetTask=identify.\n* To ask questions, specify questions as questionAndAnswers.\n* If you ask for both, then, optionally, one of the questionAndAnswers parameters can be set to "identify", which indicates when to ask the identification question. If none of the questionAndAnswers is set to “identify”, then identification comes first, before the questions.\n\n= movie. EasyEyes uses javascript movieComputeJS, provided by the scientist to compute an HDR movie, newly generated for each trial, and allows targetTask to be identify or detect.\n\n= reading Measure reading speed and retention. Uses specified font and writing direction (fontLeftToRightBool). readingXXX parameters specify corpus and starting point, control font size (usually via letter-to-letter spacing in deg), number of characters per line, and number of lines per page, and determine how many alternatives in each retention question and how many retention questions. The set of alternatives consists of a target word and foils that have approximately the same frequency in the corpus. IMPORTANT: conditionTrials is ignored when targetKind==reading. \n\n= rsvpReading. Flashes several words with Quest-controlled word duration. The parameter responseSpokenToExperimenterBool determines whether the trial\'s scoring is "spoken" (for children) or "silent" (for adults). In "silent" scoring, the participant sees a horizontal row of lines, each representing a shown word. Below each line is a list of possible words, including the correct one. The participant must select a word in each column to continue. readingXXX parameters specify how many alternatives for each word and how many retention questions. The set of alternatives consists of a target word and foils that have approximately the same frequency in the corpus.  In "spoken" scoring we assume that an experimenter sits next to the child participant, who reads the presented words aloud. Once the child has read the words aloud, the experimenter presses the SHIFT key to see the actual words, to guide scoring of what the child said. For each word, the experimenter presses either the up arrow for correct or down arrow for wrong. Supports fontLeftToRightBool for, e.g., Arabic.\n\n= vernier. Two vertical lines separated by a fixed vertical targetGapDeg and a variable horizontal targetOffsetDeg. \n* Vernier acuity measures how well people can judge the alignment of two vertical lines across a small gap. Duncan and Boynton (2003) showed that psychophysically measured vernier acuity is highly correlated with the size (mm^2) of cortical area V1. \nhttps://www.sciencedirect.com/science/article/pii/S0896627303002654\n* Two lines are presented so that the combination is centered on targetEccentricityXDeg and targetEccentricityYDeg. Imagine drawing one line going up from that point and another going down. To create the stimulus, we move those imaginary line segments in opposite directions horizontally and vertically. Vertically the upper line goes up by targetGapDeg/2, and the bottom line goes down by targetGapDeg/2. Horizontally we move the upper line right or left, by targetOffsetDeg (which is controlled by Quest), and the lower line by the same distance in the opposite direction. Despite displacement, the lines are vertical. \ntargetKind=\'vernier\', targetTask=\'identify\', thresholdParameter=”targetOffsetDeg”, targetEccentricityXDeg=0, targetEccentricityYDeg=0, targetThicknessDeg=5/60, targetLengthDeg=1, targetGapDeg=10/60, screenColorRGBA=”0,0,0,1”, targetColorRGBA =”1,1,1,1”, markingColorRGBA=”1,1,1,1”, targetDurationSec=0.15, instructionFontColorRGBA=”1,1,1,1”\n* If targetKind==\'vernier’ then the EasyEyes compiler will require targetTask==\'identify\' and thresholdParameter==”targetOffsetDeg”\n\n= sound. A sound is randomly drawn, without replacement (for this condition in this block) from a folder whose name is specified by targetSoundFolder. The target sound is played for its full duration at level targetSoundDBSPL with a masker sound randomly selected from the maskerSoundFolder played at level maskerDBSPL. Also, in the background, we play targetSoundNoise at level targetSoundNoiseDBSPL.\n\n= vocoderPhrase. The targetSoundFolder and maskerSoundFolder each contain a hierarchy of folders containing 16-channel sound files. Each sound file is named for a word and contains the original or processed sound of that word (except that the file called "GoTo.wav" in fact contains the two words "go to"). The top level of folders in targetSoundFolder and maskerSoundFolder are folders of sounds produced by several talkers. Currently the talkers (Talker11, Talker14, Talker16, and Talker18) are all female. On each trial the target and masker are randomly assigned different talkers (never equal). Within each talker\'s folder are several loose word files (Now.wav, GoTo.wav, and Ready.wav), and several category folders (CallSign, Color, Number) that each contain several word files. Each trial follows text phrases provided in the parameters targetSoundPhrase and maskerSoundPhrase. Each phrase consists of a series of explicit words and category names, with each category name preceded by #. Currently the targetSoundPhrase is "Ready Baron GoTo #Color #Number Now", and the maskerSoundPhrase is "Ready #CallSign GoTo #Color #Number Now". The target and masker phrases are played at the same time, aligning the temporal midpoint of both words in each target-masker pair by symmetrically padding both ends of the briefer word with zeroes to make it the same length as the longer word. Each explicit word in each script is played every time. On each trial, each word category, marked by #, is replaced by a randomly selected word from that category folder, except that target and masker are always different from each other when either is drawn from a category.  On each trial, the target and masker phrases are combined by randomly taking targetSoundChannels (default 9) of the 16 channels of every word in the target phrase, and the remaining 16-targetSoundChannels channels from the masker words. The channel selection is consistent for all the words in the phrase, and new for each trial. targetSoundDBSPL specifies the sound level of the combined targetSoundChannels channels taken from each target word. Similarly maskerSoundDBSPL specifies the sound level of the combined 16-targetSoundChannels channels taken from each masker word. Also, we play targetSoundNoise at level targetSoundNoiseDBSPL. The Zhang et al. (2021) paper mentions a noise control, in which the masker is white noise that has been filtered into 16 bands and windowed into word-length durations. The scientist achieves this simply by providing a maskerSoundFolder made up of these 16-channel noises, each derived from a word. \nRESPONSE. After playing the phrase, EasyEyes displays two columns, one for each category word in the targetSoundPhrase. The observer must select one word in each column in order to proceed to the next trial. (This is forced choice.) We score the trial as right only if both responses are right. That overall right/wrong response is provided to QUEST, which controls the targetSoundDBSPL.⭑ \n\n= gabor. A gabor is the product of a Gaussian and a sinewave. As a function of space, the sinewave produces a grating, and the Gaussain vignettes it to a specific area, without introducing edges. Gabors are a popular stimulus in vision research because they have compact frequency and location.',
    categories: [
      "letter",
      "gabor",
      "vernier",
      "image",
      "movie",
      "sound",
      "vocoderPhrase",
      "reading",
      "rsvpReading",
      "repeatedLetters",
    ],
  },
  targetLengthDeg: {
    name: "targetLengthDeg",
    availability: "now",
    type: "numerical",
    default: "1",
    explanation:
      "targetLengthDeg (default 1) is the length of each line in the Vernier target.",
  },
  targetMinPhysicalPx: {
    name: "targetMinPhysicalPx",
    availability: "now",
    type: "numerical",
    default: "8",
    explanation:
      'targetMinPhysicalPx (default 8) specifies the minimum target size, measured in (small) physical pixels, in the direction specified by targetSizeIsHeightBool. Set this big enough to guarantee enough resolution for decent rendering of this condition’s target. The Sloan font is more or less drawn on a 5✕5 grid, and remains legible when rendered as small as targetMinPhysicalPx=5.\n\nNote that targetMinPhysicalPx is measured in (small) physical px, whereas fontMaxPx is measured in (big) CSS px. \n\nSince 2010, when HiDPI displays, like Apple\'s Retina, first appeared, screen coordinates are expressed in "CSS" pixels, which each may contain more than one "physical" pixel, but fonts are rendered more finely, at the resolution of (small) physical pixels. In the world, and in this Glossary, unqualified references to "pixels" or "px" mean the (big) CSS pixels.  A length of window.devicePixelRatio physical px is one CSS px. Among displays available in 2024, window.devicePixelRatio may be 1, 1.5, 2, 3, or 4.  \n\nAlso see fontMaxPx, which is measured in (big) CSS pixels.',
  },
  targetN: {
    name: "targetN",
    availability: "now",
    type: "integer",
    default: "5",
    explanation:
      '🕑 targetN (default 5). The string length when testing for visual span. Any border characters are extra, beyond targetN. Typically controlled by Quest, by setting thresholdParameter="targetN". Also see targetNBorderCharacter, targetNMax, targetNPlaceholderCharacter.',
  },
  targetNBorderCharacter: {
    name: "targetNBorderCharacter",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '🕑 targetNBorderCharacter (default empty). Concatenated at each end of the targetN string. Typically “X” or empty. Used for span experiments. Avoid the SPACE character " ", as it may create problems in measuring string length to control center-to-letter letter spacing. \nAlso see targetN, targetNMax, targetNPlaceholderCharacter.',
  },
  targetNMax: {
    name: "targetNMax",
    availability: "now",
    type: "integer",
    default: "10",
    explanation:
      "🕑 targetNMax (default 10). The maximum allowed string length (not counting border characters). Used for span experiments. Also see targetN, targetNBorderCharacter, targetNPlaceholderCharacter.",
  },
  targetNPlaceholderCharacter: {
    name: "targetNPlaceholderCharacter",
    availability: "now",
    type: "text",
    default: "_",
    explanation:
      '🕑 targetNPlaceholderCharacter (default "_"). This is the placeholder for the missing character when we show the string with the target character missing. Also see targetN, targetNBorderCharacter, targetNMax.',
  },
  targetOffsetDeg: {
    name: "targetOffsetDeg",
    availability: "now",
    type: "numerical",
    default: "0.1",
    explanation:
      "targetOffsetDeg (default 0.1) the horizontal offset between two vertical Vernier lines that are colinear at zero offset. The two lines split the offset. They are displaced in opposite directions, each by half targetOffsetDeg. Displacement direction is random for each trial.",
  },
  targetOrientationDeg: {
    name: "targetOrientationDeg",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "targetOrientationDeg (default 0) is the orientation of the target, clockwise from vertical.",
  },
  targetPhaseSpatialDeg: {
    name: "targetPhaseSpatialDeg",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "targetPhaseSpatialDeg (default 0) is the target spatial phase in degrees.",
  },
  targetPhaseTemporalDeg: {
    name: "targetPhaseTemporalDeg",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "targetPhaseTemporalDeg (default 0) is the target temporal phase in degrees.",
  },
  targetRepeatsBorderCharacter: {
    name: "targetRepeatsBorderCharacter",
    availability: "now",
    type: "text",
    default: "$",
    explanation:
      "targetRepeatsBorderCharacter (default \"$\"). When targetKind=repeatedLetters, then targetRepeatsBorderCharacter specifies the character to use to make the outer border. This character has letters on only one side, so it's less crowded. So we don't want to give the game away by putting a target letter here.",
  },
  targetRepeatsMaxLines: {
    name: "targetRepeatsMaxLines",
    availability: "now",
    type: "numerical",
    default: "3",
    explanation:
      "targetRepeatsMaxLines (default 3) can be 1, 3, 4, 5, … . This is relevant only when targetKind=repeatedLetters. targetRepeatsMaxLines specifies the desired number of lines, but fewer lines may be displayed if limited by screen height. We recommend 1 and 3. Small children are alarmed by the repeatedLetters display if there are many lines, and this alarm is minimized by using no more than 3 lines. If there is more than one line, then the line spacing (baseline to baseline) is the product of spacingOverSizeRatio and the height of the bounding box of fontCharacterSet. The programmer reports that the two-line display produced by targetRepeatsMaxLines=2 is wrong, but we don't expect to ever use that case, so we moved on to more pressing issues. Please let us know if you need the 2-line case.",
  },
  targetSizeDeg: {
    name: "targetSizeDeg",
    availability: "now",
    type: "numerical",
    default: "2",
    explanation:
      "Ignored unless needed. Size is either height or width, as specified by targetSizeIsHeightBool. Height and width are based on the union of the bounding boxes of all the letters in fontCharacterSet. In the union, all characters have the same baseline vertically, and are centered horizontally.",
  },
  targetSizeIsHeightBool: {
    name: "targetSizeIsHeightBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      'targetSizeIsHeightBool (default FALSE) defines "size" as height (TRUE) or width (FALSE). Viewing a flat screen, orthogonal to the line of sight at fixation, at small eccentricity (less than 20 deg), the visual aspect ratio heightDeg/widthDeg hardly differs from the screen aspect ratio heightPx/widthPx. The screen aspect ratio ranges widely, up to 5:1 for the Pelli font. Note that tilt (yaw and pitch) of the screen relative to the target\'s line of sight will reduce/increase the visual aspect ratio (heightDeg/widthDeg). \nIMPORTANT. Before November 25, 2024, creation of the crowding stimulus ignored this parameter, and always measured target size as width. Since then, targetSizeIsHeightBool is obeyed. When spacingRelationToSize==="ratio", we suggest setting targetSizeIsHeightBool so that target size is measured in the same direction that spacing is measured.',
  },
  targetSoundChannels: {
    name: "targetSoundChannels",
    availability: "now",
    type: "integer",
    default: "9",
    explanation:
      "When the target sound file has more than one channel, targetSoundChannels specified how many (randomly selected) channels are used to create the target stimulus. Typically the rest of the channels are taken from the masker sound file.",
  },
  targetSoundDBSPL: {
    name: "targetSoundDBSPL",
    availability: "now",
    type: "numerical",
    default: "20",
    explanation:
      'If targetKind is "sound", targetSoundDBSPL specifies desired target sound level in dB SPL. However, to avoid clipping of the waveform, EasyEyes imposes a maximum on this level to prevent the digital sound waveform from exceeding the range ±1. ',
  },
  targetSoundFolder: {
    name: "targetSoundFolder",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "⭑ The name of a zip archive of sound files (each file can be in WAV or AAC format), to be used when targetKind==sound. The zip archive is submitted to the EasyEyes drop box, and saved in the Pavlovia account in the Folders folder. The name of the zip archive, without the extension, must match the value of targetSoundFolder. [FUTURE: We could also allow our submit box to accept a folder, which it copies, including all the directly enclosed files.]\n    For speech in noise (targetKind - sound and targetTask- identify) and tone in melody (targetKind- sound and targetTask- detect) experiments, the sound files must be directly inside the zip files and not in another folder within the zip files. Please refer to the example files.\n    Both WAV and AAC sound files can include multiple channels. Because of browser limitations, EasyEyes can use only up to 8 channels per file. AAC files are much more compact (about 10% the bytes as WAV, depending on data rate) but lossy. AAC files are as compact as MP3 files, with much better sound quality. We suggest starting with WAV, and switching to AAC only if you experience an undesirably long delay in loading your sounds. Switching to AAC will reduce your loading time ten-fold (or more, depending on data rate), but may reduce the sound quality slightly.",
  },
  targetSoundList: {
    name: "targetSoundList",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      "targetSoundList (default empty) specifies the complete filename of a spreadsheet that contains an ordered list of sounds, one row per trial, one column for left ear and one column for right ear. The task is identify, targetTask=identify. The set of options is the list of filenames (without extension) in the targetSound folder. ",
  },
  targetSoundNoiseBool: {
    name: "targetSoundNoiseBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      'If targetKind is "sound", and targetSoundNoiseBool is TRUE, then add noise to the target. The noise is zero mean Gaussian white noise, clipped at ±2 SD. Any reported SD is after clipping. Use a 10 ms squared sine ramp at onset and a 10 ms squared cosine ramp at offset. We could add a parameter to request leaving the noise on continuously. ',
  },
  targetSoundNoiseClockHz: {
    name: "targetSoundNoiseClockHz",
    availability: "now",
    type: "numerical",
    default: "20000",
    explanation: "The clock rate of the auditory noise.",
  },
  targetSoundNoiseDBSPL: {
    name: "targetSoundNoiseDBSPL",
    availability: "now",
    type: "numerical",
    default: "-999",
    explanation:
      "The desired noise level in dB SPL. The default (-999) is interpreted as no noise.",
  },
  targetSoundNoiseOffsetReTargetSec: {
    name: "targetSoundNoiseOffsetReTargetSec",
    availability: "now",
    type: "numerical",
    default: "0.3",
    explanation: "Positive when noise ends after the target ends.",
  },
  targetSoundNoiseOnsetReTargetSec: {
    name: "targetSoundNoiseOnsetReTargetSec",
    availability: "now",
    type: "numerical",
    default: "-0.3",
    explanation: "Positive when noise starts after the target starts.",
  },
  targetSoundPhrase: {
    name: "targetSoundPhrase",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      'targetSoundPhrase (default empty string) is a text phrase that is used when targetKind is 16ChannelSound. The phrase consists of a series of words and category names, with each category name preceded by #. Currently the targetSoundPhrase is "Ready Baron GoTo #Color #Number Now". Every word must appear as a sound file with that name, and every category must appear as a folder with that name, both in the current talker folder in the targetSoundFolder.',
  },
  targetSpaceConstantDeg: {
    name: "targetSpaceConstantDeg",
    availability: "now",
    type: "numerical",
    default: "1.00E+10",
    explanation:
      "targetSpaceConstantDeg (default practially infinite) is the 1/e radius of the Gaussian envelope in deg.",
  },
  targetTask: {
    name: "targetTask",
    availability: "now",
    type: "categorical",
    default: "",
    explanation:
      '⭑ targetTask (default empty). Can be one or more of the following categories, separated by commas,\n• identify: is forced-choice categorization of the target among known possibilities, e.g. a letter from a characterSet or an orientation among several. \n• detect: In yes-no detection, we simply ask "Did you see the target?". In two-alternative forced choice detection, we might display two intervals, only one of which contained the target, and ask the observer which interval had the target: 1 or 2? We rarely use detection because it needs many more trials to measure a threshold because its guessing rate is 50%, whereas identifying one of N targets has a guessing rate of only 1/N.\n• questionAndAnswer:  Obsolete. Use identify or empty instead.\n🕑 rate: The participant is invited to rate on a scale of 1 to 7. The targetKind can be reading, image, or sound.',
    categories: ["identify", "detect"],
  },
  targetThicknessDeg: {
    name: "targetThicknessDeg",
    availability: "now",
    type: "numerical",
    default: "0.083",
    explanation:
      "targetThicknessDeg (default 5/60=0.083) is the stroke thickness of Vernier target.",
  },
  targetTimeConstantSec: {
    name: "targetTimeConstantSec",
    availability: "now",
    type: "numerical",
    default: "1.00E+10",
    explanation:
      "targetTimeConstantSec (default practically infinite, 1e10) is the time for the temporal Gaussian envelope modulating target contrast to drop from 1 to 1/e.",
  },
  targetWhenSec: {
    name: "targetWhenSec",
    availability: "now",
    type: "numerical",
    default: "0",
    explanation:
      "🕑 targetWhenSec (default 0) indicates how much later the middle time of the target occurs relative to the middle of the movie.",
  },
  thresholdAllowedBlackoutBool: {
    name: "thresholdAllowedBlackoutBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "thresholdAllowedBlackoutBool (default FALSE). Does nothing when set to TRUE. Set it FALSE to enable blackout detection. If blackout is detected, the trial is marked as \"bad\" and the participant's response is not passed to QUEST. A blackout occurs when a font-rendering failure produces a large black square (RGBA=[0,0,0,1] on more than half of the screen) instead of the stimulus, ruining the trial. We suspect that it occurs in the font-rendering software when the browser provides insufficient heap space to the EasyEyes web app. As far as we know, no API reports the failure, though it's obvious to the participant. EasyEyes detects blackout by checking 13 dispersed pixels in the suspected blackout area after rendering each text stimulus. Blackouts are terrible, and it's good to detect them (and discard those trials), but it's conceivable that once blackouts are under control we'll want to stop this test because it takes too long or gives false alarms. In that case you can set thresholdAllowedBlackoutBool=TRUE to prevent testing for blackout, which will unknowingly accept them as good trials.  \n\nIf blackout is detected, the trial is \"bad\", and not sent to QUEST. QUEST receives the participant's response only on \"good\" trials. \n\nAlso see conditionTrials, fontMaxPx, fontMaxPxShrinkage, screenColorRGBA, showTimingBarsBool, thresholdAllowedBlackoutBool, thresholdAllowedDurationRatio, thresholdAllowedLatenessSec, thresholdAllowedTrialRatio.",
  },
  thresholdAllowedDurationRatio: {
    name: "thresholdAllowedDurationRatio",
    availability: "now",
    type: "numerical",
    default: "1.5",
    explanation:
      'thresholdAllowedDurationRatio (default 1.5). QUEST receives the participant\'s response only on "good" trials. A trial is "bad" if measured duration is outside the range [targetDurationSec/r, targetDurationSec*r], where r=max(thresholdAllowedDurationRatio, 1/thresholdAllowedDurationRatio). Bad durations (and excess lateness) occur mostly when drawing big letters on slow computers, and are more common for lacy fonts like Ballet (from Google fonts), Edwardian, and Zapfino. Typically QUEST begins each block at the largest possible size (i.e. fontMaxPx) and quickly descends to smaller size, and only the largest size is at risk for bad duration and lateness.  \n\nWe recommend plotting a histogram of targetMeasuredDurationSec from the report CSV file, and a scatter diagram of targetMeasuredDurationSec vs. fontNominalSizePx. Using _compatibleProcessorCoresMinimum=6 (or more) and fontMaxPx=900 (or less) greatly reduces the frequency of bad durations.\n\nAlso see _compatibleProcessorCoresMinimum, conditionTrials, fontMaxPx, fontMaxPxShrinkage, screenColorRGBA, showTimingBarsBool, thresholdAllowedBlackoutBool, thresholdAllowedDurationRatio, thresholdAllowedLatenessSec, thresholdAllowedTrialRatio.',
  },
  thresholdAllowedGazeRErrorDeg: {
    name: "thresholdAllowedGazeRErrorDeg",
    availability: "now",
    type: "numerical",
    default: "1.00E+10",
    explanation:
      'thresholdAllowedGazeRErrorDeg (default 1e10). QUEST receives the response only on "good" trials. A trial is "bad" if the measured gaze position during target presentation has a radial eccentricity in deg less than or equal to thresholdAllowedGazeRErrorDeg. \nAlso see conditionTrials, fontMaxPx, fontMaxPxShrinkage, screenColorRGBA, showTimingBarsBool, thresholdAllowedBlackoutBool, thresholdAllowedDurationRatio, thresholdAllowedLatenessSec, thresholdAllowedTrialRatio.',
  },
  thresholdAllowedGazeXErrorDeg: {
    name: "thresholdAllowedGazeXErrorDeg",
    availability: "now",
    type: "numerical",
    default: "1.00E+10",
    explanation:
      'thresholdAllowedGazeXErrorDeg (default 1e10). QUEST receives the response only on "good" trials. A trial is "bad" if the measured gaze position during target presentation has an xDeg eccentricity whose absolute value is less than or equal to thresholdAllowedGazeXErrorDeg. (Also see conditionTrials.)\n\nAlso see conditionTrials, fontMaxPx, fontMaxPxShrinkage, screenColorRGBA, showTimingBarsBool, thresholdAllowedBlackoutBool, thresholdAllowedDurationRatio, thresholdAllowedLatenessSec, thresholdAllowedTrialRatio.',
  },
  thresholdAllowedGazeYErrorDeg: {
    name: "thresholdAllowedGazeYErrorDeg",
    availability: "now",
    type: "numerical",
    default: "1.00E+10",
    explanation:
      'thresholdAllowedGazeYErrorDeg (default 1e10). QUEST receives the response only on "good" trials. A trial is "bad" if the measured gaze position during target presentation has a Y eccentricity whose absolute value is less than or equal to  thresholdAllowedGazeYErrorDeg.\n\nAlso see conditionTrials, fontMaxPx, fontMaxPxShrinkage, screenColorRGBA, showTimingBarsBool, thresholdAllowedBlackoutBool, thresholdAllowedDurationRatio, thresholdAllowedLatenessSec, thresholdAllowedTrialRatio.',
  },
  thresholdAllowedLatenessSec: {
    name: "thresholdAllowedLatenessSec",
    availability: "now",
    type: "numerical",
    default: "0.1",
    explanation:
      'thresholdAllowedLatenessSec (default 0.1). QUEST receives the participant\'s response only on "good" trials. A trial is "bad" if measured target lateness (beyond the requested latency) is less than or equal to thresholdAllowedLatenessSec. Excess lateness (and bad duration) occur mostly when drawing big letters on slow computers, and are more common for lacy fonts like Ballet (from Google fonts), Edwardian, and Zapfino. We recommend plotting a histogram of targetMeasuredLatenessSec from the report CSV file, and a scatter diagram of targetMeasuredLatenessSec vs. fontNominalSizePx. Typically QUEST begins each block at the largest possible size (i.e. fontMaxPx) and quickly descends to smaller size, and only the largest size is at risk for lateness and bad duration.  \n\nAlso see conditionTrials, fontMaxPx, fontMaxPxShrinkage, screenColorRGBA, showTimingBarsBool, thresholdAllowedBlackoutBool, thresholdAllowedDurationRatio, thresholdAllowedLatenessSec, thresholdAllowedTrialRatio.',
  },
  thresholdAllowedTrialRatio: {
    name: "thresholdAllowedTrialRatio",
    availability: "now",
    type: "numerical",
    default: "1.5",
    explanation:
      'thresholdAllowedTrialRatio (default 1.5) places an upper bound on the total number of trials (including both “good” and “bad”) to run to achieve the requested conditionTrials "good" trials, as a multiple of conditionTrials. Thus\nmaxTrials =  round(thresholdAllowedTrialRatio ✕ conditionTrials)\nA trial is "bad" if it has disallowed blackout, duration, lateness, gaze, or response delay. Otherwise it\'s good. Only good trials are passed to QUEST. During the block, EasyEyes keeps running trials of this condition (interleaved, as always, with the other conditions in this block), passing only good trials to QUEST, until either \n1. the number of good trials reaches conditionTrials, or \n2. the total number of trials (good and bad) reaches maxTrials.\nthresholdAllowedTrialRatio must be greater than or equal to 1.\n\nSuppose you want to send 35 trials to Quest, and you\'re willing to run up to 70 trials to accomplish that. Then set conditionTrials=35 and thresholdAllowedTrialRatio=2. \n\nAlso see conditionTrials, fontMaxPx, fontMaxPxShrinkage, screenColorRGBA, showTimingBarsBool, thresholdAllowedBlackoutBool, thresholdAllowedDurationRatio, thresholdAllowedLatenessSec, thresholdAllowedTrialRatio.',
  },
  thresholdBeta: {
    name: "thresholdBeta",
    availability: "now",
    type: "numerical",
    default: "2.3",
    explanation:
      'thresholdBeta (default 2.3) is the desired "steepness" of the Weibull psychometric function used by Quest.',
  },
  thresholdDelta: {
    name: "thresholdDelta",
    availability: "now",
    type: "numerical",
    default: "0.01",
    explanation:
      "thresholdDelta (default 0.01) is the probability of a wrong answer when way above threshold. QUEST sets the asymptote of the Weibull psychometric function to 1-thresholdDelta.",
  },
  thresholdGamma: {
    name: "thresholdGamma",
    availability: "now",
    type: "numerical",
    default: "",
    explanation:
      "thresholdGamma (default is empty which is filled in at runtime as explained below) is a parameter of the psychometric function used by QUEST. thresholdGamma is the probability of correct or yes response when the target is at zero strength. In an identification task with n equally-probable possibilities, one should set gamma to 1/n. Currently thresholdGamma defaults to 0.5 (which is appropriate for two-alternative forced choice), unless targetKind=letter.  In that case, if all the letters are unique, then n=length(fontCharacterSet), and the default value for thresholdGamma is 1/n. The various targetTasks and targetKinds should each have different default values of gamma, but currently thresholdGamma always default to 0.5 unless targetKind=letter. If you leave thresholdGamma empty then you'll get the default. If you set thresholdGamma to a numerical probability then that number will overrule the default. NOTE: You are allowed to have repeated letters in fontCharacterSet to give the letters unequal frequency. In that case, the default value of thresholdGamma is set to the probability of the most common letter being the right letter. For example, if fontCharacterSet='AAB', then the default value of thresholdGamma is 2/3.",
  },
  thresholdGuess: {
    name: "thresholdGuess",
    availability: "now",
    type: "numerical",
    default: "1",
    explanation:
      "⭑ thresholdGuess is your best guess for threshold, in linear units. (Unlike thresholdGuessLogSd, which is logarithmic.) Used to prime QUEST by providing a prior PDF, which is specified as a Gaussian as a function of the log threshold parameter. Its mean is the log of your guess, and its SD (in log units) is specifed below. We typically take our guess from our standard formulas for size and spacing threshold as a function of eccentricity.",
  },
  thresholdGuessLogSd: {
    name: "thresholdGuessLogSd",
    availability: "now",
    type: "numerical",
    default: "2",
    explanation:
      "thresholdGuessLogSd (default 2) specifies what standard deviation (in log units) you want Quest to assume for your threshold guess. Better to err on the high side, so you don't exclude actual cases. Used by QUEST. Sets the standard deviation of the prior PDF as a function of log of the threshold parameter.",
  },
  thresholdParameter: {
    name: "thresholdParameter",
    availability: "now",
    type: "categorical",
    default: "",
    explanation:
      '⭑ thresholdParameter (no default) designates an input parameter (e.g. targetSizeDeg or spacingDeg) that will be controlled by Quest to find the threshold at which criterion performance is attained.  \n• "spacingDeg" (formerly "spacing") varies center-to-center spacing of target and neighboring flankers. \n• "targetSizeDeg" (formerly "size") varies target size. \n• "targetDurationSec" varies target duration.\n• "targetContrast" awaits HDR10 support.\n•  "targetEccentricityXDeg"  may be added in the future.\n• "targetSoundDBSPL" (formerly "soundLevel")  varies target sound level.\n• "targetSoundNoiseDBSPL" varies noise sound level. Not yet implemented.\nNOTE: EasyEyes formerly supported the short crossed-out nicknames (size, spacing, and soundLevel), but we removed them so that only an actual input parameter name (listed in the first column of this Glossary) is allowed as a value of thresholdParameter. ',
    categories: [
      "spacingDeg",
      "targetSizeDeg",
      "targetN",
      "targetOffsetDeg",
      "targetDurationSec",
      "targetContrast",
      "targetSoundDBSPL",
      "targetSoundNoiseDBSPL",
    ],
  },
  thresholdParameterMax: {
    name: "thresholdParameterMax",
    availability: "now",
    type: "numerical",
    default: "1.00E+06",
    explanation:
      "thresholdParameterMax (1e6) imposes an upper bound on the threshold parameter suggested by Quest. This is the parameter value, not level, where level=log10(value), as in levelSuggestedByQuest.",
  },
  thresholdPracticeUntilCorrectBool: {
    name: "thresholdPracticeUntilCorrectBool",
    availability: "now",
    type: "boolean",
    default: "TRUE",
    explanation:
      "thresholdPracticeUntilCorrectBool (default TRUE). If TRUE, initial trials are considered practice until one is correct. The (wrong) trials are collected in the normal way, so Quest keeps making the task easier. Practice trials count towards the number of trials you request through conditionTrials. \n1. FLUSH AFTER FIRST CORRECT RESPONSE. After the participant's first correct response in this condition, EasyEyes flushes Quest for this condition, to start fresh, with the original prior probability density, and the original requested number of trials. In terms of coding, the main change is the flush after the first correct response. The practice trials will be reported, as usual, in the Results CSV file, but won't be included in Quest's non-practice staircase.\n2. BUT START AT THE LEVEL THAT SUCCEEDED. Some participants may need the easy stimulus of their successful practice trial. So, to get things off on the right foot, for the first trial on the record, Quest will provide the same levelSuggestedByQuest as it provided in the successful practice trial. For this first on-the-record trial, EasyEyes uses the saved value of levelSuggestedByQuest, instead of asking Quest to compute it.\n\nBACKGROUND. Getting the first trial wrong is a frequent problem in testing children, and occasionally in testing adults. Quest then makes the next trial bigger, and the staircase typically doesn't recover. Mathematically, Quest is doing the right thing, under the assumption that the observer is stationary. However, people often goof on the first trial, getting an easy trial wrong, and this uncharacteristic (non-stationary) behavior biases Quest to test very easy stimuli that are not optimal for estimating threshold. Marialuisa and I came up with a simple rule to solve this problem. We suppose that people only become stationary AFTER their first correct response. ",
  },
  thresholdProcedure: {
    name: "thresholdProcedure",
    availability: "now",
    type: "categorical",
    default: "QUEST",
    explanation:
      'thresholdProcedure (default QUEST) can be QUEST or none. We may add Fechner\'s "method of constant stimuli". Note that when rendering we restrict the threshold parameter to values that can be rendered without artifact, i.e. not too small to have enough pixels to avoid jaggies and not too big for target (and flankers in spacing threshold) to fit entirely on screen. The response returned to QUEST is accompanied by the true value of the threshold parameter, regardless of what QUEST suggested.',
    categories: ["none", "QUEST"],
  },
  thresholdProportionCorrect: {
    name: "thresholdProportionCorrect",
    availability: "now",
    type: "numerical",
    default: "0.7",
    explanation:
      'thresholdProportionCorrect (default 0.7) is used by QUEST, which calls it "pThreshold". This is the threshold criterion. In Methods you might say that "We defined threshold as the intensity at which the participant attained 70% correct." This corresponds to setting thresholdProportionCorrect to 0.7.\nPsychoJS code:\nhttps://github.com/kurokida/jsQUEST/blob/main/src/jsQUEST.js\nhttps://github.com/psychopy/psychojs/blob/2021.3.0/src/data/QuestHandler.js',
  },
  thresholdRepeatBadBlockBool: {
    name: "thresholdRepeatBadBlockBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      '🕑 thresholdRepeatBadBlockBool (default FALSE). If true, and this condition\'s threshold is "bad" (see below), then the block will be run again (only once even if again bad). The criterion for "bad" is that QuestSD>0.25. Several conditions in a block may make this request and be bad, but we still repeat the block only once. When we add a block, we should adjust the trial/block counter to reflect the change. (The 0.25 criterion is right for 35 trials, beta=2.3, and many possible targets. Later i\'ll write a more general formula and provide a way for the scientist to specify an arbitrary criterion value of QuestSD.)',
  },
  viewingDistanceAllowedPreciseBool: {
    name: "viewingDistanceAllowedPreciseBool",
    availability: "now",
    type: "boolean",
    default: "FALSE",
    explanation:
      "viewingDistanceAllowedPreciseBool (default FALSE) when TRUE shows the actual viewing distance with 1% precision, e.g. 20.3 cm, instead of the default integer precision, e.g. 23 cm. The high-precision display is useful when checking accuracy of the distance tracking.",
  },
  viewingDistanceAllowedRatio: {
    name: "viewingDistanceAllowedRatio",
    availability: "now",
    type: "numerical",
    default: "1.3",
    explanation:
      "viewingDistanceAllowedRatio (default 1.3) is the tolerance for the ratio, which would ideally be 1. It must be greater than or equal to zero and specifies a tolerance interval around the desired viewing distance D = viewingDistanceDesiredCm. If viewingDistanceAllowedRatio>1, then the allowed range of viewing distance is \nD/viewingDistanceAllowedRatio to D*viewingDistanceAllowedRatio. \nIf it's <1 then the allowed range of viewing distance is \nD*viewingDistanceAllowedRatio to D/viewingDistanceAllowedRatio. \nA value of 0 allows all viewing distance ratios. Viewing distance is enforced by the \"nudger\", which is enabled if and only if you enable calibrateTrackDistanceBool=TRUE. The nudger pauses testing while viewing distance is outside the allowed range, and the participant is encouraged to move in or out, as appropriate, toward the desired viewing distance. We call that \"nudging\".  \n\nNote: CSV and Excel files do not allow INF.\n\nTHE NUDGER. The nudger is enabled if and only if you enable calibrateTrackDistanceBool=TRUE. When viewing distance is outside the allowed range, the nudger puts up a full-screen opaque display telling the participant to MOVE CLOSER or FARTHER, as appropriate. (This is translated to the appropriate language.) The nudge display goes away when the participant is again within the allowed range. In our experience, the viewing-distance nudger (\"Closer\", \"Farther\") quickly gets the participant to the right distance, and they soon learn to stay there so they see this display only a few times. \n     On any trial, before computing the stimulus, EasyEyes will get a fresh estimate of viewing distance, and, if the nudger is not satisfied, wait until it is. EasyEyes waits until the nudger is satisfied, i.e. the estimated viewing distance is in the allowed range specified by viewingDistanceDesiredCm and viewingDistanceAllowedRatio. Use viewingDistanceAllowedPreciseBool=TRUE to show distance with an extra digit after the decimal. That's handy when you're checking it's accuracy.\n     We protect the stimulus from nudging. The nudger will never occlude, or forward or backward mask, the stimulus. Think of the trial as beginning at the participant's request for the stimulus (by keypress or clicking or tracking the crosshair) and ending at the click (or keypress) response. This leaves a pre-trial interval from the response until the click requesting the next trial. EasyEyes nudges only before and between trials. Furthermore, to prevent forward masking, EasyEyes ignores attempts to click (or press a key) during nudging and until targetSafetyMarginSec after nudging. Accepted clicks (or keypresses) produce a click sound. Ignored attempts are silent.\n\nPRE-TRIAL INTERVAL. We allow nudging from the time of response to the previous trial (click or keypress) until the participant requests a new trial (press space bar or click or track crosshair). \n\nSTIMULUS & RESPONSE INTERVALS. The stimulus and its memory are protected by disabling nudging from the moment of the participant's request for a new trial until the observer responds. \n\nThe trial software sets the internal parameter nudgingAllowedBool to TRUE only during the pre-trial, and sets nudgingCancelsTrialBool to always be FALSE.  The scientist cannot directly control nudgingAllowedBool and nudgingCancelsTrialBool.\n\nFUTURE ENHANCEMENT ONCE WE CAN CANCEL TRIALS. \nUPDATE: We now DO have trial cancelation, but the following potential upgrade has yet to be implemented.  \nIf we acquire the possibility of canceling a trial, then we could allow nudging during the stimulus interval, and immediately cancel that trial. Once a trial has been canceled we do NOT wait for a response. Instead, we proceed directly to draw the crosshair for the next trial. Canceling a trial is not trivial. We need to put this trial's condition back into the list of conditions to be run, and that list needs to be reshuffled, so the participant won't know what the next trial will be. I suppose that what happened will be obvious to the participant, so we don't need to explain that the trial was canceled. I see two stages of implementation. First the trial software needs to provide and update two flags: nudgingAllowedBool and nudgingCancelsTrialBool. The current version of MultistairHandler doesn't cope with trial cancelation. For now, the trial software sets nudgingAllowedBool to TRUE only during the pre-trial interval, and sets nudgingCancelsTrialBool to always be FALSE. Once we know how to cancel a trial, during the stimulus interval we'll set both nudgingAllowedBool and nudgingCancelsTrialBool to TRUE. ",
  },
  viewingDistanceDesiredCm: {
    name: "viewingDistanceDesiredCm",
    availability: "now",
    type: "numerical",
    default: "50",
    explanation:
      '⭑ If viewingDistanceDesiredCm is nonzero (default 50), then it specifies the desired viewing distance. If head tracking is enabled (calibrateTrackDistance = "object" and/or "blindspot") then nudging will enforce the desired distance (see viewingDistanceAllowedRatio) and stimulus generation will be based on the actual viewing distance of each trial. Without head tracking, EasyEyes assumes that the viewing distance is viewingDistanceDesiredCm. [The EasyEyes compiler should require that all conditions within a block have the same desired viewing distance.]\n     "Viewing distance" is defined by viewingDistanceWhichEye and viewingDistanceWhichPoint.\n     The output CSV data file reports viewingDistanceCm. Typically, head tracking is enabled, so measured viewing distance changes over time, updated every frame, typically at 60 Hz.\n     Use viewingDistanceAllowedRatio to control nudging. Nudging is very handy. We find that, with nudging, observers quickly learn to stay in the allowed range, with hardly any perceived effort. \n     To check the accuracy of viewing distance tracking online, set calibrateDistanceCheckBool=TRUE. To check in your lab, set a tight tolerance viewingDistanceAllowedRatio=1.01. While outside the allowed range the nudger provides a live report of measured viewing distance, which you can check with your tape measure. Use viewingDistanceAllowedPreciseBool=TRUE to show distance with an extra decimal digit.\n',
  },
  viewingDistanceToXYDeg: {
    name: "viewingDistanceToXYDeg",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '🕑 viewingDistanceToXYDeg (default empty) is used only when viewingDistanceWhichPoint==="xyDeg". In that case, it cannot be empty, and must provide two numbers, separated by a comma and a space, e.g. \n0, 10',
  },
  viewingDistanceWhichEye: {
    name: "viewingDistanceWhichEye",
    availability: "now",
    type: "categorical",
    default: "min",
    explanation:
      "🕑 viewingDistanceWhichEye (default min) selects which eye to use in computing viewing distance.\nleft\nright\nmin = minimum of the two eye's distances\ngeoMean = geometric mean of the two eye's distances\nEach eye’s distance is measured to the point on the screen selected by viewingDistanceWhichPoint. \nTypically, the choice is important only when the eccentricity is large (over 20 deg) and the viewing distance is short (under 50 cm).",
    categories: ["left", "right", "min", "geoMean"],
  },
  viewingDistanceWhichPoint: {
    name: "viewingDistanceWhichPoint",
    availability: "now",
    type: "categorical",
    default: "center",
    explanation:
      "🕑 viewingDistanceWhichPoint (default fixation) selects which point on screen to use in computing viewing distance.\nfixation = (0,0) deg\ncenter = center of screen\ntarget = (targetEccentricityXDeg, targetEccentricityXDeg) deg\nfoot = point on screen footXYPx, nearest to selected eye, viewingDistanceWhichEye\ncamera = cameraXYPx, estimated camera position in screen plane\nxyDeg = point specified by viewingDistanceToXYDeg",
    categories: ["fixation", "center", "target", "foot", "camera", "xyDeg"],
  },
  viewMonitorsXYDeg: {
    name: "viewMonitorsXYDeg",
    availability: "now",
    type: "text",
    default: "",
    explanation:
      '🕑 viewMonitorsXYDeg x1, y1;  x2, y2; x3, y3 accepts one or more xy coordinates, one per monitor, each of which specifies an xy eccentricity in deg. The default is no eccentricities, which disables this parameter. The block will be skipped, and an error flagged, if the computer does not have enough monitors.. It\'s ok to have more monitors than needed.\n     EasyEyes will suppose that the scientist probably, but not necessarily, wants the first eccentricity on the main monitor, e.g. the screen that the EasyEyes window first opens on. As a web app, I think that EasyEyes cannot directly measure how many monitors are available. It will display several small windows on the main screen, which each ask to be dragged to the appropriate monitor, e.g. "Drag me to the left monitor." or "Drag me to the middle monitor." or "Drag me to the right monitor.".\n     When using viewMonitorsXYDeg, we will typically have three monitors, and we’ll request three eccentricities. For example:\nviewMonitorsXYDeg 0, 0; -60, 0; 60, 0\nor\nviewMonitorsXYDeg 0, 0; 0, -60; 0, 60\nThe first example is for testing the horizontal meridian; the second is for the vertical meridian. Each request asks EasyEyes to place three monitors, one for each eccentricity, with the monitor’s screen orthogonal to the observer’s line of sight (from the nearer eye) at the specified eccentricity. The eye\'s perpendicular "foot" is the point in the plane of the screen where the nearer eye\'s sight line is orthogonal to the flat screen. We refer to it as the screen’s foot.  The monitor should be placed so that the foot is at the specified viewingDistanceDesiredCm and eccentricity, and as near as possible to the screen center, while avoiding monitor collisions.\n     When viewMonitorsXYDeg provides N eccentricities, demanding N monitors. EasyEyes needs to know the size (width and height) and margins of each monitor. The first time, it will display N little windows on the main screen and ask the participant to drag each window to the monitor it belongs on. Then it will ask the participant to measure (in cm) and type in the each screen\'s width, height, and margins. It will save this, so for subsequent blocks of the same experiment there is minimal fuss.\n\nARGUMENT PARSING, CHECKED BY COMPILER: There can be zero or more xy coordinates, separated by semicolons. Each coordinate consists of two comma-separated numbers. Each number must be in the range ±180 deg. The tokens are numbers, commas, and semicolns. Spaces between tokens are ignored. So are leading and trailing spaces. Missing numbers are a fatal error. \n\nFUTURE: We plan to add general support for vectors and matrices. Syntax will be like MATLAB in using commas to separate elements in a row, and semicolons to separate rows. Thus viewMonitorsXYDeg will accept a 2×N matrix. with 2 elements per row, and any number of rows.',
  },
};

export const SUPER_MATCHING_PARAMS: string[] = [
  "questionAndAnswer@@",
  "questionAnswer@@",
];
