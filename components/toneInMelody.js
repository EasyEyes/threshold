import mergeBuffers from "merge-audio-buffers";
import {
  setWaveFormToZeroDbSPL,
  adjustSoundDbSPL,
  audioCtx,
  initSoundFiles,
} from "./soundUtils";

var maskerList = {};
var targetList = {};

var whiteNoise;
var whiteNoiseData;

export const initToneInMelodySoundFiles = async (trialsConditions) => {
  const blockFiles = await initSoundFiles(trialsConditions);
  maskerList = blockFiles["maskers"];
  targetList = blockFiles["target"];
};

export const getToneInMelodyTrialData = async (
  blockCondition,
  targetIsPresentBool,
  targetVolumeDbSPLFromQuest,
  maskerVolumDbSPL,
  whiteNoiseLevel,
  soundGainDBSPL
) => {
  //pick random masker
  var randomIndex = Math.floor(
    Math.random() * maskerList[blockCondition].length
  );
  var trialMasker = await maskerList[blockCondition][randomIndex]["file"];

  //modify masker
  //console.log(trialMasker);
  //trialMasker = await getAudioBufferFromArrayBuffer(trialMasker);

  //this implementation works as well
  // var trialMaskerData = new Float32Array(trialMasker.length);
  // trialMasker.copyFromChannel(trialMaskerData, 0, 0);
  // trialMaskerData = setWaveFormToZeroDbSPL(trialMaskerData);
  // trialMaskerData = adjustSoundDbSPL(trialMaskerData, maskerVolumDbSPL);
  // trialMasker = audioCtx.createBuffer(
  //   1,
  //   trialMaskerData.length,
  //   audioCtx.sampleRate
  // );
  // trialMasker.copyToChannel(trialMaskerData, 0, 0);

  //better implementation
  var trialMaskerData = trialMasker.getChannelData(0);
  trialMaskerData = setWaveFormToZeroDbSPL(trialMaskerData);
  trialMaskerData = adjustSoundDbSPL(
    trialMaskerData,
    maskerVolumDbSPL - soundGainDBSPL
  );

  var trialTarget;
  if (targetIsPresentBool) {
    //pick and modify target
    //console.log(await targetSound);
    //trialTarget = await getAudioBufferFromArrayBuffer(await targetSound);
    randomIndex = Math.floor(Math.random() * targetList[blockCondition].length);
    trialTarget = await targetList[blockCondition][randomIndex]["file"];

    //this implementation works as well
    // var trialTargetData = new Float32Array(trialTarget.length);
    // trialTarget.copyFromChannel(trialTargetData, 0, 0);
    // trialTargetData = setWaveFormToZeroDbSPL(trialTargetData);
    // trialTargetData = adjustSoundDbSPL(
    //   trialTargetData,
    //   targetVolumeDbSPLFromQuest
    // );
    // trialTarget = audioCtx.createBuffer(
    //   1,
    //   trialTargetData.length,
    //   audioCtx.sampleRate
    // );
    // trialTarget.copyToChannel(trialTargetData, 0, 0);

    //better implementation
    var trialTargetData = trialTarget.getChannelData(0);
    setWaveFormToZeroDbSPL(trialTargetData);
    adjustSoundDbSPL(
      trialTargetData,
      targetVolumeDbSPLFromQuest - soundGainDBSPL
    );
  }

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

  return targetIsPresentBool
    ? mergeBuffers([trialMasker, trialTarget, whiteNoise], audioCtx)
    : mergeBuffers([trialMasker, whiteNoise], audioCtx);
};
