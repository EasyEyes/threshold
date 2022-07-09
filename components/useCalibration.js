import { phrases } from "./i18n";
import { debug, ifTrue, loggerText } from "./utils";
import { soundGainDBSPL, invertedImpulseResponse, rc } from "./global";
import { GLOSSARY } from "../parameters/glossary.ts";

export const useCalibration = (reader) => {
  return ifTrue([
    ...reader.read("calibrateFrameRateUnderStressBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateBlindSpotBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateScreenSizeBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateTrackDistanceBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateTrackGazeBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateTrackNearPointBool", "__ALL_BLOCKS__"),
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
          reader.read("calibrateTrackNearPointBool", "__ALL_BLOCKS__")
        ),
        showVideo: false,
        desiredDistanceCm: reader.has("viewingDistanceDesiredCm")
          ? reader.read("viewingDistanceDesiredCm")[0]
          : undefined,
        desiredDistanceTolerance: reader.read("viewingDistanceAllowedRatio")[0],
        desiredDistanceMonitor: reader.has("viewingDistanceDesiredCm"),
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
      reader.read(GLOSSARY.calibrateSoundLevelBool.name, "__ALL_BLOCKS__")
    ),
    ifTrue(
      reader.read(GLOSSARY.calibrateLoudspeakerBool.name, "__ALL_BLOCKS__")
    ),
  ];

  if (!(calibrateSoundLevel || calibrateLoudspeaker)) return true;

  return new Promise(async (resolve) => {
    const lang = rc.language.value;
    const copy = {
      title: calibrateSoundLevel
        ? phrases.RC_soundCalibrationTitle[lang]
        : "Loudspeaker Level",
      soundCalibration: phrases.RC_soundCalibration[lang],
      neediPhone: phrases.RC_soundCalibrationNeedsIPhone[lang],
      yes: phrases.RC_soundCalibrationYes[lang],
      no: phrases.RC_soundCalibrationNo[lang],
      qr: phrases.RC_soundCalibrationQR[lang],
      holdiPhoneOK: phrases.RC_soundCalibrationHoldIPhoneOk[lang],
      clickToStart: phrases.RC_soundCalibrationClickToStart[lang],
      done: phrases.RC_soundCalibrationDone[lang],
    };

    const elems = _addSoundCalibrationElems(copy);

    document.querySelector("#soundYes").addEventListener("click", async (e) => {
      document.querySelector("#soundMessage").innerHTML = copy.qr;
      document.querySelector("#soundNavContainer").style.display = "none";
      document.querySelector("#soundNo").style.display = "none";

      try {
        if (calibrateSoundLevel) {
          await _runSoundLevelCalibration();
        } else {
          await _runLoudspeakerCalibration(elems);
        }
      } catch (e) {
        if (e instanceof speakerCalibrator.UnsupportedDeviceError) {
          alert(`${e}: Your Movile Device is incompatiable with this test`);
          resolve(false);
        }
        if (e instanceof speakerCalibrator.CalibrationTimedOutError) {
          alert(`${e}: Something went wrong during this step`);
          resolve(false);
        }
        console.error(e);
      }

      elems.displayQR.style.display = "none";
      elems.message.innerHTML =
        copy.done +
        (calibrateSoundLevel
          ? "\nMeasured soundGainDBSPL " + String(soundGainDBSPL.current)
          : "");
      elems.yesButton.innerHTML = "Continue to experiment.";
      document.querySelector("#soundNavContainer").style.display = "block";
      document.querySelector("#soundYes").style.display = "block";
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
  const navContainer = document.createElement("div");
  const yesButton = document.createElement("button");
  const noButton = document.createElement("button");
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

  title.innerHTML = copy.soundCalibration;
  subtitle.innerHTML = copy.title;
  message.innerHTML = copy.neediPhone;
  yesButton.innerHTML = copy.yes;
  noButton.innerHTML = copy.no;

  background.classList.add(...["popup", "rc-panel"]);
  container.classList.add(...["container"]);
  yesButton.classList.add(...["btn", "btn-primary"]);
  noButton.classList.add(...["btn", "btn-secondary"]);

  background.appendChild(container);
  container.appendChild(title);
  container.appendChild(subtitle);
  container.appendChild(message);
  container.appendChild(navContainer);
  navContainer.appendChild(yesButton);
  navContainer.appendChild(noButton);
  container.appendChild(displayContainer);
  displayContainer.appendChild(displayQR);
  displayContainer.appendChild(displayUpdate);
  document.body.appendChild(background);

  _addSoundCss();

  return elems;
};

const _removeSoundCalibrationElems = (elems) => {
  Object.values(elems).forEach((elem) => elem.remove());
  document.querySelector("#root").style.visibility = "visible";
};

const _addSoundCss = () => {
  const styles = `
  #background {
    width: 60%;
    height: fit-content;
    margin: auto;
  }
  #soundContainer {
    height: 100%;
    width: 100%;
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
  `;
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
};

const _runSoundLevelCalibration = async () => {
  const {
    Speaker,
    VolumeCalibration,
    UnsupportedDeviceError,
    MissingSpeakerIdError,
    CalibrationTimedOutError,
  } = speakerCalibrator;

  const speakerParameters = {
    siteUrl: "https://hqjq0u.deta.dev",
    targetElementId: "soundDisplay",
  };

  const calibratorParams = {
    numCaptures: 5,
    numMLSPerCapture: 4,
    download: false,
  };

  soundGainDBSPL.current = await Speaker.startCalibration(
    speakerParameters,
    VolumeCalibration,
    calibratorParams
  );
};

const _runLoudspeakerCalibration = async (elems) => {
  console.log("Here");
  const {
    Speaker,
    ImpulseResponseCalibration,
    UnsupportedDeviceError,
    MissingSpeakerIdError,
    CalibrationTimedOutError,
  } = speakerCalibrator;

  const speakerParameters = {
    siteUrl: "https://hqjq0u.deta.dev",
    targetElementId: "displayQR",
  };

  const calibratorParams = {
    numCaptures: 3,
    numMLSPerCapture: 3,
    download: false,
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
    invertedImpulseResponse.current = await Speaker.startCalibration(
      speakerParameters,
      calibrator
    );
  }
};

/* -------------------------------------------------------------------------- */

const getCmValue = (numericalValue, unit) => {
  if (unit === "cm") return numericalValue;
  else return numericalValue * 2.54;
};
