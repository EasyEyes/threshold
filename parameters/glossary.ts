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
    example: "Effect of font on crowding.",
    explanation:
      "Optional brief description of the whole experiment. Ignored by EasyEyes, but saved with results. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "text",
    default: "",
  },
  _authorEmails: {
    name: "_authorEmails",
    availability: "now",
    example: "dp3@nyu.edu",
    explanation:
      "Optional, semicolon-separated email addresses of the authors.  The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "text",
    default: "",
  },
  _authors: {
    name: "_authors",
    availability: "now",
    example: "Denis Pelli",
    explanation:
      "Names of all the authors, separated by semicolons. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must all be empty.",
    type: "text",
    default: "",
  },
  _consentForm: {
    name: "_consentForm",
    availability: "now",
    example: "adultConsent2021.pdf",
    explanation:
      "The file name of your PDF (or plain-text Markdown with extension MD) consent document in the folder EasyEyesResources/ConsentForms/ in your Pavlovia account. The EasyEyes.app/threshold page makes it easy to upload your consent form(s) to that folder. When checking your experiment table, the compiler will check that a file with this name is present in your EasyEyesResources/ConsentForms folder on Pavlovia. See consent in Scientific Glossary for information about testing minors and children. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "text",
    default: "",
  },
  _daisyChainURLAfterEasyEyes: {
    name: "_daisyChainURLAfterEasyEyes",
    availability: "now",
    example: "http://xyz?cc=123",
    explanation:
      "A URL (with query parameters) that will add to a daisy chain of testing apps. This single or cascade of URLs will run after the EasyEyes study. Typically the last step is the completion page in Prolific (or MTurk), coding the participant as eligible for payment. The study URL returned by EasyEyes will run the whole cascade, including URLBeforeEasyEyes, the EasyEyes study, and URLAfterEasyEyes. Daisy chaining suggested by Becca Hirst at Open Science Tools. ",
    type: "text",
    default: "",
  },
  _daisyChainURLBeforeEasyEyes: {
    name: "_daisyChainURLBeforeEasyEyes",
    availability: "now",
    example: "http://xyz?cc=123",
    explanation:
      "A URL (with query parameters) that will begin a daisy chain of testing apps. This single or cascade of URLs will run first, before the EasyEyes study. Typically the last step is the completion page in Prolific (or MTurk), coding the participant as eligible for payment. The study URL returned by EasyEyes will run the whole cascade, including URLBeforeEasyEyes, the EasyEyes study, and URLAfterEasyEyes. Daisy chaining suggested by Becca Hirst at Open Science Tools. ",
    type: "text",
    default: "",
  },
  _dateCreated: {
    name: "_dateCreated",
    availability: "now",
    example: "8/1/2021",
    explanation:
      "Optional date of creation. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "date",
    default: "NaN",
  },
  _dateModified: {
    name: "_dateModified",
    availability: "now",
    example: "8/15/2021",
    explanation:
      "Optional date of latest modification. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "date",
    default: "NaN",
  },
  _debriefForm: {
    name: "_debriefForm",
    availability: "now",
    example: "debrief2021.pdf",
    explanation:
      "The file name of your PDF (or plain-text Markdown with extension MD) debrief document in the folder EasyEyesResources/ConsentForms/ in your Pavlovia account. The EasyEyes.app/threshold page makes it easy to upload your debrief form(s) to that folder. The compiler will check that a file with this name is present in your EasyEyesResources/ConsentForms folder on Pavlovia. See consent in Glossary for information about testing minors and children. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "text",
    default: "",
  },
  _experimentName: {
    name: "_experimentName",
    availability: "now",
    example: "crowding",
    explanation:
      "Very important. If omitted, as default we use the table file name (without extension) as the experiment name. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "text",
    default: "",
  },
  _invitePartingCommentsBool: {
    name: "_invitePartingCommentsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "At the end of the experiment, invite the participant to make parting comments. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "boolean",
    default: "FALSE",
  },
  _participantDurationMinutes: {
    name: "_participantDurationMinutes",
    availability: "now",
    example: "30",
    explanation:
      "Expected duration, in minutes, in the offer to participants. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "numerical",
    default: "30",
  },
  _participantPay: {
    name: "_participantPay",
    availability: "now",
    example: "7.5",
    explanation:
      "Payment to offer to each participant. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "numerical",
    default: "7.5",
  },
  _participantPayCurrency: {
    name: "_participantPayCurrency",
    availability: "now",
    example: "USDollar",
    explanation:
      "Currency of payment amount: USDollar, Euro, etc. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "categorical",
    default: "USDollar",
    categories: ["USDollar", "Euro", "UKPound"],
  },
  _participantRecruitmentService: {
    name: "_participantRecruitmentService",
    availability: "now",
    example: "Prolific",
    explanation:
      'Name of recruitment service: none, Prolific, SONA, MTurk.  The key idea is two URLs that carry parameters. The Study URL (a link to our experiment) carries parameters provided by the recruitment service (e.g. Prolific). The Completion URL (a link to the completion page of the recruitment service) carries the completion code certifying that the participant completed the study. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.\nnone - Just produce a study URL.\nProlific - integrate with Prolific as suggested by the PsychoPy manual. https://www.psychopy.org/online/prolificIntegration.html\nMTurk - currently equivalent to "none".\nSONA - currenlty equivalent to "none".',
    type: "categorical",
    default: "none",
    categories: ["none", "Prolific", "MTurk", "SONA"],
  },
  _participantRecruitmentServiceAccount: {
    name: "_participantRecruitmentServiceAccount",
    availability: "later",
    example: "123ABC",
    explanation:
      "Account number. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "text",
    default: "",
  },
  _participantsHowMany: {
    name: "_participantsHowMany",
    availability: "later",
    example: "100",
    explanation:
      "Number of people you want to test. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "integer",
    default: "1",
  },
  _prolificEligibilityRequirements: {
    name: "_prolificEligibilityRequirements",
    availability: "later",
    example: "",
    explanation:
      "This Prolific page shows some of their prescreening options: \nhttps://researcher-help.prolific.co/hc/en-gb/articles/360009221093-How-do-I-use-Prolific-s-demographic-prescreening-\nThe Prolific API is still in the beta stage of development. To specify eligibility requirements through the API, they say to contact Prolific at integrations@prolific.co. We have written to Prolific and we will enhance this when they tell us how to. https://prolificapi.docs.apiary.io/",
    type: "text",
    default: "",
  },
  _prolificStudyType: {
    name: "_prolificStudyType",
    availability: "later",
    example: "US_REP_SAMPLE",
    explanation:
      "Can be UK_REP_SAMPLE, US_REP_SAMPLE, or SINGLE. This is a field in the Prolific API for recruiting participants. There are two types of study:\n• Representative sample: UK_REP_SAMPLE or US_REP_SAMPLE\n• Normal study: SINGLE",
    type: "categorical",
    default: "US_REP_SAMPLE",
    categories: ["UK_REP_SAMPLE", "US_REP_SAMPLE", "SINGLE"],
  },
  _zeroBasedNumberingBool: {
    name: "_zeroBasedNumberingBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "If true then the first block and condition are numbered 0, otherwise 1.",
    type: "boolean",
    default: "FALSE",
  },
  block: {
    name: "block",
    availability: "now",
    example: "1",
    explanation:
      "The block number. The first condition (second column) must have a block number of 0 or 1, consistent with zeroBasedNumberingBool. After the first condition, each successive condition (column) must have the same block number as the one preceding it, or increased by +1.",
    type: "integer",
    default: "1",
  },
  calibrateBlindSpotBool: {
    name: "calibrateBlindSpotBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'Initial measurement of viewing distance by mapping the blind spot, as suggested by the Li et al. (2020) "Virtual chinrest" paper.',
    type: "boolean",
    default: "FALSE",
  },
  calibrateDistanceCheckBool: {
    name: "calibrateDistanceCheckBool",
    availability: "soon",
    example: "FALSE",
    explanation:
      'When TRUE, requests checking of the calibrator by the participant, provided they have a tape measure, meter stick, or yard stick, or failing that, a ruler. After each size or distance calibration, if calibrationDistanceCheckBool=TRUE, then we will ask the participant if they have an appropriate measuring device (ideally a tape measure, meter stick, or yard stick; a 12" or 30 cm ruler could be used if we exclude long distances), and, if so, how long is it, and what are its units: decimal cm, decimal inches, fractional inches. If no device, then we skip the rest of the calibrations that need a measuring device. In our instructions, we can say "Use your ruler, stick, or tape to measure this." When receiving fractional inches we could either accept a string like “16 3/16” or we could have three fields that each accept an integer, and allow the user to tab from field to field: "?? ??/??". The last number must be 2, 4, 8, 16, or 32. For round numbers, the numerator will be zero. After measuring screen size, we can ask them to use their ruler, stick, or tape to measure screen width. We can display a huge double headed arrow from left edge to right edge. After measuring viewing distance we can ask them to use ruler, stick, or tape to create three exact viewing distances that we then use the webcam to measure. We can request 12, 24, or 36 inches, or 30, 60, or 90 cm. (These are round numbers, not exactly equivalent.) \n     We have two ways of measuring viewing distance and I’d like to evaluate both. Our current scheme with the calibrator is to have a Boolean parameter for each calibration. We should have separate parameters for the two methods of measuring viewing distance so scientists can select none, either, or both. It would be interesting to compare the two estimates (direct vs indirect) of pupillary distance. We should always save the pupillary distance with the data. We can compare our population distribution with the textbook distribution. It might be an elegant check on our biometrics. \n     We could test people on Prolific and mention in our job description that they must have a tape measure, meter stick or yard stick.  Readers of our article will like seeing data from 100 people online plus 10 experienced in-house participants. I think this will create confidence in the calibrations. For scientists that’s crucial.\n',
    type: "boolean",
    default: "FALSE",
  },
  calibrateGazeCheckBool: {
    name: "calibrateGazeCheckBool",
    availability: "soon",
    example: "FALSE",
    explanation:
      "To check gaze tracking we don’t need a measuring device, and hardly any instructions. I think we could just put up our fixation cross in a few random places and ask them to click on it. It will be very similar to the training and we don’t need to tell the participant that we progressed from training to checking.",
    type: "boolean",
    default: "FALSE",
  },
  calibrateScreenSizeBool: {
    name: "calibrateScreenSizeBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Adjust the screen image of a common object of known size to match, to determine the size in cm of the participant's screen. Thanks to Li et al. 2020.",
    type: "boolean",
    default: "TRUE",
  },
  calibrateScreenSizeCheckBool: {
    name: "calibrateScreenSizeCheckBool",
    availability: "soon",
    example: "TRUE",
    explanation:
      "Ask the participant to use a ruler, yardstick, meter stick, or tape measure to measure the distance directly to assess accuracy.",
    type: "boolean",
    default: "FALSE",
  },
  calibrateTrackDistanceBool: {
    name: "calibrateTrackDistanceBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Use this to turn EasyEyes distance tracking on and off. Before tracking can begin you must make an initial calibration of distance, either by easyEyesBlindSpotBool or easyEyesPupilDistanceBool, or both. Distance tracking uses the webcam to monitor position of the participant's head. It ignores where you're looking. The head is not a point, of course. Since this is for vision research, the point we estimate is the midpoint between the two eyes. That point is sometime called cyclopean, referring to the mythical one-eyed Cyclops in Homer's Odyssey. From each webcam image we extract: 1. the viewing distance, from the midpoint (between the two eyes) to the screen, and 2. the near point, which is the point in the plane of the screen that is closest to the midpoint between the eyes. When rendering visual stimulus specified in deg, it is necessary to take the viewing distance (and near point) into account. The near point becomes important at large eccentricities and is usually ignored at small eccentricities.",
    type: "boolean",
    default: "TRUE",
  },
  calibrateTrackGazeBool: {
    name: "calibrateTrackGazeBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "Use this to turn EasyEyes gaze tracking on and off. It must be calibrated before use. Gaze tracking uses the built-in webcam to monitor where the participant's eyes are looking. To be clear, in gaze tracking, the webcam looks at your eyes to figure out where on the screen your eyes are looking. It estimates that screen location. Gaze-contingent experiments change the display based on where the participant is looking. Peripheral vision experiments typically require good fixation and may discard trials for which fixation was too far from the fixation mark. Precision is low, with a typical error of 4 deg at 50 cm. We expect the error, in deg, to be proportional to viewing distance.",
    type: "boolean",
    default: "FALSE",
  },
  calibrateTrackNearPointBool: {
    name: "calibrateTrackNearPointBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "Initial measurement of the pupillary distance to later estimate near point.",
    type: "boolean",
    default: "FALSE",
  },
  conditionGroup: {
    name: "conditionGroup",
    availability: "later",
    example: "1",
    explanation:
      '"conditionGroup" imposes consistent screen markings across a set of conditions. Screen markings before and during stimulus presentation indicate the positions of the fixation and possible targets. There are many parameters, below, whose names begin with "marking" that allow you to customize markings.  Within a block, all conditions with the same nonzero conditionGroup number are presented with the same markings (fixation cross, target X) to avoid giving any clue as to which of the possible targets will appear on this trial. Thus, one can implement uncertainty among any specified set of targets simply by creating a condition for each target, and giving all the conditions the same nonzero conditionGroup number. There can be any number of conditions in a conditionGroup, and there can be any number of condition groups in a block. Every condition belongs to a condition group. A condition with a zero or unique conditionGroup number belongs to a condition group with just that condition.',
    type: "integer",
    default: "0",
  },
  conditionName: {
    name: "conditionName",
    availability: "now",
    example: "Crowding",
    explanation:
      "Use this to label your condition to help guide your subsequent data analysis. Not used by EasyEyes.",
    type: "text",
    default: "",
  },
  conditionTrials: {
    name: "conditionTrials",
    availability: "now",
    example: "40",
    explanation:
      "Number of trials of this condition to run in this block. They are all randomly interleaved. Each condition can have a different number of trials. ",
    type: "integer",
    default: "35",
  },
  fixationCheckBool: {
    name: "fixationCheckBool",
    availability: "later",
    example: "FALSE",
    explanation:
      "Display a foveal triplet that is easy to read if the participant's eye is on fixation, and hard to read if the eye is elsewhere.",
    type: "boolean",
    default: "TRUE",
  },
  fixationLocationStrategy: {
    name: "fixationLocationStrategy",
    availability: "now",
    example: "centerFixation",
    explanation:
      'Choose the strategy by which EasyEyes should place the point of fixation, which is the origin of the visual coordinate system. This is complicated. Most experimenters will choose "centerFixation", which simply places fixation at the center of the screen. But for peripheral testing you might want to put fixation near one edge to maximize the eccentricity of a target at the other edge. To test even farther into the periphery, you might want to put fixation off-screen by putting tape on a bottle or a box and drawing a fixation cross on it. Those cases and others are handled by choosing other strategies. Fixation, whether, on- or off-screen, is always specified as a point in (x,y) pixel coordinates in the plane of the display. We never change fixation within a block, so all conditions in a block must have the same fixation point and fixationLocationStrategy. This is checked by the pre-processor. If the strategy refers to targets, we consider all possible targets across all conditions within the block.  \n• "asSpecifed" indicates that fixation is specified by (fixationLocationXScreen,  fixationLocationYScreen). \n• "centerFixation" places fixation at the center of the screen. \n• "centerTargets" sets the (possibly offscreen) fixation location so as to maximize the screen margin around the edges of all the possible targets.  \n• "centerFixationAndTargets" places fixation so as to maximize the screen margin around the fixation and the edges of all the possible targets within the block. It may be impossible to satisfy the strategies that mention targets without reducing viewing distance. Ideally, the pre-processor would flag this error before we start running the experiment.',
    type: "categorical",
    default: "centerFixation",
    categories: [
      "centerFixation",
      "centerFixationAndTargets",
      "centerTargets",
      "asSpecified",
    ],
  },
  fixationLocationXScreen: {
    name: "fixationLocationXScreen",
    availability: "soon",
    example: "0.5",
    explanation:
      'If fixationLocationStrategy is "asSpecified" then this specifies fixation\'s X coordinate in the screen plane, normalized by screen width and height. Origin is lower left.',
    type: "numerical",
    default: "0.5",
  },
  fixationLocationYScreen: {
    name: "fixationLocationYScreen",
    availability: "soon",
    example: "0.5",
    explanation: "As above. The Y coordinate.",
    type: "numerical",
    default: "0.5",
  },
  fixationRequestedOffscreenBool: {
    name: "fixationRequestedOffscreenBool",
    availability: "later",
    example: "FALSE",
    explanation:
      "To test the far periphery it may be worth the trouble of setting up an off-screen fixation mark, with help from the participant.",
    type: "boolean",
    default: "FALSE",
  },
  fixationToleranceDeg: {
    name: "fixationToleranceDeg",
    availability: "now",
    example: "4",
    explanation:
      "We save all trials in trialData, but when the fixation error exceeds tolerance, we don't feed it to QUEST, and we run it again by adding a trial of this condition to the list of conditions yet to be run in this block, and reshuffle that list. Excel treats 'inf' as a string, not the number infinity, so use a large number instead of 'inf'. Note that the typical error of gaze tracking using the built-in web cam is roughly 4 deg at 50 cm, so, in that case, we suggest setting tolerance no lower than 4 deg. Since accuracy is determined by webcam resolution, halving or doubling the viewing distance should proportionally change the error in estimated gaze angle.",
    type: "numerical",
    default: "1000",
  },
  flipScreenHorizontallyBool: {
    name: "flipScreenHorizontallyBool",
    availability: "later",
    example: "FALSE",
    explanation: "Needed when the display is seen through a mirror.",
    type: "boolean",
    default: "FALSE",
  },
  instructionFont: {
    name: "instructionFont",
    availability: "now",
    example: "Georgia",
    explanation:
      'Font used for participant instructions. Four cases are selected by instructionFontSource=\ndefaultForLanguage: We recommend leaving instructionFont blank and setting instructionFontSource to defaultForLanguage, which will result in using whatever font is recommended by the EasyEyes International Phrases sheet for the chosen instructionLanguage. This allows runtime selection of instructionLanguage by the participant. For each language, the EasyEyes International Phrases table recommends a font from the Noto serif family, which are all served by Google Fonts.\nfile:  instructionFont is the file name (including extension) of a font in your Fonts folder in your Pavlovia account. Be sure that your font can render the characters of the instructionLanguage you pick. \ngoogle: instructionFont is a filename (including extension) of a font on the Google Fonts server.\nserver: instructionFont is a URL pointing to the desired font on a font server, e.g. Adobe. ("server" support is coming.)\nbrowser: instructionFont should be a string for the browser expressing your font preference.\n     Noto Fonts. The EasyEyes International Phrases table recommends the appropriate "Noto" font, available from Google and Adobe at no charge. Wiki says, "Noto is a font family comprising over 100 individual fonts, which are together designed to cover all the scripts encoded in the Unicode standard." Various fonts in the Noto serif family cover all the worlds languages that are recognized by unicode. https://en.wikipedia.org/wiki/Noto_fonts  \nWe plan to use the free Google Fonts server, which serves all the Noto fonts.\n     Runtime language selection. To allow language selection by the participant at runtime, we will ask the Google Fonts server to serve an appropriate font (from the Noto Serif family) as specified by the EasyEyes International Phrases sheet. \n     Fonts load early. We\'ll get the browser to load all needed fonts at the beginning of the experiment, so the rest of the experiment can run without internet or font-loading delay. Of course, we hope the computer eventually reconnects to send the experiment\'s data to Pavlovia, where the scientist can retrieve it.',
    type: "text",
    default: "Verdana",
  },
  instructionFontSource: {
    name: "instructionFontSource",
    availability: "now",
    example: "browser",
    explanation:
      'instructionFontSource must be file, google, server, or browser. "server" support is coming. See targetFontSource for explanation.',
    type: "categorical",
    default: "browser",
    categories: ["file", "google", "browser"],
  },
  instructionFontStyle: {
    name: "instructionFontStyle",
    availability: "soon",
    example: "regular",
    explanation:
      "Must be regular, bold, italic, or boldItalic. When you select a font file that is already styled, just select regular here. Otherwise the browser might try to tilt or thicken the already italic or bold font with unexpected results.",
    type: "categorical",
    default: "regular",
    categories: ["regular", "italic", "bold", "boldItalic"],
  },
  instructionLanguage: {
    name: "instructionLanguage",
    availability: "soon",
    example: "Italian",
    explanation:
      "English name for the language used for instructions to the participant. It must match one of the entries in the second row of the EasyEyes International phrases sheet. If you leave this blank, then the participant will be allowed to select the instruction language from a pull-down menu.",
    type: "categorical",
    default: "English",
    categories: [""],
  },
  instructionTableURL: {
    name: "instructionTableURL",
    availability: "later",
    example: "",
    explanation:
      'The URL of a Google Sheets table of international phrases to be used to give instructions throughout the experiment. A scientist can substitute her own table, presumably a modified copy of the EasyEyes International Phrases Table. https://docs.google.com/spreadsheets/d/1UFfNikfLuo8bSromE34uWDuJrMPFiJG3VpoQKdCGkII/edit#gid=0\nThis table allows the Participant page to make all non-stimulus text international. In every place that it displays instruction text, the Participant page looks up the mnemonic code for the needed phrase in the instruction table, to find a unicode phrase in the selected instructionLanguage (e.g. English, German, or Arabic). It\'s a Google Sheets file called "EasyEyes International Phrases".\nhttps://docs.google.com/spreadsheets/d/1AZbihlk-CP7sitLGb9yZYbmcnqQ_afjjG8h6h5UWvvo/edit#gid=0\nThe first column has mnemonic phrase names. Each of the following columns gives the corresponding text in a different language. After the first column, each column represents one language. Each row is devoted to one phrase. The second row is languageNameEnglish, with values: English, German, Polish, etc. The third row is languageNameNative, with values: English, Deutsch, Polskie, etc. \n     We incorporate the latest "EasyEyes International Phrases" file when we compile threshold.js. For a particular experiment, we only need the first column (the mnemonic name) and the column whose heading matches instructionLanguage. We should copy those two columns into a Javascript dictionary, so we can easily look up each mnemonic phrase name to get the phrase in the instructionLanguage. To display any instruction, we will use the dictionary to convert a mnemonic name to a unicode phrase. \n     languageDirection. Note that most languages are left to right (LTR), and a few (e.g. Arabic, Urdu, Farsi, and Hebrew) are right to left (RTL). Text placement may need to take the direction into account. The direction (LTR or RTL) is provided by the languageDirection field.\n     languageNameNative. If we later allow the participant to choose the language, then the language selection should be based on the native language name, like Deustch or Polskie, i.e. using languageNameNative instead of languageNameEnglish.',
    type: "text",
    default: "",
  },
  invitePartingCommentsBool: {
    name: "invitePartingCommentsBool",
    availability: "later",
    example: "FALSE",
    explanation:
      "At the end of this block, invite the participant to make parting comments. ",
    type: "boolean",
    default: "FALSE",
  },
  keyEscapeEnable: {
    name: "keyEscapeEnable",
    availability: "now",
    example: "FALSE",
    explanation:
      "If true, then, at any prompt, the participant can hit <escape> to be asked whether to cancel the trial (hit space), the block (hit return), or the whole experiment (hit escape again).",
    type: "boolean",
    default: "TRUE",
  },
  markingBlankedNearTargetBool: {
    name: "markingBlankedNearTargetBool",
    availability: "later",
    example: "TRUE",
    explanation:
      'Suppress any parts of the fixation cross or target X that are too close to the possible targets in this conditionGroup. This enables both meanings of "too close": markingBlankingRadiusReEccentricity and markingBlankingRadiusReTargetHeight.',
    type: "boolean",
    default: "TRUE",
  },
  markingBlankingRadiusReEccentricity: {
    name: "markingBlankingRadiusReEccentricity",
    availability: "later",
    example: "0.5",
    explanation:
      'Considering crowding, define "too close" distance as a fraction of radial eccentricity.',
    type: "numerical",
    default: "0.5",
  },
  markingBlankingRadiusReTargetHeight: {
    name: "markingBlankingRadiusReTargetHeight",
    availability: "later",
    example: "2",
    explanation:
      'Considering masking, define "too close" distance as a fraction of target height.',
    type: "numerical",
    default: "0.2",
  },
  markingClippedToStimulusRectBool: {
    name: "markingClippedToStimulusRectBool",
    availability: "later",
    example: "FALSE",
    explanation:
      'Fixation and target marking can be restricted (true), protecting the screen margins, or (false) allowed to extend to screen edges, a "full bleed".',
    type: "boolean",
    default: "FALSE",
  },
  markingFixationStrokeLengthDeg: {
    name: "markingFixationStrokeLengthDeg",
    availability: "later",
    example: "1",
    explanation: "Stroke length in the fixation cross.",
    type: "numerical",
    default: "1",
  },
  markingFixationStrokeThicknessDeg: {
    name: "markingFixationStrokeThicknessDeg",
    availability: "later",
    example: "0.03",
    explanation: "Stroke thickness in the fixation cross.",
    type: "numerical",
    default: "0.03",
  },
  markingOffsetBeforeTargetOnsetSecs: {
    name: "markingOffsetBeforeTargetOnsetSecs",
    availability: "now",
    example: "0.2",
    explanation:
      "Pause before target onset to minimize forward masking of the target by the preceding fixation and target markings.",
    type: "numerical",
    default: "0",
  },
  markingOnsetAfterTargetOffsetSecs: {
    name: "markingOnsetAfterTargetOffsetSecs",
    availability: "now",
    example: "0.2",
    explanation:
      "Pause before onset of fixation and target markings to minimize backward masking of the target.",
    type: "numerical",
    default: "0",
  },
  markingTargetStrokeLengthDeg: {
    name: "markingTargetStrokeLengthDeg",
    availability: "later",
    example: "1",
    explanation: "Stroke length in the target X.",
    type: "numerical",
    default: "1",
  },
  markingTargetStrokeThicknessDeg: {
    name: "markingTargetStrokeThicknessDeg",
    availability: "later",
    example: "0.03",
    explanation: "Stroke thickness in the target X.",
    type: "numerical",
    default: "0.03",
  },
  markTheFixationBool: {
    name: "markTheFixationBool",
    availability: "now",
    example: "TRUE",
    explanation: "If true, then draw a fixation cross.",
    type: "boolean",
    default: "TRUE",
  },
  markThePossibleTargetsBool: {
    name: "markThePossibleTargetsBool",
    availability: "later",
    example: "FALSE",
    explanation:
      "If true, draw an X at every possible target location, considering all conditions in this conditionGroup. ",
    type: "boolean",
    default: "FALSE",
  },
  notes: {
    name: "notes",
    availability: "now",
    example: "",
    explanation:
      "Optional. Use this to add comments about the condition that you want preserved in the data file. Ignored and saved with results.",
    type: "text",
    default: "",
  },
  playNegativeFeedbackBeepBool: {
    name: "playNegativeFeedbackBeepBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "After mistaken response, play pure 500 Hz tone for 0.5 sec at amplitude 0.05. Usually we stay positive and give only positive feedback.",
    type: "boolean",
    default: "FALSE",
  },
  playPositiveFeedbackBeepBool: {
    name: "playPositiveFeedbackBeepBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "After correct response, play pure 2000 Hz tone for 0.05 sec at amplitude 0.05. ",
    type: "boolean",
    default: "TRUE",
  },
  playPurrWhenReadyBool: {
    name: "playPurrWhenReadyBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Play a purring sound to alert the observer while we await their response. Pure 200 Hz tone for 0.6 sec at amplitude 1.",
    type: "boolean",
    default: "TRUE",
  },
  readingCorpusURL: {
    name: "readingCorpusURL",
    availability: "later",
    example: "http://xxx",
    explanation:
      'Book of readable text. We typically use "The phantom tollbooth" a popular American children\'s book with a reading age of 10+ years for interest and 12+ years for vocabulary. We retain punctuation, but discard chapter and paragraph breaks. Every passage selection begins and ends at a sentence break.',
    type: "text",
    default: "",
  },
  readingDefineSingleLineSpacingAs: {
    name: "readingDefineSingleLineSpacingAs",
    availability: "later",
    example: "nominal size",
    explanation:
      'What shall we say is the "single" line spacing of the text to be read? \n• "nominal size" is the industry standard, which defines single line spacing as the nominal point size at which we are rendering the font. \n• "font" defines single line spacing as the font\'s built-in line spacing, which can be enormous in fonts with large flourishes. \n• "twice x-height" defines single line spacing as twice the font\'s x-height.',
    type: "categorical",
    default: "nominalSize",
    categories: ["nominalSize", "font", "twiceXHeight", "explicit"],
  },
  readingFont: {
    name: "readingFont",
    availability: "later",
    example: "Arial",
    explanation:
      "Font name, taken from the name of font file, which may include a style. See targetFont for details.",
    type: "text",
    default: "Verdana",
  },
  readingFontSource: {
    name: "readingFontSource",
    availability: "now",
    example: "",
    explanation:
      'Must be file, google, server, or browser. ("server" support is coming.) See targetFontSource for details.',
    type: "categorical",
    default: "browser",
    categories: ["file", "google", "browser"],
  },
  readingFontStyle: {
    name: "readingFontStyle",
    availability: "later",
    example: "bold",
    explanation:
      "Font style: regular, bold, italic, or boldItalic. See targetFontStyle for details.",
    type: "categorical",
    default: "regular",
    categories: ["regular", "bold", "italic", "boldItalic"],
  },
  readingLinesPerPage: {
    name: "readingLinesPerPage",
    availability: "later",
    example: "8",
    explanation: "Number of lines of text per page.",
    type: "numerical",
    default: "8",
  },
  readingMaxCharactersPerLine: {
    name: "readingMaxCharactersPerLine",
    availability: "later",
    example: "57",
    explanation:
      "Used for line breaking. Typographers reckon that text is easiest to read in a column that is 8-10 words wide. Average English word length is 5 characters, so, counting the space between words, that's (8 to 10) *6=(48 to 60) spacings per line. Line breaking without hyphenation will produce an average line length maybe half a word less than the max, so to get an average of 9, we could use a max of 9.5, or 9.5*6=57 spacings.",
    type: "numerical",
    default: "55",
  },
  readingMultipleOfSingleLineSpacing: {
    name: "readingMultipleOfSingleLineSpacing",
    availability: "later",
    example: "1.2",
    explanation:
      'Set the line spacing (measured baseline to baseline) as this multiple of "single" line spacing, which is defined by readingDefineSingleLineSpacingAs. 1.2 is the default in many typography apps, including Adobe inDesign.',
    type: "numerical",
    default: "1.2",
  },
  readingNominalSizeDeg: {
    name: "readingNominalSizeDeg",
    availability: "later",
    example: "3",
    explanation:
      'If readingSetSizeBy is "nominal", then set point size to readingNominalSizeDeg*pixPerDeg.',
    type: "numerical",
    default: "1",
  },
  readingNumberOfPossibleAnswers: {
    name: "readingNumberOfPossibleAnswers",
    availability: "later",
    example: "3",
    explanation:
      "Number of possible answers for each question. Only one of the possible answers is right.",
    type: "integer",
    default: "3",
  },
  readingNumberOfQuestions: {
    name: "readingNumberOfQuestions",
    availability: "later",
    example: "4",
    explanation: "Number of recall questions posed on each trial. ",
    type: "integer",
    default: "3",
  },
  readingPages: {
    name: "readingPages",
    availability: "later",
    example: "5",
    explanation: "Number of pages to be read.",
    type: "numerical",
    default: "4",
  },
  readingSetSizeBy: {
    name: "readingSetSizeBy",
    availability: "later",
    example: "spacing",
    explanation:
      'How do you specify the size of the text to be read?\n• "nominal" will set the point size of the text to readingNominalSizeDeg*pixPerDeg,  \n• "x-height" will adjust text size to achieve the specified x-height (the height of lowercase x),  i.e. readingXHeightDeg. \n• "spacing" will adjust the text size to achieve the specified letter-to-letter readingSpacingDeg.',
    type: "categorical",
    default: "spacing",
    categories: ["nominal", "xHeight", "spacing"],
  },
  readingSingleLineSpacingDeg: {
    name: "readingSingleLineSpacingDeg",
    availability: "later",
    example: "2",
    explanation:
      'Explicit value of "single" line spacing. This is ignored unless readingDefineSingleLineSpacingAs is "explicit".',
    type: "numerical",
    default: "1",
  },
  readingSpacingDeg: {
    name: "readingSpacingDeg",
    availability: "later",
    example: "0.5",
    explanation:
      'If readingSetSizeBy is "spacing", the point size of the text to be read is adjusted to make this the average center-to-center spacing (deg) of neighboring characters in words displayed. Text is displayed with the font\'s default spacing, and the point size is adjusted to achieve the requested average letter spacing.',
    type: "numerical",
    default: "1",
  },
  readingXHeightDeg: {
    name: "readingXHeightDeg",
    availability: "later",
    example: "",
    explanation:
      'If readingSetSizeBy is "x-height", then set point size to to achieve this specified x-height (the height of lowercase x). ',
    type: "numerical",
    default: "1",
  },
  responseAllowedEarlyBool: {
    name: "responseAllowedEarlyBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "When TRUE, the participant can respond at any time after target onset. When FALSE, the participant can only repond after target offset. For demos and debugging, it is handy to set responseAllowedEarlyBool to TRUE with a long targetDurationSec (e.g. 999) so that the stimulus stays up while you examine it, yet you can quickly click through several stimuli to see the progression. ",
    type: "boolean",
    default: "TRUE",
  },
  responseClickedBool: {
    name: "responseClickedBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Allow participant to respond by clicking the target letter in the alphabet. When ready for stimulus, allow clicking fixation instead of hitting SPACE. The various response modes are not exclusive. Enable as many as you like. And simulateParticipantBool can provide responses too.",
    type: "boolean",
    default: "TRUE",
  },
  responseSpokenBool: {
    name: "responseSpokenBool",
    availability: "later",
    example: "FALSE",
    explanation:
      "Allow participant to respond by verbally naming the target. The various response modes are not exclusive. Enable as many as you like.",
    type: "boolean",
    default: "FALSE",
  },
  responseTypedBool: {
    name: "responseTypedBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Allow participant to respond by pressing a key in keyboard. The various response modes are not exclusive. Enable as many as you like. Note: disable typed reponses if you want to force participants to click on fixation as a way tp ensure good fixation when the stimulus is presented. OVERRRIDE: Setting simulateParticipantBool or showGridBool to TRUE enables type as a response method, regardles of the setting of responseTypedBool.",
    type: "boolean",
    default: "FALSE",
  },
  responseTypedEasyEyesKeypadBool: {
    name: "responseTypedEasyEyesKeypadBool",
    availability: "soon",
    example: "FALSE",
    explanation:
      "Allow participant to respond by pressing a key in EasyEyes keypad. The various response modes are not exclusive. Enable as many as you like.",
    type: "boolean",
    default: "FALSE",
  },
  showAlphabetWhere: {
    name: "showAlphabetWhere",
    availability: "now",
    example: "bottom",
    explanation:
      'Can be bottom, top, left, or right. After a trial, this shows the observer the allowed responses. If the target was a letter then the possible letters are called the "alphabet". If the target is a gabor, the alphabet might display all the possible orientations, each labeled by a letter to be pressed.',
    type: "categorical",
    default: "bottom",
    categories: ["none", "bottom", "top", "left", "right"],
  },
  showAlphabetWithLabelsBool: {
    name: "showAlphabetWithLabelsBool",
    availability: "soon",
    example: "FALSE",
    explanation:
      "For foreign or symbol alphabets, we add Roman labels that the observer can type on an ordinary (Roman) keyboard.",
    type: "boolean",
    default: "FALSE",
  },
  showBoundingBoxBool: {
    name: "showBoundingBoxBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "For debugging, setting showBoundingBoxBool TRUE displays the bounding box around the target character (if spacing is ratio) or flanker-target-flanker triplet (if spacing typographic). We show the getBoundingBox method from psychojs, using tight=true. ",
    type: "boolean",
    default: "FALSE",
  },
  showCounterBool: {
    name: "showCounterBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'If TRUE display something like,"Trial 31 of 120. Block 2 of 3. At 32 cm." (The trailing part about distance is included only if showViewingDistanceBool is TRUE.) The trial counter counts all trials in the block, which may have several conditions. If the block has three conditions with 40 blocks each, then there are 120 trials in the block. ',
    type: "boolean",
    default: "TRUE",
  },
  showCounterWhere: {
    name: "showCounterWhere",
    availability: "now",
    example: "bottomRight",
    explanation:
      "Can be bottomLeft, bottomCenter, or bottomRight. This location is used for both the trial count AND the viewing distance. ",
    type: "categorical",
    default: "bottomRight",
    categories: ["bottomLeft", "bottomRight", "bottomCenter"],
  },
  showFixationMarkBool: {
    name: "showFixationMarkBool",
    availability: "later",
    example: "TRUE",
    explanation:
      'Whether or not to show the fixation mark. We don\'t show fixation when we cover a large area of the screen with repeated targets. See "targetRepeatsBool".',
    type: "boolean",
    default: "TRUE",
  },
  showGridsBool: {
    name: "showGridsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'To allow visual checking of location and size, showGridsBool=TRUE requests that the experiment show buttons on the (lower) left of the screen that each turn on and off a different grid over the whole screen. Turning on several buttons shows several grids (in different dark colors). Each grid should be labeled  with numbers and units on the major axes. The "cm" grid has cm units, origin in lower left, thick lines at 5 cm, and regular lines at 1 cm. The "deg" grid has deg units, origin at fixation, thick lines at 5 deg, and regular lines at 1 deg. The "pix" grid has pix units, origin at lower left, thick lines at 500 pix, and regular lines at 100 pix.  Any snapshot should include whatever grids are being displayed.\nSIDE EFFECT: Setting showGridBool to TRUE enables type as a response method, regardles of the setting of responseTypedBool.',
    type: "boolean",
    default: "FALSE",
  },
  showInstructionsWhere: {
    name: "showInstructionsWhere",
    availability: "now",
    example: "topLeft",
    explanation:
      'Can be topLeft or bottomLeft. This is shown after the stimulus disappears, to instruct the participant how to respond. A typical instruction for the identification task is: "While keeping your gaze on the fixation cross, type your best guess for what middle letter was just shown." ',
    type: "categorical",
    default: "topLeft",
    categories: ["none", "topLeft", "bottomLeft"],
  },
  showProgressBarWhere: {
    name: "showProgressBarWhere",
    availability: "later",
    example: "right",
    explanation:
      "Can be none or right. Meant for children. Graphically displays a vertical green bar that tracks the trial count. The outline goes from bottom to top of the screen and it gradually fills up with green liquid, empty at zero trials, and filled to the top after the last trial of the block. Sometimes we call the green liquid spaceship fuel for Jamie the astronaut.",
    type: "categorical",
    default: "none",
    categories: ["none", "right"],
  },
  showViewingDistanceBool: {
    name: "showViewingDistanceBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "If TRUE display something like \"Trial 31 of 120. Block 2 of 3. At 32 cm.\" (The trial and block counters appear only if showCounterBool is TRUE.) Without distance tracking, this is a subtle reminder to the participant of the distance they are supposed to be at. With distance tracking, it allows both the participant and the experimenter to monitor the dynamic viewing distance. It's updated only once or twice per trial, so it's not distracting.",
    type: "boolean",
    default: "FALSE",
  },
  simulateParticipantBool: {
    name: "simulateParticipantBool",
    availability: "now",
    example: "FALSE",
    explanation:
      'Use the software model specifed by "simulationModel" to generale observer responses. The test runs without human intervention. SIDE EFFECT: Setting simulateParticipantBool to TRUE enables type as a response method, regardles of the setting of responseTypedBool.',
    type: "boolean",
    default: "FALSE",
  },
  simulateWithDisplayBool: {
    name: "simulateWithDisplayBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "If true, then display the stimuli as though a participant were present. This is helpful for debugging. If false, then skip display to run as fast as possible.",
    type: "boolean",
    default: "TRUE",
  },
  simulationBeta: {
    name: "simulationBeta",
    availability: "now",
    example: "3",
    explanation: "Used by the Weibull observer model. ",
    type: "numerical",
    default: "2.3",
  },
  simulationDelta: {
    name: "simulationDelta",
    availability: "now",
    example: "0.01",
    explanation: "Used by the Weibull observer model.",
    type: "numerical",
    default: "0.01",
  },
  simulationModel: {
    name: "simulationModel",
    availability: "now",
    example: "blind",
    explanation:
      'For debugging and checking it is often helpful to simulate the observer. "simulationModel" can be: \n• "blind": This model merely presses a random response key. \n• "ideal": This model does the same task as the human, picking the best response given the stimulus. Its threshold is a useful point of reference in analyzing human data. Without noise, it will always be right. Since noise is still months away, for now, just give the right answer.\n• "weibull": This model gets the trial right with a probability given by the Weibull function, which is frequently fit to human data. The QUEST staircase asssumes the Weibull model, so QUEST should accurately measure its (unknown to Quest) threshold, when the respt of the parameters match. https://psychopy.org/api/data.html#psychopy.data.QuestHandler\nIn MATLAB, the Weibull model observer is: \nfunction response=SimulateWeibull(q,tTest,tActual)\n   t=tTest-tActual+q.epsilon;\n   P=q.delta*q.gamma+(1-q.delta)*(1-(1-q.gamma)*exp(-10.^(q.beta*t)));\n   response= P > rand(1);\nend\nresponse=1 means right, and response=0 means wrong. \nP=probability of a correct response\nq is a struct holding all the Weibull parameters. \nq.beta=simulationBeta\nq.delta=simulationDelta\nq.epsilon is set (once) so that P=thresholdProportionCorrect when tTest-tActual=0. \nq.gamma=probability of blindly guessing the correct answer\ntTest is the stimulus intensity level (usually log10 of physical parameter).\ntActual=log10(simulationThreshold) is the true threshold of the simulation\nrand(1) returns a random sample from the uniform distribution from 0 to 1.\nThe source code for our simulation model is here:\nhttps://github.com/EasyEyes/threshold/blob/a9ea5a6c64d3c5ff0aacfc01c86b6a5aecf64369/components/simulatedObserver.js',
    type: "categorical",
    default: "ideal",
    categories: ["blind", "weibull", "ideal"],
  },
  simulationThreshold: {
    name: "simulationThreshold",
    availability: "now",
    example: "0",
    explanation:
      "The actual threshold of the simulated observer in linear units (not log). We test the implementation of Quest by testing how well it estimates simulationThreshold.",
    type: "numerical",
    default: "2",
  },
  snapshotBool: {
    name: "snapshotBool",
    availability: "now",
    example: "FALSE",
    explanation:
      'Requests saving of a full-screen snapshot of every stimulus display. Can we save this to a "snapshots" folder in the participant\'s computer or in the experiment repository? Snapshots are useful for debugging and to illustrate the stimulus in talks and papers. It is expected that taking snapshots will severely degrade timing, so it should not be requested while a participant is being tested. Instead the scientist will pretend to be the participant and collect the images she needs.',
    type: "boolean",
    default: "FALSE",
  },
  spacingDeg: {
    name: "spacingDeg",
    availability: "now",
    example: "",
    explanation:
      "Center-to-center distance from target to inner flanker. Ignored if you're using Quest to measure the spacing threshold.",
    type: "numerical",
    default: "2",
  },
  spacingDirection: {
    name: "spacingDirection",
    availability: "now",
    example: "radial",
    explanation:
      'When eccentricity is nonzero then the direction can be horizontal, vertical, horizontalAndVertical, radial, tangential, or radialAndTangential. When eccentricity is zero then the direction can be horizontal, vertical, or horizontalAndVertical. The "And" options display four flankers, distributed around the target. It is an error to request radial or tangential at eccentricity zero.',
    type: "categorical",
    default: "radial",
    categories: ["radial", "tangential", "horizontal", "vertical", "both"],
  },
  spacingOverSizeRatio: {
    name: "spacingOverSizeRatio",
    availability: "now",
    example: "1.4",
    explanation: "Ignored unless spacingRelationToSize is 'ratio'.",
    type: "numerical",
    default: "1.4",
  },
  spacingRelationToSize: {
    name: "spacingRelationToSize",
    availability: "now",
    example: "ratio",
    explanation:
      'spacingRelationToSize can be none, ratio, or typographic. \nWhen thresholdParameter is "spacing", spacingRelationToSize specifies how size depend on center-to-center target-flanker spacing. And when thresholdParameter is "size", spacingRelationToSize specifies how spacing depend on size. Can be none, ratio, or typographic. \n"none" means no dependence; they are set independently. \n"ratio" means accept the thresholdParameter (which is either size or spacing) and adjusts the other parameter to satisfy the specified "spacingOverSizeRatio". \n"typographic" prints the triplet (flanker, target, flanker) as a (horizontal) string (horizontally) centered on the specified target eccentricity. By "horizontal" and "vertical", we just mean the orientation of the baseline, and orthogonal to it. ("Vertically," the alphabet bounding box is centered on the eccentric location, and all letters in the string are on same baseline.) If thresholdParameter is "size" then EasyEyes adjusts the font size of the string to achieve the specified target size. If thresholdParameter is "spacing" then the font size of string is adjusted so that the width of the string is 3× specified spacing. Works with both left-to-right and right-to-left alphabets. ',
    type: "categorical",
    default: "ratio",
    categories: ["none", "ratio", "typographic"],
  },
  spacingSymmetry: {
    name: "spacingSymmetry",
    availability: "soon",
    example: "linear",
    explanation:
      'spacingSymmetry can be log or linear. When spacing is radial, chooses equal spacing of the outer and inner flanker either on the screen ("linear") or on the cortex ("log"). The log/linear choice makes no difference when the spacingDirection is tangential, or the eccentricity is zero.',
    type: "categorical",
    default: "linear",
    categories: ["log", "linear"],
  },
  targetAlphabet: {
    name: "targetAlphabet",
    availability: "now",
    example: "DHKNORSVZ",
    explanation:
      "A string of unicode characters. On each trial, the target and flankers are randomly drawn from this alphabet, without replacement. Allowed responses are restricted to this alphabet. The other keys on the keyboard are dead. (If keyEscapeBool is true, then we also enable the escape key.)",
    type: "text",
    default: "acenorsuvxz",
  },
  targetBoundingBoxHorizontalAlignment: {
    name: "targetBoundingBoxHorizontalAlignment",
    availability: "now",
    example: "center",
    explanation:
      'When computing the alphabet bounding box as the union of the bounding box of each letter, align the bounding boxes horizontally by "center" or "origin". The bounding boxes are always vertically aligned by baseline.',
    type: "categorical",
    default: "center",
    categories: ["center", "origin"],
  },
  targetContrast: {
    name: "targetContrast",
    availability: "soon",
    example: "-1",
    explanation:
      "Weber contrast ∆L/L0 of a letter or Michelson contrast (LMax-LMin)/(LMax+LMin) of a Gabor. A white letter is 100% contrast; a black letter is -100% contrast. Currently accurate only for 0 and ±1.",
    type: "numerical",
    default: "-1",
  },
  targetDurationSec: {
    name: "targetDurationSec",
    availability: "now",
    example: "0.15",
    explanation:
      "The duration of target presentation. For demos and debugging, it is handy to set responseAllowedEarlyBool to TRUE with a long targetDurationSec (e.g. 999) so that the stimulus stays up while you examine it, yet you can quickly click through several stimuli to see the progression. Set responseAllowedEarlyBool to FALSE if you want to allow response only after target offset.",
    type: "numerical",
    default: "0.15",
  },
  targetEccentricityXDeg: {
    name: "targetEccentricityXDeg",
    availability: "now",
    example: "10",
    explanation:
      "The x location of the target center, relative to fixation. The target center is defined as the center of the bounding box for the letters in the targetAlphabet. (See targetBoundingBoxHorizontalAlignment.)",
    type: "numerical",
    default: "0",
  },
  targetEccentricityYDeg: {
    name: "targetEccentricityYDeg",
    availability: "now",
    example: "0",
    explanation: "The y location of the target center, relative to fixation.",
    type: "numerical",
    default: "0",
  },
  targetFont: {
    name: "targetFont",
    availability: "now",
    example: "Sloan.woff2",
    explanation:
      'targetFont specified what font you want. How you do that depends on targetFontSource:\n\nfile: targetFont is the filename (including the extension: woff2, woff, otf, ttf, or svg) of a font file in your Fonts folder in your Pavlovia account. The compiler will download this file from your Fonts folder to your temporary local Experiment folder, which is later uploaded to a new project repo for this new experiment. (I think we use the javascript version of the @font-face command. The Mozilla page on the @font-face command seems to say that it supports only: woff2, woff, otf, ttf, or svg. https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face)\n\ngoogle:  targetFont is the filename (including extension) of a font file provided by the free Google Font server. We use their API to discover the URL.\n\nserver: targetFont is a URL pointing to the desired font on a font server. Many fonts are served for free by the Google Fonts server.  https://fonts.google.com/  At that website, use "Search for font". Having found your font, select the style you want. In the "Selected Family" pop-up window, click the "@import" button. From within the revealed CSS code, copy the URL from inside the "url(. )". ("server" support is coming.)\n\nbrowser: The experiment will pass the font preference string that you place in targetFont to the participant\'s browser and accept whatever it provides.  Your string can include several font names, separated by commas, first choice first, to help the browser find something close to your intent. This is the usual way to select a font on the web, and never generates an error.  Specify just the family name, like "Verdana", and use the "targetFontStyle" to select italic, bold, or bold-italic. Some "web safe" fonts (e.g. Arial, Verdana, Helvetica, Tahoma, Trebuchet MS, Times New Roman, Georgia, Garamond, Courier New, Brush Script MT) are available in most browsers. In ordinary browsing, it\'s helpful that browsers freely substitute fonts so that you almost always get something readable in the web page you\'re reading. In the scientific study of perception, we usually don\'t want data with a substituted font. So, normally, you should specify "file" or "server" so you\'ll know exactly what was shown to the participant. \n\nFonts load early. We\'ll get the browser to load all needed fonts at the beginning of the experiment, so the rest of the experiment can run without internet or font-loading delay. ',
    type: "text",
    default: "RobotoMono-Regular.woff2",
  },
  targetFontSource: {
    name: "targetFontSource",
    availability: "now",
    example: "file",
    explanation:
      'targetFontSource must be file, google, server, or browser. Browsers happily substitute for unavailable fonts. That\'s great for the web, but bad for perception experiments, so we encourage you to provide access to a specific font, either as a file or on a font server. For each condition that has targetFontSource "file", the compiler checks for presence of the targetFont in your Fonts folder (in your Pavlovia account). That folder is persistent, and you can add more fonts to it at any time, through the EasyEyes.app/threshold page. Any popular font format will work, but to minimize transmission time, we recommend minimizing file size by using a highly compressed webfont file format, indicated by the extension woff2. \n\nfile: targetFont contains the filename (with extension) of a file in the Fonts folder in the EasyEyesResources repository in your Pavlovia account. This is checked by the compiler, to avoid runtime surprises. \n\ngoogle: targetFont contains the font name as recognized by the Google Fonts server.\n\nserver: targetFont contains the URL of the font on a font server. ("server" support is coming.)\n\nbrowser: targetFont is a font-preference string that is passed to the participant\'s browser. This never produces an error; we accept whatever font the browser chooses. Your font string can include several font names, separated by commas, to help the browser find something close to your intent. This is the usual way to select a font on the web, and never generates an error. (We don\'t know any quick way to discover what font the browser chose, so the scientist will never know.) ',
    type: "categorical",
    default: "file",
    categories: ["file", "google", "browser"],
  },
  targetFontStyle: {
    name: "targetFontStyle",
    availability: "later",
    example: "bold",
    explanation:
      'Can be regular (default), bold, italic, or bold-italic. \n• If targetFont is a file name that already specifies the style you want, then don\'t specify a style here. Just leave targetFontStyle as default. Otherwise the participant\'s browser might try to "helpfully" synthesize the new style by tilting or thickening what the font file renders. It\'s safer to switch to the font file whose name specifies the style you want. \n• Alternatively, if targetFontSource is "browser", and targetFont specifies only a font family name (e.g. Verdana), or several (e.g. Verdana;Arial), then you can use targetFontStyle to select among the four standard styles.',
    type: "categorical",
    default: "regular",
    categories: ["regular", "bold", "italic", "boldItalic"],
  },
  targetFontVariationSettings: {
    name: "targetFontVariationSettings",
    availability: "later",
    example: ' "\\"wght\\" 550, \\"ital\\" 6"',
    explanation:
      "To control a variable font, this parameter accepts a string to be assigned like this: \nmyText.style.fontVariationSettings = targetFontVariationSettings\nYou can set all the axes at once. Any axis you don't set will be set to its default. Every axis has a four-character name. Standard axes have lowercase names, e.g. 'wght'. Novel axes have ALL-UPPERCASE names. To discover your variable font's axes of variation, and their allowed ranges, try this web page:\nhttps://fontgauntlet.com/\nFor an introduction to variable fonts:\nhttps://abcdinamo.com/news/using-variable-fonts-on-the-web",
    type: "text",
    default: "",
  },
  targetFontWeight: {
    name: "targetFontWeight",
    availability: "later",
    example: "550",
    explanation:
      "To control a variable font, accepts a numerical value to be assigned like this: \nmyText.style.fontWeight = targetFontWeight\nNOTE: If you use this parameter, then EasyEyes will flag an error if it determines that the targetFont is not a variable font.\nhttps://abcdinamo.com/news/using-variable-fonts-on-the-web",
    type: "numerical",
    default: "NaN",
  },
  targetKind: {
    name: "targetKind",
    availability: "now",
    example: "letter",
    explanation:
      '• "letter" On each trial, the target is a randomly selected character from the targetAlphabet displayed in the specified targetFont and targetStyle.\n• A "gabor" (named after Dennis Gabor inventor of the laser) is the product of a Gaussian and a sinewave. As a function of space, the sinewave produces a grating, and the Gaussain vignettes it to a specific area, without introducing edges. Gabors are a popular stimulus in vision research because they have compact frequency and location.',
    type: "categorical",
    default: "letter",
    categories: ["letter", "gabor"],
  },
  targetMinimumPix: {
    name: "targetMinimumPix",
    availability: "now",
    example: "8",
    explanation:
      "Enough pixels for decent rendering of this target. This refers to size (in pixels) as specified by targetSizeIsHeightBool.",
    type: "numerical",
    default: "8",
  },
  targetRepeatsBool: {
    name: "targetRepeatsBool",
    availability: "later",
    example: "FALSE",
    explanation:
      'Display many copies of two targets, alternating across the screen. The observer reports both. Thus each presentation gets two responses, which count as two trials. David Regan and colleagues (1992) reported that in testing foveal acuity of patients with poor fixation (e.g. nystagmus) it helps to have a "repeat-letter format" eye chart covered with letters of the same size, so that no matter where the eye lands, performance is determined by the letter nearest to the point of fixation, where acuity is best. We here extend that idea to crowding. We cover some part of the screen with an alternating pattern of two letters, like a checkerboard, so that the letters can crowd each other, and ask the observer to report both letters. Again, we expect performance to be determined by the letters nearest to the (unpredictable) point of fixation, where crowding distance is least.',
    type: "boolean",
    default: "FALSE",
  },
  targetRepeatsBorderCharacter: {
    name: "targetRepeatsBorderCharacter",
    availability: "later",
    example: "$",
    explanation:
      "When targetRepeatsBool we use this character to create an outer border.",
    type: "text",
    default: "$",
  },
  targetRepeatsMaxLines: {
    name: "targetRepeatsMaxLines",
    availability: "later",
    example: "3",
    explanation: "Can be 1, 3, 4, … . Sarah Waugh recommends 3.",
    type: "numerical",
    default: "3",
  },
  targetRepeatsPracticeBool: {
    name: "targetRepeatsPracticeBool",
    availability: "later",
    example: "TRUE",
    explanation:
      "If targetRepeatsBool then precedes data collection by practice, as explained in note below.",
    type: "boolean",
    default: "TRUE",
  },
  targetSizeDeg: {
    name: "targetSizeDeg",
    availability: "now",
    example: "NaN",
    explanation:
      "Ignored unless needed. Size is either height or width, as defined below. Height and width are based on the union of the bounding boxes of all the letters in the alphabet. ",
    type: "numerical",
    default: "2",
  },
  targetSizeIsHeightBool: {
    name: "targetSizeIsHeightBool",
    availability: "now",
    example: "FALSE",
    explanation: 'Define "size" as height (true) or width (false).',
    type: "boolean",
    default: "TRUE",
  },
  targetTask: {
    name: "targetTask",
    availability: "now",
    example: "identify",
    explanation:
      'The participant\'s task:\n• "identify" is forced choice categorization of the target among known possibilities, e.g. a letter from an alphabet or an orientation among several. \n• "read" asks the observer to read a passage of text as quickly as possible while maintaining full comprehesion, followed by a test.\n• "detect" might be added later. In yes-no detection, we simply ask "Did you see the target?". In two-alternative forced choice detection, we might display two intervals, only one of which contained the target, and ask the observer which interval had the target: 1 or 2? We rarely use detection because it needs many more trials to measure a threshold because its guessing rate is 50%, whereas identifying one of N targets has a guessing rate of only 1/N.',
    type: "categorical",
    default: "identify",
    categories: ["identify", "read"],
  },
  thresholdBeta: {
    name: "thresholdBeta",
    availability: "now",
    example: "2.3",
    explanation:
      "Used by QUEST. The steepness parameter of the Weibull psychometric function.",
    type: "numerical",
    default: "2.3",
  },
  thresholdDelta: {
    name: "thresholdDelta",
    availability: "now",
    example: "0.01",
    explanation:
      "Used by QUEST. Set the asymptote of the Weibull psychometric function to 1-delta.",
    type: "numerical",
    default: "0.01",
  },
  thresholdGuess: {
    name: "thresholdGuess",
    availability: "now",
    example: "2",
    explanation:
      "Used to prime QUEST by providing a prior PDF, which is specified as a Gaussian as a function of the log threshold parameter. Its mean is the log of your guess, and its SD (in log units) is specifed below . We typically take our guess from our standard formulas for size and spacing threshold as a function of eccentricity.",
    type: "numerical",
    default: "NaN",
  },
  thresholdGuessLogSd: {
    name: "thresholdGuessLogSd",
    availability: "now",
    example: "2",
    explanation:
      "Used by QUEST. Sets the standard deviation of the prior PDF as a function of log of the threshold parameter.",
    type: "numerical",
    default: "2",
  },
  thresholdParameter: {
    name: "thresholdParameter",
    availability: "now",
    example: "spacing",
    explanation:
      'The designated parameter (e.g. size or spacing) will be controlled by Quest to find the threshold at which criterion performance is attained.  \n• "spacing" to vary center-to-center spacing of target and neighboring flankers. \n• "size" to vary target size. \n• "contrast" to be added in September.\n• "eccentricity"  to be added in September.',
    type: "categorical",
    default: "spacing",
    categories: ["spacing", "size"],
  },
  thresholdProcedure: {
    name: "thresholdProcedure",
    availability: "now",
    example: "QUEST",
    explanation:
      'Can be QUEST or none. We may add Fechner\'s "method of constant stimuli". Note that when rendering we restrict the threshold parameter to values that can be rendered without artifact, i.e. not too small to have enough pixels to avoid jaggies and not too big for target (and flankers in spacing threshold) to fit entirely on screen. The response returned to QUEST is accompanied by the true value of the threshold parameter, regardless of what QUEST suggested.',
    type: "categorical",
    default: "QUEST",
    categories: ["none", "QUEST"],
  },
  thresholdProportionCorrect: {
    name: "thresholdProportionCorrect",
    availability: "now",
    example: "0.7",
    explanation:
      'Used by QUEST, which calls it "pThreshold". This is the threshold criterion. In Methods you might say that "We defined threshold as the intensity at which the participant attained 70% correct." This corresponds to setting thresholdProportionCorrect to 0.7.\nPsychoJS code:\nhttps://github.com/kurokida/jsQUEST/blob/main/src/jsQUEST.js\nhttps://github.com/psychopy/psychojs/blob/2021.3.0/src/data/QuestHandler.js',
    type: "numerical",
    default: "0.7",
  },
  thresholdRepeatBadBlockBool: {
    name: "thresholdRepeatBadBlockBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'If true, and this condition\'s threshold is "bad" (see below), then the block will be run again (only once even if again bad). The criterion for "bad" is that QuestSD>0.25. Several conditions in a block may make this request and be bad, but we still repeat the block only once. When we add a block, we should adjust the trial/block counter to reflect the change. (The 0.25 criterion is right for 35 trials, beta=2.3, and many possible targets. Later i\'ll write a more general formula and provide a way for the scientist to specify an arbitrary criterion value of QuestSD.)',
    type: "boolean",
    default: "FALSE",
  },
  viewingDistanceAllowedRatio: {
    name: "viewingDistanceAllowedRatio",
    availability: "now",
    example: "1.3",
    explanation:
      "viewingDistanceAllowedRatio must be larger or smaller than 1, and must be in the range [0 inf]. If the specified tolerance ratio is R, then the ratio of actual to desired viewing distance must be in the range 1/R to R. Enforcement is only possible when viewing distance is tracked. In that case, testing is paused while viewing distance is outside the allowed range, and the participant is encouraged to move in or out, as appropriate, toward the desired viewing distance. Values of 0, inf, and NaN all have the same effect, of allowing all viewing distances. [Actually CSV and Excel files do not allow Inf.]",
    type: "numerical",
    default: "1.2",
  },
  viewingDistanceDesiredCm: {
    name: "viewingDistanceDesiredCm",
    availability: "now",
    example: "45",
    explanation:
      "At the beginning of the block, we encourage the participant to adjust their viewing distance (moving head or display) to approximate the desired viewing distance. If head tracking is enabled, then stimulus generation will be based on the actual viewing distance of each trial. Without head tracking, we estimate the viewing distance at the beginning of the experiment, and later again at the beginning of any new block with a different desired viewing distance. All conditions within a block must have the same desired viewing distance.\n     The viewing-distance nudger (Closer! Farther!) is working fine at getting the participant to the right distance, but we need to cancel any trials in which the stimulus was obscured by nudging. We have a three-period solution, that is being introduced in two stages. First we describe the ideal scheme that is our goal. Period A. From time of response to the previous trial (click or keypress) until the participant requests a new trial (space bar or click on crosshair) we allow nudging and the rest of our software ignores it. Period B. From the participant's request for a new trial (space bar or click on crosshair) until the end of the stimulus we also allow nudging, but any nudge cancels the trial. Period C. From the end of the stimulus until the observer responds we suspend nudging (so the nudge won't interfere with remembering the target). Once a trial has been canceled we do NOT wait for a response. Instead, we proceed directly to draw the crosshair for the next trial. Canceling a trial is not trivial. We need to put this trial's condition back into the list of conditions to be run, and that list needs to be reshuffled, so the participant won't know what the next trial will be. I suppose that what happened will be obvious to the participant, so we don't need to explain that the trial was canceled. I see two stages of implementation. First the trial software needs to provide and update two flags: nudgingAllowedBool and nudgingCancelsTrialBool. I'm not sure that the current version of MultistairHandler will cope with trial cancelation. For now, the trial software sets nudgingAllowedBool to TRUE only during period A, and sets nudgingCancelsTrialBool to always be FALSE. Once we know how to cancel a trial, during period B we'll set both nudgingAllowedBool and nudgingCancelsTrialBool to TRUE. ",
    type: "numerical",
    default: "40",
  },
  wirelessKeyboardNeededBool: {
    name: "wirelessKeyboardNeededBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "Needed at viewing distances beyond 60 cm. Could be commercial wireless keyboard or EasyEyes keypad emulator running on any smartphone. ",
    type: "boolean",
    default: "FALSE",
  },
};
