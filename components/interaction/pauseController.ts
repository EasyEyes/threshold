import { decidePause } from "./pausePolicy";
import type { Snapshot } from "./types";

export interface PauseView {
  close(): void;
  setBusy(busy: boolean): void;
}
export interface PauseActions {
  resume(): void;
  quit(): void;
}

/** Owns only interruption lifetime. It never restarts or dismisses an RC step. */
export function createPauseController(deps: {
  snapshot(): Snapshot | null;
  host(): {
    terminated: boolean;
    suppressed: boolean;
    intentional: boolean;
    recovering?: boolean;
  };
  fullscreen(): boolean;
  requestFullscreen(): Promise<unknown>;
  clearInput(): void;
  acknowledgeFullscreen(): void;
  beginInterruption(): () => void;
  blockInput(): () => void;
  present(actions: PauseActions): PauseView;
  quit(trigger: string): void;
}) {
  let view: PauseView | null = null;
  let release: (() => void) | null = null;
  let releaseRecovery: (() => void) | null = null;
  let pending = false;
  let recovering = false;
  let busy = false;
  let stopped = false;
  let generation = 0;
  let trigger = "";
  let reconciling = false;
  function close() {
    generation++;
    busy = false;
    const previous = view;
    const finish = release;
    view = null;
    release = null;
    previous?.close();
    finish?.();
    deps.clearInput();
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    pending = recovering = false;
    close();
    releaseRecovery?.();
    releaseRecovery = null;
  }
  function reconcile() {
    if (stopped || reconciling) return;
    reconciling = true;
    try {
      const decision = decidePause(deps.snapshot(), deps.host());
      if (decision === "stop") {
        stop();
        return;
      }
      if (decision === "recovering") {
        recovering = true;
        releaseRecovery ??= deps.blockInput();
        if (view || !deps.fullscreen()) pending = true;
        if (view) close();
        return;
      }
      if (recovering) {
        recovering = false;
        releaseRecovery?.();
        releaseRecovery = null;
        if (deps.fullscreen()) {
          pending = false;
          trigger = "";
          deps.clearInput();
          deps.acknowledgeFullscreen();
        } else pending = true;
      }
      if (decision === "intentional") return;
      if (!pending || view) return;
      const unblock = deps.blockInput();
      const finish = deps.beginInterruption();
      release = () => {
        unblock();
        finish();
      };
      deps.clearInput();
      try {
        view = deps.present({ resume, quit });
      } catch (error) {
        close();
        throw error;
      }
    } finally {
      reconciling = false;
    }
  }
  async function resume() {
    if (stopped || !view || busy) return;
    busy = true;
    const attempt = generation;
    view.setBusy(true);
    // Invoke directly on the click/key gesture; no await before the native request.
    try {
      await deps.requestFullscreen();
    } catch {
      /* Keep Resume available. */
    }
    if (stopped || attempt !== generation || !view) return;
    busy = false;
    view.setBusy(false);
    if (decidePause(deps.snapshot(), deps.host()) !== "present") {
      reconcile();
      return;
    }
    if (!deps.fullscreen()) return;
    pending = false;
    trigger = "";
    deps.acknowledgeFullscreen();
    close();
  }
  function quit() {
    if (stopped || !view) return;
    const reason = trigger;
    stop();
    deps.quit(reason);
  }
  return {
    request(reason = "") {
      if (stopped) return;
      if (view) return;
      const decision = decidePause(deps.snapshot(), deps.host());
      if (decision === "stop") {
        stop();
        return;
      }
      if (decision === "intentional" || deps.fullscreen()) return;
      pending = true;
      trigger = reason;
      reconcile();
    },
    reconcile,
    stop,
    isActive: () => !stopped && (pending || recovering || !!view),
    isPresenting: () => !stopped && !!view,
  };
}
