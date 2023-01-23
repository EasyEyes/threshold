import { isProlificPreviewExperiment } from "./externalServices";
import { phrases } from "./i18n";
// import { rc } from "./global";

export const checkSystemCompatibility = (
  reader,
  lang,
  rc,
  useEnglishNamesForLanguage = true
) => {
  // handle language
  handleLanguage(lang, rc, useEnglishNamesForLanguage);

  var compatibleBrowser = reader.read("_compatibleBrowser")[0].split(",");
  var deviceBrowser = rc.browser.value;
  var compatibleBrowserVersionMinimum = reader.read(
    "_compatibleBrowserVersionMinimum"
  )[0];
  var deviceBrowserVersion = rc.browserVersion.value;
  var compatibleDevice = reader.read("_compatibleDeviceType")[0].split(",");
  var deviceType = rc.deviceType.value;
  var compatibleOS = reader.read("_compatibleOperatingSystem")[0].split(",");
  var deviceSysFamily = rc.systemFamily.value;
  var compatibleProcessorCoresMinimum = reader.read(
    "_compatibleProcessorCoresMinimum"
  )[0];
  var hardwareConcurrency = rc.concurrency.value;
  var computeRandomMHz = rc.computeRandomMHz ? rc.computeRandomMHz.value : 0;
  var Language = rc.language.value;

  if (hardwareConcurrency <= 0)
    hardwareConcurrency = Math.round(2 * computeRandomMHz);

  deviceBrowserVersion = deviceBrowserVersion.split(".");
  if (deviceBrowserVersion.length >= 2)
    deviceBrowserVersion = Number(
      deviceBrowserVersion[0] +
        "." +
        Math.round(deviceBrowserVersion[1] * 10) / 10
    );
  else deviceBrowserVersion = Number(deviceBrowserVersion[0]);

  if (deviceSysFamily == "Mac") deviceSysFamily = "macOS";
  if (deviceBrowser == "Microsoft Edge") deviceBrowser = "Edge";
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
          msg.push(phrases.EE_compatibleDeviceCores[Language]);
          break;
        case "not": // report incompatible OSes
          deviceIsCompatibleBool =
            deviceIsCompatibleBool &&
            !compatibleOS.includes("not" + deviceSysFamily);
          msg.push(phrases.EE_compatibleNotOSDeviceCores[Language]);
          break;
        default: // report compatible OSes
          deviceIsCompatibleBool =
            deviceIsCompatibleBool && compatibleOS.includes(deviceSysFamily);
          msg.push(phrases.EE_compatibleOSDeviceCores[Language]);
          break;
      }
      break;
    case "not": //report incompatible browsers, ignore browser version
      deviceIsCompatibleBool =
        deviceIsCompatibleBool &&
        !compatibleBrowser.includes("not" + deviceBrowser);
      switch (OSCompatibilityType) {
        case "all": //ignore OSes
          msg.push(phrases.EE_compatibleBrowserDeviceCores[Language]);
          break;
        case "not": //report incompatible OSes
          deviceIsCompatibleBool =
            deviceIsCompatibleBool &&
            !compatibleOS.includes("not" + deviceSysFamily);
          msg.push(phrases.EE_compatibleNotBrowserNotOSDeviceCores[Language]);
          break;
        default: //report compatible OSes
          deviceIsCompatibleBool =
            deviceIsCompatibleBool && compatibleOS.includes(deviceSysFamily);
          msg.push(phrases.EE_compatibleNotBrowserOSDeviceCores[Language]);
          break;
      }
      break;
    default: // report compatible browsers
      deviceIsCompatibleBool =
        deviceIsCompatibleBool && compatibleBrowser.includes(deviceBrowser);
      switch (OSCompatibilityType) {
        case "all":
          if (compatibleBrowserVersionMinimum > 0) {
            //report browser version
            deviceIsCompatibleBool =
              deviceIsCompatibleBool &&
              deviceBrowserVersion >= compatibleBrowserVersionMinimum;
            msg.push(phrases.EE_compatibleBrowserVersionDeviceCores[Language]);
          } //ignore browser version
          else msg.push(phrases.EE_compatibleBrowserDeviceCores[Language]);
          break;
        case "not": //report incompatible OSes
          deviceIsCompatibleBool =
            deviceIsCompatibleBool &&
            !compatibleOS.includes("not" + deviceSysFamily);
          if (compatibleBrowserVersionMinimum > 0) {
            //report browser version
            deviceIsCompatibleBool =
              deviceIsCompatibleBool &&
              deviceBrowserVersion >= compatibleBrowserVersionMinimum;
            msg.push(phrases.EE_compatibleBrowserNotOSDeviceCores[Language]);
          } //ignore browser version
          else msg.push(phrases.EE_compatibleBrowserNotOSDeviceCores[Language]);
          break;
        default: //report compatible browsers
          deviceIsCompatibleBool =
            deviceIsCompatibleBool && compatibleOS.includes(deviceSysFamily);
          if (compatibleBrowserVersionMinimum > 0) {
            //report browser version
            deviceIsCompatibleBool =
              deviceIsCompatibleBool &&
              deviceBrowserVersion >= compatibleBrowserVersionMinimum;
            msg.push(
              phrases.EE_compatibleBrowserVersionOSDeviceCores[Language]
            );
          } //ignore browser version
          else msg.push(phrases.EE_compatibleBrowserOSDeviceCores[Language]);
          break;
      }
      break;
  }
  deviceIsCompatibleBool =
    deviceIsCompatibleBool && compatibleDevice.includes(deviceType);
  deviceIsCompatibleBool =
    deviceIsCompatibleBool &&
    hardwareConcurrency >= compatibleProcessorCoresMinimum;
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
      StringOfItems(compatibleBrowser, rc.language.value)
    );
    arr[idx] = arr[idx].replace(
      /OOO/g,
      StringOfItems(compatibleOS, rc.language.value)
    );
    arr[idx] = arr[idx].replace(
      /DDD/g,
      StringOfItems(compatibleDevice, rc.language.value)
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

  const compatibilityRequirements = msg;
  //Create describeDevice, a sentence describing the participant's device.
  msg = phrases.EE_describeDevice[Language];
  // Do substitutions to describe the actual device.
  // BBB = browser
  // 111 = version
  // OOO = operating system
  // DDD = deviceType
  // 222 = number of cpu cores
  msg = msg.replace(/BBB/g, deviceBrowser);
  msg = msg.replace(/111/g, deviceBrowserVersion.toString());
  msg = msg.replace(/OOO/g, deviceSysFamily);
  msg = msg.replace(/DDD/g, deviceType);
  msg = msg.replace(
    /222/g,
    hardwareConcurrency > 0
      ? hardwareConcurrency
      : Math.round(2 * computeRandomMHz)
  );
  msg = msg.replace(/Mac/g, "macOS");
  msg = msg.replace(/OS X/g, "macOS");
  msg = msg.replace(/Microsoft Edge/g, "Edge");

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
    const ssMsg = phrases.EE_compatibleScreenSize[Language].replace(
      /111/g,
      minWidthPx.toString()
    ).replace(/222/g, minHeightPx.toString());
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
    const ssMsg = phrases.EE_compatibleScreenWidth[Language].replace(
      /111/g,
      minWidthPx.toString()
    );
    screenSizeMsg.push(ssMsg + ".");

    const screenSizeCompatible = screenWidthPx >= minWidthPx;
    if (deviceIsCompatibleBool && !screenSizeCompatible) {
      promptRefresh = true;
    }

    deviceIsCompatibleBool = deviceIsCompatibleBool && screenSizeCompatible;
  } else if (minHeightPx > 0) {
    // non-zero minimum height
    // Internation phrase EE_compatibileScreenHeight - replace 111 with minHeightPx
    const ssMsg = phrases.EE_compatibleScreenHeight[Language].replace(
      /111/g,
      minHeightPx.toString()
    );
    screenSizeMsg.push(ssMsg + ".");
    const screenSizeCompatible = screenHeightPx >= minHeightPx;
    if (deviceIsCompatibleBool && !screenSizeCompatible) {
      promptRefresh = true;
    }

    deviceIsCompatibleBool = deviceIsCompatibleBool && screenSizeCompatible;
  }

  const describeScreenSize = phrases.EE_describeScreenSize[Language].replace(
    /111/g,
    screenWidthPx.toString()
  ).replace(/222/g, screenHeightPx.toString());
  msg += describeScreenSize;
  const describeDevice = msg;
  compatibilityRequirements.push(...screenSizeMsg);

  //create our message
  if (deviceIsCompatibleBool) msg = [phrases.EE_compatible[Language]];
  else msg = [phrases.EE_incompatible[Language], compatibilityRequirements];

  msg.push(describeDevice);

  if (deviceIsCompatibleBool && isProlificPreviewExperiment())
    msg.push(phrases.EE_incompatibleReturnToProlific[Language]);

  //  if the study is compatible except for screen size, prompt to refresh
  if (promptRefresh) {
    msg.push(
      phrases.EE_compatibleExceptForScreenResolution[Language].replace(
        /111/g,
        screenWidthPx.toString()
      )
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
  const Or = phrases.EE_or[Language];
  const space = phrases.EE_languageUseSpace[Language] === "1" ? " " : "";
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
  proceedBool
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
    titleMsg.innerHTML = phrases.EE_compatibilityTitle[rc.language.value];
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
      refreshButton.innerHTML = phrases.EE_refresh[rc.language.value];
      refreshButton.addEventListener("click", () => {
        const language = phrases.EE_languageNameEnglish[rc.language.value];
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

    if (reader.read("_languageSelectionByParticipantBool")[0]) {
      // create language selection dropdown
      const languageWrapper = document.createElement("div");

      const LanguageTitle = document.createElement("h3");
      LanguageTitle.innerHTML = phrases.EE_languageChoose[rc.language.value];
      LanguageTitle.id = "language-title";
      LanguageTitle.style.marginTop = "40px";
      languageWrapper.appendChild(LanguageTitle);

      const languageDropdown = document.createElement("select");
      languageDropdown.id = "language-dropdown";
      languageDropdown.style.width = "12rem";
      languageDropdown.style.backgroundColor = "#ddd";
      languageDropdown.style.fontWeight = "bold";

      const languages = phrases.EE_languageNameNative;
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
          rc.language.value
        );
      });

      languageWrapper.appendChild(languageDropdown);
      messageWrapper.appendChild(languageWrapper);
    }

    //create proceed button
    const buttonWrapper = document.createElement("div");
    buttonWrapper.style.textAlign = "center";
    const proceedButton = document.createElement("button");
    proceedButton.classList.add("form-input-btn");
    proceedButton.style.width = "fit-content";
    proceedButton.style.margin = "3rem 0";
    proceedButton.id = "procced-btn";
    proceedButton.innerHTML = phrases.T_proceed[rc.language.value];
    proceedButton.addEventListener("click", () => {
      document.getElementById("root").style.display = "";
      resolve({ proceedButtonClicked: true, proceedBool: proceedBool });
    });
    buttonWrapper.appendChild(proceedButton);
    messageWrapper.appendChild(buttonWrapper);

    document.body.appendChild(messageWrapper);
  });
};

export const hideCompatibilityMessage = () => {
  document.getElementById("msg-container")?.remove();
};

const handleLanguage = (lang, rc, useEnglishNames = true) => {
  // convert to language code
  const Languages = useEnglishNames
    ? phrases.EE_languageNameEnglish
    : phrases.EE_languageNameNative;
  const languageCode = Object.keys(Languages).find(
    (key) => Languages[key] === lang
  );

  // set language code
  if (languageCode) {
    rc.newLanguage(languageCode);
  }
};

const handleNewMessage = (msg, msgID, lang) => {
  var displayMsg = "";
  msg.forEach((item) => {
    displayMsg += item;
    displayMsg += " ";
  });
  let elem = document.getElementById(msgID);
  elem.innerHTML = displayMsg;

  let titleElem = document.getElementById("compatibility-title");
  titleElem.innerHTML = phrases.EE_compatibilityTitle[lang];

  let languageTitleElem = document.getElementById("language-title");
  languageTitleElem.innerHTML = phrases.EE_languageChoose[lang];

  let proceedButton = document.getElementById("procced-btn");
  proceedButton.innerHTML = phrases.T_proceed[lang];
};
