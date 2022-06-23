import mergeBuffers from "merge-audio-buffers";
import { audioCtx, loadVocoderPhraseSoundFiles } from "./soundUtils";

// var targetList = {};
// var maskerList = {};
var whiteNoise;
var whiteNoiseData;

export const initVocoderPhraseSoundFiles = async (trialsConditions) => {
  const blockFiles = await loadVocoderPhraseSoundFiles(trialsConditions);
  // return new Promise(async (resolve) => {
  //   var targetList = await blockFiles["target"];
  //   var maskerList = await blockFiles["maskerList"];
  //   resolve({targetList:targetList,maskerList:maskerList});
  // });
  return {
    targetList: blockFiles["target"],
    maskerList: blockFiles["maskerList"],
  };
};

export const getVocoderPhraseTrialData = async (
  targetList,
  maskerList,
  blockCondition,
  targetVolumeDbSPLFromQuest,
  whiteNoiseLevel,
  soundGainDbSPL,
  maskerVolumeDbSPL
) => {
  //get trial phrase
  //change hardcoded value
  const targetPhrase = "Ready Baron GoTo #Color #Number Now".split(" ");
  const maskerPhrase = "Ready #CallSign GoTo #Color #Number Now".split(" ");

  //populate target and masker channel indices
  var targetChannels = populateTargetIndices();
  var maskerChannels = populateMaskerIndices(targetChannels);

  var targetSentenceAudio;
  var maskerSentenceAudio;

  var targetKeys = Object.keys(targetList[blockCondition]);
  console.log("list", targetKeys);
  console.log(targetList[blockCondition]);

  targetSentenceAudio = getTargetSentenceAudio(
    targetKeys,
    targetPhrase,
    targetChannels,
    targetList[blockCondition]
  );
  var maskerKeys = Object.keys(maskerList[blockCondition]);
  maskerSentenceAudio = getMaskerSentenceAudio(
    maskerKeys,
    maskerPhrase,
    maskerChannels,
    maskerList[blockCondition]
  );
  const targetAudio = combineAudioBuffers(targetSentenceAudio, audioCtx);
  const maskerAudio = combineAudioBuffers(maskerSentenceAudio, audioCtx);
  console.log(mergeBuffers([targetAudio, maskerAudio], audioCtx));
  return mergeBuffers([targetAudio, maskerAudio], audioCtx);
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
      targetSentenceAudio.push(trialWordData);
    } else {
      const word = targetList_[targetTalker][elem];
      const trialWordData = getTrialAudioBuffer(targetChannels, word, audioCtx);
      targetSentenceAudio.push(trialWordData);
    }
  });

  return targetSentenceAudio;
};

const getMaskerSentenceAudio = (
  maskerKeys,
  maskerPhrase,
  maskerChannels,
  maskerList_
) => {
  var maskerSentenceAudio = [];
  //console.log(maskerKeys)
  const randMaskerIndex = Math.floor(Math.random() * maskerKeys.length);
  const maskerTalker = maskerKeys[randMaskerIndex];
  maskerPhrase.map((elem) => {
    if (elem[0] === "#") {
      const withoutHashtag = elem.substring(1);
      const categoryKeys = Object.keys(
        maskerList_[maskerTalker][withoutHashtag]
      );
      const randCategoryIndex = Math.floor(Math.random() * categoryKeys.length);
      const categoryItem = categoryKeys[randCategoryIndex];
      const trialWordData = getTrialAudioBuffer(
        maskerChannels,
        maskerList_[maskerTalker][withoutHashtag][categoryItem],
        audioCtx
      );
      maskerSentenceAudio.push(trialWordData);
    } else {
      const word = maskerList_[maskerTalker][elem];
      console.log(word, elem);
      const trialWordData = getTrialAudioBuffer(maskerChannels, word, audioCtx);
      maskerSentenceAudio.push(trialWordData);
    }
  });

  return maskerSentenceAudio;
};
