import JSZip from "jszip";
import {
  invertedImpulseResponse,
  soundGainDBSPL,
  soundCalibrationLevelDBSPL,
  soundCalibrationResults,
  calibrateSoundCheck,
  calibrateSound1000HzBool,
  calibrateSoundAllHzBool,
  calibrateSound1000HzDB,
  calibrateSound1000HzPreSec,
  calibrateSound1000HzSec,
  calibrateSound1000HzPostSec,
  actualBitsPerSample,
  actualSamplingRate,
  microphoneActualSamplingRate,
  allHzCalibrationResults,
  webAudioDeviceNames,
  loudspeakerInfo,
  micsForSoundTestPage,
  calibrationTime,
  flags,
  microphoneCalibrationResult,
  deviceType,
  microphoneInfo,
  loudspeakerBrowserDetails,
  microphoneBrowserDetails,
  thisExperimentInfo,
  _calibrateSoundBurstPreSec,
  _calibrateSoundBurstPostSec,
  calibrateSoundBurstSec,
  calibrateSoundBurstRepeats,
  calibrateSoundBurstMLSVersions,
  calibrateSoundBackgroundSecs,
  calibrateSoundHz,
  calibrateSoundBurstDownsample,
  calibrateSoundSimulateLoudspeaker,
  calibrateSoundSimulateMicrophone,
  calibrateSoundIRSec,
  calibrateSoundIIRSec,
  calibrateSoundIIRPhase,
  calibrateSoundSmoothMinBandwidthHz,
  calibrateSoundSmoothOctaves,
} from "./global";
import {
  plotForAllHz,
  plotImpulseResponse,
  plotSoundLevels1000Hz,
  plotRecordings,
  plotVolumeRecordings,
  standardDeviation,
  PlotsForTestPage,
} from "./soundTestPlots";
import {
  adjustSoundDbSPL,
  connectAudioNodes,
  createAudioNodeFromBuffer,
  createImpulseResponseFilterNode,
  generatePureTone,
  generateTones,
  getAudioBufferFromArrayBuffer,
  getCurrentTimeString,
  getGainNode,
  getRMSOfWaveForm,
  playAudioBuffer,
  playAudioBufferWithImpulseResponseCalibration,
  setWaveFormToZeroDbSPL,
} from "./soundUtils";
import { readi18nPhrases } from "./readPhrases";
import {
  addMicrophoneToFirestore,
  findGainatFrequency,
  getCalibrationFile,
  parseCalibrationFile,
  readFrqGainFromFirestore,
} from "./soundCalibrationHelpers";

const soundGain = { current: undefined };
const soundDBSPL = { current: undefined };
export const addSoundTestElements = (reader, language) => {
  if (soundCalibrationLevelDBSPL.current) {
    soundDBSPL.current = soundCalibrationLevelDBSPL.current;
  }
  const soundGainFromFile = reader.read("soundGainDBSPL", "__ALL_BLOCKS__");
  if (soundCalibrationResults.current) {
    soundGain.current =
      Math.round(soundCalibrationResults.current.parameters.gainDBSPL * 10) /
      10;
  } else if (soundGainFromFile.length > 0) {
    soundGain.current = Math.round(soundGainFromFile[0] * 10) / 10;
  }

  const modal = document.createElement("div");
  const modalDialog = document.createElement("div");
  const modalContent = document.createElement("div");
  const modalHeaderContainer = document.createElement("div");
  const modalHeader = document.createElement("div");
  const modalTitle = document.createElement("h2");

  const modalSubtitle = document.createElement("p");
  modalSubtitle.setAttribute("id", "soundTestModalSubtitle");

  const timeContainer = document.createElement("div");
  timeContainer.id = "timeContainer";
  timeContainer.style.display = "flex";
  timeContainer.style.marginBottom = "10px";
  timeContainer.style.alignItems = "baseline";
  const timeText = document.createElement("p");
  timeContainer.id = "timeText";
  timeText.innerHTML = readi18nPhrases("RC_AveragingSec", language);
  timeText.style.marginRight = "10px";
  const timeInput = document.createElement("input");
  timeText.id = "timeText";
  timeInput.type = "number";
  timeInput.value = 0.5;
  timeInput.style.width = "80px";
  timeInput.style.height = "25px";
  timeInput.id = "timeInput";

  timeContainer.appendChild(timeText);
  timeContainer.appendChild(timeInput);

  const togglesContainer = document.createElement("div");
  const NoCorrectionToggleLabel = document.createElement("label");
  const NoCorrectionToggleContainer = document.createElement("div");
  const NoCorrectionToggleElements = addToggleSwitch();
  const NoCorrectionToggle = NoCorrectionToggleElements.toggleSwitch;
  const NoCorrectionInput = NoCorrectionToggleElements.toggleSwitchInput;

  const LoudspeakerCorrectionToggleLabel = document.createElement("label");
  const LoudspeakerCorrectionToggleContainer = document.createElement("div");
  const LoudspeakerCorrectionToggleElements = addToggleSwitch();
  const LoudspeakerCorrectionToggle =
    LoudspeakerCorrectionToggleElements.toggleSwitch;
  const LoudspeakerCorrectionInput =
    LoudspeakerCorrectionToggleElements.toggleSwitchInput;

  const SystemCorrectionToggleLabel = document.createElement("label");
  const SystemCorrectionToggleContainer = document.createElement("div");
  const SystemCorrectionToggleElements = addToggleSwitch();
  const SystemCorrectionToggle = SystemCorrectionToggleElements.toggleSwitch;
  const SystemCorrectionInput =
    SystemCorrectionToggleElements.toggleSwitchInput;

  const modalBody = document.createElement("div");
  const modalFooter = document.createElement("div");
  const horizontal = document.createElement("hr");
  const soundLevelContainer = document.createElement("div");
  const soundLevel = document.createElement("p");
  const soundLevelInput = document.createElement("input");
  const speakerSoundGainContainer = document.createElement("div");
  const speakerSoundGain = document.createElement("p");
  const speakerSoundGainInput = document.createElement("input");

  // only one toggle can be on at a time
  NoCorrectionToggle.addEventListener("click", () => {
    NoCorrectionInput.checked = true;
    LoudspeakerCorrectionInput.checked = false;
    SystemCorrectionInput.checked = false;
    if (soundCalibrationResults.current) {
      soundGain.current =
        Math.round(soundCalibrationResults.current.parameters.gainDBSPL * 10) /
        10;
    }
    // speakerSoundGain.innerHTML = readi18nPhrases(
    //   "RC_dB_gainAt1000Hz",
    //   language,
    // ).replace("11.1", soundGain.current);
    // speakerSoundGain.innerHTML = `Loudspeaker ${Math.round(loudspeakerInfo.current["gainDBSPL"] * 10) / 10} gain at 1 kHz <br> Microphone ${Math.round(microphoneInfo.current["gainDBSPL"] * 10) / 10} gain at 1 kHz`;
    soundLevel.innerHTML = readi18nPhrases(
      "RC_DesiredDIgitalInput_dB",
      language,
    );
  });

  LoudspeakerCorrectionToggle.addEventListener("click", () => {
    NoCorrectionInput.checked = false;
    LoudspeakerCorrectionInput.checked = true;
    SystemCorrectionInput.checked = false;
    soundGain.current =
      Math.round(loudspeakerInfo.current["gainDBSPL"] * 10) / 10;
    // speakerSoundGain.innerHTML = readi18nPhrases(
    //   "RC_dB_SPL_gainAt1000Hz",
    //   language,
    // ).replace("11.1", soundGain.current);
    // speakerSoundGain.innerHTML = `Loudspeaker ${Math.round(loudspeakerInfo.current["gainDBSPL"] * 10) / 10} gain at 1 kHz <br><br><br> Microphone ${Math.round(microphoneInfo.current["gainDBSPL"] * 10) / 10} gain at 1 kHz`;
    soundLevel.innerHTML = readi18nPhrases(
      "RC_DesiredSoundLevel_dB_SPL",
      language,
    );
  });

  SystemCorrectionToggle.addEventListener("click", () => {
    NoCorrectionInput.checked = false;
    LoudspeakerCorrectionInput.checked = false;
    SystemCorrectionInput.checked = true;
    soundGain.current =
      Math.round(soundCalibrationResults.current.parameters.gainDBSPL * 10) /
      10;
    // speakerSoundGain.innerHTML = readi18nPhrases(
    //   "RC_dB_gainAt1000Hz",
    //   language,
    // ).replace("11.1", soundGain.current);
    // speakerSoundGain.innerHTML = `Loudspeaker ${Math.round(loudspeakerInfo.current["gainDBSPL"] * 10) / 10} gain at 1 kHz <br><br><br> Microphone ${Math.round(microphoneInfo.current["gainDBSPL"] * 10) / 10} gain at 1 kHz`;
    soundLevel.innerHTML = readi18nPhrases(
      "RC_DesiredDIgitalOutput_dB",
      language,
    );
  });

  // default to LoudspeakerCorrectionToggle being on
  soundGain.current =
    Math.round(loudspeakerInfo.current["gainDBSPL"] * 10) / 10;
  speakerSoundGain.innerHTML = `Loudspeaker ${
    Math.round(loudspeakerInfo.current["gainDBSPL"] * 10) / 10
  } dB gain at 1 kHz <br><br><br> Microphone ${
    microphoneInfo.current["gainDBSPL"]
      ? Math.round(microphoneInfo.current["gainDBSPL"] * 10) / 10
      : "****"
  } dB gain at 1 kHz`;
  soundLevel.innerHTML = readi18nPhrases(
    "RC_DesiredSoundLevel_dB_SPL",
    language,
  );
  LoudspeakerCorrectionInput.checked = true;

  const timestamp = document.createElement("p");
  timestamp.setAttribute("id", "soundTestModalTimestamp");
  timestamp.innerHTML = calibrationTime.current
    ? calibrationTime.current
    : loudspeakerInfo.current.createDate
    ? getCurrentTimeString(loudspeakerInfo.current.createDate)
    : "****";
  const nameOfPlayedSound = document.createElement("p");
  const rmsOfSound = document.createElement("p");
  const maxAmplitude = document.createElement("p");
  // const powerOfDigitalSound = document.createElement("p");
  const elems = {
    modal,
    modalDialog,
    modalContent,
    modalHeader,
    modalTitle,
    modalBody,
    modalFooter,
    soundLevelContainer,
    soundLevel,
    soundLevelInput,
    speakerSoundGainContainer,
    speakerSoundGain,
    speakerSoundGainInput,
    rmsOfSound,
    maxAmplitude,
  };

  modal.setAttribute("id", "soundTestModal");
  // make modal draggable with jquery
  $(modal).draggable({
    handle: "#soundTestModalContent",
  });
  // make modal disappear when clicking outside of it  with jquery on
  $(document).on("click", function (e) {
    // if target is modal or target is not a child of modal
    if (e.target == modal || !modal.contains(e.target)) {
      $(modal).modal("hide");
    }
  });

  modalDialog.setAttribute("id", "soundTestModalDialog");
  modalContent.setAttribute("id", "soundTestModalContent");
  modalHeader.setAttribute("id", "soundTestModalHeader");
  modalHeaderContainer.setAttribute("id", "soundTestModalHeaderContainer");
  modalTitle.setAttribute("id", "soundTestModalTitle");
  modalBody.setAttribute("id", "soundTestModalBody");
  modalFooter.setAttribute("id", "soundTestModalFooter");
  soundLevelContainer.setAttribute("id", "soundTestModalSoundLevelContainer");
  soundLevel.setAttribute("id", "soundTestModalSoundLevel");
  soundLevelInput.setAttribute("id", "soundTestModalSoundLevelInput");
  soundLevelInput.setAttribute("type", "number");
  speakerSoundGainContainer.setAttribute(
    "id",
    "soundTestModalSpeakerSoundGainContainer",
  );
  speakerSoundGain.setAttribute("id", "soundTestModalSpeakerSoundGain");
  speakerSoundGainInput.setAttribute(
    "id",
    "soundTestModalSpeakerSoundGainInput",
  );
  speakerSoundGainInput.setAttribute("type", "number");

  nameOfPlayedSound.setAttribute("id", "soundTestModalNameOfPlayedSound");
  rmsOfSound.setAttribute("id", "soundTestModalRMSOfSound");
  maxAmplitude.setAttribute("id", "soundTestModalMaxAmplitude");
  // powerOfDigitalSound.setAttribute("id", "soundTestModalPowerOfDigitalSound");

  modalContent.style.lineHeight = "0.5rem";
  modalContent.style.minWidth = "fit-content";

  togglesContainer.setAttribute("id", "soundTestModalTogglesContainer");
  togglesContainer.style.display = "flex";
  togglesContainer.style.flexDirection = "column";

  NoCorrectionToggleLabel.setAttribute("id", "soundTestModalNoCorrectionLabel");
  NoCorrectionToggleLabel.innerText = readi18nPhrases(
    "RC_NoCorrection",
    language,
  );
  NoCorrectionToggle.setAttribute("id", "soundTestModalNoCorrectionToggle");
  NoCorrectionToggle.style.marginLeft = "10px";
  NoCorrectionInput.setAttribute("id", "soundTestModalNoCorrectionInput");
  NoCorrectionToggleContainer.style.display = "flex";
  NoCorrectionToggleContainer.style.lineHeight = "0.8rem";
  // space between toggle and label
  NoCorrectionToggleContainer.style.marginBottom = "5px";
  // NoCorrectionToggleContainer.style.justifyContent = "space-between";
  // NoCorrectionToggleContainer.style.alignItems = "center";

  LoudspeakerCorrectionToggleLabel.setAttribute(
    "id",
    "soundTestModalLoudspeakerCorrectionLabel",
  );
  LoudspeakerCorrectionToggleLabel.innerText = readi18nPhrases(
    "RC_CorrectLoudspeaker",
    language,
  );
  LoudspeakerCorrectionToggle.setAttribute(
    "id",
    "soundTestModalLoudspeakerCorrectionToggle",
  );
  LoudspeakerCorrectionToggle.style.marginLeft = "10px";
  LoudspeakerCorrectionInput.setAttribute(
    "id",
    "soundTestModalLoudspeakerCorrectionInput",
  );
  LoudspeakerCorrectionToggleContainer.style.display = "flex";
  LoudspeakerCorrectionToggleContainer.style.lineHeight = "0.8rem";
  // space between toggle and label
  LoudspeakerCorrectionToggleContainer.style.marginBottom = "10px";
  // LoudspeakerCorrectionToggleContainer.style.justifyContent = "space-between";
  // LoudspeakerCorrectionToggleContainer.style.alignItems = "center";

  SystemCorrectionToggleLabel.setAttribute(
    "id",
    "soundTestModalSystemCorrectionLabel",
  );
  SystemCorrectionToggleLabel.innerText = readi18nPhrases(
    "RC_CorrectLoudspeakerAndMicrophone",
    language,
  );
  SystemCorrectionToggle.setAttribute(
    "id",
    "soundTestModalSystemCorrectionToggle",
  );
  SystemCorrectionToggle.style.marginLeft = "10px";
  SystemCorrectionInput.setAttribute(
    "id",
    "soundTestModalSystemCorrectionInput",
  );
  SystemCorrectionToggleContainer.style.display = "flex";
  SystemCorrectionToggleContainer.style.lineHeight = "0.8rem";
  // space between toggle and label
  SystemCorrectionToggleContainer.style.marginBottom = "5px";
  // SystemCorrectionToggleContainer.style.justifyContent = "space-between";
  // SystemCorrectionToggleContainer.style.alignItems = "center";

  modal.classList.add(...["modal", "fade"]);
  modalDialog.classList.add(...["modal-dialog"]);
  modalContent.classList.add(...["modal-content"]);
  // modalHeader.classList.add(...["modal-header"]);
  modalTitle.classList.add(...["modal-title"]);
  modalBody.classList.add(...["modal-body"]);
  modalFooter.classList.add(...["modal-footer"]);

  modalTitle.innerText = readi18nPhrases("RC_SoundTest", language);
  modalTitle.style.marginBottom = "10px";
  modalSubtitle.innerHTML =
    webAudioDeviceNames.loudspeakerText +
    "<br>" +
    webAudioDeviceNames.microphoneText;
  modalSubtitle.style.lineHeight = "normal";
  if (soundDBSPL.current) soundLevelInput.value = soundDBSPL.current.toFixed(1);
  rmsOfSound.innerHTML = readi18nPhrases(
    "RC_DIgitalInput_dB",
    language,
  ).replace("11.1", "****");
  maxAmplitude.innerHTML = readi18nPhrases(
    "RC_DIgitalInputMax",
    language,
  ).replace("1.11", "****");
  nameOfPlayedSound.innerHTML = readi18nPhrases(
    "RC_PlayingSound",
    language,
  ).replace("[[FFF]]", "****");
  // powerOfDigitalSound.innerHTML = "Power of digital sound: **** dB";

  modal.appendChild(modalDialog);
  modalDialog.appendChild(modalContent);
  modalHeaderContainer.appendChild(modalHeader);
  modalHeaderContainer.appendChild(modalSubtitle);
  modalHeaderContainer.appendChild(timeContainer);
  modalHeaderContainer.appendChild(togglesContainer);

  speakerSoundGain.style.marginBottom = "10px";
  speakerSoundGainContainer.appendChild(speakerSoundGain);
  // speakerSoundGainContainer.appendChild(speakerSoundGainInput);
  soundLevelContainer.style.alignItems = "baseline";
  soundLevelInput.style.width = "80px";
  soundLevelInput.style.height = "25px";
  soundLevelInput.style.marginLeft = "5px";
  soundLevel.style.lineHeight = "0.8rem";

  soundLevelContainer.appendChild(soundLevel);
  soundLevelContainer.appendChild(soundLevelInput);
  modalHeaderContainer.appendChild(speakerSoundGainContainer);
  modalHeaderContainer.appendChild(soundLevelContainer);

  // modalHeaderContainer.appendChild(horizontal);
  modalHeaderContainer.appendChild(rmsOfSound);
  modalHeaderContainer.appendChild(maxAmplitude);

  // modalHeaderContainer.appendChild(adjustedSoundLevel);
  // modalHeaderContainer.appendChild(powerOfDigitalSound);
  modalHeaderContainer.appendChild(nameOfPlayedSound);
  modalHeaderContainer.appendChild(timestamp);
  //append the toggles
  NoCorrectionToggleContainer.appendChild(NoCorrectionToggle);
  NoCorrectionToggleContainer.appendChild(NoCorrectionToggleLabel);

  LoudspeakerCorrectionToggleContainer.appendChild(LoudspeakerCorrectionToggle);
  LoudspeakerCorrectionToggleContainer.appendChild(
    LoudspeakerCorrectionToggleLabel,
  );

  SystemCorrectionToggleContainer.appendChild(SystemCorrectionToggle);
  SystemCorrectionToggleContainer.appendChild(SystemCorrectionToggleLabel);

  togglesContainer.appendChild(NoCorrectionToggleContainer);
  if (microphoneInfo.current["gainDBSPL"])
    togglesContainer.appendChild(SystemCorrectionToggleContainer);
  togglesContainer.appendChild(LoudspeakerCorrectionToggleContainer);

  modalContent.appendChild(modalHeaderContainer);
  modalHeader.appendChild(modalTitle);
  // modalBody.appendChild(togglesContainer);
  modalContent.appendChild(modalBody);
  modalContent.appendChild(modalFooter);
  document.body.appendChild(modal);
  addSoundTestCss();

  populateSoundFiles(
    reader,
    modalBody,
    NoCorrectionInput,
    LoudspeakerCorrectionInput,
    SystemCorrectionInput,
    language,
  );
};

const addSoundTestCss = () => {
  const styles = `
    #soundTestModal {
        tabindex: -1;
        role: dialog;
        aria-labelledby: soundTestModalTitle;
        area-hidden: true;
        min-width: fit-content;
        overflow:auto;
      }
    #soundTestModalDialog {
        role: document;
        min-width: fit-content;
    }
    #soundTestModalHeaderContainer{
        padding: 15px;
        padding-bottom: 0;
        
    }
    #soundTestModalHeader {
        display: flex;
        justify-content: space-between;
    }
    #soundTestModalBody {
        padding-top: 0px;
    }
            `;
  const soundTestStyleSheet = document.createElement("style");
  soundTestStyleSheet.innerText = styles;
  document.head.appendChild(soundTestStyleSheet);
};

// export const removeSoundTestElements = (elems) => {
//     Object.values(elems).forEach((elem) => elem.remove());
// }

const addToggleSwitch = () => {
  const toggleSwitch = document.createElement("label");
  const toggleSwitchInput = document.createElement("input");
  const toggleSwitchSpan = document.createElement("span");

  toggleSwitch.setAttribute("class", "switch");
  toggleSwitchInput.setAttribute("type", "checkbox");
  toggleSwitchSpan.setAttribute("class", "checkmark");

  toggleSwitch.appendChild(toggleSwitchInput);
  toggleSwitch.appendChild(toggleSwitchSpan);
  const elems = { toggleSwitch, toggleSwitchInput, toggleSwitchSpan };
  addToggleCSS();
  return elems;
};

const addToggleCSS = () => {
  const styles = `
    // .switch {
    //     position: relative;
    //     display: inline-block;
    //     width: 37px;
    //     height: 20px;
    //   }
    // .switch input {
    //     display: none;
    //   }
    // .slider {
    //     position: absolute;
    //     cursor: pointer;
    //     top: 0;
    //     left: 0;
    //     right: 0;
    //     bottom: 0;
    //     background-color: #ccc;
    //     -webkit-transition: .4s;
    //     transition: .4s;
    //   }
    // .slider:before {
    //     position: absolute;
    //     content: "";
    //     height: 12px;
    //     width: 12px;
    //     left: 2px;
    //     bottom: 4px;
    //     background-color: white;
    //     -webkit-transition: .4s;
    //     transition: .4s;
    //   }
    // input:checked + .slider {
    //     background-color: #2196F3;
    //   }
    // input:focus + .slider {
    //     box-shadow: 0 0 1px #2196F3;
    //   }
    // input:checked + .slider:before {
    //     -webkit-transform: translateX(22px);
    //     -ms-transform: translateX(22px);
    //     transform: translateX(22px);
    //   }
    // .slider.round {
    // border-radius: 34px;
    // }
    
    // .slider.round:before {
    // border-radius: 50%;
    // }
    .switch {
      display: block;
      position: relative;
      padding-left: 35px;
      cursor: pointer;
      font-size: 22px;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    /* Hide the browser's default checkbox */
    .switch input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
      background-color: #ccc;
    }
    
    /* Create a custom checkbox */
    .checkmark {
      position: absolute;
      top: 0;
      left: 0;
      height: 20px;
      width: 20px;
      border-radius:10px;
      background-color: #ccc;
    }
    
    /* On mouse-over, add a grey background color */
    .switch:hover input ~ .checkmark {
      background-color: #ccc;
    }
    
    /* When the checkbox is checked, add a blue background */
    .switch input:checked ~ .checkmark {
      background-color: #2196F3;
    }
    
    /* Create the checkmark/indicator (hidden when not checked) */
    .checkmark:after {
      content: "";
      position: absolute;
      display: none;
    }
    
    /* Show the checkmark when checked */
    .switch input:checked ~ .checkmark:after {
      display: block;
    }
    
    /* Style the checkmark/indicator */
    .switch .checkmark:after {
      left: 8px;
      top: 4px;
      width: 5px;
      height: 10px;
      border: solid white;
      border-width: 0 3px 3px 0;
      -webkit-transform: rotate(45deg);
      -ms-transform: rotate(45deg);
      transform: rotate(45deg);
    }
      `;

  const soundTestToggleStyleSheet = document.createElement("style");
  soundTestToggleStyleSheet.innerText = styles;
  document.head.appendChild(soundTestToggleStyleSheet);
};

const populateSoundFiles = async (
  reader,
  modalBody,
  NoCorrectionInput,
  LoudspeakerCorrectionInput,
  SystemCorrectionInput,
  language,
) => {
  let targetSoundFolders = reader.read("targetSoundFolder", "__ALL_BLOCKS__");
  targetSoundFolders = [...new Set(targetSoundFolders)]; // remove duplicates
  targetSoundFolders = targetSoundFolders.filter((folder) => folder); // remove empty strings
  const targetSoundFiles = {};
  await Promise.all(
    targetSoundFolders.map(async (targetSoundFolder, blockCount) => {
      blockCount++;
      // targetSoundFiles[`Block${blockCount}`] = [];
      targetSoundFiles[`Block${blockCount}`] = await fetch(
        `folders/${targetSoundFolder}.zip`,
      )
        .then((response) => {
          return response.blob();
        })
        .then(async (data) => {
          const Zip = new JSZip();
          const files = await Zip.loadAsync(data).then((zip) => {
            const soundFiles = [];
            zip.forEach((relativePath, zipEntry) => {
              var name = zipEntry.name;

              const ext = name.substring(name.lastIndexOf(".") + 1);
              if (ext !== "wav" && ext !== "aac") return;

              name = name.substring(0, name.lastIndexOf("."));
              soundFiles.push({
                name: name,
                file: zipEntry.async("arraybuffer").then((data) => {
                  return getAudioBufferFromArrayBuffer(data);
                }),
              });
            });
            return soundFiles;
          });
          return files;
        });
    }),
  );

  let maskerSoundFolders = reader.read("maskerSoundFolder", "__ALL_BLOCKS__");
  maskerSoundFolders = [...new Set(maskerSoundFolders)]; // remove duplicates
  maskerSoundFolders = maskerSoundFolders.filter((folder) => folder); // remove empty strings

  await Promise.all(
    maskerSoundFolders.map(async (maskerSoundFolder, blockCount) => {
      blockCount++;
      // targetSoundFiles[`Block${blockCount}`] = [];
      targetSoundFiles[`Masker Sounds: Block ${blockCount}`] = await fetch(
        `folders/${maskerSoundFolder}.zip`,
      )
        .then((response) => {
          return response.blob();
        })
        .then(async (data) => {
          const Zip = new JSZip();
          const files = await Zip.loadAsync(data).then((zip) => {
            const soundFiles = [];
            zip.forEach((relativePath, zipEntry) => {
              var name = zipEntry.name;

              const ext = name.substring(name.lastIndexOf(".") + 1);
              if (ext !== "wav" && ext !== "aac") return;

              name = name.substring(0, name.lastIndexOf("."));
              soundFiles.push({
                name: name,
                file: zipEntry.async("arraybuffer").then((data) => {
                  return getAudioBufferFromArrayBuffer(data);
                }),
              });
            });
            return soundFiles;
          });
          return files;
        });
    }),
  );

  await addSoundFileElements(
    targetSoundFiles,
    modalBody,
    reader,
    NoCorrectionInput,
    LoudspeakerCorrectionInput,
    SystemCorrectionInput,
    language,
  );
};

let mediaRecorder = null;
let mediaRecorderEachStimulus = null;
let recordedChunks = [];
let recordedChunksEachStimulus = [];
let restartRecording = false;
const microphoneIR = {
  Gain: [],
  Frequency: [],
  playingSoundName: null,
  maxdBSPL: -1000,
  maxdB: -1000,
};

const parseSoundFileNameToFrequency = (name) => {
  // if the name is of the format numberHz, return the number. The number might be a floating number
  // else return null
  if (!name) return null;
  // Define a regular expression to match the desired format
  const regex = /^(\d+(\.\d+)?)Hz$/;

  //name could be of format 1000 Hz or 01000.0Hz
  const regex2 = /^(\d+(\.\d+)?)\s?Hz$/;

  // Use the test method to check if the name matches the pattern
  const match = regex.test(name);
  const match2 = regex2.test(name);

  // If there's a match, extract and return the number, otherwise return null
  return match
    ? parseFloat(name.match(regex)[1])
    : match2
    ? parseFloat(name.match(regex2)[1])
    : null;
};

const addSoundFileElements = async (
  targetSoundFiles,
  modalBody,
  reader,
  NoCorrectionInput,
  LoudspeakerCorrectionInput,
  SystemCorrectionInput,
  language,
) => {
  const frequencies = [
    125.0, 250.0, 500.0, 1000.0, 2000.0, 4000.0, 8000.0, 16000.0,
  ];
  const generatedTones = generateTones(frequencies);
  targetSoundFiles["GeneratedTones"] = generatedTones;

  Object.keys(targetSoundFiles).forEach((blockName, index) => {
    const horizontal = document.createElement("hr");
    // const block = document.createElement("div");
    // block.setAttribute("class", "block");
    const table = document.createElement("table");
    const tableHeader = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.style.paddingBottom = "10px";
    const title = document.createElement("h6");
    if (blockName === "GeneratedTones") {
      title.innerHTML = "Generated Tones";
    } else if (blockName.includes("Masker Sounds")) {
      title.innerHTML = "Masker Sounds";
    } else {
      title.innerHTML = "Target Sounds";
    }

    title.style.paddingBottom = "10px";
    modalBody.appendChild(title);
    tableHeader.appendChild(headerRow);
    const headerCell1 = headerRow.insertCell();
    const headerCell2 = headerRow.insertCell();
    const headerCell3 = headerRow.insertCell();
    const headerCell4 = headerRow.insertCell();

    headerCell1.innerHTML = readi18nPhrases("RC_Sound", language);
    headerCell1.style.paddingRight = "10px";
    headerCell2.innerHTML = readi18nPhrases("RC_DigitalIn", language);
    headerCell2.style.paddingRight = "30px";
    headerCell3.innerHTML = readi18nPhrases("RC_SoundLevel", language);
    headerCell3.style.paddingRight = "30px";
    headerCell4.innerHTML = readi18nPhrases("RC_DigitalOut", language);

    const tableBody = document.createElement("tbody");
    table.appendChild(headerRow);
    table.appendChild(tableBody);
    let digitalIn = "";

    modalBody.appendChild(table);
    targetSoundFiles[blockName].forEach((soundFile) => {
      const soundFileContainer = document.createElement("div");
      soundFileContainer.setAttribute("class", "soundFileContainer");
      const soundFileName = document.createElement("h6");
      soundFileName.innerHTML = soundFile.name;
      const soundFileButton = document.createElement("button");
      const soundPowerLevel = document.createElement("p");
      soundPowerLevel.style.marginBottom = "0px";
      const soundDigitalOut = document.createElement("p");
      soundDigitalOut.style.marginBottom = "0px";
      soundPowerLevel.setAttribute("id", "soundPowerLevel" + soundFile.name);
      const soundAmpl = document.createElement("p");
      soundAmpl.style.marginBottom = "0px";
      soundAmpl.setAttribute("id", "soundAmpl" + soundFile.name);
      soundFileButton.classList.add(
        ...["btn", "btn-success", "soundFileButton"],
      );
      soundFileButton.innerHTML = soundFile.name;

      soundFileButton.addEventListener("click", async () => {
        // display name of sound file
        if (blockName === "GeneratedTones") {
          const durationSec = document.getElementById("timeInput").value;
          const frequency = parseSoundFileNameToFrequency(soundFile.name);
          soundFile = await generatePureTone(frequency, durationSec, 96000);
        }
        document.getElementById("soundTestModalNameOfPlayedSound").innerHTML =
          readi18nPhrases("RC_PlayingSound", language).replace(
            "[[FFF]]",
            soundFile.name,
          );
        const soundFileBuffer = cloneAudioBuffer(await soundFile.file);
        microphoneIR.playingSoundName = parseSoundFileNameToFrequency(
          soundFile.name,
        );

        const record = document.getElementById("RecordEachStimulusInput");
        const deviceId = document.getElementById(
          "record-microphone-select",
        ).value;
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: deviceId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        mediaRecorderEachStimulus = new MediaRecorder(stream);
        if (record && record.checked) {
          recordedChunksEachStimulus = [];

          mediaRecorderEachStimulus.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksEachStimulus.push(event.data);
            }
          };

          mediaRecorderEachStimulus.onstop = async () => {
            const { powerLevel } = await computePowerLevel(
              recordedChunksEachStimulus,
            );
            let dbSPLValue = null;
            if (microphoneIR.playingSoundName) {
              const freq = microphoneIR.playingSoundName;
              if (freq && microphoneIR.Frequency.length > 0) {
                dbSPLValue = convertDBToDBSPL(powerLevel, freq);
              }
            }
            if (dbSPLValue) {
              soundDigitalOut.innerHTML = dbSPLValue + " dB SPL";
            }
            soundPowerLevel.innerHTML = powerLevel + " dB";
            recordedChunksEachStimulus = [];
          };

          mediaRecorderEachStimulus.start();
        }

        // soundGain.current = document.getElementById(
        //   "soundTestModalSpeakerSoundGainInput"
        // ).value;
        // // round soundGain to 1 decimal places
        // soundGain.current = Math.round(soundGain.current * 10) / 10;
        // document.getElementById("soundTestModalSpeakerSoundGainInput").value =
        //   soundGain.current.toFixed(1);

        var audioData = soundFileBuffer.getChannelData(0);
        setWaveFormToZeroDbSPL(audioData);

        soundDBSPL.current = document.getElementById(
          "soundTestModalSoundLevelInput",
        ).value;
        // round soundCalibrationLevelDBSPL to 1 decimal places
        soundDBSPL.current = Math.round(soundDBSPL.current * 10) / 10;
        document.getElementById("soundTestModalSoundLevelInput").value =
          soundDBSPL.current.toFixed(1);

        // adjust sound gain and find inDB

        // const parameters = soundCalibrationResults.current.parameters;
        const correctedValues = getCorrectedInDbAndSoundDBSPL(
          soundDBSPL.current,
          soundGain.current,
          audioData,
          NoCorrectionInput.checked,
        );
        const inDB = correctedValues.inDB;
        soundDBSPL.current = correctedValues.correctedSoundDBSPL;
        soundDBSPL.current = Math.round(soundDBSPL.current * 10) / 10;

        const maxOfOriginalSound =
          getMaxValueOfAbsoluteValueOfBuffer(audioData);
        const theGainValue = getGainValue(inDB);
        const soundMax = maxOfOriginalSound * theGainValue;
        document.getElementById("soundTestModalMaxAmplitude").innerHTML =
          readi18nPhrases("RC_DIgitalInputMax", language).replace(
            "1.11",
            soundMax.toFixed(6),
          );
        // `Digital sound max: ${soundMax.toFixed(2)}`;

        document.getElementById("soundTestModalSoundLevelInput").value =
          soundDBSPL.current;
        const rmsOfSound = document.getElementById("soundTestModalRMSOfSound");

        // adjust sound by changing the amplitude of the sound file manually
        adjustSoundDbSPL(audioData, inDB);
        digitalIn = calculateDBFromRMS(getRMSOfWaveForm(audioData));
        rmsOfSound.innerHTML = readi18nPhrases(
          "RC_DIgitalInput_dB",
          language,
        ).replace("11.1", digitalIn);
        // `Digital sound RMS dB: ${calculateDBFromRMS(
        //   getRMSOfWaveForm(audioData)
        // )} dB`;
        // power of audioData: p_dB = 10 * log10(1/N * sum(x^2))
        soundAmpl.innerHTML = inDB.toFixed(1) + " dB";

        if (SystemCorrectionInput.checked) {
          if (allHzCalibrationResults.system.iir_no_bandpass)
            playAudioBufferWithImpulseResponseCalibration(
              soundFileBuffer,
              allHzCalibrationResults.system.iir_no_bandpass,
              record && record.checked ? mediaRecorderEachStimulus : null,
              null,
            );
          else
            alert(
              "There was an error loading the impulse response. Please try calibrating again.",
            );
        } else if (LoudspeakerCorrectionInput.checked) {
          if (allHzCalibrationResults.component.iir_no_bandpass)
            playAudioBufferWithImpulseResponseCalibration(
              soundFileBuffer,
              allHzCalibrationResults.component.iir_no_bandpass,
              record && record.checked ? mediaRecorderEachStimulus : null,
              null,
            );
          else
            alert(
              "There was an error loading the impulse response. Please try calibrating again.",
            );
        } else
          playAudioBuffer(
            soundFileBuffer,
            record && record.checked ? mediaRecorderEachStimulus : null,
            null,
          );
      });
      const row = table.insertRow();
      // row.style.paddingBottom = "10px";
      row.style.lineHeight = "3rem";
      const cell1 = row.insertCell();
      cell1.style.paddingRight = "10px";
      cell1.style.display = "flex";
      const cell2 = row.insertCell();
      cell2.style.paddingRight = "30px";
      const cell3 = row.insertCell();
      cell3.style.paddingRight = "30px";
      const cell4 = row.insertCell();
      cell1.appendChild(soundFileButton);
      cell2.appendChild(soundAmpl);
      cell3.appendChild(soundDigitalOut);
      cell4.appendChild(soundPowerLevel);
      tableBody.appendChild(row);

      // soundFileContainer.appendChild(soundFileButton);
      // soundFileContainer.appendChild(soundFileName);
      // soundFileContainer.appendChild(soundPowerLevel);
      // soundFileContainer.style.alignItems = "baseline";

      // block.appendChild(soundFileContainer);
    });
    // modalBody.appendChild(block);

    modalBody.appendChild(horizontal);
  });
  addSoundFileCSS();
  await addAudioRecordAndPlayback(modalBody, language);
  // await addTestPagePSDPlots(modalBody, language);
};

const addTestPagePSDPlots = async (modalBody, language) => {
  const plotCanvas = document.createElement("canvas");
  plotCanvas.setAttribute("id", "plotCanvas");
  plotCanvas.width = 500;
  plotCanvas.height = 500;
  plotCanvas.style.marginTop = "20px";

  modalBody.appendChild(plotCanvas);

  PlotsForTestPage(
    plotCanvas,
    allHzCalibrationResults.component.iir_psd,
    allHzCalibrationResults.system.iir_psd,
  );
};

// Initialize the microphone dropdown
export const initializeMicrophoneDropdown = async (language) => {
  micsForSoundTestPage.list = await getListOfConnectedMicrophones();
  const select = document.createElement("select");
  select.id = "record-microphone-select";

  const isAllowedMicrophone = (name) => /UMIK-1|UMIK-2/i.test(name);

  // Populate the dropdown with the initial list of microphones
  const populateMicrophoneOptions = () => {
    const previousValue = select.value; // Save current selection
    select.innerHTML = ""; // Clear existing options
    let hasAllowedOption = false;

    micsForSoundTestPage.list.forEach((microphone) => {
      const option = document.createElement("option");
      option.value = microphone.deviceId;
      option.text = microphone.label || "Unknown Microphone";
      if (isAllowedMicrophone(option.text)) {
        option.style.color = "black"; // Allowed names in black
        option.disabled = false; // Enable selection
      } else {
        option.style.color = "gray"; // Disallowed names in gray
        option.disabled = true; // Disable selection
      }
      select.appendChild(option);
    });
    // Restore previous selection if it exists
    if (
      micsForSoundTestPage.list.some((mic) => mic.deviceId === previousValue)
    ) {
      select.value = previousValue;
    } else if (hasAllowedOption) {
      // If previous selection is not allowed, select the first allowed option
      const firstAllowed = Array.from(select.options).find(
        (option) => !option.disabled,
      );
      if (firstAllowed) {
        select.value = firstAllowed.value;
      }
    }
  };

  // Debounce function to prevent multiple rapid refreshes
  let refreshTimeout;
  const debounceRefresh = async () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(async () => {
      console.log("Refreshing microphone list");
      micsForSoundTestPage.list = await getListOfConnectedMicrophones();
      populateMicrophoneOptions();
    }, 100); // Adjust the timeout as needed
  };

  // Refresh the microphone list when the dropdown is about to be opened
  select.addEventListener("mousedown", debounceRefresh);

  // Update the selected microphone information
  select.addEventListener("change", () => {
    const selectedOption = select.options[select.selectedIndex];
    webAudioDeviceNames.microphone = selectedOption.text;
    webAudioDeviceNames.microphoneText = readi18nPhrases(
      "RC_nameMicrophone",
      language,
    )
      .replace("[[xxx]]", webAudioDeviceNames.microphone)
      .replace("[[XXX]]", webAudioDeviceNames.microphone);

    const modalSubtitle = document.getElementById("soundTestModalSubtitle");
    if (modalSubtitle) {
      modalSubtitle.innerHTML =
        webAudioDeviceNames.loudspeakerText +
        "<br>" +
        webAudioDeviceNames.microphoneText;
    }
  });

  // Initial population of options
  populateMicrophoneOptions();

  return select;
};

export const initializeMicrophoneDropdownForCalibration = async (language) => {
  micsForSoundTestPage.list = await getListOfConnectedMicrophones();
  const select = document.createElement("select");
  select.id = "record-microphone-select";

  // Function to check if the microphone is allowed
  const isAllowedMicrophone = (name) => /UMIK-1|UMIK-2/i.test(name);

  // Populate the dropdown with the initial list of microphones
  const populateMicrophoneOptions = () => {
    const previousValue = select.value; // Save current selection
    select.innerHTML = ""; // Clear existing options
    let hasAllowedOption = false;

    micsForSoundTestPage.list.forEach((microphone) => {
      const option = document.createElement("option");
      option.value = microphone.deviceId;
      option.text = microphone.label || "Unknown Microphone";

      // Check if the microphone name is allowed
      if (isAllowedMicrophone(option.text)) {
        //if(true) {
        option.style.color = "black"; // Allowed names in black
        option.disabled = false; // Enable selection
        hasAllowedOption = true;
      } else {
        option.style.color = "gray"; // Disallowed names in gray
        option.disabled = true; // Disable selection
      }

      select.appendChild(option);
    });

    // Restore previous selection if it exists and is allowed
    if (
      micsForSoundTestPage.list.some(
        (mic) =>
          mic.deviceId === previousValue && isAllowedMicrophone(mic.label),
      )
    ) {
      select.value = previousValue;
    } else if (hasAllowedOption) {
      // If previous selection is not allowed, select the first allowed option
      const firstAllowed = Array.from(select.options).find(
        (option) => !option.disabled,
      );
      if (firstAllowed) {
        select.value = firstAllowed.value;
      }
    }
  };

  // Debounce function to prevent multiple rapid refreshes
  let refreshTimeout;
  const debounceRefresh = async () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(async () => {
      console.log("Refreshing microphone list");
      micsForSoundTestPage.list = await getListOfConnectedMicrophones();
      populateMicrophoneOptions();
    }, 100); // Adjust the timeout as needed
  };

  // Refresh the microphone list when the dropdown is about to be opened
  select.addEventListener("mousedown", debounceRefresh);

  // Update the selected microphone information
  select.addEventListener("change", () => {
    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption.disabled) {
      webAudioDeviceNames.microphone = selectedOption.text;
      webAudioDeviceNames.microphoneText = readi18nPhrases(
        "RC_nameMicrophone",
        language,
      )
        .replace("[[xxx]]", webAudioDeviceNames.microphone)
        .replace("[[XXX]]", webAudioDeviceNames.microphone);

      const modalSubtitle = document.getElementById("soundTestModalSubtitle");
      if (modalSubtitle) {
        modalSubtitle.innerHTML =
          webAudioDeviceNames.loudspeakerText +
          "<br>" +
          webAudioDeviceNames.microphoneText;
      }
    }
  });

  // Initial population of options
  populateMicrophoneOptions();
  const selectedOption = select.options[select.selectedIndex];
  if (selectedOption === undefined) return select;
  if (!selectedOption.disabled) {
    webAudioDeviceNames.microphone = selectedOption.text;
    webAudioDeviceNames.microphoneText = readi18nPhrases(
      "RC_nameMicrophone",
      language,
    )
      .replace("[[xxx]]", webAudioDeviceNames.microphone)
      .replace("[[XXX]]", webAudioDeviceNames.microphone);

    const modalSubtitle = document.getElementById("soundTestModalSubtitle");
    if (modalSubtitle) {
      modalSubtitle.innerHTML =
        webAudioDeviceNames.loudspeakerText +
        "<br>" +
        webAudioDeviceNames.microphoneText;
    }
  }

  return select;
};

export const updateMicrophoneDropdown = (dropdown, microphones) => {
  const previousValue = dropdown.value; // Save the current selection
  dropdown.innerHTML = ""; // Clear existing options

  microphones.forEach((mic) => {
    const option = document.createElement("option");
    option.value = mic.deviceId;
    option.text = mic.label || "Unknown Microphone";

    // Enable UMIK microphones and disable others
    if (/UMIK-1|UMIK-2/i.test(option.text)) {
      option.disabled = false; // UMIK microphones are enabled
    } else {
      option.disabled = true; // Non-UMIK microphones are disabled
    }

    dropdown.appendChild(option);
  });

  // Restore previous selection if still valid
  const validOption = microphones.some((mic) => mic.deviceId === previousValue);
  if (validOption) {
    dropdown.value = previousValue;
  } else {
    const firstAllowed = Array.from(dropdown.options).find(
      (option) => !option.disabled,
    );
    if (firstAllowed) {
      dropdown.value = firstAllowed.value;
    }
  }
};

let pollingInterval;

export const startMicrophonePolling = async (
  select,
  micNameInput,
  micManufacturerInput,
  updateProceedButtonState,
) => {
  if (pollingInterval) clearInterval(pollingInterval); // Clear any existing interval

  pollingInterval = setInterval(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter((device) => device.kind === "audioinput");

    // Check if the selected microphone is still connected
    const selectedMic = mics.find((mic) => mic.deviceId === select.value);

    if (!selectedMic) {
      // Clear selection if the microphone is disconnected
      micManufacturerInput.value = "";
      micNameInput.value = "";
      select.value = "";
    } else if (/UMIK-1|UMIK-2/i.test(selectedMic.label)) {
      // If the selected mic is UMIK-1 or UMIK-2, auto-fill inputs
      micManufacturerInput.value = "miniDSP";
      const match = selectedMic.label.match(/UMIK-1|UMIK-2/i);
      micNameInput.value = match ? match[0].toUpperCase() : "";
    }

    // Update the dropdown list with the current list of microphones
    updateMicrophoneDropdown(select, mics);

    // Update the Proceed button state based on current inputs
    updateProceedButtonState();
  }, 1000); // Poll every second
};

const addAudioRecordAndPlayback = async (modalBody, language) => {
  const recordButton = document.createElement("button");
  const p = document.createElement("p");
  p.id = "powerLevel";
  p.style.lineHeight = "1.2rem";

  const powerLevelTable = document.createElement("table");
  powerLevelTable.id = "powerLevelTable";
  powerLevelTable.style.lineHeight = "1rem";
  const powerLevelTableHeader = document.createElement("thead");
  const powerLevelHeaderRow = document.createElement("tr");
  powerLevelHeaderRow.style.paddingBottom = "10px";
  powerLevelTableHeader.appendChild(powerLevelHeaderRow);
  const powerLevelHeaderCell1 = powerLevelHeaderRow.insertCell();
  const powerLevelHeaderCell2 = powerLevelHeaderRow.insertCell();
  const powerLevelHeaderCell3 = powerLevelHeaderRow.insertCell();

  powerLevelHeaderCell1.innerHTML = "Ampl. in";
  powerLevelHeaderCell1.style.paddingRight = "30px";
  powerLevelHeaderCell2.innerHTML = readi18nPhrases("RC_SoundLevel", language);
  powerLevelHeaderCell2.style.paddingRight = "30px";
  powerLevelHeaderCell3.innerHTML = readi18nPhrases("RC_DigitalOut", language);

  powerLevelTable.appendChild(powerLevelHeaderRow);
  const powerLevelTableBody = document.createElement("tbody");
  powerLevelTableBody.id = "powerLevelTableBody";
  powerLevelTable.appendChild(powerLevelTableBody);

  const max = document.createElement("p");
  max.id = "running-max";
  max.style.lineHeight = "1.2rem";
  max.innerText = "Max ";
  max.style.marginRight = "5px";

  const maxdB = document.createElement("p");
  maxdB.id = "running-max-dB";
  maxdB.style.lineHeight = "1.2rem";
  maxdB.innerText = "-1000.0 dB, ";
  maxdB.style.marginRight = "5px";

  const maxdBSPL = document.createElement("p");
  maxdBSPL.id = "running-max-dB-SPL";
  maxdBSPL.style.lineHeight = "1.2rem";
  maxdBSPL.innerText = "-1000.0 dB SPL";

  const fetchMessage = document.createElement("p");
  fetchMessage.id = "fetch-message";
  fetchMessage.style.lineHeight = "1.2rem";

  const RecordEachStimulusToggleLabel = document.createElement("label");
  const RecordEachStimulusToggleContainer = document.createElement("div");
  const RecordEachStimulusToggleElements = addToggleSwitch();
  const RecordEachStimulusToggle =
    RecordEachStimulusToggleElements.toggleSwitch;
  const RecordEachStimulusInput =
    RecordEachStimulusToggleElements.toggleSwitchInput;

  RecordEachStimulusToggleLabel.setAttribute(
    "id",
    "RecordEachStimulusToggleLabel",
  );
  RecordEachStimulusToggleLabel.innerText =
    "Automatically measure each button's sound";
  RecordEachStimulusToggle.setAttribute("id", "RecordEachStimulusToggle");
  RecordEachStimulusToggle.style.marginLeft = "10px";
  RecordEachStimulusInput.setAttribute("id", "RecordEachStimulusInput");
  RecordEachStimulusInput.checked = true;
  RecordEachStimulusToggleContainer.style.display = "flex";
  RecordEachStimulusToggleContainer.style.lineHeight = "1.2rem";
  // space between toggle and label
  RecordEachStimulusToggleContainer.style.marginBottom = "5px";
  // RecordEachStimulusToggleContainer.style.justifyContent = "space-between";
  // RecordEachStimulusToggleContainer.style.alignItems = "center";

  RecordEachStimulusToggleContainer.appendChild(RecordEachStimulusToggle);
  RecordEachStimulusToggleContainer.appendChild(RecordEachStimulusToggleLabel);

  RecordEachStimulusInput.addEventListener("click", () => {
    // if RecordEachStimulusInput is checked, then don't show the record button
    if (RecordEachStimulusInput.checked) {
      recordButton.style.display = "none";
      max.style.display = "none";
      maxdB.style.display = "none";
      maxdBSPL.style.display = "none";
      powerLevelTable.style.display = "none";
      ManuallyRecordStimulusInput.checked = false;
    } else {
      recordButton.style.display = "block";
      max.style.display = "block";
      maxdB.style.display = "block";
      maxdBSPL.style.display = "block";
      powerLevelTable.style.display = "block";
      ManuallyRecordStimulusInput.checked = true;
    }
  });

  const ManuallyRecordStimulusToggleLabel = document.createElement("label");
  const ManuallyRecordStimulusToggleContainer = document.createElement("div");
  const ManuallyRecordStimulusToggleElements = addToggleSwitch();
  const ManuallyRecordStimulusToggle =
    ManuallyRecordStimulusToggleElements.toggleSwitch;
  const ManuallyRecordStimulusInput =
    ManuallyRecordStimulusToggleElements.toggleSwitchInput;
  ManuallyRecordStimulusInput.checked = false;

  ManuallyRecordStimulusToggleLabel.setAttribute(
    "id",
    "ManuallyRecordStimulusToggleLabel",
  );
  ManuallyRecordStimulusToggleLabel.innerText = "Measure by recording manually";
  ManuallyRecordStimulusToggle.setAttribute(
    "id",
    "ManuallyRecordStimulusToggle",
  );
  ManuallyRecordStimulusToggle.style.marginLeft = "10px";
  ManuallyRecordStimulusInput.setAttribute("id", "ManuallyRecordStimulusInput");
  ManuallyRecordStimulusToggleContainer.style.display = "flex";
  ManuallyRecordStimulusToggleContainer.style.lineHeight = "1.2rem";
  ManuallyRecordStimulusToggleContainer.style.marginBottom = "5px";
  ManuallyRecordStimulusToggleContainer.appendChild(
    ManuallyRecordStimulusToggle,
  );
  ManuallyRecordStimulusToggleContainer.appendChild(
    ManuallyRecordStimulusToggleLabel,
  );

  ManuallyRecordStimulusInput.addEventListener("click", () => {
    if (ManuallyRecordStimulusInput.checked) {
      recordButton.style.display = "block";
      max.style.display = "block";
      maxdB.style.display = "block";
      maxdBSPL.style.display = "block";
      powerLevelTable.style.display = "block";
      RecordEachStimulusInput.checked = false;
    } else {
      recordButton.style.display = "none";
      max.style.display = "none";
      maxdB.style.display = "none";
      maxdBSPL.style.display = "none";
      powerLevelTable.style.display = "none";
      RecordEachStimulusInput.checked = true;
    }
  });

  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.alignItems = "baseline";
  // container.style.flexDirection = "row";

  const micNameInput = document.createElement("input");
  micNameInput.type = "text";
  micNameInput.id = "micNameInput";
  micNameInput.name = "micNameInput";
  micNameInput.placeholder = "Microphone Name";
  micNameInput.style.width = "100%";

  const micManufacturerInput = document.createElement("input");
  micManufacturerInput.type = "text";
  micManufacturerInput.id = "micManufacturerInput";
  micManufacturerInput.name = "micManufacturerInput";
  micManufacturerInput.placeholder = "Microphone Manufacturer";
  micManufacturerInput.style.width = "100%";

  const micSerialNumberInput = document.createElement("input");
  micSerialNumberInput.type = "text";
  micSerialNumberInput.id = "micSerialNumberInput";
  micSerialNumberInput.name = "micSerialNumberInput";
  micSerialNumberInput.placeholder = "Serial Number";
  micSerialNumberInput.style.width = "100%";

  // Call the function to initialize the dropdown
  const select = await initializeMicrophoneDropdown(language);
  startMicrophonePolling(select, micNameInput, micManufacturerInput, () => {});
  select.style.marginBottom = "10px";

  // add a proceed button
  const proceedButton = document.createElement("button");
  proceedButton.innerHTML = "Fetch Microphone Profile";
  proceedButton.classList.add(...["btn", "btn-success"]);
  proceedButton.style.marginBottom = "10px";

  proceedButton.addEventListener("click", async () => {
    proceedButton.innerHTML = "Loading ...";
    if (
      micNameInput.value === "" ||
      micManufacturerInput.value === "" ||
      micSerialNumberInput.value === ""
    ) {
      alert(
        "Please enter the microphone name, manufacturer, and serial number.",
      );
      proceedButton.innerHTML = "Fetch Microphone Profile";
      return;
    }
    const OEM = micManufacturerInput.value.toLowerCase().split(" ").join("");
    const IR = await readFrqGainFromFirestore(micSerialNumberInput.value, OEM);
    const Gain = findGainatFrequency(IR.Freq, IR.Gain, 1000);
    microphoneInfo.gainDBSPL = Gain;
    const speakerSoundGain = document.getElementById(
      "soundTestModalSpeakerSoundGain",
    );
    if (speakerSoundGain) {
      speakerSoundGain.innerHTML = `Loudspeaker ${
        Math.round(loudspeakerInfo.current["gainDBSPL"] * 10) / 10
      } dB gain at 1 kHz <br><br><br> Microphone ${
        microphoneInfo.current["gainDBSPL"]
          ? Math.round(microphoneInfo.current["gainDBSPL"] * 10) / 10
          : "****"
      } dB gain at 1 kHz`;
    }
    if (IR) {
      microphoneIR.Gain = IR.Gain;
      microphoneIR.Frequency = IR.Freq;
      fetchMessage.innerHTML =
        "Microphone profile found: " + micSerialNumberInput.value;
      fetchMessage.style.color = "green";
      recordButton.style.display = "none";
      max.style.display = "none";
      maxdB.style.display = "none";
      maxdBSPL.style.display = "none";
      RecordEachStimulusInput.checked = true;
      ManuallyRecordStimulusInput.checked = false;
    } else if (
      OEM === "minidsp" &&
      (micNameInput.value === "UMIK-1" || micNameInput.value === "UMIK-2")
    ) {
      // if the microphone is from miniDSP, fetch the microphone info from the miniDSP website
      const serial = micSerialNumberInput.value.replace("-", "");
      const url =
        micNameInput.value === "UMIK-1"
          ? `https://www.minidsp.com/scripts/umikcal/umik90.php/${serial}_90deg.txt`
          : `https://www.minidsp.com/scripts/umik2cal/umik90.php/${serial}_90deg.txt`;
      const file = await getCalibrationFile(url);
      if (file) {
        const data = parseCalibrationFile(file, micNameInput.value);
        const Gain = findGainatFrequency(data.Freq, data.Gain, 1000);
        microphoneInfo.gainDBSPL = Gain;
        const speakerSoundGain = document.getElementById(
          "soundTestModalSpeakerSoundGain",
        );
        if (speakerSoundGain) {
          speakerSoundGain.innerHTML = `Loudspeaker ${
            Math.round(loudspeakerInfo.current["gainDBSPL"] * 10) / 10
          } dB gain at 1 kHz <br><br><br> Microphone ${
            microphoneInfo.current["gainDBSPL"]
              ? Math.round(microphoneInfo.current["gainDBSPL"] * 10) / 10
              : "****"
          } dB gain at 1 kHz`;
        }
        microphoneIR.Gain = data.Gain;
        microphoneIR.Frequency = data.Freq;
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
          serial: micSerialNumberInput.value,
          DeviceType: "N/A",
          HardwareModel: micManufacturerInput.value,
          HardwareName: micManufacturerInput.value,
          ID: micSerialNumberInput.value,
          OEM: micManufacturerInput.value,
          PlatformName: "N/A",
          PlatformVersion: "N/A",
          hardwareFamily: micManufacturerInput.value,
          micModelName: micNameInput.value,
          isDefault: true,
          micManufacturerName: micManufacturerInput.value,
          lowercaseOEM: OEM,
          ID_from_51Degrees: "N/A",
        };

        // await addMicrophoneToDatabase(micSerialNumber, micManufacturer, micData);
        await addMicrophoneToFirestore(micData);
        fetchMessage.innerHTML =
          "Microphone profile found: " + micSerialNumberInput.value;
        fetchMessage.style.color = "green";
        recordButton.style.display = "none";
        max.style.display = "none";
        maxdB.style.display = "none";
        maxdBSPL.style.display = "none";
        RecordEachStimulusInput.checked = true;
        ManuallyRecordStimulusInput.checked = false;
      }
    } else {
      fetchMessage.innerHTML =
        "No microphone profile found. Please calibrate the microphone.";
      fetchMessage.style.color = "red";
    }
    proceedButton.innerHTML = "Fetch Microphone Profile";
  });

  micsForSoundTestPage.list.forEach((microphone) => {
    const option = document.createElement("option");
    option.value = microphone.deviceId;
    option.text = microphone.label;
    select.appendChild(option);
  });

  recordButton.classList.add(...["btn", "btn-success"]);
  recordButton.style.marginRight = "10px";
  recordButton.innerHTML = "Record";

  recordButton.addEventListener("click", async () => {
    await toggleRecording(select.value, recordButton, language);
  });

  modalBody.appendChild(select);
  modalBody.appendChild(micManufacturerInput);
  modalBody.appendChild(micNameInput);
  modalBody.appendChild(micSerialNumberInput);
  modalBody.appendChild(proceedButton);
  modalBody.appendChild(fetchMessage);
  modalBody.appendChild(RecordEachStimulusToggleContainer);
  modalBody.appendChild(ManuallyRecordStimulusToggleContainer);

  container.appendChild(recordButton);
  container.appendChild(max);
  container.appendChild(maxdB);
  container.appendChild(maxdBSPL);
  modalBody.appendChild(container);
  modalBody.appendChild(powerLevelTable);
  // modalBody.appendChild(recordButton);
  modalBody.appendChild(p);
};

const startRecording = async (deviceId, recordButton, language) => {
  const max = document.getElementById("running-max-dB");
  max.innerText = "-1000.0 dB, ";
  const maxdBSPL = document.getElementById("running-max-dB-SPL");
  maxdBSPL.innerText = "-1000.0 dB SPL";
  microphoneIR.maxdB = -1000;
  microphoneIR.maxdBSPL = -1000;
  console.log({
    deviceId: { exact: deviceId },
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  });
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: { exact: deviceId },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });
  mediaRecorder = new MediaRecorder(stream);
  recordedChunks = [];
  recordButton.innerHTML = "Stop Recording";
  const p = document.getElementById("powerLevel");
  p.innerHTML = "";

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = async () => {
    const { powerLevel, Ampl } = await computePowerLevel(recordedChunks);
    let dbSPLValue = null;
    if (microphoneIR.playingSoundName) {
      const freq = microphoneIR.playingSoundName;
      if (freq && microphoneIR.Frequency.length > 0) {
        dbSPLValue = convertDBToDBSPL(powerLevel, freq);
      }
    }
    if (parseFloat(powerLevel) > microphoneIR.maxdB) {
      max.innerText = powerLevel + " dB, ";
      microphoneIR.maxdB = parseFloat(powerLevel);
    }
    // p.innerText += "\n" + powerLevel + " " + readi18nPhrases("RC_dB", language);
    const powerLevelTableBody = document.getElementById("powerLevelTableBody");
    const powerLevelTable = document.getElementById("powerLevelTable");
    const row = powerLevelTable.insertRow(0);
    const cell1 = row.insertCell();
    cell1.style.paddingRight = "30px";
    cell1.innerText = Ampl ? Ampl.toFixed(8) : "";
    const cell2 = row.insertCell();
    cell2.style.paddingRight = "30px";
    const cell3 = row.insertCell();
    cell3.innerText = powerLevel + " dB";
    // powerLevelTableBody.appendChild(row);
    if (dbSPLValue) {
      cell2.innerText = dbSPLValue + " dB SPL";
      // p.innerText += " , " + dbSPLValue + " " + "dB SPL";
      if (parseFloat(dbSPLValue) > microphoneIR.maxdBSPL) {
        maxdBSPL.innerText = dbSPLValue + " dB SPL";
        microphoneIR.maxdBSPL = dbSPLValue;
      }
    }

    recordedChunks = [];
    if (restartRecording) {
      mediaRecorder.start();
    }
  };

  mediaRecorder.start();
  const timeInput = document.getElementById("timeInput");
  const time = timeInput.value > 0 ? timeInput.value * 1000 : 1000;

  // every 5 seconds, check the power level and clear the recorded chunks and clear the interval if record button is pressed again
  const interval = setInterval(() => {
    if (!mediaRecorder) clearInterval(interval);
    if (mediaRecorder && mediaRecorder.state === "inactive") {
      clearInterval(interval);
    }
    // stop the recording, then compute the power level
    if (mediaRecorder && mediaRecorder.state === "recording") {
      restartRecording = true;
      mediaRecorder.stop();
    }
  }, time);
};

const getMaxValueOfAbsoluteValueOfRecordedChunks = (recordedChunks) => {};
const convertDBToDBSPL = (db, frequency) => {
  if (microphoneIR.Frequency.length === 0) return db;
  const gain = findGainatFrequency(
    microphoneIR.Frequency,
    microphoneIR.Gain,
    frequency,
  );
  return (parseFloat(db) - gain).toFixed(1);
};

const toggleRecording = async (id, recordButton, language) => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stopRecording(recordButton);
  } else {
    const powerLevelTable = document.getElementById("powerLevelTable");
    for (var i = 0; i < powerLevelTable.rows.length; i++) {
      var row = powerLevelTable.rows[i];

      // Loop through cells in the current row
      while (row.cells.length > 0) {
        // Remove the last cell in the row
        row.deleteCell(row.cells.length - 1);
      }
    }
    await startRecording(id, recordButton, language);
  }
};

const stopRecording = (recordButton) => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    restartRecording = false;
    mediaRecorder.stop();
    recordButton.innerHTML = "Record";
    mediaRecorder = null;
  }
};

const computePowerLevel = async (recordedChunks) => {
  if (recordedChunks.length === 0) {
    return -1000.0;
  }
  const audioBlob = new Blob(recordedChunks, {
    type: "audio/wav; codecs=opus",
  });
  const arraybuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await getAudioBufferFromArrayBuffer(arraybuffer);
  const audioData = audioBuffer.getChannelData(0);
  const sound = Array.from(audioData);
  const Ampl = getMaxValueOfAbsoluteValueOfBuffer(sound);
  const meanSquared =
    sound.reduce((sum, value) => sum + value ** 2, 0) / sound.length;
  const power_dB = 10 * Math.log10(meanSquared);
  const powerLevel = power_dB.toFixed(1);

  // save with a precision of 1 decimal place (e.g. 10.1 dB) show even if it is 0
  // const powerLevel = power_dB.toFixed(1);
  return { powerLevel, Ampl };
};

export const getListOfConnectedMicrophones = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const microphones = devices.filter((device) => device.kind === "audioinput");
  return microphones;
};

const addSoundFileCSS = () => {
  const styles = `
    .block {
        padding: 10px;
        padding-left:0; 
        padding-bottom: 0;
    }
    .soundFileContainer {
        display: flex;
        padding: 10px;
        padding-left:0;
        padding-bottom: 0;
        align-items: center;
    }
    .soundFileButton {
        margin-right: 10px;
        flex: 1;
        height: 40px;
        text-align: left;
        margin-top: 10px;
    }
    `;
  const soundTestFileStyleSheet = document.createElement("style");
  soundTestFileStyleSheet.innerText = styles;
  document.head.appendChild(soundTestFileStyleSheet);
};

export const cloneAudioBuffer = (audioBuffer) => {
  const newAudioBuffer = new AudioBuffer({
    length: audioBuffer.length,
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels: audioBuffer.numberOfChannels,
  });

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    newAudioBuffer.copyToChannel(audioBuffer.getChannelData(channel), channel);
  }

  return newAudioBuffer;
};

export const calculateDBFromRMS = (rms) => {
  const db = 20 * Math.log10(rms);
  // round to 1 decimal place
  return Math.round(db * 10) / 10;
};

export const getGainValue = (dbSPL) => {
  const gain = Math.pow(10, dbSPL / 20);
  return gain;
};

export const getRMSLimit = (dbSPL, buffer) => {
  const sMax = getMaxValueOfAbsoluteValueOfBuffer(buffer);
  const sRms = getRMSOfWaveForm(buffer);
  const rmsLimit = sRms / sMax;
  const rms = getGainValue(dbSPL);
  return Math.min(rmsLimit, rms);
};

// function to get the max value of the absolute value of the buffer
export const getMaxValueOfAbsoluteValueOfBuffer = (buffer) => {
  const absValue = buffer.map((value) => Math.abs(value));
  const sMax = getMax(absValue);
  return sMax;
};

export const getMax = (arr) => {
  let len = arr.length;
  let max = -Infinity;

  while (len--) {
    max = arr[len] > max ? arr[len] : max;
  }
  return max;
};

export const CompressorInverseDb = (outDb, T, R, W) => {
  let inDb = 0;
  let a = 0;
  let b = 0;
  let c = 0;
  let inDb2 = 0;

  if (outDb > T + W / 2 / R) {
    inDb = T + R * (outDb - T);
  } else if (outDb > T - W / 2) {
    a = 1;
    b = 2 * (W / (1 / R - 1) - (T - W / 2));
    c = (-outDb * 2 * W) / (1 / R - 1) + (T - W / 2) ** 2;
    inDb2 = -b / 2 - Math.sqrt(b ** 2 - 4 * c) / 2;
    inDb = inDb2;
  } else {
    inDb = outDb;
  }
  return inDb;
};

export const CompressorDb = (inDb, T, R, W) => {
  // Implement dynamic range compression of input level inDb with parameters
  // T, R, and W.
  // Compression equation taken from "Gain computer" in MATLAB documentation:
  // https://www.mathworks.com/help/audio/ref/compressor-system-object.html#d124e70828
  // Their equation is equation 4 in this published paper (which they cite):
  // Giannoulis, Dimitrios, Michael Massberg, and Joshua D. Reiss. "Digital
  // Dynamic Range Compressor Design –– A Tutorial and Analysis."
  // Journal of Audio Engineering Society, Vol. 60, Issue 6, 2012, pp. 399–408.
  // http://eecs.qmul.ac.uk/~josh/documents/2012/GiannoulisMassbergReiss-dynamicrangecompression-JAES2012.pdf

  // updated Jan 18th, 2024
  let outDb = 0;
  const Q = 1 / R;
  const WFinal = W >= 0 ? W : 0;
  if (inDb >= T + WFinal / 2) {
    outDb = T + Q * (inDb - T);
  } else if (inDb >= T - WFinal / 2) {
    outDb = inDb - ((1 - Q) * (inDb - (T - WFinal / 2)) ** 2) / (2 * WFinal);
  } else {
    outDb = inDb;
  }

  return outDb;
};

export const getCorrectedInDbAndSoundDBSPL = (
  soundDBSPL,
  soundGain,
  audioData,
  noCorrection = false,
) => {
  const targetMaxOverRms =
    getMaxValueOfAbsoluteValueOfBuffer(audioData) / getRMSOfWaveForm(audioData);
  const targetDB = noCorrection ? soundDBSPL : soundDBSPL - soundGain;
  const targetGain = getGainValue(targetDB);

  const inDB =
    targetMaxOverRms * targetGain > 1
      ? calculateDBFromRMS(1 / targetMaxOverRms)
      : targetDB;
  const correctedSoundDBSPL = noCorrection ? inDB : soundGain + inDB;

  return { inDB, correctedSoundDBSPL };
};

export const displayParameters1000Hz = (
  elems,
  soundLevels,
  soundCalibrationResults,
  PlotTitle = "Sound Level at 1000 Hz",
  calibrationGoal = "speakerAndMic",
  isLoudspeakerCalibration = true,
) => {
  elems.citation.style.visibility = "visible";
  elems.background.style.top = "70%";
  elems.soundParametersFromCalibration.style.whiteSpace = "pre";

  elems.soundLevelsTable.style.display = "block";
  elems.soundLevelsTable.innerHTML = "";
  elems.soundLevelsTable.setAttribute("id", "soundLevelsTable");

  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const tr = document.createElement("tr");

  // Column Headers
  const headers = [
    "in (dB)",
    `out - in ${isLoudspeakerCalibration ? "(dB)" : "(dB SPL)"}`,
    `out ${isLoudspeakerCalibration ? "(dB)" : "(dB SPL)"}`,
    "THD (%)",
    `out @all Hz ${isLoudspeakerCalibration ? "(dB)" : "(dB SPL)"}`,
  ];

  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.innerHTML = headerText;
    th.style.padding = "8px";
    th.style.fontFamily = "monospace"; // Ensures equal-width characters
    th.style.textAlign = "center";
    tr.appendChild(th);
  });

  thead.appendChild(tr);
  elems.soundLevelsTable.appendChild(thead);
  elems.soundLevelsTable.appendChild(tbody);

  // Add a fixed width for table cells to prevent misalignment
  elems.soundLevelsTable.style.width = "100%";
  elems.soundLevelsTable.style.tableLayout = "fixed";
  elems.soundLevelsTable.style.borderCollapse = "collapse";

  // Sort the sound levels in descending order
  const rows = soundLevels
    .map((level, i) => ({
      td1: parseFloat(level).toFixed(1),
      td2: (
        soundCalibrationResults.outDBSPL1000Values[i] - parseFloat(level)
      ).toFixed(1),
      td3: soundCalibrationResults.outDBSPL1000Values[i].toFixed(1),
      td4: (soundCalibrationResults.thdValues[i] * 100).toFixed(2),
      td5: soundCalibrationResults.outDBSPLValues[i].toFixed(1),
    }))
    .sort((a, b) => parseFloat(b.td1) - parseFloat(a.td1));

  console.log("rows", rows);

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    Object.values(row).forEach((value, index) => {
      const td = document.createElement("td");
      td.innerHTML = value;
      td.style.padding = "5px";
      td.style.fontFamily = "monospace"; // Ensures perfect alignment
      td.style.textAlign = "center"; // Align numbers properly
      td.style.whiteSpace = "nowrap"; // Prevent wrapping issues
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  // Title for the table
  const oldTitle = elems.soundLevelsTableContainer.querySelector("h6");
  if (oldTitle) {
    oldTitle.remove();
  }
  const title = document.createElement("h6");
  title.innerHTML = PlotTitle;
  title.style.textAlign = "center";
  title.style.userSelect = "text";
  elems.soundLevelsTableContainer.insertBefore(title, elems.soundLevelsTable);

  // Ensure container is visible and appropriately sized
  elems.soundLevelsTableContainer.style.visibility = "visible";
  elems.soundLevelsTableContainer.style.width = "700px";

  // Append plot for visualization
  const plotCanvas = document.createElement("canvas");
  plotCanvas.width = 500;
  plotCanvas.height = 500;

  elems.soundTestPlots.innerHTML = "";
  elems.soundTestPlots.appendChild(plotCanvas);

  plotSoundLevels1000Hz(
    plotCanvas,
    soundCalibrationResults.parameters,
    soundLevels,
    soundCalibrationResults.outDBSPL1000Values,
    PlotTitle,
    calibrationGoal,
    isLoudspeakerCalibration,
  );
};

export const SoundLevelModel = (inDb, backgroundDbSpl, gain_dB, T, W, R) => {
  // % We play a sine wave through a speaker and use an iPhone to measure the
  // % sound level. The level of the digital source is RMS expressed in dB.
  // % Because digital sound exceeding the range -1 to +1 may be clipped we do
  // % not allow a sinewave sound to exceed amplitude 1. A sine of amplitude 1
  // % has an RMS value of 1/sqrt(2) which correponds to -3.1 dB. We measure
  // % sound in units of dB SPL. So we play sines at several source levels (in
  // % dB) and record at several sound levels (in dB SPL). My model for what's
  // % happening combines an arbitrary gain (in dB SPL) and a dynamic range
  // % compression (which attenuates loud sounds to protect the small
  // % loudspeaker of the laptop), and added background sound in the room.
  // % Plotting my measurements makes me think this model will fit well.
  // % However, the model has five degrees of freedom and will require many
  // % measurements. It may be necessary to fit the model early, with some
  // % parameters locked, to estimate the most important parameters (background
  // % noise level and threshold T) to guide further measurements.

  // % REVISED November 29, 2022
  // % FORMERLY WE THOUGHT COMPRESSION OCCURRED IN THE LOUDSPEAKER SYSTEM. NOW
  // % WE BELIEVE IT OCCURS IN THE IPHONE MICROPHONE.THE COMPRESSION FORMULA IS
  // % UNCHANGED.
  // % Now the model for sound production is trivially simple:
  // % outDbSpl=inDb+gainDbSpl;

  // % This is the model we use to fit our iPhone readings.

  // % Our model of the computer sound system is the cascade of dynamic range
  // % compression, a gain from digital (dB) to physical (dB SPL) sound, and
  // % the addition of ambient background noise (physical powers add).

  // const totalDbSpl =
  //   10 *
  //   Math.log10(10 ** (backgroundDbSpl / 10) + 10 ** ((gainDbSpl + inDb) / 10));

  // updated Jan 18th, 2024

  const compressorDb = CompressorDb(inDb, T, R, W);
  const outDb = compressorDb + gain_dB;
  return outDb;
};

const downloadCalibrationData = (downloadButton, parameters) => {
  downloadButton.innerHTML = "Download";
  downloadButton.style.marginTop = "10px";
  downloadButton.style.marginBottom = "10px";
  downloadButton.addEventListener("click", () => {
    // transpose the soundLevelsTable
    const table = document.getElementById("soundLevelsTable");
    const tableRows = table.rows;
    const tableColumns = tableRows[0].cells.length;
    const tableRowsLength = tableRows.length;
    const tableData = [];
    for (let i = 0; i < tableColumns; i++) {
      tableData[i] = [];
      for (let j = 0; j < tableRowsLength; j++) {
        tableData[i][j] = tableRows[j].cells[i].innerHTML;
      }
    }

    //rename items in the first column
    tableData[0][0] = "1000 Hz in(dB)";
    tableData[1][0] = "1000 Hz out(dB SPL)";
    tableData[4][0] = "All Hz out(dB SPL)";

    // add the parameters to the tableData
    tableData.push(["\nSound gain parameters"]);
    tableData.push(["backgroundDbSpl", parameters.backgroundDBSPL.toFixed(1)]);
    tableData.push(["gainDbSpl", parameters.gainDBSPL.toFixed(1)]);
    tableData.push(["T", parameters.T.toFixed(1)]);
    tableData.push(["W", parameters.W.toFixed(1)]);
    tableData.push(["R", parameters.R.toFixed(1)]);

    // convert the tableData to a csv string
    const csvString = tableData
      .map((e) => e.join(","))
      .join(String.fromCharCode(13) + String.fromCharCode(10));
    // download the csv string as a file
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURI(csvString);
    a.target = "_blank";
    a.download = "soundLevelsTable.csv";
    document.body.appendChild(a);
    a.click();
  });
};

export const displayParametersAllHz = (
  elems,
  calibrationResults,
  title = "Power spectral density of sound recording of white noise (MLS) source played through the loudspeakers",
  calibrationGoal = "speakerAndMic",
  isLoudspeakerCalibration = true,
  backgroundNoise = [],
  mls_psd = {},
  microphoneGain = { Freq: [], Gain: [] },
  filteredMLSRange = { Min: 0, Max: 0 },
  parameters,
) => {
  const plotCanvas = document.createElement("canvas");
  plotCanvas.setAttribute("id", "plotCanvas");
  // plotCanvas.width = 500;
  // plotCanvas.height = 500;
  plotCanvas.style.marginTop = "20px";
  elems.soundTestPlots.appendChild(plotCanvas);
  elems.citation.style.visibility = "visible";

  plotForAllHz(
    plotCanvas,
    calibrationResults,
    title,
    calibrationGoal,
    isLoudspeakerCalibration,
    backgroundNoise,
    mls_psd,
    microphoneGain,
    filteredMLSRange,
    parameters,
  );
};

export const displayWhatIsSavedInDatabase = async (
  elems,
  ir,
  isLoudspeakerCalibration = true,
  title = "Impulse response saved in the database",
  filteredMLSRange,
  RMSError,
) => {
  const plotCanvas = document.createElement("canvas");
  plotCanvas.setAttribute("id", "plotCanvas");
  plotCanvas.width = 500;
  plotCanvas.height = 500;
  plotCanvas.style.marginTop = "20px";
  elems.soundTestPlots.appendChild(plotCanvas);
  elems.citation.style.visibility = "visible";

  await plotImpulseResponse(
    plotCanvas,
    ir,
    title,
    filteredMLSRange,
    isLoudspeakerCalibration,
    RMSError,
  );
};

export const displayRecordings = (
  elems,
  recChecks,
  isLoudspeakerCalibration,
  filteredMLSRange,
  soundCheck,
) => {
  const plotCanvas = document.createElement("canvas");
  plotCanvas.setAttribute("id", "plotCanvas");
  plotCanvas.style.marginTop = "20px";
  elems.soundTestPlots.appendChild(plotCanvas);
  const warningsDiv = document.createElement("div");
  const warnings = document.createElement("p");
  warningsDiv.appendChild(warnings);
  warnings.innerHTML =
    recChecks["warnings"]
      .filter((warning) => warning.includes("all Hz"))
      .join("<br>") || "";

  elems.citation.style.visibility = "visible";
  plotRecordings(
    plotCanvas,
    recChecks,
    isLoudspeakerCalibration,
    filteredMLSRange,
    soundCheck,
    warningsDiv,
  );
  elems.soundTestPlots.appendChild(warningsDiv);
};

export const displayVolumeRecordings = (
  elems,
  recChecks,
  isLoudspeakerCalibration,
  filteredMLSRange,
) => {
  const plotCanvas = document.createElement("canvas");
  plotCanvas.setAttribute("id", "plotCanvas");
  plotCanvas.style.marginTop = "20px";
  elems.soundTestPlots.appendChild(plotCanvas);
  elems.citation.style.visibility = "visible";
  const warningsDiv = document.createElement("div");
  const warnings = document.createElement("p");
  warnings.innerHTML =
    recChecks["warnings"]
      .filter((warning) => warning.includes("1000 Hz"))
      .join("<br>") || "";
  warningsDiv.appendChild(warnings);
  plotVolumeRecordings(
    plotCanvas,
    recChecks,
    isLoudspeakerCalibration,
    filteredMLSRange,
    warningsDiv,
  );
  elems.soundTestPlots.appendChild(warningsDiv);
};

// The table has 3 colums.
// Row 1 Column 1 is empty
// Column 1 has: target, Device Kind, OS, Make(OEM), hardware Family, Model name, Model specifier, Calibration Date
// Column 2 is for Loudspeaker
// Column 3 is for Microphone
export const displayCompleteTransducerTable = (
  LoudspeakerInfo,
  microphoneInfo,
  elems,
  isLoudspeakerCalibration,
  calibrationGoal,
) => {
  const table = document.createElement("table");
  table.setAttribute("id", "completeTransducerTable");

  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const tr = document.createElement("tr");
  const th1 = document.createElement("th");
  const th2 = document.createElement("th");
  const th3 = document.createElement("th");
  th1.innerHTML = " ";
  th2.innerHTML = "Loudspeaker";
  th3.innerHTML = "Microphone";
  th1.style.userSelect = "text";
  th2.style.userSelect = "text";
  th3.style.userSelect = "text";
  tr.appendChild(th1);
  tr.appendChild(th2);
  tr.appendChild(th3);
  thead.appendChild(tr);

  const columns = [
    "target",
    "DeviceType",
    "PlatformName",
    "OEM",
    "HardwareFamily",
    "ModelName",
    "ID",
    "CalibrationDate",
  ];
  const columnNames = [
    "Target",
    "Device Kind",
    "OS",
    "Make(OEM)",
    "Hardware Family",
    "Model name",
    "Model specifier",
    "Calibration Date",
  ];

  // from loudspeakr info and microphone info replace "Unknown", "undefined", "N/A" with ""
  Object.keys(LoudspeakerInfo).forEach((key) => {
    if (
      LoudspeakerInfo[key] === "Unknown" ||
      LoudspeakerInfo[key] === "undefined" ||
      LoudspeakerInfo[key] === "N/A"
    )
      LoudspeakerInfo[key] = "";
  });

  Object.keys(microphoneInfo).forEach((key) => {
    if (
      microphoneInfo[key] === "Unknown" ||
      microphoneInfo[key] === "undefined" ||
      microphoneInfo[key] === "N/A"
    )
      microphoneInfo[key] = "";
  });

  columns.forEach((column, idx) => {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    const td2 = document.createElement("td");
    const td3 = document.createElement("td");
    td1.innerHTML = columnNames[idx];
    td1.style.fontWeight = "bold";
    td1.style.userSelect = "text";
    td2.style.userSelect = "text";
    td3.style.userSelect = "text";
    // if (column === "target" && isLoudSpeakerCalibration) td1.innerHTML = a check mark (U+2713) and td2.innerHTML = ""
    // if (column === "target" && !isLoudSpeakerCalibration) td2.innerHTML = a check mark (U+2713) and td1.innerHTML = ""
    if (column === "target") {
      if (calibrationGoal === "speakerAndMic") {
        td2.innerHTML = "✓";
        td3.innerHTML = "✓";
      } else if (
        calibrationGoal == "speakerOrMic" &&
        isLoudspeakerCalibration
      ) {
        td2.innerHTML = "✓";
        td3.innerHTML = " ";
      } else if (
        calibrationGoal == "speakerOrMic" &&
        !isLoudspeakerCalibration
      ) {
        td2.innerHTML = " ";
        td3.innerHTML = "✓";
      }
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
    } else if (column === "CalibrationDate") {
      const calibrationDate = isLoudspeakerCalibration
        ? LoudspeakerInfo[column]
        : microphoneInfo[column];
      td2.innerHTML = `${thisExperimentInfo.experiment},${calibrationDate.slice(
        0,
        -3,
      )}`;
      tr.appendChild(td1);
      tr.appendChild(td2);
      td2.setAttribute("colspan", "2");
      td2.style.whiteSpace = "nowrap";
    } else if (column === "ModelName") {
      td2.innerHTML = LoudspeakerInfo["fullLoudspeakerModelName"];
      td3.innerHTML = microphoneInfo["micFullName"];
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
    } else if (column === "ID") {
      td2.innerHTML = LoudspeakerInfo["fullLoudspeakerModelNumber"];
      td3.innerHTML = microphoneInfo["micFullSerialNumber"];
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
    } else if (column === "OEM") {
      td2.innerHTML = LoudspeakerInfo["OEM"];
      td3.innerHTML = microphoneInfo["micrFullManufacturerName"]
        ? microphoneInfo["micrFullManufacturerName"]
        : microphoneInfo["OEM"];
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
    } else {
      td2.innerHTML = LoudspeakerInfo[column] ? LoudspeakerInfo[column] : "";
      td3.innerHTML = microphoneInfo[column] ? microphoneInfo[column] : "";
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
    }

    tbody.appendChild(tr);
  });

  // add space between the columns
  // th1.style.paddingRight = "20px";
  // th2.style.paddingRight = "20px";
  // th3.style.paddingRight = "20px";

  table.appendChild(thead);
  table.appendChild(tbody);

  elems.completeTransducerTable.style.marginBottom = "20px";
  elems.completeTransducerTable.style.userSelect = "text";
  //console.log("displayCompleteTransducerTable: deviceType.isLoudspeaker", deviceType.isLoudspeaker);
  //console.log("displayCompleteTransducerTable: microphoneCalibrationResult.current.timeStamps ", microphoneCalibrationResult.current.timeStamps);
  // p2.innerHTML = deviceType.isLoudspeaker
  //   ? allHzCalibrationResults.timestamps.replace(/\n/g, "<br />")
  //   : microphoneCalibrationResult.current.timeStamps.replace(/\n/g, "<br />");
  const p3 = document.createElement("p");
  p3.innerHTML = `autoGainControl: ${flags.current.autoGainControl}, echoCancellation: ${flags.current.echoCancellation}, noiseSuppression: ${flags.current.noiseSuppression}`;
  p3.style.userSelect = "text";
  elems.completeTransducerTable.appendChild(p3);
  //elems.completeTransducerTable.appendChild(table);
};

export const display1000HzParametersTable = (parameters) => {
  const parametersToDisplay = {
    T: parameters.T.toFixed(1) + " dB",
    W: parameters.W.toFixed(1) + " dB",
    "Q = 1/R": (1 / Number(parameters.R.toFixed(1))).toFixed(3),
    gain: parameters.gainDBSPL.toFixed(1) + " dB",
    // backgroundDBSPL: parameters.backgroundDBSPL.toFixed(1) + " dB",
    RMSError: parameters.RMSError.toFixed(1) + " dB",
  };
  const table = document.createElement("table");
  table.style.fontSize = "15px";
  table.setAttribute("id", "parametersTable");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  //  title of the table: Dynamic Range Compression Model
  // then 2 columns: parameter and value (no need to display the titles of the columns)

  // add the title of the table
  const trTitle = document.createElement("tr");
  const thTitle = document.createElement("th");
  thTitle.innerHTML = "Dynamic Range Compression Model";
  thTitle.style.userSelect = "text";
  trTitle.style.userSelect = "text";
  thTitle.setAttribute("colspan", "2");
  trTitle.appendChild(thTitle);
  thead.appendChild(trTitle);

  // add the parameters and values
  Object.keys(parametersToDisplay).forEach((key) => {
    const tr = document.createElement("tr");
    tr.style.lineHeight = "1.2";
    tr.style.userSelect = "text";
    const td1 = document.createElement("td");
    const td2 = document.createElement("td");
    td1.innerHTML = key;
    td1.style.userSelect = "text";
    td1.style.fontStyle = "italic";
    td2.innerHTML = parametersToDisplay[key];
    td2.style.userSelect = "text";
    tr.appendChild(td1);
    tr.appendChild(td2);
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
};

export const displaySummarizedTransducerTable = (
  simulationEnabled = false,
  LoudspeakerInfo,
  microphoneInfo,
  elems = "",
  isLoudspeakerCalibration,
  calibrationGoal,
  position = "left",
  samplingHz = [],
  isProfilePlot = false,
  valueAt1000Hz = 0,
  RMSError = 0,
) => {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  table.style.fontSize = "15px";
  // row 1 includes "Loudspeaker" and "Microphone"
  const tr1 = document.createElement("tr");
  const th1 = document.createElement("th");
  const th2 = document.createElement("th");
  th1.innerHTML = "Loudspeaker";
  th2.innerHTML = "Microphone";

  if (calibrationGoal === "speakerAndMic") {
    th1.style.fontWeight = "bold";
    th2.style.fontWeight = "bold";
  } else if (calibrationGoal == "speakerOrMic" && isLoudspeakerCalibration) {
    th1.style.fontWeight = "bold";
    th2.style.fontWeight = "normal";
  } else if (calibrationGoal == "speakerOrMic") {
    th2.style.fontWeight = "bold";
    th1.style.fontWeight = "normal";
  }
  tr1.appendChild(th1);
  tr1.appendChild(th2);
  thead.appendChild(tr1);

  // row 2 is the Model Names
  const tr2 = document.createElement("tr");
  const td1 = document.createElement("td");
  const td2 = document.createElement("td");
  td1.innerHTML = simulationEnabled
    ? calibrateSoundSimulateLoudspeaker.fileName
    : LoudspeakerInfo["fullLoudspeakerModelName"];
  td2.innerHTML = simulationEnabled
    ? calibrateSoundSimulateMicrophone.fileName
    : microphoneInfo["micFullName"];
  tr2.appendChild(td1);
  tr2.appendChild(td2);

  // row 3 is the Model Specifiers
  const tr3 = document.createElement("tr");
  const td3 = document.createElement("td");
  const td4 = document.createElement("td");
  td3.innerHTML = simulationEnabled
    ? ""
    : LoudspeakerInfo["fullLoudspeakerModelNumber"];
  td4.innerHTML = simulationEnabled
    ? ""
    : microphoneInfo["micFullSerialNumber"];
  tr3.appendChild(td3);
  tr3.appendChild(td4);

  // row 4 column 1 is the calibration date, column 2 is empty
  const tr4 = document.createElement("tr");
  const td5 = document.createElement("td");
  const calibrationDate = isLoudspeakerCalibration
    ? LoudspeakerInfo["CalibrationDate"]
    : microphoneInfo["CalibrationDate"];
  // Ensure it's all on one line with proper comma spacing
  td5.innerHTML = `${thisExperimentInfo.experiment},${calibrationDate.slice(
    0,
    -3,
  )}`;
  td5.setAttribute("colspan", "2");
  td5.style.whiteSpace = "nowrap";
  tr4.appendChild(td5);

  // row 5 is OEM
  const tr5 = document.createElement("tr");
  const td6 = document.createElement("td");
  const td7 = document.createElement("td");
  td6.innerHTML = simulationEnabled ? "simulated" : LoudspeakerInfo["OEM"];
  td7.innerHTML = simulationEnabled
    ? "simulated"
    : microphoneInfo["micrFullManufacturerName"];
  tr5.appendChild(td6);
  tr5.appendChild(td7);

  // row 6 is the gain
  const tr6 = document.createElement("tr");
  const td8 = document.createElement("td");
  const td9 = document.createElement("td");

  LoudspeakerInfo["gainDBSPL"] = (
    Math.round(LoudspeakerInfo["gainDBSPL"] * 10) / 10
  ).toFixed(1);
  microphoneInfo["gainDBSPL"] = (
    Math.round(microphoneInfo["gainDBSPL"] * 10) / 10
  ).toFixed(1);
  td8.innerHTML =
    LoudspeakerInfo["gainDBSPL"] > 0
      ? "+" + LoudspeakerInfo["gainDBSPL"]
      : LoudspeakerInfo["gainDBSPL"];
  td9.innerHTML =
    microphoneInfo["gainDBSPL"] > 0
      ? "+" + microphoneInfo["gainDBSPL"]
      : microphoneInfo["gainDBSPL"];
  if (isProfilePlot && isLoudspeakerCalibration) {
    valueAt1000Hz =
      valueAt1000Hz > 0
        ? "+" + valueAt1000Hz.toFixed(1)
        : valueAt1000Hz.toFixed(1);
    td8.innerHTML += ` RMSE ${RMSError.toFixed(1)}`;
    td8.innerHTML += ` (${valueAt1000Hz})`;
  } else if (isProfilePlot && !isLoudspeakerCalibration) {
    valueAt1000Hz =
      valueAt1000Hz > 0
        ? "+" + valueAt1000Hz.toFixed(1)
        : valueAt1000Hz.toFixed(1);
    td9.innerHTML += ` RMSE ${RMSError.toFixed(1)}`;
    td9.innerHTML += ` (${valueAt1000Hz})`;
  }
  td9.innerHTML += " dB gain at 1 kHz";
  td9.style.width = "200px";
  tr6.appendChild(td8);
  tr6.appendChild(td9);

  if (
    webAudioDeviceNames.loudspeaker !== "" ||
    webAudioDeviceNames.microphone !== ""
  ) {
    const tr8 = document.createElement("tr");
    const td12 = document.createElement("td");
    const td13 = document.createElement("td");
    td12.innerHTML = '"' + webAudioDeviceNames.loudspeaker + '"';
    td13.innerHTML = '"' + webAudioDeviceNames.microphone + '"';
    td12.style.width = "180px";
    td13.style.width = "180px";
    tr8.appendChild(td12);
    tr8.appendChild(td13);
    tr8.style.lineHeight = "1";
    tbody.appendChild(tr8);
  }

  tbody.appendChild(tr6);
  if (samplingHz.length > 0) {
    const tr7 = document.createElement("tr");
    const td10 = document.createElement("td");
    const td11 = document.createElement("td");
    td10.innerHTML = actualSamplingRate.current + " Hz";
    td11.innerHTML =
      microphoneActualSamplingRate.current +
      " Hz" +
      // `, ${actualBitsPerSample.current} bits`;
      ` (want ${actualBitsPerSample.current} bits)`;
    tr7.appendChild(td10);
    tr7.appendChild(td11);
    tr7.style.lineHeight = "1";
    tbody.appendChild(tr7);
  }

  tbody.appendChild(tr5);
  tbody.appendChild(tr2);
  tbody.appendChild(tr3);

  if (
    loudspeakerBrowserDetails.current.browser ||
    microphoneBrowserDetails.current.browser
  ) {
    //show Browser and Browser Version for both loudspeaker and microphone.
    //column 1: Browser {space} Browser Version for loudspeaker : Chrome 123
    //column 2: Browser {space} Browser Version for microphone : Chrome 123
    const tr9 = document.createElement("tr");
    const td14 = document.createElement("td");
    const td15 = document.createElement("td");
    td14.innerHTML = loudspeakerBrowserDetails.current.browser
      ? loudspeakerBrowserDetails.current.browser +
        " " +
        loudspeakerBrowserDetails.current.browserVersion
      : "";
    td15.innerHTML = microphoneBrowserDetails.current.browser
      ? microphoneBrowserDetails.current.browser +
        " " +
        microphoneBrowserDetails.current.browserVersion
      : "";
    tr9.appendChild(td14);
    tr9.appendChild(td15);
    tbody.appendChild(tr9);

    tr9.style.lineHeight = "1";
  }
  tbody.appendChild(tr4);

  tr1.style.lineHeight = "1";
  tr2.style.lineHeight = "1";
  tr3.style.lineHeight = "1";
  tr4.style.lineHeight = "1";
  tr5.style.lineHeight = "1";
  tr6.style.lineHeight = "1";

  // max width of the table: 300px. wrap the texts
  table.style.maxWidth = "360px";
  table.style.tableLayout = "fixed";
  table.appendChild(thead);
  table.appendChild(tbody);

  return table;
};

export const displayTimestamps = (elems) => {
  const p = document.createElement("p");
  p.innerHTML = "Timestamps:";
  p.style.userSelect = "text";

  const formatPaddedTimestamps = (timestamps) => {
    const lines = timestamps.split("\n");

    // figure max widths for elapsed & step fields
    let maxElapsed = 0,
      maxStep = 0;
    lines.forEach((line) => {
      const m = line.match(/^([\d.]+) s\. ∆ ([\d.]+) s\./);
      if (m) {
        maxElapsed = Math.max(maxElapsed, m[1].length);
        maxStep = Math.max(maxStep, m[2].length);
      }
    });

    // rebuild each line, padding only those with the “∆” pattern
    return lines
      .map((line) => {
        const m = line.match(/^([\d.]+) s\. ∆ ([\d.]+) s\.\s*(.*)$/);
        if (m) {
          // pad elapsed & step, preserve the trailing label (e.g. “Plot results”)
          const [, rawEl, rawSt, label] = m;
          const elapsed = rawEl.padStart(maxElapsed, " ");
          const step = rawSt.padStart(maxStep, " ");
          return `${elapsed} s. ∆ ${step} s.  ${label}`;
        } else {
          return line;
        }
      })
      .join("\n");
  };

  const p2 = document.createElement("pre");
  p2.style.userSelect = "text";
  p2.style.fontFamily = "monospace";
  p2.style.whiteSpace = "pre-wrap";

  const rawTimestamps = deviceType.isLoudspeaker
    ? allHzCalibrationResults?.timestamps || ""
    : microphoneCalibrationResult.current?.timeStamps || "";

  const parameter = document.createElement("pre");
  parameter.style.userSelect = "text";
  parameter.style.fontFamily = "monospace";
  parameter.style.whiteSpace = "pre-wrap";

  let t1000HzSec;
  const soundLevels = calibrateSound1000HzDB.current.split(",");
  if (calibrateSound1000HzBool.current) {
    t1000HzSec =
      soundLevels.length *
      (calibrateSound1000HzPreSec.current +
        calibrateSound1000HzSec.current +
        calibrateSound1000HzPostSec.current);
  } else {
    t1000HzSec = 0;
  }
  // Determine number of burst conditions
  let N = 1;
  switch (calibrateSoundCheck.current) {
    case "both":
      N = 3;
      break;
    case "speakerOrMic":
    case "speakerAndMic":
      N = 2;
      break;
    case "none":
      N = 1;
      break;
  }
  const tBurstPerVersionSec =
    _calibrateSoundBurstPreSec.current +
    calibrateSoundBurstSec.current * calibrateSoundBurstRepeats.current +
    _calibrateSoundBurstPostSec.current;
  const tBurstSec =
    calibrateSoundBurstMLSVersions.current * tBurstPerVersionSec;
  const tBkSec = calibrateSoundBackgroundSecs.current;
  const tSec = t1000HzSec + N * tBurstSec + tBkSec;
  const fs2 = soundCalibrationResults.current.fs2;
  const fs2_2dp = fs2.toFixed(4);
  const text = `// Autocorrelation Results
Estimated Sampling Frequency: ${fs2_2dp} Hz
Nominal Sampling Frequency: ${soundCalibrationResults.current.fMLS} Hz
Last Autocorrelation Peak: ${soundCalibrationResults.current.L_new_n} samples

// Parameters
calibrateSound1000HzBool = ${calibrateSound1000HzBool.current}
calibrateSound1000HzDB = ${calibrateSound1000HzDB.current}
calibrateSound1000HzPreSec = ${calibrateSound1000HzPreSec.current}
calibrateSound1000HzSec = ${calibrateSound1000HzSec.current}
calibrateSound1000HzPostSec =  ${calibrateSound1000HzPostSec.current}
_calibrateSoundCheck = ${calibrateSoundCheck.current}
_calibrateSoundBurstPreSec = ${_calibrateSoundBurstPreSec.current}
_calibrateSoundBurstPostSec = ${_calibrateSoundBurstPostSec.current}
_calibrateSoundBurstSec = ${calibrateSoundBurstSec.current}
_calibrateSoundBurstRepeats = ${calibrateSoundBurstRepeats.current}
_calibrateSoundBurstMLSVersions = ${calibrateSoundBurstMLSVersions.current}
_calibrateSoundBackgroundSecs = ${calibrateSoundBackgroundSecs.current}
_calibrateSoundSamplingDesiredHz = ${calibrateSoundHz.current}
_calibrateSoundBurstDownsample = ${calibrateSoundBurstDownsample.current}
_calibrateSoundIRSec = ${calibrateSoundIRSec.current}
_calibrateSoundIIRSec = ${calibrateSoundIIRSec.current}
_calibrateSoundIIRPhase = ${calibrateSoundIIRPhase.current}
_calibrateSoundSmoothMinBandwidthHz = ${calibrateSoundSmoothMinBandwidthHz.current}
_calibrateSoundSmoothOctaves = ${calibrateSoundSmoothOctaves.current}
_calibrateSoundSimulateLoudspeaker = ${calibrateSoundSimulateLoudspeaker.fileName}
_calibrateSoundSimulateMicrophone = ${calibrateSoundSimulateMicrophone.fileName}
    
// Record 1000 Hz
if (calibrateSound1000HzBool){
t1000HzSec = length(calibrateSound1000HzDB)*(calibrateSound1000HzPreSec+
calibrateSound1000HzSec+calibrateSound1000HzPostSec);
} else {
t1000HzSec=0;
}
    
// Record MLS burst(s)
switch (_calibrateSoundCheck) {
case "both":
N = 3
break;
case "speakerOrMic:
case "speakerAndMic":
N = 2
break;
case "none":
N = 1
break;
}
tBurstPerVersionSec = _calibrateSoundBurstPreSec +
_calibrateSoundBurstSec * _calibrateSoundBurstRepeats +
_calibrateSoundBurstPostSec;
tBurstSec = _calibrateSoundBurstMLSVersions * tPerVersion;
    
// Record background
tBkSec = _calibrateSoundBackgroundSecs
    
// Total recording time
tSec = t1000HzSec + N*tBurstSec + tBkSec
    
// Solution
t1000HzSec = ${t1000HzSec}
N = ${N}
tBurstPerVersionSec = ${tBurstPerVersionSec}
tBurstSec = ${tBurstSec}
tBkSec = ${tBkSec}
tSec = ${tSec}`;

  parameter.textContent = text;
  p2.textContent = formatPaddedTimestamps(rawTimestamps);
  elems.timeStamps.appendChild(parameter);
  elems.timeStamps.appendChild(p);
  elems.timeStamps.appendChild(p2);
};
