/**
 * Perceptual demos on the _screenColorCheckBool page. The stimulus math
 * lives in colorPipelineDemoMath.js so it can be checked without PIXI.
 *
 * @jest-environment node
 */
import { readFileSync } from "fs";
import * as path from "path";

import {
  LINEAR_P3_TO_LINEAR_SRGB,
  SRGB_GREEN_IN_DISPLAY_P3,
  STAIRS_SPAN_START,
  clippedGreenRamp,
  eightBitCodesAcross,
  encodedDisplayP3ToSrgb,
  greenFragmentShader,
  stairsEnds,
  stairsFragmentShader,
  stepStairsSpan,
} from "../components/colorPipelineDemoMath.js";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

describe("color pipeline demo math", () => {
  test("the default stairs span is about ten 8-bit codes, and the keys stay in range", () => {
    const { low, high } = stairsEnds(STAIRS_SPAN_START);
    expect(low).toBeCloseTo(0.3, 5);
    expect(high).toBeCloseTo(0.34, 5);
    expect(eightBitCodesAcross(low, high)).toBe(10);
    expect(stepStairsSpan(STAIRS_SPAN_START, 1)).toBeGreaterThan(
      STAIRS_SPAN_START,
    );
    expect(stepStairsSpan(STAIRS_SPAN_START, -1)).toBeLessThan(
      STAIRS_SPAN_START,
    );
    const tiny = stairsEnds(stepStairsSpan(1 / 255, -1));
    expect(tiny.low).toBeGreaterThanOrEqual(0);
    expect(tiny.high).toBeLessThanOrEqual(1);
  });

  test("Display P3 white stays white, and the extra-green ramp is one sRGB color", () => {
    const white = encodedDisplayP3ToSrgb([1, 1, 1]);
    white.forEach((c) => expect(c).toBeCloseTo(1, 6));
    const p3Green = encodedDisplayP3ToSrgb([0, 1, 0]);
    expect(p3Green[0]).toBeCloseTo(0, 6);
    expect(p3Green[1]).toBeCloseTo(1, 6);
    expect(p3Green[2]).toBeCloseTo(0, 6);
    expect(SRGB_GREEN_IN_DISPLAY_P3[0]).toBeGreaterThan(0.4);
    expect(SRGB_GREEN_IN_DISPLAY_P3[1]).toBeGreaterThan(0.9);
    const ramp = clippedGreenRamp();
    for (const sample of ramp) {
      expect(sample[0]).toBeCloseTo(ramp[0][0], 3);
      expect(sample[1]).toBeCloseTo(ramp[0][1], 3);
      expect(sample[2]).toBeCloseTo(ramp[0][2], 3);
    }
    // The requested P3 colors themselves are not flat.
    expect(SRGB_GREEN_IN_DISPLAY_P3[0]).not.toBeCloseTo(0, 2);
  });

  test("the shaders round with the same 8-bit rule and the P3 matrix", () => {
    expect(stairsFragmentShader()).toMatch(
      /floor\(v \* 255\.0 \+ 0\.5\) \/ 255\.0/,
    );
    const coeff = LINEAR_P3_TO_LINEAR_SRGB[0][0].toFixed(12);
    expect(greenFragmentShader()).toContain(coeff);
    expect(greenFragmentShader()).toMatch(/vec3\(0\.0, 1\.0, 0\.0\)/);
  });
});

describe("color pipeline demo wiring", () => {
  test("the demos toggle the shipped dither pass and the drawing-buffer tag", () => {
    const demos = read(path.join("components", "colorPipelineDemos.js"));
    expect(demos).toMatch(/setPipelineDemoDither/);
    expect(demos).toMatch(/setDrawingBufferColorSpace/);
    expect(demos).toMatch(/beginPipelineDemo/);
    expect(demos).toMatch(/endPipelineDemo/);
    expect(demos).not.toMatch(/whisper/i);
    const pipeline = read(
      path.join("psychojs", "src", "util", "ColorPipeline.js"),
    );
    expect(pipeline).toMatch(/export const beginPipelineDemo/);
    expect(pipeline).toMatch(/export const endPipelineDemo/);
    expect(pipeline).toMatch(/export const setPipelineDemoDither/);
    expect(pipeline).toMatch(/export const setDrawingBufferColorSpace/);
    // A dither filter created only for the demo is removed afterward.
    expect(pipeline).toMatch(/createdDither/);
    expect(demos).toMatch(/setPipelineDemoDither\(demo === "stairs"\)/);
    // pixi.js-legacy is a psychojs dependency; importing it from
    // components/ fails the production Rollup resolve.
    expect(demos).not.toMatch(/from ["']pixi\.js-legacy["']/);
    expect(demos).toMatch(/from "\.\.\/psychojs\/src\/util\/Pixi\.js"/);
    expect(demos).toMatch(/tagged Display P3/);
    expect(demos).toMatch(/tagged sRGB/);
    expect(demos).toMatch(/the bar gets greener toward the right/);
    expect(demos).toMatch(/the bar is one flat green/);
  });
});
