// Virtual mock for pixi.js-legacy (nested psychojs dependency)
// Avoids canvas creation at import time in jsdom environment
module.exports = {
  Point: class {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  },
  Rectangle: {
    EMPTY: { x: 0, y: 0, width: 0, height: 0 },
  },
  Text: class {
    constructor() {}
    destroy() {}
  },
  TextStyle: class {
    constructor() {}
    toFontString() {
      return "10px Arial";
    }
  },
  TextMetrics: {
    BASELINE_MULTIPLIER: 1,
    HEIGHT_MULTIPLIER: 1,
    METRICS_STRING: "",
    measureText: () => ({
      width: 0,
      height: 0,
      fontProperties: { ascent: 0, descent: 0 },
    }),
  },
  Graphics: class {},
  Container: class {},
  Sprite: class {},
  BaseTexture: { from: () => ({}) },
  Texture: { from: () => ({}) },
  BLEND_MODES: { NORMAL: 0 },
  settings: { SCALE_MODE: 0 },
  utils: {
    TextureCache: {},
    BaseTextureCache: {},
  },
};
