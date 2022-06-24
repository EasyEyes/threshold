import { phrases } from "./i18n";
import { debug, ifTrue, loggerText } from "./utils";
import { soundGainDBSPL, invertedImpulseResponse, rc } from "./global";
import { GLOSSARY } from "../parameters/glossary.ts";
import { quitPsychoJS } from "./lifetime";

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

  // if (
  //   ifTrue(reader.read(GLOSSARY.calibrateSoundLevelBool.name, "__ALL_BLOCKS__"))
  // )
  //   // setup panel for sound level calibration
  //   tasks.push({
  //     name: "[Sound Level]",
  //     function: async () => {
  //       if (!(await calibrateAudio(reader))) quitPsychoJS("", "", reader);
  //     },
  //   });

  // if (
  //   ifTrue(
  //     reader.read(GLOSSARY.calibrateLoudspeakerBool.name, "__ALL_BLOCKS__")
  //   )
  // )
  //   // setup panel for loudspeaker calibration
  //   tasks.push({
  //     name: "[Loudspeaker]",
  //     function: async () => {
  //       if (!(await calibrateAudio(reader))) quitPsychoJS("", "", reader);
  //     },
  //   });

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
      document.querySelector("#soundYes").style.display = "none";
      document.querySelector("#soundNo").style.display = "none";

      if (calibrateSoundLevel) await _runSoundLevelCalibration();
      else await _runLoudspeakerCalibration();

      elems.display.style.display = "none";
      elems.message.innerHTML =
        copy.done +
        (calibrateSoundLevel
          ? "\nMeasured soundGainDBSPL " + String(soundGainDBSPL.current)
          : "");
      elems.yesButton.innerHTML = "Continue to experiment.";
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

const _buildSoundCalibrationUI = (type = 0) => {
  const lang = rc.language.value;
  const elements = {
    soundContainer: {
      id: "soundContainer",
      copy: null,
      classList: ["popup"],
    },
    soundTitle: {
      id: "soundTitle",
      copy:
        type == 0
          ? phrases.RC_soundCalibrationTitle[lang]
          : "Loudspeaker Calibration",
    },
    soundSubtitle: {
      id: "soundSubtitle",
      copy: phrases.RC_soundCalibration[lang],
    },
    soundMessage: {
      id: "soundMessage",
      copy: phrases.RC_soundCalibrationNeedsIPhone[lang],
    },
    soundDisplay: {
      id: "soundDisplay",
      copy: null,
    },
    soundNavContainer: {
      id: "soundNavContainer",
      copy: null,
    },
    soundYes: {
      id: "soundYes",
      copy: phrases.RC_soundCalibrationYes[lang],
    },
    soundNo: {
      id: "soundNo",
      copy: phrases.RC_soundCalibrationNo[lang],
    },
  };
  const htmlString = `
  <div id=${
    elements.soundContainer.id
  } class=${elements.soundContainer.classList.join(" ")}>
    <h1 id=${elements.soundTitle.id}>${elements.soundTitle.copy}</h1>
    <h2 id=${elements.soundSubtitle.id}>${elements.soundSubtitle.copy}</h2>
    <p id=${elements.soundMessage.id}>${elements.soundMessage.copy}</p>
    <div id=${elements.soundDisplay.id}></div>
    <div id=${elements.soundNavContainer.id}>
        <button id=${elements.soundYes.id}>${elements.soundYes.copy}</button>
        <button id=${elements.soundNo.id}>${elements.soundNo.copy}</button>
    </div>
  </div>
  `;
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  return doc.body;
};

const _addSoundCalibrationElems = (copy) => {
  document.querySelector("#root").style.visibility = "hidden";
  const title = document.createElement("h1");
  const subtitle = document.createElement("h2");
  const container = document.createElement("div");
  const message = document.createElement("div");
  const display = document.createElement("div");
  const navContainer = document.createElement("div");
  const yesButton = document.createElement("button");
  const noButton = document.createElement("button");
  const elems = {
    title,
    subtitle,
    display,
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
  display.setAttribute("id", "soundDisplay");
  navContainer.setAttribute("id", "soundNavContainer");
  yesButton.setAttribute("id", "soundYes");
  noButton.setAttribute("id", "soundNo");

  title.innerHTML = copy.soundCalibration;
  subtitle.innerHTML = copy.title;
  message.innerHTML = copy.neediPhone;
  yesButton.innerHTML = copy.yes;
  noButton.innerHTML = copy.no;

  container.classList.add("popup");

  container.appendChild(title);
  container.appendChild(subtitle);
  container.appendChild(message);
  container.appendChild(display);
  container.appendChild(navContainer);
  navContainer.appendChild(yesButton);
  navContainer.appendChild(noButton);
  document.body.appendChild(container);

  _addSoundCss();

  return elems;
};

const _removeSoundCalibrationElems = (elems) => {
  Object.values(elems).forEach((elem) => elem.remove());
  document.querySelector("#root").style.visibility = "visible";
};

const _addSoundCss = () => {
  const styles = `
  #soundContainer {
    width: 100%;
    height: 100%;
    margin: auto;
  }
  #soundNavContainer > * {
    margin-right: 10px;
    margin-top: 10px;
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
    numCalibrationRounds: 1,
    numCalibrationNodes: 1,
    download: false,
  };

  try {
    soundGainDBSPL.current = await Speaker.startCalibration(
      speakerParameters,
      VolumeCalibration,
      calibratorParams
    );
  } catch (e) {
    if (e instanceof UnsupportedDeviceError) {
      // Do something here
      resolve(false);
    }
    if (e instanceof MissingSpeakerIdError) {
      // Do something here
      resolve(false);
    }
    if (e instanceof CalibrationTimedOutError) {
      // Do something here
      resolve(false);
    }
  }
};

const _runLoudspeakerCalibration = async () => {
  const {
    Speaker,
    ImpulseResponseCalibration,
    UnsupportedDeviceError,
    MissingSpeakerIdError,
    CalibrationTimedOutError,
  } = speakerCalibrator;

  const speakerParameters = {
    siteUrl: "https://hqjq0u.deta.dev",
    targetElementId: "soundDisplay",
  };

  const calibratorParams = {
    numCalibrationRounds: 2,
    numCalibrationNodes: 4,
    download: false,
  };

  const debug = true;

  if (debug) {
    invertedImpulseResponse.current = [
      1, 3, 4, 5, -1, -2, 5, -8, 10, -1, 5, 9, 0,
    ];
  } else {
    try {
      invertedImpulseResponse.current = await Speaker.startCalibration(
        speakerParameters,
        ImpulseResponseCalibration,
        calibratorParams
      );
    } catch (e) {
      if (e instanceof UnsupportedDeviceError) {
        // Do something here
        console.log(e);
        resolve(false);
      } else if (e instanceof MissingSpeakerIdError) {
        // Do something here
        console.log(e);
        resolve(false);
      } else if (e instanceof CalibrationTimedOutError) {
        // Do something here
        console.log(e);
        resolve(false);
      } else {
        console.log(e);
      }
    }
  }
};

/* -------------------------------------------------------------------------- */

const getCmValue = (numericalValue, unit) => {
  if (unit === "cm") return numericalValue;
  else return numericalValue * 2.54;
};
