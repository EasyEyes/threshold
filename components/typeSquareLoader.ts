/**
 * typeSquare runtime loader — DRAFT, gated.
 *
 * Status (2026-07-15): DRAFTED but UNPLUGGED. The compile-time gate
 * (`_typeSquareGate_t` in preprocess/experimentFileChecks.ts) blocks
 * fontSource=typeSquare at compile time, so this module is never called
 * in production. When Denis adds `_typeSquareDistributionKey` to the
 * EasyEyes glossary, flip:
 *   1. The compile-time gate from "always block" to "block if no key".
 *   2. collectFontVariations to include fontSource=typeSquare.
 *   3. fetchVariationBytes in components/fontInstancing.js to delegate
 *      to preloadTypeSquareFonts here.
 *   4. tests/typeSquareRuntime.test.ts: describe.skip → describe.
 *
 * Mechanism (the "loader dance"):
 *   1. installFetchInterceptor() patches window.fetch so we can observe
 *      typeSquare's mkfont requests (the loader mints a session-bound
 *      `onetime_condition` token on its first DOM scan).
 *   2. Inject the typeSquare loader script tag.
 *   3. Add hidden probe elements with `font-family: <each ts family>`.
 *      The loader scans stylesheets and issues one mkfont per family.
 *   4. Our fetch interceptor captures each URL (with onetime_condition
 *      baked in), reads arrayBuffer, and forwards the response to the
 *      caller's bytes-out map.
 *
 * Risks:
 *   - The typeSquare loader scans ALL font-family declarations; mitigation
 *     is to inject probes ONLY for the requested typeSquare families.
 *   - typeSquare is being phased out (successor: morisawafonts.com,
 *     no public API). Loud error if wf.typesquare.com doesn't resolve.
 */

// ── Module state ───────────────────────────────────────────────────────────
let fetchInterceptInstalled = false;
let originalFetch: typeof window.fetch | null = null;
type PendingFetcher = {
  resolve: (bytes: Uint8Array) => void;
  reject: (e: Error) => void;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
};
let pendingTypeSquareFontFetches: Map<string, PendingFetcher> = new Map();

const DEFAULT_TIMEOUT_MS = 5000;

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Install a one-time window.fetch interceptor that captures typeSquare
 * mkfont requests. Idempotent — subsequent calls are no-ops.
 */
export function installFetchInterceptor(): void {
  if (fetchInterceptInstalled) return;
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }
  originalFetch = window.fetch.bind(window);
  fetchInterceptInstalled = true;

  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;

    // Match the typeSquare mkfont URL pattern.
    const match = /wf\.typesquare\.com\/3\/tsst\/api\/[^?]+\?(.*)$/.exec(url);
    if (match) {
      try {
        const response = await originalFetch!(input, init);
        const cloned = response.clone();
        const bytes = new Uint8Array(await cloned.arrayBuffer());
        // Match by `fonts[id]=<urlencoded fontId>` query substring.
        for (const [fontKey, fetcher] of pendingTypeSquareFontFetches) {
          if (url.includes(`fonts[id]=${encodeURIComponent(fontKey)}`)) {
            fetcher.resolve(bytes);
            if (fetcher.timeoutHandle) {
              clearTimeout(fetcher.timeoutHandle);
            }
            pendingTypeSquareFontFetches.delete(fontKey);
            break;
          }
        }
        return response;
      } catch (e) {
        // Reject all pending fetchers on hard error.
        for (const [, fetcher] of pendingTypeSquareFontFetches) {
          if (fetcher.timeoutHandle) {
            clearTimeout(fetcher.timeoutHandle);
          }
          fetcher.reject(e instanceof Error ? e : new Error(String(e)));
        }
        pendingTypeSquareFontFetches.clear();
        throw e;
      }
    }
    return originalFetch!(input, init);
  };
}

/**
 * Preload typeSquare fonts. Returns a Map<fontId, Uint8Array> for the
 * families that successfully fetched. Families that timed out or failed
 * are absent from the map — caller marks those conditions for skipTrial().
 *
 * Options:
 *   - timeoutMs: per-family timeout (default 5000).
 */
export async function preloadTypeSquareFonts(
  distributionKey: string,
  fontIds: string[],
  options: { timeoutMs?: number } = {},
): Promise<Map<string, Uint8Array>> {
  installFetchInterceptor();
  await ensureTypeSquareLoader(distributionKey);

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const results = new Map<string, Uint8Array>();

  // Set up fetchers BEFORE the loader scans the DOM.
  const fetcherPromises = fontIds.map(
    (fontId) =>
      new Promise<Uint8Array>((resolve, reject) => {
        const timeoutHandle = setTimeout(() => {
          pendingTypeSquareFontFetches.delete(fontId);
          reject(
            new Error(
              `typeSquare fetch timeout for "${fontId}" after ${timeoutMs}ms`,
            ),
          );
        }, timeoutMs);
        pendingTypeSquareFontFetches.set(fontId, {
          resolve,
          reject,
          timeoutHandle,
        });
      }),
  );

  // Trigger the loader's font-fetches by adding probe elements.
  const probes = addTypeSquareProbes(fontIds);

  try {
    const settled = await Promise.allSettled(fetcherPromises);
    settled.forEach((result, i) => {
      if (result.status === "fulfilled") {
        results.set(fontIds[i], result.value);
      } else {
        console.error(
          `[typeSquare] fetch failed for "${fontIds[i]}":`,
          result.reason,
        );
      }
    });
  } finally {
    removeTypeSquareProbes(probes);
  }

  return results;
}

// ── Loader injection (the "loader dance") ─────────────────────────────────

let typeSquareLoaderPromise: Promise<unknown> | null = null;

/**
 * Inject the typeSquare loader script. The loader scans the document on
 * its DOMContentLoaded tick and on subsequent stylesheet additions;
 * adding probe elements AFTER injection triggers the mkfont requests.
 *
 * Idempotent: subsequent calls with the same key return the cached
 * promise. With a different key we reload the loader.
 */
export async function ensureTypeSquareLoader(
  distributionKey: string,
): Promise<unknown> {
  if (
    typeSquareLoaderPromise &&
    (window as unknown as { __eeTsDistKey?: string }).__eeTsDistKey ===
      distributionKey
  ) {
    return typeSquareLoaderPromise;
  }
  typeSquareLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `//typesquare.com/3/tsst/script/en/typesquare.js?${encodeURIComponent(
      distributionKey,
    )}`;
    script.async = true;
    script.onload = () => {
      (window as unknown as { __eeTsDistKey?: string }).__eeTsDistKey =
        distributionKey;
      resolve((window as unknown as { Ts?: unknown }).Ts);
    };
    script.onerror = () => {
      typeSquareLoaderPromise = null;
      reject(
        new Error(
          `Failed to load typeSquare loader script for distribution key "${distributionKey}". ` +
            `Note: typeSquare is being phased out; check https://typesquare.com/en/ for status.`,
        ),
      );
    };
    document.head.appendChild(script);
  });
  return typeSquareLoaderPromise;
}

// ── Probe elements ─────────────────────────────────────────────────────────

interface ProbeHandle {
  style: HTMLStyleElement;
  elements: HTMLSpanElement[];
}

function addTypeSquareProbes(fontIds: string[]): ProbeHandle {
  const style = document.createElement("style");
  style.textContent = fontIds
    .map((id) => `.${cssSafeClassName(id)} { font-family: "${id}"; }`)
    .join("\n");
  document.head.appendChild(style);
  const elements = fontIds.map((id) => {
    const el = document.createElement("span");
    el.className = cssSafeClassName(id);
    el.textContent = "Aaあア"; // mixed LTR/RTL/CJK triggers loader's full subset
    (el.style as CSSStyleDeclaration).visibility = "hidden";
    (el.style as CSSStyleDeclaration).position = "absolute";
    document.body.appendChild(el);
    return el;
  });
  return { style, elements };
}

function removeTypeSquareProbes(probes: ProbeHandle): void {
  probes.elements.forEach((el) => {
    try {
      document.body.removeChild(el);
    } catch {
      // ignore — element may already be removed
    }
  });
  try {
    document.head.removeChild(probes.style);
  } catch {
    // ignore
  }
}

function cssSafeClassName(s: string): string {
  return `__ee_ts_probe_${s.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}
