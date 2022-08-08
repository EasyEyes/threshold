import mergeBuffers from "merge-audio-buffers";
import {
  adjustSoundDbSPL,
  audioCtx,
  getRMSOfWaveForm,
  loadVocoderPhraseSoundFiles,
  setWaveFormToZeroDbSPL,
} from "./soundUtils";

var targetList = {};
var maskerList = {};
var whiteNoise;
var whiteNoiseData;

export const initVocoderPhraseSoundFiles = async (trialsConditions) => {
  const blockFiles = await loadVocoderPhraseSoundFiles(trialsConditions);
  // return new Promise(async (resolve) => {
  targetList = blockFiles["target"];
  maskerList = blockFiles["maskerList"];
  // console.log(Object.keys(targetList));
  // console.log(Object.keys(maskerList));
  // console.log( targetList["1_1"]);
  // console.log("maskerList", maskerList);
  //   resolve({targetList:targetList,maskerList:maskerList});
  // });
  return {
    targetList: blockFiles["target"],
    maskerList: blockFiles["maskerList"],
  };
};

export const getVocoderPhraseTrialData = async (
  targetPhrase,
  maskerPhrase,
  blockCondition,
  targetVolumeDbSPLFromQuest = 10,
  whiteNoiseLevel = 70,
  soundGainDBSPL = 0,
  maskerVolumeDbSPL = 10
) => {
  //populate target and masker channel indices
  var targetChannels = populateTargetIndices();
  var maskerChannels = populateMaskerIndices(targetChannels);

  var targetKeys = Object.keys(targetList[blockCondition]);
  // console.log("list", targetKeys);
  // console.log(targetList[blockCondition]);

  const { targetSentenceAudio, talker, categoriesChosen, allCategories } =
    getTargetSentenceAudio(
      targetKeys,
      targetPhrase,
      targetChannels,
      targetList[blockCondition]
    );
  var maskerKeys = Object.keys(maskerList[blockCondition]);
  const maskerSentenceAudio = getMaskerSentenceAudio(
    maskerKeys,
    maskerPhrase,
    maskerChannels,
    maskerList[blockCondition],
    talker,
    categoriesChosen
  );
  // mergeAudioBuffersWithMergerNode(targetSentenceAudio[0]);
  const mergedTargetSentenceAudio = mergeChannelsByAdding(targetSentenceAudio);
  const mergedMaskerSentenceAudio = mergeChannelsByAdding(maskerSentenceAudio);

  // align target and masker audio buffers
  const { targetAudioBuffersAligned, maskerAudioBuffersAligned } =
    alignTargetAndMaskerAudioBuffers(
      mergedTargetSentenceAudio,
      mergedMaskerSentenceAudio
    );
  // console.log("targetAudioBuffersAligned", targetAudioBuffersAligned);
  // console.log("maskerAudioBuffersAligned", maskerAudioBuffersAligned);

  const targetAudio = combineAudioBuffers(targetAudioBuffersAligned, audioCtx);
  const maskerAudio = combineAudioBuffers(maskerAudioBuffersAligned, audioCtx);

  //adjust target volume
  const targetAudioData = targetAudio.getChannelData(0);
  setWaveFormToZeroDbSPL(targetAudioData);
  // console.log("targetAudioDataRMS", getRMSOfWaveForm(targetAudioData));
  adjustSoundDbSPL(targetAudioData, targetVolumeDbSPLFromQuest);

  //adjust masker volume
  const maskerAudioData = maskerAudio.getChannelData(0);
  setWaveFormToZeroDbSPL(maskerAudioData);
  // console.log("maskerAudioDataRMS", getRMSOfWaveForm(maskerAudioData));
  adjustSoundDbSPL(maskerAudioData, maskerVolumeDbSPL);

  // console.log("targetAudio", targetAudio);
  // console.log("maskerAudio", maskerAudio);

  //add white noise
  const whiteNoise = audioCtx.createBuffer(
    1,
    targetAudio.length,
    audioCtx.sampleRate
  );
  var whiteNoiseData = whiteNoise.getChannelData(0);
  for (var i = 0; i < whiteNoiseData.length; i++) {
    whiteNoiseData[i] = Math.random() * 2 - 1;
  }

  setWaveFormToZeroDbSPL(whiteNoiseData);
  adjustSoundDbSPL(whiteNoiseData, whiteNoiseLevel - soundGainDBSPL);

  return {
    trialSound: mergeBuffers([targetAudio, maskerAudio, whiteNoise], audioCtx),
    categoriesChosen: categoriesChosen,
    allCategories: allCategories,
  };
};

//TODO
const mergeAudioBuffersWithMergerNode = (audioBuffer) => {
  // const merger = audioCtx.createChannelMerger(audioBuffer.numberOfChannels);
  // const splitter = audioCtx.createChannelSplitter(audioBuffer.numberOfChannels);
  // const source = audioCtx.createBufferSource();
  // console.log("merging.....")
  // source.buffer = audioBuffer;
  // source.connect(splitter);
  // for (var i=0; i<audioBuffer.numberOfChannels; i++){
  //   // console.log(audioBuffer.getChannelData(i).length);
  //     splitter.connect(merger, 0, i);
  // }
  // // merger.connect(audioCtx.destination);
  // // source.start();
  // console.log("merger", merger);
  // return merger;
  // const dest =
};

const mergeChannelsByAdding = (audioBuffers) => {
  const newAudioBuffers = [];
  // for(var i=0;i<audioBuffers.length;i++){
  //   // console.log("audioBuffer", audioBuffer);
  // const newAudioBuffer = audioCtx.createBuffer(1, audioBuffers[i].length, audioCtx.sampleRate);
  // const newChannel = newAudioBuffer.getChannelData(0);
  // // console.log("newChannel", newChannel);
  // for (var j=0;j<audioBuffers[i].numberOfChannels;j++){
  //   const channel = audioBuffers[i].getChannelData(j);
  //   // console.log("channel", channel);
  //   for (var k=0;k<channel.length;k++){
  //     newChannel[k] += channel[k];
  //   }
  //   // console.log("newChannel", newChannel);
  // }

  // newAudioBuffers.push(newAudioBuffer);

  // }

  audioBuffers.forEach((audioBuffer) => {
    const newAudioBuffer = audioCtx.createBuffer(
      1,
      audioBuffer.length,
      audioCtx.sampleRate
    );
    const newChannel = newAudioBuffer.getChannelData(0);
    for (var j = 0; j < audioBuffer.numberOfChannels; j++) {
      const channel = audioBuffer.getChannelData(j);
      for (var k = 0; k < channel.length; k++) {
        newChannel[k] += channel[k];
      }
    }
    newAudioBuffers.push(newAudioBuffer);
  });

  // console.log("newAudioBuffers", newAudioBuffers);
  return newAudioBuffers;
};

const alignTargetAndMaskerAudioBuffers = (
  targetAudioBuffers,
  maskerAudioBuffers
) => {
  const targetAudioBuffersAligned = [];
  const maskerAudioBuffersAligned = [];
  for (var i = 0; i < targetAudioBuffers.length; i++) {
    const targetAudioBuffer = targetAudioBuffers[i];
    const maskerAudioBuffer = maskerAudioBuffers[i];
    const aligned = compareAndPadZerosAtBothEnds(
      targetAudioBuffer.getChannelData(0),
      maskerAudioBuffer.getChannelData(0)
    );
    targetAudioBuffer.copyToChannel(aligned[0], 0);
    maskerAudioBuffer.copyToChannel(aligned[1], 0);
    targetAudioBuffersAligned.push(targetAudioBuffer);
    maskerAudioBuffersAligned.push(maskerAudioBuffer);
  }
  return {
    targetAudioBuffersAligned: targetAudioBuffersAligned,
    maskerAudioBuffersAligned: targetAudioBuffersAligned,
  };
};

const compareAndPadZerosAtBothEnds = (targetArray, maskerArray) => {
  if (targetArray.length == maskerArray.length) {
    return [targetArray, maskerArray];
  } else if (targetArray.length > maskerArray.length) {
    return [targetArray, padZeros(maskerArray, targetArray.length)];
  } else return [padZeros(targetArray, maskerArray.length), maskerArray];
};

const padZeros = (arr, arr1Length) => {
  const diff = arr1Length - arr.length;
  const leftSize = Math.floor(diff / 2);
  const rightSize = diff - leftSize;

  const left = Array(leftSize).fill(0);
  const right = Array(rightSize).fill(0);
  const data = Array.prototype.slice.call(arr);
  const result = left.concat(data, right);
  const resultFloatArray = new Float32Array(result);
  return resultFloatArray;
};

const combineAudioBuffers = (audioBuffers, context) => {
  var length = 0;
  audioBuffers.map((buffer) => (length += buffer.length));
  var numberOfChannels = audioBuffers[0].numberOfChannels;
  var tmp = context.createBuffer(
    numberOfChannels,
    length,
    audioBuffers[0].sampleRate
  );
  for (var i = 0; i < numberOfChannels; i++) {
    var channel = tmp.getChannelData(i);
    var tmpIdx = 0;
    audioBuffers.map((buffer) => {
      channel.set(buffer.getChannelData(i), tmpIdx);
      tmpIdx += buffer.length;
    });
  }
  return tmp;
};
//populate array with 9 random numbers from 0 to 15
const populateTargetIndices = () => {
  var targetChannels = [...Array(9)];
  targetChannels.forEach((elem, ind, arr) => {
    var val = Math.floor(Math.random() * 16);
    while (targetChannels.includes(val)) val = Math.floor(Math.random() * 16);
    arr[ind] = val;
  });

  return targetChannels.sort();
};

//populate array with the remaining 7 numbers  from 0 to 15
const populateMaskerIndices = (targetChannels) => {
  var maskerChannels = [];
  for (var i = 0; i < 16; i++) {
    if (!targetChannels.includes(i)) maskerChannels.push(i);
  }
  return maskerChannels.sort();
};

//select random channels from the audio buffer
const getTrialAudioBuffer = (channelIndices, audioData, audioContext) => {
  var trialBuffer = audioContext.createBuffer(
    channelIndices.length,
    audioData["hi"].length,
    audioData["hi"].sampleRate
  );
  for (var i = 0; i < channelIndices.length; i++) {
    var channelData = new Float32Array(audioData["hi"].length);
    if (channelIndices[i] < 8) {
      audioData["lo"].copyFromChannel(channelData, channelIndices[i]);
      trialBuffer.copyToChannel(channelData, i);
    } else {
      audioData["hi"].copyFromChannel(channelData, channelIndices[i] - 8);
      trialBuffer.copyToChannel(channelData, i);
    }
  }
  return trialBuffer;
};

const getTargetSentenceAudio = (
  targetKeys,
  targetPhrase,
  targetChannels,
  targetList_
) => {
  var targetSentenceAudio = [];
  const randTargetIndex = Math.floor(Math.random() * targetKeys.length);
  const targetTalker = targetKeys[randTargetIndex];
  const categoriesChosen = {}; //keep track of categories chosen
  const allCategories = {}; //keep track of all categories
  targetPhrase.map(async (elem) => {
    if (elem[0] === "#") {
      const withoutHashtag = elem.substring(1);
      const categoryKeys = Object.keys(
        targetList_[targetTalker][withoutHashtag]
      );
      const randCategoryIndex = Math.floor(Math.random() * categoryKeys.length);
      const categoryItem = categoryKeys[randCategoryIndex];
      const trialWordData = getTrialAudioBuffer(
        targetChannels,
        targetList_[targetTalker][withoutHashtag][categoryItem],
        audioCtx
      );
      allCategories[withoutHashtag] = Object.keys(
        targetList_[targetTalker][withoutHashtag]
      );
      categoriesChosen[withoutHashtag] = categoryItem;
      targetSentenceAudio.push(trialWordData);
    } else {
      const word = targetList_[targetTalker][elem];
      const trialWordData = getTrialAudioBuffer(targetChannels, word, audioCtx);
      targetSentenceAudio.push(trialWordData);
    }
  });
  // console.log("allCategories", allCategories);
  return {
    targetSentenceAudio: targetSentenceAudio,
    talker: targetTalker,
    categoriesChosen: categoriesChosen,
    allCategories: allCategories,
  };
};

const getMaskerSentenceAudio = (
  maskerKeys,
  maskerPhrase,
  maskerChannels,
  maskerList_,
  targetTalker,
  categoriesChosen
) => {
  // console.log("categoriesChosen", categoriesChosen);
  var maskerSentenceAudio = [];
  //console.log(maskerKeys)
  const randMaskerIndex = { t: undefined };
  const maskerTalker = { t: targetTalker };
  while (maskerTalker.t === targetTalker) {
    randMaskerIndex.t = Math.floor(Math.random() * maskerKeys.length);
    maskerTalker.t = maskerKeys[randMaskerIndex.t];
  }
  maskerPhrase.map((elem) => {
    if (elem[0] === "#") {
      const withoutHashtag = elem.substring(1);
      const categoryKeys = Object.keys(
        maskerList_[maskerTalker.t][withoutHashtag]
      );
      //choose a random category from the list of categories not chosen by the target
      const randCategoryIndex = { t: undefined };
      const categoryItem = { t: categoriesChosen[withoutHashtag] };
      while (categoryItem.t === categoriesChosen[withoutHashtag]) {
        randCategoryIndex.t = Math.floor(Math.random() * categoryKeys.length);
        categoryItem.t = categoryKeys[randCategoryIndex.t];
      }

      const trialWordData = getTrialAudioBuffer(
        maskerChannels,
        maskerList_[maskerTalker.t][withoutHashtag][categoryItem.t],
        audioCtx
      );
      maskerSentenceAudio.push(trialWordData);
    } else {
      const word = maskerList_[maskerTalker.t][elem];
      // console.log(word, elem);
      const trialWordData = getTrialAudioBuffer(maskerChannels, word, audioCtx);
      maskerSentenceAudio.push(trialWordData);
    }
  });

  return maskerSentenceAudio;
};

export const vocoderPhraseSetupClickableCategory = (
  categories,
  responseRegister
) => {
  const container = document.createElement("div");
  container.classList.add("vocoder-phrase-clickable-category");
  container.id = "vocoder-phrase-clickable-category";

  const allCategories = categories["all"]; //all categories
  const chosenCategory = categories["chosen"]; //chosen categories

  const categoryKeys = Object.keys(allCategories);
  const categoryLength = categoryKeys.length;
  const response = {};
  categoryKeys.forEach((elem, ind, arr) => {
    const categoryContainer = document.createElement("div");
    categoryContainer.classList.add("vocoder-phrase-category-container");
    categoryContainer.id = "vocoder-phrase-category-container";
    categoryContainer.style.marginLeft = "10vw";

    const categoryTitle = document.createElement("div");
    categoryTitle.classList.add("vocoder-phrase-category-title");
    categoryTitle.id = "vocoder-phrase-category-title";
    categoryTitle.innerHTML = elem;

    const categoryList = document.createElement("div");
    categoryList.classList.add("vocoder-phrase-category-list");
    categoryList.id = "vocoder-phrase-category-list";
    categoryList.style.display = "flex";
    categoryList.style.flexDirection = "column";

    allCategories[elem].forEach((elem2, ind2, arr2) => {
      const categoryItem = document.createElement("div");
      categoryItem.className = "vocoder-phrase-category-item";
      categoryItem.innerHTML = elem2;
      categoryItem.onclick = () => {
        response[elem] = elem2;
        // console.log("response", response);
        //make more efficient after deadline
        const items = categoryList.children;
        for (let i = 0; i < items.length; i++) {
          if (items[i].innerHTML === elem2) {
            items[i].classList.add("vocoder-phrase-item-selected");
          } else {
            items[i].classList.remove("vocoder-phrase-item-selected");
          }
        }
        const responseKeys = Object.keys(response);
        const responseToRecord = [];
        if (responseKeys.length === categoryLength) {
          responseRegister.clickTime.push(performance.now());
          responseKeys.map((responseKey) => {
            responseToRecord.push(responseKey + "_" + response[responseKey]);
          });
          // console.log("responseToRecord", responseToRecord);
          responseRegister.current = responseToRecord;
        }
      };
      categoryList.appendChild(categoryItem);
    });

    categoryContainer.appendChild(categoryTitle);
    categoryContainer.appendChild(categoryList);
    container.appendChild(categoryContainer);
  });

  document.body.appendChild(container);
};

export const vocoderPhraseRemoveClickableCategory = (responseRegister) => {
  responseRegister.current = [];
  responseRegister.onsetTime = 0;
  responseRegister.clickTime = [];

  const ele = document.querySelectorAll(".vocoder-phrase-clickable-category");
  if (ele.length > 0) {
    ele.forEach((e) => {
      document.body.removeChild(e);
    });
  }
};
