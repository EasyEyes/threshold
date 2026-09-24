import fs from "fs";
import path from "path";

jest.mock(
  "../index.html?text",
  () =>
    '<link rel="icon" type="image/x-icon" href="components/images/favicon.ico" /><!-- initial load --><script type="module" src="js/first.min.js"></script><!-- experiment --><script type="module" src="js/threshold.min.js" defer></script>',
  { virtual: true },
);
jest.mock(
  "../index-stepper-bool.html?text",
  () =>
    '<link rel="icon" type="image/x-icon" href="components/images/favicon.ico" /><!-- initial load --><script type="module" src="js/first.min.js"></script><!-- experiment --><script type="module" src="js/threshold.min.js" defer></script>',
  { virtual: true },
);
jest.mock("../coi-serviceworker.js?text", () => "", { virtual: true });
jest.mock("../threshold-engine/src/runtime/assetBridge.sw.js?text", () => "", {
  virtual: true,
});

import { compile } from "../threshold-engine/src";

describe("Threshold Engine parameter catalog gate", () => {
  it("blocks engine artifacts when the resolved Glossary lacks study parameters", async () => {
    (globalThis as any).ENGINE_NAME = "threshold-engine-test";
    (globalThis as any).ENGINE_VERSION = "test";
    const glossaryData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "__cache__/glossary.json"), "utf8"),
    );
    const phrasesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "__cache__/phrases.json"), "utf8"),
    );
    const table = `_about,parameter gate,,
block,,1,1
conditionName,,A,B
unknownZ,,x,y
unknownA,,x,y`;

    const result = await compile(
      { path: "parameter-gate.csv", content: table },
      { files: [] },
      { data: { glossary: glossaryData, phrases: phrasesData }, local: true },
    );

    expect(result.files).toEqual([]);
    expect(
      result.manifest.diagnostics?.find(
        ({ code }) => code === "PARAMETER_DEFINITION_MISSING",
      ),
    ).toMatchObject({
      kind: "error",
      parameters: ["unknownA", "unknownZ"],
    });
  });
});
