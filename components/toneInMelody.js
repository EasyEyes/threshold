import JSZip from "jszip";

import mergeBuffers from "merge-audio-buffers";
import {
  getAudioBufferFromArrayBuffer,
  setWaveFormToZeroDbSPL,
  adjustSoundDbSPL,
  audioCtx,
} from "./soundUtils";
var maskerList = {};
var targetList = {};

var whiteNoise;
var whiteNoiseData;
export const initToneInMelodySoundFiles = async (
  maskerFolderNames,
  targetFolderNames
) => {
  maskerList = {};
  targetList = {};
  //load maskers
  await maskerFolderNames.map(async (name) => {
    maskerList[name] = [];
    //console.log(name);
    await fetch(`folders/${name}.zip`)
      .then((response) => {
        return response.blob();
      })
      .then((data) => {
        var Zip = new JSZip();
        Zip.loadAsync(data).then((zip) => {
          zip.forEach((relativePath, zipEntry) => {
            maskerList[name].push(
              zipEntry.async("arraybuffer").then((data) => {
                return getAudioBufferFromArrayBuffer(data);
              })
            );
          });
        });
      });
  });
  //console.log(await maskerList["IM_Melody_Masker_Sounds"])
  //load target
  targetFolderNames.map(async (name) => {
    targetList[name] = [];
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

  // await fetch(`folders/${targetFolderName}.zip`)
  //   .then((response) => {
  //     return response.blob();
  //   })
  //   .then(async (data) => {
  //     return Zip.loadAsync(data).then((zip) => {
  //       var TargetSound;
  //       zip.forEach((relativePath, zipEntry) => {
  //         targetSound.push(
  //           zipEntry.async("arraybuffer").then((data) => {
  //             return getAudioBufferFromArrayBuffer(data);
  //           })
  //         );
  //       });
  //       return targetSound;
  //     });
  //   });

  //console.log("target:", targetSound);
};

export const getToneInMelodyTrialData = async (
  maskerFolderName,
  targetFolderName,
  targetIsPresentBool,
  targetVolumeDbSPLFromQuest,
  maskerVolumDbSPL,
  whiteNoiseLevel,
  soundGainDBSPL
) => {
  //pick random masker
  var randomIndex = Math.floor(
    Math.random() * maskerList[maskerFolderName].length
  );
  var trialMasker = await maskerList[maskerFolderName][randomIndex];

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
    randomIndex = Math.floor(
      Math.random() * targetList[targetFolderName].length
    );
    trialTarget = await targetList[targetFolderName][randomIndex];

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
