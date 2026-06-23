import {
  userRepoFiles,
  resourcesFileTypes,
  acceptableExtensions,
} from "../preprocess/constants";

describe("resourcesFileTypes — phraseFiles", () => {
  it("includes phraseFiles as a resource category", () => {
    expect(resourcesFileTypes).toContain("phraseFiles");
  });
});

describe("acceptableExtensions — phraseFiles", () => {
  it("accepts xlsx files for the phraseFiles category", () => {
    expect(acceptableExtensions.phraseFiles).toContain("xlsx");
  });
});

describe("userRepoFiles — phraseFiles", () => {
  it("initialises phraseFiles to an empty array", () => {
    expect(userRepoFiles.phraseFiles).toEqual([]);
  });

  it("initialises requestedPhraseFiles to an empty array", () => {
    expect(userRepoFiles.requestedPhraseFiles).toEqual([]);
  });
});
