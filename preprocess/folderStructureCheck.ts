//targetKind: sound
/*
    Example folder structure:

        -{NameOfFolder}.zip
            -{NameOfFile1}.wav
            -{NameOfFile2}.wav
            -{NameOfFile3}.wav
            -{NameOfFile4}.wav
*/
//******************************************************* */

// targetKind: VocoderPhrase

/*
    Example folder structure for targetPhrase - "Ready #CallSign GoTo #Color #Number Now"

        -{NameOfFolder}.zip
            -NameOfFolder
                -Talker1
                    -Callsign
                        -Arrow.hi.wav
                        -Arrow.lo.wav
                        -Baron.hi.wav
                        -Baron.lo.wav
                        -Charlie.hi.wav
                        -Charlie.lo.wav
                    -Color
                        -Blue.hi.wav
                        -Blue.lo.wav
                        -Green.hi.wav
                        -Green.lo.wav
                        -Red.hi.wav
                        -Red.lo.wav
                    -Number
                        -One.hi.wav
                        -One.lo.wav
                        -Two.hi.wav
                        -Two.lo.wav
                    -Ready.hi.wav
                    -Ready.lo.wav
                    -GoTo.hi.wav
                    -GoTo.lo.wav
                    -Now.hi.wav
                    -Now.lo.wav
                -Talker2
                    ......
*/

//********************************************************** */

import JSZip from "jszip";
import Swal from "sweetalert2";

import {
  EasyEyesError,
  IMAGE_FOLDER_INVALID_EXTENSION_FILES,
  IMAGE_FOLDER_INVALID_NUMBER_OF_FILES,
  INVALID_FOLDER_STRUCTURE,
} from "./errorMessages";
import { getProjectByNameInProjectList } from "./gitlabUtils";
import { getUserInfo } from "./user";
import { tempAccessToken } from "./global";
import { validateImpulseResponseFile } from "./experimentFileChecks";
import { GLOSSARY } from "../parameters/glossary";

export const getRequestedFoldersForStructureCheck = async (
  folderAndTargetKindObjectList: any[],
): Promise<{ errors: any[]; files: any[] }> => {
  //just return empty for local examples
  if (!tempAccessToken.t) {
    console.log("tempAccessToken is null", tempAccessToken);
    return { errors: [], files: [] };
  }

  //create a swal to show the user that the folder structure is being checked
  Swal.fire({
    title: "Checking folder structure...",
    allowOutsideClick: false,
    allowEscapeKey: false,
    allowEnterKey: false,
    didOpen: () => {
      // Question: does it do anything here? - PJ
      Swal.showLoading();
    },
  });

  const files: any[] = [];
  const [user, resources] = await getUserInfo(tempAccessToken.t);
  const resolvedProjectList = await user.projectList;
  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    resolvedProjectList,
    "EasyEyesResources",
  );
  const repoID = parseInt(easyEyesResourcesRepo.id);
  // Create auth header
  const headers: Headers = new Headers();
  headers.append("Authorization", `bearer ${tempAccessToken.t}`);

  // Create Gitlab API request options
  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };

  const maskers: any[] = [];
  const targets: any[] = [];
  for (let i = 0; i < folderAndTargetKindObjectList.length; i++) {
    if (folderAndTargetKindObjectList[i].maskerSoundFolder) {
      maskers.push({
        name: folderAndTargetKindObjectList[i].maskerSoundFolder,
        targetKind: folderAndTargetKindObjectList[i].targetKind,
      });
    }

    targets.push({
      name: folderAndTargetKindObjectList[i].targetSoundFolder,
      targetKind: folderAndTargetKindObjectList[i].targetKind,
    });
  }

  //remove duplicates
  const uniqueMaskers = removeDuplicatesFromArrayOFObjects(maskers);
  const uniqueTargets = removeDuplicatesFromArrayOFObjects(targets);

  const maskerFiles = await Promise.all(
    uniqueMaskers.map(async (masker) => {
      const encodedFilePath = processPath(masker.name + ".zip");
      const response = await fetch(
        `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodedFilePath}/?ref=master`,
        requestOptions,
      ).then((response) => response.text());
      const content = JSON.parse(response).content;
      const file: any = {};
      file["name"] = masker;
      file["file"] = content;
      file["targetKind"] = masker.targetKind;
      file["parameter"] = "maskerSoundFolder";
      files.push(file);
    }),
  );

  const targetFiles = await Promise.all(
    uniqueTargets.map(async (target) => {
      const encodedFilePath = processPath(target.name + ".zip");
      const response = await fetch(
        `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodedFilePath}/?ref=master`,
        requestOptions,
      ).then((response) => response.text());
      const content = JSON.parse(response).content;
      const file: any = {};
      file["name"] = target;
      file["file"] = content;
      file["targetKind"] = target.targetKind;
      file["parameter"] = "targetSoundFolder";
      files.push(file);
    }),
  );
  const errors = await folderStructureCheck(files);
  Swal.close();
  return new Promise((resolve, reject) => {
    resolve({ errors, files });
  });
};

export const getImageFiles = async (
  folderNamesObjectList: any[],
): Promise<any[]> => {
  const files: any[] = [];
  //ge the /folders/{folderName}.zip
  if (!tempAccessToken.t) {
    console.log("tempAccessToken is null", tempAccessToken);
    return [];
  }
  const [user, resources] = await getUserInfo(tempAccessToken.t);
  const resolvedProjectList = await user.projectList;
  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    resolvedProjectList,
    "EasyEyesResources",
  );
  const repoID = parseInt(easyEyesResourcesRepo.id);

  const headers: Headers = new Headers();
  headers.append("Authorization", `bearer ${tempAccessToken.t}`);
  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };

  const targetImageFolderList = folderNamesObjectList.map(
    (folder) => folder.targetImageFolder,
  );

  await Promise.all(
    targetImageFolderList.map(async (folder) => {
      const encodedFilePath = encodeGitlabFilePath(`folders/${folder}.zip`);
      const response = await fetch(
        `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodedFilePath}/?ref=master`,
        requestOptions,
      ).then((response) => response.text());
      const content = JSON.parse(response).content;
      const file: any = {};
      file["name"] = folder;
      file["file"] = content;
      files.push(file);
    }),
  );

  const imageFileObjectList = folderNamesObjectList.map((folder) => {
    return {
      targetImageFolder: folder.targetImageFolder,
      targetImageReplacementBool: folder.targetImageReplacementBool,
      file: files.find((file) => file.name === folder.targetImageFolder)?.file,
      conditionTrials: folder.conditionTrials,
      columnLetter: folder.columnLetter,
    };
  });

  return imageFileObjectList;
};

export const getTargetSoundListFiles = async (targetSoundListFiles: any[]) => {
  const files: any[] = [];
  if (!tempAccessToken.t) {
    console.log("tempAccessToken is null", tempAccessToken);
    return [];
  }
  const [user, resources] = await getUserInfo(tempAccessToken.t);
  const resolvedProjectList = await user.projectList;
  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    resolvedProjectList,
    "EasyEyesResources",
  );
  const repoID = parseInt(easyEyesResourcesRepo.id);
  const headers: Headers = new Headers();
  headers.append("Authorization", `bearer ${tempAccessToken.t}`);
  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };
  const uniqueTargetSoundListFiles =
    removeDuplicatesFromArrayOFObjects(targetSoundListFiles);
  await Promise.all(
    uniqueTargetSoundListFiles.map(async (targetSoundListFile) => {
      const encodedFilePath = encodeGitlabFilePath(
        `targetSoundLists/${targetSoundListFile}`,
      );
      const response = await fetch(
        `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodedFilePath}/?ref=master`,
        requestOptions,
      ).then((response) => response.text());
      const content = JSON.parse(response).content;
      const file: any = {};
      file["name"] = targetSoundListFile;
      file["file"] = content;
      files.push(file);
    }),
  );
  return files;
};

export const doesFileNameContainIgnoreDirectory = (
  filename: string,
  ignoreDirectories: string[],
) => {
  for (const ignoreDirectory of ignoreDirectories) {
    if (filename.includes(ignoreDirectory)) {
      return true;
    }
  }
  return false;
};

export const folderStructureCheckImage = async (imageFileObjectList: any[]) => {
  const errors: EasyEyesError[] = [];

  // checks:
  // 1, does the folder have any files with the accepted image extensions?
  // 2, are there enough files (with the accepted image extensions) for the number of trials.
  //     if replacement is false, then the number of files should be greater than or equal to the number of trials.

  for (let i = 0; i < imageFileObjectList.length; i++) {
    const imageFileObject = imageFileObjectList[i];
    const imageFolder = imageFileObject.targetImageFolder;
    const imageReplacementBool = imageFileObject.targetImageReplacementBool;
    const conditionTrials = imageFileObject.conditionTrials;
    const file = imageFileObject.file;

    const ignoreDirectories = ["__MACOSX"];
    const Zip = new JSZip();
    await Zip.loadAsync(file, { base64: true }).then(async (zip) => {
      const files = Object.keys(zip.files);
      const imageFiles = files.filter((file) => {
        const isFileExtensionCorrect =
          file.endsWith(".png") || file.endsWith(".jpg");
        const isDirectory = zip.files[file].dir;
        const isIgnoreDirectory = doesFileNameContainIgnoreDirectory(
          file,
          ignoreDirectories,
        );
        return isFileExtensionCorrect && !isDirectory && !isIgnoreDirectory;
      });
      if (imageFiles.length === 0) {
        errors.push(
          IMAGE_FOLDER_INVALID_EXTENSION_FILES(
            "targetImageFolder",
            imageFolder,
            imageFileObject.columnLetter,
          ),
        );
      }

      const defaultImageReplacementBool =
        GLOSSARY["targetImageReplacementBool"].default;
      const targetImageReplacementBool =
        imageReplacementBool === undefined || imageReplacementBool === ""
          ? defaultImageReplacementBool
          : imageReplacementBool;
      if (targetImageReplacementBool === "FALSE") {
        if (imageFiles.length < conditionTrials) {
          errors.push(
            IMAGE_FOLDER_INVALID_NUMBER_OF_FILES(
              "targetImageFolder",
              imageFolder,
              conditionTrials,
              imageFileObject.columnLetter,
            ),
          );
        }
      }
    });
  }

  return errors;
};

export const getImpulseResponseFiles = async (
  fileNames: string[],
): Promise<any[]> => {
  if (!tempAccessToken.t) {
    console.log("tempAccessToken is null", tempAccessToken);
    return [];
  }

  // const files: any[] = [];

  const [user, resources] = await getUserInfo(tempAccessToken.t);
  const resolvedProjectList = await user.projectList;
  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    resolvedProjectList,
    "EasyEyesResources",
  );
  const repoID = parseInt(easyEyesResourcesRepo.id);
  // Create auth header
  const headers: Headers = new Headers();
  headers.append("Authorization", `bearer ${tempAccessToken.t}`);

  // Create Gitlab API request options
  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };

  const files: any[] = [];

  await Promise.all(
    fileNames.map(async (fileName) => {
      const encodedFilePath = encodeGitlabFilePath(
        "impulseResponses/" + fileName,
      );
      await fetch(
        `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodedFilePath}/?ref=master`,
        requestOptions,
      )
        .then((response) => response.text())
        .then((content) => {
          files.push({
            name: fileName,
            file: JSON.parse(content).content,
          });
        })
        .catch((error) => {
          console.error("Error fetching file", fileName, error);
        });
    }),
  );
  return files;
};

/**
 * Retrieves frequency response files from userRepoFiles
 * @param requestedFiles List of requested frequency response file names
 * @returns Array of frequency response file objects
 */
export const getFrequencyResponseFiles = async (
  fileNames: string[],
): Promise<any[]> => {
  if (!tempAccessToken.t) {
    console.log("tempAccessToken is null", tempAccessToken);
    return [];
  }

  const [user, resources] = await getUserInfo(tempAccessToken.t);
  const resolvedProjectList = await user.projectList;
  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    resolvedProjectList,
    "EasyEyesResources",
  );
  const repoID = parseInt(easyEyesResourcesRepo.id);
  // Create auth header
  const headers: Headers = new Headers();
  headers.append("Authorization", `bearer ${tempAccessToken.t}`);

  // Create Gitlab API request options
  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };

  const files: any[] = [];

  await Promise.all(
    fileNames.map(async (fileName) => {
      const encodedFilePath = encodeGitlabFilePath(
        "frequencyResponses/" + fileName,
      );
      await fetch(
        `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodedFilePath}/?ref=master`,
        requestOptions,
      )
        .then((response) => response.text())
        .then((content) => {
          files.push({
            name: fileName,
            file: JSON.parse(content).content,
          });
        })
        .catch((error) => {
          console.error("Error fetching file", fileName, error);
        });
    }),
  );
  return files;
};

//folders Object[]:  [{name: "", file: File}, {name: "", file: File}]
export const folderStructureCheck = async (
  folders: Object[],
): Promise<EasyEyesError[]> => {
  const errors: any[] = [];

  await Promise.all(
    folders.map(async (folder: any) => {
      if (folder.targetKind === "sound") {
        const error = await folderStructureCheckSound(folder);
        if (error) errors.push(error);
      } else if (folder.targetKind === "VocoderPhrase") {
        const error = await folderStructureCheckVocoderPhrase(folder);
        if (error) errors.push(error);
      }
    }),
  );

  return Promise.resolve(errors);
};

export const folderStructureCheckSound = async (folder: any): Promise<any> => {
  // const errors: EasyEyesError[] = [];

  // await Promise.all(
  // folders.map(async (folder) => {
  let Zip = new JSZip(); // Create a new JSZip instance
  const error = await Zip.loadAsync(folder.file, { base64: true }).then(
    async (zip) => {
      if (
        !Object.keys(zip.files).some((fileName) => {
          const isfileLocationCorrect = fileName.split("/").length === 1;
          const isFileExtensionCorrect = verifyFileNameExtension(fileName);
          const isDirectory = zip.files[fileName].dir;
          return (
            isfileLocationCorrect && isFileExtensionCorrect && !isDirectory
          );
        })
      ) {
        return INVALID_FOLDER_STRUCTURE(folder.name.name, folder.parameter);
      }
      return null;
    },
  );
  // if (error) errors.push(error);
  // })
  // );
  return Promise.resolve(error);
};

export const folderStructureCheckVocoderPhrase = async (
  folder: any,
): Promise<EasyEyesError[]> => {
  const errors: EasyEyesError[] = [];

  return Promise.resolve(errors);
};

export const verifyFileNameExtension = (name: string) => {
  const nameSplited = name.split(".");
  const ext = nameSplited[nameSplited.length - 1];
  if (acceptableExtensions.includes(ext)) return true;
  return false;
};

const acceptableExtensions = ["wav", "aac"];

export const encodeGitlabFilePath = (filePath: string): string => {
  let res = "";
  for (let i = 0; i < filePath.length; i++) {
    let c = filePath[i];
    if (c == "/") c = "%2F";
    else if (c == ".") c = "%2E";
    res = res + c;
  }

  return res;
};

const processPath = (path: string): string => {
  return encodeGitlabFilePath(`folders/${path}`);
};

function base64ToBuffer(str: any) {
  str = window.atob(str); // creates a ASCII string
  var buffer = new ArrayBuffer(str.length),
    view = new Uint8Array(buffer);
  for (var i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i);
  }
  return buffer;
}

const removeDuplicatesFromArrayOFObjects = (array: any[]) => {
  return array.filter((value, index) => {
    const _value = JSON.stringify(value);
    return (
      index ===
      array.findIndex((obj) => {
        return JSON.stringify(obj) === _value;
      })
    );
  });
};
