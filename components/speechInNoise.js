import mergeBuffers from "merge-audio-buffers";
import {
  soundCalibrationResults,
  targetSoundListFiles,
  targetSoundListMap,
  targetSoundListTrialData,
} from "./global";
import {
  calculateDBFromRMS,
  cloneAudioBuffer,
  CompressorDb,
  CompressorInverseDb,
  getGainValue,
  getMaxValueOfAbsoluteValueOfBuffer,
} from "./soundTest";
// import { getCorrectedInDbAndSoundDBSPL } from "./soundTest";
import {
  setWaveFormToZeroDbSPL,
  adjustSoundDbSPL,
  audioCtx,
  initSoundFiles,
  initSoundFilesWithPromiseAll,
  getAudioBufferFromArrayBuffer,
} from "./soundUtils";
//var maskerList = {};
var targetList = {};

var whiteNoise;
var whiteNoiseData;

export const initSpeechInNoiseSoundFiles = async (trialsConditions) => {
  const blockFiles = await initSoundFilesWithPromiseAll(trialsConditions);
  targetList = blockFiles["target"];

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (Object.keys(targetList).length !== 0) {
        clearInterval(interval);
        resolve(true);
      }
    }, 100);
  });
};

export const getSpeechInNoiseTrialData = async (
  blockCondition,
  targetVolumeDbSPLFromQuest,
  whiteNoiseLevel,
  soundGainDBSPL,
  targetSoundNoiseBool,
) => {
  var trialTarget;
  //pick and modify target
  var randomIndex = Math.floor(
    Math.random() * targetList[blockCondition].length,
  );
  trialTarget = await targetList[blockCondition][randomIndex]["file"];
  var trialTargetData = trialTarget.getChannelData(0);
  setWaveFormToZeroDbSPL(trialTargetData);

  var noiseMaxOverRms = 0;
  var noiseGain = 0;
  if (targetSoundNoiseBool) {
    whiteNoise = audioCtx.createBuffer(
      1,
      trialTargetData.length,
      audioCtx.sampleRate,
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

    // if (noiseMaxOverRms * noiseGain > 1) {
    //   throw new Error("The noise level given is too high to play without distortion");
    // }
    adjustSoundDbSPL(whiteNoiseData, noiseDB);
  }

  const correctedValuesForTarget =
    getCorrectedInDbAndSoundDBSPLForSpeechInNoise(
      targetVolumeDbSPLFromQuest,
      soundGainDBSPL,
      trialTargetData,
      1 - noiseMaxOverRms * noiseGain,
    );
  adjustSoundDbSPL(trialTargetData, correctedValuesForTarget.inDB);

  return {
    targetList: targetList[blockCondition],
    trialSound: targetSoundNoiseBool
      ? mergeBuffers([trialTarget, whiteNoise], audioCtx)
      : trialTarget,
    correctAnsIndex: randomIndex,
    targetVolume: correctedValuesForTarget.correctedSoundDBSPL,
  };
  //return mergeBuffers([trialTarget, whiteNoise], audioCtx);
};

export const getTargetSoundListTrialData = async (
  blockCondition,
  targetVolumeDbSPLFromQuest,
  whiteNoiseLevel,
  soundGainDBSPL,
  targetSoundNoiseBool,
) => {
  //choose the left and right targets from targetSoundListMap and get the file from targetSoundListFiles
  const currentIndex = targetSoundListMap[blockCondition].currentIndex;
  const leftTarget = targetSoundListMap[blockCondition].list[currentIndex].left;
  const rightTarget =
    targetSoundListMap[blockCondition].list[currentIndex].right;
  let leftTargetFile = targetSoundListFiles[blockCondition][leftTarget];
  let rightTargetFile = targetSoundListFiles[blockCondition][rightTarget];

  const leftTargetData = cloneAudioBuffer(leftTargetFile).getChannelData(0);
  const rightTargetData = cloneAudioBuffer(rightTargetFile).getChannelData(0);
  setWaveFormToZeroDbSPL(leftTargetData);
  setWaveFormToZeroDbSPL(rightTargetData);

  const correctedValuesForLeftTarget =
    getCorrectedInDbAndSoundDBSPLForSpeechInNoise(
      targetVolumeDbSPLFromQuest,
      soundGainDBSPL,
      leftTargetData,
      1,
    );

  const correctedValuesForRightTarget =
    getCorrectedInDbAndSoundDBSPLForSpeechInNoise(
      targetVolumeDbSPLFromQuest,
      soundGainDBSPL,
      rightTargetData,
      1,
    );

  adjustSoundDbSPL(leftTargetData, correctedValuesForLeftTarget.inDB);
  adjustSoundDbSPL(rightTargetData, correctedValuesForRightTarget.inDB);

  targetSoundListTrialData.left = { name: leftTarget, file: leftTargetFile };
  targetSoundListTrialData.right = { name: rightTarget, file: rightTargetFile };
  targetSoundListTrialData.targetVolume =
    correctedValuesForLeftTarget.correctedSoundDBSPL;
  targetSoundListTrialData.whiteNoiseLevel = whiteNoiseLevel;
  targetSoundListTrialData.trialSound = {
    names: [leftTarget, rightTarget],
    file: combineToStereo(audioCtx, leftTargetFile, rightTargetFile),
  };
  // targetSoundListTrialData.soundGainDBSPL = soundGainDBSPL;
  // targetSoundListTrialData.targetSoundNoiseBool = targetSoundNoiseBool;
  targetSoundListMap[blockCondition].currentIndex++;
};

const combineToStereo = (audioCtx, leftBuffer, rightBuffer) => {
  if (leftBuffer.sampleRate !== rightBuffer.sampleRate) {
    throw new Error("Left and right buffers must have the same sample rate");
  }

  const length = Math.max(leftBuffer.length, rightBuffer.length);
  const sampleRate = leftBuffer.sampleRate;
  const channels = 2;

  const stereoBuffer = audioCtx.createBuffer(channels, length, sampleRate);

  const leftChannel = stereoBuffer.getChannelData(0);
  leftChannel.set(leftBuffer.getChannelData(0));

  const rightChannel = stereoBuffer.getChannelData(1);
  rightChannel.set(rightBuffer.getChannelData(0));

  return stereoBuffer;
};

export const getCorrectedInDbAndSoundDBSPLForSpeechInNoise = (
  soundDBSPL,
  soundGain,
  audioData,
  targetCeiling,
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
