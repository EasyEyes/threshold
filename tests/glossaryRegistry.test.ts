import type { GlossaryData } from "../../source/components/types";

const mockData: GlossaryData = {
  version: "1.0",
  glossary: {
    param1: {
      name: "param1",
      availability: "now",
      type: "num",
      default: "0",
      explanation: "",
      example: "",
      categories: [],
    },
  },
  glossaryFull: [],
  superMatchingParams: ["param1", "param2"],
};

describe("glossaryRegistry", () => {
  let mod: typeof import("../parameters/glossaryRegistry");

  beforeEach(async () => {
    jest.resetModules();
    mod = await import("../parameters/glossaryRegistry");
  });

  it("getGlossary() throws before initGlossary is called", () => {
    expect(() => mod.getGlossary()).toThrow();
  });

  it("getGlossary() returns data.glossary after initGlossary(data)", () => {
    mod.initGlossary(mockData);
    expect(mod.getGlossary()).toEqual(mockData.glossary);
  });

  it("getSuperMatchingParams() returns data.superMatchingParams after initGlossary(data)", () => {
    mod.initGlossary(mockData);
    expect(mod.getSuperMatchingParams()).toEqual(mockData.superMatchingParams);
  });

  it("calling initGlossary twice overwrites the first value", () => {
    const secondData: GlossaryData = {
      version: "2.0",
      glossary: {
        param2: {
          name: "param2",
          availability: "now",
          type: "text",
          default: "",
          explanation: "",
          example: "",
          categories: [],
        },
      },
      glossaryFull: [],
      superMatchingParams: ["param3"],
    };
    mod.initGlossary(mockData);
    mod.initGlossary(secondData);
    expect(mod.getGlossary()).toEqual(secondData.glossary);
    expect(mod.getSuperMatchingParams()).toEqual(secondData.superMatchingParams);
  });
});
