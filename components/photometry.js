import { measureLuminance } from "./global";
import { paramReader } from "../threshold";
import { getGCD, toFixedNumber } from "./utils";
import { ColorCAL } from "./ColorCAL";

export const initColorCAL = async () => {
  measureLuminance.colorimeter = new ColorCAL();

  // Connect to the device
  console.log("Opening serial port...");
  measureLuminance.colorimeter.com.open();

  // Wait for the port to open
  await new Promise((resolve) => {
    measureLuminance.colorimeter.com.on("open", resolve);
  });

  // Get device information
  console.log("Getting device information...");
  let info = await measureLuminance.colorimeter.getInfo();
  console.log("Device Info: ", info);

  // Get calibration matrix
  console.log("Getting calibration matrix...");
  let calibMatrix = await measureLuminance.colorimeter.getCalibMatrix();
  console.log("Calibration Matrix: ", calibMatrix);
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
  trialNumber
) => {
  return `luminances-${experimentName}-${blockNumber}-${conditionName}-${trialNumber}`;
};

/**
 * Get the delay, in ms, relative to the movie starting, for the luminance to begin being measured
 * @param {string} BC
 * @returns
 */
export const getDelayBeforeMoviePlays = (BC) => {
  if (
    paramReader.read("measureLuminanceBool", BC) ||
    paramReader.read("measureLuminanceDelaySec", BC) > 0
  )
    return 0;
  return Math.abs(paramReader.read("measureLuminanceDelaySec", BC)) * 1000;
};

export const addMeasureLuminanceIntervals = (BC) => {
  measureLuminance.movieValues = paramReader("movieValues", BC);
  const measureLuminanceIntervalPeriodMs = getIntervalMsFromHz(
    paramReader.read("measureLuminanceHz", BC)
  );
  const movieIntervalPeriodMs = getIntervalMsFromHz(
    paramReader.read("movieHz", BC)
  );
  // TODO is this rounding necessary? see `precision` @ `addMeasureLuminanceRecord`
  const timingGCD = toFixedNumber(
    getGCD(measureLuminanceIntervalPeriodMs, movieIntervalPeriodMs),
    4
  );

  setInterval(addMeasureLuminanceRecord, timingGCD);
};

const getIntervalMsFromHz = (hz) => {
  return (1 / hz) * 1000;
};

const addMeasureLuminanceRecord = async (
  movieIntervalPeriodMs,
  measureLuminanceIntervalPeriodMs
) => {
  const timestamp = getTimeSinceMovieStartedSec();
  const record = { timeSinceMoveStartedSec: timestamp };

  // TODO is this rounding necessary? If so, what's a logical value?
  const precision = 4;
  const movieRecordBool =
    toFixedNumber(timestamp % (movieIntervalPeriodMs * 1000), precision) === 0;
  const luminanceRecordBool =
    toFixedNumber(
      timestamp % (measureLuminanceIntervalPeriodMs * 1000),
      precision
    ) === 0;
  if (!movieRecordBool && !luminanceRecordBool) return;

  logger(
    `recording movie value, timestamp: ${timestamp}, interval (sec): ${
      movieIntervalPeriodMs / 1000
    }`,
    movieRecordBool
  );
  logger(
    `recording movie value, timestamp: ${timestamp}, interval (sec): ${
      measureLuminanceIntervalPeriodMs / 1000
    }`,
    luminanceRecordBool
  );

  if (movieRecordBool)
    record["movieValues"] = measureLuminance.movieValues.pop();
  // TODO verify whether this is awaiting correctly
  if (luminanceRecordBool) record["luminance"] = await readLuminance();
  // TODO verify that this await isn't causing a significant delay, ie that the luminance isn't
  //      being read at a significantly later time than what's reported by `timestamp`

  measureLuminance.records.push(record);
};

const getTimeSinceMovieStartedSec = () => {
  const timeNow = performance.now();
  const timeSinceMovieStartedMs = timeNow - measureLuminance.movieStart;
  return timeSinceMovieStartedMs / 1000;
};

const readLuminance = async () => {
  return await measureLuminance.colorimeter.getLum();
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
