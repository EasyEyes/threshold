import { createInitialSnapshot, transition } from "./transition";
import type {
  Change,
  InteractionEvent,
  Snapshot,
  TransitionResult,
} from "./types";

type Observer = (
  snapshot: Snapshot,
  change: Change | null,
) => void | Promise<void>;
type DispatchResult = TransitionResult | { readonly status: "queued" };

/** Explicit per-session instance. Importing this module installs no handlers. */
export function createInteractionCoordinator(
  sessionId: string,
  options: { onObserverError?: (error: unknown) => void } = {},
) {
  let snapshot = createInitialSnapshot(sessionId);
  let lastIssued = 0;
  let processing = false;
  // Subscription records allow the same callback to be independently registered.
  const observers = new Set<{ notify: Observer }>();
  const queue: { event: InteractionEvent; result?: TransitionResult }[] = [];

  function report(error: unknown) {
    try {
      options.onObserverError?.(error);
    } catch {
      /* Diagnostics cannot stop dispatch. */
    }
  }

  function notify(observer: Observer, change: Change | null) {
    try {
      const result = observer(snapshot, change);
      if (result) void Promise.resolve(result).catch(report);
    } catch (error) {
      report(error);
    }
  }

  function drain() {
    if (processing) return;
    processing = true;
    try {
      while (queue.length) {
        const item = queue.shift()!;
        const previous = snapshot;
        const result = transition(previous, item.event);
        item.result = result;
        if (result.status === "ignored") continue;
        snapshot = result.snapshot;
        const change = Object.freeze({
          event: item.event,
          previous,
          current: snapshot,
        });
        for (const entry of [...observers]) {
          if (observers.has(entry)) notify(entry.notify, change);
        }
      }
    } finally {
      processing = false;
    }
  }

  return {
    getSnapshot: () => snapshot,
    /** Issue immediately before dispatching a begin event; do not reserve tokens across awaits. */
    issueToken() {
      if (snapshot.lifecycle !== "active")
        throw new Error("Session is no longer active");
      lastIssued = Math.max(lastIssued, snapshot.lastTokenId) + 1;
      if (!Number.isSafeInteger(lastIssued))
        throw new Error("Operation token space exhausted");
      return lastIssued;
    },
    dispatch(event: InteractionEvent): DispatchResult {
      const item: { event: InteractionEvent; result?: TransitionResult } = {
        event: Object.freeze({ ...event }),
      };
      queue.push(item);
      drain();
      return item.result ?? { status: "queued" };
    },
    /** Delivers current state immediately, then accepted changes in revision order. */
    subscribe(observer: Observer) {
      const entry = { notify: observer };
      observers.add(entry);
      const wasProcessing = processing;
      processing = true;
      try {
        notify(observer, null);
      } finally {
        processing = wasProcessing;
      }
      drain();
      return () => {
        observers.delete(entry);
      };
    },
  };
}
