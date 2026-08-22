import {
  MicrophoneError,
  type MicrophoneAudioFrame,
  type MicrophoneAudioFrameSource,
  type MicrophoneSession,
} from "./microphone";

export const TRANSCRIPTION_PCM_SAMPLE_RATE = 16000 as const;

export interface PcmAudioChunk {
  readonly samples: Int16Array;
  readonly sampleRate: typeof TRANSCRIPTION_PCM_SAMPLE_RATE;
  readonly capturedAtMs: number;
}

export type PcmAudioChunkListener = (chunk: PcmAudioChunk) => void;

export interface PcmMicrophoneCaptureOptions {
  readonly outputChunkDurationMs?: number;
}

const DEFAULT_OUTPUT_CHUNK_DURATION_MS = 100;

export const float32ToPcm16 = (samples: Float32Array): Int16Array => {
  const output = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    output[index] =
      sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767);
  }
  return output;
};

export class StreamingLinearResampler {
  private readonly inputSampleRate: number;
  private readonly outputSampleRate: number;
  private readonly step: number;
  private sourcePosition = 0;
  private previousSample?: number;

  constructor(inputSampleRate: number, outputSampleRate: number) {
    if (
      !Number.isFinite(inputSampleRate) ||
      inputSampleRate <= 0 ||
      !Number.isFinite(outputSampleRate) ||
      outputSampleRate <= 0
    ) {
      throw new MicrophoneError(
        "invalidConfiguration",
        "Audio sample rates must be finite positive numbers.",
      );
    }
    this.inputSampleRate = inputSampleRate;
    this.outputSampleRate = outputSampleRate;
    this.step = inputSampleRate / outputSampleRate;
  }

  reset(): void {
    this.sourcePosition = 0;
    this.previousSample = undefined;
  }

  process(input: Float32Array): Float32Array {
    if (input.length === 0) return new Float32Array();
    if (this.inputSampleRate === this.outputSampleRate) {
      return new Float32Array(input);
    }

    const samples =
      this.previousSample === undefined
        ? input
        : Float32Array.from([this.previousSample, ...input]);
    const output: number[] = [];
    while (this.sourcePosition + 1 < samples.length) {
      const left = Math.floor(this.sourcePosition);
      const fraction = this.sourcePosition - left;
      output.push(
        samples[left] + (samples[left + 1] - samples[left]) * fraction,
      );
      this.sourcePosition += this.step;
    }

    this.sourcePosition -= samples.length - 1;
    this.previousSample = samples[samples.length - 1];
    return Float32Array.from(output);
  }
}

/**
 * Converts a microphone session into gated, provider-ready PCM chunks. The
 * microphone remains open while capture is stopped, so a task can prepare its
 * resources before a timing-sensitive stimulus onset.
 */
export class PcmMicrophoneCapture {
  private readonly microphone: MicrophoneSession;
  private readonly outputChunkSamples: number;
  private readonly listeners = new Set<PcmAudioChunkListener>();
  private resampler?: StreamingLinearResampler;
  private pendingSamples: number[] = [];
  private frameSource?: MicrophoneAudioFrameSource;
  private initializePromise?: Promise<void>;
  private active = false;
  private closed = false;

  constructor(
    microphone: MicrophoneSession,
    options: PcmMicrophoneCaptureOptions = {},
  ) {
    this.microphone = microphone;
    const durationMs =
      options.outputChunkDurationMs ?? DEFAULT_OUTPUT_CHUNK_DURATION_MS;
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new MicrophoneError(
        "invalidConfiguration",
        "outputChunkDurationMs must be a finite positive number.",
      );
    }
    this.outputChunkSamples = Math.max(
      1,
      Math.round((TRANSCRIPTION_PCM_SAMPLE_RATE * durationMs) / 1000),
    );
  }

  initialize(): Promise<void> {
    if (this.closed) {
      return Promise.reject(
        new MicrophoneError(
          "sessionClosed",
          "Cannot initialize a closed PCM microphone capture.",
        ),
      );
    }
    this.initializePromise ??= this.microphone
      .subscribeToAudioFrames(this.handleAudioFrame)
      .then((frameSource) => {
        this.frameSource = frameSource;
      });
    return this.initializePromise;
  }

  start(): void {
    if (this.closed || !this.frameSource) {
      throw new MicrophoneError(
        this.closed ? "sessionClosed" : "invalidConfiguration",
        "PCM microphone capture must be initialized before it starts.",
      );
    }
    this.pendingSamples = [];
    this.resampler?.reset();
    this.active = true;
    this.frameSource.start();
  }

  stop(): void {
    if (!this.active) return;
    this.frameSource?.stop();
    this.active = false;
    this.emitPending(true);
  }

  subscribe(listener: PcmAudioChunkListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.stop();
    this.closed = true;
    try {
      await this.initializePromise;
    } catch {
      // Initialization already reported its failure to the caller.
    }
    this.frameSource?.close();
    this.frameSource = undefined;
    this.listeners.clear();
  }

  private readonly handleAudioFrame = (frame: MicrophoneAudioFrame): void => {
    if (!this.active || this.closed) return;
    if (!this.resampler) {
      this.resampler = new StreamingLinearResampler(
        frame.sampleRate,
        TRANSCRIPTION_PCM_SAMPLE_RATE,
      );
    }
    const resampled = this.resampler.process(frame.samples);
    for (const sample of resampled) this.pendingSamples.push(sample);
    this.emitPending(false, frame.capturedAtMs);
  };

  private emitPending(flush: boolean, capturedAtMs = performance.now()): void {
    while (
      this.pendingSamples.length >= this.outputChunkSamples ||
      (flush && this.pendingSamples.length > 0)
    ) {
      const count = flush
        ? Math.min(this.outputChunkSamples, this.pendingSamples.length)
        : this.outputChunkSamples;
      const samples = Float32Array.from(this.pendingSamples.splice(0, count));
      const chunk: PcmAudioChunk = {
        samples: float32ToPcm16(samples),
        sampleRate: TRANSCRIPTION_PCM_SAMPLE_RATE,
        capturedAtMs,
      };
      for (const listener of this.listeners) listener(chunk);
    }
  }
}
