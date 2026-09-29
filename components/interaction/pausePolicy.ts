import type { Snapshot } from "./types";

export type PauseDecision = "stop" | "intentional" | "recovering" | "present";

/** Positive recovery/intent evidence only. Partial coverage never grants UI ownership. */
export function decidePause(
  snapshot: Snapshot | null,
  host: {
    terminated: boolean;
    suppressed: boolean;
    intentional: boolean;
    recovering?: boolean;
  },
): PauseDecision {
  if (host.terminated || (snapshot && snapshot.lifecycle !== "active"))
    return "stop";
  const remote = snapshot?.remoteCalibrator;
  const rc = remote?.connection === "observing" ? remote.snapshot : null;
  if (rc?.status === "ended") return "stop";
  // Recovery takes precedence even while getUserMedia temporarily sets an intent flag.
  if (host.recovering || rc?.recovery) return "recovering";
  if (host.suppressed || host.intentional || rc?.fullscreenIntents.length)
    return "intentional";
  return "present";
}
