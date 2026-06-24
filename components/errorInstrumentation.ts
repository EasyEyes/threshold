/**
 * Error instrumentation for simulated participants.
 *
 * Adds non-invasive `error` and `unhandledrejection` listeners that publish
 * to the JSONL stream via `console.debug("[sim:error] ...")` and `setEEState`.
 *
 * Stacks alongside `errorHandling.js` (which uses `window.onerror =` direct
 * assignment). `addEventListener` and `window.onerror=` are independent
 * channels in browsers; neither blocks the other.
 *
 * Default off in production; sim mode calls installErrorReporter().
 */

import { setEEState } from "./simulatedState";

/**
 * Format an error event for the JSONL debug stream.
 * Format: `[sim:error] <message>` (single line; newlines collapsed).
 */
export function formatError(message: string): string {
  const oneLine = message.replace(/\s+/g, " ").trim();
  return `[sim:error] ${oneLine}`;
}

let INSTALLED = false;

/**
 * Install error listeners on `window`. Idempotent.
 *
 * Uses `addEventListener` (not `window.onerror =`) so it does NOT replace
 * any existing handler installed by `components/errorHandling.js`.
 */
export function installErrorReporter(): void {
  if (INSTALLED) return;
  INSTALLED = true;

  window.addEventListener("error", (event) => {
    const msg = event.message || String(event.error || event);
    console.debug(formatError(msg));
    setEEState({ error: msg });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);
    console.debug(formatError(`Unhandled rejection: ${msg}`));
    setEEState({ error: `Unhandled rejection: ${msg}` });
  });
}
