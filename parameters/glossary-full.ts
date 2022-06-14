/*
  Do not modify this file! Run npm `npm run glossary` at ROOT of this project to fetch from the Google Sheets.
  https://docs.google.com/spreadsheets/d/1x65NjykMm-XUOz98Eu_oo6ON2xspm_h0Q0M2u6UGtug/edit#gid=1287694458 
*/

interface GlossaryFullItem {
  [field: string]: string | string[];
}

export const GLOSSARY: GlossaryFullItem[] = [
  {
    name: "_about",
    availability: "now",
    example: "Effect of font on crowding.",
    explanation:
      "Optional, brief description of the whole experiment. Ignored by EasyEyes, but saved with results. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_authorEmails",
    availability: "now",
    example: "dp3@nyu.edu",
    explanation:
      "Optional, semicolon-separated email addresses of the authors.  The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_authors",
    availability: "now",
    example: "Denis Pelli",
    explanation:
      "Optional, names of all the authors, separated by semicolons. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must all be empty.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_compatibleBrowser",
    availability: "now",
    example: "Chrome",
    explanation:
      '_compatibleBrowser is a comma-separated list either of compatible browsers or of incompatible browsers. The list can be \'all\', or just compatible browsers by name, or just incompatible browsers each preceded by "not". No mixing allowed. If compatible, then anything not listed is deemed incompatible. If incompatible, then anything not listed is deemed compatible. If the particiapant\'s device is incompatible, we reject by issuing a fatal explanatory error message to the participant (asking Prolific participants to "return" this study), which ends the session before asking for consent. ',
    type: "multicategorical",
    default: "Chrome",
    categories:
      "all, Chrome, Safari, Firefox, Opera, Edge, Chromium, Tor, Duckduckgo, Brave, Vivaldi, Midori, SamsungInternet, UCBrowser, Android, Firefox, QQBrowser, Instabridge, WhaleBrowser, Puffin, YandexBrowser, EdgeLegacy, Edge, CocCoc, notChrome, notSafari, notFirefox, notOpera, notEdge, notChromium, notTor, notDuckduckgo, notBrave, notVivaldi, notMidori, notSamsungInternet, notUCBrowser, notAndroid, notFirefox, notQQBrowser, notInstabridge, notWhaleBrowser, notPuffin, notYandexBrowser, notEdgeLegacy, notEdge, notCocCoc",
  },
  {
    name: "_compatibleBrowserVersionMinimum",
    availability: "now",
    example: "100",
    explanation:
      "_compatibleBrowserMinimumVersion is the minimum integer version number of the browser for compatibility. The default is zero.",
    type: "integer",
    default: "0",
    categories: "",
  },
  {
    name: "_compatibleDeviceType",
    availability: "now",
    example: "desktop",
    explanation:
      '_compatibleDeviceType is a comma-separated list of compatible devices types.  Anything not listed is deemed incompatible. If incompatible, we reject by issuing a fatal explanatory error message to the participant (asking Prolific participants to "return" this study), which ends the session before asking for consent. ',
    type: "multicategorical",
    default: "desktop",
    categories: "desktop, tablet, mobile",
  },
  {
    name: "_compatibleOperatingSystem",
    availability: "now",
    example: "macOS,Windows",
    explanation:
      "_compatibleOperatingSystem is a comma-separated list either of compatible or incompatible operating systems. The list can be 'all', or compatible OSes by name, or incompatible OSes each preceded by \"not\". No mixing allowed. The default is 'all'. If compatible, then anything not listed is deemed incompatible. If incompatible, then anything not listed is deemed compatible. If not compatible, we reject by issuing a fatal explanatory error message to the participant (asking Prolific participants to \"return\" this study), which ends the session before asking for consent. ",
    type: "multicategorical",
    default: "all",
    categories:
      "all, macOS, Windows, ChromeOS, ChromiumOS, AndroidOS, iOS, SamsungOS, KaiOS, NokiaOS, Series40OS, Linux, Ubuntu, FreeBSD, Debian, Fedora, Solaris, CentOS, Deepin, notmacOS, notWindows, notChromeOS, notChromiumOS, notAndroidOS, notiOS, notSamsungOS, notKaiOS, notNokiaOS, notSeries40OS, notLinux, notUbuntu, notFreeBSD, notDebian, notFedora, notSolaris, notCentOS, notDeepin",
  },
  {
    name: "_compatibleProcessorCoresMinimum",
    availability: "now",
    example: "6",
    explanation:
      "_compatibleProcessorCoresMinimum is a positive integer. It's value is returned by all modern browsers except Safari. For Safari, we estimate its value by doubling and rounding the speed of generating random numbers (in MHz). https://en.wikipedia.org/wiki/Multi-core_processor ",
    type: "integer",
    default: "6",
    categories: "",
  },
  {
    name: "_compileAsNewExperimentBool",
    availability: "now",
    example: "",
    explanation:
      "NOT YET IMPLEMENTED. _compileAsNewExperimentBool (default TRUE) can be set to FALSE to accommodate users without institutional Pavlovia licenses. When TRUE, when you compile an experiment, EasyEyes appends the smallest possible integer (no less than 1) that creates an unused (unique) experiment name. That keeps versions apart, and keeps the data from each version in its own repository. However, for users who need tokens, Pavlovia requires that tokens be assigned to a specific experiment (repo). For them, every time we change the repo name, they must visit Pavlovia to reassign tokens. They might prefer to reuse the old repo, instead of creating a new repo every time they compile. The downside is that if you collect data, edit the table, and collect more data, the datafiles will all be together in the same repo, distinguished only by date. When _compileAsNewExperimentBool is FALSE, scientists need to shift tokens only the first time they compile (when it's a new repo). Once it has tokens, provided the name of the spreadsheet file is unchanged, they can keep testing, through countless compiles, without visiting pavlovia, until the experiment runs out of tokens. Alas, this flag won't help PILOTING mode, which can only be used from within Pavlovia. Some users might like _compileAsNewExperimentBool FALSE to avoid the huge proliferation of repos. ",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_consentForm",
    availability: "now",
    example: "adultConsent2021.pdf",
    explanation:
      "_consentForm is the file name of your PDF (or plain-text Markdown with extension MD) consent document in the folder EasyEyesResources/ConsentForms/ in your Pavlovia account. The EasyEyes.app/threshold page makes it easy to upload your consent form(s) to that folder. When checking your experiment table, the compiler will check that a file with this name is present in your EasyEyesResources/ConsentForms folder on Pavlovia. See consent in Scientific Glossary for information about testing minors and children. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_daisyChainURLAfterEasyEyes",
    availability: "now",
    example: "http://xyz?cc=123",
    explanation:
      "A URL (with query parameters) that will add to a daisy chain of testing apps. This single or cascade of URLs will run after the EasyEyes study. Typically the last step is the completion page in Prolific (or MTurk), coding the participant as eligible for payment. The study URL returned by EasyEyes will run the whole cascade, including URLBeforeEasyEyes, the EasyEyes study, and URLAfterEasyEyes. Daisy chaining suggested by Becca Hirst at Open Science Tools. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_daisyChainURLBeforeEasyEyes",
    availability: "now",
    example: "http://xyz?cc=123",
    explanation:
      "A URL (with query parameters) that will begin a daisy chain of testing apps. This single or cascade of URLs will run first, before the EasyEyes study. Typically the last step is the completion page in Prolific (or MTurk), signaling the participant's eligibility for payment. The study URL returned by EasyEyes will run the whole cascade, including URLBeforeEasyEyes, the EasyEyes study, and URLAfterEasyEyes. Thanks to Becca Hirst at Open Science Tools for suggesting daisy chaining.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_dateCreated",
    availability: "now",
    example: "8/1/2021",
    explanation:
      "Optional date of creation. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "date",
    default: "NaN",
    categories: "",
  },
  {
    name: "_dateModified",
    availability: "now",
    example: "8/15/2021",
    explanation:
      "Optional date of latest modification. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "date",
    default: "NaN",
    categories: "",
  },
  {
    name: "_debriefForm",
    availability: "now",
    example: "debrief2021.pdf",
    explanation:
      "The file name of your PDF (or plain-text Markdown with extension MD) debrief document in the folder EasyEyesResources/ConsentForms/ in your Pavlovia account. The EasyEyes.app/threshold page makes it easy to upload your debrief form(s) to that folder. The compiler will check that a file with this name is present in your EasyEyesResources/ConsentForms folder on Pavlovia. See consent in Glossary for information about testing minors and children. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_experimentFilename",
    availability: "now",
    example: "crowding.csv",
    explanation:
      "_experimentFilename is the filename of the experiment table. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_experimentName",
    availability: "now",
    example: "crowding",
    explanation:
      '_experimentName specifies the name for the GitLab repository, which Pavlovia calls your "experiment". If empty, the compiler provides a default, which is the the table filename (without extension) plus the smallest integer greater than zero that results in an unused repo name in your Pavlovia account. Note that if the specified name corresponds to an existing repository, EasyEyes uses it, and new study files will replace old ones and results will accumulate. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_invitePartingCommentsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "At the end of the experiment, invite the participant to make parting comments. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_participantDurationMinutes",
    availability: "now",
    example: "30",
    explanation:
      "Expected duration, in minutes, in the offer to participants. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "numerical",
    default: "30",
    categories: "",
  },
  {
    name: "_participantIDGetBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Multi-session experiments require a way to link a participant's several sessions. When _participantIDGetBool is TRUE, we ask the participant to provide their EasyEyesID from a previous session. To facilitate this, EasyEyes checks for the most recent EasyEyesID cookie, and, if found, offers it to the participant for approval. The participant can approve this (if found), or select an EasyEyesID file from the computer's disk, or type in an EasyEyesID. If EasyEyes cannot get an approved EasyEyesID, it exits the experiment. A participant who moves from one computer to another during the experiment should take an EasyEyesID file with them, or write down the EasyEyesID. Also see _participantIDPutBool below.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_participantIDPutBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "EasyEyes always saves an EasyEyesID cookie in browser local storage (which can get lost when participants clear browsing history etc.). If _participantIDPutBool is TRUE, then an EasyEyesID text file is also saved in the Download Folder of the  participant's computer. Also see _participantIDGetBool above.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_participantPay",
    availability: "now",
    example: "7.5",
    explanation:
      "Payment to offer to each participant. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "numerical",
    default: "7.5",
    categories: "",
  },
  {
    name: "_participantPayCurrency",
    availability: "now",
    example: "USDollar",
    explanation:
      "Currency of payment amount: USDollar, Euro, etc. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "categorical",
    default: "USDollar",
    categories: "USDollar, Euro, UKPound",
  },
  {
    name: "_participantRecruitmentService",
    availability: "now",
    example: "Prolific",
    explanation:
      'Name of recruitment service: none, Prolific, SONA, MTurk.  The key idea is two URLs that carry parameters. The Study URL (a link to our experiment) carries parameters provided by the recruitment service (e.g. Prolific). The Completion URL (a link to the completion page of the recruitment service) carries the completion code certifying that the participant completed the study. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.\nnone - Just produce a study URL.\nProlific - integrate with Prolific as suggested by the PsychoPy manual. https://www.psychopy.org/online/prolificIntegration.html\nMTurk - currently equivalent to "none".\nSONA - currenlty equivalent to "none".',
    type: "categorical",
    default: "none",
    categories: "none, Prolific, MTurk, SONA",
  },
  {
    name: "_participantRecruitmentServiceAccount",
    availability: "soon",
    example: "123ABC",
    explanation:
      "Account number. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_participantsHowMany",
    availability: "soon",
    example: "20",
    explanation:
      "Number of people you want to test. The leading underscore makes the pre-processor copy the value from the first condition to the rest, which must be empty.",
    type: "integer",
    default: "1",
    categories: "",
  },
  {
    name: "_pavloviaPreferRunningModeBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "Setting _pavloviaPreferRunningModeBool TRUE (the default) streamlines the use of Pavlovia's RUNNING mode, and setting it FALSE streamlines the use of Pavlovia's PILOTING mode. _pavloviaPreferRunningModeBool helps EasyEyes anticipate your preference in optimizing the EasyEyes user interface. EasyEyes uses a Pavlovia repository to hold your experiment. Pavlovia offers two modes for running your experiment, PILOTING and RUNNING. PILOTING mode is free, but can only be run directly from the Pavlovia dashboard, and cannot be deployed to anywhere else. RUNNING mode costs 20 pence per participant (this fee is waived if your instititution has a site license), and you get a URL for your study that you can deploy to anyone. It is our guess that most EasyEyes users (like current Pavlovia users) will belong to institutions with Pavlovia site licenses, and thus have no usage fee. For most users, we suggest letting _pavloviaPreferRunningModeBool be TRUE (the default) to streamline the EasyEyes scientist page for RUNNING mode. When _pavloviaPreferRunningModeBool is TRUE, you just submit your table to the EasyEyes compiiler to receive your study URL, with no more clicks. That includes setting your experiment to RUNNING mode in Pavlovia. If _pavloviaPreferRunningModeBool is FALSE, then your experiment remains in the INACTIVE mode, waiting for you to click the \"Go to Pavlovia\" button, where you'll use the Pavlovia dashboard to set your experiment to PILOTING mode and run it. If your experiment is already in RUNNING mode you can still convert to PILOTING mode. Thus _pavloviaPreferRunningModeBool doesn't close any doors; it just streamlines use of your usually preferred mode.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_prolificEligibilityRequirements",
    availability: "soon",
    example: "",
    explanation:
      "This Prolific page shows some of their prescreening options: \nhttps://researcher-help.prolific.co/hc/en-gb/articles/360009221093-How-do-I-use-Prolific-s-demographic-prescreening-\nThe Prolific API is still in the beta stage of development. To specify eligibility requirements through the API, they say to contact Prolific at integrations@prolific.co. We have written to Prolific and we will enhance this when they tell us how to. https://prolificapi.docs.apiary.io/",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_prolificProjectID",
    availability: "now",
    example: "",
    explanation:
      "The scientist must know, or guess, whether Prolific is in Workspace mode or not. If your experiment table includes a _prolificProjectID number then EasyEyes will use it and call Prolific in workspace mode. If _prolificProjectID is empty or absent, then EasyEyes will call Prolific in pre-workspace mode. Note that Prolific is locked into one mode or the other. (Prolific can be switched into Workspace mode, but can never be switched back to pre-Workspace mode.) If we call Prolific in the wrong mode, the call fails to transfer vital information for our study. Currently EasyEyes can't tell what mode Prolific is in, and expects the scientist to know and to include, or not include, the _prolificProjectID accordingly. So if you arrive in Prolific, and find Prolific ignorant of our study, you probably guessed wrong about Prolific's mode. It's easy to tell Prolific's mode while you're in it. The scientist can run all studies with the same _prolificProjectID, or have several projects and choose the right one for each study. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_prolificStudyType",
    availability: "soon",
    example: "US_REP_SAMPLE",
    explanation:
      "Can be UK_REP_SAMPLE, US_REP_SAMPLE, or SINGLE. This is a field in the Prolific API for recruiting participants. There are two types of study:\n• Representative sample: UK_REP_SAMPLE or US_REP_SAMPLE\n• Normal study: SINGLE",
    type: "categorical",
    default: "US_REP_SAMPLE",
    categories: "UK_REP_SAMPLE, US_REP_SAMPLE, SINGLE",
  },
  {
    name: "_zeroBasedNumberingBool",
    availability: "soon",
    example: "FALSE",
    explanation:
      "NOT YET IMPLEMENTED. If true then the first block and condition are numbered 0, otherwise 1.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "block",
    availability: "now",
    example: "1",
    explanation:
      "The block number. The first condition (second column) must have a block number of 0 or 1, consistent with zeroBasedNumberingBool. After the first condition, each successive condition (column) must have the same block number as the one preceding it, or increased by +1.",
    type: "integer",
    default: "1",
    categories: "",
  },
  {
    name: "calibrateBlindSpotBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'Initial measurement of viewing distance by mapping the blind spot, as suggested by the Li et al. (2020) "Virtual chinrest" paper, enhanced by flickering the target and manual control of target position.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateDistanceCheckBool",
    availability: "now",
    example: "FALSE",
    explanation:
      'When TRUE, requests checking of the calibrator by the participant, provided they have a tape measure, meter stick, or yard stick, or failing that, a ruler. After each size or distance calibration, if calibrationDistanceCheckBool=TRUE, then we will ask the participant if they have an appropriate measuring device (ideally a tape measure, meter stick, or yard stick; a 12" or 30 cm ruler could be used if we exclude long distances), and, if so, how long is it, and what are its units: decimal cm, decimal inches, fractional inches. If no device, then we skip the rest of the calibrations that need a measuring device. In our instructions, we can say "Use your ruler, stick, or tape to measure this." When receiving fractional inches we could either accept a string like "16 3/16" or we could have three fields that each accept an integer, and allow the user to tab from field to field: "?? ??/??". The last number must be 2, 4, 8, 16, or 32. For round numbers, the numerator will be zero. After measuring screen size, we can ask them to use their ruler, stick, or tape to measure screen width. We can display a huge double headed arrow from left edge to right edge. After measuring viewing distance we can ask them to use ruler, stick, or tape to create three exact viewing distances that we then use the webcam to measure. We can request 12, 24, or 36 inches, or 30, 60, or 90 cm. (These are round numbers, not exactly equivalent.) \n     We have two ways of measuring viewing distance and I’d like to evaluate both. Our current scheme with the calibrator is to have a Boolean parameter for each calibration. We should have separate parameters for the two methods of measuring viewing distance so scientists can select none, either, or both. It would be interesting to compare the two estimates (direct vs indirect) of pupillary distance. We should always save the pupillary distance with the data. We can compare our population distribution with the textbook distribution. It might be an elegant check on our biometrics. \n     We could test people on Prolific and mention in our job description that they must have a tape measure, meter stick or yard stick.  Readers of our article will like seeing data from 100 people online plus 10 experienced in-house participants. I think this will create confidence in the calibrations. For scientists that’s crucial.\n',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateFrameRateUnderStressBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "calbrateFrameRateUnderStressBool asks the Remote Calibrator (which runs at beginning of the experiment) to run a several-second-long test of graphics speed. The test is run if any condition requests it, and is only run once, regardless of the number of requests. This value is reported by the output parameter frameRateUnderStress in the CSV data file.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateGazeCheckBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "To check gaze tracking we don’t need a measuring device, and hardly any instructions. I think we could just put up our fixation cross in a few random places and ask them to click on it. It will be very similar to the training and we don’t need to tell the participant that we progressed from training to checking.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateScreenSizeBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "calibrateScreenSizeBool asks the Remote Calibrator (which runs at beginning of the experiment) to get the participant's help to measure the screen size. Adjust the screen image of a common object of known size to match, to determine the size in cm of the participant's screen. Thanks to Li et al. 2020.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "calibrateScreenSizeCheckBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Ask the participant to use a ruler, yardstick, meter stick, or tape measure to measure the distance directly to assess accuracy.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateSoundLevelBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Requests sound calibration, using the participant's iPhone. Early exit if no iPhone is available.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateTrackDistanceBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Use this to turn EasyEyes distance tracking on and off. Before tracking can begin you must make an initial calibration of distance, either by easyEyesBlindSpotBool or easyEyesPupilDistanceBool, or both. Distance tracking uses the webcam to monitor position of the participant's head. It ignores where you're looking. The head is not a point, of course. Since this is for vision research, the point we estimate is the midpoint between the two eyes. That point is sometimes called cyclopean, referring to the mythical one-eyed Cyclops in Homer's Odyssey. From each webcam image we extract: 1. the viewing distance, from the midpoint (between the two eyes) to the screen, and 2. the near point, which is the point in the plane of the screen that is closest to the midpoint between the eyes. When rendering visual stimulus specified in deg, it is necessary to take the viewing distance (and near point) into account. The location of the near point is important at large eccentricities (over 10 deg) and is usually safely ignored at small eccentricities (less than 10 deg).",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateTrackGazeBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "Use this to turn EasyEyes gaze tracking on and off. It must be calibrated before use. Gaze tracking uses the built-in webcam to monitor where the participant's eyes are looking. To be clear, in gaze tracking, the webcam looks at your eyes to figure out where on the screen your eyes are looking. It estimates that screen location. Gaze-contingent experiments change the display based on where the participant is looking. Peripheral vision experiments typically require good fixation and may discard trials for which fixation was too far from the fixation mark. Precision is low, with a typical error of 4 deg at 50 cm. We expect the error, in deg, to be proportional to viewing distance.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateTrackNearPointBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "Initial measurement of the pupillary distance to later estimate near point.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "conditionGroup",
    availability: "later",
    example: "1",
    explanation:
      '"conditionGroup" imposes consistent screen markings across a set of conditions. Screen markings before and during stimulus presentation indicate the positions of the fixation and possible targets. There are many parameters, below, whose names begin with "marking" that allow you to customize markings.  Within a block, all conditions with the same nonzero conditionGroup number are presented with the same markings (fixation cross, target X) to avoid giving any clue as to which of the possible targets will appear on this trial. Thus, one can implement uncertainty among any specified set of targets simply by creating a condition for each target, and giving all the conditions the same nonzero conditionGroup number. There can be any number of conditions in a conditionGroup, and there can be any number of condition groups in a block. Every condition belongs to a condition group. A condition with a zero or unique conditionGroup number belongs to a condition group with just that condition.',
    type: "integer",
    default: "0",
    categories: "",
  },
  {
    name: "conditionName",
    availability: "now",
    example: "Crowding",
    explanation:
      "Use this to label your condition to help guide your subsequent data analysis. Not used by EasyEyes.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "conditionTrials",
    availability: "now",
    example: "40",
    explanation:
      "Number of trials of this condition to run in this block. They are all randomly interleaved. Each condition can have a different number of trials. ",
    type: "integer",
    default: "35",
    categories: "",
  },
  {
    name: "fixationCheckBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "Display a foveal triplet that is easy to read if the participant's eye is on fixation, and hard to read if the eye is elsewhere.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "fixationLocationStrategy",
    availability: "now",
    example: "centerFixation",
    explanation:
      "fixationLocationStrategy specifies the strategy by which EasyEyes places the fixation point, which is the origin of the visual coordinate system. Most experimenters will choose centerFixation, the default, which simply places fixation at the center of the screen. But for peripheral testing you might choose  asSpecified and put fixation near one edge of the display to maximize the eccentricity of a target at the opposite edge. Fixation, whether on- or off-screen, is always specified as a point in (x,y) display coordinates in the plane of the display (origin at lower left corner). The compiler requires that all conditions in a block have the same fixation point and fixationLocationStrategy. \n• centerFixation places fixation at the center of the screen. This is the default.\n• asSpecified indicates that fixation is specified by (fixationLocationXScreen, fixationLocationYScreen). \n\nNOT YET IMPLEMENTED:\nTo test even farther into the periphery, you might want to set fixationRequestedOffscreenBool TRUE and place the fixation off-screen by putting tape on a bottle or a box and drawing a fixation cross on it.\n• centerTargets sets the (possibly offscreen) fixation location so as to maximize the screen margin around the edges of all the possible targets.  We consider all possible targets across all conditions within the block.  \n• centerFixationAndTargets places fixation so as to maximize the screen margin around the fixation and the edges of all the possible targets within the block. We consider all possible targets across all conditions within the block.  \n\nSatisfying centerTargets or centerFixationAndTargets may be impossible beyond a certain maximum viewing distance (in cm) proportional to screen size (in cm). We generally don't know the screen size at compile time, as each participant has their own computer. Currently the scientist can only specify viewing distance as a fixed number of cm. \n\n[Since short viewing distances are uncomfortable, it might be useful to be able to request the maximize viewing distance such that the screen will have a needed visual subtense. In effect, this requests a viewing distance that is a multiple of screen width or height.]",
    type: "categorical",
    default: "centerFixation",
    categories:
      "centerFixation, centerFixationAndTargets, centerTargets, asSpecified",
  },
  {
    name: "fixationLocationXScreen",
    availability: "now",
    example: "0.5",
    explanation:
      "If fixationLocationStrategy is asSpecified, then fixationLocationXScreen specifies fixation's X coordinate in the screen plane, as a fraction of screen width. The lower left corner is the origin (0,0), and the upper right corner is (1,1).",
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "fixationLocationYScreen",
    availability: "now",
    example: "0.5",
    explanation:
      "If fixationLocationStrategy is asSpecified, then fixationLocationYScreen specifies the Y coordinate of fixation, as a fraction of screen height.",
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "fixationRequestedOffscreenBool",
    availability: "later",
    example: "FALSE",
    explanation:
      "To test the far periphery it may be worth the trouble of setting up an off-screen fixation mark, with help from the participant. Set fixationRequestedOffscreenBool TRUE and EasyEyes will the participant to put tape on a bottle or a box and draw a crosshair on it. To figure out where the crosshair is, EasyEyes will display arrows on the display and ask the participant to drag the arrow heads to point at the crosshair.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "flipScreenHorizontallyBool",
    availability: "later",
    example: "FALSE",
    explanation:
      "Set flipScreenHorizontallyBool TRUE when the display is seen through a mirror.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "font",
    availability: "now",
    example: "Sloan.woff2",
    explanation:
      'font specified what font you want for the target and for reading. How you specify it depends on the chosen fontSource:\n\nfile: font is the filename (including the extension: woff2, woff, otf, ttf, or svg) of a font file in your Fonts folder in your Pavlovia account. The compiler will download this file from your Fonts folder to your temporary local Experiment folder, which is later uploaded to a new project repo for this new experiment. (I think we use the javascript version of the @font-face command. The Mozilla page on the @font-face command seems to say that it supports only: woff2, woff, otf, ttf, or svg. https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face)\n\ngoogle:  font is the filename (including extension) of a font file provided by the free Google Font server. We use their API to discover the URL.\n\nserver: font is a URL pointing to the desired font on a font server. Many fonts are served for free by the Google Fonts server.  https://fonts.google.com/  At that website, use "Search for font". Having found your font, select the style you want. In the "Selected Family" pop-up window, click the "@import" button. From within the revealed CSS code, copy the URL from inside the "url(. )". ("server" support is coming.)\n\nbrowser: The experiment will pass the font preference string that you place in font to the participant\'s browser and accept whatever it provides.  Your string can include several font names, separated by commas, first choice first, to help the browser find something close to your intent. This is the usual way to select a font on the web, and never generates an error.  Specify just the family name, like "Verdana", and use the "fontStyle" to select italic, bold, or bold-italic. Some "web safe" fonts (e.g. Arial, Verdana, Helvetica, Tahoma, Trebuchet MS, Times New Roman, Georgia, Garamond, Courier New, Brush Script MT) are available in most browsers. In ordinary browsing, it\'s helpful that browsers freely substitute fonts so that you almost always get something readable in the web page you\'re reading. In the scientific study of perception, we usually don\'t want data with a substituted font. So, normally, you should specify "file" or "server" so you\'ll know exactly what was shown to the participant. \n\nFonts load early. We\'ll get the browser to load all needed fonts at the beginning of the experiment, so the rest of the experiment can run without internet or font-loading delay. ',
    type: "text",
    default: "Roboto Mono",
    categories: "",
  },
  {
    name: "fontCharacterSet",
    availability: "now",
    example: "DHKNORSVZ",
    explanation:
      "fontCharacterSet is a string of unicode characters. \nLETTER IDENTIFICATION: On each trial, the target and flankers are randomly drawn from this character set, without replacement. Allowed responses are restricted to this character set. The other keys on the keyboard are dead. Letters may appear more than once in the string, to increase their probability of being drawn, but once one is drawn any identical letters are removed with it, so the drawn samples won't have any repeats. (We have no experience using repeats in the fontCharacterSet.)\nREADING: The fontCharacterSet string is used to estimate typical spacing. For English I use lowercase a-z. ",
    type: "text",
    default: "abcdefghijklmnopqrstuvwxyz",
    categories: "",
  },
  {
    name: "fontDotCharacter",
    availability: "now",
    example: "x",
    explanation:
      'fontDotCharacter is a period "." by default. EasyEyes uses it to measure the rendering offset caused by adding white space padding to the draw text command to avoid clipping. Many international fonts include a period, but perhaps some don\'t. All we need is a black character (not white space) that is small enough to not be clipped when drawn without padding. So any small character, not white space, will do.',
    type: "text",
    default: ".",
    categories: "",
  },
  {
    name: "fontFeatureSettings",
    availability: "now",
    example: "",
    explanation:
      'Font features provide information about how to use the glyphs in a font to render a script or language. fontFeatureSettings receives a string. The default is the empty string. A typical value is\n"calt" 1\nor\n"calt" 1, "smcp", "zero"\nEach line is a string. The string is passed to the CSS function font-variation-settings. The (single or double) quote marks are required. Each four letter code is taken from a long list of possible font features. "calt" enables the font’s "contextual alternates", especially connections between adjacent letters in a script font. "smcp" enables small caps. "zero" requests a slash through the zero character to distinguish it from O. Most font features are Boolean and accept an argument of 0 for off, and 1 for on. Some accept an integer with a wider range. Supported by all modern browsers, including Internet Explorer.\nhttps://developer.mozilla.org/en-US/docs/Web/CSS/font-feature-settings\nhttps://docs.microsoft.com/en-us/typography/opentype/spec/features_ae#tag-calt\nhttps://helpx.adobe.com/in/fonts/using/open-type-syntax.html\nhttps://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-ligatures\nhttps://en.wikipedia.org/wiki/Ligature_(writing)\nhttps://stackoverflow.com/questions/7069247/inserting-html-tag-in-the-middle-of-arabic-word-breaks-word-connection-cursive/55218489#55218489\n',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "fontLeftToRightBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "fontLeftToRightBool should be set to TRUE for most languages, including English, which are written from left to right, and should be set to FALSE for Arabic, Hebrew, and other right-to-left languages. The default value is TRUE. For identifying letters, the letters will be placed accordingly on the response screen. For reading, it's important to set this correctly, or text may fall off the screen: left-to-right text will be left-aligned, and right-to-left text will be right aligned.                                                                                                                                                                                      ",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "fontPadTextToAvoidClippingBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "fontPadTextToAvoidClippingBool (default TRUE) when TRUE asks EasyEyes to pad every stimulus string with white space to avoid clipping. The padding consists of a carriage return and a space, both before and after. The displacement caused by the padding is measured in advance, and taken into account, so text appears at the desired location.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "fontSource",
    availability: "now",
    example: "file",
    explanation:
      'fontSource must be file, google, server, or browser. Browsers happily substitute for unavailable fonts. That\'s great for the web, but bad for perception experiments, so we encourage you to provide access to a specific font, either as a file or on a font server. For each condition that has fontSource "file", the compiler checks for presence of the font in your Fonts folder (in your Pavlovia account). That folder is persistent, and you can add more fonts to it at any time, through the EasyEyes.app/threshold page. Any popular font format will work, but to minimize transmission time, we recommend minimizing file size by using a highly compressed webfont file format, indicated by the extension woff2. \n\nfile: font contains the filename (with extension) of a file in the Fonts folder in the EasyEyesResources repository in your Pavlovia account. This is checked by the compiler, to avoid runtime surprises. \n\ngoogle: font contains the font name as recognized by the Google Fonts server.\n\nserver: font contains the URL of the font on a font server. ("server" support is coming.)\n\nbrowser: font is a font-preference string that is passed to the participant\'s browser. This never produces an error; we accept whatever font the browser chooses. Your font string can include several font names, separated by commas, to help the browser find something close to your intent. This is the usual way to select a font on the web, and never generates an error. (We don\'t know any quick way to discover what font the browser chose, so the scientist will never know.) ',
    type: "categorical",
    default: "google",
    categories: "file, google, browser",
  },
  {
    name: "fontStyle",
    availability: "later",
    example: "bold",
    explanation:
      'fontSyle IS NOT YET IMPLEMENTED. Can be regular (default), bold, italic, or bold-italic. \n• If font is a file name that already specifies the style you want, then don\'t specify a style here. Just leave fontStyle as default. Otherwise the participant\'s browser might try to "helpfully" synthesize the new style by tilting or thickening what the font file renders. It\'s safer to switch to the font file whose name specifies the style you want. \n• Alternatively, if fontSource is "browser", and font specifies only a font family name (e.g. Verdana), or several (e.g. Verdana;Arial), then you can use fontStyle to select among the four standard styles.',
    type: "categorical",
    default: "regular",
    categories: "regular, bold, italic, boldItalic",
  },
  {
    name: "fontVariationSettings",
    availability: "now",
    example: "",
    explanation:
      'fontVariationSettings accepts a string to control a variable font. You set all the axes at once. Any axis you don\'t set will be set to its default. Every axis has a four-character name. Standard axes have all-lowercase names, like \'wght\' for weight. Novel axes have ALL-UPPERCASE names. To discover your variable font\'s axes of variation, and their allowed ranges, try this web page: https://fontgauntlet.com/ For an introduction to variable fonts: https://abcdinamo.com/news/using-variable-fonts-on-the-web Variable fonts have one or more axes of variation, and we can pick any value along each axis to control the font rendering. fontVariationSettings receives a string. The default is the empty string. A typical value is\n"wght" 625\nor\n"wght" 625", wdth" 25\nEach line is a string. The string is passed to the CSS function font-variation-settings. The (single or double) quote marks are required. Each four letter code represents an axis of variation that is defined for this variable font. "wght" is weight, which allows you to select any weight from extra thin to regular to bold, to black. "wdth" is width, which allows you to select any width from compressed to regular to expanded. Some axes are standard, with lowercase names. Any font can have unique axes, with uppercase names. To discover which axes a variable font supports, you must consult the webpage https://fontgauntlet.com/ or the individual font\'s documentation. Variable fonts are supported by all modern browsers, and not by Internet Explorer.\nhttps://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-variation-settings\n',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "fontWeight",
    availability: "later",
    example: "550",
    explanation:
      "To control a variable font, accepts a numerical value to be assigned like this: \nmyText.style.fontWeight = fontWeight\nNOTE: If you use this parameter, then EasyEyes will flag an error if it determines that the target font is not variable.\nhttps://abcdinamo.com/news/using-variable-fonts-on-the-web",
    type: "numerical",
    default: "NaN",
    categories: "",
  },
  {
    name: "instructionFont",
    availability: "now",
    example: "Georgia",
    explanation:
      'Font used for participant instructions. Four cases are selected by instructionFontSource=\ndefaultForLanguage: We recommend leaving instructionFont blank and setting instructionFontSource to defaultForLanguage, which will result in using whatever font is recommended by the EasyEyes International Phrases sheet for the chosen instructionLanguage. This allows runtime selection of instructionLanguage by the participant. For each language, the EasyEyes International Phrases table recommends a font from the Noto serif family, which are all served by Google Fonts.\nfile:  instructionFont is the file name (including extension) of a font in your Fonts folder in your Pavlovia account. Be sure that your font can render the characters of the instructionLanguage you pick. \ngoogle: instructionFont is a filename (including extension) of a font on the Google Fonts server.\nserver: instructionFont is a URL pointing to the desired font on a font server, e.g. Adobe. ("server" support is coming.)\nbrowser: instructionFont should be a string for the browser expressing your font preference.\n     Noto Fonts. The EasyEyes International Phrases table recommends the appropriate "Noto" font, available from Google and Adobe at no charge. Wiki says, "Noto is a font family comprising over 100 individual fonts, which are together designed to cover all the scripts encoded in the Unicode standard." Various fonts in the Noto serif family cover all the worlds languages that are recognized by unicode. https://en.wikipedia.org/wiki/Noto_fonts  \nWe plan to use the free Google Fonts server, which serves all the Noto fonts.\n     Runtime language selection. To allow language selection by the participant at runtime, we will ask the Google Fonts server to serve an appropriate font (from the Noto Serif family) as specified by the EasyEyes International Phrases sheet. \n     Fonts load early. We\'ll get the browser to load all needed fonts at the beginning of the experiment, so the rest of the experiment can run without internet or font-loading delay. Of course, we hope the computer eventually reconnects to send the experiment\'s data to Pavlovia, where the scientist can retrieve it.',
    type: "text",
    default: "Verdana",
    categories: "",
  },
  {
    name: "instructionFontLeftToRightBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "instructionFontLeftToRightBool should be set to TRUE for most languages, including English, which are written from left to right, and should be set to FALSE for Arabic, Hebrew, and other right-to-left languages. The default value is TRUE. For identifying letters, the letters will be placed accordingly on the response screen. For reading, it's important to set this correctly, or text may fall off the screen: left-to-right text will be left-aligned, and right-to-left text will be right aligned.                                                                                                                                                                                      ",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "instructionFontSource",
    availability: "now",
    example: "browser",
    explanation:
      'instructionFontSource must be file, google, server, or browser. "server" support is coming. See fontSource for explanation.',
    type: "categorical",
    default: "browser",
    categories: "file, google, browser",
  },
  {
    name: "instructionFontStyle",
    availability: "soon",
    example: "regular",
    explanation:
      "NOT YET IMPLEMENTED. Must be regular, bold, italic, or boldItalic. When you select a font file that is already styled, just select regular here. Otherwise the browser might try to tilt or thicken the already italic or bold font with unexpected results.",
    type: "categorical",
    default: "regular",
    categories: "regular, italic, bold, boldItalic",
  },
  {
    name: "instructionLanguage",
    availability: "soon",
    example: "Italian",
    explanation:
      'English name for the language used for instructions to the participant. It must be "participant" or match one of the entries in the second row of the EasyEyes International phrases sheet. If you enter "participant", then the participant will be allowed to select the instruction language from a pull-down menu.',
    type: "categorical",
    default: "English",
    categories: "",
  },
  {
    name: "instructionTableURL",
    availability: "later",
    example: "",
    explanation:
      'The URL of a Google Sheets table of international phrases to be used to give instructions throughout the experiment. A scientist can substitute her own table, presumably a modified copy of the EasyEyes International Phrases Table. https://docs.google.com/spreadsheets/d/1UFfNikfLuo8bSromE34uWDuJrMPFiJG3VpoQKdCGkII/edit#gid=0\nThis table allows the Participant page to make all non-stimulus text international. In every place that it displays instruction text, the Participant page looks up the mnemonic code for the needed phrase in the instruction table, to find a unicode phrase in the selected instructionLanguage (e.g. English, German, or Arabic). It\'s a Google Sheets file called "EasyEyes International Phrases".\nhttps://docs.google.com/spreadsheets/d/1AZbihlk-CP7sitLGb9yZYbmcnqQ_afjjG8h6h5UWvvo/edit#gid=0\nThe first column has mnemonic phrase names. Each of the following columns gives the corresponding text in a different language. After the first column, each column represents one language. Each row is devoted to one phrase. The second row is languageNameEnglish, with values: English, German, Polish, etc. The third row is languageNameNative, with values: English, Deutsch, Polskie, etc. \n     We incorporate the latest "EasyEyes International Phrases" file when we compile threshold.js. For a particular experiment, we only need the first column (the mnemonic name) and the column whose heading matches instructionLanguage. We should copy those two columns into a Javascript dictionary, so we can easily look up each mnemonic phrase name to get the phrase in the instructionLanguage. To display any instruction, we will use the dictionary to convert a mnemonic name to a unicode phrase. \n     languageDirection. Note that most languages are left to right (LTR), and a few (e.g. Arabic, Urdu, Farsi, and Hebrew) are right to left (RTL). Text placement may need to take the direction into account. The direction (LTR or RTL) is provided by the languageDirection field.\n     languageNameNative. If we later allow the participant to choose the language, then the language selection should be based on the native language name, like Deustch or Polskie, i.e. using languageNameNative instead of languageNameEnglish.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "invitePartingCommentsBool",
    availability: "later",
    example: "FALSE",
    explanation:
      "At the end of this block, invite the participant to make parting comments. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "markingBlankedNearTargetBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'When TRUE, markingBlankedNearTargetBool suppresses any parts of the fixation cross or target X that are too close to the possible targets in this conditionGroup. This enables both meanings of "too close": markingBlankingRadiusReEccentricity and markingBlankingRadiusReTargetHeight.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "markingBlankingRadiusReEccentricity",
    availability: "now",
    example: "0.5",
    explanation:
      'Considering crowding, define "too close" distance from the target as a fraction of the target\'s radial eccentricity.',
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "markingBlankingRadiusReTargetHeight",
    availability: "now",
    example: "2",
    explanation:
      'Considering masking, markingBlankingRadiusReTargetHeight specifies the "too close" distance from the target as a fraction of target height.',
    type: "numerical",
    default: "0.2",
    categories: "",
  },
  {
    name: "markingClippedToStimulusRectBool",
    availability: "now",
    example: "FALSE",
    explanation:
      'markingClippedToStimulusRectBool TRUE requests that fixation and target marking be restricted to the stimulus rect, protecting the screen margins. Otherwise they are allowed to extend to the screen edges, a "full bleed".',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "markingFixationHotSpotRadiusDeg",
    availability: "now",
    example: "0.05",
    explanation:
      "markingFixationHotSpotRadiusDeg is the radius, in deg, of the hot spot in the fixation cross. The hot spot is the area that can be clicked with the tip of the cursor.",
    type: "numerical",
    default: "0.3",
    categories: "",
  },
  {
    name: "markingFixationMotionPeriodSec",
    availability: "now",
    example: "5",
    explanation:
      "markingFixationMotionPeriodSec is the time, in secs, that it takes the crosshair to do one revolution around the origin.",
    type: "numerical",
    default: "10",
    categories: "",
  },
  {
    name: "markingFixationMotionRadiusDeg",
    availability: "now",
    example: "0.5",
    explanation:
      "markingFixationMotionRadiusDeg is the radius of the circular trajectory of the crosshair about the origin.",
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "markingFixationStrokeLengthDeg",
    availability: "now",
    example: "1",
    explanation:
      "markingFixationStrokeLengthDeg specifies the stroke length in the fixation cross. The cross consists of two strokes, one horizontal, one vertical. Thus this is a diameter, unless the other marking parameters, which are mostly radii. Setting this to a large value (e.g. 100) will produce a fixation cross that extends from edge to edge of the display, which may help restore salience of a cross despite blanking of the cross near possible target locations.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "markingFixationStrokeThicknessDeg",
    availability: "now",
    example: "0.03",
    explanation:
      "markingFixationStrokeThicknessDeg sets stroke thickness in the fixation cross.",
    type: "numerical",
    default: "0.05",
    categories: "",
  },
  {
    name: "markingOffsetBeforeTargetOnsetSecs",
    availability: "now",
    example: "0.3",
    explanation:
      "Pause for markingOffsetBeforeTargetOnsetSecs before target onset to minimize forward masking of the target by the preceding fixation and target markings. You should leave this at zero (default) when the target is peripheral, because you don't want to give the participant time to foveate the peripheral target. Thus we expect this parameter to be nonzero only when the target is foveal. In that case it may be wise to give enough time (e.g. 0.3 s) to prevent forward masking of the target by the fixation cross. Forward masking of the target by the fixation cross can also be reduced by blanking the cross near the target, as controlled by markingBlankingRadiusReTargetHeight.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "markingOnsetAfterTargetOffsetSecs",
    availability: "now",
    example: "0.2",
    explanation:
      "Pause before onset of fixation and target markings to minimize backward masking of the target.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "markingTargetStrokeLengthDeg",
    availability: "now",
    example: "1",
    explanation: "Stroke length in the target X.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "markingTargetStrokeThicknessDeg",
    availability: "now",
    example: "0.03",
    explanation: "Stroke thickness in the target X.",
    type: "numerical",
    default: "0.03",
    categories: "",
  },
  {
    name: "markTheFixationBool",
    availability: "now",
    example: "TRUE",
    explanation: "If markTheFixationBool is TRUE, then draw a fixation cross.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "markThePossibleTargetsBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "If markThePossibleTargetsBool is TRUE, draw an X at every possible target location, considering all conditions in this conditionGroup. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "maskerBaseFrequencyMultiplier",
    availability: "now",
    example: "",
    explanation:
      "Compute base frequency of a mask melody by multiplying the target frequency by this factor. If there are two melodies then the second melody has base frequency given by target frequency divided by this factor.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "maskerDBSPL",
    availability: "now",
    example: "",
    explanation: "Sound level of the masker, in dB SPL.",
    type: "numerical",
    default: "50",
    categories: "",
  },
  {
    name: "maskerSoundFolder",
    availability: "now",
    example: "sounds",
    explanation:
      "The name of a folder of sound files, to be used when targetKind is sound. The folder is submitted as a zip archive to the EasyEyes drop box, and saved in the Pavlovia account in the Folders folder. The name of the zip archive, without the extension, must match the value of maskSoundFolder. [FUTURE: We could also allow our submit box to accept a folder, which it copies, including all the enclosed files, ignoring any enclosed folders.]",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "maskerSoundPhrase",
    availability: "now",
    example: "",
    explanation:
      'maskerSoundPhrase is a text phrase that is used when targetKind is 16ChannelSound. The phrase consists of a series of words and category names, with each category name preceded by #. Currently the maskerSoundPhrase is "Ready #CallSign GoTo #Color #Number Now". Every word must appear as a sound file with that name, and every category must appear as a folder with that name, both in the current talker folder in the maskerSoundFolder.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "notes",
    availability: "now",
    example: "",
    explanation:
      "Optional. Use this to add comments about the condition that you want preserved in the data file. Ignored by EasyEyes and saved with results.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "playNegativeFeedbackBeepBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "When playNegativeFeedbackBeepBool is TRUE, after a mistaken response, play pure 500 Hz tone for 0.5 sec at amplitude 0.05. Usually FALSE, as we typically stay positive and give only positive feedback.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "playPositiveFeedbackBeepBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "When playPositiveFeedbackBeepBool is TRUE, after each correct response, play pure 2000 Hz tone for 0.05 sec at amplitude 0.05. ",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "playPurrWhenReadyBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "NOT YET IMPLEMENTED. Play a purring sound to alert the observer while we await their response. Pure 200 Hz tone for 0.6 sec at amplitude 1.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "questionAndAnswer@@",
    availability: "now",
    example: "AFTERLIFE|Is there life after death?|Yes|No|Maybe",
    explanation:
      'questionAndAnswer@@ (e.g. questionAndAnswer01) consists of several strings, separated by vertical bars |, that specify: a nickname, a question to be asked, and perhaps some possible answers. The nickname is used solely to name the column of responses in the saved data. The nickname and question are required; the answers are not. If no answers are specified, then the question accepts a free-form text answer. If multiple answers are specified, then they are offered to the participant as multiple-choice alternatives. Specifying just one answer is currently an error, but this may change in a future enhancement. \n• FREE-FORM: Provide just a nickname and a question, no answer. For example, "DESCRIPTION|Describe the image that you are seeing right now?" The participant is invited to type their answer into a text box.\n• MULTIPLE CHOICE: Provide a nickname, a question, and at least two answers. The participant must click on one. For example "BEAUTY|How much beauty do you get from this image right now?|1|2|3|4|5|6|7" Or "KIND|Which kind of image is it?|figurative painting|abstract painting|photograph"\n\nWe support questionAndAnswer01 - questionAndAnswer99, i.e. you can write 99 questions in one block.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "readingCorpus",
    availability: "now",
    example: "the-phantom-tollbooth.txt",
    explanation:
      "The filename of a text file that has already been uploaded to Pavlovia. The text file should be a book's worth of readable text. We typically use \"The phantom tollbooth\" a popular American children's book with a reading age of 10+ years for interest and 12+ years for vocabulary. We retain punctuation, but discard chapter and paragraph breaks. \n     After EasyEyes reads in the corpus text, it does two analyses to facilitate its use.\n1. CONCORDANCE. Prepare a concordance. This is a two-column table. The first column is a unique list of all the corpus words. The second column is frequency, i.e. the number of times that the word appears in the corpus. For this purpose we should ignore capitalization and leading and trailing punctuation. The table is sorted by decreasing frequency.\n2. WORD INDEX. Use a regex search to make a one-column  list of the index, in the corpus, of every word. For this purpose, a word consists of an alphanumeric character plus all leading and trailing non-whitespace characters.\n",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "readingDefineSingleLineSpacingAs",
    availability: "now",
    example: "nominalSize",
    explanation:
      "What shall we say is the \"single\" line spacing (baseline to baseline) of the text to be read? The actual spacing will be a multiple of that: readingMultipleOfSingleLineSpacing. \n• nominalSize is the industry standard, which defines single line spacing as the nominal point size at which we are rendering the font. So single spacing of 12 pt Times would be 12 pt line spacing.\n• font defines single line spacing as the font's built-in line spacing, which can be enormous in fonts with large flourishes. \n• twiceXHeight defines single line spacing as twice the font's x-height.\n• explicit defines single line spacing as readingSingleLineSpacingDeg.",
    type: "categorical",
    default: "nominalSize",
    categories: "nominalSize, font, twiceXHeight, explicit",
  },
  {
    name: "readingFirstFewWords",
    availability: "now",
    example: "It was a dark and stormy night",
    explanation:
      'readingFirstFewWords specifies the beginning of the reading in the corpus by its first few words, a string. The matching is exact, including case and punctuation. Default is the empty string, in which case we read from the beginning of the corpus. The EasyEyes compiler flags an error if a nonempty string is not found in the corpus. If the (nonempty) string appears more than once in the corpus, EasyEyes will randomly pick among the instances, independently for each reading. Thus, for an English-language corpus, one might reasonably set readingFirstFewWords to "The ", to begin each reading at a randomly chosen sentence that begins with "The ".',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "readingLinesPerPage",
    availability: "now",
    example: "8",
    explanation: "Number of lines of text per page.",
    type: "numerical",
    default: "8",
    categories: "",
  },
  {
    name: "readingMaxCharactersPerLine",
    availability: "now",
    example: "57",
    explanation:
      "readingMaxCharactersPerLine is used to set the maximum line length, notin pixels, notfor line breaking. We compute an average character width as the width in pixels of fontCharacterSet divided by the number of characters in that string. The maximum line length (px) is the product of that average character width (px) and readingMaxCharactersPerLine. Typographers reckon that text is easiest to read in a column that is 8-10 words wide. Average English word length is 5 characters, notso, notcounting the space between words, notwe multiply by 6 to get 48 to 60 letter widths per line. Line breaking without hyphenation will produce an average line length about half a word less than the max, notso to get an average of 9, notwe could use a max of 9.5, notor 9.5*6=57 letter widths.",
    type: "numerical",
    default: "57",
    categories: "",
  },
  {
    name: "readingMultipleOfSingleLineSpacing",
    availability: "now",
    example: "1.2",
    explanation:
      'Set the line spacing (measured baseline to baseline) as this multiple of "single" line spacing, notwhich is defined by readingDefineSingleLineSpacingAs. 1.2 is the default in many typography apps, notincluding Adobe inDesign.',
    type: "numerical",
    default: "1.2",
    categories: "",
  },
  {
    name: "readingNominalSizeDeg",
    availability: "now",
    example: "3",
    explanation:
      'If readingSetSizeBy is "nominal", notthen set point size to readingNominalSizeDeg*pixPerDeg.',
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "readingNumberOfPossibleAnswers",
    availability: "now",
    example: "3",
    explanation:
      'Number of possible answers for each question. Only one of the possible answers is right. The rest are "foils".',
    type: "integer",
    default: "4",
    categories: "",
  },
  {
    name: "readingNumberOfQuestions",
    availability: "now",
    example: "4",
    explanation:
      'After the participant reads a passage, EasyEyes will ask readingNumberOfQuestions, each on a new screen, to assess retention. Each retention question offers several words and asks the participant which word (the target) was in the passage just read. The other words (foils) were not in that passage but do appear in the corpus. The target word is presented with enough foils to offer N=readingNumberOfPossibleAnswers. The words are arranged in alphabetical order below the question. The participant responds by clicking on the chosen word. It\'s "forced choice"; the participant must click a word. We give a "correct" beep if the answer is right. We repeat this several times, as specified by readingNumberOfQuestions.\n     IGNORE FIRST & LAST PAGES. Performance on the first and last pages of the passage might not be representative because timing of the space bar press might be less regular, and primacy and recency would make words on those pages more memorable. So we analyze only the middle pages, excluding the first and last both from the estimate of reading speed and the retention test. [Thus each word in the corpus is read and tested, read and not tested, or not read.]\n     CONCORDANCE. As explained in readingCorpus, we will, once, compute a concordance, the frequency of every word in the corpus. It is a two-column table (word and number of instances in the corpus), sorted by frequency. \n     CANDIDATES FOR TARGET. For a given passage, each question uses a different target word. We pick candidate target words randomly from the passage just read  (in which many words appear more than once), and check each for suitability. We reject some candidates, so we keep picking candidates until we have accepted the desired number, readingNumberOfQuestions. As potential target or foil words we reject any strings in the concordance that include a hyphen.\n     CHOOSE FOILS. We pick a random integer from 1 to N to determine the rank order frequency of the target among the foils. We reduce the concordance by striking out all the words that were read (whether to be tested or not), except the target, which remains. As our answer set, we take N consecutive words from the reduced concordance, including the target, chosen so that the target has the randomly specified frequency rank (1 to N). If the target frequency is so high or low that the reduced concordance lacks N successive words with the target at the designated rank order, then we reject that target and pick another, using the same random rank. The passage read will typically have hundreds of words, so there are lots of candidate targets for the retention questions.\n      \n\n\n',
    type: "integer",
    default: "3",
    categories: "",
  },
  {
    name: "readingPages",
    availability: "now",
    example: "4",
    explanation:
      "Number of pages to be read. The first and last pages will not be used for testing.",
    type: "numerical",
    default: "4",
    categories: "",
  },
  {
    name: "readingSetSizeBy",
    availability: "now",
    example: "spacing",
    explanation:
      "How do you specify the size of the text to be read?\n• nominal will set the point size of the text to readingNominalSizeDeg*pixPerDeg,  \n• xHeight will adjust text size to achieve the specified x-height (the height of lowercase x),  i.e. readingXHeightDeg. \n• spacing will adjust the text size to achieve the specified letter-to-letter readingSpacingDeg.",
    type: "categorical",
    default: "spacing",
    categories: "nominal, xHeight, spacing",
  },
  {
    name: "readingSingleLineSpacingDeg",
    availability: "now",
    example: "2",
    explanation:
      "Explicit value of single line spacing. This is ignored unless readingDefineSingleLineSpacingAs is explicit.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "readingSpacingDeg",
    availability: "now",
    example: "0.5",
    explanation:
      "If readingSetSizeBy is spacing, the point size of the text to be read is adjusted to make this approximately the average center-to-center spacing (deg) of neighboring characters in words displayed. For the proportionality of spacing to point size, I suggest we measure the width of the fontCharacterSet string, and divide by the number of numbers in the string.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "readingTargetMaxWordFrequency",
    availability: "now",
    example: "0.3",
    explanation:
      "When reading, it is hard to notice or remember common words, so we exclude common words as the target for retention testing. When selecting a target, we keep drawing candidate targets randomly from the passage that was read until we find one that's acceptable. We reject any candidate target whose frequency in the corpus exceeds **readingTargetMaxWordFrequency**.\n     DEFAULT VALUE. In the classic Kucera and Francis concordance,\nhttps://en.wikipedia.org/wiki/Brown_Corpus\nthe words _water, think, night_ have frequencies about 430*10^-6, which would be a good cut off for a large corpus. That's about 1 in 2326, so this criterion excludes every word in any corpus with fewer than 2,326 words.",
    type: "numerical",
    default: "4.30E-04",
    categories: "",
  },
  {
    name: "readingXHeightDeg",
    availability: "now",
    example: "0.5",
    explanation:
      'If readingSetSizeBy is "xHeight", then set point size to to achieve this specified x-height (the height of lowercase x). ',
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "responseAllowedEarlyBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "When responseAllowedEarlyBool is TRUE, the participant can respond at any time after target onset. When FALSE, the participant can only repond after target offset. For demos and debugging, it is handy to set responseAllowedEarlyBool to TRUE with a long targetDurationSec (e.g. 999) so that the stimulus stays up while you examine it, yet you can quickly click through several stimuli to see the progression. Note that enabling early response while clicked responses are allowed forces EasyEyes to show the characterSet early, since clicking requires something to click on. And if responseRequiresCharacterSetBool is TRUE then setting responseAllowedEarlyBool TRUE will force early display of the characterSet regardless of which response modalities are enabled.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responseCharacterHasMedialShapeBool",
    availability: "soon",
    example: "TRUE",
    explanation:
      "In Arabic, ligatures respond to the neighboring letters. When we identify crowded Arabic letters in typographic mode, the target character is displayed in medial shape (i.e. connected) as a stimulus. If responseCharacterHasMedialShapeBool is TRUE then the response screen also shows each response letter in its medial shape. If FALSE, then the response letter is shown in its isolated shape (i.e. disconnected). Having the target letter change shape between stimulus and response screens may make it harder to identify, especially by less fluent readers. To achieve this, when responseCharacterHasMedialShapeBool is TRUE we precede the response character by a Tarweel joiner character (U+0640) and follow it by a zero-width joiner (ZWJ) character (U+200D). For more on these characters in Arabic typesetting see https://www.w3.org/TR/alreq/#h_joining_enforcement",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responseClickedBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Allow participant to respond at every occasion by clicking (e.g. clicking the target letter in the fontCharacterSet). When ready for stimulus, allow clicking fixation instead of hitting SPACE. The various response modes are not exclusive. Enable as many as you like. And simulateParticipantBool can provide responses too.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responseEscapeOptionsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Once debugged, responseEscapeOptionsBool will be TRUE by default. If FALSE, then we follow the PsychJS behavior, and any press of ESCAPE immeditaely ends testing and takes the participant to the debrief form (if requested). If TRUE, then ESCAPE offers two or three options. The miidest optiion is to continue from where the escape was presssed, deleting any trial for which the response was not yet collected. The middle option is only presented if we suppose that we're testing the scientist, not a typical participant. This option skips to the next block. The last option ends testing and goes to debriefing (if requested). Our rule for supposing that the participant is the scientist is either that the Prolific URL parameters are absent or we are in Prolific Preview mode.\n     If responseEscapeOptionsBool is TRUE, then, at any prompt, the participant can hit <escape> to be asked whether to cancel the trial (hit space), the block (hit return), or the whole experiment (hit escape again).",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responseMustClickCrosshairBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "REQUESTED BY MANY PARTICIPANTS (This grants the frequent request from our participants that they prefer to type the letter, even if they're required to click on the crosshair to begin each trial.) Overrules all other response boolean parameters to enable clicking, and ONLY clicking of the crosshair, to request the next trial. The hope is that clicking the crosshair results in good fixation just before stimulus presentation. This parameter is ignored for other responses, e.g. identifying the target and proceeding through instructions. (Pressing the ESCAPE key is always allowed.) ",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responseSpokenBool",
    availability: "later",
    example: "FALSE",
    explanation:
      "responseSpokenBool allows participant to respond  verbally at every occasion, e.g. by verbally naming the target. The various response modes are not exclusive. Enable as many as you like. But responseMustClickCrosshairBool overrides all other settings.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responseTypedBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'responseTypedBool allows participant to respond at every occasion by pressing a key in keyboard. The various response modes are not exclusive. Enable as many as you like. Note: disable typed reponses if you want to force participants to click on fixation as a way tp ensure good fixation when the stimulus is presented. OVERRRIDE: Setting simulateParticipantBool to TRUE or showGrid to other than "disabled" enables type as a response method, regardles of the setting of responseTypedBool. But responseMustClickCrosshairBool overrides all other settings while the crosshair is available for clicking.',
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responseTypedEasyEyesKeypadBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "responseTypedEasyEyesKeypadBool allows participant to respond at every occasion by pressing a key in EasyEyes keypad. The various response modes are not exclusive. Enable as many as you like. But responseMustClickCrosshairBool overrides all other settings.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "screenshotBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'screenshotBool requests saving a full-screen screenshot of each stimulus and response display of this condition, plus each instruction display of the block. (Currently all instruction displays belong to the block, not to any condition.) Each filename should be E.B.C.TA.png, where E stands for the experiment name, B stands for the block number, C stands for the condition number, T stands for the trial number of the condition in the block, and A is "s" for stimulus or "r" for response. If the display is instructional then A is "i", C is 0, and T is a counter that starts at 1 at the beginning of the block. screenshotBool is condition-specific, but if several conditions enable it, EasyEyes still saves only one copy of each instructional screen. Screenshots are useful for debugging and to show the stimuli in talks and papers. It is expected that taking screenshots will severely degrade timing, so it should not be requested while a participant is being tested in earnest. Instead the scientist will test herself (or use simulateParticipantBool) to collect the images she needs.\n     Can we save these files to a "Screenshots" folder in the participant computer\'s Download folder or in the experiment repository on Pavlovia? ',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "setResolutionPxPerCm",
    availability: "now",
    example: "25",
    explanation:
      "setResolutionPxPerCm sets display resolution to allow us to study perception and readability of text rendered with low pixel density. We just render on a smaller canvas and expand that for display on the participant's (high resolution) screen. In use, it will be a lot like using System Preferences: Display to set resolution, but will allow much lower resolutions. Ignored if value is empty or zero. For reference, the 2022 MacBook Pro screens have 98 px/cm. It is an error for both setResolutionPxPerCm and setResolutionPxPerDeg to be nonzero. If both are zero/empty then we use the screen in whatever resolution it's in.",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "setResolutionPxPerDeg",
    availability: "now",
    example: "4",
    explanation:
      "setResolutionPxPerDeg sets display resolution to allow us to study perception and readability of text rendered with low pixel density. We just render on a smaller canvas and expand that for display on the participant's (high resolution) screen. Ignored if value is empty or zero. It is an error for both setResolutionPxPerCm and setResolutionPxPerDeg to be nonzero. If both are zero/empty then we use the screen in whatever resolution it's in.",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "showBoundingBoxBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "For debugging, setting showBoundingBoxBool TRUE displays the bounding box around the target character (if spacing is ratio) or flanker-target-flanker triplet (if spacing typographic). We show the getBoundingBox method from psychojs, using tight=true. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showCharacterSetBoundingBoxBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "showCharacterSetBoundingBoxBool shows the bounding box of the whole fontCharacterSet.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showCharacterSetForAllResponsesBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "It's obvious that identifying a letter by clicking requires display of a character set to click on. However, sometimes we show a foreign characterSet with Roman labels, to enable use of a Roman keyboard, or the scientist may just want the actual letter shapes to be visible while the participant types. This flag tells EasyEyes to display the fontCharacterSet whenever the participant is responding.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showCharacterSetWhere",
    availability: "now",
    example: "bottom",
    explanation:
      'showCharacterSetWhere can be bottom, top, left, or right. After a trial, this shows the observer the allowed responses. If the target was a letter then the possible letters are called the "characterSet". If the target is a gabor, the characterSet might display all the possible orientations, each labeled by a letter to be pressed.',
    type: "categorical",
    default: "bottom",
    categories: "none, bottom, top, left, right",
  },
  {
    name: "showCharacterSetWithLabelsBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "For foreign or symbol characterSets, we add Roman labels that the observer can type on an ordinary (Roman) keyboard.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showConditionNameBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "If TRUE, then display condition name as text at lower-left corner, or, if showTargetSpecsBool is TRUE, above target specs. See showTargetSpecsBool. The point size of condition-name text should be 1.4x bigger than we use for target specs.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showCounterBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'If TRUE display something like,"Trial 31 of 120. Block 2 of 3. At 32 cm." (The trailing part about distance is included only if showViewingDistanceBool is TRUE.) The trial counter counts all trials in the block, which may have several conditions. If the block has three conditions with 40 blocks each, then there are 120 trials in the block. ',
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "showCounterWhere",
    availability: "now",
    example: "bottomRight",
    explanation:
      "Can be bottomLeft, bottomCenter, or bottomRight. This location is used for both the trial count AND the viewing distance. ",
    type: "categorical",
    default: "bottomRight",
    categories: "bottomLeft, bottomRight, bottomCenter",
  },
  {
    name: "showFixationMarkBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Whether or not to show the fixation mark. Regardless of this parameter, we don't show fixation when targetRepeatsBool is TRUE. In that can we cover a large area of the screen with repeated targets. ",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "showFPSBool",
    availability: "now",
    example: "TRUE",
    explanation: "Show the frame rate in Hz. OBSOLETE",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showFrameRateBool",
    availability: "now",
    example: "TRUE",
    explanation: "Show the frame rate in Hz. OBSOLETE",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showGazeBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "showGazeBool shows a red dot indicating latest estimated gaze position. (It is delayed by processing time.)",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showGazeNudgerBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "After recording the participant's trial response, if showGazeNudgerBool is TRUE and abs(gazeMeasuredXDeg) > thresholdAllowedGazeXErrorDeg then EasyEyes displays a red arrow going from the recorded gaze position (gazeMeasuredXDeg, gazeMeasuredYDeg) to the crosshair and a popup window mentioning that the estimated gaze position was too far from the crosshair.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showGrid",
    availability: "now",
    example: "deg",
    explanation:
      "showGrid displays a full-screen grid that aids visual checking of location and size. Set showGrid to 'px' for a pixel grid, 'cm' for a centimeter grid, 'deg' for a degrees grid,  'mm' for a cortical grid, 'none' for no grid, and 'disabled' to prevent any grid. Unless 'disabled', repeatedly pressing the backquote key (below ESCAPE) cyles through the five states: px, cm, deg, mm, none. The 'px' and 'cm' grids have their origin at lower left. The 'deg' and 'mm' grids have their origin at fixation. ",
    type: "categorical",
    default: "disabled",
    categories: "px, cm, deg, mm, none, disabled",
  },
  {
    name: "showInstructionsWhere",
    availability: "now",
    example: "topLeft",
    explanation:
      'showInstructionsWhere can be topLeft or bottomLeft. This is shown after the stimulus disappears, to instruct the participant how to respond. A typical instruction for the identification task is: "Type your best guess for what middle letter was just shown." ',
    type: "categorical",
    default: "topLeft",
    categories: "none, topLeft, bottomLeft",
  },
  {
    name: "showPercentCorrectBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "If showPercentCorrectBool is true for any condition in this block, then, at the end of the block, EasyEyes presents a pop-up window reporting the overall percent correct (acrosss all conditions for which showPercentCorrectBool is TRUE) in that block. The participant dismisses the window by hitting RETURN or clicking its Proceed button. This feature was requested by maybe a third of the participants who sent comments.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "showProgressBarWhere",
    availability: "later",
    example: "right",
    explanation:
      "Can be none or right. Meant for children. Graphically displays a vertical green bar that tracks the trial count. The outline goes from bottom to top of the screen and it gradually fills up with green liquid, empty at zero trials, and filled to the top after the last trial of the block. Sometimes we call the green liquid spaceship fuel for Jamie the astronaut.",
    type: "categorical",
    default: "none",
    categories: "none, right",
  },
  {
    name: "showTakeABreakCreditBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "If showTakeABreakCreditBool then display the value of takeABreakCredit as a graphical icon next to the trial counter. A black box that gradually fills, from the bottom up, with glowing green. Empty for zero and full for 1. The box is currently centered at bottom of screen, but we plan to make it contiguous to the trial counter display.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showTargetSpecsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "For debugging. If true, showTargetSpecsBool displays various target parameters, including size and spacing, in lower left corner, similar to the trial/block counter. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showText",
    availability: "now",
    example: "Click the crosshair.",
    explanation:
      "showText displays the provided text at bottom left of screen, aligned left, with line breaking to show multiple lines. This is static, unchanged before, during, and after the stimulus. Default is empty string, no text. Same point size as used by showConditionNameBool. If all three are present, then showText on top, then showConditionNameBool, then showTargetSpecsBool at bottom. [Do we need showTextBeforeStimulus or showTextAfterStimulus?]",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "showViewingDistanceBool",
    availability: "now",
    example: "FALSE",
    explanation:
      'If TRUE display something like "Trial 31 of 120. Block 2 of 3. At 32 cm." (The trial and block counters appear only if showCounterBool is TRUE.) Without distance tracking, this is a subtle reminder to the participant of the distance they are supposed to be at. With distance tracking, it allows both the participant and the experimenter to monitor the dynamic viewing distance. It\'s updated only once or twice per trial, to avoid drawing attention away from the stimulus.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "simulateParticipantBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "Use the software model specifed by simulationModel to generale observer responses. The test runs without human intervention. SIDE EFFECT: Setting simulateParticipantBool to TRUE enables type as a response method, regardles of the setting of responseTypedBool.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "simulateWithDisplayBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "If true, then display the stimuli as though a participant were present. This is helpful for debugging. If false, then skip display to run as fast as possible.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "simulationBeta",
    availability: "now",
    example: "3",
    explanation: "Used by the Weibull observer model. ",
    type: "numerical",
    default: "2.3",
    categories: "",
  },
  {
    name: "simulationDelta",
    availability: "now",
    example: "0.01",
    explanation: "Used by the Weibull observer model.",
    type: "numerical",
    default: "0.01",
    categories: "",
  },
  {
    name: "simulationModel",
    availability: "now",
    example: "blind",
    explanation:
      "For debugging and checking it is often helpful to simulate the observer. simulationModel can be: \n• right: Always right.\n• wrong: Always wrong.\n• blind: This model merely presses a random response key. \n• ideal: This model does the same task as the human, picking the best response given the stimulus. Its threshold is a useful point of reference in analyzing human data. Without noise, it will always be right. Since noise is still months away, for now, just give the right answer.\n• weibull: This model gets the trial right with a probability given by the Weibull function, which is frequently fit to human data. The QUEST staircase asssumes the Weibull model, so QUEST should accurately measure its (unknown to Quest) threshold, when the respt of the parameters match. https://psychopy.org/api/data.html#psychopy.data.QuestHandler\nIn MATLAB, the Weibull model observer is: \nfunction response=SimulateWeibull(q,tTest,tActual)\n   t=tTest-tActual+q.epsilon;\n   P=q.delta*q.gamma+(1-q.delta)*(1-(1-q.gamma)*exp(-10.^(q.beta*t)));\n   response= P > rand(1);\nend\nresponse=1 means right, and response=0 means wrong. \nP=probability of a correct response\nq is a struct holding all the Weibull parameters. \nq.beta=simulationBeta\nq.delta=simulationDelta\nq.epsilon is set (once) so that P=thresholdProportionCorrect when tTest-tActual=0. \nq.gamma=probability of blindly guessing the correct answer\ntTest is the stimulus intensity level (usually log10 of physical parameter).\ntActual=log10(simulationThreshold) is the true threshold of the simulation\nrand(1) returns a random sample from the uniform distribution from 0 to 1.\nThe source code for our simulation model is here:\nhttps://github.com/EasyEyes/threshold/blob/a9ea5a6c64d3c5ff0aacfc01c86b6a5aecf64369/components/simulatedObserver.js",
    type: "categorical",
    default: "ideal",
    categories: "right, wrong, blind, weibull, ideal",
  },
  {
    name: "simulationThreshold",
    availability: "now",
    example: "0",
    explanation:
      "The actual threshold of the simulated observer in linear units (not log). We test the implementation of Quest by testing how well it estimates simulationThreshold.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "soundGainDBSPL",
    availability: "now",
    example: "13",
    explanation:
      "The \"gain\" (in dB) of the the participant's sound system. For a sound vector with level L (in dB), the output sound will have a level L+soundGainDBSPL (in dB SPL). The level of a vector is 10*log(P) dB, where P is the power, P=mean(S^2), where S is the sound vector. Currently the scientist sets soundGainDBSPL. Our plan is for EasyEyes to measure it on the participant's computer.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "spacingDeg",
    availability: "now",
    example: "",
    explanation:
      "spacingDeg specifies the spacing, in degrees, center-to-center from target to a flanker. This input value is ignored when you use Quest to measure the spacing threshold. If spacingDirection is radial then spacingDeg is the spacing from target to outer flanker. If spacingDirection is tangential then spacingDeg is spacing to each flanker, as the spacings are equal.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "spacingDirection",
    availability: "now",
    example: "radial",
    explanation:
      'spacingDirection. When eccentricity is nonzero then spacingDirection can be horizontal, vertical, horizontalAndVertical, radial, tangential, or radialAndTangential. When eccentricity is zero then spacingDirection can be horizontal, vertical, or horizontalAndVertical. The "And" options display four flankers, distributed around the target. It is an error to request radial or tangential spacingDirection at eccentricity zero.',
    type: "categorical",
    default: "radial",
    categories:
      "horizontal, vertical, horizontalAndVertical, radial, tangential, radialAndTangential",
  },
  {
    name: "spacingForRatioIsOuterBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "There are two flankers, inner and outer. In general each has a different (center to center) spacing to the target. To replicate CriticalSpacing data, when thresholdPameter is spacing, spacingSymmetry is cortex, and spacingRelationToSize is ratio, spacingForRatioIsOuterBool (default FALSE) determines whether target size is based on inner (FALSE) or outer (TRUE) spacing. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "spacingOverSizeRatio",
    availability: "now",
    example: "1.4",
    explanation:
      "spacingOverSizeRatio specifies the ratio of spacing (in deg, center of target to center of inner flanker) to size (in deg, can be width or height as specified by targetSizeIsHeightBool). Ignored unless spacingRelationToSize is ratio. In that case, target size is spacing/ratio.",
    type: "numerical",
    default: "1.4",
    categories: "",
  },
  {
    name: "spacingRelationToSize",
    availability: "now",
    example: "ratio",
    explanation:
      'spacingRelationToSize can be none, ratio, or typographic. When thresholdParameter is "spacing", spacingRelationToSize specifies how target size depend on center-to-center target-flanker spacing. And when thresholdParameter is "size", spacingRelationToSize specifies how spacing depend on size.\n• none means no dependence. Size and spacing are set independently. \n• ratio means accept the thresholdParameter (which is either size or spacing) and adjust the other parameter to satisfy the specified spacingOverSizeRatio. There are two flankers, inner and outer. In general each has a different (center to center) spacing to the target. "ratio" refers to the ratio of spacing to target size. Set spacingForRatioIsOuterBool to choose whether size scales with inner  (FALSE) or outer (TRUE) spacing.\n• typographic prints the triplet (flanker, target, flanker) as a (horizontal) string (horizontally) centered on the specified target eccentricity. By "horizontal" and "vertical", we just mean the orientation of the baseline, and orthogonal to it. ("Vertically," the characterSet bounding box is centered on the eccentric location, and all letters in the string are on same baseline.) If thresholdParameter is "spacing" then the font size of string is adjusted so that the width of the string is 3× specified spacing. Works with both left-to-right and right-to-left fonts. [If thresholdParameter is "size" then EasyEyes adjusts the font size of the string to achieve the specified target size.] ',
    type: "categorical",
    default: "ratio",
    categories: "none, ratio, typographic",
  },
  {
    name: "spacingSymmetry",
    availability: "now",
    example: "screen",
    explanation:
      'spacingSymmetry can be screen, retina, or cortex. This is ignored unless radial eccentrity is nonzero and spacingDirection is radial, which means that the target lies between two flankers, all on a radial line. The "inner" flanker is closer to fixation than the target. The "outer" flanker is farther than the target. We refer to the center-to-center spacing from target to inner and outer flankers as the inner and outer spacings. Parameter spacingDeg specifies the outer spacing. spacingSymmetry affects only the inner spacing, which is calculated to make the two flanker spacings symmetric in one of three ways: at the screen (i.e. equal in pixels), at the retina (i.e. equal in deg), or at the cortex, i.e.  log(outer+eccDeg + 0.15)-log(eccDeg + 0.15)=log(eccDeg + 0.15)-log(eccDeg-inner + 0.15), where eccDeg is the target\'s radial eccentricity in deg. To check the spacing symmetry, you may want to show a corresponding grid by setting parameter showGrid to px or cm (for screen), deg (for retina), and mm (for cortex).',
    type: "categorical",
    default: "retina",
    categories: "screen, retina, cortex",
  },
  {
    name: "takeABreakMinimumDurationSec",
    availability: "now",
    example: "2",
    explanation:
      "The minimum duration when EasyEyes takes a break. The main purpose of the break is to blink, so 2 sec is enough. See takeABreakTrialCredit.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "takeABreakTrialCredit",
    availability: "now",
    example: "0.05",
    explanation:
      'REQUESTED BY MANY PARTICIPANTS. Intended for long blocks, over 50 trials. Participants seem to spontaneously pause betwen blocks to catch their breath and blink their eyes, but they don\'t do that within a long block, and later complain that they feel stressed and that their eyes sting (because they didn\'t blink during the block), so we added this feature to force a break every so often. takeABreakTrialCredit sets the value that accrues from performing each trial of this condition. Set it to zero for no breaks. The block\'s running total, regardless of condition, is kept in the internal parameter takeABreakCredit, which is zero at the beginning of each block. When takeABreakCredit exceeds 1, EasyEyes immediately subtracts 1 and takes a break. \nTHE BREAK\nEasyEyes displays a pop-up window with a dark surround, "Good work! Please take a brief break to relax and blink." Responses (except ESCAPE) and viewing-distance nudging are suspended for the time specified by takeABreakMinimumDurationSec. Then EasyEyes reenables responses, adds a Proceed button, and adds text, "To continue hit Proceed or RETURN." The participant can take as long as they need. When they hit Proceed (or RETURN), EasyEyes closes the pop up window, reenables the nudger (if it was formerly active), and resumes testing. ',
    type: "numerical",
    default: "0.05",
    categories: "",
  },
  {
    name: "targetBoundingBoxHorizontalAlignment",
    availability: "now",
    example: "center",
    explanation:
      'When computing the characterSet bounding box as the union of the bounding box of each letter, align the bounding boxes horizontally by "center" or "origin". The bounding boxes are always vertically aligned by baseline.',
    type: "categorical",
    default: "center",
    categories: "center, origin",
  },
  {
    name: "targetContrast",
    availability: "soon",
    example: "-1",
    explanation:
      "Weber contrast ∆L/L0 of a letter or Michelson contrast (LMax-LMin)/(LMax+LMin) of a Gabor. A white letter is 100% contrast; a black letter is -100% contrast. Currently accurate only for 0 and ±1.",
    type: "numerical",
    default: "-1",
    categories: "",
  },
  {
    name: "targetDurationSec",
    availability: "now",
    example: "0.15",
    explanation:
      "The duration of target presentation. For demos and debugging, it is handy to set responseAllowedEarlyBool to TRUE with a long targetDurationSec (e.g. 999) so that the stimulus stays up while you examine it, yet you can quickly click through several stimuli to see the progression. Set responseAllowedEarlyBool to FALSE if you want to allow response only after target offset.",
    type: "numerical",
    default: "0.15",
    categories: "",
  },
  {
    name: "targetEccentricityXDeg",
    availability: "now",
    example: "10",
    explanation:
      "targetEccentricityXDeg is the x location of the target center, relative to fixation. The target center is defined as the center of the bounding box for the letters in the fontCharacterSet. (See targetBoundingBoxHorizontalAlignment.)",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetEccentricityYDeg",
    availability: "now",
    example: "0",
    explanation:
      "targetEccentricityYDeg is the y location of the target center, relative to fixation.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetImageFolder",
    availability: "now",
    example: "faces",
    explanation:
      "The name of a folder of images, to be used when targetKind==image. The folder is submitted as a zip archive to the EasyEyes drop box, and saved in the Pavlovia account in the Folders folder. The name of the zip archive, without the extension, must match the value of targetImageFolder. We could also allow our submit box to accept a folder, which it copies, including all the enclosed files, ignoring any enclosed folders.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "targetKind",
    availability: "now",
    example: "letter",
    explanation:
      '• letter On each trial, the target is a randomly selected character from the fontCharacterSet displayed in the specified font and targetStyle.\n• gabor A gabor is the product of a Gaussian and a sinewave. As a function of space, the sinewave produces a grating, and the Gaussain vignettes it to a specific area, without introducing edges. Gabors are a popular stimulus in vision research because they have compact frequency and location.\n• image An image is randomly drawn, without replacement (for this condition in this block) from a folder whose name is specified by targetImageFolder. The image is displayed at the target eccentricity with the target size.\n• sound A sound is randomly drawn, without replacement (for this condition in this block) from a folder whose name is specified by targetSoundFolder. The target sound is played for its full duration at level targetSoundDBSPL with a masker sound randomly selected from the maskerSoundFolder played at level maskerDBSPL. Also we play targetSoundNoise at level targetSoundNoiseDBSPL.\n• vocoderPhrase. The targetSoundFolder and maskerSoundFolder each contain a hierarchy of folders containing 16-channel sound files. Each sound file is named for a word and contains the original or processed sound of that word (except that the file called "GoTo.wav" in fact contains the two words "go to"). The top level of folders in targetSoundFolder and maskerSoundFolder are folders of sounds produced by several talkers. Currently the talkers (Talker11, Talker14, Talker16, and Talker18) are all female. On each trial the target and masker are randomly assigned different talkers (never equal). Within each talker\'s folder are several loose word files (Now.wav, GoTo.wav, and Ready.wav), and several category folders (CallSign, Color, Number) that each contain several word files. Each trial follows text phrases provided in the parameters targetSoundPhrase and maskerSoundPhrase. Each phrase consists of a series of explicit words and category names, with each category name preceded by #. Currently the targetSoundPhrase is "Ready Baron GoTo #Color #Number Now", and the maskerSoundPhrase is "Ready #CallSign GoTo #Color #Number Now". The target and masker phrases are played at the same time, aligning the temporal midpoint of both words in each target-masker pair by symmetrically padding both ends of the briefer word with zeroes to make it the same length as the longer word. Each explicit word in each script is played every time. On each trial, each word category, marked by #, is replaced by a randomly selected word from that category folder, except that target and masker are always different from each other when either is drawn from a category.  On each trial, the target and masker phrases are combined by randomly taking 9 of the 16 channels of every word in the target phrase, and the remaining 7 channels from the masker words. The channel selection is consistent for all the words in the phrase, and new for each trial. targetSoundDBSPL specifies the sound level of the combined 9 channels taken from each target word. Similarly maskerSoundDBSPL specifies the sound level of the combined 7 channel taken from each masker word. Also, we play targetSoundNoise at level targetSoundNoiseDBSPL. The Zhang et al. (2021) paper mentions a noise control, in which the masker is white noise that has been filtered into 16 bands and windowed into word-length durations. The scientist achieves this simply by providing a maskerSoundFolder made up of these 16-channel noises, each derived from a word. \nRESPONSE. After playing the phrase, EasyEyes displays two columns, one for each category word in the targetSoundPhrase. The observer must select one word in each column in order to proceed to the next trial. (This is forced choice.) We score the trial as right only if both responses are right. That overall right/wrong response is provided to QUEST, which controls the targetSoundDBSPL.\n• reading Measure reading speed and retention. reading should be reclassified as a targetTask.\n',
    type: "categorical",
    default: "letter",
    categories: "letter, gabor, image, sound, vocoderPhrase, reading",
  },
  {
    name: "targetMinimumPix",
    availability: "now",
    example: "8",
    explanation:
      "Enough pixels for decent rendering of this target. This refers to size (in pixels) as specified by targetSizeIsHeightBool.",
    type: "numerical",
    default: "8",
    categories: "",
  },
  {
    name: "targetRepeatsBool",
    availability: "later",
    example: "FALSE",
    explanation:
      'Display many copies of two targets, alternating across the screen. The observer reports both. Thus each presentation gets two responses, which count as two trials. David Regan and colleagues (1992) reported that in testing foveal acuity of patients with poor fixation (e.g. nystagmus) it helps to have a "repeat-letter format" eye chart covered with letters of the same size, so that no matter where the eye lands, performance is determined by the letter nearest to the point of fixation, where acuity is best. We here extend that idea to crowding. We cover some part of the screen with an alternating pattern of two letters, like a checkerboard, so that the letters can crowd each other, and ask the observer to report both letters. Again, we expect performance to be determined by the letters nearest to the (unpredictable) point of fixation, where crowding distance is least.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "targetRepeatsBorderCharacter",
    availability: "later",
    example: "$",
    explanation:
      "When targetRepeatsBool, then targetRepeatsBorderCharacter specifies the character to use to make the outer border. This character has letters on only one side, so it's less crowded. So we don't want to give the fame away by putting a target letter here.",
    type: "text",
    default: "$",
    categories: "",
  },
  {
    name: "targetRepeatsMaxLines",
    availability: "later",
    example: "3",
    explanation:
      "targetRepeatsMaxLines can be 1, 3, 4, … . It specifies the desired number of lines, but fewer lines may be displayed if limited by screen height. Sarah Waugh recommends 3.",
    type: "numerical",
    default: "3",
    categories: "",
  },
  {
    name: "targetSafetyMarginSec",
    availability: "now",
    example: "0.5",
    explanation:
      "IMPORTANT: Currently targetSafetyMarginSec only affects the after-target delay, from target offset to response screen onset. The participant cannot respond during that delay. targetSafetyMarginSec has no effect on the before-target delay. Use markingOffsetBeforeTargetOnsetSecs to control the delay between clicking the crosshair and display of the target.\n****************************\nEasyEyes guarantees a blank time of targetSafetyMarginSec before and after the target presentation to minimize forward and backward masking of the target by instructions and other non-stimulus elements, including the characterSet and nudger. \n     OFFSET: After target offset, EasyEyes waits targetSafetyMarginSec before presenting instructions and the characterSet. (Nudging isn't allowed until after the participant responds.)\n\nNOT YET IMPLEMENTED:\n     ONSET: Since target onset is almost immediately after trial initiation, initiation of a trial is disabled until targetSafetyMarginSec has passed since the nudger and instructions were erased. \n     Instruction contrast c will be determined by the ratio r of cursor-to-crosshair distance to characterSet-to-crosshar distance. \n          c=max(0, 2r-1). \nThus, as the cursor moves from the response characterSet to the crosshair, the instruction contrast will initally be 1 when the cursor is at the characterSet (r=1), will linearly fall to reach zero halfway to the crosshair (r=0.5), and remain at zero the rest of the way to the crosshair (r=0). ",
    type: "numerical",
    default: "0.7",
    categories: "",
  },
  {
    name: "targetSizeDeg",
    availability: "now",
    example: "5",
    explanation:
      "Ignored unless needed. Size is either height or width, as specified by targetSizeIsHeightBool. Height and width are based on the union of the bounding boxes of all the letters in fontCharacterSet. ",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "targetSizeIsHeightBool",
    availability: "now",
    example: "FALSE",
    explanation:
      'Define "size" as height (true) or width (false). This parameter is ignored when setting size by spacing.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "targetSoundChannels",
    availability: "now",
    example: "7",
    explanation:
      "When the target sound file has more than one channel, targetSoundChannels specified how many (randomly selected) channels are used to create the target stimulus. Typically the rest of the channels are taken from the masker sound file.",
    type: "integer",
    default: "9",
    categories: "",
  },
  {
    name: "targetSoundDBSPL",
    availability: "now",
    example: "20",
    explanation:
      'If targetKind is "sound", targetSoundDBSPL specifies target sound level.',
    type: "numerical",
    default: "20",
    categories: "",
  },
  {
    name: "targetSoundFolder",
    availability: "now",
    example: "sounds",
    explanation:
      "The name of a folder of sound files, to be used when targetKind==sound. The folder is submitted as a zip archive to the EasyEyes drop box, and saved in the Pavlovia account in the Folders folder. The name of the zip archive, without the extension, must match the value of targetSoundFolder. We could also allow our submit box to accept a folder, which it copies, including all the enclosed files, ignoring any enclosed folders.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "targetSoundNoiseBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'If targetKind is "sound", and targetSoundNoiseBool is TRUE, then add noise to the target. The noise is zero mean Gaussian white noise, clipped at ±2 SD. Any reported SD is after clipping. Use a 10 ms squared sine ramp at onset and a 10 ms squared cosine ramp at offset. We could add a parameter to request leaving the noise on continuously. ',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "targetSoundNoiseClockHz",
    availability: "now",
    example: "20000",
    explanation: "The clock rate of the auditory noise.",
    type: "numerical",
    default: "20000",
    categories: "",
  },
  {
    name: "targetSoundNoiseDBSPL",
    availability: "now",
    example: "20",
    explanation:
      "The desired noise level in dB SPL. The default (-999) is interpreted as no noise.",
    type: "numerical",
    default: "-999",
    categories: "",
  },
  {
    name: "targetSoundNoiseOffsetReTargetSec",
    availability: "now",
    example: "0.5",
    explanation: "Positive when noise ends after the target ends.",
    type: "numerical",
    default: "0.3",
    categories: "",
  },
  {
    name: "targetSoundNoiseOnsetReTargetSec",
    availability: "now",
    example: "-0.5",
    explanation: "Positive when noise starts after the target starts.",
    type: "numerical",
    default: "-0.3",
    categories: "",
  },
  {
    name: "targetSoundPhrase",
    availability: "now",
    example: "",
    explanation:
      'targetSoundPhrase is a text phrase that is used when targetKind is 16ChannelSound. The phrase consists of a series of words and category names, with each category name preceded by #. Currently the targetSoundPhrase is "Ready Baron GoTo #Color #Number Now". Every word must appear as a sound file with that name, and every category must appear as a folder with that name, both in the current talker folder in the targetSoundFolder.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "targetTask",
    availability: "now",
    example: "identify",
    explanation:
      'Can be one or multiple of the following categories.\n• identify is forced-choice categorization of the target among known possibilities, e.g. a letter from a characterSet or an orientation among several. \n• questionAndAnswer The participant will be presented a question.\n• detect In yes-no detection, we simply ask "Did you see the target?". In two-alternative forced choice detection, we might display two intervals, only one of which contained the target, and ask the observer which interval had the target: 1 or 2? We rarely use detection because it needs many more trials to measure a threshold because its guessing rate is 50%, whereas identifying one of N targets has a guessing rate of only 1/N.',
    type: "categorical",
    default: "identify",
    categories: "identify, detect, questionAndAnswer",
  },
  {
    name: "thresholdAllowedDurationRatio",
    availability: "now",
    example: "1.5",
    explanation:
      "thresholdAllowedDurationRatio. QUEST receives the trial's response only if measured duration is in the range [targetDurationSec/r targetDurationSec*r], where r=thresholdAllowedDurationRatio. r must be greater than 1.",
    type: "numerical",
    default: "1.5",
    categories: "",
  },
  {
    name: "thresholdAllowedGazeRErrorDeg",
    availability: "now",
    example: "4",
    explanation:
      "thresholdAllowedGazeRErrorDeg. QUEST receives the trial's response only if the measured gaze position during target presentation has a radial eccentricity in deg less than or equal to thresholdAllowedGazeRErrorDeg.",
    type: "numerical",
    default: "1.00E+10",
    categories: "",
  },
  {
    name: "thresholdAllowedGazeXErrorDeg",
    availability: "now",
    example: "4",
    explanation:
      "thresholdAllowedGazeXErrorDeg. QUEST receives the trial's response only if the measured gaze position during target presentation has an xDeg eccentricity whose absolute value is less than or equal to thresholdAllowedGazeXErrorDeg.",
    type: "numerical",
    default: "1.00E+10",
    categories: "",
  },
  {
    name: "thresholdAllowedGazeYErrorDeg",
    availability: "now",
    example: "4",
    explanation:
      "thresholdAllowedGazeYErrorDeg. QUEST receives the trial's response only if the measured gaze position during target presentation has a Y eccentricity whose absolute value is less than or equal to  thresholdAllowedGazeYErrorDeg.",
    type: "numerical",
    default: "1.00E+10",
    categories: "",
  },
  {
    name: "thresholdAllowedLatencySec",
    availability: "now",
    example: "0.1",
    explanation:
      "thresholdAllowedLatencySec. QUEST receives the trial's response only if measured target latency is less than or equal to thresholdAllowedLatencySec.",
    type: "numerical",
    default: "0.1",
    categories: "",
  },
  {
    name: "thresholdBeta",
    availability: "now",
    example: "2.3",
    explanation:
      'QUEST sets the "steepness" of the Weibull psychometric function to thresholdBeta.',
    type: "numerical",
    default: "2.3",
    categories: "",
  },
  {
    name: "thresholdDelta",
    availability: "now",
    example: "0.01",
    explanation:
      "QUEST set the asymptote of the Weibull psychometric function to 1-thresholdDelta.",
    type: "numerical",
    default: "0.01",
    categories: "",
  },
  {
    name: "thresholdGamma",
    availability: "now",
    example: "0.5",
    explanation:
      "thresholdGamma is a parameter of the psychometric function used by QUEST. thresholdGamma is the probability of correct/yes response when target is at zero strength. In an identification task, we typically set gamma to 1/n, where n is the number of equal-probability possible targets. When the target is a letter, n=length(fontCharacterSet). In two-alternative forced choice we typically set gamma to 0.5. The various targetTasks each have different default values of gamma. If you leave thresholdGamma empty then you'll get that default. If you set thresholdGamma then the value you provide will overrule the default.",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "thresholdGuess",
    availability: "now",
    example: "2",
    explanation:
      "Used to prime QUEST by providing a prior PDF, which is specified as a Gaussian as a function of the log threshold parameter. Its mean is the log of your guess, and its SD (in log units) is specifed below . We typically take our guess from our standard formulas for size and spacing threshold as a function of eccentricity.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "thresholdGuessLogSd",
    availability: "now",
    example: "2",
    explanation:
      "Used by QUEST. Sets the standard deviation of the prior PDF as a function of log of the threshold parameter.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "thresholdParameter",
    availability: "now",
    example: "spacing",
    explanation:
      'thresholdParameter designates that a parameter (e.g. size or spacing) will be controlled by Quest to find the threshold at which criterion performance is attained.  \n• "spacing" to vary center-to-center spacing of target and neighboring flankers. \n• "size" to vary target size. \n• "contrast" awaits HDR10 support.\n• "eccentricity"  to be added soon.\n• "soundLevel" awaits sound support.\n• "soundNoiseLevel" awaits sound support.',
    type: "categorical",
    default: "spacing",
    categories: "spacing, size, soundLevel",
  },
  {
    name: "thresholdProcedure",
    availability: "now",
    example: "QUEST",
    explanation:
      'Can be QUEST or none. We may add Fechner\'s "method of constant stimuli". Note that when rendering we restrict the threshold parameter to values that can be rendered without artifact, i.e. not too small to have enough pixels to avoid jaggies and not too big for target (and flankers in spacing threshold) to fit entirely on screen. The response returned to QUEST is accompanied by the true value of the threshold parameter, regardless of what QUEST suggested.',
    type: "categorical",
    default: "QUEST",
    categories: "none, QUEST",
  },
  {
    name: "thresholdProportionCorrect",
    availability: "now",
    example: "0.7",
    explanation:
      'Used by QUEST, which calls it "pThreshold". This is the threshold criterion. In Methods you might say that "We defined threshold as the intensity at which the participant attained 70% correct." This corresponds to setting thresholdProportionCorrect to 0.7.\nPsychoJS code:\nhttps://github.com/kurokida/jsQUEST/blob/main/src/jsQUEST.js\nhttps://github.com/psychopy/psychojs/blob/2021.3.0/src/data/QuestHandler.js',
    type: "numerical",
    default: "0.7",
    categories: "",
  },
  {
    name: "thresholdRepeatBadBlockBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'If true, and this condition\'s threshold is "bad" (see below), then the block will be run again (only once even if again bad). The criterion for "bad" is that QuestSD>0.25. Several conditions in a block may make this request and be bad, but we still repeat the block only once. When we add a block, we should adjust the trial/block counter to reflect the change. (The 0.25 criterion is right for 35 trials, beta=2.3, and many possible targets. Later i\'ll write a more general formula and provide a way for the scientist to specify an arbitrary criterion value of QuestSD.)',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "viewingDistanceAllowedRatio",
    availability: "now",
    example: "1.3",
    explanation:
      'viewingDistanceAllowedRatio must be positive, and specifies a tolerance interval around the desired viewing distance D. If viewingDistanceAllowedRatio>1, then the allowed range of viewing distance is D/viewingDistanceAllowedRatio to D*viewingDistanceAllowedRatio. If it\'s <1 then the allowed range of viewing distance is D*viewingDistanceAllowedRatio to D/viewingDistanceAllowedRatio. Enforcement is only possible when viewing distance is tracked. In that case, testing is paused while viewing distance is outside the allowed range, and the participant is encouraged to move in or out, as appropriate, toward the desired viewing distance. We call that "nudging". A value of 0 allows all viewing distances. [CSV and Excel files do not allow Inf.]',
    type: "numerical",
    default: "1.2",
    categories: "",
  },
  {
    name: "viewingDistanceDesiredCm",
    availability: "now",
    example: "45",
    explanation:
      "If viewingDistanceDesiredCm is nonzero, then it specifies the desired viewing distance. The default is zero, which is ignored. If head tracking is enabled, then stimulus generation will be based on the actual viewing distance of each trial. Without head tracking, we estimate the viewing distance at the beginning of the experiment, and later again at the beginning of any new block with a different desired viewing distance. The EasyEyes compiler should require that all conditions within a block have the same desired viewing distance.\n     The output CSV data file reports viewingDistanceCm. If head tracking is enabled, then stimulus generation will be based on the actual viewing distance of each trial. Without head tracking, we estimate the viewing distance at the beginning of the experiment, and later again at the beginning of any new block with a different desired viewing distance. ",
    type: "numerical",
    default: "40",
    categories: "",
  },
  {
    name: "viewingDistanceMaxForScreenHeightDeg",
    availability: "now",
    example: "30",
    explanation:
      "viewingDistanceMaxForScreenHeightDeg places an upper limit on viewing distance so that the screen will have (at least) the specified height in deg. Default is zero, which is ignored. This depends on screen height in cm, which is unknown until size calibration. All three viewingDistanceMXXX parameters place bounds on viewing distance (cm). If viewingDistanceDesiredCm is nonzero then it sets the viewing distance, and if it's zero then viewing distance is a degree of freedom. Whether or not the viewing distance is set, EasyEyes rejects as incompatible any screen that cannot satisfy all the viewingDistanceXXX restrictions. The combination of viewingDistanceMaxXXX and viewingDistanceMinForTargetSizeDeg sets a lower bound on screen width and/or height in pixels, \nminWidthPx=viewingDistanceMaxForScreenWidthDeg*targetSizePx/viewingDistanceMinForTargetSizeDeg\nand\nminHeightPx=viewingDistanceMaxForScreenHeightDeg*targetSizePx/viewingDistanceMinForTargetSizeDeg\nwhich EasyEyes checks on its compatibility screen, before size calibration. Incompatibility with a particular viewingDistanceDesiredCm can only be discovered after size calibration.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "viewingDistanceMaxForScreenWidthDeg",
    availability: "now",
    example: "30",
    explanation:
      "viewingDistanceMaxForScreenWidthDeg places an upper limit on viewing distance so that the screen will have (at least) the specified width in deg. Default is zero, which is ignored. This depends on screen width in cm, which is unknown until size calibration. ",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "viewingDistanceMinForTargetSizeDeg",
    availability: "now",
    example: "0.02",
    explanation:
      "viewingDistanceMinForTargetSizeDeg places a lower limit on viewing distance so that the screen will have enough pixels per deg to display a target of specified size in deg. Default is zero, which is ignored. This depends on screen resolution in px/cm, which is unknown until size calibration. This calculation uses  targetMinimumPix.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "viewingDistanceNudgingBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Setting viewingDistanceNudgingBool TRUE enables the nudger. The nudger compares measured viewing distance to desired viewing distance, and if the ratio exceeds the range allowed by viewingDistanceAllowedRatio then it puts up a display (covering the whole screen) telling the participant to MOVE CLOSER or FARTHER, as appropriate. The display goes away when the participant is again within the allowed range. The viewing-distance nudger (\"Closer!\", \"Farther!\") gets the participant to the right distance. \n     We protect the stimulus from nudging. The nudger will never occlude, or forward or backward mask, the stimulus. Think of the trial as beginning at the participant's click (or keypress) requesting the stimulus and ending at the click (or keypress) response. This leaves a pre-trial interval from the response until the click requesting the next trial. EasyEyes nudges only before and between trials. Furthermore, to prevent forward masking, EasyEyes ignores attempts to click (or key press) during nudging and until targetSafetyMarginSec after nudging. Accepted clicks (or keypresses) produce a click sound. Ignored attempts are silent.\n    For now, the trial software sets nudgingAllowedBool to TRUE only during the pre-trial, and sets nudgingCancelsTrialBool to always be FALSE. \n\n     FUTURE. To make sure that the stimulus is never obscured by nudging, we designate three intevals:\nPRE-TRIAL INTERVAL. From time of response to the previous trial (click or keypress) until the participant requests a new trial (space bar or click on crosshair) we allow nudging. \nSTIMULUS INTERVAL. From the participant's request for a new trial (space bar or click on crosshair) until the end of the stimulus, we protect the stimulus by suspending nudging. \nRESPONSE INTERVAL. From the end of the stimulus until the observer responds, we also suspend nudging, so the nudge won't interfere with remembering the target. \nIf we acquire the possibility of canceling a trial, then we could allow nudging during the stimulus interval, and immediately cancel that trial. Once a trial has been canceled we do NOT wait for a response. Instead, we proceed directly to draw the crosshair for the next trial. Canceling a trial is not trivial. We need to put this trial's condition back into the list of conditions to be run, and that list needs to be reshuffled, so the participant won't know what the next trial will be. I suppose that what happened will be obvious to the participant, so we don't need to explain that the trial was canceled. I see two stages of implementation. First the trial software needs to provide and update two flags: nudgingAllowedBool and nudgingCancelsTrialBool. The current version of MultistairHandler doesn't cope with trial cancelation. For now, the trial software sets nudgingAllowedBool to TRUE only during the pre-trial interval, and sets nudgingCancelsTrialBool to always be FALSE. Once we know how to cancel a trial, during the stimulus interval we'll set both nudgingAllowedBool and nudgingCancelsTrialBool to TRUE. \n",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "wirelessKeyboardNeededBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "Needed at viewing distances beyond 60 cm. Could be commercial wireless keyboard or EasyEyes keypad emulator running on any smartphone. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
];

export const SUPER_MATCHING_PARAMS: string[] = ["questionAndAnswer@@"];
