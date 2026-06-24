/**
 * ParamReader instrumentation for simulated participants.
 *
 * Wraps ParamReader.prototype.read to emit a structured console.debug event
 * for every call. The JSONL observer captures these for debugging:
 *   - Bug 1 (Arabic): see exactly what text is read for any condition.
 *   - Bug 2: see when read() returns [] (truthy) for filtered-out conditions.
 *   - Bug 4: see what thresholdParameter is read at each trial.
 *   - General: full observability into experiment parameter reads.
 *
 * Default off in production; sim mode calls installParamReaderReporter().
 */

/**
 * Format a param read event for the JSONL debug stream.
 * Format: `[sim:read] <name>[<bc>] = <value>` or
 *         `[sim:read] <name>[<bc>] = <value> (<source>)` when source is known.
 *
 * `source` is `"csv"` when the value came from the experiment table, or
 * `"glossary"` when ParamReader fell back to the glossary default. This
 * distinguishes "experimenter set this" from "runtime filled in the default" —
 * critical for debugging missing-parameter crashes (e.g. targetKind="" from
 * glossary fallback, see notes/TODO-crash-missing-targetKind.md).
 *
 * Arrays are serialized as CSV (matches stim value serialization), objects
 * via JSON. Strings are quoted so they're distinguishable from numbers in
 * the log.
 */
export function formatParamRead(
  name: string,
  blockCondition: string | number,
  value: unknown,
  source?: "csv" | "glossary" | "unknown",
): string {
  const bcStr =
    typeof blockCondition === "string"
      ? `"${blockCondition}"`
      : String(blockCondition);
  const valStr = serializeReadValue(value);
  const suffix = source ? ` (${source})` : "";
  return `[sim:read] ${name}[${bcStr}] = ${valStr}${suffix}`;
}

function serializeReadValue(v: unknown): string {
  if (v === undefined) return "undefined";
  if (Array.isArray(v)) return `[${v.join(",")}]`;
  if (typeof v === "string") return `"${v}"`;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

const INSTALLED = new WeakSet<object>();

/**
 * Wrap `ParamReaderClass.prototype.read` to emit a console.debug event after
 * each call. Preserves the return value and re-throws errors AFTER logging
 * them, so the observer can correlate "which read caused the crash" — this
 * is critical for debugging missing-parameter crashes like targetKind=""
 * (see notes/TODO-crash-missing-targetKind.md).
 *
 * The log includes the dispatch source — `"csv"` when the parameter exists in
 * the experiment table (went through `_getParam`), or `"glossary"` when
 * ParamReader fell back to the glossary default (went through
 * `_getParamGlossary`). This is detected by calling `this.has(name)` after
 * the read completes, mirroring the dispatch decision in `read()` itself.
 *
 * THROTTLING: PsychoJS reads some parameters every frame (showCounterBool,
 * showViewingDistanceBool) producing thousands of identical log lines per
 * trial. We skip logging when `(name, bc, source)` matches the immediately
 * previous emission. The read itself is NOT throttled — only the log line.
 *
 * Idempotent: installing twice on the same class does not double-wrap.
 */
export function installParamReaderReporter(ParamReaderClass: {
  prototype: {
    read: (...args: unknown[]) => unknown;
    has?: (name: string) => boolean;
  };
}): void {
  if (INSTALLED.has(ParamReaderClass.prototype)) return;
  INSTALLED.add(ParamReaderClass.prototype);

  let lastLogKey = "";
  const original = ParamReaderClass.prototype.read;
  ParamReaderClass.prototype.read = function (
    this: {
      has?: (name: string) => boolean;
    },
    ...args: unknown[]
  ): unknown {
    const name = String(args[0] ?? "");
    const bc = args[1] as string | number;
    let source: "csv" | "glossary" | "unknown";
    if (typeof this.has === "function") {
      try {
        source = this.has(name) ? "csv" : "glossary";
      } catch {
        source = "unknown";
      }
    } else {
      source = "unknown";
    }
    try {
      const result = original.apply(this, args);
      // Throttle: skip log if (name, bc, source) is identical to the last
      // emission. The VALUE is intentionally excluded from the key —
      // PsychoJS reads the same param at different BCs interleaved, and
      // including value would defeat the throttle for arrays.
      const logKey = `${name}|${bc}|${source}`;
      if (logKey !== lastLogKey) {
        lastLogKey = logKey;
        console.debug(formatParamRead(name, bc, result, source));
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.debug(
        `[sim:read] ${name}[${
          typeof bc === "string" ? `"${bc}"` : String(bc)
        }] = ERROR: ${msg} (${source})`,
      );
      throw err;
    }
  };
}
