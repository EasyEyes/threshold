//import * as FFmpeg from "./addons/ffmpeg.min.js";
import { Image } from "image-js";
import axios from "axios";

import { preprocessRawCorpus } from "./reading.ts";

import {
  logger,
  XYPixOfXYDeg,
  XYDegOfXYPix,
  isRectInRect,
  Rectangle,
} from "./utils";

import { displayOptions } from "./global";
export async function generate_image(bitmapArray, psychoJS) {
  let uIntArray = [];
  let width = bitmapArray.length;
  let height = bitmapArray[0].length;
  psychoJS.experiment.addData("computePixels", width * height);
  psychoJS.experiment.addData("computeFrames", bitmapArray[0][0].length);

  for (let t = 0; t < bitmapArray[0][0].length; t++) {
    let i = 0;
    // logger("bitmapArray.length",bitmapArray.length)
    // logger("bitmapArray[0].length",bitmapArray[0].length)
    let data = new Uint16Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        data[i++] = bitmapArray[x][y][t];
        data[i++] = bitmapArray[x][y][t];
        data[i++] = bitmapArray[x][y][t];
        data[i++] = 65535;
      }
    }
    let image = new Image(width, height, data, {
      alpha: 1,
      kind: "RGBA",
      bitDepth: 16,
    });
    uIntArray.push(image.toBuffer());
  }
  //logger("uIntArray", uIntArray);
  return uIntArray;
}

export async function generate_video(imageArray, movieHz, psychoJS) {
  // const { createFFmpeg, fetchFile } = FFmpeg;
  const { createFFmpeg } = require("@ffmpeg/ffmpeg");
  const ffmpeg = createFFmpeg({ log: false });
  let computeFfmpegSecStartTime = performance.now();
  RemoteCalibrator.init({ id: "session_022" });
  const browser = RemoteCalibrator.browser.value;
  const isHVC1Supported = MediaSource.isTypeSupported(
    'video/mp4; codecs="hvc1"'
  );
  const isAVC1Supported = MediaSource.isTypeSupported(
    'video/mp4; codecs="avc1.6e0033"'
  );
  await ffmpeg.load();
  // var uIntArray = [];
  //await generate_image(imageArray).then((data) => (uIntArray = data));
  let uIntArray = await generate_image(imageArray, psychoJS);
  let countImages = uIntArray.length;
  for (let i = 0; i < countImages; i += 1) {
    var num = `newfile${i}`;
    ffmpeg.FS("writeFile", `tmp${num}.png`, uIntArray[i]);
  }
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
      "out.mp4"
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
      "out.mp4"
    );
    psychoJS.experiment.addData("computeCodec", "avc1 : libx264");
  } else {
    logger("Both hvc1 and avc1.6e0033 codecs not supported by your browser");
    psychoJS.experiment.addData("computeCodec", "None");
  }
  const data = ffmpeg.FS("readFile", "out.mp4");
  for (let i = 0; i < countImages; i += 1) {
    var num = `newfile${i}`;
    ffmpeg.FS("unlink", `tmp${num}.png`);
  }
  ffmpeg.FS("unlink", "out.mp4");
  await ffmpeg.exit();
  let videoBlob = URL.createObjectURL(
    new Blob([data.buffer], { type: "video/mp4" })
  );
  let computeFfmpegSecEndTime = performance.now();
  console.log(
    `Call to generateVideo took ${
      computeFfmpegSecEndTime - computeFfmpegSecStartTime
    } milliseconds`
  );
  psychoJS.experiment.addData(
    "computeFfmpegSec",
    computeFfmpegSecEndTime - computeFfmpegSecStartTime
  );
  return videoBlob;
}
const readJS = async (filename) => {
  const response = await axios.get(`code/${filename}`);
  if (!response)
    console.error(`Error loading text from this source (./code/${filename})!`);

  var code = preprocessRawCorpus(response.data);
  return code;
};

export async function evaluateJSCode(
  paramReader,
  status,
  displayOptions,
  targetCharacter,
  questSuggestedLevel,
  psychoJS
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
      response.lastIndexOf("}")
    );
    var parameters_string = response.substring(
      response.indexOf("(") + 1,
      response.indexOf(")")
    );
    var parameters_arr = parameters_string.split(",").map(function (item) {
      return item.trim();
    });
    //logger("parameters_arr", parameters_arr);
    var parameters = {};
    parameters["targetCharacter"] = targetCharacter;
    parameters["displayOptions"] = displayOptions;
    parameters["XYPixOfXYDeg"] = XYPixOfXYDeg;
    parameters["XYDegOfXYPix"] = XYDegOfXYPix;
    parameters["isRectInRect"] = isRectInRect;
    parameters["screenRectPx"] = new Rectangle(
      screenLowerLeft,
      screenUpperRight
    );
    parameters["questSuggestedLevel"] = questSuggestedLevel;
    for (let index in parameters_arr) {
      if (parameters_arr[index] in parameters) {
        //logger("parameter found", parameters_arr[index]);
      } else {
        //logger("parameter not found", parameters_arr[index]);
        parameters[parameters_arr[index]] = paramReader.read(
          parameters_arr[index],
          BC
        );
      }
    }
    //logger("parameters deconstructed", Object.keys(parameters));
    // var args =
    //   "targetCharacter,XYPixOfXYDeg, XYDegOfXYPix, isRectInRect,movieRectDeg,movieRectPxContainsRectDegBool,screenRectPx,movieHz,movieSec,targetDelaySec,targetTimeConstantSec,targetHz,displayOptions,targetEccentricityXDeg,targetEccentricityYDeg,targetSpaceConstantDeg,targetCyclePerDeg,targetContrast,targetPhaseSpatialDeg,targetPhaseTemporalDeg";
    var myFunc = new Function(...Object.keys(parameters), jsCode);
    var returnedValues = myFunc(...Object.values(parameters));
    var imageNit = returnedValues[0];
    var actualStimulusLevel = returnedValues[1];
    let computeMovieArraySecEndTime = performance.now();
    psychoJS.experiment.addData(
      "computeMovieArraySec",
      computeMovieArraySecEndTime - computeMovieArraySecStartTime
    );
    return [imageNit, movieHz, actualStimulusLevel];
  });
}
