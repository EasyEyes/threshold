import JSZip from "jszip";

import mergeBuffers from "merge-audio-buffers";
import {
  getAudioBufferFromArrayBuffer,
  setWaveFormToZeroDbSPL,
  adjustSoundDbSPL,
  audioCtx,
} from "./soundUtils";
//var maskerList = {};
var targetList = {};

var whiteNoise;
var whiteNoiseData;

export const initSpeechInNoiseSoundFiles = async (targetFolderNames) => {
  targetList = {};
  //load target
  targetFolderNames.map(async (name) => {
    targetList[name] = [];
    console.log(name);
    await fetch(`folders/${name}.zip`)
      .then((response) => {
        return response.blob();
      })
      .then((data) => {
        var Zip = new JSZip();
        Zip.loadAsync(data).then((zip) => {
          zip.forEach((relativePath, zipEntry) => {
            targetList[name].push(
              zipEntry.async("arraybuffer").then((data) => {
                return getAudioBufferFromArrayBuffer(data);
              })
            );
          });
        });
      });
  });
};

export const getSpeechInNoiseTrialData = async (
  targetFolderName,
  targetVolumeDbSPLFromQuest,
  whiteNoiseLevel,
  soundGainDBSPL
) => {
  var trialTarget;

  //pick and modify target
  var randomIndex = Math.floor(
    Math.random() * targetList[targetFolderName].length
  );
  trialTarget = await targetList[targetFolderName][randomIndex];

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
