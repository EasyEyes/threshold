/** @jest-environment jsdom */
import {
  startInteractionObservation,
  stopInteractionObservation,
  shouldObserveInteraction,
  observeRoutine,
  observeFullscreenPause,
  shouldManageInteraction,
  interactionManagementEnabled,
} from "../components/interaction/observation";

afterEach(() => {
  stopInteractionObservation();
  delete (window as any).__easyEyesInteraction;
});
const start = (rc: unknown = {}, traceLimit?: number) =>
  startInteractionObservation({
    enabled: true,
    rc,
    window,
    document,
    traceLimit,
  })!;
test.each([true, false])(
  "regular URLs start managed coordination (development=%s)",
  (development) => {
    const diagnostics = startInteractionObservation({
      enabled: shouldObserveInteraction(development, ""),
      managed: shouldManageInteraction(development, ""),
      rc: {},
      window,
      document,
    });
    expect(diagnostics?.getSnapshot().lifecycle).toBe("active");
    expect(interactionManagementEnabled()).toBe(true);
  },
);
test("observation overrides are available only during development", () => {
  expect(shouldObserveInteraction(true, "?interactionMode=off")).toBe(false);
  expect(shouldObserveInteraction(true, "?interactionMode=observe")).toBe(true);
  expect(shouldObserveInteraction(false, "?interactionMode=off")).toBe(true);
});
test("disabled observation installs no listeners or source access", () => {
  const add = jest.spyOn(document, "addEventListener");
  const rc = {
    get onInteractionChange() {
      throw new Error("must not read");
    },
  };
  expect(
    startInteractionObservation({ enabled: false, rc, window, document }),
  ).toBeNull();
  expect(add).not.toHaveBeenCalled();
  expect((window as any).__easyEyesInteraction).toBeUndefined();
  add.mockRestore();
});
test("legacy RC leaves study active and exposes a bounded immutable diagnostic trace", () => {
  const d = start({}, 3);
  observeRoutine("rcCalibration");
  observeRoutine("blocksLoopBegin");
  observeRoutine("consentForm");
  expect(d.getTrace()).toHaveLength(3);
  expect(d.getSnapshot().remoteCalibrator?.reason).toBe("unsupported-api");
  expect(d.getSnapshot().lifecycle).toBe("active");
  expect(Object.keys(d).sort()).toEqual(["getSnapshot", "getTrace"]);
  expect(Object.isFrozen(d)).toBe(true);
  expect(Object.isFrozen(d.getTrace())).toBe(true);
  expect(Object.isFrozen(d.getTrace()[0].snapshot)).toBe(true);
});
test("physical fullscreen loss is independent of pause-popup lifetime", () => {
  const d = start();
  expect(d.getSnapshot().fullscreen).toBe("missing");
  expect(d.getSnapshot().interruptions).toHaveLength(0);
  const closeFirst = observeFullscreenPause();
  const closeSecond = observeFullscreenPause();
  closeFirst();
  closeFirst();
  expect(d.getSnapshot().interruptions).toHaveLength(1);
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: document.body,
  });
  document.dispatchEvent(new Event("fullscreenchange"));
  expect(d.getSnapshot().fullscreen).toBe("present");
  expect(d.getSnapshot().interruptions).toHaveLength(1);
  closeSecond();
  expect(d.getSnapshot().interruptions).toHaveLength(0);
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: null,
  });
});
test("routine observations deduplicate and ignore per-frame names and arbitrary strings", () => {
  const d = start();
  observeRoutine("trialRoutineBegin");
  const state = d.getSnapshot();
  observeRoutine("trialRoutineBegin");
  observeRoutine("trialRoutineEachFrame");
  observeRoutine("participant-answer");
  expect(d.getSnapshot()).toBe(state);
  expect(state.studyPhase).toBe("study");
});
test("single instance, shutdown cleanup, late popup closure and fresh session", () => {
  const unsubscribe = jest.fn();
  const source = {
    getInteractionSnapshot() {},
    onInteractionChange(fn: any) {
      fn(
        {
          version: 1,
          sourceId: "rc-1",
          revision: 0,
          status: "active",
          coverage: "partial",
          scopes: [],
          recovery: null,
          camera: "unknown",
          fullscreenIntents: [],
        },
        null,
      );
      return unsubscribe;
    },
  };
  const d = start(source);
  expect(start(source)).toBe(d);
  const close = observeFullscreenPause();
  stopInteractionObservation();
  stopInteractionObservation();
  close();
  const state = d.getSnapshot();
  document.dispatchEvent(new Event("fullscreenchange"));
  expect(d.getSnapshot()).toBe(state);
  expect(state.lifecycle).toBe("ended");
  expect(state.interruptions).toHaveLength(0);
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect((window as any).__easyEyesInteraction).toBe(d);
  expect(start().getSnapshot().sessionId).not.toBe(state.sessionId);
});
test("pagehide terminates observation", () => {
  const d = start();
  window.dispatchEvent(new Event("pagehide"));
  expect(d.getSnapshot().lifecycle).toBe("ended");
});
