import { ExperimentHandler } from "../psychojs/src/data/ExperimentHandler.js";
import { Scheduler } from "../psychojs/src/util/index.js";
import { isProlificExperiment } from "./externalServices.js";

import { hideForm, showForm } from "./forms";
import {
  eyeTrackingStimulusRecords,
  localStorageKey,
  rc,
  showCharacterSetResponse,
  thisExperimentInfo,
  soundCalibrationResults,
  allHzCalibrationResults,
  loudspeakerInfo,
  loudspeakerIR,
  microphoneCalibrationResults,
  invertedImpulseResponse,
  calibrateSoundSaveJSONBool,
  calibrateSoundBurstDb,
  calibrateSoundBurstSec,
  calibrateSoundBurstRepeats,
  calibrateSoundIIRSec,
  calibrateSoundMinHz,
  calibrateSoundMaxHz,
  calibrateSound1000HzSec,
  calibrateSound1000HzPreSec,
  calibrateSound1000HzPostSec,
  calibrateSoundHz,
} from "./global";
import { clock, psychoJS } from "./globalPsychoJS";
import { removeBeepButton, removeProceedButton } from "./instructions.js";
import { destroyProgressBar } from "./progressBar.js";
import { recruitmentServiceData } from "./recruitmentService";
import { downloadTextFile } from "./saveFile.js";
import { removeClickableCharacterSet } from "./showCharacterSet";
import { showCursor, sleep } from "./utils";
import { useMatlab, closeMatlab } from "./connectMatlab";

export async function quitPsychoJS(message = "", isCompleted, paramReader) {
  psychoJS.experiment.addData("experimentCompleteBool", isCompleted);
  if (useMatlab.current) {
    closeMatlab();
    // psychoJS.experiment.saveCSV(eyeTrackingStimulusRecords);
  }

  removeClickableCharacterSet(showCharacterSetResponse);
  removeBeepButton();
  removeProceedButton();
  destroyProgressBar();

  // RC
  rc.endGaze();
  rc.endNudger();
  rc.endDistance();

  showCursor();

  if (psychoJS.experiment) {
    // Check for and save orphaned data
    if (psychoJS.experiment && psychoJS.experiment.isEntryEmpty()) {
      psychoJS.experiment.nextEntry();
    }

    psychoJS.window.close();
  }

  // debrief
  const timeBeforeDebriefDisplay = clock.global
    ? clock.global.getTime()
    : undefined;
  const debriefScreen = new Promise((resolve) => {
    if (paramReader.read("_debriefForm")[0]) {
      showForm(paramReader.read("_debriefForm")[0]);
      document.getElementById("form-yes").addEventListener("click", () => {
        hideForm();
        resolve();
      });

      document.getElementById("form-no").addEventListener("click", () => {
        hideForm();
        resolve();
      });
    } else {
      resolve();
    }
  });
  await debriefScreen;

  if (psychoJS.experiment && clock.global) {
    psychoJS.experiment.addData(
      "debriefDurationSec",
      clock.global.getTime() - timeBeforeDebriefDisplay
    );
    psychoJS.experiment.addData(
      "durationOfExperimentSec",
      clock.global.getTime()
    );
  }

  // QUIT FULLSCREEN
  if (rc.isFullscreen.value) {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  }

  // save user id
  sleep(250);
  if (
    paramReader.read("_participantIDPutBool")[0] &&
    thisExperimentInfo.EasyEyesID
  ) {
    // ! NOTICE
    // ! after changing the file format
    // ! make sure you also update crossSession.js to update how to parse it
    downloadTextFile(
      `EasyEyes_${thisExperimentInfo.session}_${thisExperimentInfo.EasyEyesID}.txt`,
      `Please keep this file to facilitate participation in future sessions. When an experiment has several sessions, you can use this file to connect them, while retaining your anonymity.

EasyEyesID              ${thisExperimentInfo.EasyEyesID}
EasyEyesSession         ${thisExperimentInfo.session}
participant             ${thisExperimentInfo.participant}

file                    ${thisExperimentInfo.experimentFilename
        .split("/")
        .pop()}
date                    ${thisExperimentInfo.date.toString()}` +
        (isProlificExperiment()
          ? `

ProlificParticipantID   ${thisExperimentInfo.ProlificParticipantID}
ProlificSession         ${thisExperimentInfo.ProlificSessionID}
ProlificStudyID         ${thisExperimentInfo.ProlificStudyID}`
          : "")
    );
  }
  // save to local storage
  if (thisExperimentInfo.participant)
    localStorage.setItem(
      localStorageKey,
      JSON.stringify({
        ...thisExperimentInfo,
      })
    );

  if (recruitmentServiceData.name == "Prolific" && isCompleted) {
    let additionalMessage = ` Please go to Prolific to complete the experiment.`;
    // logPsychoJSQuit(
    //   "_beforeQuitFunction",
    //   window.location.toString(),
    //   rc.id.value
    // );
    const quitOptions = {
      message: message + additionalMessage,
      isCompleted: isCompleted,
      okText: "Go to Prolific to complete the experiment",
      okUrl: recruitmentServiceData.url,
    };
    if (eyeTrackingStimulusRecords.length)
      quitOptions.additionalCSVData = eyeTrackingStimulusRecords;
    psychoJS.quit(quitOptions);
    // logPsychoJSQuit(
    //   "_afterQuitFunction",
    //   window.location.toString(),
    //   rc.id.value
    // );
  } else {
    // logPsychoJSQuit(
    //   "_beforeQuitFunction",
    //   window.location.toString(),
    //   rc.id.value
    // );
    const quitOptions = {
      message: message,
      isCompleted: isCompleted,
      okText: "OK",
    };
    if (eyeTrackingStimulusRecords.length)
      quitOptions.additionalCSVData = eyeTrackingStimulusRecords;
    psychoJS.quit(quitOptions);
    // logPsychoJSQuit(
    //   "_afterQuitFunction",
    //   window.location.toString(),
    //   rc.id.value
    // );
    let objectData = [];
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
        dB_component_iir:
          soundCalibrationResults.current?.component?.iir_psd?.y,
        Hz_component_iir:
          soundCalibrationResults.current?.component?.iir_psd?.x,
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
        "Loudspeaker model": loudspeakerInfo.current,
        micInfo: soundCalibrationResults.current?.micInfo,
        unconv_rec: soundCalibrationResults.current?.unfiltered_recording,
        conv_rec: soundCalibrationResults.current?.filtered_recording,
        mls: soundCalibrationResults.current?.mls,
        componentConvolution:
          soundCalibrationResults.current?.component?.convolution,
        systemConvolution: soundCalibrationResults.current?.system?.convolution,
        autocorrelations: {},
        // backgroundNoise: soundCalibrationResults.current?.background_noise,
        backgroundRecording:
          soundCalibrationResults.current?.background_noise?.recording,
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
        calibrateSoundBurstDb: calibrateSoundBurstDb.current,
        calibrateSoundBurstSec: calibrateSoundBurstSec.current,
        calibrateSoundBurstRepeats: calibrateSoundBurstRepeats.current,
        calibrateSoundIIRSec: calibrateSoundIIRSec.current,
        calibrateSoundMinHz: calibrateSoundMinHz.current,
        calibrateSoundMaxHz: calibrateSoundMaxHz.current,
        calibrateSound1000HzSec: calibrateSound1000HzSec.current,
        calibrateSound1000HzPreSec: calibrateSound1000HzPreSec.current,
        calibrateSound1000HzPostSec: calibrateSound1000HzPostSec.current,
        calibrateSoundHz: calibrateSoundHz.current,
        filteredMLSRange: allHzCalibrationResults.filteredMLSRange,
      };
    }

    if (
      microphoneCalibrationResults.length > 0 &&
      calibrateSoundSaveJSONBool.current
    ) {
      for (let i = 0; i < microphoneCalibrationResults.length; i++) {
        console.log(i);
        psychoJS.experiment.downloadJSON(
          microphoneCalibrationResults[i],
          i + 1
        );
      }
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
      psychoJS.experiment.downloadJSON(allSoundResults, 0);
  }

  return Scheduler.Event.QUIT;
}

export const getPavloviaProjectName = (nameFromTable) => {
  if (
    psychoJS.getEnvironment() === ExperimentHandler.Environment.SERVER &&
    psychoJS._config &&
    psychoJS._config.experiment
  )
    return psychoJS._config.experiment.name;
  else return nameFromTable ? nameFromTable : "unknown";
};
