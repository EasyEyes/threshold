/**
 * @jest-environment node
 */
import "@jest/globals";
import { readFileSync } from "fs";
import * as XLSX from "xlsx";

jest.mock("../components/global", () => ({ calibrationTime: 0 }));
import { ExperimentHandler } from "../psychojs/src/data/ExperimentHandler";
import { registerCameraAttemptSavePreparation } from "../components/cameraAttemptTelemetry";

const FIXTURE =
  "../../../../remote-calibrator/test/fixtures/camera-attempt-v1.csv";

describe("versioned camera-attempt contract", () => {
  test("RC v1 survives save preparation and threshold CSV serialization", async () => {
    const source = readFileSync(FIXTURE, "utf8");
    const [sourceRow] = XLSX.utils.sheet_to_json(
      XLSX.read(source, { type: "string" }).Sheets.Sheet1,
    );
    const expected = JSON.parse(sourceRow.cameraAttemptJSON);
    const uploadData = jest.fn(() => "saved");
    const handler = new ExperimentHandler({
      psychoJS: {
        config: {
          experiment: {
            name: "Exp",
            saveFormat: ExperimentHandler.SaveFormat.CSV,
            status: "RUNNING",
          },
        },
        getEnvironment: () => ExperimentHandler.Environment.SERVER,
        _serverMsg: { has: () => false },
        serverManager: { uploadData },
        experiment: { getExtraInfo: () => ({}) },
        inputParameters: [],
        logger: { info: () => {}, warn: () => {} },
      },
      extraInfo: { participant: "P", date: "D" },
    });
    handler._trialsData = [
      { error: "participant:tabClosed:compatChooseCamera" },
    ];
    handler._trialsKeys = ["error"];
    const rc = { getCameraAttempt: () => expected };
    registerCameraAttemptSavePreparation({ experiment: handler }, rc);

    await handler.save({});

    const [outputRow] = XLSX.utils.sheet_to_json(
      XLSX.read(uploadData.mock.calls[0][1], { type: "string" }).Sheets.Sheet1,
    );
    expect(JSON.parse(outputRow.cameraAttemptJSON)).toEqual(expected);
  });
});
