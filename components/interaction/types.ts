/** Tokens identify one operation within one coordinator session. */
export type Token = number;
export type Owner = "easyeyes" | "remote-calibrator";
export type Outcome = "completed" | "cancelled" | "failed";
export type CameraStatus =
  | "unknown"
  | "ready"
  | "disconnected"
  | "reconnecting"
  | "failed";
export type RecoveryPhase =
  | "awaiting-resume"
  | "attempting"
  | "retry"
  | "settling";

export interface Scope {
  readonly token: Token;
  readonly parentToken: Token | null;
  readonly owner: Owner;
  readonly label: string;
}

export interface Interruption {
  readonly token: Token;
  readonly reason: "fullscreen-lost" | "camera-unavailable" | "other";
}

export interface Snapshot {
  readonly studyPhase: StudyPhase;
  readonly remoteCalibrator: RemoteCalibratorObservation | null;
  readonly sessionId: string;
  readonly revision: number;
  readonly lifecycle: "active" | "ending" | "ended";
  readonly coverage: "unknown" | "known";
  readonly scopes: readonly Scope[];
  readonly camera: CameraStatus;
  readonly recovery: Readonly<{ token: Token; phase: RecoveryPhase }> | null;
  readonly fullscreen: "unknown" | "present" | "missing";
  readonly fullscreenIntents: readonly Token[];
  readonly interruptions: readonly Interruption[];
  /** Prevents replay of completed operations without retaining unbounded history. */
  readonly lastTokenId: Token;
}

export type EventPayload =
  | { type: "study.phase"; phase: StudyPhase }
  | {
      type: "rc.observed";
      observation: RemoteCalibratorObservation;
      sourceEvent?: RcEventType;
    }
  | ({ type: "scope.begin" } & Scope)
  | { type: "scope.end"; token: Token; outcome: Outcome }
  | ({ type: "interruption.begin" } & Interruption)
  | { type: "interruption.end"; token: Token }
  | { type: "camera.changed"; status: CameraStatus }
  | { type: "recovery.begin"; token: Token }
  | { type: "recovery.advance"; token: Token; phase: RecoveryPhase }
  | { type: "recovery.end"; token: Token; outcome: Outcome }
  | { type: "fullscreen.changed"; status: Snapshot["fullscreen"] }
  | { type: "fullscreen.intent.begin"; token: Token }
  | { type: "fullscreen.intent.end"; token: Token }
  | { type: "coverage.changed"; coverage: Snapshot["coverage"] }
  | { type: "session.ending" }
  | { type: "session.ended" };

export type InteractionEvent = EventPayload & { readonly sessionId: string };
export type IgnoreReason =
  | "wrong-session"
  | "session-not-active"
  | "invalid-transition"
  | "stale-token"
  | "parent-not-active"
  | "scope-has-children"
  | "unchanged";

export type TransitionResult =
  | { readonly status: "applied"; readonly snapshot: Snapshot }
  | {
      readonly status: "ignored";
      readonly snapshot: Snapshot;
      readonly reason: IgnoreReason;
    };

export interface Change {
  readonly event: Readonly<InteractionEvent>;
  readonly previous: Snapshot;
  readonly current: Snapshot;
}

export type StudyPhase =
  | "startup"
  | "compatibility"
  | "calibration"
  | "study"
  | "ending";
export type RcEventType =
  | "scope.begin"
  | "scope.settling"
  | "scope.end"
  | "camera.changed"
  | "recovery.begin"
  | "recovery.phase"
  | "recovery.end"
  | "fullscreen.intent.begin"
  | "fullscreen.intent.end"
  | "session.ended";
export type RcObservationReason =
  | "unsupported-api"
  | "unsupported-version"
  | "invalid-snapshot"
  | "missing-initial-snapshot"
  | "source-changed"
  | "revision-gap"
  | "invalid-event"
  | "source-error"
  | "invalid-subscription"
  | "subscribe-failed";
export interface RemoteCalibratorSnapshot {
  readonly version: 1;
  readonly sourceId: string;
  readonly revision: number;
  readonly status: "active" | "ended";
  readonly coverage: "partial";
  readonly scopes: readonly Readonly<{
    id: number;
    kind: string;
    parentId: number | null;
    phase: "active" | "settling";
  }>[];
  readonly camera: CameraStatus;
  readonly recovery: Readonly<{ id: number; phase: RecoveryPhase }> | null;
  readonly fullscreenIntents: readonly Readonly<{
    id: number;
    kind: "choose-screen";
  }>[];
}
export interface RemoteCalibratorObservation {
  readonly connection:
    | "observing"
    | "unavailable"
    | "invalid"
    | "detached"
    | "ended";
  readonly reason: RcObservationReason | null;
  readonly snapshot: RemoteCalibratorSnapshot | null;
}
