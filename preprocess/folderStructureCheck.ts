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

import { EasyEyesError, INVALID_FOLDER_STRUCTURE } from "./errorMessages";
import JSZip from "jszip";
// import {userRepoFiles} from "../../source/components/constants"
import { getProjectByNameInProjectList } from "../../source/components/gitlabUtils";
import { getUserInfo } from "../../source/components/user";

// import {tempAccessToken} from "../../source/TemporaryLog"
const tempAccessToken = require("../../source/TemporaryLog").tempAccessToken;

export const test = async () => {
  console.log("test");
  // console.log("userRepoFiles", userRepoFiles) //userRepoFiles.requestedFolders
  console.log("tempAccessToken", tempAccessToken);
  const [user, resources] = await getUserInfo(tempAccessToken.t);
  console.log("user", user);
  console.log("resources", resources); //resources.folders
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
  folderAndTargetKindObjectList: Object[]
): Promise<Object[]> => {
  const processed: any = {
    maskers: [],
    targets: [],
  };
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

  const result = await Promise.all(
    folderAndTargetKindObjectList.map(async (object: any) => {
      // if(resources.folders.includes(folder)){}
      if (!processed.maskers.includes(object.maskerSoundFolder)) {
        processed.maskers.push(object.maskerSoundFolder);
        const encodedFilePath = processPath(object.maskerSoundFolder);
        const response = await fetch(
          `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodedFilePath}/?ref=master`,
          requestOptions
        );
      }

      if (!processed.targets.includes(object.targetSoundFolder)) {
        processed.targets.push(object.targetSoundFolder);
        const encodedFilePath = processPath(object.targetSoundFolder);
        const response = await fetch(
          `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodedFilePath}/?ref=master`,
          requestOptions
        );
      }

      //   console.log("response", response)
      // result.push({name:folder,file:response})
      // if(response.status === 200)
      // return {name:folder,file:await response.blob()}
      // else return {name:folder,file:null}
    })
  );
  // return result;
  // return folderStructureCheck(result)
  return [];
};

//folders Object[]:  [{name: "", file: File}, {name: "", file: File}]
export const folderStructureCheck = (
  folders: Object[],
  targetKind: string,
  parameter: string
): Promise<EasyEyesError[]> => {
  if (targetKind === "sound")
    return folderStructureCheckSound(folders, parameter);
  else targetKind === "VocoderPhrase";
  return folderStructureCheckVocoderPhrase(folders, parameter);
};

export const folderStructureCheckSound = async (
  folders: any[],
  parameter: string
): Promise<EasyEyesError[]> => {
  const errors: EasyEyesError[] = [];

  await Promise.all(
    folders.map(async (folder) => {
      let Zip = new JSZip(); // Create a new JSZip instance
      const error = await Zip.loadAsync(folder.file).then(async (zip) => {
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
          return INVALID_FOLDER_STRUCTURE(folder.name, parameter);
        }
      });
      if (error) errors.push(error);
    })
  );
  return errors;
};

export const folderStructureCheckVocoderPhrase = async (
  folders: Object[],
  parameter: string
): Promise<EasyEyesError[]> => {
  const errors: EasyEyesError[] = [];

  return errors;
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
/*
    `${resourceType}/${fileName}`
      );

      const content: string = await getBase64FileDataFromGitLab(
              parseInt(easyEyesResourcesRepo.id),
              resourcesRepoFilePath,
              user.accessToken
            );



export const getBase64FileDataFromGitLab = (
  repoID: number,
  filePath: string,
  accessToken: string
): Promise<string> => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise<string>(async (resolve) => {
    // Create auth header
    const headers: Headers = new Headers();
    headers.append("Authorization", `bearer ${accessToken}`);

    // Create Gitlab API request options
    const requestOptions: any = {
      method: "GET",
      headers: headers,
      redirect: "follow",
    };

    // Convert given filepath to URL-encoded string
    const encodedFilePath = encodeGitlabFilePath(filePath);

    // Make API call to fetch data
    const response = await fetch(
      `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodedFilePath}/?ref=master`,
      requestOptions
    )
      .then((response) => {
        // ? It seems that it also works for text files?
        return response.text();
      })
      .then((result) => {
        return result;
      })
      .catch((error) => {
        return error;
      });

    resolve(JSON.parse(response).content);
  });
};


  
  
  */

/*

 const headers: Headers = new Headers();
    headers.append("Authorization", `bearer ${accessToken}`);

    // Create Gitlab API request options
    const requestOptions: any = {
      method: "GET",
      headers: headers,
      redirect: "follow",
    };

    // Convert given filepath to URL-encoded string
    const encodedFilePath = encodeGitlabFilePath(filePath);

    // Make API call to fetch data
    const response = await fetch(
      `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodedFilePath}/?ref=master`,
      requestOptions
    )

*/
