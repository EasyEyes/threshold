import { phrases } from "./i18n";
import { debug, ifTrue, logger, loggerText } from "./utils";
import { soundGainDBSPL, rc } from "./global";

export const useCalibration = (reader) => {
  return ifTrue([
    ...reader.read("calibrateTestPerformanceBool", "__ALL_BLOCKS__"),
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

  if (ifTrue(reader.read("calibrateScreenSizeBool", "__ALL_BLOCKS__")))
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
        calibrationCount: debug ? 3 : 3,
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
  if (!ifTrue(reader.read("calibrateSoundLevelBool", "__ALL_BLOCKS__")))
    return true;
  return new Promise(async (resolve) => {
    const lang = rc.language.value;
    const copy = {
      title: phrases.RC_soundCalibrationTitle[lang],
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
      const speakerParameters = {
        siteUrl: "https://hqjq0u.deta.dev",
        targetElementId: "soundDisplay",
      };
      const { Speaker, VolumeCalibration } = speakerCalibrator;
      document.querySelector("#soundMessage").innerHTML = copy.qr;
      document.querySelector("#soundYes").style.display = "none";
      document.querySelector("#soundNo").style.display = "none";
      soundGainDBSPL.current = await Speaker.startCalibration(
        speakerParameters,
        VolumeCalibration
      );

      elems.display.style.display = "none";
      elems.message.innerHTML =
        copy.done +
        "\nMeasured soundGainDBSPL " +
        String(soundGainDBSPL.current);
      elems.yes.innerHTML = "Continue to experiment.";
      document.querySelector("#soundYes").style.display = "block";
      elems.yes.addEventListener("click", async (e) => {
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
  const titleElem = document.createElement("h1");
  const messageElem = document.createElement("p");
  const container = document.createElement("div");
  const displayElem = document.createElement("div");
  const yesButton = document.createElement("button");
  const noButton = document.createElement("button");
  const elems = {
    title: titleElem,
    message: messageElem,
    display: displayElem,
    yes: yesButton,
    no: noButton,
    container: container,
  };

  titleElem.setAttribute("id", "soundTitle");
  messageElem.setAttribute("id", "soundMessage");
  container.setAttribute("id", "soundContainer");
  displayElem.setAttribute("id", "soundDisplay");
  yesButton.setAttribute("id", "soundYes");
  noButton.setAttribute("id", "soundNo");

  titleElem.innerHTML =
    "<p>" + copy.soundCalibration + "</p><p>" + copy.title + "</p>";
  messageElem.innerHTML = copy.neediPhone;
  yesButton.innerHTML = copy.yes;
  noButton.innerHTML = copy.no;

  container.classList.add("popup");

  container.appendChild(titleElem);
  container.appendChild(messageElem);
  container.appendChild(displayElem);
  container.appendChild(yesButton);
  container.appendChild(noButton);
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
    width: 100% - 2rem;
    height: 100%;
    margin: auto;
  } `;
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
};
/* -------------------------------------------------------------------------- */

const getCmValue = (numericalValue, unit) => {
  if (unit === "cm") return numericalValue;
  else return numericalValue * 2.54;
};
