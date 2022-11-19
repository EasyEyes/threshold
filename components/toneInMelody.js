import mergeBuffers from "merge-audio-buffers";
import { soundCalibrationResults } from "./global";
import { getCorrectedInDbAndSoundDBSPL } from "./soundTest";
import {
  setWaveFormToZeroDbSPL,
  adjustSoundDbSPL,
  audioCtx,
  initSoundFiles,
  loadVocoderPhraseSoundFiles,
  initSoundFilesWithPromiseAll,
} from "./soundUtils";
import {
  getVocoderPhraseTrialData,
  initVocoderPhraseSoundFiles,
} from "./vocoderPhrase";

var maskerList = {};
var targetList = {};

var whiteNoise;
var whiteNoiseData;

export const initToneInMelodySoundFiles = async (trialsConditions) => {
  // var x = await initVocoderPhraseSoundFiles(trialsConditions); //remove
  // console.log("x",await x)
  // initSoundFilesWithPromiseAll
  const blockFiles = await initSoundFilesWithPromiseAll(trialsConditions);
  maskerList = blockFiles["maskers"];
  targetList = blockFiles["target"];
};

export const getToneInMelodyTrialData = async (
  blockCondition,
  targetIsPresentBool,
  targetVolumeDbSPLFromQuest,
  maskerVolumDbSPL,
  whiteNoiseLevel,
  soundGainDBSPL,
  parameters
) => {
  //pick random masker
  var randomIndex = Math.floor(
    Math.random() * maskerList[blockCondition].length
  );
  var trialMasker = await maskerList[blockCondition][randomIndex]["file"];

  //modify masker
  var trialMaskerData = trialMasker.getChannelData(0);
  setWaveFormToZeroDbSPL(trialMaskerData);
  // adjust masker volume
  // const parameters = soundCalibrationResults.current.parameters;
  const correctedValuesForMasker = getCorrectedInDbAndSoundDBSPL(
    maskerVolumDbSPL,
    soundGainDBSPL,
    parameters,
    trialMaskerData
  );
  adjustSoundDbSPL(trialMaskerData, correctedValuesForMasker.inDB);

  var trialTarget;
  var targetVolume;
  if (targetIsPresentBool) {
    //pick and modify target
    //console.log(await targetSound);
    //trialTarget = await getAudioBufferFromArrayBuffer(await targetSound);
    randomIndex = Math.floor(Math.random() * targetList[blockCondition].length);
    trialTarget = await targetList[blockCondition][randomIndex]["file"];

    var trialTargetData = trialTarget.getChannelData(0);
    setWaveFormToZeroDbSPL(trialTargetData);
    // adjust target volume
    const correctedValuesForTarget = getCorrectedInDbAndSoundDBSPL(
      targetVolumeDbSPLFromQuest,
      soundGainDBSPL,
      parameters,
      trialTargetData
    );

    adjustSoundDbSPL(trialTargetData, correctedValuesForTarget.inDB);
    targetVolume = correctedValuesForTarget.correctedSoundDBSPL;
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
  // adjust white noise volume
  const correctedValuesForWhiteNoise = getCorrectedInDbAndSoundDBSPL(
    whiteNoiseLevel,
    soundGainDBSPL,
    parameters,
    whiteNoiseData
  );
  adjustSoundDbSPL(whiteNoiseData, correctedValuesForWhiteNoise.inDB);

  return targetIsPresentBool
    ? {
        trialSoundMelody: mergeBuffers(
          [trialMasker, trialTarget, whiteNoise],
          audioCtx
        ),
        targetVolume: targetVolume,
      }
    : { trialSoundMelody: mergeBuffers([trialMasker, whiteNoise], audioCtx) };
};
