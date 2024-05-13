export const resourcesRepoName = "EasyEyesResources";

export const resourcesFileTypes: string[] = [
  "fonts",
  "forms",
  "texts",
  "folders",
  "images",
  "code",
];

export interface IUserFileTypes {
  [key: string]: string[];
  experiments: string[];
  fonts: string[];
  forms: string[];
  texts: string[];
  folders: string[];
  images: string[];
  code: string[];
}

export const acceptableExtensions: IUserFileTypes = {
  experiments: ["csv", "xlsx"],
  fonts: ["woff", "woff2", "otf", "ttf", "svg"],
  forms: ["md", "pdf"],
  texts: ["txt"],
  folders: ["zip"], // ?
  images: ["png", "jpg", "svg"],
  code: ["js"],
};

export const getAllUserAcceptableFileExtensions = (): string[] => {
  return [
    ...acceptableExtensions.experiments,
    ...acceptableExtensions.fonts,
    ...acceptableExtensions.forms,
    ...acceptableExtensions.texts,
    ...acceptableExtensions.folders,
    ...acceptableExtensions.images,
    ...acceptableExtensions.code,
  ];
};

export const getAllUserAcceptableResourcesExtensions = (): string[] => {
  return [
    ...acceptableExtensions.fonts,
    ...acceptableExtensions.forms,
    ...acceptableExtensions.texts,
    ...acceptableExtensions.folders,
    ...acceptableExtensions.images,
    ...acceptableExtensions.code,
  ];
};

export const acceptableResourcesExtensionsOfTextDataType: string[] = [
  "md",
  "txt",
];

export interface ThresholdRepoFiles {
  experiment: File | null;
  blockFiles: File[];
  fonts: File[];
  forms: File[];
  texts: File[];
  folders: File[];
  images: File[];
  code: File[];
  requestedForms: string[];
  requestedFonts: string[];
  requestedTexts: string[];
  requestedFolders: string[];
  requestedImages: string[];
  requestedCode: string[];
}

export const userRepoFiles: ThresholdRepoFiles = {
  experiment: null,
  blockFiles: [],
  fonts: [],
  forms: [],
  texts: [],
  folders: [],
  images: [],
  code: [],
  requestedForms: [],
  requestedFonts: [],
  requestedTexts: [],
  requestedFolders: [],
  requestedImages: [],
  requestedCode: [],
};
