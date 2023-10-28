import {
  actualBitsPerSample,
  actualSamplingRate,
  allHzCalibrationResults,
  calibrateMicrophonesBool,
  calibrateSound1000HzPostSec,
  calibrateSound1000HzPreSec,
  calibrateSound1000HzSec,
  calibrateSoundBackgroundSecs,
  calibrateSoundBurstDb,
  calibrateSoundBurstRecordings,
  calibrateSoundBurstRepeats,
  calibrateSoundBurstSec,
  calibrateSoundBurstsWarmup,
  calibrateSoundCheck,
  calibrateSoundHz,
  calibrateSoundIIRSec,
  calibrateSoundMaxHz,
  calibrateSoundMinHz,
  calibrateSoundSamplingDesiredBits,
  calibrationTime,
  debugBool,
  invertedImpulseResponse,
  loudspeakerInfo,
  microphoneActualSamplingRate,
  microphoneCalibrationResult,
  microphoneCalibrationResults,
  microphoneInfo,
  soundCalibrationResults,
  soundGainDBSPL,
  thisDevice,
  timeToCalibrate,
  timeoutSec,
} from "./global";
import { readi18nPhrases } from "./readPhrases";
import {
  addMicrophoneToDatabase,
  doesMicrophoneExist,
  findGainatFrequency,
  getCalibrationFile,
  getDeviceDetails,
  getDeviceString,
  getInstructionText,
  identifyDevice,
  parseCalibrationFile,
  readFrqGain,
  removeElements,
  saveLoudSpeakerInfo,
} from "./soundCalibrationHelpers";
import { showExperimentEnding } from "./forms";

const globalGains = { values: [] };

// combination calibration combines the two calibration methods (1000Hz and AllHz calibrations)
export const runCombinationCalibration = async (
  elems,
  gains,
  isLoudspeakerCalibration,
  language
) => {
  globalGains.values = gains;
  elems.message.style.display = "none";
  elems.title.innerHTML = isLoudspeakerCalibration
    ? readi18nPhrases("RC_loudspeakerCalibration", language)
    : readi18nPhrases("RC_microphoneCalibration", language);

  if (isLoudspeakerCalibration) {
    const isSmartPhone = !calibrateMicrophonesBool.current;
    adjustPageNumber(elems.title, [
      { replace: /111/g, with: isLoudspeakerCalibration ? 1 : 0 },
      { replace: /222/g, with: isSmartPhone ? 3 : 5 },
    ]);
    if (isSmartPhone) {
      await runSmartphoneCalibration(elems, isLoudspeakerCalibration, language);
    } else {
      await runUSBCalibration(elems, isLoudspeakerCalibration, language);
    }
  } else {
    const options = [
      readi18nPhrases("RC_smartphone", language),
      readi18nPhrases("RC_usbMicrophone", language),
      readi18nPhrases("RC_none", language),
    ];
    const dropdownTitle = readi18nPhrases("RC_selectMicrophoneType", language);
    const { dropdown, proceedButton, p } = addDropdownMenu(
      elems,
      options,
      dropdownTitle,
      language
    );
    adjustPageNumber(elems.title, [
      { replace: /111/g, with: 0 },
      { replace: /222/g, with: 5 },
    ]);
    await new Promise((resolve) => {
      proceedButton.addEventListener("click", async () => {
        if (dropdown.value === "None") {
          showExperimentEnding();
        }
        const isSmartPhone = dropdown.value === "Smartphone";
        adjustPageNumber(elems.title, [
          { replace: 0, with: 1 },
          { replace: 5, with: isSmartPhone ? 3 : 5 },
        ]);
        removeElements([dropdown, proceedButton, p]);
        elems.subtitle.innerHTML = isLoudspeakerCalibration
          ? isSmartPhone
            ? readi18nPhrases("RC_usingSmartPhoneMicrophone", language)
            : readi18nPhrases("RC_usingUSBMicrophone", language)
          : elems.subtitle.innerHTML;
        elems.subtitle.style.fontSize = "1.1rem";

        if (isSmartPhone) {
          await runSmartphoneCalibration(
            elems,
            isLoudspeakerCalibration,
            language
          );
        } else {
          await runUSBCalibration(elems, isLoudspeakerCalibration, language);
        }

        resolve();
      });
    });
  }
};

const adjustPageNumber = (title, numbers = []) => {
  numbers.forEach((number) => {
    title.innerHTML = title.innerHTML.replace(number.replace, number.with);
  });
};

const addDropdownMenu = (elems, options, title, language) => {
  //  create a dropdown menu to select from "USB Microphone", "SmartPhone", "None"(default)
  const dropdown = document.createElement("select");
  dropdown.style.fontWeight = "bold";
  dropdown.id = "micDropdown";
  dropdown.name = "micDropdown";
  options.forEach((option) => {
    const optionElem = document.createElement("option");
    optionElem.value = option;
    optionElem.innerHTML = option;
    dropdown.appendChild(optionElem);
  });

  const p = document.createElement("p");
  p.innerHTML = title;
  // "Select the type of microphone you are using for this calibration: (#Text to be added to the phrases doc)";
  p.style.fontSize = "1rem";

  // add  to the page
  elems.subtitle.appendChild(p);
  elems.subtitle.appendChild(dropdown);

  // add a proceed button
  const proceedButton2 = document.createElement("button");
  proceedButton2.innerHTML = readi18nPhrases("T_proceed", language);
  proceedButton2.classList.add(...["btn", "btn-success"]);
  proceedButton2.style.marginTop = "1rem";
  elems.subtitle.appendChild(proceedButton2);

  return {
    dropdown: dropdown,
    proceedButton: proceedButton2,
    p: p,
  };
};

const runUSBCalibration = async (elems, isLoudspeakerCalibration, language) => {
  elems.title.innerHTML = isLoudspeakerCalibration
    ? elems.title.innerHTML
    : readi18nPhrases("RC_usbMicrophoneCalibration", language);
  isLoudspeakerCalibration
    ? null
    : adjustPageNumber(elems.title, [
        { replace: /111/g, with: 1 },
        { replace: /222/g, with: 5 },
      ]);
  const p = document.createElement("p");
  p.innerHTML = readi18nPhrases("RC_connectUSBMicrophone", language)
    .replace("111", calibrateSoundHz.current)
    .replace("222", calibrateSoundSamplingDesiredBits.current)
    .replace(/\n/g, "<br>");
  p.style.fontWeight = "normal";
  p.style.fontSize = "1rem";
  // p.style.marginTop = "1rem";

  const proceedButton = document.createElement("button");
  proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
  proceedButton.classList.add(...["btn", "btn-success"]);

  elems.subtitle.appendChild(p);
  elems.subtitle.appendChild(proceedButton);

  await new Promise((resolve) => {
    proceedButton.addEventListener("click", async () => {
      removeElements([p, proceedButton]);
      adjustPageNumber(elems.title, [{ replace: 1, with: 2 }]);
      await getUSBMicrophoneDetailsFromUser(
        elems,
        language,
        isLoudspeakerCalibration
      );
      resolve();
    });
  });
};

const getUSBMicrophoneDetailsFromUser = async (
  elems,
  language,
  isLoudspeakerCalibration
) => {
  let micName = "UMIK";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (stream) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((device) => device.kind === "audioinput");
      console.log(mics);
      mics.forEach((mic) => {
        if (mic.label.includes("Umik") || mic.label.includes("UMIK")) {
          micName = mic.label.replace("Microphone", "");
        }
      });
    }
  } catch (err) {
    console.log(err);
  }

  const p = document.createElement("p");
  p.innerHTML = readi18nPhrases("RC_identifyUSBMicrophone", language).replace(
    "UUU",
    micName
  );
  p.style.fontSize = "1rem";
  p.style.fontWeight = "normal";
  // p.style.marginTop = "1rem";

  // create input fields for the microphone name, manufacturer, and serial number
  const micNameInput = document.createElement("input");
  micNameInput.type = "text";
  micNameInput.id = "micNameInput";
  micNameInput.name = "micNameInput";
  micNameInput.placeholder = "Microphone Name";

  const micManufacturerInput = document.createElement("input");
  micManufacturerInput.type = "text";
  micManufacturerInput.id = "micManufacturerInput";
  micManufacturerInput.name = "micManufacturerInput";
  micManufacturerInput.placeholder = "Microphone Manufacturer";

  const micSerialNumberInput = document.createElement("input");
  micSerialNumberInput.type = "text";
  micSerialNumberInput.id = "micSerialNumberInput";
  micSerialNumberInput.name = "micSerialNumberInput";
  micSerialNumberInput.placeholder = "Serial Number";

  // add a proceed button
  const proceedButton = document.createElement("button");
  proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
  proceedButton.classList.add(...["btn", "btn-success"]);

  // add  to the page
  elems.subtitle.appendChild(p);
  elems.subtitle.appendChild(micNameInput);
  elems.subtitle.appendChild(micManufacturerInput);
  elems.subtitle.appendChild(micSerialNumberInput);
  elems.subtitle.appendChild(proceedButton);

  await new Promise((resolve) => {
    proceedButton.addEventListener("click", async () => {
      proceedButton.innerHTML = "Loading...";
      if (
        micNameInput.value === "" ||
        micManufacturerInput.value === "" ||
        micSerialNumberInput.value === ""
      ) {
        alert("Please fill out all the fields");
      } else {
        microphoneInfo.current = {
          micFullName: micNameInput.value,
          micrFullManufacturerName: micManufacturerInput.value,
          micFullSerialNumber: micSerialNumberInput.value,
        };
        const micExists = await checkMicrophoneInDatabase();
        if (micExists || !isLoudspeakerCalibration) {
          removeElements([
            p,
            micNameInput,
            micManufacturerInput,
            micSerialNumberInput,
            proceedButton,
          ]);
          adjustPageNumber(elems.title, [{ replace: 2, with: 3 }]);
          await getLoudspeakerDeviceDetailsFromUser(
            elems,
            language,
            false,
            isLoudspeakerCalibration
          );
          resolve();
        } else {
          p.innerHTML = readi18nPhrases("RC_sorryUSBMicrophone", language)
            .replace("MMM", microphoneInfo.current.micrFullManufacturerName)
            .replace("NNN", microphoneInfo.current.micFullName)
            .replace("SSS", microphoneInfo.current.micFullSerialNumber);
        }
      }
      proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
    });
  });
};

const getLoudspeakerDeviceDetailsFromUser = async (
  elems,
  language,
  isSmartPhone,
  isLoudspeakerCalibration
) => {
  thisDevice.current = await identifyDevice();
  const { preferredModelNumber } = getDeviceDetails(
    thisDevice.current.PlatformName,
    language
  );
  // display the device info
  const deviceString = getDeviceString(thisDevice.current, language);
  const instructionText = getInstructionText(
    thisDevice.current,
    language,
    isSmartPhone,
    isLoudspeakerCalibration,
    preferredModelNumber
  );

  // update subtitle
  elems.subtitle.innerHTML = readi18nPhrases("RC_yourComputer", language)
    .replace(
      "xxx",
      thisDevice.current.OEM === "Unknown" ? "" : thisDevice.current.OEM
    )
    .replace("yyy", thisDevice.current.DeviceType);
  elems.subtitle.style.fontSize = "1rem";

  // create input box for model number and name
  const modelNumberInput = document.createElement("input");
  modelNumberInput.type = "text";
  modelNumberInput.id = "modelNumberInput";
  modelNumberInput.name = "modelNumberInput";
  modelNumberInput.placeholder = preferredModelNumber;

  const modelNameInput = document.createElement("input");
  modelNameInput.type = "text";
  modelNameInput.id = "modelNameInput";
  modelNameInput.name = "modelNameInput";
  modelNameInput.placeholder = readi18nPhrases("RC_modelName", language);

  const deviceStringElem = document.createElement("p");
  deviceStringElem.id = "loudspeakerInstructions1";
  deviceStringElem.innerHTML = deviceString;

  const findModel = document.createElement("p");
  findModel.id = "loudspeakerInstructions2";
  findModel.innerHTML = instructionText;

  const proceedButton = document.createElement("button");
  proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
  proceedButton.classList.add(...["btn", "btn-success"]);

  // add  to the page
  elems.subtitle.appendChild(findModel);
  elems.subtitle.appendChild(modelNameInput);
  elems.subtitle.appendChild(modelNumberInput);
  elems.subtitle.appendChild(deviceStringElem);
  elems.subtitle.appendChild(proceedButton);

  await new Promise((resolve) => {
    proceedButton.addEventListener("click", async () => {
      if (modelNameInput.value === "" || modelNumberInput.value === "") {
        alert("Please fill out all the fields");
      } else {
        loudspeakerInfo.current = {
          fullLoudspeakerModelName: modelNameInput.value,
          fullLoudspeakerModelNumber: modelNumberInput.value,
        };
        removeElements([
          findModel,
          modelNameInput,
          modelNumberInput,
          deviceStringElem,
          proceedButton,
        ]);
        adjustPageNumber(elems.title, [{ replace: 3, with: 4 }]);
        await startCalibration(
          elems,
          isLoudspeakerCalibration,
          language,
          isSmartPhone,
          isLoudspeakerCalibration ? null : allHzCalibrationResults.knownIr
        );
        resolve();
      }
    });
  });
};

const getLoudspeakerDeviceDetailsFromUserForSmartphone = async (
  elems,
  language,
  isSmartPhone,
  isLoudspeakerCalibration
) => {
  thisDevice.current = await identifyDevice();
  // display the device info
  const deviceString = getDeviceString(thisDevice.current, language);
  const { preferredModelNumber } = getDeviceDetails(
    thisDevice.current.PlatformName,
    language
  );
  const instructionText = getInstructionText(
    thisDevice.current,
    language,
    isSmartPhone,
    isLoudspeakerCalibration,
    preferredModelNumber
  );
  // update subtitle
  elems.subtitle.innerHTML = readi18nPhrases("RC_yourComputer", language)
    .replace(
      "xxx",
      thisDevice.current.OEM === "Unknown" ? "" : thisDevice.current.OEM
    )
    .replace("yyy", thisDevice.current.DeviceType);
  elems.subtitle.style.fontSize = "1rem";

  // create input box for model number and name
  const modelNumberInput = document.createElement("input");
  modelNumberInput.type = "text";
  modelNumberInput.id = "modelNumberInput";
  modelNumberInput.name = "modelNumberInput";
  modelNumberInput.placeholder = preferredModelNumber;

  const modelNameInput = document.createElement("input");
  modelNameInput.type = "text";
  modelNameInput.id = "modelNameInput";
  modelNameInput.name = "modelNameInput";
  modelNameInput.placeholder = readi18nPhrases("RC_modelName", language);

  const deviceStringElem = document.createElement("p");
  deviceStringElem.id = "loudspeakerInstructions1";
  deviceStringElem.innerHTML = deviceString;

  const findModel = document.createElement("p");
  findModel.id = "loudspeakerInstructions2";
  findModel.innerHTML = instructionText;

  const proceedButton = document.createElement("button");
  proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
  proceedButton.classList.add(...["btn", "btn-success"]);

  // add  to the page
  elems.subtitle.appendChild(findModel);
  elems.subtitle.appendChild(modelNameInput);
  elems.subtitle.appendChild(modelNumberInput);
  elems.subtitle.appendChild(deviceStringElem);
  elems.subtitle.appendChild(proceedButton);

  await new Promise((resolve) => {
    proceedButton.addEventListener("click", async () => {
      if (modelNameInput.value === "" || modelNumberInput.value === "") {
        alert("Please fill out all the fields");
      } else {
        loudspeakerInfo.current = {
          fullLoudspeakerModelName: modelNameInput.value,
          fullLoudspeakerModelNumber: modelNumberInput.value,
        };
        removeElements([
          findModel,
          modelNameInput,
          modelNumberInput,
          deviceStringElem,
          proceedButton,
        ]);
        adjustPageNumber(elems.title, [{ replace: 1, with: 2 }]);
        await startCalibration(
          elems,
          isLoudspeakerCalibration,
          language,
          isSmartPhone,
          isLoudspeakerCalibration ? null : allHzCalibrationResults.knownIr
        );
        resolve();
      }
    });
  });
};

const checkMicrophoneInDatabase = async () => {
  const micName = microphoneInfo.current.micFullName
    .toLowerCase()
    .split(" ")
    .join("");
  const micSerialNumber = microphoneInfo.current.micFullSerialNumber
    .toLowerCase()
    .split(" ")
    .join("");
  const micManufacturer = microphoneInfo.current.micrFullManufacturerName
    .toLowerCase()
    .split(" ")
    .join("");
  const micExists = await doesMicrophoneExist(micSerialNumber, micManufacturer);

  if (micExists) {
    return true;
  }

  // if the microphone is from miniDSP, fetch the microphone info from the miniDSP website
  if (
    micManufacturer === "minidsp" &&
    (micName === "UMIK-1" || micName === "UMIK-2")
  ) {
    const serial = microphoneInfo.current.micFullSerialNumber.replace("-", "");
    const url =
      micName === "UMIK-1"
        ? `https://www.minidsp.com/scripts/umikcal/umik90.php/${serial}_90deg.txt`
        : `https://www.minidsp.com/scripts/umik2cal/umik90.php/${serial}_90deg.txt`;
    const file = await getCalibrationFile(url);
    if (file) {
      const data = parseCalibrationFile(file);
      const Gain = findGainatFrequency(data.Freq, data.Gain, 1000);
      const micData = {
        Gain: Gain,
        Gain1000: Gain,
        isSmartPhone: false,
        linear: {
          Freq: data.Freq,
          Gain: data.Gain,
        },
        serial: microphoneInfo.current.micFullSerialNumber,
        info: {
          DeviceType: "N/A",
          HardwareModel: microphoneInfo.current.micrFullManufacturerName,
          HardwareName: microphoneInfo.current.micrFullManufacturerName,
          ID: microphoneInfo.current.micFullSerialNumber,
          OEM: "minidsp",
          PlatformName: "N/A",
          PlatformVersion: "N/A",
          hardwareFamily: microphoneInfo.current.micrFullManufacturerName,
          micModelName: microphoneInfo.current.micrFullManufacturerName,
        },
      };

      await addMicrophoneToDatabase(micSerialNumber, micManufacturer, micData);
      return true;
    }
  }

  return false;
};

const showSmartphoneCalibrationInstructions = async (
  elems,
  language,
  isLoudspeakerCalibration
) => {
  const messageText = `${readi18nPhrases(
    "RC_removeHeadphones",
    language
  )} ${readi18nPhrases("RC_getPhoneMicrophoneReady", language)}`.replace(
    /\n/g,
    "<br>"
  );
  elems.message.style.display = "block";
  elems.message.innerHTML = messageText;
  elems.message.style.lineHeight = "2rem";

  const proceedButton = document.createElement("button");
  proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
  proceedButton.classList.add(...["btn", "btn-success"]);
  proceedButton.style.marginTop = "1rem";
  elems.message.appendChild(proceedButton);

  await new Promise((resolve) => {
    proceedButton.addEventListener("click", async () => {
      elems.message.innerHTML = "";
      removeElements([proceedButton]);
      adjustPageNumber(elems.title, [{ replace: 3, with: 4 }]);
      await startCalibration(
        elems,
        isLoudspeakerCalibration,
        language,
        true,
        isLoudspeakerCalibration ? null : allHzCalibrationResults.knownIr
      );
      resolve();
    });
  });
};

const runSmartphoneCalibration = async (
  elems,
  isLoudspeakerCalibration,
  language
) => {
  // await startCalibration(elems, isLoudspeakerCalibration, language, true, isLoudspeakerCalibration? null: allHzCalibrationResults.knownIr);
  await getLoudspeakerDeviceDetailsFromUserForSmartphone(
    elems,
    language,
    true,
    isLoudspeakerCalibration
  );
};

const startCalibration = async (
  elems,
  isLoudspeakerCalibration,
  language,
  isSmartPhone,
  knownIR = null
) => {
  elems.subtitle.innerHTML = isLoudspeakerCalibration
    ? isSmartPhone
      ? readi18nPhrases("RC_usingSmartPhoneMicrophone", language)
      : readi18nPhrases("RC_usingUSBMicrophone", language)
    : elems.subtitle.innerHTML;
  const micName = microphoneInfo.current?.micFullName
    ? microphoneInfo.current.micFullName.toLowerCase().split(" ").join("")
    : "";
  const micSerialNumber = microphoneInfo.current?.micFullSerialNumber
    ? microphoneInfo.current.micFullSerialNumber
    : "";
  console.log(micSerialNumber);
  const micManufacturer = microphoneInfo.current?.micrFullManufacturerName
    ? microphoneInfo.current.micrFullManufacturerName
        .toLowerCase()
        .split(" ")
        .join("")
    : "";
  const { Speaker, CombinationCalibration } = speakerCalibrator;
  const speakerParameters = {
    language: language,
    siteUrl: "https://easy-eyes-listener-page.herokuapp.com",
    targetElementId: "displayQR",
    debug: debugBool.current,
    gainValues: globalGains.values,
    knownIR: knownIR,
    instructionDisplayId: "recordingInProgress",
    soundMessageId: "soundMessage",
    titleDisplayId: "soundTitle",
    timeToCalibrateId: "timeToCalibrate",
    calibrateSoundBurstRepeats: calibrateSoundBurstRepeats.current,
    calibrateSoundBurstSec: calibrateSoundBurstSec.current,
    calibrateSoundSamplingDesiredBits:
      calibrateSoundSamplingDesiredBits.current,
    calibrateSoundBurstsWarmup: calibrateSoundBurstsWarmup.current,
    calibrateSoundHz: calibrateSoundHz.current,
    timeToCalibrate: timeToCalibrate.current,
    microphoneName: micName,
    micManufacturer: micManufacturer,
    micSerialNumber: micSerialNumber,
    micModelNumber: micSerialNumber,
    micModelName: micName,
    isSmartPhone: isSmartPhone,
    calibrateSoundBurstDb: Math.pow(10, calibrateSoundBurstDb.current / 20),
    calibrateSoundCheck: calibrateSoundCheck.current,
    calibrateSoundIIRSec: calibrateSoundIIRSec.current,
    calibrateSound1000HzPreSec: calibrateSound1000HzPreSec.current,
    calibrateSound1000HzSec: calibrateSound1000HzSec.current,
    calibrateSound1000HzPostSec: calibrateSound1000HzPostSec.current,
    calibrateSoundBackgroundSecs: calibrateSoundBackgroundSecs.current,
  };
  const calibratorParams = {
    numCaptures: calibrateSoundBurstRecordings.current,
    numMLSPerCapture: 2,
    download: false,
    lowHz: calibrateSoundMinHz.current,
    highHz: calibrateSoundMaxHz.current,
  };
  const calibrator = new CombinationCalibration(calibratorParams);
  calibrator.on("update", ({ message, ...rest }) => {
    elems.displayUpdate.innerHTML = message;
  });

  adjustDisplayBeforeCalibration(
    elems,
    isSmartPhone,
    language,
    isLoudspeakerCalibration
  );
  const results = await Speaker.startCalibration(
    speakerParameters,
    calibrator,
    timeoutSec.current
  );
  if (results === false) {
    return false;
  }
  adjustDisplayAfterCalibration(elems, isLoudspeakerCalibration);
  isLoudspeakerCalibration
    ? await parseLoudspeakerCalibrationResults(results, isSmartPhone)
    : await parseMicrophoneCalibrationResults(results, isSmartPhone);
};

const parseLoudspeakerCalibrationResults = async (results, isSmartPhone) => {
  soundCalibrationResults.current = results;
  invertedImpulseResponse.current =
    calibrateSoundCheck.current === "system"
      ? soundCalibrationResults.current.system.iir
      : soundCalibrationResults.current.component.iir;
  microphoneInfo.current = {
    ...microphoneInfo.current,
    ...soundCalibrationResults.current.micInfo,
  };
  microphoneInfo.current.micFullName = isSmartPhone
    ? microphoneInfo.current.micModelName
    : microphoneInfo.current.micFullName;
  microphoneInfo.current.micFullSerialNumber = isSmartPhone
    ? microphoneInfo.current.ID
    : microphoneInfo.current.micFullSerialNumber;
  microphoneInfo.current.micrFullManufacturerName = isSmartPhone
    ? microphoneInfo.current.OEM
    : microphoneInfo.current.micrFullManufacturerName;
  actualSamplingRate.current =
    soundCalibrationResults.current.audioInfo?.sourceSampleRate;
  microphoneActualSamplingRate.current =
    soundCalibrationResults.current.audioInfo?.sinkSampleRate;
  actualBitsPerSample.current =
    soundCalibrationResults.current.audioInfo?.bitsPerSample;
  microphoneInfo.current.CalibrationDate = calibrationTime.current;
  if (calibrateSoundCheck.current !== "none") {
    if (calibrateSoundCheck.current === "system") {
      allHzCalibrationResults.system = soundCalibrationResults.current.system;
    } else if (calibrateSoundCheck.current === "goal") {
      allHzCalibrationResults.component =
        soundCalibrationResults.current.component;
    } else if (calibrateSoundCheck.current === "both") {
      allHzCalibrationResults.system = soundCalibrationResults.current.system;
      allHzCalibrationResults.component =
        soundCalibrationResults.current.component;
    }
    allHzCalibrationResults.mls_psd = soundCalibrationResults.current.mls_psd;
    const OEM = microphoneInfo.current.OEM.toLowerCase().split(" ").join("");
    const ID = microphoneInfo.current.ID;
    const FreqGain = await readFrqGain(ID, OEM);
    allHzCalibrationResults.microphoneGain = FreqGain ? FreqGain : {};
    allHzCalibrationResults.filteredMLSRange =
      soundCalibrationResults.current.filteredMLSRange;
    if (calibrateSoundBackgroundSecs.current > 0) {
      allHzCalibrationResults.background = {
        x_background:
          soundCalibrationResults.current.background_noise?.x_background,
        y_background:
          soundCalibrationResults.current.background_noise?.y_background,
      };
    }
  }
  allHzCalibrationResults.knownIr =
    soundCalibrationResults.current.component.ir;
  soundGainDBSPL.current = soundCalibrationResults.current.parameters.gainDBSPL;
  soundGainDBSPL.current = Math.round(soundGainDBSPL.current * 10) / 10;
  allHzCalibrationResults.timestamps =
    soundCalibrationResults.current.timeStamps;
  const modelNumber = loudspeakerInfo.current.fullLoudspeakerModelNumber
    .toLowerCase()
    .split(" ")
    .join("");
  const modelName = loudspeakerInfo.current.fullLoudspeakerModelName
    .toLowerCase()
    .split(" ")
    .join("");
  loudspeakerInfo.current = {
    ...loudspeakerInfo.current,
    ModelName: modelName,
    ID: modelNumber,
    isSmartPhone: isSmartPhone,
    HardwareName: thisDevice.current.HardwareName,
    HardwareModel: thisDevice.current.HardwareModel,
    HardwareModelVariants: thisDevice.current.HardwareModelVariants,
    HardwareFamily: thisDevice.current.HardwareFamily,
    OEM: thisDevice.current.OEM,
    DeviceType: thisDevice.current.DeviceType,
    DeviceId: thisDevice.current.DeviceId,
    PlatformName: thisDevice.current.PlatformName,
    PlatformVersion: thisDevice.current.PlatformVersion,
    gainDBSPL:
      Math.round(
        (soundGainDBSPL.current - microphoneInfo.current.gainDBSPL) * 10
      ) / 10,
    CalibrationDate: calibrationTime.current,
    micInfo: microphoneInfo.current,
  };
  try {
    // await saveLoudSpeakerInfo(
    //     loudspeakerInfo.current,
    //     modelNumber,
    //     thisDevice.current.OEM,
    //     invertedImpulseResponse.current,
    //     soundCalibrationResults.current.component.ir
    // );
  } catch (err) {
    console.log(err);
  }
};

const parseMicrophoneCalibrationResults = async (result, isSmartPhone) => {
  microphoneCalibrationResult.current = result;
  microphoneInfo.current.gainDBSPL =
    Math.round(
      (microphoneInfo.current.gainDBSPL - loudspeakerInfo.current.gainDBSPL) *
        10
    ) / 10;
  microphoneInfo.current.CalibrationDate = calibrationTime.current;
  microphoneCalibrationResults.push({
    name: microphoneInfo.current.micFullName,
    ID: microphoneInfo.current.micFullSerialNumber,
    OEM: isSmartPhone
      ? microphoneInfo.current.OEM
      : microphoneInfo.current.micrFullManufacturerName,
    isSmartPhone: isSmartPhone,
    HardwareName: microphoneInfo.current.HardwareName,
    HardwareFamily: microphoneInfo.current.HardwareFamily,
    HardwareModel: microphoneInfo.current.HardwareModel,
    HardwareModelVariants: microphoneInfo.currentHardwareModelVariants,
    PlatformVersion: microphoneInfo.current.PlatformVersion,
    DeviceType: microphoneInfo.current.DeviceType,
    in_dB_1000Hz: result.inDBValues ? result.inDBValues : [],
    out_dBSPL_1000Hz: result.outDBSPL1000Values
      ? result.outDBSPL1000Values
      : [],
    CalibrationDate: microphoneInfo.current.CalibrationDate,
    MlsSpectrumHz_system: result?.system?.psd?.conv?.x,
    MlsSpectrumFilteredDb_system: result.current?.system?.psd?.conv?.y,
    MlsSpectrumUnfilteredHz_system: result?.system?.psd?.unconv?.x,
    MlsSpectrumUnfilteredDb_system: result?.system?.psd?.unconv?.y,
    MlsSpectrumHz_component: result?.component?.psd?.conv?.x,
    MlsSpectrumFilteredDb_component: result?.component?.psd?.conv?.y,
    MlsSpectrumUnfilteredHz_component: result?.component?.psd?.unconv?.x,
    MlsSpectrumUnfilteredDb_component: result?.component?.psd?.unconv?.y,
    "Microphone Component IR": result?.component?.ir,
    "Microphone Component IIR": result?.component?.iir,
    "Microphone system IR": result?.system?.ir,
    "Microphone system IIR": result?.system?.iir,
    dB_component_iir: result?.component?.iir_psd?.y,
    Hz_component_iir: result?.component?.iir_psd?.x,
    dB_component_iir_no_bandpass: result?.component?.iir_psd?.y_no_bandpass,
    Hz_component_iir_no_bandpass: result?.component?.iir_psd?.x_no_bandpass,
    dB_system_iir: result?.system?.iir_psd?.y,
    Hz_system_iir: result?.system?.iir_psd?.x,
    dB_system_iir_no_bandpass: result?.system?.iir_psd?.y_no_bandpass,
    Hz_system_iir_no_bandpass: result?.system?.iir_psd?.x_no_bandpass,
    unconv_rec: result?.unfiltered_recording,
    conv_rec: result?.filtered_recording,
    mls: result?.mls,
    componentConvolution: result?.component?.convolution,
    systemConvolution: result?.system?.convolution,
    autocorrelations: result?.autocorrelations,
    backgroundRecording: result?.background_noise?.recording,
    db_BackgroundNoise: result?.background_noise?.x_background,
    Hz_BackgroundNoise: result?.background_noise?.y_background,
  });
};

const adjustDisplayBeforeCalibration = (
  elems,
  isSmartPhone,
  language,
  isLoudspeakerCalibration
) => {
  elems.displayContainer.style.display = "flex";
  elems.displayContainer.style.marginLeft = "0px";
  elems.displayContainer.style.flexDirection = "column";
  elems.displayUpdate.style.display = "flex";
  elems.displayUpdate.style.marginLeft = "0px";
  elems.displayUpdate.style.flexDirection = "column";
  elems.displayQR.style.display = "flex";
  elems.displayQR.style.marginLeft = "0px";
  elems.displayQR.style.flexDirection = "column";

  const messageText = isSmartPhone
    ? `${readi18nPhrases(
        "RC_hopeMicrophoneIsInLibrary",
        language
      )}${readi18nPhrases("RC_pointCameraAtQR", language)}`.replace(
        /\n/g,
        "<br>"
      )
    : `${readi18nPhrases("RC_removeHeadphones", language)}${readi18nPhrases(
        "RC_getUSBMicrophoneReady",
        language
      )}`.replace(/\n/g, "<br>");

  elems.message.style.display = "block";
  elems.message.innerHTML = messageText;
  elems.message.style.lineHeight = "2rem";
};

const adjustDisplayAfterCalibration = (elems, isLoudspeakerCalibration) => {
  if (isLoudspeakerCalibration) {
    elems.recordingInProgress.innerHTML = "";
    elems.timeToCalibrate.innerHTML = "";
    elems.message.style.display = "block";
    elems.message.style.whiteSpace = "normal";
    elems.message.style.fontSize = "1.1rem";
    elems.message.style.fontWeight = "normal";
  } else {
    elems.recordingInProgress.innerHTML = "";
    elems.message.style.display = "block";
    elems.message.style.whiteSpace = "normal";
    elems.message.style.fontSize = "1.1rem";
    elems.message.style.fontWeight = "normal";
  }
};
