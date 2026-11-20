import { parseRetryAfterMs, waitForRetryDelay } from "./retry";

const MAX_PROLIFIC_FETCHES = 6;
const GET_TIMEOUT_MS = 15_000;
const MAX_BACKOFF_MS = 60_000;

/**
 * Prolific's documented GET policy: Retry-After when supplied, otherwise 1 s
 * doubling backoff with ±20% jitter, stopping after six attempts. Writes are
 * never automatically retried because their server-side outcome is uncertain.
 */
export const prolificRequest = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "GET") return fetch(url, options);

  const callerSignal = options.signal;
  const callerAbortError = () =>
    callerSignal?.reason ??
    Object.assign(new Error("Request cancelled by caller"), {
      name: "AbortError",
    });
  let backoffAttempt = 0;
  const nextBackoff = () => {
    const base = Math.min(1000 * 2 ** backoffAttempt, MAX_BACKOFF_MS);
    backoffAttempt++;
    return base * (0.8 + Math.random() * 0.4);
  };

  for (let fetchCount = 1; fetchCount <= MAX_PROLIFIC_FETCHES; fetchCount++) {
    if (callerSignal?.aborted) throw callerAbortError();
    const controller = new AbortController();
    const abort = () => controller.abort(callerSignal?.reason);
    if (callerSignal?.aborted) abort();
    else
      callerSignal?.addEventListener("abort", abort, {
        once: true,
      });
    const timer = setTimeout(() => controller.abort(), GET_TIMEOUT_MS);

    try {
      let response: Response;
      try {
        response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
      } catch (error) {
        if (callerSignal?.aborted) throw error;
        const transient =
          error instanceof TypeError ||
          (error instanceof DOMException && error.name === "AbortError");
        if (!transient || fetchCount >= MAX_PROLIFIC_FETCHES) throw error;
        await waitForRetryDelay(nextBackoff());
        continue;
      }

      const transient =
        response.status === 429 ||
        (response.status >= 500 && response.status <= 599);
      if (!transient || fetchCount >= MAX_PROLIFIC_FETCHES) return response;

      const delay =
        parseRetryAfterMs(response.headers?.get("Retry-After") ?? null) ??
        nextBackoff();
      await waitForRetryDelay(delay);
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", abort);
    }
  }

  // The bounded loop always returns or throws.
  throw new Error("Unreachable Prolific request state");
};
