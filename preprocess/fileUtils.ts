import { getAllUserAcceptableFileExtensions } from "./constants";
import { Buffer } from "buffer";
import * as XLSX from "xlsx";

/**
 * returns the substring after the last 'period' character in the file name
 * @param file
 * @returns file extension
 */
export const getFileExtensionFromFileName = (fileName: string): string => {
  const splitExt = fileName.split(".");
  if (splitExt.length === 1) return "";
  return splitExt[splitExt.length - 1].toLowerCase();
};

export const getFileExtension = (file: File): string => {
  return getFileExtensionFromFileName(file.name);
};

export const isAcceptableExtension = (ext: string) => {
  return getAllUserAcceptableFileExtensions().includes(ext);
};

/* -------------------------------------------------------------------------- */

/**
 * @param file
 * @returns file string content UTF-8 format
 */
export const getFileTextData = (file: File): Promise<string> => {
  return new Promise<string>((resolve) => {
    const fileReader = new FileReader();
    fileReader.onload = (e: any) => {
      resolve(e.target.result);
    };

    fileReader.onerror = (e: any) => {
      console.error("Unable to get TEXT data", file, e);
    };

    fileReader.readAsText(file, "UTF-8");
  });
};

export const readXLSXFile = async (file: Blob) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      try {
        if (!e || !e.target || !e.target.result) {
          throw new Error("Failed to read file content.");
        }

        const data = e.target.result;
        const arrayBuffer =
          typeof data === "string"
            ? new TextEncoder().encode(data).buffer
            : data;

        const workbook = XLSX.read(arrayBuffer, { type: "array" });

        const hasSheets = workbook.SheetNames && workbook.SheetNames.length > 0;
        if (!hasSheets) {
          throw new Error("No sheets found in the workbook.");
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const hasData = sheetData && sheetData.length > 0;
        if (!hasData) {
          throw new Error("No data found in the sheet.");
        }

        const fileContent = JSON.stringify(sheetData);
        resolve(fileContent);
      } catch (error) {
        reject(error);
      }
    };

    fileReader.onerror = (error) => {
      reject(error);
    };

    fileReader.readAsArrayBuffer(file);
  });
};

/**
 * @param file
 * @returns file string content base64 format
 */
export const getBase64Data = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);

    fileReader.onload = () => {
      if (
        typeof fileReader.result === "string" &&
        fileReader!.result!.includes(";base64,")
      ) {
        const splitResult = fileReader!.result!.split(";base64,");
        resolve(splitResult![1]);
      } else resolve(<string>fileReader.result);
    };

    fileReader.onerror = (e: any) => {
      console.error("Unable to get BINARY data", file, e);
    };
  });
};

/* -------------------------------------------------------------------------- */

// now only used for favicon.ico and SOUNDS
export const assetUsesBase64 = (filePath: string) => {
  return (
    filePath.includes(".ico") ||
    filePath.includes(".mp3") ||
    filePath.includes(".png") ||
    filePath.includes(".bin")
  );
};

export const getAssetFileContentBase64 = async (filePath: string) => {
  return await fetch(filePath)
    .then((response) => {
      return response.blob();
    })
    .then((blob) => {
      return new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(blob);
        fileReader.onload = function () {
          if (
            typeof fileReader.result === "string" &&
            fileReader!.result!.includes(";base64,")
          ) {
            const splitResult = fileReader!.result!.split(";base64,");
            resolve(splitResult![1]);
          } else resolve(<string>fileReader.result);
        };
      });
    })
    .catch((error) => {
      return error;
    });
};

export const getAssetFileContent = async (filePath: string) => {
  return await fetch(filePath)
    .then((response) => {
      return response.text();
    })
    .then((result) => {
      return result;
    })
    .catch((error) => {
      return error;
    });
};

/* -------------------------------------------------------------------------- */

/**
 * @param filePath absolute file path in repository
 * @returns URL-encoded string of given filePath
 */
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

export const getTextFileDataFromGitLab = (
  repoID: number,
  filePath: string,
  accessToken: string,
): Promise<string> => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise<string>(async (resolve) => {
    const headers: Headers = new Headers();
    headers.append("Authorization", `bearer ${accessToken}`);
    headers.append("Content-Type", "text/plain"); // useless?

    const requestOptions: any = {
      method: "GET",
      headers: headers,
      redirect: "follow",
    };

    const response = await fetch(
      `https://gitlab.pavlovia.org/api/v4/projects/${repoID}/repository/files/${encodeGitlabFilePath(
        filePath,
      )}/?ref=master`,
      requestOptions,
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

    const content = JSON.parse(response).content;
    const decodedContent = Buffer.from(content, "base64").toString("utf8");
    resolve(decodedContent);
  });
};

export const getBase64FileDataFromGitLab = (
  repoID: number,
  filePath: string,
  accessToken: string,
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
      requestOptions,
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
