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
      "Optional, brief description of the whole experiment. Ignored by EasyEyes, but saved with results. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_authorEmails",
    availability: "now",
    example: "dp3@nyu.edu",
    explanation:
      "Optional, semicolon-separated email addresses of the authors.  The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_authors",
    availability: "now",
    example: "Denis Pelli",
    explanation:
      "Optional, names of all the authors, separated by semicolons. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_calibratePhoneMicBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "_calibratePhoneMicBool (default FALSE) enables calibration of a new smartphone microphone. This is intended solely for use by scientists, and requires a calibrated reference microphone, initially just the miniDSP UMIK-1 (available from miniDSP for $79). The new calibration file will be added to the EasyEyes library of phone calibrations.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_calibrateScreenSizeCookieBool",
    availability: "now",
    example: "",
    explanation:
      "_calibrateScreenSizeCookieBool (default TRUE) when TRUE enables EasyEyes reading and saving of a cookie (on the participant computer) containing the screen resolution (px) and size (cm),  e.g. 3024 px x 1964 px, 24.5 cm x 16 cm. The cookie is read only if it's present and calibrateScreenSizeCookieBool==TRUE. If read, the cookie is considered valid only if it reports a screen resolution (width x height px) that matches the current resolution. If valid then EasyEyes takes the screen size (width x height cm) from the cookie instead of doing the calibration normally provoked by calibrateScreenSizeBool==TRUE. Lacking a valid cookie, then calibrateScreenSizeBool==TRUE will provoke size calibration. If size is actually calibrated, and calibrateScreenSizeCookieBool==TRUE, then a cookie is saved, holding the screen resolution and size. The reason to check for validity is that the computer might have several screens, and the browser window could be opened on any of them. The chances are low that a given computer will have two screens with different sizes and the same resolution. Set calibrateScreenSizeCookieBool=FALSE to rule out the small chance of mistaking a new display for a same-resolution but differently sized one that was calibrated on a previous occasion.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_calibrateSoundAssumingThisICalibDBSPL",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundAssumingICalibDBSPL (default 76) is a calibration factor for iPhone recordings. The physical sound level (in dB SPL) is iCalib+20*log10(rms), where rms is the root mean square of the digital sound recording. The value we got from the internet was 104.9. The value we use is based on our calibration of an iPhone 12 Pro by the UMIK-1 digital microphone and the REW software, which reads the (90 deg, i.e. vertically oriented) factory calibration of the UMIK-1 microphone. The scientist can override the current default by setting this parameter in the experiment table. The compiler allows you to provide a different value for each condition, but in fact it's used only once, during calibration, and I suppose we use the value provided for the first condition. The value of iCalib is included in the Sound Calibration report, both on screen, and in the CSV file that you can optionally download.",
    type: "numerical",
    default: "76",
    categories: "",
  },
  {
    name: "_calibrateTimingNumberAndSecs",
    availability: "now",
    example: "",
    explanation:
      '🕑 _calibrateTimingNumberAndSecs accepts a text string containing an even number of comma-separated arguments, n1,s1,n2,s2, etc. Each pair of arguments n,s, requests that EasyEyes generate n intervals of duration s, where s is in seconds, and measure how long each interval actually was, in seconds. Save the results in the CSV file. Use one column per series. Name each column by the duration in sec, e.g. "timing0.15". The column length will be n. This should run during the compatibility phase, before the experiment, since its sole purpose is to work out the parameters of a compatibility test.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_compileAsNewExperimentBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 _compileAsNewExperimentBool (default TRUE) can be set to FALSE to accommodate users without an institutional Pavlovia license. Without that license, Pavlovia requires assigning tokens (money) to each experiment before it can run in RUNNING mode. If _compileAsNewExperimentBool=TRUE (the default), then, when EasyEyes compiles your experiment, EasyEyes appends the smallest possible integer (at least 1) to the spreadsheet filename (without extension) to create a unique (unused) experiment name. That keeps versions apart, and keeps the data from each version in its own repository. However, for users without a site license, Pavlovia requires that tokens be assigned in advance to the specific experiment (repo). For them, every time EasyEyes changes the repo name, they must visit Pavlovia to assign tokens to the new repo, which can be a nuisance. Token users (i.e. without a site license) can minimize the token-assignment nuisance by setting _compileAsNewExperimentBool=FALSE to reuse the old repo, instead of creating a new repo every time they compile. The downside is that if you collect data, edit the table, and collect more data, the data files will all be together in the same repo, distinguished only by date. When _compileAsNewExperimentBool is FALSE, scientists only need to assign tokens the first time they compile (when it's a new repo). Once it has tokens, provided the name of the spreadsheet file is unchanged, they can keep testing, through countless compiles, without visiting Pavlovia, until the experiment runs out of tokens. Note that this flag doesn't affect PILOTING mode, which is always free and can only be used from within Pavlovia. Also, any users concerned over the huge proliferation of repos might like to set _compileAsNewExperimentBool FALSE to minimize the number of repos created by EasyEyes.\nSee _pavloviaPreferRUNNINGModeBool for a more advice on working without an institutional Pavlovia site license.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_consentForm",
    availability: "now",
    example: "adultConsent2021.pdf",
    explanation:
      "⭑ Optional, brief description of the whole experiment. Ignored by EasyEyes, but saved with results. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_daisyChainURLAfterEasyEyes",
    availability: "now",
    example: "http://xyz?cc=123",
    explanation:
      "🕑 _daisyChainURLAfterEasyEyes is a URL (with query parameters) that will add to a daisy chain of testing apps. This single or cascade of URLs will run after the EasyEyes study. Typically the last step is the completion page in Prolific (or MTurk), coding the participant as eligible for payment. The study URL returned by EasyEyes will run the whole cascade, including URLBeforeEasyEyes, the EasyEyes study, and URLAfterEasyEyes. Daisy chaining suggested by Becca Hirst at Open Science Tools. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_daisyChainURLBeforeEasyEyes",
    availability: "now",
    example: "http://xyz?cc=123",
    explanation:
      "🕑 _daisyChainURLBeforeEasyEyes is a URL (with query parameters) that will begin a daisy chain of testing apps. This single or cascade of URLs will run first, before the EasyEyes study. Typically the last step is the completion page in Prolific (or MTurk), signaling the participant's eligibility for payment. The study URL returned by EasyEyes will run the whole cascade, including URLBeforeEasyEyes, the EasyEyes study, and URLAfterEasyEyes. Thanks to Becca Hirst at Open Science Tools for suggesting daisy chaining.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_dateCreated",
    availability: "now",
    example: "8/1/2021",
    explanation:
      "Optional date of creation. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "date",
    default: " ",
    categories: "",
  },
  {
    name: "_dateModified",
    availability: "now",
    example: "8/15/2021",
    explanation:
      "Optional date of latest modification. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "date",
    default: " ",
    categories: "",
  },
  {
    name: "_debriefForm",
    availability: "now",
    example: "debrief2021.pdf",
    explanation:
      "⭑ _debriefForm is the file name of your PDF (or plain-text Markdown with extension MD) debrief document in the folder EasyEyesResources/forms/ in your Pavlovia account. The EasyEyes.app/threshold page makes it easy to upload your debrief form(s) to that folder. The compiler will check that a file with this name is present in your EasyEyesResources/ConsentForms folder on Pavlovia. See consent in Glossary for information about testing minors and children. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_debugBool",
    availability: "now",
    example: "",
    explanation:
      "_debugBool enables features that only the scientist should see. This includes extra calibration tests and buggy new features that are still under development.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_experimentFilename",
    availability: "now",
    example: "crowding.csv",
    explanation:
      "❌ _experimentFilename is the filename of the experiment table, including the extension, typically XLSX or CSV. THIS IS RECORDED BY EASYEYES. DO NOT INCLUDE IT IN YOUR SPREADSHEET.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_experimentName",
    availability: "now",
    example: "",
    explanation:
      "❌ Obsolete, but EasyEyes crashes if we remove it. THIS IS RECORDED BY EASYEYES. DO NOT INCLUDE IT IN YOUR SPREADSHEET. It is important for EasyEyes to have the experiment name as an internal parameter, but we do NOT allow the scietist to set it. It is always created by appending the smallest positive integer (1, 2, ...) to the filename (wihtout extensiion) of the experiment spreadsheet to create a unique repository in the scientist's Pavlovia account. So we want an internal parameter called experimentName, and NOT and input parameter with that name.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_experimentSavePartialResultsBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 _experimentSavePartialResultsBool (default TRUE) determines whether partial results are saved. This is a feature in Pavlovia that should be enabled or disabled by EasyEyes using the Pavlovia API. Pavlovia (and EasyEyes) charges one token per saved session. Incomplete sessions are free if they are not saved.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_invitePartingCommentsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "🕑 At the end of the experiment, invite the participant to make parting comments. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_language",
    availability: "now",
    example: "",
    explanation:
      "⭑ _language (default English) is the English name of the initial language of the experiment, e.g. English, German, or Arabic. We currently support 28 languages, and it would be very easy to add more. The translations, mostly by Google Translate, are far from perfect, but we occasionally paste in better translations for key phrases. If _languageSelectionByParticipantBool==TRUE then the initial compatibiliy page allows the participant to choose any of 28 languages for the rest of the experiment. Otherwise the language remains as set by _language.",
    type: "categorical",
    default: "English",
    categories:
      "English, German, French, Spanish, Portuguese, Italian, Romanian, Polish, Russian, Armenian, Finnish, Georgian, Hebrew, Arabic, Urdu, Hindi, Tamil, Malayalam, Telugu, Kannada, Bangla, Indonesian, Simplified Chinese, Traditional Chinese, Japanese, Korean",
  },
  {
    name: "_languageSelectionByParticipantBool",
    availability: "now",
    example: "",
    explanation:
      "If _languageSelectionByParticipantBool is TRUE (default FALSE), then the initial compatibility page offers the participant a pull-down menu to select any language for the rest of the experiment. The experiment always begins with the language specified by _language, and the language changes only if  _languageSelectionByParticipantBool=TRUE and the participant selects another language. The participant selects among the native names of the languages, e.g. English, Deutsch, عربي. EasyEyes currently offers 28 languages, and it would be very easy to add more. If there's demand, we could add another parameter to specify a list of languages to offer to the participant.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_needBrowser",
    availability: "now",
    example: "Chrome",
    explanation:
      "⭑ _needBrowser is a comma-separated list either of compatible browsers or of incompatible browsers. The list can be 'all', or just compatible browsers by name, or just incompatible browsers each preceded by \"not\". No mixing allowed. In a list of compatibles, then anything not listed is deemed incompatible. In an incompatible list, then anything not listed is deemed compatible. Before asking for consent, if the participant's device is incompatible, we reject it by issuing a fatal explanatory error message to the participant (asking the Prolific participant to \"return\" this study), which ends the session (with no pay). \nAfter compiling your experiment, copy the needs statement from the EasyEyes page into your _online2Description to satisfy Prolific's rule that all study requirements be declared in the study's Description.",
    type: "multicategorical",
    default: "Chrome",
    categories:
      "all, Chrome, Safari, Firefox, Opera, Edge, Chromium, Tor, Duckduckgo, Brave, Vivaldi, Midori, SamsungInternet, UCBrowser, Android, Firefox, QQBrowser, Instabridge, WhaleBrowser, Puffin, YandexBrowser, EdgeLegacy, Edge, CocCoc, notChrome, notSafari, notFirefox, notOpera, notEdge, notChromium, notTor, notDuckduckgo, notBrave, notVivaldi, notMidori, notSamsungInternet, notUCBrowser, notAndroid, notFirefox, notQQBrowser, notInstabridge, notWhaleBrowser, notPuffin, notYandexBrowser, notEdgeLegacy, notEdge, notCocCoc",
  },
  {
    name: "_needBrowserVersionMinimum",
    availability: "now",
    example: "100",
    explanation:
      "_needBrowserVersionMinimum (default 0) is the needed minimum integer version number of the browser. \nAfter compiling your experiment, copy the needs statement from the EasyEyes page into your _online2Description to satisfy Prolific's rule that all study requirements be declared in the study's Description.",
    type: "integer",
    default: "0",
    categories: "",
  },
  {
    name: "_needCameraBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 _needCameraBool (default TRUE) tells EasyEyes whether to require presence of a camera. We use the camera to track viewing distance (and gaze) so most vision experiments need it. Use of the camera requires permission of the participant, and some will refuse. Before asking, we show an assurance that we won't retain the photos themselves and will retain only the position and orientation of the eyes (which includes \"head\" position--i.e. midpoint between eyes-- and pupillary distance). Currently we get permission in the Remote Calibrator, but it would be better to do that in the earlier compatibility check so people don't waste time calibrating if their camera is broken, or EasyEyes can't find it, or they won't give permission. (At least one participant reported via Prolific that EasyEyes couldn't find their camera.) \nAfter compiling your experiment, copy the needs statement from the EasyEyes page into your _online2Description to satisfy Prolific's rule that all study requirements be declared in the study's Description.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_needDeviceType",
    availability: "now",
    example: "desktop",
    explanation:
      '⭑ _needDeviceType is a comma-separated list of compatible devices types.  Anything not listed is deemed incompatible. If incompatible, we reject by issuing a fatal explanatory error message to the participant (asking Prolific participants to "return" this study), which ends the session before asking for consent. NOTE: The value "all" is not yet implemented. \nAfter compiling your experiment, copy the needs statement from the EasyEyes page into your _online2Description to satisfy Prolific\'s rule that all study requirements be declared in the study\'s Description.',
    type: "multicategorical",
    default: "desktop",
    categories: "all, desktop, tablet, mobile",
  },
  {
    name: "_needDisplay",
    availability: "now",
    example: "hdrMovie",
    explanation:
      "🕑 _needDisplay demands support for key display features:\nHDRMovie: Browser must support HDR movies.\ntenBit: Display must support 10-bit imaging. https://trello.com/c/VxGHyxDa\ncodec: I'm not sure whether we should explicitly list the codecs we support or just write \"codec\" and have EasyEyes check that the browser supports at least one of the video codecs supported by EasyEyes. EasyEyes's list of compatible codecs may grow. \nAfter compiling your experiment, copy the needs statement from the EasyEyes page into your _online2Description to satisfy Prolific's rule that all study requirements be declared in the study's Description.\n\nNOTE ON CODEC COMPATIBILITY. Note that even if the browser supports HDR movies, it typically is compatible with only one video codec, which we might not support. Currently we support two video codecs, one supported by Chrome, the other by Safari. Currently we manage this compatibility by specifying the compatible browsers. To keep up with browsers that add support for more codecs, it might be better to specify compatible codecs. However, when we reject a participant's browser, it will be more helpful to tell the participant which browsers we support, rather than which codecs, because hardly anyone knows which browsers support any given codec. Ideally, EasyEyes would read an online table of which codecs each browsers supports to offer the participant an up-to-date list of compatible browsers. We can support any codec that FFMPEG supports, but it may require a bit of code that is custom to the codec.",
    type: "multicategorical",
    default: "",
    categories: "hdrMovie, tenBit",
  },
  {
    name: "_needSmartphoneTooBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "🕑 If TRUE, _needSmartphoneTooBool (default FALSE) asks the participant if, in addition to whatever device is running the experiment, they have a smartphone available for use by EasyEyes (either for sound calibration or remote keypad). EasyEyes just asks, without verifying. Verification will happen later, when the QR code is shown to recruit the smartphone. \n[We have not yet considered, in the case of an experiment running on an iPad or iPhone, whether we could use its built-in mic to calibrate its loudspeaker, eliminating the need for a second device.] \nAfter compiling your experiment, copy the needs statement from the EasyEyes page into your _online2Description to satisfy Prolific's rule that all study requirements be declared in the study's Description.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_needOperatingSystem",
    availability: "now",
    example: "macOS,Windows",
    explanation:
      "⭑ _needOperatingSystem is a comma-separated list either of compatible or incompatible operating systems. The list can be 'all', or compatible OSes by name, or incompatible OSes each preceded by \"not\". No mixing allowed. The default is 'all'. If compatible, then anything not listed is deemed incompatible. If incompatible, then anything not listed is deemed compatible. If not compatible, we reject by issuing a fatal explanatory error message to the participant (asking Prolific participants to \"return\" this study), which ends the session before asking for consent. After compiling your experiment, copy the needs statement from the EasyEyes page into your _online2Description to satisfy Prolific's rule that all study requirements be declared in the study's Description.",
    type: "multicategorical",
    default: "all",
    categories:
      "all, macOS, Windows, ChromeOS, ChromiumOS, AndroidOS, iOS, SamsungOS, KaiOS, NokiaOS, Series40OS, Linux, Ubuntu, FreeBSD, Debian, Fedora, Solaris, CentOS, Deepin, notmacOS, notWindows, notChromeOS, notChromiumOS, notAndroidOS, notiOS, notSamsungOS, notKaiOS, notNokiaOS, notSeries40OS, notLinux, notUbuntu, notFreeBSD, notDebian, notFedora, notSolaris, notCentOS, notDeepin",
  },
  {
    name: "_needProcessorCoresMinimum",
    availability: "now",
    example: "6",
    explanation:
      "⭑ _needProcessorCoresMinimum tries to exclude slow computers without testing speed. The number of cores is a positive integer, also called \"hardwareConcurrency,\" whose value is returned by all modern browsers except Safari. For Safari, we estimate its value by doubling and rounding the rate (in MHz) at which the computer generates random numbers. https://en.wikipedia.org/wiki/Multi-core_processor\nUsing Prolific, our experiments are occasionally assigned to slow computers that produce inaccurate stimulus timing. EasyEyes measures lateness and duration and reports them as targetMeasuredLatenessSec and targetMeasuredDurationSec in the CSV file. We find that setting _needProcessorCoresMinimum=6 nearly eliminated bad timing, but it also eliminates quite a few computers with good timing. You may prefer to set _needProcessorCoresMinimum lower, e.g. 4, to include most computers, and weed out the slow computers later, during data analysis, based on mean and SD of  targetMeasuredLatenessSec and targetMeasuredDurationSec. \nNOTE: To make your computer harder to track, the Chrome extension DuckDuckGo spoofs the number of cores to 2. Any experiment requiring 3 or more cores will reject any participant whose computer spoofs having 2 cores. \n\nAfter compiling your experiment, copy the needs statement from the EasyEyes page into your _online2Description to satisfy Prolific's rule that all study requirements be declared in the study's Description.",
    type: "integer",
    default: "6",
    categories: "",
  },
  {
    name: "_needScreenSizeMinimumPx",
    availability: "now",
    example: "",
    explanation:
      "🕑 _needScreenSizeMinimumPx is just a placeholder in this Glossary; any value provided by the scientist is ignored. In each block, needScreenHeightUpToDeg and needScreenWidthUpToDeg are each combined with needTargetSizeDownToDeg to compute a needed screen resolution, which is enforced in the experiment's initial compatibility check. ",
    type: "integer",
    default: "",
    categories: "",
  },
  {
    name: "_needTimingToleranceSec",
    availability: "now",
    example: "",
    explanation:
      "🕑 _needTimingToleranceSec (default 0.05) is the largest acceptable RMS error in generating a 0.15-second interval. We suspect that this depends on both the CPU speed and the number of processes being timeshared, and thus can be reduced by closing other browser windows, and quitting other apps. ",
    type: "numerical",
    default: "0.05",
    categories: "",
  },
  {
    name: "_online1InternalName",
    availability: "now",
    example: "",
    explanation:
      "_online1InternalName (default is beginning of your study URL: net id and experiment name) specifies the internal name, as a text string, instead of letting Prolific assign it from your study URL. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_online1RecruitmentService",
    availability: "now",
    example: "Prolific",
    explanation:
      '⭑ _online1RecruitmentService (no default). Name of recruitment service: Prolific, SONA, MTurk.  The key idea is two URLs that carry parameters. The Study URL (a link to our experiment) carries parameters provided by the recruitment service (e.g. Prolific). The Completion URL (a link to the completion page of the recruitment service) carries the completion code certifying that the participant completed the study. \nnone - Just produce a study URL.\nProlific - integrate with Prolific, which is suggested by the PsychoPy manual. https://www.psychopy.org/online/prolificIntegration.html\nNOT YET IMPLEMENTED: MTurk - currently equivalent to "none".\nNOT YET IMPLEMENTED: SONA - currenlty equivalent to "none".',
    type: "categorical",
    default: "none",
    categories: "none, Prolific",
  },
  {
    name: "_online1Title",
    availability: "now",
    example: "Vision test",
    explanation:
      "⭑ _online1Title is the brief title for this study that will be used to recruit new participants. In deciding whether to participate, potential participants will consider _online1Title, _online2Pay, _online2Minutes, and _online2Description. Participants often mention selecting my study by how interesting it sounds and by its pay rate (dollars per hour).",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_online2Description",
    availability: "now",
    example: "",
    explanation:
      "⭑ _online2Description is a (typically long) description of the study, used to recruit new participants. In deciding whether to participate, Prolific members will consider _online0Title, _online2Pay, _online2Minutes, and _online2Description. However, several Prolific participants told me that when the pay exceeds $15/hour, the jobs are filled quickly, so they often accept these without reading the study description. So you might want to have your study verify that participants actually satisfy any requirements stated in your description. The EasyEyes _needXXX parameters may be helpful in this regard. IMPORTANT: Prolific's recruitment policy demands advance statement of the study's requirements before the participant accepts. Thus any _needXXX should be mentioned in your study's Description in Prolific, which is copied from this parameter. EasyEyes helps you to do this, by offering a plain English statement of the needs on the scientist page that you can copy and include here.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_online2Minutes",
    availability: "now",
    example: "30",
    explanation:
      "⭑ _online2Minutes (default 0) is the expected study duration, in minutes, in your offer to each potential participant. EasyEyes uses a rule of thumb to estimate the duration of your study and displays it on the scientist page so you can copy it and paste it here. In deciding whether to participate, potential participants will consider _online2PayPerHour, _online0Title, _online2Description, and _online2Minutes. The total payment is fixed when the study begins. If the median duration of your study is much greater than your estimate then Prolific will invite you to proportionally increase the pay. But we suspect that participants are happier if your time estimate is accurate, because that makes the deal businesslike, whereas the increase, since it's not enforced, may seem like charity.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "_online2Participants",
    availability: "now",
    example: "20",
    explanation:
      "⭑ _online2Participants (default 1). Number of people you want to test.",
    type: "integer",
    default: "1",
    categories: "",
  },
  {
    name: "_online2Pay",
    availability: "now",
    example: "7.5",
    explanation:
      "USE _online2PayPerHour INSTEAD BECAUSE THAT'S WHAT PARTICIPANTS CARE ABOUT MOST. _online2Pay (default zero) specifies the payment (a number) to offer to each participant. The currency is specified by _online2PayCurrency.  If _online2Pay and _online2PayPerHour are both nonzero, then the participant is offered the sum of the two contributions.  In deciding whether to participate, potential participants mainly consider _online2PayPerHour, _online0Title, _online2Description, and _online2Minutes. Some participants mentioned selecting my study because it seemed interesting. Others said that in their rush to sign up for $15/hour studies, they often skip the description. ",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "_online2PayCurrency",
    availability: "now",
    example: "GBP",
    explanation:
      "🕑 _online2PayCurrency (default USD) specifies the currency of the payment: US Dollars (USD) or Great Britain Pounds (GBP). Prolific has no API to change this, but EasyEyes will confirm that Prolific is using the currency declared by _online2PayCurrency. Prolific allows your user account to be in USD or GBP, and can change an account's currency in response to a written request, but only rarely. Some users of EasyEyes will be in UK and will likely prefer to pay Prolific and participants in GBP. EasyEyes can't change Prolific's choice of currency, but by setting this parameter you can ask EasyEyes to make sure that Prolific is using the currency assumed by your spreadsheet. If not, then EasyEyes will flag this as a fatal error before deployment. You can then fix the currency in your experiment, and adjust the numeric pay to provide the desired compensation. ",
    type: "categorical",
    default: "USD",
    categories: "USD, GBP",
  },
  {
    name: "_online2PayPerHour",
    availability: "now",
    example: "15",
    explanation:
      "⭑ _online2PayPerHour (default zero) specifies the hourly rate (a number) that determines (with _online2Minutes) the payment offered to each participant. The currency is specified by _online2PayCurrency. If _online2Pay and _online2PayPerHour are both nonzero, then the participant is offered the sum of the two contributions. Prolific lists the study titles and pay per hour for selection by prospective participants. Some participants mentioned selecting my study because it seemed interesting. Others said that in their rush to sign up for $15/hour studies, they often skip the description. ",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "_online2ProlificProjectID",
    availability: "now",
    example: "",
    explanation:
      "⭑ _online2ProlificProjectID. To use Prolific with EasyEyes, you must figure out whether your Prolific account is in the new (since mid-2022) \"Workspace\" mode or it's older non-Workspace mode (which may become obsolete). \nhttps://researcher-help.prolific.co/hc/en-gb/articles/4500057146140-Workspaces-\nBefore Prolific's Workspace mode arrived, there was no Project ID. In Workspace mode you assign funds to a folder which has a name and a project ID (a roughly 24-digit hexadecimal number). You can have multiple studies in one project folder; they all share the same project ID. If your experiment table includes an _online2ProlificProjectID number, then EasyEyes will use it and call Prolific in Workspace mode. If _online2ProlificProjectID is empty or absent, then EasyEyes will call Prolific in pre-Workspace mode.  If you provide a wrong Project ID then you'll get an invalid address (404) when EasyEyes tries to access your Prolific workspace. EasyEyes assumes that Prolific is locked into one mode or the other. (In fact, Prolific allows you to upgrade your Prolific account from pre-Workspace into Workspace mode, but you cannot downgrade, which is fine since Workspace mode is better.) If EasyEyes calls Prolific in the wrong mode, the call fails to transfer vital information for your study, which you'll notice when you try to publish your study in Prolific. Currently EasyEyes can't tell which mode your Prolific account is in, and expects you to provide a _prolificProjectID if and only if Prolific is in Workspace mode. So if you arrive in Prolific, and find Prolific ignorant of your study, you probably guessed wrong about the mode of your Prolific account. Does your study in Prolific have a Prolific Project ID? If yes, then your Prolific account is in Workspace mode, otherwise not. You can run all studies with the same _prolificProjectID, or have several projects eash with their own _prolificProjectID.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_online2SaveIncompleteResponsesBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online2SaveIncompleteResponsesBool (default TRUE) sets the corresponding option in Pavlovia. Note that if you don’t have a Pavlovia site license, and you’re not in PILOTING mode, then you pay 20 pence for each response (i.e. data file) that you save, so you save money by not saving (and paying for) incomplete studies. We don't know yet whether Pavlovia provides an API for this.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_online2SubmissionApproval",
    availability: "now",
    example: "",
    explanation:
      '⭑ _online2SubmissionApproval (default "manual") declares to Prolific whether evaluation of the  participant submissions (performance of the study) will be manual (the EasyEyes default) or automatic.',
    type: "categorical",
    default: "manual",
    categories: "manual, automatic",
  },
  {
    name: "_online3DeviceKind",
    availability: "now",
    example: "",
    explanation:
      "⭑ _online3DeviceKind is a comma-separated list of acceptable answers (see Categories) to this Prolific query:\nWhich devices can participants use to take your study?\nmobile\ntablet\ndesktop\nThe parameter value will be a comma-separated list of none to all of: mobile, tablet, desktop.",
    type: "multicategorical",
    default: "Desktop",
    categories: "mobile, tablet, desktop",
  },
  {
    name: "_online3PhoneOperatingSystem",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online3PhoneOperatingSystem is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nPhone Operating System\nParticipants were asked the following question: What operating system (OS) does your primary mobile phone have?\nAndroid\niOS (iPhone)\nWindows\nOther/Not Applicable\nDon't Know\n\nNOTE: This selector is in the _online3 group because it's important for EasyEyes sound experiments. EasyEyes uses the participant's smartphone to calibrate the loudspeaker of the participant's desktop.\n",
    type: "multicategorical",
    default: "",
    categories: "Android, iOS, Windows, Other, Don't Know",
  },
  {
    name: "_online3RequiredServices",
    availability: "now",
    example: "",
    explanation:
      "⭑ _online3RequiredServices (no default) is a comma-separated list of study requirements (see Categories) corresponding to this Prolific query:\nDoes your study require any of the following?\nAudio\nCamera\nMicrophone\nDownload software\nThe parameter value will be a comma-separated list of none to all of: Audio, Camera, Microphone, Download software",
    type: "multicategorical",
    default: "",
    categories: "audio, camera, microphone, download",
  },
  {
    name: "_online4AllowCompletedExperiment",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online4AllowCompletedExperiment (default empty) specifies a comma-separated list of experiments (typically just one) in your Pavlovia account. (The compiler will check the experiment names.) A minimum time _online4AllowAfterHours after a participant completes (or has completed) one or more of the named experiments, EasyEyes will add their Prolific participant ID to the current experiment’s allowList. Adding continues until the new experiment completes. If _online4AllowCompletedExperiment is not empty, then participants are recruited solely through the allowList. If _online4CustomAllowList is not empty, then it adds its IDs to the allowList.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_online4AllowAfterHours",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online4AllowAfterHours (default 0) requires that at least the specified (floating) number of hours pass since completion of the _online4AllowCompletedExperiment before the participant’s ID is added to the allowList.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "_online4ApprovalRate",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online4ApprovalRate (default 0,100) is a comma-separated list of two numbers (each in the range 0 to 100) that specify the minimum and maximum acceptable precent approval rate of the participant. \nApproval Rate\nApproval rate is the percentage of studies for which the participant has been approved. We use the upper bound of the 95% confidence interval to calculate approval rate.\n\nCreate a range using the sliders below:\n———————————\nMinimum Approval Rate: 0, Maximum Approval Rate: 100 (inclusive)",
    type: "text",
    default: " 0,100",
    categories: "",
  },
  {
    name: "_online4CustomAllowList",
    availability: "now",
    example: "",
    explanation:
      "_online4CustomAllowList (no default) is a comma-separated list of Prolific participant IDs. ONLY these participants will be eligible for this study, unless _online4AllowCompletedExperiment is not empty, in which case both contribute to the allowList of participants.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_online4CustomBlockList",
    availability: "now",
    example: "",
    explanation:
      "_online4CustomBlockList (no default) is a comma-separated list of Prolific participant IDs who will not be invited to this study.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_online4Location",
    availability: "now",
    example: "",
    explanation:
      "⭑ _online4Location is a comma-separated list of acceptable answers (see Categories) to this Prolific query:\nLocation\nWhere should your participants be located?\nAll countries available\nUSA\nUK\nMore\nThe answer can include many countries, which are combined by an OR rule.",
    type: "multicategorical",
    default: "All countries available",
    categories:
      "All countries available, USA, UK, Ireland, Germany, France, Spain, Afghanistan, Aland Islands, Albania, Algeria, American Samoa, Andorra, Angola, Anguilla, Antarctica, Antigua and Barbuda, Argentina, Armenia, Aruba, Australia, Austria, Azerbaijan, Bahamas, Bahrain, Bangladesh, Barbados, Belarus, Belgium, Belize, Benin, Bermuda, Bhutan, Bolivia, Bonaire, Bosnia and Herzegovina, Botswana, Bouvet Island, Brazil, British Indian Ocean Territory, Brunei Darussalam, Bulgaria, Burkina Faso, Burundi, Cambodia, Cameroon, Canada, Cape Verde, Cayman Islands, Central African Republic, Chad, Chile, China, Christmas Island, Cocos (Keeling) Islands, Colombia, Comoros, Congo, Congo the Democratic Republic of the, Cook Islands, Costa Rica, Cote d'Ivoire, Croatia, Cuba, Curacao, Cyprus, Czech Republic, Denmark, Djibouti, Dominica, Dominican Republic, Ecuador, Egypt, El Salvador, Equatorial Guinea, Eritrea, Estonia, Ethiopia, Falkland Islands (Malvinas), Faroe Islands, Fiji, Finland, French Guiana, French Polynesia, French Southern Territories, Gabon, Gambia, Georgia, Ghana, Gibraltar, Greece, Greenland, Grenada, Guadeloupe, Guam, Guatemala, Guernsey, Guinea, Guinea-Bissau, Guyana, Haiti, Heard Island and McDonald Islands, Holy See (Vatican City State), Honduras, Hong Kong, Hungary, Iceland, India, Indonesia, Iran, Iraq, Isle of Man, Israel, Italy, Jamaica, Japan, Jersey, Jordan, Kazakhstan, Kenya, Kiribati, Korea, Kuwait, Kyrgyzstan, Lao People's Democratic Republic, Latvia, Lebanon, Lesotho, Liberia, Libya, Liechtenstein, Lithuania, Luxembourg, Macao, Macedonia, Madagascar, Malawi, Malaysia, Maldives, Mali, Malta, Marshall Islands, Martinique, Mauritania, Mauritius, Mayotte, Mexico, Micronesia, Moldova, Monaco, Mongolia, Montenegro, Montserrat, Morocco, Mozambique, Myanmar, Namibia, Nauru, Nepal, Netherlands, New Caledonia, New Zealand, Nicaragua, Niger, Nigeria, Niue, Norfolk Island, Northern Mariana Islands, Norway, Oman, Pakistan, Palau, Palestinian Territory, Panama, Papua New Guinea, Paraguay, Peru, Philippines, Pitcairn, Poland, Portugal, Puerto Rico, Qatar, Reunion, Romania, Russian Federation, Rwanda, Saint Barthelemy, Saint Helena, Saint Kitts and Nevis, Saint Lucia, Saint Martin (French part), Saint Pierre and Miquelon, Saint Vincent and the Grenadines, Samoa, San Marino, Sao Tome and Principe, Saudi Arabia, Senegal, Serbia, Seychelles, Sierra Leone, Singapore, Sint Maarten (Dutch part), Slovakia, Slovenia, Solomon Islands, Somalia, South Africa, South Georgia and the South Sandwich Islands, South Sudan, Sri Lanka, Sudan, Suriname, Svalbard and Jan Mayen, Swaziland, Sweden, Switzerland, Syrian Arab Republic, Taiwan, Tajikistan, Tanzania, Thailand, Timor-Leste, Togo, Tokelau, Tonga, Trinidad and Tobago, Tunisia, Turkey, Turkmenistan, Turks and Caicos Islands, Tuvalu, Uganda, Ukraine, United Arab Emirates, United States Minor Outlying Islands, Uruguay, Uzbekistan, Vanuatu, Venezuela, Vietnam, Wallis and Futuna, Western Sahara, Yemen, Zambia, Zimbabwe",
  },
  {
    name: "_online4ParticipantInPreviousStudyExclude",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online4ParticipantInPreviousStudyExclude (no default) is a comma-separated list of Experiment names (Prolific internal study names) in response to this Prolific prescreening query:\nExclude participants from previous studies. This screener will exclude all participants from the selected studies regardless of their submission status. Please note this list only includes studies which are completed. Read about how to prevent certain participants from accessing your study.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_online4ParticipantInPreviousStudyInclude",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online4ParticipantInPreviousStudyInclude (no default) is a comma-separated list of Experiment names in response to this Prolific prescreening query:\nInclude participants from previous studies. Only participants with approved submissions will be included. To add participants whose responses weren't approved, please instead use a custom allowlist. Please note this list only includes studies which are completed. Read about how to invite specific participants to your study.\n\n",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_online4Sample",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online4Sample is a comma-separated list of acceptable answers (see Categories) to this Prolific query:\nStudy distribution\nHow do you want to distribute your sample?\nRepresentative sample\nBalanced sample\nStandard sample\nThe parameter value will be one of: UK, USA, Balanced, Standard\nThe scientist thus chooses a sample of participants: (representative of) USA, (representative of) UK, (50/50 sex) Balanced, or (whoever is available) Standard. Note that Prolific charges more for representative (i.e. US or UK) samples.",
    type: "categorical",
    default: "Standard",
    categories: "UK, USA, Balanced, Standard",
  },
  {
    name: "_online5CochlearImplant",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online5CochlearImplant (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nCochlear implant\nParticipants were asked the following question: Do you have a cochlear implant?\nYes\nNo\nRather not say",
    type: "multicategorical",
    default: "",
    categories: "Yes, No, Rather not say",
  },
  {
    name: "_online5Dyslexia",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online5Dyslexia (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nDyslexia\nParticipants were asked the following question: Have you received a medical diagnosis for dyslexia?\n\nYes, I have been medically diagnosed with dyslexia\nNo, but I am in the process of being diagnosed\nNo, but I strongly suspect I have undiagnosed dyslexia\nNo\nRather not say\nThe value will be a comma-separated list of none or any number of: diagnosed, being diagnosed, suspect but undiagnosed, no, not saying",
    type: "multicategorical",
    default: "",
    categories: "diagnosed, being diagnosed, suspect, no, not saying",
  },
  {
    name: "_online5HearingDifficulties",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online5HearingDifficulties (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nHearing difficulties\nParticipants were asked the following question: Do you have any hearing loss or hearing difficulties?\nYes\nNo\nRather not say\n• The parameter value will be a comma-separated list of: Yes, No, Rather not say.",
    type: "multicategorical",
    default: "",
    categories: "Yes, No, Rather not say",
  },
  {
    name: "_online5LanguageFirst",
    availability: "now",
    example: "",
    explanation:
      "⭑ _online5LanguageFirst (no default) is a comma-separated list of acceptable languages. Prolific uses OR to combine values within a parameter, and AND to combine across parameters. Prolific is international but based in UK; Enlish is the native language of a large fraction of their participants.",
    type: "multicategorical",
    default: "",
    categories:
      "Afrikaans, Albanian, Amharic, Arabic, Armenian, Basque, Belarusian, Bengali, Bulgarian, Burmese, Cantonese, Catalan, Chinese, Croatian, Czech, Danish, Dari, Dutch, Dzongkha, English, Esperanto, Estonian, Faroese, Farsi, Finnish, French, Gaelic, Galician, Georgian, German, Greek, Gujarati, Hakka, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Inuktitut, Italian, Japanese, Khmer, Korean, Kurdish, Laotian, Lappish, Latvian, Lithuanian, Macedonian, Malay, Malayalam, Maltese, Mandarin, Nepali, Norwegian, Papiamento, Pashto, Polish, Portuguese, Punjabi, Romanian, Russian, Scots, Serbian, Slovak, Slovenian, Somali, Spanish, Swahili, Swedish, Tagalog-Filipino, Tajik, Tamil, Telugu, Thai, Tibetan, Tigrinya, Tongan, Turkish, Turkmen, Twi, Ukrainian, Urdu, Uzbek, Vietnamese, Welsh, Other",
  },
  {
    name: "_online5LanguageFluent",
    availability: "now",
    example: "",
    explanation:
      "⭑ _online5LanguageFluent (no default) is a comma-separated list of acceptable languages. Prolific uses OR to combine values within a parameter, and AND to combine across parameters. Prolific is international but based in UK; most participants are fluent in English.\n",
    type: "multicategorical",
    default: "",
    categories:
      "Afrikaans, Albanian, Amharic, Arabic, Armenian, Basque, Belarusian, Bengali, Bulgarian, Burmese, Cantonese, Catalan, Chinese, Croatian, Czech, Danish, Dari, Dutch, Dzongkha, English, Esperanto, Estonian, Faroese, Farsi, Finnish, French, Gaelic, Galician, Georgian, German, Greek, Gujarati, Hakka, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Inuktitut, Italian, Japanese, Khmer, Korean, Kurdish, Laotian, Lappish, Latvian, Lithuanian, Macedonian, Malay, Malayalam, Maltese, Mandarin, Nepali, Norwegian, Papiamento, Pashto, Polish, Portuguese, Punjabi, Romanian, Russian, Scots, Serbian, Slovak, Slovenian, Somali, Spanish, Swahili, Swedish, Tagalog-Filipino, Tajik, Tamil, Telugu, Thai, Tibetan, Tigrinya, Tongan, Turkish, Turkmen, Twi, Ukrainian, Urdu, Uzbek, Vietnamese, Welsh, Other",
  },
  {
    name: "_online5LanguagePrimary",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online5LanguagePrimary (no default) is a comma-separated list of acceptable languages. Prolific uses OR to combine values within a parameter, and AND to combine across parameters. Prolific is international but based in UK; Enlish is the native language of a large fraction of their participants.",
    type: "multicategorical",
    default: "",
    categories:
      "Afrikaans, Albanian, Amharic, Arabic, Armenian, Basque, Belarusian, Bengali, Bulgarian, Burmese, Cantonese, Catalan, Chinese, Croatian, Czech, Danish, Dari, Dutch, Dzongkha, English, Esperanto, Estonian, Faroese, Farsi, Finnish, French, Gaelic, Galician, Georgian, German, Greek, Gujarati, Hakka, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Inuktitut, Italian, Japanese, Khmer, Korean, Kurdish, Laotian, Lappish, Latvian, Lithuanian, Macedonian, Malay, Malayalam, Maltese, Mandarin, Nepali, Norwegian, Papiamento, Pashto, Polish, Portuguese, Punjabi, Romanian, Russian, Scots, Serbian, Slovak, Slovenian, Somali, Spanish, Swahili, Swedish, Tagalog-Filipino, Tajik, Tamil, Telugu, Thai, Tibetan, Tigrinya, Tongan, Turkish, Turkmen, Twi, Ukrainian, Urdu, Uzbek, Vietnamese, Welsh, Other",
  },
  {
    name: "_online5LanguageRelatedDisorders",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online5LanguageRelatedDisorders (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nDo you have any language related disorders?\nreading difficulty\nwriting difficulty\nother language related disorder\nnone\nnot applicable",
    type: "multicategorical",
    default: "",
    categories:
      "reading difficulty, writing difficulty, other language related disorder, none, not applicable",
  },
  {
    name: "_online5MusicalInstrumentExperience",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online5MusicalInstrumentExperience (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nExperience with musical instruments\nParticipants were asked the following question: Do you play a musical instument, if so for how many years?\n\nNo. I don't play a musical instrument\nYes. For 0-1 years.\nYes. For 1-2 years.\nYes. For 2-3 years.\nYes. For 3-4 years.\nYes. For 5+ years.",
    type: "multicategorical",
    default: "",
    categories: "No, 0-1, 1-2, 2-3, 3-4, 5+",
  },
  {
    name: "_online5Vision",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online5Vision (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nVision. Do you have normal or corrected-to-normal vision?\nYes\nNo\nRather not say\n• The parameter value will be a comma-separated list of: Yes, No, Rather not say.",
    type: "multicategorical",
    default: "",
    categories: "Yes, No, Rather not say",
  },
  {
    name: "_online5VisionCorrection",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online5VisionCorrection (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nCorrected vision\nParticipants were asked the following question: I currently use glasses or contact lenses to correct my vision\nI mainly use glasses\nI mainly use contact lenses\nI use both glasses and contact lenses\nI do not use glasses or contact lenses",
    type: "multicategorical",
    default: "",
    categories: "glasses, contacts, both, neither",
  },
  {
    name: "_online5VRExperiences",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online5VRExperiences (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nSimulated Experiences\nParticipants were asked the following question: Have you engaged in any of the following simulated experiences before? Choose all that apply:\nVirtual reality\nAugmented reality\nMixed reality\nOther\nNot applicable / rather not say",
    type: "multicategorical",
    default: "",
    categories:
      "Virtual reality, Augmented reality, Mixed reality, Other, Not applicable",
  },
  {
    name: "_online5VRHeadset",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online5VRHeadset (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query: \nVR headset (ownership)\nParticipants were asked the following question: Do you own a VR (Virtual Reality) headset?\nYes\nNo\nDon't know / other\nNot applicable / rather not say",
    type: "multicategorical",
    default: "",
    categories: "Yes, No, Don't know, Not applicable",
  },
  {
    name: "_online5VRHeadsetUsage",
    availability: "now",
    example: "",
    explanation:
      "🕑 _online5VRHeadsetUsage (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query: \nVR headset (frequency)\nParticipants were asked the following question: In a given month, how frequently do you use a VR headset?\n0 times\n1-5 times\n6-10 times\n11-15 times\nmore than 15 times\nNot applicable / rather not say",
    type: "multicategorical",
    default: "",
    categories: "0, 1-5, 6-10, 11-15, more than 15, Not applicable",
  },
  {
    name: "_participantIDGetBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ Multi-session experiments require a way to link a participant's several sessions. When _participantIDGetBool is TRUE, we ask the participant to provide their EasyEyesID from a previous session. To facilitate this, EasyEyes checks for the most recent EasyEyesID cookie, and, if found, offers it to the participant for approval. The participant can approve this (if found), or select an EasyEyesID file from the computer's disk, or type in an EasyEyesID, or type in any ASCII alphanumeric string without whitespace to use as their EasyEyesID. If EasyEyes cannot get an EasyEyesID, it exits the experiment. A participant who moves from one computer to another during the experiment should take an EasyEyesID file with them, or write down the EasyEyesID. Also see _participantIDPutBool below.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_participantIDPutBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ EasyEyes always saves an EasyEyesID cookie in browser local storage (which can be lost when participants clear browsing history etc.). If _participantIDPutBool is TRUE, then an EasyEyesID text file is also saved in the Download Folder of the  participant's computer. Also see _participantIDGetBool above.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_pavloviaPreferRunningModeBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "_pavloviaPreferRunningModeBool helps EasyEyes optimize its behavior by indicating your preference for use of RUNNING or PILOTING mode while testing. Pavlovia offers two modes (RUNNING and PILOTING) for running your study. Remote data collection requires RUNNING mode. PILOTING mode is meant for checking and debugging and runs only from the Pavlovia console on the scientist's computer. The only advantage of the PILOTING mode is that it's always free. Unless your institution has a Pavlovia site license, RUNNING mode costs 20 pence per participant, and requires assigning tokens (money) in advance to each experiment. (Setting _compileAsNewExperiment=FALSE allows you to request that EasyEyes keep reusing the same experiment name, as you compile new versions, so you can assign tokens once to the experiment, when you begin testing, instead of before each compile.) Thus scientists with a site license will always prefer RUNNING mode. Without that license, scientists can save money by using PILOTING mode during development, and switch to RUNNING mode to test remote participants. _pavloviaPreferRunningModeBool allows you to express your preference. With an institutional site license, you'll always want the default TRUE. Without an institutional site license, you can save money by setting _pavloviaPreferRunningModeBool=FALSE during development, and TRUE for the actual remote testing. Without a site license, if you don't mind the 20 p expense, you can use RUNNING mode throughout (use the default _pavloviaPreferRunningModeBool=TRUE), and set _compileAsNewExperiment=FALSE to minimize the frequency at which you must assign tokens to the experiment.\n\nOLD EXPLANATION. Setting _pavloviaPreferRunningModeBool TRUE (the default) streamlines the use of Pavlovia's RUNNING mode, and setting it FALSE streamlines the use of Pavlovia's PILOTING mode. _pavloviaPreferRunningModeBool helps EasyEyes anticipate your preference in optimizing the EasyEyes user interface. EasyEyes uses a Pavlovia repository to hold your experiment. Pavlovia offers two modes for running your experiment, PILOTING and RUNNING. PILOTING mode is free, but can only be run directly from the Pavlovia dashboard, which prevents remote testing. RUNNING mode costs 20 pence per participant (this fee is waived if your instititution has a site license), and you get a URL for your study that you can send to your online participants. It is our guess that most EasyEyes users (like current Pavlovia users) will belong to institutions with Pavlovia site licenses, and thus have no usage fee. Thus, for most users, we suggest letting _pavloviaPreferRunningModeBool be TRUE (the default) to streamline the EasyEyes scientist page for RUNNING mode. When _pavloviaPreferRunningModeBool is TRUE, you just submit your table to the EasyEyes compiler to receive your study URL, with no more clicks. That includes setting your experiment to RUNNING mode in Pavlovia. If _pavloviaPreferRunningModeBool is FALSE, then your experiment remains in the INACTIVE mode, waiting for you to click the \"Go to Pavlovia\" button, where you'll use the Pavlovia dashboard to set your experiment to PILOTING mode and run it. (Pavlovia has no API by which EasyEyes could do this for you.) If your experiment is already in RUNNING mode you can still switch to PILOTING mode. Thus _pavloviaPreferRunningModeBool doesn't close any doors; it just streamlines use of your usually preferred mode.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_saveEachBlockBool",
    availability: "now",
    example: "",
    explanation:
      'When _saveEachBlockBool=TRUE (default is FALSE), the experiment will save to CSV as it begins each block. Thus, even if the participant abruptly quits or the computer freezes, the CSV file will always include the last active block. Usually _saveEachBlockBool will be FALSE because, unless absolutely necessary, we don’t want to use the internet in the middle of the session (to minimize delay and make the experiment more robust). But scientists will enable it when they want to know which block failed. \nSAVING. The extra saves enabled by _saveEachBlockBool are in addition to the always-performed saves at the beginning and "end" of the session. ("End" includes a shift of attention aways from the EasyEyes page, which is not the end if the participant returns.) All saves are alike in saving all currently known rows and parameters to the CSV file, and all saves are cumulative, only adding new data. The CSV file on Pavlovia is readable throughout, and grows in length with successive saves. EasyEyes first saves after the compatibility check, before the remote calibration (regardless of whether the remote calibrator runs), which is before the first block, and again at the "end," which includes four cases: 1. completion, 2. orderly termination through an error message or the escape mechanism including waiting out the "saving" window at the end, 3. closing the EasyEyes window before completion or termination, and 4. shift of browser focus away from the EasyEyes page before completion or termination. Saving does not end the experiment.  After shifting attention away, the participant can shift attention back to EasyEyes and continue the experiment, which will save again in any of the four ways. This can happen again and again. ',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_saveFirstInEachBlockBool",
    availability: "now",
    example: "",
    explanation:
      "When _saveFirstInEachBlockBool=TRUE (default is FALSE), the experiment will save to CSV as it begins each block. Thus, even if the participant abruptly quits or the computer freezes, the CSV file will always display the active block. Usually _saveFirstInEachBlockBool will be FALSE because, unless absolutely necessary, we don’t want to use the internet in the middle of the session (this avoids delay and makes the experiment more robust). But scientists will enable it when they want to know which block failed.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "%",
    availability: "now",
    example: "",
    explanation:
      "⭑ An initial percent sign % at the beginning of the parameter name tells EasyEyes to ignore the whole row. To ignore a column see conditionEnabledBool. ",
    type: "",
    default: "",
    categories: "",
  },
  {
    name: "block",
    availability: "now",
    example: "1",
    explanation:
      "⭑ The block number (default 1) is required in every condition. The first condition (column C) must have block==1. After the first condition, each successive condition (column) rightward must have the same block number as the one preceding it, or increased by +1.\n\nSHUFFLING. Shuffling preserves the total number of blocks and conditions. Despite shuffling by blockShuffleGroups1, blockShuffleGroups2, etc., each block retains its original block number in the CSV results file. Blocks are performed and reported in the shuffled column order, left to right, so in the CSV results, the block number sequence will be nonmonotonic and will vary across participants, but the block numbers will correspond between the experiment spreadsheet and results files.",
    type: "integer",
    default: "1",
    categories: "",
  },
  {
    name: "blockShuffleGroups1",
    availability: "now",
    example: "A",
    explanation:
      'blockShuffleGroups1 (default is empty) allows the scientist to join one or more contiguous blocks by giving all the included conditions the same "group name" (an alphanumeric string), and requests shuffling the order of those groups within the experiment.\n\nFor any N in the range 1 to 4, a group is defined by putting the same group name in all the conditions in several contiguous whole blocks in a blockShuffleGroups(N) row. blockShuffleGroups1 can be used alone. If N>1, each group defined in the blockShuffleGroups(N) row must be a subset of a containing group defined in a blockShuffleGroups(N-1) row.\n\nThe groups in blockShuffleGroups(N) will have various numbers of conditions and blocks. Order follows the left-to-right positions of the columns.  Not all blocks need be in groups. Within each containing group, EasyEyes counts the groups (from left to right), creates a shuffled list of the numbers from 1 to n, where n is the total count, and then replaces the i-th group by the group whose index is i-th in the shuffled list.\n\nblockShuffleGroups(N) groups are shuffled before blockShuffleGroups(N-1) groups. Shuffling preserves the total number of blocks and conditions. To ease analysis, despite shuffling, each block retains its original block number in the CSV results file. Blocks are performed and reported in the shuffled column order, left to right, so in the CSV results, the block number sequence will be nonmonotonic and will vary across participants.\n\nEasyEyes compiler requirements. Each cell in any blockShuffleGroups(N) row must be empty or have a group name. All the cells in a block must be the same. All the blocks in a group must be contiguous, and have the same group name.  If N>1, each group defined in the blockShuffleGroups(N) row must be a subset of a containing group defined in a blockShuffleGroups(N-1) row.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "blockShuffleGroups2",
    availability: "now",
    example: "A",
    explanation:
      'blockShuffleGroups2 (default is empty) allows the scientist to join one or more contiguous blocks by giving all the included conditions the same "group name" (an alphanumeric string), and requests shuffling the order of those groups within the blockShuffleGroups1 group that contains them. \n\nSee blockShuffleGroups1.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "blockShuffleGroups3",
    availability: "now",
    example: "A",
    explanation:
      'blockShuffleGroups3 (default is empty) allows the scientist to join one or more contiguous blocks by giving all the included conditions the same "group name" (an alphanumeric string), and requests shuffling the order of those groups within the blockShuffleGroups2 group that contains them. \n\nSee blockShuffleGroups1.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "blockShuffleGroups4",
    availability: "now",
    example: "A",
    explanation:
      'blockShuffleGroups4 (default is empty) allows the scientist to join one or more contiguous blocks by giving all the included conditions the same "group name" (an alphanumeric string), and requests shuffling the order of those groups within the blockShuffleGroups3 group that contains them. \n\nSee blockShuffleGroups1.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "calibrateBlindSpotBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'MOST PEOPLE SHOULD USE _calibrateTrackViewingDistanceBool INSTEAD. Set calibrateBlindSpotBool TRUE (default FALSE) to make an initial measurement of viewing distance by mapping the blind spot, as suggested by the Li et al. (2020) "Virtual chinrest" paper, enhanced by flickering the target and manual control of target position. Use _calibrateTrackViewingDistanceBool or calibrateBlindSpotBool, not both. _calibrateTrackViewingDistanceBool maps the blind spot AND tracks viewing distance for the whole experiment. That\'s what most scientists want.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateDistanceCheckBool",
    availability: "now",
    example: "FALSE",
    explanation:
      'Set calibrateDistanceCheckBool TRUE (default FALSE), to request checking of the calibrator by the participant, provided they have a tape measure, meter stick, or yard stick, or failing that, a ruler. After each size or distance calibration, if calibrationDistanceCheckBool is TRUE, then we will ask the participant if they have an appropriate measuring device (ideally a tape measure, meter stick, or yard stick; a 12" or 30 cm ruler could be used if we exclude long distances), and, if so, how long is it, and what are its units: decimal cm, decimal inches, fractional inches. If no device, then we skip the rest of the calibrations that need a measuring device. In our instructions, we can say "Use your ruler, stick, or tape to measure this." When receiving fractional inches we could either accept a string like "16 3/16" or we could have three fields that each accept an integer, and allow the user to tab from field to field: "?? ??/??". The last number must be 2, 4, 8, 16, or 32. For round numbers, the numerator will be zero. After measuring screen size, we can ask them to use their ruler, stick, or tape to measure screen width. We can display a huge double headed arrow from left edge to right edge. After measuring viewing distance we can ask them to use ruler, stick, or tape to create three exact viewing distances that we then use the webcam to measure. We can request 12, 24, or 36 inches, or 30, 60, or 90 cm. (These are round numbers, not exactly equivalent.) \n     We have two ways of measuring viewing distance and I’d like to evaluate both. Our current scheme with the calibrator is to have a Boolean parameter for each calibration. We should have separate parameters for the two methods of measuring viewing distance so scientists can select none, either, or both. It would be interesting to compare the two estimates (direct vs indirect) of pupillary distance. We should always save the pupillary distance with the data. We can compare our population distribution with the textbook distribution. It might be an elegant check on our biometrics. \n     We could test people on Prolific and mention in our job description that they must have a tape measure, meter stick or yard stick.  Readers of our article will like seeing data from 100 people online plus 10 experienced in-house participants. I think this will create confidence in the calibrations. For scientists that’s crucial.\n',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateFrameRateUnderStressBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "❌ WORKS BUT FAILS TO PREDICT TIMING PROBLEMS. Set calibrateFrameRateUnderStressBool TRUE (default FALSE) to ask the Remote Calibrator (which runs at beginning of the experiment) to run a several-second-long test of graphics speed. The test is run if any condition requests it, and is only run once, regardless of the number of requests. This value is reported by the output parameter frameRateUnderStress in the CSV data file.",
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
    name: "calibratePupillaryDistanceBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "🕑 USE calibrateBlindSpotBool INSTEAD. Set calibratePupillaryDistanceBool TRUE (default FALSE) to make an initial measurement of pupillary distance (eye to eye), to calibrate viewing distance. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateScreenSizeBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ Setting calibrateScreenSizeBool TRUE (default TRUE) asks the Remote Calibrator (which runs at beginning of the experiment) to get the participant's help to measure the screen size. Adjust the screen image of a common object of known size to match, to determine the size in cm of the participant's screen. Thanks to Li et al. 2020.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "calibrateScreenSizeCheckBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Setting calibrateScreenSizeCheckBool TRUE (default FALSE) asks the participant to use a ruler, yardstick, meter stick, or tape measure to measure the distance directly to assess accuracy.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateSound1000HzBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ Set calibrateSound1000HzBool TRUE (default FALSE) to request sound gain calibration (db SPL re numerical dB) at 1 kHz, using the participant's internet-connected iPhone. Testing can be done at many sound levels to calibrate the effect of dynamic gain control, which is commonly used in laptops to protect small speakers. Early exit if no iPhone is available. Calibration is done only once, at the beginning, before block 1, if any condition(s) in the whole experiment requests it. Each condition uses the calibration if and only if it sets calibrateSound1000HzBool TRUE. The parameters calibrateSound1000HzBool and calibrateSoundAllHzBool are independent and complementary. The 1000 Hz calibration measures gain at many sound levels; the all-Hz calibration measures gain at all frequencies, at one sound level. We anticipate that most sound conditions will use both. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateSound1000HzDB",
    availability: "now",
    example: "-3",
    explanation:
      "calibrateSound1000HzDB, used with calibrateSound1000HzBool, is a comma-separated list of digital RMS amplitudes, in dB, of the sinewave used to calibrate the sound gain. Default is -60, -50, -40, -30, -20, -15,- 10, -3.1 (dB), where levelDB = 20*log10(rms), and rms is the root mean square of the digital sound vector. A sinewave with range -1 to +1, the highest amplitude that won't be clipped, has rms -3.1 dB. The iPhone microphone does severe dynamic range compression, so we measure the gain at many amplitudes and fit a model to the data. The model allows for an additive environmental background noise and dynamic range compression of the recoding with three degrees of fredom (T,W,R). Digital sound cannot exceed ±1 without clipping. Thus sin(2*pi*f*t) is at maximum amplitude. It has RMS amplitude of 0.707, which is -3.1 dB. IMPORTANT. Order your calibration sound levels so that loudness increases. The iPhone microphone has a slow dynamic range compression and measurement of a given digital sound level (e.g. -50 dB) made after measuring a much louder sound can be 6 dB lower than after a quiet sound. The iPhone and its dynamic range compression are not part of your experiment; we just need to get good sound level measurements during calibration.",
    type: "text",
    default: "-60, -50, -40, -30, -20, -15, -10, -3.1",
    categories: "",
  },
  {
    name: "calibrateSoundAllHzBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Set calibrateSoundAllHzBool TRUE (default FALSE) to request sound gain calibration (db SPL re numerical dB) at all frequencies, relative to 1000 Hz, using the participant's internet-connected iPhone/iPad. This is done by using the iPhone/iPad to measure the loudspeaker's impuse response. The impulse response yields the gain (db SPL re numerical dB) at every frequency. Early exit if no iPhone/iPad is available. It's ok for the pariticipant try several devices before finding an iPhone/iPad that's compatible. Calibration is done once, before block 1, if any condition(s) in the whole experiment requests it. Each condition uses this calibration only if it sets calibrateSoundAllHzBool TRUE.  calibrateSound1000HzBool and calibrateSoundAllHzBool are independent and complementary. The 1000 Hz calibration measures gain at many sound levels; the allHz calibration measures gain at all frequencies, at one sound level. We anticipate that most sound conditions will use both. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateSoundAllHzDB",
    availability: "now",
    example: "-3",
    explanation:
      "calibrateSoundAllHzDB, used with calibrateSoundAllHzBool, is a comma-separated list of digital RMS amplitudes, in dB, of the sinewave used to calibrate the sound gain. Default is -23.1 (in dB), where levelDB = 20*log10(rms), and rms is the root mean square of the digital sound vector. A sinewave with range -1 to +1, the highest amplitude that won't be clipped, has rms -3.1 dB. Built-in  speakers in laptop computers are typically small with severe dynamic range compression, so we need to measure the gain at many amplitudes since gain will drop at high sound levels. Digital sound cannot exceed ±1 without clipping. Thus sin(2*pi*f*t) is at maximum amplitude. It has RMS amplitude of 0.707, which is -3 dB.",
    type: "text",
    default: "-13.1",
    categories: "",
  },
  {
    name: "calibrateSoundMaxHz",
    availability: "now",
    example: "",
    explanation:
      "calibrateSoundMaxHz (default 10000) is the upper cut-off frequency applied to the inverse impulse response function. That's a low-pass filter. The cut off frequency is the break point at the meeting of straight lines to the transfer function expressed as dB gain vs. log frequency. ",
    type: "numerical",
    default: "10000",
    categories: "",
  },
  {
    name: "calibrateSoundMinHz",
    availability: "now",
    example: "",
    explanation:
      "calibrateSoundMinHz (default 40) is the lower cut-off frequency applied to the inverse impulse response function. That's a high-pass filter. The cut off frequency is the break point at the meeting of straight lines to the transfer function expressed as dB gain vs. log frequency. ",
    type: "numerical",
    default: "40",
    categories: "",
  },
  {
    name: "calibrateSoundSaveToCSVBool",
    availability: "now",
    example: "",
    explanation:
      "If calibrateSoundSaveToCSVBool==TRUE (default FALSE) then save the digital sound stimuli and sound recordings in the CSV file for further analysis.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateSoundToleranceDB",
    availability: "now",
    example: "",
    explanation:
      "calibrateSoundToleranceDB specified the maximum allowed RMS dB error in the fit to the data for sound levels in and out of the louspeaker, i.e. output sound dB SPL vs. digital input dB. If the RMS fitting error exceeds this toleranance then the calibration must be repeated.",
    type: "numerical",
    default: "3",
    categories: "",
  },
  {
    name: "calibrateTrackDistanceBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ Set calibrateTrackDistanceBool TRUE (default FALSE) to calibrate and use the webcam to track viewing distance. Calibration occurs once for the whole block, before the first trial, if any condition(s) set calibrateTrackDistanceBool=TRUE. Use calibrateTrackDistanceBool or calibrateBlindSpotBool, not both.\n\nFUTURE PLANS: calibrateBlindSpotBool??. Set calibratePupillaryDistanceBool TRUE (default FALSE) to make an initial measurement of pupillary distance (eye to eye), to calibrate viewing distance. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateTrackGazeBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "❌ NOT RECOMMENDED BECAUSE ACCURACY IS ABOUT 3 DEG, AND IT REQUIRES FREQUENT RECALIBRATION WHICH THE PARTICIPANTS FIND TIRESOME. Set calibrateTrackGazeBool TRUE (default FALSE) to calibrate and use the webcam for gaze tracking. Calibration occurs once for the whole block, before the first trial, if any condition(s) set calibrateTrackGazeBool=TRUE. Gaze tracking uses the built-in webcam to monitor where the participant's eyes are looking. To be clear, in gaze tracking, the webcam looks at your eyes to figure out where on the screen your eyes are looking. It estimates that screen location. Gaze-contingent experiments change the display based on where the participant is looking. Peripheral vision experiments typically require good fixation and may discard trials for which fixation was too far from the fixation mark. Precision is low, with a typical error of 3 deg at 50 cm. We expect the error, in deg, to be proportional to viewing distance.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "conditionEnabledBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "⭑ When conditionEnabledBool is FALSE (default is TRUE), the condition (column in experiment table) is ignored, except for block numbering. Thus even if all the conditions of a block are disabled, the block is still counted by the block counter. This makes it easy to skip conditions during development and debugging without removing their details from the experiment table. This ignores a column. EasyEyes ignores any row that begins with %.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "conditionGroup",
    availability: "now",
    example: "1",
    explanation:
      '🕑 conditionGroup imposes consistent screen markings across a set of conditions. Screen markings before and during stimulus presentation indicate the positions of the fixation and possible targets. There are many parameters, below, whose names begin with "marking" that allow you to customize markings.  Within a block, all conditions with the same nonzero conditionGroup number are presented with the same markings (fixation cross and target X) to avoid giving any clue as to which of the possible targets will appear on this trial. Thus, one can implement uncertainty among the targets in any set simply by creating a condition for each target, and giving all the conditions the same nonzero conditionGroup number. There can be any number of conditions in a conditionGroup, and there can be any number of condition groups in a block. Every condition belongs to a condition group. A condition with a zero or unique conditionGroup number belongs to a condition group with just that condition.',
    type: "integer",
    default: "0",
    categories: "",
  },
  {
    name: "conditionName",
    availability: "now",
    example: "Crowding",
    explanation:
      "⭑ We highly recommend using conditionName to label each condition to guide your subsequent data analysis. Need not be unique. It's fine to give several (possibly identical) conditions the same conditionName, to guide analysis. Not used by EasyEyes, but reported in any error message. Set showConditionNameBool=TRUE to display it on screen during each trial. The R software that we are developing to analyze CSV results files will parse any conditionNames that include a period into a first and second part, before and after the period. This will identify factors that the scientist wants to use in analysis. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "conditionTrials",
    availability: "now",
    example: "40",
    explanation:
      "⭑ conditionTrials is the number of trials of this condition to run in this block. Each condition can have a different number of trials. They are all randomly interleaved. IMPORTANT: We have parameters, e.g. thresholdAllowedDuration and thresholdAllowedLateness, that can reject trials for various reasons, e.g. bad duration or delay. When a trial is rejected, it is not passed to Quest, and won't be part of the threshold estimate. The CSV file retains the rejected trial's result so you could reanalyze your data including the rejected trials. FUTURE: In principle, it would be nice to add a new trial to make up for each rejected trial, but the PsychoJS MultiStair code has no provision for adding a trial to an ongoing loop. We hope to add that capability in the future. NOTE: conditionTrials is ignored when targetKind==reading.",
    type: "integer",
    default: "35",
    categories: "",
  },
  {
    name: "errorBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "FOR DEBUGGING. errorBool (default FALSE) throws a fatal error in the first condition for which this parameter is TRUE. This is used to check out the EasyEyes error reporting.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "errorEndsExperimentBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 errorEndsExperimentBool (default FALSE) determines what happens after the participant hits the only button in the pop up error message. If TRUE then then button tells EasyEyes to terminate the experiment. If FALSE then the button tells EasyEyes to continue at the next block. The participant is not offered any choice. The scientist can set this independently for each condition throughout the experiment.\n\nCOMPLETE CODE AT END OF EXPERIMENT WITH ERROR. We’re going to change our handling of the completion code. Currently when there’s a fatal error, EasyEyes does NOT return a completion code. That makes the participant’s contribution seem suspect in the Prolific dash board, even though the error is practically always due to a fault in EasyEyes marring a best-faith effort by the participant. That denial of “completion” seems unfair to the participant. NEW POLICY: If we have an error in the middle, but eventually finish normally (including the case of an error in the last block), EasyEyes will consider the experiment “complete”, and return the completion code. That’s more fair to participants, graphically confirming that they did the work. Thus “completion” will refer to the orderly return from EasyEyes back to the caller (e.g. Prolific), even though some blocks (conceivably all blocks) may have been skipped due to errors. Prolific will declare the experiment as complete, and give it a green check. Properly handled errors will be invisible to Prolific. NOT YET IMPLEMENTED: When we issue the completion code we also set a new flag in the CSV file, indicating that it ended normally. Simon needs this for the Summary Report.",
    type: "",
    default: "",
    categories: "",
  },
  {
    name: "fixationCheckBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 Display a foveal triplet that is easy to read if the participant's eye is on fixation, and hard to read if the eye is elsewhere.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "fixationLocationStrategy",
    availability: "now",
    example: "centerFixation",
    explanation:
      "🕑 fixationLocationStrategy specifies the strategy by which EasyEyes places the fixation point, which is the origin of the visual coordinate system. Most experimenters will choose centerFixation, the default, which simply places fixation at the center of the screen. But for peripheral testing you might choose  asSpecified and put fixation near one edge of the display to maximize the eccentricity of a target at the opposite edge. Fixation, whether on- or off-screen, is always specified as a point in (x,y) display coordinates in the plane of the display (origin at lower left corner). The compiler requires that all conditions in a block have the same fixation point and fixationLocationStrategy. \n• centerFixation places fixation at the center of the screen. This is the default.\n• asSpecified indicates that fixation is specified by (fixationLocationXScreen, fixationLocationYScreen). \n\n🕑\nTo test even farther into the periphery, you might want to set fixationRequestedOffscreenBool TRUE and place the fixation off-screen by putting tape on a bottle or a box and drawing a fixation cross on it.\n• centerTargets sets the (possibly offscreen) fixation location so as to maximize the screen margin around the edges of all the possible targets.  We consider all possible targets across all conditions within the block.  \n• centerFixationAndTargets places fixation so as to maximize the screen margin around the fixation and the edges of all the possible targets within the block. We consider all possible targets across all conditions within the block.  \n\nSatisfying centerTargets or centerFixationAndTargets may be impossible beyond a certain maximum viewing distance (in cm) proportional to screen size (in cm). We generally don't know the screen size at compile time, as each participant has their own computer. Currently the scientist can only specify viewing distance as a fixed number of cm. \n\n[Since short viewing distances are uncomfortable, it might be useful to be able to request the maximize viewing distance such that the screen will have a needed visual subtense. In effect, this requests a viewing distance that is a multiple of screen width or height.]",
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
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 To test the far periphery, with help from the participant, it may be worth the trouble of setting up an off-screen fixation mark. Set fixationRequestedOffscreenBool TRUE and EasyEyes will ask the participant to put tape on a bottle or box and draw a crosshair on it. To figure out where the crosshair is, EasyEyes will display arrows on the display and ask the participant to drag the arrow heads to point to the crosshair.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "flankerCharacterSet",
    availability: "now",
    example: "abc",
    explanation:
      "🕑 flankerCharacterSet (default is the fontCharacterSet) is like fontCharacterSet but for the flankers. ",
    type: "text",
    default: "abcdefghijklmnopqrstuvwxyz",
    categories: "",
  },
  {
    name: "flankerFont",
    availability: "now",
    example: "Sloan.woff2",
    explanation:
      "🕑 flankerFont (default is the font) is like font, but for the flankers. ",
    type: "text",
    default: "Roboto Mono",
    categories: "",
  },
  {
    name: "flankerFontSource",
    availability: "now",
    example: "file",
    explanation:
      "🕑 flankerFontSource (default is the fontSource) is like fontSource, but for the flankers. ",
    type: "categorical",
    default: "google",
    categories: "file, google, browser",
  },
  {
    name: "flankerNumber",
    availability: "now",
    example: "2",
    explanation:
      "🕑 flankerNumber (default 1) is the number of flanker characters on each side of the target. Flankers are added on radial lines radiating from the target and going through each initial flanker. Each flanker is a random sample without replacement from flankerCharacterSet, if defined, otherwise from fontCharacterSet. Note that when drawing from fontCharacterSet the flankers are all different from the target. When drawing from flankerCharacterSet there is no target-based restriction.",
    type: "integer",
    default: "1",
    categories: "",
  },
  {
    name: "flankerSpacingDeg",
    availability: "now",
    example: "",
    explanation:
      "🕑 flankerSpacingDeg (default is the spacingDeg) is the center-to-center spacing between repeated flankers, as determined by flankerNumber. This is independent of spacingDeg, which specifies the center-to-center spacing of the target and each adjacent flanker.",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "flipScreenHorizontallyBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 Set flipScreenHorizontallyBool TRUE (default is FALSE) when the display is seen through a mirror.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "font",
    availability: "now",
    example: "Sloan.woff2",
    explanation:
      '⭑ font specifies the font for the target and for reading. How you specify it depends on the chosen fontSource:\n\nREQUIRED. file: font is the filename (including the extension: .woff2, .woff, .otf, or .ttf) of a font file in your EasyEyes Resources:Fonts folder in your Pavlovia account. Web font experts strongly recommend that you use the WOFF2 format, if you have it, instead of any other, because it\'s the smallest, by far (half of OTF), for fast download, and is supported by all modern browsers. The compiler will download the font file from your Fonts folder to your temporary local Experiment folder, which is then uploaded to a new Pavlovlia repo for your experiment.  (The list of allowed font types is copied from the Mozilla documentation of the @font-face command. https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face)\n\ngoogle:  font is the filename (without extension) of a font file provided by the free Google Font server. \n\nCOMING SOON: server: font is a URL pointing to the desired font on a font server. For example, many fonts are served for free by the Google Fonts server.  https://fonts.google.com/  At that website, use "Search for font". Having found your font, select the style you want. In the "Selected Family" pop-up window, click the "@import" button. From within the revealed CSS code, copy the URL from inside the "url(. )". \n\nbrowser: The experiment will pass the font preference string that you place in font to the participant\'s browser and accept whatever the browser provides.  Your string can include several font names, separated by commas, first choice first, to help the browser find something close to your intent. This is the usual way to select a font on the web, and never generates an error.  Specify just the family name, like "Verdana", and use the "fontStyle" to select italic, bold, or bold-italic. Some "web safe" fonts (e.g. Arial, Verdana, Helvetica, Tahoma, Trebuchet MS, Times New Roman, Georgia, Garamond, Courier New, Brush Script MT) are available in most browsers. In ordinary browsing, it\'s helpful that browsers freely substitute fonts so that you almost always get something readable in the web page you\'re reading. In the scientific study of perception, we usually don\'t want data with a substituted font. So, normally, you should specify "file" or "server" so you\'ll know exactly what was shown to the participant. \n\nEasyEyes preloads all fonts. At the beginning of the experimen, EasyEyes preloads all needed fonts, for the whole experiment (all conditions), so, after preload, the experiment runs with no font-loading delay and no need for internet, except to save data at the end. ',
    type: "text",
    default: "Roboto Mono",
    categories: "",
  },
  {
    name: "fontCharacterSet",
    availability: "now",
    example: "DHKNORSVZ",
    explanation:
      "⭑ fontCharacterSet is a string of unicode characters. \nLETTER IDENTIFICATION: On each trial, the target and flankers are randomly drawn from this character set, without replacement. Allowed responses are restricted to this character set. The other keys on the keyboard are dead. Letters may appear more than once in the string, to increase their probability of being drawn, but once one is drawn any identical letters are removed with it, so the drawn samples won't have any repeats. (We have no experience using repeats in the fontCharacterSet.)\nREADING: The fontCharacterSet string is used to estimate typical spacing. For English I use lowercase a-z. ",
    type: "text",
    default: "abcdefghijklmnopqrstuvwxyz",
    categories: "",
  },
  {
    name: "fontColorRGBA",
    availability: "now",
    example: "0,0,0,1",
    explanation:
      "The color of the targets, in RGBA, on a scale of 0 to 1 for each dimension. Please refer to screenColorRGB for the background color.",
    type: "text",
    default: "0,0,0,1",
    categories: "",
  },
  {
    name: "fontFeatureSettings",
    availability: "now",
    example: "",
    explanation:
      '🕑 Font features provide information about how to use the glyphs in a font to render a script or language. fontFeatureSettings receives a string. The default is the empty string. A typical value is\n"calt" 1\nor\n"calt" 1, "smcp", "zero"\nEach line is a string. The string is passed to the CSS function font-variation-settings. The (single or double) quote marks are required. Each four letter code is taken from a long list of possible font features. "calt" enables the font’s "contextual alternates", especially connections between adjacent letters in a script font. "smcp" enables small caps. "zero" requests a slash through the zero character to distinguish it from O. Most font features are Boolean and accept an argument of 0 for off, and 1 for on. Some accept an integer with a wider range. Supported by all modern browsers, including Internet Explorer.\nhttps://developer.mozilla.org/en-US/docs/Web/CSS/font-feature-settings\nhttps://docs.microsoft.com/en-us/typography/opentype/spec/features_ae#tag-calt\nhttps://helpx.adobe.com/in/fonts/using/open-type-syntax.html\nhttps://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-ligatures\nhttps://en.wikipedia.org/wiki/Ligature_(writing)\nhttps://stackoverflow.com/questions/7069247/inserting-html-tag-in-the-middle-of-arabic-word-breaks-word-connection-cursive/55218489#55218489\n',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "fontKerning",
    availability: "now",
    example: "normal",
    explanation:
      "🕑 fontKerning (default auto) uses the fontKerning Canvas command to enable or disable kerning: auto (yes/no as dictated by browser), normal (yes), or none (no).\nhttps://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fontKerning",
    type: "text",
    default: "normal",
    categories: "",
  },
  {
    name: "fontLeftToRightBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "⭑ Set fontLeftToRightBool (default TRUE) to TRUE for languages that, like English, are written from left to right, and to FALSE for right-to-left languages, like Arabic and Hebrew.  When targetTask and targetKind are identify letter, all the fontCharacterSet letters will be placed on the response screen according to fontLeftToRightBool. For reading, left-to-right text is left-aligned, and right-to-left text is right aligned. If fontLeftToRightBool is set incorrectly for reading, text may fall off the screen.                                                                                                                                           ",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "fontMaxPx",
    availability: "now",
    example: "",
    explanation:
      "fontMaxPx (default 600) sets an upper limit on the nominal font size. We added this to avoid some crashes that seem to result from trying to draw or measure huge characters. The crash is a stack overflow while trying to measure font size. We have only a rough estimate of the threshold for trouble. Introducing a limit of 900 helped a lot, but didn't eliminate all cases. Setting it to 600 has made this event rare. In April 2023 we beefed up all error messages to include the font size, so any future crashes will tell us what font size causes the crash.",
    type: "numerical",
    default: "600",
    categories: "",
  },
  {
    name: "fontPadding",
    availability: "now",
    example: "3",
    explanation:
      "⭑ fontPadding is a positive number (default 0.5; we've tried 0, 0.5, 1, and 3) specifying how much padding PIXI.js should add around each string to avoid clipping, at the cost of slower rendering. Setting fontPadding to zero produces the default PIXI.js behavior, which renders the Roboto Mono font perfectly, but slightly clips the left and bottom edges of strings in fonts with more flourish, i.e. Catalina, Burgues, and Arabic. Increasing fontPadding to 0.5 or higher eliminates clipping of these fonts. Setting fontPadding to a high value (e.g. 3) can cause timing problems: lateness and errors in duration. Lateness and duration are measured by EasyEyes and reported in the CSV file as targetMeasuredLatenessSec and targetMeasuredDurationSec. On our 8-core M1 MacBook Pro, setting fontPadding to 0 or 0.5 gives good timing:  duration within 10 ms of the requested 150 ms targetDurationSec and SD about 20 ms, as I recall. Setting fontPadding to 3 results in terrible timing: Rendering is obviously very slow, and the requested 150 ms targetDurationSec yields 100 ms mean duration. The experiment testClippingOfCrowdingAndReading.xlsx was used to assess this.",
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "fontSource",
    availability: "now",
    example: "file",
    explanation:
      "⭑ fontSource must be file, google, server (not yet supported), or browser. Browsers blithely substitute for unavailable or slow-to-load fonts. That's great for keeping the web going, but bad for perception experiments, so we encourage you to provide access to a specific font, either as a file or on a font server. For each condition that has fontSource file, the compiler checks for presence of the font in your Fonts folder (in your Pavlovia account). That folder is persistent, and you can add more fonts to it at any time, through the EasyEyes.app. Any popular font format will work, but for quick upload, we recommend minimizing file size by using the highly compressed WOFF2 webfont file format, indicated by the filename extension woff2. \n\nfile: font contains the filename (with extension) of a file in the Fonts folder in the EasyEyesResources repository in your Pavlovia account. Font availability is checked by the EasyEyes compiler, to avoid runtime surprises. LIMITATIONS: The font filename should not have any spaces. EasyEyes currently is only aware of up to 20 fonts. Further fonts are ignored. We hope to remove these limits in a future release. If you hit the 20-font limit, you can use the VIew code button in Pavlovia to open the EasyEyesResources repository and delete fonts that you don't need right now.\n\ngoogle: font contains the font name as recognized by the Google Fonts server.\n\nserver: font contains the URL of the font on a font server. (\"server\" support is coming.)\n\nbrowser: font is a font-preference string that is passed to the participant's browser. This never produces an error; we accept whatever font the browser chooses. Your font string can include several font names, separated by commas, to help the browser find something close to your intent. This is the usual way to select a font on the web, and never generates an error. (We don't know any quick way to discover what font the browser chose, so the scientist will never know.) ",
    type: "categorical",
    default: "google",
    categories: "file, google, browser",
  },
  {
    name: "fontStyle",
    availability: "now",
    example: "bold",
    explanation:
      '🕑 fontSyle can be regular (default), bold, italic, or bold-italic. \n• If font is a file name that already specifies the style you want, then don\'t specify a style here. Just leave fontStyle as default. Otherwise the participant\'s browser might try to "helpfully" synthesize the new style by tilting or thickening what the font file renders. It\'s safer to switch to the font file whose name specifies the style you want. \n• Alternatively, if fontSource is "browser", and font specifies only a font family name (e.g. Verdana), or several (e.g. Verdana;Arial), then you can use fontStyle to select among the four standard styles.',
    type: "categorical",
    default: "regular",
    categories: "regular, bold, italic, boldItalic",
  },
  {
    name: "fontTrackingForLetters",
    availability: "now",
    example: "0",
    explanation:
      'fontTrackingForLetters (default 0) adjust the gap between letters. It adds a positive or negative value to whatever the font would do otherwise. This is closely related to what Microsoft Word calls "tracking". The distance inserted (in px) is the product of the value provided and the point side of the font. It applies only to reading experiments (targetTask=identify, targetKind=reading) and letter experiments (targetTask=identify, targetKind=letter, spacingRelationToSize=typographic). Scientist must manually adjust parameters to ensure the paragraph does not expand too far such that the paragraph is outside of the participants view.\nNOT YET IMPLEMENTED for RSVP reading. (Note: Gus mentioned he already handled letter spacing in RSVP reading in a different way?)\nuses the "letterSpacing" Canvas command to adjust the spacing between letters.\nhttps://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/letterSpacing\n"letterSpacing" is part of the new CanvasRenderingContext2D, which is available for Chrome, Edge, and Samsung, not for Safari and Firefox.',
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "fontTrackingForWords",
    availability: "now",
    example: "0",
    explanation:
      '🕑 fontTrackingWord (default 0) uses the "wordSpacing" Canvas command to adjust the spacing between words.\nhttps://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/wordSpacing\nThe distance inserted (in px) is the product of the value provided and the point side of the font. This works for Chrome, Edge, and Samsung, not for Safari and Firefox.',
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "fontVariationSettings",
    availability: "now",
    example: "",
    explanation:
      '🕑 fontVariationSettings accepts a string to control a variable font (default is the empty string). You set all the axes at once. Any axis you don\'t set will be set to its default. Every axis has a four-character name. Standard axes have all-lowercase names, like \'wght\' for weight. Novel axes have ALL-UPPERCASE names. To discover your variable font\'s axes of variation, and their allowed ranges, try this web page: https://fontgauntlet.com/ For an introduction to variable fonts: https://abcdinamo.com/news/using-variable-fonts-on-the-web Variable fonts have one or more axes of variation, and we can pick any value along each axis to control the font rendering. fontVariationSettings receives a string. A typical value is\n"wght" 625\nor\n"wght" 625, "wdth" 25\nThe string is passed to the CSS function font-variation-settings. The (single or double) quote marks are required. Each four letter code represents an axis of variation that is defined for this variable font. "wght" is weight, which allows you to select any weight from extra thin to regular to bold, to black. "wdth" is width, which allows you to select any width from compressed to regular to expanded. Some axes are standard, with lowercase names. Any font can have unique axes, with uppercase names. To discover which axes a variable font supports, you can consult the webpage https://fontgauntlet.com/ or the individual font\'s documentation. Variable fonts are supported by all modern browsers, and not by Internet Explorer.\nhttps://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-variation-settings\n',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "fontWeight",
    availability: "now",
    example: "550",
    explanation:
      "🕑 fontWeight (default is regular weight) accepts a positive integer that sets the weight of a variable font. (IMPLEMENTATION: myText.style.fontWeight = fontWeight.)\nNOTE: If you set this parameter, then the EasyEyes compiler will flag an error if it determines that the target font is not variable.\nhttps://abcdinamo.com/news/using-variable-fonts-on-the-web",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "instructionFont",
    availability: "now",
    example: "Georgia",
    explanation:
      'instructionFont (default empty) sets the font used to display instructions to the participant. The parameter"font" applies to the target and stimulus text, and instructionFont applies to the instructional text. Four cases are selected by instructionFontSource=\ndefaultForLanguage: We recommend leaving instructionFont blank and setting instructionFontSource to defaultForLanguage, which will result in using whatever font is recommended by the EasyEyes International Phrases sheet for the chosen instructionLanguage. This allows runtime selection of instructionLanguage by the participant. For each language, the EasyEyes International Phrases table recommends a font from the Noto serif family, which are all served by Google Fonts.\nfile:  instructionFont is the file name (including extension .woff2, .woff, .otf, or .ttf) of a font in your Fonts folder in your Pavlovia account. Be sure that your font can render the characters of the instructionLanguage you pick. \ngoogle: instructionFont is a filename (including extension) of a font on the Google Fonts server.\nserver: instructionFont is a URL pointing to the desired font on a font server, e.g. Adobe. ("server" support is coming.)\nbrowser: instructionFont should be a string for the browser expressing your font preference.\n     Noto Fonts. The EasyEyes International Phrases table recommends the appropriate "Noto" font, available from Google and Adobe at no charge. Wiki says, "Noto is a font family comprising over 100 individual fonts, which are together designed to cover all the scripts encoded in the Unicode standard." Various fonts in the Noto serif family cover all the worlds languages that are recognized by unicode. https://en.wikipedia.org/wiki/Noto_fonts  \nWe plan to use the free Google Fonts server, which serves all the Noto fonts.\n     Runtime language selection. To allow language selection by the participant at runtime, we will ask the Google Fonts server to serve an appropriate font (from the Noto Serif family) as specified by the EasyEyes International Phrases sheet. \n     Fonts load early. We\'ll get the browser to load all needed fonts at the beginning of the experiment, so the rest of the experiment can run without internet or font-loading delay. Of course, we hope the computer eventually reconnects to send the experiment\'s data to Pavlovia, where the scientist can retrieve it.',
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
    name: "instructionForBlock",
    availability: "now",
    example: "",
    explanation:
      "⭑ instructionForBlock (empty default, which has no effect) is instructional text to be presented once at the beginning of the block, before running any trial of any condition. This text replaces whatever were the condition's default instructions, which depend on targetTask and targetKind. An empty field requests the default text, so write #NONE to suppress block instructions for this condition. The text is line-wrapped to fit, and any carriage returns in the text are expressed. Use the string #PAGE_BREAK to insert a page break. You can use an unlimited number of pages. You should normally end each page with the symbol #PROCEED, which will be replaced by text telling the participant how to continue to the next page: offering one or both of hitting RETURN and clicking the PROCEED button, as appropriate given the setting of the responseClickedBool and responseTypedBool parameters (see https://trello.com/c/OI2CzqX6). If the block has multiple conditions, then EasyEyes will present every unique set of block instructions, one after another, before the first trial. FUTURE: Support Markdown to allow simple formatting, including italic and bold. FUTURE: We add a new parameter instructionURL that accepts a URL to a Google Sheets doc, similar to EasyEyes International Phrases, but set up by the Scientist, and when it's provided, instructionForXXX, rather than text, expects a phrase name, like EE_Welcome, and  pulls from that Sheets doc the named phrase in the current language. \n",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "instructionForExperiment",
    availability: "now",
    example: "",
    explanation:
      "🕑 instructionForExperiment (empty default, which has no effect) is instructional text to be presented once at the beginning of the whole experiment, before beginning the first block. It can appear in any condition, e.g. in the last condition of the last block, but is presented first, before the first first block. If instructionForExperiment is defined in more than one condition in the experiment, then the several instances are concatenated, in their order of appearance in the experiment spreadsheet after shuffling. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "instructionForResponse",
    availability: "now",
    example: "",
    explanation:
      "⭑ instructionForResponse (empty default, which has no effect) is instructional text, to be presented after each stimulus of this condition, that reminds the participant how to respond to the stimulus, e.g. clicking or typing to identify, detect, or rate. This text replaces whatever were the condition's default instructions, which depend on targetTask and targetKind. An empty field requests the default text, so write #NONE to suppress response instructions for this condition. The text is line-wrapped to fit, and any carriage returns in the text are expressed. We typically ask the participant to respond by clicking one or more buttons indicating their selection(s). We rarely use the standard #PROCEED symbol here. FUTURE: Support Markdown to allow simple formating, including italic and bold. FUTURE: If the participant has requested translation to another language, then we use Google Translate to do so. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "internationalPhrasesURL",
    availability: "now",
    example: "",
    explanation:
      "🕑 internationalPhrasesURL accepts a URL to a Google Sheets doc, similar to EasyEyes International Phrases, but set up by the Scientist. When it's provided in a condition, the instructionForXXX parameters for that condition, rather than literal text, accept a phrase name, like EE_Welcome, and pull the named phrase in the current language from the Sheets doc pointed to by internationalPhrasesURL. internationalPhrasesURL can provide a URL (same or different) for each condition that needs it. Each condition operates independently of the rest. For the table to be valid it must include the first 4 rows of the EasyEyes International Phrases: language, EE_languageDirection, EE_languageUseSpace, EE_languageFont. Allowing multiple phrase tables with different language coverage seems needlessly confusing for all concerned, so just copy the first four rows (all the columns) of the EasyEyes International Phrases spreadsheet, and add new rows below, one for each new phrase. Our international phrases doc is designed to make it easy for us to add new languages (by adding a new column for each language). Please send your request to denis.pelli@nyu.edu. He will need to know: the ISO two-letter code for the language (https://www.sitepoint.com/iso-2-letter-language-codes/), the language direction (left to right or right to left), and whether it uses spaces. Once EasyEyes adds a new language, the EasyEyes compiler will insist that every scientist's internationalPhrasesURL Google Sheets doc also include that language. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "instructionForResponseWhere",
    availability: "now",
    example: "topLeft",
    explanation:
      '🕑 instructionForResponseWhere can be topLeft or bottomLeft. This is shown after the stimulus disappears, to instruct the participant how to respond. A typical instruction for the identification task is: "Type your best guess for what middle letter was just shown." ',
    type: "categorical",
    default: "topLeft",
    categories: "none, topLeft, bottomLeft",
  },
  {
    name: "instructionForStimulus",
    availability: "now",
    example: "",
    explanation:
      "⭑ instructionForStimulus (empty default, which has no effect) is instructional text, to be shown immediately before each stimulus of this condition, that tells the participant how to request the stimulus. This text replaces whatever were the condition's default instructions, which depend on targetTask and targetKind. An empty field requests the default text, so write #NONE to suppress stimulus instructions for this condition. The text is line-wrapped to fit, and any carriage returns in the text are expressed. To initiate a trial we typically ask the participant to click the center of a crosshair or hit the SPACE BAR. We rarely use the standard #PROCEED symbol here. If the participant has requested translation to another language, then we use Google Translate to do so. FUTURE: Support Markdown to allow simple formating, including italic and bold. FUTURE: If the participant has requested translation to another language, then we use Google Translate to do so. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "instructionForStimulusLocation",
    availability: "now",
    example: "upperLeft",
    explanation:
      "instructionForStimulusLocation (empty default, which has no effect) indicates where the stimulus instructions should be placed on the screen: top, upperLeft, or upperRight. If you select top, then the text will be at the top of the screen, using the full width of the screen (allowing modest right and left margins), aligned with the left or right side of the display, as guided by whether instructionFontLeftToRightBool is TRUE or FALSE. When you select upperLeft or upperRight, EasyEyes will break the text up into short lines of text, to present it as a roughly square block of text in the upper left or right corner, which may help keep the text far from the target.",
    type: "categorical",
    default: "upperLeft",
    categories: "top, upperLeft, upperRight",
  },
  {
    name: "instructionLanguage",
    availability: "now",
    example: "Italian",
    explanation:
      '🕑 English name for the language used for instructions to the participant. It must be "participant" or match one of the entries in the second row of the EasyEyes International phrases sheet. If you enter "participant", then the participant will be allowed to select the instruction language from a pull-down menu.',
    type: "categorical",
    default: "English",
    categories: "",
  },
  {
    name: "internationalTableURL",
    availability: "now",
    example: "",
    explanation:
      '🕑 internationalTableURL (default is URL of this table) is the URL of a Google Sheets table of international phrases to be used to give instructions throughout the experiment. A scientist can substitute her own table, presumably a modified copy of this one (the EasyEyes International Phrases Table). https://docs.google.com/spreadsheets/d/1UFfNikfLuo8bSromE34uWDuJrMPFiJG3VpoQKdCGkII/edit#gid=0\nThis table allows the Participant page to make all non-stimulus text international. In every place that it displays instruction text, the Participant page looks up the mnemonic code for the needed phrase in the instruction table, to find a unicode phrase in the selected instructionLanguage (e.g. English, German, or Arabic). It\'s a Google Sheets file called "EasyEyes International Phrases".\nhttps://docs.google.com/spreadsheets/d/1AZbihlk-CP7sitLGb9yZYbmcnqQ_afjjG8h6h5UWvvo/edit#gid=0\nThe first column has mnemonic phrase names. Each of the following columns gives the corresponding text in a different language. After the first column, each column represents one language. Each row is devoted to one phrase. The second row is languageNameEnglish, with values: English, German, Polish, etc. The third row is languageNameNative, with values: English, Deutsch, Polskie, etc. \n     We incorporate the latest "EasyEyes International Phrases" file when we compile threshold.js. For a particular experiment, we only need the first column (the mnemonic name) and the column whose heading matches instructionLanguage. We should copy those two columns into a Javascript dictionary, so we can easily look up each mnemonic phrase name to get the phrase in the instructionLanguage. To display any instruction, we will use the dictionary to convert a mnemonic name to a unicode phrase. \n     languageDirection. Note that most languages are left to right (LTR), and a few (e.g. Arabic, Urdu, Farsi, and Hebrew) are right to left (RTL). Text placement may need to take the direction into account. The direction (LTR or RTL) is provided by the languageDirection field.\n     languageNameNative. If we later allow the participant to choose the language, then the language selection should be based on the native language name, like Deustch or Polskie, i.e. using languageNameNative instead of languageNameEnglish.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "invitePartingCommentsBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 Setting invitePartingCommentsBool (default FALSE) TRUE tells EasyEyes, at the end of this block, to invite the participant to make parting comments. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "logQuestBool",
    availability: "now",
    example: "",
    explanation:
      "logQuestBool (default FALSE) enables logging of Quest activity in the browser Console",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "markingBlankedNearTargetBool",
    availability: "now",
    example: "TRUE",
    explanation:
      '⭑ Setting markingBlankedNearTargetBool TRUE (default FALSE) suppresses any parts of the fixation cross or target X that are too close to the possible targets in this conditionGroup. This enables both meanings of "too close": markingBlankingRadiusReEccentricity and markingBlankingRadiusReTargetHeight.\nUseful with any target eccentricity.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "markingBlankingRadiusReEccentricity",
    availability: "now",
    example: "0.5",
    explanation:
      "⭑ So that markings don't crowd the target, the closest that a marking pixel can be to the target center is specified by setting markingBlankingRadiusReEccentricity to the fraction (default 0.5) of the target's radial eccentricity.\nUseful with a peripheral target.",
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "markingBlankingRadiusReTargetHeight",
    availability: "now",
    example: "2",
    explanation:
      "⭑ So that markings don't mask the target, the closest that a marking pixel can be to the traget center is specified by setting markingBlankingRadiusReTargetHeight (default 1) to the fraction of target height.\nUseful with any target eccentricity.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "markingClippedToStimulusRectBool",
    availability: "now",
    example: "FALSE",
    explanation:
      '⭑ markingClippedToStimulusRectBool TRUE requests that fixation and target marking be restricted to the stimulus rect, protecting the screen margins. Otherwise they are allowed to extend to the screen edges, a "full bleed".',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "markingFixationHotSpotRadiusDeg",
    availability: "now",
    example: "0.05",
    explanation:
      "markingFixationHotSpotRadiusDeg (default 0.3 deg) is the radius, in deg, of the hot spot in the fixation cross. The hot spot is the area that can be clicked with the tip of the cursor.\nUsed with responseMustClickCrosshairBool=TRUE for a peripheral target.",
    type: "numerical",
    default: "0.1",
    categories: "",
  },
  {
    name: "markingFixationMotionPeriodSec",
    availability: "now",
    example: "5",
    explanation:
      "markingFixationMotionPeriodSec (default 10 s) is the time, in secs, that it takes the crosshair to do one revolution around the origin. Used with responseMustClickCrosshairBool=TRUE for a peripheral target.",
    type: "numerical",
    default: "10",
    categories: "",
  },
  {
    name: "markingFixationMotionRadiusDeg",
    availability: "now",
    example: "0.5",
    explanation:
      "markingFixationMotionRadiusDeg (default 0.5 deg) is the radius of the circular trajectory of the crosshair about the origin. Used with responseMustClickCrosshairBool=TRUE for a peripheral target.",
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "markingFixationStrokeLengthDeg",
    availability: "now",
    example: "1",
    explanation:
      "⭑ markingFixationStrokeLengthDeg (default 2 deg) specifies the stroke length in the fixation cross. The cross consists of two strokes, one horizontal, one vertical. Thus this is a diameter, unless the other marking parameters, which are mostly radii. Setting this to a large value (e.g. 100) will produce a fixation cross that extends from edge to edge of the display, which may help restore salience of a cross despite blanking of the cross near possible target locations. You can avoid colliding with a peripheral target by setting this short, or by leaving it long and setting markingBlankingRadiusReTargetHeight.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "markingFixationStrokeThickening",
    availability: "now",
    example: "",
    explanation:
      'markingFixationStrokeThickening (default 1) specifies a thickness multiplier when the fixation mark is "bold". Currently the bold effect is only used to indicate that the cursor is in the hotspot (i.e. the cursor tip is within markingFixationHotSpotRadiusDeg of the center of the crosshair). The multiplier is greater than or equal to zero, so it can shrink or expand the crosshair stroke thickness. Setting it to 1, the default, disables bolding. ',
    type: "numerical",
    default: "1.4",
    categories: "",
  },
  {
    name: "markingFixationStrokeThicknessDeg",
    availability: "now",
    example: "0.03",
    explanation:
      "markingFixationStrokeThicknessDeg (default 0.05 deg) sets stroke thickness in the fixation cross.",
    type: "numerical",
    default: "0.05",
    categories: "",
  },
  {
    name: "markingOffsetBeforeTargetOnsetSecs",
    availability: "now",
    example: "0.3",
    explanation:
      "⭑ Pause for markingOffsetBeforeTargetOnsetSecs before target onset to minimize forward masking of the target by the preceding fixation and target markings. You should leave this at zero (default) when the target is peripheral, because you don't want to give the participant time to foveate the peripheral target. Thus we expect this parameter to be nonzero only when the target is foveal. In that case it may be wise to give enough time (e.g. 0.3 s) to prevent forward masking of the target by the fixation cross. Forward masking of the target by the fixation cross can also be reduced by blanking the cross near the target, as controlled by markingBlankedNearTargetBool. Especially useful with a foveal target.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "markingOnsetAfterTargetOffsetSecs",
    availability: "now",
    example: "0.2",
    explanation:
      "⭑ Pause for markingOnsetAfterTargetOffsetSecs before onset of fixation and target markings to minimize backward masking of the target. Especially useful with a foveal target.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "markingTargetStrokeLengthDeg",
    availability: "now",
    example: "1",
    explanation:
      "Stroke length in the X marking the possible target location. ",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "markingTargetStrokeThicknessDeg",
    availability: "now",
    example: "0.03",
    explanation:
      "Stroke thickness in the X marking the possible target location.",
    type: "numerical",
    default: "0.03",
    categories: "",
  },
  {
    name: "markTheFixationBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "Setting markTheFixationBool TRUE (default) draws a fixation cross. This will collide with a foveal target unless you prevent collision by using markingBlankingRadiusReTargetHeight or markingOffsetBeforeTargetOnsetSecs and markingOnsetAfterTargetOffsetSecs.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "markThePossibleTargetsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Setting markThePossibleTargetsBool TRUE (default FALSE), draws an X at every possible target location, considering all conditions in this conditionGroup. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "maskerBaseFrequencyMultiplier",
    availability: "now",
    example: "2",
    explanation:
      "Compute base frequency of a mask melody by multiplying the target frequency by this factor. If there are two melodies then the second melody has base frequency given by target frequency divided by this factor.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "maskerSoundDBSPL",
    availability: "now",
    example: "-100",
    explanation:
      "⭑ maskerSoundDBSPL (default -100) is sound level of the masker in dB SPL.",
    type: "numerical",
    default: "-100",
    categories: "",
  },
  {
    name: "maskerSoundFolder",
    availability: "now",
    example: "sounds",
    explanation:
      "⭑ The name of a folder of sound files (each file can be in WAV or AAC format), to be used when targetKind is sound. The folder is submitted as a zip archive to the EasyEyes drop box, and saved in the Pavlovia account in the Folders folder. The name of the zip archive, without the extension, must match the value of maskSoundFolder. See targetSoundFolder for comments on the WAV and ACC file formats.",
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
    name: "movieComputeJS",
    availability: "now",
    example: "",
    explanation:
      '⭑ movieComputeJS holds the filename (including extension “.js”) of a JavaScript program to compute an HDR movie. A one-frame movie will display a static image for the specified targetDurationSec. movieComputeJS is used if and only if the targetKind is movie. When the experiment table is compiled, the program file must already have been uploaded through the EasyEyes submission box. The program must define and fill the “movieNit” array. The program can use several predefined variables, including: movieRectPx, tSec, xyDeg, xDeg, and yDeg, as well as the EasyEyes input parameters targetContrast, targetEccentricityXDeg, targetEccentricityYDeg, targetCyclePerDeg, targetHz, targetPhaseDeg, targetOrientationDeg (clockwise from vertical), targetSpaceConstantDeg (the 1/e radius), targetTimeConstantSec, movieRectDeg, and movieLuminanceNit. When EasyEyes reads your compute js file, it processes the list of argument in the function definition. You can include any of the INPUT PARAMETERS defined this GLOSSARY in your list of arguments. At runtime, EasyEyes will retrieve their values and provide whichever input parameters your code specifies.\n\nTIMING: Each movie trial reports timing data in the CSV results file. Each movie trial, computes a movie by first running the scientist\'s movieComputeJS and then passing it through the ffMPEG encoder. Here are some results using tiltedFlickeringGrating.js on Chrome on a MacBook Pro (13-inch, M1, 2020), asking ffMPEG to use the avc1 : libx264 codec. Total prep time (watching the wait icon) grows linearly with the product of pixels per frame and number of frames. \ntimeSec = 1 + MPix*frames/4\nwhere timeSec is the prep time in seconds, MPix means a mega pixel, i.e. one million pixels, and frames is the number of frames in the movie. 25% of this is the runtime of the tiltedFlickeringGrating.js, and 75% is ffMPEG. The formula for just ffMPEG is\nffMpegSec = 0.7 + MPix*frames/6\nThe 6 MPix/s rate seems fine. The fixed 0.7 s overhead is surprising. We don\'t yet know what it\'s doing during that time.\n\nTIMING DATA IN CSV FILE, for each trial\ncomputeMovieArraySec, e.g. 1.1. The time (in sec) spent in the scientist’s movie.js to prepare compute the movie for this trial.\ncomputeFfmpegSec, e.g. 2.1, The time (in sec) spent in ffMPEG to encode the movie for this trial\ncomputeTotalSec, e.g. 3.2, Total time (in sec) preparing the movie for this trial.\ncomputePixels, e.g., 1000000, The number of pixels in each frame.\ncomputeFrames, e.g. 10, The number of frames in the movie.\ncomputeCodec is the name is of the codec, different for Chrome and Safari.\n\n(NOT UP TO DATE) ADVICE ON HOW TO WRITE YOUR JavaScript MOVIE ROUTINE\nxyDeg is a 2*width*height float array, which provides the exact x,y visual coordinate of each screen pixel in movieRectPx. \nxDeg and yDeg are float vectors, which provide approximate visual coordinates of the screen pixels in movieRectPx. \nTo compute a (possibly one-frame) movie as a visual stimulus, we usually need the visual coordinate of each pixel. EasyEyes provides the width*height*2 array xyDeg[i,j,k], where each 2-number element (indexed by k) is the x,y position in deg of pixel i,j. Use of the xyDeg array does not allow speed up by computational separation of x and y, so you may prefer to use the separable approximation provided by the width-long vector xDeg and height-long vector yDeg, which provide approximate visual coordinates of the pixels in movieRectPx. (Note: xyDeg takes time and space for EasyEyes to compute, and not all movieComputeJS programs need it, so EasyEyes skips making xyDeg if the string  "xyDeg" is not found in the movieComputeJS file.)\n\nEXAMPLE: movieComputeJS might contain the filename "VerticalGrating.js", and that file might contain:\n// Compute vertical Gabor.\nvar imageNit = new Array(xDeg.length).fill(0)\n        .map(() => new Array(yDeg.length).fill(0));\nvar gx = [];\nvar gy = [];\nfor (const x of xDeg) {\n        gx.push(\n                Math.exp(-((x-targetEccentrictyXDeg)/targetSpaceConstantDeg)**2)\n        );\n}\nfor (const y of yDeg) {\n        gy.push(\n                Math.exp(-((y-targetEccentrictyYDeg)/targetSpaceConstantDeg)**2)\n        );\n}\nvar fx = [];\nfor (i = 0; i < xDeg.length; i++) {\n        fx[i]=gx[i]*Math.sin(\n                2*Math.PI*((xDeg[i]-targetEccentrictyXDeg)*targetCyclePerDeg + targetPhase/360)\n        )\n}\nfor (j = 0; j < yDeg.length; j++) {\n        for (i = 0; i < xDeg.length; i++) {\n                imageNit[i][j] = (255/2) * (1 + targetContrast * gy[j] * fx[i]);\n        }\n}',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "movieHz",
    availability: "now",
    example: "",
    explanation:
      "⭑ movieHz is the desired frame rate of the movie. Most displays run at 60 Hz, some are faster, and some have variable frame rate. movieHz set the number of computed movie frames per second. Each computed frame could be displayed for several display frames. For example, one might save computation time by setting movieHz to 15 for display on a 60 Hz display. Not to be confused with the desired flicker frequency of the target, targetHz, which is independent.",
    type: "numerical",
    default: "60",
    categories: "",
  },
  {
    name: "movieLuminanceNit",
    availability: "now",
    example: "",
    explanation:
      "movieLuminanceNit (default -1) is the desired screen luminance in cd/m^2, i.e. nits. Specifying luminance will only be practical when we use an HDR codec supporting PQ. More typically, we'll want to use the display at the background luminance it was designed for, often 500 cd/m^2 in 2022, or half that. The default -1 value indicates that we should use the display at whatever background luminance we find it in.",
    type: "numerical",
    default: "-1",
    categories: "",
  },
  {
    name: "moviePQEncodedBool",
    availability: "now",
    example: "",
    explanation:
      "moviePQEncodedBool (default FALSE) determines whether to use the PQ transfer function. With PQ each pixels specified its own absolute l",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "movieRectDeg",
    availability: "now",
    example: "",
    explanation:
      "⭑ movieRectDeg (default is empty, indicating whole screen) indicates the desired approximate movie size and location in the visual field. It consists of four float numbers separated by commas, stored as text. All number are in deg relative to fixation. deg are positive above and to the right of fixation. The sequence is left,bottom,right,top. Whatever is requested will be mapped to pixels and clipped by screenRectPx. \n     Note that movieRectDeg is a rect on the retina, which will be curved on the screen, and tthe movie's screen pixels are specified as the screen rect, movieRectDeg. Guided by movieRectPxContainsRectDegBool, EasyEyes creates screenRectPx to be a reasonable approximation to movieRectDeg.\n     The scientist provides movieRectDeg, which defines a rect in visual coordinates (i.e. deg on the retina). Note that straight lines in visual space generally correspond to curves in pixel space. However, the HDR movie must be a screen rect (horizontal & vertical rectangle), so EasyEyes defines the movieRectPx screen rect approximation to movieRectDeg. movieRectDeg is rectangular on the retina, and movieRectPx is rectangular on the screen. \n     movieRectPx is the screen rect used for the movie. It is derived from movieRectDeg according to movieRectPxContainsDegBool, and then clipped by screenRectPx. If movieRectDeg is empty (the default) then movieRectPx is the whole screen, ie screenRectPx.\n     The movie bounds are movieRectPx. To compute a movie, we usually need to know the visual coordinate of each pixel. If needed, EasyEyes provides the 2*width*height array xyDeg, where array xyDeg(i,j) is the x,y position in deg of pixel (i,j).",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "movieRectPxContainsRectDegBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "If movieRectPxContainsRectDegBool (default FALSE) is FALSE then movieRectPx is the bounding box of the four screen points that correspond to the four midpoints (on the retina) of the four sides of movieRectDeg. If it's TRUE then movieRectPx is the screen bounding box containing the four midpoints and the four corners of movieRectDeg. So movieRectPx will contain practically all the pixels in movieRectDeg. The issue, of course, is that a rect on the screen (px coordinates) when mapped to the retina (deg coordinates) is not a rect, all four sides are curved. Similarly, a rect on the retina (deg coordinates) when mapped to the screen (px coordinates) is not a rect, all four sides are curved. Despite the imprerfect correspondence, rects are convenient, so movieRectPxContainsRectDegBool selects how to approximate the correspondence. Usually the scientist will want to specify in deg coordinates, but want the efficiciency of implementation in px coordinates.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "movieSec",
    availability: "now",
    example: "60",
    explanation:
      "⭑ movieSec is the desired duration of the movie. The actual duration will be an integer number of frames. EasyEyes will compute n=round(movieHz*movieSec) frames, with a duration of n/movieHz.",
    type: "numerical",
    default: "60",
    categories: "",
  },
  {
    name: "movieTargetDelaySec",
    availability: "now",
    example: "0",
    explanation:
      "movieTargetDelaySec (default is 0) specified the target delay (positive or negative) relative to being centered in the movie duration movieSec.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "needScreenHeightUpToDeg",
    availability: "now",
    example: "30",
    explanation:
      "needScreenHeightUpToDeg (default 0) is optionally specified for each condition. needScreenHeightUpToDeg and needTargetSizeDownToDeg are combined in each block to compute a needed screen resolution, which is enforced in the experiment's initial compatibility check. \nNOT YET IMPLEMENTED, needScreenHeightUpToDeg is used again at the beginning of each block, places an upper limit on viewing distance so that the screen will have (at least) the specified height in deg. Default is zero, which is ignored. This depends on screen height in cm, which is unknown until size calibration. Setting this greater than zero in any condition of the whole experiment results in a minimum screen-height px compatibility requirement before the experiment begins.\n\nFor more details see: needScreenHeightUpToDeg.\n                                                                    ",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "needScreenWidthUpToDeg",
    availability: "now",
    example: "30",
    explanation:
      "needScreenWidthUpToDeg (default 0) is optionally specified for each condition. needScreenWidthUpToDeg and needTargetSizeDownToDeg are combined in each block to compute a needed screen resolution, which is enforced in the experiment's initial compatibility check. NOT YET IMPLEMENTED needScreenWidthUpToDeg is also used at the beginning of each block, to place an upper limit on viewing distance so that the screen will have (at least) the specified width in deg. Default is zero, which is ignored. This depends on screen width in cm, which is unknown until size calibration. Setting this parameter greater than zero in any condition of the whole experiment results in a minimum screen-width px compatibility requirement before the experiment begins.\n\nCompute required resolution for compatibility. EasyEyes ignores any conditions disabled by the scientist having set conditionEnabledBool FALSE. Similarly EasyEyes ignores any block disabled by virtue of having all its conditions disabled. EasyEyes combines pixel density (px/deg) and screen subtense (deg) across enabled conditions within each block. Then it computes required screen resolution (px) for each block, and computes the max across enabled blocks to arrive at the width and height pix requirements for the experiment. These requirements are declared on the EasyEyes Compatibility page when a participant computer is rejected.\n\nEasyEyes allows viewing distance to change from block to block, but makes it equal among all conditions within any block. The compatibility computation is performed first, before screen size (cm) is known, and viewing distance is typically set larger for a larger screen (cm) to achieve both the desired visual subtense (deg) and pixel density (px/deg). Thus, EasyEyes makes the compatibility calculations without knowing the viewing distance.\n\nTo compute required screen resolution (px), EasyEyes uses, from the experiment, one logical parameter conditionEnabledBool and four numerical parameters: targetMinimumPx, needTargetSizeDownToDeg, needScreenWidthUpToDeg, and needScreenHeightUpToDeg. For each block, EasyEyes first computes max of the required pixel density px/deg across enabled conditions:\nminPxPerDeg = max(targetMinimumPx/needTargetSizeDownToDeg) across enabled conditions in the block. Then it computes max of the required screen subtense (deg) across enabled conditions in each block:\nminScreenWidthDeg=max(needScreenWidthUpToDeg)\nand\nminScreenHeightDeg=max(needScreenHeightUpToDeg)\nFrom these three variables, for each block, EasyEyes computes the min screen resolution (px), for each block:\nminScreenWidthPx=minPxPerDeg*tand(minScreenWidthDeg/2)/tand(0.5)\nminScreenHeightPx=minPxPerDeg*tand(minScreenHeightDeg/2)/tand(0.5)\nwhere tand is a tangent function that accepts its argument in deg, i.e. tand(x)=tan(x*pi/180).\nFinally the required resolution for the experiment is the max required resolution max(minScreenWidthPx) and max(minScreenHeightPx) across all enabled blocks.\n\nThe TestScreenResolution.xlsx spreadsheet emulates the EasyEye Compatibility-Page computation of required screen resolution (px).",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "needTargetSizeDownToDeg",
    availability: "now",
    example: "0.05",
    explanation:
      "needTargetSizeDownToDeg (default 0.1 deg) is, optionally, specified for each condition. needScreenWidthUpToDeg and needTargetSizeDownToDeg are combined in each block to compute a needed screen resolution, which is enforced in the experiment's initial compatibility check. NOT YET IMPLEMENTED needTargetSizeDownToDeg is also used at the beginning of each block, to place a lower limit on viewing distance so that the screen will have enough pixels per deg to display a target of specified size in deg. The minimum viewing distance depends on screen resolution in px/cm, which is unknown until size calibration. This calculation uses targetMinimumPix. Besides helping to set viewing distance block by block (EasyEyes imposes equal viewing distance across conditions in a block), the viewingDistanceSmallXXX and viewingDistanceLargeXXX parameters are also combined across all conditions in the experiment to require an adequate screen width and height (in pixels) in the initial compatibility check that determines whether the experiment will begin.\n\nThe EasyEyes Compatibiily Page will require a minimum screen resolution, if and only if at least one block specifies both needTargetSizeDownToDeg and at least one of needScreenWidthUpToDeg and needScreenHeightUpToDeg.\n\nFor more details see: needScreenHeightUpToDeg.\n",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "notes",
    availability: "now",
    example: "",
    explanation:
      "notes Use this to add comments about the condition that you want preserved in the data file. Ignored by EasyEyes and saved with results.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "questionAndAnswer@@",
    availability: "now",
    example: "AFTERLIFE|No|Is there life after death?|Yes|No|Maybe",
    explanation:
      '⭑ questionAndAnswer01 ... questionAndAnswer99 each consist of several strings, separated by vertical bars |, that specify: a \nnickname, \ncorrectAnswer (may be empty), \na question to be asked, \nand perhaps several possible answers.  \nThe nickname is used solely to name the column of responses in the saved data. The correctAnswer may be omitted, in which case the vertical bars before and after it will be contiguous. The nickname and question are required; the correct answer and possible answers are optional. If no possible answers are specified, then the question accepts a free-form text answer. If multiple answers are specified, then they are offered to the participant as multiple-choice alternatives, a button devoted to each one. Specifying just one answer is currently an error, but this may change in a future enhancement. (We might use the single-answer field to specify the single-answer type, e.g. logical, numerical, integer, text.)\nIMPORTANT: To use questionAndAnswer you MUST set targetTask to questionAndAnswer. The compiler will soon enforce this.\nIMPORTANT: You can have many questionAndAnswer in one condition, e.g.  questionAndAnswer01, questionAndAnswer02, questionAndAnswer03, but the block may not include any other condition. The EasyEyes compiler will soon enforce this.\n• FREE-FORM: Provide just a nickname, an empty correctAnswer, and a question, no answer. For example, "DESCRIPTION||Describe the image that you are seeing right now?" The participant is invited to type their answer into a text box.\n• MULTIPLE CHOICE: Provide a nickname, a correctAnswer, a question, and at least two possible answers. The participant must click on one. For example:\nFRUIT|apple|Which of the following is a fruit?|house|sky|apple|father|country\nBEAUTY||How much beauty do you get from this image right now?|1|2|3|4|5|6|7\nor\nKIND||What kind of image is it?|figurative painting|abstract painting|photograph\n\nEasyEyes supports questionAndAnswer01 ... questionAndAnswer99, i.e. you can have up to 99 questions in one block. The questions you use must start with the ending 01 and cannot skip numbers.  You can have any number of blocks, each with up to 99 new questions.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "readingCorpusShuffleBool",
    availability: "now",
    example: "",
    explanation:
      '🕑 readingCorpusShuffleBool (default FALSE), when TRUE requests that the condition be run from a shuffled copy of the corpus that is created and shuffled at the beginning of the block and discarded at the end of the block. If several interleaved conditions use the same readingCorpus and set readingCorpusShuffleBool=TRUE, then each uses its own independently shuffled copy. For shuffling, each string of non-whitespace character is a "word", and every string of whitespace characters is replaced by a space. The word order is shuffled in the copy, which is used for all trials of this condition in this block. WE SHOULD REMOVE TRAILING PUNCTUATION FROM EACH WORD.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "readingCorpus",
    availability: "now",
    example: "the-phantom-tollbooth.txt",
    explanation:
      "REQUIRED. The filename of a text file that has already been uploaded to Pavlovia. The text file should be a book's worth of readable text. We typically use \"The phantom tollbooth\" a popular American children's book with a reading age of 10+ years for interest and 12+ years for vocabulary. We retain punctuation, but discard chapter and paragraph breaks. \n     After EasyEyes reads in the corpus text, it does two analyses to facilitate its use.\n1. CONCORDANCE. Prepare a concordance. This is a two-column table. The first column is a unique list of all the corpus words. The second column is frequency, i.e. the number of times that the word appears in the corpus. For this purpose we should ignore capitalization and leading and trailing punctuation. The table is sorted by decreasing frequency.\n2. WORD INDEX. Use a regex search to make a one-column  list of the index, in the corpus, of every word. For this purpose, a word consists of an alphanumeric character plus all leading and trailing non-whitespace characters.\nIMPORTANT: Currently, leaving the readingCorpus field blank causes a fatal error in EasyEyes when that condition runs. We plan to add a compiler check to detect the problem at compile time, before your study runs.\n",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "readingCorpusEndlessBool",
    availability: "now",
    example: "",
    explanation: "readingCorpusEndlessBool",
    type: "boolean",
    default: "",
    categories: "",
  },
  {
    name: "readingDefineSingleLineSpacingAs",
    availability: "now",
    example: "nominalSize",
    explanation:
      "🕑 readingDefineSingleLineSpacingAs selects a definition of single line spacing (baseline to baseline) of the text to be read. The actual spacing will be the output parameter readingLinespacingDeg, which is the product of the single linespacing and readingMultipleOfSingleLineSpacing. \nIMPLEMENTED\n• font defines single line spacing as the font's built-in line spacing, which can be enormous in fonts with large flourishes. \nNOT YET IMPLEMENTED\n• nominalSize is the industry standard, which defines single line spacing as the nominal point size at which we are rendering the font. So single spacing of 12 pt Times would be 12 pt line spacing.\n• explicit defines single line spacing as readingSingleLineSpacingDeg.\n• twiceXHeight defines single line spacing as twice the font's x-height. (Many fonts, e.g. TImes New Roman, have x-height equal to half their nominal size. For those fonts, nominalSize and twiceXHeight will produce the same line spacing.)\nNote that the calculation of readingLineSpacingPx needs to be done fresh for each text object because it may depend on font, font size, and screen location, which can change from trial to trial. We use the center of the text object as the reference location for converting between deg and px.",
    type: "categorical",
    default: "nominalSize",
    categories: "nominalSize, explicit",
  },
  {
    name: "readingFirstFewWords",
    availability: "now",
    example: "It was a dark and stormy night",
    explanation:
      '⭑ readingFirstFewWords (default "") specifies the beginning of the reading in the corpus by its first few words, a string. The matching is exact, including case and punctuation. Default is the empty string, in which case we read from the beginning of the corpus. The EasyEyes compiler flags an error if a nonempty string is not found in the corpus. If the (nonempty) string appears more than once in the corpus, EasyEyes will randomly pick among the instances, independently for each reading. Thus, for an English-language corpus, one might reasonably set readingFirstFewWords to "The ", to begin each reading at a randomly chosen sentence that begins with "The ".',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "readingLinesPerPage",
    availability: "now",
    example: "8",
    explanation:
      "⭑ readingLinesPerPage (default 4) is the number of lines of text per page.",
    type: "numerical",
    default: "4",
    categories: "",
  },
  {
    name: "readingMaxCharactersPerLine",
    availability: "now",
    example: "57",
    explanation:
      "⭑ readingMaxCharactersPerLine (default 57) is the maximum line length in characters. (Note that line breaking is based on pixels, not characters; readingMaxCharactersPerLine is used to compute readingMaxPixPerLine.) We compute an average character width as the width in pixels of fontCharacterSet divided by the number of characters in that string. The maximum line length (px) is the product of that average character width (px) and readingMaxCharactersPerLine (default 57). Typographers reckon that text is easiest to read in a column that is 8-10 words wide. Average English word length is 5 characters. Adding the space between words yields 6. Multiplying 8-10 by 6 yields 48 to 60 letter widths per line. Line breaking without hyphenation will produce an average line length about half a word less than the max, so to get an average of 9, we could use a max of 9.5, or 9.5*6=57 letter widths.",
    type: "numerical",
    default: "57",
    categories: "",
  },
  {
    name: "readingMultipleOfSingleLineSpacing",
    availability: "now",
    example: "1.2",
    explanation:
      '🕑 Set the line spacing (measured baseline to baseline) as this multiple of "single" line spacing, notwhich is defined by readingDefineSingleLineSpacingAs. 1.2 is the default in many typography apps, notincluding Adobe inDesign.',
    type: "numerical",
    default: "1.2",
    categories: "",
  },
  {
    name: "readingNominalSizeDeg",
    availability: "now",
    example: "3",
    explanation:
      'If readingSetSizeBy is "nominal", then set point size to the product readingNominalSizeDeg*pixPerDeg.',
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "readingNumberOfPossibleAnswers",
    availability: "now",
    example: "3",
    explanation:
      '⭑ readingNumberOfPossibleAnswers is number of possible answers for each question (which of these words did you read just now?). Only one of the possible answers is right. The rest are "foils". The foils have approximately the same frequency in the corpus as the target.',
    type: "integer",
    default: "4",
    categories: "",
  },
  {
    name: "readingNumberOfQuestions",
    availability: "now",
    example: "4",
    explanation:
      '⭑ After the participant reads a passage, EasyEyes will ask readingNumberOfQuestions, each on a new screen, to assess retention. Each retention question offers several words and asks the participant which word (the target) was in the passage just read. The other words (foils) were not in that passage but do appear in the corpus. The target word is presented with enough foils to offer N=readingNumberOfPossibleAnswers. The words are arranged in alphabetical order below the question. The participant responds by clicking on the chosen word. It\'s "forced choice"; the participant must click a word. We give a "correct" beep if the answer is right. We repeat this several times, as specified by readingNumberOfQuestions.\n     IGNORE FIRST & LAST PAGES. Performance on the first and last pages of the passage might not be representative because timing of the space bar press might be less regular, and primacy and recency would make words on those pages more memorable. So we analyze only the middle pages, excluding the first and last both from the estimate of reading speed and the retention test. [Thus each word in the corpus is read and tested, read and not tested, or not read.]\n     CONCORDANCE. As explained in readingCorpus, we will, once, compute a concordance, the frequency of every word in the corpus. It is a two-column table (word and number of instances in the corpus), sorted by frequency. \n     CANDIDATES FOR TARGET. For a given passage, each question uses a different target word. We pick candidate target words randomly from the passage just read  (in which many words appear more than once), and check each for suitability. We reject some candidates, so we keep picking candidates until we have accepted the desired number, readingNumberOfQuestions. As potential target or foil words we reject any strings in the concordance that include a hyphen.\n     CHOOSE FOILS. We pick a random integer from 1 to N to determine the rank order frequency of the target among the foils. We reduce the concordance by striking out all the words that were read (whether to be tested or not), except the target, which remains. As our answer set, we take N consecutive words from the reduced concordance, including the target, chosen so that the target has the randomly specified frequency rank (1 to N). If the target frequency is so high or low that the reduced concordance lacks N successive words with the target at the designated rank order, then we reject that target and pick another, using the same random rank. The passage read will typically have hundreds of words, so there are lots of candidate targets for the retention questions.\n      \n\n\n',
    type: "integer",
    default: "3",
    categories: "",
  },
  {
    name: "readingPages",
    availability: "now",
    example: "4",
    explanation:
      "⭑ Number of pages to be read. The CSV file reports the number of characters and number of seconds for each page.",
    type: "numerical",
    default: "4",
    categories: "",
  },
  {
    name: "readingSetSizeBy",
    availability: "now",
    example: "spacing",
    explanation:
      "⭑ How do you specify the size of the text to be read?\n• nominal will set the point size of the text to readingNominalSizeDeg*pixPerDeg,  \n• xHeight will adjust text size to achieve the specified x-height (the height of lowercase x),  i.e. readingXHeightDeg. \n• spacing will adjust the text size to achieve the specified average letter-to-letter readingSpacingDeg.",
    type: "categorical",
    default: "spacing",
    categories: "nominal, xHeight, spacing",
  },
  {
    name: "readingSingleLineSpacingDeg",
    availability: "now",
    example: "2",
    explanation:
      "🕑 Explicit value of single line spacing. This is ignored unless readingDefineSingleLineSpacingAs is explicit.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "readingSpacingDeg",
    availability: "now",
    example: "0.5",
    explanation:
      "⭑ readingSpacingDeg has default 0.5 deg. If readingSetSizeBy is spacing, the point size of the text to be read is adjusted to make this approximately the average center-to-center spacing (deg) of neighboring characters in words displayed. For the proportionality of spacing to point size, I suggest we measure the width of the fontCharacterSet string, and divide by the number of numbers in the string.",
    type: "numerical",
    default: "0.5",
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
    availability: "now",
    example: "FALSE",
    explanation:
      "⭑ When using an Arabic font, responseCharacterHasMedialShapeBool TRUE (the default) to show each character (available response choice) in medial (i.e. with connectors) instead of isolated form (no connectors). This has the intended effect with Arabic, and has no effect in the Roman alphabet. Still untested with other alphabets. In Arabic, ligatures respond to the neighboring letters. When we identify crowded Arabic letters in typographic mode, the target character is displayed in medial shape (i.e. connected) as a stimulus. If responseCharacterHasMedialShapeBool is TRUE (the default) then the response screen also shows each response letter in its medial shape. If FALSE, then the response letter is shown in its isolated shape (i.e. disconnected). Having the target letter change shape between stimulus and response screens may make it harder to identify, especially by less fluent readers. To achieve this, when responseCharacterHasMedialShapeBool is TRUE we precede the response character by a Tarweel joiner character (U+0640) and follow it by a zero-width joiner (ZWJ) character (U+200D). For more on these characters in Arabic typesetting see https://www.w3.org/TR/alreq/#h_joining_enforcement",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responseClickedBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ Allow participant to respond at every occasion by clicking (e.g. clicking the target letter in the fontCharacterSet). When ready for stimulus, allow clicking fixation instead of hitting SPACE. The various response modes are not exclusive. Enable as many as you like. And simulateParticipantBool can provide responses too.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responseEscapeOptionsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "🕑 THIS DESIGN DID NOT ANTICIPATE THAT, WHEN IN FULL-SCREEN MODE, THE BROWSER RESERVES THE ESCAPE KEY FOR EXITING FROM FULL-SCREEN MODE. WE'LL HAVE TO PICK ANOTHER KEY FOR SKIPPING AHEAD. Once debugged, responseEscapeOptionsBool will be TRUE by default. If FALSE, then we follow the PsychJS behavior, and any press of ESCAPE immeditaely ends testing and takes the participant to the debrief form (if requested). If TRUE, then ESCAPE offers two or three options. The miidest option is to continue from where ESCAPE was presssed, deleting any trial for which the response was not yet collected. The middle option is only presented if we suppose that we're testing the scientist, not a typical participant. This option skips to the next block. The last option ends testing and goes to debriefing (if requested). Our rule for supposing that the participant is the scientist is either that the Prolific URL parameters are absent or we are in Prolific Preview mode.\n     If responseEscapeOptionsBool is TRUE, then, at any prompt, the participant can hit <escape> to be asked whether to cancel the trial (hit space), the block (hit return), or the whole experiment (hit escape again).",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responseMustClickCrosshairBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ Setting responseMustClickCrosshairBool TRUE overrules all other response boolean parameters to enable clicking, and ONLY clicking, of the crosshair, to request the next trial. We suppose that clicking the crosshair results in good fixation just before stimulus presentation. This parameter is ignored for other responses, e.g. identifying the target and proceeding through instructions. It is an error to enable both responseMustClickCrosshairBool and responseMustTrackCrosshairBool.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responseMustTrackCrosshairBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ For the participant to get target presentation, responseMustTrackCrosshairBool=TRUE overrules all other response boolean parameters, and target presentation can be requested only by cursor tracking of the crosshair center. We suppose good fixation of the crosshair while it is tracked. responseMustTrackCrosshairBool has no effect on other responses, e.g. identifying the target and proceeding through instructions. It is an error to enable both responseMustClickCrosshairBool and responseMustTrackCrosshairBool. \n     If responseMustTrackCrosshairBool=TRUE, when EasyEyes begins a trial, it enters a loop. First it loads a countdown timer with the required tracking duration, which is randomly sampled from the interval responseMustTrackMinSec to responseMustTrackMaxSec. The countdown begins when the cursor is first within markingFixationHotSpotRadiusDeg of the crosshair center. When the countdown reaches zero, EasyEyes again checks whether the cursor is within markingFixationHotSpotRadiusDeg of the crosshair center. If yes, then EasyEyes exits the loop, and the target is immediately presented. If not, then EasyEyes returns to the beginning of the loop, selecting a new random tracking duration.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responseMustTrackMaxSec",
    availability: "now",
    example: "",
    explanation:
      "When responseMustTrackCrosshairBool=TRUE, the participant’s required tracking time to get target presentation is a random sample from the interval responseMustTrackMinSec to responseMustTrackMaxSec. The EasyEyes compiler requires that\nresponseMustTrackMaxDelaySec ≥ responseMustTrackMinDelaySec ≥ 0.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "responseMustTrackMinSec",
    availability: "now",
    example: "",
    explanation:
      "When responseMustTrackCrosshairBool=TRUE, the participant’s required tracking time to get target presentation is a random sample from the interval responseMustTrackMinSec to responseMustTrackMaxSec. The EasyEyes compiler requires that\nresponseMustTrackMaxDelaySec ≥ responseMustTrackMinDelaySec ≥ 0.",
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "responseNegativeFeedbackBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "When responseNegativeFeedbackBeepBool (default FALSE) is TRUE, after a mistaken response, provide negative feedback (sound is a pure 500 Hz tone for 0.5 sec at amplitude 0.05; word is wrong). Default is FALSE, as we typically give only positive feedback.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responsePositiveFeedbackBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "When responsePositiveFeedbackBool (default TRUE) is TRUE, after each correct response, provide positive feedback (sound is a pure 2000 Hz tone for 0.05 sec at amplitude 0.05; word is RIGHT). WORKING FOR SOUND TASKS; NOT YET IMPLEMENTED FOR VISION TASKS.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responsePurrWhenReadyBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "When responsePurrWhenReadyBool (default FALSE) is TRUE, play a purring sound to alert the observer while we await their response. Pure 200 Hz tone indefinitely at amplitude 1. Stop purring when they respond.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responseSpokenBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 responseSpokenBool allows participant to respond  verbally at every occasion, e.g. by verbally naming the target. The various response modes are not exclusive. Enable as many as you like. But responseMustClickCrosshairBool overrides all other settings.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responseSpokenToExperimenterBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 responseSpokenToExperimenterBool requires the participant to respond verbally to the experimenter sitting alongside, e.g. by verbally naming the target. This is used to test children. The experimenter will use the laptop keyboard to discreetly score the verbal response. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responseTypedBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'responseTypedBool allows participant to respond at every occasion by pressing a key in keyboard. The various response modes are not exclusive. Enable as many as you like. Note: disable typed reponses if you want to force participants to click on fixation as a way tp ensure good fixation when the stimulus is presented. OVERRRIDE: Setting simulateParticipantBool to TRUE or showGrid to other than "disabled" enables type as a response method, regardles of the setting of responseTypedBool. But responseMustClickCrosshairBool overrides all other settings while the crosshair is available for clicking.\n',
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responseTypedEasyEyesKeypadBool",
    availability: "now",
    example: "FALSE",
    explanation:
      'responseTypedEasyEyesKeypadBool (default FALSE) = TRUE allows participant to provide any "typed" response by pressing a key in the EasyEyes keypad. The various response modes are not exclusive. Enable as many as you like. But responseMustClickCrosshairBool overrides all other settings. \nDELETE SOON: Currently we must ALSO set wirelessKeyboardNeededBool=TRUE in order for EasyEyes to establich connection with the keypad.\n\nGus April 14, 2023: Needed improvements that I already know:\n1. Support arbitrary fonts\n2. Make sure it works with targetKinds other than “letter”\n3. Add a visual indication on the keypad when responses aren’t being registered (currently we are ignoring responses from the threshold.js side when they aren’t allowed) \n4. Display a message when the keypad is no longer needed and the participant can put their phone away.\n\nDenis\'s requests:\n1. The smartphone connection should be established at the beginning of the experiment, before the calibrations, and nudging should be suspended until the smartphone is connected.\n2. When connection is first established, the smartphone\'s keypad is overwritten by a instructions which makes it hard to read both instructions and keypad. An easy way to eliminate the overlap would be to display just instructions with an Ok button, and show just the keypad after the participant hits Ok.\n3. I paused for many minutes and when I came back the keypad announced loss of connection, but offered no way to restore it. Presumably both the phone and the computer know the connection was lost. In this situation, I suggest we hide the keypad, say "Connection lost." and offer a "Reconnect" button.\n\n',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "needEasyEyesKeypadBeyondCm",
    availability: "now",
    example: "40",
    explanation:
      "NOT YET IMPLEMENTED: needEasyEyesKeypadBeyondCm (default 60). If the required viewingDistanceCm exceeds this threshold then EasyEyes will recruit the participant's smartphone (at the beginning of the experiment) and activate a keypad/trackpad on that smartphone during each block that requires it. The phone will be recruited at the beginning of the experiment (on the compatibility page), and will remain connected until the end of the experiment.The keypad will be activate only for blocks with a viewingDistanceCm that exceeds the threshold. While the keypad is active, the participant is free to click or type on either or both the standard and EasyEyes keypad/trackpad. Setting this to zero will always provide the remote keypad. Setting it to a large value, greater than all viewing distances used, will never provide it.\n\nCurrently we recruit the phone at the beginning of the first block that needs it. Let's change that to recruit the phone at the beginning of the experiment, on the compatibility page. If we can't recruit it, there's no point in running the experiment. \n\nI don't know if we disconnect at the end of the block, or the end of the last block that needs it, or just leave it connected until the end of the experiment. I think I prefer disconnecting after the last block that needs it. Some experiments will use the smartphone both as keypad AND for sound calibration. Sound calibration is done before the first block, so it will always come first. Requiring separate recruitment for each use is tolerable, but it would be nicer if participant could just recruit the smartphone once for the whole experiment. \n\nDELETE SOON: Currently we must ALSO set wirelessKeyboardNeededBool=TRUE in order for EasyEyes to establich connection with the keypad.\n\nGus April 14, 2023: Needed improvements that I already know:\n1. Support arbitrary fonts\n2. Make sure it works with targetKinds other than “letter”\n3. Add a visual indication on the keypad when responses aren’t being registered (currently we are ignoring responses from the threshold.js side when they aren’t allowed) \n4. Display a message when the keypad is no longer needed and the participant can put their phone away.\n\nDenis's requests:\n1. The smartphone connection should be established at the beginning of the experiment, before the calibrations, and nudging should be suspended until the smartphone is connected.\n2. When connection is first established, the smartphone's keypad is overwritten by a instructions which makes it hard to read both instructions and keypad. An easy way to eliminate the overlap would be to display just instructions with an Ok button, and show just the keypad after the participant hits Ok.\n3. I paused for many minutes and when I came back the keypad announced loss of connection, but offered no way to restore it. Presumably both the phone and the computer know the connection was lost. In this situation, I suggest we hide the keypad, say \"Connection lost.\" and offer a \"Reconnect\" button.\n\n",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "rsvpReadingFlankerCharacterSet",
    availability: "now",
    example: "x",
    explanation:
      "rsvpReadingFlankerCharacterSet is a possibly empty (the default) string of characters. If empty then there are no flankers. If nonempty then the target is surrounded with independent random samples from this string. Thus, if the string is only one character then the flankers are all the same character.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "rsvpReadingFlankTargetWithLettersBool",
    availability: "now",
    example: "",
    explanation:
      "OBSOLETE. RETAINED SOLELY FOR REPLICATION OF BUG REPORTED IN TRELLO CARD. https://trello.com/c/xKZaBnEV",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "rsvpReadingNumberOfResponseOptions",
    availability: "now",
    example: "3",
    explanation:
      "[FUTURE: delete this and use the existing readingNumberOfPossibleAnswers instead.] rsvpReadingNumberOfResponseOptions is the number of different words (only one of which is correct) provided as possible responses (in alphabetical order) when targetKind is rsvpReading. The foils have approximately the same frequency in the corpus as the target. This parameter is used only when responseSpokenToExperimenterBool is FALSE.",
    type: "numerical",
    default: "6",
    categories: "",
  },
  {
    name: "rsvpReadingNumberOfWords",
    availability: "now",
    example: "6",
    explanation:
      "⭑ rsvpReadingNumberOfWords specifies how many words are shown during each rsvpReading trial. Currently must be consistent across rsvpReading conditions within a block due to implementation restrictions. Let us know if that's a problem.",
    type: "numerical",
    default: "6",
    categories: "",
  },
  {
    name: "rsvpReadingRequireUniqueWordsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "If rsvpReadingRequireUniqueWordsBool is TRUE, only select words for the target sequence and foil words which have not yet been used as a target or foil. If FALSE, draw words directly from the corpus, even if those words have already been used in this condition.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "screenColorRGB",
    availability: "now",
    example: "",
    explanation:
      "⭑ screenColorRGB is the background color for the condition, in RGB, on a scale of 0 to 1 for each dimension. This is used to set the background of the rest of the screen to match the background of a movie.",
    type: "text",
    default: "0.92,0.92,0.92",
    categories: "",
  },
  {
    name: "screenshotBool",
    availability: "now",
    example: "TRUE",
    explanation:
      '🕑 screenshotBool requests saving a full-screen screenshot of each stimulus and response display of this condition, plus each instruction display of the block. (Currently all instruction displays belong to the block, not to any condition.) Each filename should be E.B.C.TA.png, where E stands for the experiment name, B stands for the block number, C stands for the condition number, T stands for the trial number of the condition in the block, and A is "s" for stimulus or "r" for response. If the display is instructional then A is "i", C is 0, and T is a counter that starts at 1 at the beginning of the block. screenshotBool is condition-specific, but if several conditions enable it, EasyEyes still saves only one copy of each instructional screen. Screenshots are useful for debugging and to show the stimuli in talks and papers. It is expected that taking screenshots will severely degrade timing, so it should not be requested while a participant is being tested in earnest. Instead the scientist will test herself (or use simulateParticipantBool) to collect the images she needs.\n     Can we save these files to a "Screenshots" folder in the participant computer\'s Download folder or in the experiment repository on Pavlovia? ',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "setResolutionPxPerCm",
    availability: "now",
    example: "25",
    explanation:
      "🕑 setResolutionPxPerCm sets display resolution to allow us to study perception and readability of text rendered with low pixel density. We just render on a smaller canvas and expand that for display on the participant's (high resolution) screen. In use, it will be a lot like using System Preferences: Display to set resolution, but will allow much lower resolutions. Ignored if value is empty or zero. For reference, the 2022 MacBook Pro screens have 98 px/cm. It is an error for both setResolutionPxPerCm and setResolutionPxPerDeg to be nonzero. If both are zero/empty then we use the screen in whatever resolution it's in.",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "setResolutionPxPerDeg",
    availability: "now",
    example: "4",
    explanation:
      "🕑 setResolutionPxPerDeg sets display resolution to allow us to study perception and readability of text rendered with low pixel density. We just render on a smaller canvas and expand that for display on the participant's (high resolution) screen. Ignored if value is empty or zero. It is an error for both setResolutionPxPerCm and setResolutionPxPerDeg to be nonzero. If both are zero/empty then we use the screen in whatever resolution it's in.",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "showBeepButtonOnBlockInstructionBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 showBeepButtonOnBlockInstructionBool (default TRUE) shows a Beep button in the upper right corner of the block-instruction page. Typically every trial beeps when the response was correct, so it's good to give the participant a chance to get the sound working before beginning the block. However, some tasks, e.g. rating, do not use sound at all, and then the Beep button is superfluous.",
    type: "boolean",
    default: "TRUE",
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
      "showCharacterSetBoundingBoxBool displays the bounding box of the whole fontCharacterSet.",
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
      "🕑 For foreign or symbol characterSets, we add Roman labels that the observer can type on an ordinary (Roman) keyboard.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showConditionNameBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ showConditionNameBool (default FALSE), If TRUE, then display condition name as text at lower-left corner, or, if showTargetSpecsBool is TRUE, above target specs. See showTargetSpecsBool. The point size of condition-name text should be 1.4x bigger than we use for target specs. We have several text messages that stack up in the lower left corner. If all four are present, then showText on top, above showConditionNameBool, above showExperimentNameBool, above showTargetSpecsBool.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showCounterBool",
    availability: "now",
    example: "TRUE",
    explanation:
      '⭑ showCounterBool. If TRUE display something like,"Trial 31 of 120. Block 2 of 3. At 32 cm." (The trailing part about distance is included only if showViewingDistanceBool is TRUE.) The trial counter counts all trials in the block, which may have several conditions. If the block has three conditions with 40 blocks each, then there are 120 trials in the block. ',
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
    name: "showExperimentNameBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "showExperimentNameBool (default FALSE) is useful when making screenshots to show the experimentName (i.e. the name of the Pavlovia repository, e.g. crowding3). It should go in the lower left corner. We have several text messages that stack up there. If all four are present, then **showText** on top, above **showConditionNameBool**, above **showExperimentNameBool**, above **showTargetSpecsBool**.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showFixationMarkBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "🕑 Whether or not to show the fixation mark. Regardless of this parameter, we don't show fixation when targetRepeatsBool is TRUE. In that can we cover a large area of the screen with repeated targets. ",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "showFPSBool",
    availability: "now",
    example: "",
    explanation: "Obsolete, but EasyEyes crashes if we remove it.",
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
      "⭑ showGrid displays a full-screen grid that aids visual checking of location and size (both live and in any screen shot). Set showGrid to 'px' for a pixel grid, 'cm' for a centimeter grid, 'deg' for a degrees grid,  'mm' for a cortical grid, 'none' for no grid, and 'disabled' to prevent any grid. Unless 'disabled', repeatedly pressing the backquote key (below ESCAPE) cyles through the five states: px, cm, deg, mm, none. The 'px' and 'cm' grids have their origin at lower left. The 'deg' and 'mm' grids have their origin at fixation. \nCAUTION: The grids are meant for debugging, not human testing. The visual grid is likely to mask your stimulus, and drawing the grid can take time, especially after a moving crosshair, which might compromise stimulus timing (lateness and wrong duration). So turn off grids when you collect human data and when you check timing.",
    type: "categorical",
    default: "disabled",
    categories: "px, cm, deg, mm, none, disabled",
  },
  {
    name: "showPercentCorrectBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "⭑ If showPercentCorrectBool is true for any condition in this block, then, at the end of the block, EasyEyes presents a pop-up window reporting the overall percent correct (acrosss all conditions for which showPercentCorrectBool is TRUE) in that block. The participant dismisses the window by hitting RETURN or clicking its Proceed button. This feature was requested by maybe a third of the participants who sent comments.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "showProgressBarBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ showProgressBarBool (default FALSE) is meant for children. When TRUE, EasyEyes displays a vertical green bar that tracks the trial count. The outline goes from bottom to top of the screen and it gradually fills up with green liquid, empty at zero trials, and filled to the top after the last trial of the block. Sometimes we call the green liquid spaceship fuel for Jamie the astronaut.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showTakeABreakCreditBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "If showTakeABreakCreditBool (default FALSE) then display the value of takeABreakCredit as a graphical icon next to the trial counter. A black box that gradually fills, from the bottom up, with glowing green. Empty for zero and full for 1. The box is currently centered at bottom of screen, but we plan to make it contiguous to the trial counter display.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showTargetSpecsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ For debugging. If TRUE, showTargetSpecsBool (default FALSE) displays various target parameters, including size and spacing, in lower left corner, similar to the trial/block counter. We have several text messages that stack up in the lower left corner. If all four are present, then showText on top, above showConditionNameBool, above showExperimentNameBool, above showTargetSpecsBool.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showText",
    availability: "now",
    example: "Click the crosshair.",
    explanation:
      "showText (default empty string) displays the provided text at the bottom-left of the screen, aligned left, with line breaking to show multiple lines. This is static, unchanged before, during, and after the stimulus. Default is empty string, no text. Same point size as used by showConditionNameBool. We have several text messages that stack up in the lower left corner. If all four are present, then showText on top, above showConditionNameBool, above showExperimentNameBool, above showTargetSpecsBool. [FUTURE: Do we need showTextBeforeStimulus or showTextAfterStimulus?]",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "showViewingDistanceBool",
    availability: "now",
    example: "FALSE",
    explanation:
      '⭑ If TRUE display something like "Trial 31 of 120. Block 2 of 3. At 32 cm." (The trial and block counters appear only if showCounterBool is TRUE.) Without distance tracking, this is a subtle reminder to the participant of the distance they are supposed to be at. With distance tracking, it allows both the participant and the experimenter to monitor the dynamic viewing distance. It\'s updated only once or twice per trial, to avoid drawing attention away from the stimulus.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "simulateParticipantBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "⭑ Use the software model specifed by simulationModel to generale observer responses. The test runs without human intervention. SIDE EFFECT: Setting simulateParticipantBool to TRUE enables type as a response method, regardles of the setting of responseTypedBool.",
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
      "⭑ For debugging and checking it is often helpful to simulate the observer. simulationModel can be: \n• right: Always right.\n• wrong: Always wrong.\n• blind: This model merely presses a random response key. \n• ideal: This model does the same task as the human, picking the best response given the stimulus. Its threshold is a useful point of reference in analyzing human data. Without noise, it will always be right. Since noise hasn't yet been implemented, for now, just give the right answer.\n• weibull: This model gets the trial right with a probability given by the Weibull function, which is frequently fit to human data. The QUEST staircase asssumes the Weibull model, so QUEST should accurately measure its (unknown to Quest) threshold, when the rest of the QUEST parameters match. https://psychopy.org/api/data.html#psychopy.data.QuestHandler\nIn MATLAB, the Weibull model observer is: \nfunction response=SimulateWeibull(q,tTest,tActual)\n   t=tTest-tActual+q.epsilon;\n   P=q.delta*q.gamma+(1-q.delta)*(1-(1-q.gamma)*exp(-10.^(q.beta*t)));\n   response= P > rand(1);\nend\nresponse=1 means right, and response=0 means wrong. \nP=probability of a correct response\nq is a struct holding all the Weibull parameters. \nq.beta=simulationBeta\nq.delta=simulationDelta\nq.epsilon is set (once) so that P=thresholdProportionCorrect when tTest-tActual=0. \nq.gamma=probability of blindly guessing the correct answer\ntTest is the stimulus intensity level (usually log10 of physical parameter).\ntActual=log10(simulationThreshold) is the true threshold of the simulation\nrand(1) returns a random sample from the uniform distribution from 0 to 1.\nThe source code for our simulation model is here:\nhttps://github.com/EasyEyes/threshold/blob/a9ea5a6c64d3c5ff0aacfc01c86b6a5aecf64369/components/simulatedObserver.js",
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
      "soundGainDBSPL (default 125) is the assumed gain (dB SPL) at 1000 Hz from digital sound (inDb) to physical sound (outDbSpl),\noutDbSpl=inDb+soundGainDbSpl.\nThe level of a sound vector is 10*log(P) dB, where the power is P=mean(S^2), and S is the sound vector. The scientist will normally set calibrate1000HzDBSPLBool=TRUE to measure soundGainDBSPL on the participant's computer at several sound levels at 1000 Hz, and calibrateAllHzDBSPLBool=TRUE for the other frequencies. If calibrate1000HzDBSPLBool=FALSE then EasyEyes uses soundGainDBSPL as the default. Running with calibrate1000HzDBSPLBool=TRUE calibrates at 1000 Hz and sets soundGainDBSPL to fit what was measured at 1000 Hz. Running calibrateAllHzDBSPLBool measures the impulse response, computes the inverse impulse response (over some range, perhaps 250 to 8000 Hz), normalizes filter amplitude to have unit gain at 1000 Hz, and installs that filter. Thus, in that case, soundGainDBSPL will be correct for all frequencies (over some range like 250 to 8000 Hz).",
    type: "numerical",
    default: "125",
    categories: "",
  },
  {
    name: "soundGainTWR",
    availability: "now",
    example: "",
    explanation:
      'soundGainTWR (default 100,10,100) is a comma-separated list of 3 numbers that is used with soundGainDBSPL to specifies the parameters of our model of dynamic range compression of sound in the iPhone microphone: T (in dB SPL), W (in dB), and R (dimensionless). Typically each number will have one digit after the decimal, e.g. "-100.1,-15.1,30.0".\nT is the "threshold" sound level (dB SPL) at the knee in the curve of outDbSPL vs inDb. The curve is straight at low and high sound levels (inDB+soundGainDbSpl<T-W/2 or inDb+soundGainDbSpl>T+W/2). Those lines would intersect at T, but the curve rounds the knee, as controlled by W.\nW is the "width" of the knee. The rounded knee extends from T-W/2 to T+W/2.\nR is the reciprocal of the slope of outDbSPL vs inDb at sound levels above T+W/2.\nIf calibrate1000HzDBSPLBool=FALSE then EasyEyes uses soundGainDBSPL and soundGainTWR as the defaults. Running with calibrate1000HzDBSPLBool=TRUE calibrates at 1000 Hz and sets soundGainDBSPL and soundGainTWR to fit what was measured at 1000 Hz. \nOur compression model (using T, W, and R) is Eq. 4 in Giannoulis et al. (2012).\nGiannoulis, Dimitrios, Michael Massberg, and Joshua D. Reiss (2012). Digital Dynamic Range Compressor Design –– A Tutorial and Analysis. Journal of Audio Engineering Society. Vol. 60, Issue 6, pp. 399–408.\nhttp://eecs.qmul.ac.uk/~josh/documents/2012/GiannoulisMassbergReiss-dynamicrangecompression-JAES2012.pdf',
    type: "text",
    default: "100,10,100",
    categories: "",
  },
  {
    name: "spacingDeg",
    availability: "now",
    example: "",
    explanation:
      "spacingDeg specifies the spacing, in degrees, center-to-center from target to a flanker. This input value is ignored when you use Quest to measure the spacing threshold. If spacingDirection is tangential then spacingDeg is spacing to either flanker, as the spacings are equal. If spacingDirection is radial then then spacingIsOuterBool (default FALSE) determines whether spacingDeg is the spacing from target to outer (or inner) flanker.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "spacingDirection",
    availability: "now",
    example: "radial",
    explanation:
      'spacingDirection. When eccentricity is nonzero then spacingDirection can be horizontal, vertical, horizontalAndVertical, radial, tangential, or radialAndTangential. When eccentricity is zero then spacingDirection can be horizontal, vertical, or horizontalAndVertical. The "...And..." options display four flankers, distributed around the target. It is an error to request radial or tangential  or radialAndTangential spacingDirection at eccentricity zero, because they are undefined there.',
    type: "categorical",
    default: "radial",
    categories:
      "horizontal, vertical, horizontalAndVertical, radial, tangential, radialAndTangential",
  },
  {
    name: "spacingIsOuterBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "spacingIsOuterBool. When spacingDirection is radial, there are two flankers, inner and outer. In general each has a different (center to center) spacing to the target. To replicate CriticalSpacing data, when thresholdPameter is spacing, spacingSymmetry is cortex, and spacingRelationToSize is ratio or typographic, spacingIsOuterBool (default FALSE) determines whether target size is based on inner (FALSE) or outer (TRUE) spacing. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "spacingOverSizeRatio",
    availability: "now",
    example: "1.4",
    explanation:
      "⭑ spacingOverSizeRatio specifies the ratio of spacing (in deg, center of target to center of inner flanker) to size (in deg, can be width or height as specified by targetSizeIsHeightBool). Ignored unless spacingRelationToSize is ratio. In that case, target size is spacing/spacingOverSizeRatio.",
    type: "numerical",
    default: "1.4",
    categories: "",
  },
  {
    name: "spacingRelationToSize",
    availability: "now",
    example: "ratio",
    explanation:
      '⭑ spacingRelationToSize can be none, ratio, or typographic. When thresholdParameter is "spacing", spacingRelationToSize specifies how target size depend on center-to-center target-flanker spacing. And when thresholdParameter is "size", spacingRelationToSize specifies how spacing depend on size.\n• none means no dependence. Size and spacing are set independently. \n• ratio means accept the thresholdParameter (which is either size or spacing) and adjust the other parameter to satisfy the specified spacingOverSizeRatio. There are two flankers, inner and outer. In general each has a different (center to center) spacing to the target. "ratio" refers to the ratio of spacing to target size. Set spacingIsOuterBool to choose whether size scales with inner  (FALSE) or outer (TRUE) spacing.\n• typographic prints the triplet (flanker, target, flanker) as a (horizontal) string (horizontally) centered on the specified target eccentricity. By "horizontal" and "vertical", we just mean the orientation of the baseline, and orthogonal to it. ("Vertically," the fontCharacterSet bounding box is centered on the eccentric location, and all letters in the string are on same baseline.) If thresholdParameter is "spacing" then the font size of string is adjusted so that the width of the string is 3× specified spacing. Works with both left-to-right and right-to-left fonts. [If thresholdParameter is "size" then EasyEyes adjusts the font size of the string to achieve the specified target size.] ',
    type: "categorical",
    default: "ratio",
    categories: "none, ratio, typographic",
  },
  {
    name: "spacingSymmetry",
    availability: "now",
    example: "screen",
    explanation:
      '⭑ spacingSymmetry can be screen, retina, or cortex. This is ignored unless radial eccentrity is nonzero and spacingDirection is radial, which means that the target lies between two flankers, all on a radial line. The "inner" flanker is closer to fixation than the target. The "outer" flanker is farther than the target. We refer to the center-to-center spacing from target to inner and outer flankers as the inner and outer spacings. Parameter spacingDeg specifies the outer spacing. spacingSymmetry affects only the inner spacing, which is calculated to make the two flanker spacings symmetric in one of three ways: at the screen (i.e. equal in pixels), at the retina (i.e. equal in deg), or at the cortex, i.e.  log(outer+eccDeg + 0.15)-log(eccDeg + 0.15)=log(eccDeg + 0.15)-log(eccDeg-inner + 0.15), where eccDeg is the target\'s radial eccentricity in deg. To check the spacing symmetry, you may want to show a corresponding grid by setting parameter showGrid to px or cm (for screen), deg (for retina), and mm (for cortex).',
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
      'MANY PARTICIPANTS REPORT LIKING THIS. Intended for long blocks, over 50 trials. Participants seem to spontaneously pause betwen blocks to catch their breath and blink their eyes, but they don\'t do that within a long block, and they may complain that they feel stressed and that their eyes sting (because they didn\'t blink during the block), so we added this feature to force a break every so often. takeABreakTrialCredit sets the value that accrues from performing each trial of this condition. Set it to zero for no breaks. The block\'s running total, regardless of condition, is kept in the internal parameter takeABreakCredit, which is zero at the beginning of each block. When takeABreakCredit exceeds 1, EasyEyes immediately subtracts 1 and takes a break. \nTHE BREAK\nEasyEyes displays a pop-up window with a dark surround, "Good work! Please take a brief break to relax and blink." Responses (except ESCAPE) and viewing-distance nudging are suspended for the time specified by takeABreakMinimumDurationSec. Then EasyEyes reenables responses, adds a Proceed button, and adds text, "To continue hit Proceed or RETURN." The participant can take as long as they need. When they hit Proceed (or RETURN), EasyEyes closes the pop up window, reenables the nudger (if it was formerly active), and resumes testing. ',
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
    availability: "now",
    example: "",
    explanation:
      "targetContrast (default 1) is the desired luminance contrast of the target. For letters we use Weber contrast, \nc=(LLetter-LBackground)/LBackground. \nA white letter has contrast +1; a black letter has contrast -1.\nFor gabors, we use Michelson contrast, \nc=(LMax-LMin)/(LMax+LMin).\nFor scientist-supplied images, the image is presented faithfully when targetContrast is 1, and scaled in contrast proportionally when targetContrast is not 1.\nNOTE: Until we shift to using HDR movies, contrast is only accurate for values of -1, 0, and 1.",
    type: "numerical",
    default: "-1",
    categories: "",
  },
  {
    name: "targetCyclePerDeg",
    availability: "now",
    example: "",
    explanation:
      "targetCyclePerDeg (default 0) is the target spatial frequency in cycles per deg. Sine of zero is zero and cosine of zero is 1, so if you're using zero targetCyclePerDeg to get a Gaussian blob, then set targetPhaseDeg to 90.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetDelaySec",
    availability: "now",
    example: "",
    explanation:
      "targetDelaySec (default 0) delays presentation of the target in a movie. By default, time is zero at the middle of the movie. EasyEyes will subtract targetDelaySec from that default to produce the time coordinate used to compute the target (and envelope). This is unlike targetPhaseTemporalDeg which affects only the target, not the envelope.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetDurationSec",
    availability: "now",
    example: "0.15",
    explanation:
      "⭑ targetDurationSec (default 0.15) is the duration of target presentation. For demos and debugging, it is handy to set responseAllowedEarlyBool to TRUE with a long targetDurationSec (e.g. 999) so that the stimulus stays up while you examine it, yet you can quickly click through several stimuli to see the progression. Set responseAllowedEarlyBool to FALSE if you want to allow response only after target offset.",
    type: "numerical",
    default: "0.15",
    categories: "",
  },
  {
    name: "targetEccentricityXDeg",
    availability: "now",
    example: "10",
    explanation:
      "⭑ targetEccentricityXDeg (default 0) is the x location of the target center, relative to fixation. The target center is defined as the center of the bounding box for the letters in the fontCharacterSet. (See targetBoundingBoxHorizontalAlignment.)",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetEccentricityYDeg",
    availability: "now",
    example: "0",
    explanation:
      "⭑ targetEccentricityYDeg (default 0) is the y location of the target center, relative to fixation.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetHz",
    availability: "now",
    example: "",
    explanation:
      "targetHz (default 0) is the target temporal frequency in Hz. Not to be confused with the movie's frame rate, movieHz, which is independent.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetImageFolder",
    availability: "now",
    example: "faces",
    explanation:
      "🕑 targetImageFolder (empty default) names a folder of images (each file must have extension APNG, AVIF, GIF, JPEG, JPG, JP2, PNG, SVG, or WebP) that may be used when targetKind==image. (JPG is just an abbreviation of the JPEG extension; JP2 indicates JPEG 2000.) On each trial, the target image is sampled randomly, without replacement, from the images in the image folder. (\"Without replacement\" considers all the trials of this condition of this block. Other conditions and blocks are independent.) The folder is submitted as a zip archive to the EasyEyes drop box, and saved in the EasyEyesResources repository of the scientist's Pavlovia account. To be clear: The scientist creates a suitably named folder full of images, and zips that; the zip archive inherits the name of the folder. Each file in the folder must have one of the allowed image-file extensions. Different files can have different extensions. No subfolders are allowed. An experiment uses the folder by setting targetImageFolder to the name of the zip archive, without the extension.\n\nEach image with embedded icc color profile will be color managed. 10-bit rendering and HDR are automatic, but require use of 16-bit png or jpeg2000. Parameters allow the scientist to specify eccentricity, size, and duration. When the images have diverse size the scientist can instead specify image pixels per degree. \nCOLOR MANAGEMENT. The browser's color-managed rendering will take into account the ICC color profiles of the image and display. For accurate image rendering, each image should have an embedded ICC color profile. (The informal convention of assuming an sRGB profile when none is embedded seems too unreliable, across browsers, for research-grade stimuli.) \n\nHDR. A large proportion of computer displays produced in recent years support 10 bits per color channel, and most browsers now use the 10 bits when displaying HDR (High dynamic range) images using the HTML <img> tag. Several Netflix engineers studied how to achieve 10-bit display on current browsers using available image formats. \nhttps://netflixtechblog.com/enhancing-the-netflix-ui-experience-with-hdr-1e7506ad3e8\nThey recommend using 16-bit PNG or JPEG 2000. 16-bit PNG is supported by the several browsers we tested. As of September 2022, Safari was the only browser supporting JPEG 2000.\nhttps://caniuse.com/jpeg2000\nSurprisingly, another web page claims that JPEG2000 is also supported by Chrome and Firefox.\nhttps://fileinfo.com/extension/jp2\n\n[FUTURE: Instead of the zip archive, we could also allow our submit box to accept a folder, which it copies, including all the directly enclosed files.]",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "targetKind",
    availability: "now",
    example: "letter",
    explanation:
      '⭑ targetKind (default letter) specifies the kind of target.\n• letter On each trial, the target is a randomly selected character from the fontCharacterSet displayed in the specified font.\n• repeatedLetter. Display many copies of two targets, alternating across the screen. The observer reports both. Thus each presentation gets two responses, which count as two trials. The two target letters alternate for as many lines as fit on the screen and within targetRepeatedMaxLines. The last character at both ends of each line is targetRepeatsBorderCharacter. Neighboring lines are complementary so that the nearest letter from one line to a neighboring line is the other target.  David Regan and colleagues (1992) reported that in testing foveal acuity of patients with poor fixation (e.g. nystagmus) it helps to have a "repeat-letter format" eye chart covered with letters of the same size, so that no matter where the eye lands, performance is determined by the letter nearest to the point of fixation, where acuity is best. We here extend that idea to crowding. We cover some part of the screen with an alternating pattern of two letters, like a checkerboard, so that the letters can crowd each other, and ask the observer to report both letters. Again, we expect performance to be determined by the letters nearest to the (unpredictable) point of fixation, where crowding distance is least. HORIZONTALLY, the two targets alternate, forming a line, and size and spacing are specified in the usual way. VERTICALLY. If there is more than one line, then the line spacing (baseline to baseline) is the product of spacingOverSizeRatio and the height of the bounding box of fontCharacterSet.\nIMPORTANT: As of February, 2021, we need to set fontPadding=4 (very high) in order to avoid clipping of the letters when we use the Pelli font. Such a high padding may cause errors in target latency and duration. EasyEyes reports targetMeasuredLatenessSec and targetMeasuredDurationSec in the CSV file. Such errors typically matter only when targetDurationSec is a fraction of a second.\n• gabor A gabor is the product of a Gaussian and a sinewave. As a function of space, the sinewave produces a grating, and the Gaussain vignettes it to a specific area, without introducing edges. Gabors are a popular stimulus in vision research because they have compact frequency and location.\n• image An image is randomly drawn, without replacement (for this condition in this block) from a folder whose name is specified by targetImageFolder. The image is displayed at the target eccentricity with the target size. The image aspect ratio is preserved.\n• movie EasyEyes uses javascript movieComputeJS, provided by the scientist to compute an HDR movie, newly generated for each trial, and allows targetTask to be identify or detect.\n• reading Measure reading speed and retention. Uses specified font and writing direction (fontLeftToRightBool). readingXXX parameters specify corpus and starting point, control font size (usually via letter-to-letter spacing in deg), number of characters per line, and number of lines per page, and determine how many alternatives in each retention question and how many retention questions. The set of alternatives consists of a target word and foils that have approximately the same frequency in the corpus. IMPORTANT: conditionTrials is ignored when targetKind==reading. \n• rsvpReading Flashes several words with Quest-controlled word duration. The parameter responseSpokenToExperimenterBool determines whether the trial\'s scoring is "spoken" (for children) or "silent" (for adults). In "silent" scoring, the participant sees a horizontal row of lines, each representing a shown word. Below each line is a list of possible words, including the correct one. The participant must select a word in each column to continue. readingXXX parameters specify how many alternatives for each word and how many retention questions. The set of alternatives consists of a target word and foils that have approximately the same frequency in the corpus.  In "spoken" scoring we assume that an experimenter sits next to the child participant, who reads the presented words aloud. Once the child has read the words aloud, the experimenter presses the SHIFT key to see the actual words, to guide scoring of what the child said. For each word, the experimenter presses either the up arrow for correct or down arrow for wrong. Supports fontLeftToRightBool for, e.g., Arabic.\n• sound A sound is randomly drawn, without replacement (for this condition in this block) from a folder whose name is specified by targetSoundFolder. The target sound is played for its full duration at level targetSoundDBSPL with a masker sound randomly selected from the maskerSoundFolder played at level maskerDBSPL. Also, in the background, we play targetSoundNoise at level targetSoundNoiseDBSPL.\n• vocoderPhrase. The targetSoundFolder and maskerSoundFolder each contain a hierarchy of folders containing 16-channel sound files. Each sound file is named for a word and contains the original or processed sound of that word (except that the file called "GoTo.wav" in fact contains the two words "go to"). The top level of folders in targetSoundFolder and maskerSoundFolder are folders of sounds produced by several talkers. Currently the talkers (Talker11, Talker14, Talker16, and Talker18) are all female. On each trial the target and masker are randomly assigned different talkers (never equal). Within each talker\'s folder are several loose word files (Now.wav, GoTo.wav, and Ready.wav), and several category folders (CallSign, Color, Number) that each contain several word files. Each trial follows text phrases provided in the parameters targetSoundPhrase and maskerSoundPhrase. Each phrase consists of a series of explicit words and category names, with each category name preceded by #. Currently the targetSoundPhrase is "Ready Baron GoTo #Color #Number Now", and the maskerSoundPhrase is "Ready #CallSign GoTo #Color #Number Now". The target and masker phrases are played at the same time, aligning the temporal midpoint of both words in each target-masker pair by symmetrically padding both ends of the briefer word with zeroes to make it the same length as the longer word. Each explicit word in each script is played every time. On each trial, each word category, marked by #, is replaced by a randomly selected word from that category folder, except that target and masker are always different from each other when either is drawn from a category.  On each trial, the target and masker phrases are combined by randomly taking targetSoundChannels (default 9) of the 16 channels of every word in the target phrase, and the remaining 16-targetSoundChannels channels from the masker words. The channel selection is consistent for all the words in the phrase, and new for each trial. targetSoundDBSPL specifies the sound level of the combined targetSoundChannels channels taken from each target word. Similarly maskerSoundDBSPL specifies the sound level of the combined 16-targetSoundChannels channels taken from each masker word. Also, we play targetSoundNoise at level targetSoundNoiseDBSPL. The Zhang et al. (2021) paper mentions a noise control, in which the masker is white noise that has been filtered into 16 bands and windowed into word-length durations. The scientist achieves this simply by providing a maskerSoundFolder made up of these 16-channel noises, each derived from a word. \nRESPONSE. After playing the phrase, EasyEyes displays two columns, one for each category word in the targetSoundPhrase. The observer must select one word in each column in order to proceed to the next trial. (This is forced choice.) We score the trial as right only if both responses are right. That overall right/wrong response is provided to QUEST, which controls the targetSoundDBSPL.⭑ ',
    type: "categorical",
    default: "letter",
    categories:
      "letter, gabor, movie, sound, vocoderPhrase, reading, rsvpReading, repeatedLetters",
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
    name: "targetOrientationDeg",
    availability: "now",
    example: "",
    explanation:
      "targetOrientationDeg (default 0) is the orientation of the target, clockwise from vertical.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetPhaseSpatialDeg",
    availability: "now",
    example: "",
    explanation:
      "targetPhaseSpatialDeg (default 0) is the target spatial phase in degrees.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetPhaseTemporalDeg",
    availability: "now",
    example: "",
    explanation:
      "targetPhaseTemporalDeg (default 0) is the target temporal phase in degrees.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetRepeatsBool",
    availability: "now",
    example: "FALSE",
    explanation: "NOT IMPLEMENTED. USE targetKind=repeatedLetters instead. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "targetRepeatsBorderCharacter",
    availability: "now",
    example: "$",
    explanation:
      "When targetKind=repeatedLetters, then targetRepeatsBorderCharacter specifies the character to use to make the outer border. This character has letters on only one side, so it's less crowded. So we don't want to give the game away by putting a target letter here.",
    type: "text",
    default: "$",
    categories: "",
  },
  {
    name: "targetRepeatsMaxLines",
    availability: "now",
    example: "3",
    explanation:
      "targetRepeatsMaxLines (default 3) can be 1, 3, 4, 5, … . This is relevant only when targetKind=repeatedLetters. targetRepeatsMaxLines specifies the desired number of lines, but fewer lines may be displayed if limited by screen height. We recommend 1 and 3. Small children are alarmed by the repeatedLetters display if there are many lines, and this alarm is minimized by using no more than 3 lines. If there is more than one line, then the line spacing (baseline to baseline) is the product of spacingOverSizeRatio and the height of the bounding box of fontCharacterSet. The programmer reports that the two-line display produced by targetRepeatsMaxLines=2 is wrong, but we don't expect to ever use that case, so we moved on to more pressing issues. Please let us know if you need the 2-line case.",
    type: "numerical",
    default: "3",
    categories: "",
  },
  {
    name: "targetSafetyMarginSec",
    availability: "now",
    example: "0.5",
    explanation:
      "IMPORTANT: At the moment, only the OFFSET portion of this parameter is implemented. IMPORTANT: Currently targetSafetyMarginSec only affects the after-target delay, from target offset to response screen onset. The participant cannot respond during that delay. targetSafetyMarginSec has no effect on the before-target delay. Use markingOffsetBeforeTargetOnsetSecs to control the delay between clicking the crosshair and display of the target.\n****************************\nEasyEyes guarantees a blank time of targetSafetyMarginSec before and after the target presentation to minimize forward and backward masking of the target by instructions and other non-stimulus elements, including the characterSet and nudger. \n     OFFSET: After target offset, EasyEyes waits targetSafetyMarginSec before presenting instructions and the characterSet. (Nudging isn't allowed until after the participant responds.)\n\n🕑\n     ONSET: Since target onset is almost immediately after trial initiation, initiation of a trial is disabled until targetSafetyMarginSec has passed since the nudger and instructions were erased. \n     Instruction contrast c will be determined by the ratio r of cursor-to-crosshair distance to characterSet-to-crosshar distance. \n          c=max(0, 2r-1). \nThus, as the cursor moves from the response characterSet to the crosshair, the instruction contrast will initally be 1 when the cursor is at the characterSet (r=1), will linearly fall to reach zero halfway to the crosshair (r=0.5), and remain at zero the rest of the way to the crosshair (r=0). ",
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
      'targetSizeIsHeightBool (default FALSE) defines "size" as height (TRUE) or width (FALSE). This parameter is ignored when setting size by spacing.',
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
      'If targetKind is "sound", targetSoundDBSPL specifies desired target sound level in dB SPL. However, to avoid clipping of the waveform, EasyEyes imposes a maximum on this level to prevent the digital sound waveform from exceeding the range ±1. ',
    type: "numerical",
    default: "20",
    categories: "",
  },
  {
    name: "targetSoundFolder",
    availability: "now",
    example: "sounds",
    explanation:
      "⭑ The name of a zip archive of sound files (each file can be in WAV or AAC format), to be used when targetKind==sound. The zip archive is submitted to the EasyEyes drop box, and saved in the Pavlovia account in the Folders folder. The name of the zip archive, without the extension, must match the value of targetSoundFolder. [FUTURE: We could also allow our submit box to accept a folder, which it copies, including all the directly enclosed files.]\n    For speech in noise (targetKind - sound and targetTask- identify) and tone in melody (targetKind- sound and targetTask- detect) experiments, the sound files must be directly inside the zip files and not in another folder within the zip files. Please refer to the example files.\n    Both WAV and AAC sound files can include multiple channels. Because of browser limitations, EasyEyes can use only up to 8 channels per file. AAC files are much more compact (about 10% the bytes as WAV, depending on data rate) but lossy. AAC files are as compact as MP3 files, with much better sound quality. We suggest starting with WAV, and switching to AAC only if you experience an undesirably long delay in loading your sounds. Switching to AAC will reduce your loading time ten-fold (or more, depending on data rate), but may reduce the sound quality slightly.",
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
      'targetSoundPhrase (default empty string) is a text phrase that is used when targetKind is 16ChannelSound. The phrase consists of a series of words and category names, with each category name preceded by #. Currently the targetSoundPhrase is "Ready Baron GoTo #Color #Number Now". Every word must appear as a sound file with that name, and every category must appear as a folder with that name, both in the current talker folder in the targetSoundFolder.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "targetSpaceConstantDeg",
    availability: "now",
    example: "",
    explanation:
      "targetSpaceConstantDeg (default practially infinite) is the 1/e radius of the Gaussian envelope in deg.",
    type: "numerical",
    default: "1.00E+10",
    categories: "",
  },
  {
    name: "targetTask",
    availability: "now",
    example: "identify",
    explanation:
      '⭑ Can be one or more of the following categories, separated by commas,\n• identify is forced-choice categorization of the target among known possibilities, e.g. a letter from a characterSet or an orientation among several. \n• questionAndAnswer The participant is asked a question, using a questionAndAnswerXXX parameter.\n• detect In yes-no detection, we simply ask "Did you see the target?". In two-alternative forced choice detection, we might display two intervals, only one of which contained the target, and ask the observer which interval had the target: 1 or 2? We rarely use detection because it needs many more trials to measure a threshold because its guessing rate is 50%, whereas identifying one of N targets has a guessing rate of only 1/N.\n🕑 \n• rate. The participant is invited to rate on a scale of 1 to 7. The targetKind can be reading, image, or sound.',
    type: "categorical",
    default: "identify",
    categories: "identify, detect, questionAndAnswer",
  },
  {
    name: "targetTimeConstantSec",
    availability: "now",
    example: "",
    explanation:
      "targetTimeConstantSec (default practically infinite) is the time for the temporal Gaussian envelope modulating target contrast to drop from 1 to 1/e.",
    type: "numerical",
    default: "1.00E+10",
    categories: "",
  },
  {
    name: "targetWhenSec",
    availability: "now",
    example: "0",
    explanation:
      "🕑 targetWhenSec (default 0) indicates when the middle time of the target occurs relative to the middle of the movie.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "thresholdAllowedDurationRatio",
    availability: "now",
    example: "1.5",
    explanation:
      "thresholdAllowedDurationRatio. QUEST receives the trial's response only if measured duration is in the range [targetDurationSec/r targetDurationSec*r], where r=thresholdAllowedDurationRatio. r must be greater than 1. Bad durations are common on slow computers. Using _compatibleProcessorCoresMinimum to require at least 6 cores has more or less eliminated the bad durations. (Also see conditionTrials.)",
    type: "numerical",
    default: "1.5",
    categories: "",
  },
  {
    name: "thresholdAllowedGazeRErrorDeg",
    availability: "now",
    example: "4",
    explanation:
      "thresholdAllowedGazeRErrorDeg. QUEST receives the trial's response only if the measured gaze position during target presentation has a radial eccentricity in deg less than or equal to thresholdAllowedGazeRErrorDeg. (Also see conditionTrials.)",
    type: "numerical",
    default: "1.00E+10",
    categories: "",
  },
  {
    name: "thresholdAllowedGazeXErrorDeg",
    availability: "now",
    example: "4",
    explanation:
      "thresholdAllowedGazeXErrorDeg. QUEST receives the trial's response only if the measured gaze position during target presentation has an xDeg eccentricity whose absolute value is less than or equal to thresholdAllowedGazeXErrorDeg. (Also see conditionTrials.)",
    type: "numerical",
    default: "1.00E+10",
    categories: "",
  },
  {
    name: "thresholdAllowedGazeYErrorDeg",
    availability: "now",
    example: "4",
    explanation:
      "thresholdAllowedGazeYErrorDeg. QUEST receives the trial's response only if the measured gaze position during target presentation has a Y eccentricity whose absolute value is less than or equal to  thresholdAllowedGazeYErrorDeg. (Also see conditionTrials.)",
    type: "numerical",
    default: "1.00E+10",
    categories: "",
  },
  {
    name: "thresholdAllowedLatenessSec",
    availability: "now",
    example: "",
    explanation:
      "thresholdAllowedLatenessSec. QUEST receives the trial's response only if measured target lateness (relative to requested latency) is less than or equal to thresholdAllowedLatenessSec. Excess lateness is common on slow computers. Using _compatibleProcessorCoresMinimum to require at least 6 cores has more or less eliminated excessive lateness.  (Also see conditionTrials.)",
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
      "thresholdDelta (default 0.01) is the probability of a wrong answer when way above threshold. QUEST sets the asymptote of the Weibull psychometric function to 1-thresholdDelta.",
    type: "numerical",
    default: "0.01",
    categories: "",
  },
  {
    name: "thresholdGamma",
    availability: "now",
    example: "0.5",
    explanation:
      "thresholdGamma (default is empty which is filled in at runtime as explained below) is a parameter of the psychometric function used by QUEST. thresholdGamma is the probability of correct or yes response when the target is at zero strength. In an identification task with n equally-probable possibilities, one should set gamma to 1/n. Currently thresholdGamma defaults to 0.5 (which is appropriate for two-alternative forced choice), unless targetKind=letter.  In that case, if all the letters are unique, then n=length(fontCharacterSet), and the default value for thresholdGamma is 1/n. The various targetTasks and targetKinds should each have different default values of gamma, but currently thresholdGamma always default to 0.5 unless targetKind=letter. If you leave thresholdGamma empty then you'll get the default. If you set thresholdGamma to a numerical probability then that number will overrule the default. NOTE: You are allowed to have repeated letters in fontCharacterSet to give the letters unequal frequency. In that case, the default value of thresholdGamma is set to the probability of the most common letter being the right letter. For example, if fontCharacterSet='AAB', then the default value of thresholdGamma is 2/3.",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "thresholdGuess",
    availability: "now",
    example: "1",
    explanation:
      "⭑ thresholdGuess is your best guess for threshold, in linear units. (Unlike thresholdGuessLogSd, which is logarithmic.) Used to prime QUEST by providing a prior PDF, which is specified as a Gaussian as a function of the log threshold parameter. Its mean is the log of your guess, and its SD (in log units) is specifed below. We typically take our guess from our standard formulas for size and spacing threshold as a function of eccentricity.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "thresholdGuessLogSd",
    availability: "now",
    example: "2",
    explanation:
      "thresholdGuessLogSd (default 2) specifies what standard deviation (in log units) you want Quest to assume for your threshold guess. Better to err on the high side, so you don't exclude actual cases. Used by QUEST. Sets the standard deviation of the prior PDF as a function of log of the threshold parameter.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "thresholdParameter",
    availability: "now",
    example: "spacing",
    explanation:
      '⭑ thresholdParameter (default is the empty string which means none) designates that a parameter (e.g. targetSizeDeg or spacingDeg) will be controlled by Quest to find the threshold at which criterion performance is attained.  NOTE: EasyEyes currently supports the short crossed-out nicknames (size, spacing, and soundLevel), but we will soon remove them to support full names instead, so that only an actual input parameter name (listed in the first column of this Glossary) is allowed as the values of thresholdParameter. \n• "spacing" or "spacingDeg" varies center-to-center spacing of target and neighboring flankers. \n• "size" or "targetSizeDeg" varies target size. \n• "targetDurationSec" varies target duration.\n• "targetContrast" awaits HDR10 support.\n•  Something like "eccentricity"  may be added in the future.\n• "soundLevel" or "targetSoundDBSPL" varies target sound level.\n• "targetSoundNoiseDBSPL" varies noise sound level. Not yet implemented.',
    type: "categorical",
    default: "spacing",
    categories:
      "spacing, spacingDeg, size, targetSizeDeg, targetDurationSec, targetContrast, soundLevel, targetSoundDBSPL, targetSoundNoiseDBSPL",
  },
  {
    name: "thresholdProcedure",
    availability: "now",
    example: "QUEST",
    explanation:
      'thresholdProcedure (default QUEST) can be QUEST or none. We may add Fechner\'s "method of constant stimuli". Note that when rendering we restrict the threshold parameter to values that can be rendered without artifact, i.e. not too small to have enough pixels to avoid jaggies and not too big for target (and flankers in spacing threshold) to fit entirely on screen. The response returned to QUEST is accompanied by the true value of the threshold parameter, regardless of what QUEST suggested.',
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
      '🕑 If true, and this condition\'s threshold is "bad" (see below), then the block will be run again (only once even if again bad). The criterion for "bad" is that QuestSD>0.25. Several conditions in a block may make this request and be bad, but we still repeat the block only once. When we add a block, we should adjust the trial/block counter to reflect the change. (The 0.25 criterion is right for 35 trials, beta=2.3, and many possible targets. Later i\'ll write a more general formula and provide a way for the scientist to specify an arbitrary criterion value of QuestSD.)',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "viewingDistanceAllowedRatio",
    availability: "now",
    example: "1.3",
    explanation:
      'viewingDistanceAllowedRatio (default 1.2) must be positive, and specifies a tolerance interval around the desired viewing distance D = viewingDistanceDesiredCm. If viewingDistanceAllowedRatio>1, then the allowed range of viewing distance is D/viewingDistanceAllowedRatio to D*viewingDistanceAllowedRatio. If it\'s <1 then the allowed range of viewing distance is D*viewingDistanceAllowedRatio to D/viewingDistanceAllowedRatio. Enforcement is only possible when viewing distance is tracked. In that case, testing is paused while viewing distance is outside the allowed range, and the participant is encouraged to move in or out, as appropriate, toward the desired viewing distance. We call that "nudging". A value of 0 allows all viewing distances. [CSV and Excel files do not allow Inf.]',
    type: "numerical",
    default: "1.2",
    categories: "",
  },
  {
    name: "viewingDistanceDesiredCm",
    availability: "now",
    example: "45",
    explanation:
      "⭑ If viewingDistanceDesiredCm is nonzero, then it specifies the desired viewing distance. The default is zero, which is ignored. If head tracking is enabled, then stimulus generation will be based on the actual viewing distance of each trial. Without head tracking, we estimate the viewing distance at the beginning of the experiment, and later again at the beginning of any new block with a different desired viewing distance. The EasyEyes compiler should require that all conditions within a block have the same desired viewing distance.\n     The output CSV data file reports viewingDistanceCm. If head tracking is enabled, then stimulus generation will be based on the actual viewing distance of each trial. Without head tracking, we estimate the viewing distance at the beginning of the experiment, and later again at the beginning of any new block with a different desired viewing distance. ",
    type: "numerical",
    default: "50",
    categories: "",
  },
  {
    name: "viewingDistanceNudgingBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ Setting viewingDistanceNudgingBool TRUE (deafult is FALSE) enables the nudger. The nudger compares measured viewing distance to desired viewing distance, and if the ratio exceeds the range allowed by viewingDistanceAllowedRatio then it puts up a display (covering the whole screen) telling the participant to MOVE CLOSER or FARTHER, as appropriate. The display goes away when the participant is again within the allowed range. The viewing-distance nudger (\"Closer!\", \"Farther!\") gets the participant to the right distance. \n     We protect the stimulus from nudging. The nudger will never occlude, or forward or backward mask, the stimulus. Think of the trial as beginning at the participant's click (or keypress) requesting the stimulus and ending at the click (or keypress) response. This leaves a pre-trial interval from the response until the click requesting the next trial. EasyEyes nudges only before and between trials. Furthermore, to prevent forward masking, EasyEyes ignores attempts to click (or key press) during nudging and until targetSafetyMarginSec after nudging. Accepted clicks (or keypresses) produce a click sound. Ignored attempts are silent.\n    For now, the trial software sets nudgingAllowedBool to TRUE only during the pre-trial, and sets nudgingCancelsTrialBool to always be FALSE. \n\n     FUTURE. To make sure that the stimulus is never obscured by nudging, we designate three intevals:\nPRE-TRIAL INTERVAL. From time of response to the previous trial (click or keypress) until the participant requests a new trial (space bar or click on crosshair) we allow nudging. \nSTIMULUS INTERVAL. From the participant's request for a new trial (space bar or click on crosshair) until the end of the stimulus, we protect the stimulus by suspending nudging. \nRESPONSE INTERVAL. From the end of the stimulus until the observer responds, we also suspend nudging, so the nudge won't interfere with remembering the target. \nIf we acquire the possibility of canceling a trial, then we could allow nudging during the stimulus interval, and immediately cancel that trial. Once a trial has been canceled we do NOT wait for a response. Instead, we proceed directly to draw the crosshair for the next trial. Canceling a trial is not trivial. We need to put this trial's condition back into the list of conditions to be run, and that list needs to be reshuffled, so the participant won't know what the next trial will be. I suppose that what happened will be obvious to the participant, so we don't need to explain that the trial was canceled. I see two stages of implementation. First the trial software needs to provide and update two flags: nudgingAllowedBool and nudgingCancelsTrialBool. The current version of MultistairHandler doesn't cope with trial cancelation. For now, the trial software sets nudgingAllowedBool to TRUE only during the pre-trial interval, and sets nudgingCancelsTrialBool to always be FALSE. Once we know how to cancel a trial, during the stimulus interval we'll set both nudgingAllowedBool and nudgingCancelsTrialBool to TRUE. \n",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "needSmartphoneBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 Needed at viewing distances beyond 60 cm. Could be a commercial wireless keyboard or an EasyEyes keypad emulator running on any smartphone. \nalerts EasyEyes that the experiment needs a wireless keyboard. (That's increasingly true at viewing distances beyond 60 cm.) The wireless device could be a commercial wireless keyboard or an EasyEyes keypad emulator running on any smartphone. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "wirelessKeyboardNeededBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "❌wirelessKeyboardNeededBool (default FALSE)=TRUE alerts EasyEyes that the experiment needs a wireless keyboard. (That's increasingly true at viewing distances beyond 60 cm.) The wireless device could be a commercial wireless keyboard or an EasyEyes keypad emulator running on any smartphone. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
];

export const SUPER_MATCHING_PARAMS: string[] = ["questionAndAnswer@@"];
