import { measureLuminance } from "./global";
import { paramReader } from "../threshold";
import { getGCD, toFixedNumber, logger } from "./utils";
import { ColorCAL } from "./ColorCAL";

export const initColorCAL = async () => {
  try {
    measureLuminance.colorimeter = new ColorCAL();

    // Connect to the device
    console.log("Opening serial port...");
    await measureLuminance.colorimeter.connect();

    // // Wait for the port to open
    // await new Promise((resolve) => {
    //   measureLuminance.colorimeter.com.on("open", resolve);
    // });

    // Get device information
    // console.log("Getting device information...");
    // let info = await measureLuminance.colorimeter.getInfo();
    // console.log("Device Info: ", info);

    // Get calibration matrix
    console.log("Getting calibration matrix...");
    let calibMatrix = await measureLuminance.colorimeter.calibrate();
    console.log("Calibration Matrix: ", calibMatrix);
  } catch (error) {
    console.error("Error initializing colorimeter:", error);
  }
};

/**
 ** start time from stimulus onset. After sampling the stimulus, EasyEyes saves a
 ** data file called luminances-EXPERIMENT-BLOCK-NAME-TRIAL.csv into the Downloads
 ** folder, where EXPERIMENT is the experiment name, BLOCK is the block number,
 ** NAME is the conditionName, and TRIAL is the trial number.
 */
export const getLuminanceFilename = (
  experimentName,
  blockNumber,
  conditionName,
  trialNumber,
) => {
  return `luminances-${experimentName}-${blockNumber}-${conditionName}-${trialNumber}`;
};

/**
 * Get the delay, in ms, relative to the movie starting, for the luminance to begin being measured
 * @param {string} BC
 * @returns
 */
export const getDelayBeforeMoviePlays = (BC) => {
  if (!paramReader.read("measureLuminanceBool", BC)) {
    return 0;
  } else {
    if (paramReader.read("measureLuminanceDelaySec", BC) > 0) {
      return 0;
    } else {
      return Math.abs(paramReader.read("measureLuminanceDelaySec", BC)) * 1000;
    }
  }
};

/**
 *
 * @param {string} BC
 */
export const addMeasureLuminanceIntervals = (BC) => {
  // measureLuminance.movieValues = paramReader.read("movieValues", BC).split(",");
  // measureLuminance.movieValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const measureLuminanceHz = paramReader.read("measureLuminanceHz", BC);
  const movieHz = paramReader.read("movieHz", BC);
  measureLuminance.pretendBool = paramReader.read(
    "measureLuminancePretendBool",
    BC,
  );

  console.log("measureLuminance.movieValues", measureLuminance.movieValues);
  console.log("measureLuminanceHz", measureLuminanceHz);
  console.log("movieHz", movieHz);
  // measureLuminanceIntervalPeriodMs is the period of the interval at which luminance is measured
  const measureLuminanceIntervalPeriodMs =
    getIntervalMsFromHz(measureLuminanceHz);
  console.log(
    "measureLuminanceIntervalPeriodMs",
    measureLuminanceIntervalPeriodMs,
  );

  const movieIntervalPeriodMs = getIntervalMsFromHz(movieHz);
  console.log("movieIntervalPeriodMs", movieIntervalPeriodMs);
  const positiveDelayMs =
    paramReader.read("measureLuminanceDelaySec", BC) * 1000;
  const movieMs =
    measureLuminance.movieValues.length > 0
      ? movieIntervalPeriodMs * measureLuminance.movieValues.length
      : paramReader.read("movieSec", BC) * 1000;

  const frequenciesMatch = measureLuminanceHz === movieHz;

  const t = performance.now();
  measureLuminance.records = [];

  let lastLogged = { movie: -Infinity, luminance: -Infinity };

  if (positiveDelayMs !== 0) {
    measureLuminance.records.push({
      frameTimeSec: (t - measureLuminance.movieStart) / 1000,
      movieValue:
        measureLuminance.movieValues[measureLuminance.currentMovieValueIndex++],
      luminanceTimeSec: "",
      luminanceNits: "",
    });
    lastLogged.movie = t;
  }

  const recursiveTimeout = (lastLogged) => {
    const currentTime = performance.now();
    const elapsedTime = currentTime - measureLuminance.movieStart;
    if (elapsedTime >= movieMs) return;

    console.log("frequenciesMatch", frequenciesMatch);
    console.log("positiveDelayMs", positiveDelayMs);
    console.log(
      "currentTime - lastLogged.luminance",
      currentTime - lastLogged.luminance,
    );
    console.log(
      "measureLuminanceIntervalPeriodMs",
      measureLuminanceIntervalPeriodMs,
    );

    if (
      frequenciesMatch &&
      positiveDelayMs === 0 &&
      (currentTime - lastLogged.luminance >= measureLuminanceIntervalPeriodMs ||
        currentTime - lastLogged.movie >= movieIntervalPeriodMs)
    ) {
      addLuminanceAndMovieValuesToRecord(BC);
      lastLogged.luminance = currentTime;
      lastLogged.movie = currentTime;
    } else {
      const shouldLogLuminance =
        currentTime - lastLogged.luminance >= measureLuminanceIntervalPeriodMs;
      const shouldLogMovie =
        currentTime - lastLogged.movie >= movieIntervalPeriodMs;
      console.log("shouldLogLuminance", shouldLogLuminance);
      console.log("shouldLogMovie", shouldLogMovie);
      if (shouldLogLuminance && !shouldLogMovie) {
        addMeasureLuminanceRecord();
        lastLogged.luminance = currentTime;
      } else if (!shouldLogLuminance && shouldLogMovie) {
        addMovieValueRecord();
        lastLogged.movie = currentTime;
      } else if (shouldLogLuminance && shouldLogMovie) {
        addLuminanceAndMovieValuesToRecord(BC);
        lastLogged.luminance = currentTime;
        lastLogged.movie = currentTime;
      }
    }

    const nextMeasureLuminanceTimeout =
      lastLogged.luminance + measureLuminanceIntervalPeriodMs - currentTime;
    const nextMovieTimeout =
      lastLogged.movie + movieIntervalPeriodMs - currentTime;
    const nextTimeout = frequenciesMatch
      ? nextMeasureLuminanceTimeout
      : Math.min(nextMeasureLuminanceTimeout, nextMovieTimeout);
    setTimeout(() => recursiveTimeout(lastLogged), nextTimeout);
  };

  const recursiveTimeoutForMovie = (lastLogged) => {
    const currentTime = performance.now();
    const elapsedTime = currentTime - measureLuminance.movieStart;
    if (elapsedTime >= movieMs) return;
    if (currentTime - lastLogged >= movieIntervalPeriodMs) {
      addMovieValueRecord();
      lastLogged = currentTime;
    }
    const nextTimeout = lastLogged + movieIntervalPeriodMs - currentTime;
    setTimeout(() => recursiveTimeoutForMovie(lastLogged), nextTimeout);
  };

  const recursiveTimeoutForLuminance = (lastLogged) => {
    const currentTime = performance.now();
    const elapsedTime = currentTime - measureLuminance.movieStart;
    if (elapsedTime >= movieMs) return;
    if (currentTime - lastLogged >= measureLuminanceIntervalPeriodMs) {
      addMeasureLuminanceRecord();
      lastLogged = currentTime;
    }
    const nextTimeout =
      lastLogged + measureLuminanceIntervalPeriodMs - currentTime;
    setTimeout(() => recursiveTimeoutForLuminance(lastLogged), nextTimeout);
  };

  if (frequenciesMatch && positiveDelayMs === 0) {
    setTimeout(
      () => recursiveTimeout(lastLogged),
      positiveDelayMs > 0 ? positiveDelayMs : 0,
    );
  } else {
    setTimeout(
      () => recursiveTimeoutForLuminance(lastLogged.luminance),
      positiveDelayMs > 0 ? positiveDelayMs : 0,
    );
    setTimeout(
      () => recursiveTimeoutForMovie(lastLogged.movie),
      positiveDelayMs > 0 ? positiveDelayMs : 0,
    );
  }
};

export const addLuminanceAndMovieValuesToRecord = async (BC) => {
  try {
    if (!paramReader.read("measureLuminanceBool", BC)) {
      return;
    }
    const timeSinceMovieStartedSec = getTimeSinceMovieStartedSec();
    const record = { frameTimeSec: timeSinceMovieStartedSec };
    record["movieValue"] =
      measureLuminance.movieValues[measureLuminance.currentMovieValueIndex++];
    (record["luminanceTimeSec"] = timeSinceMovieStartedSec),
      (record["luminanceNits"] = await readLuminance());
    measureLuminance.records.push(record);
  } catch (error) {
    console.error("Error adding luminance and movie value record:", error);
  }
};

// get the interval, in ms, from the frequency, in Hz ( 1/sec )
const getIntervalMsFromHz = (hz) => {
  return (1 / hz) * 1000;
};

// add a luminance to the measureLuminance.records array
const addMeasureLuminanceRecord = async () => {
  try {
    // console.log("adding measure luminance record");
    const timeSinceMovieStartedSec = getTimeSinceMovieStartedSec();
    const record = { frameTimeSec: "", movieValue: "" };
    record["luminanceTimeSec"] = timeSinceMovieStartedSec;
    record["luminanceNits"] = await readLuminance();
    measureLuminance.records.push(record);
  } catch (error) {
    console.error("Error adding luminance record:", error);
  }
};

const addMovieValueRecord = () => {
  const timeSinceMovieStartedSec = getTimeSinceMovieStartedSec();
  const record = { frameTimeSec: timeSinceMovieStartedSec };
  record["movieValue"] =
    measureLuminance.movieValues[measureLuminance.currentMovieValueIndex++];
  record["luminanceTimeSec"] = "";
  record["luminanceNits"] = "";

  measureLuminance.records.push(record);
};

const getTimeSinceMovieStartedMs = () => {
  const timeNow = performance.now();
  const timeSinceMovieStartedMs = timeNow - measureLuminance.movieStart;
  return timeSinceMovieStartedMs;
};

const getTimeSinceMovieStartedSec = () => {
  const timeNow = performance.now();
  const timeSinceMovieStartedSec =
    (timeNow - measureLuminance.movieStart) / 1000;
  return timeSinceMovieStartedSec;
};

const approximatelyEqual = (a, b, epsilon = 0.001) => {
  return Math.abs(a - b) < epsilon;
};

const readLuminance = async () => {
  if (measureLuminance.pretendBool) return -1; // for testing
  return await measureLuminance.colorimeter.measure();
  // return Math.random() * 100;
};

// ----- NOTES ----
/**
 * measureLuminanceBool (default FALSE) turns on sampling by the photometer during 
 ** stimulus presentation. (It is currently implemented solely for targetKind='movie'.) 
 ** This uses the Cambridge Research Systems Colorimeter, which must be plugged into a 
 ** USB port of the computer and pointed at whatever you want to measure. 
 ** (Tip: one easy way to stably measure from a laptop screen is to lay the screen on 
 ** its back and rest the photocell, gently, directly on the screen.) Use 
 ** measureLuminanceHz and measureLuminanceDelaySec to set the sampling rate and 
 ** start time from stimulus onset. After sampling the stimulus, EasyEyes saves a 
 ** data file called luminances-EXPERIMENT-BLOCK-NAME-TRIAL.csv into the Downloads 
 ** folder, where EXPERIMENT is the experiment name, BLOCK is the block number, 
 ** NAME is the conditionName, and TRIAL is the trial number. The first column is 
 ** the time stamp (in fractional seconds), since the stimulus onset, of the 
 ** luminance measurement. The second column is copied from movieValues. The 
 ** third column is measured luminance in cd/m^2 (candelas per meter squared, 
 ** also called nits). Note that measureLuminanceDelaySec can be negative, so 
 ** the time stamp too can be negative. The movieValues column will be aligned 
 ** with the other columns only when measureLuminanceHz=movieHz.

 *  measureLuminanceDelaySec (default 5) sets the delay (which can be negative) 
 ** from stimulus onset to taking of the first luminance sample. Note that the 
 ** CRS Colorimeter is designed for slow precise measurements. To achieve better 
 ** than 12 bit precision, if you want the reading of a new luminance to be 
 ** unaffected by the prior luminance, we recommend allowing 5 s for the device 
 ** to settle at the new luminance before taking a reading. Thus, if targetKind='movie', 
 ** you might run your movie with 6 s per frame (i.e. 1/6 Hz) and set 
 ** measureLuminanceDelaySec=5.

 *  measureLuminanceHz (default 1) sets the rate that the photometer is sampled. 
 ** Note that the CRS Colorimeter is designed for slow precise measurements. 
 ** If the stimulus is a movie, you'll typically set this frequency to match 
 ** the frame rate of the movie. We recommend a slow frame rate, e.g. 1/6 Hz.

 *  movieValues (default empty) is a comma-separated list of numbers, 
 ** one per frame of a movie. The length of the list determines the  number of 
 ** frames. This vector offers the scientist a handy way to provide a series 
 ** of numbers to the scientist's movieCompute.js program to control, 
 ** e.g. the contrast, of each frame of a movie, with one frame per 
 ** value in this list. If movieMeasureLuminanceBool=TRUE then the movieValues 
 ** vector is reproduced as one of the columns in the luminancesXXX.csv data 
 ** file that is dropped into the Downloads folder.
*/

/**
 * TODO case of movie framerate not matching measureLuminanceHz
 *
 * Note that
 * """
 ** value in this list. If movieMeasureLuminanceBool=TRUE then the movieValues
 ** vector is reproduced as one of the columns in the luminancesXXX.csv data
 ** file that is dropped into the Downloads folder.
 * """
 * which specifies that every value of movieValues should be represented by a
 * row in the output csv.
 *
 * As Denis writes:
 * """
 ** The movieValues column will be aligned with the other columns only when measureLuminanceHz=movieHz.
 * """
 * so when `measureLuminanceHz !== movieHz`, a row will be recorded every `1/measureLuminanceHz`
 * sec and `1/movieHz`. When `tSec % (1/measureLuminanceHz) === 0` and `tSec % (1/movieHz) === 0`,
 * then a row will include both `movieValues` and luminance values.
 * (where `tSec` is time since the first recording, ie since tStimulusOnset - measureLuminanceDelaySec)
 * ie this problem is basically fizzbuzz.
 */
