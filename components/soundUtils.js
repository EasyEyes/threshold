import arrayBufferToAudioBuffer from "arraybuffer-to-audiobuffer";
import JSZip from "jszip";

export var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export const getAudioBufferFromArrayBuffer = (arrayBuffer) => {
  return arrayBufferToAudioBuffer(arrayBuffer, audioCtx).then((audioBuffer) => {
    return audioBuffer;
  });
};

export const setWaveFormToZeroDbSPL = (arr) => {
  const rms = getRMSOfWaveForm(arr);
  //normalize to 0 db spl
  //by convention sound with a mean square of 1 is at 0 db
  if (rms != 0) {
    for (var i = 0; i < arr.length; i++) {
      arr[i] = arr[i] / rms;
    }
  }

  //don't change to:
  //arr.forEach((elem) => elem / rms);
  return arr;
};

export const getRMSOfWaveForm = (arr) => {
  const Squares = arr.map((val) => val * val);
  const Sum = Squares.reduce((acum, val) => acum + val);
  const Mean = Sum / arr.length;
  return Math.sqrt(Mean);
};

export const adjustSoundDbSPL = (arr, volumeDbSPL) => {
  const gain = 10 ** (volumeDbSPL / 20);
  for (var i = 0; i < arr.length; i++) {
    arr[i] *= gain;
  }
  //don't change to:
  //arr.forEach((elem) => elem * gain);
  return arr;
};

export const playAudioBuffer = (audioBuffer) => {
  var source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);
  source.start();
};

export const initSoundFiles = async (trialsConditions) => {
  var maskerList = {};
  var targetList = {};

  trialsConditions.map(async (condition) => {
    //console.log(condition)
    maskerList[condition["block_condition"]] = [];
    targetList[condition["block_condition"]] = [];
    //load maskers
    if (condition["maskerSoundFolder"] != "") {
      await fetch(`folders/${condition["maskerSoundFolder"]}.zip`)
        .then((response) => {
          return response.blob();
        })
        .then((data) => {
          var Zip = new JSZip();
          Zip.loadAsync(data).then((zip) => {
            zip.forEach((relativePath, zipEntry) => {
              maskerList[condition["block_condition"]].push(
                zipEntry.async("arraybuffer").then((data) => {
                  return getAudioBufferFromArrayBuffer(data);
                })
              );
            });
          });
        });
    }

    // load targeta
    if (condition["targetSoundFolder"] != "") {
      await fetch(`folders/${condition["targetSoundFolder"]}.zip`)
        .then((response) => {
          return response.blob();
        })
        .then((data) => {
          var Zip = new JSZip();
          Zip.loadAsync(data).then((zip) => {
            zip.forEach((relativePath, zipEntry) => {
              targetList[condition["block_condition"]].push(
                zipEntry.async("arraybuffer").then((data) => {
                  return getAudioBufferFromArrayBuffer(data);
                })
              );
            });
          });
        });
    }
  });

  return { maskers: maskerList, target: targetList };
};
