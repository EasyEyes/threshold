import JSZip from "jszip";
import arrayBufferToAudioBuffer from "arraybuffer-to-audiobuffer";
import mergeBuffers from "merge-audio-buffers";

var maskerList = {};

var targetSound = undefined;
var Zip = new JSZip();
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

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
                return getAudioBufferFromArrayBuffer(data);
              })
            );
          });
        });
      });
  });

  //load target
  await fetch(`folders/${targetFolderName}.zip`)
    .then((response) => {
      return response.blob();
    })
    .then(async (data) => {
      return Zip.loadAsync(data).then((zip) => {
        var TargetSound;
        zip.forEach((relativePath, zipEntry) => {
          targetSound.push(
            zipEntry.async("arraybuffer").then((data) => {
              return getAudioBufferFromArrayBuffer(data);
            })
          );
        });
        return TargetSound;
      });
    });

  //console.log("target:", targetSound);
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
  const Squares = arr.map((val) => val * val);
  const Sum = Squares.reduce((acum, val) => acum + val);
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
  //console.log(trialMasker);
  //trialMasker = await getAudioBufferFromArrayBuffer(trialMasker);
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
    //pick and modify target
    //console.log(await targetSound);
    //trialTarget = await getAudioBufferFromArrayBuffer(await targetSound);
    randomIndex = Math.floor(Math.random() * targetSound.length);
    trialTarget = await targetSound[randomIndex];
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
  var source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);
  source.start();
};
