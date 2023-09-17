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
  measureLuminance.movieValues = paramReader.read("movieValues", BC).split(",");
  const measureLuminanceHz = paramReader.read("measureLuminanceHz", BC);
  const movieHz = paramReader.read("movieHz", BC);

  console.log("measureLuminance.movieValues", measureLuminance.movieValues);
  console.log("measureLuminanceHz", measureLuminanceHz);
  console.log("movieHz", movieHz);
  // measureLuminanceIntervalPeriodMs is the period of the interval at which luminance is measured
  const measureLuminanceIntervalPeriodMs =
    getIntervalMsFromHz(measureLuminanceHz);
  console.log(
    "measureLuminanceIntervalPeriodMs",
    measureLuminanceIntervalPeriodMs
  );

  const movieIntervalPeriodMs = getIntervalMsFromHz(movieHz);
  console.log("movieIntervalPeriodMs", movieIntervalPeriodMs);
  // const timingGCD = toFixedNumber(
  //   getGCD(measureLuminanceIntervalPeriodMs, movieIntervalPeriodMs),
  //   4
  // );
  // console.log("timingGCD", timingGCD);
  const positiveDelayMs =
    paramReader.read("measureLuminanceDelaySec", BC) * 1000;
  const movieMs = paramReader.read("movieSec", BC) * 1000;
  let intervalId = null;
  // setTimeout(() => {
  //     addMeasureLuminanceRecord();

  //     intervalId = setInterval(()=>{
  //       const elapsedTime = (performance.now() - measureLuminance.movieStart);
  //       if (elapsedTime >= movieMs) {
  //         clearInterval(intervalId);
  //       } else {
  //         addMeasureLuminanceRecord();
  //       }
  //     },
  //       measureLuminanceIntervalPeriodMs);
  //   },
  //     positiveDelayMs
  // );
  setTimeout(() => {
    async function recursiveTimeout() {
      const elapsedTime = performance.now() - measureLuminance.movieStart;

      if (elapsedTime >= movieMs) {
        return; // Stop the recursive loop as the movie has ended.
      }

      await addMeasureLuminanceRecord();

      // When the previous call completes, schedule the next one.
      setTimeout(recursiveTimeout, measureLuminanceIntervalPeriodMs);
    }

    // Start the recursive loop.
    recursiveTimeout();
  }, positiveDelayMs);
};

// get the interval, in ms, from the frequency, in Hz ( 1/sec )
const getIntervalMsFromHz = (hz) => {
  return (1 / hz) * 1000;
};

// add a luminance to the measureLuminance.records array
const addMeasureLuminanceRecord = async () => {
  try {
    console.log("adding measure luminance record");
    const timeSinceMovieStartedMs = getTimeSinceMovieStartedMs();
    console.log("timeSinceMovieStartedMs", timeSinceMovieStartedMs);
    const record = { timeSinceMovieStartedMs: timeSinceMovieStartedMs };
    record["luminance"] = await readLuminance();
    console.log("record", record);
    measureLuminance.records.push(record);
  } catch (error) {
    console.error("Error adding luminance record:", error);
  }
};

const getTimeSinceMovieStartedMs = () => {
  const timeNow = performance.now();
  const timeSinceMovieStartedMs = timeNow - measureLuminance.movieStart;
  return timeSinceMovieStartedMs;
};

const readLuminance = async () => {
  return await measureLuminance.colorimeter.measure();
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
