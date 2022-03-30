import JSZip from "jszip";
import arrayBufferToAudioBuffer from "arraybuffer-to-audiobuffer";
import mergeBuffers from "merge-audio-buffers";
import { Buffer } from "buffer";
var maskerList = {};

var targetSound = undefined;
var Zip = new JSZip();
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var source = audioCtx.createBufferSource();
var gainNode = audioCtx.createGain();

export const initSoundFiles = async (maskerFolderNames, targetFolderName) => {
  maskerList = {};
  targetSound = [];

  //load maskers
  maskerFolderNames.map(async (name) => {
    maskerList[name] = [];
    await fetch(`folders/${name}.zip`)
      .then((response) => {
        return response.blob();
      })
      .then((data) => {
        Zip.loadAsync(data).then((zip) => {
          zip.forEach((relativePath, zipEntry) => {
            maskerList[name].push(
              zipEntry.async("arraybuffer").then((data) => {
                return data;
              })
            );
          });
        });
      });
  });

  //load target
  targetSound = await fetch(`folders/${targetFolderName}.zip`)
    .then((response) => {
      return response.blob();
    })
    .then(async (data) => {
      return Zip.loadAsync(data).then((zip) => {
        var TargetSound = 2;
        zip.forEach((relativePath, zipEntry) => {
          TargetSound = zipEntry.async("arraybuffer").then((data) => {
            return data;
          });
        });
        //console.log("here:",TargetSound);
        return TargetSound;
      });
    });
};

const getAudioBufferFromArrayBuffer = (arrayBuffer) => {
  return arrayBufferToAudioBuffer(arrayBuffer, audioCtx).then((audioBuffer) => {
    return audioBuffer;
  });
};

const setWaveFormToZeroDbSPL = (arr) => {
  const rms = getRMSOfWaveForm(arr);
  //normalize to 0 db spl
  //by convention sound with a mean square of 1 is at 0 db
  arr = arr.map((elem) => elem / rms);
  return arr;
};

const getRMSOfWaveForm = (arr) => {
  arr.forEach((val) => val * val);
  const Sum = arr.reduce((acum, val) => acum + val);
  const Mean = Sum / arr.length;
  return Math.sqrt(Mean);
};

const adjustSoundDbSPL = (arr, volumeDbSPL) => {
  const gain = 10 ** (volumeDbSPL / 20);
  arr = arr.map((elem) => elem * gain);
  return arr;
};

export const getTrialData = async (
  maskerFolderName,
  targetIsPresentBool,
  targetVolumeDbSPLFromQuest,
  maskerVolumDbSPL
) => {
  //pick random masker
  var randomIndex = Math.floor(
    Math.random() * maskerList[maskerFolderName].length
  );
  var trialMasker = await maskerList[maskerFolderName][randomIndex];

  //modify masker
  trialMasker = await getAudioBufferFromArrayBuffer(trialMasker);
  var trialMaskerData = new Float32Array(trialMasker.length);
  trialMasker.copyFromChannel(trialMaskerData, 0, 0);
  trialMaskerData = setWaveFormToZeroDbSPL(trialMaskerData);
  trialMaskerData = adjustSoundDbSPL(trialMaskerData, maskerVolumDbSPL);
  trialMasker = audioCtx.createBuffer(
    1,
    trialMaskerData.length,
    audioCtx.sampleRate
  );
  trialMasker.copyToChannel(trialMaskerData, 0, 0);

  var trialTarget;
  if (targetIsPresentBool) {
    trialTarget = await getAudioBufferFromArrayBuffer(await targetSound);
    var trialTargetData = new Float32Array(trialTarget.length);
    trialTarget.copyFromChannel(trialTargetData, 0, 0);
    trialTargetData = setWaveFormToZeroDbSPL(trialTargetData);
    trialTargetData = adjustSoundDbSPL(
      trialTargetData,
      targetVolumeDbSPLFromQuest
    );
    trialTarget = audioCtx.createBuffer(
      1,
      trialTargetData.length,
      audioCtx.sampleRate
    );
    trialTarget.copyToChannel(trialTargetData, 0, 0);
  }

  return targetIsPresentBool
    ? mergeBuffers([trialMasker, trialTarget], audioCtx)
    : trialMasker;
};

export const playAudioBuffer = (audioBuffer) => {
  //getAudioBufferData(audioBuffer);
  //console.log(audioBuffer);
  //const seconds = 1;
  //const channelData = new Float32Array(Math.round(audioBuffer.sampleRate * seconds));

  //audioBuffer.copyFromChannel(channelData, 0, 0);
  //console.log(channelData);
  //console.log("sampleRate: ",audioBuffer.sampleRate);
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);
  source.start();
};
