/**
 * @jest-environment node
 */
import "@jest/globals";
import { readFileSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";

jest.mock("../components/global", () => ({ calibrationTime: 0 }));
import { ExperimentHandler } from "../psychojs/src/data/ExperimentHandler";
import {
  registerDistanceCalibrationAttemptSavePreparation,
  snapshotDistanceCalibrationAttempt,
} from "../components/distanceCalibrationAttemptTelemetry";

const expectedAttempt = {
  version: 1,
  mode: "paper",
  phase: "measurement",
  outcome: null,
  currentLocation: {
    index: 1,
    locEye: "nearCameraOffsetLeft",
    location: "nearCameraOffsetLeft",
  },
  acceptedCount: 1,
  rejectedCount: 1,
  lastAttempt: {
    accepted: false,
    reason: "focal-length-mismatch",
    locEye: "nearCameraOffsetRight",
    focalRatioPct: 114,
    allowedRatioPct: [93, 107],
  },
  lastSuccessfulCheckpoint: {
    phase: "measurement",
    locEye: "nearCameraOffsetLeft",
  },
  camera: {
    disconnected: false,
    streamActive: true,
    trackReadyState: "live",
    modelLoaded: true,
  },
  events: [
    { type: "page", phase: "paper-selection" },
    { type: "measurement", accepted: false },
  ],
};

describe("distance calibration attempt telemetry", () => {
  it("updates pending and latest completed rows with RC's current attempt", () => {
    const experiment = {
      _currentTrialData: {},
      _trialsData: [{ error: "participant:tabClosed" }],
      addData(key, value) {
        this._currentTrialData[key] = value;
      },
      registerSavePreparation: jest.fn(),
    };
    const rc = { getDistanceCalibrationAttempt: () => expectedAttempt };

    expect(
      registerDistanceCalibrationAttemptSavePreparation({ experiment }, rc),
    ).toBe(true);
    expect(
      registerDistanceCalibrationAttemptSavePreparation({ experiment }, rc),
    ).toBe(true);
    expect(experiment.registerSavePreparation).toHaveBeenCalledTimes(1);

    experiment.registerSavePreparation.mock.calls[0][0]();
    expect(
      JSON.parse(experiment._currentTrialData.distanceCalibrationAttemptJSON),
    ).toEqual(expectedAttempt);
    expect(
      JSON.parse(experiment._trialsData[0].distanceCalibrationAttemptJSON),
    ).toEqual(expectedAttempt);
  });

  it("is a no-op for older RC builds and never interrupts saving", () => {
    const experiment = { addData: jest.fn() };
    expect(snapshotDistanceCalibrationAttempt({ experiment }, {})).toBe(false);
    expect(experiment.addData).not.toHaveBeenCalled();
    expect(() =>
      snapshotDistanceCalibrationAttempt(
        { experiment },
        {
          getDistanceCalibrationAttempt: () => {
            throw new Error("RC unavailable");
          },
        },
      ),
    ).not.toThrow();
  });

  it("survives ExperimentHandler CSV serialization after a mid-A4 exit", async () => {
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
      { error: "participant:tabClosed:rcCalibration:trackDistance" },
    ];
    handler._trialsKeys = ["error"];
    const rc = { getDistanceCalibrationAttempt: () => expectedAttempt };
    registerDistanceCalibrationAttemptSavePreparation(
      { experiment: handler },
      rc,
    );

    await handler.save({});

    const [outputRow] = XLSX.utils.sheet_to_json(
      XLSX.read(uploadData.mock.calls[0][1], { type: "string" }).Sheets.Sheet1,
    );
    expect(JSON.parse(outputRow.distanceCalibrationAttemptJSON)).toEqual(
      expectedAttempt,
    );
  });

  it("registers exactly once at threshold startup", () => {
    const thresholdSource = readFileSync(
      path.join(__dirname, "..", "threshold.js"),
      "utf8",
    );
    expect(
      thresholdSource.match(
        /registerDistanceCalibrationAttemptSavePreparation\(psychoJS, rc\)/g,
      ),
    ).toHaveLength(1);
  });
});
