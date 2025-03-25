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
  calibrateSound1000HzMaxSD_dB,
  calibrateSound1000HzMaxTries,
  calibrateSoundBackgroundSecs,
  calibrateSoundSmoothOctaves,
  calibrateSoundSmoothMinBandwidthHz,
  calibrateSoundPowerBinDesiredSec,
  calibrateSoundPowerDbSDToleratedDb,
  calibrateSoundTaperSec,
  calibrateSoundBurstDb,
  calibrateSoundBurstFilteredExtraDb,
  calibrateSoundBurstLevelReTBool,
  calibrateSoundBurstMLSVersions,
  calibrateSoundBurstRepeats,
  calibrateSoundBurstSec,
  _calibrateSoundBurstPreSec,
  _calibrateSoundBurstPostSec,
  _calibrateSoundBurstMaxSD_dB,
  calibrateSoundCheck,
  calibrateSoundHz,
  calibrateSoundIIRSec,
  calibrateSoundIIRPhase,
  calibrateSoundIRSec,
  calibrateSoundMaxHz,
  calibrateSoundMinHz,
  calibrateSoundSamplingDesiredBits,
  calibrationTime,
  debugBool,
  fMaxHz,
  attenuatorGainDB,
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
  calibrateSoundLimit,
  filteredMLSAttenuation,
  deviceType,
  calibrateSoundBurstScalarDB,
  flags,
  calibrateSoundBurstNormalizeBy1000HzGainBool,
  timeoutSoundCalibrationSec,
  timeoutNewPhoneSec,
  loudspeakerBrowserDetails,
  microphoneBrowserDetails,
} from "./global";
import { readi18nPhrases } from "./readPhrases";
import {
  addMicrophoneToFirestore,
  doesMicrophoneExistInFirestore,
  doesLoudspeakerExistInFirestore,
  findGainatFrequency,
  getCalibrationFile,
  fetchLoudspeakerGain,
  getDeviceDetails,
  getDeviceString,
  getInstructionText_,
  identifyDevice,
  parseCalibrationFile,
  readFrqGainFromFirestore,
  removeElements,
  saveLoudSpeakerInfoToFirestore,
  writeIsSmartPhoneToFirestore,
  writeMicrophoneInfoToFirestore,
  writeFrqGainToFirestore,
  writeGainat1000HzToFirestore,
  reportBrowserIdentificationToFirestore,
} from "./soundCalibrationHelpers";
import { showExperimentEnding } from "./forms";
import { getCurrentTimeString } from "./soundUtils";
import { isProlificExperiment } from "./externalServices";
import { psychoJS } from "./globalPsychoJS";
import {
  AllBrands,
  AllModelNames,
  AllModelNumbers,
  getAutoCompleteSuggestionElements,
  addQRSkipButtons,
} from "./compatibilityCheckHelpers";
import {
  getPreferredModelNumberAndName,
  QRSkipResponse,
} from "./compatibilityCheck";
import { getInstructionText } from "./compatibilityCheck";
import { quitPsychoJS } from "./lifetime";
import { formatTimestamp } from "./utils";
import { paramReader } from "../threshold.js";
import {
  initializeMicrophoneDropdownForCalibration,
  startMicrophonePolling,
} from "./soundTest";
import { phrases } from "./i18n";
import {
  CompatibilityPeer,
  ConnectionManager,
  ConnectionManagerDisplay,
  getConnectionManagerDisplay,
  qrLink,
  SoundCalibrationPeer,
} from "./connectAPeer";

const globalGains = { values: [] };
let select;

// Add this function at the top of the file with other utility functions
const loadDymoFramework = async () => {
  return new Promise((resolve, reject) => {
    try {
      if (typeof dymo !== "undefined" && dymo.label && dymo.label.framework) {
        try {
          if (dymo.label.framework.init) {
            dymo.label.framework.init(() => {
              resolve();
            });
          }
          return;
        } catch (e) {
          console.log("Failed to reinit framework:", e);
          reject(e);
          return;
        }
      }

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src =
        "https://easyeyes-cors-proxy-1cf4742aef20.herokuapp.com/https://qajavascriptsdktests.azurewebsites.net/JavaScript/dymo.connect.framework.js";
      script.crossOrigin = "anonymous";

      script.onload = () => {
        try {
          if (dymo.label.framework.init) {
            dymo.label.framework.init(() => {
              resolve();
            });
          }
        } catch (error) {
          console.log("DYMO framework initialization failed:", error);
          reject(error);
        }
      };

      script.onerror = (e) => {
        console.log("Failed to load DYMO Framework script:", e);
        reject(new Error("Failed to load DYMO Framework script"));
      };

      document.head.appendChild(script);
    } catch (error) {
      console.log("DYMO framework loading failed:", error);
      reject(error);
    }
  });
};

// combination calibration combines the two calibration methods (1000Hz and AllHz calibrations)
export const runCombinationCalibration = async (
  elems,
  gains,
  isLoudspeakerCalibration,
  language,
) => {
  webAudioDeviceNames.loudspeaker = "";
  webAudioDeviceNames.microphone = "";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (stream) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((device) => device.kind === "audioinput");
      mics.forEach((mic) => {
        if (mic.label.includes("Default")) {
          webAudioDeviceNames.microphone = mic.label;
          webAudioDeviceNames.microphoneText = readi18nPhrases(
            "RC_nameMicrophone",
            language,
          )
            .replace("xxx", webAudioDeviceNames.microphone)
            .replace("XXX", webAudioDeviceNames.microphone);
        }
      });

      if (webAudioDeviceNames.microphone === "" && mics.length > 0) {
        webAudioDeviceNames.microphone = mics[0].label;
        webAudioDeviceNames.microphoneText = readi18nPhrases(
          "RC_nameMicrophone",
          language,
        )
          .replace("xxx", webAudioDeviceNames.microphone)
          .replace("XXX", webAudioDeviceNames.microphone);
      }
      const loudspeaker = devices.filter(
        (device) => device.kind === "audiooutput",
      );
      console.log("loudspeaker", loudspeaker);
      loudspeaker.forEach((speaker) => {
        if (speaker.label.includes("Default")) {
          webAudioDeviceNames.loudspeaker = speaker.label;
          webAudioDeviceNames.loudspeakerText = readi18nPhrases(
            "RC_nameLoudspeaker",
            language,
          )
            .replace("xxx", webAudioDeviceNames.loudspeaker)
            .replace("XXX", webAudioDeviceNames.loudspeaker);
        }
      });

      if (webAudioDeviceNames.loudspeaker === "" && loudspeaker.length > 0) {
        webAudioDeviceNames.loudspeaker = loudspeaker[0].label;
        webAudioDeviceNames.loudspeakerText = readi18nPhrases(
          "RC_nameLoudspeaker",
          language,
        )
          .replace("xxx", webAudioDeviceNames.loudspeaker)
          .replace("XXX", webAudioDeviceNames.loudspeaker);
      }
    }
  } catch (err) {
    console.log(err);
  }
  globalGains.values = gains;
  elems.message.style.display = "none";
  elems.title.innerHTML = isLoudspeakerCalibration
    ? readi18nPhrases("RC_loudspeakerCalibration", language)
    : readi18nPhrases("RC_microphoneCalibration", language);

  if (isLoudspeakerCalibration) {
    const isParticipant = false;
    deviceType.isParticipant = isParticipant;
    adjustPageNumber(elems.title, [
      { replace: /111/g, with: isLoudspeakerCalibration ? 1 : 0 },
      { replace: /222/g, with: isParticipant ? 4 : 7 },
    ]);
    if (isParticipant) {
      await runSmartphoneCalibration(
        elems,
        isLoudspeakerCalibration,
        language,
        true,
      );
    } else {
      // await runUSBCalibration(elems, isLoudspeakerCalibration, language);
      const dropdownTitle = readi18nPhrases(
        "RC_selectProfileOrMicrophoneType",
        language,
      ).replace(/\n/g, "<br>");
      // " " +
      // readi18nPhrases("RC_OkToConnect", language);

      // const { dropdown, proceedButton, p } = addDropdownMenu(
      //   elems,
      //   options,
      //   dropdownTitle,
      //   language,
      // );

      thisDevice.current = await identifyDevice();
      console.log(thisDevice.current.DeviceId);
      const { doesLoudspeakerExist, createDate } =
        await doesLoudspeakerExistInFirestore(
          thisDevice.current.DeviceId,
          thisDevice.current.OEM,
        );
      let options;
      const dateFormatter = new Intl.DateTimeFormat(language, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const fetchLoudspeakerOption = readi18nPhrases(
        "RC_useProfileLibrary",
        language,
      ).replace(
        "111",
        doesLoudspeakerExist ? dateFormatter.format(createDate, language) : "",
      );

      if (doesLoudspeakerExist) {
        options = [
          fetchLoudspeakerOption,
          readi18nPhrases("RC_smartphone", language),
          readi18nPhrases("RC_usbMicrophone", language),
        ];
      } else {
        options = [
          readi18nPhrases("RC_smartphone", language),
          readi18nPhrases("RC_usbMicrophone", language),
        ];
      }

      const { radioContainer, proceedButton, p } = addRadioButtonGroup(
        elems,
        options,
        dropdownTitle,
        language,
      );
      // adjustPageNumber(elems.title, [
      //   { replace: /111/g, with: 0 },
      //   { replace: /222/g, with: 5 },
      // ]);
      await new Promise((resolve) => {
        proceedButton.addEventListener("click", async () => {
          // Get the selected radio button
          const selectedOption = document.querySelector(
            'input[name="micOptions"]:checked',
          );
          removeElements([radioContainer, proceedButton, p]);
          if (selectedOption.value === fetchLoudspeakerOption) {
            await fetchLoudspeakerGain(
              thisDevice.current.DeviceId,
              thisDevice.current.OEM,
            );

            // change subtitle
            elems.subtitle2.innerText = readi18nPhrases(
              "RC_removeHeadphonesUsingProfile",
              language,
            );

            if (calibrateMicrophonesBool.current) {
              // deviceType.isLoudspeaker = false;
              deviceType.showSystemCorrection = false;
              deviceType.profileFetchedFromLibrary = true;
            }
            //await runCombinationCalibration(elems, gains, false, language);}
            resolve();
          } else {
            const isSmartPhone =
              selectedOption.value ===
              readi18nPhrases("RC_smartphone", language);
            deviceType.isSmartphone = isSmartPhone;
            deviceType.isLoudspeaker = isLoudspeakerCalibration;
            adjustPageNumber(elems.title, [
              { replace: 1, with: 2 },
              { replace: 7, with: isSmartPhone ? 7 : 5 },
            ]);
            elems.subtitle.innerHTML = isLoudspeakerCalibration
              ? isSmartPhone
                ? readi18nPhrases("RC_usingSmartphoneMicrophone", language)
                : readi18nPhrases("RC_usingUSBMicrophone", language)
              : elems.subtitle.innerHTML;
            elems.subtitle.style.fontSize = "1.1rem";
            if (isSmartPhone) {
              await scanQRCodeForSmartphoneIdentification(
                elems,
                language,
                isLoudspeakerCalibration,
              );
            } else {
              deviceType.isLoudspeaker = isLoudspeakerCalibration;
              await getUSBMicrophoneDetailsFromUser(
                // call for page 2
                elems,
                language,
                isLoudspeakerCalibration,
              );
              // await runUSBCalibration(
              //   elems,
              //   isLoudspeakerCalibration,
              //   language,
              // );
            }

            resolve();
          }
        });
      });
    }
  } else {
    const options = [
      readi18nPhrases("RC_smartphone", language),
      readi18nPhrases("RC_usbMicrophone", language),
      //readi18nPhrases("RC_none", language),
    ];

    const dropdownTitle =
      readi18nPhrases("RC_helloCalibrator", language)
        .replace("xxx", authorEmail.current)
        .replace("xxx", authorEmail.current)
        .replace("XXX", authorEmail.current)
        .replace("XXX", authorEmail.current) +
      " " +
      readi18nPhrases("RC_selectMicrophoneTypeToBeCalibrated", language);
    const { radioContainer, proceedButton, p } = addRadioButtonGroup(
      elems,
      options,
      dropdownTitle,
      language,
      isLoudspeakerCalibration,
    );
    adjustPageNumber(elems.title, [
      { replace: /111/g, with: 1 },
      { replace: /222/g, with: 6 },
    ]);
    await new Promise((resolve) => {
      proceedButton.addEventListener("click", async () => {
        const selectedOption = document.querySelector(
          'input[name="micOptions"]:checked',
        );
        console.log(selectedOption.value);
        if (selectedOption.value === "None") {
          showExperimentEnding();
        }
        const isSmartPhone =
          selectedOption.value === readi18nPhrases("RC_smartphone", language);
        deviceType.isSmartphone = isSmartPhone;
        adjustPageNumber(elems.title, [
          { replace: 1, with: 2 },
          { replace: 6, with: isSmartPhone ? 6 : 4 },
        ]);
        removeElements([radioContainer, proceedButton, p]);
        elems.subtitle.innerHTML = isLoudspeakerCalibration
          ? isSmartPhone
            ? readi18nPhrases("RC_usingSmartphoneMicrophone", language)
            : readi18nPhrases("RC_usingUSBMicrophone", language)
          : elems.subtitle.innerHTML;
        elems.subtitle.style.fontSize = "1.1rem";

        if (isSmartPhone) {
          await scanQRCodeForSmartphoneIdentification(
            elems,
            language,
            isLoudspeakerCalibration,
          );
          // await runSmartphoneCalibration(
          //   elems,
          //   isLoudspeakerCalibration,
          //   language,
          //   false,
          // );
        } else {
          // await runUSBCalibration(elems, isLoudspeakerCalibration, language);
          await getUSBMicrophoneDetailsFromUser(
            // call for page 2
            elems,
            language,
            isLoudspeakerCalibration,
          );
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
  p.style.userSelect = "text";
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

const addRadioButtonGroup = (
  elems,
  options,
  title,
  language,
  isLoudspeakerCalibration = true,
) => {
  // Create a container for the radio buttons
  const radioContainer = document.createElement("div");
  radioContainer.style.fontWeight = "bold";
  radioContainer.id = "micRadioGroup";

  // Create radio buttons for each option
  options.forEach((option, index) => {
    const radioWrapper = document.createElement("div");

    // Set display to flex for alignment
    radioWrapper.style.display = "flex";
    radioWrapper.style.alignItems = "top"; // Align items vertically centered
    radioWrapper.style.marginBottom = "0.2rem"; // Space between each radio option

    const radioInput = document.createElement("input");
    radioInput.type = "radio";
    radioInput.id = option;
    radioInput.name = "micOptions";
    radioInput.value = option;
    radioInput.style.marginTop = "2px";

    if (index === 0) {
      radioInput.checked = true;
    }

    // Style radio input for minimal gap and alignment
    radioInput.style.marginRight = "0.2rem"; // Minimal space between radio button and label
    radioInput.style.verticalAlign = "top"; // Align the radio button vertically with the text

    // Make the radio button narrow
    radioInput.style.width = "15px";
    radioInput.style.height = "15px";
    radioInput.style.cursor = "pointer"; // Change cursor to pointer for better UX

    const radioLabel = document.createElement("label");
    radioLabel.setAttribute("for", option);
    radioLabel.innerHTML = option;

    // Set the font size and line height for the radio button label
    radioLabel.style.fontSize = "1rem"; // Adjust the font size as desired
    radioLabel.style.lineHeight = "1.2"; // Adjust the line-height for better alignment
    radioLabel.style.userSelect = "text";

    radioWrapper.appendChild(radioInput);
    radioWrapper.appendChild(radioLabel);
    radioContainer.appendChild(radioWrapper);
  });

  // Create a title paragraph
  const p = document.createElement("p");
  p.innerHTML = title;
  p.style.fontSize = "1rem";
  p.style.userSelect = "text";

  // Clear and add to the page
  elems.subtitle.innerHTML = "";
  elems.subtitle.appendChild(p);
  elems.subtitle.appendChild(radioContainer);

  // Add a proceed button
  const proceedButton = document.createElement("button");
  proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
  proceedButton.classList.add(...["btn", "btn-success"]);
  proceedButton.style.marginTop = "1rem";
  elems.subtitle.appendChild(proceedButton);

  return {
    radioContainer: radioContainer,
    proceedButton: proceedButton,
    p: p,
  };
};

const runUSBCalibration = async (elems, isLoudspeakerCalibration, language) => {
  // page 2'
  thisDevice.current = await identifyDevice();
  console.log("Device Information:", thisDevice.current);
  console.log(thisDevice);
  elems.title.innerHTML = isLoudspeakerCalibration
    ? elems.title.innerHTML
    : readi18nPhrases("RC_usbMicrophoneCalibration", language);
  isLoudspeakerCalibration
    ? null
    : adjustPageNumber(elems.title, [
        { replace: /111/g, with: "2'" },
        { replace: /222/g, with: 4 },
      ]);
  const p = document.createElement("p");

  const selectedMicrophone = select.options[select.selectedIndex].text; // Adjust if necessary
  const isUMIK2 = selectedMicrophone.toLowerCase().includes("umik-2");
  let instructionKey = "RC_connectUSBMicrophone";

  if (isUMIK2) {
    const os = thisDevice.current.PlatformName.toLowerCase();

    switch (os) {
      case "macos":
        instructionKey = "RC_setMicrophoneSamplingMacOS";
        break;
      case "windows":
        instructionKey = "RC_setMicrophoneSamplingWindows";
        break;
      case "linux":
        instructionKey = "RC_setMicrophoneSamplingLinux";
        break;
      case "chromeos":
        instructionKey = "RC_setMicrophoneSamplingChromeOS";
        break;
      default:
        instructionKey = "RC_setMicrophoneSamplingGeneric";
        break;
    }
  }
  let inforamtionText = readi18nPhrases(instructionKey, language)
    .replace("111", calibrateSoundHz.current)
    .replace("222", calibrateSoundSamplingDesiredBits.current)
    .replace(/\n/g, "<br>");
  if (isUMIK2) {
    inforamtionText = inforamtionText
      .replace("111", calibrateSoundHz.current)
      .replace("222", calibrateSoundSamplingDesiredBits.current);
  }

  p.innerHTML = inforamtionText;
  p.style.fontWeight = "normal";
  p.style.fontSize = "1rem";
  p.style.userSelect = "text";
  // p.style.marginTop = "1rem";

  const proceedButton = document.createElement("button");
  proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
  proceedButton.classList.add(...["btn", "btn-success"]);

  elems.subtitle.appendChild(p);
  elems.subtitle.appendChild(proceedButton);

  await new Promise((resolve) => {
    proceedButton.addEventListener("click", async () => {
      removeElements([p, proceedButton]);
      adjustPageNumber(elems.title, [{ replace: "2'", with: 3 }]);
      // await getUSBMicrophoneDetailsFromUser(
      //   elems,
      //   language,
      //   isLoudspeakerCalibration,
      // );
      // await runUSBCalibration(
      //   elems,
      //   isLoudspeakerCalibration,
      //   language,
      // )
      if (!isLoudspeakerCalibration) {
        await startCalibration(
          elems,
          isLoudspeakerCalibration,
          language,
          false,
          allHzCalibrationResults.knownIr,
          false,
        );
      } else {
        await getLoudspeakerDeviceDetailsFromUser(
          elems,
          language,
          false,
          isLoudspeakerCalibration,
          false,
        );
      }

      resolve();
    });
  });
};

const getUSBMicrophoneDetailsFromUser = async (
  // page 2
  elems,
  language,
  isLoudspeakerCalibration,
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
        (device) => device.kind === "audiooutput",
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
  const p = document.createElement("p");
  p.innerHTML = readi18nPhrases("RC_identifyUSBMicrophone", language).replace(
    "UUU",
    micName,
  );
  p.style.fontSize = "1rem";
  p.style.fontWeight = "normal";
  p.style.userSelect = "text";
  // p.style.marginTop = "1rem";

  // create input fields for the microphone name, manufacturer, and serial number
  const micNameInput = document.createElement("input");
  micNameInput.type = "text";
  micNameInput.id = "micNameInput";
  micNameInput.name = "micNameInput";
  micNameInput.placeholder = readi18nPhrases("RC_MicrophoneName", language);

  const micManufacturerInput = document.createElement("input");
  micManufacturerInput.type = "text";
  micManufacturerInput.id = "micManufacturerInput";
  micManufacturerInput.name = "micManufacturerInput";
  micManufacturerInput.placeholder = readi18nPhrases(
    "RC_MicrophoneManufacturer",
    language,
  );

  const micSerialNumberInput = document.createElement("input");
  micSerialNumberInput.type = "text";
  micSerialNumberInput.id = "micSerialNumberInput";
  micSerialNumberInput.name = "micSerialNumberInput";
  micSerialNumberInput.placeholder = readi18nPhrases(
    "RC_SerialNumber",
    language,
  );

  // add a proceed button
  const proceedButton = document.createElement("button");
  proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
  proceedButton.classList.add(...["btn", "btn-success"]);

  proceedButton.style.opacity = "0.5"; // Low contrast
  proceedButton.style.cursor = "not-allowed"; // Indicate disabled state
  proceedButton.style.pointerEvents = "none"; // Disable click events
  proceedButton.style.backgroundColor = "#6c757d"; // Gray background for disabled state
  proceedButton.style.color = "#fff"; // White text
  proceedButton.style.border = "none";
  proceedButton.style.padding = "0.5rem 1rem";
  proceedButton.style.borderRadius = "0.25rem";
  proceedButton.style.fontSize = "1rem";

  // add  to the page
  const disableProceedButton = () => {
    proceedButton.disabled = true;
    proceedButton.style.opacity = "0.5"; // Low contrast
    proceedButton.style.cursor = "not-allowed"; // Indicate disabled state
    proceedButton.style.pointerEvents = "none"; // Disable click events
    proceedButton.style.backgroundColor = "#6c757d"; // Gray background for disabled state
  };

  const enableProceedButton = () => {
    proceedButton.disabled = false;
    proceedButton.style.opacity = "1"; // Full opacity
    proceedButton.style.cursor = "pointer"; // Pointer cursor
    proceedButton.style.pointerEvents = "auto"; // Enable click events
    proceedButton.style.backgroundColor = "#28a745"; // Green background for enabled state
  };

  // Function to update the Proceed button state
  const updateProceedButtonState = () => {
    const selectedOption = select.options[select.selectedIndex];
    const isMicrophoneAllowed = selectedOption && !selectedOption.disabled;
    const areFieldsFilled =
      micNameInput.value.trim() !== "" &&
      micManufacturerInput.value.trim() !== "" &&
      micSerialNumberInput.value.trim() !== "";

    if (isMicrophoneAllowed && areFieldsFilled) {
      //if(true) {
      enableProceedButton();
      abortButton.style.display = "none"; // Hide Abort button
    } else if (!isMicrophoneAllowed) {
      disableProceedButton();
      abortButton.style.display = "inline"; // Show Abort button
    } else {
      disableProceedButton();
      abortButton.style.display = "none"; // Hide Abort button
    }
  };
  select = await initializeMicrophoneDropdownForCalibration(language);
  startMicrophonePolling(
    select,
    micNameInput,
    micManufacturerInput,
    updateProceedButtonState,
  );
  // Right after initializing "select"
  select.addEventListener("change", () => {
    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption === undefined) return;
    // We only auto-fill if the microphone is valid and not disabled
    if (
      !selectedOption.disabled &&
      /UMIK-1|UMIK-2/i.test(selectedOption.text)
    ) {
      micManufacturerInput.value = "miniDSP";
      // Extract whether it's UMIK-1 or UMIK-2
      const match = selectedOption.text.match(/UMIK-1|UMIK-2/i);
      if (match) {
        //if(true) {
        micNameInput.value = match[0].toUpperCase();
      }
    } else {
      // Clear fields if user picks a non-UMIK microphone
      micManufacturerInput.value = "";
      micNameInput.value = "";
    }
    updateProceedButtonState();
  });
  const selectedOption = select.options[select.selectedIndex];
  // We only auto-fill if the microphone is valid and not disabled
  if (
    selectedOption !== undefined &&
    !selectedOption.disabled &&
    /UMIK-1|UMIK-2/i.test(selectedOption.text)
  ) {
    micManufacturerInput.value = "miniDSP";
    // Extract whether it's UMIK-1 or UMIK-2
    const match = selectedOption.text.match(/UMIK-1|UMIK-2/i);
    if (match) {
      //if(true) {
      micNameInput.value = match[0].toUpperCase();
    }
  } else {
    // Clear fields if user picks a non-UMIK microphone
    micManufacturerInput.value = "";
    micNameInput.value = "";
  }

  const abortButton = document.createElement("button");
  abortButton.innerHTML = readi18nPhrases("RC_ButtonAbortNoMic", language);
  abortButton.classList.add(...["btn", "btn-success"]);
  abortButton.id = "abortButtonNoMic";
  abortButton.style.fontSize = "0.8rem"; // Smaller font
  abortButton.style.opacity = "0.5";
  abortButton.style.border = "none";
  abortButton.style.color = "#fff"; // Gray color
  abortButton.style.backgroundColor = "#6c757d"; // Transparent background
  abortButton.style.cursor = "pointer"; // Pointer cursor
  abortButton.style.padding = "0.55rem";

  // Container for Proceed and Abort buttons to align them properly
  const buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.style.alignItems = "center";
  buttonContainer.style.marginTop = "1rem";
  buttonContainer.style.width = "35%";
  buttonContainer.style.justifyContent = "space-between";

  buttonContainer.appendChild(proceedButton);
  buttonContainer.appendChild(abortButton);

  // Append elements to the page
  elems.subtitle.appendChild(p);
  elems.subtitle.appendChild(select);
  elems.subtitle.appendChild(micManufacturerInput);
  elems.subtitle.appendChild(micNameInput);
  elems.subtitle.appendChild(micSerialNumberInput);
  elems.subtitle.appendChild(getAutocompletionMessage(language));
  elems.subtitle.appendChild(buttonContainer);

  // Helper Functions to Enable/Disable Proceed Button

  // Initially hide the Abort button
  abortButton.style.display = "none";

  // Attach event listeners to inputs and select to monitor changes
  select.addEventListener("change", updateProceedButtonState);
  micNameInput.addEventListener("input", updateProceedButtonState);
  micManufacturerInput.addEventListener("input", updateProceedButtonState);
  micSerialNumberInput.addEventListener("input", updateProceedButtonState);

  // Initial check in case default selections/values satisfy conditions
  updateProceedButtonState();

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
            select,
          ]);
          adjustPageNumber(elems.title, [{ replace: 2, with: "2'" }]); // chnaging page 2 to page 2'

          // remove autocompletion message
          elems.subtitle.removeChild(
            document.getElementById("autocompletionMsg"),
          );

          if (!isLoudspeakerCalibration) {
            // await getLoudspeakerDeviceDetailsFromUser(
            //   elems,
            //   language,
            //   false,
            //   isLoudspeakerCalibration,
            //   false,
            // );
            allHzCalibrationResults.knownIr = JSON.parse(
              JSON.stringify(loudspeakerIR),
            );
          }
          await runUSBCalibration(elems, isLoudspeakerCalibration, language);
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

    abortButton.addEventListener("click", () => {
      // Remove all added elements
      removeElements([
        p,
        micNameInput,
        micManufacturerInput,
        micSerialNumberInput,
        proceedButton,
        abortButton,
        select,
        buttonContainer,
      ]);

      // Optionally, perform additional cleanup or state reset here

      // Call the initial page function to reset the calibration flow
      quitPsychoJS("", false, paramReader, !isProlificExperiment(), false);
      showExperimentEnding(true, isProlificExperiment(), language);
    });
  });
};

const getLoudspeakerDeviceDetailsFromUser = async (
  // page 3
  elems,
  language,
  isSmartPhone,
  isLoudspeakerCalibration,
  isParticipant,
) => {
  thisDevice.current = await identifyDevice();
  const { preferredModelNumber } = getDeviceDetails(
    thisDevice.current.PlatformName,
    language,
  );
  // display the device info
  const deviceString = getDeviceString(thisDevice.current, language);
  const instructionText = getInstructionText_(
    thisDevice.current,
    language,
    isSmartPhone,
    isLoudspeakerCalibration,
    preferredModelNumber,
  );

  // update subtitle
  elems.subtitle.innerHTML = "";

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
  elems.subtitle.appendChild(deviceStringElem);
  elems.subtitle.appendChild(modelNameInput);
  elems.subtitle.appendChild(modelNumberInput);
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
          JSON.stringify(loudspeakerIR),
        );
        await startCalibration(
          elems,
          isLoudspeakerCalibration,
          language,
          isSmartPhone,
          isLoudspeakerCalibration ? null : allHzCalibrationResults.knownIr,
          isParticipant,
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
  isLoudspeakerCalibration,
  isParticipant,
) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (stream) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const loudspeaker = devices.filter(
        (device) => device.kind === "audiooutput",
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
    language,
  );
  const instructionText = getInstructionText_(
    thisDevice.current,
    language,
    isSmartPhone,
    isLoudspeakerCalibration,
    preferredModelNumber,
  );
  // update subtitle
  elems.subtitle.innerHTML = readi18nPhrases(
    "RC_BrandDesktopComputer",
    language,
  ).replace(
    "BBB",
    thisDevice.current.OEM === "Unknown" ? "" : thisDevice.current.OEM,
  );
  elems.subtitle.style.fontSize = "1.1rem";

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
  elems.subtitle.appendChild(deviceStringElem);
  elems.subtitle.appendChild(modelNameInput);
  elems.subtitle.appendChild(modelNumberInput);
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
        adjustPageNumber(elems.title, [
          {
            replace: isLoudspeakerCalibration && isParticipant ? 1 : 4,
            with: isLoudspeakerCalibration && isParticipant ? 2 : 5,
          },
        ]);
        allHzCalibrationResults.knownIr = JSON.parse(
          JSON.stringify(loudspeakerIR),
        );
        await startCalibration(
          elems,
          isLoudspeakerCalibration,
          language,
          isSmartPhone,
          isLoudspeakerCalibration ? null : allHzCalibrationResults.knownIr,
          isParticipant,
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
    micManufacturer,
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
      const data = parseCalibrationFile(file, micName);
      const Gain = findGainatFrequency(data.Freq, data.Gain, 1000);
      const micData = {
        Gain: Gain,
        Gain1000: Gain,
        isSmartPhone: false,
        createDate: new Date(),
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

const runSmartphoneCalibration = async (
  elems,
  isLoudspeakerCalibration,
  language,
  isParticipant = false,
  OEM = "",
  platformName = "",
  browserDetails = {},
  browserError = "",
  phoneModel = "phone",
) => {
  // await startCalibration(elems, isLoudspeakerCalibration, language, true, isLoudspeakerCalibration? null: allHzCalibrationResults.knownIr);
  if (isLoudspeakerCalibration) {
    if (isParticipant) {
      await getLoudspeakerDeviceDetailsFromUserForSmartphone(
        elems,
        language,
        true,
        isLoudspeakerCalibration,
        isParticipant,
      );
    } else {
      await getSmartPhoneMicrophoneDetailsFromUser(
        elems,
        language,
        isLoudspeakerCalibration,
        isParticipant,
        OEM,
        platformName,
        browserDetails,
        browserError,
        phoneModel,
      );
    }
  } else {
    await getSmartPhoneMicrophoneDetailsFromUser(
      elems,
      language,
      isLoudspeakerCalibration,
      isParticipant,
      OEM,
      platformName,
      browserDetails,
      browserError,
      phoneModel,
    );
  }
};
let browserError = null;
let neededAPIs = false;
let OEM = "";
let platformName = "";
let phoneModel = "";
let browserDetails = {};

const scanQRCodeForSmartphoneIdentification = async (
  elems,
  language,
  isLoudspeakerCalibration,
) => {
  const p = document.createElement("h2");
  p.innerHTML = readi18nPhrases("RC_UseQRCode", language);
  p.style.marginTop = "1rem";
  p.style.userSelect = "text";
  p.style.fontSize = "1.1rem";

  let result = null;
  let qrPeer = null;
  let compatible = false;

  let deviceError = null;
  let deviceDetailsFrom51Degrees = {};

  // Keep trying until we get a valid result with no browser error
  do {
    await getConnectionManagerDisplay(true);

    const {
      qrContainer,
      cantReadButton,
      preferNotToReadButton,
      noSmartphoneButton,
      explanation,
    } = ConnectionManagerDisplay;

    qrContainer.id = "compatibility-qr-container";

    // Clear previous content and add new elements
    const oldError = document.getElementById("browser-error");
    elems.subtitle.innerHTML = "";
    elems.subtitle.appendChild(p);
    elems.subtitle.appendChild(qrContainer);
    if (oldError) {
      elems.subtitle.appendChild(oldError);
    }

    // result = await qrPeer.getResults();
    console.log("requesting results");
    await ConnectionManager.waitForPeerConnection();
    await ConnectionManager.resolveWhenHandshakeReceived();

    result = await CompatibilityPeer.getResults();
    console.log("result", result);

    if (result?.deviceDetails?.data) {
      OEM = result.deviceDetails.data.OEM;
      platformName = result.deviceDetails.data.PlatformName;
      phoneModel = result.deviceDetails.data.HardwareModel || "phone";
      phoneModel = phoneModel === "Unknown" ? "phone" : phoneModel;
      deviceDetailsFrom51Degrees = result.deviceDetails.data;
    }

    if (result?.browserDetails?.data) {
      browserDetails = result.browserDetails.data;

      if (
        browserDetails.browserVersion &&
        browserDetails.browserVersion.includes(".")
      ) {
        const versionParts = browserDetails.browserVersion.split(".");
        if (versionParts.length > 1) {
          const decimalPart = versionParts[0];
          if (parseInt(decimalPart) >= 100) {
            browserDetails.browserVersion = versionParts[0];
          } else {
            //only show the first two in the array (decimalPart[0] and decimalPart[1])
            browserDetails.browserVersion =
              versionParts[0] + "." + versionParts[1];
          }
        }
      }

      if (browserDetails.osVersion && browserDetails.osVersion.includes(".")) {
        const versionParts = browserDetails.osVersion.split(".");
        if (versionParts.length > 1) {
          const decimalPart = versionParts[0];
          if (parseInt(decimalPart) >= 100) {
            browserDetails.osVersion = versionParts[0];
          } else {
            //only show the first two in the array (decimalPart[0] and decimalPart[1])
            browserDetails.osVersion = versionParts[0] + "." + versionParts[1];
          }
        }
      }

      microphoneBrowserDetails.current.browser = browserDetails.browser;
      microphoneBrowserDetails.current.browserVersion =
        browserDetails.browserVersion;
    }

    if (result?.deviceDetails?.error) {
      deviceError = result.deviceDetails.error;
    }

    if (result?.browserDetails?.error) {
      browserError = result.browserDetails.error;
    }

    if (result?.neededAPIs) {
      neededAPIs = result.neededAPIs;
    }

    const errorsInNeededAPIs =
      neededAPIs && !neededAPIs.getUserMedia && neededAPIs.getUserMediaError
        ? true
        : false;
    compatible = browserError === null && !errorsInNeededAPIs;
    const report = {
      browserDetails,
      browserIdentificationError: browserError,
      deviceDetailsFrom51Degrees,
      deviceIdentificationErrorFrom51Degrees: deviceError,
      compatible,
      reason:
        browserError === null
          ? errorsInNeededAPIs
            ? neededAPIs.getUserMediaError
            : null
          : browserError,
      neededAPIs,
    };
    // await reportBrowserIdentificationToFirestore(report);

    if (browserError !== null) {
      // remove the old error message if it exists
      const oldError = document.getElementById("browser-error");
      if (oldError) {
        oldError.remove();
      }
      const errorMessage = document.createElement("p");
      errorMessage.innerText = readi18nPhrases(
        "EE_CouldNotConnectUnknownBrowser",
        language,
      ).replace("MMM", phoneModel);
      errorMessage.style.fontWeight = "normal";
      errorMessage.style.fontSize = "1rem";
      errorMessage.style.marginTop = "15px";
      errorMessage.id = "browser-error";
      elems.subtitle.appendChild(errorMessage);
    } else if (neededAPIs && neededAPIs.getUserMediaError) {
      const errorMessage = document.createElement("p");
      const browserName = browserDetails.browser || "";
      const browserVersion = browserDetails.browserVersion || "";
      const text = browserName === "" ? "" : `${browserName} ${browserVersion}`;
      errorMessage.innerText = readi18nPhrases(
        "EE_CouldNotConnectKnownBrowser",
        language,
      )
        .replace("MMM", phoneModel)
        .replace("BBB", text);
      errorMessage.style.fontWeight = "normal";
      errorMessage.style.fontSize = "1rem";
      errorMessage.style.marginTop = "15px";
      errorMessage.id = "browser-error";
      elems.subtitle.appendChild(errorMessage);
    }
  } while (compatible === false);

  // Success! Clean up and proceed
  //removeElements([p, proceedButton, qrPeerQRElement, qrContainer]);
  const oldError = document.getElementById("browser-error");
  if (oldError) {
    oldError.remove();
  }

  const qrContainer = document.getElementById("compatibility-qr-container");
  if (qrContainer) {
    qrContainer.remove();
  }

  removeElements([p]);
  adjustPageNumber(elems.title, [{ replace: 2, with: 3 }]);

  await runSmartphoneCalibration(
    elems,
    isLoudspeakerCalibration,
    language,
    false,
    OEM,
    platformName,
    browserDetails,
    browserError,
    phoneModel,
  );
};

const getSmartPhoneMicrophoneDetailsFromUser = async (
  elems,
  language,
  isLoudspeakerCalibration,
  isParticipant,
  OEM = "",
  platformName = "",
  browserDetails = {},
  browserError = "",
  phoneModel = "phone",
) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (stream) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const loudspeaker = devices.filter(
        (device) => device.kind === "audiooutput",
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

  const modelNumberWrapper = document.createElement("div");
  const img = document.createElement("img");
  img.src = "./components/images/ios_settings.png";
  img.style.width = "30%";
  img.style.margin = "auto";
  img.style.marginBottom = "30px";
  const container = document.createElement("div");
  container.style.display = "flex";
  // container.style.justifyContent = "center";
  container.appendChild(modelNumberWrapper);
  container.appendChild(img);

  const p = document.createElement("p");
  p.style.fontWeight = "normal";
  const instructionText = getInstructionText(
    {},
    language,
    true,
    isLoudspeakerCalibration,
    "model number",
    true,
    OEM,
    false,
  );
  p.innerHTML = instructionText;
  // create input box for model number and name

  const manufacturerInput = document.createElement("input");
  manufacturerInput.type = "text";
  manufacturerInput.id = "manufacturerInput";
  manufacturerInput.name = "manufacturerInput";
  manufacturerInput.placeholder = readi18nPhrases(
    "RC_MicrophoneManufacturer",
    language,
  );
  manufacturerInput.style.width = "30vw";
  if (OEM !== "" && OEM !== "Unknown") manufacturerInput.value = OEM;

  const { preferredModelNumber, preferredModelName } =
    getPreferredModelNumberAndName(OEM, platformName, language, false);

  const modelNumberInput = document.createElement("input");
  modelNumberInput.type = "text";
  modelNumberInput.id = "modelNumberInput";
  modelNumberInput.name = "modelNumberInput";
  modelNumberInput.placeholder = preferredModelNumber;
  modelNumberInput.style.width = "30vw";

  const modelNameInput = document.createElement("input");
  modelNameInput.type = "text";
  modelNameInput.id = "modelNameInput";
  modelNameInput.name = "modelNameInput";
  modelNameInput.placeholder = preferredModelName;
  modelNameInput.style.width = "30vw";

  const modelNameSuggestionsContainer = getAutoCompleteSuggestionElements(
    "ModelName",
    AllModelNames,
    modelNameInput,
    "model number",
    {},
    language,
    true,
    p,
    img,
    modelNameInput,
    modelNumberInput,
    false,
  );
  const modelNumberSuggestionsContainer = getAutoCompleteSuggestionElements(
    "ModelNumber",
    AllModelNumbers,
    modelNumberInput,
    "model number",
    {},
    language,
    true,
    p,
    img,
    modelNameInput,
    modelNumberInput,
    false,
  );

  const brandSuggestionsContainer = getAutoCompleteSuggestionElements(
    "Brand",
    AllBrands,
    manufacturerInput,
    "model number",
    {},
    language,
    true,
    p,
    img,
    modelNameInput,
    modelNumberInput,
    false,
  );

  if (!isParticipant) modelNumberWrapper.appendChild(manufacturerInput);
  if (!isParticipant) modelNumberWrapper.appendChild(brandSuggestionsContainer);

  modelNumberWrapper.appendChild(modelNameInput);
  modelNumberWrapper.appendChild(modelNameSuggestionsContainer);

  modelNumberWrapper.appendChild(modelNumberInput);
  modelNumberWrapper.appendChild(modelNumberSuggestionsContainer);

  if (
    browserDetails &&
    browserDetails.browser &&
    browserDetails.os &&
    browserDetails.osVersion &&
    !browserError
  ) {
    const browserName = document.createElement("p");
    browserName.innerHTML = `${browserDetails.browser} ${browserDetails.browserVersion}, ${browserDetails.os} ${browserDetails.osVersion}`;
    browserName.style.fontWeight = "normal";
    browserName.style.fontSize = "0.85rem";
    browserName.id = "browserName";
    modelNumberWrapper.appendChild(browserName);
  }

  if (platformName === "iOS" || manufacturerInput.value === "Apple") {
    img.style.display = "block";
    //visibility = "visible";
  } else {
    img.style.display = "none";
  }

  // add a proceed button
  const proceedButton = document.createElement("button");
  proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
  proceedButton.classList.add(...["btn", "btn-success"]);

  const printLabelButton = document.createElement("button");
  printLabelButton.innerHTML = readi18nPhrases("RC_PrintLabel", language);
  printLabelButton.classList.add(...["btn", "btn-success"]);
  printLabelButton.style.marginLeft = "10px";
  printLabelButton.style.display = "none"; // Hide by default

  const DymoHelpBUtton = document.createElement("button");
  DymoHelpBUtton.innerHTML = readi18nPhrases("RC_DymoHelpButton", language);
  DymoHelpBUtton.classList.add(...["btn", "btn-success"]);
  DymoHelpBUtton.style.marginLeft = "10px";
  DymoHelpBUtton.style.display = "none"; // Hide by default

  // Check for DYMO printer before showing button
  try {
    await loadDymoFramework();
    const printers = await dymo.label.framework.getLabelWriterPrintersAsync();

    if (printers && printers.length > 0) {
      printLabelButton.style.display = "inline-block";
      DymoHelpBUtton.style.display = "inline-block";
    }
  } catch (err) {
    // Log error but continue execution
    console.log("DYMO printer functionality unavailable:", err);
    // Ensure button stays hidden
    printLabelButton.style.display = "none";
    DymoHelpBUtton.style.display = "none";
  }

  elems.subtitle.appendChild(p);
  // if (isLoudspeakerCalibration && !isParticipant) {
  //   elems.subtitle.appendChild(manufacturerInput);
  // }

  // elems.subtitle.appendChild(modelNameInput);
  // elems.subtitle.appendChild(modelNumberInput);
  elems.subtitle.appendChild(getAutocompletionMessage(language));
  elems.subtitle.appendChild(container);
  elems.subtitle.appendChild(proceedButton);
  elems.subtitle.appendChild(printLabelButton);
  elems.subtitle.appendChild(DymoHelpBUtton);

  const popup = document.createElement("div");
  popup.style.display = "none";
  popup.style.position = "fixed";
  popup.style.left = "50%";
  popup.style.top = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.backgroundColor = "white";
  popup.style.padding = "20px";
  popup.style.border = "1px solid #ccc";
  popup.style.borderRadius = "5px";
  popup.style.zIndex = "1000";
  popup.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
  popup.style.maxWidth = "80%";
  popup.style.maxHeight = "80vh";
  popup.style.overflow = "auto";

  // Create close button
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "×";
  closeButton.style.position = "absolute";
  closeButton.style.right = "10px";
  closeButton.style.top = "10px";
  closeButton.style.border = "none";
  closeButton.style.background = "none";
  closeButton.style.fontSize = "20px";
  closeButton.style.cursor = "pointer";
  closeButton.style.padding = "0 5px";

  // Create content
  const content = document.createElement("div");
  content.innerHTML = readi18nPhrases("EE_DymoHelp", language);
  content.style.marginTop = "20px";

  // Add elements to popup
  popup.appendChild(closeButton);
  popup.appendChild(content);

  // Add popup to body
  document.body.appendChild(popup);

  // Add event listeners
  DymoHelpBUtton.addEventListener("click", () => {
    popup.style.display = "block";
  });

  closeButton.addEventListener("click", () => {
    popup.style.display = "none";
  });

  // Add help button after print button
  elems.subtitle.appendChild(DymoHelpBUtton);

  await new Promise((resolve) => {
    proceedButton.addEventListener("click", async () => {
      proceedButton.innerHTML = "Loading...";

      if (modelNameInput.value === "" || modelNumberInput.value === "") {
        alert("Please fill out all the fields");
      } else {
        if (isLoudspeakerCalibration) {
          const micSerialNumber = modelNumberInput.value;
          const micManufacturer = manufacturerInput.value
            .toLowerCase()
            .split(" ")
            .join("");
          const modelName = modelNameInput.value;
          if (
            await doesMicrophoneExistInFirestore(
              micSerialNumber,
              micManufacturer,
            )
          ) {
            adjustPageNumber(elems.title, [{ replace: 3, with: 4 }]);
            microphoneInfo.current = {
              micFullName: modelNameInput.value,
              micFullSerialNumber: modelNumberInput.value,
              micrFullManufacturerName: manufacturerInput.value,
            };
            removeElements([
              p,
              proceedButton,
              modelNameInput,
              modelNumberInput,
              manufacturerInput,
              container,
            ]);
            await getLoudspeakerDeviceDetailsFromUserForSmartphone(
              elems,
              language,
              true,
              isLoudspeakerCalibration,
              isParticipant,
            );
            resolve();
          } else {
            p.innerHTML =
              p.innerHTML +
              "<br><br>" +
              readi18nPhrases(
                "RC_microphoneNotInCalibrationLibrary",
                language,
              ).replace("xxx", modelNameInput.value);
            proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
          }
        } else {
          removeElements([
            p,
            proceedButton,
            modelNameInput,
            modelNumberInput,
            manufacturerInput,
            container,
          ]);
          adjustPageNumber(elems.title, [{ replace: 3, with: 4 }]);
          microphoneInfo.current = {
            micFullName: modelNameInput.value,
            micFullSerialNumber: modelNumberInput.value,
          };
          allHzCalibrationResults.knownIr = JSON.parse(
            JSON.stringify(loudspeakerIR),
          );
          await startCalibration(
            elems,
            isLoudspeakerCalibration,
            language,
            true,
            isLoudspeakerCalibration ? null : allHzCalibrationResults.knownIr,
            isParticipant,
          );
          resolve();
        }
      }
    });
    printLabelButton.addEventListener("click", async () => {
      console.log("Printing label");
      const originalButtonText = printLabelButton.innerHTML;
      try {
        // Get form elements by ID
        const manufacturerInput = document.getElementById("manufacturerInput");
        const modelNameInput = document.getElementById("modelNameInput");
        const modelNumberInput = document.getElementById("modelNumberInput");
        const browserName = document.getElementById("browserName");
        // Check if all required fields are filled
        if (
          modelNameInput.value === "" ||
          modelNumberInput.value === "" ||
          manufacturerInput.value === ""
        ) {
          alert("Please fill out all the fields");
          return;
        }

        printLabelButton.innerHTML = "Loading...";
        printLabelButton.disabled = true;

        await loadDymoFramework();
        // Get printers with detailed logging
        const printers =
          await dymo.label.framework.getLabelWriterPrintersAsync();
        console.log("All DYMO devices:", printers);

        if (!printers || printers.length === 0) {
          throw new Error(
            "No DYMO printers found. Please:\n\n" +
              "1. Check if your DYMO printer is connected and powered on\n" +
              "2. Open DYMO Connect app and verify printer is listed there\n" +
              "3. Try unplugging and replugging the USB cable\n" +
              "4. Quit and reopen DYMO Connect\n" +
              "5. On Mac, check System Preferences → Printers & Scanners",
          );
        }

        // Log all available printers
        printers.forEach((p) => {
          console.log("Found printer:", {
            name: p.name,
            modelName: p.modelName,
            isConnected: p.isConnected,
            isLocal: p.isLocal,
            printerType: p.printerType,
          });
        });

        // More flexible printer detection
        const printer = printers.find(
          (p) =>
            p.name &&
            (p.name.toLowerCase().includes("550") ||
              p.name.toLowerCase().includes("labelprinter") ||
              p.name.toLowerCase().includes("label printer") ||
              p.modelName?.toLowerCase().includes("550") ||
              p.modelName?.toLowerCase().includes("labelwriter") ||
              p.modelName?.toLowerCase().includes("label writer")),
        );

        if (!printer) {
          throw new Error(
            "DYMO LabelPrinter 550 not found. Available printers:\n" +
              printers
                .map((p) => `- ${p.name} (${p.modelName || "Unknown model"})`)
                .join("\n") +
              "\n\nPlease check:\n" +
              "1. Printer is powered on\n" +
              "2. USB connection is secure\n" +
              "3. DYMO Connect app shows the printer",
          );
        }

        console.log("Selected printer:", printer.name);

        // Create print params
        const printParams = {
          copies: 1,
          jobTitle: "Phone Identification Label",
          printQuality: dymo.label.framework.LabelWriterPrintQuality.Auto,
        };
        const printParamsXml =
          dymo.label.framework.createLabelWriterPrintParamsXml(printParams);

        const labelXml = `<?xml version="1.0" encoding="utf-8"?>
        <DieCutLabel Version="8.0" Units="twips">
            <PaperOrientation>Landscape</PaperOrientation>
            <Id>Address</Id>
            <PaperName>30252 Address</PaperName>
            <DrawCommands>
                <RoundRectangle X="0" Y="0" Width="5040" Height="1581" Rx="270" Ry="270" />
            </DrawCommands>
            <ObjectInfo>
                <TextObject>
                    <Name>Text</Name>
                    <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
                    <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
                    <LinkedObjectName></LinkedObjectName>
                    <Rotation>Rotation0</Rotation>
                    <IsMirrored>False</IsMirrored>
                    <IsVariable>False</IsVariable>
                    <HorizontalAlignment>Left</HorizontalAlignment>
                    <VerticalAlignment>Middle</VerticalAlignment>
                    <TextFitMode>ShrinkToFit</TextFitMode>
                    <UseFullFontHeight>True</UseFullFontHeight>
                    <Verticalized>False</Verticalized>
                    <StyledText>
                        <Element>
                            <String>${manufacturerInput?.value || ""}\n${
                              modelNameInput?.value || ""
                            }\n${modelNumberInput?.value || ""}\n${
                              browserName?.innerHTML || ""
                            }\n${new Date().toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}\n${getCompatibilityString(
                              browserError,
                              neededAPIs,
                              language,
                            )}</String>
                            <Attributes>
                                <Font Family="Calibri" Size="8.5" Bold="False" Italic="False" Underline="False" Strikeout="False" />
                                <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
                            </Attributes>
                        </Element>
                    </StyledText>
                    <ShowBarcodeFor9DigitZipOnly>False</ShowBarcodeFor9DigitZipOnly>
                    <BarcodePosition>AboveAddress</BarcodePosition>
                    <LineFonts>
                        <Font Family="Calibri" Size="8.5" Bold="False" Italic="False" Underline="False" Strikeout="False" />
                    </LineFonts>
                    <LineHeights>
                        <Height>120</Height>
                    </LineHeights>
                </TextObject>
                <Bounds X="150" Y="150" Width="4740" Height="1280" />
            </ObjectInfo>
        </DieCutLabel>`;

        // Print the label
        await dymo.label.framework
          .printLabelAsync(printer.name, printParamsXml, labelXml)
          .then(() => {
            printLabelButton.innerHTML = originalButtonText;
            printLabelButton.disabled = false;
          });
      } catch (error) {
        console.error("Error printing label:", error);
        alert("Error printing label: " + error.message);
      }
    });
  });
};
const startCalibration = async (
  // page 4
  elems,
  isLoudspeakerCalibration,
  language,
  isSmartPhone,
  knownIR = null,
  isParticipant = false,
) => {
  if (isSmartPhone) {
    await new Promise((resolve) => {
      const platformText = document.createElement("h2");
      platformText.style.fontSize = "1.1rem";
      platformText.innerHTML = `${readi18nPhrases(
        "RC_removeHeadphones",
        language,
      ).replace(/\n/g, "<br><br>")}
      ${readi18nPhrases("RC_chargePhoneNoCase", language).replace(
        /\n/g,
        "<br><br>",
      )}`;

      // platformText.style.marginTop = "10px";
      platformText.style.marginLeft = "0px";
      platformText.style.fontSize = "1.1rem";

      elems.displayContainer.appendChild(platformText);

      const proceedButton = document.createElement("button");
      proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
      proceedButton.classList.add(...["btn", "btn-success"]);
      proceedButton.style.marginLeft = "0px";
      proceedButton.style.marginTop = "2.2rem";
      elems.displayContainer.appendChild(proceedButton);
      proceedButton.addEventListener("click", async () => {
        adjustPageNumber(elems.title, [
          {
            replace:
              isLoudspeakerCalibration && !isParticipant
                ? 5
                : !isLoudspeakerCalibration
                ? 4
                : 2,
            with:
              isLoudspeakerCalibration && !isParticipant
                ? 6
                : !isLoudspeakerCalibration
                ? 5
                : 3,
          },
        ]);
        removeElements([platformText, proceedButton]);
        resolve();
      });
      //event listener for Return on the keyboard
      document.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          proceedButton.click();
        }
      });
    });
    // second page instruction before calibration before calibrate smartphone
    await new Promise((resolve) => {
      const platformText = document.createElement("h2");
      platformText.innerHTML = readi18nPhrases(
        "RC_platformForPhone",
        language,
      ).replace(/\n/g, "<br>");
      // platformText.style.marginTop = "10px";
      platformText.style.marginLeft = "0px";
      platformText.style.fontSize = "1.1rem";

      elems.displayContainer.appendChild(platformText);

      removeAutocompletionMessage();

      const proceedButton = document.createElement("button");
      proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
      proceedButton.classList.add(...["btn", "btn-success"]);
      proceedButton.style.marginLeft = "0px";
      proceedButton.style.marginTop = "2.2rem";
      elems.displayContainer.appendChild(proceedButton);
      proceedButton.addEventListener("click", async () => {
        adjustPageNumber(elems.title, [
          {
            replace:
              isLoudspeakerCalibration && !isParticipant
                ? 6
                : !isLoudspeakerCalibration
                ? 5
                : 3,
            with:
              isLoudspeakerCalibration && !isParticipant
                ? 7
                : !isLoudspeakerCalibration
                ? 6
                : 4,
          },
        ]);
        removeElements([platformText, proceedButton]);
        resolve();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          proceedButton.click();
        }
      });
    });
  }

  elems.subtitle.innerHTML = isLoudspeakerCalibration
    ? isSmartPhone
      ? readi18nPhrases("RC_usingSmartphoneMicrophone", language)
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
  const { CombinationCalibration } = speakerCalibrator;

  const modelName = loudspeakerInfo.current.fullLoudspeakerModelName;
  const rawWebAudioName = webAudioDeviceNames.loudspeaker;
  const leftQuote = "\u201C"; // “
  const rightQuote = "\u201D"; // ”
  const quotedWebAudioName = leftQuote + rawWebAudioName + rightQuote;
  const combinedText = modelName + " " + quotedWebAudioName;
  webAudioDeviceNames.loudspeakerText = readi18nPhrases(
    "RC_nameLoudspeaker",
    language,
  )
    .replace("“xxx”", combinedText)
    .replace("“XXX”", combinedText);

  const micModelName = micName;
  const rawWebAudioMic = select
    ? select.options[select.selectedIndex].textContent
    : "";
  const quotedWebAudioMic = leftQuote + rawWebAudioMic + rightQuote;
  const combinedMicText = micModelName + " " + quotedWebAudioMic;
  webAudioDeviceNames.microphoneText = readi18nPhrases(
    "RC_nameMicrophone",
    language,
  )
    .replace("“xxx”", combinedMicText)
    .replace("“XXX”", combinedMicText);

  IDsToSaveInSoundProfileLibrary.ProlificParticipantID = isProlificExperiment()
    ? new URLSearchParams(window.location.search).get("participant")
    : "";
  IDsToSaveInSoundProfileLibrary.PavloviaSessionID =
    thisExperimentInfo.PavloviaSessionID;

  const reminderVolumeCase = document.createElement("div");
  let reminder = isSmartPhone
    ? readi18nPhrases("RC_reminderVolumeCase", language)
    : readi18nPhrases("RC_reminderVolume", language);
  reminderVolumeCase.innerHTML = reminder.replace(/\n/g, "<br>");
  reminderVolumeCase.style.marginTop = "10px";
  reminderVolumeCase.style.marginLeft = "0px";
  reminderVolumeCase.style.fontSize = "1rem";
  reminderVolumeCase.style.fontWeight = "normal";
  reminderVolumeCase.style.display = "none";
  reminderVolumeCase.style.userSelect = "text";
  elems.displayContainer.appendChild(reminderVolumeCase);

  const restrtCalibration = document.createElement("button");
  restrtCalibration.innerHTML = readi18nPhrases("RC_ReRecord", language);
  restrtCalibration.classList.add(...["btn", "btn-primary"]);
  restrtCalibration.style.marginLeft = "0px";
  restrtCalibration.style.marginTop = "10px";
  restrtCalibration.style.display = "none";
  elems.displayContainer.appendChild(restrtCalibration);
  const buttonsContainter = getButtonsContainer(language);
  console.log(select);
  const speakerParameters = {
    calibrateSoundLimit: calibrateSoundLimit.current,
    restartButton: restrtCalibration,
    buttonsContainer: buttonsContainter,
    reminder: reminderVolumeCase,
    language: language,
    //siteUrl: "https://test-listener-page-ec7cf10eda4f.herokuapp.com",
    siteUrl: "https://easy-eyes-listener-page.herokuapp.com",
    targetElementId: "displayQR",
    debug: debugBool.current,
    gainValues: globalGains.values,
    knownIR: knownIR,
    displayUpdate: elems.displayUpdate,
    instructionDisplayId: "recordingInProgress",
    soundMessageId: "soundMessage",
    titleDisplayId: "soundTitle",
    timeToCalibrateId: "timeToCalibrate",
    soundSubtitleId: "soundSubtitle",
    webAudioDeviceNames: webAudioDeviceNames,
    IDsToSaveInSoundProfileLibrary: IDsToSaveInSoundProfileLibrary,
    calibrateSoundBurstRepeats: calibrateSoundBurstRepeats.current,
    calibrateSoundBurstSec: calibrateSoundBurstSec.current,
    _calibrateSoundBurstPreSec: _calibrateSoundBurstPreSec.current,
    _calibrateSoundBurstPostSec: _calibrateSoundBurstPostSec.current,
    calibrateSoundSamplingDesiredBits:
      calibrateSoundSamplingDesiredBits.current,
    calibrateSoundHz: calibrateSoundHz.current,
    timeToCalibrate: timeToCalibrate.current,
    microphoneName: micName,
    micManufacturer: micManufacturer,
    micSerialNumber: micSerialNumber,
    micModelNumber: micSerialNumber,
    micModelName: micName,
    isSmartPhone: isSmartPhone,
    isLoudspeakerCalibration: isLoudspeakerCalibration,
    isParticipant: isParticipant,
    calibrateSoundBurstDb: calibrateSoundBurstDb.current,
    calibrateSoundBurstScalarDB: calibrateSoundBurstScalarDB.current,
    calibrateSoundBurstNormalizeBy1000HzGainBool:
      calibrateSoundBurstNormalizeBy1000HzGainBool.current,
    calibrateSoundBurstFilteredExtraDb:
      calibrateSoundBurstFilteredExtraDb.current,
    calibrateSoundBurstLevelReTBool: calibrateSoundBurstLevelReTBool.current,
    calibrateSoundBurstUses1000HzGainBool: false,
    _calibrateSoundBurstMaxSD_dB: _calibrateSoundBurstMaxSD_dB.current,
    calibrateSoundCheck: calibrateSoundCheck.current,
    calibrateSoundIRSec: calibrateSoundIRSec.current,
    calibrateSoundIIRSec: calibrateSoundIIRSec.current,
    calibrateSoundIIRPhase: calibrateSoundIIRPhase.current,
    calibrateSound1000HzPreSec: calibrateSound1000HzPreSec.current,
    calibrateSound1000HzSec: calibrateSound1000HzSec.current,
    calibrateSound1000HzPostSec: calibrateSound1000HzPostSec.current,
    calibrateSoundBackgroundSecs: calibrateSoundBackgroundSecs.current,
    calibrateSoundSmoothOctaves: calibrateSoundSmoothOctaves.current,
    calibrateSound1000HzMaxSD_dB: calibrateSound1000HzMaxSD_dB.current,
    calibrateSound1000HzMaxTries: calibrateSound1000HzMaxTries.current,
    calibrateSoundSmoothMinBandwidthHz:
      calibrateSoundSmoothMinBandwidthHz.current,
    calibrateSoundPowerBinDesiredSec: calibrateSoundPowerBinDesiredSec.current,
    calibrateSoundPowerDbSDToleratedDb:
      calibrateSoundPowerDbSDToleratedDb.current,
    calibrateSoundTaperSec: calibrateSoundTaperSec.current,
    calibrateMicrophonesBool: calibrateMicrophonesBool.current,
    authorEmails: authorEmail.current,
    micrpohoneIdFromWebAudioApi: isSmartPhone
      ? ""
      : select
      ? select.options[select.selectedIndex].textContent
      : "",
    phrases: phrases,
  };
  const calibratorParams = {
    numCaptures: calibrateSoundBurstMLSVersions.current,
    numMLSPerCapture: 2,
    download: false,
    lowHz: calibrateSoundMinHz.current,
    highHz: calibrateSoundMaxHz.current,
  };
  const calibrator = new CombinationCalibration(calibratorParams);
  calibrator.on("update", ({ message, ...rest }) => {
    elems.displayUpdate.innerHTML = message;
  });

  await adjustDisplayBeforeCalibration(
    elems,
    isSmartPhone,
    language,
    isLoudspeakerCalibration,
  );
  calibrationTime.current = getCurrentTimeString();
  timeToCalibrate.timeAtTheStartOfCalibration = new Date();
  const results = await SoundCalibrationPeer.startCalibration(
    speakerParameters,
    calibrator,
    ConnectionManager,
    timeoutSoundCalibrationSec.current,
  );
  restrtCalibration.style.display = "none";
  reminderVolumeCase.style.display = "none";
  // Speaker.closeConnection()
  timeToCalibrate.timeAtTheEndOfCalibration = new Date();
  // timeToCalibrate.calibrationDuration in minutes
  timeToCalibrate.calibrationDuration = Math.round(
    (timeToCalibrate.timeAtTheEndOfCalibration -
      timeToCalibrate.timeAtTheStartOfCalibration) /
      1000 /
      60,
  );
  const timeElement = document.getElementById("timeToCalibrate");
  timeElement.innerHTML = readi18nPhrases(
    "RC_calibrationEstimatedAndActualMinutes",
    language,
  )
    .replace("111", timeToCalibrate.current)
    .replace("222", timeToCalibrate.calibrationDuration);
  if (results === false) {
    return false;
  }
  if (results === "restart") {
    console.log("Restarting speaker calibration...");
    elems.displayUpdate.innerHTML = "";
    elems.displayUpdate.style.display = "none";

    await startCalibration(
      elems,
      isLoudspeakerCalibration,
      language,
      isSmartPhone,
      knownIR,
      isParticipant,
    );
    return;
  }

  if (results === "permission denied") {
    //end experiment
    quitPsychoJS("", false, paramReader, !isProlificExperiment(), false);
    showExperimentEnding(true, isProlificExperiment(), language);
    return;
  }
  adjustDisplayAfterCalibration(elems, isLoudspeakerCalibration);
  isLoudspeakerCalibration
    ? await parseLoudspeakerCalibrationResults(results, isSmartPhone)
    : await parseMicrophoneCalibrationResults(results, isSmartPhone);
};

export const calibrateAgain = async (
  elems,
  isLoudspeakerCalibration,
  language,
  isSmartPhone,
  knownIR = null,
  isParticipant = false,
) => {
  elems.subtitle.innerHTML = isLoudspeakerCalibration
    ? isSmartPhone
      ? readi18nPhrases("RC_usingSmartphoneMicrophone", language)
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

  const restrtCalibration = document.createElement("button");
  restrtCalibration.innerHTML = readi18nPhrases("RC_ReRecord", language);
  restrtCalibration.classList.add(...["btn", "btn-primary"]);
  restrtCalibration.style.marginLeft = "0px";
  restrtCalibration.style.marginTop = "10px";
  restrtCalibration.style.display = "none";
  elems.displayContainer.appendChild(restrtCalibration);

  const reminderVolumeCase = document.createElement("div");
  let reminder = isSmartPhone
    ? readi18nPhrases("RC_reminderVolumeCase", language)
    : readi18nPhrases("RC_reminderVolume", language);
  reminderVolumeCase.innerHTML = reminder.replace(/\n/g, "<br>");
  reminderVolumeCase.style.marginTop = "10px";
  reminderVolumeCase.style.marginLeft = "0px";
  reminderVolumeCase.style.fontSize = "1rem";
  reminderVolumeCase.style.fontWeight = "normal";
  reminderVolumeCase.style.display = "none";
  elems.displayContainer.appendChild(reminderVolumeCase);
  const buttonsContainter = getButtonsContainer(language);
  console.log(select);
  const speakerParameters = {
    calibrateSoundLimit: calibrateSoundLimit.current,
    restartButton: restrtCalibration,
    buttonsContainer: buttonsContainter,
    reminder: reminderVolumeCase,
    language: language,
    siteUrl: "https://easy-eyes-listener-page.herokuapp.com",
    // siteUrl: "https://test-listener-page-ec7cf10eda4f.herokuapp.com",
    targetElementId: "displayQR",
    debug: debugBool.current,
    gainValues: globalGains.values,
    knownIR: knownIR,
    displayUpdate: elems.displayUpdate,
    instructionDisplayId: "recordingInProgress",
    soundMessageId: "soundMessage",
    titleDisplayId: "soundTitle",
    timeToCalibrateId: "timeToCalibrate",
    soundSubtitleId: "soundSubtitle",
    webAudioDeviceNames: webAudioDeviceNames,
    IDsToSaveInSoundProfileLibrary: IDsToSaveInSoundProfileLibrary,
    calibrateSoundBurstRepeats: calibrateSoundBurstRepeats.current,
    calibrateSoundBurstSec: calibrateSoundBurstSec.current,
    _calibrateSoundBurstPreSec: _calibrateSoundBurstPreSec.current,
    _calibrateSoundBurstPostSec: _calibrateSoundBurstPostSec.current,
    calibrateSoundSamplingDesiredBits:
      calibrateSoundSamplingDesiredBits.current,
    calibrateSoundHz: calibrateSoundHz.current,
    timeToCalibrate: timeToCalibrate.current,
    microphoneName: micName,
    micManufacturer: micManufacturer,
    micSerialNumber: micSerialNumber,
    micModelNumber: micSerialNumber,
    loudspeakerModelName: loudspeakerInfo.current.fullLoudspeakerModelName,
    micModelName: micName,
    isSmartPhone: isSmartPhone,
    isParticipant: isParticipant,
    isLoudspeakerCalibration: isLoudspeakerCalibration,
    calibrateSoundBurstDb: calibrateSoundBurstDb.current,
    calibrateSoundBurstFilteredExtraDb:
      calibrateSoundBurstFilteredExtraDb.current,
    calibrateSoundBurstLevelReTBool: calibrateSoundBurstLevelReTBool.current,
    calibrateSoundBurstUses1000HzGainBool: false,
    calibrateSoundBurstScalarDB: calibrateSoundBurstScalarDB.current,
    calibrateSoundBurstNormalizeBy1000HzGainBool:
      calibrateSoundBurstNormalizeBy1000HzGainBool.current,
    _calibrateSoundBurstMaxSD_dB: _calibrateSoundBurstMaxSD_dB.current,
    calibrateSoundCheck: calibrateSoundCheck.current,
    calibrateSoundIRSec: calibrateSoundIRSec.current,
    calibrateSoundIIRSec: calibrateSoundIIRSec.current,
    calibrateSoundIIRPhase: calibrateSoundIIRPhase.current,
    calibrateSound1000HzPreSec: calibrateSound1000HzPreSec.current,
    calibrateSound1000HzSec: calibrateSound1000HzSec.current,
    calibrateSound1000HzPostSec: calibrateSound1000HzPostSec.current,
    calibrateSoundBackgroundSecs: calibrateSoundBackgroundSecs.current,
    calibrateSound1000HzMaxSD_dB: calibrateSound1000HzMaxSD_dB.current,
    calibrateSound1000HzMaxTries: calibrateSound1000HzMaxTries.current,
    calibrateSoundSmoothOctaves: calibrateSoundSmoothOctaves.current,
    calibrateSoundSmoothMinBandwidthHz:
      calibrateSoundSmoothMinBandwidthHz.current,
    calibrateSoundPowerBinDesiredSec: calibrateSoundPowerBinDesiredSec.current,
    calibrateSoundPowerDbSDToleratedDb:
      calibrateSoundPowerDbSDToleratedDb.current,
    calibrateSoundTaperSec: calibrateSoundTaperSec.current,
    calibrateMicrophonesBool: calibrateMicrophonesBool.current,
    authorEmails: authorEmail.current,
    micrpohoneIdFromWebAudioApi: isSmartPhone
      ? ""
      : select
      ? select.options[select.selectedIndex].textContent
      : "",
    phrases: phrases,
  };

  const calibratorParams = {
    numCaptures: calibrateSoundBurstMLSVersions.current,
    numMLSPerCapture: 2,
    download: false,
    lowHz: calibrateSoundMinHz.current,
    highHz: calibrateSoundMaxHz.current,
  };
  const calibrator = new CombinationCalibration(calibratorParams);
  calibrator.on("update", ({ message, ...rest }) => {
    elems.displayUpdate.innerHTML = message;
  });

  await adjustDisplayBeforeCalibration(
    elems,
    isSmartPhone,
    language,
    isLoudspeakerCalibration,
  );

  calibrationTime.current = getCurrentTimeString();
  timeToCalibrate.timeAtTheStartOfCalibration = new Date();
  calibrator.setSamplingRates(microphoneActualSamplingRate.current);
  calibrator.setSampleSize(actualBitsPerSample.current);
  const micInfo = isLoudspeakerCalibration
    ? soundCalibrationResults.current.micInfo
    : microphoneCalibrationResult.current.micInfo;
  const deviceInfo = {
    OEM: micInfo.OEM,
    hardwarename: micInfo.HardwareName,
    hardwarefamily: micInfo.hardwareFamily,
    hardwaremodel: micInfo.HardwareModel,
    platformname: micInfo.PlatformName,
    platformversion: micInfo.PlatformVersion,
    devicetype: micInfo.DeviceType,
    DeviceId: micInfo.ID_from_51Degrees,
    calibrateMicrophonesBool: micInfo.calibrateMicrophonesBool,
    screenHeight: micInfo.screenHeight,
    screenWidth: micInfo.screenWidth,
    microphoneFromAPI: micInfo.webAudioDeviceNames.microphone,
  };
  calibrator.setDeviceInfo(deviceInfo);
  calibrator.setFlags(flags.current);
  calibrationRound.current--;
  if (isLoudspeakerCalibration && !isSmartPhone) {
    // Loudspeaker + Not Smartphone => page 5 of 5
    elems.title.innerHTML = readi18nPhrases(
      "RC_loudspeakerCalibration",
      language,
    )
      .replace("111", "5")
      .replace("222", "5");
  } else if (isLoudspeakerCalibration && isSmartPhone) {
    // Loudspeaker + Smartphone => page 7 of 7
    elems.title.innerHTML = readi18nPhrases(
      "RC_loudspeakerCalibration",
      language,
    )
      .replace("111", "7")
      .replace("222", "7");
  } else if (!isLoudspeakerCalibration && !isSmartPhone) {
    // Microphone + Not Smartphone => page 4 of 4
    elems.title.innerHTML = readi18nPhrases(
      "RC_usbMicrophoneCalibration",
      language,
    )
      .replace("111", "4")
      .replace("222", "4");
  } else {
    // Microphone + Smartphone => page 6 of 6
    elems.title.innerHTML = readi18nPhrases(
      "RC_microphoneCalibration",
      language,
    )
      .replace("111", "6")
      .replace("222", "6");
  }
  removeAutocompletionMessage();
  const results = await SoundCalibrationPeer.repeatCalibration(
    speakerParameters,
    window.localStream,
    calibrator,
  );
  restrtCalibration.style.display = "none";
  reminderVolumeCase.style.display = "none";
  // Speaker.closeConnection()
  timeToCalibrate.timeAtTheEndOfCalibration = new Date();
  // timeToCalibrate.calibrationDuration in minutes
  timeToCalibrate.calibrationDuration = Math.round(
    (timeToCalibrate.timeAtTheEndOfCalibration -
      timeToCalibrate.timeAtTheStartOfCalibration) /
      1000 /
      60,
  );
  const timeElement = document.getElementById("timeToCalibrate");
  timeElement.innerHTML = readi18nPhrases(
    "RC_calibrationEstimatedAndActualMinutes",
    language,
  )
    .replace("111", timeToCalibrate.current)
    .replace("222", timeToCalibrate.calibrationDuration);
  if (results === false) {
    return false;
  }
  if (results === "restart") {
    console.log("Restarting speaker calibration...");
    elems.displayUpdate.innerHTML = "";
    elems.displayUpdate.style.display = "none";
    if (isLoudspeakerCalibration && !isSmartPhone) {
      // Loudspeaker + Not Smartphone => page 5 of 5
      elems.title.innerHTML = readi18nPhrases(
        "RC_loudspeakerCalibration",
        language,
      )
        .replace("111", "4")
        .replace("222", "5");
    } else if (isLoudspeakerCalibration && isSmartPhone) {
      // Loudspeaker + Smartphone => page 7 of 7
      elems.title.innerHTML = readi18nPhrases(
        "RC_loudspeakerCalibration",
        language,
      )
        .replace("111", "6")
        .replace("222", "7");
    } else if (!isLoudspeakerCalibration && !isSmartPhone) {
      // Microphone + Not Smartphone => page 4 of 4
      elems.title.innerHTML = readi18nPhrases(
        "RC_usbMicrophoneCalibration",
        language,
      )
        .replace("111", "3")
        .replace("222", "4");
    } else {
      // Microphone + Smartphone => page 6 of 6
      elems.title.innerHTML = readi18nPhrases(
        "RC_microphoneCalibration",
        language,
      )
        .replace("111", "5")
        .replace("222", "6");
    }

    await startCalibration(
      elems,
      isLoudspeakerCalibration,
      language,
      isSmartPhone,
      knownIR,
      isParticipant,
    );
    return;
  }

  if (results === "permission denied") {
    //end experiment
    quitPsychoJS("", false, paramReader, !isProlificExperiment(), false);
    showExperimentEnding(true, isProlificExperiment(), language);
    return;
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

  filteredMLSAttenuation.component =
    soundCalibrationResults.current.filteredMLSAttenuation.component;
  filteredMLSAttenuation.system =
    soundCalibrationResults.current.filteredMLSAttenuation.system;
  filteredMLSAttenuation.maxAbsComponent =
    soundCalibrationResults.current.filteredMLSAttenuation.maxAbsComponent;
  filteredMLSAttenuation.maxAbsSystem =
    soundCalibrationResults.current.filteredMLSAttenuation.maxAbsSystem;
  filteredMLSAttenuation.attenuationDbSystem =
    10 * Math.log10(filteredMLSAttenuation.system);
  filteredMLSAttenuation.attenuationDbComponent =
    10 * Math.log10(filteredMLSAttenuation.component);

  fMaxHz.system = soundCalibrationResults.current.system.fMaxHz;
  fMaxHz.component = soundCalibrationResults.current.component.fMaxHz;
  attenuatorGainDB.system =
    soundCalibrationResults.current.system.attenuatorGainDB;
  attenuatorGainDB.component =
    soundCalibrationResults.current.component.attenuatorGainDB;
  soundGainDBSPL.current = soundCalibrationResults.current.parameters.gainDBSPL;
  soundGainDBSPL.current = Math.round(soundGainDBSPL.current * 10) / 10;
  allHzCalibrationResults.timestamps =
    soundCalibrationResults.current.timeStamps;
  flags.current = soundCalibrationResults.current.flags;
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
    browser: thisExperimentInfo?.deviceBrowser,
    browserVersion: thisExperimentInfo?.deviceBrowserVersion,
    gainDBSPL:
      Math.round(
        (soundGainDBSPL.current - microphoneInfo.current.gainDBSPL) * 10,
      ) / 10,
    CalibrationDate: calibrationTime.current,
    createDate: new Date(Date.parse(calibrationTime.current)),
    micInfo: microphoneInfo.current,
    calibrateMicrophonesBool: calibrateMicrophonesBool.current,
    mlsSD: Number(qualityMetrics.current?.mls),
    systemCorrectionSD: Number(qualityMetrics.current?.system),
    componentCorrectionSD: Number(qualityMetrics.current?.component),
  };
  if (calibrateMicrophonesBool.current) {
    loudspeakerInfo.current.authorEmails = authorEmail.current;
  }

  const IrFreq = soundCalibrationResults.current.component.ir.Freq;
  let IrGain = soundCalibrationResults.current.component.ir.Gain;
  // IrGain = IrGain.map(
  //   (gain_dB) =>
  //     gain_dB +
  //     calibrateSoundBurstScalarDB.current -
  //     calibrateSoundBurstDb.current,
  // );
  // const sineGainAt1000Hz_dB = loudspeakerInfo.current["gainDBSPL"];
  // if (calibrateSoundBurstNormalizeBy1000HzGainBool.current) {
  //   IrGain = IrGain.map((gain_dB) => gain_dB - sineGainAt1000Hz_dB);
  // }
  soundCalibrationResults.current.component.ir = { Freq: IrFreq, Gain: IrGain };
  loudspeakerIR.Freq = IrFreq;
  loudspeakerIR.Gain = IrGain;
  allHzCalibrationResults.knownIr = JSON.parse(
    JSON.stringify(soundCalibrationResults.current.component.ir),
  );
  let filename = downloadLoudspeakerCalibration();
  loudspeakerInfo.current["jsonFileName"] = filename;
  loudspeakerInfo.current["screenWidth"] = microphoneInfo.current.screenWidth;
  loudspeakerInfo.current["screenHeight"] = microphoneInfo.current.screenHeight;
  loudspeakerInfo.current["filteredMLSComponentMin"] =
    Math.round(allHzCalibrationResults.filteredMLSRange.component.Min * 10) /
    10;
  loudspeakerInfo.current["filteredMLSComponentMax"] =
    Math.round(allHzCalibrationResults.filteredMLSRange.component.Max * 10) /
    10;
  loudspeakerInfo.current["filteredMLSSystemMin"] =
    Math.round(allHzCalibrationResults.filteredMLSRange.system.Min * 10) / 10;
  loudspeakerInfo.current["filteredMLSSystemMax"] =
    Math.round(allHzCalibrationResults.filteredMLSRange.system.Max * 10) / 10;
  loudspeakerInfo.current["calibrateSoundBurstDb"] =
    calibrateSoundBurstLevelReTBool.current
      ? calibrateSoundBurstDb.current + parameters.T - parameters.gainDBSPL
      : calibrateSoundBurstDb.current;
  loudspeakerInfo.current["calibrateSoundBurstFilteredExtraDb"] =
    calibrateSoundBurstFilteredExtraDb.current;
  loudspeakerInfo.current["calibrateSoundBurstSec"] =
    calibrateSoundBurstSec.current;
  loudspeakerInfo.current["_calibrateSoundBurstPreSec"] =
    _calibrateSoundBurstPreSec.current;
  loudspeakerInfo.current["_calibrateSoundBurstPostSec"] =
    _calibrateSoundBurstPostSec.current;
  loudspeakerInfo.current["calibrateSoundBurstRepeats"] =
    calibrateSoundBurstRepeats.current;
  loudspeakerInfo.current["calibrateSoundHz"] = calibrateSoundHz.current;
  loudspeakerInfo.current["calibrateSoundIRSec"] = calibrateSoundIRSec.current;
  loudspeakerInfo.current["calibrateSoundIIRSec"] =
    calibrateSoundIIRSec.current;
  loudspeakerInfo.current["calibrateSoundMinHz"] = calibrateSoundMinHz.current;
  loudspeakerInfo.current["calibrateSoundMaxHz"] = calibrateSoundMaxHz.current;
  loudspeakerInfo.current["fs2"] = soundCalibrationResults.current.fs2;
  loudspeakerInfo.current["fs"] = microphoneActualSamplingRate.current;
  loudspeakerInfo.current["T"] = soundCalibrationResults.current.parameters.T;
  loudspeakerInfo.current["W"] = soundCalibrationResults.current.parameters.W;
  loudspeakerInfo.current["Q"] =
    1 / Number(soundCalibrationResults.current.parameters.R.toFixed(1));
  // loudspeakerInfo.current["gainDBSPL"] =
  //   soundCalibrationResults.current.parameters.gainDBSPL;
  loudspeakerInfo.current["backgroundDBSPL"] =
    soundCalibrationResults.current.parameters.backgroundDBSPL;
  loudspeakerInfo.current["RMSError"] =
    soundCalibrationResults.current.parameters.RMSError;
  loudspeakerInfo.current["actualSamplingRate"] = actualSamplingRate.current;
  loudspeakerInfo.current["actualBitsPerSample"] = actualBitsPerSample.current;
  try {
    await saveLoudSpeakerInfoToFirestore(
      loudspeakerInfo.current,
      soundCalibrationResults.current.component.ir_in_time_domain,
      soundCalibrationResults.current.component.ir,
      soundCalibrationResults.current.component.iir,
      allHzCalibrationResults.component.iir_no_bandpass,
    );
  } catch (err) {
    console.log(err);
  }
};

const parseMicrophoneCalibrationResults = async (result, isSmartPhone) => {
  soundCalibrationResults.current = result;
  if (calibrateSoundCheck.current === "system" || "both") {
    allHzCalibrationResults.system = soundCalibrationResults.current.system;
  }
  microphoneCalibrationResult.current = result;
  qualityMetrics.current = result?.qualityMetrics;
  microphoneInfo.current.gainDBSPL =
    Math.round(
      (microphoneCalibrationResult.current.parameters.gainDBSPL -
        loudspeakerInfo.current.gainDBSPL) *
        10,
    ) / 10;
  microphoneInfo.current.CalibrationDate = calibrationTime.current;
  // microphoneCalibrationResult.current.microphoneGain = loudspeakerIR.current;
  microphoneInfo.current.micrFullManufacturerName = isSmartPhone
    ? microphoneCalibrationResult.current.micInfo.OEM
    : microphoneInfo.current.micrFullManufacturerName;
  const IrFreq = soundCalibrationResults.current.component.ir.Freq;
  let IrGain = soundCalibrationResults.current.component.ir.Gain;
  // IrGain = IrGain.map(
  //   (gain_dB) =>
  //     gain_dB +
  //     calibrateSoundBurstScalarDB.current -
  //     calibrateSoundBurstDb.current,
  // );
  // const sineGainAt1000Hz_dB = loudspeakerInfo.curr ent["gainDBSPL"];
  // if (calibrateSoundBurstNormalizeBy1000HzGainBool.current) {
  //   IrGain = IrGain.map((gain_dB) => gain_dB - sineGainAt1000Hz_dB);
  // }
  microphoneCalibrationResult.current.component.ir = {
    Freq: IrFreq,
    Gain: IrGain,
  };

  fMaxHz.system = microphoneCalibrationResult.current.system.fMaxHz;
  fMaxHz.component = microphoneCalibrationResult.current.component.fMaxHz;
  attenuatorGainDB.system =
    microphoneCalibrationResult.current.system.attenuatorGainDB;
  attenuatorGainDB.component =
    microphoneCalibrationResult.current.component.attenuatorGainDB;

  filteredMLSAttenuation.component =
    microphoneCalibrationResult.current.filteredMLSAttenuation.component;
  filteredMLSAttenuation.system =
    microphoneCalibrationResult.current.filteredMLSAttenuation.system;
  filteredMLSAttenuation.maxAbsSystem =
    microphoneCalibrationResult.current.filteredMLSAttenuation.maxAbsSystem;
  filteredMLSAttenuation.maxAbsComponent =
    microphoneCalibrationResult.current.filteredMLSAttenuation.maxAbsComponent;
  filteredMLSAttenuation.attenuationDbSystem =
    10 * Math.log10(filteredMLSAttenuation.system);
  filteredMLSAttenuation.attenuationDbComponent =
    10 * Math.log10(filteredMLSAttenuation.component);

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
    filtered_mls_nbp_system: result.system.filtered_no_bandpass_mls_psd,
    filtered_mls_nbp_component: result.component.filtered_no_bandpass_mls_psd,
    "Loudspeaker model": loudspeakerInfo.current,
    micInfo: {
      micModelName: microphoneInfo.current.micFullName,
      OEM: microphoneInfo.current.micrFullManufacturerName,
      ID: microphoneInfo.current.micFullSerialNumber,
      gainDBSPL: microphoneInfo.current.gainDBSPL,
    },
    // unconv_rec: result?.unfiltered_recording,
    // conv_rec: result?.filtered_recording,
    // mls: result?.mls,
    // componentConvolution: result?.component?.convolution,
    // systemConvolution: result?.system?.convolution,
    autocorrelations: result?.autocorrelations,
    // backgroundRecording: result?.background_noise?.recording,
    db_BackgroundNoise: result?.background_noise?.x_background,
    Hz_BackgroundNoise: result?.background_noise?.y_background,
    backgroundNoiseSystem: {
      x_background: result.system.background_noise.x_background,
      y_background: result.system.background_noise.y_background,
    },
    backgroundNoiseComponent: {
      x_background: result.component.background_noise.x_background,
      y_background: result.component.background_noise.y_background,
    },
    db_system_convolution: result.system?.filtered_mls_psd?.y,
    Hz_system_convolution: result.system?.filtered_mls_psd?.x,
    db_component_convolution: result.component?.filtered_mls_psd?.y,
    Hz_component_convolution: result.component?.filtered_mls_psd?.x,
    loudspeakerGain: loudspeakerIR,
    db_mls: result.mls_psd?.y,
    Hz_mls: result.mls_psd?.x,
    recordingChecks: result.recordingChecks,
    calibrateSoundBurstDb: calibrateSoundBurstLevelReTBool.current
      ? calibrateSoundBurstDb.current +
        result.parameters.T -
        result.parameters.gainDBSPL
      : calibrateSoundBurstDb.current,
    calibrateSoundBurstFilteredExtraDb:
      calibrateSoundBurstFilteredExtraDb.current,
    calibrateSoundBurstLevelReTBool: calibrateSoundBurstLevelReTBool.current,
    calibrateSoundBurstSec: calibrateSoundBurstSec.current,
    _calibrateSoundBurstPreSec: _calibrateSoundBurstPreSec.current,
    _calibrateSoundBurstPostSec: _calibrateSoundBurstPostSec.current,
    calibrateSoundBurstRepeats: calibrateSoundBurstRepeats.current,
    calibrateSoundIRSec: calibrateSoundIRSec.current,
    calibrateSoundIIRSec: calibrateSoundIIRSec.current,
    calibrateSoundMinHz: calibrateSoundMinHz.current,
    calibrateSoundMaxHz: calibrateSoundMaxHz.current,
    calibrateSound1000HzSec: calibrateSound1000HzSec.current,
    calibrateSound1000HzPreSec: calibrateSound1000HzPreSec.current,
    calibrateSound1000HzPostSec: calibrateSound1000HzPostSec.current,
    calibrateSoundHz: calibrateSoundHz.current,
    calibrateSoundSmoothOctaves: calibrateSoundSmoothOctaves.current,
    calibrateSoundSmoothMinBandwidthHz:
      calibrateSoundSmoothMinBandwidthHz.current,
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
    mlsSD: Number(result?.qualityMetrics.mls),
    systemCorrectionSD: Number(result?.qualityMetrics.system),
    componentCorrectionSD: Number(result?.qualityMetrics.component),
    calibrateSoundAttenuationSpeakerAndMicDb:
      filteredMLSAttenuation.attenuationDbSystem,
    calibrateSoundAttenuationMicrophoneDb:
      filteredMLSAttenuation.attenuationDbComponent,
    calibrateSoundAttenuationMicrophoneGain: filteredMLSAttenuation.component,
    calibrateSoundAttenuationSpeakerAndMicGain: filteredMLSAttenuation.system,
    filteredMLSMaxAbsComponent: filteredMLSAttenuation.maxAbsComponent,
    filteredMLSMaxAbsSystem: filteredMLSAttenuation.maxAbsSystem,
    attenuatorGainDB: attenuatorGainDB,
    fMaxHz: fMaxHz,
    fs2: result.fs2,
    waveforms: soundCalibrationResults.current.waveforms,
  };
  microphoneCalibrationResult.current.timeStamps = result.timeStamps;
  microphoneCalibrationResults.push(allResults);
  actualSamplingRate.current =
    soundCalibrationResults.current.audioInfo?.sourceSampleRate;
  microphoneActualSamplingRate.current =
    soundCalibrationResults.current.audioInfo?.sinkSampleRate;
  actualBitsPerSample.current =
    soundCalibrationResults.current.audioInfo?.bitsPerSample;

  if (calibrateSoundSaveJSONBool.current) {
    console.log(calibrationRound.current);
    let filename = psychoJS.experiment.downloadJSON(
      allResults,
      calibrationRound.current,
    );
    result.micInfo["jsonFileName"] = filename;
    calibrationRound.current = calibrationRound.current + 1;
  } else {
    result.micInfo["jsonFileName"] = "";
  }

  result.micInfo["parentTimestamp"] = loudspeakerInfo.current.createDate;
  result.micInfo["parentFilenameJSON"] = loudspeakerInfo.current.jsonFileName;

  const id = await writeIsSmartPhoneToFirestore(
    result.micInfo.ID,
    isSmartPhone,
    result.micInfo.OEM,
  );
  result.micInfo["filteredMLSSystemMin"] =
    Math.round(result.filteredMLSRange.system.Min * 10) / 10;
  result.micInfo["filteredMLSSystemMax"] =
    Math.round(result.filteredMLSRange.system.Max * 10) / 10;
  result.micInfo["filteredMLSComponentMin"] =
    Math.round(result.filteredMLSRange.component.Min * 10) / 10;
  result.micInfo["filteredMLSComponentMax"] =
    Math.round(result.filteredMLSRange.component.Max * 10) / 10;
  result.micInfo["calibrateSoundBurstDb"] = calibrateSoundBurstDb.current;
  result.micInfo["calibrateSoundBurstFilteredExtraDb"] =
    calibrateSoundBurstFilteredExtraDb.current;
  result.micInfo["calibrateSoundBurstLevelReTBool"] =
    calibrateSoundBurstLevelReTBool.current;
  result.micInfo["calibrateSoundBurstSec"] = calibrateSoundBurstSec.current;
  result.micInfo["_calibrateSoundburstPreSec"] =
    _calibrateSoundBurstPreSec.current;
  result.micInfo["_calibrateSoundBurstPostSec"] =
    _calibrateSoundBurstPostSec.current;

  result.micInfo["calibrateSoundBurstRepeats"] =
    calibrateSoundBurstRepeats.current;
  result.micInfo["calibrateSoundHz"] = calibrateSoundHz.current;
  result.micInfo["calibrateSoundIRSec"] = calibrateSoundIRSec.current;
  result.micInfo["calibrateSoundIIRSec"] = calibrateSoundIIRSec.current;
  result.micInfo["calibrateSoundMinHz"] = calibrateSoundMinHz.current;
  result.micInfo["calibrateSoundMaxHz"] = calibrateSoundMaxHz.current;
  result.micInfo["fs2"] = result.fs2;
  result.micInfo["fs"] = microphoneActualSamplingRate.current;
  result.micInfo["T"] = result.parameters.T;
  result.micInfo["W"] = result.parameters.W;
  result.micInfo["Q"] = 1 / Number(result.parameters.R.toFixed(1));
  result.micInfo["gainDBSPL"] = microphoneInfo.current.gainDBSPL;
  result.micInfo["backgroundDBSPL"] = result.parameters.backgroundDBSPL;
  result.micInfo["RMSError"] = result.parameters.RMSError;
  result.micInfo["loudspeakerInfo"] = loudspeakerInfo.current;
  result.micInfo["browser"] = thisExperimentInfo?.deviceBrowser;
  result.micInfo["browserVersion"] = thisExperimentInfo?.deviceBrowserVersion;
  result.micInfo["authorEmails"] = authorEmail.current;
  await writeMicrophoneInfoToFirestore(result.micInfo, id);
  await writeFrqGainToFirestore(IrFreq, IrGain, id);
  await writeGainat1000HzToFirestore(microphoneInfo.current.gainDBSPL, id);
};

const adjustDisplayBeforeCalibration = async (
  elems,
  isSmartPhone,
  language,
  isLoudspeakerCalibration,
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

  if (!isSmartPhone) {
    // add proceed button
    await getConnectionManagerDisplay(true);
    const proceedButton = document.createElement("button");
    proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
    proceedButton.classList.add("btn", "btn-success");
    proceedButton.addEventListener("click", () => {
      window.open(qrLink.value, "_blank");
      proceedButton.remove();
    });
    elems.displayQR.appendChild(proceedButton);
  }

  removeAutocompletionMessage();

  const messageText = isSmartPhone
    ? isLoudspeakerCalibration
      ? "Follow the instructions displayed on your phone"
      : "Follow the instructions displayed on your phone"
    : `${readi18nPhrases("RC_removeHeadphones", language)}<br>${readi18nPhrases(
        "RC_getUSBMicrophoneReady",
        language,
      )}`.replace(/\n/g, "<br>");

  elems.message.style.display = "block";
  elems.message.innerHTML = messageText;
  elems.message.style.lineHeight = "2rem";
  elems.message.style.fontSize = "1.1rem";
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
      filtered_mls_nbp_system:
        soundCalibrationResults.current?.system.filtered_no_bandpass_mls_psd,
      filtered_mls_nbp_component:
        soundCalibrationResults.current?.component.filtered_no_bandpass_mls_psd,
      "Loudspeaker model": loudspeakerInfo.current,
      micInfo: soundCalibrationResults.current?.micInfo,
      // unconv_rec: soundCalibrationResults.current?.unfiltered_recording,
      // conv_rec: soundCalibrationResults.current?.filtered_recording,
      // mls: soundCalibrationResults.current?.mls,
      // componentConvolution:
      //   soundCalibrationResults.current?.component?.convolution,
      // systemConvolution: soundCalibrationResults.current?.system?.convolution,
      autocorrelations: {},
      backgroundNoiseSystem: {
        x_background:
          soundCalibrationResults.current.system.background_noise.x_background,
        y_background:
          soundCalibrationResults.current.system.background_noise.y_background,
      },
      backgroundNoiseComponent: {
        x_background:
          soundCalibrationResults.current.component.background_noise
            .x_background,
        y_background:
          soundCalibrationResults.current.component.background_noise
            .y_background,
      },
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
      calibrateSoundBurstDb: calibrateSoundBurstLevelReTBool.current
        ? calibrateSoundBurstDb.current +
          soundCalibrationResults.current.parameters.T -
          soundCalibrationResults.current.parameters.gainDBSPL
        : calibrateSoundBurstDb.current,
      calibrateSoundBurstFilteredExtraDb:
        calibrateSoundBurstFilteredExtraDb.current,
      calibrateSoundBurstLevelReTBool: calibrateSoundBurstLevelReTBool.current,
      calibrateSoundBurstSec: calibrateSoundBurstSec.current,
      _calibrateSoundBurstPreSec: _calibrateSoundBurstPreSec.current,
      _calibrateSoundBurstPostSec: _calibrateSoundBurstPostSec.current,
      calibrateSoundBurstRepeats: calibrateSoundBurstRepeats.current,
      calibrateSoundIRSec: calibrateSoundIRSec.current,
      calibrateSoundIIRSec: calibrateSoundIIRSec.current,
      calibrateSoundMinHz: calibrateSoundMinHz.current,
      calibrateSoundMaxHz: calibrateSoundMaxHz.current,
      calibrateSound1000HzSec: calibrateSound1000HzSec.current,
      calibrateSound1000HzPreSec: calibrateSound1000HzPreSec.current,
      calibrateSound1000HzPostSec: calibrateSound1000HzPostSec.current,
      calibrateSoundHz: calibrateSoundHz.current,
      calibrateSoundSmoothOctaves: calibrateSoundSmoothOctaves.current,
      calibrateSoundSmoothMinBandwidthHz:
        calibrateSoundSmoothMinBandwidthHz.current,
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
      mlsSD: qualityMetrics.current.mls,
      systemCorrectionSD: Number(qualityMetrics.current?.system),
      componentCorrectionSD: Number(qualityMetrics.current?.component),
      calibrateSoundAttenuationSpeakerAndMicDb:
        filteredMLSAttenuation.attenuationDbSystem,
      calibrateSoundAttenuationLoudspeakerDb:
        filteredMLSAttenuation.attenuationDbComponent,
      calibrateSoundAttenuationSpeakerAndMicGain: filteredMLSAttenuation.system,
      calibrateSoundAttenuationLoudspeakerGain:
        filteredMLSAttenuation.component,
      filteredMLSMaxAbsSystem: filteredMLSAttenuation.maxAbsSystem,
      filteredMLSMaxAbsComponent: filteredMLSAttenuation.maxAbsComponent,
      attenuatorGainDB: attenuatorGainDB,
      fMaxHz: fMaxHz,
      fs2: soundCalibrationResults.current?.fs2,
      waveforms: soundCalibrationResults.current.waveforms,
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
    return psychoJS.experiment.downloadJSON(
      allSoundResults,
      calibrationRound.current++,
    );
  return "";
};

export const getButtonsContainer = (language) => {
  const cantReadButton = document.createElement("button");
  cantReadButton.id = "cantReadButton";
  // cantReadButton.style.marginTop = "9px";

  const noSmartphoneButton = document.createElement("button");
  noSmartphoneButton.id = "noSmartphoneButton";
  noSmartphoneButton.style.marginTop = "13px";

  cantReadButton.innerHTML = readi18nPhrases(
    "RC_cantReadQR_Button",
    language,
  ).replace(" ", "<br>");
  noSmartphoneButton.innerHTML = readi18nPhrases(
    "RC_noSmartphone_Button",
    language,
  ).replace(" ", "<br>");

  const buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.style.flexDirection = "column";

  cantReadButton.addEventListener("click", async () => {
    psychoJS.experiment.addData("QRConnect", "✖Cannot");
    psychoJS.experiment.nextEntry();
    quitPsychoJS("", false, paramReader, !isProlificExperiment(), false);
    showExperimentEnding(true, isProlificExperiment(), language);
  });
  noSmartphoneButton.addEventListener("click", async () => {
    QRSkipResponse.QRNoSmartphoneBool = true;
    psychoJS.experiment.addData("QRConnect", "✖NoPhone");
    psychoJS.experiment.nextEntry();
    quitPsychoJS("", false, paramReader, !isProlificExperiment(), false);
    showExperimentEnding(true, isProlificExperiment(), language);
  });
  cantReadButton.classList.add("needs-page-button");
  noSmartphoneButton.classList.add("needs-page-button");
  buttonContainer.appendChild(cantReadButton);
  buttonContainer.appendChild(noSmartphoneButton);

  return buttonContainer;
};

const getAutocompletionMessage = (language) => {
  const autocompletionMsg = document.createElement("p");
  autocompletionMsg.style.marginTop = "0.5rem";
  autocompletionMsg.style.fontWeight = "normal";
  autocompletionMsg.style.fontStyle = "italic";
  autocompletionMsg.id = "autocompletionMsg";
  try {
    autocompletionMsg.innerText = readi18nPhrases(
      "RC_autocompletion",
      language,
    );
  } catch (e) {
    autocompletionMsg.innerText = "";
    autocompletionMsg.style.display = "none";
    console.error(
      "Failed to add autocompletion message, RC_autocompletion not found.",
      e,
    );
  }
  return autocompletionMsg;
};
const removeAutocompletionMessage = () => {
  const autocompletionMsg = document.getElementById("autocompletionMsg");
  if (autocompletionMsg) {
    autocompletionMsg.remove();
  }
};

// Function to get compatibility status string
const getCompatibilityString = (browserError, neededAPIs, language) => {
  if (browserError !== null) {
    return readi18nPhrases("RC_phoneBrowserCantBeIdentified", language); // "❌ Browser can't be identified."
  } else if (!neededAPIs || !neededAPIs.getUserMedia) {
    return readi18nPhrases(
      "RC_phoneBrowserIdentifiedButIncompatible",
      language,
    ); // "✔❌ Browser ident. but incompatible."
  } else if (neededAPIs.getUserMediaError) {
    return readi18nPhrases(
      "RC_phoneBrowserIdentifiedButIncompatible",
      language,
    ); // "✔❌ Browser ident. but incompatible."
  } else {
    return readi18nPhrases("RC_phoneBrowserIdentifiedAndCompatible", language); // "✔✔ Browser compatible."
  }
};
