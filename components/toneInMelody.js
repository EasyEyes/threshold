import mergeBuffers from "merge-audio-buffers";
import { soundCalibrationResults } from "./global";
import {
  calculateDBFromRMS,
  CompressorDb,
  CompressorInverseDb,
  getGainValue,
  getMaxValueOfAbsoluteValueOfBuffer,
} from "./soundTest";
import {
  setWaveFormToZeroDbSPL,
  adjustSoundDbSPL,
  audioCtx,
  initSoundFiles,
  loadVocoderPhraseSoundFiles,
  initSoundFilesWithPromiseAll,
} from "./soundUtils";
import {
  getVocoderPhraseTrialData,
  initVocoderPhraseSoundFiles,
} from "./vocoderPhrase";

var maskerList = {};
var targetList = {};

var whiteNoise;
var whiteNoiseData;

export const initToneInMelodySoundFiles = async (trialsConditions) => {
  // var x = await initVocoderPhraseSoundFiles(trialsConditions); //remove
  // console.log("x",await x)
  // initSoundFilesWithPromiseAll
  const blockFiles = await initSoundFilesWithPromiseAll(trialsConditions);
  maskerList = blockFiles["maskers"];
  targetList = blockFiles["target"];
};

export const getToneInMelodyTrialData = async (
  blockCondition,
  targetIsPresentBool,
  targetVolumeDbSPLFromQuest,
  maskerVolumeDbSPL,
  whiteNoiseLevel,
  soundGainDBSPL,
  targetSoundNoiseBool
) => {
  // create masker
  //pick random masker
  var randomIndex = Math.floor(
    Math.random() * maskerList[blockCondition].length
  );
  var trialMasker = await maskerList[blockCondition][randomIndex]["file"];

  var trialMaskerData = trialMasker.getChannelData(0);
  setWaveFormToZeroDbSPL(trialMaskerData);

  var noiseMaxOverRms = 0;
  var noiseGain = 0;
  if (targetSoundNoiseBool) {
    // create white noise
    whiteNoise = audioCtx.createBuffer(
      1,
      trialMaskerData.length,
      audioCtx.sampleRate
    );
    whiteNoiseData = whiteNoise.getChannelData(0);
    for (var i = 0; i < whiteNoiseData.length; i++) {
      whiteNoiseData[i] = Math.random() * 2 - 1;
    }
    setWaveFormToZeroDbSPL(whiteNoiseData);

    // check noise and masker levels
    const noiseDB = whiteNoiseLevel - soundGainDBSPL;
    noiseMaxOverRms = getMaxValueOfAbsoluteValueOfBuffer(whiteNoiseData) / 1;
    noiseGain = getGainValue(noiseDB);
    if (noiseMaxOverRms * noiseGain > 1) {
      throw "The noise level given is too high to play without distortion";
    }
  }

  const maskerMaxOverRms =
    getMaxValueOfAbsoluteValueOfBuffer(trialMaskerData) / 1;
  const maskerDB = maskerVolumeDbSPL - soundGainDBSPL;
  const maskerGain = getGainValue(maskerDB);
  if (maskerMaxOverRms * maskerGain > 1) {
    throw "The masker level given is too high to play without distortion";
  }

  if (targetSoundNoiseBool) {
    if (maskerMaxOverRms * maskerGain + noiseMaxOverRms * noiseGain > 1) {
      throw "The masker and noise levels given are too high to play together without distortion";
    }
  }

  //modify masker and noise
  adjustSoundDbSPL(trialMaskerData, maskerDB);
  if (targetSoundNoiseBool) adjustSoundDbSPL(whiteNoiseData, noiseDB);

  var trialTarget;
  var targetVolume;
  if (targetIsPresentBool) {
    //pick and modify target
    //console.log(await targetSound);
    //trialTarget = await getAudioBufferFromArrayBuffer(await targetSound);
    randomIndex = Math.floor(Math.random() * targetList[blockCondition].length);
    trialTarget = await targetList[blockCondition][randomIndex]["file"];

    var trialTargetData = trialTarget.getChannelData(0);
    setWaveFormToZeroDbSPL(trialTargetData);
    // adjust target volume
    const correctedValuesForTarget =
      getCorrectedInDbAndSoundDBSPLForToneInMelody(
        targetVolumeDbSPLFromQuest,
        soundGainDBSPL,
        trialTargetData,
        1 - maskerMaxOverRms * maskerGain - noiseMaxOverRms * noiseGain
      );

    adjustSoundDbSPL(trialTargetData, correctedValuesForTarget.inDB);
    targetVolume = correctedValuesForTarget.correctedSoundDBSPL;
  }

  return targetIsPresentBool
    ? {
        trialSoundMelody: targetSoundNoiseBool
          ? mergeBuffers([trialMasker, trialTarget, whiteNoise], audioCtx)
          : mergeBuffers([trialMasker, trialTarget], audioCtx),
        targetVolume: targetVolume,
      }
    : {
        trialSoundMelody: targetSoundNoiseBool
          ? mergeBuffers([trialMasker, whiteNoise], audioCtx)
          : trialMasker,
      };
};

export const getCorrectedInDbAndSoundDBSPLForToneInMelody = (
  soundDBSPL,
  soundGain,
  audioData,
  targetCeiling
) => {
  const targetMaxOverRms = getMaxValueOfAbsoluteValueOfBuffer(audioData) / 1;

  const targetDB = soundDBSPL - soundGain;
  const targetGain = getGainValue(targetDB);

  const inDB =
    targetMaxOverRms * targetGain > targetCeiling
      ? calculateDBFromRMS(targetCeiling / targetMaxOverRms)
      : targetDB;
  const correctedSoundDBSPL = soundGain + inDB;
  return { inDB, correctedSoundDBSPL };
};
