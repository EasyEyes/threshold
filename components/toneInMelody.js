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
  parameters
) => {
  // create masker
  //pick random masker
  var randomIndex = Math.floor(
    Math.random() * maskerList[blockCondition].length
  );
  var trialMasker = await maskerList[blockCondition][randomIndex]["file"];

  var trialMaskerData = trialMasker.getChannelData(0);
  setWaveFormToZeroDbSPL(trialMaskerData);

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
  const noiseDB = CompressorInverseDb(
    whiteNoiseLevel - soundGainDBSPL,
    parameters.T,
    parameters.R,
    parameters.W
  );
  const noiseMaxOverRms =
    getMaxValueOfAbsoluteValueOfBuffer(whiteNoiseData) / 1;
  const noiseGain = getGainValue(noiseDB);

  if (noiseMaxOverRms * noiseGain > 1) {
    throw "The noise level given is too high to play without distortion";
  }
  const maskerMaxOverRms =
    getMaxValueOfAbsoluteValueOfBuffer(trialMaskerData) / 1;
  const maskerDB = CompressorInverseDb(
    maskerVolumeDbSPL - soundGainDBSPL,
    parameters.T,
    parameters.R,
    parameters.W
  );
  const maskerGain = getGainValue(maskerDB);
  if (maskerMaxOverRms * maskerGain > 1) {
    throw "The masker level given is too high to play without distortion";
  }
  if (maskerMaxOverRms * maskerGain + noiseMaxOverRms * noiseGain > 1) {
    throw "The masker and noise levels given are too high to play together without distortion";
  }

  //modify masker and noise
  adjustSoundDbSPL(trialMaskerData, maskerDB);
  adjustSoundDbSPL(whiteNoiseData, noiseDB);

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
        parameters,
        trialTargetData,
        trialMaskerData,
        maskerVolumeDbSPL,
        whiteNoiseData,
        whiteNoiseLevel
      );

    adjustSoundDbSPL(trialTargetData, correctedValuesForTarget.inDB);
    targetVolume = correctedValuesForTarget.correctedSoundDBSPL;
  }

  return targetIsPresentBool
    ? {
        trialSoundMelody: mergeBuffers(
          [trialMasker, trialTarget, whiteNoise],
          audioCtx
        ),
        targetVolume: targetVolume,
      }
    : { trialSoundMelody: mergeBuffers([trialMasker, whiteNoise], audioCtx) };
};

export const getCorrectedInDbAndSoundDBSPLForToneInMelody = (
  soundDBSPL,
  soundGain,
  parameters,
  audioData,
  trialMaskerData,
  maskerLevel,
  whiteNoiseData,
  whiteNoiseLevel
) => {
  const noiseDB = CompressorInverseDb(
    whiteNoiseLevel - soundGain,
    parameters.T,
    parameters.R,
    parameters.W
  );
  const noiseMaxOverRms =
    getMaxValueOfAbsoluteValueOfBuffer(whiteNoiseData) / 1;
  const noiseGain = getGainValue(noiseDB);

  const maskerMaxOverRms =
    getMaxValueOfAbsoluteValueOfBuffer(trialMaskerData) / 1;
  const maskerDB = CompressorInverseDb(
    maskerLevel - soundGain,
    parameters.T,
    parameters.R,
    parameters.W
  );
  const maskerGain = getGainValue(maskerDB);

  const targetMaxOverRms = getMaxValueOfAbsoluteValueOfBuffer(audioData) / 1;
  const targetCeiling =
    1 - maskerMaxOverRms * maskerGain - noiseMaxOverRms * noiseGain;
  const targetDB = CompressorInverseDb(
    soundDBSPL - soundGain,
    parameters.T,
    parameters.R,
    parameters.W
  );
  const targetGain = getGainValue(targetDB);

  const inDB =
    targetMaxOverRms * targetGain > targetCeiling
      ? calculateDBFromRMS(targetCeiling / targetMaxOverRms)
      : targetDB;
  const correctedSoundDBSPL =
    soundGain + CompressorDb(inDB, parameters.T, parameters.R, parameters.W);
  return { inDB, correctedSoundDBSPL };
};
