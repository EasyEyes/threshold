import arrayBufferToAudioBuffer from "arraybuffer-to-audiobuffer";
import JSZip from "jszip";
import {
  calibrateSound1000HzPostSec,
  calibrateSound1000HzPreSec,
  calibrateSound1000HzSec,
  calibrateSoundBurstRepeats,
  calibrateSoundBurstSec,
  calibrateSoundBurstsWarmup,
  calibrateSoundCheck,
} from "./global";
import { getMaxValueOfAbsoluteValueOfBuffer } from "./soundTest";
import { readi18nPhrases } from "./readPhrases";

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

  return arr;
};

export const getRMSOfWaveForm = (arr) => {
  //returns rms of waveform
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

  return arr;
};

export const playAudioBuffer = (
  audioBuffer,
  mediaRecorder = null,
  soundAmpl = null,
) => {
  var source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  const analyser = audioCtx.createAnalyser();
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  source.start();
  source.onended = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      // wait for 1 second before stopping the recorder
      // setTimeout(() => {
      //   mediaRecorder.stop();
      // }, 1000);
      if (soundAmpl) {
        const bufferLength = analyser.frequencyBinCount;
        const floatArray = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(floatArray);
        const max = getMaxValueOfAbsoluteValueOfBuffer(floatArray);
        soundAmpl.innerHTML = max.toFixed(8);
      }
    }
  };
};

// get gain node
export const getGainNode = (gain) => {
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = gain;
  return gainNode;
};
/**
 * Given an array of web audio nodes, builds the node graph in the order
 * they are placed into the array
 * @param {<AudioContext>} audioCtx the target audio context
 * @param {<AudioNode>} webAudioNodes the nodes !order matters!
 */
export const connectAudioNodes = (webAudioNodes) => {
  let i = 0;
  let nextNode;
  let curNode;
  while (i < webAudioNodes.length - 1) {
    curNode = webAudioNodes[i];
    nextNode = webAudioNodes[i + 1];
    curNode.connect(nextNode);
    i++;
  }
  const analyser = audioCtx.createAnalyser();
  curNode = webAudioNodes[i];
  curNode.connect(analyser);
  analyser.connect(audioCtx.destination);
  const bufferLength = analyser.frequencyBinCount;
  const floatArray = new Float32Array(bufferLength);
  return { analyser, floatArray };
};

/**
 * Given an array of web audio nodes, connects them into a graph and plays the first
 * @param {Array.<AudioNode>} webAudioNodes an array containing a series of web audio nodes
 */
export const playAudioNodeGraph = (
  webAudioNodes,
  mediaRecorder = null,
  soundAmpl = null,
  showImage = null,
  showImageFileName = null,
) => {
  const { analyser, floatArray } = connectAudioNodes(webAudioNodes);
  const sourceNode = webAudioNodes[0];
  sourceNode.start(0);

  if (showImage && showImageFileName) {
    const imageEle = document.createElement("img");
    imageEle.src = `./images/${showImageFileName}`;
    imageEle.id = "showImageEle";
    imageEle.style.display = "block";
    imageEle.style.margin = "auto";

    showImage.setImage(imageEle);

    imageEle.onload = () => {
      const screenHeight = window.innerHeight;
      const screenWidth = window.innerWidth;
      const imgHeight = imageEle.naturalHeight;
      const imgWidth = imageEle.naturalWidth;

      // Calculate the scale ratios
      const heightRatio = screenHeight / imgHeight;
      const widthRatio = screenWidth / imgWidth;
      let widthScale, heightScale;

      // Check if scaling by height ratio overflows width
      if (imgWidth * heightRatio > screenWidth) {
        // Width is the limiting factor
        heightScale = imgHeight / imgWidth;
        widthScale = 1;
      } else {
        // Height is the limiting factor
        heightScale = 1;
        widthScale = imgWidth / imgHeight;
      }

      // Apply the new size to the image
      showImage.setSize([widthScale, heightScale]);
      showImage._needUpdate = true;
      showImage.setAutoDraw(true);
    };
  }

  sourceNode.onended = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      // wait for 1 second before stopping the recorder
      // setTimeout(() => {
      //   mediaRecorder.stop();
      // }, 1000);
      if (soundAmpl) {
        analyser.getFloatTimeDomainData(floatArray);
        const max = getMaxValueOfAbsoluteValueOfBuffer(floatArray);
        soundAmpl.innerHTML = max.toFixed(8);
      }
    }
    if (showImage) {
      showImage.setAutoDraw(false);
    }
  };
};

/**
 * Given an audio context, a buffer containing audio, create an audio node containing the audio
 * @param {<AudioContext>} audioCtx the target audio context
 * @param {<AudioBuffer>} audioBuffer the audio data to be added to the node
 */
export const createAudioNodeFromBuffer = (audioBuffer) => {
  const node = audioCtx.createBufferSource();
  node.buffer = audioBuffer;
  return node;
};

/**
 * Creates a convolver node given the inverted Impulse Response
 * @param {<AudioContext>} audioCtx the target audio context
 * @param {Array.Float} invertedImpulseResponseBuffer the inverted impulse response
 * @returns
 */
export const createImpulseResponseFilterNode = async (
  invertedImpulseResponseBuffer,
) => {
  const myArrayBuffer = audioCtx.createBuffer(
    1,
    // TODO: quality check this
    invertedImpulseResponseBuffer.length - 1,
    audioCtx.sampleRate,
  );

  // Fill the buffer with the inverted impulse response
  const nowBuffering = myArrayBuffer.getChannelData(0);
  for (let i = 0; i < myArrayBuffer.length; i++) {
    // audio needs to be in [-1.0; 1.0]
    nowBuffering[i] = invertedImpulseResponseBuffer[i];
  }

  const convolver = audioCtx.createConvolver();

  convolver.normalize = false;
  convolver.channelCount = 1;
  convolver.buffer = myArrayBuffer;

  return convolver;
};

/**
 * Given an buffer containing audio, creates an audio graph containing the audio and a convolver node which
 * accounts for the room's impulse response
 * @param {<AudioBuffer>[]} audioBuffer the audio data to be played
 */
export const playAudioBufferWithImpulseResponseCalibration = async (
  audioBuffer,
  invertedImpulseResponseBuffer,
  mediaRecorder = null,
  soundAmpl = null,
  showImage = null,
  showImageFileName = null,
) => {
  const webAudioNodes = [
    createAudioNodeFromBuffer(audioBuffer), // the audio to be played
    await createImpulseResponseFilterNode(invertedImpulseResponseBuffer), // the impulse response calibration node
  ];
  playAudioNodeGraph(
    webAudioNodes,
    mediaRecorder,
    soundAmpl,
    showImage,
    showImageFileName,
  );
};

export const getSoundCalibrationLevelDBSPLFromIIR = (iir) => {
  const Fs = 48000;
  //t=0:1/fs:length(iir)/fs; % time vector
  const t = [0];
  for (let i = 1; i < iir.length; i++) {
    t.push(t[i - 1] + 1.0 / Fs);
  }

  const phase = t.map((val) => 2 * Math.PI * 1000 * val);
  const cosPhase = phase.map((val) => Math.cos(val));
  const sinPhase = phase.map((val) => Math.sin(val));
  const cosPhaseIIRSquared = cosPhase.map((val, i) => (val * iir[i]) ** 2);
  const sinPhaseIIRSquared = sinPhase.map((val, i) => (val * iir[i]) ** 2);
  const sinCosSum = cosPhaseIIRSquared.map(
    (val, i) => val + sinPhaseIIRSquared[i],
  );
  const energyFiltered = sinCosSum.reduce((acum, val) => acum + val);
  const energyUnfiltered = 1;
  const gain = Math.sqrt(energyFiltered / energyUnfiltered);

  const normalizedIIR = iir.map((val) => val / gain);
  const soundCalibrationLevelDBSPL = -20 * Math.log10(gain);

  return {
    normalizedIIR: normalizedIIR,
    calibrationLevel: soundCalibrationLevelDBSPL,
  };
};

export const initSoundFiles = async (trialsConditions) => {
  var maskerList = {};
  var targetList = {};
  // console.log("trialsConditions", trialsConditions);

  trialsConditions.map(async (condition) => {
    // console.log(condition);
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

export const initSoundFilesWithPromiseAll = async (trialsConditions) => {
  var maskerList = {};
  var targetList = {};

  await Promise.all(
    trialsConditions.map(async (condition) => {
      maskerList[condition["block_condition"]] = [];
      targetList[condition["block_condition"]] = [];

      //load maskers
      if (condition["maskerSoundFolder"]) {
        await fetch(`folders/${condition["maskerSoundFolder"]}.zip`)
          .then((response) => {
            return response.blob();
          })
          .then(async (data) => {
            var Zip = new JSZip();
            await Zip.loadAsync(data).then((zip) => {
              return Promise.all(
                Object.keys(zip.files).map(async (filename) => {
                  if (
                    !zip.files[filename].dir &&
                    verifyFileNameExtension(filename)
                  ) {
                    var name = filename.substring(0, filename.lastIndexOf("."));
                    var file = await zip.files[filename].async("arraybuffer");
                    maskerList[condition["block_condition"]].push({
                      name: name,
                      file: getAudioBufferFromArrayBuffer(file),
                    });
                  }
                }),
              );
            });
          });
      }

      // load target
      if (condition["targetSoundFolder"]) {
        await fetch(`folders/${condition["targetSoundFolder"]}.zip`)
          .then((response) => {
            return response.blob();
          })
          .then(async (data) => {
            var Zip = new JSZip();
            await Zip.loadAsync(data).then((zip) => {
              console.log(zip);
              return Promise.all(
                Object.keys(zip.files).map(async (filename) => {
                  if (
                    !zip.files[filename].dir &&
                    verifyFileNameExtension(filename)
                  ) {
                    var name = filename.substring(0, filename.lastIndexOf("."));
                    var file = await zip.files[filename].async("arraybuffer");
                    targetList[condition["block_condition"]].push({
                      name: name,
                      file: getAudioBufferFromArrayBuffer(file),
                    });
                  }
                }),
              );
            });
          });
      }
    }),
  );

  return { maskers: maskerList, target: targetList };
};
var flag = true;
export const loadVocoderPhraseSoundFiles = async (trialsConditions) => {
  const maskerList = {};
  const targetList = {};
  await Promise.all(
    trialsConditions.map(async (condition) => {
      //console.log("here.....", condition);
      maskerList[condition["block_condition"]] = {};
      targetList[condition["block_condition"]] = {};

      //load maskers
      if (condition["maskerSoundFolder"]) {
        // console.log(`folders/${condition["maskerSoundFolder"]}.zip`);
        await fetch(`folders/${condition["maskerSoundFolder"]}.zip`)
          // await fetch(`folders/VocodedWord.zip`)
          .then((response) => response.blob())
          .then(async (data) => {
            var Zip = new JSZip();
            await Zip.loadAsync(data).then((zip) => {
              return Promise.all(
                Object.keys(zip.files).map(async (filename) => {
                  const entryName = {
                    current: filename,
                    split: filename.split("/"),
                  };
                  if (entryName.split.length == 3) {
                    entryName.current = getEntryNameDataForFile(
                      entryName.current,
                    );
                    //eg: filename ===> VocodedWord/Talker11/Baron.hi.wav
                    if (isDirectory(zip.files[filename]))
                      maskerList[condition["block_condition"]][
                        entryName.current.Talker
                      ] = {};
                    //eg. {1_2: {talker11:{}}}
                    else {
                      // console.log("zip.files",zip.files[filename])
                      const file = await processAudioDataForFile(
                        filename,
                        zip.files[filename],
                      );
                      if (file) {
                        // console.log("file",file)
                        //separate high and low frequency bands]
                        if (
                          maskerList[condition["block_condition"]][
                            entryName.current.Talker
                          ][entryName.current.split.name]
                        )
                          maskerList[condition["block_condition"]][
                            entryName.current.Talker
                          ][entryName.current.split.name][
                            entryName.current.split.freq
                          ] = file.audioData;
                        else
                          maskerList[condition["block_condition"]][
                            entryName.current.Talker
                          ][entryName.current.split.name] = {
                            [entryName.current.split.freq]: file.audioData,
                          };
                      }
                    }
                  } else if (entryName.split.length == 4) {
                    //eg: filename ===> VocodedWord/Talker11/CallSign/Arrow.hi.wav
                    entryName.current = getEntryNameDataForFileInSubFolder(
                      entryName.current,
                    );
                    // console.log("debug",maskerList[condition["block_condition"]][entryName.current.Talker])
                    if (isDirectory(zip.files[filename]))
                      maskerList[condition["block_condition"]][
                        entryName.current.Talker
                      ][entryName.current.subFolder] = {};
                    else {
                      const file = await processAudioDataForFileInSubFolder(
                        filename,
                        zip.files[filename],
                      );
                      if (file) {
                        // console.log("file",file)
                        //separate high and low frequency bands]
                        if (
                          maskerList[condition["block_condition"]][
                            entryName.current.Talker
                          ][entryName.current.subFolder][
                            entryName.current.split.name
                          ]
                        )
                          maskerList[condition["block_condition"]][
                            entryName.current.Talker
                          ][entryName.current.subFolder][
                            entryName.current.split.name
                          ][entryName.current.split.freq] = file.audioData;
                        else
                          maskerList[condition["block_condition"]][
                            entryName.current.Talker
                          ][entryName.current.subFolder][
                            entryName.current.split.name
                          ] = {
                            [entryName.current.split.freq]: file.audioData,
                          };
                      }
                    }
                  }
                }),
              );
            });
          });
      }

      //load target
      if (
        condition["targetSoundFolder"] &&
        condition["targetSoundFolder"] !== condition["maskerSoundFolder"]
      ) {
        //console.log(`folders/${condition["targetSoundFolder"]}.zip`);
        await fetch(`folders/${condition["targetSoundFolder"]}.zip`)
          // await fetch(`folders/VocodedWord.zip`)
          .then((response) => response.blob())
          .then(async (data) => {
            var Zip = new JSZip();

            await Zip.loadAsync(data).then((zip) => {
              return Promise.all(
                Object.keys(zip.files).map(async (filename) => {
                  const entryName = {
                    current: filename,
                    split: filename.split("/"),
                  };
                  if (entryName.split.length == 3) {
                    entryName.current = getEntryNameDataForFile(
                      entryName.current,
                    );
                    //eg: filename ===> VocodedWord/Talker11/Baron.hi.wav
                    if (isDirectory(zip.files[filename]))
                      targetList[condition["block_condition"]][
                        entryName.current.Talker
                      ] = {};
                    //eg. {1_2: {talker11:{}}}
                    else {
                      // console.log("zip.files",zip.files[filename])
                      const file = await processAudioDataForFile(
                        filename,
                        zip.files[filename],
                      );
                      if (file) {
                        // console.log("file",file)
                        //separate high and low frequency bands]
                        if (
                          targetList[condition["block_condition"]][
                            entryName.current.Talker
                          ][entryName.current.split.name]
                        )
                          targetList[condition["block_condition"]][
                            entryName.current.Talker
                          ][entryName.current.split.name][
                            entryName.current.split.freq
                          ] = file.audioData;
                        else
                          targetList[condition["block_condition"]][
                            entryName.current.Talker
                          ][entryName.current.split.name] = {
                            [entryName.current.split.freq]: file.audioData,
                          };
                      }
                    }
                  } else if (entryName.split.length == 4) {
                    //eg: filename ===> VocodedWord/Talker11/CallSign/Arrow.hi.wav
                    entryName.current = getEntryNameDataForFileInSubFolder(
                      entryName.current,
                    );
                    // console.log("debug",maskerList[condition["block_condition"]][entryName.current.Talker])
                    if (isDirectory(zip.files[filename]))
                      targetList[condition["block_condition"]][
                        entryName.current.Talker
                      ][entryName.current.subFolder] = {};
                    else {
                      const file = await processAudioDataForFileInSubFolder(
                        filename,
                        zip.files[filename],
                      );
                      if (file) {
                        // console.log("file",file)
                        //separate high and low frequency bands]
                        if (
                          targetList[condition["block_condition"]][
                            entryName.current.Talker
                          ][entryName.current.subFolder][
                            entryName.current.split.name
                          ]
                        )
                          targetList[condition["block_condition"]][
                            entryName.current.Talker
                          ][entryName.current.subFolder][
                            entryName.current.split.name
                          ][entryName.current.split.freq] = file.audioData;
                        else
                          targetList[condition["block_condition"]][
                            entryName.current.Talker
                          ][entryName.current.subFolder][
                            entryName.current.split.name
                          ] = {
                            [entryName.current.split.freq]: file.audioData,
                          };
                      }
                    }
                  }
                }),
              );
            });
          });
      } else {
        targetList[condition["block_condition"]] =
          maskerList[condition["block_condition"]];
      }
    }),
  );

  return { target: targetList, maskerList: maskerList };
};

export const verifyFileNameExtension = (name) => {
  name = name.split(".");
  const ext = name[name.length - 1];
  if (acceptableExtensions.includes(ext)) return true;
  return false;
};

const acceptableExtensions = ["wav", "aac"];

const isDirectory = (entry) => {
  return entry.dir;
};

const getEntryNameDataForFile = (entry) => {
  const entryName = entry.split("/");
  const split = entryName[2].split(".");
  return {
    Talker: entryName[1],
    fileName: entryName[2],
    split: {
      name: split[0],
      freq: split[1],
    },
  };
};

const getEntryNameDataForFileInSubFolder = (entry) => {
  const entryName = entry.split("/");
  const split = entryName[3].split(".");
  return {
    Talker: entryName[1],
    subFolder: entryName[2],
    fileName: entryName[3],
    split: {
      name: split[0],
      freq: split[1],
    },
  };
};

const processAudioDataForFile = async (fileName, zipEntry) => {
  if (verifyFileNameExtension(fileName)) {
    const audioData = await zipEntry
      .async("arrayBuffer")
      .then(async (fileData) => {
        return await getAudioBufferFromArrayBuffer(fileData);
      });
    const filename = getEntryNameDataForFile(fileName);
    // console.log("audioData",audioData)
    return {
      audioData: audioData,
      fileName: filename,
    };
  } else return false;
};

const processAudioDataForFileInSubFolder = async (fileName, zipEntry) => {
  if (verifyFileNameExtension(fileName)) {
    const audioData = await zipEntry
      .async("arrayBuffer")
      .then(async (fileData) => {
        return await getAudioBufferFromArrayBuffer(fileData);
      });
    const filename = getEntryNameDataForFileInSubFolder(fileName);

    return {
      audioData: audioData,
      fileName: filename,
    };
  } else return false;
};

export const addTrialStaircaseSummariesToDataForSound = (
  currentLoop,
  psychoJS,
) => {
  // TODO What to do when data saving is rejected?
  if (currentLoop._currentStaircase) {
    psychoJS.experiment.addData(
      "staircaseName",
      currentLoop._currentStaircase._name,
    );
    psychoJS.experiment.addData(
      "questMeanAtEndOfTrial",
      currentLoop._currentStaircase.mean(),
    );
    psychoJS.experiment.addData(
      "questSDAtEndOfTrial",
      currentLoop._currentStaircase.sd(),
    );
    psychoJS.experiment.addData(
      "questQuantileOfQuantileOrderAtEndOfTrial",
      currentLoop._currentStaircase.quantile(
        currentLoop._currentStaircase._jsQuest.quantileOrder,
      ),
    );
  }
  // else {
  //   throw "undefined currentLoop._currentStaircase [add TRIAL data failed]";
  // }
};

export const displayRightOrWrong = async (correct, language, isLastTrial) => {
  const rightOrWrong = document.createElement("h1");
  rightOrWrong.style.position = "absolute";
  rightOrWrong.style.top = "30%";
  rightOrWrong.style.left = "50%";
  rightOrWrong.style.transform = "translate(-50%, -50%)";
  rightOrWrong.style.fontSize = "100px";
  if (correct) {
    rightOrWrong.style.color = "green";
    rightOrWrong.innerHTML = readi18nPhrases("T_RIGHT", language);
  } else {
    rightOrWrong.style.color = "red";
    rightOrWrong.innerHTML = readi18nPhrases("T_Wrong", language);
  }
  document.body.appendChild(rightOrWrong);

  if (isLastTrial) {
    //create a proceed button for the last trial
    await new Promise((resolve) => {
      const proceedButton = document.createElement("button");
      proceedButton.className = "threshold-button threshold-proceed-button";
      proceedButton.innerHTML = readi18nPhrases("T_proceed", language);
      proceedButton.onclick = () => {
        document.body.removeChild(proceedButton);
        document.body.removeChild(rightOrWrong);
        resolve();
      };
      document.body.appendChild(proceedButton);
    });
    return;
  }

  setTimeout(() => {
    document.body.removeChild(rightOrWrong);
  }, 1000);
};

export const getCurrentTimeString = (date = null) => {
  if (!date) date = new Date();
  // const date = new Date();

  // Get the date string in the user's locale
  const dateOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZoneName: "longOffset",
    hour: "numeric",
    minute: "numeric",
  };
  const dateString = date.toLocaleDateString(undefined, dateOptions);

  return dateString.replace("at ", "");
};

export const generatePureTone = async (
  frequencyHz,
  durationSec,
  sampleRate = 96000,
) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  const taperSec = 0.01; // Taper duration in seconds (10 ms)
  const taperSamples = Math.floor(taperSec * sampleRate);

  // Compute onset and offset tapers
  const taperTime = Array.from(
    { length: taperSamples },
    (_, i) => i / sampleRate,
  );
  const taperFrequency = 1 / (4 * taperSec); // Sinusoid period is 4 times taper duration
  const onsetTaper = taperTime.map(
    (t) => Math.sin(2 * Math.PI * taperFrequency * t) ** 2,
  );
  const offsetTaper = taperTime.map(
    (t) => Math.cos(2 * Math.PI * taperFrequency * t) ** 2,
  );

  // Create the audio buffer for the tone
  const totalSamples = Math.floor(durationSec * sampleRate);
  const audioBuffer = audioContext.createBuffer(1, totalSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  // Generate the pure tone
  for (let i = 0; i < totalSamples; i++) {
    const time = i / sampleRate;
    channelData[i] = Math.sin(2 * Math.PI * frequencyHz * time);
  }

  // Apply onset taper
  for (let i = 0; i < taperSamples; i++) {
    channelData[i] *= onsetTaper[i];
  }

  // Apply offset taper
  for (let i = 0; i < taperSamples; i++) {
    channelData[totalSamples - taperSamples + i] *= offsetTaper[i];
  }

  // Close the audio context (optional, depending on your use case)
  await audioContext.close();

  return { name: `${frequencyHz.toFixed(1)} Hz`, file: audioBuffer };
};

export const generateTones = (frequencies) => {
  const tones = frequencies.map((frequency) => {
    return { name: `${frequency.toFixed(1)} Hz`, file: {} };
  });

  return tones;
};

export const calculateTimeToCalibrate = (gains) => {
  const measure1GainSec =
    1.5 *
    (calibrateSound1000HzPostSec.current +
      calibrateSound1000HzPreSec.current +
      calibrateSound1000HzSec.current);
  const measureGainsSec = (0.5 + gains.length) * measure1GainSec;
  let checks = 0;
  switch (calibrateSoundCheck.current) {
    case "none":
      checks = 0;
      break;
    case "system":
      checks = 1;
      break;
    case "goal":
      checks = 1;
      break;
    case "both":
      checks = 2;
      break;
  }
  // measure1ResponseSec=2*(_calibrateSoundBurstRepeats+_calibrateSoundBurstsWarmup)*_calibrateSoundBurstSec;
  const measure1ResponseSec =
    2 *
    (calibrateSoundBurstRepeats.current + calibrateSoundBurstsWarmup.current) *
    calibrateSoundBurstSec.current;
  const measureResponsesSec = (1 + checks) * measure1ResponseSec;
  let calibrateSec = measureGainsSec + measureResponsesSec;

  return Math.round(calibrateSec / 60);
};
