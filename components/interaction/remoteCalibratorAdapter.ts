import type { createInteractionCoordinator } from "./coordinator";
import type {
  RemoteCalibratorSnapshot,
  RcObservationReason,
  RemoteCalibratorObservation,
  RcEventType,
} from "./types";
import {
  readRemoteSnapshot,
  readRemoteEvent,
} from "./remoteCalibratorContract";

type Coordinator = ReturnType<typeof createInteractionCoordinator>;

/** A source adapter, never a controller: no RC methods other than subscription are called. */
export function attachRemoteCalibrator(
  source: unknown,
  coordinator: Coordinator,
) {
  const sessionId = coordinator.getSnapshot().sessionId;
  let previous: RemoteCalibratorSnapshot | null = null;
  let stopped = false;
  let unsubscribe: (() => void) | null = null;
  let receivedInitial = false;

  function publish(
    observation: RemoteCalibratorObservation,
    sourceEvent?: RcEventType,
  ) {
    coordinator.dispatch({
      type: "rc.observed",
      sessionId,
      observation,
      sourceEvent,
    });
  }
  function release() {
    const callback = unsubscribe;
    unsubscribe = null;
    try {
      callback?.();
    } catch {
      /* RC disposal cannot stop the study. */
    }
  }
  function fail(
    reason: RcObservationReason,
    connection: "invalid" | "unavailable" = "invalid",
  ) {
    if (stopped) return;
    stopped = true;
    publish({ connection, reason, snapshot: null });
    release();
  }
  function receive(raw: unknown, event: unknown) {
    if (stopped) return;
    try {
      if (
        raw &&
        typeof raw === "object" &&
        (raw as { version?: unknown }).version !== 1
      ) {
        fail("unsupported-version");
        return;
      }
      const snapshot = readRemoteSnapshot(raw);
      if (!snapshot) {
        fail("invalid-snapshot");
        return;
      }
      let sourceEvent: RcEventType | undefined;
      if (!receivedInitial) {
        if (event !== null) {
          fail("missing-initial-snapshot");
          return;
        }
        receivedInitial = true;
      } else {
        if (!previous || snapshot.sourceId !== previous.sourceId) {
          fail("source-changed");
          return;
        }
        // Ignore already-delivered/stale callbacks; never rewind source state.
        if (snapshot.revision <= previous.revision) return;
        if (snapshot.revision !== previous.revision + 1) {
          fail("revision-gap");
          return;
        }
        const type = readRemoteEvent(event, snapshot);
        if (!type) {
          fail("invalid-event");
          return;
        }
        sourceEvent = type;
      }
      previous = snapshot;
      publish(
        {
          connection: snapshot.status === "ended" ? "ended" : "observing",
          reason: null,
          snapshot,
        },
        sourceEvent,
      );
      if (snapshot.status === "ended") {
        stopped = true;
        release();
      }
    } catch {
      fail("source-error");
    }
  }

  try {
    const rc = source as {
      getInteractionSnapshot?: unknown;
      onInteractionChange?: unknown;
    } | null;
    if (
      typeof rc?.getInteractionSnapshot !== "function" ||
      typeof rc.onInteractionChange !== "function"
    ) {
      fail("unsupported-api", "unavailable");
    } else {
      const result = rc.onInteractionChange.call(source, receive);
      if (typeof result !== "function") fail("invalid-subscription");
      else unsubscribe = result;
      if (!receivedInitial && !stopped) fail("missing-initial-snapshot");
      if (stopped) release();
    }
  } catch {
    fail("subscribe-failed");
  }

  return {
    dispose() {
      if (!stopped) {
        stopped = true;
        publish({ connection: "detached", reason: null, snapshot: null });
      }
      release();
    },
  };
}
