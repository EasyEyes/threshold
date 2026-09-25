/**
 * Pure numbers for the _screenColorCheckBool perceptual demos
 * (components/colorPipelineDemos.js). Import-free so unit tests can run
 * it in node.
 *
 * Stairs compares two reproductions of one requested gray ramp. The
 * "8-bit" half is rounded onto the 1/255 code grid here (and in the
 * shader). Both halves then go through the shipped noisy-bit pass.
 * Rounding in the shader, rather than merely switching dither off, is
 * what keeps the 8-bit half banded on a 10-bit panel or a panel that
 * already dithers in hardware.
 *
 * Greener green is chromatic, because sRGB and Display P3 agree on every
 * R=G=B gray. The ramp is the segment from sRGB green, expressed in
 * Display P3, out to the Display P3 green primary. Every color on that
 * segment clips to the same sRGB green, so an sRGB-tagged canvas draws
 * one flat bar and a display-p3-tagged canvas draws the extra green.
 */

export const EIGHT_BIT_LEVELS = 255;

export const STAIRS_MID = 0.32;
export const STAIRS_SPAN_START = 0.04;
export const STAIRS_SPAN_MIN = 1 / EIGHT_BIT_LEVELS;
export const STAIRS_SPAN_MAX = 0.64;

export const stairsEnds = (span) => {
  const half = span / 2;
  let low = STAIRS_MID - half;
  let high = STAIRS_MID + half;
  if (low < 0) {
    high -= low;
    low = 0;
  }
  if (high > 1) {
    low -= high - 1;
    high = 1;
  }
  low = Math.max(0, low);
  high = Math.min(1, high);
  return { low, high };
};

export const stepStairsSpan = (span, direction) => {
  const next = span * (direction > 0 ? 1.25 : 1 / 1.25);
  return Math.min(STAIRS_SPAN_MAX, Math.max(STAIRS_SPAN_MIN, next));
};

/** How many 8-bit codes the ramp crosses. Ten codes read as broad bands. */
export const eightBitCodesAcross = (low, high) =>
  Math.max(1, Math.round((high - low) * EIGHT_BIT_LEVELS));

/**
 * Linear Display P3 → linear sRGB.
 * Built from the D65 white point and the two primaries (they share blue,
 * so the third column is (0, 0, ~1.098)). Rows, not GLSL columns.
 */
export const LINEAR_P3_TO_LINEAR_SRGB = [
  [1.2249401762805596, -0.22494017628055984, 0],
  [-0.042056954709688066, 1.042056954709688, 0],
  [-0.019637554590334436, -0.07863604555063179, 1.0982736001409663],
];

export const srgbToLinear = (c) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

export const linearToSrgb = (c) => {
  const x = Math.min(1, Math.max(0, c));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
};

const dot3 = (row, v) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2];

const invert3 = (m) => {
  const a = m[0][0],
    b = m[0][1],
    c = m[0][2],
    d = m[1][0],
    e = m[1][1],
    f = m[1][2],
    g = m[2][0],
    h = m[2][1],
    i = m[2][2];
  const A = e * i - f * h,
    B = -(d * i - f * g),
    C = d * h - e * g,
    D = -(b * i - c * h),
    E = a * i - c * g,
    F = -(a * h - b * g),
    G = b * f - c * e,
    H = -(a * f - c * d),
    I = a * e - b * d;
  const det = a * A + b * B + c * C;
  return [
    [A, D, G],
    [B, E, H],
    [C, F, I],
  ].map((row) => row.map((x) => x / det));
};

export const encodedDisplayP3ToSrgb = (rgb) => {
  const linear = rgb.map(srgbToLinear);
  return LINEAR_P3_TO_LINEAR_SRGB.map((row) => linearToSrgb(dot3(row, linear)));
};

/** sRGB (0, 1, 0) written as Display P3 coordinates. The ramp starts here. */
export const SRGB_GREEN_IN_DISPLAY_P3 = invert3(LINEAR_P3_TO_LINEAR_SRGB).map(
  (row) => linearToSrgb(dot3(row, [0, 1, 0])),
);

export const P3_GREEN = [0, 1, 0];

/** Samples of the out-of-sRGB green segment, after clipping into sRGB. */
export const clippedGreenRamp = (n = 16) => {
  const start = SRGB_GREEN_IN_DISPLAY_P3;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p3 = start.map((s, k) => s * (1 - t) + P3_GREEN[k] * t);
    out.push(encodedDisplayP3ToSrgb(p3));
  }
  return out;
};

/**
 * Rects in fractions of the viewport, origin at the top-left.
 * CSS swatches and the canvas quads use the same numbers so a match is a
 * match of position as well as color.
 */
export const GREEN_LAYOUT = {
  p3Css: [0.08, 0.1, 0.2, 0.2],
  p3Canvas: [0.32, 0.1, 0.2, 0.2],
  srgbCss: [0.08, 0.38, 0.2, 0.2],
  srgbCanvas: [0.32, 0.38, 0.2, 0.2],
  ramp: [0.08, 0.66, 0.84, 0.12],
};

const glslVec3 = (row) =>
  `vec3(${row.map((n) => Number(n).toFixed(12)).join(", ")})`;

export const calibrateFragmentShader = () => `precision highp float;
varying vec2 vTextureCoord;
void main(void) {
  float band = step(vTextureCoord.y, 0.08);
  gl_FragColor = vec4(vec3(band), 1.0);
}
`;

export const stairsFragmentShader = () => `precision highp float;
varying vec2 vTextureCoord;
uniform float uLow;
uniform float uHigh;
uniform float uPhase;
uniform float uFlipY;
uniform float uQuantizeLive;

float quantize(float v) {
  return floor(v * 255.0 + 0.5) / 255.0;
}

void main(void) {
  float y = uFlipY > 0.5 ? 1.0 - vTextureCoord.y : vTextureCoord.y;
  float x = fract(vTextureCoord.x + uPhase);
  float v = mix(uLow, uHigh, x);
  float q = quantize(v);
  float outv = y < 0.5 ? q : (uQuantizeLive > 0.5 ? q : v);
  gl_FragColor = vec4(vec3(outv), 1.0);
}
`;

export const greenFragmentShader = () => {
  const [r0, r1, r2] = LINEAR_P3_TO_LINEAR_SRGB;
  return `precision highp float;
varying vec2 vTextureCoord;
uniform float uFlipY;
uniform float uSrgbMode;
uniform vec3 uRampStart;
uniform vec4 uP3Canvas;
uniform vec4 uSrgbCanvas;
uniform vec4 uRamp;

float toLinear(float c) {
  return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
}
float toEncoded(float c) {
  c = clamp(c, 0.0, 1.0);
  return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}
vec3 p3ToSrgb(vec3 p3) {
  vec3 lin = vec3(toLinear(p3.r), toLinear(p3.g), toLinear(p3.b));
  vec3 row0 = ${glslVec3(r0)};
  vec3 row1 = ${glslVec3(r1)};
  vec3 row2 = ${glslVec3(r2)};
  return vec3(
    toEncoded(dot(row0, lin)),
    toEncoded(dot(row1, lin)),
    toEncoded(dot(row2, lin))
  );
}

bool inside(vec2 p, vec4 r) {
  return p.x >= r.x && p.x <= r.x + r.z && p.y >= r.y && p.y <= r.y + r.w;
}

void main(void) {
  float y = uFlipY > 0.5 ? 1.0 - vTextureCoord.y : vTextureCoord.y;
  vec2 p = vec2(vTextureCoord.x, y);
  vec3 color = vec3(0.5);
  if (inside(p, uP3Canvas) || inside(p, uSrgbCanvas)) {
    color = vec3(0.0, 1.0, 0.0);
  } else if (inside(p, uRamp)) {
    float t = clamp((p.x - uRamp.x) / max(uRamp.z, 0.0001), 0.0, 1.0);
    vec3 requested = mix(uRampStart, vec3(0.0, 1.0, 0.0), t);
    color = uSrgbMode > 0.5 ? p3ToSrgb(requested) : requested;
  }
  gl_FragColor = vec4(color, 1.0);
}
`;
};
