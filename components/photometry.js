import { measureLuminance } from "./global";
import { paramReader } from "../threshold";
import { psychoJS } from "./globalPsychoJS";
import {
  getGCD,
  toFixedNumber,
  logger,
  isFullscreen,
  requestNativeFullscreen,
  clearFullscreenWasLost,
} from "./utils";
import {
  pauseFullscreenOverlay,
  resumeFullscreenOverlay,
} from "./fullscreenPause.js";
import { ColorCAL } from "./ColorCAL";

/** Port open (connect() succeeded)? */
export const colorCALConnected = () =>
  !!measureLuminance.colorimeter?.globalReader;

/**
 * Open the port chooser, connect, and read the calibration matrix. Call from
 * a user gesture on a WINDOWED page (see colorCALReadyForBlock): from full
 * screen, Chrome drops full screen to show the chooser and the request can
 * stall there.
 */
export const initColorCAL = async () => {
  try {
    if (colorCALConnected()) {
      // Keep the open port; redo a failed calibration (an all-zero matrix
      // would make every reading 0 nits).
      const { calibMatrix } = measureLuminance.colorimeter;
      if (calibMatrix.every((row) => row.every((v) => v === 0)))
        await measureLuminance.colorimeter.calibrate();
      return;
    }
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

// ----- Connect panel: the scientist's Connect ColorCAL button ---------------
// Shown by colorCALReadyForBlock over the block instructions, on a windowed
// page, like the _screenColorCheckBool test page's Connect button. Its own
// click is the gesture that opens the port chooser. Removed when the block
// starts.

const PROCEED_HINT =
  "Click Proceed (or press RETURN; SPACE for reading) to return to full screen and start the block.";

let connectPanel = null;

const showColorCALConnectPanel = () => {
  if (connectPanel) return;
  const panel = document.createElement("div");
  Object.assign(panel.style, {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: "999999",
    maxWidth: "36em",
    padding: "24px 32px",
    borderRadius: "8px",
    background: "#fff",
    color: "#111",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
    font: "16px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    textAlign: "center",
  });
  const text = document.createElement("p");
  text.textContent =
    "measureLuminance = measure: this block reads the CRS ColorCAL during " +
    "every trial. Plug it in, rest the photocell on the screen center, then " +
    "click Connect and choose it in the browser's port chooser: " +
    '"USB Serial Device (COMn)" on Windows, "usbmodem…" on macOS.';
  const button = document.createElement("button");
  button.className = "btn btn-success";
  button.textContent = "Connect ColorCAL";
  const statusLine = document.createElement("p");
  statusLine.style.margin = "16px 0 0";
  button.onclick = async () => {
    button.disabled = true;
    statusLine.textContent = "Connecting…";
    try {
      await initColorCAL();
    } finally {
      button.disabled = false;
    }
    if (colorCALConnected()) {
      button.remove();
      statusLine.textContent = `ColorCAL connected. ${PROCEED_HINT}`;
      console.warn(`ColorCAL connected. ${PROCEED_HINT}`);
    } else {
      statusLine.textContent =
        "Not connected (chooser cancelled, or the device did not answer). Try again.";
    }
  };
  panel.append(text, button, statusLine);
  document.body.appendChild(panel);
  connectPanel = panel;
};

const removeColorCALConnectPanel = () => {
  connectPanel?.remove();
  connectPanel = null;
};

/**
 * May the block start? For blocks with measureLuminance=measure, call from
 * the gesture that ends the block instructions (Proceed click, RETURN,
 * SPACE). Two constraints shape this: Web Serial's port chooser should be
 * opened from a WINDOWED page (from full screen, Chrome drops full screen
 * to show it and the request can stall, never settling), and
 * Element.requestFullscreen() needs a user gesture — which the chooser's
 * own interaction is not. So:
 *  - not connected → leave full screen and show the Connect panel; its
 *    button's click opens the chooser. Returns false: the instructions and
 *    the Proceed button stay. Nothing re-enters full screen by itself.
 *  - connected → this gesture restores full screen (native request; never
 *    RemoteCalibrator's EE_FullScreenOk prompt, whose denied request
 *    surfaced as an unhandled rejection, "not granted", that ended the
 *    study), clears the lost-fullscreen latch that the pause overlay's
 *    Resume would have cleared, and returns true. A denied request returns
 *    false: try again.
 * The pause overlay is suspended from our own exit until the block starts.
 */
export const colorCALReadyForBlock = async () => {
  if (!("serial" in navigator)) {
    console.error("Web Serial API not supported in this browser");
    return true; // nothing to connect; every reading will fail
  }
  if (!colorCALConnected()) {
    pauseFullscreenOverlay();
    if (isFullscreen()) {
      try {
        await document.exitFullscreen();
      } catch (e) {
        console.warn("exitFullscreen failed:", e);
      }
    }
    showColorCALConnectPanel();
    return false;
  }
  if (!isFullscreen() && !(await requestNativeFullscreen())) {
    console.warn(`Could not return to full screen. ${PROCEED_HINT}`);
    return false;
  }
  clearFullscreenWasLost();
  removeColorCALConnectPanel();
  resumeFullscreenOverlay();
  return true;
};

/** colorCALReadyForBlock for a block with measureLuminance=measure; true
 * for any other block. */
export const measuringBlockReady = async (block) =>
  paramReader.read("measureLuminance", block).some((mode) => mode === "measure")
    ? await colorCALReadyForBlock()
    : true;

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
  if (paramReader.read("measureLuminance", BC) === "off") {
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
  measureLuminance.pretendBool =
    paramReader.read("measureLuminance", BC) === "pretend";

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
    if (paramReader.read("measureLuminance", BC) === "off") {
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

// ---------------------------------------------------------------------------
// targetKind letter and reading: sample the photometer during the trial.
//
// These stimuli are drawn by the canvas pipeline, so — unlike the movie,
// which plays in a <video> element — they exercise _screenColorSpace,
// _screenFloat16Bool and _screenDitherBool. The trial has no frame series to
// interleave, so the CSV has one row per reading:
//   luminanceTimeSec  seconds since the requested target onset (negative
//                     before it) when the reading was requested
//   luminanceEndSec   when it returned — a ColorCAL MES takes ~3.3 s, and the
//                     reading integrates the screen over that span
//   phase             beforeTarget | target | afterTarget when the screen
//                     showed the same thing from request to return; mixed
//                     when a phase boundary (or the end of the window, where
//                     the response screen appears) fell inside the span
//   luminanceNits     CIE Y in cd/m^2
//   xChroma, yChroma  CIE 1931 chromaticity (verifies _screenColorSpace)
// Time zero is the requested target onset: for letter,
// markingOffsetBeforeTargetOnsetSecs after the trial starts (the results
// CSV's measured lateness gives the render lag); for reading, the trial's
// first frame, which draws the page. The first reading is at
// measureLuminanceDelaySec (negative = before the target; grid points that
// fall before the trial start are skipped, so for letter set
// markingOffsetBeforeTargetOnsetSecs ≥ −measureLuminanceDelaySec to get them
// all) and then every 1/measureLuminanceHz, until the
// window ends — for letter at target offset + markingOnsetAfterTargetOffsetSecs
// (the response screen follows), for reading when the page is turned
// (trialRoutineEnd stops any sampler still running). Readings are taken one
// at a time (a MES command must finish before the next is issued), so a
// measureLuminanceHz above the device's ~0.3 Hz just means back-to-back
// readings; grid points that come due while a reading is in progress are
// taken as soon as it returns, and none is started after the window ends.
// Pretend mode records −1 for every measured value.
// ---------------------------------------------------------------------------

let stimulusSampler = null;

const readXYZ = async () => {
  if (measureLuminance.pretendBool) return [-1, -1, -1];
  return await measureLuminance.colorimeter.measureXYZ();
};

/**
 * @param {string} BC block_condition
 * @param {number} onsetMs requested target onset, performance.now() ms
 * @param {number} targetDurationSec phase boundary target → afterTarget
 * @param {number} windowEndSec last reading no later than this (since onset)
 * @param {string} filename luminances-EXPERIMENT-BLOCK-NAME-TRIAL
 */
export const startStimulusLuminanceSampling = (
  BC,
  { onsetMs, targetDurationSec, windowEndSec, filename },
) => {
  const mode = paramReader.read("measureLuminance", BC);
  if (mode === "off") return;
  if (mode === "measure" && !measureLuminance.colorimeter) {
    console.error(
      "measureLuminance=measure but the ColorCAL was not connected. Connect it from the block instructions (Proceed button, RETURN, or SPACE).",
    );
    return;
  }
  stopStimulusLuminanceSampling();
  measureLuminance.pretendBool = mode === "pretend";
  const periodMs = 1000 / paramReader.read("measureLuminanceHz", BC);
  // Reading times form a grid anchored at onset + delay. Grid points already
  // more than half a period in the past are skipped (a delay reaching back
  // before the trial start), so there is no burst of catch-up readings.
  const gridStartMs =
    onsetMs + paramReader.read("measureLuminanceDelaySec", BC) * 1000;
  const firstK = Math.max(
    0,
    Math.round((performance.now() - gridStartMs) / periodMs),
  );
  // Beyond the window the response screen is up: a reading ending there is
  // as mixed as one straddling target onset or offset.
  const phaseAt = (tSec) =>
    tSec < 0
      ? "beforeTarget"
      : tSec < targetDurationSec
      ? "target"
      : tSec <= windowEndSec
      ? "afterTarget"
      : "afterWindow";
  const sampler = { stopped: false, wake: undefined };
  const sleepUntil = (ms) =>
    new Promise((resolve) => {
      sampler.wake = resolve;
      setTimeout(resolve, Math.max(0, ms - performance.now()));
    });
  const records = [];
  (async () => {
    for (let k = firstK; !sampler.stopped; k++) {
      const nextMs = gridStartMs + k * periodMs;
      if ((nextMs - onsetMs) / 1000 > windowEndSec + 0.001) break;
      await sleepUntil(nextMs);
      if (sampler.stopped) break;
      const tSec = (performance.now() - onsetMs) / 1000;
      // A grid point that came due during the previous (slow) reading may
      // only be reached after the window has closed.
      if (tSec > windowEndSec + 0.001) break;
      try {
        const [X, Y, Z] = await readXYZ();
        const tEndSec = (performance.now() - onsetMs) / 1000;
        const sum = X + Y + Z;
        const pretend = measureLuminance.pretendBool;
        const phase = phaseAt(tSec);
        records.push({
          luminanceTimeSec: tSec,
          luminanceEndSec: tEndSec,
          phase: phase === phaseAt(tEndSec) ? phase : "mixed",
          luminanceNits: Y,
          xChroma: pretend ? -1 : sum > 0 ? X / sum : "",
          yChroma: pretend ? -1 : sum > 0 ? Y / sum : "",
        });
      } catch (error) {
        console.error("Error reading the photometer:", error);
        break;
      }
    }
    if (stimulusSampler === sampler) stimulusSampler = null;
    if (records.length)
      psychoJS.experiment.saveCSV(records, filename, false, true);
    else
      console.warn(
        `measureLuminance: no reading fell inside the stimulus window, so ${filename}.csv was not saved.`,
      );
  })();
  stimulusSampler = sampler;
};

/** Stop the letter/reading sampler (no-op when none is running); it saves
 * its CSV once any in-flight reading completes. */
export const stopStimulusLuminanceSampling = () => {
  if (!stimulusSampler) return;
  stimulusSampler.stopped = true;
  stimulusSampler.wake?.();
  stimulusSampler = null;
};

// ----- NOTES ----
/**
 * measureLuminance (default off) turns on sampling by the photometer during
 ** stimulus presentation. Set it to one of the following:
 ** • off: Does nothing.
 ** • measure: Take repeated photometer readings, as specified by
 **   measureLuminanceDelaySec and measureLuminanceHz.
 ** • pretend: for debugging without a photometer, simulate measurement
 **   (every reading is -1) to test timing.
 ** measureLuminance is implemented for targetKind movie (this block and
 ** addMeasureLuminanceIntervals above) and for targetKind letter and reading
 ** (startStimulusLuminanceSampling above).
 ** The "measure" setting uses the Cambridge Research Systems Colorimeter,
 ** which must be plugged into a USB port of the computer and pointed at
 ** whatever you want to measure.
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
 ** value in this list. If measureLuminance is not off then the movieValues 
 ** vector is reproduced as one of the columns in the luminancesXXX.csv data 
 ** file that is dropped into the Downloads folder.
*/

/**
 * TODO case of movie framerate not matching measureLuminanceHz
 *
 * Note that
 * """
 ** value in this list. If measureLuminance is not off then the movieValues
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
