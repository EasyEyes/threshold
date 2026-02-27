/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Buffer } from "buffer";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";
import Papa from "papaparse";
import { DataFrame } from "dataframe-js";
import * as XLSX from "xlsx";
import * as sentry from "../components/sentry";

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
const BASE_DELAY_SEC = 0.2;
const MAX_DELAY_SEC = 5;
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
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await attempt();
      await test(result);
      return result; // SUCCESS: return immediately, no delay
    } catch (error) {
      lastError = error;
      if (i === maxRetries - 1) {
        throw error; // Final retry exhausted
      }
      // Wait before NEXT retry
      if (withDelay) await wait(getRetryDelayMs(i));
    }
  }
  throw lastError;
};
export const getRetryDelayMs = (attempt: number) => {
  const delaySec = Math.min(
    BASE_DELAY_SEC * Math.pow(1.75, attempt),
    MAX_DELAY_SEC,
  );
  return delaySec * 1000;
};

const fetchAllPages = async (apiUrl: string, options: RequestInit) => {
  const responses: Response[] = [];
  const visitedUrls = new Set<string>();

  const url = new URL(apiUrl);
  if (!url.searchParams.has("per_page")) {
    url.searchParams.set("per_page", "100");
  }

  let nextUrl: string | null = url.toString();
  let pageCount = 0;
  const SAFETY_LIMIT = 10000;

  while (nextUrl) {
    if (visitedUrls.has(nextUrl)) {
      const error = new Error(
        `Infinite loop detected: revisited URL ${nextUrl}`,
      );
      sentry.captureError(error, "fetchAllPages infinite loop");
      throw error;
    }
    visitedUrls.add(nextUrl);

    pageCount++;
    if (pageCount >= SAFETY_LIMIT) {
      const error = new Error(
        `Safety limit reached: ${SAFETY_LIMIT} pages. This indicates an API malfunction.`,
      );
      sentry.captureError(error, "fetchAllPages safety limit");
      throw error;
    }

    // Manual retry logic for transient failures only
    let response: Response | null = null;
    let lastError: any = null;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res: Response = await fetch(nextUrl, options);

        if (!res.ok) {
          // Only retry specific transient errors
          if (res.status === 401 || res.status === 429 || res.status >= 500) {
            if (attempt < maxRetries - 1) {
              await wait(getRetryDelayMs(attempt));
              continue; // Retry
            }
          }
          if (res.status === 401) {
            throw new Error("AUTH_TOKEN_INVALID");
          }
          // Non-retryable error or max retries reached - throw immediately
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        response = res;
        break; // Success
      } catch (error) {
        lastError = error;
        // Network errors (CORS, timeout) - retry
        if (attempt < maxRetries - 1) {
          await wait(getRetryDelayMs(attempt));
        } else {
          throw error; // Max retries reached
        }
      }
    }

    if (!response) {
      throw lastError || new Error("Failed to fetch page");
    }

    responses.push(response);

    // Parse Link header for next page
    const linkHeader: string | null = response.headers.get("Link");
    nextUrl = null;
    if (linkHeader) {
      const links: string[] = linkHeader.split(",");
      for (const link of links) {
        const match: RegExpMatchArray | null = link.match(
          /<([^>]+)>;\s*rel="next"/,
        );
        if (match) {
          nextUrl = match[1];
          break;
        }
      }
    }
  }

  return responses;
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
    _stepperBool: false,
    _language: "English",
  };

  constructor(public accessToken: string) {
    this.accessToken = accessToken;
  }

  async initUserDetails(): Promise<void> {
    try {
      const response = await fetch(
        `https://gitlab.pavlovia.org/api/v4/user?access_token=${this.accessToken}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch user details: ${response.status}`);
      }
      const responseBody = await response.json();

      this.username = responseBody.username;
      this.name = responseBody.name;
      this.id = responseBody.id;
      this.avatar_url = responseBody.avatar_url;
    } catch (error) {
      console.error("Error loading user details:", error);
      throw error;
    }
  }

  async initProjectList(forceRefresh = false): Promise<void> {
    if (!this._projectListLoaded || forceRefresh) {
      this._projectListLoaded = true;
      const existingList: any[] = forceRefresh
        ? await this.projectList.catch(() => [])
        : [];
      this.projectList = getAllProjects(this, existingList);
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
 * Get all projects (ie repos) for the User.
 *
 * If an existing list of projects is provided, only fetch the projects absent
 * from that existing list. Projects are fetched in creation-date order (ie the
 * default), so missing projects (ie those created recently) are guaranteed to be
 * first.
 *
 * @param user queried user
 * @param oldProjectList [Optional]
 * @returns returns list of all gitlab projects created by user
 */
export const getAllProjects = async (
  user: User,
  oldProjectList: any[] = [],
) => {
  const oldProjectIds: Set<number> = new Set(
    oldProjectList.filter((p) => p).map((p) => p.id),
  );
  const projectList: any[] = [...oldProjectList];

  // get first page separately to fetch page count
  const firstResponse = await fetch(
    `https://gitlab.pavlovia.org/api/v4/users/${user.id}/projects?access_token=${user.accessToken}&per_page=100`,
  );

  // Filter out projects already in projectList, from being in oldProjectList
  const getNewProjects = (projectsData: any[]): any[] =>
    projectsData.filter(
      (proj) =>
        proj && proj.hasOwnProperty("id") && !oldProjectIds.has(proj.id),
    );
  // The case that we have some starting project list (ie we are updating the list), and we've caught up to the start
  // (ie most recent project aka project with largest id) of that starting list with this given projectsData (ie page of fetched projects).
  const isListAlreadyComplete = (projectsData: any[]): boolean =>
    !!oldProjectList.length &&
    projectsData
      .map((p: any) => String(p.id))
      .includes(String(Math.max(...oldProjectIds.values())));
  if (!firstResponse.ok) {
    throw new Error(
      `API error: ${firstResponse.status} ${firstResponse.statusText}`,
    );
  }
  const firstResponseData = await firstResponse.json();
  const newProjects = getNewProjects(firstResponseData);
  projectList.unshift(...newProjects);

  // If we were just trying to get the recent projects, and we have them, return the completed list
  if (isListAlreadyComplete(firstResponseData)) return projectList;

  // Otherwise go on and enumerate all the pages, to get a complete set
  // check if header is present
  const pageCountHeader = firstResponse.headers.get("x-total-pages");
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
    const response = paginationResponseList[idx];
    if (!response.ok) {
      throw new Error(
        `API error on page ${idx + 2}: ${response.status} ${
          response.statusText
        }`,
      );
    }
    const ithResponseData = await response.json();
    const uniqueProjects = getNewProjects(ithResponseData);
    projectList.push(...uniqueProjects);
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
    sentry.captureMessage(
      "isProjectNameExistInProjectList: projectList is not an array",
      "error",
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
  const response = await fetch(
    "https://gitlab.pavlovia.org/api/v4/projects?name=" +
      repoName +
      "&access_token=" +
      user.accessToken,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to create repository: ${response.status} ${
        response.statusText
      }. ${errorData.message || ""}`.trim(),
    );
  }

  const newRepoData = await response.json();

  if (!newRepoData.id) {
    throw new Error("Repository created but no ID returned");
  }

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
  // Replace spaces with underscores for readability
  name = name.replace(/\s+/g, "_");
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
): Promise<{ [key: string]: string[] | null }> => {
  const resolvedProjectList = await user.projectList;
  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    resolvedProjectList,
    resourcesRepoName,
  );

  if (!easyEyesResourcesRepo) {
    const emptyResources: { [key: string]: string[] | null } = {};
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

  const resourcesNameByType: { [key: string]: string[] | null } = {};

  for (const type of resourcesFileTypes) {
    try {
      const responses = await retryWithCondition(
        async () => {
          const apiUrl = `https://gitlab.pavlovia.org/api/v4/projects/${easyEyesResourcesRepo.id}/repository/tree/?path=${type}`;
          return fetchAllPages(apiUrl, requestOptions);
        },
        async (responses) => {
          if (!responses.every((res: Response) => res.ok)) {
            throw new Error(`Failed to fetch resources for type: ${type}`);
          }
        },
        5,
        true,
      );

      const allData = await Promise.all(
        responses.map((res: Response) => res.json()),
      );
      const typeList = allData.flat();
      resourcesNameByType[type] = typeList.map((t: any) => t.name);
    } catch (error) {
      console.warn(`Failed to fetch resources for type ${type}:`, error);
      resourcesNameByType[type] = null; // Indicate fetch failure
    }
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

      try {
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
          const responses = await fetchAllPages(url, requestOptions);
          const allData = await Promise.all(responses.map((res) => res.json()));
          const files = allData.flat();

          for (const file of files) {
            const fileName = file?.name;
            if (!fileName) {
              continue;
            }

            const resourcesRepoFilePath = encodeGitlabFilePath(
              `${type}/${fileName}`,
            );
            let content: string = "";
            let lastError: any;
            const maxRetries = 3;
            for (let attempt = 0; attempt < maxRetries; attempt++) {
              try {
                content =
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
                break; // success
              } catch (error) {
                lastError = error;
                if (attempt === maxRetries - 1) {
                  console.warn(
                    `Failed to fetch ${fileName} after ${maxRetries} attempts:`,
                    error,
                  );
                } else {
                  await wait(getRetryDelayMs(attempt));
                }
              }
            }
            if (!content) {
              // If still no content, skip file
              continue;
            }
            if (
              content?.trim().indexOf(`{"message":"404 File Not Found"}`) !== -1
            )
              continue;
            zip.file(fileName, content, { base64: type !== "texts" });
          }
        }

        zip
          .generateAsync({ type: "blob" })
          .then((zipBlob) => {
            saveAs(zipBlob, `${experimentFileName}.export.zip`);
            Swal.close();
          })
          .catch((error) => {
            Swal.close();
            Swal.fire({
              icon: "error",
              title: "Export Failed",
              text: "Could not create export file. Please refresh the page and try again.",
              confirmButtonColor: "#666",
            });
            sentry.captureError(
              error,
              "downloadCommonResources zip generation failed",
            );
          });
      } catch (error) {
        Swal.close();
        Swal.fire({
          icon: "error",
          title: "Export Failed",
          text: "Could not fetch resources from GitLab. This may be due to network issues or expired credentials. Please refresh the page and try again.",
          confirmButtonColor: "#666",
        });
        sentry.captureError(error, "downloadCommonResources fetch failed");
      }
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
        sentry.captureError(error);
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

    const responses = await fetchAllPages(apiUrl.toString(), {
      method: "GET",
      headers,
      redirect: "follow",
    });

    if (!responses.every((res) => res.ok)) {
      // TODO make more robust
      const errorData = await Promise.all(
        responses.map((res) =>
          res.json().catch(() => ({ message: "Unknown error" })),
        ),
      );
      throw new GitLabAPIError(
        `GitLab API request failed while getting files from repository ${repoId}: ${errorData
          .map((d) => d.message)
          .join(", ")}`,
      );
    }

    const allData = await Promise.all(responses.map((resp) => resp.json()));
    const tree: GitLabItem[] = allData.flat();
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
    throw new Error(
      `In deleteAllFilesInRepo::attempt::Failed to delete files from repo ${repo.id}`,
    );
  };
  const test = async (files: Array<GitLabBlob>) => {
    if (files && files.length) throw files;
    const fetchedFiles = await getFilesFromRepo(user, repo.id, "", ignorePath);
    const unexcused = [
      ...fetchedFiles.filter((o) => !new RegExp("^" + ignorePath).test(o.path)),
    ];
    if (unexcused.length)
      throw new Error(
        `In deleteAllFilesInRepo::test::Failed to delete ${unexcused.length} files from repo ${repo.id}`,
      );
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

  try {
    const apiUrl = `https://gitlab.pavlovia.org/api/v4/projects/${repo.id}/repository/tree/?path=%2E`;
    const responses = await fetchAllPages(apiUrl, requestOptions);

    if (!responses.every((res) => res.ok)) {
      throw new Error("Failed to fetch project files");
    }

    const allData = await Promise.all(responses.map((res) => res.json()));
    const fileList = allData.flat();

    const originalFile = fileList.find(
      (i: any) =>
        (i.name.includes(".csv") || i.name.includes(".xlsx")) &&
        i.name !== "recruitmentServiceConfig.csv",
    );

    return originalFile?.name;
  } catch (error) {
    sentry.captureError(error, "Error fetching original file name:");
    return "";
  }
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
      sentry.captureError(error);
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
      sentry.captureError(error);
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
        sentry.captureError(error, "Error parsing CSV content:");
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

    // Only save if the download modal is still visible (not cancelled)
    if (Swal.isVisible()) {
      newZip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, fileName);
      });
    }
  } catch (error) {
    sentry.captureError(error, "Error splitting CSV and zipping:");
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

  const result = await Swal.fire({
    title: `Downloading data from\n${project.name}`,
    width: "800px",
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: true,
    confirmButtonText: "Cancel",
    confirmButtonColor: "#d33",
    showCancelButton: false,
    didOpen: async () => {
      Swal.showLoading();

      let currentPage = 1;
      let allData: any[] = [];
      let zipFileDate;
      let downloadCancelled = false;

      const pavloviaExperimentInfoAPI = `https://pavlovia.org/api/v2/experiments/${project.id}`;

      const pavloviaInfo = await fetch(
        pavloviaExperimentInfoAPI,
        pavloviaRequestOptions,
      )
        .then((response) => response.json())
        .catch((error) => {
          sentry.captureError(error, "Error fetching data:");
          return null;
        });

      if (pavloviaInfo && pavloviaInfo?.experiment?.saveFormat === "DATABASE") {
        // Check if user cancelled download
        if (!Swal.isVisible()) {
          return; // Exit download process
        }

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
                sentry.captureError(error, "Error fetching data:");
                return null;
              });
            if (!result) {
              Swal.close();

              // Start download immediately with cancel option
              Swal.fire({
                title: `No data yet for\n${project.name}.\nCreating an empty *.results.zip archive.`,
                width: "800px",
                html: `<p>Creating empty archive...</p>
                       <progress id="progress-bar" max="100" value="0"></progress>`,
                showConfirmButton: true,
                confirmButtonText: "Cancel",
                confirmButtonColor: "#666",
                showCancelButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                  const progressBar = document.getElementById(
                    "progress-bar",
                  ) as HTMLProgressElement;
                  const emptyZip = new JSZip();
                  const zipFileName = `${project.name}.results.zip`;

                  setTimeout(() => {
                    if (Swal.isVisible() && progressBar) {
                      progressBar.value = 50;
                    }
                  }, 500);

                  setTimeout(() => {
                    if (Swal.isVisible() && progressBar) {
                      progressBar.value = 100;
                      setTimeout(() => {
                        if (Swal.isVisible()) {
                          emptyZip
                            .generateAsync({ type: "blob" })
                            .then((content) => {
                              saveAs(content, zipFileName);
                              Swal.close();
                            });
                        }
                      }, 200);
                    }
                  }, 1000);
                },
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
          if (fileContent && Swal.isVisible()) {
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
          sentry.captureError(error, "Error downloading or processing file:");
        }

        Swal.close();
      } else {
        let pageSafety = 0;
        const maxPages = 1000;
        while (true) {
          // Check if user cancelled download
          if (!Swal.isVisible()) {
            return; // Exit download process
          }

          const apiUrl = `https://gitlab.pavlovia.org/api/v4/projects/${project.id}/repository/tree/?path=data&per_page=${perPage}&page=${currentPage}`;

          const dataFolder = await fetch(apiUrl, requestOptions)
            .then((response) => response.json())
            .catch((error) => {
              sentry.captureError(
                error,
                "downloadDataFolder::didOpen Error fetching data:",
              );
              return null;
            });

          if (!dataFolder || dataFolder.length === 0) {
            break;
          }

          allData = allData.concat(dataFolder);
          currentPage += 1;
          pageSafety += 1;
          if (pageSafety >= maxPages) break;
        }

        if (allData.length === 0) {
          Swal.close();

          Swal.fire({
            title: `No data yet for\n${project.name}.\nCreating an empty *.results.zip archive.`,
            width: "800px",
            html: `<p>Creating empty archive...</p>
                   <progress id="progress-bar" max="100" value="0"></progress>`,
            showConfirmButton: true,
            confirmButtonText: "Cancel",
            confirmButtonColor: "#666",
            showCancelButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
              const progressBar = document.getElementById(
                "progress-bar",
              ) as HTMLProgressElement;
              const emptyZip = new JSZip();
              const zipFileName = `${project.name}.results.zip`;

              setTimeout(() => {
                if (Swal.isVisible() && progressBar) {
                  progressBar.value = 50;
                }
              }, 500);

              setTimeout(() => {
                if (Swal.isVisible() && progressBar) {
                  progressBar.value = 100;

                  setTimeout(() => {
                    if (Swal.isVisible()) {
                      emptyZip
                        .generateAsync({ type: "blob" })
                        .then((content) => {
                          saveAs(content, zipFileName);
                          Swal.close();
                        });
                    }
                  }, 200);
                }
              }, 1000);
            },
          });
          return;
        }

        const zip = new JSZip();
        let currentIndex = 0;
        const skippedFiles: string[] = [];

        for (const file of allData) {
          // Check if user cancelled download
          if (!Swal.isVisible()) {
            return; // Exit download process
          }

          const fileName = file.name;
          if (fileName.endsWith(".gz")) continue;
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

          let fileContent;
          let lastError;
          const maxRetries = 3;
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              const response = await fetch(
                `https://gitlab.pavlovia.org/api/v4/projects/${project.id}/repository/blobs/${file.id}`,
                requestOptions,
              );
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const result = await response.json();
              fileContent = Buffer.from(result.content, "base64");
              break;
            } catch (error) {
              lastError = error;
              if (attempt === maxRetries - 1) {
                console.warn(
                  `Failed to fetch ${fileName} after ${maxRetries} attempts:`,
                  error,
                );
              } else {
                await wait(getRetryDelayMs(attempt));
              }
            }
          }
          if (!fileContent) {
            // skip this file
            console.warn(`Skipping ${fileName} after ${maxRetries} attempts`);
            skippedFiles.push(fileName);
            continue;
          }

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

        if (Swal.isVisible()) {
          zip.generateAsync({ type: "blob" }).then((content) => {
            saveAs(content, zipFileName);
            Swal.close();

            // Show warning if some files were skipped
            if (skippedFiles.length > 0) {
              Swal.fire({
                icon: "warning",
                title: "Download Incomplete",
                html: `Downloaded with ${
                  skippedFiles.length
                } file(s) skipped due to network errors.<br><br>Skipped: ${skippedFiles
                  .slice(0, 5)
                  .join(", ")}${skippedFiles.length > 5 ? "..." : ""}`,
                confirmButtonColor: "#666",
              });
            }
          });
        }
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

  let pageSafety = 0;
  const maxPages = 1000;
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
        sentry.captureError(error, "Error fetching data:");
        return null;
      });

    if (!dataFolder || dataFolder.length === 0) {
      break;
    }
    console.log(dataFolder);
    allData = allData.concat(dataFolder);
    currentPage += 1;
    pageSafety += 1;
    if (pageSafety >= maxPages) break;
  }
  console.log(allData);

  return allData;
};

export const getDataFolderCsvLength = async (user: User, project: any) => {
  let dataFolder = await getdataFolder(user, project);
  // Use project.last_activity_at as the last date
  let latestDate: Date | false = false;
  if (project.last_activity_at) {
    latestDate = new Date(project.last_activity_at);
  }

  // --- Old filename date parsing logic (commented out) ---
  /*
  let latestDate: Date | false = false;
  for (const file of dataFolder) {
    const fileName = file.name;
    const fileNameParts = fileName.split("_");
    let datePart = "";
    let timePart = "";
    const dateIndex = fileNameParts.findIndex((part: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(part),
    );
    if (dateIndex !== -1 && dateIndex < fileNameParts.length - 1) {
      datePart = fileNameParts[dateIndex];
      const nextPart = fileNameParts[dateIndex + 1];
      if (/^\d+h/.test(nextPart)) {
        timePart = nextPart.split(".")[0].replace("h", ":");
      }
    }
    if (!datePart || !timePart) {
      console.warn(`Could not parse date/time from filename: ${fileName}`);
      continue;
    }
    const dateString = `${datePart} ${timePart}`;
    const currentDate = new Date(dateString);
    if (isNaN(currentDate.getTime())) {
      console.warn(
        `Invalid date parsed from filename: ${fileName}, dateString: ${dateString}`,
      );
      continue;
    }
    if (!latestDate || currentDate > latestDate) {
      latestDate = currentDate;
    }
  }
  */

  // Format the latest date for display, or return false if no valid date found
  // const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let formattedLatestDate = latestDate
    ? latestDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        // timeZone: userTimeZone,
        timeZoneName: "longOffset",
        hour: "numeric",
        minute: "numeric",
      })
    : false;
  if (formattedLatestDate && typeof formattedLatestDate === "string") {
    formattedLatestDate = formattedLatestDate.replace(
      /GMT([+-]\d{2}:\d{2})/,
      "UTC$1",
    );
  }

  dataFolder = dataFolder.filter((file: { name: string }) =>
    file.name.includes("csv"),
  );
  return dataFolder ? [dataFolder.length, formattedLatestDate] : [0, false];
};

export const createResourcesRepo = async (user: User): Promise<Repository> => {
  const commonResourcesRepo = await createEmptyRepo(resourcesRepoName, user);
  if (!commonResourcesRepo)
    throw new Error(
      `Failed to create common resources repo, createResourcesRepo (1).`,
    );
  await user.initProjectList(true); // Update projectList
  const newProjectList = await user.projectList;
  if (!newProjectList)
    throw new Error(
      `Failed to create common resources repo, createResourcesRepo (2).`,
    );
  const easyEyesResourcesRepo = getProjectByNameInProjectList(
    // Confirm the resources repo now exists
    newProjectList,
    resourcesRepoName,
  );
  if (!easyEyesResourcesRepo)
    throw new Error(
      `Failed to create common resources repo, createResourcesRepo (3).`,
    );
  return easyEyesResourcesRepo;
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
  let easyEyesResourcesRepo: any = getProjectByNameInProjectList(
    resolvedProjectList,
    resourcesRepoName,
  );
  if (!easyEyesResourcesRepo) {
    await retryWithCondition(
      async () => await createResourcesRepo(user),
      async (easyEyesResourcesRepo) => {
        if (
          isProjectNameExistInProjectList(
            easyEyesResourcesRepo,
            resourcesRepoName,
          )
        )
          return true;
        throw new Error(
          "Test condition failed, createOrUpdateCommonResources->createResourcesRepo.",
        );
      },
    );
    // Re-fetch the repository after creation
    const updatedProjectList = await user.projectList;
    easyEyesResourcesRepo = getProjectByNameInProjectList(
      updatedProjectList,
      resourcesRepoName,
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

  const isTargetSoundListFile = (file: File): boolean => {
    return file.name.match(/\.targetSoundList\.(xlsx|csv)$/i) !== null;
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
    } else if (type === "targetSoundLists") {
      filesOfType = resourceFileList.filter(
        (file) =>
          isTargetSoundListFile(file) &&
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
        action: (prevResourcesList[type] ?? []).includes(file.name)
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
 * Error thrown when the commit payload is too large (413) and
 * the caller should split the batch into smaller chunks.
 */
class PayloadTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

const PUSH_COMMITS_MAX_RETRIES = 5;

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

  const url = `https://gitlab.pavlovia.org/api/v4/projects/${repo.id}/repository/commits?access_token=${user.accessToken}`;
  const body = JSON.stringify(commitBody);

  for (let attempt = 0; attempt < PUSH_COMMITS_MAX_RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } catch (networkError) {
      // Network failure (offline, DNS, etc.) — retry
      if (attempt === PUSH_COMMITS_MAX_RETRIES - 1) {
        Swal.close();
        Swal.fire({
          icon: "error",
          title: `Uploading failed.`,
          text: `Network error while uploading files. Please check your connection and try again.`,
          confirmButtonColor: "#666",
        });
        throw networkError;
      }
      await wait(getRetryDelayMs(attempt));
      continue;
    }

    if (response.ok) {
      return await response.json();
    }

    const status = response.status;

    // 413 — payload too large, signal caller to split batch
    if (status === 413) {
      throw new PayloadTooLargeError(
        `Commit payload too large (${commits.length} actions). Split into smaller batches.`,
      );
    }

    // 401 — unauthorized, no token refresh available, fail immediately
    if (status === 401) {
      const errorData = await response.json().catch(() => ({}));
      Swal.close();
      Swal.fire({
        icon: "error",
        title: `Authentication failed.`,
        text: `Your session may have expired. Please refresh the page and sign in again.`,
        confirmButtonColor: "#666",
      });
      throw new GitLabAPIError(
        `Upload failed: 401 Unauthorized. ${errorData.message || ""}`,
        401,
      );
    }

    // 429, 500, 502, 503 — transient, retry with backoff
    if ([429, 500, 502, 503].includes(status)) {
      if (attempt === PUSH_COMMITS_MAX_RETRIES - 1) {
        const errorData = await response.json().catch(() => ({}));
        Swal.close();
        Swal.fire({
          icon: "error",
          title: `Uploading failed.`,
          text: `Failed to upload files to GitLab: ${status} ${
            response.statusText
          }. ${errorData.message || "Please try again."}`,
          confirmButtonColor: "#666",
        });
        throw new GitLabAPIError(`Upload failed: ${status}`, status);
      }

      // Use Retry-After header if available (for 429), else exponential backoff
      const retryAfter = response.headers.get("Retry-After");
      const delayMs = retryAfter
        ? parseFloat(retryAfter) * 1000
        : getRetryDelayMs(attempt);
      await wait(delayMs);
      continue;
    }

    // Other errors — fail immediately
    const errorData = await response.json().catch(() => ({}));
    Swal.close();
    Swal.fire({
      icon: "error",
      title: `Uploading failed.`,
      text: `Failed to upload files to GitLab: ${status} ${
        response.statusText
      }. ${errorData.message || "Please try again."}`,
      confirmButtonColor: "#666",
    });
    throw new GitLabAPIError(`Upload failed: ${status}`, status);
  }
};

/**
 * Estimates the JSON payload size of an array of commit actions in bytes.
 */
const estimateCommitActionsSize = (actions: ICommitAction[]): number => {
  let size = 0;
  for (const action of actions) {
    // Content is the bulk of the payload
    size += action.content?.length ?? 0;
    // Add overhead for file_path, action type, encoding, JSON structure
    size += (action.file_path?.length ?? 0) + 100;
  }
  return size;
};

/**
 * Splits commit actions into chunks that each target under maxChunkBytes.
 * Falls back to ensuring at least 1 action per chunk.
 */
const splitCommitActionsBySize = (
  actions: ICommitAction[],
  maxChunkBytes: number = 15 * 1024 * 1024, // 15MB conservative limit
): ICommitAction[][] => {
  if (actions.length === 0) return [];

  const totalSize = estimateCommitActionsSize(actions);
  if (totalSize <= maxChunkBytes) return [actions];

  const chunks: ICommitAction[][] = [];
  let currentChunk: ICommitAction[] = [];
  let currentSize = 0;

  for (const action of actions) {
    const actionSize =
      (action.content?.length ?? 0) + (action.file_path?.length ?? 0) + 100;

    if (currentChunk.length > 0 && currentSize + actionSize > maxChunkBytes) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }

    currentChunk.push(action);
    currentSize += actionSize;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
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
  user: User,
) => {
  const res: ICommitAction[] = [];

  for (let i = startIndex; i <= endIndex; i++) {
    let path = _loadFiles[i];
    let filePath = path;

    // Skip experimentLanguage.js - it's handled separately by getGitlabBodyForExperimentLanguage
    if (path === "js/experimentLanguage.js") {
      continue;
    }

    if (path === "index.html") {
      filePath = user.currentExperiment?._stepperBool
        ? "index.html"
        : "index-stepper-bool.html";
    }

    const content = assetUsesBase64(filePath)
      ? await getAssetFileContentBase64(_loadDir + filePath)
      : await getAssetFileContent(_loadDir + filePath);
    res.push({
      action: "create",
      file_path: path,
      content,
      encoding: assetUsesBase64(filePath) ? "base64" : "text",
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
  } catch (error) {
    sentry.captureError(
      error,
      "Error fetching Netlify site data for compiler update date: ",
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

export const getGitlabBodyForExperimentLanguage = (language: string) => {
  const res: ICommitAction[] = [];
  const content = `const experimentLanguage = "${language}"`;
  res.push({
    action: "create",
    file_path: "js/experimentLanguage.js",
    content,
    encoding: "text",
  });
  return res;
};

// helper
export const updateSwalUploadingCount = (count: number, totalCount: number) => {
  const progressCount = document.getElementById("uploading-count");

  if (progressCount)
    (progressCount as HTMLSpanElement).innerHTML = `${Math.round(
      Math.min((count + 1) / (totalCount + 1), 1) * 100,
    )}`;
};

/**
 * Gathers all threshold core file commit actions (without committing).
 * Calls onFileReady() for each file prepared, to drive progress reporting.
 */
export const gatherThresholdCoreFileActions = async (
  user: User,
  onFileReady?: () => void,
): Promise<ICommitAction[]> => {
  const allActions: ICommitAction[] = [];

  // Core threshold files
  const coreActions = await getGitlabBodyForThreshold(
    0,
    _loadFiles.length - 1,
    user,
  );
  allActions.push(...coreActions);
  for (let i = 0; i < coreActions.length; i++) onFileReady?.();

  // Compatibility requirements file
  const compatActions = await getGitlabBodyForCompatibilityRequirementFile(
    compatibilityRequirements.parsedInfo,
  );
  allActions.push(...compatActions);
  onFileReady?.();

  // Typekit kit file
  if (typekit.kitId !== "") {
    const typekitActions = await getGitlabBodyForTypekitKit(typekit.kitId);
    allActions.push(...typekitActions);
    onFileReady?.();
  }

  // Duration file
  const durationActions = getGitlabBodyForDurationText(durations);
  allActions.push(...durationActions);
  onFileReady?.();

  // Experiment language file
  const experimentLanguage = user.currentExperiment?._language ?? "English";
  const langActions = getGitlabBodyForExperimentLanguage(experimentLanguage);
  allActions.push(...langActions);
  onFileReady?.();

  return allActions;
};

/**
 * @deprecated Use gatherThresholdCoreFileActions + pushCommits instead.
 * Kept for backward compatibility with tests.
 */
export const createThresholdCoreFilesOnRepo = async (
  gitlabRepo: Repository,
  user: User,
  uploadedFileCount: { current: number },
  totalFileCount: number,
): Promise<any> => {
  totalFileCount += 3; // compatibility, duration, experimentLanguage
  const actions = await gatherThresholdCoreFileActions(user, () => {
    uploadedFileCount.current++;
    updateSwalUploadingCount(uploadedFileCount.current, totalFileCount);
  });
  const result = await pushCommits(
    user,
    gitlabRepo,
    actions,
    commitMessages.thresholdCoreFileUploaded,
    defaultBranch,
  );
  return [result];
};

/**
 * Gathers user-uploaded file commit actions (without committing).
 */
const gatherUserUploadedFileActions = async (
  repoFiles: ThresholdRepoFiles,
  onFileReady?: () => void,
): Promise<ICommitAction[]> => {
  const commitActionList: ICommitAction[] = [];

  // add experiment file to root
  let fileData = "";
  if (repoFiles.experiment!.name.includes(".csv")) {
    fileData = await getFileTextData(repoFiles.experiment!);
  } else {
    fileData = (await readXLSXFile(repoFiles.experiment!)) as string;
  }

  commitActionList.push({
    action: "create",
    file_path: repoFiles.experiment!.name,
    content: fileData as string,
  });
  onFileReady?.();

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
    onFileReady?.();
  }

  return commitActionList;
};

/**
 * Gathers resource file commit actions (without committing).
 * Fetches resource content from EasyEyesResources repo or archive.
 */
const gatherRequestedResourceActions = async (
  user: User,
  isCompiledFromArchiveBool: boolean,
  archivedZip: any,
  onFileReady?: () => void,
): Promise<ICommitAction[]> => {
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
  let easyEyesResourcesRepo = getProjectByNameInProjectList(
    resolvedProjectList,
    "EasyEyesResources",
  );
  if (!easyEyesResourcesRepo) {
    await retryWithCondition(
      async () => await createResourcesRepo(user),
      async (repo) => {
        if (isProjectNameExistInProjectList(repo, resourcesRepoName))
          return true;
        throw new Error(
          "Test condition failed, createOrUpdateCommonResources->createResourcesRepo.",
        );
      },
    );
    const updatedProjectList = await user.projectList;
    easyEyesResourcesRepo = getProjectByNameInProjectList(
      updatedProjectList,
      resourcesRepoName,
    );
  }

  const commitActionList: ICommitAction[] = [];

  const resourceTypeMap: Record<string, string[]> = {
    fonts: userRepoFiles.requestedFonts,
    forms: userRepoFiles.requestedForms,
    texts: userRepoFiles.requestedTexts,
    folders: userRepoFiles.requestedFolders || [],
    images: userRepoFiles.requestedImages || [],
    code: userRepoFiles.requestedCode || [],
    impulseResponses: userRepoFiles.requestedImpulseResponses || [],
    frequencyResponses: userRepoFiles.requestedFrequencyResponses || [],
    targetSoundLists: userRepoFiles.requestedTargetSoundLists || [],
  };

  for (const [resourceType, requestedFiles] of Object.entries(
    resourceTypeMap,
  )) {
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
      onFileReady?.();
    }
  }

  return commitActionList;
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
  const { repo: newRepo, deleteActions } =
    await _createExperimentTask_prepareRepo(user, projectName);
  if (!newRepo) {
    return false;
  }
  // UPLOAD FILES (with delete actions folded in for atomic repo replacement)
  const successful = await _createExperimentTask_uploadFiles(
    user,
    newRepo,
    projectName,
    isCompiledFromArchiveBool,
    archivedZip,
    deleteActions,
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
/**
 * Prepares the repo for upload. For new repos, creates an empty repo.
 * For reused repos, returns the repo and delete actions for old files
 * (to be combined with create actions in a single atomic commit).
 */
const _createExperimentTask_prepareRepo = async (
  user: User,
  projectName: string,
): Promise<{ repo: any; deleteActions: ICommitAction[] }> => {
  const resolvedProjectList = await user.projectList;
  const projectExists = await isProjectNameExistInProjectList(
    user.projectList,
    projectName,
  );

  if (user.currentExperiment._pavloviaNewExperimentBool || !projectExists) {
    const newRepo = await createEmptyRepo(projectName, user);
    return { repo: newRepo, deleteActions: [] };
  }

  // Reusing existing repo — gather delete actions for old files (except data/)
  const newRepo = getProjectByNameInProjectList(
    resolvedProjectList,
    projectName,
  );
  const existingFiles = await getFilesFromRepo(user, newRepo.id, "", "data");
  const deleteActions: ICommitAction[] = existingFiles.map((file) => ({
    action: "delete" as const,
    file_path: file.path,
  }));

  return { repo: newRepo, deleteActions };
};
const _createExperimentTask_uploadFiles = async (
  user: User,
  newRepo: any,
  projectName: string,
  isCompiledFromArchiveBool: boolean,
  archivedZip: any,
  deleteActions: ICommitAction[],
  callback: (newRepo: any, experimentUrl: string, serviceUrl: string) => void,
) => {
  // Estimate total file count for progress
  const totalFileCount =
    _loadFiles.length +
    3 + // compatibility, duration, experimentLanguage
    (typekit.kitId !== "" ? 1 : 0) +
    1 + // experiment file
    userRepoFiles.blockFiles.length +
    userRepoFiles.requestedFonts.length +
    userRepoFiles.requestedForms.length +
    userRepoFiles.requestedTexts.length +
    (userRepoFiles.requestedFolders?.length ?? 0) +
    (userRepoFiles.requestedImages?.length ?? 0) +
    (userRepoFiles.requestedCode?.length ?? 0);

  let preparedCount = 0;

  const reportPrepareProgress = () => {
    preparedCount++;
    updateSwalUploadingCount(
      Math.floor((preparedCount / totalFileCount) * 50), // 0-50% for preparation
      100,
    );
  };

  try {
    // @ts-ignore
    Swal.showLoading();

    // Phase 1: Gather all commit actions
    _reportCreatePavloviaExperimentCurrentStep("Preparing files ...", true);

    const [coreActions, userActions, resourceActions] = await Promise.all([
      gatherThresholdCoreFileActions(user, reportPrepareProgress),
      gatherUserUploadedFileActions(userRepoFiles, reportPrepareProgress),
      gatherRequestedResourceActions(
        user,
        isCompiledFromArchiveBool,
        archivedZip,
        reportPrepareProgress,
      ),
    ]);

    // Combine: delete old files (if reusing repo) + create all new files
    const allActions: ICommitAction[] = [
      ...deleteActions,
      ...coreActions,
      ...userActions,
      ...resourceActions,
    ];

    // Phase 2: Upload in as few commits as possible
    _reportCreatePavloviaExperimentCurrentStep("Uploading ...", true);
    updateSwalUploadingCount(50, 100); // Start upload phase at 50%

    const chunks = splitCommitActionsBySize(allActions);
    for (let i = 0; i < chunks.length; i++) {
      await pushCommits(
        user,
        { id: newRepo.id },
        chunks[i],
        deleteActions.length > 0
          ? "♻️ replace experiment files"
          : commitMessages.thresholdCoreFileUploaded,
        defaultBranch,
      );
      // Progress from 50% to 100% across chunks
      updateSwalUploadingCount(
        50 + Math.floor(((i + 1) / chunks.length) * 50),
        100,
      );
    }

    await setExperimentSaveFormat(user, newRepo);

    const expUrl = `https://run.pavlovia.org/${user.username}/${projectName}`;
    const serviceUrl =
      user.currentExperiment.participantRecruitmentServiceName == "Prolific"
        ? expUrl +
          "?participant={{%PROLIFIC_PID%}}&study_id={{%STUDY_ID%}}&session={{%SESSION_ID%}}"
        : expUrl;

    callback(
      newRepo,
      `https://run.pavlovia.org/${user.username}/${projectName}`,
      serviceUrl,
    );
    return true;
  } catch (error) {
    sentry.captureError(
      error,
      `[createExperimentTask_uploadFiles] Failed to upload files.`,
    );
    return false;
  }
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

  try {
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
        if (!result) throw new Error("Experiment creation failed");
      },
      MAX_RETRIES,
      false,
    );

    if (!result) {
      Swal.fire({
        icon: "error",
        title: `Failed to create Pavlovia experiment.`,
        text: `We ran into trouble creating your experiment. Please try refreshing the page and starting again.`,
        confirmButtonColor: "#666",
      });
    }
  } catch (error) {
    Swal.close(); // Close any loading modals
    Swal.fire({
      icon: "error",
      title: `Failed to create Pavlovia experiment.`,
      text: `We ran into trouble creating your experiment. This may be due to network issues or the project already existing. Please try refreshing the page and starting again.`,
      confirmButtonColor: "#666",
    });
    sentry.captureError(error, "createPavloviaExperiment failed");
  }
};

/* -------------------------------------------------------------------------- */

export const runExperiment = async (
  user: User,
  newRepo: Repository,
  experimentUrl: string,
) => {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
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

      if (running.ok) {
        return await running.json();
      }

      // Transient server errors — retry
      if ([500, 502, 503, 429].includes(running.status)) {
        if (attempt < maxRetries - 1) {
          await wait(getRetryDelayMs(attempt));
          continue;
        }
      }

      // Non-retryable error or retries exhausted
      const errorData = await running.json().catch(() => ({}));
      await Swal.fire({
        icon: "error",
        title: `Failed to change mode.`,
        text: `We failed to change your experiment mode to RUNNING (${
          running.status
        }). ${
          errorData.message ||
          "Please try to refresh the status in a while, or refresh the page to start again."
        }`,
        confirmButtonColor: "#666",
      });
      return null;
    } catch (error) {
      if (attempt < maxRetries - 1) {
        await wait(getRetryDelayMs(attempt));
        continue;
      }
      await Swal.fire({
        icon: "error",
        title: `Failed to change mode.`,
        text: `We failed to change your experiment mode to RUNNING. There might be a problem when uploading it, or the Pavlovia server is down. Please try to refresh the status in a while, or refresh the page to start again.`,
        confirmButtonColor: "#666",
      });
      return null;
    }
  }
  return null;
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
        sentry.captureError(error);
      })) || "";

  if (response.includes("404 File Not Found")) return "";
  return response;
};
