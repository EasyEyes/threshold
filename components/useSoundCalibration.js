import {
  actualBitsPerSample,
  actualSamplingRate,
  allHzCalibrationResults,
  calibrateMicrophonesBool,
  calibrationRound,
  calibrateSoundSaveJSONBool,
  calibrateSound1000HzPostSec,
  calibrateSound1000HzPreSec,
  calibrateSound1000HzSec,
  calibrateSoundBackgroundSecs,
  calibrateSoundSmoothOctaves,
  calibrateSoundPowerBinDesiredSec,
  calibrateSoundPowerDbSDToleratedDb,
  calibrateSoundBurstDb,
  calibrateSoundBurstRecordings,
  calibrateSoundBurstRepeats,
  calibrateSoundBurstSec,
  calibrateSoundBurstsWarmup,
  calibrateSoundCheck,
  calibrateSoundHz,
  calibrateSoundIIRSec,
  calibrateSoundIRSec,
  calibrateSoundMaxHz,
  calibrateSoundMinHz,
  calibrateSoundSamplingDesiredBits,
  calibrationTime,
  debugBool,
  invertedImpulseResponse,
  loudspeakerIR,
  loudspeakerInfo,
  microphoneActualSamplingRate,
  microphoneCalibrationResult,
  microphoneCalibrationResults,
  microphoneInfo,
  qualityMetrics,
  soundCalibrationResults,
  soundGainDBSPL,
  thisDevice,
  timeToCalibrate,
  timeoutSec,
  authorEmail,
  webAudioDeviceNames,
  thisExperimentInfo,
  IDsToSaveInSoundProfileLibrary,
} from "./global";
import { readi18nPhrases } from "./readPhrases";
import {
  addMicrophoneToDatabase,
  addMicrophoneToFirestore,
  doesMicrophoneExist,
  doesMicrophoneExistInFirestore,
  findGainatFrequency,
  getCalibrationFile,
  getDeviceDetails,
  getDeviceString,
  getInstructionText,
  identifyDevice,
  parseCalibrationFile,
  readFrqGain,
  readFrqGainFromFirestore,
  removeElements,
  saveLoudSpeakerInfo,
  saveLoudSpeakerInfoToFirestore,
} from "./soundCalibrationHelpers";
import { showExperimentEnding } from "./forms";
import { getCurrentTimeString } from "./soundUtils";
import { isProlificExperiment } from "./externalServices";
import { psychoJS } from "./globalPsychoJS";

const globalGains = { values: [] };

// combination calibration combines the two calibration methods (1000Hz and AllHz calibrations)
export const runCombinationCalibration = async (
  elems,
  gains,
  isLoudspeakerCalibration,
  language
) => {
  webAudioDeviceNames.loudspeaker = "";
  webAudioDeviceNames.microphone = "";
  globalGains.values = gains;
  elems.message.style.display = "none";
  elems.title.innerHTML = isLoudspeakerCalibration
    ? readi18nPhrases("RC_loudspeakerCalibration", language)
    : readi18nPhrases("RC_microphoneCalibration", language);

  if (isLoudspeakerCalibration) {
    const isParticipant = !calibrateMicrophonesBool.current;
    adjustPageNumber(elems.title, [
      { replace: /111/g, with: isLoudspeakerCalibration ? 1 : 0 },
      { replace: /222/g, with: isParticipant ? 3 : 5 },
    ]);
    if (isParticipant) {
      await runSmartphoneCalibration(
        elems,
        isLoudspeakerCalibration,
        language,
        true
      );
    } else {
      // await runUSBCalibration(elems, isLoudspeakerCalibration, language);
      const options = [
        readi18nPhrases("RC_smartphone", language),
        readi18nPhrases("RC_usbMicrophone", language),
        readi18nPhrases("RC_none", language),
      ];
      const dropdownTitle =
        readi18nPhrases("RC_selectMicrophoneType", language) +
        " " +
        readi18nPhrases("RC_OkToConnect", language);
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
              language,
              false
            );
          } else {
            await runUSBCalibration(elems, isLoudspeakerCalibration, language);
          }

          resolve();
        });
      });
    }
  } else {
    const options = [
      readi18nPhrases("RC_smartphone", language),
      readi18nPhrases("RC_usbMicrophone", language),
      readi18nPhrases("RC_none", language),
    ];
    const dropdownTitle =
      readi18nPhrases("RC_helloCalibrator", language)
        .replace("xxx", authorEmail.current)
        .replace("xxx", authorEmail.current)
        .replace("XXX", authorEmail.current)
        .replace("XXX", authorEmail.current) +
      " " +
      readi18nPhrases("RC_selectMicrophoneTypeToBeCalibrated", language);
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
            language,
            false
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
  elems.subtitle.innerHTML = "";
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
      // mics.forEach((mic) => {
      //   if (mic.label.includes("Umik") || mic.label.includes("UMIK")) {
      //     // micName = mic.label.replace("Microphone", "");
      //     webAudioDeviceNames.microphone = mic.label;
      //   }
      // });

      mics.forEach((mic) => {
        if (mic.label.includes("Default")) {
          webAudioDeviceNames.microphone = mic.label;
        }
      });

      if (webAudioDeviceNames.microphone === "") {
        webAudioDeviceNames.microphone = mics[0].label;
      }
      const loudspeaker = devices.filter(
        (device) => device.kind === "audiooutput"
      );
      loudspeaker.forEach((speaker) => {
        if (speaker.label.includes("Default")) {
          webAudioDeviceNames.loudspeaker = speaker.label;
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
  console.log(webAudioDeviceNames);
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
          if (isLoudspeakerCalibration) {
            await getLoudspeakerDeviceDetailsFromUser(
              elems,
              language,
              false,
              isLoudspeakerCalibration
            );
            resolve();
          } else {
            allHzCalibrationResults.knownIr = JSON.parse(
              JSON.stringify(loudspeakerIR)
            );
            await startCalibration(
              elems,
              isLoudspeakerCalibration,
              language,
              false,
              isLoudspeakerCalibration ? null : allHzCalibrationResults.knownIr
            );
            resolve();
          }
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
        loudspeakerInfo.current.fullLoudspeakerModelName = modelNameInput.value;
        (loudspeakerInfo.current.fullLoudspeakerModelNumber =
          modelNumberInput.value),
          removeElements([
            findModel,
            modelNameInput,
            modelNumberInput,
            deviceStringElem,
            proceedButton,
          ]);
        adjustPageNumber(elems.title, [{ replace: 3, with: 4 }]);
        allHzCalibrationResults.knownIr = JSON.parse(
          JSON.stringify(loudspeakerIR)
        );
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
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (stream) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const loudspeaker = devices.filter(
        (device) => device.kind === "audiooutput"
      );
      loudspeaker.forEach((speaker) => {
        if (speaker.label.includes("Default")) {
          webAudioDeviceNames.loudspeaker = speaker.label;
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
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
        loudspeakerInfo.current.fullLoudspeakerModelName = modelNameInput.value;
        loudspeakerInfo.current.fullLoudspeakerModelNumber =
          modelNumberInput.value;

        removeElements([
          findModel,
          modelNameInput,
          modelNumberInput,
          deviceStringElem,
          proceedButton,
        ]);
        adjustPageNumber(elems.title, [{ replace: 1, with: 2 }]);
        allHzCalibrationResults.knownIr = JSON.parse(
          JSON.stringify(loudspeakerIR)
        );
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
  const micName = microphoneInfo.current.micFullName;
  const micSerialNumber = microphoneInfo.current.micFullSerialNumber
    .toLowerCase()
    .split(" ")
    .join("");
  const micManufacturer = microphoneInfo.current.micrFullManufacturerName
    .toLowerCase()
    .split(" ")
    .join("");
  // const micExists = await doesMicrophoneExist(micSerialNumber, micManufacturer);
  const micExistsInFirestore = await doesMicrophoneExistInFirestore(
    micSerialNumber,
    micManufacturer
  );

  if (micExistsInFirestore) {
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
        CreateDate: new Date(),
        DateText: getCurrentTimeString(),
        linear: {
          Freq: data.Freq,
          Gain: data.Gain,
        },
        serial: microphoneInfo.current.micFullSerialNumber,
        DeviceType: "N/A",
        HardwareModel: microphoneInfo.current.micrFullManufacturerName,
        HardwareName: microphoneInfo.current.micrFullManufacturerName,
        ID: microphoneInfo.current.micFullSerialNumber,
        OEM: microphoneInfo.current.micrFullManufacturerName,
        PlatformName: "N/A",
        PlatformVersion: "N/A",
        hardwareFamily: microphoneInfo.current.micrFullManufacturerName,
        micModelName: microphoneInfo.current.micFullName,
        isDefault: true,
        micManufacturerName: microphoneInfo.current.micrFullManufacturerName,
        lowercaseOEM: micManufacturer,
        ID_from_51Degrees: "N/A",
      };

      // await addMicrophoneToDatabase(micSerialNumber, micManufacturer, micData);
      await addMicrophoneToFirestore(micData);
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
      allHzCalibrationResults.knownIr = JSON.parse(
        JSON.stringify(loudspeakerIR)
      );
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
  language,
  isParticipant = false
) => {
  // await startCalibration(elems, isLoudspeakerCalibration, language, true, isLoudspeakerCalibration? null: allHzCalibrationResults.knownIr);
  if (isLoudspeakerCalibration) {
    if (isParticipant) {
      await getLoudspeakerDeviceDetailsFromUserForSmartphone(
        elems,
        language,
        true,
        isLoudspeakerCalibration
      );
    } else {
      await getSmartPhoneMicrophoneDetailsFromUser(
        elems,
        language,
        isLoudspeakerCalibration
      );
    }
  } else {
    await getSmartPhoneMicrophoneDetailsFromUser(
      elems,
      language,
      isLoudspeakerCalibration
    );
  }
};

const getSmartPhoneMicrophoneDetailsFromUser = async (
  elems,
  language,
  isLoudspeakerCalibration
) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (stream) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const loudspeaker = devices.filter(
        (device) => device.kind === "audiooutput"
      );
      loudspeaker.forEach((speaker) => {
        if (speaker.label.includes("Default")) {
          webAudioDeviceNames.loudspeaker = speaker.label;
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
  // create input box for model number and name
  const modelNumberInput = document.createElement("input");
  modelNumberInput.type = "text";
  modelNumberInput.id = "modelNumberInput";
  modelNumberInput.name = "modelNumberInput";
  modelNumberInput.placeholder = "Model Number";

  const modelNameInput = document.createElement("input");
  modelNameInput.type = "text";
  modelNameInput.id = "modelNameInput";
  modelNameInput.name = "modelNameInput";
  modelNameInput.placeholder = "Model Name";

  const p = document.createElement("p");
  p.innerText = `Please enter the model number and name of the smartphone you are using for this calibration.`;
  p.style.fontWeight = "normal";
  // add a proceed button
  const proceedButton = document.createElement("button");
  proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
  proceedButton.classList.add(...["btn", "btn-success"]);

  // add  to the page
  elems.subtitle.appendChild(p);
  elems.subtitle.appendChild(modelNameInput);
  elems.subtitle.appendChild(modelNumberInput);
  elems.subtitle.appendChild(proceedButton);

  await new Promise((resolve) => {
    proceedButton.addEventListener("click", async () => {
      proceedButton.innerHTML = "Loading...";

      if (modelNameInput.value === "" || modelNumberInput.value === "") {
        alert("Please fill out all the fields");
      } else {
        if (isLoudspeakerCalibration) {
          const micSerialNumber = modelNumberInput.value;
          const micManufacturer = modelNameInput.value
            .toLowerCase()
            .split(" ")
            .join("");
          if (
            (micManufacturer === "umik-1" || micManufacturer === "umik-2") &&
            (await doesMicrophoneExistInFirestore(micSerialNumber, "minidsp"))
          ) {
            removeElements([
              p,
              proceedButton,
              modelNameInput,
              modelNumberInput,
            ]);
            adjustPageNumber(elems.title, [{ replace: 1, with: 2 }]);
            microphoneInfo.current = {
              micFullName: modelNameInput.value,
              micFullSerialNumber: modelNumberInput.value,
              micrFullManufacturerName: "miniDSP",
            };
            await getLoudspeakerDeviceDetailsFromUserForSmartphone(
              elems,
              language,
              true,
              isLoudspeakerCalibration
            );
            resolve();
          } else {
            p.innerHTML = readi18nPhrases(
              "RC_microphoneNotInCalibrationLibrary",
              language
            ).replace("xxx", modelNameInput.value);
            proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
          }
        } else {
          removeElements([p, proceedButton, modelNameInput, modelNumberInput]);
          adjustPageNumber(elems.title, [{ replace: 1, with: 2 }]);
          microphoneInfo.current = {
            micFullName: modelNameInput.value,
            micFullSerialNumber: modelNumberInput.value,
          };
          allHzCalibrationResults.knownIr = JSON.parse(
            JSON.stringify(loudspeakerIR)
          );
          await startCalibration(
            elems,
            isLoudspeakerCalibration,
            language,
            true,
            isLoudspeakerCalibration ? null : allHzCalibrationResults.knownIr
          );
          resolve();
        }
      }
    });
  });
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
    ? microphoneInfo.current.micFullName
    : "";
  const micSerialNumber = microphoneInfo.current?.micFullSerialNumber
    ? microphoneInfo.current.micFullSerialNumber
    : "";
  const micManufacturer = microphoneInfo.current?.micrFullManufacturerName
    ? microphoneInfo.current.micrFullManufacturerName
    : "";
  const { Speaker, CombinationCalibration } = speakerCalibrator;
  webAudioDeviceNames.loudspeakerText = readi18nPhrases(
    "RC_nameLoudspeaker",
    language
  )
    .replace("xxx", webAudioDeviceNames.loudspeaker)
    .replace("XXX", webAudioDeviceNames.loudspeaker);
  webAudioDeviceNames.microphoneText = readi18nPhrases(
    "RC_nameMicrophone",
    language
  );
  IDsToSaveInSoundProfileLibrary.ProlificParticipantID = isProlificExperiment()
    ? new URLSearchParams(window.location.search).get("participant")
    : "";
  IDsToSaveInSoundProfileLibrary.PavloviaSessionID =
    thisExperimentInfo.PavloviaSessionID;

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
    soundSubtitleId: "soundSubtitle",
    webAudioDeviceNames: webAudioDeviceNames,
    IDsToSaveInSoundProfileLibrary: IDsToSaveInSoundProfileLibrary,
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
    calibrateSoundIRSec: calibrateSoundIRSec.current,
    calibrateSound1000HzPreSec: calibrateSound1000HzPreSec.current,
    calibrateSound1000HzSec: calibrateSound1000HzSec.current,
    calibrateSound1000HzPostSec: calibrateSound1000HzPostSec.current,
    calibrateSoundBackgroundSecs: calibrateSoundBackgroundSecs.current,
    calibrateSoundSmoothOctaves: calibrateSoundSmoothOctaves.current,
    calibrateSoundPowerBinDesiredSec: calibrateSoundPowerBinDesiredSec.current,
    calibrateSoundPowerDbSDToleratedDb:
      calibrateSoundPowerDbSDToleratedDb.current,
    calibrateMicrophonesBool: calibrateMicrophonesBool.current,
    authorEmails: authorEmail.current,
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
  timeToCalibrate.timeAtTheStartOfCalibration = new Date();
  const results = await Speaker.startCalibration(
    speakerParameters,
    calibrator,
    timeoutSec.current
  );
  timeToCalibrate.timeAtTheEndOfCalibration = new Date();
  // timeToCalibrate.calibrationDuration in minutes
  timeToCalibrate.calibrationDuration = Math.round(
    (timeToCalibrate.timeAtTheEndOfCalibration -
      timeToCalibrate.timeAtTheStartOfCalibration) /
      1000 /
      60
  );
  const timeElement = document.getElementById("timeToCalibrate");
  timeElement.innerHTML = readi18nPhrases(
    "RC_calibrationEstimatedAndActualMinutes",
    language
  )
    .replace("111", timeToCalibrate.current)
    .replace("222", timeToCalibrate.calibrationDuration);
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
  qualityMetrics.current = results.qualityMetrics;
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
  if (microphoneInfo.current.micFullName === "umik-1") {
    microphoneInfo.current.micFullName = "UMIK-1";
  }
  if (microphoneInfo.current.micFullName === "umik-2") {
    microphoneInfo.current.micFullName = "UMIK-2";
  }
  microphoneInfo.current.micFullSerialNumber = isSmartPhone
    ? microphoneInfo.current.ID
    : microphoneInfo.current.micFullSerialNumber;
  microphoneInfo.current.micrFullManufacturerName = isSmartPhone
    ? microphoneInfo.current.OEM
    : microphoneInfo.current.micrFullManufacturerName;
  if (microphoneInfo.current.micrFullManufacturerName === "minidsp") {
    microphoneInfo.current.micrFullManufacturerName = "miniDSP";
  }
  actualSamplingRate.current =
    soundCalibrationResults.current.audioInfo?.sourceSampleRate;
  microphoneActualSamplingRate.current =
    soundCalibrationResults.current.audioInfo?.sinkSampleRate;
  actualBitsPerSample.current =
    soundCalibrationResults.current.audioInfo?.bitsPerSample;
  microphoneInfo.current.CalibrationDate = getCurrentTimeString();
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
    // const FreqGain = await readFrqGain(ID, OEM);
    const FreqGain = await readFrqGainFromFirestore(ID, OEM);
    allHzCalibrationResults.microphoneGain = FreqGain
      ? FreqGain
      : { Freq: [], Gain: [] };
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
  soundGainDBSPL.current = soundCalibrationResults.current.parameters.gainDBSPL;
  soundGainDBSPL.current = Math.round(soundGainDBSPL.current * 10) / 10;
  allHzCalibrationResults.timestamps =
    soundCalibrationResults.current.timeStamps;
  const modelNumber = loudspeakerInfo.current.fullLoudspeakerModelNumber;
  const modelName = loudspeakerInfo.current.fullLoudspeakerModelName;
  loudspeakerInfo.current = {
    ...loudspeakerInfo.current,
    webAudioDeviceNames: {
      loudspeaker: webAudioDeviceNames.loudspeaker,
      microphone: webAudioDeviceNames.microphone,
    },
    PavloviaSessionID: thisExperimentInfo.PavloviaSessionID,
    userIDs: IDsToSaveInSoundProfileLibrary,
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
    CalibrationDate: getCurrentTimeString(),
    CreateDate: new Date(),
    micInfo: microphoneInfo.current,
    calibrateMicrophonesBool: calibrateMicrophonesBool.current,
  };
  if (calibrateMicrophonesBool.current) {
    loudspeakerInfo.current.authorEmails = authorEmail.current;
  }
  const IrFreq = soundCalibrationResults.current.component.ir.Freq.map((freq) =>
    Math.round(freq)
  );
  let IrGain = soundCalibrationResults.current.component.ir.Gain;
  const correctGain = loudspeakerInfo.current["gainDBSPL"];
  const IrGainAt1000Hz = IrGain[IrFreq.findIndex((freq) => freq === 1000)];
  const difference = Math.round(10 * (IrGainAt1000Hz - correctGain)) / 10;
  IrGain = IrGain.map((gain) => gain - difference);
  soundCalibrationResults.current.component.ir = { Freq: IrFreq, Gain: IrGain };
  loudspeakerIR.Freq = IrFreq;
  loudspeakerIR.Gain = IrGain;
  allHzCalibrationResults.knownIr = JSON.parse(
    JSON.stringify(soundCalibrationResults.current.component.ir)
  );
  downloadLoudspeakerCalibration();
  try {
    await saveLoudSpeakerInfoToFirestore(
      loudspeakerInfo.current,
      modelNumber,
      thisDevice.current.OEM,
      soundCalibrationResults.current.component.ir,
      soundCalibrationResults.current.component.iir
    );
  } catch (err) {
    console.log(err);
  }
};

const parseMicrophoneCalibrationResults = async (result, isSmartPhone) => {
  microphoneCalibrationResult.current = result;
  console.log(microphoneCalibrationResult.current);
  microphoneInfo.current.gainDBSPL =
    Math.round(
      (microphoneCalibrationResult.current.parameters.gainDBSPL -
        loudspeakerInfo.current.gainDBSPL) *
        10
    ) / 10;
  microphoneInfo.current.CalibrationDate = getCurrentTimeString();
  // microphoneCalibrationResult.current.microphoneGain = loudspeakerIR.current;
  microphoneInfo.current.micrFullManufacturerName = isSmartPhone
    ? microphoneCalibrationResult.current.micInfo.OEM
    : microphoneInfo.current.micrFullManufacturerName;
  const IrFreq = result?.component.ir.Freq.map((freq) => Math.round(freq));
  let IrGain = result?.component?.ir.Gain;
  const correctGain = microphoneInfo.current.gainDBSPL;
  const IrGainAt1000Hz = IrGain[IrFreq.findIndex((freq) => freq === 1000)];
  const difference = Math.round(10 * (IrGainAt1000Hz - correctGain)) / 10;
  IrGain = IrGain.map((gain) => gain - difference);
  microphoneCalibrationResult.current.component.ir = {
    Freq: IrFreq,
    Gain: IrGain,
  };
  let allResults = {
    SoundGainParameters: result.parameters,
    Cal1000HzInDb: result.inDBValues ? result.inDBValues : [],
    Cal1000HzOutDb: result.outDBSPL1000Values ? result.outDBSPL1000Values : [],
    outDBSPLValues: result.outDBSPLValues,
    THD: result.thdValues,
    isSmartPhone: isSmartPhone,
    HardwareName: microphoneInfo.current.HardwareName,
    HardwareFamily: microphoneInfo.current.HardwareFamily,
    HardwareModel: microphoneInfo.current.HardwareModel,
    HardwareModelVariants: microphoneInfo.currentHardwareModelVariants,
    PlatformVersion: microphoneInfo.current.PlatformVersion,
    DeviceType: microphoneInfo.current.DeviceType,
    CalibrationDate: microphoneInfo.current.CalibrationDate,
    MlsSpectrumHz_system: result?.system?.psd?.conv?.x,
    MlsSpectrumFilteredDb_system: result?.system?.psd?.conv?.y,
    MlsSpectrumUnfilteredHz_system: result?.system?.psd?.unconv?.x,
    MlsSpectrumUnfilteredDb_system: result?.system?.psd?.unconv?.y,
    MlsSpectrumHz_component: result?.component?.psd?.conv?.x,
    MlsSpectrumFilteredDb_component: result?.component?.psd?.conv?.y,
    MlsSpectrumUnfilteredHz_component: result?.component?.psd?.unconv?.x,
    MlsSpectrumUnfilteredDb_component: result?.component?.psd?.unconv?.y,
    "Microphone Component IR": {
      Freq: IrFreq,
      Gain: IrGain,
    },
    "Microphone Component IIR": result?.component?.iir,
    "Loudspeaker Component IR Time Domain":
      result?.component?.ir_in_time_domain,
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
    "Loudspeaker model": loudspeakerInfo.current,
    micInfo: {
      micModelName: microphoneInfo.current.micFullName,
      OEM: microphoneInfo.current.micrFullManufacturerName,
      ID: microphoneInfo.current.micFullSerialNumber,
      gainDBSPL: microphoneInfo.current.gainDBSPL,
    },
    unconv_rec: result?.unfiltered_recording,
    conv_rec: result?.filtered_recording,
    mls: result?.mls,
    componentConvolution: result?.component?.convolution,
    systemConvolution: result?.system?.convolution,
    autocorrelations: result?.autocorrelations,
    backgroundRecording: result?.background_noise?.recording,
    db_BackgroundNoise: result?.background_noise?.x_background,
    Hz_BackgroundNoise: result?.background_noise?.y_background,
    db_system_convolution: result.system?.filtered_mls_psd?.y,
    Hz_system_convolution: result.system?.filtered_mls_psd?.x,
    db_component_convolution: result.component?.filtered_mls_psd?.y,
    Hz_component_convolution: result.component?.filtered_mls_psd?.x,
    loudspeakerGain: loudspeakerIR,
    db_mls: result.mls_psd?.y,
    Hz_mls: result.mls_psd?.x,
    recordingChecks: result.recordingChecks,
    calibrateSoundBurstDb: calibrateSoundBurstDb.current,
    calibrateSoundBurstSec: calibrateSoundBurstSec.current,
    calibrateSoundBurstRepeats: calibrateSoundBurstRepeats.current,
    calibrateSoundIIRSec: calibrateSoundIIRSec.current,
    calibrateSoundMinHz: calibrateSoundMinHz.current,
    calibrateSoundMaxHz: calibrateSoundMaxHz.current,
    calibrateSound1000HzSec: calibrateSound1000HzSec.current,
    calibrateSound1000HzPreSec: calibrateSound1000HzPreSec.current,
    calibrateSound1000HzPostSec: calibrateSound1000HzPostSec.current,
    calibrateSoundHz: calibrateSoundHz.current,
    calibrateSoundSmoothOctaves: calibrateSoundSmoothOctaves.current,
    sampleRate: {
      loudspeaker: actualSamplingRate.current,
      microphone: microphoneActualSamplingRate.current,
    },
    sampleSize: actualBitsPerSample.current,
    filteredMLSRange: result.filteredMLSRange,
    webAudioDeviceNames: {
      loudspeaker: webAudioDeviceNames.loudspeaker,
      microphone: webAudioDeviceNames.microphone,
    },
  };
  microphoneCalibrationResults.push(allResults);
  if (calibrateSoundSaveJSONBool.current) {
    psychoJS.experiment.downloadJSON(allResults, calibrationRound.current);
    calibrationRound.current = calibrationRound.current + 1;
  }
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
    ? isLoudspeakerCalibration
      ? `${readi18nPhrases(
          "RC_hopeMicrophoneIsInLibrary",
          language
        )}${readi18nPhrases("RC_pointCameraAtQR", language)}`.replace(
          /\n/g,
          "<br>"
        )
      : `${readi18nPhrases("RC_pointCameraAtQR", language)}`.replace(
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
    // elems.timeToCalibrate.innerHTML = "";
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

const downloadLoudspeakerCalibration = () => {
  let allSoundResults;
  if (soundCalibrationResults.current && calibrateSoundSaveJSONBool.current) {
    allSoundResults = {
      SoundGainParameters: soundCalibrationResults.current?.parameters,
      Cal1000HzInDb: soundCalibrationResults.current?.inDBValues,
      Cal1000HzOutDb: soundCalibrationResults.current?.outDBSPL1000Values,
      outDBSPLValues: soundCalibrationResults.current?.outDBSPLValues,
      THD: soundCalibrationResults.current?.thdValues,
      MlsSpectrumHz_system:
        soundCalibrationResults.current?.system?.psd?.conv?.x,
      MlsSpectrumFilteredDb_system:
        soundCalibrationResults.current?.system?.psd?.conv?.y,
      MlsSpectrumUnfilteredHz_system:
        soundCalibrationResults.current?.system?.psd?.unconv?.x,
      MlsSpectrumUnfilteredDb_system:
        soundCalibrationResults.current?.system?.psd?.unconv?.y,
      MlsSpectrumHz_component:
        soundCalibrationResults.current?.component?.psd?.conv?.x,
      MlsSpectrumFilteredDb_component:
        soundCalibrationResults.current?.component?.psd?.conv?.y,
      MlsSpectrumUnfilteredHz_component:
        soundCalibrationResults.current?.component?.psd?.unconv?.x,
      MlsSpectrumUnfilteredDb_component:
        soundCalibrationResults.current?.component?.psd?.unconv?.y,
      "Loudspeaker Component IR": loudspeakerIR,
      "Loudspeaker Component IIR":
        soundCalibrationResults.current?.component?.iir,
      "Loudspeaker Component IR Time Domain":
        soundCalibrationResults.current?.component?.ir_in_time_domain,
      "Loudspeaker system IR": soundCalibrationResults.current?.system?.ir,
      "Loudspeaker system IIR": soundCalibrationResults.current?.system?.iir,
      dB_component_iir: soundCalibrationResults.current?.component?.iir_psd?.y,
      Hz_component_iir: soundCalibrationResults.current?.component?.iir_psd?.x,
      dB_component_iir_no_bandpass:
        soundCalibrationResults.current?.component?.iir_psd?.y_no_bandpass,
      Hz_component_iir_no_bandpass:
        soundCalibrationResults.current?.component?.iir_psd?.x_no_bandpass,
      dB_system_iir: soundCalibrationResults.current?.system?.iir_psd?.y,
      Hz_system_iir: soundCalibrationResults.current?.system?.iir_psd?.x,
      dB_system_iir_no_bandpass:
        soundCalibrationResults.current?.system?.iir_psd?.y_no_bandpass,
      Hz_system_iir_no_bandpass:
        soundCalibrationResults.current?.system?.iir_psd?.x_no_bandpass,
      "Loudspeaker model": loudspeakerInfo.current,
      micInfo: soundCalibrationResults.current?.micInfo,
      unconv_rec: soundCalibrationResults.current?.unfiltered_recording,
      conv_rec: soundCalibrationResults.current?.filtered_recording,
      mls: soundCalibrationResults.current?.mls,
      componentConvolution:
        soundCalibrationResults.current?.component?.convolution,
      systemConvolution: soundCalibrationResults.current?.system?.convolution,
      autocorrelations: {},
      // backgroundNoise: soundCalibrationResults.current?.background_noise,
      backgroundRecording:
        soundCalibrationResults.current?.background_noise?.recording,
      db_BackgroundNoise:
        soundCalibrationResults.current?.background_noise?.x_background,
      Hz_BackgroundNoise:
        soundCalibrationResults.current?.background_noise?.y_background,
      db_system_convolution:
        soundCalibrationResults.current?.system?.filtered_mls_psd?.y,
      Hz_system_convolution:
        soundCalibrationResults.current?.system?.filtered_mls_psd?.x,
      db_component_convolution:
        soundCalibrationResults.current?.component?.filtered_mls_psd?.y,
      Hz_component_convolution:
        soundCalibrationResults.current?.component?.filtered_mls_psd?.x,
      microphoneGain: allHzCalibrationResults.microphoneGain,
      db_mls: soundCalibrationResults.current?.mls_psd?.y,
      Hz_mls: soundCalibrationResults.current?.mls_psd?.x,
      recordingChecks: soundCalibrationResults.current?.recordingChecks,
      calibrateSoundBurstDb: calibrateSoundBurstDb.current,
      calibrateSoundBurstSec: calibrateSoundBurstSec.current,
      calibrateSoundBurstRepeats: calibrateSoundBurstRepeats.current,
      calibrateSoundIIRSec: calibrateSoundIIRSec.current,
      calibrateSoundMinHz: calibrateSoundMinHz.current,
      calibrateSoundMaxHz: calibrateSoundMaxHz.current,
      calibrateSound1000HzSec: calibrateSound1000HzSec.current,
      calibrateSound1000HzPreSec: calibrateSound1000HzPreSec.current,
      calibrateSound1000HzPostSec: calibrateSound1000HzPostSec.current,
      calibrateSoundHz: calibrateSoundHz.current,
      calibrateSoundSmoothOctaves: calibrateSoundSmoothOctaves.current,
      filteredMLSRange: allHzCalibrationResults.filteredMLSRange,
      sampleRate: {
        loudspeaker: actualSamplingRate.current,
        microphone: microphoneActualSamplingRate.current,
      },
      sampleSize: actualBitsPerSample.current,
      filteredMLSRange: allHzCalibrationResults.filteredMLSRange,
      webAudioDeviceNames: {
        loudspeaker: webAudioDeviceNames.loudspeaker,
        microphone: webAudioDeviceNames.microphone,
      },
    };
  }
  if (
    soundCalibrationResults.current?.autocorrelations?.length > 0 &&
    calibrateSoundSaveJSONBool.current
  ) {
    for (
      let i = 0;
      i < soundCalibrationResults.current.autocorrelations.length;
      i++
    ) {
      allSoundResults["autocorrelations"][`autocorrelation_${i}`] =
        soundCalibrationResults.current.autocorrelations[i];
    }
  }
  if (allSoundResults && calibrateSoundSaveJSONBool.current)
    psychoJS.experiment.downloadJSON(allSoundResults, calibrationRound.current);
  calibrationRound.current = calibrationRound.current + 1;
};
