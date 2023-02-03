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

// import {userRepoFiles} from "../../source/components/constants"
import { EasyEyesError, INVALID_FOLDER_STRUCTURE } from "./errorMessages";
import { getProjectByNameInProjectList } from "../../source/components/gitlabUtils";
import { getUserInfo } from "../../source/components/user";

// import {tempAccessToken} from "../../source/TemporaryLog"
// const tempAccessToken = require("../../source/components/global").tempAccessToken;
// es6 import tempAccessToken from "../../source/components/global"
import { tempAccessToken } from "../../source/components/global";

export const test = async () => {
  console.log("test");
  // console.log("userRepoFiles", userRepoFiles) //userRepoFiles.requestedFolders
  console.log("tempAccessToken", tempAccessToken);
  if (!tempAccessToken.t) return;
  const [user, resources, prolificToken] = await getUserInfo(tempAccessToken.t);
  console.log("user", user);
  console.log("resources", resources); // resources.folders
  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    user.projectList,
    "EasyEyesResources"
  );
  const encodedFilePath = encodeGitlabFilePath(`folders/Sines.zip`);
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
  const response = await fetch(
    `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodedFilePath}/?ref=master`,
    requestOptions
  );
  console.log("response", response);
};

export const getRequestedFoldersForStructureCheck = async (
  folderAndTargetKindObjectList: any[]
): Promise<any[]> => {
  //just return empty for local examples
  if (!tempAccessToken.t) {
    console.log("tempAccessToken is null", tempAccessToken);
    return [];
  }

  //create a swal to show the user that the folder structure is being checked
  Swal.fire({
    title: "Checking folder structure...",
    allowOutsideClick: false,
    allowEscapeKey: false,
    allowEnterKey: false,
    didOpen: () => {
      // Question: does it do anything here? - PJ
      Swal.showLoading(null);
    },
  });

  const files: any[] = [];
  const [user, resources] = await getUserInfo(tempAccessToken.t);
  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    user.projectList,
    "EasyEyesResources"
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

  // console.log("userRepoFiles", userRepoFiles) //userRepoFiles.requestedFolders
  // console.log("folderAndTargetKindObjectList", folderAndTargetKindObjectList);
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
        requestOptions
      ).then((response) => response.text());
      const content = JSON.parse(response).content;
      const file: any = {};
      file["name"] = masker;
      file["file"] = content;
      file["targetKind"] = masker.targetKind;
      file["parameter"] = "maskerSoundFolder";
      files.push(file);
    })
  );

  const targetFiles = await Promise.all(
    uniqueTargets.map(async (target) => {
      // console.log("target", target);
      const encodedFilePath = processPath(target.name + ".zip");
      const response = await fetch(
        `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodedFilePath}/?ref=master`,
        requestOptions
      ).then((response) => response.text());
      const content = JSON.parse(response).content;
      const file: any = {};
      file["name"] = target;
      file["file"] = content;
      file["targetKind"] = target.targetKind;
      file["parameter"] = "targetSoundFolder";
      files.push(file);
    })
  );
  // console.log("files", files);
  const errors = await folderStructureCheck(files);
  // console.log("errors", errors);
  Swal.close();
  return new Promise((resolve, reject) => {
    resolve(errors);
  });
  //   folderAndTargetKindObjectList.map(async (object: any) => {
  //     // if(resources.folders.includes(folder)){}
  //     let response;
  //     let trial: any = {};
  //     let content;

  //     if (!processed.maskers.includes(object.maskerSoundFolder)) {
  //       // console.log("processed.maskers", processed.maskers);
  //       // console.log("object.maskerSoundFolder", object.maskerSoundFolder);
  //       const encodedFilePath = processPath(object.maskerSoundFolder+".zip");
  //        response = await fetch(
  //         `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodedFilePath}/?ref=master`,
  //         requestOptions
  //       ).then(response=>response.text());
  //       content = JSON.parse(response).content;
  //       processed.maskers.push(object.maskerSoundFolder);
  //       trial["name"] = object.maskerSoundFolder;
  //       trial["file"] =content;
  //       trial["targetKind"] = object.targetKind;
  //       trial["parameter"] = "maskerSoundFolder";
  //       files.push(trial);
  //     }

  //     if (!processed.targets.includes(object.targetSoundFolder)) {
  //       // console.log("processed.targets", processed.targets);
  //       // console.log("object.targetSoundFolder", object.targetSoundFolder);
  //       const encodedFilePath = processPath(object.targetSoundFolder +".zip");
  //       response = await fetch(
  //         `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodedFilePath}/?ref=master`,
  //         requestOptions
  //       ).then(response=>response.text());
  //       content = JSON.parse(response).content;
  //       processed.targets.push(object.targetSoundFolder);
  //       trial["name"] = object.targetSoundFolder;
  //       trial["file"] =content;
  //       trial["targetKind"] = object.targetKind;
  //       trial["parameter"] = "targetSoundFolder";
  //       files.push(trial);
  //     }

  //     //   console.log("response", response)
  //     // result.push({name:folder,file:response})
  //     // if(response.status === 200)

  //     // console.log("decodedContent", content);
  //     // let Zip = new JSZip();
  //     // let zipFile = await Zip.loadAsync(content, { base64: true });
  //     // let files = Object.keys(zipFile.files);
  //     // console.log("files", files)
  //     // else return {name:folder,file:null}
  //   })
  // );
  // console.log("files", files);
  // console.log("errors",await folderStructureCheck(files));
  // return result;
  // return folderStructureCheck(result)
  // folderStructureCheck(trial);
};

//folders Object[]:  [{name: "", file: File}, {name: "", file: File}]
export const folderStructureCheck = async (
  folders: Object[]
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
    })
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
    }
  );
  // if (error) errors.push(error);
  // })
  // );
  return Promise.resolve(error);
};

export const folderStructureCheckVocoderPhrase = async (
  folder: any
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
