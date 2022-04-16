import mergeBuffers from "merge-audio-buffers";
import {
  setWaveFormToZeroDbSPL,
  adjustSoundDbSPL,
  audioCtx,
} from "./soundUtils";
//var maskerList = {};
var targetList = {};

var whiteNoise;
var whiteNoiseData;

export const initSpeechInNoiseSoundFiles = async (trialsConditions) => {
  const blockFiles = await initSoundFiles(trialsConditions);
  targetList = blockFiles["target"];
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
  trialTarget = await targetList[blockCondition][randomIndex];

  var trialTargetData = trialTarget.getChannelData(0);
  setWaveFormToZeroDbSPL(trialTargetData);
  adjustSoundDbSPL(
    trialTargetData,
    targetVolumeDbSPLFromQuest - soundGainDBSPL
  );

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
  adjustSoundDbSPL(whiteNoiseData, whiteNoiseLevel - soundGainDBSPL);

  return mergeBuffers([trialTarget, whiteNoise], audioCtx);
};
