/**
 * @jest-environment jsdom
 *
 * Tests for mid-experiment distance recalibration → BLOCK RESTART.
 *
 * Desired behavior (Denis Trello card Nov 10, 2024; button copy in all 42
 * languages says "restart this block"):
 *   - While active, recalibration must not advance the trial scheduler.
 *   - Queued input is flushed on start and on end.
 *   - On END (after re-tracking), the current block is abandoned and re-run
 *     from trial 1 with a fresh staircase: the host's requestRestartBlock
 *     wires skipBlock (drain current) + restartBlock (re-schedule), so the
 *     participant sees the block's instructions again and all trials from
 *     the top. Stimuli regenerate naturally when the restarted block re-runs
 *     its instruction routine at the new distance.
 *
 * Abandonment happens on END, not START, because the new viewing distance is
 * only known once re-tracking finishes.
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";

import {
  initRecalibration,
  getRecalibrationHooks,
  isRecalibrationActive,
  _resetRecalibrationForTests,
} from "../components/recalibration";

const makeDeps = (overrides: any = {}) => ({
  clearKeys: jest.fn(),
  requestRestartBlock: jest.fn(),
  updateDistanceState: jest.fn(),
  ...overrides,
});

describe("mid-experiment recalibration → block restart", () => {
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

  test("start does NOT request a restart (abandonment happens only after re-tracking, on end)", () => {
    const deps = makeDeps();
    initRecalibration(deps);
    getRecalibrationHooks().onRecalibrateStart();
    expect(deps.requestRestartBlock).not.toHaveBeenCalled();
  });

  test("start does NOT hide the video (participant still needs it while recalibrating)", () => {
    const deps = makeDeps({ hideVideo: jest.fn() });
    initRecalibration(deps);
    getRecalibrationHooks().onRecalibrateStart();
    expect(deps.hideVideo).not.toHaveBeenCalled();
  });

  test("end requests a block restart (abandon current + re-run from trial 1)", async () => {
    const deps = makeDeps();
    initRecalibration(deps);
    const { onRecalibrateStart, onRecalibrateEnd } = getRecalibrationHooks();
    onRecalibrateStart();
    await onRecalibrateEnd();
    expect(deps.requestRestartBlock).toHaveBeenCalledTimes(1);
  });

  test("end updates distance state, flushes input again, and deactivates", async () => {
    const deps = makeDeps();
    initRecalibration(deps);
    const { onRecalibrateStart, onRecalibrateEnd } = getRecalibrationHooks();
    onRecalibrateStart();
    deps.clearKeys.mockClear();
    await onRecalibrateEnd();
    expect(deps.updateDistanceState).toHaveBeenCalledTimes(1);
    expect(deps.clearKeys).toHaveBeenCalledTimes(1);
    expect(isRecalibrationActive()).toBe(false);
  });

  test("end hides the camera video feed (experiment resumes without webcam overlay)", async () => {
    const deps = makeDeps({ hideVideo: jest.fn() });
    initRecalibration(deps);
    const { onRecalibrateStart, onRecalibrateEnd } = getRecalibrationHooks();
    onRecalibrateStart();
    await onRecalibrateEnd();
    expect(deps.hideVideo).toHaveBeenCalledTimes(1);
  });

  test("double start is idempotent", () => {
    const deps = makeDeps();
    initRecalibration(deps);
    const { onRecalibrateStart } = getRecalibrationHooks();
    onRecalibrateStart();
    onRecalibrateStart();
    expect(isRecalibrationActive()).toBe(true);
    expect(deps.clearKeys).toHaveBeenCalledTimes(1);
  });

  test("double end requests restart only once (idempotent)", async () => {
    const deps = makeDeps();
    initRecalibration(deps);
    const { onRecalibrateStart, onRecalibrateEnd } = getRecalibrationHooks();
    onRecalibrateStart();
    await onRecalibrateEnd();
    await onRecalibrateEnd();
    expect(deps.requestRestartBlock).toHaveBeenCalledTimes(1);
  });

  test("end without start is a no-op (no restart, no clearKeys, no distance update)", async () => {
    const deps = makeDeps();
    initRecalibration(deps);
    await getRecalibrationHooks().onRecalibrateEnd();
    expect(deps.requestRestartBlock).not.toHaveBeenCalled();
    expect(deps.clearKeys).not.toHaveBeenCalled();
    expect(deps.updateDistanceState).not.toHaveBeenCalled();
    expect(isRecalibrationActive()).toBe(false);
  });
});
