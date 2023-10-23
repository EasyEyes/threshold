import { readi18nPhrases } from "./readPhrases";
import { debug, ifTrue, loggerText } from "./utils";
import {
  soundGainDBSPL,
  invertedImpulseResponse,
  rc,
  soundCalibrationLevelDBSPL,
  soundCalibrationResults,
  debugBool,
  allHzCalibrationResults,
  calibrateSoundMinHz,
  calibrateSoundMaxHz,
  calibrateMicrophonesBool,
  microphoneCalibrationResults,
  calibrateSoundCheck,
  timeoutSec,
  calibrateSoundBurstRepeats,
  calibrateSoundBurstSec,
  calibrateSoundBurstsWarmup,
  calibrateSoundHz,
  calibrateSoundBurstRecordings,
  calibrateSound1000HzSec,
  calibrateSound1000HzPreSec,
  calibrateSound1000HzPostSec,
  timeToCalibrate,
  thisDevice,
  calibrateSoundIIRSec,
  calibrateSoundBurstDb,
  loudspeakerInfo,
  microphoneInfo,
  calibrationTime,
  calibrateSoundBackgroundSecs,
  calibrateSoundSaveJSONBool,
  showSoundParametersBool,
  calibrateSoundSamplingDesiredBits,
} from "./global";
import { GLOSSARY } from "../parameters/glossary.ts";
import {
  addSoundTestElements,
  displayCompleteTransducerTable,
  displayParameters1000Hz,
  displayParametersAllHz,
  displaySummarizedTransducerTable,
} from "./soundTest";
import {
  getCurrentTimeString,
  getSoundCalibrationLevelDBSPLFromIIR,
} from "./soundUtils";
import { showExperimentEnding } from "./forms";
import {
  addMicrophoneToDatabase,
  doesMicrophoneExist,
  findGainatFrequency,
  getCalibrationFile,
  getDebugIIR,
  getDebugSoundCalibrationResults,
  getDeviceString,
  getInstructionText,
  identifyDevice,
  parseCalibrationFile,
  readFrqGain,
  removeElements,
  saveLoudSpeakerInfo,
} from "./soundCalibrationHelpers";
export const useCalibration = (reader) => {
  return ifTrue([
    ...reader.read("calibrateFrameRateUnderStressBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateBlindSpotBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateScreenSizeBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateTrackDistanceBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateTrackGazeBool", "__ALL_BLOCKS__"),
    ...reader.read("calibratePupillaryDistanceBool", "__ALL_BLOCKS__"),
  ]);
};

/* -------------------------------------------------------------------------- */

export const ifAnyCheck = (reader) => {
  return ifTrue([
    ...reader.read("calibrateScreenSizeCheckBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateDistanceCheckBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateGazeCheckBool", "__ALL_BLOCKS__"),
  ]);
};

export const formCalibrationList = (reader) => {
  const tasks = [];

  if (
    ifTrue(reader.read("calibrateFrameRateUnderStressBool", "__ALL_BLOCKS__"))
  )
    tasks.push({
      name: "performance",
      callback: (data) => {
        loggerText(
          `[rc] idealFps: ${data.value.idealFps}, stressFps: ${data.value.stressFps}`
        );
      },
    });

  if (ifTrue(reader.read("calibrateScreenSizeBool", "__ALL_BLOCKS__")))
    ////
    tasks.push({
      name: "screenSize",
      options: {
        fullscreen: !debug,
        check: reader.read("calibrateScreenSizeCheckBool")[0],
      },
    });

  if (ifTrue(reader.read("calibrateBlindSpotBool", "__ALL_BLOCKS__")))
    tasks.push({
      name: "measureDistance",
      options: {
        fullscreen: !debug,
        sparkle: true,
        check: reader.read("calibrateDistanceCheckBool")[0],
        showCancelButton: false,
      },
    });

  if (ifTrue(reader.read("calibrateTrackDistanceBool", "__ALL_BLOCKS__")))
    ////
    tasks.push({
      name: "trackDistance",
      options: {
        nearPoint: ifTrue(
          reader.read("calibratePupillaryDistanceBool", "__ALL_BLOCKS__")
        ),
        showVideo: false,
        desiredDistanceCm: reader.has("viewingDistanceDesiredCm")
          ? reader.read("viewingDistanceDesiredCm")[0]
          : undefined,
        desiredDistanceTolerance: reader.read("viewingDistanceAllowedRatio")[0],
        desiredDistanceMonitor: ifTrue(
          reader.read("viewingDistanceNudgingBool", "__ALL_BLOCKS__")
        ),
        desiredDistanceMonitorAllowRecalibrate: !debugBool.current,
        fullscreen: !debug,
        sparkle: true,
        check: reader.read("calibrateDistanceCheckBool")[0],
        showCancelButton: false,
      },
    });

  if (ifTrue(reader.read("calibrateTrackGazeBool", "__ALL_BLOCKS__")))
    ////
    tasks.push({
      name: "trackGaze",
      options: {
        showGazer: ifTrue(reader.read("showGazeBool", "__ALL_BLOCKS__")),
        showVideo: false,
        calibrationCount: 1,
        fullscreen: !debug,
      },
    });

  return tasks;
};

export const saveCalibratorData = (reader, rc, psychoJS) => {
  if (ifTrue(reader.read("calibrateScreenSizeBool", "__ALL_BLOCKS__"))) {
    psychoJS.experiment.addData(
      `screenWidthByObjectCm`,
      rc.screenWidthCm ? rc.screenWidthCm.value : 0
    );
    psychoJS.experiment.addData(
      `screenHeightByObjectCm`,
      rc.screenHeightCm ? rc.screenHeightCm.value : 0
    );
  }

  if (rc.viewingDistanceCm) {
    for (let viewingDistanceData of rc.viewingDistanceData) {
      if (viewingDistanceData.method === "BlindSpot") {
        psychoJS.experiment.addData(
          `viewingDistanceByBlindSpotCm`,
          viewingDistanceData.value
        );
      }
    }
  }
};

export const saveCheckData = (rc, psychoJS) => {
  // rc.checkData is a list of objects { timestamp: "", value: { field1: value1, filed2: value2 } }
  for (let data of rc.checkData) {
    // psychoJS.experiment.addData(
    //   `calibrationCheck_${data.measure}_timestamp`,
    //   data.timestamp.getTime ? data.timestamp.getTime() : data.timestamp
    // );
    if (data.measure === "screenSize") {
      if (data.value.horizontal)
        psychoJS.experiment.addData(
          "screenWidthByRulerCm",
          (getCmValue(
            data.value.horizontal.numerical,
            data.value.horizontal.unit
          ) *
            screen.width) /
            data.value.horizontal.arrowWidthPx
        );
      if (data.value.vertical)
        psychoJS.experiment.addData(
          "screenHeightByRulerCm",
          (getCmValue(data.value.vertical.numerical, data.value.vertical.unit) *
            screen.height) /
            data.value.vertical.arrowHeightPx
        );
    } else if (
      data.measure === "measureDistance" ||
      data.measure === "trackDistance"
    ) {
      psychoJS.experiment.addData(
        "viewingDistanceByRulerCm",
        getCmValue(data.value.numerical, data.value.unit)
      );
    }
  }
};

// TODO: Clean up sound calibration code after the paper deadline
export const calibrateAudio = async (reader) => {
  const [calibrateSoundLevel, calibrateLoudspeaker] = [
    ifTrue(
      reader.read(GLOSSARY.calibrateSound1000HzBool.name, "__ALL_BLOCKS__")
    ),
    ifTrue(
      reader.read(GLOSSARY.calibrateSoundAllHzBool.name, "__ALL_BLOCKS__")
    ),
  ];

  calibrateMicrophonesBool.current = ifTrue(
    reader.read(GLOSSARY._calibrateMicrophonesBool.name, "__ALL_BLOCKS__")
  );

  calibrateSoundCheck.current = reader.read("_calibrateSoundCheck")[0];

  const showSoundCalibrationResultsBool = ifTrue(
    reader.read(
      GLOSSARY._showSoundCalibrationResultsBool.name,
      "__ALL_BLOCKS__"
    )
  );
  const showSoundTestPageBool = ifTrue(
    reader.read(GLOSSARY._showSoundTestPageBool.name, "__ALL_BLOCKS__")
  );
  showSoundParametersBool.current = ifTrue(
    reader.read(GLOSSARY._showSoundParametersBool.name, "__ALL_BLOCKS__")
  );
  timeoutSec.current = reader.read(GLOSSARY._timeoutSec.name)[0] * 1000;
  calibrateSoundMinHz.current = reader.read(
    GLOSSARY.calibrateSoundMinHz.name
  )[0];
  calibrateSoundMaxHz.current = reader.read(
    GLOSSARY.calibrateSoundMaxHz.name
  )[0];
  calibrateSoundBurstRepeats.current = reader.read(
    GLOSSARY._calibrateSoundBurstRepeats.name
  )[0];
  calibrateSoundBurstSec.current = reader.read(
    GLOSSARY._calibrateSoundBurstSec.name
  )[0];
  calibrateSoundBurstsWarmup.current = reader.read(
    GLOSSARY._calibrateSoundBurstsWarmup.name
  )[0];
  calibrateSoundHz.current = reader.read(
    GLOSSARY._calibrateSoundSamplingDesiredHz.name
  )[0];
  calibrateSoundBurstRecordings.current = reader.read(
    GLOSSARY._calibrateSoundBurstRecordings.name
  )[0];
  calibrateSoundIIRSec.current = reader.read(
    GLOSSARY._calibrateSoundIIRSec.name
  )[0];
  calibrateSoundBurstDb.current = reader.read(
    GLOSSARY._calibrateSoundBurstDb.name
  )[0];
  calibrateSound1000HzSec.current = reader.read(
    GLOSSARY.calibrateSound1000HzSec.name
  )[0];
  calibrateSound1000HzPreSec.current = reader.read(
    GLOSSARY.calibrateSound1000HzPreSec.name
  )[0];
  calibrateSound1000HzPostSec.current = reader.read(
    GLOSSARY.calibrateSound1000HzPostSec.name
  )[0];
  calibrateSoundBackgroundSecs.current = reader.read(
    GLOSSARY._calibrateSoundBackgroundSecs.name
  )[0];
  calibrateSoundSaveJSONBool.current = ifTrue(
    reader.read(GLOSSARY._calibrateSoundSaveJSONBool.name, "__ALL_BLOCKS__")
  );
  calibrateSoundSamplingDesiredBits.current = reader.read(
    GLOSSARY._calibrateSoundSamplingDesiredBits.name
  )[0];
  const soundLevels = reader
    .read(GLOSSARY.calibrateSound1000HzDB.name)[0]
    .split(",");
  // convert soundLevels to numbers
  for (let i = 0; i < soundLevels.length; i++) {
    soundLevels[i] = parseFloat(soundLevels[i]);
  }
  const gains = soundLevels.map((soundLevel) => {
    return Math.pow(10, soundLevel / 20);
  });

  calibrationTime.current = getCurrentTimeString();
  let dSec =
    6 *
      calibrateSoundBurstRecordings.current *
      (calibrateSoundBurstRepeats.current +
        calibrateSoundBurstsWarmup.current) *
      calibrateSoundBurstSec.current +
    2 *
      gains.length *
      (calibrateSound1000HzPreSec.current +
        calibrateSound1000HzSec.current +
        calibrateSound1000HzPostSec.current);
  timeToCalibrate.current = Math.round(dSec / 60);

  if (!(calibrateSoundLevel || calibrateLoudspeaker)) return true;

  // QUIT FULLSCREEN
  if (rc.isFullscreen.value) {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  }

  return new Promise(async (resolve) => {
    const lang = rc.language.value;
    const copy = {
      title: calibrateSoundLevel
        ? readi18nPhrases("RC_soundCalibrationTitle1000Hz", lang)
        : readi18nPhrases("RC_soundCalibrationTitleAllHz", lang),
      soundCalibration: readi18nPhrases("RC_loudspeakerCalibration", lang),
      neediPhone: readi18nPhrases("RC_soundCalibrationNeedsMicrophone", lang),
      yes: readi18nPhrases("RC_soundCalibrationYes", lang),
      no: readi18nPhrases("RC_soundCalibrationNo", lang),
      qr: readi18nPhrases("RC_soundCalibrationQR", lang),
      holdiPhoneOK: readi18nPhrases("RC_soundCalibrationContinue", lang),
      clickToStart: readi18nPhrases("RC_soundCalibrationClickToStart", lang),
      done: readi18nPhrases("RC_soundCalibrationDone", lang),
      test: readi18nPhrases("RC_testSounds", lang), //include in phrases doc
      citation:
        'Measured sound power is modeled as sum of background sound power and power gain times digital sound power. Microphone compression modeled by Eq. 4 of Giannoulis, Massberg, & Reiss (2012). "Digital Dynamic Range Compressor Design — A Tutorial and Analysis." Journal of Audio Engineering Society. 60 (6): 399–408.',
      calibrateMicrophone: "Calibrate a Microphone",
      proceedToExperiment: readi18nPhrases("RC_proceedToExperiment", lang),
    };

    const elems = _addSoundCalibrationElems(copy);

    document.querySelector("#soundNavContainer").style.display = "none";
    try {
      if (calibrateSoundLevel && calibrateLoudspeaker) {
        const response =
          await _runSoundLevelCalibrationAndLoudspeakerCalibration(
            elems,
            gains
          );
        if (response === false) resolve(false);
      } else if (calibrateSoundLevel) {
        await _runSoundLevelCalibration(elems, gains);
      } else {
        await _runLoudspeakerCalibration(elems);
      }
    } catch (e) {
      if (e instanceof speakerCalibrator.UnsupportedDeviceError) {
        alert(`${e}: Your Mobile Device is incompatiable with this test`);
        resolve(false);
      }
      if (e instanceof speakerCalibrator.CalibrationTimedOutError) {
        alert(`${e}: Something went wrong during this step`);
        resolve(false);
      }

      console.error(e);
    }

    elems.displayQR.style.display = "none";
    elems.message.innerHTML = copy.done;
    elems.yesButton.style.display = "none";
    elems.displayUpdate.style.display = "none";
    elems.subtitle.innerHTML = "";

    //show plots of the loudspeaker calibration
    if (
      calibrateSoundLevel &&
      soundCalibrationResults.current &&
      invertedImpulseResponse.current &&
      allHzCalibrationResults &&
      showSoundCalibrationResultsBool &&
      calibrateSoundCheck.current !== "none"
    ) {
      displayCompleteTransducerTable(
        loudspeakerInfo.current,
        microphoneInfo.current,
        elems,
        true,
        calibrateSoundCheck.current === "both"
          ? "system"
          : calibrateSoundCheck.current
      );
      const title1000Hz = "Sound Level at 1000 Hz";
      const titleallHz = ["Spectra of MLS recordings"];
      displayParameters1000Hz(
        elems,
        soundLevels,
        soundCalibrationResults.current,
        title1000Hz,
        calibrateSoundCheck.current === "both"
          ? "system"
          : calibrateSoundCheck.current,
        true
      );
      if (
        calibrateSoundCheck.current === "system" ||
        calibrateSoundCheck.current === "goal"
      ) {
        displayParametersAllHz(
          elems,
          calibrateSoundCheck.current === "system"
            ? allHzCalibrationResults.system
            : allHzCalibrationResults.component,
          titleallHz,
          calibrateSoundCheck.current,
          true,
          allHzCalibrationResults.background,
          allHzCalibrationResults.mls_psd,
          allHzCalibrationResults.microphoneGain,
          calibrateSoundCheck.current === "system"
            ? allHzCalibrationResults.filteredMLSRange.system
            : allHzCalibrationResults.filteredMLSRange.component
        );
      } else {
        displayParametersAllHz(
          elems,
          allHzCalibrationResults.system,
          titleallHz,
          "system",
          true,
          allHzCalibrationResults.background,
          allHzCalibrationResults.mls_psd,
          { Freq: [], Gain: [] },
          allHzCalibrationResults.filteredMLSRange.system
        );
        displayParametersAllHz(
          elems,
          allHzCalibrationResults.component,
          titleallHz,
          "goal",
          true,
          allHzCalibrationResults.background,
          allHzCalibrationResults.mls_psd,
          allHzCalibrationResults.microphoneGain,
          allHzCalibrationResults.filteredMLSRange.component
        );
      }
    }

    // Now that loudspeaker calibration is done, present users with three options: continue to experiment, calibrate microphone or test sounds

    // if calibrateMicrophonesBool is true, then provide the option to calibrate the phone mic or to continue.
    // if user chooses to calibrate mic, then at the end of the calibration, user will be presented with the option to calibrate another mic or to continue.
    // for now simulate the mic calibration by 5 seconds pause then provide the option to calibrate another mic or to continue.
    // do this until the user chooses to continue.

    while (calibrateMicrophonesBool.current) {
      if (showSoundTestPageBool) {
        elems.testButton.style.display = "block";
        elems.testButton.style.visibility = "visible";
        elems.testButton.addEventListener("click", async (e) => {
          addSoundTestElements(reader);
          $("#soundTestModal").modal("show");
        });
      }

      // provide the option to calibrate another mic or to continue.
      elems.displayUpdate.style.display = "none";
      elems.calibrateMicrophoneButton.style.display = "block";
      elems.continueButton.style.display = "block";
      elems.navContainer.style.display = "flex";
      elems.title.innerHTML = "";
      elems.subtitle.innerHTML = "";
      elems.message.innerHTML = copy.done;

      const calibration = await new Promise(async (resolve) => {
        elems.calibrateMicrophoneButton.addEventListener("click", async (e) => {
          elems.testButton.style.display = "none";
          elems.citation.style.visibility = "hidden";
          elems.soundLevelsTable.innerHTML = "";
          elems.soundTestPlots.innerHTML = "";
          elems.soundParametersFromCalibration.innerHTML = "";
          elems.downloadButton.style.visibility = "hidden";
          elems.displayUpdate.innerHTML = "";
          elems.title.innerHTML = readi18nPhrases(
            "RC_microphoneCalibration",
            lang
          )
            .replace(/111/g, 1)
            .replace(/222/g, 3);
          elems.message.innerHTML = "";
          elems.message.style.lineHeight = "2rem";
          elems.message.style.fontWeight = "normal";
          elems.message.style.fontSize = "0.7rem";
          elems.message.style.overflowX = "scroll";
          elems.calibrateMicrophoneButton.style.display = "none";
          elems.continueButton.style.display = "none";

          //  create a dropdown menu to select from "USB Microphone", "SmartPhone", "None"(default)
          const dropdown = document.createElement("select");
          dropdown.id = "micDropdown";
          dropdown.name = "micDropdown";
          const options = calibrateMicrophonesBool.current
            ? ["USB Microphone", "Smartphone", "None"]
            : ["Smartphone", "USB Microphone", "None"];
          options.forEach((option) => {
            const optionElem = document.createElement("option");
            optionElem.value = option;
            optionElem.innerHTML = option;
            dropdown.appendChild(optionElem);
          });

          const p2 = document.createElement("p");
          p2.innerHTML = readi18nPhrases("RC_selectMicrophoneType", lang);
          // "Select the type of microphone you are using for this calibration: (#Text to be added to the phrases doc)";
          p2.style.fontSize = "1rem";

          // add  to the page
          elems.message.appendChild(p2);
          elems.message.appendChild(dropdown);

          // create a button to submit the input
          const proceedButton = document.createElement("button");
          proceedButton.setAttribute("id", "proceedButtonMicName");
          proceedButton.classList.add(...["btn", "btn-primary"]);
          proceedButton.innerHTML = "Proceed";
          proceedButton.style.marginTop = "20px";
          elems.message.appendChild(proceedButton);

          await new Promise((resolve) => {
            proceedButton.addEventListener("click", async (e) => {
              elems.displayQR.style.display = "flex";
              elems.displayQR.style.justifyContent = "left";
              const choice = dropdown.value;
              const isSmartPhone = choice === "Smartphone";
              p2.remove();
              dropdown.remove();
              proceedButton.remove();
              var micName = "";
              var micManufacturer = "";
              var micSerialNumber = "";
              var micModelName = "";
              var micModelNumber = "";

              if (choice === "None") {
                showExperimentEnding();
              } else if (choice === "USB Microphone") {
                const p = document.createElement("p");
                p.innerHTML =
                  "Input information about your microphone: (#Text to be added to the phrases doc)";
                p.style.fontSize = "1rem";
                p.style.fontWeight = "normal";
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

                // add  to the page
                elems.subtitle.appendChild(p);
                elems.subtitle.appendChild(micNameInput);
                elems.subtitle.appendChild(micManufacturerInput);
                elems.subtitle.appendChild(micSerialNumberInput);

                const proceedButton3 = document.createElement("button");
                proceedButton3.innerHTML = "Proceed";
                proceedButton3.classList.add(...["btn", "btn-primary"]);
                elems.subtitle.appendChild(proceedButton3);

                // add event listener to the proceed button
                await new Promise((resolve) => {
                  proceedButton3.addEventListener("click", async () => {
                    microphoneInfo.current = {
                      micFullName: micNameInput.value,
                      micrFullManufacturerName: micManufacturerInput.value,
                      micFullSerialNumber: micSerialNumberInput.value,
                    };
                    // get the model number and name
                    micName = micNameInput.value;
                    micManufacturer = micManufacturerInput.value
                      .toLowerCase()
                      .split(" ")
                      .join("");
                    micSerialNumber = micSerialNumberInput.value
                      .toLowerCase()
                      .split(" ")
                      .join("");
                    // require the user to input the model number and name
                    if (
                      micName === "" ||
                      micManufacturer === "" ||
                      micSerialNumber === ""
                    ) {
                      alert("Please input the model number and name");
                    } else {
                      removeElements([
                        p,
                        proceedButton3,
                        micNameInput,
                        micManufacturerInput,
                        micSerialNumberInput,
                      ]);
                      resolve();
                    }
                  });
                });
              } else {
                // create input box for model number and name
                const modelNumberInput2 = document.createElement("input");
                modelNumberInput2.type = "text";
                modelNumberInput2.id = "modelNumberInput2";
                modelNumberInput2.name = "modelNumberInput2";
                modelNumberInput2.placeholder = "Model Number";

                const modelNameInput2 = document.createElement("input");
                modelNameInput2.type = "text";
                modelNameInput2.id = "modelNameInput2";
                modelNameInput2.name = "modelNameInput2";
                modelNameInput2.placeholder = "Model Name";

                const instructions2 = document.createElement("p");
                instructions2.id = "loudspeakerInstructions2";
                instructions2.innerHTML =
                  "We need the model number and name of your microphone to identify it (#Text to be added to the phrases doc)";
                instructions2.style.fontSize = "1rem";

                // add  to the page
                elems.subtitle.appendChild(instructions2);
                elems.subtitle.appendChild(modelNameInput2);
                elems.subtitle.appendChild(modelNumberInput2);

                const proceedButton4 = document.createElement("button");
                proceedButton4.innerHTML = "Proceed";
                proceedButton4.classList.add(...["btn", "btn-primary"]);
                elems.subtitle.appendChild(proceedButton4);

                // add event listener to the proceed button
                await new Promise((resolve) => {
                  proceedButton4.addEventListener("click", async () => {
                    microphoneInfo.current = {
                      micFullName: modelNameInput2.value,
                      micFullSerialNumber: modelNumberInput2.value,
                    };
                    // get the model number and name
                    micModelNumber = modelNumberInput2.value
                      .toLowerCase()
                      .split(" ")
                      .join("");
                    micModelName = modelNameInput2.value
                      .toLowerCase()
                      .split(" ")
                      .join("");

                    if (micModelNumber === "" || micModelName === "") {
                      alert("Please input the model number and name");
                    } else {
                      // remove the dropdown menu, instructions, proceed button, and input boxes
                      removeElements([
                        instructions2,
                        proceedButton4,
                        modelNumberInput2,
                        modelNameInput2,
                      ]);
                      resolve();
                    }
                  });
                });
              }

              // const messageText1 = readi18nPhrases("RC_identifyMicrophone", lang);
              const messageText2 = `${
                isSmartPhone
                  ? readi18nPhrases("RC_getPhoneMicrophoneReady", lang)
                  : readi18nPhrases("RC_getUSBMicrophoneReady", lang)
              }`.replace(/\n/g, "<br>");
              const p = document.createElement("p");
              p.innerHTML = messageText2;
              p.style.fontSize = "1rem";
              p.style.fontWeight = "normal";
              elems.message.appendChild(p);

              const { Speaker, CombinationCalibration } = speakerCalibrator;

              const speakerParameters = {
                siteUrl: "https://easy-eyes-listener-page.herokuapp.com",
                targetElementId: "displayQR",
                debug: debugBool.current,
                gainValues: gains,
                knownIR: allHzCalibrationResults.knownIr,
                instructionDisplayId: "recordingInProgress",
                timeToCalibrateId: "timeToCalibrate",
                soundMessageId: "soundMessage",
                titleDisplayId: "soundTitle",
                calibrateSoundBurstRepeats: calibrateSoundBurstRepeats.current,
                calibrateSoundBurstSec: calibrateSoundBurstSec.current,
                calibrateSoundSamplingDesiredBits:
                  calibrateSoundSamplingDesiredBits.current,
                calibrateSoundBurstsWarmup: calibrateSoundBurstsWarmup.current,
                calibrateSoundHz: calibrateSoundHz.current,
                timeToCalibrate: timeToCalibrate.current,
                isSmartPhone: isSmartPhone,
                calibrateSoundCheck: calibrateSoundCheck.current,
                microphoneName: micName,
                micManufacturer: micManufacturer,
                micSerialNumber: micSerialNumber,
                micModelNumber: micModelNumber,
                micModelName: micModelName,
                calibrateSoundBurstDb: Math.pow(
                  10,
                  calibrateSoundBurstDb.current / 20
                ),
                calibrateSoundIIRSec: calibrateSoundIIRSec.current,
                calibrateSound1000HzPreSec: calibrateSound1000HzPreSec.current,
                calibrateSound1000HzSec: calibrateSound1000HzSec.current,
                calibrateSound1000HzPostSec:
                  calibrateSound1000HzPostSec.current,
                calibrateSoundBackgroundSecs:
                  calibrateSoundBackgroundSecs.current,
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

              const debug = false;

              if (debug) {
                invertedImpulseResponse.current = getDebugIIR();
                soundCalibrationResults.current =
                  getDebugSoundCalibrationResults();
              } else {
                elems.displayContainer.style.display = "flex";
                elems.displayContainer.style.marginLeft = "0px";
                elems.displayContainer.style.flexDirection = "column";
                elems.displayUpdate.style.display = "flex";
                elems.displayUpdate.style.marginLeft = "0px";
                elems.displayUpdate.style.flexDirection = "column";
                elems.displayQR.style.display = "flex";
                elems.displayQR.style.marginLeft = "0px";
                elems.displayQR.style.flexDirection = "column";
                const result = await Speaker.startCalibration(
                  speakerParameters,
                  calibrator,
                  timeoutSec.current
                );
                microphoneInfo.current = {
                  ...microphoneInfo.current,
                  ...result.micInfo,
                };
                microphoneInfo.current.gainDBSPL =
                  Math.round(
                    (microphoneInfo.current.gainDBSPL -
                      loudspeakerInfo.current.gainDBSPL) *
                      10
                  ) / 10;
                microphoneInfo.current.CalibrationDate =
                  calibrationTime.current;
                elems.recordingInProgress.innerHTML = "";
                elems.message.style.whiteSpace = "normal";
                elems.message.style.fontSize = "0.8rem";
                elems.message.style.fontWeight = "normal";
                console.log("Microphone Results:", result);
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
                  HardwareModelVariants:
                    microphoneInfo.currentHardwareModelVariants,
                  PlatformVersion: microphoneInfo.current.PlatformVersion,
                  DeviceType: microphoneInfo.current.DeviceType,
                  in_dB_1000Hz: result.inDBValues ? result.inDBValues : [],
                  out_dBSPL_1000Hz: result.outDBSPL1000Values
                    ? result.outDBSPL1000Values
                    : [],
                  CalibrationDate: microphoneInfo.current.CalibrationDate,
                  MlsSpectrumHz_system: result?.system?.psd?.conv?.x,
                  MlsSpectrumFilteredDb_system:
                    result.current?.system?.psd?.conv?.y,
                  MlsSpectrumUnfilteredHz_system:
                    result?.system?.psd?.unconv?.x,
                  MlsSpectrumUnfilteredDb_system:
                    result?.system?.psd?.unconv?.y,
                  MlsSpectrumHz_component: result?.component?.psd?.conv?.x,
                  MlsSpectrumFilteredDb_component:
                    result?.component?.psd?.conv?.y,
                  MlsSpectrumUnfilteredHz_component:
                    result?.component?.psd?.unconv?.x,
                  MlsSpectrumUnfilteredDb_component:
                    result?.component?.psd?.unconv?.y,
                  "Microphone Component IR": result?.component?.ir,
                  "Microphone Component IIR": result?.component?.iir,
                  "Microphone system IR": result?.system?.ir,
                  "Microphone system IIR": result?.system?.iir,
                  dB_component_iir: result?.component?.iir_psd?.y,
                  Hz_component_iir: result?.component?.iir_psd?.x,
                  dB_component_iir_no_bandpass:
                    result?.component?.iir_psd?.y_no_bandpass,
                  Hz_component_iir_no_bandpass:
                    result?.component?.iir_psd?.x_no_bandpass,
                  dB_system_iir: result?.system?.iir_psd?.y,
                  Hz_system_iir: result?.system?.iir_psd?.x,
                  dB_system_iir_no_bandpass:
                    result?.system?.iir_psd?.y_no_bandpass,
                  Hz_system_iir_no_bandpass:
                    result?.system?.iir_psd?.x_no_bandpass,
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
                if (calibrateSoundCheck.current !== "none") {
                  displayCompleteTransducerTable(
                    loudspeakerInfo.current,
                    microphoneInfo.current,
                    elems,
                    false,
                    calibrateSoundCheck.current === "both"
                      ? "system"
                      : calibrateSoundCheck.current
                  );
                  //show sound calibration results
                  const title1000Hz = "Sound Level at 1000 Hz for" + micName;
                  const titleallHz = ["Spectra of MLS recordings"];
                  displayParameters1000Hz(
                    elems,
                    soundLevels,
                    result,
                    title1000Hz,
                    calibrateSoundCheck.current === "both"
                      ? "system"
                      : calibrateSoundCheck.current,
                    false
                  );
                  if (
                    calibrateSoundCheck.current === "system" ||
                    calibrateSoundCheck.current === "goal"
                  ) {
                    displayParametersAllHz(
                      elems,
                      // calibrateSoundCheck.current === "system"
                      //   ? result.system
                      //   : result.component,
                      calibrateSoundCheck.current === "system"
                        ? result.system
                        : result.component,
                      titleallHz,
                      calibrateSoundCheck.current,
                      false,
                      result.background_noise,
                      result.mls_psd,
                      { Freq: [], Gain: [] },
                      calibrateSoundCheck.current === "system"
                        ? result.filteredMLSRange.system
                        : result.filteredMLSRange.component
                    );
                  } else {
                    displayParametersAllHz(
                      elems,
                      // calibrateSoundCheck.current === "system"
                      //   ? result.system
                      //   : result.component,
                      result.system,
                      titleallHz,
                      "system",
                      false,
                      result.background_noise,
                      result.mls_psd,
                      { Freq: [], Gain: [] },
                      result.filteredMLSRange.system
                    );
                    displayParametersAllHz(
                      elems,
                      // calibrateSoundCheck.current === "system"
                      //   ? result.system
                      //   : result.component,
                      result.component,
                      titleallHz,
                      "goal",
                      false,
                      result.background_noise,
                      result.mls_psd,
                      result.microphoneGain,
                      result.filteredMLSRange.component
                    );
                  }
                }
              }
              resolve();
            });
          });

          resolve();
        });

        elems.continueButton.addEventListener("click", async (e) => {
          elems.calibrateMicrophoneButton.style.display = "none";
          elems.continueButton.style.display = "none";
          calibrateMicrophonesBool.current = false;
          resolve("proceed");
        });
      });

      if ((await calibration) === "proceed") {
        _removeSoundCalibrationElems(Object.values(elems));
        resolve(true);
      }
    }

    elems.message.innerHTML = copy.done;
    if (!showSoundTestPageBool) {
      _removeSoundCalibrationElems(Object.values(elems));
      resolve(true);
    }

    elems.navContainer.style.display = "flex";
    elems.yesButton.style.display = "block";
    elems.testButton.style.display = "block";
    elems.testButton.style.visibility = "visible";

    elems.testButton.addEventListener("click", async (e) => {
      addSoundTestElements(reader);
      $("#soundTestModal").modal("show");
    });

    elems.yesButton.innerHTML = readi18nPhrases("RC_proceedToExperiment", lang);
    elems.yesButton.addEventListener("click", async (e) => {
      _removeSoundCalibrationElems(Object.values(elems));
      resolve(true);
    });
  });
};

const _addSoundCalibrationElems = (copy) => {
  document.querySelector("#root").style.visibility = "hidden";
  const title = document.createElement("h1");
  const subtitle = document.createElement("h2");
  const background = document.createElement("div");
  const container = document.createElement("div");
  const message = document.createElement("div");
  const displayContainer = document.createElement("div");
  const displayQR = document.createElement("div");
  const displayUpdate = document.createElement("span");
  const citation = document.createElement("div");
  const navContainer = document.createElement("div");
  const yesButton = document.createElement("button");
  const noButton = document.createElement("button");
  const testButton = document.createElement("button");
  const soundLevelsTable = document.createElement("table");
  const completeTransducerTable = document.createElement("div");
  const soundTestContainer = document.createElement("div");
  const soundParametersFromCalibration = document.createElement("div");
  const soundTestPlots = document.createElement("div");
  const downloadButton = document.createElement("button");
  const buttonAndParametersContainer = document.createElement("div");
  const calibrateMicrophoneButton = document.createElement("button");
  const continueButton = document.createElement("button");
  const recordingInProgress = document.createElement("h1");
  const timeToCalibrate = document.createElement("div");
  const elems = {
    timeToCalibrate,
    recordingInProgress,
    background,
    title,
    subtitle,
    displayContainer,
    displayQR,
    displayUpdate,
    navContainer,
    yesButton,
    noButton,
    container,
    message,
    testButton,
    soundLevelsTable,
    completeTransducerTable,
    soundParametersFromCalibration,
    soundTestPlots,
    soundTestContainer,
    downloadButton,
    buttonAndParametersContainer,
    citation,
    calibrateMicrophoneButton,
    continueButton,
  };

  timeToCalibrate.setAttribute("id", "timeToCalibrate");
  recordingInProgress.setAttribute("id", "recordingInProgress");
  title.setAttribute("id", "soundTitle");
  subtitle.setAttribute("id", "soundSubtitle");
  message.setAttribute("id", "soundMessage");
  container.setAttribute("id", "soundContainer");
  background.setAttribute("id", "background");
  displayContainer.setAttribute("id", "displayContainer");
  displayQR.setAttribute("id", "displayQR");
  displayUpdate.setAttribute("id", "displayUpdate");
  navContainer.setAttribute("id", "soundNavContainer");
  yesButton.setAttribute("id", "soundYes");
  noButton.setAttribute("id", "soundNo");
  testButton.setAttribute("id", "soundTest");
  calibrateMicrophoneButton.setAttribute("id", "calibrateMicrophone");
  continueButton.setAttribute("id", "continueButton");
  soundParametersFromCalibration.setAttribute(
    "id",
    "soundParametersFromCalibration"
  );
  soundTestPlots.setAttribute("id", "soundTestPlots");
  soundTestContainer.setAttribute("id", "soundTestContainer");
  citation.setAttribute("id", "citation");

  // container.style.lineHeight = "1rem";
  title.innerHTML = copy.soundCalibration;
  // font size for title
  title.style.fontSize = "1.5em";
  //replace "111" with 1 and 222 with 3
  title.innerHTML = title.innerHTML.replace(/111/g, 1);
  title.innerHTML = title.innerHTML.replace(/222/g, 5);
  // subtitle.innerHTML = copy.title;
  // message.innerHTML = copy.neediPhone;
  message.style.display = "none";
  yesButton.innerHTML = copy.yes;
  noButton.innerHTML = copy.no;
  // display none for yes and no buttons
  yesButton.style.display = "none";
  noButton.style.display = "none";
  testButton.innerHTML = copy.test;
  testButton.style.display = "none";
  citation.innerHTML = copy.citation;
  citation.style.fontSize = "0.8em";
  citation.style.visibility = "hidden";
  calibrateMicrophoneButton.innerHTML = copy.calibrateMicrophone;
  calibrateMicrophoneButton.style.display = "none";
  continueButton.innerHTML = copy.proceedToExperiment;
  continueButton.style.display = "none";
  // width for displayUpdate
  displayUpdate.style.width = "100%";
  displayQR.style.marginTop = "12px";
  timeToCalibrate.style.marginLeft = "0px";
  subtitle.style.paddingBottom = "0px";
  subtitle.style.marginBottom = "0px";
  timeToCalibrate.style.paddingTop = "8px";
  timeToCalibrate.style.paddingBottom = "0px";
  displayUpdate.style.paddingTop = "8px";
  displayContainer.style.paddingTop = "0px";

  background.classList.add(...["sound-calibration-background", "rc-panel"]);
  // avoid background being clipped from the top
  // background.style.marginTop = "5vh";
  container.classList.add(...["container"]);
  yesButton.classList.add(...["btn", "btn-primary"]);
  noButton.classList.add(...["btn", "btn-secondary"]);
  testButton.classList.add(...["btn", "btn-secondary"]);
  calibrateMicrophoneButton.classList.add(...["btn", "btn-primary"]);
  continueButton.classList.add(...["btn", "btn-success"]);
  //make download button invisible
  downloadButton.style.visibility = "hidden";

  background.appendChild(container);
  container.appendChild(recordingInProgress);
  container.appendChild(title);
  container.appendChild(subtitle);
  // container.appendChild(timeToCalibrate);
  container.appendChild(message);
  container.appendChild(navContainer);
  navContainer.appendChild(testButton);
  navContainer.appendChild(calibrateMicrophoneButton);
  navContainer.appendChild(yesButton);
  navContainer.appendChild(noButton);
  navContainer.appendChild(continueButton);

  container.appendChild(displayContainer);
  displayContainer.appendChild(timeToCalibrate);
  displayContainer.appendChild(displayUpdate);
  displayContainer.appendChild(displayQR);
  buttonAndParametersContainer.appendChild(soundParametersFromCalibration);
  buttonAndParametersContainer.appendChild(downloadButton);
  container.appendChild(completeTransducerTable);
  container.appendChild(soundLevelsTable);
  soundTestContainer.appendChild(buttonAndParametersContainer);
  soundTestContainer.appendChild(soundTestPlots);
  container.appendChild(soundTestContainer);
  container.appendChild(citation);
  document.body.appendChild(background);

  _addSoundCss();

  return elems;
};

const _removeSoundCalibrationElems = (elems) => {
  console.log("removing sound calibration elements");
  Object.values(elems).forEach((elem) => elem.remove());
  console.log("removed sound calibration elements");
  document.querySelector("#root").style.visibility = "visible";
  console.log("removed sound calibration elements");
};

const _addSoundCss = () => {
  const styles = `
  #background {
    width: fit-content;
    height: fit-content;
    margin: auto;
  }
  #soundContainer {
    padding-left: 10px;
    padding-right: 10px;
  }
  #soundContainer > * {
    padding-top: 5px;
    padding-bottom: 5px;
  }
  #soundNavContainer > * {
    margin-right: 10px;
  }
  #displayContainer > * {
    margin: auto;
    display: flex;
    justify-content: center;
  }
  #displayContainer > div {
    padding-top: 5px;
    padding-bottom: 5px;
  }
  #displayContainer > div > div {
    height: 90px;
    width: 90px;
  }
  #soundTest {
    visibility: hidden;
    data-toggle="modal"
    data-target="#soundTestModal"
  }
  `;
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
};

const _runSoundLevelCalibration = async (elems, gains) => {
  const {
    Speaker,
    VolumeCalibration,
    UnsupportedDeviceError,
    MissingSpeakerIdError,
    CalibrationTimedOutError,
  } = speakerCalibrator;

  const speakerParameters = {
    siteUrl: "https://easy-eyes-listener-page.herokuapp.com",
    targetElementId: "displayQR",
    gainValues: gains,
    debug: debugBool.current,
  };

  // console.log(VolumeCalibration);
  const calibrator = new VolumeCalibration();

  calibrator.on("update", ({ message, ...rest }) => {
    elems.displayUpdate.innerHTML = message;
  });

  const debug = false;

  if (debug) {
    soundCalibrationResults.current = {
      outDBSPL1000Values: [103.3, 102.9, 102.0, 95.3, 85.2, 75],
      thdValues: [
        85.7, 82.1, 79.3, 78.2, 76.4, 74.5, 73.4, 70.3, 63.0, -60.1, 47.8, 11.4,
      ],
      outDBSPLValues: [
        85.7, 82.1, 79.3, 78.2, 76.4, 74.5, 73.4, 70.3, 63.0, -60.1, 47.8, 11.4,
      ],
      parameters: {
        T: 100,
        W: 10,
        R: 1000,
        backgroundDBSPL: 18.6,
        gainDBSPL: 125,
        RMSError: 0.1,
      },
    };
  } else {
    soundCalibrationResults.current = await Speaker.startCalibration(
      speakerParameters,
      calibrator
    );
  }

  if (soundCalibrationResults.current) {
    soundGainDBSPL.current =
      soundCalibrationResults.current.parameters.gainDBSPL;
    soundGainDBSPL.current = Math.round(soundGainDBSPL.current * 10) / 10;
  }
};

const _runLoudspeakerCalibration = async (elems) => {
  const {
    Speaker,
    ImpulseResponseCalibration,
    UnsupportedDeviceError,
    MissingSpeakerIdError,
    CalibrationTimedOutError,
  } = speakerCalibrator;

  const speakerParameters = {
    siteUrl: "https://easy-eyes-listener-page.herokuapp.com",
    targetElementId: "displayQR",
    debug: debugBool.current,
  };

  const calibratorParams = {
    numCaptures: 3,
    numMLSPerCapture: 2,
    download: debugBool.current,
    lowHz: calibrateSoundMinHz.current,
    highHz: calibrateSoundMaxHz.current,
  };

  const calibrator = new ImpulseResponseCalibration(calibratorParams);

  calibrator.on("update", ({ message, ...rest }) => {
    elems.displayUpdate.innerHTML = message;
  });

  const debug = false;

  if (debug) {
    invertedImpulseResponse.current = [
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    ];
  } else {
    const calibrationResults = await Speaker.startCalibration(
      speakerParameters,
      calibrator,
      500000
    );
    invertedImpulseResponse.current = calibrationResults.iir;
    allHzCalibrationResults.x_conv = calibrationResults.x_conv;
    allHzCalibrationResults.y_conv = calibrationResults.y_conv;
    allHzCalibrationResults.x_unconv = calibrationResults.x_unconv;
    allHzCalibrationResults.y_unconv = calibrationResults.y_unconv;
  }
  const { normalizedIIR, calibrationLevel } =
    getSoundCalibrationLevelDBSPLFromIIR(invertedImpulseResponse.current);
  invertedImpulseResponse.current = normalizedIIR;
  soundCalibrationLevelDBSPL.current = calibrationLevel;
};

const _runSoundLevelCalibrationAndLoudspeakerCalibration = async (
  elems,
  gains
) => {
  // elems.subtitle.innerHTML = "";
  elems.message.style.display = "none";
  const language = rc.language.value;
  thisDevice.current = await identifyDevice();

  // display the device info
  const deviceString = getDeviceString(thisDevice.current, language);
  const instructionText = getInstructionText(thisDevice.current, language);
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

  const instructions = document.createElement("p");
  instructions.id = "loudspeakerInstructions1";
  instructions.innerHTML = deviceString;

  const findModel = document.createElement("p");
  findModel.id = "loudspeakerInstructions2";
  findModel.innerHTML = instructionText;

  // add  to the page
  elems.subtitle.appendChild(findModel);
  elems.subtitle.appendChild(modelNameInput);
  elems.subtitle.appendChild(modelNumberInput);
  elems.subtitle.appendChild(instructions);
  // elems.subtitle.appendChild(p);
  // elems.subtitle.appendChild(dropdown);

  // add a proceed button
  const proceedButton = document.createElement("button");
  proceedButton.innerHTML = "Proceed";
  proceedButton.classList.add(...["btn", "btn-primary"]);
  elems.subtitle.appendChild(proceedButton);

  // add event listener to the proceed button
  return await new Promise((resolve) => {
    proceedButton.addEventListener("click", async () => {
      // get the model number and name
      loudspeakerInfo.current = {
        fullLoudspeakerModelName: modelNameInput.value,
        fullLoudspeakerModelNumber: modelNumberInput.value,
      };
      const modelNumber = modelNumberInput.value
        .toLowerCase()
        .split(" ")
        .join("");
      const modelName = modelNameInput.value.toLowerCase().split(" ").join("");

      // require the model number and name
      if (modelNumber === "" || modelName === "") {
        alert("Please enter a model number and name");
      } else {
        elems.title.innerHTML = elems.title.innerHTML.replace(1, 2);
        elems.message.style.display = "block";

        // remove the dropdown menu, instructions, proceed button, and input boxes
        removeElements([
          instructions,
          proceedButton,
          modelNumberInput,
          modelNameInput,
          findModel,
        ]);

        //  create a dropdown menu to select from "USB Microphone", "SmartPhone", "None"(default)
        const dropdown = document.createElement("select");
        dropdown.id = "micDropdown";
        dropdown.name = "micDropdown";
        const options = calibrateMicrophonesBool.current
          ? ["USB Microphone", "Smartphone", "None"]
          : ["Smartphone", "USB Microphone", "None"];
        options.forEach((option) => {
          const optionElem = document.createElement("option");
          optionElem.value = option;
          optionElem.innerHTML = option;
          dropdown.appendChild(optionElem);
        });

        const p = document.createElement("p");
        p.innerHTML = readi18nPhrases("RC_selectMicrophoneType", language);
        // "Select the type of microphone you are using for this calibration: (#Text to be added to the phrases doc)";
        p.style.fontSize = "1rem";

        // add  to the page
        elems.subtitle.appendChild(p);
        elems.subtitle.appendChild(dropdown);

        // add a proceed button
        const proceedButton2 = document.createElement("button");
        proceedButton2.innerHTML = "Proceed";
        proceedButton2.classList.add(...["btn", "btn-primary"]);
        elems.subtitle.appendChild(proceedButton2);

        // add event listener to the proceed button
        await new Promise((resolve) => {
          proceedButton2.addEventListener("click", async () => {
            if (dropdown.value === "None") {
              showExperimentEnding();
            }
            elems.title.innerHTML = elems.title.innerHTML.replace(2, 3);
            const isSmartPhone = dropdown.value === "Smartphone";
            // remove the dropdown menu, proeed button
            removeElements([dropdown, proceedButton2, p]);

            elems.subtitle.innerHTML = isSmartPhone
              ? readi18nPhrases("RC_usingSmartPhoneMicrophone", language)
              : readi18nPhrases("RC_usingUSBMicrophone", language);
            elems.subtitle.style.fontSize = "1.1rem";

            var micName = "";
            var micManufacturer = "";
            var micSerialNumber = "";
            var micModelName = "";
            var micModelNumber = "";
            if (!isSmartPhone) {
              const p = document.createElement("p");
              p.innerHTML =
                "Input information about your microphone: (#Text to be added to the phrases doc)";
              p.style.fontSize = "1rem";
              p.style.fontWeight = "normal";
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

              // add  to the page
              elems.subtitle.appendChild(p);
              elems.subtitle.appendChild(micNameInput);
              elems.subtitle.appendChild(micManufacturerInput);
              elems.subtitle.appendChild(micSerialNumberInput);

              const proceedButton3 = document.createElement("button");
              proceedButton3.innerHTML = "Proceed";
              proceedButton3.classList.add(...["btn", "btn-primary"]);
              elems.subtitle.appendChild(proceedButton3);

              // add event listener to the proceed button
              await new Promise((resolve) => {
                proceedButton3.addEventListener("click", async () => {
                  proceedButton3.innerHTML = "Loading...";
                  // get the model number and name
                  microphoneInfo.current = {
                    micFullName: micNameInput.value,
                    micrFullManufacturerName: micManufacturerInput.value,
                    micFullSerialNumber: micSerialNumberInput.value,
                  };
                  micName = micNameInput.value;
                  micManufacturer = micManufacturerInput.value
                    .toLowerCase()
                    .split(" ")
                    .join("");
                  micSerialNumber = micSerialNumberInput.value
                    .toLowerCase()
                    .split(" ")
                    .join("");

                  // require mic name, manufacturer, and serial number
                  if (
                    micName === "" ||
                    micManufacturer === "" ||
                    micSerialNumber === ""
                  ) {
                    alert(
                      "Please enter a microphone name, manufacturer, and serial number"
                    );
                    proceedButton3.innerHTML = "Proceed";
                  } else {
                    if (
                      !(await doesMicrophoneExist(
                        micSerialNumber,
                        micManufacturer
                      ))
                    ) {
                      // if the microphone is from miniDSP, fetch the microphone info
                      if (
                        micManufacturer === "minidsp" &&
                        (micName === "UMIK-1" || micName === "UMIK-2")
                      ) {
                        const serial =
                          microphoneInfo.current.micFullSerialNumber.replace(
                            "-",
                            ""
                          );
                        const url =
                          micName === "UMIK-1"
                            ? `https://www.minidsp.com/scripts/umikcal/umik90.php/${serial}_90deg.txt`
                            : `https://www.minidsp.com/scripts/umik2cal/umik90.php/${serial}_90deg.txt`;
                        const file = await getCalibrationFile(url);
                        if (file) {
                          const data = parseCalibrationFile(file);
                          const Gain = findGainatFrequency(
                            data.Freq,
                            data.Gain,
                            1000
                          );
                          // const Gain = data.SensFactor + offset;
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
                              HardwareModel:
                                microphoneInfo.current.micrFullManufacturerName,
                              HardwareName:
                                microphoneInfo.current.micrFullManufacturerName,
                              ID: microphoneInfo.current.micFullSerialNumber,
                              OEM: "minidsp",
                              PlatformName: "N/A",
                              PlatformVersion: "N/A",
                              hardwareFamily:
                                microphoneInfo.current.micrFullManufacturerName,
                              micModelName:
                                microphoneInfo.current.micrFullManufacturerName,
                            },
                          };
                          await addMicrophoneToDatabase(
                            micSerialNumber,
                            "minidsp",
                            micData
                          );
                          // remove the dropdown menu, instructions, proceed button, and input boxes
                          removeElements([
                            p,
                            proceedButton3,
                            micNameInput,
                            micManufacturerInput,
                            micSerialNumberInput,
                          ]);
                          resolve();
                        } else {
                          alert(
                            "Please make sure you have entered the correct serial number."
                          );
                        }
                      } else
                        alert(
                          "The microphone you entered does not exist in the database. Please try again."
                        );
                    } else {
                      // remove the dropdown menu, instructions, proceed button, and input boxes
                      removeElements([
                        p,
                        proceedButton3,
                        micNameInput,
                        micManufacturerInput,
                        micSerialNumberInput,
                      ]);
                      resolve();
                    }
                  }
                  proceedButton3.innerHTML = "Proceed";
                });
              });
            } else {
              // create input box for model number and name
              const modelNumberInput2 = document.createElement("input");
              modelNumberInput2.type = "text";
              modelNumberInput2.id = "modelNumberInput2";
              modelNumberInput2.name = "modelNumberInput2";
              modelNumberInput2.placeholder = "Model Number";

              const modelNameInput2 = document.createElement("input");
              modelNameInput2.type = "text";
              modelNameInput2.id = "modelNameInput2";
              modelNameInput2.name = "modelNameInput2";
              modelNameInput2.placeholder = "Model Name";

              const instructions2 = document.createElement("p");
              instructions2.id = "loudspeakerInstructions2";
              instructions2.innerHTML =
                "We need the model number and name of your microphone to identify it (#Text to be added to the phrases doc)";
              instructions2.style.fontSize = "1rem";

              // add  to the page
              elems.subtitle.appendChild(instructions2);
              elems.subtitle.appendChild(modelNameInput2);
              elems.subtitle.appendChild(modelNumberInput2);

              const proceedButton4 = document.createElement("button");
              proceedButton4.innerHTML = "Proceed";
              proceedButton4.classList.add(...["btn", "btn-primary"]);
              elems.subtitle.appendChild(proceedButton4);

              // add event listener to the proceed button
              await new Promise((resolve) => {
                proceedButton4.addEventListener("click", async () => {
                  microphoneInfo.current = {
                    micFullName: modelNameInput2.value,
                    micFullSerialNumber: modelNumberInput2.value,
                  };
                  // get the model number and name
                  micModelNumber = modelNumberInput2.value
                    .toLowerCase()
                    .split(" ")
                    .join("");
                  micModelName = modelNameInput2.value
                    .toLowerCase()
                    .split(" ")
                    .join("");

                  // require model number and name
                  if (micModelNumber === "" || micModelName === "") {
                    alert("Please enter a model number and name");
                  } else {
                    // remove the dropdown menu, instructions, proceed button, and input boxes
                    removeElements([
                      instructions2,
                      proceedButton4,
                      modelNumberInput2,
                      modelNameInput2,
                    ]);
                    resolve();
                  }
                });
              });
            }
            elems.title.innerHTML = elems.title.innerHTML.replace(3, 4);
            const microphoneInCalibrationLibrary = isSmartPhone
              ? ""
              : readi18nPhrases(
                  "RC_microphoneIsInCalibrationLibrary",
                  language
                ).replace(
                  "xxx",
                  `${microphoneInfo.current.micrFullManufacturerName} ${microphoneInfo.current.micFullName}`
                );
            const messageText = `${microphoneInCalibrationLibrary}
            ${readi18nPhrases("RC_removeHeadphones", language)}${
              isSmartPhone
                ? readi18nPhrases("RC_getPhoneMicrophoneReady", language)
                : readi18nPhrases("RC_getUSBMicrophoneReady", language)
            }`.replace(/\n/g, "<br>");
            elems.message.innerHTML = messageText;
            // line height
            elems.message.style.lineHeight = "2rem";
            const { Speaker, CombinationCalibration } = speakerCalibrator;
            const speakerParameters = {
              siteUrl: "https://easy-eyes-listener-page.herokuapp.com",
              targetElementId: "displayQR",
              debug: debugBool.current,
              gainValues: gains,
              knownIR: null,
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
              micModelNumber: micModelNumber,
              micModelName: micModelName,
              isSmartPhone: isSmartPhone,
              calibrateSoundBurstDb: Math.pow(
                10,
                calibrateSoundBurstDb.current / 20
              ),
              calibrateSoundCheck: calibrateSoundCheck.current,
              calibrateSoundIIRSec: calibrateSoundIIRSec.current,
              calibrateSound1000HzPreSec: calibrateSound1000HzPreSec.current,
              calibrateSound1000HzSec: calibrateSound1000HzSec.current,
              calibrateSound1000HzPostSec: calibrateSound1000HzPostSec.current,
              calibrateSoundBackgroundSecs:
                calibrateSoundBackgroundSecs.current,
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

            const calibrate = async (isSmartPhone) => {
              const debug = false;
              if (debug) {
                invertedImpulseResponse.current = getDebugIIR();
                soundCalibrationResults.current =
                  getDebugSoundCalibrationResults();
                return true;
              } else {
                elems.displayContainer.style.display = "flex";
                elems.displayContainer.style.marginLeft = "0px";
                elems.displayContainer.style.flexDirection = "column";
                elems.displayUpdate.style.display = "flex";
                elems.displayUpdate.style.marginLeft = "0px";
                elems.displayUpdate.style.flexDirection = "column";
                elems.displayQR.style.display = "flex";
                elems.displayQR.style.marginLeft = "0px";
                elems.displayQR.style.flexDirection = "column";
                console.log(speakerParameters);
                soundCalibrationResults.current =
                  await Speaker.startCalibration(
                    speakerParameters,
                    calibrator,
                    timeoutSec.current
                  );
                elems.recordingInProgress.innerHTML = "";
                elems.timeToCalibrate.innerHTML = "";
                elems.message.style.display = "block";
                elems.message.style.whiteSpace = "normal";
                elems.message.style.fontSize = "1.1rem";
                elems.message.style.fontWeight = "normal";
                console.log(
                  "Louspeaker Results: ",
                  soundCalibrationResults.current
                );
                if (soundCalibrationResults.current === false) {
                  return;
                }
                invertedImpulseResponse.current =
                  calibrateSoundCheck.current === "system"
                    ? soundCalibrationResults.current.system.iir
                    : soundCalibrationResults.current.component.iir;
                microphoneInfo.current = {
                  ...microphoneInfo.current,
                  ...soundCalibrationResults.current.micInfo,
                };
                microphoneInfo.current.CalibrationDate =
                  calibrationTime.current;
                if (calibrateSoundCheck.current !== "none") {
                  if (calibrateSoundCheck.current === "system") {
                    allHzCalibrationResults.system =
                      soundCalibrationResults.current.system;
                  } else if (calibrateSoundCheck.current === "goal") {
                    allHzCalibrationResults.component =
                      soundCalibrationResults.current.component;
                  } else if (calibrateSoundCheck.current === "both") {
                    allHzCalibrationResults.system =
                      soundCalibrationResults.current.system;
                    allHzCalibrationResults.component =
                      soundCalibrationResults.current.component;
                  }
                  allHzCalibrationResults.mls_psd =
                    soundCalibrationResults.current.mls_psd;
                  const OEM = microphoneInfo.current.OEM;
                  const ID = microphoneInfo.current.ID;
                  const FreqGain = await readFrqGain(ID, OEM);
                  allHzCalibrationResults.microphoneGain = FreqGain
                    ? FreqGain
                    : {};
                  allHzCalibrationResults.filteredMLSRange =
                    soundCalibrationResults.current.filteredMLSRange;
                  if (calibrateSoundBackgroundSecs.current > 0) {
                    allHzCalibrationResults.background = {
                      x_background:
                        soundCalibrationResults.current.background_noise
                          ?.x_background,
                      y_background:
                        soundCalibrationResults.current.background_noise
                          ?.y_background,
                    };
                  }
                }
                allHzCalibrationResults.knownIr =
                  soundCalibrationResults.current.component.ir;

                soundGainDBSPL.current =
                  soundCalibrationResults.current.parameters.gainDBSPL;
                soundGainDBSPL.current =
                  Math.round(soundGainDBSPL.current * 10) / 10;
              }
              const { normalizedIIR, calibrationLevel } =
                getSoundCalibrationLevelDBSPLFromIIR(
                  invertedImpulseResponse.current
                );
              invertedImpulseResponse.current = normalizedIIR;
              soundCalibrationLevelDBSPL.current = calibrationLevel;
              return true;
            };

            const result = await calibrate(isSmartPhone);
            if (result) {
              try {
                loudspeakerInfo.current = {
                  ...loudspeakerInfo.current,
                  ModelName: modelName,
                  ID: modelNumber,
                  isSmartPhone: isSmartPhone,
                  HardwareName: thisDevice.current.HardwareName,
                  HardwareModel: thisDevice.current.HardwareModel,
                  HardwareModelVariants:
                    thisDevice.current.HardwareModelVariants,
                  HardwareFamily: thisDevice.current.HardwareFamily,
                  OEM: thisDevice.current.OEM,
                  DeviceType: thisDevice.current.DeviceType,
                  DeviceId: thisDevice.current.DeviceId,
                  PlatformName: thisDevice.current.PlatformName,
                  PlatformVersion: thisDevice.current.PlatformVersion,
                  gainDBSPL:
                    Math.round(
                      (soundGainDBSPL.current -
                        microphoneInfo.current.gainDBSPL) *
                        10
                    ) / 10,
                  CalibrationDate: calibrationTime.current,
                  micInfo: microphoneInfo.current,
                };
                await saveLoudSpeakerInfo(
                  loudspeakerInfo.current,
                  modelNumber,
                  thisDevice.current.OEM,
                  invertedImpulseResponse.current,
                  soundCalibrationResults.current.component.ir
                );
              } catch (err) {
                console.log(err);
              }

              resolve(true);
            }
          });
        });

        resolve(true);
      }
    });
  });
};

/* -------------------------------------------------------------------------- */

const getCmValue = (numericalValue, unit) => {
  if (unit === "cm") return numericalValue;
  else return numericalValue * 2.54;
};
