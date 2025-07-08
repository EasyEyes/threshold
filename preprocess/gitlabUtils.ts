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
import { compatibilityRequirements, typekit } from "./global";
import { durations, padToSameLength } from "./getDuration";
import {
  convertLanguageToLanguageCode,
  getCompatibilityRequirements,
} from "../components/compatibilityCheck";
import { isExpTableFile } from "../preprocess/utils";
import { GLOSSARY } from "../parameters/glossary";

const MAX_RETRIES = 10;
const BASE_DELAY_SEC = 0.5;
const MAX_DELAY_SEC = 10;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/**
 * Rerun an async operation until a validation fn fulfills:
 * 1. Attempts the main operation
 * 2. Validates the result via test function
 * 3. If validation fails, retries up to maxRetries times
 * 4. Optionally adds delay between retries
 * @param attempt - The async function to retry, representing the main operation
 * @param test - A predicate function that validates the result of the attempt.
 *              e.g. checking an API response status
 * @param maxRetries - Maximum number of retry attempts before failing (default: 5)
 * @param withDelay - Whether to add a delay between retry attempts (default: true)
 * @returns The result of the successful attempt
 * @throws The last error encountered if all retries fail
 *
 * @example
 * // Retry creating a resource and verify it exists
 * await retryWithCondition(
 *   () => createResource(),
 *   async (result) => {
 *     const exists = await checkResourceExists(result.id);
 *     if (!exists) throw new Error('Resource not found');
 *   }
 * );
 */
const retryWithCondition = async (
  attempt: () => Promise<any>,
  test: (x: any) => Promise<any>,
  maxRetries = 5,
  withDelay = true,
) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await attempt();
      await test(result);
      if (withDelay) await wait(getRetryDelayMs(i));
      return result;
    } catch (error) {
      if (i === maxRetries) {
        throw error;
      }
    }
  }
};
export const getRetryDelayMs = (attempt: number) => {
  const delaySec = Math.min(
    BASE_DELAY_SEC * Math.pow(1.75, attempt),
    MAX_DELAY_SEC,
  );
  return delaySec * 1000;
};
export class User {
  public username = "";
  public name = "";
  public id = "";
  public avatar_url = "";

  private _projectListLoaded = false;
  public projectList: Promise<any[]> = Promise.resolve([]);

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
    _pavloviaNewExperimentBool: true,
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
    if (!this._projectListLoaded) {
      this._projectListLoaded = true;
      this.projectList = getAllProjects(this);
    }
  }
}

export const copyUser = (user: User): User => {
  const newUser = new User(user.accessToken);
  newUser.username = user.username;
  newUser.name = user.name;
  newUser.id = user.id;
  newUser.avatar_url = user.avatar_url;
  newUser.projectList = user.projectList;
  newUser.currentExperiment = JSON.parse(
    JSON.stringify(user.currentExperiment),
  );
  return newUser;
};

// https://docs.gitlab.com/ee/api/commits.html#create-a-commit-with-multiple-files-and-actions
export interface ICommitAction {
  action: "create" | "delete" | "move" | "update" | "chmod";
  file_path: string;
  content?: string;
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
 * @param projectList list of projects returned by gitlab API or a Promise resolving to such a list
 * @param keyProjectName project name to search for
 * @returns true if keyProjectName exists in given project list (or Promise<boolean> if projectList is a Promise)
 */
export const isProjectNameExistInProjectList = (
  projectList: any[] | Promise<any[]>,
  keyProjectName: string,
): boolean | Promise<boolean> => {
  // Handle Promise case
  if (projectList && typeof (projectList as any).then === "function") {
    return (projectList as Promise<any[]>).then((resolvedList: any[]) =>
      isProjectNameExistInProjectList(resolvedList, keyProjectName),
    );
  }

  // Ensure projectList is an array
  if (!Array.isArray(projectList)) {
    console.error(
      "isProjectNameExistInProjectList: projectList is not an array",
      projectList,
    );
    return false;
  }

  const searchName = keyProjectName.toLowerCase();
  return projectList.some((project) => {
    if (!project || !project.name) return false;
    return project.name.toLowerCase() === searchName;
  });
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
  );
  const newRepoData = await newRepo.json();
  return newRepoData;
};

export const setRepoName = async (
  user: User,
  name: string,
): Promise<string> => {
  if (!user.currentExperiment._pavloviaNewExperimentBool)
    return getReusedRepoName(user, name);
  name = complianceProjectName(name);
  const upToDateProjectList = await user.projectList;
  for (let i = 1; i < 9999999; i++)
    if (!isProjectNameExistInProjectList(upToDateProjectList, `${name}${i}`))
      return `${name}${i}`;
  return `${name}${Date.now()}`;
};

const getReusedRepoName = async (user: User, name: string): Promise<string> => {
  name = complianceProjectName(name);
  const upToDateProjectList = await user.projectList;

  const exists = (i: number) =>
    isProjectNameExistInProjectList(upToDateProjectList, `${name}${i}`);
  if (!exists(1)) return `${name}1`;
  for (let i = 1; i < 9999999; i++)
    if (exists(i) && !exists(i + 1)) return `${name}${i}`;
  return `${name}1`;
};

const complianceProjectName = (name: string): string => {
  // Strip leading non-alphanumeric characters
  while (name.length > 0 && !name[0].match(/[a-zA-Z0-9]/)) {
    name = name.slice(1);
  }
  // Keep only allowed characters: letters, digits, dashes, underscores
  name = name.replace(/[^a-zA-Z0-9-_]/g, "");
  //Ensure name ends with alphanumerica (remove trialing dash/underscore)
  while (name.length > 0 && !name[name.length - 1].match(/[a-zA-Z0-9]/)) {
    name = name.slice(0, -1);
  }
  return name;
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
  const resolvedProjectList = await user.projectList;
  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    resolvedProjectList,
    resourcesRepoName,
  );

  if (!easyEyesResourcesRepo) {
    const emptyResources: { [key: string]: string[] } = {};
    for (const type of resourcesFileTypes) {
      emptyResources[type] = [];
    }
    return emptyResources;
  }

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
      .catch((error) => {
        const skipError = (err: any) => {
          return err;
        };
        skipError(error);
      });
    const typeList =
      prevFontListResponse &&
      !prevFontListResponse.includes(`404 Tree Not Found`)
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
    title: `Exporting ...`,
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
  const resolvedProjectList = await user.projectList;
  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    resolvedProjectList,
    resourcesRepoName,
  );

  if (!easyEyesResourcesRepo) {
    return "";
  }

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

interface GitLabItemBase {
  id: string;
  name: string;
  path: string;
}
interface GitLabBlob extends GitLabItemBase {
  type: "blob";
}
interface GitLabTree extends GitLabItemBase {
  type: "tree";
}
type GitLabItem = GitLabBlob | GitLabTree;

class GitLabAPIError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "GitLabAPIError";
    this.status = status;
  }
}

/**
 * Get a (recursive, flat-by-default) tree of all files and folders
 * https://docs.gitlab.com/ee/api/repositories.html#list-repository-tree
 * @param user User
 * @param repoId string
 * @param extraPath string
 * @param ignorePath string
 * @returns Promise<Array<GitLabBlob>>
 */
async function getFilesFromRepo(
  user: User,
  repoId: string,
  extraPath: string = "",
  ignorePath: string = "data",
): Promise<Array<GitLabBlob>> {
  if (!user?.accessToken)
    throw new Error("Invalid user or missing access token");
  if (!repoId) throw new Error("Repository ID is required");

  const sanitizedIgnorePath = ignorePath.replace(/[^a-zA-Z0-9-_/]/g, "");

  try {
    const headers = new Headers([
      ["Authorization", `bearer ${user.accessToken}`],
      ["Accept", "application/json"],
    ]);

    const apiUrl = new URL(
      `https://gitlab.pavlovia.org/api/v4/projects/${encodeURIComponent(
        repoId,
      )}/repository/tree`,
    );
    if (extraPath) apiUrl.searchParams.append("path", extraPath);

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers,
      redirect: "follow",
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new GitLabAPIError(
        `GitLab API request failed while getting files from repository ${repoId}: ${errorData.message}`,
        response.status,
      );
    }

    const tree: GitLabItem[] = await response.json();
    if (!Array.isArray(tree))
      throw new Error("Invalid response format from GitLab API");

    const filteredTree = tree.filter(
      (item) => item.path !== sanitizedIgnorePath,
    );
    const files: GitLabBlob[] = [];
    const directories: GitLabTree[] = [];

    filteredTree.forEach((item) => {
      if (item.type === "blob") files.push(item as GitLabBlob);
      else if (item.type === "tree") directories.push(item as GitLabTree);
    });

    const subDirectoryPromises = directories.map(async (directory) => {
      try {
        return await getFilesFromRepo(
          user,
          repoId,
          directory.path,
          sanitizedIgnorePath,
        );
      } catch (error) {
        console.warn(
          `Failed to process subdirectory ${directory.path}:`,
          error,
        );
        return [];
      }
    });

    const subDirectoryResults = await Promise.all(subDirectoryPromises);
    const results = [...files, ...subDirectoryResults.flat()];
    return results;
  } catch (error) {
    if (error instanceof GitLabAPIError) throw error;
    if (error instanceof TypeError && error.message.includes("network")) {
      throw new GitLabAPIError(
        `Network error while getting files from repository ${repoId}`,
      );
    }
    throw new Error(
      `Failed to retrieve repository files from ${repoId}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

const deleteAllFilesInRepo = async (
  user: User,
  repo: Repository,
  ignorePath = "data",
) => {
  const attempt = async (): Promise<any> => {
    let files = await getFilesFromRepo(user, repo.id, "", ignorePath);
    const deleteResponse = await deleteFiles(files, user, repo);
    if (deleteResponse) return [];
    throw files;
  };
  const test = async (files: Array<GitLabBlob>) => {
    if (files && files.length) throw files;
    const fetchedFiles = await getFilesFromRepo(user, repo.id, "", ignorePath);
    const unexcused = [
      ...fetchedFiles.filter((o) => !new RegExp("^" + ignorePath).test(o.path)),
    ];
    if (unexcused.length) throw fetchedFiles;
  };
  try {
    await retryWithCondition(attempt, test, MAX_RETRIES);
  } catch (e) {
    Swal.close();
    Swal.fire({
      icon: "error",
      title: `Failed to delete files from repo`,
      text: `Unable to delete files in ${repo.id} repo. Please try again.`,
      confirmButtonColor: "#666",
    });
    throw e;
  }
};

const deleteFiles = async (
  blobs: GitLabBlob[],
  user: User,
  repo: Repository,
): Promise<boolean> => {
  const actions: ICommitAction[] = [];
  for (const blob of blobs) {
    actions.push({
      action: "delete",
      file_path: blob.path,
    });
  }
  return pushCommits(
    user,
    repo,
    actions,
    `Delete files ${blobs.join("")}`,
    "master",
  );
};

export const getCompatibilityRequirementsForProject = async (
  user: User,
  repoName: string,
): Promise<string> => {
  const resolvedProjectList = await user.projectList;
  const repo = getProjectByNameInProjectList(resolvedProjectList, repoName);

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
  const resolvedProjectList = await user.projectList;
  const repo = getProjectByNameInProjectList(resolvedProjectList, repoName);

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
  const resolvedProjectList = await user.projectList;
  const repo = getProjectByNameInProjectList(resolvedProjectList, repoName);

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
  const resolvedProjectList = await user.projectList;
  const repo = getProjectByNameInProjectList(resolvedProjectList, repoName);

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
  const resolvedProjectList = await user.projectList;
  const repo = getProjectByNameInProjectList(resolvedProjectList, repoName);

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

async function splitCSVAndZip(
  blob: Blob,
  fileName: string,
  projectName: string,
  prolificStudyId: string,
  prolificToken: string,
  downloadDemographicData: (
    arg0: string,
    arg1: string,
    arg2: string,
    arg3: any,
  ) => any,
) {
  const zip = await JSZip.loadAsync(blob);
  const dbFolder = zip.folder("db");
  if (!dbFolder) {
    return;
  }
  const groupedData: Record<string, string[]> = {};

  const parsePromises = Object.values(dbFolder.files).map((file) =>
    file
      .async("string")
      .then((csvContent) => {
        const records: any[] = Papa.parse(csvContent, { header: true }).data;
        records.forEach((record) => {
          const sessionId = record["PavloviaSessionID"];
          if (sessionId) {
            groupedData[sessionId] = groupedData[sessionId] || [];
            groupedData[sessionId].push(record);
          }
        });
      })
      .catch((error) => {
        console.error("Error parsing CSV content:", error);
      }),
  );
  await Promise.all(parsePromises);

  try {
    const newZip = new JSZip();
    for (const sessionId in groupedData) {
      const csvData = Papa.unparse({
        fields: Object.keys(groupedData[sessionId][0]),
        data: groupedData[sessionId],
      });
      newZip.file(`${sessionId}-${projectName}.csv`, csvData);
    }
    if (prolificStudyId) {
      await downloadDemographicData(
        prolificToken,
        prolificStudyId,
        projectName,
        newZip,
      );
    }

    newZip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, fileName);
    });
  } catch (error) {
    console.error("Error splitting CSV and zipping:", error);
  }
}

/**
 * Download data folder as a ZIP file from GitLab repository
 */
export const downloadDataFolder = async (
  user: User,
  project: any,
  prolificStudyId: string,
  prolificToken: string,
  downloadDemographicData: (
    arg0: string,
    arg1: string,
    arg2: string,
    arg3: any,
  ) => any,
) => {
  const headers = new Headers();
  headers.append("Authorization", `bearer ${user.accessToken}`);
  const perPage = 100;
  const requestOptions: any = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };
  headers.append("Oauthtoken", user.accessToken);
  const pavloviaRequestOptions: any = {
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

      const pavloviaExperimentInfoAPI = `https://pavlovia.org/api/v2/experiments/${project.id}`;

      const pavloviaInfo = await fetch(
        pavloviaExperimentInfoAPI,
        pavloviaRequestOptions,
      )
        .then((response) => response.json())
        .catch((error) => {
          console.error("Error fetching data:", error);
          return null;
        });

      if (pavloviaInfo && pavloviaInfo?.experiment?.saveFormat === "DATABASE") {
        try {
          let downloadURL = pavloviaInfo?.experiment?.download?.downloadUrl;

          if (!downloadURL) {
            const pavloviaResultsAPI = `https://pavlovia.org/api/v2/experiments/${project.id}/results`;
            const result = await fetch(
              pavloviaResultsAPI,
              pavloviaRequestOptions,
            )
              .then((response) => response.json())
              .then((result) => result)
              .catch((error) => {
                console.error("Error fetching data:", error);
                return null;
              });
            if (!result) {
              Swal.close();
              Swal.fire({
                icon: "error",
                title: `No data found for ${project.name}.`,
                text: `We can't find any data for the experiment. This might be due to an error, or the Pavlovia server is down. Please refresh the page or try again later.`,
                confirmButtonColor: "#666",
              });
              return;
            }
            const downloadToken = result.downloadToken;
            const pavloviaDownloadAPI = `https://pavlovia.org/api/v2/experiments/${project.id}/results/${downloadToken}/status`;
            downloadURL = await fetch(pavloviaDownloadAPI)
              .then((response) => response.json())
              .then((result) => result.downloadUrl);
          }
          const fileContent = await fetch(downloadURL).then((response) =>
            response.blob(),
          );
          if (fileContent) {
            const zipFileName = `${project.name}.results.zip`;
            await splitCSVAndZip(
              fileContent,
              zipFileName,
              project.name,
              prolificStudyId,
              prolificToken,
              downloadDemographicData,
            );
          }
        } catch (error) {
          console.error("Error downloading or processing file:", error);
        }

        Swal.close();
      } else {
        while (true) {
          const apiUrl = `https://gitlab.pavlovia.org/api/v4/projects/${project.id}/repository/tree/?path=data&per_page=${perPage}&page=${currentPage}`;

          const dataFolder = await fetch(apiUrl, requestOptions)
            .then((response) => response.json())
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

        const zipFileName = `${project.name}.results.zip`;

        if (prolificStudyId) {
          await downloadDemographicData(
            prolificToken,
            prolificStudyId,
            project.name,
            zip,
          );
        }

        zip.generateAsync({ type: "blob" }).then((content) => {
          saveAs(content, zipFileName);
          Swal.close();
        });
      }
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
  ).then((response) => {
    return response.json();
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
      const columns = parsed.data[0] as any[]; // Header
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
  let latestDate: any = false;
  for (const file of dataFolder) {
    const fileName = file.name;
    const fileNameDateArray = fileName.split("_").slice(-2);
    const date =
      fileNameDateArray?.[0] +
      " " +
      fileNameDateArray?.[1]?.split(".")?.[0]?.replace("h", ":");
    const dateOptions: any = {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZoneName: "longOffset",
      hour: "numeric",
      minute: "numeric",
    };
    if (!latestDate) {
      latestDate = new Date(date).toLocaleDateString(undefined, dateOptions);
    } else if (new Date(date) > latestDate) {
      latestDate = new Date(date).toLocaleDateString(undefined, dateOptions);
    }
  }
  dataFolder = dataFolder.filter((file: { name: string }) =>
    file.name.includes("csv"),
  );
  return dataFolder ? [dataFolder.length, latestDate] : [0, false];
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
  const resolvedProjectList = await user.projectList;
  const easyEyesResourcesRepo: any = getProjectByNameInProjectList(
    resolvedProjectList,
    resourcesRepoName,
  );
  if (!easyEyesResourcesRepo) {
    throw new Error(
      "EasyEyesResources repository not found, createOrUpdateCommonResources failed.",
    );
  }

  const commonResourcesRepo: Repository = { id: easyEyesResourcesRepo.id };

  const prevResourcesList = await getCommonResourcesNames(user);
  const jsonFiles: ICommitAction[] = [];

  // Helper functions to identify specific file types by their filename patterns
  const isImpulseResponseFile = (file: File): boolean => {
    return file.name.match(/\.gainVTime\.(xlsx|csv)$/i) !== null;
  };

  const isFrequencyResponseFile = (file: File): boolean => {
    return file.name.match(/\.gainVFreq\.(xlsx|csv)$/i) !== null;
  };

  // Update each type of resources one by one
  for (const type of resourcesFileTypes) {
    let filesOfType: File[] = [];

    // Special handling for impulse and frequency response files
    if (type === "impulseResponses") {
      filesOfType = resourceFileList.filter(
        (file) =>
          isImpulseResponseFile(file) &&
          acceptableExtensions[type].includes(getFileExtension(file)),
      );
    } else if (type === "frequencyResponses") {
      filesOfType = resourceFileList.filter(
        (file) =>
          isFrequencyResponseFile(file) &&
          acceptableExtensions[type].includes(getFileExtension(file)),
      );
    } else {
      // Standard extension-based filtering for other file types
      filesOfType = resourceFileList.filter((file) =>
        acceptableExtensions[type].includes(getFileExtension(file)),
      );
    }

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
  const resolvedProjectList = await user.projectList;
  const easyEyesResourcesRepo: any = getProjectByNameInProjectList(
    resolvedProjectList,
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
      // Swal.fire({
      //   icon: "error",
      //   title: `Uploading failed.`,
      //   text: `Please try again. We are working on providing more detailed error messages.`,
      //   confirmButtonColor: "#666",
      // });
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

export const getGitlabBodyForTypekitKit = async (kitId: string) => {
  const res: ICommitAction[] = [];
  res.push({
    action: "create",
    file_path: "typekit.json",
    content: JSON.stringify({
      kitId: kitId,
      fonts: Object.fromEntries(typekit.fonts),
    }),
    encoding: "text",
  });
  return res;
};

export const getGitlabBodyForCompatibilityRequirementFile = async (
  req: object,
) => {
  const res: ICommitAction[] = [];
  //add compiler update date
  // get the deployed time from Netlify
  try {
    let websiteRepoLastCommitDeploy = "";
    await fetch(
      "https://api.netlify.com/api/v1/sites/7ef5bb5a-2b97-4af2-9868-d3e9c7ca2287/",
    )
      .then((response) => response.json())
      .then((data) => {
        websiteRepoLastCommitDeploy = data.published_deploy.published_at;
        req = { ...req, compilerUpdateDate: websiteRepoLastCommitDeploy };
      });
  } catch (e) {
    console.error(
      "Error fetching Netlify site data for compiler update date: ",
      e,
    );
  }

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
      Math.min((count + 1) / (totalCount + 1), 1) * 100,
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
  const batchSize = 50; // !
  const results: any[] = [];

  totalFileCount += 2; // add 1 for compatibility file and 1 for duration file

  const fakeStartingCount = totalFileCount / 3.5;
  updateSwalUploadingCount(fakeStartingCount, totalFileCount);
  for (let i = 0; i < _loadFiles.length; i += batchSize) {
    const startIdx = i;
    const endIdx = Math.min(i + batchSize - 1, _loadFiles.length - 1);

    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise(async (resolve, reject) => {
      try {
        const rootContent = await getGitlabBodyForThreshold(startIdx, endIdx);
        const commitResponse = await pushCommits(
          user,
          gitlabRepo,
          rootContent,
          commitMessages.thresholdCoreFileUploaded,
          defaultBranch,
        );
        if (commitResponse === null) {
          reject();
        } else {
          uploadedFileCount.current += endIdx - startIdx + 1;
          updateSwalUploadingCount(uploadedFileCount.current, totalFileCount);
          results.push(commitResponse);
          resolve(commitResponse);
        }
      } catch (e) {
        reject();
      }
    });
    promiseList.push(promise);
  }

  await Promise.all(promiseList);

  // add compatibility file (fails if added to promiseList)
  const compatibilityPromise = new Promise(async (resolve) => {
    const rootContent = await getGitlabBodyForCompatibilityRequirementFile(
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

  // add typekit kit
  if (typekit.kitId !== "") {
    const typekitPromise = new Promise(async (resolve) => {
      const rootContent = await getGitlabBodyForTypekitKit(typekit.kitId);
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
    await typekitPromise;
  }

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
    !userRepoFiles.requestedImages ||
    !userRepoFiles.requestedCode ||
    !userRepoFiles.requestedImpulseResponses ||
    !userRepoFiles.requestedFrequencyResponses
  )
    throw new Error("Requested resource names are undefined.");

  const resolvedProjectList = await user.projectList;
  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    resolvedProjectList,
    "EasyEyesResources",
  );
  if (!easyEyesResourcesRepo) {
    throw new Error(
      "EasyEyesResources repository not found, createRequestedResourcesOnRepo failed.",
    );
  }

  const commitActionList: ICommitAction[] = [];

  for (const resourceType of [
    "fonts",
    "forms",
    "texts",
    "folders",
    "images",
    "code",
    "impulseResponses",
    "frequencyResponses",
  ]) {
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
      case "images":
        requestedFiles = userRepoFiles.requestedImages || [];
        break;
      case "code":
        requestedFiles = userRepoFiles.requestedCode || [];
        break;
      case "impulseResponses":
        requestedFiles = userRepoFiles.requestedImpulseResponses || [];
        break;
      case "frequencyResponses":
        requestedFiles = userRepoFiles.requestedFrequencyResponses || [];
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

export const manuallySetSwalTitle = (title: string) => {
  const swal2Title = document.getElementById("swal2-title");
  if (!swal2Title) return false;
  swal2Title.innerHTML = title;
  return true;
};

const _reportCreatePavloviaExperimentCurrentStep = (
  stepMessage: string,
  isUploading: boolean = false,
) => {
  const swal2HtmlContainer = document.getElementById("swal2-html-container");
  const uploadingCount = `<p style="display: ${
    isUploading ? "block" : "none"
  }"><span id="uploading-count">0</span>%</p>`;
  manuallySetSwalTitle(stepMessage);
  if (swal2HtmlContainer) {
    swal2HtmlContainer.innerHTML = uploadingCount;
  }
  console.log(`[Create Pavlovia Experiment] ${stepMessage}`);
};

const _attemptToCreatePavloviaExperiment = async (
  user: User,
  projectName: string,
  callback: (newRepo: any, experimentUrl: string, serviceUrl: string) => void,
  isCompiledFromArchiveBool: boolean,
  archivedZip: any,
) => {
  _reportCreatePavloviaExperimentCurrentStep("Initializing ...");
  // PREPARE REPO
  _reportCreatePavloviaExperimentCurrentStep("Creating ...");
  const newRepo = await _createExperimentTask_prepareRepo(user, projectName);
  if (!newRepo) {
    return false;
  }
  // UPLOAD FILES
  _reportCreatePavloviaExperimentCurrentStep("Uploading ...", true);
  const successful = await _createExperimentTask_uploadFiles(
    user,
    newRepo,
    projectName,
    isCompiledFromArchiveBool,
    archivedZip,
    callback,
  );
  return successful;
};
const _createExperimentTask_checkStartingState = async (
  user: User,
  projectName: string,
) => {
  // auth check
  if (user.id === undefined) {
    return false;
  }
  // block files check
  if (userRepoFiles.blockFiles.length == 0) {
    return false;
  }
  console.log("!. user.projectList", user.projectList);
  // unique repo name check
  const projectExists = await isProjectNameExistInProjectList(
    user.projectList,
    projectName,
  );
  const isRepoValid =
    !projectExists || !user.currentExperiment._pavloviaNewExperimentBool;
  if (!isRepoValid) {
    return false;
  }
  return true;
};
const _createExperimentTask_prepareRepo = async (
  user: User,
  projectName: string,
) => {
  let newRepo: any;
  const resolvedProjectList = await user.projectList;
  const projectExists = await isProjectNameExistInProjectList(
    user.projectList,
    projectName,
  );
  // Make a new repo, if requested or a pre-existing one does not exist
  if (user.currentExperiment._pavloviaNewExperimentBool || !projectExists) {
    // create experiment repo...
    newRepo = await createEmptyRepo(projectName, user);
    // user.newRepo = newRepo;
  } else {
    // ...or get the pre-existing experiment repo...
    newRepo = getProjectByNameInProjectList(resolvedProjectList, projectName);
    // ...and delete all the old files to get the repo fresh and ready
    await deleteAllFilesInRepo(user, newRepo, "data");
  }
  return newRepo;
};
const _createExperimentTask_uploadFiles = async (
  user: User,
  newRepo: any,
  projectName: string,
  isCompiledFromArchiveBool: boolean,
  archivedZip: any,
  callback: (newRepo: any, experimentUrl: string, serviceUrl: string) => void,
) => {
  // UPLOAD FILES
  const totalFileCount =
    _loadFiles.length +
    1 +
    userRepoFiles.blockFiles.length +
    userRepoFiles.requestedFonts.length +
    userRepoFiles.requestedForms.length +
    userRepoFiles.requestedTexts.length +
    userRepoFiles.requestedFolders.length +
    userRepoFiles.requestedImages.length +
    userRepoFiles.requestedCode.length;
  const uploadedFileCount = { current: 0 };

  let successful = false;
  try {
    // @ts-ignore
    Swal.showLoading();

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
    const b = await createUserUploadedFilesOnRepo(
      { id: newRepo.id },
      user,
      userRepoFiles,
      uploadedFileCount,
      totalFileCount,
    );
    if (b === null) finalClosing = false;
    await setExperimentSaveFormat(user, newRepo);

    // transfer resources
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

      const expUrl = `https://run.pavlovia.org/${
        user.username
      }/${projectName.toLocaleLowerCase()}`;

      const serviceUrl =
        user.currentExperiment.participantRecruitmentServiceName == "Prolific"
          ? expUrl +
            "?participant={{%PROLIFIC_PID%}}&study_id={{%STUDY_ID%}}&session={{%SESSION_ID%}}"
          : expUrl;
      successful = true;
      callback(
        newRepo,
        `https://run.pavlovia.org/${
          user.username
        }/${projectName.toLocaleLowerCase()}`,
        serviceUrl,
      );
    }
  } catch (e) {
    console.error(`!. Failed to upload files.`, e);
    return false;
  }
  return successful;
};

export const createPavloviaExperiment = async (
  user: User,
  projectName: string,
  callback: (newRepo: any, experimentUrl: string, serviceUrl: string) => void,
  isCompiledFromArchiveBool: boolean,
  archivedZip: any,
) => {
  // Swal.showLoading();
  const isStartingStateValid = await _createExperimentTask_checkStartingState(
    user,
    projectName,
  );
  if (!isStartingStateValid) {
    Swal.fire({
      icon: "error",
      title: `Failed to create Pavlovia experiment, starting state invalid.`,
      text: `We ran into trouble creating your experiment. Please try refreshing the page and starting again.`,
    });
    return;
  }

  const result = await retryWithCondition(
    () =>
      _attemptToCreatePavloviaExperiment(
        user,
        projectName,
        callback,
        isCompiledFromArchiveBool,
        archivedZip,
      ),
    async (result) => {
      if (!result) throw new Error("Test failed");
    },
    MAX_RETRIES,
    false,
  );
  if (!result) {
    Swal.fire({
      icon: "error",
      title: `Failed to create Pavlovia experiment.`,
      text: `We ran into trouble creating your experiment. Please try refreshing the page and starting again.`,
    });
  }
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

export const setExperimentSaveFormat = async (
  user: User,
  newRepo: Repository,
) => {
  const isDatabaseDefaultString = GLOSSARY[
    "_pavlovia_Database_ResultsFormatBool"
  ].default
    .toString()
    .toLowerCase();
  // @ts-ignore
  const isDatabase = user.currentExperiment._pavlovia_Database_ResultsFormatBool // @ts-ignore
    ? user.currentExperiment._pavlovia_Database_ResultsFormatBool === "TRUE"
      ? true
      : false
    : isDatabaseDefaultString === "true";
  const experiment = await fetch(
    "https://pavlovia.org/api/v2/experiments/" + newRepo.id,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        oauthToken: user.accessToken,
      },
      body: JSON.stringify({
        saveFormat: isDatabase ? "DATABASE" : "CSV",
      }),
    },
  );

  const result = await experiment.json();
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
    let abortedCompletionCode = "";
    for (let i = 0; i < 7; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      incompatibleCompletionCode += characters.charAt(randomIndex);
    }

    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      abortedCompletionCode += characters.charAt(randomIndex);
    }

    if (completionCode !== "") {
      newUser.currentExperiment.participantRecruitmentServiceCode =
        completionCode;

      const completionURL =
        "https://app.prolific.com/submissions/complete?cc=" + completionCode;
      let jsonString = `name,${
        user.currentExperiment.participantRecruitmentServiceName
      }\ncode,${completionCode}\nurl,${completionURL}\nprolificWorkspace,${user.currentExperiment.prolificWorkspaceModeBool.toString()}`;
      if (incompatibleCompletionCode) {
        jsonString = `name,${
          user.currentExperiment.participantRecruitmentServiceName
        }\ncode,${completionCode}\nincompatible-completion-code,${incompatibleCompletionCode}\naborted-completion-code,${abortedCompletionCode}\nurl,${completionURL}\nprolificWorkspace,${user.currentExperiment.prolificWorkspaceModeBool.toString()}`;
      }

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

      return {
        code: completionCode,
        incompatibleCompletionCode,
        abortedCompletionCode,
      };
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
