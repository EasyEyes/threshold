/**
 * heapTelemetry — the validity flag for the per-trial heap columns, plus
 * texture memory the JS heap cannot see.
 *
 * @jest-environment node
 */
import {
  heapSampleLiveVerdict,
  textureStats,
} from "../components/heapTelemetry";

describe("heapSampleLiveVerdict", () => {
  it("true as soon as two consecutive samples differ", () => {
    expect(heapSampleLiveVerdict([253.4061794, 251.9898348])).toBe(true);
  });

  it("false when three samples are byte-identical (frozen reporter)", () => {
    // Field session that logged a constant for 100 trials.
    const frozen = 180.4959574;
    expect(heapSampleLiveVerdict([frozen, frozen, frozen])).toBe(false);
  });

  it("undefined while the evidence is too thin to say", () => {
    expect(heapSampleLiveVerdict([])).toBeUndefined();
    expect(heapSampleLiveVerdict([253.4])).toBeUndefined();
    expect(heapSampleLiveVerdict([253.4, 253.4])).toBeUndefined();
  });

  it("a later change overrides an earlier identical run", () => {
    expect(heapSampleLiveVerdict([253.4, 253.4, 253.4, 255.7])).toBe(true);
  });

  it("ignores non-finite samples (missing or 'undefined' cells)", () => {
    expect(
      heapSampleLiveVerdict([Number.NaN, 253.4, Number.NaN]),
    ).toBeUndefined();
    expect(heapSampleLiveVerdict([Number.NaN, 253.4, 255.1])).toBe(true);
  });

  it("treats movement in EITHER direction as live (heap shrinks at GC)", () => {
    expect(heapSampleLiveVerdict([300, 250])).toBe(true);
  });
});

describe("recordHeapUsed (stateful recorder)", () => {
  it("decides FALSE on three identical samples, then caches", async () => {
    jest.resetModules();
    const { recordHeapUsed } = await import("../components/heapTelemetry");
    expect(recordHeapUsed(180.5)).toBeUndefined();
    expect(recordHeapUsed(180.5)).toBeUndefined();
    expect(recordHeapUsed(180.5)).toBe(false);
    // Verdict is cached: a later change cannot reopen it (a frozen reporter
    // never unfreezes mid-session).
    expect(recordHeapUsed(200.1)).toBe(false);
  });

  it("decides TRUE on the first difference, then caches", async () => {
    jest.resetModules();
    const { recordHeapUsed } = await import("../components/heapTelemetry");
    expect(recordHeapUsed(180.5)).toBeUndefined();
    expect(recordHeapUsed(181.2)).toBe(true);
    expect(recordHeapUsed(181.2)).toBe(true);
  });
});

describe("textureStats", () => {
  const base = (realWidth: number, realHeight: number) => ({
    realWidth,
    realHeight,
  });

  it("counts managed textures and sums their RGBA bytes", () => {
    const renderer = {
      texture: { managedTextures: [base(100, 100), base(200, 50)] },
    };
    const s = textureStats(renderer)!;
    expect(s.count).toBe(2);
    // (100*100 + 200*50) * 4 bytes
    expect(s.mb).toBeCloseTo(((100 * 100 + 200 * 50) * 4) / (1024 * 1024), 6);
  });

  it("skips null holes the texture GC leaves behind", () => {
    const renderer = {
      texture: { managedTextures: [base(10, 10), null, base(10, 10)] },
    };
    const s = textureStats(renderer)!;
    expect(s.count).toBe(2);
    expect(s.mb).toBeCloseTo((2 * 10 * 10 * 4) / (1024 * 1024), 6);
  });

  it("falls back to width/height when realWidth is missing", () => {
    const renderer = {
      texture: { managedTextures: [{ width: 8, height: 8 }] },
    };
    expect(textureStats(renderer)!.mb).toBeCloseTo(
      (8 * 8 * 4) / (1024 * 1024),
      6,
    );
  });

  it("null when there is no renderer or no texture system", () => {
    expect(textureStats(null)).toBeNull();
    expect(textureStats(undefined)).toBeNull();
    expect(textureStats({})).toBeNull();
    expect(textureStats({ texture: {} })).toBeNull();
  });

  it("counts zero textures as zero, not null (canvas fallback)", () => {
    expect(textureStats({ texture: { managedTextures: [] } })).toEqual({
      count: 0,
      mb: 0,
    });
  });
});
