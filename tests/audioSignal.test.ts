import { calculateAudioSignalMetrics } from "../components/speech/audioSignal";

describe("calculateAudioSignalMetrics", () => {
  it("reports a silent frame without producing NaN values", () => {
    const metrics = calculateAudioSignalMetrics(new Float32Array(8));

    expect(metrics).toEqual({
      sampleCount: 8,
      rms: 0,
      rmsDbfs: Number.NEGATIVE_INFINITY,
      acRms: 0,
      acRmsDbfs: Number.NEGATIVE_INFINITY,
      peak: 0,
      dcOffset: 0,
      zeroSampleRatio: 1,
      clippedSampleRatio: 0,
    });
  });

  it("calculates level, offset, zero, and clipping metrics", () => {
    const metrics = calculateAudioSignalMetrics(
      new Float32Array([1, -1, 0, 0]),
    );

    expect(metrics.sampleCount).toBe(4);
    expect(metrics.rms).toBeCloseTo(Math.sqrt(0.5));
    expect(metrics.rmsDbfs).toBeCloseTo(20 * Math.log10(Math.sqrt(0.5)));
    expect(metrics.acRms).toBeCloseTo(Math.sqrt(0.5));
    expect(metrics.acRmsDbfs).toBeCloseTo(20 * Math.log10(Math.sqrt(0.5)));
    expect(metrics.peak).toBe(1);
    expect(metrics.dcOffset).toBe(0);
    expect(metrics.zeroSampleRatio).toBe(0.5);
    expect(metrics.clippedSampleRatio).toBe(0.5);
  });

  it("separates waveform energy from a constant DC offset", () => {
    const metrics = calculateAudioSignalMetrics(
      new Float32Array([0.25, 0.25, 0.25, 0.25]),
    );

    expect(metrics.rms).toBeCloseTo(0.25);
    expect(metrics.dcOffset).toBeCloseTo(0.25);
    expect(metrics.acRms).toBe(0);
    expect(metrics.acRmsDbfs).toBe(Number.NEGATIVE_INFINITY);
  });

  it("supports explicit zero and clipping tolerances", () => {
    const metrics = calculateAudioSignalMetrics(
      new Float32Array([0.0005, 0.5, 0.8]),
      { zeroEpsilon: 0.001, clippingThreshold: 0.8 },
    );

    expect(metrics.zeroSampleRatio).toBeCloseTo(1 / 3);
    expect(metrics.clippedSampleRatio).toBeCloseTo(1 / 3);
  });

  it("rejects invalid configuration and non-finite samples", () => {
    expect(() =>
      calculateAudioSignalMetrics(new Float32Array([0]), {
        clippingThreshold: 0,
      }),
    ).toThrow(/clippingThreshold/);
    expect(() =>
      calculateAudioSignalMetrics(new Float32Array([Number.NaN])),
    ).toThrow(/finite values/);
  });
});
