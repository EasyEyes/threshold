import {
  calculateAudioSignalMetrics,
  type AudioSignalMetrics,
} from "./audioSignal";

export type VoiceActivityState = "silence" | "speech";

export interface EnergyVadConfig {
  initialNoiseFloorRms: number;
  absoluteSpeechFloorRms: number;
  speechThresholdDbAboveNoise: number;
  minimumSpeechDurationMs: number;
  endOfSpeechSilenceMs: number;
  noiseFloorTimeConstantMs: number;
}

export interface VoiceActivityDecision {
  state: VoiceActivityState;
  speechStarted: boolean;
  speechEnded: boolean;
  timestampMs: number;
  noiseFloorRms: number;
  speechThresholdRms: number;
  signal: AudioSignalMetrics;
}

const validateConfig = (config: EnergyVadConfig): void => {
  const nonNegativeFields: Array<keyof EnergyVadConfig> = [
    "initialNoiseFloorRms",
    "absoluteSpeechFloorRms",
    "speechThresholdDbAboveNoise",
    "minimumSpeechDurationMs",
    "endOfSpeechSilenceMs",
    "noiseFloorTimeConstantMs",
  ];

  for (const field of nonNegativeFields) {
    const value = config[field];
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${field} must be a finite non-negative number.`);
    }
  }

  if (config.noiseFloorTimeConstantMs === 0) {
    throw new RangeError("noiseFloorTimeConstantMs must be greater than zero.");
  }
};

export class EnergyVoiceActivityDetector {
  private readonly config: EnergyVadConfig;
  private noiseFloorRms: number;
  private state: VoiceActivityState = "silence";
  private aboveThresholdSinceMs?: number;
  private belowThresholdSinceMs?: number;
  private lastTimestampMs?: number;

  constructor(config: EnergyVadConfig) {
    validateConfig(config);
    this.config = { ...config };
    this.noiseFloorRms = config.initialNoiseFloorRms;
  }

  calibrateNoise(samples: Float32Array): AudioSignalMetrics {
    if (this.state === "speech") {
      throw new Error("Noise calibration cannot run while speech is active.");
    }

    const signal = calculateAudioSignalMetrics(samples);
    this.noiseFloorRms = signal.acRms;
    this.aboveThresholdSinceMs = undefined;
    this.belowThresholdSinceMs = undefined;
    return signal;
  }

  process(samples: Float32Array, timestampMs: number): VoiceActivityDecision {
    if (!Number.isFinite(timestampMs)) {
      throw new RangeError("VAD timestamp must be finite.");
    }
    if (
      this.lastTimestampMs !== undefined &&
      timestampMs < this.lastTimestampMs
    ) {
      throw new RangeError("VAD timestamps must be monotonic.");
    }
    const elapsedMs =
      this.lastTimestampMs === undefined
        ? 0
        : timestampMs - this.lastTimestampMs;
    this.lastTimestampMs = timestampMs;

    const signal = calculateAudioSignalMetrics(samples);
    const thresholdRms = this.getSpeechThresholdRms();
    const aboveThreshold = signal.acRms >= thresholdRms;
    let speechStarted = false;
    let speechEnded = false;

    if (this.state === "silence") {
      this.belowThresholdSinceMs = undefined;

      if (aboveThreshold) {
        this.aboveThresholdSinceMs ??= timestampMs;
        if (
          timestampMs - this.aboveThresholdSinceMs >=
          this.config.minimumSpeechDurationMs
        ) {
          this.state = "speech";
          this.aboveThresholdSinceMs = undefined;
          speechStarted = true;
        }
      } else {
        this.aboveThresholdSinceMs = undefined;
        this.updateNoiseFloor(signal.acRms, elapsedMs);
      }
    } else if (aboveThreshold) {
      this.belowThresholdSinceMs = undefined;
    } else {
      this.belowThresholdSinceMs ??= timestampMs;
      if (
        timestampMs - this.belowThresholdSinceMs >=
        this.config.endOfSpeechSilenceMs
      ) {
        this.state = "silence";
        this.belowThresholdSinceMs = undefined;
        speechEnded = true;
      }
    }

    return {
      state: this.state,
      speechStarted,
      speechEnded,
      timestampMs,
      noiseFloorRms: this.noiseFloorRms,
      speechThresholdRms: thresholdRms,
      signal,
    };
  }

  reset(initialNoiseFloorRms = this.config.initialNoiseFloorRms): void {
    if (!Number.isFinite(initialNoiseFloorRms) || initialNoiseFloorRms < 0) {
      throw new RangeError(
        "initialNoiseFloorRms must be a finite non-negative number.",
      );
    }

    this.noiseFloorRms = initialNoiseFloorRms;
    this.state = "silence";
    this.aboveThresholdSinceMs = undefined;
    this.belowThresholdSinceMs = undefined;
    this.lastTimestampMs = undefined;
  }

  private getSpeechThresholdRms(): number {
    const relativeThreshold =
      this.noiseFloorRms *
      Math.pow(10, this.config.speechThresholdDbAboveNoise / 20);
    return Math.max(this.config.absoluteSpeechFloorRms, relativeThreshold);
  }

  private updateNoiseFloor(observedRms: number, elapsedMs: number): void {
    if (elapsedMs <= 0) return;

    const alpha =
      1 - Math.exp(-elapsedMs / this.config.noiseFloorTimeConstantMs);
    this.noiseFloorRms = alpha * observedRms + (1 - alpha) * this.noiseFloorRms;
  }
}
