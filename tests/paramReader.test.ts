import type { GlossaryData } from "../../source/components/types";

const fixture: GlossaryData = {
  version: "1",
  glossary: {
    targetKind: {
      name: "targetKind",
      availability: "now",
      type: "text",
      default: "letter",
      explanation: "",
      example: "",
      categories: ["letter", "gabor"],
    },
  },
  glossaryFull: [],
  superMatchingParams: ["questionAndAnswer@@"],
};

describe("ParamReader", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock("papaparse", () => ({ __esModule: true, default: { parse: () => {} } }));
  });

  it("read() throws when glossary registry is not initialized", async () => {
    const { ParamReader } = await import("../parameters/paramReader");
    const reader = new ParamReader("conditions");
    expect(() => reader.read("nonExistentParam", "conditionA")).toThrow(
      "getGlossary() called before initGlossary()",
    );
  });

  it("read() returns glossary default after initGlossary is called", async () => {
    const { initGlossary } = await import("../parameters/glossaryRegistry");
    const { ParamReader } = await import("../parameters/paramReader");
    initGlossary(fixture);
    const reader = new ParamReader("conditions");
    expect(reader.read("targetKind", "conditionA")).toBe("letter");
  });
});
