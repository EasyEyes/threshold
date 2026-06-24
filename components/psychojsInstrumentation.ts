/**
 * PsychoJS instrumentation for simulated participants.
 *
 * Wraps `MinimalStim.prototype._setAttribute` at runtime (Option C) to publish
 * stim attribute changes (text, autoDraw, pos, etc.) into the ee-state DOM
 * element, so observers can introspect them without per-frame cost.
 *
 * PsychoJS is vanilla `threshold-prod` — no fork required. The wrap and the
 * `_reportChange` handler are installed on the subclass prototype only when
 * sim mode is turned on (via {@link enableInstrumentation}); production code
 * paths inherit `_setAttribute` unchanged from `PsychObject.prototype` (zero
 * overhead).
 *
 * Filter is centralized here: the wrap calls `_reportChange` only when an
 * attribute actually changed; this module decides which attributes are
 * interesting via {@link ALLOWLIST}.
 */

import { setEEState } from "./simulatedState";

/** Stim attributes that observers care about.
 *
 * Inclusion rationale:
 * - Core visibility: text, autoDraw, pos, size, font, color
 * - Threshold parameters: contrast, opacity (often encode the intensity
 *   being tested in psychophysical staircases).
 * - Layout / RTL bugs: alignHoriz, alignVert, height, letterHeight,
 *   wrapWidth, flipHoriz (Arabic/Hebrew rendering, large-print truncation).
 *
 * Routing: every name below is routed through `_setAttribute` by PsychoJS's
 * canonical `_addAttribute(name, …)` pattern (PsychObject.js:348), which
 * auto-generates a `setX` method calling `_setAttribute(name, value, log)`.
 * Both `height` (TextStim.js:156) and `letterHeight` (TextBox.js:127) are
 * listed because the same concept uses different names across stim classes.
 *
 * Excluded: units, depth, orientation (internal), ori, vertices
 * (shape-only), internal refresh fields. */
export const ALLOWLIST = new Set([
  "text",
  "autoDraw",
  "pos",
  "size",
  "font",
  "color",
  "contrast",
  "opacity",
  "alignHoriz",
  "alignVert",
  "height",
  "letterHeight",
  "wrapWidth",
  "flipHoriz",
]);

/** Serialize a stim value to a compact string for DOM attr / JSONL.
 *  Never throws: circular → "[unserializable]". */
export function serializeStimValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") {
    if (Number.isNaN(v)) return "NaN";
    if (!Number.isFinite(v)) return v > 0 ? "Infinity" : "-Infinity";
    return String(v);
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) {
    try {
      return v.map((x) => serializeStimValue(x)).join(",");
    } catch {
      return "[unserializable]";
    }
  }
  try {
    return JSON.stringify(v);
  } catch {
    return "[unserializable]";
  }
}

/** Capitalize first letter, leave the rest untouched (preserves camelCase). */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Convert a stim attribute change into a {@link setEEState} update object,
 * or null if the attribute is not in the allowlist.
 *
 * Key format: `stim<CapitalizedName><CapitalizedAttr>` preserving the
 * original casing of name and attr beyond the first letter, e.g.
 * `stimTrialCounterText`, `stimTargetAutoDraw`, `stimFixationPos`.
 */
export function stimChangeToStateUpdate(
  stimName: string,
  attr: string,
  value: unknown,
): Record<string, string> | null {
  if (!ALLOWLIST.has(attr)) return null;
  const safe = String(stimName ?? "").replace(/[^a-zA-Z0-9]/g, "");
  if (!safe) return null;
  const key = "stim" + cap(safe) + cap(attr);
  return { [key]: serializeStimValue(value) };
}

/**
 * Implementation of `MinimalStim.prototype._reportChange`. Called by the
 * `_setAttribute` wrap (installed by {@link enableInstrumentation}) whenever
 * a stim attribute actually changes. Filters to the allowlist, publishes to
 * #ee-state, and emits a console.debug event that the JSONL observer
 * captures for the event stream.
 *
 * Must be invoked with `this` bound to a stim-like object with `_name`.
 */
export function stimChangeReporter(
  this: { _name: string },
  name: string,
  value: unknown,
): void {
  const update = stimChangeToStateUpdate(this._name, name, value);
  if (!update) return;
  setEEState(update);
  const serialized = serializeStimValue(value);
  console.debug(
    `[sim:stim] ${this._name}.${name} = ${JSON.stringify(serialized)}`,
  );
}

/**
 * Install stim-change instrumentation on the given stim class.
 *
 * Option C: PsychoJS itself is untouched in production. We install BOTH the
 * `_setAttribute` wrap AND the `_reportChange` handler on the stim subclass
 * prototype at runtime, only when sim mode is turned on (via
 * {@link startSimulatedParticipant} → {@link setupInstrumentation}).
 *
 * Production (sim off): `MinimalStim.prototype._setAttribute` is inherited
 * unchanged from `PsychObject.prototype._setAttribute`. Zero overhead.
 *
 * Sim on: the wrap shadows the inherited method, delegates to the original
 * (preserving its `hasChanged` return value), and fires `_reportChange` only
 * when an attribute actually changed. Idempotent — a second call re-installs
 * the same wrap without double-wrapping.
 *
 * Why subclass-level, not base-level: only stim attribute changes are
 * interesting (text, pos, autoDraw, …). Patching `PsychObject.prototype`
 * would also intercept TrialHandler / QuestHandler / FaceDetector internals.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function enableInstrumentation(MinimalStimClass: any): void {
  const proto = MinimalStimClass.prototype;

  // Idempotency: if we've already installed our wrap, do nothing. We mark
  // the wrap with a sentinel property so a second call can detect it without
  // relying on function-reference identity (which breaks across HMR reloads).
  if (proto._setAttribute?.__eeSimWrapped) return;

  // Resolve the original via the prototype chain BEFORE shadowing it.
  // Once we assign below, proto._setAttribute will be our wrap; the inherited
  // (PsychObject's) is what we capture here.
  const originalSetAttribute = proto._setAttribute;

  const wrap = function _setAttribute(
    this: { _reportChange?: (name: string, value: unknown) => void },
    name: string,
    value: unknown,
    log?: boolean,
    operation?: unknown,
    stealth?: boolean,
  ): boolean {
    const hasChanged = originalSetAttribute.call(
      this,
      name,
      value,
      log,
      operation,
      stealth,
    );
    if (hasChanged) {
      // `_reportChange` is the second thing this module installs (below).
      // We read it off `this` so subclasses / instance overrides still win.
      this._reportChange?.(name, value);
    }
    return hasChanged;
  };
  // Tag the wrap so the idempotency check above recognises it on re-call.
  Object.defineProperty(wrap, "__eeSimWrapped", {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  proto._setAttribute = wrap;
  proto._reportChange = stimChangeReporter;
}
