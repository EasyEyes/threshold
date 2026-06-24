/**
 * Dispatch logging for the simulated participant.
 *
 * Emits `[sim:dispatch]` events for every synthetic input the simulator
 * dispatches (key presses, clicks). The JSONL observer captures these so
 * agents can correlate dispatches with subsequent state changes:
 *
 *   "Did `[sim:dispatch] key="Space"` result in a phase transition?"
 *   If not, the event was likely dropped by PsychoJS's event manager.
 *
 * Default off in production; only called from simulatedParticipant.ts.
 */

export type DispatchKind = "key" | "click" | "qa-radio" | "qa-textarea";

/**
 * Format a dispatch event for the JSONL debug stream.
 * Format: `[sim:dispatch] <kind>="<detail>"`
 *
 * `detail` is the key character for key dispatches, or a CSS selector /
 * element id for click dispatches. Embedded quotes are escaped.
 */
export function formatDispatch(kind: DispatchKind, detail: string): string {
  const escaped = detail.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `[sim:dispatch] ${kind}="${escaped}"`;
}

/**
 * Emit a dispatch event to console.debug. Called by the simulated participant
 * after every synthetic input dispatch.
 */
export function logDispatch(kind: DispatchKind, detail: string): void {
  console.debug(formatDispatch(kind, detail));
}
