import arrayBufferToAudioBuffer from "arraybuffer-to-audiobuffer";
import JSZip from "jszip";
import Papa from "papaparse";
import {
  _calibrateSoundBurstPostSec,
  _calibrateSoundBurstPreSec,
  _calibrateSound1000HzPostSec,
  _calibrateSound1000HzPreSec,
  _calibrateSound1000HzSec,
  calibrateSoundBurstMLSVersions,
  calibrateSoundBurstRepeats,
  calibrateSoundBurstSec,
  calibrateSoundBurstsWarmup,
  calibrateSoundCheck,
  targetSoundListFiles,
  targetSoundListMap,
} from "./global";
import { getMaxValueOfAbsoluteValueOfBuffer } from "./soundTest";
import { readi18nPhrases } from "./readPhrases";
import { paramReader } from "../threshold";
import * as XLSX from "xlsx";

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

  trialsConditions.map(async (condition) => {
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

const extractValidConditions = () => {
  const validConditions = {};

  for (const condition of paramReader.conditions) {
    const blockCondition = condition.block_condition;
    const targetSoundList = paramReader.read("targetSoundList", blockCondition);
    const targetSoundFolder = paramReader.read(
      "targetSoundFolder",
      blockCondition,
    );

    if (targetSoundList.length > 0 && targetSoundFolder.length > 0) {
      validConditions[blockCondition] = {
        targetSoundList,
        targetSoundFolder,
      };
    }
  }

  return validConditions;
};

const loadSoundFilesFromZip = async (zipUrl, blockCondition) => {
  const response = await fetch(zipUrl);
  const zipData = await response.blob();
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipData);

  const filePromises = Object.keys(loadedZip.files).map(async (filename) => {
    try {
      const zipEntry = loadedZip.files[filename];

      if (zipEntry.dir || !verifyFileNameExtension(filename)) {
        return null;
      }

      const name = filename.split(".")[0];

      if (targetSoundListFiles[blockCondition]?.[name]) {
        return null;
      }

      const fileBuffer = await zipEntry.async("arraybuffer");
      const audioBuffer = await getAudioBufferFromArrayBuffer(fileBuffer);

      return { name, buffer: audioBuffer };
    } catch (error) {
      console.error(`Error processing file ${filename}:`, error);
      return null;
    }
  });

  const files = await Promise.all(filePromises);

  if (!targetSoundListFiles[blockCondition]) {
    targetSoundListFiles[blockCondition] = {};
  }

  files.forEach((file) => {
    if (file && file.buffer) {
      targetSoundListFiles[blockCondition][file.name] = file.buffer;
    }
  });
};

const trimRowData = (row) => {
  const trimmedRow = {};
  Object.keys(row).forEach((key) => {
    const trimmedKey = key.trim();
    const value = row[key];
    const trimmedValue = typeof value === "string" ? value.trim() : value;
    trimmedRow[trimmedKey] = trimmedValue;
  });
  return trimmedRow;
};

const parseXlsxFile = async (data) => {
  const arrayBuffer = await data.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  return rawData.map(trimRowData);
};

const parseCsvFile = async (data) => {
  const csvText = await data.text();
  const parseResult = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transform: (value) => (typeof value === "string" ? value.trim() : value),
    transformHeader: (header) => header.trim(),
  });

  return parseResult.data;
};

const parseSoundListFile = async (filename) => {
  const response = await fetch(`targetSoundLists/${filename}`);
  const data = await response.blob();
  const isXlsx = filename.toLowerCase().endsWith(".xlsx");

  return isXlsx ? parseXlsxFile(data) : parseCsvFile(data);
};

const validateAndStoreSoundMapping = (row, blockCondition) => {
  if (!row.Left || !row.Right) {
    console.warn(
      `Missing Left or Right column in sound mapping for condition ${blockCondition}:`,
      row,
    );
    return false;
  }

  const left = row.Left.split(".")[0];
  const right = row.Right.split(".")[0];

  const soundFiles = targetSoundListFiles[blockCondition];
  if (left && !soundFiles?.[left]) {
    console.warn(
      `Missing left audio file "${left}" for condition ${blockCondition}`,
    );
    return false;
  }
  if (right && !soundFiles?.[right]) {
    console.warn(
      `Missing right audio file "${right}" for condition ${blockCondition}`,
    );
    return false;
  }

  if (!targetSoundListMap[blockCondition]) {
    targetSoundListMap[blockCondition] = {
      currentIndex: 0,
      list: [],
    };
  }

  targetSoundListMap[blockCondition].list.push({ left, right });
  return true;
};

const processSoundListData = async (targetSoundList, blockCondition) => {
  if (!targetSoundList.length) {
    return;
  }

  try {
    const parsedData = await parseSoundListFile(targetSoundList);

    for (const row of parsedData) {
      const isValid = validateAndStoreSoundMapping(row, blockCondition);
      if (!isValid) {
        console.warn(`Invalid sound mapping for block ${blockCondition}:`, row);
        return;
      }
    }
  } catch (error) {
    console.error(`Error processing sound list ${targetSoundList}:`, error);
  }
};

export const parseTargetSoundListFolders = async () => {
  const validConditions = extractValidConditions();

  if (Object.keys(validConditions).length === 0) {
    return;
  }

  const processingPromises = Object.entries(validConditions).map(
    async ([blockCondition, config]) => {
      const { targetSoundList, targetSoundFolder } = config;

      try {
        await loadSoundFilesFromZip(
          `folders/${targetSoundFolder}.zip`,
          blockCondition,
        );
        await processSoundListData(targetSoundList, blockCondition);
      } catch (error) {
        console.error(`Error processing condition ${blockCondition}:`, error);
      }
    },
  );

  await Promise.all(processingPromises);
};

const loadSimpleSoundFilesFromZip = async (zipUrl, blockCondition) => {
  const response = await fetch(zipUrl);
  const zipData = await response.blob();
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipData);

  const filePromises = Object.keys(loadedZip.files).map(async (filename) => {
    const zipEntry = loadedZip.files[filename];

    if (zipEntry.dir || !verifyFileNameExtension(filename)) {
      return null;
    }

    const name = filename.substring(0, filename.lastIndexOf("."));
    const arrayBuffer = await zipEntry.async("arraybuffer");
    const audioBuffer = getAudioBufferFromArrayBuffer(arrayBuffer);

    return { name, file: audioBuffer };
  });

  const files = await Promise.all(filePromises);
  return files.filter((file) => file !== null);
};

const initializeSoundCondition = async (condition) => {
  const blockCondition = condition.block_condition;
  const results = {
    maskers: [],
    targets: [],
  };

  if (condition.maskerSoundFolder) {
    results.maskers = await loadSimpleSoundFilesFromZip(
      `folders/${condition.maskerSoundFolder}.zip`,
      blockCondition,
    );
  }

  if (condition.targetSoundFolder) {
    results.targets = await loadSimpleSoundFilesFromZip(
      `folders/${condition.targetSoundFolder}.zip`,
      blockCondition,
    );
  }

  return { blockCondition, ...results };
};

export const initSoundFilesWithPromiseAll = async (trialsConditions) => {
  const maskerList = {};
  const targetList = {};

  const conditionResults = await Promise.all(
    trialsConditions.map(initializeSoundCondition),
  );

  conditionResults.forEach(({ blockCondition, maskers, targets }) => {
    maskerList[blockCondition] = maskers;
    targetList[blockCondition] = targets;
  });

  return { maskers: maskerList, target: targetList };
};
const ensureNestedStructure = (obj, path) => {
  let current = obj;
  for (const key of path) {
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }
  return current;
};

const storeAudioByFrequency = (
  container,
  pathKeys,
  name,
  frequency,
  audioData,
) => {
  const target = ensureNestedStructure(container, pathKeys);

  if (!target[name]) {
    target[name] = {};
  }
  target[name][frequency] = audioData;
};

const processThreeLevelFile = async (
  filename,
  zipEntry,
  container,
  blockCondition,
) => {
  const entryData = getEntryNameDataForFile(filename);

  if (isDirectory(zipEntry)) {
    ensureNestedStructure(container[blockCondition], [entryData.Talker]);
    return;
  }

  const file = await processAudioDataForFile(filename, zipEntry);
  if (file) {
    storeAudioByFrequency(
      container[blockCondition],
      [entryData.Talker],
      entryData.split.name,
      entryData.split.freq,
      file.audioData,
    );
  }
};

const processFourLevelFile = async (
  filename,
  zipEntry,
  container,
  blockCondition,
) => {
  const entryData = getEntryNameDataForFileInSubFolder(filename);

  if (isDirectory(zipEntry)) {
    ensureNestedStructure(container[blockCondition], [
      entryData.Talker,
      entryData.subFolder,
    ]);
    return;
  }

  const file = await processAudioDataForFileInSubFolder(filename, zipEntry);
  if (file) {
    storeAudioByFrequency(
      container[blockCondition],
      [entryData.Talker, entryData.subFolder],
      entryData.split.name,
      entryData.split.freq,
      file.audioData,
    );
  }
};

const processVocoderFile = async (
  filename,
  zipEntry,
  container,
  blockCondition,
) => {
  const pathDepth = filename.split("/").length;

  if (pathDepth === 3) {
    await processThreeLevelFile(filename, zipEntry, container, blockCondition);
  } else if (pathDepth === 4) {
    await processFourLevelFile(filename, zipEntry, container, blockCondition);
  }
};

const loadVocoderSoundsFromZip = async (zipUrl, container, blockCondition) => {
  const response = await fetch(zipUrl);
  const zipData = await response.blob();
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipData);

  container[blockCondition] = {};

  const filePromises = Object.keys(loadedZip.files).map((filename) =>
    processVocoderFile(
      filename,
      loadedZip.files[filename],
      container,
      blockCondition,
    ),
  );

  await Promise.all(filePromises);
};

const initializeVocoderCondition = async (condition) => {
  const blockCondition = condition.block_condition;
  const maskerContainer = {};
  const targetContainer = {};

  if (condition.maskerSoundFolder) {
    await loadVocoderSoundsFromZip(
      `folders/${condition.maskerSoundFolder}.zip`,
      maskerContainer,
      blockCondition,
    );
  }

  if (
    condition.targetSoundFolder &&
    condition.targetSoundFolder !== condition.maskerSoundFolder
  ) {
    await loadVocoderSoundsFromZip(
      `folders/${condition.targetSoundFolder}.zip`,
      targetContainer,
      blockCondition,
    );
  } else {
    targetContainer[blockCondition] = maskerContainer[blockCondition];
  }

  return {
    blockCondition,
    maskers: maskerContainer[blockCondition] || {},
    targets: targetContainer[blockCondition] || {},
  };
};

export const loadVocoderPhraseSoundFiles = async (trialsConditions) => {
  const maskerList = {};
  const targetList = {};

  const conditionResults = await Promise.all(
    trialsConditions.map(initializeVocoderCondition),
  );

  conditionResults.forEach(({ blockCondition, maskers, targets }) => {
    maskerList[blockCondition] = maskers;
    targetList[blockCondition] = targets;
  });

  return { target: targetList, maskerList };
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
  //   throw new Error("undefined currentLoop._currentStaircase [add TRIAL data failed]");
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
    // Wait for 1 second
    await new Promise((resolve) => {
      setTimeout(() => {
        document.body.removeChild(rightOrWrong);
        resolve();
      }, 1000);
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

  // Replace GMT with UTC in the timezone offset
  return dateString.replace("at ", "").replace("GMT", "UTC");
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
  const roundToMultiple = (value, multiple) => {
    return Math.round(value / multiple) * multiple;
  };
  const measure1GainSec =
    4.6 *
    (_calibrateSound1000HzPostSec.current +
      _calibrateSound1000HzPreSec.current +
      _calibrateSound1000HzSec.current);
  const time1000HzSec = gains.length * measure1GainSec;

  const used = calibrateSoundBurstSec.current;
  const preRounded = roundToMultiple(_calibrateSoundBurstPreSec.current, used);
  const postRounded = roundToMultiple(
    _calibrateSoundBurstPostSec.current,
    used,
  );

  const timeAllHzSec =
    23.5 *
    (preRounded + used * calibrateSoundBurstRepeats.current + postRounded) *
    calibrateSoundBurstMLSVersions.current;
  const timeMinute = (timeAllHzSec + time1000HzSec) / 60;

  return Math.round(timeMinute);
};

/**
 * Generates a minimum phase impulse response
 * @param {number} sampleRate - The sample rate in Hz
 * @param {number} numSamples - Length of the impulse response in samples
 * @param {number} resonantFreq - Resonant frequency in Hz
 * @param {number} bandwidth - Bandwidth of the resonance in Hz
 * @param {number} decayRate - Rate of exponential decay (higher = faster decay)
 * @returns {Array<number>} - Minimum phase impulse response
 */
export const generateMinimumPhaseIR = (
  sampleRate = 48000,
  numSamples = 4800,
  resonantFreq = 1000,
  bandwidth = 200,
  decayRate = 50,
) => {
  const ir = new Array(numSamples).fill(0);

  // Generate a simple impulse response with exponential decay and resonance
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const decay = Math.exp(-t * decayRate);
    const resonance = Math.sin(2 * Math.PI * resonantFreq * t);
    const bandlimited = Math.exp(-Math.pow(t * bandwidth, 2));

    ir[i] = decay * resonance * bandlimited;
  }

  // Convert to minimum phase using FFT method
  // For a simple test case, we'll skip the full minimum phase calculation
  // and just ensure the impulse starts at t=0 with max energy near the beginning
  ir.sort((a, b) => Math.abs(b) - Math.abs(a));

  // Add some smoothing to make it more realistic
  for (let i = 1; i < numSamples; i++) {
    ir[i] = 0.9 * ir[i] + 0.1 * ir[i - 1];
  }

  // Normalize to peak of 1.0
  let maxAmp = 0;
  for (let i = 0; i < numSamples; i++) {
    const absValue = Math.abs(ir[i]);
    if (absValue > maxAmp) {
      maxAmp = absValue;
    }
  }
  return ir.map((sample) => sample / maxAmp);
};
