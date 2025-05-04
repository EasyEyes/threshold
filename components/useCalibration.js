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
  _calibrateSoundBurstPreSec,
  _calibrateSoundBurstPostSec,
  calibrateSoundBurstsWarmup,
  calibrateSoundHz,
  calibrateSoundBurstRecordings,
  calibrateSoundBurstMLSVersions,
  _calibrateSoundBurstMaxSD_dB,
  calibrateSound1000HzSec,
  calibrateSound1000HzPreSec,
  calibrateSound1000HzPostSec,
  calibrateSound1000HzMaxSD_dB,
  calibrateSound1000HzMaxTries,
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
  calibrateSoundSaveJSONBool,
  calibrateSoundSmoothOctaves,
  calibrateSoundSmoothMinBandwidthHz,
  calibrateSoundPowerDbSDToleratedDb,
  calibrateSoundTaperSec,
  calibrateSoundPowerBinDesiredSec,
  showSoundParametersBool,
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
  showSoundCalibrationResultsBool,
  showSoundTestPageBool,
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
import { parseImpulseResponseFile } from "./soundCalibrationHelpers";
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

  let calibrateTrackDistanceCheckCm = [];
  let calibrateTrackDistanceCheckBool = false;

  if (reader.read("calibrateTrackDistanceCheckBool")[0]) {
    calibrateTrackDistanceCheckBool = true;
    calibrateTrackDistanceCheckCm.push(
      ...reader.read("calibrateTrackDistanceCheckCm")[0].split(","),
    );
  }

  calibrateTrackDistanceCheckCm = calibrateTrackDistanceCheckCm.map((r) =>
    parseFloat(r),
  );

  if (ifTrue(reader.read("calibrateTrackDistanceBool", "__ALL_BLOCKS__")))
    ////
    tasks.push({
      name: "trackDistance",
      options: {
        nearPoint: ifTrue(
          reader.read("calibratePupillaryDistanceBool", "__ALL_BLOCKS__"),
        ),
        showVideo: true,
        viewingDistanceAllowedPreciseBool: reader.read(
          "viewingDistanceAllowedPreciseBool",
        )[0],
        calibrateTrackDistanceCheckSecs: reader.read(
          "calibrateTrackDistanceCheckSecs",
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
        sparkle: true,
        check: reader.read("calibrateDistanceCheckBool")[0],
        showCancelButton: false,
        calibrateTrackDistanceCheckBool: calibrateTrackDistanceCheckBool,
        calibrateTrackDistanceCheckCm: calibrateTrackDistanceCheckCm,
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
      rc.screenWidthCm ? rc.screenWidthCm.value : 0,
    );
    psychoJS.experiment.addData(
      `screenHeightByObjectCm`,
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
      reader.read(GLOSSARY.calibrateSound1000HzBool.name, "__ALL_BLOCKS__"),
    ),
    ifTrue(
      reader.read(GLOSSARY.calibrateSoundAllHzBool.name, "__ALL_BLOCKS__"),
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

  showSoundCalibrationResultsBool.current = ifTrue(
    reader.read(
      GLOSSARY._showSoundCalibrationResultsBool.name,
      "__ALL_BLOCKS__",
    ),
  );
  showSoundTestPageBool.current = ifTrue(
    reader.read(GLOSSARY._showSoundTestPageBool.name, "__ALL_BLOCKS__"),
  );
  showSoundParametersBool.current = ifTrue(
    reader.read(GLOSSARY._showSoundParametersBool.name, "__ALL_BLOCKS__"),
  );
  // timeoutSec.current = reader.read(GLOSSARY._timeoutSec.name)[0] * 1000;
  calibrateSoundMinHz.current = reader.read(
    GLOSSARY.calibrateSoundMinHz.name,
  )[0];
  timeoutSoundCalibrationSec.current = reader.read(
    GLOSSARY._timeoutSoundCalibrationSec.name,
  )[0];
  timeoutNewPhoneSec.current = reader.read(
    GLOSSARY._timeoutNewPhoneSec.name,
  )[0];
  calibrateSoundMaxHz.current = reader.read(
    GLOSSARY.calibrateSoundMaxHz.name,
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

  calibrateSound1000HzSec.current = reader.read(
    GLOSSARY.calibrateSound1000HzSec.name,
  )[0];
  calibrateSound1000HzPreSec.current = reader.read(
    GLOSSARY.calibrateSound1000HzPreSec.name,
  )[0];
  calibrateSound1000HzPostSec.current = reader.read(
    GLOSSARY.calibrateSound1000HzPostSec.name,
  )[0];
  calibrateSoundBackgroundSecs.current = reader.read(
    GLOSSARY._calibrateSoundBackgroundSecs.name,
  )[0];
  calibrateSoundSaveJSONBool.current = ifTrue(
    reader.read(GLOSSARY._calibrateSoundSaveJSONBool.name, "__ALL_BLOCKS__"),
  );
  calibrateSoundSmoothOctaves.current = reader.read(
    GLOSSARY._calibrateSoundSmoothOctaves.name,
  )[0];
  _calibrateSoundBurstMaxSD_dB.current = reader.read(
    GLOSSARY._calibrateSoundBurstMaxSD_dB.name,
  )[0];
  calibrateSound1000HzMaxSD_dB.current = reader.read(
    GLOSSARY.calibrateSound1000HzMaxSD_dB.name,
  )[0];
  calibrateSoundBurstDownsample.current = reader.read(
    GLOSSARY._calibrateSoundBurstDownsample.name,
  )[0];
  calibrateSound1000HzMaxTries.current = reader.read(
    GLOSSARY.calibrateSound1000HzMaxTries.name,
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
    const loudspeakerIR = await parseImpulseResponseFile(
      calibrateSoundSimulateLoudspeaker.fileName,
    );
    calibrateSoundSimulateLoudspeaker.amplitudes = loudspeakerIR.amplitudes;
    calibrateSoundSimulateLoudspeaker.time = loudspeakerIR.time;

    const microphoneIR = await parseImpulseResponseFile(
      calibrateSoundSimulateMicrophone.fileName,
    );
    calibrateSoundSimulateMicrophone.amplitudes = microphoneIR.amplitudes;
    calibrateSoundSimulateMicrophone.time = microphoneIR.time;
  }

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
    document.querySelector("#soundNavContainer").style.display = "none";
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
      showSoundCalibrationResultsBool &&
      calibrateSoundCheck.current !== "none" &&
      !gotLoudspeakerMatch.current
    ) {
      displayCompleteTransducerTable(
        loudspeakerInfo.current,
        microphoneInfo.current,
        elems,
        deviceType.isLoudspeaker,
        calibrateSoundCheck.current === "both"
          ? "system"
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
          ? "system"
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
        calibrateSoundCheck.current === "system" ||
        calibrateSoundCheck.current === "goal"
      ) {
        if (deviceType.isLoudspeaker) {
          displayParametersAllHz(
            elems,
            calibrateSoundCheck.current === "system"
              ? allHzCalibrationResults.system
              : allHzCalibrationResults.component,
            titleallHz,
            calibrateSoundCheck.current,
            deviceType.isLoudspeaker,
            allHzCalibrationResults.background,
            allHzCalibrationResults.mls_psd,
            allHzCalibrationResults.microphoneGain,
            calibrateSoundCheck.current === "system"
              ? allHzCalibrationResults.filteredMLSRange.system
              : allHzCalibrationResults.filteredMLSRange.component,
            soundCalibrationResults.current.parameters,
          );
        } else {
          displayParametersAllHz(
            elems,
            calibrateSoundCheck.current === "system"
              ? microphoneCalibrationResult.current.system
              : microphoneCalibrationResult.current.component,
            titleallHz,
            calibrateSoundCheck.current,
            deviceType.isLoudspeaker,
            microphoneCalibrationResult.current.background_noise,
            microphoneCalibrationResult.current.mls_psd,
            microphoneCalibrationResult.current.microphoneGain,
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
            "system",
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
            "goal",
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
            "system",
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
            "goal",
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
    }
    let showLoudSpeakerDoneMessage = true;
    while (calibrateMicrophonesBool.current) {
      if (showSoundTestPageBool) {
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
          if (calibrateSoundCheck.current !== "none") {
            displayCompleteTransducerTable(
              loudspeakerInfo.current,
              microphoneInfo.current,
              elems,
              deviceType.isLoudspeaker,
              calibrateSoundCheck.current === "both"
                ? "system"
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
                ? "system"
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
              calibrateSoundCheck.current === "system" ||
              calibrateSoundCheck.current === "goal"
            ) {
              if (deviceType.isLoudspeaker) {
                displayParametersAllHz(
                  elems,
                  calibrateSoundCheck.current === "system"
                    ? allHzCalibrationResults.system
                    : allHzCalibrationResults.component,
                  titleallHz,
                  calibrateSoundCheck.current,
                  deviceType.isLoudspeaker,
                  allHzCalibrationResults.background,
                  allHzCalibrationResults.mls_psd,
                  allHzCalibrationResults.microphoneGain,
                  calibrateSoundCheck.current === "system"
                    ? allHzCalibrationResults.filteredMLSRange.system
                    : allHzCalibrationResults.filteredMLSRange.component,
                  soundCalibrationResults.current.parameters,
                );
              } else {
                displayParametersAllHz(
                  elems,
                  calibrateSoundCheck.current === "system"
                    ? microphoneCalibrationResult.current.system
                    : microphoneCalibrationResult.current.component,
                  titleallHz,
                  calibrateSoundCheck.current,
                  deviceType.isLoudspeaker,
                  microphoneCalibrationResult.current.background_noise,
                  microphoneCalibrationResult.current.mls_psd,
                  loudspeakerIR,
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
                  "system",
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
                  "goal",
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
                  "system",
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
                  "goal",
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
          elems.message.style.overflowX = "scroll";
          elems.calibrateMicrophoneButton.style.display = "none";
          againButton.style.display = "none";
          elems.continueButton.style.display = "none";
          elems.timeToCalibrate.innerHTML = "";
          // elems.title.innerHTML = "";
          deviceType.isLoudspeaker = false;
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
          if (calibrateSoundCheck.current !== "none") {
            displayCompleteTransducerTable(
              loudspeakerInfo.current,
              microphoneInfo.current,
              elems,
              deviceType.isLoudspeaker,
              calibrateSoundCheck.current === "both"
                ? "system"
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
                ? "system"
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
              calibrateSoundCheck.current === "system" ||
              calibrateSoundCheck.current === "goal"
            ) {
              displayParametersAllHz(
                elems,
                calibrateSoundCheck.current === "system"
                  ? microphoneCalibrationResult.current.system
                  : microphoneCalibrationResult.current.component,
                titleallHz,
                calibrateSoundCheck.current,
                false,
                microphoneCalibrationResult.current.background_noise,
                microphoneCalibrationResult.current.mls_psd,
                loudspeakerIR,
                calibrateSoundCheck.current === "system"
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
                "system",
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
                "goal",
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
    if (!showSoundTestPageBool) {
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
  document.querySelector("#root").style.visibility = "hidden";
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
  citation.setAttribute("id", "citation");

  // container.style.lineHeight = "1rem";
  // title.innerHTML = copy.soundCalibration;
  // font size for title
  title.style.fontSize = "1.5em";
  title.style.marginBottom = "0px";
  //replace "111" with 1 and 222 with 3
  // title.innerHTML = title.innerHTML.replace(/111/g, 1);
  // title.innerHTML = title.innerHTML.replace(/222/g, 6);
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

/* -------------------------------------------------------------------------- */

const getCmValue = (numericalValue, unit) => {
  if (unit === "cm") return numericalValue;
  else return numericalValue * 2.54;
};
