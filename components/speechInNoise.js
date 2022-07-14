import mergeBuffers from "merge-audio-buffers";
import {
  setWaveFormToZeroDbSPL,
  adjustSoundDbSPL,
  audioCtx,
  initSoundFiles,
} from "./soundUtils";
//var maskerList = {};
var targetList = {};

var whiteNoise;
var whiteNoiseData;

export const initSpeechInNoiseSoundFiles = async (trialsConditions) => {
  const blockFiles = await initSoundFiles(trialsConditions);
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
  soundGainDBSPL
) => {
  var trialTarget;

  //pick and modify target
  var randomIndex = Math.floor(
    Math.random() * targetList[blockCondition].length
  );
  trialTarget = await targetList[blockCondition][randomIndex]["file"];
  var trialTargetData = trialTarget.getChannelData(0);
  setWaveFormToZeroDbSPL(trialTargetData);
  adjustSoundDbSPL(
    trialTargetData,
    targetVolumeDbSPLFromQuest - soundGainDBSPL
  );

  whiteNoise = audioCtx.createBuffer(
    1,
    trialTargetData.length,
    audioCtx.sampleRate
  );

  whiteNoiseData = whiteNoise.getChannelData(0);
  for (var i = 0; i < whiteNoiseData.length; i++) {
    whiteNoiseData[i] = Math.random() * 2 - 1;
  }
  setWaveFormToZeroDbSPL(whiteNoiseData);
  adjustSoundDbSPL(whiteNoiseData, whiteNoiseLevel - soundGainDBSPL);
  return {
    targetList: targetList[blockCondition],
    trialSound: mergeBuffers([trialTarget, whiteNoise], audioCtx),
    correctAnsIndex: randomIndex,
  };
  //return mergeBuffers([trialTarget, whiteNoise], audioCtx);
};
