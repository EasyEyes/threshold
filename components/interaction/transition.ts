import type {
  IgnoreReason,
  InteractionEvent,
  RecoveryPhase,
  Snapshot,
  TransitionResult,
} from "./types";

function freeze(snapshot: Snapshot): Snapshot {
  snapshot.scopes.forEach(Object.freeze);
  snapshot.interruptions.forEach(Object.freeze);
  Object.freeze(snapshot.scopes);
  Object.freeze(snapshot.interruptions);
  Object.freeze(snapshot.fullscreenIntents);
  if (snapshot.recovery) Object.freeze(snapshot.recovery);
  return Object.freeze(snapshot);
}

export function createInitialSnapshot(sessionId: string): Snapshot {
  if (!sessionId.trim()) throw new Error("A nonempty session ID is required");
  return freeze({
    sessionId,
    revision: 0,
    lifecycle: "active",
    coverage: "unknown",
    scopes: [],
    camera: "unknown",
    recovery: null,
    fullscreen: "unknown",
    fullscreenIntents: [],
    interruptions: [],
    lastTokenId: 0,
  });
}

/** Returns null for unknown coverage; absence of RC events never implies EE ownership. */
export function currentScope(snapshot: Snapshot) {
  if (snapshot.coverage !== "known") return null;
  return snapshot.scopes[snapshot.scopes.length - 1] ?? null;
}

const recoveryTransitions: Record<RecoveryPhase, readonly RecoveryPhase[]> = {
  "awaiting-resume": ["attempting"],
  attempting: ["retry", "settling"],
  retry: ["attempting"],
  settling: ["retry"],
};

/** Pure transition: records facts and validates lifetimes; never changes UI or devices. */
export function transition(
  state: Snapshot,
  event: InteractionEvent,
): TransitionResult {
  const ignore = (reason: IgnoreReason): TransitionResult => ({
    status: "ignored",
    snapshot: state,
    reason,
  });
  const apply = (patch: Partial<Snapshot>): TransitionResult => ({
    status: "applied",
    snapshot: freeze({ ...state, ...patch, revision: state.revision + 1 }),
  });

  if (event.sessionId !== state.sessionId) return ignore("wrong-session");
  if (event.type === "session.ending") {
    if (state.lifecycle !== "active") return ignore("session-not-active");
    return apply({
      lifecycle: "ending",
      coverage: "unknown",
      scopes: [],
      recovery: null,
      interruptions: [],
      fullscreenIntents: [],
    });
  }
  if (event.type === "session.ended") {
    return state.lifecycle === "ending"
      ? apply({ lifecycle: "ended" })
      : ignore("invalid-transition");
  }
  if (state.lifecycle !== "active") return ignore("session-not-active");

  // All operation kinds share one monotonically increasing token sequence.
  if (event.type.endsWith(".begin") && "token" in event) {
    if (
      !Number.isSafeInteger(event.token) ||
      event.token <= state.lastTokenId
    ) {
      return ignore("stale-token");
    }
  }

  switch (event.type) {
    case "scope.begin": {
      const parent = state.scopes[state.scopes.length - 1];
      if (event.parentToken !== (parent?.token ?? null))
        return ignore("parent-not-active");
      return apply({
        scopes: [
          ...state.scopes,
          {
            token: event.token,
            parentToken: event.parentToken,
            owner: event.owner,
            label: event.label,
          },
        ],
        lastTokenId: event.token,
      });
    }
    case "scope.end": {
      const index = state.scopes.findIndex(
        (scope) => scope.token === event.token,
      );
      if (index < 0) return ignore("stale-token");
      if (index !== state.scopes.length - 1)
        return ignore("scope-has-children");
      return apply({ scopes: state.scopes.slice(0, -1) });
    }
    case "interruption.begin":
      return apply({
        interruptions: [
          ...state.interruptions,
          { token: event.token, reason: event.reason },
        ],
        lastTokenId: event.token,
      });
    case "interruption.end":
      return state.interruptions.some((item) => item.token === event.token)
        ? apply({
            interruptions: state.interruptions.filter(
              (item) => item.token !== event.token,
            ),
          })
        : ignore("stale-token");
    case "camera.changed":
      return state.camera === event.status
        ? ignore("unchanged")
        : apply({ camera: event.status });
    case "recovery.begin":
      return state.recovery
        ? ignore("invalid-transition")
        : apply({
            recovery: { token: event.token, phase: "awaiting-resume" },
            lastTokenId: event.token,
          });
    case "recovery.advance":
      if (state.recovery?.token !== event.token) return ignore("stale-token");
      if (!recoveryTransitions[state.recovery.phase].includes(event.phase))
        return ignore("invalid-transition");
      return apply({ recovery: { token: event.token, phase: event.phase } });
    case "recovery.end":
      if (state.recovery?.token !== event.token) return ignore("stale-token");
      if (
        event.outcome === "completed" &&
        (state.recovery.phase !== "settling" || state.camera !== "ready")
      ) {
        return ignore("invalid-transition");
      }
      return apply({ recovery: null });
    case "fullscreen.changed":
      return state.fullscreen === event.status
        ? ignore("unchanged")
        : apply({ fullscreen: event.status });
    case "fullscreen.intent.begin":
      return apply({
        fullscreenIntents: [...state.fullscreenIntents, event.token],
        lastTokenId: event.token,
      });
    case "fullscreen.intent.end":
      return state.fullscreenIntents.includes(event.token)
        ? apply({
            fullscreenIntents: state.fullscreenIntents.filter(
              (token) => token !== event.token,
            ),
          })
        : ignore("stale-token");
    case "coverage.changed":
      return state.coverage === event.coverage
        ? ignore("unchanged")
        : apply({ coverage: event.coverage });
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}
