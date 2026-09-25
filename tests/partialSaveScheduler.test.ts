/**
 * Periodic partial-result saves (Acuity24Fonts5-12: sessions that die late
 * lose everything since the block-1-start save — and a hard kill fires no
 * unload event at all, so no beacon can carry the label). The scheduler
 * re-uploads the accumulated results via the ordinary uncapped async POST
 * every few minutes, honoring the table's _pavloviaSavePartialResultsBool.
 *
 * Resilience contract (the experiment must run fine offline after load):
 * fire-and-forget, failures swallowed and reported, never blocks the
 * scheduler's next tick, ticks never overlap, stoppable so the final
 * quit-save is always the last upload.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

import {
  startPartialSaveScheduler,
  stopPartialSaveScheduler,
} from "../components/partialSaveScheduler";

const tick = async (ms: number) => {
  await jest.advanceTimersByTime(ms);
  await flush();
};
const flush = () => Promise.resolve();

describe("startPartialSaveScheduler", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    stopPartialSaveScheduler();
  });
  afterEach(() => {
    stopPartialSaveScheduler();
    jest.useRealTimers();
  });

  test("saves on every interval tick", async () => {
    const save = jest.fn(() => Promise.resolve());
    startPartialSaveScheduler({ save, intervalMs: 1000 });

    // One interval per advance (with a microtask flush between): ticks that
    // fire while the previous save is still pending are skipped by design.
    await tick(1000);
    await tick(1000);
    await tick(1000);
    await tick(1000);
    await tick(1000);

    expect(save).toHaveBeenCalledTimes(5);
  });

  test("does not save before the first interval elapses (block-start save owns t≈0)", async () => {
    const save = jest.fn(() => Promise.resolve());
    startPartialSaveScheduler({ save, intervalMs: 1000 });
    await tick(999);
    expect(save).not.toHaveBeenCalled();
  });

  test("a rejected save is reported, not thrown, and ticking continues", async () => {
    const onError = jest.fn();
    const save = jest
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined as never);
    startPartialSaveScheduler({ save, intervalMs: 1000, onError });

    await tick(1000);
    await tick(1000);

    expect(save).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test("a tick is skipped while the previous save is still in flight (no overlapping uploads)", async () => {
    let resolveFirst: () => void = () => {};
    const save = jest
      .fn()
      .mockImplementationOnce(
        () => new Promise<void>((r) => (resolveFirst = r)),
      )
      .mockResolvedValue(undefined as never);
    startPartialSaveScheduler({ save, intervalMs: 1000 });

    await tick(1000); // first save now pending
    await tick(1000); // second tick: skipped, save still in flight
    expect(save).toHaveBeenCalledTimes(1);

    resolveFirst();
    await flush();
    await tick(1000); // third tick: saves again
    expect(save).toHaveBeenCalledTimes(2);
  });

  test("stop() halts ticking and is idempotent; a second start works afterwards", async () => {
    const save = jest.fn(() => Promise.resolve());
    startPartialSaveScheduler({ save, intervalMs: 1000 });
    await tick(1000);
    expect(save).toHaveBeenCalledTimes(1);

    stopPartialSaveScheduler();
    stopPartialSaveScheduler();
    await tick(5000);
    expect(save).toHaveBeenCalledTimes(1);

    startPartialSaveScheduler({ save, intervalMs: 1000 });
    await tick(1000);
    expect(save).toHaveBeenCalledTimes(2);
  });

  test("stop() waits for an in-flight save (a late periodic upload must never land after the final quit save)", async () => {
    let resolveSave: () => void = () => {};
    const save = jest.fn(() => new Promise<void>((r) => (resolveSave = r)));
    startPartialSaveScheduler({ save, intervalMs: 1000 });
    await tick(1000); // save now in flight
    expect(save).toHaveBeenCalledTimes(1);

    let stopped = false;
    const stopPromise = stopPartialSaveScheduler().then(() => {
      stopped = true;
    });
    await flush();
    // Still stopping: the in-flight upload must settle first.
    expect(stopped).toBe(false);

    resolveSave();
    await stopPromise;
    expect(stopped).toBe(true);
    // And no further ticks fire.
    await tick(5000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  test("double start does not double-schedule (single interval)", async () => {
    const save = jest.fn(() => Promise.resolve());
    startPartialSaveScheduler({ save, intervalMs: 1000 });
    startPartialSaveScheduler({ save, intervalMs: 1000 });
    await tick(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
