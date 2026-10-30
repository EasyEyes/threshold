/**
 * @jest-environment node
 */
import "@jest/globals";
import { readFileSync } from "fs";
import * as XLSX from "xlsx";

jest.mock("../components/global", () => ({ calibrationTime: 0 }));
import { ExperimentHandler } from "../psychojs/src/data/ExperimentHandler";

const makeContext = () => {
  const uploadData = jest.fn(() => "saved");
  const warn = jest.fn();
  const ctx = {
    _dataFileName: "P_Exp_0001_T1",
    _trialsKeys: ["response"],
    _loops: [],
    _trialsData: [{ response: 1 }],
    _currentTrialData: {},
    extraInfo: {},
    _psychoJS: {
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
      logger: { info: () => {}, warn },
    },
  };
  ctx.addData = ExperimentHandler.prototype.addData;
  ctx._orderOutput = ExperimentHandler.prototype._orderOutput.bind(ctx);
  return { ctx, uploadData, warn };
};

describe("ExperimentHandler save preparation", () => {
  test("registered preparation runs before CSV serialization on every save", async () => {
    const { ctx, uploadData } = makeContext();
    const prepare = jest.fn(() => {
      ctx.addData("cameraAttemptJSON", '{"version":1}');
      ctx._trialsData[ctx._trialsData.length - 1].cameraAttemptJSON =
        '{"version":1}';
    });
    ExperimentHandler.prototype.registerSavePreparation.call(ctx, prepare);

    await ExperimentHandler.prototype.save.call(ctx, {});
    await ExperimentHandler.prototype.save.call(ctx, {});

    expect(prepare).toHaveBeenCalledTimes(2);
    expect(prepare.mock.calls[0][0]).toBe(ctx);
    expect(uploadData).toHaveBeenCalledTimes(2);
    const csv = uploadData.mock.calls[0][1];
    const sheet = XLSX.read(csv, { type: "string" }).Sheets.Sheet1;
    const rows = XLSX.utils.sheet_to_json(sheet);
    expect(rows[0].cameraAttemptJSON).toBe('{"version":1}');
    expect(prepare.mock.invocationCallOrder[0]).toBeLessThan(
      uploadData.mock.invocationCallOrder[0],
    );
  });

  test("a throwing preparation cannot block the upload", async () => {
    const { ctx, uploadData, warn } = makeContext();
    ExperimentHandler.prototype.registerSavePreparation.call(ctx, () => {
      throw new Error("telemetry failed");
    });

    await expect(ExperimentHandler.prototype.save.call(ctx, {})).resolves.toBe(
      "saved",
    );
    expect(uploadData).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
  });
});
