import { paramReader } from "../threshold";
import { psychoJS } from "./globalPsychoJS";
import {
  correctAns,
  imageConfig,
  imageFolders,
  imageQuestionAndAnswer,
  instructionFont,
  rc,
  skipTrialOrBlock,
  status,
} from "./global";
import { visual } from "../psychojs/src";
import JSZip from "jszip";
import { XYDegOfPx, XYPxOfDeg } from "./multiple-displays/utils";
import { Screens } from "./multiple-displays/globals";
import {
  areQuestionAndAnswerParametersPresent,
  colorRGBASnippetToRGBA,
  fillNumberLength,
  readTargetTask,
  toShowCursor,
} from "./utils";
import Swal from "sweetalert2";
import { styleNodeAndChildrenRecursively } from "./misc";
import { getCorrectSynth, getWrongSynth } from "./sound";
import { readi18nPhrases } from "./readPhrases";

const doesFileNameContainIgnoreDirectory = (filename, ignoreDirectories) => {
  for (const ignoreDirectory of ignoreDirectories) {
    if (filename.includes(ignoreDirectory)) {
      return true;
    }
  }
  return false;
};

export const parseImageFolders = async () => {
  // read parameter targetImageFolder and get a list of all the folders
  const targetKinds = paramReader.read("targetKind", "__ALL_BLOCKS__");
  const isThereAnyImageTargetKind = targetKinds.includes("image");
  if (!isThereAnyImageTargetKind) return;

  const targetImageFolders = paramReader.read(
    "targetImageFolder",
    "__ALL_BLOCKS__",
  );
  const filteredTargetImageFolders = targetImageFolders.filter((folder) => {
    return folder !== "";
  });

  const acceptedImageExtensions = ["png", "jpg"];
  const ignoreDirectories = ["__MACOSX"];

  await Promise.all(
    filteredTargetImageFolders.map(async (folder) => {
      imageFolders.folders.set(folder, new Map());
      await fetch(`folders/${folder}.zip`)
        .then((response) => {
          return response.blob();
        })
        .then(async (data) => {
          const zip = new JSZip();
          await zip.loadAsync(data).then((zip) => {
            return Promise.all(
              Object.keys(zip.files).map(async (filename) => {
                const n = filename.split(".");
                const extension = n[n.length - 1];

                if (
                  !zip.files[filename].dir &&
                  !doesFileNameContainIgnoreDirectory(
                    filename,
                    ignoreDirectories,
                  ) &&
                  acceptedImageExtensions.includes(extension.toLowerCase())
                ) {
                  const N = n[n.length - 2];
                  const name = N.split("/").pop();
                  const file = await zip.files[filename].async("arraybuffer");
                  imageFolders.folders
                    .get(folder)
                    ?.set(name, { file: file, usedInCondition: [] });
                }
              }),
            );
          });
        });
    }),
  );
};

export const areAnyOfQuestionAndAnswerParametersEqualTo = (BC, value) => {
  //check if the parameters questionAnswer01 ... questionAnswer99 are equal to value
  for (let i = 1; i <= 99; i++) {
    const qName = `questionAnswer${fillNumberLength(i, 2)}`;
    if (paramReader.has(qName)) {
      const question = paramReader.read(qName, BC);
      if (question && question.length && question === value) return true;
    }
  }
  return false;
};

const shuffleArray = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const constructIdentifyQuestion = (BC) => {
  const targetImageFolder = paramReader.read("targetImageFolder", BC);
  const imageFolder = imageFolders.folders.get(targetImageFolder);
  const imageFileNames = Array.from(imageFolder.keys());
  const correctAnswer = imageConfig.currentImageFileName.split(".")[0];
  const uniqueImageFileNames = [
    ...new Set(imageFileNames.map((fileName) => fileName.split(".")[0])),
  ];

  const others = uniqueImageFileNames.filter(
    (fileName) => fileName !== correctAnswer,
  );
  const responseMaxOptions = imageConfig.responseMaxOptions;
  let responseMaxOptionsInt = parseInt(responseMaxOptions);
  if (
    isNaN(responseMaxOptionsInt) ||
    responseMaxOptionsInt > others.length + 1 ||
    responseMaxOptionsInt < 1
  )
    responseMaxOptionsInt = others.length + 1;

  const foils = shuffleArray(others).slice(0, responseMaxOptionsInt - 1);
  const sortedUniqueImageFileNames_limited = sortImageFileNames([
    correctAnswer,
    ...foils,
  ]);

  let instructionForResponse = paramReader.read("instructionForResponse", BC);
  if (instructionForResponse === "#NONE" || instructionForResponse === "") {
    instructionForResponse = readi18nPhrases(
      "T_identifyImage",
      rc.language.value,
    );
  }
  return `_identify_|${correctAnswer}|${instructionForResponse}|${sortedUniqueImageFileNames_limited.join(
    "|",
  )}`;
};

export const parseImageQuestionAndAnswer = (BC) => {
  imageQuestionAndAnswer.current = {};
  imageQuestionAndAnswer.current[BC] = [];
  const targetTask = readTargetTask(BC);
  const areQuestionAndAnswerParametersPresentBool =
    areQuestionAndAnswerParametersPresent(BC);
  const shouldIdentifyComeFirst =
    areQuestionAndAnswerParametersPresentBool &&
    !areAnyOfQuestionAndAnswerParametersEqualTo(BC, "identify") &&
    targetTask === "identify";

  if (
    targetTask === "questionAndAnswer" ||
    areQuestionAndAnswerParametersPresentBool
  ) {
    if (shouldIdentifyComeFirst) {
      imageQuestionAndAnswer.current[BC].push(constructIdentifyQuestion(BC));
    }
    for (let i = 1; i <= 99; i++) {
      const qName = `questionAnswer${fillNumberLength(i, 2)}`;
      if (paramReader.has(qName)) {
        const question = paramReader.read(qName, BC);
        if (question && question.length) {
          if (question === "identify") {
            imageQuestionAndAnswer.current[BC].push(
              constructIdentifyQuestion(BC),
            );
          } else {
            imageQuestionAndAnswer.current[BC].push(question);
          }
        }
      }
      // Old parameter name, ie with "And"
      const qAndName = `questionAndAnswer${fillNumberLength(i, 2)}`;
      if (paramReader.has(qAndName)) {
        const question = paramReader.read(qAndName, BC);
        if (question && question.length) {
          if (question === "identify") {
            imageQuestionAndAnswer.current[BC].push(
              constructIdentifyQuestion(BC),
            );
          } else {
            imageQuestionAndAnswer.current[BC].push(question);
          }
        }
      }
    }
  } else if (targetTask === "identify") {
    //construct the question string
    imageQuestionAndAnswer.current[BC].push(constructIdentifyQuestion(BC));
  }
};

const sortImageFileNames = (imageFolder) => {
  //put all the lowercase names sorted first, then all the uppercase names sorted second, then all the numbers sorted third
  const imageFileNames = imageFolder;
  imageFileNames.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    if (aLower < bLower) return -1;
    if (aLower > bLower) return 1;
    return 0;
  });
  return imageFileNames;
};

export const readTrialLevelImageParams = (BC) => {
  imageConfig.targetSizeDeg = paramReader.read("targetSizeDeg", BC);
  imageConfig.targetDurationSec = paramReader.read("targetDurationSec", BC);
  imageConfig.targetEccentricityXDeg = paramReader.read(
    "targetEccentricityXDeg",
    BC,
  );
  imageConfig.targetEccentricityYDeg = paramReader.read(
    "targetEccentricityYDeg",
    BC,
  );
  imageConfig.thresholdParameter = paramReader.read("thresholdParameter", BC);
  imageConfig.targetSizeIsHeightBool = paramReader.read(
    "targetSizeIsHeightBool",
    BC,
  );
  imageConfig.targetImageFolder = paramReader.read("targetImageFolder", BC);
  imageConfig.targetImageReplacementBool = paramReader.read(
    "targetImageReplacementBool",
    BC,
  );
  imageConfig.delayAfterStimOnsetSec = paramReader.read(
    "markingOnsetAfterTargetOffsetSecs",
    BC,
  );
  imageConfig.delayBeforeStimOnsetSec = paramReader.read(
    "markingOffsetBeforeTargetOnsetSecs",
    BC,
  );
  imageConfig.responseMaxOptions = paramReader.read("responseMaxOptions", BC);
};

export const getImageTrialData = async (BC) => {
  const targetImageFolder = paramReader.read("targetImageFolder", BC);
  const imageFolder = imageFolders.folders.get(targetImageFolder);
  let fileName = "";
  let imageFile = null;
  let randomIndex = 0;
  if (!imageConfig.targetImageReplacementBool) {
    // Find entries (fileName-fileData pairs) that are not used
    const unusedEntries = Array.from(imageFolder.entries()).filter(
      ([fileName, fileData]) => {
        return !fileData.usedInCondition.includes(BC);
      },
    );

    if (unusedEntries.length === 0) {
      throw new Error(
        "No unused images available in folder: " + targetImageFolder,
      );
    }

    randomIndex = Math.floor(Math.random() * unusedEntries.length);
    const selectedEntry = unusedEntries[randomIndex];
    fileName = selectedEntry[0]; // The filename (key)
    imageFile = selectedEntry[1].file; // The file data

    // Mark as used
    imageFolder.get(fileName).usedInCondition.push(BC);
  } else {
    const imageFileNames = Array.from(imageFolder.keys());
    randomIndex = Math.floor(Math.random() * imageFileNames.length);
    fileName = imageFileNames[randomIndex];
    imageFile = imageFolder.get(fileName).file;
    imageFolder.get(fileName).usedInCondition.push(BC);
  }

  return {
    fileName: fileName,
    imageFile: imageFile,
  };
};

let imageLoaded = false;

export const getImageStim = async () => {
  const targetSizeDeg = imageConfig.targetSizeDeg;
  const targetDurationSec = imageConfig.targetDurationSec;
  const targetEccentricityXDeg = imageConfig.targetEccentricityXDeg;
  const targetEccentricityYDeg = imageConfig.targetEccentricityYDeg;
  const thresholdParameter = imageConfig.thresholdParameter;
  const targetSizeIsHeightBool = imageConfig.targetSizeIsHeightBool;
  const targetImageFolder = imageConfig.targetImageFolder;

  const extension = imageConfig.currentImageFileName.split(".")[1];
  const mimeType = `image/${extension}`;
  const imgBlob = new Blob([imageConfig.currentImageFile], { type: mimeType });
  const imgUrl = URL.createObjectURL(imgBlob);

  const img = document.createElement("img");
  img.src = imgUrl;
  img.id = "targetImageEle";
  img.style.display = "block";
  img.style.margin = "auto";
  img.style.visibility = "hidden";

  // temp
  document.body.appendChild(img);

  img.onload = () => {
    URL.revokeObjectURL(imgUrl);
    imageLoaded = true;
  };

  while (!imageLoaded) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  imageLoaded = false;
  const imgHeight = img.naturalHeight;
  const imgWidth = img.naturalWidth;

  document.body.removeChild(img);
  img.style.visibility = "visible";

  // find target size in px
  //assume bottom left of image is at 0,0
  const targetLowerLeftDeg = [0, 0];
  const targetUpperRightDeg = targetSizeIsHeightBool
    ? [0, targetSizeDeg]
    : [targetSizeDeg, 0];
  const targetLowerLeftPx = XYPxOfDeg(0, targetLowerLeftDeg, false, true);
  const targetUpperRightPx = XYPxOfDeg(0, targetUpperRightDeg, false, true);

  let targetWidthPx = 0;
  let targetHeightPx = 0;
  let heightPx = 0;
  let widthPx = 0;

  if (
    typeof targetLowerLeftPx[0] === "number" &&
    typeof targetUpperRightPx[0] === "number" &&
    typeof targetLowerLeftPx[1] === "number" &&
    typeof targetUpperRightPx[1] === "number"
  ) {
    targetWidthPx = targetUpperRightPx[0] - targetLowerLeftPx[0];
    targetHeightPx = targetUpperRightPx[1] - targetLowerLeftPx[1];
  }

  if (targetSizeIsHeightBool) {
    heightPx = targetHeightPx;
    //retain aspect ratio of image
    widthPx = (imgWidth / imgHeight) * heightPx;
  } else {
    widthPx = targetWidthPx;
    heightPx = (imgHeight / imgWidth) * widthPx;
  }

  const targetEccentricityXYPX = XYPxOfDeg(
    0,
    [Number(targetEccentricityXDeg), Number(targetEccentricityYDeg)],
    false,
    true,
  );

  const imageStim = new visual.ImageStim({
    win: psychoJS.window,
    depth: -20.0,
    pos: targetEccentricityXYPX,
    size: [widthPx, heightPx],
    image: img,
    units: "pix",
  });

  imageStim.setAutoDraw(true);

  return imageStim;
};

export const questionAndAnswerForImage = async (BC) => {
  let i = 0;
  let index = "00";
  const targetTask = readTargetTask(BC);
  let key_resp_corr = 0;
  const correctSynth = getCorrectSynth(psychoJS);
  // const wrongSynth = getWrongSynth(psychoJS);

  for (const questionAndAnswer of imageQuestionAndAnswer.current[BC]) {
    i++;
    index = fillNumberLength(i, 2);
    let correctAnswer, question, answers;
    const questionComponents = questionAndAnswer.split("|");
    const choiceQuestionBool = questionComponents.length > 3;
    const questionAndAnswerShortcut = questionComponents[0];
    // ! correct answer
    correctAnswer = questionComponents[1];
    // ! question
    question = questionComponents[2];

    if (choiceQuestionBool) {
      answers = questionComponents.slice(3);
    } else {
      answers = "";
    }

    let html = "";
    const inputOptions = new Map();

    if (choiceQuestionBool) {
      html += '<div class="threshold-answers-set">';
      for (const answer of answers) {
        html += `<button class="threshold-button threshold-answer" data-answer="${answer}">${answer}</button>`;
      }
      html += "</div>";

      for (const answer of answers) {
        inputOptions.set(answer, answer);
      }
    } else {
      html += `<input type="text" class="threshold-answer">`;
      ////
    }

    const fontLeftToRightBool = paramReader.read("fontLeftToRightBool", BC);
    const result = await Swal.fire({
      title: question,
      // html: html,
      input: choiceQuestionBool ? "radio" : "textarea",
      inputOptions: inputOptions,
      inputAttributes: {
        autocapitalize: "off",
      },
      showCancelButton: false,
      showDenyButton: false,
      showConfirmButton: true,
      allowEnterKey: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        confirmButton: `threshold-button${
          choiceQuestionBool ? " hidden-button" : ""
        }`,
        container: fontLeftToRightBool ? "" : "right-to-left",
        title: fontLeftToRightBool ? "" : "right-to-left",
      },
      // showClass: {
      //   popup: "swal2-show",
      //   backdrop: "swal2-backdrop-show",
      //   icon: "swal2-icon-show",
      // },
      // hideClass: {
      //   popup: "swal2-hide",
      //   backdrop: "swal2-backdrop-hide",
      //   icon: "swal2-icon-hide",
      // },
      showClass: {
        popup: "fade-in",
        backdrop: "swal2-backdrop-show",
        icon: "swal2-icon-show",
      },
      hideClass: {
        popup: "",
        backdrop: "swal2-backdrop-hide",
        icon: "swal2-icon-hide",
      },
      didOpen: () => {
        if (choiceQuestionBool) {
          const _ = setInterval(() => {
            // FUTURE handle skip block more elegently?
            // Check for block skip request during questionAnswer
            if (skipTrialOrBlock.skipBlock) {
              clearInterval(_);
              Swal.close();
              return;
            }

            const radioInputs = document.querySelectorAll(".swal2-radio input");

            for (const e of radioInputs) {
              if (e.checked) {
                clearInterval(_);
                document.getElementsByClassName("swal2-confirm")[0].click();
              }
            }
          }, 200);
        } else {
          // FUTURE handle skip block more elegently?
          // For text input questions, also check for block skip
          const blockSkipChecker = setInterval(() => {
            if (toShowCursor()) {
              clearInterval(blockSkipChecker);
              Swal.close();
              return;
            }
          }, 200);
        }
        const questionAndAnswers = document.querySelector(".swal2-title");
        questionAndAnswers.style.fontFamily = instructionFont.current;
        questionAndAnswers.style.font = instructionFont.current;
        styleNodeAndChildrenRecursively(
          document.querySelector(".swal2-popup"),
          {
            "background-color": colorRGBASnippetToRGBA(
              paramReader.read("screenColorRGBA", status.block_condition),
            ),
            color: colorRGBASnippetToRGBA(
              paramReader.read(
                "instructionFontColorRGBA",
                status.block_condition,
              ),
            ),
          },
        );
      },
      // preConfirm: (value) => {
      //   if (choiceQuestionBool && !value) {
      //     Swal.showValidationMessage("You must select an answer.");
      //     return false;
      //   }
      // },
    });

    if (result && result.value) {
      const answer = result.value;
      if (
        targetTask === "questionAndAnswer" &&
        questionAndAnswerShortcut !== "_identify_"
      ) {
        psychoJS.experiment.addData(questionAndAnswerShortcut + index, answer);
        psychoJS.experiment.addData(
          "questionAndAnswerNickname" + index,
          questionAndAnswerShortcut,
        );
        psychoJS.experiment.addData(
          "questionAndAnswerQuestion" + index,
          question,
        );
        psychoJS.experiment.addData(
          "questionAndAnswerCorrectAnswer" + index,
          correctAnswer,
        );
        psychoJS.experiment.addData(
          "questionAndAnswerResponse" + index,
          answer,
        );
      } else if (
        targetTask === "identify" ||
        questionAndAnswerShortcut === "_identify_"
      ) {
        //TODO: add the answer to the experiment
        correctAns.current = correctAnswer;
        if (answer === correctAnswer) {
          correctSynth.play();
          status.trialCorrect_thisBlock++;
          key_resp_corr = 1;
        } else {
          // wrongSynth.play();
          key_resp_corr = 0;
        }
      }
    }
  }
  return key_resp_corr;
};
