/**
 * @jest-environment node
 *
 * Colour-space conversion for the color-pipeline path. Only two spaces are
 * actually wired (`rgb2020` linear and `pq_rgb` BT.2020 PQ-encoded), so the
 * contracts here are round-trip fidelity, exposure scaling in linear space,
 * and the PQ clamp at the ends of the range.
 */

import { expect, describe, test } from "@jest/globals";
import { im_ctrans } from "../components/transformColorSpace";

const flat = (m: number[][]): number[] => m.flat();

const expectClose = (actual: number[][], expected: number[][], digits = 6) => {
  expect(actual.length).toBe(expected.length);
  actual.forEach((row, i) => {
    row.forEach((value, j) => {
      expect(value).toBeCloseTo(expected[i][j], digits);
    });
  });
};

describe("im_ctrans", () => {
  test("rgb2020 → rgb2020 is the identity at unit exposure", () => {
    const image = [
      [0.2, 0.4, 0.6],
      [0.9, 0.1, 0.3],
    ];
    expectClose(im_ctrans(image, "rgb2020", "rgb2020", null, 1), image);
  });

  test("the default exposure is 100 cd/m²", () => {
    const image = [[0.2, 0.4, 0.6]];
    expectClose(im_ctrans(image, "rgb2020", "rgb2020"), [[20, 40, 60]]);
  });

  test("pq_rgb → pq_rgb is the identity", () => {
    const image = [
      [0.3, 0.5, 0.7],
      [0.6, 0.2, 0.9],
    ];
    expectClose(im_ctrans(image, "pq_rgb", "pq_rgb", null, 1), image, 5);
  });

  test("rgb2020 → pq_rgb → rgb2020 round-trips", () => {
    const image = [
      [0.05, 0.25, 0.5],
      [1.0, 0.0, 0.75],
    ];
    // exposure applies between the two non-linear stages, so round-trip at 1.
    const encoded = im_ctrans(image, "rgb2020", "pq_rgb", null, 1);
    const back = im_ctrans(encoded, "pq_rgb", "rgb2020", null, 1);
    expectClose(back, image, 5);
  });

  test("exposure scales in LINEAR space, before the PQ encoding", () => {
    const linear = [[0.05, 0.1, 0.2]];
    const once = im_ctrans(linear, "rgb2020", "rgb2020", null, 1);
    const twice = im_ctrans(linear, "rgb2020", "rgb2020", null, 2);
    expect(flat(twice)[0]).toBeCloseTo(flat(once)[0] * 2, 6);
    expect(flat(twice)[1]).toBeCloseTo(flat(once)[1] * 2, 6);
    // Encoded (non-linear) output is NOT proportional to exposure.
    const pqOnce = im_ctrans(linear, "rgb2020", "pq_rgb", null, 1);
    const pqTwice = im_ctrans(linear, "rgb2020", "pq_rgb", null, 2);
    expect(flat(pqTwice)[0]).toBeGreaterThan(flat(pqOnce)[0]);
    expect(flat(pqTwice)[0]).not.toBeCloseTo(flat(pqOnce)[0] * 2, 3);
  });

  test("an explicit matrix bypasses fromCS/toCS", () => {
    const identity = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const image = [[0.2, 0.3, 0.4]];
    expectClose(im_ctrans(image, null, null, identity, 1), image);
  });

  test("preserves the image shape (n, 3)", () => {
    const image = [
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
      [0.7, 0.8, 0.9],
    ];
    const out = im_ctrans(image, "rgb2020", "pq_rgb");
    expect(out.length).toBe(3);
    out.forEach((row) => expect(row.length).toBe(3));
  });

  test("PQ encoding is monotonic in luminance and clamps at the ends", () => {
    const black = im_ctrans([[0, 0, 0]], "rgb2020", "pq_rgb");
    const grey = im_ctrans([[0.18, 0.18, 0.18]], "rgb2020", "pq_rgb");
    const white = im_ctrans([[1, 1, 1]], "rgb2020", "pq_rgb");
    expect(flat(black)[0]).toBeLessThan(1e-5);
    expect(flat(grey)[0]).toBeGreaterThan(flat(black)[0]);
    expect(flat(white)[0]).toBeGreaterThan(flat(grey)[0]);
    // PQ-encoded values are normalized to 0..1.
    for (const value of [...flat(black), ...flat(grey), ...flat(white)]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});
