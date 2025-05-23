export const resourcesRepoName = "EasyEyesResources";

export const resourcesFileTypes: string[] = [
  "fonts",
  "forms",
  "texts",
  "folders",
  "images",
  "code",
  "impulseResponses",
  "frequencyResponses",
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
  impulseResponses: string[];
  frequencyResponses: string[];
}

export const acceptableExtensions: IUserFileTypes = {
  experiments: ["csv", "xlsx"],
  fonts: ["woff", "woff2", "otf", "ttf", "svg"],
  forms: ["md", "pdf"],
  texts: ["txt"],
  folders: ["zip"], // ?
  images: ["png", "jpg", "svg", "jpeg"],
  code: ["js"],
  impulseResponses: ["csv", "xlsx"],
  frequencyResponses: ["csv", "xlsx"],
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
    ...acceptableExtensions.impulseResponses,
    ...acceptableExtensions.frequencyResponses,
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
    ...acceptableExtensions.impulseResponses,
    ...acceptableExtensions.frequencyResponses,
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
  impulseResponses: File[];
  frequencyResponses: File[];
  requestedForms: string[];
  requestedFonts: string[];
  requestedTexts: string[];
  requestedFolders: string[];
  requestedImages: string[];
  requestedCode: string[];
  requestedImpulseResponses: string[];
  requestedFrequencyResponses: string[];
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
  impulseResponses: [],
  frequencyResponses: [],
  requestedForms: [],
  requestedFonts: [],
  requestedTexts: [],
  requestedFolders: [],
  requestedImages: [],
  requestedCode: [],
  requestedImpulseResponses: [],
  requestedFrequencyResponses: [],
};
