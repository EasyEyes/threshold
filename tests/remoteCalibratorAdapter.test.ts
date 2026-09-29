import { createInteractionCoordinator } from "../components/interaction/coordinator";
import { attachRemoteCalibrator } from "../components/interaction/remoteCalibratorAdapter";
import { currentScope } from "../components/interaction/transition";
import { readRemoteSnapshot } from "../components/interaction/remoteCalibratorContract";

export const initial = () => ({
  version: 1,
  sourceId: "rc-1",
  revision: 0,
  status: "active",
  coverage: "partial",
  scopes: [],
  camera: "unknown",
  recovery: null,
  fullscreenIntents: [],
});
function fixture(snapshot: any = initial()) {
  let receive: (snapshot: any, event: any) => void = () => {};
  const unsubscribe = jest.fn();
  const source = {
    getInteractionSnapshot: jest.fn(),
    onInteractionChange: jest.fn((listener) => {
      receive = listener;
      listener(snapshot, null);
      return unsubscribe;
    }),
  };
  const coordinator = createInteractionCoordinator("test");
  const adapter = attachRemoteCalibrator(source, coordinator);
  return {
    source,
    coordinator,
    adapter,
    unsubscribe,
    emit: (snapshot: any, event: any) =>
      receive(snapshot, {
        version: 1,
        sourceId: snapshot.sourceId,
        revision: snapshot.revision,
        ...event,
      }),
  };
}
test("mid-flow attachment preserves concurrent scopes and recovery without inventing ownership", () => {
  const raw = {
    ...initial(),
    revision: 42,
    camera: "ready",
    recovery: { id: 4, phase: "retry" },
    scopes: [
      { id: 1, kind: "calibration-panel", parentId: null, phase: "settling" },
      { id: 2, kind: "glasses-reminder", parentId: 1, phase: "active" },
      { id: 3, kind: "camera-selection", parentId: null, phase: "active" },
    ],
  };
  const f = fixture(raw);
  expect(f.coordinator.getSnapshot().remoteCalibrator?.snapshot).toEqual(raw);
  expect(currentScope(f.coordinator.getSnapshot())).toBeNull();
  expect(f.coordinator.getSnapshot().coverage).toBe("unknown");
  expect(f.source.getInteractionSnapshot).not.toHaveBeenCalled();
  raw.scopes[0].kind = "changed";
  expect(
    f.coordinator.getSnapshot().remoteCalibrator?.snapshot?.scopes[0].kind,
  ).toBe("calibration-panel");
});
test("ordered changes apply once; stale callbacks cannot rewind state", () => {
  const f = fixture();
  f.emit(
    { ...initial(), revision: 1, camera: "ready" },
    { type: "camera.changed", status: "ready" },
  );
  const state = f.coordinator.getSnapshot();
  f.emit(initial(), { type: "camera.changed", status: "unknown" });
  expect(f.coordinator.getSnapshot()).toBe(state);
  expect(state.remoteCalibrator?.snapshot?.camera).toBe("ready");
});
test.each([
  [
    "revision-gap",
    { ...initial(), revision: 2 },
    { type: "camera.changed", status: "unknown" },
  ],
  [
    "source-changed",
    { ...initial(), sourceId: "rc-2", revision: 1 },
    { type: "camera.changed", status: "unknown" },
  ],
  [
    "invalid-event",
    { ...initial(), revision: 1 },
    { type: "camera.changed", status: "ready" },
  ],
  ["unsupported-version", { ...initial(), version: 2 }, {}],
])("%s detaches observation without ending host", (reason, snapshot, event) => {
  const f = fixture();
  f.emit(snapshot, event);
  expect(f.coordinator.getSnapshot().remoteCalibrator).toEqual({
    connection: "invalid",
    reason,
    snapshot: null,
  });
  expect(f.unsubscribe).toHaveBeenCalledTimes(1);
  expect(f.coordinator.getSnapshot().lifecycle).toBe("active");
  const state = f.coordinator.getSnapshot();
  f.emit(initial(), {});
  expect(f.coordinator.getSnapshot()).toBe(state);
});
test("source termination is independent of the host session", () => {
  const f = fixture();
  f.emit(
    { ...initial(), revision: 1, status: "ended" },
    { type: "session.ended" },
  );
  expect(f.coordinator.getSnapshot().remoteCalibrator?.connection).toBe(
    "ended",
  );
  expect(f.coordinator.getSnapshot().lifecycle).toBe("active");
  f.adapter.dispose();
  expect(f.unsubscribe).toHaveBeenCalledTimes(1);
});
test("dispose is idempotent and invalidates late callbacks", () => {
  const f = fixture();
  f.adapter.dispose();
  f.adapter.dispose();
  const state = f.coordinator.getSnapshot();
  f.emit({ ...initial(), revision: 1 }, {});
  expect(f.coordinator.getSnapshot()).toBe(state);
  expect(f.unsubscribe).toHaveBeenCalledTimes(1);
});
test.each([
  ["unsupported-api", {}],
  [
    "subscribe-failed",
    {
      getInteractionSnapshot() {},
      onInteractionChange() {
        throw new Error("test");
      },
    },
  ],
  [
    "missing-initial-snapshot",
    {
      getInteractionSnapshot() {},
      onInteractionChange() {
        return () => {};
      },
    },
  ],
  [
    "invalid-subscription",
    {
      getInteractionSnapshot() {},
      onInteractionChange(fn: any) {
        fn(initial(), null);
      },
    },
  ],
])("%s is isolated", (reason, source) => {
  const c = createInteractionCoordinator("test");
  expect(() => attachRemoteCalibrator(source, c)).not.toThrow();
  expect(c.getSnapshot().remoteCalibrator?.reason).toBe(reason);
});
test("synchronous invalid initial callback still disposes the returned subscription", () => {
  const f = fixture({ ...initial(), version: 2 });
  expect(f.unsubscribe).toHaveBeenCalledTimes(1);
});
test.each([
  { scopes: [{ id: 1, kind: "choose-camera", parentId: 1, phase: "active" }] },
  { scopes: [{ id: 1, kind: "unknown", parentId: null, phase: "active" }] },
  { recovery: { id: 1, phase: "unsupported" } },
  { fullscreenIntents: Array(17).fill({ id: 1, kind: "choose-screen" }) },
  {
    scopes: Array(65).fill({
      id: 1,
      kind: "choose-camera",
      parentId: null,
      phase: "active",
    }),
  },
  { status: "ended", recovery: { id: 1, phase: "retry" } },
])("malformed/bounded contract rejects %j", (patch) => {
  expect(readRemoteSnapshot({ ...initial(), ...patch })).toBeNull();
});
test("unrecognized participant fields are stripped", () => {
  expect(
    readRemoteSnapshot({ ...initial(), answer: "secret", cameraId: "device" }),
  ).toEqual(initial());
});
test("queued observation copies nested data before caller can mutate it", () => {
  const c = createInteractionCoordinator("test");
  const raw: any = {
    ...initial(),
    scopes: [{ id: 1, kind: "choose-camera", parentId: null, phase: "active" }],
  };
  c.subscribe((_, change) => {
    if (change?.event.type !== "study.phase") return;
    c.dispatch({
      type: "rc.observed",
      sessionId: "test",
      observation: { connection: "observing", reason: null, snapshot: raw },
    });
    raw.scopes[0].kind = "changed";
  });
  c.dispatch({ type: "study.phase", sessionId: "test", phase: "study" });
  expect(c.getSnapshot().remoteCalibrator?.snapshot?.scopes[0].kind).toBe(
    "choose-camera",
  );
  expect(
    Object.isFrozen(c.getSnapshot().remoteCalibrator?.snapshot?.scopes[0]),
  ).toBe(true);
});
