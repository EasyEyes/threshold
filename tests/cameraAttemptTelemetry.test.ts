/**
 * @jest-environment jsdom
 */
import { describe, expect, it, jest } from "@jest/globals";
import { readFileSync } from "fs";
import path from "path";
import {
  registerCameraAttemptSavePreparation,
  snapshotCameraAttempt,
} from "../components/cameraAttemptTelemetry";

describe("camera attempt telemetry", () => {
  it("writes RC's latest pending attempt as bounded JSON, using a bound addData method", () => {
    const experiment = {
      _currentTrialData: {},
      addData(key, value) {
        this._currentTrialData[key] = value;
      },
    };
    const attempt = {
      phase: "permission",
      permission: "requesting",
      outcome: null,
      cameras: [],
      events: [],
    };
    const rc = { getCameraAttempt: () => attempt };

    expect(snapshotCameraAttempt({ experiment }, rc)).toBe(true);
    expect(JSON.parse(experiment._currentTrialData.cameraAttemptJSON)).toEqual(
      attempt,
    );
  });

  it("is a no-op for older RC builds and never breaks saving", () => {
    const addData = jest.fn();
    expect(snapshotCameraAttempt({ experiment: { addData } }, {})).toBe(false);
    expect(addData).not.toHaveBeenCalled();

    expect(() =>
      snapshotCameraAttempt(
        { experiment: { addData } },
        {
          getCameraAttempt: () => {
            throw new Error("RC unavailable");
          },
        },
      ),
    ).not.toThrow();
    expect(addData).not.toHaveBeenCalled();
  });

  it("registers one save hook that updates pending and latest completed rows", () => {
    const experiment = {
      _currentTrialData: {},
      _trialsData: [{ error: "participant:tabClosed:compatChooseCamera" }],
      addData(key, value) {
        this._currentTrialData[key] = value;
      },
      registerSavePreparation: jest.fn(),
    };
    const rc = {
      getCameraAttempt: () => ({
        version: 1,
        phase: "permission",
        outcome: null,
      }),
    };

    registerCameraAttemptSavePreparation({ experiment }, rc);
    registerCameraAttemptSavePreparation({ experiment }, rc);

    expect(experiment.registerSavePreparation).toHaveBeenCalledTimes(1);
    const prepare = experiment.registerSavePreparation.mock.calls[0][0];
    prepare();
    const json = experiment._currentTrialData.cameraAttemptJSON;
    expect(JSON.parse(json).phase).toBe("permission");
    expect(
      JSON.parse(experiment._trialsData[0].cameraAttemptJSON).outcome,
    ).toBe(null);
  });

  it("does not serialize device identifiers", () => {
    const experiment = { addData: jest.fn() };
    snapshotCameraAttempt(
      { experiment },
      {
        getCameraAttempt: () => ({
          phase: "choosing-camera",
          cameras: [{ name: "Camera", deviceId: "private-id" }],
        }),
      },
    );
    const json = experiment.addData.mock.calls[0][1];
    expect(json).not.toContain("private-id");
  });

  it("bounds string and event sizes before they reach a CSV row", () => {
    const experiment = { addData: jest.fn() };
    snapshotCameraAttempt(
      { experiment },
      {
        getCameraAttempt: () => ({
          phase: "x".repeat(2000),
          events: Array.from({ length: 200 }, (_, index) => ({ index })),
        }),
      },
    );
    const attempt = JSON.parse(experiment.addData.mock.calls[0][1]);
    expect(attempt.phase).toHaveLength(500);
    expect(attempt.events).toHaveLength(100);
  });
});

describe("camera attempt save wiring", () => {
  const thresholdSource = readFileSync(
    path.join(__dirname, "..", "threshold.js"),
    "utf8",
  );

  it("registers one save-preparation hook at startup instead of per-path snapshots", () => {
    expect(
      thresholdSource.match(
        /registerCameraAttemptSavePreparation\(psychoJS, rc\)/g,
      ),
    ).toHaveLength(1);
    expect(thresholdSource).not.toMatch(
      /snapshotCameraAttempt\(psychoJS, rc\)/,
    );
  });
});
