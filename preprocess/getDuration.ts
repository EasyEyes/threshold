export const durations = {
  currentDuration: 0,
  _online2Minutes: "unknown",
  durationForStatusline: "",
};

const padToSameLength = (arrays: any[][], paddingValue = ""): any[][] => {
  const longestLength = Math.max(...arrays.map((array) => array.length));
  const paddedArrays = arrays.map((array) => [
    ...array,
    ...new Array(longestLength - array.length).fill(paddingValue),
  ]);
  return paddedArrays;
};

export const EstimateDurationForScientistPage = (parsed: any) => {
  let parsedData = padToSameLength(parsed.data);
  // duration in seconds
  let duration = 0;
  // console.log("parsed", parsedData);
  let n = parsedData[0].length;
  let conditionTrials = [...new Array(n)].map(() => 0);
  let readingLinesPerPage = [...new Array(n)].map(() => 0);
  let readingPages = [...new Array(n)].map(() => 0);
  let readingMaxCharactersPerLine = [...new Array()].map(() => 0);
  let readingNumberOfQuestions = [...new Array(n)].map(() => 0);
  let rsvpReadingNumberOfWords = [...new Array(n)].map(() => 0);
  let conditionEnabledBool = [...new Array(n)].map(() => "TRUE");
  let calibrateScreenSizeBool = [...new Array(n)].map(() => "TRUE");
  let calibrateBlindSpotBool = [...new Array(n)].map(() => "TRUE");
  let calibrateScreenSizeCheckBool = [...new Array(n)].map(() => "FALSE");
  let calibrateSoundAllHzBool = [...new Array(n)].map(() => "FALSE");
  let calibrateSound1000HzBool = [...new Array(n)].map(() => "FALSE");
  let targetTask = [...new Array(n)].map(() => "");
  let targetKind = [...new Array(n)].map(() => "");
  // get parsed data or default values
  for (let i = 0; i < parsedData.length; i++) {
    if (parsedData[i][0] == "conditionTrials") {
      conditionTrials = parsedData[i];
      // console.log("conditionTrials", conditionTrials);
    } else if (parsedData[i][0] == "readingLinesPerPage") {
      readingLinesPerPage = parsedData[i];
    } else if (parsedData[i][0] == "readingPages") {
      readingPages = parsed.data[i];
    } else if (parsedData[i][0] == "readingMaxCharactersPerLine") {
      readingMaxCharactersPerLine = parsedData[i];
    } else if (parsedData[i][0] == "readingNumberOfQuestions") {
      readingNumberOfQuestions = parsedData[i];
    } else if (parsedData[i][0] == "rsvpReadingNumberOfWords") {
      rsvpReadingNumberOfWords = parsedData[i];
    } else if (parsedData[i][0] == "conditionEnabledBool") {
      conditionEnabledBool = parsedData[i];
    } else if (parsedData[i][0] == "calibrateScreenSizeBool") {
      calibrateScreenSizeBool = parsedData[i];
    } else if (parsedData[i][0] == "calibrateScreenSizeCheckBool") {
      calibrateScreenSizeCheckBool = parsedData[i];
    } else if (parsedData[i][0] == "calibrateBlindSpotBool") {
      calibrateBlindSpotBool = parsedData[i];
    } else if (parsedData[i][0] == "calibrateSoundAllHzBool") {
      calibrateSoundAllHzBool = parsedData[i];
    } else if (parsedData[i][0] == "calibrateSound1000HzBool") {
      calibrateSound1000HzBool = parsedData[i];
    } else if (parsedData[i][0] == "targetTask") {
      targetTask = parsedData[i];
    } else if (parsedData[i][0] == "targetKind") {
      targetKind = parsedData[i];
    } else if (parsedData[i][0].match(/questionAndAnswer.*/)) {
      // 3 sec/question when targetTask=questionAndAnswer multiple choice
      duration += 3;
    }
  }
  // CALIBRATIONS
  // 4 s for size calibration
  duration += 4 * getCalibration(calibrateScreenSizeBool);
  duration += 4 * getCalibration(calibrateScreenSizeCheckBool);
  // 10 s for map blind spot calibration
  duration += 10 * getCalibration(calibrateBlindSpotBool);
  // 20 s for sound1000Hz calibration
  duration += 20 * getCalibration(calibrateSoundAllHzBool);
  // 40 s for soundAllHz calibration
  duration += 40 * getCalibration(calibrateSound1000HzBool);
  const getConditionEnable = (index: number) => {
    return conditionEnabledBool[index] === "FALSE" ? 0 : 1;
  };
  for (let i = 0; i < n; i++) {
    // CONDITIONS
    if (targetTask[i] == "identify" || targetTask[i] == "detect") {
      // 6 sec/trial when targetTask=identify or detect
      duration += getConditionEnable(i) * conditionTrials[i] * 6;
      // console.log("identify");
      // console.log("conditionTrials",conditionTrials[i]);
    }
    if (targetKind[i] == "reading") {
      // 0.05 sec/character + 3 s/question for ordinary reading
      // console.log("readingNumberOfQuestions",readingNumberOfQuestions[i]);
      // console.log("conditionEnabledBool", conditionEnabledBool);
      // console.log("getConditionEnable",getConditionEnable(i));
      // console.log("readingLinesPerPage", readingLinesPerPage[i]);
      // console.log("readingPages",readingPages[i]);
      duration += getConditionEnable(i) * readingNumberOfQuestions[i] * 6;
      // (The condition has charactersPerLine*linesPerPage*numberOFPages characters.)
      duration +=
        getConditionEnable(i) *
        readingLinesPerPage[i] *
        readingPages[i] *
        readingMaxCharactersPerLine[i] *
        0.05;
      // console.log("targetKind: reading");
    } else if (targetKind[i] == "rsvpReading") {
      // 3.25 sec/word  for RSVP reading
      duration += rsvpReadingNumberOfWords[i] * 3.25;
      // console.log("targetKind: rsvpReading");
    }
    // instructions
    // currently ignored because of complexity of measure
    // 0.25 sec/word for instructions
  }
  // console.log("duration in secs: ", duration);
  return duration;
};

const getCalibration = (array: string[]) => {
  for (let i = 0; i < array.length; i++) {
    if (array[i] == "TRUE") {
      return 1;
    }
  }
  return 0;
};
