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
  "targetSoundLists",
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
  targetSoundLists: string[];
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
  targetSoundLists: ["csv", "xlsx"],
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
    ...acceptableExtensions.targetSoundLists,
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
    ...acceptableExtensions.targetSoundLists,
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
  targetSoundLists: File[];
  requestedForms: string[];
  requestedFonts: string[];
  requestedTexts: string[];
  requestedFolders: string[];
  requestedImages: string[];
  requestedCode: string[];
  requestedImpulseResponses: string[];
  requestedFrequencyResponses: string[];
  requestedTargetSoundLists: string[];
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
  targetSoundLists: [],
  requestedForms: [],
  requestedFonts: [],
  requestedTexts: [],
  requestedFolders: [],
  requestedImages: [],
  requestedCode: [],
  requestedImpulseResponses: [],
  requestedFrequencyResponses: [],
  requestedTargetSoundLists: [],
};
