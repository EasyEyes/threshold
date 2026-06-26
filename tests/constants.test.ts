import {
  userRepoFiles,
  resourcesFileTypes,
  acceptableExtensions,
} from "../preprocess/constants";

describe("resourcesFileTypes — phrases", () => {
  it("includes phrases as a resource category", () => {
    expect(resourcesFileTypes).toContain("phrases");
  });
});

describe("acceptableExtensions — phrases", () => {
  it("accepts xlsx files for the phrases category", () => {
    expect(acceptableExtensions.phrases).toContain("xlsx");
  });
});

describe("userRepoFiles — phrases", () => {
  it("initialises phrases to an empty array", () => {
    expect(userRepoFiles.phrases).toEqual([]);
  });

  it("initialises requestedPhrases to an empty array", () => {
    expect(userRepoFiles.requestedPhrases).toEqual([]);
  });
});
