import * as FFmpeg from "./addons/ffmpeg.min.js";
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
export async function generate_image(bitmapArray) {
  let uIntArray = [];
  for (let t = 0; t < bitmapArray[0][0].length; t++) {
    let i = 0;
    // logger("bitmapArray.length",bitmapArray.length)
    // logger("bitmapArray[0].length",bitmapArray[0].length)
    let width = bitmapArray.length;
    let height = bitmapArray[0].length;
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
  return uIntArray;
}

export async function generate_video(imageArray) {
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({ log: false });

  RemoteCalibrator.init({ id: "session_022" });
  const browser = RemoteCalibrator.browser.value;
  const isHVC1Supported = MediaSource.isTypeSupported(
    'video/mp4; codecs="hvc1"'
  );
  const isAVC1Supported = MediaSource.isTypeSupported(
    'video/mp4; codecs="avc1.6e0033"'
  );
  await ffmpeg.load();
  var startTime = performance.now();
  var uIntArray = [];
  await generate_image(imageArray).then((data) => (uIntArray = data));
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
      "2",
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
  } else if (isAVC1Supported == true) {
    await ffmpeg.run(
      "-pattern_type",
      "glob",
      "-framerate",
      "2",
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
  } else {
    logger("Both hvc1 and avc1.6e0033 codecs not supported by your browser");
  }
  const data = ffmpeg.FS("readFile", "out.mp4");
  for (let i = 0; i < countImages; i += 1) {
    var num = `newfile${i}`;
    ffmpeg.FS("unlink", `tmp${num}.png`);
  }
  let videoBlob = URL.createObjectURL(
    new Blob([data.buffer], { type: "video/mp4" })
  );
  var endTime = performance.now();
  console.log(`Call to generateVideo took ${endTime - startTime} milliseconds`);

  return videoBlob;
}
const readJS = async (filename) => {
  const response = await axios.get(`code/${filename}`);
  if (!response)
    console.error(`Error loading text from this source (./code/${filename})!`);

  var code = preprocessRawCorpus(response.data);
  // logger(code)
  return code;
};

export async function evaluateJSCode(
  paramReader,
  status,
  displayOptions,
  targetCharacter
) {
  const BC = status.block_condition;
  const targetEccentrictyXDeg = paramReader.read("targetEccentricityXDeg", BC);
  const targetEccentrictyYDeg = paramReader.read("targetEccentricityYDeg", BC);
  const targetSpaceConstantDeg = paramReader.read("targetSpaceConstantDeg", BC);
  const targetCyclePerDeg = paramReader.read("targetCyclePerDeg", BC);
  const targetPhase = paramReader.read("targetPhaseDeg", BC);
  const movieLuminanceNit = paramReader.read("movieLuminanceNit", BC);
  const targetContrast = paramReader.read("targetContrast", BC);
  // const computeRectDegString = paramReader.read("computeRectDeg", BC);
  // const computeRectDeg = computeRectDegString.split(",").map((element) => {
  //   return Number(element);
  // });
  const thresholdParameter = paramReader.read("thresholdParameter", BC);
  const movieRectPxContainsDegBool = paramReader.read(
    "movieRectPxContainsRectDegBool",
    BC
  );
  const targetDurationSec = paramReader.read("targetDurationSec", BC);
  const movieRectDegString = paramReader.read("movieRectDeg", BC);
  const movieRectDeg = movieRectDegString.split(",").map((element) => {
    return Number(element);
  });
  const movieHz = paramReader.read("movieHz", BC);
  const movieSec = paramReader.read("movieSec", BC);
  const screenLowerLeft = [
    -displayOptions.window._size[0] / 2,
    -displayOptions.window._size[1] / 2,
  ];
  const screenUpperRight = [
    displayOptions.window._size[0] / 2,
    displayOptions.window._size[1] / 2,
  ];
  const screenRectPx = new Rectangle(screenLowerLeft, screenUpperRight);
  const targetDelaySec = paramReader.read("targetDelaySec", BC);
  const targetTimeConstantSec = paramReader.read("targetTimeConstantSec", BC);
  const targetHz = paramReader.read("targetHz", BC);
  //var jsCode = paramReader.read("computeImageJS", BC);
  const filename = paramReader.read("movieComputeJS", BC);
  return readJS(filename).then((response) => {
    logger("last index", response.lastIndexOf("}"));
    var jsCode = response.substring(
      response.indexOf("{") + 1,
      response.lastIndexOf("}")
    );
    //console.log(`Received code: ${jsCode}`);
    var args =
      "targetCharacter,XYPixOfXYDeg, XYDegOfXYPix, IsRectInRect,movieRectDeg,movieRectPxContainsDegBool,screenRectPx,movieHz,movieSec,targetDelaySec,targetTimeConstantSec,targetHz,displayOptions,targetEccentrictyXDeg,targetEccentrictyYDeg,targetSpaceConstantDeg,targetCyclePerDeg,targetPhase,targetContrast";
    logger("jsCode", jsCode);
    var myFunc = new Function(args, jsCode);
    var imageNit = myFunc(
      targetCharacter,
      XYPixOfXYDeg,
      XYDegOfXYPix,
      isRectInRect,
      movieRectDeg,
      movieRectPxContainsDegBool,
      screenRectPx,
      movieHz,
      movieSec,
      targetDelaySec,
      targetTimeConstantSec,
      targetHz,
      displayOptions,
      targetEccentrictyXDeg,
      targetEccentrictyYDeg,
      targetSpaceConstantDeg,
      targetCyclePerDeg,
      targetPhase,
      targetContrast
    );
    return imageNit;
  });
}
