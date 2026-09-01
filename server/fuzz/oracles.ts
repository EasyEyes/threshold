/**
 * Pure oracles for the runtime fuzzer tier: stream invariants, error
 * signatures, and fatal-error extraction. Everything here is deterministic
 * and Jest-testable without a browser; the tier-2 driver only wires these to
 * simulate() results.
 */
import type { EventEnvelope } from "../diffEvents";
import { diffStreams } from "../diffEvents";

export interface InvariantResult {
  ok: boolean;
  violations: string[];
}

/** Walk a payload; call back for every non-finite numeric leaf. */
function findNonFinite(value: unknown, path: string[], hits: string[]): void {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) hits.push(`${path.join(".") || "<root>"} = ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => findNonFinite(v, [...path, String(i)], hits));
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const [k, v] of Object.entries(value)) findNonFinite(v, [...path, k], hits);
  }
}

/** Structural invariants every valid event stream must satisfy. */
export function checkInvariants(events: EventEnvelope[]): InvariantResult {
  const violations: string[] = [];
  for (let i = 0; i < events.length; i++) {
    const env = events[i];
    if (env.seq !== i + 1) violations.push(`seq gap: expected ${i + 1}, got ${env.seq}`);
    if (!env.e || typeof env.e.type !== "string" || env.e.type === "")
      violations.push(`envelope ${i + 1}: missing e.type`);
    const nonFinite: string[] = [];
    findNonFinite(env.e, ["e"], nonFinite);
    for (const hit of nonFinite) violations.push(`non-finite number at envelope ${i + 1}: ${hit}`);
  }
  return { ok: violations.length === 0, violations };
}

/** Stable signature: kind + digit- and case-normalized detail (head + tail
 *  kept — param names and error specifics usually sit at the tail). */
export function signatureOf(kind: string, detail: string): string {
  const normalized = detail
    .toLowerCase()
    .replace(/[0-9]+(\.[0-9]+)?/g, "#")
    .replace(/\s+/g, " ")
    .trim();
  const clipped =
    normalized.length <= 128 ? normalized : normalized.slice(0, 48) + "…" + normalized.slice(-80);
  return `${kind}|${clipped}`;
}

/** Message of the first error.reported event, or null. */
export function firstFatalError(events: EventEnvelope[]): string | null {
  for (const env of events) {
    if (env.e?.type === "error.reported") return String(env.e.message ?? "<no message>");
  }
  return null;
}

/** Verdict for a divergence between runs 1 and 2, given the third
 * (arbitration) run. A timed-out arbitration run is a TIMEOUT — never a
 * nondeterminism finding (wrong class, wrong triage queue). */
export type ArbitrationVerdict = "flake" | "nondeterminism" | "timeout";

export function arbitrationOutcome(
  r1: EventEnvelope[],
  r2: EventEnvelope[],
  third: { threw: Error | null; events: EventEnvelope[] | null },
): ArbitrationVerdict {
  if (third.threw || !third.events) return "timeout";
  if (diffStreams(r1, third.events).equal || diffStreams(r2, third.events).equal)
    return "flake";
  return "nondeterminism";
}
