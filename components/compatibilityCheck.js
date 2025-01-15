import { GLOSSARY } from "../parameters/glossary";
import {
  isProlificExperiment,
  isProlificPreviewExperiment,
} from "./externalServices";
import { readi18nPhrases } from "./readPhrases";

import { db } from "./firebase/firebase.js";
import {
  doc,
  getDoc,
  getDocs,
  query,
  where,
  collection,
} from "firebase/firestore";
import {
  AllBrands,
  AllModelNames,
  AllModelNumbers,
  addQRSkipButtons,
  fetchAllPhoneModels,
  getAutoCompleteSuggestionElements,
  matchPhoneModelInDatabase,
} from "./compatibilityCheckHelpers";
import { recruitmentServiceData } from "./recruitmentService";
import { checkBrowserSoundOutputSelectionSupport } from "./soundOutput.ts";

// import { _key_resp_allKeys, _key_resp_event_handlers } from "./global";

function ifTrue(arr) {
  for (let a of arr) if (a) return true;
  return false;
}

var isFodLoaded = false; // Flag to track loading state
if (typeof document !== "undefined")
  document.addEventListener("DOMContentLoaded", function () {
    var script = document.getElementById("51DegreesScript");

    if (script) {
      script.onload = function () {
        console.log("Fod script loaded successfully.");
        isFodLoaded = true;
      };

      script.onerror = function () {
        console.error("Failed to load the fod script.");
        isFodLoaded = false;
      };
    }
  });

let gotLoudspeakerMatchBool = false;

const needsUnmet = [];

const microphoneInfo = {
  micFullName: "",
  micFullSerialNumber: "",
  micrFullManufacturerName: "",
  phoneSurvey: {},
};

const loudspeakerInfo = {
  modelName: "",
  modelNumber: "",
  detailsFrom51Degrees: {},
  loudspeaker: null,
  Brand: "",
};

export const QRSkipResponse = {
  QRBool: false,
  QRCantBool: false,
  QRPreferNotToBool: false,
  QRNoSmartphoneBool: false,
};

// If the consent form were denied... Show the ending directly
export const showExperimentEnding = (
  newEnding = true,
  addReturnToProlificButton = false,
  lang = "en-US",
) => {
  let endingText;
  if (newEnding) endingText = document.createElement("div");
  else endingText = document.getElementById("exp-end-text");

  endingText.innerText = readi18nPhrases("EE_ThankYou", lang);
  endingText.id = "exp-end-text";
  document.body.appendChild(endingText);
  endingText.style.visibility = "visible";
  endingText.style.lineHeight = "1.5";
  endingText.style.paddingTop = "40vh";

  if (recruitmentServiceData?.incompatibleCode) {
    const returnToProlificButton = document.createElement("button");
    returnToProlificButton.classList.add("form-input-btn");
    returnToProlificButton.innerHTML = readi18nPhrases("EE_Cancel", lang);
    returnToProlificButton.addEventListener("click", () => {
      window.location.href =
        "https://app.prolific.com/submissions/complete?cc=" +
        recruitmentServiceData?.incompatibleCode;
    });
    endingText.innerText = "";

    const p = document.createElement("p");
    p.innerText =
      readi18nPhrases("EE_ThankYou", lang) +
      " " +
      readi18nPhrases("EE_NoPhonePleaseCancel", lang);
    p.style.marginBottom = "20px";
    endingText.appendChild(p);
    endingText.appendChild(returnToProlificButton);
    endingText.style.display = "flex";
    endingText.style.flexDirection = "column";
    endingText.style.alignItems = "center";
    endingText.style.paddingTop = "0vh";
    endingText.style.justifyContent = "center";
  }
};

export const getPreferredModelNumberAndName = (
  OEM,
  platformName,
  lang,
  lowercase = false,
) => {
  let preferredModelNumber = "";
  let preferredModelName = "";

  if (OEM === "Samsung") {
    preferredModelNumber = readi18nPhrases(
      lowercase
        ? "RC_modelNumberAndroidSamsungLowercase"
        : "RC_modelNumberAndroidSamsung",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase
        ? "RC_modelNameAndroidSamsungLowercase"
        : "RC_modelNameAndroidSamsung",
      lang,
    );
  } else if (OEM === "Motorola") {
    preferredModelNumber = readi18nPhrases(
      lowercase
        ? "RC_modelNumberAndroidMotorolaLowercase"
        : "RC_modelNumberAndroidMotorola",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase
        ? "RC_modelNameAndroidMotorolaLowercase"
        : "RC_modelNameAndroidMotorola",
      lang,
    );
  } else if (OEM === "Blackberry") {
    preferredModelNumber = readi18nPhrases(
      lowercase
        ? "RC_modelNumberBlackberryLowercase"
        : "RC_modelNumberBlackberry",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase ? "RC_modelNameBlackberryLowercase" : "RC_modelName",
      lang,
    );
  } else if (OEM === "Google") {
    preferredModelNumber = readi18nPhrases(
      lowercase
        ? "RC_modelNumberAndroidGoogleLowercase"
        : "RC_modelNumberAndroidGoogle",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase
        ? "RC_modelNameAndroidGoogleLowercase"
        : "RC_modelNameAndroidGoogle",
      lang,
    );
  } else if (OEM === "Huawei") {
    preferredModelNumber = readi18nPhrases(
      lowercase
        ? "RC_modelNumberAndroidHuaweiLowercase"
        : "RC_modelNumberAndroidHuawei",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase
        ? "RC_modelNameAndroidHuaweiLowercase"
        : "RC_modelNameAndroidHuawei",
      lang,
    );
  } else if (OEM === "Xiaomi") {
    preferredModelNumber = readi18nPhrases(
      lowercase
        ? "RC_modelNumberAndroidXiaomiLowercase"
        : "RC_modelNumberAndroidXiaomi",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase
        ? "RC_modelNameAndroidXiaomiLowercase"
        : "RC_modelNameAndroidXiaomi",
      lang,
    );
  } else if (OEM === "Apple") {
    if (platformName === "iOS") {
      preferredModelNumber = readi18nPhrases(
        lowercase ? "RC_modelNumberIOsLowercase" : "RC_modelNumberIOs",
        lang,
      );
      preferredModelName = readi18nPhrases(
        lowercase ? "RC_modelNameIOsLowercase" : "RC_modelName",
        lang,
      );
    } else if (platformName === "macOS") {
      preferredModelNumber = readi18nPhrases(
        lowercase ? "RC_modelNumberMacOSLowercase" : "RC_modelNumberMacOS",
        lang,
      );
      preferredModelName = readi18nPhrases(
        lowercase ? "RC_modelNameMacOSLowercase" : "RC_modelName",
        lang,
      );
    } else {
      preferredModelNumber = readi18nPhrases(
        lowercase ? "RC_modelNumberIOsLowercase" : "RC_modelNumberIOs",
        lang,
      );
      preferredModelName = readi18nPhrases(
        lowercase ? "RC_modelNameIOsLowercase" : "RC_modelName",
        lang,
      );
    }
  } else if (platformName === "Android") {
    preferredModelNumber = readi18nPhrases(
      lowercase
        ? "RC_modelNumberAndroidGenericLowercase"
        : "RC_modelNumberAndroid",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase
        ? "RC_modelNameAndroidGenericLowercase"
        : "RC_modelNameAndroidGeneric",
      lang,
    );
  } else if (platformName === "Bada") {
    preferredModelNumber = readi18nPhrases(
      lowercase ? "RC_modelNumberBadaLowercase" : "RC_modelNumberBada",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase ? "RC_modelNameAndroidGenericLowercase" : "RC_modelName",
      lang,
    );
  } else if (platformName === "Firefox") {
    preferredModelNumber = readi18nPhrases(
      lowercase ? "RC_modelNumberFirefoxLowercase" : "RC_modelNumberFirefox",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase ? "RC_modelNameAndroidGenericLowercase" : "RC_modelName",
      lang,
    );
  } else if (platformName === "Linux") {
    preferredModelNumber = readi18nPhrases(
      lowercase ? "RC_modelNumberLinuxLowercase" : "RC_modelNumberLinux",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase ? "RC_modelNameAndroidGenericLowercase" : "RC_modelName",
      lang,
    );
  } else if (platformName === "Maemo") {
    preferredModelNumber = readi18nPhrases(
      lowercase ? "RC_modelNumberMaemoLowercase" : "RC_modelNumberMaemo",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase ? "RC_modelNameAndroidGenericLowercase" : "RC_modelName",
      lang,
    );
  } else if (platformName === "Palm") {
    preferredModelNumber = readi18nPhrases(
      lowercase ? "RC_modelNumberPalmLowercase" : "RC_modelNumberPalm",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase ? "RC_modelNameAndroidGenericLowercase" : "RC_modelName",
      lang,
    );
  } else if (platformName === "WebOS") {
    preferredModelNumber = readi18nPhrases(
      lowercase ? "RC_modelNumberWebOSLowercase" : "RC_modelNumberWebOS",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase ? "RC_modelNameAndroidGenericLowercase" : "RC_modelName",
      lang,
    );
  } else if (platformName === "Windows") {
    preferredModelNumber = readi18nPhrases(
      lowercase ? "RC_modelNumberWindowsLowercase" : "RC_modelNumberWindows",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase ? "RC_modelNameAndroidGenericLowercase" : "RC_modelName",
      lang,
    );
  } else {
    preferredModelNumber = readi18nPhrases(
      lowercase ? "RC_modelNumberAndroidGenericLowercase" : "RC_modelNumber",
      lang,
    );
    preferredModelName = readi18nPhrases(
      lowercase ? "RC_modelNameAndroidGenericLowercase" : "RC_modelName",
      lang,
    );
  }

  return { preferredModelNumber, preferredModelName };
};

export const getInstructionText = (
  thisDevice,
  language,
  isSmartPhone,
  isLoudspeakerCalibration,
  preferredModelNumberText = "model number",
  needPhoneSurvey = false,
  OEM = "",
  needComputerSurveyBool = false,
) => {
  //RC_phoneBrandAndModel
  const needModelNumber = isSmartPhone
    ? needPhoneSurvey
      ? readi18nPhrases("RC_needPhoneModel", language) + "<br><br>"
      : // QRSkipResponse.QRCantBool || QRSkipResponse.QRPreferNotToBool
        //   ? ""
        //   : readi18nPhrases("RC_surveyPhoneModel", language)
        //       .replace("ooo", thisDevice.PlatformName)
        //       .replace("OOO", thisDevice.PlatformName)
        //       .replace("mmm", preferredModelNumberText)
        //       .replace("MMM", preferredModelNumberText)
        readi18nPhrases("RC_needPhoneModel", language) + "<br><br>"
    : readi18nPhrases("RC_needModelNumberAndName", language) + "<br><br>";
  const preferredModelNumber = preferredModelNumberText;
  const needModelNumberFinal = needModelNumber
    .replace("mmm", preferredModelNumber)
    .replace("MMM", preferredModelNumber)
    .replace("xxx", OEM)
    .replace("XXX", OEM)
    .replace(
      "yyy",
      thisDevice.DeviceType === "Unknown" ? "device" : thisDevice.DeviceType,
    )
    .replace(
      "YYY",
      thisDevice.DeviceType === "Unknown" ? "Device" : thisDevice.DeviceType,
    );
  const userOS = thisDevice.PlatformName;
  var findModelNumber = "";
  if (needComputerSurveyBool) {
    if (OEM === "Apple") {
      findModelNumber = readi18nPhrases("RC_findModelMacOs", language);
    } else if (userOS === "Windows") {
      findModelNumber = readi18nPhrases("RC_findModelWindows", language);
    } else if (userOS === "Linux") {
      findModelNumber = readi18nPhrases("RC_findModelLinux", language);
    } else {
      findModelNumber = readi18nPhrases(
        "RC_findComputerModelGeneric",
        language,
      );
    }
  } else {
    if (OEM === "Samsung") {
      findModelNumber = readi18nPhrases("RC_findModelAndroidSamsung", language);
    } else if (OEM === "Motorola") {
      findModelNumber = readi18nPhrases(
        "RC_findModelAndroidMotorola",
        language,
      );
    } else if (OEM === "Google") {
      findModelNumber = readi18nPhrases("RC_findModelAndroidGoogle", language);
    } else if (OEM === "Huawei") {
      findModelNumber = readi18nPhrases("RC_findModelAndroidHuawei", language);
    } else if (OEM === "Xiaomi") {
      findModelNumber = readi18nPhrases("RC_findModelAndroidXiaomi", language);
    } else if (OEM === "Apple") {
      if (userOS === "iOS") {
        findModelNumber = readi18nPhrases("RC_findModelIOs", language);
      } else if (userOS === "macOS") {
        findModelNumber = readi18nPhrases("RC_findModelMacOs", language);
      } else {
        findModelNumber = readi18nPhrases("RC_findModelIOs", language);
      }
    } else {
      findModelNumber = readi18nPhrases("RC_findModelGeneric", language);
    }
  }

  return `${needModelNumberFinal}${findModelNumber}`;
};

export const doesMicrophoneExistInFirestore = async (speakerID, OEM) => {
  const collectionRef = collection(db, "Microphones");
  // get the document in the collection with the speakerID, OEM and isDefault = true
  const q = query(
    collectionRef,
    where("ID", "==", speakerID),
    where("lowercaseOEM", "==", OEM),
    where("isDefault", "==", true),
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.size > 0) {
    return true;
  }
  return false;
};

export const checkSystemCompatibility = async (
  reader,
  lang,
  rc,
  useEnglishNamesForLanguage = true,
  psychoJS = null,
  MeasureMeters = null,
) => {
  // handle language
  handleLanguage(lang, rc, useEnglishNamesForLanguage);

  var Language = rc.language.value;
  var check = false;
  const requirements = getCompatibilityRequirements(
    reader,
    Language,
    false,
    rc,
  );

  const compatibilityRequirements = requirements.compatibilityRequirements;
  var deviceIsCompatibleBool = requirements.deviceIsCompatibleBool;
  var msg = requirements.describeDevice;
  const describeMemory = requirements.describeMemory;

  if (MeasureMeters) {
    MeasureMeters.needMeasureMeters = reader.read("_needMeasureMeters")[0];
    MeasureMeters.canMeasureMeters = reader.read("_canMeasureMeters")[0];
    if (MeasureMeters && MeasureMeters.needMeasureMeters > 0) {
      await displayNeedMeasureMetersInput(
        reader,
        rc.language.value,
        MeasureMeters,
      );
      if (MeasureMeters.canMeasureMeters < MeasureMeters.needMeasureMeters) {
        deviceIsCompatibleBool = false;
        compatibilityRequirements.push(
          " " +
            readi18nPhrases("EE_minimumMeasureMeters", Language).replace(
              "111",
              MeasureMeters.needMeasureMeters,
            ),
        );
        needsUnmet.push("_needMeasureMeters");
      }
    }
  }
  // const needsUnmet = requirements.needsUnmet;

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
      i,
    );
    const minScreenWidthDegAll = reader.read("needScreenWidthDeg", i);
    const minScreenHeightDegAll = reader.read("needScreenHeightDeg", i);

    // remove disabled blocks
    const needTargetSizeDownToDeg = needTargetSizeDownToDegAll.filter(
      (item, index) => !disabledConditions.includes(i + "_" + (index + 1)),
    );
    const minScreenWidthDeg = Math.max(
      ...minScreenWidthDegAll.filter(
        (item, index) => !disabledConditions.includes(i + "_" + (index + 1)),
      ),
    );
    const minScreenHeightDeg = Math.max(
      ...minScreenHeightDegAll.filter(
        (item, index) => !disabledConditions.includes(i + "_" + (index + 1)),
      ),
    );

    const nConditions = needTargetSizeDownToDeg.length;
    const minSizeDeg = Math.min(...needTargetSizeDownToDeg);

    const widthPx = [];
    const heightPx = [];
    for (let j = 1; j <= nConditions; j++) {
      const targetMinPx =
        reader.read("targetMinPhysicalPx", i + "_" + j) /
        window.devicePixelRatio;
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
    if (screenWidthPx < minWidthPx) {
      needsUnmet.push("_needScreenWidthDeg");
    }
    if (screenHeightPx < minHeightPx) {
      needsUnmet.push("_needScreenHeightDeg");
    }
  } else if (minWidthPx > 0) {
    // non-zero minimum width
    // Internation phrase EE_compatibileScreenWidth - replace 111 with minWidthPx
    const ssMsg = readi18nPhrases("EE_compatibleScreenWidth", Language).replace(
      /111/g,
      minWidthPx.toString(),
    );
    screenSizeMsg.push(ssMsg + ".\n\n");

    const screenSizeCompatible = screenWidthPx >= minWidthPx;
    if (deviceIsCompatibleBool && !screenSizeCompatible) {
      promptRefresh = true;
    }

    deviceIsCompatibleBool = deviceIsCompatibleBool && screenSizeCompatible;
    if (screenWidthPx < minWidthPx) {
      needsUnmet.push("_needScreenWidthDeg");
    }
  } else if (minHeightPx > 0) {
    // non-zero minimum height
    // Internation phrase EE_compatibileScreenHeight - replace 111 with minHeightPx
    const ssMsg = readi18nPhrases(
      "EE_compatibleScreenHeight",
      Language,
    ).replace(/111/g, minHeightPx.toString());
    screenSizeMsg.push(ssMsg + ".\n\n");
    const screenSizeCompatible = screenHeightPx >= minHeightPx;
    if (deviceIsCompatibleBool && !screenSizeCompatible) {
      promptRefresh = true;
    }

    deviceIsCompatibleBool = deviceIsCompatibleBool && screenSizeCompatible;
    if (screenHeightPx < minHeightPx) {
      needsUnmet.push("_needScreenHeightDeg");
    }
  } else {
    // terminate the last sentence in compatibilityRequirements array with a period
    if (compatibilityRequirements.length > 0)
      compatibilityRequirements[compatibilityRequirements.length - 1] += "\n\n";
  }

  const describeScreenSize = readi18nPhrases("EE_describeScreenSize", Language)
    .replace(/111/g, screenWidthPx.toString())
    .replace(/222/g, screenHeightPx.toString());
  msg += describeScreenSize;
  msg += describeMemory;
  const describeDevice = msg;
  compatibilityRequirements.push(...screenSizeMsg);

  //create our message
  if (deviceIsCompatibleBool)
    msg = [readi18nPhrases("EE_compatible", Language)];
  else
    msg = [
      readi18nPhrases("EE_incompatible", Language),
      ...compatibilityRequirements,
    ];

  msg.push(describeDevice);
  if (MeasureMeters && MeasureMeters.needMeasureMeters > 0)
    msg.push(
      readi18nPhrases("EE_actualMeasureMeters", Language).replace(
        "111",
        MeasureMeters.canMeasureMeters,
      ),
    );

  // if (deviceIsCompatibleBool && isProlificPreviewExperiment())
  //   msg.push(readi18nPhrases("EE_incompatibleReturnToProlific", Language));

  //  if the study is compatible except for screen size, prompt to refresh
  if (promptRefresh) {
    msg.push(
      readi18nPhrases("EE_compatibleExceptForScreenResolution", Language)
        .replace(/111/g, screenWidthPx.toString())
        .replace(/222/g, screenHeightPx.toString())
        .replace(/333/g, minWidthPx.toString())
        .replace(/444/g, minHeightPx.toString()),
    );
  }

  const studyURL = window.location.toString();
  // remove the URLParams from the studyURL
  const studyURLNoParams = studyURL.split("?")[0];
  msg.push(`\n Study URL: ${studyURLNoParams} \n`);

  if (psychoJS && needsUnmet.length > 0) {
    const needsUnmetString = needsUnmet.join(",");
    psychoJS.experiment.addData("_needsUnmet", needsUnmetString);
    psychoJS.experiment.nextEntry();
  }
  return {
    msg: msg,
    proceed: deviceIsCompatibleBool,
    promptRefresh: promptRefresh,
  };
};

/**
 * 
 * When _needMeasureMeters>0 the Requirements page will show a box with a number next to the word EE_meters
”meters”
In the number box, show the value of _canMeasureMeters (from experiment spreadsheet) as the default. Display the number with one digit after the decimal, e.g. “1.0”. When edited, read the box’s edited value back into _canMeasureMeters.

Near the number box, show the explanation:
EE_needMeasureMeters
”This experiment requires a meter stick or metric measuring tape. Type in the maximum length, in meters, that you can measure, e.g. 1 or 2.5.”

The participant can pass the Requirements page if the value is greater than or equal to the required value, i.e.
_canMeasureMeters ≥ _needMeasureMeters
Otherwise the participant fails to meet requirements.
 */
export const displayNeedMeasureMetersInput = async (
  reader,
  Language,
  MeasureMeters,
) => {
  const msg = readi18nPhrases("EE_needMeasureMeters", Language);

  // create the input element
  const input = document.createElement("input");
  input.type = "number";
  input.value = MeasureMeters.canMeasureMeters;
  input.id = "canMeasureMeters";
  input.style.width = "50px";
  // input.style.marginLeft = "10px";
  //when input is changed, update the MeasureMeters.canMeasureMeters
  input.addEventListener("input", () => {
    MeasureMeters.canMeasureMeters = input.value;
  });

  // create the label element
  const label = document.createElement("label");
  label.htmlFor = "canMeasureMeters";
  label.innerText = readi18nPhrases("EE_meters", Language);
  label.style.marginLeft = "10px";

  // create the explanation element
  const explanation = document.createElement("p");
  explanation.innerText = msg;
  explanation.style.marginTop = "20px";

  //create a proceed button
  const proceedButton = document.createElement("button");
  proceedButton.innerText = readi18nPhrases("T_proceed", Language);
  proceedButton.style.marginLeft = "0px";
  proceedButton.style.marginTop = "20px";
  proceedButton.classList.add("form-input-btn");
  proceedButton.style.width = "auto";

  // //create title msg
  const titleMsg = document.createElement("h3");
  let T = readi18nPhrases("EE_compatibilityTitle", Language);
  // replace "xxx"  or "XXX" or "Xxx" with "EasyEyes"
  T = T.replace(/xxx/g, "EasyEyes");
  T = T.replace(/XXX/g, "EasyEyes");
  T = T.replace(/Xxx/g, "EasyEyes");
  titleMsg.innerHTML = T;

  // titleMsg.id = "compatibility-title";
  const titleContainer = document.createElement("div");
  titleContainer.style.textAlign = "left";
  titleContainer.style.marginBottom = "8px";
  titleContainer.appendChild(titleMsg);

  // append the elements to the document
  const container = document.createElement("div");
  container.style.zIndex = "999999";
  container.style.position = "absolute";
  container.style.top = "5vh";
  container.style.left = "20vw";
  container.style.width = "70vw";
  container.appendChild(titleContainer);
  container.appendChild(explanation);

  const inputContainer = document.createElement("div");
  inputContainer.style.display = "flex";
  inputContainer.style.alignItems = "baseline";
  inputContainer.appendChild(input);
  inputContainer.appendChild(label);
  container.appendChild(inputContainer);
  container.appendChild(proceedButton);
  document.body.appendChild(container);

  await new Promise((resolve) => {
    proceedButton.addEventListener("click", () => {
      container.remove();
      resolve();
    });
  });
};

export const getCompatibilityRequirements = (
  reader = null,
  Language,
  isForScientistPage,
  rc = null,
  parsed,
) => {
  //  If isForScientistPage is true, then the returned data will include deviceIsCompatibleBool.
  //  If isForScientistPage is false, then the returned data will not include deviceIsCompatibleBool - only the compatibility requirements as an array of strings (used in scientist page) - no rc is needed in this case.

  //values from the experiment table
  var compatibleBrowser,
    compatibleBrowserVersionMinimum,
    compatibleDevice,
    compatibleOS,
    compatibleProcessorCoresMinimum,
    needMeasureMeters;

  // const needsUnmet = [];

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
      "_needBrowserVersionMinimum",
    )[0];
    compatibleDevice = reader.read("_needDeviceType")[0].split(",");
    compatibleOS = reader.read("_needOperatingSystem")[0].split(",");
    compatibleProcessorCoresMinimum = reader.read(
      "_needProcessorCoresMinimum",
    )[0];
    // the above lists might have spaces in the beginning or end of the string, so we need to remove them
    compatibleBrowser = compatibleBrowser.map((item) => item.trim());
    compatibleDevice = compatibleDevice.map((item) => item.trim());
    compatibleOS = compatibleOS.map((item) => item.trim());
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
      2 * deviceInfo["computeRandomMHz"],
    );

  deviceInfo["deviceBrowserVersion"] =
    deviceInfo["deviceBrowserVersion"]?.split(".");
  if (deviceInfo["deviceBrowserVersion"]?.length >= 2)
    deviceInfo["deviceBrowserVersion"] = Number(
      deviceInfo["deviceBrowserVersion"][0] +
        "." +
        Math.round(deviceInfo["deviceBrowserVersion"][1] * 10) / 10,
    );
  else
    deviceInfo["deviceBrowserVersion"] = Number(
      deviceInfo["deviceBrowserVersion"][0],
    );

  if (deviceInfo["deviceSysFamily"] == "Mac")
    deviceInfo["deviceSysFamily"] = "macOS";
  if (deviceInfo["deviceBrowser"] == "Microsoft Edge")
    deviceInfo["deviceBrowser"] = "Edge";

  var deviceIsCompatibleBool = true;
  var msg = [];
  var check = false;
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
          check = compatibleOS.includes("not" + deviceInfo["deviceSysFamily"]);
          deviceIsCompatibleBool = deviceIsCompatibleBool && !check;
          if (check) {
            needsUnmet.push("_needOperatingSystem");
          }
          msg.push(readi18nPhrases("EE_compatibleNotOSDeviceCores", Language));
          break;
        default: // report compatible OSes
          check = compatibleOS.includes(deviceInfo["deviceSysFamily"]);
          deviceIsCompatibleBool = deviceIsCompatibleBool && check;
          if (!check) {
            needsUnmet.push("_needOperatingSystem");
          }
          msg.push(readi18nPhrases("EE_compatibleOSDeviceCores", Language));
          break;
      }
      break;
    case "not": //report incompatible browsers, ignore browser version
      check = compatibleBrowser.includes("not" + deviceInfo["deviceBrowser"]);
      deviceIsCompatibleBool = deviceIsCompatibleBool && !check;
      if (check) {
        needsUnmet.push("_needBrowser");
      }
      switch (OSCompatibilityType) {
        case "all": //ignore OSes
          msg.push(
            readi18nPhrases("EE_compatibleNotBrowserDeviceCores", Language),
          );
          break;
        case "not": //report incompatible OSes
          check = compatibleOS.includes("not" + deviceInfo["deviceSysFamily"]);
          deviceIsCompatibleBool = deviceIsCompatibleBool && !check;
          if (check) {
            needsUnmet.push("_needOperatingSystem");
          }
          msg.push(
            readi18nPhrases(
              "EE_compatibleNotBrowserNotOSDeviceCores",
              Language,
            ),
          );
          break;
        default: //report compatible OSes
          check = compatibleOS.includes(deviceInfo["deviceSysFamily"]);
          deviceIsCompatibleBool = deviceIsCompatibleBool && check;
          if (!check) {
            needsUnmet.push("_needOperatingSystem");
          }
          msg.push(
            readi18nPhrases("EE_compatibleNotBrowserOSDeviceCores", Language),
          );
          break;
      }
      break;
    default: // report compatible browsers
      check = compatibleBrowser.includes(deviceInfo["deviceBrowser"]);
      deviceIsCompatibleBool = deviceIsCompatibleBool && check;
      if (!check) {
        needsUnmet.push("_needBrowser");
      }
      switch (OSCompatibilityType) {
        case "all":
          if (compatibleBrowserVersionMinimum > 0) {
            //report browser version
            check =
              deviceInfo["deviceBrowserVersion"] >=
              compatibleBrowserVersionMinimum;
            deviceIsCompatibleBool = deviceIsCompatibleBool && check;
            if (!check) {
              needsUnmet.push("_needBrowserVersionMinimum");
            }
            msg.push(
              readi18nPhrases(
                "EE_compatibleBrowserVersionDeviceCores",
                Language,
              ),
            );
          } //ignore browser version
          else
            msg.push(
              readi18nPhrases("EE_compatibleBrowserDeviceCores", Language),
            );
          break;
        case "not": //report incompatible OSes
          check = compatibleOS.includes("not" + deviceInfo["deviceSysFamily"]);
          deviceIsCompatibleBool = deviceIsCompatibleBool && !check;
          if (check) {
            needsUnmet.push("_needOperatingSystem");
          }
          if (compatibleBrowserVersionMinimum > 0) {
            //report browser version
            check =
              deviceInfo["deviceBrowserVersion"] >=
              compatibleBrowserVersionMinimum;
            deviceIsCompatibleBool = deviceIsCompatibleBool && check;
            if (!check) {
              needsUnmet.push("_needBrowserVersionMinimum");
            }
            msg.push(
              readi18nPhrases("EE_compatibleBrowserNotOSDeviceCores", Language),
            );
          } //ignore browser version
          else
            msg.push(
              readi18nPhrases("EE_compatibleBrowserNotOSDeviceCores", Language),
            );
          break;
        default: //report compatible browsers
          check = compatibleOS.includes(deviceInfo["deviceSysFamily"]);
          deviceIsCompatibleBool = deviceIsCompatibleBool && check;
          if (!check) {
            needsUnmet.push("_needOperatingSystem");
          }
          if (compatibleBrowserVersionMinimum > 0) {
            //report browser version
            check =
              deviceInfo["deviceBrowserVersion"] >=
              compatibleBrowserVersionMinimum;
            deviceIsCompatibleBool = deviceIsCompatibleBool && check;
            if (!check) {
              needsUnmet.push("_needBrowserVersionMinimum");
            }
            msg.push(
              readi18nPhrases(
                "EE_compatibleBrowserVersionOSDeviceCores",
                Language,
              ),
            );
          } //ignore browser version
          else
            msg.push(
              readi18nPhrases("EE_compatibleBrowserOSDeviceCores", Language),
            );
          break;
      }
      break;
  }

  check = compatibleDevice.includes(deviceInfo["deviceType"]);
  deviceIsCompatibleBool = deviceIsCompatibleBool && check;
  if (!check) {
    needsUnmet.push("_needDeviceType");
  }

  check = deviceInfo["hardwareConcurrency"] >= compatibleProcessorCoresMinimum;
  deviceIsCompatibleBool = deviceIsCompatibleBool && check;
  if (!check) {
    needsUnmet.push("_needProcessorCoresMinimum");
  }

  // Check the ability to choose sound output, if required in this experiment
  if (reader) {
    check = checkBrowserSoundOutputSelectionSupport(reader);
    deviceIsCompatibleBool = deviceIsCompatibleBool && check;
    if (!check) {
      needsUnmet.push("_needSoundOutputSelectability");
    }
  }

  let describeMemory = "";
  if (!isForScientistPage) {
    const needMemoryGB = reader.read("_needMemoryGB")[0];
    msg.push(
      readi18nPhrases("EE_needMemory", Language)
        .replace("111", needMemoryGB)
        .replace("222", (Number(needMemoryGB) / 2).toFixed(0)),
    );

    const deviceMemoryGB = navigator.deviceMemory;
    if (deviceMemoryGB !== undefined) {
      check = deviceMemoryGB >= needMemoryGB;
      deviceIsCompatibleBool = deviceIsCompatibleBool && check;
      if (!check) {
        needsUnmet.push("_needMemoryGB");
        describeMemory =
          " " +
          readi18nPhrases("EE_needMemoryNotEnough", Language)
            .replace("111", needMemoryGB)
            .replace("222", deviceMemoryGB);
      } else {
        describeMemory =
          " " +
          readi18nPhrases("EE_needMemoryEnough", Language)
            .replace("111", needMemoryGB)
            .replace("222", deviceMemoryGB);
      }
    } else if (rc.systemFamily.value === "Windows") {
      //if OS is Windows, reject, else accept
      deviceIsCompatibleBool = false;
      needsUnmet.push("_needMemoryGB");
      describeMemory =
        " " + readi18nPhrases("EE_needBrowserSupportOfMemoryAPI", Language);
    }
  }

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
      StringOfItems(compatibleBrowser, Language),
    );
    arr[idx] = arr[idx].replace(/OOO/g, StringOfItems(compatibleOS, Language));
    arr[idx] = arr[idx].replace(
      /DDD/g,
      StringOfItems(compatibleDevice, Language),
    );
    arr[idx] = arr[idx].replace(
      /111/g,
      compatibleBrowserVersionMinimum.toString(),
    );
    arr[idx] = arr[idx].replace(
      /222/g,
      compatibleProcessorCoresMinimum.toString(),
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
    deviceInfo["deviceBrowserVersion"].toString(),
  );
  describeDevice = describeDevice.replace(
    /OOO/g,
    deviceInfo["deviceSysFamily"],
  );
  describeDevice = describeDevice.replace(/DDD/g, deviceInfo["deviceType"]);
  describeDevice = describeDevice.replace(
    /222/g,
    deviceInfo["hardwareConcurrency"] > 0
      ? deviceInfo["hardwareConcurrency"]
      : Math.round(2 * deviceInfo["computeRandomMHz"]),
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
    describeMemory: describeMemory,
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
    readi18nPhrases("EE_languageUsesSpacesBool", Language) === "TRUE"
      ? " "
      : "";
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
  needCalibratedSmartphoneMicrophone,
  needComputerSurveyBool,
  needCalibratedSound,
  psychoJS,
  quitPsychoJS,
  keypad,
  KeypadHandler, // creates an error if imported from the top
  _key_resp_event_handlers,
  _key_resp_allKeys,
) => {
  return new Promise(async (resolve) => {
    const needPhoneSurvey = reader.read("_needSmartphoneSurveyBool")[0];
    document.body.style.overflowX = "hidden";
    if (needComputerSurveyBool) {
      const thisDevice = await identifyDevice();
      psychoJS.experiment.addData(
        "ComputerInfoFrom51Degrees",
        JSON.stringify(thisDevice),
      );
      psychoJS.experiment.nextEntry();
    }

    //message wrapper
    const messageWrapper = document.createElement("div");
    messageWrapper.id = "msg-container";
    messageWrapper.style.display = "flex";
    messageWrapper.style.flexDirection = "column";
    messageWrapper.style.position = "absolute";
    messageWrapper.style.top = "0";
    // needPhoneSurvey || needCalibratedSmartphoneMicrophone ? "0" : "25vh";
    messageWrapper.style.right = "20vw";
    messageWrapper.style.left = "20vw";
    messageWrapper.style.minWidth = "60vw";
    messageWrapper.style.zIndex = "1000";
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
    titleContainer.style.marginBottom = "8px";
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
        rc.language.value,
      );
      refreshButton.addEventListener("click", () => {
        const language = readi18nPhrases(
          "EE_languageNameEnglish",
          rc.language.value,
        );
        const newMsg = checkSystemCompatibility(reader, language, rc);
        handleNewMessage(
          newMsg.msg,
          "compatibility-message",
          rc.language.value,
          false,
          null,
          false,
          false,
          proceedBool,
        );
        // update proceedBool
        proceedBool = newMsg.proceed;
      });
      messageWrapper.appendChild(refreshButton);
    }

    const languageWrapper = document.createElement("div");
    if (reader.read("_languageSelectionByParticipantBool")[0]) {
      // create language selection dropdown
      const LanguageTitle = document.createElement("p");
      LanguageTitle.style.fontSize = "1.1rem";
      LanguageTitle.style.fontWeight = "bold";
      LanguageTitle.innerHTML = readi18nPhrases(
        "EE_languageChoose",
        rc.language.value,
      );
      LanguageTitle.id = "language-title";
      LanguageTitle.style.marginTop = "0px";
      LanguageTitle.style.marginBottom = "5px";
      languageWrapper.appendChild(LanguageTitle);

      const languageDropdown = document.createElement("select");
      languageDropdown.id = "language-dropdown";
      languageDropdown.style.width = "fit-content";
      languageDropdown.style.backgroundColor = "#999";
      languageDropdown.style.color = "white";
      languageDropdown.style.borderRadius = "0.3rem";
      // languageDropdown.style.fontWeight = "bold";
      languageDropdown.style.marginLeft = "auto";

      const languages = readi18nPhrases("EE_languageNameNative");
      const languagesEnglishNames = readi18nPhrases("EE_languageNameEnglish");
      const languageOptions = Object.keys(languages).map((language) => {
        const option = document.createElement("option");
        option.value = languages[language];
        option.innerHTML =
          languagesEnglishNames[language] + " (" + languages[language] + ")";
        return option;
      });
      languageOptions.forEach((option) => languageDropdown.appendChild(option));
      languageDropdown.value = languages[rc.language.value];

      languageDropdown.addEventListener("change", async () => {
        const language = languageDropdown.value;
        const newMsg = await checkSystemCompatibility(
          reader,
          language,
          rc,
          false,
        );
        handleNewMessage(
          newMsg.msg,
          "compatibility-message",
          rc.language.value,
          needPhoneSurvey,
          compatibilityCheckPeer,
          needAnySmartphone,
          needCalibratedSmartphoneMicrophone,
          proceedBool,
        );
      });
      // top right corner
      languageWrapper.style.marginTop = "10px";
      // languageWrapper.style.marginRight = "20px";
      languageWrapper.style.textAlign = "right";

      languageWrapper.appendChild(languageDropdown);
      messageWrapper.prepend(languageWrapper);
    }

    document.body.prepend(messageWrapper);
    if (proceedBool) {
      const keypadTitle = document.createElement("div");
      keypadTitle.id = "virtual-keypad-title";
      keypadTitle.style.marginTop = "5px";
      keypadTitle.innerHTML = readi18nPhrases(
        "T_keypadScanQRCode",
        rc.language.value,
      );
      keypadTitle.style.display = "none";
      messageWrapper.appendChild(keypadTitle);
      keypad.handler = new KeypadHandler(reader);
      await keypad.handler.resolveWhenConnected();
    }
    if (compatibilityCheckPeer && proceedBool) {
      if (needPhoneSurvey) await fetchAllPhoneModels();
      const compatiblityCheckQR = await compatibilityCheckPeer.getQRCodeElem();
      const qrlink = await compatibilityCheckPeer.getQRLink();
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
      compatibilityCheckQRExplanation.style.marginBottom = "0px";
      compatibilityCheckQRExplanation.style.marginTop = "10px";
      let messageForQr = getMessageForQR(
        needAnySmartphone,
        needCalibratedSmartphoneMicrophone,
        needPhoneSurvey,
        rc.language.value,
      );
      compatibilityCheckQRExplanation.innerHTML = messageForQr;

      const displayUpdate = document.createElement("p");
      displayUpdate.style.display = "none";
      messageWrapper.appendChild(displayUpdate);
      messageWrapper.append(compatibilityCheckQRExplanation);
      const {
        qrContainer,
        cantReadButton,
        preferNotToReadButton,
        noSmartphoneButton,
        explanation,
      } = addQRSkipButtons(
        rc.language.value,
        compatiblityCheckQR,
        qrlink,
        needPhoneSurvey,
      );
      messageWrapper.append(
        // needPhoneSurvey ? qrContainer : compatiblityCheckQR,
        qrContainer,
      );
      cantReadButton.addEventListener("click", async () => {
        await handleCantReadQR(
          QRSkipResponse,
          messageWrapper,
          rc,
          psychoJS,
          needPhoneSurvey,
          compatiblityCheckQR,
          compatibilityCheckQRExplanation,
          languageWrapper,
          titleContainer,
          elem,
          needCalibratedSound,
          numberOfTries,
          qrContainer,
          displayUpdate,
          needComputerSurveyBool,
          "✖Cannot",
          false,
          resolve,
          needCalibratedSmartphoneMicrophone,
          cantReadButton,
          noSmartphoneButton,
          explanation,
        );
      });
      preferNotToReadButton.addEventListener("click", async () => {
        QRSkipResponse.QRPreferNotToBool = true;
        psychoJS.experiment.addData("QRConnect", "✖PreferNot");
        psychoJS.experiment.nextEntry();
        const proceed = await isSmartphoneInDatabase(
          "",
          messageWrapper,
          rc.language.value,
          displayUpdate,
          {},
          needPhoneSurvey,
          compatiblityCheckQR,
          compatibilityCheckQRExplanation,
          languageWrapper,
          titleContainer,
          elem,
          needCalibratedSound,
          numberOfTries,
          {},
          qrContainer,
        );
        if (proceed) {
          if (needPhoneSurvey) {
            if (needComputerSurveyBool) {
              await getLoudspeakerDeviceDetailsFromUser(
                messageWrapper,
                rc.language.value,
              );
            }
            resolve({
              proceedButtonClicked: true,
              proceedBool: true,
              mic: microphoneInfo,
              loudspeaker: loudspeakerInfo,
              gotLoudspeakerMatchBool: false,
            });
          }
        }
      });
      noSmartphoneButton.addEventListener("click", async () => {
        QRSkipResponse.QRNoSmartphoneBool = true;
        psychoJS.experiment.addData("QRConnect", "✖NoPhone");
        if (needPhoneSurvey) {
          needsUnmet.push("_needSmartphoneSurveyBool");
          if (psychoJS && needsUnmet.length > 0) {
            const needsUnmetString = needsUnmet.join(",");
            psychoJS.experiment.addData("_needsUnmet", needsUnmetString);
            psychoJS.experiment.nextEntry();
          }
        }
        quitPsychoJS("", false, reader, !isProlificExperiment(), false);
        showExperimentEnding(true, isProlificExperiment(), rc.language.value);
      });
      let numberOfTries = 0;

      try {
        while (true) {
          console.log("waiting for compatibilityCheckPeer");
          const result = await compatibilityCheckPeer.getResults();
          compatibilityCheckPeer.onPeerClose();
          if (result) {
            console.log("result", result);
            QRSkipResponse.QRBool = true;
            psychoJS.experiment.addData("QRConnect", "✔");
            psychoJS.experiment.nextEntry();
            numberOfTries++;
            const tryComputerButton = document.getElementById(
              "try-computer-button",
            );
            const p = document.getElementById("loudspeaker-instead");
            if (tryComputerButton) {
              tryComputerButton.style.display = "none";
            }
            if (p) {
              p.style.display = "none";
            }
            const deviceDetails = result.deviceDetails;
            const OEM = deviceDetails.OEM;
            const screenSizes = result.screenSizes;
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
              elem,
              needCalibratedSound,
              numberOfTries,
              screenSizes,
              qrContainer,
              needCalibratedSmartphoneMicrophone,
              cantReadButton,
              noSmartphoneButton,
              explanation,
            );
            if (proceed) {
              if (needPhoneSurvey) {
                if (needComputerSurveyBool) {
                  await getLoudspeakerDeviceDetailsFromUser(
                    messageWrapper,
                    rc.language.value,
                  );
                }
                resolve({
                  proceedButtonClicked: true,
                  proceedBool: true,
                  mic: microphoneInfo,
                  loudspeaker: loudspeakerInfo,
                  gotLoudspeakerMatchBool: false,
                });
              }
              break;
            } else {
              // if needCalibratedSound includes "loudspeaker"
              // add a button to try the computer microphone
              if (
                needCalibratedSound.includes("loudspeaker") &&
                !needPhoneSurvey
              ) {
                if (numberOfTries === 1) {
                  const p = document.createElement("p");
                  p.innerText = readi18nPhrases(
                    "RC_loudspeakerInstead",
                    rc.language.value,
                  );
                  p.id = "loudspeaker-instead";
                  messageWrapper.appendChild(p);
                  const tryComputerButton = document.createElement("button");
                  tryComputerButton.classList.add(...["btn", "btn-success"]);
                  tryComputerButton.innerText = readi18nPhrases(
                    "RC_tryComputer",
                    rc.language.value,
                  );
                  tryComputerButton.id = "try-computer-button";
                  // tryComputerButton.style.marginTop = "10px";
                  tryComputerButton.style.width = "fit-content";
                  tryComputerButton.addEventListener("click", async () => {
                    compatiblityCheckQR.style.display = "none";
                    compatibilityCheckQRExplanation.style.display = "none";
                    const text = document.getElementById("loudspeaker-instead");
                    text.style.display = "none";
                    displayUpdate.style.display = "none";
                    tryComputerButton.style.display = "none";
                    const loudspeaker =
                      await getLoudspeakerDeviceDetailsFromUser(
                        messageWrapper,
                        rc.language.value,
                        false,
                      );
                    if (loudspeaker) {
                      loudspeakerInfo.loudspeaker = loudspeaker;
                      await new Promise((resolve) => {
                        const proceed = document.createElement("button");
                        proceed.classList.add(...["btn", "btn-success"]);
                        proceed.style.width = "fit-content";
                        proceed.innerText = readi18nPhrases(
                          "T_proceed",
                          rc.language.value,
                        );
                        proceed.addEventListener("click", () => {
                          resolve();
                        });
                        const message = document.createElement("p");
                        message.innerText = readi18nPhrases(
                          "RC_loudspeakerIsInCalibrationLibrary",
                          rc.language.value,
                        )
                          .replace(/XXX/g, loudspeaker.fullLoudspeakerModelName)
                          .replace(
                            /xxx/g,
                            loudspeaker.fullLoudspeakerModelName,
                          );
                        message.style.marginTop = "10px";

                        messageWrapper.appendChild(message);
                        messageWrapper.appendChild(proceed);
                      });
                      resolve({
                        proceedButtonClicked: true,
                        proceedBool: true,
                        mic: microphoneInfo,
                        loudspeaker: loudspeakerInfo,
                        gotLoudspeakerMatchBool: true,
                      });
                    }
                  });
                  messageWrapper.appendChild(tryComputerButton);
                } else if (numberOfTries > 1) {
                  const tryComputerButton = document.getElementById(
                    "try-computer-button",
                  );
                  const p = document.getElementById("loudspeaker-instead");
                  if (tryComputerButton) {
                    tryComputerButton.style.display = "";
                  }
                  if (p) {
                    p.style.display = "";
                  }
                }
              }
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
    } else if (proceedBool) {
      if (needComputerSurveyBool) {
        if (languageWrapper) {
          languageWrapper.remove();
        }
        titleContainer.remove();
        elem.remove();
        await getLoudspeakerDeviceDetailsFromUser(
          messageWrapper,
          rc.language.value,
        );
        resolve({
          proceedButtonClicked: true,
          proceedBool: true,
          mic: microphoneInfo,
          loudspeaker: loudspeakerInfo,
          gotLoudspeakerMatchBool: false,
        });
      }
    }

    //create proceed button
    const buttonWrapper = document.createElement("div");
    const proceedButton = document.createElement("button");
    const isSoundCalibration =
      ifTrue(
        reader.read(GLOSSARY.calibrateSound1000HzBool.name, "__ALL_BLOCKS__"),
      ) ||
      ifTrue(
        reader.read(GLOSSARY.calibrateSoundAllHzBool.name, "__ALL_BLOCKS__"),
      );
    if (isSoundCalibration) {
      buttonWrapper.style.textAlign = "left";
      proceedButton.classList.add(...["btn", "btn-success"]);
    } else {
      buttonWrapper.style.textAlign = "center";
      proceedButton.classList.add("form-input-btn");
    }
    proceedButton.style.width = "fit-content";
    proceedButton.style.margin = "5rem 0";
    proceedButton.id = "procced-btn";
    proceedButton.innerHTML = proceedBool
      ? readi18nPhrases("T_proceed", rc.language.value)
      : readi18nPhrases("EE_Cancel", rc.language.value);
    proceedButton.addEventListener("click", () => {
      document.getElementById("root").style.display = "";
      resolve({
        proceedButtonClicked: true,
        proceedBool: proceedBool,
        mic: microphoneInfo,
        loudspeaker: loudspeakerInfo,
        gotLoudspeakerMatchBool: false,
      });
    });
    buttonWrapper.appendChild(proceedButton);
    messageWrapper.appendChild(buttonWrapper);

    // Function to add event handlers
    const onVariableChange_key_resp_allKeys = (callback) => {
      _key_resp_event_handlers.current.push(callback);
      // Return a function to remove the specific handler
      return () => {
        _key_resp_event_handlers.current =
          _key_resp_event_handlers.current.filter(
            (handler) => handler !== callback,
          );
      };
    };

    // Function to clear all event handlers
    const clearAllHandlers_key_resp_allKeys = () => {
      _key_resp_event_handlers.current = [];
    };

    const removeHandler = onVariableChange_key_resp_allKeys((newValue) => {
      if (_key_resp_allKeys.current.map((r) => r.name).includes("return")) {
        const proceedButton = document.getElementById("procced-btn");
        if (proceedButton) {
          removeHandler();
          clearAllHandlers_key_resp_allKeys();
          proceedButton.click();
        }
      }
    });
  });
};

if (typeof document !== "undefined") {
  document.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      const proceedButton = document.getElementById("procced-btn");
      if (proceedButton) {
        proceedButton.click();
      }
    }
  });
}

export const handleCantReadQR = async (
  QRSkipResponse,
  messageWrapper,
  rc,
  psychoJS,
  needPhoneSurvey,
  compatiblityCheckQR,
  compatibilityCheckQRExplanation,
  languageWrapper,
  titleContainer,
  elem,
  needCalibratedSound,
  numberOfTries,
  qrContainer,
  displayUpdate,
  needComputerSurveyBool,
  QRConnectMessage,
  onError = false,
  resolve,
  needCalibratedSmartphoneMicrophone,
  cantReadButton = null,
  noSmartphoneButton = null,
  explanation = null,
) => {
  QRSkipResponse.QRCantBool = true;
  psychoJS.experiment.addData("QRConnect", QRConnectMessage);
  psychoJS.experiment.nextEntry();
  const proceed = await isSmartphoneInDatabase(
    "",
    messageWrapper,
    rc.language.value,
    displayUpdate,
    {},
    needPhoneSurvey,
    compatiblityCheckQR,
    compatibilityCheckQRExplanation,
    languageWrapper,
    titleContainer,
    elem,
    needCalibratedSound,
    numberOfTries,
    {},
    qrContainer,
    needCalibratedSmartphoneMicrophone,
    cantReadButton,
    noSmartphoneButton,
    explanation,
  );
  if (proceed) {
    if (needPhoneSurvey) {
      if (needComputerSurveyBool) {
        await getLoudspeakerDeviceDetailsFromUser(
          messageWrapper,
          rc.language.value,
        );
      }
      if (onError) {
        return {
          proceedButtonClicked: true,
          proceedBool: true,
          mic: microphoneInfo,
          loudspeaker: loudspeakerInfo,
          gotLoudspeakerMatchBool: false,
        };
      } else {
        resolve({
          proceedButtonClicked: true,
          proceedBool: true,
          mic: microphoneInfo,
          loudspeaker: loudspeakerInfo,
          gotLoudspeakerMatchBool: false,
        });
      }
    } else {
      resolve({
        proceedButtonClicked: true,
        proceedBool: true,
        mic: microphoneInfo,
        loudspeaker: loudspeakerInfo,
        gotLoudspeakerMatchBool: false,
      });
    }
  }
};

export const handleCantReadQROnError = async (
  rc,
  psychoJS,
  needPhoneSurvey,
  needCalibratedSound,
  needComputerSurveyBool,
  resolve = ({}) => {},
) => {
  await fetchAllPhoneModels();
  const messageWrapper = document.getElementById("msg-container");
  const displayUpdate = document.createElement("p");
  displayUpdate.style.display = "none";
  messageWrapper.appendChild(displayUpdate);
  const titleContainer = document.getElementById("title-container");
  const languageWrapper = document.getElementById("language-wrapper");
  const elem = document.getElementById("compatibility-message");
  return await handleCantReadQR(
    QRSkipResponse,
    messageWrapper,
    rc,
    psychoJS,
    needPhoneSurvey,
    null,
    null,
    languageWrapper,
    titleContainer,
    elem,
    needCalibratedSound,
    0,
    null,
    displayUpdate,
    needComputerSurveyBool,
    "✖Cannot-Error_In_Peer_Connection",
    true,
    resolve,
  );
};

const getMessageForQR = (
  needAnySmartphone,
  needCalibratedSmartphoneMicrophone,
  needPhoneSurvey,
  language,
) => {
  let messageForQr = "";
  if (needAnySmartphone && needCalibratedSmartphoneMicrophone) {
    messageForQr = readi18nPhrases("RC_inDescription", language) + " ";
    needPhoneSurvey
      ? (messageForQr += readi18nPhrases("RC_needPhoneSurvey", language))
      : (messageForQr += readi18nPhrases(
          "RC_needPhoneMicrophoneAndKeypad",
          language,
        ));
    messageForQr += " " + readi18nPhrases("RC_needsPointCameraAtQR", language);
  } else if (needCalibratedSmartphoneMicrophone) {
    messageForQr = readi18nPhrases("RC_inDescription", language) + " ";
    needPhoneSurvey
      ? (messageForQr +=
          readi18nPhrases("RC_needPhoneSurvey", language) +
          "<br>" +
          `<p style="margin-top:10px; margin-bottom:10px">${readi18nPhrases(
            "RC_needPhoneSurveyParticipate",
            language,
          )}</p>`)
      : (messageForQr +=
          readi18nPhrases("RC_needPhoneMicrophone", language) +
          " " +
          readi18nPhrases("RC_lookForMicrophoneProfile", language));
  } else if (needAnySmartphone) {
    messageForQr = readi18nPhrases("RC_inDescription", language) + " ";
    needPhoneSurvey
      ? (messageForQr += readi18nPhrases("RC_needPhoneSurvey", language))
      : (messageForQr += readi18nPhrases("RC_needPhoneKeypad", language));
    messageForQr += " " + readi18nPhrases("RC_needsPointCameraAtQR", language);
  }
  //  + readi18nPhrases("RC_needPhoneSurveyParticipate",language)
  return messageForQr;
};
const checkModelNumberandNameForIOS = (
  modelNumber,
  modelName,
  platformName,
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
  elem = null,
  needCalibratedSound = [],
  numberOfTries = 0,
  screenSizes = { width: 0, height: 0 },
  qrContainer = null,
  needCalibratedSmartphoneMicrophone = false,
  cantReadButton = null,
  noSmartphoneButton = null,
  explanation = null,
) => {
  // ask for the model number and name of the device
  // create input box for model number and name
  // hide  the QR code and explanation
  const img = document.createElement("img");
  if (needPhoneSurvey) {
    if (qrCodeDisplay) qrCodeDisplay.remove();
    if (qrCodeExplanation) qrCodeExplanation.remove();
    if (qrContainer) qrContainer.remove();
    if (languageWrapper) {
      languageWrapper.remove();
    }
    if (titleContainer) titleContainer.remove();
    if (elem) elem.remove();
    // center messageWrapper
    messageWrapper.style.top = "5vh";
    // messageWrapper.style.marginLeft = "20vw";
    // messageWrapper.style.marginRight = "20vw";
  } else {
    if (languageWrapper) {
      languageWrapper.remove();
    }
    elem.style.display = "none";
    qrCodeDisplay.style.display = "none";
    qrCodeExplanation.style.display = "none";
    if (qrContainer) qrContainer.style.display = "none";
    if (cantReadButton) cantReadButton.style.display = "none";
    if (noSmartphoneButton) noSmartphoneButton.style.display = "none";
    if (explanation) explanation.style.display = "none";
    if (titleContainer) titleContainer.style.display = "none";
    // titleContainer.style.margin = "0px";
    messageWrapper.style.top = "5vh";
  }
  const { preferredModelNumber, preferredModelName } =
    getPreferredModelNumberAndName(OEM, deviceDetails.PlatformName, lang);

  const preferredModelNumberLowerCase = getPreferredModelNumberAndName(
    OEM,
    deviceDetails.PlatformName,
    lang,
    true,
  )["preferredModelNumber"];

  const brandInput = document.createElement("input");
  brandInput.type = "text";
  brandInput.id = "brandInput";
  brandInput.name = "brandInput";
  brandInput.placeholder = readi18nPhrases("RC_brand", lang);
  brandInput.value = OEM === ("Unknown" || "undefined") ? "" : OEM;

  const modelNumberInput = document.createElement("input");
  modelNumberInput.type = "text";
  modelNumberInput.id = "modelNumberInput";
  modelNumberInput.name = "modelNumberInput";
  modelNumberInput.placeholder = preferredModelNumber;

  const modelNameInput = document.createElement("input");
  modelNameInput.type = "text";
  modelNameInput.id = "modelNameInput";
  modelNameInput.name = "modelNameInput";
  modelNameInput.placeholder = preferredModelName;

  const instructionText = getInstructionText(
    deviceDetails,
    lang,
    true,
    false,
    preferredModelNumberLowerCase,
    needPhoneSurvey,
    OEM,
  );
  const p = document.createElement("p");
  // add id for p
  p.id = "need-phone-survey-instruction";
  p.style.marginBottom = "20px";
  p.innerHTML = instructionText.replace(/(?:\r\n|\r|\n)/g, "<br>");

  const checkButton = document.createElement("button");
  checkButton.classList.add(...["btn", "btn-success"]);
  checkButton.style.marginTop = "25px";
  checkButton.innerText = readi18nPhrases("T_proceed", lang);
  checkButton.style.width = "fit-content";

  const modelNumberWrapper = document.createElement("div");
  // modelNumberWrapper.style.marginTop = "20px";
  messageWrapper.appendChild(p);
  modelNumberWrapper.appendChild(brandInput);
  const brandSuggestionsContainer = getAutoCompleteSuggestionElements(
    "Brand",
    AllBrands,
    brandInput,
    preferredModelNumberLowerCase,
    deviceDetails,
    lang,
    needPhoneSurvey,
    p,
    img,
    modelNameInput,
    modelNumberInput,
    needPhoneSurvey,
  );
  modelNumberWrapper.appendChild(brandSuggestionsContainer);
  modelNumberWrapper.appendChild(modelNameInput);

  const modelNameSuggestionsContainer = getAutoCompleteSuggestionElements(
    "ModelName",
    AllModelNames,
    modelNameInput,
    preferredModelNumberLowerCase,
    deviceDetails,
    lang,
    needPhoneSurvey,
    p,
    img,
    modelNameInput,
    modelNumberInput,
    needPhoneSurvey,
  );
  modelNumberWrapper.appendChild(modelNameSuggestionsContainer);

  modelNumberWrapper.appendChild(modelNumberInput);

  const modelNumberSuggestionsContainer = getAutoCompleteSuggestionElements(
    "ModelNumber",
    AllModelNumbers,
    modelNumberInput,
    preferredModelNumberLowerCase,
    deviceDetails,
    lang,
    needPhoneSurvey,
    p,
    img,
    modelNameInput,
    modelNumberInput,
    needPhoneSurvey,
  );
  modelNumberWrapper.appendChild(modelNumberSuggestionsContainer);

  modelNumberWrapper.appendChild(checkButton);
  if (needPhoneSurvey || needCalibratedSmartphoneMicrophone) {
    // insert image of iOS settings
    img.src = "./components/images/ios_settings.png";
    img.style.width = "30%";
    img.style.margin = "auto";
    img.style.marginBottom = "30px";
    if (deviceDetails?.PlatformName === "iOS" || brandInput.value === "Apple") {
      img.style.visibility = "visible";
    } else {
      img.style.visibility = "hidden";
    }
    // messageWrapper.appendChild(img);
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.justifyContent = "center";
    container.appendChild(modelNumberWrapper);
    container.appendChild(img);
    messageWrapper.appendChild(container);
  } else {
    messageWrapper.appendChild(modelNumberWrapper);
  }

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
          deviceDetails.PlatformName,
        );
        if (!valid) {
          p.innerHTML =
            instructionText +
            "<br>" +
            "<br>" +
            '<span class="highlight-red">' +
            readi18nPhrases("RC_wrongIPhoneModel", lang) +
            "</span>";
        } else {
          if (needPhoneSurvey) {
            // add microphone details to microphoneInfo.phoneSurvey array
            const smallerNumber = Math.min(
              screenSizes.width,
              screenSizes.height,
            );
            const largerNumber = Math.max(
              screenSizes.width,
              screenSizes.height,
            );
            const match = await matchPhoneModelInDatabase(
              brandInput.value,
              modelName,
              modelNumber,
              smallerNumber,
              largerNumber,
            );
            microphoneInfo.phoneSurvey = {
              smartphoneManufacturer: brandInput.value,
              smartphoneModelName: modelName,
              smartphoneModelNumber: modelNumber,
              smartphoneInfoFrom51Degrees: deviceDetails,
              smartphoneScreenSizePx: screenSizes,
              smartphoneMatch: match,
            };
            p.innerHTML = readi18nPhrases("RC_smartphoneSurveyEnd", lang);
            // center p
            // messageWrapper.style.textAlign = "center";
            modelNumberInput.remove();
            modelNameInput.remove();
            checkButton.remove();
            img.remove();
            brandInput.remove();
            resolve(true);
          } else {
            const exists = await doesMicrophoneExistInFirestore(
              modelNumber,
              brandInput.value.toLowerCase().split(" ").join(""),
            );
            modelNumberInput.remove();
            modelNameInput.remove();
            checkButton.remove();
            p.remove();
            img.remove();
            brandInput.remove();
            if (exists) {
              elem.style.display = "";
              elem.innerText = readi18nPhrases(
                "RC_microphoneIsInCalibrationLibrary",
                lang,
              ).replace("xxx", OEM + " " + modelName);
              if (languageWrapper) languageWrapper.remove();
              microphoneInfo.micFullName = modelName;
              microphoneInfo.micFullSerialNumber = modelNumber;
              microphoneInfo.micrFullManufacturerName = OEM;
              resolve(true);
            } else {
              // restore the QR code and explanation
              qrCodeDisplay.style.display = "";
              displayUpdate.style.display = "";
              if (qrContainer) qrContainer.style.display = "";
              if (noSmartphoneButton) {
                noSmartphoneButton.style.display = "";
                noSmartphoneButton.style.marginTop = "5px";
                noSmartphoneButton.style.width = "60px";
              }
              const container = document.getElementById("skipQRContainer");
              if (container) {
                container.style = {
                  // display: "flex",
                  // flexDirection: "column"
                };
              }
              displayUpdate.innerText =
                displayUpdate.innerText +
                "<br><br>" +
                readi18nPhrases(
                  "RC_microphoneNotInCalibrationLibrary",
                  lang,
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

const findLoudspeakerMatchInDatabase = async (OEM, DeviceId, ModelNumber) => {
  // check for a loudspeaker with the same OEM, DeviceId and ModelNumber.
  // If exists return the loudspeaker object from the database, otherwise return false
  const loudspeakerRef = collection(db, "Loudspeakers");
  const q = query(
    loudspeakerRef,
    where("OEM", "==", OEM),
    where("DeviceId", "==", DeviceId),
    where("fullLoudspeakerModelNumber", "==", ModelNumber),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return false;
  }
  const loudspeaker = snapshot.docs[0].data();
  return loudspeaker;
};
export const hideCompatibilityMessage = () => {
  document.getElementById("msg-container")?.remove();
};

export const handleLanguage = (lang, rc, useEnglishNames = true) => {
  // convert to language code
  const Languages = useEnglishNames
    ? readi18nPhrases("EE_languageNameEnglish")
    : readi18nPhrases("EE_languageNameNative");
  const languageCode = Object.keys(Languages).find(
    (key) => Languages[key] === lang,
  );

  // set language code
  if (languageCode) {
    rc.newLanguage(languageCode);
  }
};

const handleNewMessage = (
  msg,
  msgID,
  lang,
  needPhoneSurvey = false,
  compatibilityCheckPeer = null,
  needAnySmartphone = false,
  needCalibratedSmartphoneMicrophone = false,
  proceedBool = false,
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
  if (proceedButton) {
    proceedButton.innerHTML = proceedBool
      ? readi18nPhrases("T_proceed", lang)
      : readi18nPhrases("EE_Cancel", lang);
  }

  const keypadTitle = document.getElementById("virtual-keypad-title");
  if (keypadTitle) {
    keypadTitle.childNodes[0].textContent = readi18nPhrases(
      "T_keypadScanQRCode",
      lang,
    );
  }

  if (needPhoneSurvey || compatibilityCheckPeer) {
    let qrCodeExplanation = document.getElementById(
      "compatibility-qr-explanation",
    );
    if (qrCodeExplanation) {
      let messageForQr = getMessageForQR(
        needAnySmartphone,
        needCalibratedSmartphoneMicrophone,
        needPhoneSurvey,
        lang,
      );
      qrCodeExplanation.innerHTML = messageForQr;
    }

    const skipQRExplanation = document.getElementById("skipQRExplanation");
    if (skipQRExplanation) {
      skipQRExplanation.innerHTML = readi18nPhrases(
        "RC_skipQR_ExplanationWithoutPreferNot",
        lang,
      );
      skipQRExplanation.style.marginTop = "13px";
    }

    const cantReadButton = document.getElementById("cantReadButton");
    if (cantReadButton) {
      cantReadButton.innerHTML = readi18nPhrases(
        "RC_cantReadQR_Button",
        lang,
      ).replace(" ", "<br>");
    }
    const preferNotToReadButton = document.getElementById(
      "preferNotToReadButton",
    );
    if (preferNotToReadButton) {
      preferNotToReadButton.innerHTML = readi18nPhrases(
        "RC_preferNotToReadQR_Button",
        lang,
      );
    }
    const noSmartphoneButton = document.getElementById("noSmartphoneButton");
    if (noSmartphoneButton) {
      noSmartphoneButton.innerHTML = readi18nPhrases(
        "RC_noSmartphone_Button",
        lang,
      ).replace(" ", "<br>");
    }

    const keypadQR = document.getElementById("virtual-keypad-title");
    if (keypadQR) {
      keypadQR.innerHTML = readi18nPhrases("RC_PhoneConnected2", lang);
    }
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
    (key) => Languages[key] === language,
  );
  return languageCode ? languageCode : "en-US";
};

const getLoudspeakerDeviceDetailsFromUser = async (
  elems,
  language,
  isSurvey = true,
) => {
  const p = document.getElementById("need-phone-survey-instruction");
  if (p) {
    p.style.display = "none";
  }
  const thisDevice = await identifyDevice();
  const { preferredModelNumber, preferredModelName } =
    getPreferredModelNumberAndName(
      thisDevice.OEM,
      thisDevice.PlatformName,
      language,
    );

  const { preferredModelNumberLowerCase } = getPreferredModelNumberAndName(
    thisDevice.OEM,
    thisDevice.PlatformName,
    language,
    true,
  );
  // display the device info
  const deviceString = getDeviceString(thisDevice, language);
  const instructionText = getInstructionText(
    thisDevice,
    language,
    false,
    false,
    preferredModelNumberLowerCase,
    false,
    thisDevice.OEM,
    true,
  );

  // create title
  const title = document.createElement("h2");
  title.innerHTML = isSurvey ? "Survey" : "";
  title.style.fontSize = "1.5rem";
  elems.appendChild(title);
  // create subtitle
  const subtitle = document.createElement("h3");
  subtitle.innerHTML = readi18nPhrases("RC_yourComputer", language)
    .replace("xxx", thisDevice.OEM === "Unknown" ? "" : thisDevice.OEM)
    .replace("yyy", thisDevice.DeviceType);
  subtitle.style.fontSize = "1.1rem";
  subtitle.style.marginBottom = "0px";
  elems.appendChild(subtitle);

  const BrandInput = document.createElement("input");
  BrandInput.type = "text";
  BrandInput.id = "brandInput";
  BrandInput.name = "brandInput";
  BrandInput.placeholder = readi18nPhrases("RC_brand", language);
  BrandInput.value = thisDevice.OEM === "Unknown" ? "" : thisDevice.OEM;
  BrandInput.style.marginBottom = "0px";
  BrandInput.addEventListener("input", () => {
    const inst = getInstructionText(
      thisDevice,
      language,
      false,
      false,
      preferredModelNumberLowerCase,
      false,
      BrandInput.value,
      true,
    );
    const p = document.getElementById("loudspeakerInstructions2");
    p.innerHTML = inst.replace(/(?:\r\n|\r|\n)/g, "<br>");
  });

  // create input box for model number and name
  const modelNumberInput = document.createElement("input");
  modelNumberInput.type = "text";
  modelNumberInput.id = "modelNumberInput";
  modelNumberInput.name = "modelNumberInput";
  modelNumberInput.placeholder = preferredModelNumber;
  modelNumberInput.style.marginBottom = "10px";

  const modelNameInput = document.createElement("input");
  modelNameInput.type = "text";
  modelNameInput.id = "modelNameInput";
  modelNameInput.name = "modelNameInput";
  modelNameInput.placeholder = preferredModelName;
  modelNameInput.style.marginBottom = "0px";

  const deviceStringElem = document.createElement("p");
  deviceStringElem.id = "loudspeakerInstructions1";
  deviceStringElem.innerHTML = deviceString;
  deviceStringElem.style.marginBottom = "5px";
  deviceStringElem.style.marginTop = "5px";

  const findModel = document.createElement("p");
  findModel.id = "loudspeakerInstructions2";
  findModel.innerHTML = instructionText;
  findModel.style.marginBottom = "0px";

  const proceedButton = document.createElement("button");
  proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
  proceedButton.classList.add(...["btn", "btn-success"]);
  proceedButton.style.width = "fit-content";

  // add  to the page
  elems.appendChild(findModel);
  elems.appendChild(BrandInput);
  elems.appendChild(modelNameInput);
  elems.appendChild(modelNumberInput);
  elems.appendChild(proceedButton);
  let Loudspeaker = null;
  await new Promise((resolve) => {
    proceedButton.addEventListener("click", async () => {
      if (
        modelNameInput.value === "" ||
        modelNumberInput.value === "" ||
        BrandInput.value === ""
      ) {
        alert("Please fill out all the fields");
      } else {
        proceedButton.innerHTML = "Loading...";
        if (isSurvey) {
          // add loudspeaker details to loudspeakerInfo
          loudspeakerInfo.modelName = modelNameInput.value;
          loudspeakerInfo.modelNumber = modelNumberInput.value;
          loudspeakerInfo.Brand = BrandInput.value;
          loudspeakerInfo.detailsFrom51Degrees = thisDevice;
          removeElements([
            findModel,
            modelNameInput,
            modelNumberInput,
            deviceStringElem,
            proceedButton,
            title,
            subtitle,
          ]);
          resolve();
        } else {
          // check if the loudspeaker is in the database
          const loudspeaker = await findLoudspeakerMatchInDatabase(
            thisDevice.OEM,
            thisDevice.DeviceId,
            modelNumberInput.value,
          );
          if (loudspeaker) {
            Loudspeaker = loudspeaker;
            removeElements([
              findModel,
              modelNameInput,
              modelNumberInput,
              deviceStringElem,
              proceedButton,
              title,
              subtitle,
            ]);
            resolve();
          } else {
            alert("The loudspeaker is not in the database");
          }
        }
      }
      proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
    });
  });
  return Loudspeaker;
};

const identifyDevice = async () => {
  return new Promise((resolve) => {
    if (!isFodLoaded) {
      const script = document.createElement("script");
      script.src = "https://cloud.51degrees.com/api/v4/AQSjtocC5XcfFwKc20g.js";
      script.type = "text/javascript";
      script.async = true;
      script.crossOrigin = "crossorigin";
      document.head.appendChild(script);
      script.onload = () => {
        isFodLoaded = true;
        try {
          const deviceInfo = {};
          fod.complete(function (data) {
            deviceInfo["IsMobile"] = data.device["ismobile"];
            deviceInfo["HardwareName"] = data.device["hardwarename"];
            deviceInfo["HardwareFamily"] = data.device["hardwarefamily"];
            deviceInfo["HardwareModel"] = data.device["hardwaremodel"];
            deviceInfo["OEM"] = data.device["oem"];
            deviceInfo["HardwareModelVariants"] =
              data.device["hardwaremodelvariants"];
            deviceInfo["DeviceId"] = data.device["deviceid"];
            deviceInfo["PlatformName"] = data.device["platformname"];
            deviceInfo["PlatformVersion"] = data.device["platformversion"];
            deviceInfo["DeviceType"] = data.device["devicetype"];
            resolve(deviceInfo);
          });
        } catch (error) {
          console.error("Error fetching or executing script:", error.message);
          return null;
        }
      };
    }
    try {
      const deviceInfo = {};
      fod.complete(function (data) {
        deviceInfo["IsMobile"] = data.device["ismobile"];
        deviceInfo["HardwareName"] = data.device["hardwarename"];
        deviceInfo["HardwareFamily"] = data.device["hardwarefamily"];
        deviceInfo["HardwareModel"] = data.device["hardwaremodel"];
        deviceInfo["OEM"] = data.device["oem"];
        deviceInfo["HardwareModelVariants"] =
          data.device["hardwaremodelvariants"];
        deviceInfo["DeviceId"] = data.device["deviceid"];
        deviceInfo["PlatformName"] = data.device["platformname"];
        deviceInfo["PlatformVersion"] = data.device["platformversion"];
        deviceInfo["DeviceType"] = data.device["devicetype"];
        resolve(deviceInfo);
      });
    } catch (error) {
      console.error("Error fetching or executing script:", error.message);
      return null;
    }
  });
};

const getDeviceString = (thisDevice, language) => {
  return `<b>${readi18nPhrases("RC_brand", language)}:</b> ${
    thisDevice.OEM
  } <br>`;
};

const removeElements = (elements) => {
  elements.forEach((elem) => elem.remove());
};
