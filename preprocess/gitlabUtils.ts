/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Buffer } from "buffer";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";
import Papa from "papaparse";
import { DataFrame } from "dataframe-js";
import * as XLSX from "xlsx";

import {
  acceptableExtensions,
  acceptableResourcesExtensionsOfTextDataType,
  resourcesFileTypes,
  resourcesRepoName,
  ThresholdRepoFiles,
  userRepoFiles,
} from "./constants";
import { _loadDir, _loadFiles } from "./files";
import {
  assetUsesBase64,
  encodeGitlabFilePath,
  getAssetFileContent,
  getAssetFileContentBase64,
  getBase64Data,
  getBase64FileDataFromGitLab,
  getFileExtension,
  getFileTextData,
  getTextFileDataFromGitLab,
  readXLSXFile,
} from "./fileUtils";
import { getDateAndTimeString } from "./utils";
import { compatibilityRequirements } from "./global";
import { durations } from "./getDuration";
import {
  convertLanguageToLanguageCode,
  getCompatibilityRequirements,
} from "../components/compatibilityCheck";
import { isExpTableFile } from "../preprocess/utils";

export class User {
  public username = "";
  public name = "";
  public id = "";
  public avatar_url = "";

  public projectList: any[] = [];

  public currentExperiment = {
    participantRecruitmentServiceName: "",
    participantRecruitmentServiceUrl: "",
    participantRecruitmentServiceCode: "",
    experimentUrl: "",
    pavloviaOfferPilotingOptionBool: false, // ?
    pavloviaPreferRunningModeBool: true, // ?
    /* -------------------------------------------------------------------------- */
    prolificWorkspaceModeBool: false,
    prolificWorkspaceProjectId: "",
  };

  constructor(public accessToken: string) {
    this.accessToken = accessToken;
  }

  async initUserDetails(): Promise<void> {
    const response = await fetch(
      `https://gitlab.pavlovia.org/api/v4/user?access_token=${this.accessToken}`,
    );
    const responseBody = await response.json();

    this.username = responseBody.username;
    this.name = responseBody.name;
    this.id = responseBody.id;
    this.avatar_url = responseBody.avatar_url;
  }

  async initProjectList(): Promise<void> {
    this.projectList = await getAllProjects(this);
  }
}

export const copyUser = (user: User): User => {
  const newUser = new User(user.accessToken);
  newUser.username = user.username;
  newUser.name = user.name;
  newUser.id = user.id;
  newUser.avatar_url = user.avatar_url;
  newUser.projectList = JSON.parse(JSON.stringify(user.projectList));
  newUser.currentExperiment = JSON.parse(
    JSON.stringify(user.currentExperiment),
  );
  return newUser;
};

export interface ICommitAction {
  action: "create" | "delete" | "move" | "update" | "chmod";
  file_path: string;
  content: string;
  previous_path?: string;
  encoding?: "text" | "base64";
  last_commit_id?: string;
  execute_filemode?: boolean;
}

/* -------------------------------------------------------------------------- */

/**
 * @param user queried users
 * @returns returns list of all gitlab projects created by user
 */
export const getAllProjects = async (user: User) => {
  const projectList: any[] = [];

  // get first page separately to fetch page count
  // console.log(`fetching projects page 1`);
  const firstResponse = await fetch(
    `https://gitlab.pavlovia.org/api/v4/users/${user.id}/projects?access_token=${user.accessToken}&per_page=100`,
  );
  const firstResponseData = await firstResponse.json();
  projectList.push(...firstResponseData);

  // check if header is present
  const pageCountHeader = await firstResponse.headers.get("x-total-pages");
  if (!pageCountHeader) {
    throw new Error(
      "x-total-pages header is missing. Gitlab API probably updated.",
    );
  }

  // get remaining pages
  const pageCount = parseInt(pageCountHeader);

  const pageList: Promise<any>[] = [];
  for (let curPage = 2; curPage <= pageCount; curPage++) {
    // console.log(`fetching projects page ${curPage}`);
    const paginationResponse = fetch(
      `https://gitlab.pavlovia.org/api/v4/users/${user.id}/projects?access_token=${user.accessToken}&page=${curPage}&per_page=100`,
    );
    pageList.push(paginationResponse);
  }

  const paginationResponseList = await Promise.all(pageList);
  for (let idx = 0; idx < paginationResponseList.length; idx++) {
    const ithResponseData = await paginationResponseList[idx].json();
    projectList.push(...ithResponseData);
  }

  return projectList;
};

/**
 * @param projectList list of projects returned by gitlab API
 * @param keyProjectName project name to search for
 * @returns project with given project name
 */
export const getProjectByNameInProjectList = (
  projectList: any[],
  keyProjectName: string,
): any => {
  return projectList.find((i: any) => i.name === keyProjectName);
};

/**
 * @param projectList list of projects returned by gitlab API
 * @param keyProjectName project name to search for
 * @returns true if keyProjectName exists in given project list
 */
export const isProjectNameExistInProjectList = (
  projectList: any[],
  keyProjectName: string,
): boolean => {
  return projectList
    .map((i: any) => {
      return i ? i.name : "null";
    })
    .includes(keyProjectName);
};

/* -------------------------------------------------------------------------- */

/**
 * creates a new project with given project name on Gitlab
 * @param repoName new project or repository name
 * @param gitlabUser project will be created on behalf of this userFont
 * @returns API response
 */
export const createEmptyRepo = async (
  repoName: string,
  user: User,
): Promise<any> => {
  const newRepo = await fetch(
    "https://gitlab.pavlovia.org/api/v4/projects?name=" +
      repoName +
      "&access_token=" +
      user.accessToken,
    {
      method: "POST",
    },
  )
    .then((response) => {
      return response.json();
    })
    .catch((error) => {
      console.error(error);
      // TODO switch to Swal interface
      alert("[ERROR] Failed to creat a new repo.");
    });

  return await newRepo;
};

export const setRepoName = async (
  user: User,
  name: string,
): Promise<string> => {
  // if (!isProjectNameExistInProjectList(user.projectList, name)) return name;
  name = complianceProjectName(name);
  const upToDateProjectList = await getAllProjects(user);

  for (let i = 1; i < 9999999; i++)
    // if (!isProjectNameExistInProjectList(user.projectList, `${name}${i}`))
    if (!isProjectNameExistInProjectList(upToDateProjectList, `${name}${i}`))
      return `${name}${i}`;
  return `${name}${Date.now()}`;
};

const complianceProjectName = (name: string): string => {
  return name.replace(/[^\w\s']|_/g, "").replace(/ /g, "-");
};

/* -------------------------------------------------------------------------- */

export interface Repository {
  id: string;
}

/**
 * @param user queried user
 * @returns names of resource files in common "EasyEyesResources" repository (fonts and forms)
 */
export const getCommonResourcesNames = async (
  user: User,
): Promise<{ [key: string]: string[] }> => {
  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    user.projectList,
    resourcesRepoName,
  );

  // init api options
  const headers = new Headers();
  headers.append("Authorization", `bearer ${user.accessToken}`);

  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };

  const resourcesNameByType: any = {};

  for (const type of resourcesFileTypes) {
    const prevFontListResponse: any = await fetch(
      `https://gitlab.pavlovia.org/api/v4/projects/${easyEyesResourcesRepo.id}/repository/tree/?path=${type}&per_page=100`,
      requestOptions,
    )
      .then((response) => {
        return response.text();
      })
      .then((result) => {
        return result;
      })
      .catch((error) => {
        const skipError = (err: any) => {
          return err;
        };
        skipError(error);
      });
    const typeList = !prevFontListResponse.includes(`404 Tree Not Found`)
      ? JSON.parse(prevFontListResponse)
      : new Array<string>();
    resourcesNameByType[type] = new Array<string>();
    for (const t of typeList) resourcesNameByType[type].push(t.name);
  }

  return resourcesNameByType;
};

export const downloadCommonResources = async (
  user: User,
  projectRepoId: string,
  experimentFileName: string,
): Promise<void> => {
  const originalFileName = await getOriginalFileNameForProject(
    user,
    experimentFileName,
  );

  const zip = new JSZip();

  await Swal.fire({
    title: `Exporting experiment details`,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: async () => {
      Swal.showLoading();

      if (!originalFileName) {
        Swal.close();
        Swal.fire({
          icon: "error",
          title: `No data`,
          text: `The experiment file is not stored in pavlovia.`,
          confirmButtonColor: "#666",
        });
        return;
      }

      if (originalFileName.includes(".csv")) {
        const csvContent: string = await getBase64FileDataFromGitLab(
          parseInt(projectRepoId),
          originalFileName,
          user.accessToken,
        );
        zip.file(originalFileName, csvContent, { base64: true });
      }

      if (originalFileName.includes(".xlsx")) {
        const xlsxContent = await getTextFileDataFromGitLab(
          parseInt(projectRepoId),
          originalFileName,
          user.accessToken,
        );
        const sheetData = JSON.parse(xlsxContent);
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        const blob = XLSX.write(
          { Sheets: { Sheet1: worksheet }, SheetNames: ["Sheet1"] },
          { bookType: "xlsx", type: "base64" },
        );
        zip.file(originalFileName, blob, { base64: true });
      }

      for (const type of resourcesFileTypes) {
        const headers: Headers = new Headers();
        headers.append("Authorization", `bearer ${user.accessToken}`);
        const requestOptions: any = {
          method: "GET",
          headers: headers,
          redirect: "follow",
        };

        const encodedFolderPath = encodeURIComponent(`${type}/`);
        const url = `https://gitlab.pavlovia.org/api/v4/projects/${parseInt(
          projectRepoId,
        )}/repository/tree/?path=${encodedFolderPath}&ref=master`;
        const response = await fetch(url, requestOptions);
        const files = await response.json();

        for (const file of files) {
          const fileName = file?.name;
          if (!fileName) {
            continue;
          }

          const resourcesRepoFilePath = encodeGitlabFilePath(
            `${type}/${fileName}`,
          );
          const content: string =
            type === "texts"
              ? await getTextFileDataFromGitLab(
                  parseInt(projectRepoId),
                  resourcesRepoFilePath,
                  user.accessToken,
                )
              : await getBase64FileDataFromGitLab(
                  parseInt(projectRepoId),
                  resourcesRepoFilePath,
                  user.accessToken,
                );

          if (
            content?.trim().indexOf(`{"message":"404 File Not Found"}`) !== -1
          )
            continue;
          zip.file(fileName, content, { base64: type !== "texts" });
        }
      }

      zip.generateAsync({ type: "blob" }).then((zipBlob) => {
        saveAs(zipBlob, `${experimentFileName}.export.zip`);
        Swal.close();
      });
    },
  });
};

export const getProlificToken = async (user: User): Promise<string> => {
  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    user.projectList,
    resourcesRepoName,
  );

  // init api options
  const headers = new Headers();
  headers.append("Authorization", `bearer ${user.accessToken}`);

  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };

  const response =
    (await fetch(
      `https://gitlab.pavlovia.org/api/v4/projects/${easyEyesResourcesRepo.id}/repository/files/PROLIFIC_TOKEN/raw?ref=master`,
      requestOptions,
    )
      .then((response) => {
        return response.text();
      })
      .catch((error) => {
        console.error(error);
      })) || "";

  if (response.includes("404 File Not Found")) return "";
  else return response;
};

export const getCompatibilityRequirementsForProject = async (
  user: User,
  repoName: string,
): Promise<string> => {
  const repo = getProjectByNameInProjectList(user.projectList, repoName);

  const headers = new Headers();
  headers.append("Authorization", `bearer ${user.accessToken}`);

  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };
  const response = await fetch(
    "https://gitlab.pavlovia.org/api/v4/projects/" +
      repo.id +
      "/repository/files/CompatibilityRequirements.txt/raw?ref=master",
    requestOptions,
  )
    .then((response) => {
      if (!response?.ok) return "";
      return response.json();
    })
    .then((result) => {
      if (result !== "") {
        if (!result.language) return "";
        compatibilityRequirements.previousParsedInfo = result;
        compatibilityRequirements.previousL = convertLanguageToLanguageCode(
          result.language,
        );
        const text = getCompatibilityRequirements(
          null,
          compatibilityRequirements.previousL,
          true,
          null,
          compatibilityRequirements.previousParsedInfo,
        ).compatibilityRequirements[0];
        return text;
      }
      return "";
    })
    .catch((error) => {
      console.log(error);
      return "";
    });

  return response;
};

export const getDurationForProject = async (
  user: User,
  repoName: string,
): Promise<string | number> => {
  const repo = getProjectByNameInProjectList(user.projectList, repoName);

  const headers = new Headers();
  headers.append("Authorization", `bearer ${user.accessToken}`);

  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };
  const response = await fetch(
    "https://gitlab.pavlovia.org/api/v4/projects/" +
      repo.id +
      "/repository/files/Duration.txt/raw?ref=master",
    requestOptions,
  )
    .then((response) => {
      if (!response?.ok) return "";
      return response.json();
    })
    .then((result) => {
      if (typeof result == "number") {
        // console.log("duration in secs: ", result);
        const durationInMin = Math.round(result / 60);
        if (durationInMin >= 1) {
          return durationInMin;
        } else {
          return "less than 1";
        }
      } else if (result != "") {
        const durationInMin = Math.round(result.currentDuration / 60);
        let durationline =
          "EasyEyes=" +
          durationInMin +
          ", " +
          "_online2Minutes=" +
          result._online2Minutes;
        return durationline;
      }
      return "";
    })
    .catch((error) => {
      console.log(error);
      return "";
    });
  return response;
};

export const getOriginalFileNameForProject = async (
  user: User,
  repoName: string,
): Promise<string> => {
  const repo = getProjectByNameInProjectList(user.projectList, repoName);

  const headers = new Headers();
  headers.append("Authorization", `bearer ${user.accessToken}`);

  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };

  const response =
    (await fetch(
      `https://gitlab.pavlovia.org/api/v4/projects/${repo.id}/repository/tree/?path=%2E&per_page=100`,
      requestOptions,
    )
      .then((response) => {
        return response.text();
      })
      .catch((error) => {
        console.error(error);
      })) || "[]";

  const fileList = JSON.parse(response);
  const originalFile = fileList.find(
    (i: any) =>
      (i.name.includes(".csv") || i.name.includes(".xlsx")) &&
      i.name !== "recruitmentServiceConfig.csv",
  );

  return originalFile?.name;
};

interface RecruitmentServiceInformation {
  recruitmentServiceName: string | null;
  recruitmentServiceCompletionCode: string | null;
  recruitmentServiceURL: string | null;
  recruitmentProlificWorkspace: boolean | null;
}

export const getPastProlificIdFromExperimentTables = async (
  user: User,
  repoName: string,
  fileName: string,
): Promise<any> => {
  const repo = getProjectByNameInProjectList(user.projectList, repoName);

  if (!repo) {
    return null;
  }

  const headers = new Headers();
  headers.append("Authorization", `bearer ${user.accessToken}`);

  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };

  const response = await fetch(
    `https://gitlab.pavlovia.org/api/v4/projects/${repo.id}/repository/files/${fileName}?ref=master`,
    requestOptions,
  )
    .then((response) => {
      return response.body;
    })
    .then((stream) => {
      return new Response(stream, { headers: { "Content-Type": "text/csv" } });
    })
    .then((response) => {
      return response.text();
    })
    .catch((error) => {
      console.error(error);
    });

  if (!response) return null;

  const result = JSON.parse(response);
  const fields = Buffer.from(result.content, "base64").toString().split("\n");
  let prolificProjectId = "";
  for (const field of fields) {
    const fieldDetail = field.split(",");
    if (
      fieldDetail[0] === "_online2ProlificProjectID" ||
      fieldDetail[0] === "_prolific1ProjectID"
    ) {
      prolificProjectId = fieldDetail[1];
    }
  }
  return prolificProjectId;
};

export const getRecruitmentServiceConfig = async (
  user: User,
  repoName: string,
): Promise<any> => {
  const repo = getProjectByNameInProjectList(user.projectList, repoName);

  const headers = new Headers();
  headers.append("Authorization", `bearer ${user.accessToken}`);

  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };

  const response = await fetch(
    `https://gitlab.pavlovia.org/api/v4/projects/${repo.id}/repository/files/recruitmentServiceConfig%2Ecsv?ref=master`,
    requestOptions,
  )
    .then((response) => {
      return response.body;
    })
    .then((body) => {
      const reader = body?.getReader();
      return new ReadableStream({
        start(controller) {
          return pump();
          function pump(): any {
            return reader?.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              return pump();
            });
          }
        },
      });
    })
    .then((stream) => {
      return new Response(stream, { headers: { "Content-Type": "text/csv" } });
    })
    .then((response) => {
      return response.text();
    })
    .catch((error) => {
      console.error(error);
    });

  if (!response) return null;

  const result = JSON.parse(response);
  const fields = Buffer.from(result.content, "base64").toString().split("\n");

  const serviceInformation: RecruitmentServiceInformation = {
    recruitmentServiceName: null,
    recruitmentServiceCompletionCode: null,
    recruitmentServiceURL: null,
    recruitmentProlificWorkspace: true, // ! dangerously set to true by default
  };

  if (fields.length === 1) return serviceInformation;

  for (const field of fields) {
    const fieldDetail = field.split(",");
    switch (fieldDetail[0]) {
      case "name":
        serviceInformation.recruitmentServiceName = fieldDetail[1];
        break;
      case "code":
        serviceInformation.recruitmentServiceCompletionCode = fieldDetail[1];
        break;
      case "url":
        serviceInformation.recruitmentServiceURL = fieldDetail[1];
        break;
      case "prolificWorkspace":
        serviceInformation.recruitmentProlificWorkspace = JSON.parse(
          fieldDetail[1],
        ) as boolean;
        break;
      default:
        break;
    }
  }

  return serviceInformation;
};

/**
 * Download data folder as a ZIP file from GitLab repository
 */
export const downloadDataFolder = async (user: User, project: any) => {
  const headers = new Headers();
  headers.append("Authorization", `bearer ${user.accessToken}`);
  const perPage = 100;
  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };

  await Swal.fire({
    title: `Downloading data from ${project.name}`,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: async () => {
      Swal.showLoading();

      let currentPage = 1;
      let allData: any[] = [];
      let zipFileDate;

      while (true) {
        const apiUrl = `https://gitlab.pavlovia.org/api/v4/projects/${project.id}/repository/tree/?path=data&per_page=${perPage}&page=${currentPage}`;

        const dataFolder = await fetch(apiUrl, requestOptions)
          .then((response) => response.json())
          .then((result) => result)
          .catch((error) => {
            console.error("Error fetching data:", error);
            return null;
          });

        if (!dataFolder || dataFolder.length === 0) {
          break;
        }

        allData = allData.concat(dataFolder);
        currentPage += 1;
      }

      if (allData.length === 0) {
        Swal.close();
        Swal.fire({
          icon: "error",
          title: `No data found for ${project.name}.`,
          text: `We can't find any data for the experiment. This might be due to an error, or the Pavlovia server is down. Please refresh the page or try again later.`,
          confirmButtonColor: "#666",
        });
        return;
      }

      const zip = new JSZip();
      let currentIndex = 0;

      for (const file of allData) {
        const fileName = file.name;
        const fileNameDateArray = fileName.split("_").slice(-2);
        const date =
          fileNameDateArray?.[0] +
          " " +
          fileNameDateArray?.[1]?.split(".")?.[0]?.replace("h", ":");
        if (!zipFileDate) {
          zipFileDate = new Date(date);
        } else if (new Date(date) > zipFileDate) {
          zipFileDate = new Date(date);
        }

        const fileContent = await fetch(
          `https://gitlab.pavlovia.org/api/v4/projects/${project.id}/repository/blobs/${file.id}`,
          requestOptions,
        )
          .then((response) => response.json())
          .then((result) => Buffer.from(result.content, "base64"));

        zip.file(fileName, fileContent);
        currentIndex += 1;
        if (Swal.isVisible()) {
          Swal.hideLoading();
          const progressValue = (currentIndex / allData.length) * 100;
          Swal.update({
            html: `<p>Downloading <span id="file-counter">${currentIndex}/${allData.length} files</span></p>
                     <progress id="progress-bar" max="100" value="${progressValue}"></progress>`,
          });
        } else {
          break;
        }
      }

      zipFileDate = zipFileDate
        ? getDateAndTimeString(zipFileDate)
        : getDateAndTimeString(new Date());
      const zipFileName = `${project.name}_${zipFileDate}.zip`;

      zip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, zipFileName);
        Swal.close();
      });
    },
  });
};

const preprocessDataframe = (df: any) => {
  if (!df.listColumns().includes("error")) {
    df = df.withColumn("error", () => "");
  }
  if (
    df.listColumns().includes("screenHeightPx") &&
    df.listColumns().includes("screenWidthPx") &&
    df.select("screenWidthPx").toArray()[0][0].toString() != ""
  ) {
    const resolution =
      df.select("screenWidthPx").toArray()[0][0].toString() +
      "x" +
      df.select("screenHeightPx").toArray()[0][0].toString();
    df = df.withColumn("resolution", () => resolution);
  } else if (df.listColumns().includes("psychojsWindowDimensions")) {
    df = df.withColumn("resolution", (row: any) =>
      row.get("psychojsWindowDimensions"),
    );
  } else {
    df.withColumn("resolution", () => "NaN x NaN");
  }
  const error = df.filter((row: any) => row.get("error") !== "");
  if (error.count() > 0) {
    console.log("found error");
    return error;
  }
  return df.head(1);
};
// read experiment data folder and return a list of dataframes
export const getExperimentDataFrames = async (user: User, project: any) => {
  const headers = new Headers();
  headers.append("Authorization", `bearer ${user.accessToken}`);
  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };

  const dataFolder = await fetch(
    `https://gitlab.pavlovia.org/api/v4/projects/${project.id}/repository/tree/?path=data&per_page=500&recursive=false`,
    requestOptions,
  )
    .then((response) => {
      return response.json();
    })
    .then((result) => {
      return result;
    });

  const dataframes = [];

  for (const file of dataFolder) {
    const fileName = file.name;
    if (fileName.includes(".csv")) {
      const fileContent = await fetch(
        `https://gitlab.pavlovia.org/api/v4/projects/${project.id}/repository/blobs/${file.id}`,
        requestOptions,
      )
        .then((response) => {
          return response.json();
        })
        .then((result) => {
          return Buffer.from(result.content, "base64");
        });
      const parsed = Papa.parse(fileContent.toString());
      const data = parsed.data.slice(1); // Rows
      const columns = parsed.data[0]; // Header
      let df = new DataFrame(data, columns);
      console.log("preprocess: ", file.name);

      df = preprocessDataframe(df);
      dataframes.push(df);
    }
  }
  return dataframes;
};

// fetch data folder
export const getdataFolder = async (user: User, project: any) => {
  const headers = new Headers();
  headers.append("Authorization", `bearer ${user.accessToken}`);
  const perPage = 100;
  let currentPage = 1;
  let allData: any[] = [];

  while (true) {
    const requestOptions: any = {
      method: "GET",
      headers: headers,
      redirect: "follow",
    };

    const apiUrl = `https://gitlab.pavlovia.org/api/v4/projects/${project.id}/repository/tree/?path=data&per_page=${perPage}&page=${currentPage}`;

    const dataFolder = await fetch(apiUrl, requestOptions)
      .then((response) => response.json())
      .then((result) => result)
      .catch((error) => {
        console.error("Error fetching data:", error);
        return null;
      });

    if (!dataFolder || dataFolder.length === 0) {
      break;
    }
    allData = allData.concat(dataFolder);
    currentPage += 1;
  }

  return allData;
};

export const getDataFolderCsvLength = async (user: User, project: any) => {
  let dataFolder = await getdataFolder(user, project);
  dataFolder = dataFolder.filter((file: { name: string }) =>
    file.name.includes("csv"),
  );
  return dataFolder ? dataFolder.length : 0;
};

/**
 * creates or overrides resources in EasyEyesResources repository
 * @param user target user
 * @param resourceFileList list of all resources to be uploaded
 */
export const createOrUpdateCommonResources = async (
  user: User,
  resourceFileList: File[],
): Promise<void> => {
  const easyEyesResourcesRepo: any = getProjectByNameInProjectList(
    user.projectList,
    resourcesRepoName,
  );
  const commonResourcesRepo: Repository = { id: easyEyesResourcesRepo.id };

  const prevResourcesList = await getCommonResourcesNames(user);
  const jsonFiles: ICommitAction[] = [];

  // Update each type of resources one by one
  for (const type of resourcesFileTypes) {
    const filesOfType = resourceFileList.filter((file) =>
      acceptableExtensions[type].includes(getFileExtension(file)),
    );
    for (const file of filesOfType) {
      const useBase64 = !acceptableResourcesExtensionsOfTextDataType.includes(
        getFileExtension(file),
      );
      const content = useBase64
        ? await getBase64Data(file)
        : await getFileTextData(file);

      jsonFiles.push({
        action: prevResourcesList[type].includes(file.name)
          ? "update"
          : "create",
        file_path: `${type}/${file.name}`,
        content,
        encoding: useBase64 ? "base64" : "text",
      });
    }
  }

  return await pushCommits(
    user,
    commonResourcesRepo,
    jsonFiles,
    commitMessages.newResourcesUploaded,
    defaultBranch,
  );
};

export const createOrUpdateProlificToken = async (
  user: User,
  token: string,
): Promise<void> => {
  const easyEyesResourcesRepo: any = getProjectByNameInProjectList(
    user.projectList,
    resourcesRepoName,
  );
  const commonResourcesRepo: Repository = { id: easyEyesResourcesRepo.id };
  const existingToken = await getProlificToken(user);

  const jsonFiles: ICommitAction[] = [
    {
      action: existingToken ? "update" : "create",
      file_path: "PROLIFIC_TOKEN",
      content: token,
      encoding: "text",
    },
  ];

  return await pushCommits(
    user,
    commonResourcesRepo,
    jsonFiles,
    commitMessages.addProlificToken,
    defaultBranch,
  );
};

/* -------------------------------------------------------------------------- */

/**
 * makes given commits to Gitlab repository
 * @returns response from API call made to push commits
 */
export const pushCommits = async (
  user: User,
  repo: Repository,
  commits: ICommitAction[],
  commitMessage: string,
  branch: string,
): Promise<any> => {
  const commitBody = {
    branch,
    commit_message: commitMessage,
    actions: commits,
  };

  console.log(commitBody);

  const response = await fetch(
    `https://gitlab.pavlovia.org/api/v4/projects/${repo.id}/repository/commits?access_token=${user.accessToken}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commitBody),
    },
  ).then(async (response) => {
    if (!response.ok) {
      Swal.fire({
        icon: "error",
        title: `Uploading failed.`,
        text: `Please try again. We are working on providing more detailed error messages.`,
        confirmButtonColor: "#666",
      });
      // location.reload();
      return null;
    }
    return response.json();
  });

  return await response;
};

export const commitMessages = {
  newResourcesUploaded: "⚡ new EasyEyes resources",
  resourcesTransferred: "📦 load EasyEyes resources from resources repo",
  thresholdCoreFileUploaded: "🔮 create threshold core components",
  addExperimentFile: "🖼️ add experiment file",
  addRecruitmentService: "📝 add recruitment service",
  addProlificToken: "🔑 add Prolific token",
  addProlificStudyId: "📝 add Prolific study id for the experiment",
};

export const defaultBranch = "master";

/* -------------------------------------------------------------------------- */
/* -------------------------- CORE CREATE NEW REPO -------------------------- */
/* -------------------------------------------------------------------------- */

export const getGitlabBodyForThreshold = async (
  startIndex: number,
  endIndex: number,
) => {
  const res: ICommitAction[] = [];

  for (let i = startIndex; i <= endIndex; i++) {
    const path = _loadFiles[i];
    const content = assetUsesBase64(path)
      ? await getAssetFileContentBase64(_loadDir + path)
      : await getAssetFileContent(_loadDir + path);
    res.push({
      action: "create",
      file_path: path,
      content,
      encoding: assetUsesBase64(path) ? "base64" : "text",
    });
  }
  return res;
};

export const getGitlabBodyForCompatibilityRequirementFile = (req: object) => {
  const res: ICommitAction[] = [];
  const content = JSON.stringify(req);
  res.push({
    action: "create",
    file_path: "CompatibilityRequirements.txt",
    content,
    encoding: "text",
  });
  return res;
};

export const getGitlabBodyForDurationText = (req: object) => {
  const res: ICommitAction[] = [];
  const content = JSON.stringify(req);
  res.push({
    action: "create",
    file_path: "Duration.txt",
    content,
    encoding: "text",
  });
  return res;
};

// helper
const updateSwalUploadingCount = (count: number, totalCount: number) => {
  const progressCount = document.getElementById("uploading-count");

  if (progressCount)
    (progressCount as HTMLSpanElement).innerHTML = `${Math.round(
      Math.min(count / totalCount, 1) * 100,
    )}`;
};

/**
 * creates threshold core files on specified gitlab repository
 * It assumes that the repository is empty
 * @param gitlabRepo target repository
 * @param user gitlabRepo is owned by this user
 */
const createThresholdCoreFilesOnRepo = async (
  gitlabRepo: Repository,
  user: User,
  uploadedFileCount: { current: number },
  totalFileCount: number,
): Promise<any> => {
  const promiseList = [];
  const batchSize = 10; // !
  const results: any[] = [];

  totalFileCount += 2; // add 1 for compatibility file and 1 for duration file

  for (let i = 0; i < _loadFiles.length; i += batchSize) {
    const startIdx = i;
    const endIdx = Math.min(i + batchSize - 1, _loadFiles.length - 1);

    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise(async (resolve) => {
      const rootContent = await getGitlabBodyForThreshold(startIdx, endIdx);
      pushCommits(
        user,
        gitlabRepo,
        rootContent,
        commitMessages.thresholdCoreFileUploaded,
        defaultBranch,
      ).then((commitResponse: any) => {
        uploadedFileCount.current += endIdx - startIdx + 1;
        updateSwalUploadingCount(uploadedFileCount.current, totalFileCount);

        resolve(commitResponse);
        results.push(commitResponse);
      });
    });

    promiseList.push(promise);
  }

  await Promise.all(promiseList);

  // add compatibility file (fails if added to promiseList)
  const compatibilityPromise = new Promise(async (resolve) => {
    const rootContent = getGitlabBodyForCompatibilityRequirementFile(
      compatibilityRequirements.parsedInfo,
    );
    pushCommits(
      user,
      gitlabRepo,
      rootContent,
      commitMessages.thresholdCoreFileUploaded,
      defaultBranch,
    ).then((commitResponse: any) => {
      uploadedFileCount.current += 1;
      updateSwalUploadingCount(uploadedFileCount.current, totalFileCount);
      resolve(commitResponse);
      results.push(commitResponse);
    });
  });
  await compatibilityPromise; // fails if added to promiseList

  const durationPromise = new Promise(async (resolve) => {
    const rootContent = getGitlabBodyForDurationText(durations);
    pushCommits(
      user,
      gitlabRepo,
      rootContent,
      commitMessages.thresholdCoreFileUploaded,
      defaultBranch,
    ).then((commitResponse: any) => {
      uploadedFileCount.current += 1;
      updateSwalUploadingCount(uploadedFileCount.current, totalFileCount);
      resolve(commitResponse);
      results.push(commitResponse);
    });
  });
  await durationPromise;

  return results;
};

/**
 * creates user-uploaded files on specified gitlab repository
 * @param gitlabRepo target repository
 * @param user gitlabRepo is owned by this user
 */
const createUserUploadedFilesOnRepo = async (
  gitlabRepo: Repository,
  user: User,
  repoFiles: ThresholdRepoFiles,
  uploadedFileCount: { current: number },
  totalFileCount: number,
): Promise<void> => {
  const commitActionList: ICommitAction[] = [];
  // add experiment file to root
  let fileData = "";

  if (repoFiles.experiment!.name.includes(".csv")) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fileData = await getFileTextData(repoFiles.experiment!);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fileData = (await readXLSXFile(repoFiles.experiment!)) as string;
  }

  // ! Do NOT add experiment file data to avoid Pavlovia error
  commitActionList.push({
    action: "create",
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    file_path: repoFiles.experiment!.name,
    content: fileData as string,
  });

  // uploadedFileCount.current++;
  // updateSwalUploadingCount(uploadedFileCount.current, totalFileCount);

  //   // add experiment file to conditions
  // commitActionList.push({
  //   action: "create",
  //   // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  //   file_path: `conditions/${repoFiles.experiment!.name}`,
  //   content: fileData,
  // });

  // add conditions
  for (let i = 0; i < repoFiles.blockFiles.length; i++) {
    const file = repoFiles.blockFiles[i];
    const content: string = await getFileTextData(file);

    commitActionList.push({
      action: "create",
      file_path: `conditions/${file.name}`,
      content,
      encoding: "text",
    });
    uploadedFileCount.current++;
    updateSwalUploadingCount(uploadedFileCount.current, totalFileCount);
  }

  return await pushCommits(
    user,
    gitlabRepo,
    commitActionList,
    commitMessages.addExperimentFile,
    defaultBranch,
  );
};

/**
 * transfers requested resources from EasyEyesResources repository to given repository.
 * It assumes there are no pre-exisiting resources on destination repository.
 * @param repo
 * @param user target user
 */
const createRequestedResourcesOnRepo = async (
  repo: Repository,
  user: User,
  uploadedFileCount: { current: number },
  totalFileCount: number,
  isCompiledFromArchiveBool: boolean,
  archivedZip: any,
): Promise<void> => {
  if (
    !userRepoFiles.requestedFonts ||
    !userRepoFiles.requestedForms ||
    !userRepoFiles.requestedTexts ||
    !userRepoFiles.requestedFolders ||
    !userRepoFiles.requestedCode
  )
    throw new Error("Requested resource names are undefined.");

  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    user.projectList,
    "EasyEyesResources",
  );
  const commitActionList: ICommitAction[] = [];

  for (const resourceType of ["fonts", "forms", "texts", "folders", "code"]) {
    let requestedFiles: string[] = [];
    switch (resourceType) {
      case "fonts":
        requestedFiles = userRepoFiles.requestedFonts;
        break;
      case "forms":
        requestedFiles = userRepoFiles.requestedForms;
        break;
      case "texts":
        requestedFiles = userRepoFiles.requestedTexts;
        break;
      case "folders":
        requestedFiles = userRepoFiles.requestedFolders || [];
        break;
      case "code":
        requestedFiles = userRepoFiles.requestedCode || [];
        break;
      default:
        requestedFiles = [];
        break;
    }

    for (const fileName of requestedFiles) {
      let content = "";
      if (isCompiledFromArchiveBool) {
        const Zip = new JSZip();
        await Zip.loadAsync(archivedZip as unknown as File).then((zip) => {
          return Promise.all(
            Object.keys(zip.files).map(async (filename) => {
              return zip.files[filename]
                .async("arraybuffer")
                .then(async (arrayBuffer) => {
                  if (filename === fileName) {
                    const blob = new Blob([arrayBuffer]);
                    const fileObject = new File([blob], filename);
                    const useBase64 =
                      !acceptableResourcesExtensionsOfTextDataType.includes(
                        getFileExtension(fileObject),
                      );
                    content = useBase64
                      ? await getBase64Data(fileObject)
                      : await getFileTextData(fileObject);
                  }
                });
            }),
          );
        });
      } else {
        const resourcesRepoFilePath = encodeGitlabFilePath(
          `${resourceType}/${fileName}`,
        );

        content =
          resourceType === "texts"
            ? await getTextFileDataFromGitLab(
                parseInt(easyEyesResourcesRepo.id),
                resourcesRepoFilePath,
                user.accessToken,
              )
            : await getBase64FileDataFromGitLab(
                parseInt(easyEyesResourcesRepo.id),
                resourcesRepoFilePath,
                user.accessToken,
              );
      }

      // Ignore 404s
      if (content?.trim().indexOf(`{"message":"404 File Not Found"}`) != -1)
        continue;

      commitActionList.push({
        action: "create",
        file_path: `${resourceType}/${fileName}`,
        content,
        encoding: resourceType === "texts" ? "text" : "base64",
      });
      uploadedFileCount.current++;
      updateSwalUploadingCount(uploadedFileCount.current, totalFileCount);
    }
  }

  return await pushCommits(
    user,
    repo,
    commitActionList,
    commitMessages.resourcesTransferred,
    defaultBranch,
  );
};

export const createPavloviaExperiment = async (
  user: User,
  projectName: string,
  callback: (newRepo: any, experimentUrl: string, serviceUrl: string) => void,
  isCompiledFromArchiveBool: boolean,
  archivedZip: any,
) => {
  // auth check
  if (user.id === undefined) {
    return;
  }

  // block files check
  if (userRepoFiles.blockFiles.length == 0) {
    Swal.fire({
      icon: "error",
      title: `Failed to create block files.`,
      text: `We failed to create experiment block files from your table. Try refresh the page. If the problem persists, please contact us.`,
      confirmButtonColor: "#666",
    });
    return false;
  }

  // unique repo name check
  const isRepoValid = !isProjectNameExistInProjectList(
    user.projectList,
    projectName,
  );
  if (!isRepoValid) {
    Swal.fire({
      icon: "error",
      title: `Duplicate experiment name`,
      text: `${projectName} already exists in your Pavlovia repository.`,
      confirmButtonColor: "#666",
    });
    return false;
  }

  // create experiment repo
  const newRepo = await createEmptyRepo(projectName, user);
  // user.newRepo = newRepo;

  const totalFileCount =
    _loadFiles.length +
    1 +
    userRepoFiles.blockFiles.length +
    userRepoFiles.requestedFonts.length +
    userRepoFiles.requestedForms.length +
    userRepoFiles.requestedTexts.length +
    userRepoFiles.requestedFolders.length +
    userRepoFiles.requestedCode.length;
  const uploadedFileCount = { current: 0 };

  let successful = false;

  await Swal.fire({
    title: "Uploading ...",
    html: `<p><span id="uploading-count">${Math.round(
      Math.min(uploadedFileCount.current / totalFileCount, 1) * 100,
    )}</span>%</p>`,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: async () => {
      // @ts-ignore
      Swal.showLoading(null);
      let finalClosing = true;

      // create threshold core files
      const a = await createThresholdCoreFilesOnRepo(
        { id: newRepo.id },
        user,
        uploadedFileCount,
        totalFileCount,
      );
      for (const i of a) if (i === null) finalClosing = false;

      // create user-uploaded files
      // console.log("Creating user-uploaded files...");
      const b = await createUserUploadedFilesOnRepo(
        { id: newRepo.id },
        user,
        userRepoFiles,
        uploadedFileCount,
        totalFileCount,
      );
      if (b === null) finalClosing = false;

      // transfer resources
      // console.log("Transferring resources...");
      const c = await createRequestedResourcesOnRepo(
        { id: newRepo.id },
        user,
        uploadedFileCount,
        totalFileCount,
        isCompiledFromArchiveBool,
        archivedZip,
      );
      if (c === null) finalClosing = false;

      if (finalClosing) {
        // uploaded without error
        Swal.close();

        const expUrl = `https://run.pavlovia.org/${
          user.username
        }/${projectName.toLocaleLowerCase()}`;

        let serviceUrl = expUrl;

        if (
          user.currentExperiment.participantRecruitmentServiceName == "Prolific"
        ) {
          serviceUrl =
            expUrl +
            "?participant={{%PROLIFIC_PID%}}&study_id={{%STUDY_ID%}}&session={{%SESSION_ID%}}";
        }

        successful = true;

        callback(
          newRepo,
          `https://run.pavlovia.org/${
            user.username
          }/${projectName.toLocaleLowerCase()}`,
          serviceUrl,
        );
      }
    },
  });

  return successful;
};

/* -------------------------------------------------------------------------- */

export const runExperiment = async (
  user: User,
  newRepo: Repository,
  experimentUrl: string,
) => {
  try {
    const running = await fetch(
      "https://pavlovia.org/api/v2/experiments/" + newRepo.id + "/status",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          oauthToken: user.accessToken,
        },

        body: JSON.stringify({
          newStatus: "RUNNING",
          recruitment: {
            policy: { type: "URL", url: experimentUrl },
          },
        }),
      },
    );

    return await running.json();
  } catch (error) {
    await Swal.fire({
      icon: "error",
      title: `Failed to change mode.`,
      text: `We failed to change your experiment mode to RUNNING. There might be a problem when uploading it, or the Pavlovia server is down. Please try to refresh the status in a while, or refresh the page to start again.`,
      confirmButtonColor: "#666",
    });

    return null;
  }
};

export const getExperimentStatus = async (user: User, newRepo: Repository) => {
  const running = await fetch(
    "https://pavlovia.org/api/v2/experiments/" + newRepo.id,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        oauthToken: user.accessToken,
      },
    },
  );

  const result = await running.json();
  return result.experiment.status2;
};

/* -------------------------------------------------------------------------- */

export const generateAndUploadCompletionURL = async (
  user: User,
  newRepo: any,
  handleUpdateUser: (user: User) => void,
) => {
  const newUser: User = copyUser(user);

  if (!newUser.currentExperiment.participantRecruitmentServiceCode) {
    const completionCode = String(
      Math.floor(Math.random() * (999 - 100) + 100),
    );

    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let incompatibleCompletionCode = "";
    for (let i = 0; i < 7; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      incompatibleCompletionCode += characters.charAt(randomIndex);
    }

    if (completionCode !== "") {
      newUser.currentExperiment.participantRecruitmentServiceCode =
        completionCode;

      const completionURL =
        "https://app.prolific.co/submissions/complete?cc=" + completionCode;
      const jsonString = `name,${
        user.currentExperiment.participantRecruitmentServiceName
      }\ncode,${completionCode}\nincompatible-completion-code,${incompatibleCompletionCode}\nurl,${completionURL}\nprolificWorkspace,${user.currentExperiment.prolificWorkspaceModeBool.toString()}`;

      const commitAction = {
        action: "update",
        file_path: "recruitmentServiceConfig.csv",
        content: jsonString,
      };
      const commitBody = {
        branch: "master",
        commit_message: commitMessages.addRecruitmentService,
        actions: [commitAction],
      };

      handleUpdateUser(newUser);

      const commitFile = await fetch(
        "https://gitlab.pavlovia.org/api/v4/projects/" +
          newRepo.id +
          "/repository/commits?access_token=" +
          newUser.accessToken,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(commitBody),
        },
      )
        .then((response) => {
          return response.json();
        })
        .catch(() => {
          Swal.fire({
            icon: "error",
            title: `Failed to upload completion code.`,
            text: `We can't upload your completion code. There might be a problem when uploading it, or the Pavlovia server is down. Please refresh the page to start again.`,
            confirmButtonColor: "#666",
          });
          // location.reload();
        });

      await commitFile;

      return { code: completionCode, incompatibleCompletionCode };
    }
  }
};

/**
 * stores prolific study-id on specified gitlab repository
 * @param gitlabRepo target repository
 * @param user gitlabRepo is owned by this user
 */
export const createProlificStudyIdFile = async (
  gitlabRepo: Repository,
  user: User,
  studyId: string,
): Promise<void> => {
  const commitActionList: ICommitAction[] = [];

  commitActionList.push({
    action: "create",
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    file_path: "ProlificStudyId.txt",
    content: studyId,
  });

  return await pushCommits(
    user,
    gitlabRepo,
    commitActionList,
    commitMessages.addProlificStudyId,
    defaultBranch,
  );
};

// fetch prolific study-id
export const getProlificStudyId = async (user: User, id: any) => {
  if (!id) {
    return "";
  }
  const headers = new Headers();
  headers.append("Authorization", `bearer ${user.accessToken}`);

  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };

  const response =
    (await fetch(
      `https://gitlab.pavlovia.org/api/v4/projects/${id}/repository/files/ProlificStudyId.txt/raw?ref=master`,
      requestOptions,
    )
      .then((response) => {
        return response.text();
      })
      .catch((error) => {
        console.error(error);
      })) || "";

  if (response.includes("404 File Not Found")) return "";
  return response;
};
