import type {
  CameraStatus,
  Outcome,
  RecoveryPhase,
  RemoteCalibratorSnapshot,
  RemoteCalibratorObservation,
  RcEventType,
} from "./types";

const kinds = new Set([
  "camera-selection",
  "calibration-panel",
  "recalibration",
  "choose-camera",
  "choose-screen",
  "camera-unavailable",
  "camera-permission",
  "camera-startup-retry",
  "camera-resolution",
  "glasses-reminder",
]);
const cameras = new Set<CameraStatus>([
  "unknown",
  "ready",
  "disconnected",
  "reconnecting",
  "failed",
]);
const phases = new Set<RecoveryPhase>([
  "awaiting-resume",
  "attempting",
  "retry",
  "settling",
]);
const outcomes = new Set<Outcome>(["completed", "cancelled", "failed"]);
const record = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const id = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) > 0;
const revision = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;

/** Validate the version-one boundary and copy only nonparticipant lifecycle fields. */
export function readRemoteSnapshot(
  value: unknown,
): RemoteCalibratorSnapshot | null {
  if (
    !record(value) ||
    value.version !== 1 ||
    typeof value.sourceId !== "string" ||
    !/^rc-[1-9][0-9]{0,15}$/.test(value.sourceId) ||
    !revision(value.revision) ||
    !["active", "ended"].includes(value.status) ||
    value.coverage !== "partial" ||
    !cameras.has(value.camera) ||
    !Array.isArray(value.scopes) ||
    value.scopes.length > 64 ||
    !Array.isArray(value.fullscreenIntents) ||
    value.fullscreenIntents.length > 16
  )
    return null;

  const used = new Set<number>();
  const parents = new Set<number>();
  const scopes: RemoteCalibratorSnapshot["scopes"][number][] = [];
  for (const scope of value.scopes) {
    if (
      !record(scope) ||
      !id(scope.id) ||
      used.has(scope.id) ||
      !kinds.has(scope.kind) ||
      !["active", "settling"].includes(scope.phase) ||
      (scope.parentId !== null && !parents.has(scope.parentId))
    )
      return null;
    used.add(scope.id);
    parents.add(scope.id);
    scopes.push(
      Object.freeze({
        id: scope.id,
        kind: scope.kind,
        parentId: scope.parentId,
        phase: scope.phase,
      }),
    );
  }
  let recovery: RemoteCalibratorSnapshot["recovery"] = null;
  if (value.recovery !== null) {
    const item = value.recovery;
    if (
      !record(item) ||
      !id(item.id) ||
      used.has(item.id) ||
      !phases.has(item.phase)
    )
      return null;
    used.add(item.id);
    recovery = Object.freeze({ id: item.id, phase: item.phase });
  }
  const fullscreenIntents: RemoteCalibratorSnapshot["fullscreenIntents"][number][] =
    [];
  for (const item of value.fullscreenIntents) {
    if (
      !record(item) ||
      !id(item.id) ||
      used.has(item.id) ||
      item.kind !== "choose-screen"
    )
      return null;
    used.add(item.id);
    fullscreenIntents.push(
      Object.freeze({ id: item.id, kind: "choose-screen" }),
    );
  }
  if (
    value.status === "ended" &&
    (scopes.length || recovery || fullscreenIntents.length)
  )
    return null;
  return Object.freeze({
    version: 1,
    sourceId: value.sourceId,
    revision: value.revision,
    status: value.status,
    coverage: "partial",
    camera: value.camera,
    scopes: Object.freeze(scopes),
    recovery,
    fullscreenIntents: Object.freeze(fullscreenIntents),
  });
}

export function readRemoteEvent(
  value: unknown,
  snapshot: RemoteCalibratorSnapshot,
): RcEventType | null {
  if (
    !record(value) ||
    value.version !== 1 ||
    value.sourceId !== snapshot.sourceId ||
    value.revision !== snapshot.revision
  )
    return null;
  const scope = snapshot.scopes.find((item) => item.id === value.id);
  switch (value.type) {
    case "scope.begin":
      return scope &&
        scope.kind === value.kind &&
        scope.parentId === value.parentId &&
        scope.phase === "active"
        ? value.type
        : null;
    case "scope.settling":
      return scope?.phase === "settling" && outcomes.has(value.outcome)
        ? value.type
        : null;
    case "scope.end":
      return id(value.id) && !scope && outcomes.has(value.outcome)
        ? value.type
        : null;
    case "camera.changed":
      return value.status === snapshot.camera ? value.type : null;
    case "recovery.begin":
    case "recovery.phase":
      return snapshot.recovery?.id === value.id &&
        snapshot.recovery?.phase === value.phase
        ? value.type
        : null;
    case "recovery.end":
      return id(value.id) &&
        snapshot.recovery === null &&
        outcomes.has(value.outcome)
        ? value.type
        : null;
    case "fullscreen.intent.begin":
      return snapshot.fullscreenIntents.some(
        (item) => item.id === value.id && item.kind === value.kind,
      )
        ? value.type
        : null;
    case "fullscreen.intent.end":
      return id(value.id) &&
        !snapshot.fullscreenIntents.some((item) => item.id === value.id)
        ? value.type
        : null;
    case "session.ended":
      return snapshot.status === "ended" ? value.type : null;
    default:
      return null;
  }
}

/** Copy before enqueueing too: a caller must not mutate a pending observation. */
export function copyRemoteObservation(
  observation: RemoteCalibratorObservation,
): RemoteCalibratorObservation {
  const source = observation.snapshot;
  return Object.freeze({
    connection: observation.connection,
    reason: observation.reason,
    snapshot: source
      ? Object.freeze({
          ...source,
          scopes: Object.freeze(
            source.scopes.map((item) => Object.freeze({ ...item })),
          ),
          recovery: source.recovery
            ? Object.freeze({ ...source.recovery })
            : null,
          fullscreenIntents: Object.freeze(
            source.fullscreenIntents.map((item) => Object.freeze({ ...item })),
          ),
        })
      : null,
  });
}
