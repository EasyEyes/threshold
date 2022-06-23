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
    console.log(condition);
    maskerList[condition["block_condition"]] = [];
    targetList[condition["block_condition"]] = [];
    //load maskers
    if (condition["maskerSoundFolder"]) {
      await fetch(`folders/${condition["maskerSoundFolder"]}.zip`)
        .then((response) => {
          return response.blob();
        })
        .then((data) => {
          var Zip = new JSZip();
          Zip.loadAsync(data).then((zip) => {
            zip.forEach((relativePath, zipEntry) => {
              var name = zipEntry.name;
              name = name.substring(0, name.lastIndexOf("."));
              maskerList[condition["block_condition"]].push({
                name: name,
                file: zipEntry.async("arraybuffer").then((data) => {
                  return getAudioBufferFromArrayBuffer(data);
                }),
              });
            });
          });
        });
    }

    // load target
    if (condition["targetSoundFolder"]) {
      await fetch(`folders/${condition["targetSoundFolder"]}.zip`)
        .then((response) => {
          return response.blob();
        })
        .then((data) => {
          var Zip = new JSZip();
          Zip.loadAsync(data).then((zip) => {
            zip.forEach((relativePath, zipEntry) => {
              var name = zipEntry.name;
              name = name.substring(0, name.lastIndexOf("."));
              targetList[condition["block_condition"]].push({
                name: name,
                file: zipEntry.async("arraybuffer").then((data) => {
                  return getAudioBufferFromArrayBuffer(data);
                }),
              });
            });
          });
        });
    }
  });

  return { maskers: maskerList, target: targetList };
};
var flag = true;
export const loadVocoderPhraseSoundFiles = async (trialsConditions) => {
  const maskerList = {};
  const targetList = {};
  trialsConditions.map(async (condition) => {
    //console.log("here.....", condition);
    maskerList[condition["block_condition"]] = {};
    targetList[condition["block_condition"]] = {};

    //load maskers
    if (condition["maskerSoundFolder"]) {
      console.log(`folders/${condition["maskerSoundFolder"]}.zip`);
      //await fetch(`folders/${condition["maskerSoundFolder"]}.zip`)
      await fetch(`folders/VocodedWord.zip`)
        .then((response) => response.blob())
        .then((data) => {
          var Zip = new JSZip();
          Zip.loadAsync(data).then(async (zip) => {
            //console.log(zip.files);
            zip.forEach(async (relativePath, zipEntry) => {
              //console.log( zipEntry.name.split("/").length,zipEntry)
              const Entryname = zipEntry.name.split("/");
              //eg: VocodedWord/Talker11/Baron.wav
              if (Entryname.length == 3) {
                if (zipEntry.dir) {
                  maskerList[condition["block_condition"]][Entryname[1]] = {};
                  //eg. {1_2: {talker11:{}}}
                } else {
                  //verify file name extension

                  //.substring(0, name[2].lastIndexOf(".")); //without extension
                  if (verifyFileNameExtension(Entryname[2])) {
                    const fileName = Entryname[2].split(".");
                    //eg Baron.hi.wav --> ['Baron', 'hi', 'wav']
                    // hi -> high frquency bands
                    // low freuqncy bands
                    const audioData = await zipEntry
                      .async("arrayBuffer")
                      .then((data) => {
                        return getAudioBufferFromArrayBuffer(data);
                      });
                    //console.log(audioData)
                    if (
                      maskerList[condition["block_condition"]][Entryname[1]][
                        fileName[0]
                      ]
                    )
                      maskerList[condition["block_condition"]][Entryname[1]][
                        fileName[0]
                      ][fileName[1]] = audioData;
                    else
                      maskerList[condition["block_condition"]][Entryname[1]][
                        fileName[0]
                      ] = { [fileName[1]]: audioData };
                  }
                }
              } else if (Entryname.length == 4) {
                if (zipEntry.dir)
                  maskerList[condition["block_condition"]][Entryname[1]][
                    Entryname[2]
                  ] = {};
                else {
                  if (verifyFileNameExtension(Entryname[3])) {
                    const audioData = await zipEntry
                      .async("arraybuffer")
                      .then((data) => {
                        return getAudioBufferFromArrayBuffer(data);
                      });
                    const fileName = Entryname[3].split(".");
                    //targetList[condition["block_condition"]][name[1]][name[2]][fileName[0]] = {};
                    if (
                      maskerList[condition["block_condition"]][Entryname[1]][
                        Entryname[2]
                      ][fileName[0]]
                    )
                      maskerList[condition["block_condition"]][Entryname[1]][
                        Entryname[2]
                      ][fileName[0]][fileName[1]] = audioData;
                    else {
                      maskerList[condition["block_condition"]][Entryname[1]][
                        Entryname[2]
                      ][fileName[0]] = { [fileName[1]]: audioData };
                    }
                  }
                }
              }
            });
            // console.log(maskerList["1_1"]["Talker11"])
          });
        });
      //console.log(maskerList)
    }

    //load target
    if (condition["targetSoundFolder"]) {
      //console.log(`folders/${condition["targetSoundFolder"]}.zip`);
      //await fetch(`folders/${condition["targetSoundFolder"]}.zip`)
      await fetch(`folders/VocodedWord.zip`)
        .then((response) => response.blob())
        .then((data) => {
          var Zip = new JSZip();
          Zip.loadAsync(data).then(async (zip) => {
            //console.log(zip.files);
            zip.forEach(async (relativePath, zipEntry) => {
              //console.log( zipEntry.name.split("/").length,zipEntry)
              const Entryname = zipEntry.name.split("/");
              //eg: VocodedWord/Talker11/Baron.wav
              if (Entryname.length == 3) {
                if (zipEntry.dir) {
                  targetList[condition["block_condition"]][Entryname[1]] = {};
                  //eg. {1_2: {talker11:{}}}
                } else {
                  //verify file name extension

                  //.substring(0, name[2].lastIndexOf(".")); //without extension
                  if (verifyFileNameExtension(Entryname[2])) {
                    const fileName = Entryname[2].split(".");
                    //eg Baron.hi.wav --> ['Baron', 'hi', 'wav']
                    // hi -> high frquency bands
                    // low freuqncy bands
                    const audioData = await zipEntry
                      .async("arrayBuffer")
                      .then((data) => {
                        return getAudioBufferFromArrayBuffer(data);
                      });
                    //console.log(audioData)
                    if (
                      targetList[condition["block_condition"]][Entryname[1]][
                        fileName[0]
                      ]
                    )
                      targetList[condition["block_condition"]][Entryname[1]][
                        fileName[0]
                      ][fileName[1]] = audioData;
                    else
                      targetList[condition["block_condition"]][Entryname[1]][
                        fileName[0]
                      ] = { [fileName[1]]: audioData };
                  }
                }
              } else if (Entryname.length == 4) {
                if (zipEntry.dir)
                  targetList[condition["block_condition"]][Entryname[1]][
                    Entryname[2]
                  ] = {};
                else {
                  if (verifyFileNameExtension(Entryname[3])) {
                    const audioData = await zipEntry
                      .async("arraybuffer")
                      .then((data) => {
                        return getAudioBufferFromArrayBuffer(data);
                      });
                    const fileName = Entryname[3].split(".");
                    //targetList[condition["block_condition"]][name[1]][name[2]][fileName[0]] = {};
                    if (
                      targetList[condition["block_condition"]][Entryname[1]][
                        Entryname[2]
                      ][fileName[0]]
                    )
                      targetList[condition["block_condition"]][Entryname[1]][
                        Entryname[2]
                      ][fileName[0]][fileName[1]] = audioData;
                    else {
                      targetList[condition["block_condition"]][Entryname[1]][
                        Entryname[2]
                      ][fileName[0]] = { [fileName[1]]: audioData };
                    }
                  }
                }
              }
            });
          });
        });
      // console.log(targetList);
    }
  });

  // return new Promise((resolve) => {
  //   resolve({ target: targetList, maskerList: maskerList });
  // });
  return { target: targetList, maskerList: maskerList };
};

const verifyFileNameExtension = (name) => {
  name = name.split(".");
  const ext = name[name.length - 1];
  if (acceptableExtensions.includes(ext)) return true;
  return false;
};

const acceptableExtensions = ["wav"];
