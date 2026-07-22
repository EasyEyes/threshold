//import * as FFmpeg from "./addons/ffmpeg.min.js";
import { Image } from "image-js";
import axios from "axios";

import { preprocessRawCorpus } from "./reading.ts";

import { logger, xyPxOfDeg, xyDegOfPx, isRectInRect, Rectangle } from "./utils";

import { displayOptions } from "./global";

import { im_ctrans } from "./transformColorSpace.js";
import { XYDegOfPx, XYPxOfDeg } from "./multiple-displays/utils.ts";

export async function generate_image(
  bitmapArray,
  psychoJS,
  moviePQEncodedBool,
) {
  let computeImageSecStartTime = performance.now();
  let uIntArray = [];
  let width = bitmapArray.length;
  let height = bitmapArray[0].length;
  psychoJS.experiment.addData("computePixels", width * height);
  psychoJS.experiment.addData("computeFrames", bitmapArray[0][0].length);
  // logger("bitmapArray[0][0].length", bitmapArray[0][0].length);
  // logger("bitmapArray[0].length", bitmapArray[0].length);
  // logger("bitmapArray.length", bitmapArray.length);
  // logger("bitmapArray", bitmapArray);
  for (let t = 0; t < bitmapArray[0][0].length; t++) {
    let i = 0;
    // logger("bitmapArray.length",bitmapArray.length)
    // logger("bitmapArray[0].length",bitmapArray[0].length)
    let data = new Uint16Array(width * height * 4);
    if (moviePQEncodedBool) {
      let temp_data = new Uint16Array(width * height * 3);
      let z = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          temp_data[z++] = bitmapArray[x][y][t];
          temp_data[z++] = bitmapArray[x][y][t];
          temp_data[z++] = bitmapArray[x][y][t];
        }
      }
      // logger("temp_data", temp_data);
      let new_data = [];
      for (let m = 0; m < temp_data.length; m = m + 3) {
        new_data.push([
          temp_data[m] / 65535,
          temp_data[m + 1] / 65535,
          temp_data[m + 2] / 65535,
        ]);
      }
      // logger("new_data", new_data);
      let after_pq_data = im_ctrans(new_data, "rgb2020", "pq_rgb", null, 100);
      // logger("after_pq_data", after_pq_data);
      for (let y = 0; y < after_pq_data.length; y++) {
        data[i++] = after_pq_data[y][0] * 65535;
        data[i++] = after_pq_data[y][1] * 65535;
        data[i++] = after_pq_data[y][2] * 65535;
        data[i++] = 65535;
      }
    } else {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          data[i++] = bitmapArray[x][y][t];
          data[i++] = bitmapArray[x][y][t];
          data[i++] = bitmapArray[x][y][t];
          data[i++] = 65535;
        }
      }
    }
    // logger("data", data);
    let image = new Image(width, height, data, {
      alpha: 1,
      kind: "RGBA",
      bitDepth: 16,
    });
    uIntArray.push(image.toBuffer());
  }
  let computeImageSecEndTime = performance.now();
  psychoJS.experiment.addData(
    "computeImageSec",
    (computeImageSecEndTime - computeImageSecStartTime) / 1000,
  );
  //logger("uIntArray", uIntArray);
  return uIntArray;
}

// Module-level FFmpeg singleton. The wasm core is ~24MB and the default
// corePath (unpkg CDN) is fetched on every load(), so per-trial
// createFFmpeg()+load() made trial 2+ slow and flaky. Create and load once
// per session; reuse across movie trials.
let ffmpegInstance = null;
let ffmpegLoadPromise = null;

/** Test hook: drop the cached instance so each test starts fresh. */
export const resetFFmpegCache = () => {
  ffmpegInstance = null;
  ffmpegLoadPromise = null;
};

const getFFmpeg = async () => {
  if (!ffmpegInstance) {
    // Lazy ESM import — no CommonJS require in the browser (vite), and the
    // heavy FFmpeg.wasm chunk loads only when a movie trial needs it.
    const { createFFmpeg } = await import("@ffmpeg/ffmpeg");
    // corePath precedence: explicit hook (sim) > local vite-served core
    // (localhost dev) > library default (unpkg CDN, for deployed runs).
    const isLocalDev = ["localhost", "127.0.0.1"].includes(
      window.location.hostname,
    );
    const corePath =
      window.__FFMPEG_CORE_PATH__ ??
      (isLocalDev
        ? "/node_modules/@ffmpeg/core/dist/ffmpeg-core.js"
        : undefined);
    const instance = createFFmpeg(
      corePath ? { log: false, corePath } : { log: false },
    );
    ffmpegLoadPromise = instance.load().catch((err) => {
      // Allow the next trial to retry after a transient fetch failure.
      resetFFmpegCache();
      throw err;
    });
    ffmpegInstance = instance;
  }
  await ffmpegLoadPromise;
  return ffmpegInstance;
};

export async function generate_video(
  imageArray,
  movieHz,
  psychoJS,
  moviePQEncodedBool,
) {
  const ffmpeg = await getFFmpeg();
  RemoteCalibrator.init({ id: "session_022" });
  const browser = RemoteCalibrator.browser.value;
  // Probe with the <video> element, matching the actual playback path
  // (threshold.js sets video.src to the blob URL). MediaSource.isTypeSupported
  // is the wrong API here and is false on browsers that can play the file.
  const videoProbe = document.createElement("video");
  const isHVC1Supported =
    videoProbe.canPlayType('video/mp4; codecs="hvc1"') !== "";
  const isAVC1Supported =
    videoProbe.canPlayType('video/mp4; codecs="avc1.6e0033"') !== "";
  let uIntArray = await generate_image(
    imageArray,
    psychoJS,
    moviePQEncodedBool,
  );
  let computeFfmpegSecStartTime = performance.now();
  let countImages = uIntArray.length;
  for (let i = 0; i < countImages; i += 1) {
    var num = `newfile${i}`;
    ffmpeg.FS("writeFile", `tmp${num}.png`, uIntArray[i]);
  }
  if (moviePQEncodedBool) {
    await ffmpeg.run(
      "-pattern_type",
      "glob",
      "-framerate",
      String(movieHz),
      "-pix_fmt",
      "rgb48le",
      "-color_trc",
      "smpte2084",
      "-color_primaries",
      "bt2020",
      "-colorspace",
      "bt2020nc",
      "-i",
      "*.png",
      "-tag:v",
      "hvc1",
      "-c:v",
      "libx265",
      "-qp",
      "0",
      "-x265-params",
      "hdr-opt=1:repeat-headers=1:colorprim=bt2020:transfer=smpte2084:colormatrix=bt2020nc:master-display=G(0,0)B(0,0)R(0,0)WP(0,0)L(0,0):max-cll=0,0",
      "-pix_fmt",
      "yuv444p10le",
      "out.mp4",
    );
  } else {
    if (isHVC1Supported == true) {
      await ffmpeg.run(
        "-pattern_type",
        "glob",
        "-framerate",
        String(movieHz),
        "-i",
        "*.png",
        "-tag:v",
        "hvc1",
        "-c:v",
        "libx265",
        "-qp",
        "0",
        "-color_range",
        "tv",
        "-color_trc",
        "linear",
        "-color_primaries",
        "bt2020",
        "-colorspace",
        "bt2020nc",
        "-pix_fmt",
        "yuv444p10le",
        "out.mp4",
      );
      psychoJS.experiment.addData("computeCodec", "hvc1 : libx265");
    } else if (isAVC1Supported == true) {
      await ffmpeg.run(
        "-pattern_type",
        "glob",
        "-framerate",
        String(movieHz),
        "-i",
        "*.png",
        "-tag:v",
        "avc1",
        "-c:v",
        "libx264",
        "-qp",
        "0",
        "-color_range",
        "tv",
        "-color_trc",
        "linear",
        "-color_primaries",
        "bt2020",
        "-colorspace",
        "bt2020nc",
        "-pix_fmt",
        "yuv444p10le",
        "out.mp4",
      );
      psychoJS.experiment.addData("computeCodec", "avc1 : libx264");
    } else {
      logger("Both hvc1 and avc1.6e0033 codecs not supported by your browser");
      psychoJS.experiment.addData("computeCodec", "None");
    }
  }
  const encodeAttempted =
    moviePQEncodedBool || isHVC1Supported || isAVC1Supported;
  // Guard: when out.mp4 is missing, ffmpeg.FS("readFile") would throw
  // ffmpeg.wasm's cryptic "Check if the path exists" error, ending the
  // study. Fail with a clear message that distinguishes the two causes:
  // no playable codec (no ffmpeg.run) vs. an actual encode failure.
  const files = ffmpeg.FS("readdir", ".");
  if (!files.includes("out.mp4")) {
    if (!encodeAttempted) {
      throw new Error(
        "EasyEyes could not encode the movie stimulus: this browser cannot " +
          "play the required video codecs (hvc1 or avc1.6e0033, checked with " +
          "video.canPlayType). Try a current version of Chrome or Safari.",
      );
    }
    throw new Error(
      "EasyEyes failed to encode the movie stimulus: ffmpeg did not " +
        "produce out.mp4, although this browser reports codec support. " +
        "The encode may have run out of memory — try a smaller movieRectDeg " +
        "or a desktop browser.",
    );
  }
  const data = ffmpeg.FS("readFile", "out.mp4");
  for (let i = 0; i < countImages; i += 1) {
    var num = `newfile${i}`;
    ffmpeg.FS("unlink", `tmp${num}.png`);
  }
  ffmpeg.FS("unlink", "out.mp4");
  // NOTE: no ffmpeg.exit() — the singleton stays loaded for the next trial.
  let videoBlob = URL.createObjectURL(
    new Blob([data.buffer], { type: "video/mp4" }),
  );
  let computeFfmpegSecEndTime = performance.now();
  console.log(
    `Call to generateVideo took ${
      computeFfmpegSecEndTime - computeFfmpegSecStartTime
    } milliseconds`,
  );
  psychoJS.experiment.addData(
    "computeFfmpegSec",
    (computeFfmpegSecEndTime - computeFfmpegSecStartTime) / 1000,
  );
  return videoBlob;
}
const readJS = async (filename) => {
  const response = await axios.get(`code/${filename}`);
  if (!response)
    console.error(`Error loading text from this source (./code/${filename})!`);
  // var code = preprocessRawCorpus(response.data);
  return response.data;
};

export async function evaluateJSCode(
  paramReader,
  status,
  displayOptions,
  targetCharacter,
  questSuggestedLevel,
  psychoJS,
) {
  let computeMovieArraySecStartTime = performance.now();
  const BC = status.block_condition;
  const movieHz = paramReader.read("movieHz", BC);
  const screenLowerLeft = [
    -displayOptions.window._size[0] / 2,
    -displayOptions.window._size[1] / 2,
  ];
  const screenUpperRight = [
    displayOptions.window._size[0] / 2,
    displayOptions.window._size[1] / 2,
  ];
  const filename = paramReader.read("movieComputeJS", BC);
  return readJS(filename).then((response) => {
    //logger("last index", response.lastIndexOf("}"));
    var jsCode = response.substring(
      response.indexOf("{") + 1,
      response.lastIndexOf("}"),
    );
    var parameters_string = response.substring(
      response.indexOf("(") + 1,
      response.indexOf(")"),
    );
    var parameters_arr = parameters_string.split(",").map(function (item) {
      return item.trim();
    });
    //logger("parameters_arr", parameters_arr);
    var parameters = {};
    parameters["targetCharacter"] = targetCharacter;
    parameters["displayOptions"] = displayOptions;
    // Wrap to bridge old 2-arg convention (xyDeg, displayOptions) → new
    // 3-arg signature (iScreen, xyDeg, …). Movie compute JS files pass the
    // legacy displayOptions as second arg; discard it, inject iScreen=0.
    parameters["XYPixOfXYDeg"] = (xyDeg, _o) => XYPxOfDeg(0, xyDeg);
    parameters["xyPxOfDeg"] = (xyDeg, _o) => XYPxOfDeg(0, xyDeg);
    parameters["XYDegOfXYPix"] = (xyPx, _o) => XYDegOfPx(0, xyPx);
    parameters["xyDegOfPx"] = (xyPx, _o) => XYDegOfPx(0, xyPx);
    // Rect contract: EasyEyes utils use {left, bottom, right, top} objects,
    // but canonical experimenter movie JS (tiltedFlickeringGabor.js) treats
    // rects as [left, bottom, right, top] arrays — movieRectPx is a plain
    // array and ClipRect indexes screenRectPx numerically. Support both:
    // normalize array rects for isRectInRect, and give screenRectPx numeric
    // indices alongside its named props (getMovieValues.js uses .width).
    const asRectObject = (r) =>
      Array.isArray(r)
        ? { left: r[0], bottom: r[1], right: r[2], top: r[3] }
        : r;
    parameters["isRectInRect"] = (small, big) =>
      isRectInRect(asRectObject(small), asRectObject(big));
    const screenRect = new Rectangle(screenLowerLeft, screenUpperRight);
    screenRect[0] = screenRect.left;
    screenRect[1] = screenRect.bottom;
    screenRect[2] = screenRect.right;
    screenRect[3] = screenRect.top;
    parameters["screenRectPx"] = screenRect;
    parameters["questSuggestedLevel"] = questSuggestedLevel;
    for (let index in parameters_arr) {
      if (parameters_arr[index] in parameters) {
        //logger("parameter found", parameters_arr[index]);
      } else {
        //logger("parameter not found", parameters_arr[index]);
        if (parameters_arr[index] === "movieValues") {
          let values = paramReader.read(parameters_arr[index], BC).split(",");
          parameters[parameters_arr[index]] = values.filter(Boolean);
        } else {
          parameters[parameters_arr[index]] = paramReader.read(
            parameters_arr[index],
            BC,
          );
        }
      }
    }
    //logger("parameters deconstructed", Object.keys(parameters));
    // var args =
    //   "targetCharacter,xyPxOfDeg, xyDegOfPx, isRectInRect,movieRectDeg,movieRectPxContainsRectDegBool,screenRectPx,movieHz,movieSec,targetDelaySec,targetTimeConstantSec,targetHz,displayOptions,targetEccentricityXDeg,targetEccentricityYDeg,targetSpaceConstantDeg,targetCyclePerDeg,targetContrast,targetPhaseSpatialDeg,targetPhaseTemporalDeg";
    // logger("jsCode", jsCode);
    var myFunc = new Function(...Object.keys(parameters), jsCode);
    var returnedValues = myFunc(...Object.values(parameters));
    var imageNit = returnedValues[0];
    var actualStimulusLevel = returnedValues[1];
    let computeMovieArraySecEndTime = performance.now();
    psychoJS.experiment.addData(
      "computeMovieArraySec",
      (computeMovieArraySecEndTime - computeMovieArraySecStartTime) / 1000,
    );
    return [imageNit, movieHz, actualStimulusLevel];
  });
}
