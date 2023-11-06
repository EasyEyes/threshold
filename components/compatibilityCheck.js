import { GLOSSARY } from "../parameters/glossary";
import { isProlificPreviewExperiment } from "./externalServices";
import { readi18nPhrases } from "./readPhrases";
import { ref, get, child } from "firebase/database";
import database, { db } from "./firebase/firebase.js";
import { doc, getDoc } from "firebase/firestore";
// import { microphoneInfo } from "./global";
// import { rc } from "./global";

const microphoneInfo = {
  micFullName: "",
  micFullSerialNumber: "",
  micrFullManufacturerName: "",
  phoneSurvey: {},
};

const getDeviceDetails = (platformName, lang) => {
  let OS = "";
  let preferredModelNumber = "";
  let findModel = "";
  switch (platformName) {
    case "iOS":
      OS = "IOS";
      break;
    case "macOS":
      OS = "macOS";
      break;
    case "win":
      OS = "Windows";
      break;
    case "Android":
      OS = "Android";
      break;
    case "cros":
      OS = "ChromeOS";
      break;
    case "Linux":
      OS = "Linux";
      break;
    case "openbsd":
      OS = "Open/FreeBSD";
      break;
    case "Fuchsia":
      OS = "Fuchsia";
      break;
    default:
      OS = "GenericOS";
      break;
  }
  if (OS.includes("Android")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberAndroid", lang);
    findModel = readi18nPhrases("RC_findModelAndroid", lang);
  } else if (OS.includes("Bada")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberBada", lang);
    findModel = readi18nPhrases("RC_findModelBada", lang);
  } else if (OS.includes("Blackberry")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberBlackberry", lang);
    findModel = readi18nPhrases("RC_findModelBlackberry", lang);
  } else if (OS.includes("Firefox")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberFirefox", lang);
    findModel = readi18nPhrases("RC_findModelFirefox", lang);
  } else if (OS.includes("IOS")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberIOs", lang);
    findModel = readi18nPhrases("RC_findModelIOs", lang);
  } else if (OS.includes("iPad")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberIPad", lang);
    findModel = readi18nPhrases("RC_findModelIPad", lang);
  } else if (OS.includes("Linux")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberLinux", lang);
    findModel = readi18nPhrases("RC_findModelLinux", lang);
  } else if (OS.includes("macOS")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberMacOS", lang);
    findModel = readi18nPhrases("RC_findModelMacOs", lang);
  } else if (OS.includes("Maemo")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberMaemo", lang);
    findModel = readi18nPhrases("RC_findModelMaemo", lang);
  } else if (OS.includes("Palm")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberPalm", lang);
    findModel = readi18nPhrases("RC_findModelPalm", lang);
  } else if (OS.includes("WebOS")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberWebOS", lang);
    findModel = readi18nPhrases("RC_findModelWebOS", lang);
  } else if (OS.includes("Windows")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberWindows", lang);
    findModel = readi18nPhrases("RC_findModelWindows", lang);
  } else {
    preferredModelNumber = readi18nPhrases("RC_modelNumber", lang);
    findModel = readi18nPhrases("RC_findModeGeneric", lang);
  }

  return { preferredModelNumber, findModel };
};

const getInstructionText = (
  thisDevice,
  language,
  isSmartPhone,
  isLoudspeakerCalibration,
  preferredModelNumberText = "model number",
  needPhoneSurvey = false
) => {
  const needModelNumber = isSmartPhone
    ? needPhoneSurvey
      ? readi18nPhrases("RC_surveyPhoneModel", language)
          .replace("ooo", thisDevice.PlatformName)
          .replace("OOO", thisDevice.PlatformName)
          .replace("mmm", preferredModelNumberText.toLocaleLowerCase())
          .replace("MMM", preferredModelNumberText)
      : readi18nPhrases("RC_needPhoneModel", language)
    : readi18nPhrases("RC_needModelNumberAndName", language);
  console.log("needModelNumber", needModelNumber);
  const preferredModelNumber = preferredModelNumberText;
  const needModelNumberFinal = needModelNumber
    .replace("mmm", preferredModelNumber)
    .replace("MMM", preferredModelNumber)
    .replace("xxx", thisDevice.OEM === "Unknown" ? "unknown" : thisDevice.OEM)
    .replace("XXX", thisDevice.OEM === "Unknown" ? "Unknown" : thisDevice.OEM)
    .replace(
      "yyy",
      thisDevice.DeviceType === "Unknown" ? "device" : thisDevice.DeviceType
    )
    .replace(
      "YYY",
      thisDevice.DeviceType === "Unknown" ? "Device" : thisDevice.DeviceType
    );
  const userOS = thisDevice.PlatformName;
  var findModelNumber = "";
  if (userOS === "Android") {
    findModelNumber = readi18nPhrases("RC_findModelAndroid", language);
  } else if (userOS === "iOS") {
    findModelNumber = readi18nPhrases("RC_findModelIOs", language);
  } else if (userOS === "Windows") {
    findModelNumber = readi18nPhrases("RC_findModelWindows", language);
  } else if (userOS === "macOS") {
    findModelNumber = readi18nPhrases("RC_findModelMacOs", language);
  } else if (userOS === "Linux") {
    findModelNumber = readi18nPhrases("RC_findModelLinux", language);
  } else {
    findModelNumber = readi18nPhrases("RC_findModeGeneric", language);
  }

  return `${needModelNumberFinal} ${findModelNumber}`;
};

export const doesMicrophoneExistInFirestore = async (speakerID, OEM) => {
  const docRef = doc(db, "Microphone", OEM, speakerID, "default");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    console.log("Existsss");
    return true;
  }
  console.log("Does not exist");
  return false;
};
const doesMicrophoneExist = async (speakerID, oem) => {
  const dbRef = ref(database);
  const snapshot = await get(child(dbRef, `Microphone2/${oem}/${speakerID}`));
  if (snapshot.exists()) {
    return true;
  }
  return false;
};

export const checkSystemCompatibility = (
  reader,
  lang,
  rc,
  useEnglishNamesForLanguage = true
) => {
  // handle language
  handleLanguage(lang, rc, useEnglishNamesForLanguage);

  var Language = rc.language.value;

  const requirements = getCompatibilityRequirements(
    reader,
    Language,
    false,
    rc
  );
  const compatibilityRequirements = requirements.compatibilityRequirements;
  var deviceIsCompatibleBool = requirements.deviceIsCompatibleBool;
  var msg = requirements.describeDevice;

  // add screen size to compatibility test
  // Get screenWidthPx and screenHeightPx of the participant's screen
  const screenWidthPx = window.screen.width;
  const screenHeightPx = window.screen.height;
  const minScreenWidthPx = [];
  const minScreenHeightPx = [];
  // read blocks
  const nBlocks = Math.max(...reader.read("block", "__ALL_BLOCKS__"));

  const disabledBlocks = [];
  const disabledConditions = [];
  for (let i = 1; i <= nBlocks; i++) {
    const conditionEnabled = reader.read("conditionEnabledBool", i);
    const blockEnabledBool = conditionEnabled.includes(true);
    if (!blockEnabledBool) {
      disabledBlocks.push(i);
    }

    for (let j = 1; j <= conditionEnabled.length; j++) {
      if (!conditionEnabled[j - 1]) {
        disabledConditions.push(i + "_" + j);
      }
    }
  }

  for (let i = 1; i <= nBlocks; i++) {
    const conditionEnabled = reader.read("conditionEnabledBool", i);
    const blockEnabledBool = conditionEnabled.includes(true);
    if (!blockEnabledBool) {
      continue;
    }
    // compute across all conditions
    const needTargetSizeDownToDegAll = reader.read(
      "needTargetSizeDownToDeg",
      i
    );
    const minScreenWidthDegAll = reader.read("needScreenWidthUpToDeg", i);
    const minScreenHeightDegAll = reader.read("needScreenHeightUpToDeg", i);

    // remove disabled blocks
    const needTargetSizeDownToDeg = needTargetSizeDownToDegAll.filter(
      (item, index) => !disabledConditions.includes(i + "_" + (index + 1))
    );
    const minScreenWidthDeg = Math.max(
      ...minScreenWidthDegAll.filter(
        (item, index) => !disabledConditions.includes(i + "_" + (index + 1))
      )
    );
    const minScreenHeightDeg = Math.max(
      ...minScreenHeightDegAll.filter(
        (item, index) => !disabledConditions.includes(i + "_" + (index + 1))
      )
    );

    const nConditions = needTargetSizeDownToDeg.length;
    const minSizeDeg = Math.min(...needTargetSizeDownToDeg);

    const widthPx = [];
    const heightPx = [];
    for (let j = 1; j <= nConditions; j++) {
      const targetMinPx = reader.read("targetMinimumPix", i + "_" + j);
      const widthFactor =
        Math.tan((0.5 * minScreenWidthDeg * Math.PI) / 180) /
        Math.tan((0.5 * minSizeDeg * Math.PI) / 180);
      const heightFactor =
        Math.tan((0.5 * minScreenHeightDeg * Math.PI) / 180) /
        Math.tan((0.5 * minSizeDeg * Math.PI) / 180);
      widthPx.push(targetMinPx * widthFactor);
      heightPx.push(targetMinPx * heightFactor);
    }

    minScreenWidthPx.push(Math.max(...widthPx));
    minScreenHeightPx.push(Math.max(...heightPx));
  }

  const minWidthPx = Math.ceil(Math.max(...minScreenWidthPx));
  const minHeightPx = Math.ceil(Math.max(...minScreenHeightPx));

  // require minimum screen width, or height, or both, and say so
  const screenSizeMsg = [];
  let promptRefresh = false;
  if (minWidthPx > 0 && minHeightPx > 0) {
    // non-zero minimum width and height
    // Internation phrase EE_compatibileScreenSize - replace 111 with minWidthPx and 222 with minHeightPx
    const ssMsg = readi18nPhrases("EE_compatibleScreenSize", Language)
      .replace(/111/g, minWidthPx.toString())
      .replace(/222/g, minHeightPx.toString());
    screenSizeMsg.push(ssMsg + ".");
    const screenSizeCompatible =
      screenWidthPx >= minWidthPx && screenHeightPx >= minHeightPx;

    if (deviceIsCompatibleBool && !screenSizeCompatible) {
      promptRefresh = true;
    }

    deviceIsCompatibleBool = deviceIsCompatibleBool && screenSizeCompatible;
  } else if (minWidthPx > 0) {
    // non-zero minimum width
    // Internation phrase EE_compatibileScreenWidth - replace 111 with minWidthPx
    const ssMsg = readi18nPhrases("EE_compatibleScreenWidth", Language).replace(
      /111/g,
      minWidthPx.toString()
    );
    screenSizeMsg.push(ssMsg + ".\n\n");

    const screenSizeCompatible = screenWidthPx >= minWidthPx;
    if (deviceIsCompatibleBool && !screenSizeCompatible) {
      promptRefresh = true;
    }

    deviceIsCompatibleBool = deviceIsCompatibleBool && screenSizeCompatible;
  } else if (minHeightPx > 0) {
    // non-zero minimum height
    // Internation phrase EE_compatibileScreenHeight - replace 111 with minHeightPx
    const ssMsg = readi18nPhrases(
      "EE_compatibleScreenHeight",
      Language
    ).replace(/111/g, minHeightPx.toString());
    screenSizeMsg.push(ssMsg + ".\n\n");
    const screenSizeCompatible = screenHeightPx >= minHeightPx;
    if (deviceIsCompatibleBool && !screenSizeCompatible) {
      promptRefresh = true;
    }

    deviceIsCompatibleBool = deviceIsCompatibleBool && screenSizeCompatible;
  } else {
    // terminate the last sentence in compatibilityRequirements array with a period
    if (compatibilityRequirements.length > 0)
      compatibilityRequirements[compatibilityRequirements.length - 1] +=
        ".\n\n";
  }

  const describeScreenSize = readi18nPhrases("EE_describeScreenSize", Language)
    .replace(/111/g, screenWidthPx.toString())
    .replace(/222/g, screenHeightPx.toString());
  msg += describeScreenSize;
  const describeDevice = msg;
  compatibilityRequirements.push(...screenSizeMsg);

  //create our message
  if (deviceIsCompatibleBool)
    msg = [readi18nPhrases("EE_compatible", Language)];
  else
    msg = [
      readi18nPhrases("EE_incompatible", Language),
      compatibilityRequirements,
    ];

  msg.push(describeDevice);

  if (deviceIsCompatibleBool && isProlificPreviewExperiment())
    msg.push(readi18nPhrases("EE_incompatibleReturnToProlific", Language));

  //  if the study is compatible except for screen size, prompt to refresh
  if (promptRefresh) {
    msg.push(
      readi18nPhrases("EE_compatibleExceptForScreenResolution", Language)
        .replace(/111/g, screenWidthPx.toString())
        .replace(/222/g, screenHeightPx.toString())
        .replace(/333/g, minWidthPx.toString())
        .replace(/444/g, minHeightPx.toString())
    );
  }

  msg.push(`\n Study URL: ${window.location.toString()} \n`);
  return {
    msg: msg,
    proceed: deviceIsCompatibleBool,
    promptRefresh: promptRefresh,
  };
};

export const getCompatibilityRequirements = (
  reader = null,
  Language,
  isForScientistPage,
  rc = null,
  parsed
) => {
  //  If isForScientistPage is true, then the returned data will include deviceIsCompatibleBool.
  //  If isForScientistPage is false, then the returned data will not include deviceIsCompatibleBool - only the compatibility requirements as an array of strings (used in scientist page) - no rc is needed in this case.

  //values from the experiment table
  var compatibleBrowser,
    compatibleBrowserVersionMinimum,
    compatibleDevice,
    compatibleOS,
    compatibleProcessorCoresMinimum;

  const deviceInfo = {};
  // if isForScientistPage is false, then we don't need to get the device info
  if (!isForScientistPage) {
    deviceInfo["deviceBrowser"] = rc.browser.value;
    deviceInfo["deviceBrowserVersion"] = rc.browserVersion.value;
    deviceInfo["deviceType"] = rc.deviceType.value;
    deviceInfo["deviceSysFamily"] = rc.systemFamily.value;
    deviceInfo["hardwareConcurrency"] = rc.concurrency.value;
    deviceInfo["computeRandomMHz"] = rc.computeRandomMHz
      ? rc.computeRandomMHz.value
      : 0;

    compatibleBrowser = reader.read("_needBrowser")[0].split(",");
    compatibleBrowserVersionMinimum = reader.read(
      "_needBrowserVersionMinimum"
    )[0];
    compatibleDevice = reader.read("_needDeviceType")[0].split(",");
    compatibleOS = reader.read("_needOperatingSystem")[0].split(",");
    compatibleProcessorCoresMinimum = reader.read(
      "_needProcessorCoresMinimum"
    )[0];
  } else {
    // default values
    // will be ignored in the return value
    deviceInfo["deviceBrowser"] = "";
    deviceInfo["deviceBrowserVersion"] = "";
    deviceInfo["deviceType"] = "";
    deviceInfo["deviceSysFamily"] = "";
    deviceInfo["hardwareConcurrency"] = 0;
    deviceInfo["computeRandomMHz"] = 0;

    const compatibilityInfo = parsed;
    compatibleBrowser = compatibilityInfo.compatibleBrowser;
    compatibleBrowserVersionMinimum =
      compatibilityInfo.compatibleBrowserVersionMinimum;
    compatibleDevice = compatibilityInfo.compatibleDevice;
    compatibleOS = compatibilityInfo.compatibleOS;
    compatibleProcessorCoresMinimum =
      compatibilityInfo.compatibleProcessorCoresMinimum;
  }

  // some adjustments to the device info
  if (deviceInfo["hardwareConcurrency"] <= 0)
    deviceInfo["hardwareConcurrency"] = Math.round(
      2 * deviceInfo["computeRandomMHz"]
    );

  deviceInfo["deviceBrowserVersion"] =
    deviceInfo["deviceBrowserVersion"]?.split(".");
  if (deviceInfo["deviceBrowserVersion"]?.length >= 2)
    deviceInfo["deviceBrowserVersion"] = Number(
      deviceInfo["deviceBrowserVersion"][0] +
        "." +
        Math.round(deviceInfo["deviceBrowserVersion"][1] * 10) / 10
    );
  else
    deviceInfo["deviceBrowserVersion"] = Number(
      deviceInfo["deviceBrowserVersion"][0]
    );

  if (deviceInfo["deviceSysFamily"] == "Mac")
    deviceInfo["deviceSysFamily"] = "macOS";
  if (deviceInfo["deviceBrowser"] == "Microsoft Edge")
    deviceInfo["deviceBrowser"] = "Edge";

  var deviceIsCompatibleBool = true;
  var msg = [];
  // compatibilityType ----> all, not, or a browser name
  const browserCompatibilityType = compatibleBrowser[0].trim().slice(0, 3);
  const OSCompatibilityType = compatibleOS[0].trim().slice(0, 3);

  // COMPUTE deviceIsCompatibleBool and compatibilityRequirements
  switch (browserCompatibilityType) {
    case "all": // ignore browser
      switch (OSCompatibilityType) {
        case "all": //ignore OSes
          msg.push(readi18nPhrases("EE_compatibleDeviceCores", Language));
          break;
        case "not": // report incompatible OSes
          deviceIsCompatibleBool =
            deviceIsCompatibleBool &&
            !compatibleOS.includes("not" + deviceInfo["deviceSysFamily"]);
          msg.push(readi18nPhrases("EE_compatibleNotOSDeviceCores", Language));
          break;
        default: // report compatible OSes
          deviceIsCompatibleBool =
            deviceIsCompatibleBool &&
            compatibleOS.includes(deviceInfo["deviceSysFamily"]);
          msg.push(readi18nPhrases("EE_compatibleOSDeviceCores", Language));
          break;
      }
      break;
    case "not": //report incompatible browsers, ignore browser version
      deviceIsCompatibleBool =
        deviceIsCompatibleBool &&
        !compatibleBrowser.includes("not" + deviceInfo["deviceBrowser"]);
      switch (OSCompatibilityType) {
        case "all": //ignore OSes
          msg.push(
            readi18nPhrases("EE_compatibleBrowserDeviceCores", Language)
          );
          break;
        case "not": //report incompatible OSes
          deviceIsCompatibleBool =
            deviceIsCompatibleBool &&
            !compatibleOS.includes("not" + deviceInfo["deviceSysFamily"]);
          msg.push(
            readi18nPhrases("EE_compatibleNotBrowserNotOSDeviceCores", Language)
          );
          break;
        default: //report compatible OSes
          deviceIsCompatibleBool =
            deviceIsCompatibleBool &&
            compatibleOS.includes(deviceInfo["deviceSysFamily"]);
          msg.push(
            readi18nPhrases("EE_compatibleNotBrowserOSDeviceCores", Language)
          );
          break;
      }
      break;
    default: // report compatible browsers
      deviceIsCompatibleBool =
        deviceIsCompatibleBool &&
        compatibleBrowser.includes(deviceInfo["deviceBrowser"]);
      switch (OSCompatibilityType) {
        case "all":
          if (compatibleBrowserVersionMinimum > 0) {
            //report browser version
            deviceIsCompatibleBool =
              deviceIsCompatibleBool &&
              deviceInfo["deviceBrowserVersion"] >=
                compatibleBrowserVersionMinimum;
            msg.push(
              readi18nPhrases(
                "EE_compatibleBrowserVersionDeviceCores",
                Language
              )
            );
          } //ignore browser version
          else
            msg.push(
              readi18nPhrases("EE_compatibleBrowserDeviceCores", Language)
            );
          break;
        case "not": //report incompatible OSes
          deviceIsCompatibleBool =
            deviceIsCompatibleBool &&
            !compatibleOS.includes("not" + deviceInfo["deviceSysFamily"]);
          if (compatibleBrowserVersionMinimum > 0) {
            //report browser version
            deviceIsCompatibleBool =
              deviceIsCompatibleBool &&
              deviceInfo["deviceBrowserVersion"] >=
                compatibleBrowserVersionMinimum;
            msg.push(
              readi18nPhrases("EE_compatibleBrowserNotOSDeviceCores", Language)
            );
          } //ignore browser version
          else
            msg.push(
              readi18nPhrases("EE_compatibleBrowserNotOSDeviceCores", Language)
            );
          break;
        default: //report compatible browsers
          deviceIsCompatibleBool =
            deviceIsCompatibleBool &&
            compatibleOS.includes(deviceInfo["deviceSysFamily"]);
          if (compatibleBrowserVersionMinimum > 0) {
            //report browser version
            deviceIsCompatibleBool =
              deviceIsCompatibleBool &&
              deviceInfo["deviceBrowserVersion"] >=
                compatibleBrowserVersionMinimum;
            msg.push(
              readi18nPhrases(
                "EE_compatibleBrowserVersionOSDeviceCores",
                Language
              )
            );
          } //ignore browser version
          else
            msg.push(
              readi18nPhrases("EE_compatibleBrowserOSDeviceCores", Language)
            );
          break;
      }
      break;
  }

  deviceIsCompatibleBool =
    deviceIsCompatibleBool &&
    compatibleDevice.includes(deviceInfo["deviceType"]);
  deviceIsCompatibleBool =
    deviceIsCompatibleBool &&
    deviceInfo["hardwareConcurrency"] >= compatibleProcessorCoresMinimum;

  // Do substitutions to plug in the requirements.
  // BBB = allowed browser(s), separated by "or"
  // 111 = minimum version
  // OOO = allowed operating system(s), , separated by "or"
  // DDD = allowed deviceType(s) , separated by "or"s
  // 222 = minimum number of cpu cores
  // Each allowed field can hold one, e.g. "Chrome", or several possibilities, e.g. "Chrome or Firefox".
  // Source code for StringOfItems and StringOfNotItems below.

  msg.forEach((item, idx, arr) => {
    // Incompatible with items connected by AND.
    arr[idx] = arr[idx].replace(/bbb/g, StringOfNotItems(compatibleBrowser));
    arr[idx] = arr[idx].replace(/ooo/g, StringOfNotItems(compatibleOS));

    //Compatible with items connected by OR.
    arr[idx] = arr[idx].replace(
      /BBB/g,
      StringOfItems(compatibleBrowser, Language)
    );
    arr[idx] = arr[idx].replace(/OOO/g, StringOfItems(compatibleOS, Language));
    arr[idx] = arr[idx].replace(
      /DDD/g,
      StringOfItems(compatibleDevice, Language)
    );
    arr[idx] = arr[idx].replace(
      /111/g,
      compatibleBrowserVersionMinimum.toString()
    );
    arr[idx] = arr[idx].replace(
      /222/g,
      compatibleProcessorCoresMinimum.toString()
    );
  });

  // if (isForScientistPage) {
  //   // remove the phrase "As stated in its description, t" and make the t Uppercase
  //   msg[0] = msg[0].replace(/As stated in its description, t/g, "T");
  // }

  //Create describeDevice, a sentence describing the participant's device.
  let describeDevice = readi18nPhrases("EE_describeDevice", Language);
  // Do substitutions to describe the actual device.
  // BBB = browser
  // 111 = version
  // OOO = operating system
  // DDD = deviceType
  // 222 = number of cpu cores
  describeDevice = describeDevice.replace(/BBB/g, deviceInfo["deviceBrowser"]);
  describeDevice = describeDevice.replace(
    /111/g,
    deviceInfo["deviceBrowserVersion"].toString()
  );
  describeDevice = describeDevice.replace(
    /OOO/g,
    deviceInfo["deviceSysFamily"]
  );
  describeDevice = describeDevice.replace(/DDD/g, deviceInfo["deviceType"]);
  describeDevice = describeDevice.replace(
    /222/g,
    deviceInfo["hardwareConcurrency"] > 0
      ? deviceInfo["hardwareConcurrency"]
      : Math.round(2 * deviceInfo["computeRandomMHz"])
  );
  describeDevice = describeDevice.replace(/Mac/g, "macOS");
  describeDevice = describeDevice.replace(/OS X/g, "macOS");
  describeDevice = describeDevice.replace(/Microsoft Edge/g, "Edge");
  return {
    deviceIsCompatibleBool: !isForScientistPage
      ? deviceIsCompatibleBool
      : undefined,
    compatibilityRequirements: msg,
    describeDevice: describeDevice,
  };
};

const StringOfNotItems = (items) => {
  // Listing items that we are incompatible with, they are joined by AND.
  var notItemString;
  switch (items.length) {
    case 0:
      notItemString = "";
    case 1:
      notItemString = items[0].trim().slice(3); //First item. Strip the leading 'not'.
    default:
      notItemString = items[0].trim().slice(3);
      for (var i = 1; i < items.length; i++) {
        notItemString += " and " + items[i].trim().slice(3); //i-th item. Strip leading 'not'.
      }
  }
  return notItemString;
};

const StringOfItems = (items, Language) => {
  //Listing items that we are compatible with, they are joined by OR.
  var itemString;
  const Or = readi18nPhrases("EE_or", Language);
  const space =
    readi18nPhrases("EE_languageUseSpace", Language) === "1" ? " " : "";
  switch (items.length) {
    case 0:
      itemString = "";
    case 1:
      itemString = items[0].trim();
    default:
      itemString = items[0].trim();
      for (var i = 1; i < items.length; i++) {
        itemString += Or + space + items[i].trim();
      }
  }
  return itemString;
};

export const displayCompatibilityMessage = async (
  msg,
  reader,
  rc,
  promptRefresh,
  proceedBool,
  compatibilityCheckPeer,
  needAnySmartphone,
  needCalibratedSmartphoneMicrophone
) => {
  return new Promise(async (resolve) => {
    //message wrapper
    const messageWrapper = document.createElement("div");
    messageWrapper.id = "msg-container";
    messageWrapper.style.display = "flex";
    messageWrapper.style.flexDirection = "column";
    messageWrapper.style.marginRight = "20vw";
    messageWrapper.style.minWidth = "60vw";
    document.getElementById("root").style.display = "none";

    // //create title msg
    let titleMsg = document.createElement("h3");
    let T = readi18nPhrases("EE_compatibilityTitle", rc.language.value);
    // replace "xxx"  or "XXX" or "Xxx" with "EasyEyes"
    T = T.replace(/xxx/g, "EasyEyes");
    T = T.replace(/XXX/g, "EasyEyes");
    T = T.replace(/Xxx/g, "EasyEyes");
    titleMsg.innerHTML = T;

    titleMsg.id = "compatibility-title";
    let titleContainer = document.createElement("div");
    titleContainer.style.textAlign = "left";
    titleContainer.style.marginBottom = "20px";
    titleContainer.appendChild(titleMsg);
    messageWrapper.appendChild(titleContainer);

    //create msg items
    var displayMsg = "";
    msg.forEach((item) => {
      displayMsg += item;
      displayMsg += " ";
    });
    let elem = document.createElement("span");
    elem.style.textAlign = "left";
    elem.style.whiteSpace = "pre-line";
    elem.innerHTML = displayMsg;
    elem.id = "compatibility-message";
    messageWrapper.appendChild(elem);

    // create refresh button to recalculate compatibility
    if (promptRefresh) {
      const refreshButton = document.createElement("button");
      refreshButton.classList.add("form-input-btn");
      refreshButton.style.width = "fit-content";
      refreshButton.style.marginTop = "10px";
      refreshButton.style.marginLeft = "0";
      refreshButton.id = "refresh-btn";
      refreshButton.innerHTML = readi18nPhrases(
        "EE_refresh",
        rc.language.value
      );
      refreshButton.addEventListener("click", () => {
        const language = readi18nPhrases(
          "EE_languageNameEnglish",
          rc.language.value
        );
        const newMsg = checkSystemCompatibility(reader, language, rc);
        handleNewMessage(
          newMsg.msg,
          "compatibility-message",
          rc.language.value
        );
        // update proceedBool
        proceedBool = newMsg.proceed;
      });
      messageWrapper.appendChild(refreshButton);
    }

    const languageWrapper = document.createElement("div");
    const needPhoneSurvey = reader.read("_needSmartphoneSurveyBool")[0];
    if (reader.read("_languageSelectionByParticipantBool")[0]) {
      // create language selection dropdown
      const LanguageTitle = document.createElement("h3");
      LanguageTitle.innerHTML = readi18nPhrases(
        "EE_languageChoose",
        rc.language.value
      );
      LanguageTitle.id = "language-title";
      LanguageTitle.style.marginTop = "40px";
      languageWrapper.appendChild(LanguageTitle);

      const languageDropdown = document.createElement("select");
      languageDropdown.id = "language-dropdown";
      languageDropdown.style.width = "12rem";
      languageDropdown.style.backgroundColor = "#ddd";
      languageDropdown.style.fontWeight = "bold";
      languageDropdown.style.marginLeft = "auto";

      const languages = readi18nPhrases("EE_languageNameNative");
      const languageOptions = Object.keys(languages).map((language) => {
        const option = document.createElement("option");
        option.value = languages[language];
        option.innerHTML = languages[language];
        return option;
      });
      languageOptions.forEach((option) => languageDropdown.appendChild(option));
      languageDropdown.value = languages[rc.language.value];

      languageDropdown.addEventListener("change", () => {
        const language = languageDropdown.value;
        const newMsg = checkSystemCompatibility(reader, language, rc, false);
        handleNewMessage(
          newMsg.msg,
          "compatibility-message",
          rc.language.value,
          needPhoneSurvey,
          compatibilityCheckPeer,
          needAnySmartphone,
          needCalibratedSmartphoneMicrophone
        );
      });

      // top right corner
      languageWrapper.style.position = "absolute";
      languageWrapper.style.top = "0";
      languageWrapper.style.right = "20vw";

      languageWrapper.appendChild(languageDropdown);
      messageWrapper.appendChild(languageWrapper);
    }

    document.body.appendChild(messageWrapper);
    if (compatibilityCheckPeer) {
      const compatiblityCheckQR = await compatibilityCheckPeer.getQRCodeElem();
      // add id to the QR code
      compatiblityCheckQR.id = "compatibility-qr";
      compatiblityCheckQR.style.maxHeight = "150px";
      compatiblityCheckQR.style.maxWidth = "150px";
      compatiblityCheckQR.style.alignSelf = "left";
      compatiblityCheckQR.style.padding = "0px";
      // move QR code 15px to the left from its current position
      compatiblityCheckQR.style.marginLeft = "-13px";
      const compatibilityCheckQRExplanation = document.createElement("p");
      // add id to the QR code explanation
      compatibilityCheckQRExplanation.id = "compatibility-qr-explanation";
      compatibilityCheckQRExplanation.style.marginBottom = "10px";
      compatibilityCheckQRExplanation.style.marginTop = "10px";
      let messageForQr = getMessageForQR(
        needAnySmartphone,
        needCalibratedSmartphoneMicrophone,
        needPhoneSurvey,
        rc.language.value
      );
      compatibilityCheckQRExplanation.innerText = messageForQr;

      messageWrapper.append(compatibilityCheckQRExplanation);
      messageWrapper.append(compatiblityCheckQR);
      const displayUpdate = document.createElement("p");
      messageWrapper.appendChild(displayUpdate);
      try {
        while (true) {
          console.log("waiting for compatibilityCheckPeer");
          const result = await compatibilityCheckPeer.getResults();
          compatibilityCheckPeer.onPeerClose();
          if (result) {
            const deviceDetails = result.deviceDetails;
            const OEM = deviceDetails.OEM;
            displayUpdate.innerText = "";
            const proceed = await isSmartphoneInDatabase(
              OEM,
              messageWrapper,
              rc.language.value,
              displayUpdate,
              deviceDetails,
              needPhoneSurvey,
              compatiblityCheckQR,
              compatibilityCheckQRExplanation,
              languageWrapper,
              titleContainer,
              elem
            );
            if (proceed) {
              if (needPhoneSurvey) {
                resolve({
                  proceedButtonClicked: true,
                  proceedBool: true,
                  mic: microphoneInfo,
                });
              }
              break;
            }
          }
        }
        // remove the QR code and explanation
        compatiblityCheckQR.remove();
        compatibilityCheckQRExplanation.remove();
        displayUpdate.remove();
      } catch (e) {
        console.log("error", e);
      }
    }

    //create proceed button
    const buttonWrapper = document.createElement("div");
    buttonWrapper.style.textAlign = "center";
    const proceedButton = document.createElement("button");
    proceedButton.classList.add("form-input-btn");
    proceedButton.style.width = "fit-content";
    proceedButton.style.margin = "3rem 0";
    proceedButton.id = "procced-btn";
    proceedButton.innerHTML = readi18nPhrases("T_proceed", rc.language.value);
    proceedButton.addEventListener("click", () => {
      document.getElementById("root").style.display = "";
      resolve({
        proceedButtonClicked: true,
        proceedBool: proceedBool,
        mic: microphoneInfo,
      });
    });
    buttonWrapper.appendChild(proceedButton);
    messageWrapper.appendChild(buttonWrapper);
  });
};

const getMessageForQR = (
  needAnySmartphone,
  needCalibratedSmartphoneMicrophone,
  needPhoneSurvey,
  language
) => {
  let messageForQr = "";
  if (needAnySmartphone && needCalibratedSmartphoneMicrophone) {
    messageForQr = readi18nPhrases("RC_inDescription", language) + " ";
    needPhoneSurvey
      ? (messageForQr += readi18nPhrases("RC_needPhoneSurvey", language))
      : (messageForQr += readi18nPhrases(
          "RC_needPhoneMicrophoneAndKeypad",
          language
        ));
  } else if (needCalibratedSmartphoneMicrophone) {
    messageForQr = readi18nPhrases("RC_inDescription", language) + " ";
    needPhoneSurvey
      ? (messageForQr += readi18nPhrases("RC_needPhoneSurvey", language))
      : (messageForQr += readi18nPhrases("RC_needPhoneMicrophone", language));
  } else if (needAnySmartphone) {
    messageForQr = readi18nPhrases("RC_inDescription", language) + " ";
    needPhoneSurvey
      ? (messageForQr += readi18nPhrases("RC_needPhoneSurvey", language))
      : (messageForQr += readi18nPhrases("RC_needPhoneKeypad", language));
  }
  return (
    messageForQr + " " + readi18nPhrases("RC_needsPointCameraAtQR", language)
  );
};
const checkModelNumberandNameForIOS = (
  modelNumber,
  modelName,
  platformName
) => {
  // check if the model number has 5 characters
  //  check if first character of model number is the letter "A"
  // check if the last 4 characters of the model number are numbers
  if (platformName !== "iOS") {
    return true;
  }
  const modelNumberLength = modelNumber.length;
  if (modelNumberLength !== 5) {
    return false;
  }
  if (modelNumber[0] !== "A") {
    return false;
  }
  const lastFourCharacters = modelNumber.slice(1);
  const lastFourCharactersAreNumbers = /^\d+$/.test(lastFourCharacters);
  if (!lastFourCharactersAreNumbers) {
    return false;
  }

  // check if the model name starts with "iPhone"

  const modelNameLength = modelName.length;
  if (modelNameLength < 6) {
    return false;
  }
  if (modelName.slice(0, 6) !== "iPhone") {
    return false;
  }
  return true;
};

const isSmartphoneInDatabase = async (
  OEM,
  messageWrapper,
  lang,
  displayUpdate,
  deviceDetails,
  needPhoneSurvey = false,
  qrCodeDisplay = null,
  qrCodeExplanation = null,
  languageWrapper = null,
  titleContainer = null,
  elem = null
) => {
  // ask for the model number and name of the device
  // create input box for model number and name
  // hide  the QR code and explanation (but don't remove them)
  const img = document.createElement("img");
  if (needPhoneSurvey) {
    qrCodeDisplay.remove();
    qrCodeExplanation.remove();
    if (languageWrapper) {
      languageWrapper.remove();
    }
    titleContainer.remove();
    elem.remove();
    // center messageWrapper
    messageWrapper.style.margin = "auto";
    messageWrapper.style.marginLeft = "20vw";
    messageWrapper.style.marginRight = "20vw";
    if (deviceDetails.PlatformName === "iOS") {
      // insert image of iOS settings
      const img = document.createElement("img");
      img.src = "./components/images/ios_settings.png";
      img.style.width = "30%";
      img.style.margin = "auto";
      img.style.marginBottom = "30px";
      messageWrapper.appendChild(img);
    }
  }
  const { preferredModelNumber } = getDeviceDetails(
    deviceDetails.PlatformName,
    lang
  );
  console.log("platformName", deviceDetails.PlatformName);
  console.log("preferredModelNumber", preferredModelNumber);
  const modelNumberInput = document.createElement("input");
  modelNumberInput.type = "text";
  modelNumberInput.id = "modelNumberInput";
  modelNumberInput.name = "modelNumberInput";
  modelNumberInput.placeholder = preferredModelNumber;

  const modelNameInput = document.createElement("input");
  modelNameInput.type = "text";
  modelNameInput.id = "modelNameInput";
  modelNameInput.name = "modelNameInput";
  modelNameInput.placeholder = readi18nPhrases("RC_modelName", lang);

  const instructionText = getInstructionText(
    deviceDetails,
    lang,
    true,
    false,
    preferredModelNumber,
    needPhoneSurvey
  );
  const p = document.createElement("p");
  p.innerHTML = instructionText;

  const checkButton = document.createElement("button");
  checkButton.classList.add(...["btn", "btn-success"]);
  checkButton.innerText = readi18nPhrases("T_proceed", lang);
  checkButton.style.width = "fit-content";

  const modelNumberWrapper = document.createElement("div");
  // modelNumberWrapper.style.marginTop = "20px";
  modelNumberWrapper.appendChild(p);
  modelNumberWrapper.appendChild(modelNameInput);
  modelNumberWrapper.appendChild(modelNumberInput);
  modelNumberWrapper.appendChild(checkButton);
  messageWrapper.appendChild(modelNumberWrapper);

  const procceed = await new Promise((resolve) => {
    checkButton.addEventListener("click", async () => {
      checkButton.innerHTML = "Loading...";
      const modelNumber = modelNumberInput.value;
      const modelName = modelNameInput.value;
      if (modelName === "" || modelNumber === "") {
        alert("Please enter the model number and name of the device");
      } else {
        // check if model number and name are in the correct format
        const valid = checkModelNumberandNameForIOS(
          modelNumber,
          modelName,
          deviceDetails.PlatformName
        );
        if (!valid) {
          p.innerHTML =
            instructionText +
            "<br>" +
            readi18nPhrases("RC_wrongIPhoneModel", lang);
        } else {
          if (needPhoneSurvey) {
            // add microphone details to microphoneInfo.phoneSurvey array
            microphoneInfo.phoneSurvey = {
              smartphoneManufacturer: OEM,
              smartphoneModelName: modelName,
              smartphoneModelNumber: modelNumber,
              smartphoneInfoFrom51Degrees: deviceDetails,
            };
            p.innerHTML = readi18nPhrases("RC_smartphoneSurveyEnd", lang);
            // center p
            messageWrapper.style.textAlign = "center";
            modelNumberInput.remove();
            modelNameInput.remove();
            checkButton.remove();
            img.remove();
            resolve(true);
          } else {
            const exists = await doesMicrophoneExistInFirestore(
              modelNumber,
              OEM.toLowerCase().split(" ").join("")
            );
            modelNumberInput.remove();
            modelNameInput.remove();
            checkButton.remove();
            p.remove();
            if (exists) {
              elem.innerText = readi18nPhrases(
                "RC_microphoneIsInCalibrationLibrary",
                lang
              ).replace("xxx", OEM + " " + modelName);
              if (languageWrapper) languageWrapper.remove();
              microphoneInfo.micFullName = modelName;
              microphoneInfo.micFullSerialNumber = modelNumber;
              microphoneInfo.micrFullManufacturerName = OEM;
              resolve(true);
            } else {
              displayUpdate.innerText = readi18nPhrases(
                "RC_microphoneNotInCalibrationLibrary",
                lang
              ).replace("xxx", modelName);
              resolve(false);
            }
          }
        }
      }
      checkButton.innerHTML = readi18nPhrases("T_proceed", lang);
    });
  });

  return procceed;
};

export const hideCompatibilityMessage = () => {
  document.getElementById("msg-container")?.remove();
};

const handleLanguage = (lang, rc, useEnglishNames = true) => {
  // convert to language code
  const Languages = useEnglishNames
    ? readi18nPhrases("EE_languageNameEnglish")
    : readi18nPhrases("EE_languageNameNative");
  const languageCode = Object.keys(Languages).find(
    (key) => Languages[key] === lang
  );

  // set language code
  if (languageCode) {
    rc.newLanguage(languageCode);
  }
  console.log("languageCode", languageCode);
};

const handleNewMessage = (
  msg,
  msgID,
  lang,
  needPhoneSurvey = false,
  compatibilityCheckPeer = null,
  needAnySmartphone = false,
  needCalibratedSmartphoneMicrophone = false
) => {
  var displayMsg = "";
  msg.forEach((item) => {
    displayMsg += item;
    displayMsg += " ";
  });
  let elem = document.getElementById(msgID);
  if (elem) elem.innerHTML = displayMsg;

  let titleElem = document.getElementById("compatibility-title");
  if (titleElem)
    titleElem.innerHTML = readi18nPhrases("EE_compatibilityTitle", lang);

  let languageTitleElem = document.getElementById("language-title");
  if (languageTitleElem)
    languageTitleElem.innerHTML = readi18nPhrases("EE_languageChoose", lang);

  let proceedButton = document.getElementById("procced-btn");
  if (proceedButton)
    proceedButton.innerHTML = readi18nPhrases("T_proceed", lang);

  if (needPhoneSurvey || compatibilityCheckPeer) {
    let qrCodeExplanation = document.getElementById(
      "compatibility-qr-explanation"
    );
    let messageForQr = getMessageForQR(
      needAnySmartphone,
      needCalibratedSmartphoneMicrophone,
      needPhoneSurvey,
      lang
    );
    qrCodeExplanation.innerText = messageForQr;
  }
};

export const getCompatibilityInfoForScientistPage = (parsed) => {
  const compatibilityInfo = {
    compatibleBrowser: [],
    compatibleBrowserVersionMinimum: "",
    compatibleDevice: [],
    compatibleOS: [],
    compatibleProcessorCoresMinimum: "",
    language: "",
    online2Description: "",
  };
  // console.log("parsed", parsed.data)
  for (let i = 0; i < parsed.data.length; i++) {
    if (parsed.data[i][0] == "_needBrowser") {
      compatibilityInfo.compatibleBrowser = parsed.data[i][1].split(",");
    } else if (parsed.data[i][0] == "_needBrowserVersionMinimum") {
      compatibilityInfo.compatibleBrowserVersionMinimum = parsed.data[i][1];
    } else if (parsed.data[i][0] == "_needDeviceType") {
      compatibilityInfo.compatibleDevice = parsed.data[i][1].split(",");
    } else if (parsed.data[i][0] == "_needOperatingSystem") {
      compatibilityInfo.compatibleOS = parsed.data[i][1].split(",");
    } else if (parsed.data[i][0] == "_needProcessorCoresMinimum") {
      compatibilityInfo.compatibleProcessorCoresMinimum = parsed.data[i][1];
    } else if (parsed.data[i][0] == "_language") {
      compatibilityInfo.language = parsed.data[i][1];
    }
  }

  if (compatibilityInfo.compatibleBrowser.length == 0) {
    compatibilityInfo.compatibleBrowser = [GLOSSARY["_needBrowser"].default];
  }
  if (compatibilityInfo.compatibleBrowserVersionMinimum == "") {
    compatibilityInfo.compatibleBrowserVersionMinimum =
      GLOSSARY["_needBrowserVersionMinimum"].default;
  }
  if (compatibilityInfo.compatibleDevice.length == 0) {
    compatibilityInfo.compatibleDevice = [GLOSSARY["_needDeviceType"].default];
  }
  if (compatibilityInfo.compatibleOS.length == 0) {
    compatibilityInfo.compatibleOS = [GLOSSARY["_needOperatingSystem"].default];
  }
  if (compatibilityInfo.compatibleProcessorCoresMinimum == "") {
    compatibilityInfo.compatibleProcessorCoresMinimum =
      GLOSSARY["_needProcessorCoresMinimum"].default;
  }
  if (compatibilityInfo.language == "") {
    compatibilityInfo.language = GLOSSARY["_language"].default;
  }

  //convert language to language code
  // const Languages = phrases.EE_languageNameEnglish;
  // const languageCode = Object.keys(Languages).find(
  //   (key) => Languages[key] === compatibilityInfo.language
  // );
  // compatibilityInfo.language = languageCode? languageCode : "en-US"

  return compatibilityInfo;
};

export const convertLanguageToLanguageCode = (language) => {
  const Languages = readi18nPhrases("EE_languageNameEnglish");
  const languageCode = Object.keys(Languages).find(
    (key) => Languages[key] === language
  );
  return languageCode ? languageCode : "en-US";
};
