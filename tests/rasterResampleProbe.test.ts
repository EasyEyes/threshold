/**
 * measureRasterResample — the in-situ probe behind fontPreRender=buffer's
 * empirical basis. Reports, per session:
 *  - fontRasterIdentityDeltaPct: largest scale delta where a native
 *    re-raster is pixel-identical (alpha, intersection + empty margins)
 *    across all probe letters/sizes — below it, reusing the existing
 *    texture is exact.
 *  - resample error at +4% (mean/max alpha-channel difference between the
 *    rescaled original and the native re-raster) — the blur the rescale
 *    path would introduce.
 *  - timings: native raster (canvas + fillText) vs rescale (drawImage).
 *
 * Aggregation logic is tested here with a scripted canvas factory; real
 * rasterization is exercised by the opt-in e2e benchmark (see
 * tests/sim/e2e/letterTrackingThrash.e2e.test.ts, "raster benchmark").
 *
 * @jest-environment node
 */
import { measureRasterResample } from "../components/performanceTests";

/**
 * Fake canvas whose raster "quantizes": every pixel's alpha =
 * Math.round(fontSize). Two rasters are pixel-identical iff the rounded
 * sizes match — mirroring real hinting quantization. drawImage copies the
 * source's alpha state (no interpolation), so a resample differs from a
 * native re-raster exactly when quantization differs.
 */
const makeFactory = () => {
  return () => {
    // ink confined to the glyph box (floor(size*4) square); every inked
    // pixel's alpha = Math.round(size). Two rasters are pixel-identical
    // iff rounded sizes match and margins stay empty — mirroring real
    // hinting quantization. drawImage stretches the source over the
    // whole destination (full-cover ink).
    const s = { alpha: 0, ink: 0, from: null as null | { alpha: number } };
    const ctx = {
      font: "",
      textBaseline: "",
      fillStyle: "",
      imageSmoothingEnabled: false,
      fillText(_text: string, _x: number, _y: number) {
        const size = parseFloat(this.font);
        s.alpha = Math.round(size);
        s.ink = Math.floor(size * 4);
      },
      drawImage(src: any) {
        s.from = { alpha: src.__alpha };
      },
      getImageData(_x: number, _y: number, w: number, h: number) {
        const { alpha, ink } = s.from
          ? { alpha: s.from.alpha, ink: Infinity }
          : { alpha: s.alpha, ink: s.ink };
        const data = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++)
            data[(y * w + x) * 4 + 3] = x < ink && y < ink ? alpha : 0;
        return { data };
      },
    };
    const canvas: any = {
      width: 8,
      height: 8,
      get __alpha() {
        return s.alpha;
      },
      getContext: () => ctx,
    };
    return canvas;
  };
};

describe("measureRasterResample (scripted rasterizer)", () => {
  it("reports the largest delta where all rasters stay pixel-identical", async () => {
    const summary = await measureRasterResample({
      canvasFactory: makeFactory(),
    });
    // Quantization: 16px survives to +2% (16.32→16) but 32px does not
    // (32.64→33), and the rule requires ALL probe letters/sizes to be
    // identical — so the threshold is +1%.
    expect(summary.fontRasterIdentityDeltaPct).toBe(1);
  });

  it("reports resample error at +4% vs the native re-raster", async () => {
    const summary = await measureRasterResample({
      canvasFactory: makeFactory(),
    });
    // At +4% quantization differs, so the rescaled original cannot match
    // the native re-raster. Exact magnitudes are rasterizer-specific —
    // the e2e benchmark and the field probe measure them; here we assert
    // the invariants: positive error, max ≥ mean, bounded by 0–255.
    expect(summary.fontRasterResampleMeanAt4pct).toBeGreaterThan(0);
    expect(summary.fontRasterResampleMaxAt4pct).toBeGreaterThanOrEqual(
      summary.fontRasterResampleMeanAt4pct,
    );
    expect(summary.fontRasterResampleMaxAt4pct).toBeLessThanOrEqual(255);
  });

  it("reports the stale error at +1% (low end of the curve)", async () => {
    const summary = await measureRasterResample({
      canvasFactory: makeFactory(),
    });
    // The fake quantizes to the same pixel state at +1% (16.16→16,
    // 32.32→32), so the stale raster is exact there.
    expect(summary.fontRasterStaleMeanAt1pct).toBe(0);
  });

  it("reports raster and rescale timings", async () => {
    const summary = await measureRasterResample({
      canvasFactory: makeFactory(),
    });
    expect(summary.fontRasterFillTextMs).toBeGreaterThanOrEqual(0);
    expect(summary.fontRasterDrawImageMs).toBeGreaterThanOrEqual(0);
  });

  it("exposes the summary on globalThis and resolves it", async () => {
    const summary = await measureRasterResample({
      canvasFactory: makeFactory(),
    });
    expect((globalThis as any).__rasterProbe).toBe(summary);
  });
});
