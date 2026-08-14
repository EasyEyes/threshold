import { drawingBufferIsFloat } from "../psychojs/src/util/ColorPipeline.js";

export const canvasPixels = { current: null };

export const getCanvasContext = () => {
  const canvas = document.getElementsByTagName("canvas")[0];
  const canvasContext = canvas.getContext("webgl2", {
    preserveDrawingBuffer: true,
  });
  return [canvas, canvasContext];
};

// True when the EasyEyes color pipeline gave the drawing buffer a float16
// (RGBA16F) storage format — readPixels must then use FLOAT, not
// UNSIGNED_BYTE. Asks the pipeline rather than re-deriving from
// gl.drawingBufferFormat, which is absent before Chromium 122 and would
// then disagree with the type the pipeline itself uses.
const isFloatBuffer = () => drawingBufferIsFloat();

export const initPixelsArray = (canvasContext) => {
  const n =
    4 * canvasContext.drawingBufferWidth * canvasContext.drawingBufferHeight;
  canvasPixels.current = isFloatBuffer()
    ? new Float32Array(n)
    : new Uint8Array(n);
};

export const readPixels = (canvasContext) => {
  canvasContext.readPixels(
    0,
    0,
    canvasContext.drawingBufferWidth,
    canvasContext.drawingBufferHeight,
    canvasContext.RGBA,
    isFloatBuffer() ? canvasContext.FLOAT : canvasContext.UNSIGNED_BYTE,
    canvasPixels.current,
  );
};

// Returns [r, g, b, a] in [0, 255] regardless of the buffer format, to keep
// the historical call contract.
export const getPixelRGBA = (x, y, canvasContext) => {
  const scale = canvasPixels.current instanceof Float32Array ? 255 : 1;
  const i = 4 * (y * canvasContext.drawingBufferWidth + x);
  const pixelR = canvasPixels.current[i] * scale;
  const pixelG = canvasPixels.current[i + 1] * scale;
  const pixelB = canvasPixels.current[i + 2] * scale;
  const pixelA = canvasPixels.current[i + 3] * scale;
  return [pixelR, pixelG, pixelB, pixelA];
};
