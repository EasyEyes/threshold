export interface AudioSignalMetrics {
  sampleCount: number;
  rms: number;
  rmsDbfs: number;
  acRms: number;
  acRmsDbfs: number;
  peak: number;
  dcOffset: number;
  zeroSampleRatio: number;
  clippedSampleRatio: number;
}

export interface AudioSignalMetricOptions {
  zeroEpsilon?: number;
  clippingThreshold?: number;
}

const validateMetricOptions = ({
  zeroEpsilon,
  clippingThreshold,
}: Required<AudioSignalMetricOptions>): void => {
  if (!Number.isFinite(zeroEpsilon) || zeroEpsilon < 0) {
    throw new RangeError("zeroEpsilon must be a finite non-negative number.");
  }
  if (
    !Number.isFinite(clippingThreshold) ||
    clippingThreshold <= 0 ||
    clippingThreshold > 1
  ) {
    throw new RangeError(
      "clippingThreshold must be a finite number greater than 0 and at most 1.",
    );
  }
};

export const calculateAudioSignalMetrics = (
  samples: Float32Array,
  options: AudioSignalMetricOptions = {},
): AudioSignalMetrics => {
  const resolvedOptions = {
    zeroEpsilon: options.zeroEpsilon ?? 1e-7,
    clippingThreshold: options.clippingThreshold ?? 0.99,
  };
  validateMetricOptions(resolvedOptions);

  if (samples.length === 0) {
    return {
      sampleCount: 0,
      rms: 0,
      rmsDbfs: Number.NEGATIVE_INFINITY,
      acRms: 0,
      acRmsDbfs: Number.NEGATIVE_INFINITY,
      peak: 0,
      dcOffset: 0,
      zeroSampleRatio: 1,
      clippedSampleRatio: 0,
    };
  }

  let sum = 0;
  let squaredSum = 0;
  let peak = 0;
  let zeroSamples = 0;
  let clippedSamples = 0;

  for (const sample of samples) {
    if (!Number.isFinite(sample)) {
      throw new RangeError("Audio samples must contain only finite values.");
    }

    const magnitude = Math.abs(sample);
    sum += sample;
    squaredSum += sample * sample;
    peak = Math.max(peak, magnitude);
    if (magnitude <= resolvedOptions.zeroEpsilon) zeroSamples += 1;
    if (magnitude >= resolvedOptions.clippingThreshold) clippedSamples += 1;
  }

  const meanSquare = squaredSum / samples.length;
  const dcOffset = sum / samples.length;
  const rms = Math.sqrt(meanSquare);
  const acRms = Math.sqrt(Math.max(0, meanSquare - dcOffset * dcOffset));

  return {
    sampleCount: samples.length,
    rms,
    rmsDbfs: rms === 0 ? Number.NEGATIVE_INFINITY : 20 * Math.log10(rms),
    acRms,
    acRmsDbfs: acRms === 0 ? Number.NEGATIVE_INFINITY : 20 * Math.log10(acRms),
    peak,
    dcOffset,
    zeroSampleRatio: zeroSamples / samples.length,
    clippedSampleRatio: clippedSamples / samples.length,
  };
};
