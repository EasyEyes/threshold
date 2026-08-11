/**
 * @jest-environment jsdom
 *
 * RED tests for mid-experiment distance recalibration (Trello card Nov 10, 2024).
 *
 * Desired behavior (glossary spec, viewingDistanceAllowedRatio):
 *   - Recalibration (like nudging) must not advance the trial scheduler.
 *   - Input during recalibration is ignored; stale keys/clicks flushed on end.
 *   - If a response was pending, the trial is canceled via the EXISTING
 *     skipTrial() machinery (staircase re-queues via addTrial).
 *   - On end, stimuli are regenerated at the fresh viewing distance by
 *     re-running the registered prestimulus routine.
 *
 * These tests MUST fail until components/recalibration.ts exists.
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";

import {
  initRecalibration,
  registerRecalibrationContext,
  getRecalibrationHooks,
  isRecalibrationActive,
  _resetRecalibrationForTests,
} from "../components/recalibration";

const makeDeps = (overrides: any = {}) => ({
  skipTrial: jest.fn(),
  clearKeys: jest.fn(),
  shouldCancelTrial: jest.fn(() => false),
  updateDistanceState: jest.fn(),
  warning: jest.fn(),
  ...overrides,
});

describe("mid-experiment recalibration hooks", () => {
  beforeEach(() => {
    _resetRecalibrationForTests();
  });

  test("inactive before start, active after start", () => {
    initRecalibration(makeDeps());
    const { onRecalibrateStart } = getRecalibrationHooks();
    expect(isRecalibrationActive()).toBe(false);
    onRecalibrateStart();
    expect(isRecalibrationActive()).toBe(true);
  });

  test("start flushes queued input (stale clicks/keys must not advance the trial)", () => {
    const deps = makeDeps();
    initRecalibration(deps);
    getRecalibrationHooks().onRecalibrateStart();
    expect(deps.clearKeys).toHaveBeenCalledTimes(1);
  });

  test("start cancels the trial via skipTrial ONLY when shouldCancelTrial (response pending, non-adjust)", () => {
    // Response pending in a staircase trial → cancel-and-retry via existing machinery
    const depsTrial = makeDeps({
      shouldCancelTrial: jest.fn(() => true),
    });
    initRecalibration(depsTrial);
    getRecalibrationHooks().onRecalibrateStart();
    expect(depsTrial.skipTrial).toHaveBeenCalledTimes(1);

    // Pre-trial (instruction phase): trial hasn't started — no cancellation
    _resetRecalibrationForTests();
    const depsInstruction = makeDeps({
      shouldCancelTrial: jest.fn(() => false),
    });
    initRecalibration(depsInstruction);
    getRecalibrationHooks().onRecalibrateStart();
    expect(depsInstruction.skipTrial).not.toHaveBeenCalled();
  });

  test("start NEVER cancels for adjust (shouldCancelTrial=false): in-place reset instead", () => {
    // targetTask=adjust reaches recalibration mid-trial but must restart
    // in place (TrialHandler cannot re-queue) — threshold.js encodes this
    // in shouldCancelTrial; recalibration.ts must honor it.
    const deps = makeDeps({
      shouldCancelTrial: jest.fn(() => false),
    });
    initRecalibration(deps);
    const { onRecalibrateStart } = getRecalibrationHooks();
    onRecalibrateStart();
    expect(deps.skipTrial).not.toHaveBeenCalled();
    expect(isRecalibrationActive()).toBe(true);
  });

  test("double start is idempotent (no duplicate skipTrial)", () => {
    const deps = makeDeps({
      shouldCancelTrial: jest.fn(() => true),
    });
    initRecalibration(deps);
    const { onRecalibrateStart } = getRecalibrationHooks();
    onRecalibrateStart();
    onRecalibrateStart();
    expect(deps.skipTrial).toHaveBeenCalledTimes(1);
  });

  test("end updates distance state, flushes input again, and deactivates", async () => {
    const deps = makeDeps();
    initRecalibration(deps);
    const rerun = jest.fn();
    registerRecalibrationContext({ rerunPrestimulus: rerun });
    const { onRecalibrateStart, onRecalibrateEnd } = getRecalibrationHooks();
    onRecalibrateStart();
    deps.clearKeys.mockClear();
    await onRecalibrateEnd();
    expect(deps.updateDistanceState).toHaveBeenCalledTimes(1);
    expect(deps.clearKeys).toHaveBeenCalledTimes(1);
    expect(isRecalibrationActive()).toBe(false);
  });

  test("end regenerates stimuli via the registered prestimulus rerun", async () => {
    const deps = makeDeps();
    initRecalibration(deps);
    const rerun = jest.fn();
    registerRecalibrationContext({ rerunPrestimulus: rerun });
    const { onRecalibrateStart, onRecalibrateEnd } = getRecalibrationHooks();
    onRecalibrateStart();
    expect(rerun).not.toHaveBeenCalled();
    await onRecalibrateEnd();
    expect(rerun).toHaveBeenCalledTimes(1);
  });

  test("end without registered context still deactivates and warns (never loses the trial silently)", async () => {
    const deps = makeDeps();
    initRecalibration(deps);
    const { onRecalibrateStart, onRecalibrateEnd } = getRecalibrationHooks();
    onRecalibrateStart();
    await onRecalibrateEnd();
    expect(isRecalibrationActive()).toBe(false);
    expect(deps.warning).toHaveBeenCalled();
  });

  test("end without start is a no-op (no rerun, no clearKeys)", async () => {
    const deps = makeDeps();
    initRecalibration(deps);
    const rerun = jest.fn();
    registerRecalibrationContext({ rerunPrestimulus: rerun });
    await getRecalibrationHooks().onRecalibrateEnd();
    expect(rerun).not.toHaveBeenCalled();
    expect(deps.clearKeys).not.toHaveBeenCalled();
  });

  test("end hides the camera video feed (experiment must resume without webcam overlay)", async () => {
    const deps = makeDeps({ hideVideo: jest.fn() });
    initRecalibration(deps);
    registerRecalibrationContext({ rerunPrestimulus: jest.fn() });
    const { onRecalibrateStart, onRecalibrateEnd } = getRecalibrationHooks();
    onRecalibrateStart();
    await onRecalibrateEnd();
    expect(deps.hideVideo).toHaveBeenCalledTimes(1);
  });

  test("start does NOT hide the video (participant still needs it while recalibrating)", () => {
    const deps = makeDeps({ hideVideo: jest.fn() });
    initRecalibration(deps);
    getRecalibrationHooks().onRecalibrateStart();
    expect(deps.hideVideo).not.toHaveBeenCalled();
  });
});
