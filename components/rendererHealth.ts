import { warning } from "./errorHandling";

/**
 * Log WebGL context loss/restoration into the session data. Context loss
 * under long-session memory pressure silently stops ALL drawing (the
 * field's "cross stopped showing" symptom is consistent with it), while
 * experiment logic continues; without logging, the event leaves no trace
 * in the results.
 */
export const registerRendererHealthLogging = (
  canvas: { addEventListener?: (name: string, fn: () => void) => void },
  addData: (key: string, value: unknown) => void,
): void => {
  if (typeof canvas?.addEventListener !== "function") return;
  canvas.addEventListener("webglcontextlost", () => {
    (globalThis as unknown as Record<string, unknown>).__rendererContextLost =
      true;
    warning("WebGL context lost: all drawing has stopped.");
    addData("rendererContextLostSec", performance.now() / 1000);
  });
  canvas.addEventListener("webglcontextrestored", () => {
    (
      globalThis as unknown as Record<string, unknown>
    ).__rendererContextRestored = true;
    warning("WebGL context restored: drawing resumes.");
    addData("rendererContextRestoredSec", performance.now() / 1000);
  });
};
