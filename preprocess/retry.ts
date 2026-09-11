export const BASE_DELAY_SEC = 0.2;
export const MAX_DELAY_SEC = 30;
export const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));
export const getRetryDelayMs = (attempt: number) => {
  const delaySec = Math.min(
    BASE_DELAY_SEC * Math.pow(1.75, attempt),
    MAX_DELAY_SEC,
  );
  const jitter = 0.8 + Math.random() * 0.4;
  return delaySec * 1000 * jitter;
};

/**
 * The backoff delay, raced against the browser's "online" event: when the
 * network returns, retry IMMEDIATELY instead of sitting out the (up to 30 s)
 * backoff. Without a window (compiler/node) this is a plain sleep.
 */
export const waitForRetryDelay = (delayMs: number): Promise<void> => {
  const w = (globalThis as any).window;
  if (!w?.addEventListener) return wait(delayMs);
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      w.removeEventListener?.("online", done);
      resolve();
    };
    const timer = setTimeout(done, delayMs);
    w.addEventListener("online", done);
  });
};

/**
 * Retry-attempt observer, so the participant-facing saving indicator can
 * show a live attempt counter while an upload retries. One subscriber at a
 * time; notifications must never break the loop.
 */
let retryObserver:
  | ((attempt: number, info: { status?: number }) => void)
  | null = null;
export const setRetryObserver = (
  fn: ((attempt: number, info: { status?: number }) => void) | null,
) => {
  retryObserver = fn;
};
export const notifyRetryAttempt = (
  attempt: number,
  info: { status?: number } = {},
) => {
  try {
    retryObserver?.(attempt, info);
  } catch (_) {
    /* the indicator must never break saving */
  }
};
