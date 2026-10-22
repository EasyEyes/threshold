/**
 * heapTelemetry — the two things the per-trial heap columns cannot say for
 * themselves:
 *
 * 1. {@link heapSampleLiveVerdict}: whether `performance.memory` actually
 *    tracks the heap in this browser. Some Chromium builds — and, in the
 *    field, whole sessions — return ONE stale constant for the entire run, so
 *    a column of 180.4959574 repeated over 100 trials is indistinguishable
 *    from a perfectly flat heap. The verdict is read off the samples
 *    themselves: a frozen reporter repeats itself to the byte, a live one
 *    never does (any allocation between two trials moves it).
 * 2. {@link textureStats}: renderer-managed texture count and bytes. The JS
 *    heap columns cannot see texture/backing-store memory.
 *
 * An allocation probe was the first attempt and is NOT used: during boot a
 * major GC can reclaim the probe inside the same window, so the reading
 * legitimately does not move.
 */

export interface TextureStats {
  /** Renderer-managed base textures (the GC system's queue). */
  count: number;
  /** Summed RGBA8 backing-store size of those textures. */
  mb: number;
}

/** Sample count needed before "all identical" is verdict-worthy. */
const FROZEN_SAMPLES = 3;

/** Recent-trial window feeding {@link heapSampleLiveVerdict}. */
const HISTORY_WINDOW = 8;

/**
 * TRUE when consecutive samples differ (the reporter tracks the heap), FALSE
 * once {@link FROZEN_SAMPLES} samples are byte-identical, undefined while the
 * evidence is still too thin to say.
 */
export function heapSampleLiveVerdict(
  samples: number[],
  minFrozenSamples = FROZEN_SAMPLES,
): boolean | undefined {
  const finite = samples.filter((s) => Number.isFinite(s));
  for (let i = 1; i < finite.length; i++)
    if (finite[i] !== finite[i - 1]) return true;
  return finite.length >= minFrozenSamples ? false : undefined;
}

/**
 * Texture memory the JS heap cannot see. `managedTextures` is PixiJS
 * TextureSystem's live list; the texture GC punches null holes while
 * collecting, so holes are skipped. Null when no WebGL renderer is present
 * (canvas fallback has no texture system).
 */
export function textureStats(renderer: any): TextureStats | null {
  const managed = renderer?.texture?.managedTextures;
  if (!Array.isArray(managed)) return null;
  let count = 0;
  let bytes = 0;
  for (const t of managed) {
    if (!t) continue;
    count++;
    const w = t.realWidth ?? t.width ?? 0;
    const h = t.realHeight ?? t.height ?? 0;
    if (Number.isFinite(w) && Number.isFinite(h)) bytes += w * h * 4;
  }
  return { count, mb: bytes / (1024 * 1024) };
}

// Heap samples of recent trials: a frozen reporter repeats one value to the
// byte, a live one never does. Verdict cached once it is decided.
const heapUsedHistory: number[] = [];
let heapSampleLiveCache: boolean | undefined;

/**
 * Stateful recorder around {@link heapSampleLiveVerdict}: push one sample per
 * trial, get the verdict once the evidence decides it (then cached forever).
 */
export function recordHeapUsed(usedMB: number): boolean | undefined {
  if (heapSampleLiveCache !== undefined) return heapSampleLiveCache;
  heapUsedHistory.push(usedMB);
  if (heapUsedHistory.length > HISTORY_WINDOW) heapUsedHistory.shift();
  const verdict = heapSampleLiveVerdict(heapUsedHistory);
  if (verdict !== undefined) heapSampleLiveCache = verdict;
  return heapSampleLiveCache;
}
