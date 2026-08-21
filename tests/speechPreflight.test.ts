/**
 * @jest-environment jsdom
 */

jest.mock("../components/global", () => ({
  rsvpSpeechPreflight: {
    completed: false,
    required: false,
    status: "idle",
    block: undefined,
    lastFailureCode: undefined,
  },
}));

import { rsvpSpeechPreflight } from "../components/global";
import {
  cancelActiveRsvpSpeechPreflight,
  isAutomaticSpeechResponseEnabledForBlock,
  isRsvpSpeechPreflightBlocking,
  mountRsvpSpeechPreflight,
  runSpeechPreflight,
  type SpeechPreflightCopy,
  type SpeechPreflightPhase,
  type SpeechPreflightResult,
} from "../components/speech/speechPreflight";
import type {
  MicrophoneHealth,
  MicrophoneSession,
} from "../components/speech/microphone";

const alternatingFrame = (amplitude: number): Float32Array =>
  Float32Array.from({ length: 64 }, (_, index) =>
    index % 2 === 0 ? amplitude : -amplitude,
  );

class FakeMicrophoneSession implements MicrophoneSession {
  readonly stream = {} as MediaStream;
  readonly track = {} as MediaStreamTrack;
  readonly frameSize = 64;
  readonly sampleRate = 48000;
  readonly frameDurationMs = (this.frameSize / this.sampleRate) * 1000;
  readonly close = jest.fn(async () => undefined);

  private readCount = 0;

  constructor(
    private readonly frameForRead: (readIndex: number) => Float32Array,
    private health: MicrophoneHealth = {
      state: "ready",
      readyState: "live",
      enabled: true,
      muted: false,
    },
  ) {}

  getHealth(): MicrophoneHealth {
    return { ...this.health };
  }

  getTrackSettings(): MediaTrackSettings {
    return { sampleRate: this.sampleRate };
  }

  readFrame(target: Float32Array): void {
    target.set(this.frameForRead(this.readCount));
    this.readCount += 1;
  }

  subscribeToHealth(): () => void {
    return () => undefined;
  }
}

const runtime = {
  ambientDurationMs: 100,
  voiceTimeoutMs: 300,
  permissionTimeoutMs: 100,
  pollIntervalMs: 50,
  minimumVoiceDurationMs: 100,
};

const copy: SpeechPreflightCopy = {
  introduction: "Check the microphone.",
  startButton: "Start check",
  requestingPermission: "Requesting permission",
  measuringAmbient: "Stay quiet",
  waitingForVoice: "Say a short sound",
  success: "Microphone ready",
  retryButton: "Try again",
  failures: {
    permissionDenied: "Permission denied",
    permissionTimeout: "Permission timed out",
    microphoneNotFound: "No microphone",
    microphoneUnavailable: "Microphone unavailable",
    ambiguousInput: "Input could not be verified",
    voiceNotDetected: "Voice not detected",
    clippedInput: "Input clipped",
    unexpected: "Unexpected error",
  },
};

describe("runSpeechPreflight", () => {
  it("accepts a sustained voiced-energy change and closes the session", async () => {
    let nowMs = 0;
    const session = new FakeMicrophoneSession((readIndex) =>
      readIndex < 2 ? alternatingFrame(0.001) : alternatingFrame(0.05),
    );
    const phases: SpeechPreflightPhase[] = [];

    const result = await runSpeechPreflight({
      runtime,
      openMicrophone: jest.fn(async () => session),
      now: () => nowMs,
      wait: async (durationMs) => {
        nowMs += durationMs;
      },
      onPhaseChange: (phase) => phases.push(phase),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected a successful preflight result.");
    expect(result.sampleRate).toBe(48000);
    expect(result.noiseFloorAcRms).toBeCloseTo(0.001);
    expect(result.detectedVoiceAcRms).toBeCloseTo(0.05);
    expect(phases).toEqual([
      "requestingPermission",
      "measuringAmbient",
      "waitingForVoice",
    ]);
    expect(session.close).toHaveBeenCalledTimes(1);
  });

  it("does not treat a constant DC offset as a voice", async () => {
    let nowMs = 0;
    const session = new FakeMicrophoneSession(() =>
      new Float32Array(64).fill(0.1),
    );

    const result = await runSpeechPreflight({
      runtime,
      openMicrophone: jest.fn(async () => session),
      now: () => nowMs,
      wait: async (durationMs) => {
        nowMs += durationMs;
      },
    });

    expect(result).toEqual({ ok: false, code: "voiceNotDetected" });
    expect(session.close).toHaveBeenCalledTimes(1);
  });

  it("reports an all-zero but otherwise healthy input as ambiguous", async () => {
    let nowMs = 0;
    const session = new FakeMicrophoneSession(() => new Float32Array(64));

    const result = await runSpeechPreflight({
      runtime,
      openMicrophone: jest.fn(async () => session),
      now: () => nowMs,
      wait: async (durationMs) => {
        nowMs += durationMs;
      },
    });

    expect(result).toEqual({ ok: false, code: "ambiguousInput" });
    expect(session.close).toHaveBeenCalledTimes(1);
  });

  it("rejects persistently clipped voice evidence", async () => {
    let nowMs = 0;
    const session = new FakeMicrophoneSession((readIndex) =>
      readIndex < 2 ? alternatingFrame(0.001) : alternatingFrame(1),
    );

    const result = await runSpeechPreflight({
      runtime,
      openMicrophone: jest.fn(async () => session),
      now: () => nowMs,
      wait: async (durationMs) => {
        nowMs += durationMs;
      },
    });

    expect(result).toEqual({ ok: false, code: "clippedInput" });
    expect(session.close).toHaveBeenCalledTimes(1);
  });
});

describe("mountRsvpSpeechPreflight", () => {
  beforeEach(() => {
    cancelActiveRsvpSpeechPreflight();
    document.body.innerHTML = "";
    rsvpSpeechPreflight.completed = false;
    rsvpSpeechPreflight.required = false;
    rsvpSpeechPreflight.status = "idle";
    rsvpSpeechPreflight.block = undefined;
    rsvpSpeechPreflight.lastFailureCode = undefined;
  });

  afterEach(() => {
    cancelActiveRsvpSpeechPreflight();
  });

  it("advances only after a successful check", async () => {
    const onPassed = jest.fn();
    const runPreflight = jest.fn(
      async ({ onPhaseChange }): Promise<SpeechPreflightResult> => {
        onPhaseChange?.("waitingForVoice");
        return {
          ok: true,
          sampleRate: 48000,
          frameDurationMs: 20,
          noiseFloorAcRms: 0.001,
          detectedVoiceAcRms: 0.05,
        };
      },
    );

    mountRsvpSpeechPreflight({
      block: 2,
      language: "en-US",
      copy,
      onPassed,
      runPreflight,
    });

    expect(isRsvpSpeechPreflightBlocking()).toBe(true);
    document.querySelector<HTMLButtonElement>("button")?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(onPassed).toHaveBeenCalledTimes(1);
    expect(rsvpSpeechPreflight).toMatchObject({
      completed: true,
      required: false,
      status: "passed",
      block: 2,
    });
    expect(document.getElementById("rsvp-speech-preflight")).toBeNull();
  });

  it("keeps the instruction blocked and offers retry after failure", async () => {
    const onPassed = jest.fn();
    const runPreflight = jest.fn(
      async (): Promise<SpeechPreflightResult> => ({
        ok: false,
        code: "voiceNotDetected",
      }),
    );

    mountRsvpSpeechPreflight({
      block: 1,
      language: "en-US",
      copy,
      onPassed,
      runPreflight,
    });
    document.querySelector<HTMLButtonElement>("button")?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(onPassed).not.toHaveBeenCalled();
    expect(isRsvpSpeechPreflightBlocking()).toBe(true);
    expect(rsvpSpeechPreflight).toMatchObject({
      status: "failed",
      lastFailureCode: "voiceNotDetected",
    });
    expect(
      document.querySelector<HTMLButtonElement>("button")?.textContent,
    ).toBe("Try again");
  });

  it("cancels an active check without advancing the instruction", async () => {
    const onPassed = jest.fn();
    let receivedSignal: AbortSignal | undefined;
    const runPreflight = jest.fn(
      ({ signal }): Promise<SpeechPreflightResult> => {
        receivedSignal = signal;
        return new Promise(() => undefined);
      },
    );

    mountRsvpSpeechPreflight({
      block: 1,
      language: "en-US",
      copy,
      onPassed,
      runPreflight,
    });
    document.querySelector<HTMLButtonElement>("button")?.click();

    cancelActiveRsvpSpeechPreflight();

    expect(receivedSignal?.aborted).toBe(true);
    expect(onPassed).not.toHaveBeenCalled();
    expect(isRsvpSpeechPreflightBlocking()).toBe(false);
    expect(rsvpSpeechPreflight.status).toBe("cancelled");
    expect(document.getElementById("rsvp-speech-preflight")).toBeNull();
  });
});

describe("isAutomaticSpeechResponseEnabledForBlock", () => {
  it("recognizes parsed and serialized TRUE values", () => {
    expect(
      isAutomaticSpeechResponseEnabledForBlock(
        { read: () => [false, true] },
        1,
      ),
    ).toBe(true);
    expect(
      isAutomaticSpeechResponseEnabledForBlock(
        { read: () => ["FALSE", "TRUE"] },
        1,
      ),
    ).toBe(true);
  });

  it("leaves feature-off blocks unchanged", () => {
    expect(
      isAutomaticSpeechResponseEnabledForBlock(
        { read: () => [false, "FALSE"] },
        1,
      ),
    ).toBe(false);
  });
});
