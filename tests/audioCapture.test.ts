import {
  PcmMicrophoneCapture,
  StreamingLinearResampler,
  float32ToPcm16,
} from "../components/speech/audioCapture";
import type {
  MicrophoneAudioFrameListener,
  MicrophoneHealth,
  MicrophoneSession,
} from "../components/speech/microphone";

class FakeMicrophoneSession implements MicrophoneSession {
  readonly stream = {} as MediaStream;
  readonly track = {} as MediaStreamTrack;
  readonly frameSize = 128;
  readonly sampleRate = 48000;
  readonly frameDurationMs = (this.frameSize / this.sampleRate) * 1000;
  readonly startFrameSource = jest.fn();
  readonly stopFrameSource = jest.fn();
  readonly closeFrameSource = jest.fn(() => {
    this.listener = undefined;
  });
  private listener?: MicrophoneAudioFrameListener;

  getHealth(): MicrophoneHealth {
    return {
      state: "ready",
      readyState: "live",
      enabled: true,
      muted: false,
    };
  }

  getTrackSettings(): MediaTrackSettings {
    return { sampleRate: this.sampleRate };
  }

  readFrame(): void {}

  async subscribeToAudioFrames(listener: MicrophoneAudioFrameListener) {
    this.listener = listener;
    return {
      start: this.startFrameSource,
      stop: this.stopFrameSource,
      close: this.closeFrameSource,
    };
  }

  subscribeToHealth(): () => void {
    return () => undefined;
  }

  async close(): Promise<void> {}

  emit(samples: Float32Array, capturedAtMs = 100): void {
    this.listener?.({ samples, sampleRate: this.sampleRate, capturedAtMs });
  }
}

describe("generic microphone PCM capture", () => {
  it("clips and converts normalized floating-point samples to PCM16", () => {
    expect([...float32ToPcm16(Float32Array.from([-2, -1, 0, 1, 2]))]).toEqual([
      -32768, -32768, 0, 32767, 32767,
    ]);
  });

  it("preserves streaming resampler continuity across frame boundaries", () => {
    const resampler = new StreamingLinearResampler(48000, 16000);
    const first = resampler.process(
      Float32Array.from({ length: 48 }, (_, index) => index / 100),
    );
    const second = resampler.process(
      Float32Array.from({ length: 48 }, (_, index) => (index + 48) / 100),
    );

    expect(first.length + second.length).toBe(32);
    expect(first[0]).toBeCloseTo(0);
    expect(second[0]).toBeCloseTo(0.48);
  });

  it("drops pre-onset frames and emits only while the task gate is open", async () => {
    const microphone = new FakeMicrophoneSession();
    const capture = new PcmMicrophoneCapture(microphone, {
      outputChunkDurationMs: 1,
    });
    const chunks: Int16Array[] = [];
    capture.subscribe((chunk) => chunks.push(chunk.samples));
    await capture.initialize();

    microphone.emit(new Float32Array(48).fill(0.5));
    expect(chunks).toHaveLength(0);

    capture.start();
    expect(microphone.startFrameSource).toHaveBeenCalledTimes(1);
    microphone.emit(new Float32Array(48).fill(0.25));
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(16);

    capture.stop();
    expect(microphone.stopFrameSource).toHaveBeenCalledTimes(1);
    microphone.emit(new Float32Array(48).fill(0.75));
    expect(chunks).toHaveLength(1);
    await capture.close();
    expect(microphone.closeFrameSource).toHaveBeenCalledTimes(1);
  });
});
