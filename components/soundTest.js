import JSZip from "jszip";
import {
  invertedImpulseResponse,
  soundGainDBSPL,
  soundCalibrationLevelDBSPL,
  soundCalibrationResults,
  soundGainTWR,
  calibrateSoundCheck,
  calibrateSoundBurstRepeats,
  calibrateSoundBurstsWarmup,
  calibrateSoundBurstSec,
  calibrateSoundHz,
  calibrateSoundMaxHz,
  calibrateSoundMinHz,
  calibrateSoundIIRSec,
  calibrateSoundBurstDb,
  calibrateSoundSamplingDesiredBits,
  actualBitsPerSample,
  actualSamplingRate,
  microphoneActualSamplingRate,
  allHzCalibrationResults,
  webAudioDeviceNames,
} from "./global";
import {
  plotForAllHz,
  plotImpulseResponse,
  plotSoundLevels1000Hz,
  plotRecordings,
  plotWarmups,
  standardDeviation,
} from "./soundTestPlots";
import {
  adjustSoundDbSPL,
  connectAudioNodes,
  createAudioNodeFromBuffer,
  createImpulseResponseFilterNode,
  getAudioBufferFromArrayBuffer,
  getGainNode,
  getRMSOfWaveForm,
  playAudioBuffer,
  playAudioBufferWithImpulseResponseCalibration,
  playAudioNodeGraph,
  setWaveFormToZeroDbSPL,
} from "./soundUtils";

const soundGain = { current: undefined };
const soundDBSPL = { current: undefined };
export const addSoundTestElements = (reader) => {
  // const calibrationLevelFromFile = reader.read(
  //   "soundCalibrationLevelDBSPL",
  //   "__ALL_BLOCKS__"
  // );
  // if (
  //   calibrationLevelFromFile.length > 0 &&
  //   soundCalibrationLevelDBSPL.current === undefined
  // ) {
  //   soundCalibrationLevelDBSPL.current = calibrationLevelFromFile[0];
  // }

  if (soundCalibrationLevelDBSPL.current) {
    soundDBSPL.current = soundCalibrationLevelDBSPL.current;
  }
  const soundGainFromFile = reader.read("soundGainDBSPL", "__ALL_BLOCKS__");
  if (soundCalibrationResults.current) {
    soundGain.current = soundCalibrationResults.current.parameters.gainDBSPL;
  } else if (soundGainFromFile.length > 0) {
    soundGain.current = soundGainFromFile[0];
  }

  const modal = document.createElement("div");
  const modalDialog = document.createElement("div");
  const modalContent = document.createElement("div");
  const modalHeaderContainer = document.createElement("div");
  const modalHeader = document.createElement("div");
  const modalTitle = document.createElement("h2");

  const modalSubtitle = document.createElement("p");
  const togglesContainer = document.createElement("div");
  const toggleElements = addToggleSwitch();
  const modalToggle = toggleElements.toggleSwitch;
  const IRCorrectionToggleLabel = document.createElement("label");
  const IRCorrectionToggleContainer = document.createElement("div");
  const useGainNodeToggleContainer = document.createElement("div");
  const useGainNodeToggleElements = addToggleSwitch();
  const useGainNodeToggle = useGainNodeToggleElements.toggleSwitch;
  const useGainNodeInput = useGainNodeToggleElements.toggleSwitchInput;
  const useGainNodeLabel = document.createElement("label");

  const modalBody = document.createElement("div");
  const modalFooter = document.createElement("div");
  const horizontal = document.createElement("hr");
  const soundLevelContainer = document.createElement("div");
  const soundLevel = document.createElement("p");
  const soundLevelInput = document.createElement("input");
  const speakerSoundGainContainer = document.createElement("div");
  const speakerSoundGain = document.createElement("p");
  const speakerSoundGainInput = document.createElement("input");

  const nameOfPlayedSound = document.createElement("p");
  // const adjustedSoundLevelContainer = document.createElement("div");
  // const adjustedSoundLevel = document.createElement("p");
  // const adjustedSoundLevelInput = document.createElement("input");
  // const rmsOfSoundContainer = document.createElement("div");
  const rmsOfSound = document.createElement("p");
  const maxAmplitude = document.createElement("p");
  const elems = {
    modal,
    modalDialog,
    modalContent,
    modalHeader,
    modalTitle,
    modalToggle,
    modalBody,
    modalFooter,
    soundLevelContainer,
    soundLevel,
    soundLevelInput,
    speakerSoundGainContainer,
    speakerSoundGain,
    speakerSoundGainInput,
    // rmsOfSoundContainer,
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
  modalToggle.setAttribute("id", "soundTestModalToggle");
  modalBody.setAttribute("id", "soundTestModalBody");
  modalFooter.setAttribute("id", "soundTestModalFooter");
  soundLevelContainer.setAttribute("id", "soundTestModalSoundLevelContainer");
  soundLevel.setAttribute("id", "soundTestModalSoundLevel");
  soundLevelInput.setAttribute("id", "soundTestModalSoundLevelInput");
  soundLevelInput.setAttribute("type", "number");
  speakerSoundGainContainer.setAttribute(
    "id",
    "soundTestModalSpeakerSoundGainContainer"
  );
  speakerSoundGain.setAttribute("id", "soundTestModalSpeakerSoundGain");
  speakerSoundGainInput.setAttribute(
    "id",
    "soundTestModalSpeakerSoundGainInput"
  );
  speakerSoundGainInput.setAttribute("type", "number");

  // adjustedSoundLevelContainer.setAttribute( "id", "soundTestModalAdjustedSoundLevelContainer");
  // adjustedSoundLevel.setAttribute("id", "soundTestModalAdjustedSoundLevel");
  // adjustedSoundLevelInput.setAttribute("id", "soundTestModalAdjustedSoundLevelInput");
  // adjustedSoundLevelInput.setAttribute("type", "number");
  // rmsOfSoundContainer.setAttribute("id", "soundTestModalRMSOfSoundContainer");

  nameOfPlayedSound.setAttribute("id", "soundTestModalNameOfPlayedSound");
  rmsOfSound.setAttribute("id", "soundTestModalRMSOfSound");
  maxAmplitude.setAttribute("id", "soundTestModalMaxAmplitude");
  useGainNodeLabel.setAttribute("id", "soundTestModalUseGainNodeLabel");
  // useGainNodeLabel.setAttribute("for", "soundTestModalUseGainNodeToggle");
  useGainNodeLabel.innerText = "Use Gain Node";
  useGainNodeToggle.setAttribute("id", "soundTestModalUseGainNodeToggle");
  useGainNodeToggle.style.marginLeft = "10px";
  useGainNodeInput.setAttribute("id", "soundTestModalUseGainNodeToggleInput");

  togglesContainer.setAttribute("id", "soundTestModalTogglesContainer");
  togglesContainer.style.display = "flex";
  togglesContainer.style.flexDirection = "column";
  IRCorrectionToggleLabel.setAttribute("id", "soundTestModalIRCorrectionLabel");
  IRCorrectionToggleLabel.innerText = "IR Correction";
  modalToggle.style.marginLeft = "10px";
  IRCorrectionToggleContainer.style.display = "flex";
  // space between toggle and label
  IRCorrectionToggleContainer.style.marginBottom = "10px";
  IRCorrectionToggleContainer.style.justifyContent = "space-between";
  useGainNodeToggleContainer.style.display = "flex";
  useGainNodeToggleContainer.style.justifyContent = "space-between";
  useGainNodeToggleContainer.style.marginBottom = "10px";

  modal.classList.add(...["modal", "fade"]);
  modalDialog.classList.add(...["modal-dialog"]);
  modalContent.classList.add(...["modal-content"]);
  // modalHeader.classList.add(...["modal-header"]);
  modalTitle.classList.add(...["modal-title"]);
  modalBody.classList.add(...["modal-body"]);
  modalFooter.classList.add(...["modal-footer"]);

  modalTitle.innerHTML = "Sound Test";
  modalSubtitle.innerHTML =
    "Use the toggle for IR correction. It may take some time to load the sound files.";
  soundLevel.innerHTML = "Desired sound level (dB SPL):";
  if (soundDBSPL.current) soundLevelInput.value = soundDBSPL.current.toFixed(1);
  speakerSoundGain.innerHTML = "Sound gain at 1000Hz (dB SPL):";
  if (soundGain.current)
    speakerSoundGainInput.value = (
      Math.round(soundGain.current * 10) / 10
    ).toFixed(1);
  rmsOfSound.innerHTML = "Digital sound RMS dB: **** dB";
  maxAmplitude.innerHTML = "Digital sound max: ****";
  nameOfPlayedSound.innerHTML = "Playing sound: ****";
  // adjustedSoundLevel.innerHTML = "Adjusted soundCalibrationLevel: **** dB SPL"

  modal.appendChild(modalDialog);
  modalDialog.appendChild(modalContent);
  modalHeaderContainer.appendChild(modalHeader);
  modalHeaderContainer.appendChild(modalSubtitle);

  speakerSoundGainContainer.appendChild(speakerSoundGain);
  speakerSoundGainContainer.appendChild(speakerSoundGainInput);
  soundLevelContainer.appendChild(soundLevel);
  soundLevelContainer.appendChild(soundLevelInput);
  modalHeaderContainer.appendChild(speakerSoundGainContainer);
  modalHeaderContainer.appendChild(soundLevelContainer);

  // modalHeaderContainer.appendChild(horizontal);
  modalHeaderContainer.appendChild(rmsOfSound);
  modalHeaderContainer.appendChild(maxAmplitude);

  // modalHeaderContainer.appendChild(adjustedSoundLevel);
  modalHeaderContainer.appendChild(nameOfPlayedSound);
  //append the toggles
  IRCorrectionToggleContainer.appendChild(IRCorrectionToggleLabel);
  IRCorrectionToggleContainer.appendChild(modalToggle);
  useGainNodeToggleContainer.appendChild(useGainNodeLabel);
  useGainNodeToggleContainer.appendChild(useGainNodeToggle);
  togglesContainer.appendChild(IRCorrectionToggleContainer);
  togglesContainer.appendChild(useGainNodeToggleContainer);
  // togglesContainer.appendChild(IRCorrectionToggleLabel);
  // togglesContainer.appendChild(modalToggle);
  // togglesContainer.appendChild(useGainNodeLabel);
  // togglesContainer.appendChild(useGainNodeToggle);

  modalContent.appendChild(modalHeaderContainer);
  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(togglesContainer);
  // modalHeader.appendChild(modalToggle);
  // modalHeader.appendChild(useGainNodeLabel);
  // modalHeader.appendChild(useGainNodeToggle);
  // modalContent.appendChild(modalSubtitle);
  modalContent.appendChild(modalBody);
  modalContent.appendChild(modalFooter);
  document.body.appendChild(modal);
  addSoundTestCss();

  populateSoundFiles(reader, modalBody, toggleElements.toggleSwitchInput);
};

const addSoundTestCss = () => {
  const styles = `
    #soundTestModal {
        tabindex: -1;
        role: dialog;
        aria-labelledby: soundTestModalTitle;
        area-hidden: true;
      }
    #soundTestModalDialog {
        role: document;
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
  toggleSwitchSpan.setAttribute("class", "slider round");

  toggleSwitch.appendChild(toggleSwitchInput);
  toggleSwitch.appendChild(toggleSwitchSpan);
  const elems = { toggleSwitch, toggleSwitchInput, toggleSwitchSpan };
  addToggleCSS();
  return elems;
};

const addToggleCSS = () => {
  const styles = `
    .switch {
        position: relative;
        display: inline-block;
        width: 60px;
        height: 34px;
      }
    .switch input {
        display: none;
      }
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        -webkit-transition: .4s;
        transition: .4s;
      }
    .slider:before {
        position: absolute;
        content: "";
        height: 26px;
        width: 26px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        -webkit-transition: .4s;
        transition: .4s;
      }
    input:checked + .slider {
        background-color: #2196F3;
      }
    input:focus + .slider {
        box-shadow: 0 0 1px #2196F3;
      }
    input:checked + .slider:before {
        -webkit-transform: translateX(26px);
        -ms-transform: translateX(26px);
        transform: translateX(26px);
      }
    .slider.round {
    border-radius: 34px;
    }
    
    .slider.round:before {
    border-radius: 50%;
    }
      `;

  const soundTestToggleStyleSheet = document.createElement("style");
  soundTestToggleStyleSheet.innerText = styles;
  document.head.appendChild(soundTestToggleStyleSheet);
};

const populateSoundFiles = async (reader, modalBody, toggleInput) => {
  var targetSoundFolders = reader.read("targetSoundFolder", "__ALL_BLOCKS__");
  targetSoundFolders = [...new Set(targetSoundFolders)]; // remove duplicates
  targetSoundFolders = targetSoundFolders.filter((folder) => folder); // remove empty strings
  const targetSoundFiles = {};
  await Promise.all(
    targetSoundFolders.map(async (targetSoundFolder, blockCount) => {
      blockCount++;
      // targetSoundFiles[`Block${blockCount}`] = [];
      targetSoundFiles[`Block${blockCount}`] = await fetch(
        `folders/${targetSoundFolder}.zip`
      )
        .then((response) => {
          return response.blob();
        })
        .then(async (data) => {
          const Zip = new JSZip();
          const files = await Zip.loadAsync(data).then((zip) => {
            const soundFiles = [];
            zip.forEach((relativePath, zipEntry) => {
              // console.log("isDirectory", zipEntry.dir);
              var name = zipEntry.name;
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
    })
  );

  addSoundFileElements(targetSoundFiles, modalBody, toggleInput, reader);
};

const addSoundFileElements = (
  targetSoundFiles,
  modalBody,
  toggleInput,
  reader
) => {
  Object.keys(targetSoundFiles).forEach((blockName, index) => {
    const horizontal = document.createElement("hr");
    const block = document.createElement("div");
    block.setAttribute("class", "block");
    targetSoundFiles[blockName].forEach((soundFile) => {
      const soundFileContainer = document.createElement("div");
      soundFileContainer.setAttribute("class", "soundFileContainer");
      const soundFileName = document.createElement("h4");
      soundFileName.innerHTML = soundFile.name;
      const soundFileButton = document.createElement("button");
      soundFileButton.classList.add(...["btn", "btn-success"]);
      soundFileButton.innerHTML = "Play";

      soundFileButton.addEventListener("click", async () => {
        // display name of sound file
        document.getElementById("soundTestModalNameOfPlayedSound").innerHTML =
          "Playing sound: " + soundFile.name;
        const soundFileBuffer = cloneAudioBuffer(await soundFile.file);

        soundGain.current = document.getElementById(
          "soundTestModalSpeakerSoundGainInput"
        ).value;
        // round soundGain to 1 decimal places
        soundGain.current = Math.round(soundGain.current * 10) / 10;
        document.getElementById("soundTestModalSpeakerSoundGainInput").value =
          soundGain.current.toFixed(1);

        var audioData = soundFileBuffer.getChannelData(0);
        setWaveFormToZeroDbSPL(audioData);

        soundDBSPL.current = document.getElementById(
          "soundTestModalSoundLevelInput"
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
          audioData
        );
        const inDB = correctedValues.inDB;
        soundDBSPL.current = correctedValues.correctedSoundDBSPL;
        soundDBSPL.current = Math.round(soundDBSPL.current * 10) / 10;

        const maxOfOriginalSound =
          getMaxValueOfAbsoluteValueOfBuffer(audioData);
        const theGainValue = getGainValue(inDB);
        const soundMax = maxOfOriginalSound * theGainValue;
        // console.log("inDB", inDB);
        // console.log("soundMax", soundMax);
        // console.log("soundDBSPL.current", soundDBSPL.current);
        document.getElementById(
          "soundTestModalMaxAmplitude"
        ).innerHTML = `Digital sound max: ${soundMax.toFixed(2)}`;

        document.getElementById("soundTestModalSoundLevelInput").value =
          soundDBSPL.current;
        const rmsOfSound = document.getElementById("soundTestModalRMSOfSound");
        const useGainNodeBool = document.getElementById(
          "soundTestModalUseGainNodeToggleInput"
        ).checked;

        //use gain node
        if (useGainNodeBool) {
          const gainNode = getGainNode(getGainValue(inDB));
          const webAudioNodes = [];
          webAudioNodes.push(createAudioNodeFromBuffer(soundFileBuffer));
          webAudioNodes.push(gainNode);
          if (toggleInput.checked) {
            if (invertedImpulseResponse.current) {
              rmsOfSound.innerHTML = `Digital sound RMS dB: ${calculateDBFromRMS(
                Math.round(gainNode.gain.value * 10) / 10
              )} dB`;
              webAudioNodes.push(
                await createImpulseResponseFilterNode(
                  invertedImpulseResponse.current
                )
              );
              connectAudioNodes(webAudioNodes);
              playAudioNodeGraph(webAudioNodes);
            } else {
              alert(
                "There was an error loading the impulse response. Please try calibrating again."
              );
            }
          } else {
            rmsOfSound.innerHTML = `Digital sound RMS dB: ${calculateDBFromRMS(
              gainNode.gain.value
            )} dB`;
            connectAudioNodes(webAudioNodes);
            playAudioNodeGraph(webAudioNodes);
          }
        }

        // adjust sound by changing the amplitude of the sound file manually
        else {
          adjustSoundDbSPL(audioData, inDB);
          rmsOfSound.innerHTML = `Digital sound RMS dB: ${calculateDBFromRMS(
            getRMSOfWaveForm(audioData)
          )} dB`;

          if (toggleInput.checked) {
            if (invertedImpulseResponse.current)
              playAudioBufferWithImpulseResponseCalibration(
                soundFileBuffer,
                invertedImpulseResponse.current
              );
            else
              alert(
                "There was an error loading the impulse response. Please try calibrating again."
              );
          } else playAudioBuffer(soundFileBuffer);
        }
      });
      soundFileContainer.appendChild(soundFileName);
      soundFileContainer.appendChild(soundFileButton);
      block.appendChild(soundFileContainer);
    });
    modalBody.appendChild(block);
    modalBody.appendChild(horizontal);
  });
  addSoundFileCSS();
};

const addSoundFileCSS = () => {
  const styles = `
    .block {
        padding: 10px;
        padding-bottom: 0;
    }
    .soundFileContainer {
        display: flex;
        justify-content: space-between;
        padding: 10px;
        padding-bottom: 0;
    }
    .soundFileButton {
        padding: 10px;
        padding-bottom: 0;
    }
    `;
  const soundTestFileStyleSheet = document.createElement("style");
  soundTestFileStyleSheet.innerText = styles;
  document.head.appendChild(soundTestFileStyleSheet);
};

const cloneAudioBuffer = (audioBuffer) => {
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

  let outDb = 0;
  const WFinal = W >= 0 ? W : 0;
  if (inDb > T + WFinal / 2) {
    outDb = T + (inDb - T) / R;
  } else if (inDb > T - WFinal / 2) {
    outDb =
      inDb + ((1 / R - 1) * (inDb - (T - WFinal / 2)) ** 2) / (2 * WFinal);
  } else {
    outDb = inDb;
  }

  return outDb;
};

export const getCorrectedInDbAndSoundDBSPL = (
  soundDBSPL,
  soundGain,
  audioData
) => {
  const targetMaxOverRms =
    getMaxValueOfAbsoluteValueOfBuffer(audioData) / getRMSOfWaveForm(audioData);
  const targetDB = soundDBSPL - soundGain;
  const targetGain = getGainValue(targetDB);

  const inDB =
    targetMaxOverRms * targetGain > 1
      ? calculateDBFromRMS(1 / targetMaxOverRms)
      : targetDB;
  const correctedSoundDBSPL = soundGain + inDB;

  return { inDB, correctedSoundDBSPL };
};

export const displayParameters1000Hz = (
  elems,
  soundLevels,
  soundCalibrationResults,
  PlotTitle = "Sound Level at 1000 Hz",
  calibrationGoal = "system",
  isLoudspeakerCalibration = true
) => {
  elems.citation.style.visibility = "visible";
  elems.background.style.top = "70%";
  elems.soundParametersFromCalibration.style.whiteSpace = "pre";
  // reduce the spacing between the lines for soundParametersFromCalibration
  // elems.soundParametersFromCalibration.style.lineHeight = "0.8";
  elems.soundLevelsTable.style.display = "block";
  elems.soundLevelsTable.innerHTML = "";
  elems.soundLevelsTable.setAttribute("id", "soundLevelsTable");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const tr = document.createElement("tr");
  const th1 = document.createElement("th");
  const th2 = document.createElement("th");
  const th3 = document.createElement("th");
  const th4 = document.createElement("th");
  const th5 = document.createElement("th");
  th1.innerHTML = "in (dB)";
  th2.innerHTML = "out - in (dB SPL)";
  th3.innerHTML = "out (dB SPL)";
  th4.innerHTML = "THD (%)";
  th5.innerHTML = "out @all Hz (dB SPL)";

  // padding between the three columns
  th1.style.paddingRight = "20px";
  th2.style.paddingRight = "20px";
  th3.style.paddingRight = "20px";
  th4.style.paddingRight = "20px";
  tr.appendChild(th1);
  tr.appendChild(th3);
  tr.appendChild(th2);
  tr.appendChild(th4);
  tr.appendChild(th5);
  thead.appendChild(tr);
  elems.soundLevelsTable.appendChild(thead);
  elems.soundLevelsTable.appendChild(tbody);
  //add title to the table
  const title = document.createElement("h6");
  title.innerHTML = "Sound Level at 1000 Hz";
  elems.soundLevelsTable.insertBefore(title, thead);
  // center the title
  title.style.textAlign = "center";
  const parameters = soundCalibrationResults.parameters;
  const outDBSPL1000Values = soundCalibrationResults.outDBSPL1000Values;
  const outDBSPLValues = soundCalibrationResults.outDBSPLValues;
  const THDValues = soundCalibrationResults.thdValues;
  for (let i = 0; i < soundLevels.length; i++) {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    const td2 = document.createElement("td");
    const td3 = document.createElement("td");
    const td4 = document.createElement("td");
    const td5 = document.createElement("td");
    // display the values with 1 decimal place
    // convert soundLevels to float
    td1.innerHTML = String(parseFloat(soundLevels[i]).toFixed(1));
    // td1.innerHTML = soundLevels[i].toFixed(1);
    td2.innerHTML = (
      outDBSPL1000Values[i] - parseFloat(soundLevels[i])
    ).toFixed(1);
    td3.innerHTML = outDBSPL1000Values[i].toFixed(1);
    td4.innerHTML = (THDValues[i] * 100).toFixed(2);
    td5.innerHTML = outDBSPLValues[i].toFixed(1);
    // padding between the 5 columns
    td1.style.paddingRight = "20px";
    td2.style.paddingRight = "20px";
    td3.style.paddingRight = "20px";
    td4.style.paddingRight = "20px";

    // the dots in a vertical column should be aligned to the right
    td1.style.textAlign = "right";
    td2.style.textAlign = "right";
    td3.style.textAlign = "right";
    td4.style.textAlign = "right";
    td5.style.textAlign = "right";

    tr.appendChild(td1);
    tr.appendChild(td3);
    tr.appendChild(td2);
    tr.appendChild(td4);
    tr.appendChild(td5);
    tbody.appendChild(tr);
  }

  // display the parameters used for the calibration
  // elems.soundParametersFromCalibration.innerHTML = `
  // Dynamic Range Compression Model:\n
  // T: ${parameters.T.toFixed(1) + " dB SPL"}\n
  // W: ${parameters.W.toFixed(1) + " dB"}\n
  // Q = 1/R: ${(1 / Number(parameters.R.toFixed(1))).toFixed(3)}\n
  // gainDBSPL: ${parameters.gainDBSPL.toFixed(1)}\n
  // backgroundDBSPL: ${parameters.backgroundDBSPL.toFixed(1)}\n
  // RMSError: ${parameters.RMSError.toFixed(1) + " dB"}\n
  // `;

  // elems.downloadButton.style.visibility = "visible";
  // elems.downloadButton.classList.add(...["btn", "btn-success"]);

  // button to download the soundLevelsTable and the parameters as a csv file
  // downloadCalibrationData(elems.downloadButton, parameters);

  // plot
  // elems.soundTestContainer.style.display = "flex";

  // plot the sound levels
  // create plot canvas
  const plotCanvas = document.createElement("canvas");
  // plotCanvas.setAttribute("id", "plotCanvas");
  plotCanvas.width = 500;
  plotCanvas.height = 500;

  elems.soundTestPlots.innerHTML = "";
  elems.soundTestPlots.appendChild(plotCanvas);

  // function call to plot the sound levels
  plotSoundLevels1000Hz(
    // plotSoundLevels(
    plotCanvas,
    parameters,
    soundLevels,
    outDBSPL1000Values,
    PlotTitle,
    calibrationGoal,
    isLoudspeakerCalibration
  );

  // fit plotCanvas to parent
  // plotCanvas.style.width = "100%";
  // plotCanvas.style.height = "100%";
};

export const SoundLevelModel = (inDb, backgroundDbSpl, gainDbSpl, T, W, R) => {
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

  const totalDbSpl =
    10 *
    Math.log10(10 ** (backgroundDbSpl / 10) + 10 ** ((gainDbSpl + inDb) / 10));
  const measuredDbSpl = CompressorDb(totalDbSpl, T, R, W);
  // log all values
  // console.log("inDb", inDb);
  // console.log("backgroundDbSpl", backgroundDbSpl);
  // console.log("gainDbSpl", gainDbSpl);
  // console.log("T", T);
  // console.log("W", W);
  // console.log("R", R);
  // console.log("totalDbSpl", totalDbSpl);
  // console.log("measuredDbSpl", measuredDbSpl);

  return measuredDbSpl;
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
  calibrationGoal = "system",
  isLoudspeakerCalibration = true,
  backgroundNoise = [],
  mls_psd = {},
  microphoneGain = { Freq: [], Gain: [] },
  filteredMLSRange = { Min: 0, Max: 0 }
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
    filteredMLSRange
  );
};

export const displayWhatIsSavedInDatabase = (
  elems,
  ir,
  isLoudspeakerCalibration = true,
  title = "Impulse response saved in the database",
  filteredMLSRange
) => {
  const plotCanvas = document.createElement("canvas");
  plotCanvas.setAttribute("id", "plotCanvas");
  plotCanvas.width = 500;
  plotCanvas.height = 500;
  plotCanvas.style.marginTop = "20px";
  elems.soundTestPlots.appendChild(plotCanvas);
  elems.citation.style.visibility = "visible";

  plotImpulseResponse(
    plotCanvas,
    ir,
    title,
    filteredMLSRange,
    isLoudspeakerCalibration
  );
};

export const displayRecordings = (elems, recChecks) => {
  const plotCanvas = document.createElement("canvas");
  plotCanvas.setAttribute("id", "plotCanvas");
  plotCanvas.width = 500;
  plotCanvas.height = 500;
  plotCanvas.style.marginTop = "20px";
  elems.soundTestPlots.appendChild(plotCanvas);
  elems.citation.style.visibility = "visible";
  plotRecordings(plotCanvas, recChecks);
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
  calibrationGoal
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
    // if (column === "target" && isLoudSpeakerCalibration) td1.innerHTML = a check mark (U+2713) and td2.innerHTML = ""
    // if (column === "target" && !isLoudSpeakerCalibration) td2.innerHTML = a check mark (U+2713) and td1.innerHTML = ""
    if (column === "target") {
      if (calibrationGoal === "system") {
        td2.innerHTML = "✓";
        td3.innerHTML = "✓";
      } else if (calibrationGoal == "goal" && isLoudspeakerCalibration) {
        td3.innerHTML = "✓";
        td2.innerHTML = " ";
      } else if (calibrationGoal == "goal" && !isLoudspeakerCalibration) {
        td2.innerHTML = "✓";
        td3.innerHTML = " ";
      }
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
    } else if (column === "CalibrationDate") {
      td2.innerHTML = LoudspeakerInfo[column];
      tr.appendChild(td1);
      tr.appendChild(td2);
      td2.setAttribute("colspan", "2");
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
  const p = document.createElement("p");
  p.innerHTML = "Timestamps:";
  const p2 = document.createElement("p");
  p2.innerHTML = allHzCalibrationResults.timestamps.replace(/\n/g, "<br />");
  elems.completeTransducerTable.appendChild(p);
  elems.completeTransducerTable.appendChild(p2);
  elems.completeTransducerTable.appendChild(table);
};

export const display1000HzParametersTable = (parameters) => {
  const parametersToDisplay = {
    T: parameters.T.toFixed(1) + " dB SPL",
    W: parameters.W.toFixed(1) + " dB",
    Q: (1 / Number(parameters.R.toFixed(1))).toFixed(3),
    gainDBSPL: parameters.gainDBSPL.toFixed(1),
    backgroundDBSPL: parameters.backgroundDBSPL.toFixed(1),
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
  thTitle.setAttribute("colspan", "2");
  trTitle.appendChild(thTitle);
  thead.appendChild(trTitle);

  // add the parameters and values
  Object.keys(parametersToDisplay).forEach((key) => {
    const tr = document.createElement("tr");
    tr.style.lineHeight = "1.2";
    const td1 = document.createElement("td");
    const td2 = document.createElement("td");
    td1.innerHTML = key;
    td2.innerHTML = parametersToDisplay[key];
    tr.appendChild(td1);
    tr.appendChild(td2);
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
};

export const displaySummarizedTransducerTable = (
  LoudspeakerInfo,
  microphoneInfo,
  elems = "",
  isLoudspeakerCalibration,
  calibrationGoal,
  position = "left",
  samplingHz = []
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

  if (calibrationGoal === "system") {
    th1.style.fontWeight = "bold";
    th2.style.fontWeight = "bold";
  } else if (calibrationGoal == "goal" && isLoudspeakerCalibration) {
    th1.style.fontWeight = "bold";
    th2.style.fontWeight = "normal";
  } else if (calibrationGoal == "goal") {
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
  td1.innerHTML = LoudspeakerInfo["fullLoudspeakerModelName"];
  td2.innerHTML = microphoneInfo["micFullName"];
  tr2.appendChild(td1);
  tr2.appendChild(td2);

  // row 3 is the Model Specifiers
  const tr3 = document.createElement("tr");
  const td3 = document.createElement("td");
  const td4 = document.createElement("td");
  td3.innerHTML = LoudspeakerInfo["fullLoudspeakerModelNumber"];
  td4.innerHTML = microphoneInfo["micFullSerialNumber"];
  tr3.appendChild(td3);
  tr3.appendChild(td4);

  // row 4 column 1 is the calibration date, column 2 is empty
  const tr4 = document.createElement("tr");
  const td5 = document.createElement("td");
  td5.innerHTML = LoudspeakerInfo["CalibrationDate"];
  td5.setAttribute("colspan", "2");
  tr4.appendChild(td5);

  // row 5 is OEM
  const tr5 = document.createElement("tr");
  const td6 = document.createElement("td");
  const td7 = document.createElement("td");
  td6.innerHTML = LoudspeakerInfo["OEM"];
  td7.innerHTML = microphoneInfo["micrFullManufacturerName"];
  tr5.appendChild(td6);
  tr5.appendChild(td7);

  // row 6 is the gain
  const tr6 = document.createElement("tr");
  const td8 = document.createElement("td");
  const td9 = document.createElement("td");

  LoudspeakerInfo["gainDBSPL"] =
    Math.round(LoudspeakerInfo["gainDBSPL"] * 10) / 10;
  microphoneInfo["gainDBSPL"] =
    Math.round(microphoneInfo["gainDBSPL"] * 10) / 10;
  td8.innerHTML =
    LoudspeakerInfo["gainDBSPL"] > 0
      ? "+" + LoudspeakerInfo["gainDBSPL"]
      : LoudspeakerInfo["gainDBSPL"];
  td9.innerHTML =
    microphoneInfo["gainDBSPL"] > 0
      ? "+" + microphoneInfo["gainDBSPL"] + " dB gain at 1 kHz"
      : microphoneInfo["gainDBSPL"] + " dB gain at 1 kHz";
  tr6.appendChild(td8);
  tr6.appendChild(td9);

  if (webAudioDeviceNames.loudspeaker && webAudioDeviceNames.microphone) {
    const tr8 = document.createElement("tr");
    const td12 = document.createElement("td");
    const td13 = document.createElement("td");
    td12.innerHTML = webAudioDeviceNames.loudspeaker;
    td13.innerHTML = webAudioDeviceNames.microphone;
    tr8.appendChild(td12);
    tr8.appendChild(td13);
    tr8.style.lineHeight = "0.8";
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
      `, ${actualBitsPerSample.current} bits`;
    tr7.appendChild(td10);
    tr7.appendChild(td11);
    tr7.style.lineHeight = "0.8";
    tbody.appendChild(tr7);
  }

  tbody.appendChild(tr5);
  tbody.appendChild(tr2);
  tbody.appendChild(tr3);
  tbody.appendChild(tr4);

  tr1.style.lineHeight = "0.8";
  tr2.style.lineHeight = "0.8";
  tr3.style.lineHeight = "0.8";
  tr4.style.lineHeight = "0.8";
  tr5.style.lineHeight = "0.8";
  tr6.style.lineHeight = "0.8";

  // max width of the table: 300px. wrap the texts
  table.style.maxWidth = "400px";

  table.appendChild(thead);
  table.appendChild(tbody);

  return table;
};
