import { createInteractionCoordinator } from "./coordinator";
import { attachRemoteCalibrator } from "./remoteCalibratorAdapter";
import type { EventPayload, Snapshot, RcEventType, StudyPhase } from "./types";

interface TraceEntry {
  readonly elapsedMs: number;
  readonly event: EventPayload["type"] | "initial";
  readonly sourceEvent?: RcEventType;
  readonly snapshot: Snapshot;
}
export interface InteractionDiagnostics {
  readonly getSnapshot: () => Snapshot;
  readonly getTrace: () => readonly TraceEntry[];
}
interface ObservationWindow extends Window {
  __easyEyesInteraction?: InteractionDiagnostics;
}
const fullscreenEvents = [
  "fullscreenchange",
  "webkitfullscreenchange",
  "mozfullscreenchange",
  "MSFullscreenChange",
];
let nextSession = 0;
let active: ReturnType<typeof createObservation> | null = null;
const noop = () => {};

/** Regular study URLs always use managed interactions, including production.
 * Development-only overrides allow comparison against legacy behavior.
 */
export function shouldObserveInteraction(development: boolean, search: string) {
  return (
    !development || new URLSearchParams(search).get("interactionMode") !== "off"
  );
}
export function shouldManageInteraction(development: boolean, search: string) {
  return (
    !development ||
    !["observe", "off"].includes(
      new URLSearchParams(search).get("interactionMode") ?? "",
    )
  );
}

/** No participant identifiers, persistence, device calls or UI policy. */
function createObservation(options: {
  rc: unknown;
  window: Window;
  document: Document;
  traceLimit?: number;
  managed?: boolean;
}) {
  const win = options.window as ObservationWindow;
  const doc = options.document;
  const coordinator = createInteractionCoordinator(
    `observation-${++nextSession}`,
  );
  const sessionId = coordinator.getSnapshot().sessionId;
  const trace: TraceEntry[] = [];
  const limit = Number.isFinite(options.traceLimit)
    ? Math.max(1, Math.min(500, Math.floor(options.traceLimit!)))
    : 128;
  const started = win.performance.now();
  const record = coordinator.subscribe((snapshot, change) => {
    trace.push(
      Object.freeze({
        elapsedMs: Math.max(0, win.performance.now() - started),
        event: change?.event.type ?? "initial",
        sourceEvent:
          change?.event.type === "rc.observed"
            ? change.event.sourceEvent
            : undefined,
        snapshot,
      }),
    );
    if (trace.length > limit) trace.shift();
  });
  const diagnostics: InteractionDiagnostics = Object.freeze({
    getSnapshot: coordinator.getSnapshot,
    getTrace: () => Object.freeze([...trace]),
  });
  let disposed = false;
  const dispatch = (event: EventPayload) => {
    if (!disposed) coordinator.dispatch({ ...event, sessionId });
  };
  const fullscreen = () => {
    const compatible = doc as Document & {
      webkitFullscreenElement?: Element;
      mozFullScreenElement?: Element;
      msFullscreenElement?: Element;
    };
    dispatch({
      type: "fullscreen.changed",
      status:
        doc.fullscreenElement ||
        compatible.webkitFullscreenElement ||
        compatible.mozFullScreenElement ||
        compatible.msFullscreenElement
          ? "present"
          : "missing",
    });
  };
  const adapter = attachRemoteCalibrator(options.rc, coordinator);
  function stop() {
    if (disposed) return;
    adapter.dispose();
    dispatch({ type: "session.ending" });
    dispatch({ type: "session.ended" });
    disposed = true;
    fullscreenEvents.forEach((name) =>
      doc.removeEventListener(name, fullscreen),
    );
    win.removeEventListener("pagehide", stop);
    record();
  }
  try {
    fullscreenEvents.forEach((name) => doc.addEventListener(name, fullscreen));
    win.addEventListener("pagehide", stop);
    fullscreen();
    // Inspection only. The coordinator and its mutation methods stay private.
    Object.defineProperty(win, "__easyEyesInteraction", {
      configurable: true,
      value: diagnostics,
    });
  } catch (error) {
    stop();
    throw error;
  }
  return {
    managed: options.managed === true,
    subscribe: coordinator.subscribe,
    diagnostics,
    stop,
    routine(name: string) {
      const phase: StudyPhase | undefined = [
        "titlePage",
        "compatibilityFlow",
        "consentForm",
      ].includes(name)
        ? "compatibility"
        : [
            "soundCalibration",
            "displayPrecisionTest",
            "rcCalibration",
          ].includes(name)
        ? "calibration"
        : [
            "experimentInit",
            "blocksLoopBegin",
            "trialsLoopBegin",
            "trialRoutineBegin",
          ].includes(name)
        ? "study"
        : undefined;
      if (phase) dispatch({ type: "study.phase", phase });
    },
    pause() {
      if (disposed) return noop;
      const token = coordinator.issueToken();
      dispatch({
        type: "interruption.begin",
        token,
        reason: "fullscreen-lost",
      });
      let closed = false;
      return () => {
        if (closed) return;
        closed = true;
        dispatch({ type: "interruption.end", token });
      };
    },
  };
}

/** Called at study startup; importing this module has no browser side effects. */
export function startInteractionObservation(options: {
  enabled: boolean;
  rc: unknown;
  window: Window;
  document: Document;
  traceLimit?: number;
  managed?: boolean;
}): InteractionDiagnostics | null {
  if (!options.enabled) return null;
  if (active) return active.diagnostics;
  try {
    active = createObservation(options);
    return active.diagnostics;
  } catch {
    return null;
  } // Diagnostics must not interrupt startup.
}
export function observeRoutine(name: string) {
  active?.routine(name);
}
export function observeFullscreenPause() {
  return active?.pause() ?? noop;
}
export function stopInteractionObservation() {
  active?.stop();
  active = null;
}
export const interactionManagementEnabled = () => active?.managed === true;
export const getInteractionSnapshot = () =>
  active?.diagnostics.getSnapshot() ?? null;
export const subscribeInteraction = (listener: (snapshot: Snapshot) => void) =>
  active?.subscribe(listener) ?? noop;
