import { warning } from "./errorHandling";

/** Anything with DOM addEventListener — in practice the renderer canvas. */
export type CanvasTarget = {
  addEventListener?: (name: string, fn: () => void) => void;
};

/** The pixi renderer surface this module reads. */
export type PixiRendererLike = {
  view?: unknown;
  gl?: unknown;
  context?: unknown;
  type?: number;
};

export type RendererRecoveryOptions = {
  /** The PsychoJS Window owning the renderer (needs rebuildRenderer). */
  window?: {
    rebuildRenderer: () => unknown;
    _renderer?: PixiRendererLike;
  };
  /** Delay before rebuilding an unrestored context. Default 0ms
   * (immediate) — the interruption is the dead screen itself, so recovery
   * must not wait. A short grace only helps transient driver blips that the
   * browser would auto-restore; the stale-canvas guard already makes a
   * redundant rebuild harmless. */
  delayMs?: number;
};

const g = globalThis as unknown as Record<string, unknown>;

/**
 * Log WebGL context loss/restoration into the session data, and rebuild
 * the renderer immediately (Window.rebuildRenderer, fresh canvas) — a lost
 * context means a dead screen, so recovery must not wait. Context death
 * under long-session memory pressure otherwise silently stops ALL drawing
 * while experiment logic continues: the field's "cross stopped showing"
 * failure. If the browser later restores the OLD canvas anyway, that event
 * is ignored (stale-canvas guard). Re-registers itself on the rebuilt
 * canvas so repeated losses keep being logged (and recovered). Set
 * globalThis.__DISABLE_RENDERER_RECOVERY to skip rebuilding (logging
 * still happens) — the escape hatch for tests and field overrides.
 */
export const registerRendererHealthLogging = (
  canvas: CanvasTarget | undefined,
  addData: (key: string, value: unknown) => void,
  opts: RendererRecoveryOptions = {},
): void => {
  if (typeof canvas?.addEventListener !== "function") {
    // Never a silent no-op: the whole failure class would go unlogged.
    warning("Renderer health logging not registered: no renderer view.");
    return;
  }
  const { window: pjsWindow, delayMs = 0 } = opts;

  let timer: ReturnType<typeof setTimeout> | undefined;

  // A detached old canvas can still emit late lost/restored events after
  // a rebuild — reacting to them would tear down the healthy current
  // renderer, so only the current canvas's events count.
  const isCurrentCanvas = () =>
    !pjsWindow?._renderer?.view || pjsWindow._renderer.view === canvas;

  canvas.addEventListener("webglcontextlost", () => {
    if (!isCurrentCanvas()) return;
    g.__rendererContextLost = true;
    warning("WebGL context lost: all drawing has stopped.");
    addData("canvasContextLostSec", performance.now() / 1000);
    const recoveryDisabled = g.__DISABLE_RENDERER_RECOVERY === true;
    // A duplicate lost event replaces the pending timer (one rebuild);
    // restore clears it (a late auto-restore of the old canvas cancels a
    // still-pending rebuild) — there is deliberately NO permanent latch, so
    // a second loss after a restore still recovers.
    if (timer) clearTimeout(timer);
    if (pjsWindow?.rebuildRenderer && !recoveryDisabled) {
      timer = setTimeout(() => {
        try {
          const newCanvas = pjsWindow.rebuildRenderer() as
            | CanvasTarget
            | undefined;
          g.__rendererRebuilt = true;
          warning("WebGL context lost — renderer rebuilt automatically.");
          addData("canvasContextRebuiltSec", performance.now() / 1000);
          // The rebuild may have degraded to Canvas2D (rebuildRenderer
          // re-enters autoDetectRenderer's fallback) — re-log the type so
          // the data reflects what is actually drawing now.
          addData(
            "canvasContextTypeAfterRebuild",
            rendererTypeOf(pjsWindow._renderer),
          );
          // Re-register on the rebuilt canvas: further losses stay
          // logged (and recoverable). Called unconditionally — the
          // module's own guard warns (never silent) if the new canvas
          // is unusable.
          registerRendererHealthLogging(newCanvas, addData, opts);
        } catch (error) {
          warning(`Renderer rebuild failed: ${String(error)}`);
        }
      }, delayMs);
    }
  });
  canvas.addEventListener("webglcontextrestored", () => {
    if (!isCurrentCanvas()) return;
    if (timer) clearTimeout(timer);
    g.__rendererContextRestored = true;
    warning("WebGL context restored: drawing resumes.");
    addData("canvasContextRestoredSec", performance.now() / 1000);
  });
};

/** The pixi renderer family actually in use — capability probes
 *  (WebGLVersion/WebGL_Report) do NOT tell you this: pixi-legacy silently
 *  falls back to a Canvas2D renderer when its WebGL constructor throws,
 *  and nothing recorded which one ran. WebGL has context death (the
 *  field's missing-fixation candidate); Canvas2D does not. */
export const rendererTypeOf = (
  renderer?: PixiRendererLike | null,
): "webgl" | "webgl2" | "2d" | "unknown" => {
  // Values are the standard canvas.getContext() type strings.
  if (!renderer) return "unknown";
  if (renderer.gl) {
    const isGL2 =
      typeof WebGL2RenderingContext !== "undefined" &&
      renderer.gl instanceof WebGL2RenderingContext;
    return isGL2 ? "webgl2" : "webgl";
  }
  if (renderer.context) return "2d";
  // pixi v6 RENDERER_TYPE: UNKNOWN=0, WEBGL=1, CANVAS=2.
  if (renderer.type === 2) return "2d";
  if (renderer.type === 1) return "webgl";
  return "unknown";
};
