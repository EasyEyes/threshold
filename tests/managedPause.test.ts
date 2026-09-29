import {
  createPauseController,
  PauseActions,
} from "../components/interaction/pauseController";
import { decidePause } from "../components/interaction/pausePolicy";
import { createInitialSnapshot } from "../components/interaction/transition";
import type { Snapshot } from "../components/interaction/types";
import {
  shouldManageInteraction,
  shouldObserveInteraction,
} from "../components/interaction/observation";

function setup() {
  let snapshot: Snapshot = createInitialSnapshot("test");
  let fullscreen = false;
  let host = { terminated: false, suppressed: false, intentional: false };
  let actions: PauseActions;
  const close = jest.fn();
  const setBusy = jest.fn();
  const acknowledge = jest.fn();
  const quit = jest.fn();
  const finish = jest.fn();
  const unblock = jest.fn();
  const requestFullscreen = jest.fn(async () => {});
  const present = jest.fn((a: PauseActions) => {
    actions = a;
    return { close, setBusy };
  });
  const controller = createPauseController({
    snapshot: () => snapshot,
    host: () => host,
    fullscreen: () => fullscreen,
    requestFullscreen,
    clearInput: jest.fn(),
    acknowledgeFullscreen: acknowledge,
    beginInterruption: () => finish,
    blockInput: () => unblock,
    present,
    quit,
  });
  return {
    controller,
    get actions() {
      return actions!;
    },
    close,
    present,
    requestFullscreen,
    acknowledge,
    quit,
    finish,
    unblock,
    full: (value: boolean) => {
      fullscreen = value;
    },
    host: (value: Partial<typeof host>) => {
      host = { ...host, ...value };
    },
    recovery: (phase: "awaiting-resume" | "attempting" | "settling" | null) => {
      snapshot = {
        ...snapshot,
        remoteCalibrator: {
          connection: "observing",
          reason: null,
          snapshot: {
            version: 1,
            sourceId: "rc-1",
            revision: 1,
            status: "active",
            coverage: "partial",
            camera: "ready",
            scopes: [],
            fullscreenIntents: [],
            recovery: phase ? { id: 1, phase } : null,
          },
        },
      };
      controller.reconcile();
    },
  };
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
test.each([
  "",
  "?participant=123",
  "?interactionMode=manage",
  "?interactionMode=unknown",
])("regular and managed URLs enable coordination: %s", (search) => {
  for (const development of [true, false]) {
    expect(shouldObserveInteraction(development, search)).toBe(true);
    expect(shouldManageInteraction(development, search)).toBe(true);
  }
});
test.each(["observe", "off"])(
  "%s is a development-only comparison override",
  (mode) => {
    expect(shouldManageInteraction(true, "?interactionMode=" + mode)).toBe(
      false,
    );
    expect(shouldManageInteraction(false, "?interactionMode=" + mode)).toBe(
      true,
    );
  },
);
test("unknown or invalid coverage still chooses the preserving presenter", () => {
  const state = createInitialSnapshot("s");
  const host = { terminated: false, suppressed: false, intentional: false };
  expect(decidePause(state, host)).toBe("present");
  expect(
    decidePause(
      {
        ...state,
        remoteCalibrator: {
          connection: "invalid",
          reason: "revision-gap",
          snapshot: null,
        },
      },
      host,
    ),
  ).toBe("present");
});
test("one pause, fresh native request on click, failed fullscreen keeps Resume available", async () => {
  const f = setup();
  f.controller.request();
  f.controller.request();
  expect(f.present).toHaveBeenCalledTimes(1);
  expect(f.requestFullscreen).not.toHaveBeenCalled();
  f.actions.resume();
  expect(f.requestFullscreen).toHaveBeenCalledTimes(1);
  await flush();
  expect(f.close).not.toHaveBeenCalled();
  expect(f.acknowledge).not.toHaveBeenCalled();
  f.full(true);
  f.actions.resume();
  await flush();
  expect(f.close).toHaveBeenCalledTimes(1);
  expect(f.finish).toHaveBeenCalledTimes(1);
  expect(f.controller.isActive()).toBe(false);
});
test("recovery replaces the host pause and camera ready alone cannot release it", () => {
  const f = setup();
  f.controller.request();
  f.recovery("awaiting-resume");
  expect(f.close).toHaveBeenCalledTimes(1);
  expect(f.controller.isActive()).toBe(true);
  f.recovery("settling");
  expect(f.present).toHaveBeenCalledTimes(1);
  f.recovery(null);
  expect(f.present).toHaveBeenCalledTimes(2);
});
test("recovery started before Escape defers the host popup until recovery ends", () => {
  const f = setup();
  f.recovery("awaiting-resume");
  f.controller.request();
  expect(f.present).not.toHaveBeenCalled();
  f.full(true);
  f.recovery(null);
  expect(f.present).not.toHaveBeenCalled();
  expect(f.acknowledge).toHaveBeenCalledTimes(1);
  expect(f.controller.isActive()).toBe(false);
});
test("stale fullscreen completion after recovery cannot close the newer pause", async () => {
  const f = setup();
  let resolve!: () => void;
  f.requestFullscreen.mockImplementation(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  f.controller.request();
  f.actions.resume();
  f.recovery("attempting");
  f.recovery(null);
  f.full(true);
  resolve();
  await flush();
  expect(f.present).toHaveBeenCalledTimes(2);
  expect(f.close).toHaveBeenCalledTimes(1);
  expect(f.controller.isPresenting()).toBe(true);
});
test("intentional windowed flow stays untouched; Quit consumes its own reason once", () => {
  const f = setup();
  f.host({ intentional: true });
  f.controller.request("old");
  expect(f.present).not.toHaveBeenCalled();
  f.host({ intentional: false });
  f.controller.request("cameraHook");
  f.actions.quit();
  f.actions.quit();
  f.controller.request();
  expect(f.quit).toHaveBeenCalledTimes(1);
  expect(f.quit).toHaveBeenCalledWith("cameraHook");
});
test("termination disposes pending request and ignores late success", async () => {
  const f = setup();
  let resolve!: () => void;
  f.requestFullscreen.mockImplementation(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  f.controller.request();
  f.actions.resume();
  f.host({ terminated: true });
  f.controller.reconcile();
  f.full(true);
  resolve();
  await flush();
  expect(f.close).toHaveBeenCalledTimes(1);
  expect(f.acknowledge).not.toHaveBeenCalled();
  expect(f.controller.isActive()).toBe(false);
});
