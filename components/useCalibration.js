import { readi18nPhrases } from "./readPhrases";
import { debug, ifTrue, loggerText } from "./utils";
import {
  soundGainDBSPL,
  invertedImpulseResponse,
  rc,
  soundCalibrationLevelDBSPL,
  soundCalibrationResults,
  debugBool,
  ICalibDBSPL,
  allHzCalibrationResults,
  calibrateSoundMinHz,
  calibrateSoundMaxHz,
  calibrateMicrophonesBool,
  microphoneCalibrationResults,
} from "./global";
import { GLOSSARY } from "../parameters/glossary.ts";
import {
  addSoundTestElements,
  displayParameters1000Hz,
  displayParametersAllHz,
} from "./soundTest";
import { getSoundCalibrationLevelDBSPLFromIIR } from "./soundUtils";
import { showExperimentEnding } from "./forms";
import { ref, set, get, child } from "firebase/database";
import database from "./firebase/firebase.js";

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

  const showSoundCalibrationResultsBool = ifTrue(
    reader.read(
      GLOSSARY._showSoundCalibrationResultsBool.name,
      "__ALL_BLOCKS__"
    )
  );
  const showSoundTestPageBool = ifTrue(
    reader.read(GLOSSARY._showSoundTestPageBool.name, "__ALL_BLOCKS__")
  );

  calibrateSoundMinHz.current = reader.read(
    GLOSSARY.calibrateSoundMinHz.name
  )[0];
  calibrateSoundMaxHz.current = reader.read(
    GLOSSARY.calibrateSoundMaxHz.name
  )[0];

  ICalibDBSPL.current = reader.read(
    GLOSSARY._calibrateSoundAssumingThisICalibDBSPL.name
  )[0];
  const soundLevels = reader
    .read(GLOSSARY.calibrateSound1000HzDB.name)[0]
    .split(",");
  // convert soundLevels to numbers
  for (let i = 0; i < soundLevels.length; i++) {
    soundLevels[i] = parseFloat(soundLevels[i]);
  }
  // const soundLevels = [-60, -50, -40, -30, -20, -15,-10, -3.1]
  // const soundLevels = [-3.1, -13.1];
  // const soundLevels = [-3.1, -10,-20,-30,-40, -50]
  // change sound Levels to gain values
  const gains = soundLevels.map((soundLevel) => {
    return Math.pow(10, soundLevel / 20);
  });

  if (!(calibrateSoundLevel || calibrateLoudspeaker)) return true;

  return new Promise(async (resolve) => {
    const lang = rc.language.value;
    const copy = {
      title: calibrateSoundLevel
        ? readi18nPhrases("RC_soundCalibrationTitle1000Hz", lang)
        : readi18nPhrases("RC_soundCalibrationTitleAllHz", lang),
      soundCalibration: readi18nPhrases("RC_soundCalibration", lang),
      neediPhone: readi18nPhrases("RC_soundCalibrationNeedsIPhone", lang),
      yes: readi18nPhrases("RC_soundCalibrationYes", lang),
      no: readi18nPhrases("RC_soundCalibrationNo", lang),
      qr: readi18nPhrases("RC_soundCalibrationQR", lang),
      holdiPhoneOK: readi18nPhrases("RC_soundCalibrationContinue", lang),
      clickToStart: readi18nPhrases("RC_soundCalibrationClickToStart", lang),
      done: readi18nPhrases("RC_soundCalibrationDone", lang),
      test: "Test", //include in phrases doc
      citation:
        'Measured sound power is modeled as sum of background sound power and power gain times digital sound power. Microphone compression modeled by Eq. 4 of Giannoulis, Massberg, & Reiss (2012). "Digital Dynamic Range Compressor Design — A Tutorial and Analysis." Journal of Audio Engineering Society. 60 (6): 399–408.',
      calibrateMicrophone: "Calibrate a Microphone",
    };

    const elems = _addSoundCalibrationElems(copy);

    document.querySelector("#soundYes").addEventListener("click", async (e) => {
      document.querySelector("#soundMessage").innerHTML = copy.qr.replace(
        /\n/g,
        "<br>"
      );
      document.querySelector("#soundNavContainer").style.display = "none";
      document.querySelector("#soundNo").style.display = "none";

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
      // Now that loudspeaker calibration is done, present users with two options: continue to experiment or calibrate microphone

      // if calibrateMicrophonesBool is true, then provide the option to calibrate the phone mic or to continue.
      // if user chooses to calibrate mic, then at the end of the calibration, user will be presented with the option to calibrate another mic or to continue.
      // for now simulate the mic calibration by 5 seconds pause then provide the option to calibrate another mic or to continue.
      // do this until the user chooses to continue.

      while (calibrateMicrophonesBool.current) {
        // provide the option to calibrate another mic or to continue.
        elems.calibrateMicrophoneButton.style.display = "block";
        elems.continueButton.style.display = "block";
        document.querySelector("#soundNavContainer").style.display = "flex";

        await new Promise(async (resolve) => {
          elems.calibrateMicrophoneButton.addEventListener(
            "click",
            async (e) => {
              elems.message.innerHTML = copy.qr.replace(/\n/g, "<br>");
              elems.calibrateMicrophoneButton.style.display = "none";
              elems.continueButton.style.display = "none";

              // provide an input field for the user to enter an id(name) for the mic
              // create an input field
              const input = document.createElement("input");
              input.setAttribute("type", "text");
              input.setAttribute("id", "micId");
              input.setAttribute("placeholder", "Enter a name for the mic");
              input.setAttribute(
                "style",
                "margin-top: 10px; margin-bottom: 10px;"
              );
              input.style.size = 20;
              input.style.width = "50%";
              elems.message.appendChild(input);
              // create a button to submit the input
              const proceedButton = document.createElement("button");
              proceedButton.setAttribute("id", "proceedButtonMicName");
              proceedButton.classList.add(...["btn", "btn-primary"]);
              proceedButton.innerHTML = "Proceed";
              elems.message.appendChild(proceedButton);

              // when the button is clicked, get the value of the input field and store it in the micId variable
              await new Promise((resolve) => {
                proceedButton.addEventListener("click", async (e) => {
                  elems.displayQR.style.display = "block";
                  const micId = input.value;
                  if (micId !== "") {
                    // remove the input field and the button
                    input.remove();
                    proceedButton.remove();
                    const { Speaker, CombinationCalibration } =
                      speakerCalibrator;

                    const speakerParameters = {
                      siteUrl: "https://easy-eyes-listener-page.herokuapp.com",
                      targetElementId: "displayQR",
                      debug: debugBool.current,
                      ICalib: ICalibDBSPL.current,
                      gainValues: gains,
                      knownIR: allHzCalibrationResults.knownIr,
                    };

                    const calibratorParams = {
                      numCaptures: 3,
                      numMLSPerCapture: 4,
                      download: debugBool.current,
                      lowHz: calibrateSoundMinHz.current,
                      highHz: calibrateSoundMaxHz.current,
                    };

                    const calibrator = new CombinationCalibration(
                      calibratorParams
                    );

                    calibrator.on("update", ({ message, ...rest }) => {
                      elems.displayUpdate.innerHTML = message;
                    });

                    const debug = false;

                    if (debug) {
                      invertedImpulseResponse.current = [
                        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                        1, 1,
                      ];
                      soundCalibrationResults.current = {
                        outDBSPL1000Values: [
                          103.3, 102.9, 102.0, 95.3, 85.2, 75,
                        ],
                        thdValues: [
                          85.7, 82.1, 79.3, 78.2, 76.4, 74.5, 73.4, 70.3, 63.0,
                          -60.1, 47.8, 11.4,
                        ],
                        outDBSPLValues: [
                          85.7, 82.1, 79.3, 78.2, 76.4, 74.5, 73.4, 70.3, 63.0,
                          -60.1, 47.8, 11.4,
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
                      elems.displayUpdate.style.display = "block";
                      speakerParameters.microphoneName = micId;
                      const result = await Speaker.startCalibration(
                        speakerParameters,
                        calibrator,
                        500000
                      );
                      microphoneCalibrationResults.push({
                        micId: micId,
                        result: result,
                      });
                    }
                    resolve();
                  }
                });
              });

              resolve();
            }
          );

          elems.continueButton.addEventListener("click", async (e) => {
            elems.calibrateMicrophoneButton.style.display = "none";
            elems.continueButton.style.display = "none";
            calibrateMicrophonesBool.current = false;
            resolve();
          });
        });
      }

      if (!showSoundTestPageBool) {
        _removeSoundCalibrationElems(Object.values(elems));
        resolve(true);
      }

      if (
        calibrateSoundLevel &&
        soundCalibrationResults.current &&
        invertedImpulseResponse.current &&
        allHzCalibrationResults &&
        showSoundCalibrationResultsBool
      ) {
        displayParameters1000Hz(
          elems,
          soundLevels,
          soundCalibrationResults.current
        );
        displayParametersAllHz(
          elems,
          invertedImpulseResponse.current,
          allHzCalibrationResults
        );
        if (microphoneCalibrationResults.length > 0) {
          microphoneCalibrationResults.forEach((micResult) => {
            displayParameters1000Hz(
              elems,
              soundLevels,
              micResult.result,
              "1000 Hz Calibration Results for " + micResult.micId
            );
            displayParametersAllHz(
              elems,
              micResult.result.iir,
              micResult.result,
              "All Hz Calibration Results for " + micResult.micId
            );
          });
        }
      } else if (
        calibrateLoudspeaker &&
        invertedImpulseResponse.current &&
        allHzCalibrationResults &&
        showSoundCalibrationResultsBool
      ) {
        displayParametersAllHz(
          elems,
          invertedImpulseResponse.current,
          allHzCalibrationResults
        );
      } else if (
        calibrateSoundLevel &&
        soundCalibrationResults.current &&
        showSoundCalibrationResultsBool
      ) {
        displayParameters1000Hz(
          elems,
          soundLevels,
          soundCalibrationResults.current
        );
      }

      elems.yesButton.innerHTML = "Continue to experiment.";
      document.querySelector("#soundNavContainer").style.display = "flex";
      document.querySelector("#soundYes").style.display = "block";

      if (debugBool.current) {
        elems.testButton.style.display = "block";
        elems.testButton.style.visibility = "visible";
        elems.testButton.addEventListener("click", async (e) => {
          addSoundTestElements(reader);
          $("#soundTestModal").modal("show");
        });
      }

      elems.yesButton.addEventListener("click", async (e) => {
        _removeSoundCalibrationElems(Object.values(elems));
        resolve(true);
      });
    });

    document.querySelector("#soundNo").addEventListener("click", (e) => {
      _removeSoundCalibrationElems(Object.values(elems));
      resolve(false);
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
  const displayUpdate = document.createElement("div");
  const citation = document.createElement("div");
  const navContainer = document.createElement("div");
  const yesButton = document.createElement("button");
  const noButton = document.createElement("button");
  const testButton = document.createElement("button");
  const soundLevelsTable = document.createElement("table");
  const soundTestContainer = document.createElement("div");
  const soundParametersFromCalibration = document.createElement("div");
  const soundTestPlots = document.createElement("div");
  const downloadButton = document.createElement("button");
  const buttonAndParametersContainer = document.createElement("div");
  const calibrateMicrophoneButton = document.createElement("button");
  const continueButton = document.createElement("button");
  const elems = {
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
    soundParametersFromCalibration,
    soundTestPlots,
    soundTestContainer,
    downloadButton,
    buttonAndParametersContainer,
    citation,
    calibrateMicrophoneButton,
    continueButton,
  };

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

  title.innerHTML = copy.soundCalibration;
  subtitle.innerHTML = copy.title;
  message.innerHTML = copy.neediPhone;
  yesButton.innerHTML = copy.yes;
  noButton.innerHTML = copy.no;
  testButton.innerHTML = copy.test;
  testButton.style.display = "none";
  citation.innerHTML = copy.citation;
  citation.style.fontSize = "0.8em";
  citation.style.visibility = "hidden";
  calibrateMicrophoneButton.innerHTML = copy.calibrateMicrophone;
  calibrateMicrophoneButton.style.display = "none";
  continueButton.innerHTML = "Continue";
  continueButton.style.display = "none";

  background.classList.add(...["sound-calibration-background", "rc-panel"]);
  // avoid background being clipped from the top
  // background.style.marginTop = "5vh";
  container.classList.add(...["container"]);
  yesButton.classList.add(...["btn", "btn-primary"]);
  noButton.classList.add(...["btn", "btn-secondary"]);
  testButton.classList.add(...["btn", "btn-success"]);
  calibrateMicrophoneButton.classList.add(...["btn", "btn-primary"]);
  continueButton.classList.add(...["btn", "btn-success"]);
  //make download button invisible
  downloadButton.style.visibility = "hidden";

  background.appendChild(container);
  container.appendChild(title);
  container.appendChild(subtitle);
  container.appendChild(message);
  container.appendChild(navContainer);
  navContainer.appendChild(yesButton);
  navContainer.appendChild(noButton);
  navContainer.appendChild(testButton);
  navContainer.appendChild(calibrateMicrophoneButton);
  navContainer.appendChild(continueButton);
  container.appendChild(displayContainer);
  displayContainer.appendChild(displayQR);
  displayContainer.appendChild(displayUpdate);
  buttonAndParametersContainer.appendChild(soundParametersFromCalibration);
  buttonAndParametersContainer.appendChild(downloadButton);
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

const getMicrophoneNamesFromDatabase = async () => {
  const dbRef = ref(database);
  const snapshot = await get(child(dbRef, "Microphone"));
  if (snapshot.exists()) {
    return Object.keys(snapshot.val());
  }
  return null;
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
    ICalib: ICalibDBSPL.current,
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
    numMLSPerCapture: 4,
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
    // only use the first 100 values
    // invertedImpulseResponse.current = invertedImpulseResponse.current.slice(
    //   0,
    //   100
    // );
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
  // await _runSoundLevelCalibration(elems, gains);
  // (elems.subtitle.innerHTML =
  //   readi18nPhrases("RC_soundCalibrationTitleAllHz", rc.language.value)),
  //   await _runLoudspeakerCalibration(elems);

  elems.subtitle.innerHTML = "";
  // hide elems.message
  elems.message.style.display = "none";
  const {
    Speaker,
    CombinationCalibration,
    UnsupportedDeviceError,
    MissingSpeakerIdError,
    CalibrationTimedOutError,
  } = speakerCalibrator;

  const speakerParameters = {
    siteUrl: "https://easy-eyes-listener-page.herokuapp.com",
    targetElementId: "displayQR",
    debug: debugBool.current,
    ICalib: ICalibDBSPL.current,
    gainValues: gains,
    knownIR: null,
  };

  const calibratorParams = {
    numCaptures: 3,
    numMLSPerCapture: 4,
    download: debugBool.current,
    lowHz: calibrateSoundMinHz.current,
    highHz: calibrateSoundMaxHz.current,
  };

  const calibrator = new CombinationCalibration(calibratorParams);

  calibrator.on("update", ({ message, ...rest }) => {
    elems.displayUpdate.innerHTML = message;
  });

  //show a dropdown menu to select a mic from list of mics in our database
  const language = rc.language.value;
  const micList = await getMicrophoneNamesFromDatabase();
  // create a dropdown menu
  const instructions = document.createElement("p");
  instructions.innerHTML = readi18nPhrases("RC_selectMicrophone", language);
  const dropdown = document.createElement("select");
  dropdown.id = "micList";
  dropdown.name = "micList";
  // pick "No match" as the default
  const defaultMic = document.createElement("option");
  defaultMic.value = "No match";
  defaultMic.text = "No match";
  dropdown.appendChild(defaultMic);

  // add options to the dropdown menu
  micList.forEach((mic) => {
    const option = document.createElement("option");
    option.value = mic;
    option.text = mic;
    dropdown.appendChild(option);
  });

  // css
  dropdown.style.width = "25%";
  dropdown.style.height = "100%";
  dropdown.style.fontSize = "1rem";
  dropdown.style.fontWeight = "bold";
  dropdown.style.color = "black";
  dropdown.style.backgroundColor = "white";
  dropdown.style.border = "none";
  dropdown.style.borderRadius = "0.5rem";

  instructions.style.width = "100%";
  instructions.style.fontSize = "1.1rem";
  instructions.style.fontWeight = "normal";

  // add the dropdown menu to the page
  elems.subtitle.appendChild(instructions);
  elems.subtitle.appendChild(dropdown);

  // add a proceed button
  const proceedButton = document.createElement("button");
  proceedButton.innerHTML = "Proceed";
  proceedButton.classList.add(...["btn", "btn-primary"]);

  elems.subtitle.appendChild(proceedButton);

  // add event listener to the proceed button
  return await new Promise((resolve) => {
    proceedButton.addEventListener("click", async () => {
      elems.message.style.display = "block";
      // get the selected mic
      const selectedMic = dropdown.options[dropdown.selectedIndex].value;

      // if no match is selected return false
      if (selectedMic === "No match") {
        showExperimentEnding();
      }

      // hide the dropdown menu and proceed button
      dropdown.style.display = "none";
      instructions.style.display = "none";
      proceedButton.style.display = "none";

      const debug = false;

      if (debug) {
        invertedImpulseResponse.current = [
          1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        ];
        soundCalibrationResults.current = {
          outDBSPL1000Values: [103.3, 102.9, 102.0, 95.3, 85.2, 75],
          thdValues: [
            85.7, 82.1, 79.3, 78.2, 76.4, 74.5, 73.4, 70.3, 63.0, -60.1, 47.8,
            11.4,
          ],
          outDBSPLValues: [
            85.7, 82.1, 79.3, 78.2, 76.4, 74.5, 73.4, 70.3, 63.0, -60.1, 47.8,
            11.4,
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
        speakerParameters.microphoneName = selectedMic;
        soundCalibrationResults.current = await Speaker.startCalibration(
          speakerParameters,
          calibrator,
          500000
        );

        if (soundCalibrationResults.current === false) {
          resolve(false);
        }

        // console.log("calibrationResults", soundCalibrationResults.current);

        invertedImpulseResponse.current = soundCalibrationResults.current.iir;
        allHzCalibrationResults.x_conv = soundCalibrationResults.current.x_conv;
        allHzCalibrationResults.y_conv = soundCalibrationResults.current.y_conv;
        allHzCalibrationResults.x_unconv =
          soundCalibrationResults.current.x_unconv;
        allHzCalibrationResults.y_unconv =
          soundCalibrationResults.current.y_unconv;
        allHzCalibrationResults.knownIr =
          soundCalibrationResults.current.componentIR;

        soundGainDBSPL.current =
          soundCalibrationResults.current.parameters.gainDBSPL;
        soundGainDBSPL.current = Math.round(soundGainDBSPL.current * 10) / 10;
      }
      const { normalizedIIR, calibrationLevel } =
        getSoundCalibrationLevelDBSPLFromIIR(invertedImpulseResponse.current);
      invertedImpulseResponse.current = normalizedIIR;
      soundCalibrationLevelDBSPL.current = calibrationLevel;

      resolve(true);
    });
  });
};

/* -------------------------------------------------------------------------- */

const getCmValue = (numericalValue, unit) => {
  if (unit === "cm") return numericalValue;
  else return numericalValue * 2.54;
};
