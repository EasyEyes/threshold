import JSZip from "jszip";
import arrayBufferToAudioBuffer from "arraybuffer-to-audiobuffer";
import mergeBuffers from "merge-audio-buffers";

var maskerList = {};
var targetSound;
var Zip = new JSZip();
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var whiteNoise;
var whiteNoiseData;
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
  var t = await fetch(`folders/${targetFolderName}.zip`)
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
        return targetSound;
      });
    });

  //console.log("target:", targetSound);

  //white noise
  t = await t[0];
  whiteNoise = audioCtx.createBuffer(1, t.length, audioCtx.sampleRate);
  whiteNoiseData = whiteNoise.getChannelData(0);
  for (var i = 0; i < whiteNoiseData.length; i++) {
    whiteNoiseData[i] = Math.random() * 2 - 1;
  }
  setWaveFormToZeroDbSPL(whiteNoiseData);
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
  for (var i = 0; i < arr.length; i++) {
    arr[i] = arr[i] / rms;
  }
  //don't change to:
  //arr.forEach((elem) => elem / rms);
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
  for (var i = 0; i < arr.length; i++) {
    arr[i] *= gain;
  }
  //don't change to:
  //arr.forEach((elem) => elem * gain);
  return arr;
};

export const getTrialData = async (
  maskerFolderName,
  targetIsPresentBool,
  targetVolumeDbSPLFromQuest,
  maskerVolumDbSPL,
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
    randomIndex = Math.floor(Math.random() * targetSound.length);
    trialTarget = await targetSound[randomIndex];

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
    console.log(getRMSOfWaveForm(trialTargetData));
    adjustSoundDbSPL(
      trialTargetData,
      targetVolumeDbSPLFromQuest - soundGainDBSPL
    );
  }

  adjustSoundDbSPL(whiteNoiseData, 15 - soundGainDBSPL);

  return targetIsPresentBool
    ? mergeBuffers([trialMasker, trialTarget, whiteNoise], audioCtx)
    : mergeBuffers([trialMasker, whiteNoise], audioCtx);
};

export const playAudioBuffer = (audioBuffer) => {
  var source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);
  source.start();
};
