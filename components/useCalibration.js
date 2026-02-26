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
  _calibrateSoundMinHz,
  _calibrateSoundMaxHz,
  calibrateMicrophonesBool,
  microphoneCalibrationResults,
  calibrateSoundCheck,
  timeoutSec,
  _calibrateSoundAllHzBool,
  calibrateSoundBurstRepeats,
  calibrateSoundBurstSec,
  _calibrateSoundBurstPreSec,
  _calibrateSoundBurstPostSec,
  calibrateSoundBurstsWarmup,
  calibrateSoundHz,
  calibrateSoundBurstRecordings,
  calibrateSoundBurstMLSVersions,
  _calibrateSoundBurstMaxSD_dB,
  _calibrateSound1000HzBool,
  _calibrateSound1000HzSec,
  _calibrateSound1000HzDB,
  _calibrateSound1000HzPreSec,
  _calibrateSound1000HzPostSec,
  _calibrateSound1000HzMaxSD_dB,
  _calibrateSound1000HzMaxTries,
  timeToCalibrate,
  thisDevice,
  calibrateSoundIIRSec,
  calibrateSoundIIRPhase,
  calibrateSoundIRSec,
  calibrateSoundBurstDb,
  calibrateSoundBurstFilteredExtraDb,
  calibrateSoundBurstScalarDB,
  calibrateSoundBurstLevelReTBool,
  calibrateSoundBurstDbIsRelativeBool,
  loudspeakerInfo,
  microphoneInfo,
  calibrationTime,
  calibrateSoundBackgroundSecs,
  _calibrateSoundSaveJSON,
  calibrateSoundSmoothOctaves,
  calibrateSoundSmoothMinBandwidthHz,
  calibrateSoundPowerDbSDToleratedDb,
  calibrateSoundTaperSec,
  calibrateSoundPowerBinDesiredSec,
  //showSoundParametersBool,
  _calibrateSoundShowParametersBool,
  calibrateSoundSamplingDesiredBits,
  microphoneCalibrationResult,
  authorEmail,
  loudspeakerIR,
  thisExperimentInfo,
  calibrateSoundLimit,
  gotLoudspeakerMatch,
  micsForSoundTestPage,
  deviceType,
  calibrateSoundUMIKBase_dB,
  calibrateSoundBurstNormalizeBy1000HzGainBool,
  timeoutSoundCalibrationSec,
  timeoutNewPhoneSec,
  calibrateSoundBurstDownsample,
  //showSoundCalibrationResultsBool,
  _calibrateSoundShowResultsBool,
  //showSoundTestPageBool,
  _calibrateSoundShowTestPageBool,
  calibrateSoundSimulateMicrophone,
  calibrateSoundSimulateLoudspeaker,
} from "./global";
import { psychoJS } from "./globalPsychoJS";

import { GLOSSARY } from "../parameters/glossary.ts";
import {
  addSoundTestElements,
  displayCompleteTransducerTable,
  displayParameters1000Hz,
  displayParametersAllHz,
  displayTimestamps,
  displayWhatIsSavedInDatabase,
  displayRecordings,
  displayVolumeRecordings,
  getListOfConnectedMicrophones,
} from "./soundTest";
import {
  calculateTimeToCalibrate,
  getCurrentTimeString,
  getSoundCalibrationLevelDBSPLFromIIR,
} from "./soundUtils";

import {
  runCombinationCalibration,
  calibrateAgain,
} from "./useSoundCalibration";
import { parseImpulseResponseOrFrequencyResponseFile } from "./soundCalibrationHelpers";
export const useCalibration = (reader) => {
  return ifTrue([
    ...reader.read("calibrateFrameRateUnderStressBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateBlindSpotBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateScreenSizeBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateDistanceBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateTrackGazeBool", "__ALL_BLOCKS__"),
  ]);
};

/* -------------------------------------------------------------------------- */

export const ifAnyCheck = (reader) => {
  return ifTrue([
    ...reader.read("calibrateScreenSizeCheckBool", "__ALL_BLOCKS__"),
    ...reader.read("_calibrateDistanceCheckBool", "__ALL_BLOCKS__"),
    ...reader.read("calibrateGazeCheckBool", "__ALL_BLOCKS__"),
  ]);
};

// Parse a two-number, comma-separated input into a numeric pair.
// Falls back to the provided default if parsing fails or the input is invalid.
const parseTwoNumberStringOrDefault = (value, defaultPair) => {
  try {
    if (typeof value === "string") {
      const parsed = value
        .trim()
        .split(",")
        .map((v) => parseFloat(v.trim()));
      if (parsed.length !== 2 || parsed.some((num) => Number.isNaN(num))) {
        return defaultPair;
      }
      return parsed;
    }
    if (Array.isArray(value)) {
      if (
        value.length === 2 &&
        value.every((num) => typeof num === "number" && !Number.isNaN(num))
      ) {
        return value;
      }
      return defaultPair;
    }
    return defaultPair;
  } catch (e) {
    return defaultPair;
  }
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
          `[rc] idealFps: ${data.value.idealFps}, stressFps: ${data.value.stressFps}`,
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
        screenSizeConsistencyThreshold: reader.read(
          "_calibrateDistanceAllowedRatioPxPerCm",
        )[0],
        screenSizeMeasurementCount: reader.read("calibrateScreenSizeTimes")[0],
      },
    });

  if (ifTrue(reader.read("calibrateBlindSpotBool", "__ALL_BLOCKS__")))
    tasks.push({
      name: "measureDistance",
      options: {
        fullscreen: !debug,
        sparkle: true,
        check: reader.read("_calibrateDistanceCheckBool")[0],
        showCancelButton: false,
      },
    });

  let calibrateDistanceCheckCm = [];
  let calibrateDistanceCheckLengthCmArray = [];
  let calibrateDistanceCheckBool = false;

  if (reader.read("_calibrateDistanceCheckBool")[0]) {
    calibrateDistanceCheckBool = true;
    const calibrateDistanceCheckCmValue = reader.read(
      "_calibrateDistanceCheckCm",
    )[0];
    if (
      typeof calibrateDistanceCheckCmValue === "string" &&
      calibrateDistanceCheckCmValue.includes(",")
    ) {
      calibrateDistanceCheckCm.push(
        ...calibrateDistanceCheckCmValue.split(","),
      );
    } else {
      calibrateDistanceCheckCm.push(calibrateDistanceCheckCmValue);
    }
    if (reader.read("_calibrateDistanceCheckLengthCm")[0]) {
      const calibrateDistanceCheckLengthCm = reader.read(
        "_calibrateDistanceCheckLengthCm",
      )[0];
      calibrateDistanceCheckLengthCmArray = calibrateDistanceCheckLengthCm
        .split(",")
        .map(Number);
    }
  }

  calibrateDistanceCheckCm = calibrateDistanceCheckCm.map((r) => parseFloat(r));

  const calibrateDistanceRaw = reader.read("_calibrateDistance")[0];
  let useObjectTestData = "both";
  if (calibrateDistanceRaw) {
    const values = calibrateDistanceRaw
      .split(",")
      .map((s) => s.trim().toLowerCase());
    const hasTypical = values.includes("typical");
    const hasPaper = values.includes("paper");
    const hasObject = values.includes("object");
    const hasBlindspot = values.includes("blindspot");
    const hasAutoCreditCard = values.includes("autocreditcard");
    const hasJustCreditCard = values.includes("justcreditcard");
    const hasCreditCard = values.includes("creditcard");

    if (hasTypical) {
      useObjectTestData = false;
      useObjectTestData = "typical";
    } else if (hasObject && hasBlindspot) {
      useObjectTestData = "both";
    } else if (hasAutoCreditCard) {
      useObjectTestData = false;
      useObjectTestData = "autoCreditCard";
    } else if (hasPaper) {
      useObjectTestData = false;
      useObjectTestData = "paper";
    } else if (hasJustCreditCard) {
      useObjectTestData = false;
      useObjectTestData = "justCreditCard";
    } else if (hasCreditCard) {
      useObjectTestData = false;
      useObjectTestData = "creditCard";
    } else if (hasObject) {
      useObjectTestData = true;
    } else if (hasBlindspot) {
      useObjectTestData = false;
    }
  }

  let calibrateDistanceSpotXYDeg = reader.read(
    "_calibrateDistanceSpotXYDeg",
  )[0];
  let calibrateDistanceSpotMinMaxDeg = reader.read(
    "_calibrateDistanceSpotMinMaxDeg",
  )[0];
  const defaultBlindspotMinMaxDeg = [3, 16];
  const defaultBlindspotXYDeg = [15.5, 1.5];

  calibrateDistanceSpotXYDeg = parseTwoNumberStringOrDefault(
    calibrateDistanceSpotXYDeg,
    defaultBlindspotXYDeg,
  );
  calibrateDistanceSpotMinMaxDeg = parseTwoNumberStringOrDefault(
    calibrateDistanceSpotMinMaxDeg,
    defaultBlindspotMinMaxDeg,
  );

  const calibrateDistanceObjectMinMaxCm = parseTwoNumberStringOrDefault(
    reader.read("_calibrateDistanceObjectMinMaxCm")[0],
    [30, 60],
  );

  if (ifTrue(reader.read("calibrateDistanceBool", "__ALL_BLOCKS__")))
    ////
    tasks.push({
      name: "trackDistance",
      options: {
        nearPoint: false,
        showVideo: true,
        viewingDistanceAllowedPreciseBool: reader.read(
          "viewingDistanceAllowedPreciseBool",
        )[0],
        calibrateDistanceCheckSecs: reader.read(
          "_calibrateDistanceCheckSecs",
        )[0],
        desiredDistanceCm: reader.has("viewingDistanceDesiredCm")
          ? reader.read("viewingDistanceDesiredCm")[0]
          : undefined,
        desiredDistanceTolerance:
          reader.read("viewingDistanceAllowedRatio")[0] > 0
            ? reader.read("viewingDistanceAllowedRatio")[0]
            : Infinity,
        desiredDistanceMonitor: ifTrue(
          reader
            .read("viewingDistanceAllowedRatio", "__ALL_BLOCKS__")
            .map((r) => r > 0),
        ),
        desiredDistanceMonitorAllowRecalibrate: !debugBool.current,
        fullscreen: !debug,
        objectMeasurementCount: reader.read("_calibrateDistanceTimes")[0],
        objectMeasurementConsistencyThreshold: reader.read(
          "_calibrateDistanceAllowedRatioCm",
        )[0],
        calibrateScreenSizeAllowedRatio: reader.read(
          "_calibrateDistanceAllowedRatioPxPerCm",
        )[0],
        calibrateScreenSizeTimes: reader.read("calibrateScreenSizeTimes")[0],
        sparkle: true,
        check: reader.read("_calibrateDistanceCheckBool")[0],
        showCancelButton: false,
        calibrateDistanceCheckBool: calibrateDistanceCheckBool,
        calibrateDistanceCheckCm: calibrateDistanceCheckCm,
        useObjectTestData: useObjectTestData,
        calibrateDistance: calibrateDistanceRaw,
        calibrateDistanceAllowedRatio: reader.read(
          "_calibrateDistanceAllowedRatioFOverWidth",
        )[0],
        calibrateDistanceAllowedRatioCm: reader.read(
          "_calibrateDistanceAllowedRatioCm",
        )[0],
        calibrateDistanceAllowedRatioHalfCm: reader.read(
          "_calibrateDistanceAllowedRatioHalfCm",
        )[0],
        calibrateDistanceAllowedRangeCm: reader.read(
          "_calibrateDistanceAllowedRangeCm",
        )[0],
        objecttestdebug: reader.read("showDistanceCalibrationBool")[0],
        calibrateDistanceMinCm: reader.read(
          "_calibrateDistanceObjectMinMaxCm",
        )[0],
        calibrateDistanceCheckLengthCm: calibrateDistanceCheckLengthCmArray,
        showNearestPointsBool:
          reader.read("_calibrateDistanceShowEyeFeetBool")[0] || false,
        showIrisesBool: reader.read("_showIrisesBool")[0] || false,
        calibrateDistanceIsCameraTopCenterBool:
          reader.read("_calibrateDistanceIsCameraTopCenterBool")[0] || false,
        calibrateDistanceCenterYourEyesBool:
          reader.read("_calibrateDistanceCenterYourEyesBool")[0] || false,
        calibrateDistancePupil:
          reader.read("_calibrateDistancePupil")[0] || "iris",
        resolutionWarningThreshold: reader.read(
          "_calibrateDistanceIsCameraMinRes",
        )[0],
        // calibrateDistanceSpotCm: reader.read(
        //   "_calibrateDistanceSpotCm",
        // )[0],
        calibrateDistanceBlindspotDiameterDeg: reader.read(
          "_calibrateDistanceBlindspotDiameterDeg",
        )[0],
        calibrateDistanceOffsetCm: reader.read("_calibrateDistanceOffsetCm")[0],
        calibrateDistanceTubeDiameterCm: reader.read(
          "_calibrateDistanceTubeDiameterCm",
        )[0],
        calibrateDistanceCheckMinRulerCm: reader.read(
          "_calibrateDistanceCheckMinRulerCm",
        )[0],
        // reader.read(
        //   "_calibrateDistanceCheckMinRulerCm",
        // )[0],
        calibrateDistanceDrawPaperTubeBool: reader.read(
          "_calibrateDistanceDrawPaperTubeBool",
        )[0],
        viewingDistanceWhichEye: reader.read("viewingDistanceWhichEye")[0],
        viewingDistanceWhichPoint: reader.read("viewingDistanceWhichPoint")[0],
        calibrateDistanceSpotXYDeg: calibrateDistanceSpotXYDeg,
        calibrateDistanceSpotMinMaxDeg: calibrateDistanceSpotMinMaxDeg,

        //calibrateDistanceBlindspotDebugging: true,
        calibrateDistanceBlindspotDebugging: reader.read(
          "_calibrateDistanceSpotDebugBool",
        )[0],
        //new option
        calibrateDistanceChecking: reader.read(
          "_calibrateDistanceCheckLocations",
        )[0],
        calibrateDistanceObjectMinMaxCm: calibrateDistanceObjectMinMaxCm,
        _calibrateDistanceShowRulerUnitsBool: reader.read(
          "_calibrateDistanceShowRulerUnitsBool",
        )[0],
        calibrateDistanceCameraToBlueLineCm: reader.read(
          "_calibrateDistanceCameraToBlueLineCm",
        )[0],
        calibrateDistanceGreenLineVideoFraction: reader.read(
          "_calibrateDistanceGreenLineVideoFraction",
        )[0],
        stepperHistory: reader.read("_stepperHistory")[0],
        calibrateDistanceQuadBaseRatio: reader.read(
          "_calibrateDistanceQuadBaseRatio",
        )[0],
        calibrateDistanceIpdUsesZBool: reader.read(
          "_calibrateDistanceIpdUsesZBool",
        )[0],
        calibrateDistanceLocations: reader.read(
          "_calibrateDistanceLocations",
        )[0],
        calibrateDistanceCameraResolution: reader
          .read("_calibrateDistanceCameraResolution")[0]
          .match(/\d+/g)
          .map(Number),
        calibrateDistanceCameraHz: reader.read("_calibrateDistanceCameraHz")[0],
        saveSnapshots: reader.read("_saveSnapshotsBool")[0],
        calibrateDistanceFocalLengthRange: reader.read(
          "_calibrateDistanceFocalLengthRange",
        )[0],
      },
    });

  //console.log("///calibrateDistanceFocalLengthRange", reader.read("_calibrateDistanceFocalLengthRange")[0]);

  if (ifTrue(reader.read("calibrateTrackGazeBool", "__ALL_BLOCKS__")))
    ////
    tasks.push({
      name: "trackGaze",
      options: {
        showGazer: ifTrue(reader.read("showGazeBool", "__ALL_BLOCKS__")),
        showVideo: false,
        calibrationCount: 1,
        fullscreen: !debug,
        saveSnapshots: reader.read("_saveSnapshotsBool")[0],
      },
    });

  return tasks;
};

export const saveCalibratorData = (reader, rc, psychoJS) => {
  if (ifTrue(reader.read("calibrateScreenSizeBool", "__ALL_BLOCKS__"))) {
    psychoJS.experiment.addData(
      `screenWidthCm`,
      rc.screenWidthCm ? rc.screenWidthCm.value : 0,
    );
    psychoJS.experiment.addData(
      `screenHeightCm`,
      rc.screenHeightCm ? rc.screenHeightCm.value : 0,
    );
  }

  if (rc.viewingDistanceCm) {
    for (let viewingDistanceData of rc.viewingDistanceData) {
      if (viewingDistanceData.method === "BlindSpot") {
        psychoJS.experiment.addData(
          `viewingDistanceByBlindSpotCm`,
          viewingDistanceData.value,
        );
      }
    }
  }

  if (rc.fontRenderSec) {
    psychoJS.experiment.addData("fontRenderSec", rc.fontRenderSec);
  }
  if (rc.heap100MBAllocSec) {
    psychoJS.experiment.addData("heap100MBAllocSec", rc.heap100MBAllocSec);
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
            data.value.horizontal.unit,
          ) *
            screen.width) /
            data.value.horizontal.arrowWidthPx,
        );
      if (data.value.vertical)
        psychoJS.experiment.addData(
          "screenHeightByRulerCm",
          (getCmValue(data.value.vertical.numerical, data.value.vertical.unit) *
            screen.height) /
            data.value.vertical.arrowHeightPx,
        );
    } else if (
      data.measure === "measureDistance" ||
      data.measure === "trackDistance"
    ) {
      psychoJS.experiment.addData(
        "viewingDistanceByRulerCm",
        getCmValue(data.value.numerical, data.value.unit),
      );
    }
  }
};

// TODO: Clean up sound calibration code after the paper deadline
export const calibrateAudio = async (reader) => {
  const [calibrateSoundLevel, calibrateLoudspeaker] = [
    ifTrue(
      reader.read(GLOSSARY._calibrateSound1000HzBool.name, "__ALL_BLOCKS__"),
    ),
    ifTrue(
      reader.read(GLOSSARY._calibrateSoundAllHzBool.name, "__ALL_BLOCKS__"),
    ),
  ];

  if (!(calibrateSoundLevel || calibrateLoudspeaker)) return true;

  calibrateMicrophonesBool.current = ifTrue(
    reader.read(GLOSSARY._calibrateMicrophonesBool.name, "__ALL_BLOCKS__"),
  );

  calibrateSoundBurstLevelReTBool.current = ifTrue(
    reader.read(
      GLOSSARY._calibrateSoundBurstLevelReTBool.name,
      "__ALL_BLOCKS__",
    ),
  );
  calibrateSoundBurstDbIsRelativeBool.current = ifTrue(
    reader.read(
      GLOSSARY._calibrateSoundBurstDbIsRelativeBool.name,
      "__ALL_BLOCKS__",
    ),
  );

  calibrateSoundBurstNormalizeBy1000HzGainBool.current = ifTrue(
    reader.read(
      GLOSSARY._calibrateSoundBurstNormalizeBy1000HzGainBool.name,
      "__ALL_BLOCKS__",
    ),
  );

  calibrateSoundCheck.current = reader.read("_calibrateSoundCheck")[0];

  // showSoundCalibrationResultsBool.current = ifTrue(
  //   reader.read(
  //     GLOSSARY._showSoundCalibrationResultsBool.name,
  //     "__ALL_BLOCKS__",
  //   ),
  // );
  _calibrateSoundShowResultsBool.current = ifTrue(
    reader.read(GLOSSARY._calibrateSoundShowResultsBool.name, "__ALL_BLOCKS__"),
  );
  // showSoundTestPageBool.current = ifTrue(
  //   reader.read(GLOSSARY._showSoundTestPageBool.name, "__ALL_BLOCKS__"),
  // );
  _calibrateSoundShowTestPageBool.current = ifTrue(
    reader.read(
      GLOSSARY._calibrateSoundShowTestPageBool.name,
      "__ALL_BLOCKS__",
    ),
  );
  // showSoundParametersBool.current = ifTrue(
  //   reader.read(GLOSSARY._showSoundParametersBool.name, "__ALL_BLOCKS__"),
  // );
  _calibrateSoundShowParametersBool.current = ifTrue(
    reader.read(
      GLOSSARY._calibrateSoundShowParametersBool.name,
      "__ALL_BLOCKS__",
    ),
  );
  // timeoutSec.current = reader.read(GLOSSARY._timeoutSec.name)[0] * 1000;
  _calibrateSoundMinHz.current = reader.read(
    GLOSSARY._calibrateSoundMinHz.name,
  )[0];
  timeoutSoundCalibrationSec.current = reader.read(
    GLOSSARY._timeoutSoundCalibrationSec.name,
  )[0];
  timeoutNewPhoneSec.current = reader.read(
    GLOSSARY._timeoutNewPhoneSec.name,
  )[0];
  _calibrateSoundMaxHz.current = reader.read(
    GLOSSARY._calibrateSoundMaxHz.name,
  )[0];
  _calibrateSoundAllHzBool.current = reader.read(
    GLOSSARY._calibrateSoundAllHzBool.name,
  )[0];
  calibrateSoundBurstRepeats.current = reader.read(
    GLOSSARY._calibrateSoundBurstRepeats.name,
  )[0];
  calibrateSoundBurstSec.current = reader.read(
    GLOSSARY._calibrateSoundBurstSec.name,
  )[0];
  _calibrateSoundBurstPreSec.current = reader.read(
    GLOSSARY._calibrateSoundBurstPreSec.name,
  )[0];
  _calibrateSoundBurstPostSec.current = reader.read(
    GLOSSARY._calibrateSoundBurstPostSec.name,
  )[0];
  calibrateSoundBurstsWarmup.current = reader.read(
    GLOSSARY._calibrateSoundBurstsWarmup.name,
  )[0];
  calibrateSoundHz.current = reader.read(
    GLOSSARY._calibrateSoundSamplingDesiredHz.name,
  )[0];
  calibrateSoundBurstRecordings.current = reader.read(
    GLOSSARY._calibrateSoundBurstRecordings.name,
  )[0];
  calibrateSoundBurstMLSVersions.current = reader.read(
    GLOSSARY._calibrateSoundBurstMLSVersions.name,
  )[0];
  calibrateSoundIIRSec.current = reader.read(
    GLOSSARY._calibrateSoundIIRSec.name,
  )[0];
  calibrateSoundIRSec.current = reader.read(
    GLOSSARY._calibrateSoundIRSec.name,
  )[0];
  calibrateSoundIIRPhase.current = reader.read(
    GLOSSARY._calibrateSoundIIRPhase.name,
  )[0];

  calibrateSoundBurstDb.current = reader.read(
    GLOSSARY._calibrateSoundBurstDb.name,
  )[0];

  calibrateSoundBurstFilteredExtraDb.current = reader.read(
    GLOSSARY._calibrateSoundBurstFilteredExtraDb.name,
  )[0];
  calibrateSoundBurstScalarDB.current = reader.read(
    GLOSSARY._calibrateSoundBurstScalar_dB.name,
  )[0];

  _calibrateSound1000HzSec.current = reader.read(
    GLOSSARY._calibrateSound1000HzSec.name,
  )[0];
  _calibrateSound1000HzBool.current = reader.read(
    GLOSSARY._calibrateSound1000HzBool.name,
  )[0];
  _calibrateSound1000HzDB.current = reader.read(
    GLOSSARY._calibrateSound1000HzDB.name,
  )[0];
  _calibrateSound1000HzPreSec.current = reader.read(
    GLOSSARY._calibrateSound1000HzPreSec.name,
  )[0];
  _calibrateSound1000HzPostSec.current = reader.read(
    GLOSSARY._calibrateSound1000HzPostSec.name,
  )[0];
  calibrateSoundBackgroundSecs.current = reader.read(
    GLOSSARY._calibrateSoundBackgroundSecs.name,
  )[0];
  _calibrateSoundSaveJSON.current = reader.read(
    GLOSSARY._calibrateSoundSaveJSON.name,
  )[0];
  calibrateSoundSmoothOctaves.current = reader.read(
    GLOSSARY._calibrateSoundSmoothOctaves.name,
  )[0];
  _calibrateSoundBurstMaxSD_dB.current = reader.read(
    GLOSSARY._calibrateSoundBurstMaxSD_dB.name,
  )[0];
  _calibrateSound1000HzMaxSD_dB.current = reader.read(
    GLOSSARY._calibrateSound1000HzMaxSD_dB.name,
  )[0];
  calibrateSoundBurstDownsample.current = reader.read(
    GLOSSARY._calibrateSoundBurstDownsample.name,
  )[0];
  _calibrateSound1000HzMaxTries.current = reader.read(
    GLOSSARY._calibrateSound1000HzMaxTries.name,
  )[0];
  calibrateSoundSmoothMinBandwidthHz.current = reader.read(
    GLOSSARY._calibrateSoundSmoothMinBandwidthHz.name,
  )[0];
  calibrateSoundPowerBinDesiredSec.current = reader.read(
    GLOSSARY._calibrateSoundPowerBinDesiredSec.name,
  )[0];
  calibrateSoundPowerDbSDToleratedDb.current = reader.read(
    GLOSSARY._calibrateSoundPowerDbSDToleratedDb.name,
  )[0];
  calibrateSoundTaperSec.current = reader.read(
    GLOSSARY._calibrateSoundTaperSec.name,
  )[0];
  calibrateSoundSamplingDesiredBits.current = reader.read(
    GLOSSARY._calibrateSoundSamplingDesiredBits.name,
  )[0];
  calibrateSoundLimit.current = reader.read(
    GLOSSARY._calibrateSoundLimit.name,
  )[0];
  calibrateSoundUMIKBase_dB.umik1 = reader.read(
    GLOSSARY._calibrateSoundUMIK1Base_dB.name,
  )[0];

  calibrateSoundUMIKBase_dB.umik2 = reader.read(
    GLOSSARY._calibrateSoundUMIK2Base_dB.name,
  )[0];

  calibrateSoundSimulateLoudspeaker.fileName = reader.read(
    GLOSSARY._calibrateSoundSimulateLoudspeaker.name,
  )[0];
  calibrateSoundSimulateMicrophone.fileName = reader.read(
    GLOSSARY._calibrateSoundSimulateMicrophone.name,
  )[0];

  if (
    calibrateSoundSimulateLoudspeaker.fileName &&
    calibrateSoundSimulateMicrophone.fileName
  ) {
    const loudspeakerIR = await parseImpulseResponseOrFrequencyResponseFile(
      calibrateSoundSimulateLoudspeaker.fileName,
    );

    calibrateSoundSimulateLoudspeaker.type = loudspeakerIR.type;
    if (loudspeakerIR.type === "impulseResponse") {
      calibrateSoundSimulateLoudspeaker.amplitudes = loudspeakerIR.amplitudes;
      calibrateSoundSimulateLoudspeaker.time = loudspeakerIR.time;
    } else {
      calibrateSoundSimulateLoudspeaker.frequencies = loudspeakerIR.frequencies;
      calibrateSoundSimulateLoudspeaker.gains = loudspeakerIR.gains;
    }

    const microphoneIR = await parseImpulseResponseOrFrequencyResponseFile(
      calibrateSoundSimulateMicrophone.fileName,
    );
    calibrateSoundSimulateMicrophone.type = microphoneIR.type;
    if (microphoneIR.type === "impulseResponse") {
      calibrateSoundSimulateMicrophone.time = microphoneIR.time;
      calibrateSoundSimulateMicrophone.amplitudes = microphoneIR.amplitudes;
    } else {
      calibrateSoundSimulateMicrophone.frequencies = microphoneIR.frequencies;
      calibrateSoundSimulateMicrophone.gains = microphoneIR.gains;
    }
  }

  const soundLevels = _calibrateSound1000HzDB.current.split(",");
  // convert soundLevels to numbers
  for (let i = 0; i < soundLevels.length; i++) {
    soundLevels[i] = parseFloat(soundLevels[i]);
  }
  const gains = soundLevels.map((soundLevel) => {
    return Math.pow(10, soundLevel / 20);
  });
  timeToCalibrate.current = calculateTimeToCalibrate(gains);
  authorEmail.current = reader.read(GLOSSARY._authorEmails.name)[0];

  if (gotLoudspeakerMatch.current) return true;

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
      done: readi18nPhrases(
        "RC_soundCalibrationLoudspeakerReadyParticipant",
        lang,
      ),
      test: readi18nPhrases("RC_testSounds", lang), //include in phrases doc
      citation:
        'Measured sound power is modeled as sum of background sound power and power gain times digital sound power. Microphone compression modeled by Eq. 4 of Giannoulis, Massberg, & Reiss (2012). "Digital Dynamic Range Compressor Design — A Tutorial and Analysis." Journal of Audio Engineering Society. 60 (6): 399–408.',
      calibrateMicrophone: readi18nPhrases("RC_calibrateAMicrophone", lang),
      proceedToExperiment: readi18nPhrases("RC_proceedToExperiment", lang),
    };

    const elems = _addSoundCalibrationElems(copy);
    // psychoJS.start({
    //   expName: thisExperimentInfo.name,
    //   expInfo: thisExperimentInfo,
    //   resources: [],
    // });
    const nav = document.querySelector("#soundNavContainer");
    if (nav) nav.style.display = "none";
    try {
      if (
        calibrateSoundLevel &&
        calibrateLoudspeaker &&
        !gotLoudspeakerMatch.current
      ) {
        const response = await runCombinationCalibration(
          elems,
          gains,
          true,
          rc.language.value,
        );
        console.log("done combination calibration");
        if (response === false) resolve(false);
      } else resolve(false);
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
    //elems.subtitle.innerHTML = "";
    elems.title.innerHTML = readi18nPhrases(
      deviceType.isLoudspeaker
        ? "RC_loudspeakerCalibrationResults"
        : "RC_microphoneCalibrationResults",
      rc.language.value,
    );
    elems.title.style.visibility = "visible";
    //show plots of the loudspeaker calibration
    if (
      calibrateSoundLevel &&
      soundCalibrationResults.current &&
      invertedImpulseResponse.current &&
      (allHzCalibrationResults || microphoneCalibrationResult.current) &&
      _calibrateSoundShowResultsBool.current &&
      calibrateSoundCheck.current !== "none" &&
      !gotLoudspeakerMatch.current
    ) {
      displayCompleteTransducerTable(
        loudspeakerInfo.current,
        microphoneInfo.current,
        elems,
        deviceType.isLoudspeaker,
        calibrateSoundCheck.current === "both"
          ? "speakerAndMic"
          : calibrateSoundCheck.current,
      );
      const title1000Hz = "Sound Level at 1000 Hz";
      const titleallHz = ["Correction"];
      displayParameters1000Hz(
        elems,
        soundLevels,
        deviceType.isLoudspeaker
          ? soundCalibrationResults.current
          : microphoneCalibrationResult.current,
        title1000Hz,
        calibrateSoundCheck.current === "both"
          ? "speakerAndMic"
          : calibrateSoundCheck.current,
        deviceType.isLoudspeaker,
      );
      displayVolumeRecordings(
        elems,
        soundCalibrationResults.current.recordingChecks,
        deviceType.isLoudspeaker,
        allHzCalibrationResults.filteredMLSRange.component,
      );
      displayRecordings(
        elems,
        deviceType.isLoudspeaker
          ? soundCalibrationResults.current.recordingChecks
          : microphoneCalibrationResult.current.recordingChecks,
        deviceType.isLoudspeaker,
        deviceType.isLoudspeaker
          ? allHzCalibrationResults.filteredMLSRange.component
          : microphoneCalibrationResult.current.filteredMLSRange.component,
        calibrateSoundCheck.current,
      );
      if (
        calibrateSoundCheck.current === "speakerAndMic" ||
        calibrateSoundCheck.current === "speakerOrMic" ||
        calibrateSoundCheck.current === "system" ||
        calibrateSoundCheck.current === "goal"
      ) {
        if (deviceType.isLoudspeaker) {
          displayParametersAllHz(
            elems,
            calibrateSoundCheck.current === "speakerAndMic" ||
              calibrateSoundCheck.current === "system"
              ? allHzCalibrationResults.system
              : allHzCalibrationResults.component,
            titleallHz,
            calibrateSoundCheck.current,
            deviceType.isLoudspeaker,
            allHzCalibrationResults.background,
            allHzCalibrationResults.mls_psd,
            allHzCalibrationResults.microphoneGain,
            calibrateSoundCheck.current === "speakerAndMic" ||
              calibrateSoundCheck.current === "system"
              ? allHzCalibrationResults.filteredMLSRange.system
              : allHzCalibrationResults.filteredMLSRange.component,
            soundCalibrationResults.current.parameters,
          );
        } else {
          displayParametersAllHz(
            elems,
            calibrateSoundCheck.current === "speakerAndMic" ||
              calibrateSoundCheck.current === "system"
              ? microphoneCalibrationResult.current.system
              : microphoneCalibrationResult.current.component,
            titleallHz,
            calibrateSoundCheck.current,
            deviceType.isLoudspeaker,
            microphoneCalibrationResult.current.background_noise,
            microphoneCalibrationResult.current.mls_psd,
            microphoneCalibrationResult.current.microphoneGain,
            calibrateSoundCheck.current === "speakerAndMic" ||
              calibrateSoundCheck.current === "system"
              ? microphoneCalibrationResult.current.filteredMLSRange.system
              : microphoneCalibrationResult.current.filteredMLSRange.component,
            soundCalibrationResults.current.parameters,
          );
        }
      } else {
        if (deviceType.isLoudspeaker) {
          displayParametersAllHz(
            elems,
            allHzCalibrationResults.system,
            titleallHz,
            "speakerAndMic",
            deviceType.isLoudspeaker,
            allHzCalibrationResults.background,
            allHzCalibrationResults.mls_psd,
            { Freq: [], Gain: [] },
            allHzCalibrationResults.filteredMLSRange.system,
            soundCalibrationResults.current.parameters,
          );
          displayParametersAllHz(
            elems,
            allHzCalibrationResults.component,
            titleallHz,
            "speakerOrMic",
            deviceType.isLoudspeaker,
            allHzCalibrationResults.background,
            allHzCalibrationResults.mls_psd,
            allHzCalibrationResults.microphoneGain,
            allHzCalibrationResults.filteredMLSRange.component,
            soundCalibrationResults.current.parameters,
          );
        } else {
          displayParametersAllHz(
            elems,
            microphoneCalibrationResult.current.system,
            titleallHz,
            "speakerAndMic",
            deviceType.isLoudspeaker,
            microphoneCalibrationResult.current.background_noise,
            microphoneCalibrationResult.current.mls_psd,
            microphoneCalibrationResult.current.microphoneGain,
            microphoneCalibrationResult.current.filteredMLSRange.system,
            soundCalibrationResults.current.parameters,
          );
          displayParametersAllHz(
            elems,
            microphoneCalibrationResult.current.component,
            titleallHz,
            "speakerOrMic",
            deviceType.isLoudspeaker,
            microphoneCalibrationResult.current.background_noise,
            microphoneCalibrationResult.current.mls_psd,
            loudspeakerIR,
            microphoneCalibrationResult.current.filteredMLSRange.component,
            soundCalibrationResults.current.parameters,
          );
        }
      }
      // display what we save in the database for the loudspeaker calibration
      await displayWhatIsSavedInDatabase(
        elems,
        deviceType.isLoudspeaker
          ? allHzCalibrationResults.knownIr
          : microphoneCalibrationResult.current.component.ir,
        deviceType.isLoudspeaker,
        "",
        deviceType.isLoudspeaker
          ? allHzCalibrationResults.filteredMLSRange.component
          : microphoneCalibrationResult.current.filteredMLSRange.component,
        soundCalibrationResults.current.parameters.RMSError,
      );
      displayTimestamps(elems);
    }
    let showLoudSpeakerDoneMessage = true;
    while (calibrateMicrophonesBool.current) {
      if (_calibrateSoundShowTestPageBool.current) {
        elems.testButton.style.display = "block";
        elems.testButton.style.visibility = "visible";
        elems.testButton.addEventListener("click", async (e) => {
          micsForSoundTestPage.list = await getListOfConnectedMicrophones();
          const modal = document.querySelector("#soundTestModal");
          if (!modal) {
            addSoundTestElements(reader, rc.language.value);
          }
          $("#soundTestModal").modal("show");
        });
      }

      // provide the option to calibrate another mic or to continue.
      elems.displayUpdate.style.display = "none";
      elems.calibrateMicrophoneButton.style.display = "block";
      againButton.innerHTML = readi18nPhrases("RC_Again", rc.language.value);
      elems.againButton.style.display = deviceType.profileFetchedFromLibrary
        ? "none"
        : "block";
      deviceType.profileFetchedFromLibrary = false;
      elems.continueButton.style.display = "block";
      elems.navContainer.style.display = "flex";
      // elems.title.innerHTML = "";
      //elems.subtitle.innerHTML = "";
      elems.message.innerHTML = showLoudSpeakerDoneMessage
        ? readi18nPhrases(
            "RC_soundCalibrationLoudspeakerReadyScientist",
            rc.language.value,
          )
        : readi18nPhrases(
            "RC_soundCalibrationMicrophoneDone",
            rc.language.value,
          );
      showLoudSpeakerDoneMessage = false;

      const calibration = await new Promise(async (resolve) => {
        const repeatCalibration = async () => {
          console.log("repeatCalibration");
          elems.subtitle2.innerText = "";
          elems.completeTransducerTable.innerHTML = "";
          elems.testButton.style.display = "none";
          elems.citation.style.visibility = "hidden";
          elems.soundLevelsTable.innerHTML = "";
          elems.soundLevelsTableContainer.style.visibility = "hidden";
          elems.soundTestPlots.innerHTML = "";
          elems.soundParametersFromCalibration.innerHTML = "";
          elems.downloadButton.style.visibility = "hidden";
          elems.displayUpdate.innerHTML = "";
          elems.message.innerHTML = "";
          elems.message.style.lineHeight = "2rem";
          elems.message.style.fontWeight = "normal";
          elems.message.style.fontSize = "1.1rem";
          elems.calibrateMicrophoneButton.style.display = "none";
          againButton.style.display = "none";
          elems.continueButton.style.display = "none";
          elems.timeToCalibrate.innerHTML = "";
          if (deviceType.isLoudspeaker) {
            showLoudSpeakerDoneMessage = true;
          }
          elems.timeStamps.innerHTML = "";
          let copyKnownIR = JSON.parse(JSON.stringify(loudspeakerIR));
          await calibrateAgain(
            elems,
            deviceType.isLoudspeaker,
            rc.language.value,
            deviceType.isSmartphone,
            deviceType.isLoudspeaker ? null : copyKnownIR,
            deviceType.isParticipant,
          );

          elems.title.innerHTML = readi18nPhrases(
            deviceType.isLoudspeaker
              ? "RC_loudspeakerCalibrationResults"
              : "RC_microphoneCalibrationResults",
            rc.language.value,
          );
          elems.title.style.visibility = "visible";
          if (_calibrateSoundShowResultsBool.current) {
            displayCompleteTransducerTable(
              loudspeakerInfo.current,
              microphoneInfo.current,
              elems,
              deviceType.isLoudspeaker,
              calibrateSoundCheck.current === "both"
                ? "speakerAndMic"
                : calibrateSoundCheck.current,
            );
            //show sound calibration results
            const title1000Hz = "Sound Level at 1000 Hz";
            const titleallHz = ["Correction"];
            displayParameters1000Hz(
              elems,
              soundLevels,
              deviceType.isLoudspeaker
                ? soundCalibrationResults.current
                : microphoneCalibrationResult.current,
              title1000Hz,
              calibrateSoundCheck.current === "both"
                ? "speakerAndMic"
                : calibrateSoundCheck.current,
              deviceType.isLoudspeaker,
            );
            displayVolumeRecordings(
              elems,
              deviceType.isLoudspeaker
                ? soundCalibrationResults.current.recordingChecks
                : microphoneCalibrationResult.current.recordingChecks,
              deviceType.isLoudspeaker,
              deviceType.isLoudspeaker
                ? allHzCalibrationResults.filteredMLSRange.component
                : microphoneCalibrationResult.current.filteredMLSRange
                    .component,
            );
            displayRecordings(
              elems,
              deviceType.isLoudspeaker
                ? soundCalibrationResults.current.recordingChecks
                : microphoneCalibrationResult.current.recordingChecks,
              deviceType.isLoudspeaker,
              deviceType.isLoudspeaker
                ? allHzCalibrationResults.filteredMLSRange.component
                : microphoneCalibrationResult.current.filteredMLSRange
                    .component,
              calibrateSoundCheck.current,
            );
            if (
              calibrateSoundCheck.current === "speakerAndMic" ||
              calibrateSoundCheck.current === "speakerOrMic" ||
              calibrateSoundCheck.current === "system" ||
              calibrateSoundCheck.current === "goal"
            ) {
              if (deviceType.isLoudspeaker) {
                displayParametersAllHz(
                  elems,
                  calibrateSoundCheck.current === "speakerAndMic" ||
                    calibrateSoundCheck.current === "system"
                    ? allHzCalibrationResults.system
                    : allHzCalibrationResults.component,
                  titleallHz,
                  calibrateSoundCheck.current,
                  deviceType.isLoudspeaker,
                  allHzCalibrationResults.background,
                  allHzCalibrationResults.mls_psd,
                  allHzCalibrationResults.microphoneGain,
                  calibrateSoundCheck.current === "speakerAndMic" ||
                    calibrateSoundCheck.current === "system"
                    ? allHzCalibrationResults.filteredMLSRange.system
                    : allHzCalibrationResults.filteredMLSRange.component,
                  soundCalibrationResults.current.parameters,
                );
              } else {
                displayParametersAllHz(
                  elems,
                  calibrateSoundCheck.current === "speakerAndMic" ||
                    calibrateSoundCheck.current === "system"
                    ? microphoneCalibrationResult.current.system
                    : microphoneCalibrationResult.current.component,
                  titleallHz,
                  calibrateSoundCheck.current,
                  deviceType.isLoudspeaker,
                  microphoneCalibrationResult.current.background_noise,
                  microphoneCalibrationResult.current.mls_psd,
                  loudspeakerIR,
                  calibrateSoundCheck.current === "speakerAndMic" ||
                    calibrateSoundCheck.current === "system"
                    ? microphoneCalibrationResult.current.filteredMLSRange
                        .system
                    : microphoneCalibrationResult.current.filteredMLSRange
                        .component,
                  soundCalibrationResults.current.parameters,
                );
              }
            } else {
              if (deviceType.isLoudspeaker) {
                displayParametersAllHz(
                  elems,
                  allHzCalibrationResults.system,
                  titleallHz,
                  "speakerAndMic",
                  deviceType.isLoudspeaker,
                  allHzCalibrationResults.background,
                  allHzCalibrationResults.mls_psd,
                  { Freq: [], Gain: [] },
                  allHzCalibrationResults.filteredMLSRange.system,
                  soundCalibrationResults.current.parameters,
                );
                displayParametersAllHz(
                  elems,
                  allHzCalibrationResults.component,
                  titleallHz,
                  "speakerOrMic",
                  deviceType.isLoudspeaker,
                  allHzCalibrationResults.background,
                  allHzCalibrationResults.mls_psd,
                  allHzCalibrationResults.microphoneGain,
                  allHzCalibrationResults.filteredMLSRange.component,
                  soundCalibrationResults.current.parameters,
                );
              } else {
                displayParametersAllHz(
                  elems,
                  microphoneCalibrationResult.current.system,
                  titleallHz,
                  "speakerAndMic",
                  deviceType.isLoudspeaker,
                  microphoneCalibrationResult.current.background_noise,
                  microphoneCalibrationResult.current.mls_psd,
                  microphoneCalibrationResult.current.microphoneGain,
                  microphoneCalibrationResult.current.filteredMLSRange.system,
                  soundCalibrationResults.current.parameters,
                );
                displayParametersAllHz(
                  elems,
                  microphoneCalibrationResult.current.component,
                  titleallHz,
                  "speakerOrMic",
                  deviceType.isLoudspeaker,
                  microphoneCalibrationResult.current.background_noise,
                  microphoneCalibrationResult.current.mls_psd,
                  loudspeakerIR,
                  microphoneCalibrationResult.current.filteredMLSRange
                    .component,
                  soundCalibrationResults.current.parameters,
                );
              }
            }
            // display what we save in the database for the loudspeaker calibration
            await displayWhatIsSavedInDatabase(
              elems,
              deviceType.isLoudspeaker
                ? allHzCalibrationResults.knownIr
                : microphoneCalibrationResult.current.component.ir,
              deviceType.isLoudspeaker,
              "",
              deviceType.isLoudspeaker
                ? allHzCalibrationResults.filteredMLSRange.component
                : microphoneCalibrationResult.current.filteredMLSRange
                    .component,
              soundCalibrationResults.current.parameters.RMSError,
            );
            displayTimestamps(elems);
          }
          elems.againButton.removeEventListener("click", repeatCalibration);
          resolve();
        };
        elems.againButton.addEventListener("click", repeatCalibration);

        elems.calibrateMicrophoneButton.addEventListener("click", async (e) => {
          deviceType.isLoudspeaker = false;
          // find element by id and remove it: completeTransducerTable
          elems.completeTransducerTable.innerHTML = "";
          elems.subtitle2.innerText = "";
          elems.testButton.style.display = "none";
          elems.citation.style.visibility = "hidden";
          elems.soundLevelsTable.innerHTML = "";
          elems.soundLevelsTableContainer.style.visibility = "hidden";
          elems.soundTestPlots.innerHTML = "";
          elems.soundParametersFromCalibration.innerHTML = "";
          elems.downloadButton.style.visibility = "hidden";
          elems.displayUpdate.innerHTML = "";
          elems.message.innerHTML = "";
          elems.message.style.lineHeight = "2rem";
          elems.message.style.fontWeight = "normal";
          elems.message.style.fontSize = "1.1rem";
          elems.message.style.overflowX = "hidden";
          elems.calibrateMicrophoneButton.style.display = "none";
          againButton.style.display = "none";
          elems.continueButton.style.display = "none";
          elems.timeToCalibrate.innerHTML = "";
          // elems.title.innerHTML = "";
          deviceType.isLoudspeaker = false;
          elems.timeStamps.innerHTML = "";
          await runCombinationCalibration(
            elems,
            gains,
            false,
            rc.language.value,
          );

          elems.title.innerHTML = readi18nPhrases(
            "RC_microphoneCalibrationResults",
            rc.language.value,
          );
          elems.title.style.visibility = "visible";
          if (_calibrateSoundShowResultsBool.current) {
            displayCompleteTransducerTable(
              loudspeakerInfo.current,
              microphoneInfo.current,
              elems,
              deviceType.isLoudspeaker,
              calibrateSoundCheck.current === "both"
                ? "speakerAndMic"
                : calibrateSoundCheck.current,
            );
            //show sound calibration results
            const title1000Hz = "Sound Level at 1000 Hz";
            const titleallHz = ["Correction"];
            displayParameters1000Hz(
              elems,
              soundLevels,
              microphoneCalibrationResult.current,
              title1000Hz,
              calibrateSoundCheck.current === "both"
                ? "speakerAndMic"
                : calibrateSoundCheck.current,
              false,
            );
            displayVolumeRecordings(
              elems,
              deviceType.isLoudspeaker
                ? soundCalibrationResults.current.recordingChecks
                : microphoneCalibrationResult.current.recordingChecks,
              deviceType.isLoudspeaker,
              deviceType.isLoudspeaker
                ? allHzCalibrationResults.filteredMLSRange.component
                : microphoneCalibrationResult.current.filteredMLSRange
                    .component,
            );
            displayRecordings(
              elems,
              deviceType.isLoudspeaker
                ? soundCalibrationResults.current.recordingChecks
                : microphoneCalibrationResult.current.recordingChecks,
              deviceType.isLoudspeaker,
              deviceType.isLoudspeaker
                ? allHzCalibrationResults.filteredMLSRange.component
                : microphoneCalibrationResult.current.filteredMLSRange
                    .component,
              calibrateSoundCheck.current,
            );
            if (
              calibrateSoundCheck.current === "speakerAndMic" ||
              calibrateSoundCheck.current === "speakerOrMic"
            ) {
              displayParametersAllHz(
                elems,
                calibrateSoundCheck.current === "speakerAndMic"
                  ? microphoneCalibrationResult.current.system
                  : microphoneCalibrationResult.current.component,
                titleallHz,
                calibrateSoundCheck.current,
                false,
                microphoneCalibrationResult.current.background_noise,
                microphoneCalibrationResult.current.mls_psd,
                loudspeakerIR,
                calibrateSoundCheck.current === "speakerAndMic"
                  ? microphoneCalibrationResult.current.filteredMLSRange.system
                  : microphoneCalibrationResult.current.filteredMLSRange
                      .component,
                soundCalibrationResults.current.parameters,
              );
            } else {
              displayParametersAllHz(
                elems,
                microphoneCalibrationResult.current.system,
                titleallHz,
                "speakerAndMic",
                false,
                microphoneCalibrationResult.current.background_noise,
                microphoneCalibrationResult.current.mls_psd,
                loudspeakerIR,
                microphoneCalibrationResult.current.filteredMLSRange.system,
                soundCalibrationResults.current.parameters,
              );
              displayParametersAllHz(
                elems,
                microphoneCalibrationResult.current.component,
                titleallHz,
                "speakerOrMic",
                false,
                microphoneCalibrationResult.current.background_noise,
                microphoneCalibrationResult.current.mls_psd,
                loudspeakerIR,
                microphoneCalibrationResult.current.filteredMLSRange.component,
                soundCalibrationResults.current.parameters,
              );
            }
            // display what we save in the database for the loudspeaker calibration
            await displayWhatIsSavedInDatabase(
              elems,
              microphoneCalibrationResult.current.component.ir,
              false,
              "",
              microphoneCalibrationResult.current.filteredMLSRange.component,
              soundCalibrationResults.current.parameters.RMSError,
            );
            displayTimestamps(elems);
          }
          elems.againButton.removeEventListener("click", repeatCalibration);
          resolve();
        });
        elems.continueButton.addEventListener("click", async (e) => {
          elems.calibrateMicrophoneButton.style.display = "none";
          elems.againButton.style.display = "none";
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

    // elems.message.innerHTML = copy.done;
    if (!_calibrateSoundShowTestPageBool.current) {
      _removeSoundCalibrationElems(Object.values(elems));
      resolve(true);
    }

    elems.navContainer.style.display = "flex";
    elems.yesButton.style.display = "block";
    elems.testButton.style.display = "block";
    elems.testButton.style.visibility = "visible";

    elems.testButton.addEventListener("click", async (e) => {
      micsForSoundTestPage.list = await getListOfConnectedMicrophones();
      const modal = document.querySelector("#soundTestModal");
      if (!modal) {
        addSoundTestElements(reader, rc.language.value);
      }
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
  const root = document.querySelector("#root");
  if (root) root.style.visibility = "hidden";
  const title = document.createElement("h1");
  const subtitle = document.createElement("h2");
  const subtitle2 = document.createElement("p");
  const background = document.createElement("div");
  const container = document.createElement("div");
  const message = document.createElement("h2");
  const displayContainer = document.createElement("div");
  const displayQR = document.createElement("span");
  const displayUpdate = document.createElement("span");
  const citation = document.createElement("div");
  const navContainer = document.createElement("div");
  const yesButton = document.createElement("button");
  const noButton = document.createElement("button");
  const testButton = document.createElement("button");
  const soundLevelsTable = document.createElement("table");
  const soundLevelsTableContainer = document.createElement("div");
  const completeTransducerTable = document.createElement("div");
  const timeStamps = document.createElement("div");
  const soundTestContainer = document.createElement("div");
  const soundParametersFromCalibration = document.createElement("div");
  const soundTestPlots = document.createElement("div");
  const downloadButton = document.createElement("button");
  const buttonAndParametersContainer = document.createElement("div");
  const calibrateMicrophoneButton = document.createElement("button");
  const continueButton = document.createElement("button");
  const recordingInProgress = document.createElement("h1");
  const timeToCalibrate = document.createElement("div");
  const againButton = document.createElement("button");
  const elems = {
    timeToCalibrate,
    recordingInProgress,
    background,
    title,
    subtitle,
    subtitle2,
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
    againButton,
    soundLevelsTableContainer,
    timeStamps,
  };

  Object.values(elems).forEach((elem) => {
    elem.style.userSelect = "text";
  });

  timeToCalibrate.setAttribute("id", "timeToCalibrate");
  recordingInProgress.setAttribute("id", "recordingInProgress");
  title.setAttribute("id", "soundTitle");
  subtitle.setAttribute("id", "soundSubtitle");
  subtitle2.setAttribute("id", "soundSubtitle2");
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
  againButton.setAttribute("id", "againButton");
  soundParametersFromCalibration.setAttribute(
    "id",
    "soundParametersFromCalibration",
  );
  soundTestPlots.setAttribute("id", "soundTestPlots");
  soundTestContainer.setAttribute("id", "soundTestContainer");
  timeStamps.setAttribute("id", "timeStamps");
  citation.setAttribute("id", "citation");

  // container.style.lineHeight = "1rem";
  // title.innerHTML = copy.soundCalibration;
  // font size for title
  title.style.fontSize = "1.5rem";
  title.style.marginBottom = "0px";
  //replace "N11" with 1 and N22 with 3
  // title.innerHTML = title.innerHTML.replace(/N11/g, 1);
  // title.innerHTML = title.innerHTML.replace(/N22/g, 6);
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

  againButton.style.display = "none";
  // width for displayUpdate
  displayUpdate.style.width = "100%";
  displayQR.style.marginLeft = "-12px";
  timeToCalibrate.style.marginLeft = "0px";
  subtitle.style.paddingBottom = "0px";
  subtitle2.style.paddingTop = "0px";
  subtitle2.style.paddingBottom = "12px";
  subtitle2.style.margin = "0px";
  subtitle.style.marginBottom = "0px";
  timeToCalibrate.style.paddingTop = "8px";
  timeToCalibrate.style.paddingBottom = "0px";
  timeToCalibrate.style.marginBottom = "0px";
  displayUpdate.style.paddingTop = "0px";
  displayContainer.style.paddingTop = "0px";

  background.classList.add(...["sound-calibration-background"]);
  // avoid background being clipped from the top
  // background.style.marginTop = "5vh";
  container.classList.add(...["container"]);
  yesButton.classList.add(...["btn", "btn-primary"]);
  noButton.classList.add(...["btn", "btn-secondary"]);
  testButton.classList.add(...["btn", "btn-secondary"]);
  calibrateMicrophoneButton.classList.add(...["btn", "btn-primary"]);
  continueButton.classList.add(...["btn", "btn-success"]);
  againButton.classList.add(...["btn", "btn-primary"]);
  //make download button invisible
  downloadButton.style.visibility = "hidden";

  background.appendChild(container);
  container.appendChild(recordingInProgress);
  container.appendChild(title);
  container.appendChild(subtitle);
  container.appendChild(subtitle2);
  // container.appendChild(timeToCalibrate);
  container.appendChild(message);
  container.appendChild(navContainer);
  navContainer.appendChild(testButton);
  navContainer.appendChild(calibrateMicrophoneButton);
  navContainer.appendChild(againButton);
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
  soundLevelsTableContainer.appendChild(soundLevelsTable);
  container.appendChild(soundLevelsTableContainer);
  soundTestContainer.appendChild(buttonAndParametersContainer);
  soundTestContainer.appendChild(soundTestPlots);
  container.appendChild(soundTestContainer);
  container.appendChild(timeStamps);
  container.appendChild(citation);
  document.body.appendChild(background);

  _addSoundCss();

  return elems;
};

const _removeSoundCalibrationElems = (elems) => {
  console.log("removing sound calibration elements");
  Object.values(elems).forEach((elem) => elem.remove());
  console.log("removed sound calibration elements");
  const root = document.querySelector("#root");
  if (root) root.style.visibility = "visible";
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

/* -------------------------------------------------------------------------- */

const getCmValue = (numericalValue, unit) => {
  if (unit === "cm") return numericalValue;
  else return numericalValue * 2.54;
};
