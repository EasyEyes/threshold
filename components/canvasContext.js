export const canvasPixels = { current: null };

export const getCanvasContext = () => {
  const canvas = document.getElementsByTagName("canvas")[0];
  const canvasContext = canvas.getContext("webgl2", {
    preserveDrawingBuffer: true,
  });
  return [canvas, canvasContext];
};

export const initPixelsArray = (canvasContext) => {
  canvasPixels.current = new Uint8Array(
    4 * canvasContext.drawingBufferWidth * canvasContext.drawingBufferHeight
  );
};

export const readPixels = (canvasContext) => {
  canvasContext.readPixels(
    0,
    0,
    canvasContext.drawingBufferWidth,
    canvasContext.drawingBufferHeight,
    canvasContext.RGBA,
    canvasContext.UNSIGNED_BYTE,
    canvasPixels.current
  );
};

export const getPixelRGBA = (x, y, canvasContext) => {
  const pixelR =
    canvasPixels.current[4 * (y * canvasContext.drawingBufferWidth + x)];
  const pixelG =
    canvasPixels.current[4 * (y * canvasContext.drawingBufferWidth + x) + 1];
  const pixelB =
    canvasPixels.current[4 * (y * canvasContext.drawingBufferWidth + x) + 2];
  const pixelA =
    canvasPixels.current[4 * (y * canvasContext.drawingBufferWidth + x) + 3];
  return [pixelR, pixelG, pixelB, pixelA];
};
