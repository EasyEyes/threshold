import mergeBuffers from "merge-audio-buffers";
import { soundCalibrationResults } from "./global";
import { getCorrectedInDbAndSoundDBSPL } from "./soundTest";
import {
  setWaveFormToZeroDbSPL,
  adjustSoundDbSPL,
  audioCtx,
  initSoundFiles,
  initSoundFilesWithPromiseAll,
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
      // console.log("targetList", targetList);
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
  parameters
) => {
  var trialTarget;

  //pick and modify target
  var randomIndex = Math.floor(
    Math.random() * targetList[blockCondition].length
  );
  trialTarget = await targetList[blockCondition][randomIndex]["file"];
  var trialTargetData = trialTarget.getChannelData(0);
  setWaveFormToZeroDbSPL(trialTargetData);
  // adjust target volume
  // const parameters = soundCalibrationResults.current.parameters;
  const correctedValuesForTarget = getCorrectedInDbAndSoundDBSPL(
    targetVolumeDbSPLFromQuest,
    soundGainDBSPL,
    parameters,
    trialTargetData
  );
  adjustSoundDbSPL(trialTargetData, correctedValuesForTarget.inDB);

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
  // adjust white noise volume
  const correctedValuesForWhiteNoise = getCorrectedInDbAndSoundDBSPL(
    whiteNoiseLevel,
    soundGainDBSPL,
    parameters,
    whiteNoiseData
  );
  adjustSoundDbSPL(whiteNoiseData, correctedValuesForWhiteNoise.inDB);

  return {
    targetList: targetList[blockCondition],
    trialSound: mergeBuffers([trialTarget, whiteNoise], audioCtx),
    correctAnsIndex: randomIndex,
    targetVolume: correctedValuesForTarget.correctedSoundDBSPL,
  };
  //return mergeBuffers([trialTarget, whiteNoise], audioCtx);
};
