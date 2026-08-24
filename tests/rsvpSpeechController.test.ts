import type { MicrophoneSession } from "../components/speech/microphone";
import { DeepgramRealtimeTranscriber } from "../components/speech/deepgramRealtimeTranscriber";
import { ElevenLabsRealtimeTranscriber } from "../components/speech/elevenLabsRealtimeTranscriber";
import type {
  SpeechSessionState,
  SpeechUtteranceResult,
} from "../components/speech/speechSession";
import type {
  PcmAudioChunk,
  StreamingTranscriber,
} from "../components/speech/transcriber";
import {
  RsvpSpeechController,
  RsvpSpeechControllerError,
  type RsvpSpeechCapturePort,
  type RsvpSpeechControllerDependencies,
  type RsvpSpeechSessionPort,
  type RsvpSpeechTrialConfiguration,
} from "../components/rsvpSpeech/rsvpSpeechController";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const makeResult = (utteranceId = "1_1-1"): SpeechUtteranceResult => ({
  utteranceId,
  text: "cat dog fish",
  committedSegments: [{ text: "cat dog fish", receivedAtMs: 140 }],
  startedAtMs: 100,
  completedAtMs: 140,
  durationMs: 40,
  finalizationTrigger: "providerVad",
});

const makeConfiguration = (
  overrides: Partial<RsvpSpeechTrialConfiguration> = {},
): RsvpSpeechTrialConfiguration => ({
  utteranceId: "1_1-1",
  provider: "elevenlabs",
  targetWords: ["cat", "dog", "fish"],
  languageCode: "en",
  targetKeytermBiasEnabled: true,
  maximumResponseDurationMs: 6_000,
  finalizationTimeoutMs: 3_000,
  requestTokenContext: () => ({
    experimentFullPath: "owner/study",
    pavloviaSessionToken: "session-token",
  }),
  ...overrides,
});

class FakeCapture implements RsvpSpeechCapturePort {
  readonly initialize = jest.fn(async () => undefined);
  readonly start = jest.fn(() => undefined);
  readonly stop = jest.fn(() => undefined);
  readonly close = jest.fn(async () => undefined);
  private listener?: (chunk: PcmAudioChunk) => void;

  subscribe(listener: (chunk: PcmAudioChunk) => void): () => void {
    this.listener = listener;
    return jest.fn(() => {
      this.listener = undefined;
    });
  }

  emit(chunk: PcmAudioChunk): void {
    this.listener?.(chunk);
  }
}

class FakeSession implements RsvpSpeechSessionPort {
  state: SpeechSessionState = "idle";
  readonly events: string[];
  readonly connect = jest.fn(async () => {
    this.events.push("session.connect");
    this.state = "ready";
    return {};
  });
  readonly pushAudio = jest.fn(() => true);
  readonly allowProviderFinalization = jest.fn(() => {
    this.events.push("session.allowProviderFinalization");
    this.state = "finalizing";
  });
  readonly cancelUtterance = jest.fn(() => {
    this.events.push("session.cancelUtterance");
    this.state = "closed";
    this.pending?.reject(new Error("cancelled"));
  });
  readonly close = jest.fn(async () => {
    this.events.push("session.close");
    this.state = "closed";
  });
  private pending?: ReturnType<typeof deferred<SpeechUtteranceResult>>;

  constructor(events: string[] = []) {
    this.events = events;
  }

  beginUtterance(utteranceId: string): Promise<SpeechUtteranceResult> {
    this.events.push(`session.begin:${utteranceId}`);
    this.state = "listening";
    this.pending = deferred<SpeechUtteranceResult>();
    return this.pending.promise;
  }

  complete(result = makeResult()): void {
    this.state = "ready";
    this.pending?.resolve(result);
  }

  fail(error = new Error("provider failed")): void {
    this.state = "failed";
    this.pending?.reject(error);
  }
}

const makeMicrophone = () =>
  ({
    close: jest.fn(async () => undefined),
  }) as unknown as MicrophoneSession;

const makeHarness = (
  overrides: {
    microphone?: MicrophoneSession;
    capture?: FakeCapture;
    session?: FakeSession;
    dependencies?: Partial<RsvpSpeechControllerDependencies>;
  } = {},
) => {
  const microphone = overrides.microphone ?? makeMicrophone();
  const capture = overrides.capture ?? new FakeCapture();
  const session = overrides.session ?? new FakeSession();
  const transcriber = {} as StreamingTranscriber;
  const seenConfigurations: Readonly<RsvpSpeechTrialConfiguration>[] = [];
  const dependencies: RsvpSpeechControllerDependencies = {
    openMicrophone: jest.fn(async () => microphone),
    createCapture: jest.fn(() => capture),
    createTranscriber: jest.fn((configuration) => {
      seenConfigurations.push(configuration);
      return transcriber;
    }),
    createSession: jest.fn(() => session),
    ...overrides.dependencies,
  };

  return {
    microphone,
    capture,
    session,
    dependencies,
    seenConfigurations,
  };
};

describe("RsvpSpeechController", () => {
  it("prepares one trial while keeping the audio gate closed", async () => {
    const harness = makeHarness();
    const controller = new RsvpSpeechController(
      makeConfiguration(),
      harness.dependencies,
    );

    await controller.prepare();

    expect(controller.state).toBe("ready");
    expect(harness.capture.initialize).toHaveBeenCalledTimes(1);
    expect(harness.capture.start).not.toHaveBeenCalled();
    expect(harness.session.connect).toHaveBeenCalledTimes(1);
  });

  it("initializes microphone capture without waiting for provider readiness", async () => {
    const connection = deferred<unknown>();
    const session = new FakeSession();
    session.connect.mockImplementationOnce(() => connection.promise);
    const harness = makeHarness({ session });
    const controller = new RsvpSpeechController(
      makeConfiguration(),
      harness.dependencies,
    );

    const preparation = controller.prepare();
    await Promise.resolve();
    await Promise.resolve();

    expect(harness.capture.initialize).toHaveBeenCalledTimes(1);
    expect(controller.state).toBe("preparing");
    connection.resolve({});
    await preparation;
    expect(controller.state).toBe("ready");
  });

  it("copies only this trial's target words into immutable provider configuration", async () => {
    const targetWords = ["cat", "dog", "fish"];
    const harness = makeHarness();
    const controller = new RsvpSpeechController(
      makeConfiguration({ targetWords }),
      harness.dependencies,
    );
    targetWords[0] = "changed-after-construction";

    await controller.prepare();

    expect(harness.seenConfigurations).toHaveLength(1);
    expect(harness.seenConfigurations[0].targetWords).toEqual([
      "cat",
      "dog",
      "fish",
    ]);
    expect(Object.isFrozen(harness.seenConfigurations[0].targetWords)).toBe(
      true,
    );
  });

  it.each([
    ["elevenlabs", ElevenLabsRealtimeTranscriber],
    ["deepgram", DeepgramRealtimeTranscriber],
  ] as const)(
    "constructs the selected %s adapter",
    async (provider, Adapter) => {
      const harness = makeHarness();
      let selectedTranscriber: StreamingTranscriber | undefined;
      const controller = new RsvpSpeechController(
        makeConfiguration({ provider }),
        {
          ...harness.dependencies,
          createTranscriber: undefined,
          createSession: (transcriber) => {
            selectedTranscriber = transcriber;
            return harness.session;
          },
        },
      );

      await controller.prepare();

      expect(selectedTranscriber).toBeInstanceOf(Adapter);
      await controller.close();
    },
  );

  it("starts capture synchronously after opening the utterance", async () => {
    const events: string[] = [];
    const capture = new FakeCapture();
    capture.start.mockImplementation(() => {
      events.push("capture.start");
    });
    const session = new FakeSession(events);
    const harness = makeHarness({ capture, session });
    const controller = new RsvpSpeechController(
      makeConfiguration(),
      harness.dependencies,
    );
    await controller.prepare();

    controller.startCapture();

    expect(controller.state).toBe("capturing");
    expect(events).toEqual([
      "session.connect",
      "session.begin:1_1-1",
      "capture.start",
    ]);
  });

  it("forwards PCM only through the active trial session", async () => {
    const harness = makeHarness();
    const controller = new RsvpSpeechController(
      makeConfiguration(),
      harness.dependencies,
    );
    await controller.prepare();
    controller.startCapture();
    const chunk: PcmAudioChunk = {
      samples: new Int16Array([1, 2, 3]),
      sampleRate: 16_000,
      capturedAtMs: 123,
    };

    harness.capture.emit(chunk);

    expect(harness.session.pushAudio).toHaveBeenCalledWith(chunk);
  });

  it("allows finalization without stopping capture and cleans up after the result", async () => {
    const harness = makeHarness();
    const controller = new RsvpSpeechController(
      makeConfiguration(),
      harness.dependencies,
    );
    await controller.prepare();
    controller.startCapture();

    controller.allowProviderFinalization();

    expect(controller.state).toBe("finalizing");
    expect(harness.capture.stop).not.toHaveBeenCalled();
    harness.session.complete();
    await expect(controller.waitForResult()).resolves.toEqual(makeResult());
    expect(controller.state).toBe("completed");
    expect(harness.capture.close).toHaveBeenCalledTimes(1);
    expect(harness.session.close).toHaveBeenCalledTimes(1);
    expect(harness.microphone.close).toHaveBeenCalledTimes(1);
  });

  it("closes every acquired resource when preparation fails", async () => {
    const microphone = makeMicrophone();
    const capture = new FakeCapture();
    const session = new FakeSession();
    session.connect.mockRejectedValueOnce(new Error("connection failed"));
    const harness = makeHarness({ microphone, capture, session });
    const controller = new RsvpSpeechController(
      makeConfiguration(),
      harness.dependencies,
    );

    await expect(controller.prepare()).rejects.toMatchObject({
      code: "preparationFailed",
    });

    expect(controller.state).toBe("failed");
    expect(capture.start).not.toHaveBeenCalled();
    expect(session.close).toHaveBeenCalledTimes(1);
    expect(microphone.close).toHaveBeenCalledTimes(1);
  });

  it("turns a capture-start failure into a terminal technical failure", async () => {
    const capture = new FakeCapture();
    capture.start.mockImplementationOnce(() => {
      throw new Error("capture failed");
    });
    const harness = makeHarness({ capture });
    const controller = new RsvpSpeechController(
      makeConfiguration(),
      harness.dependencies,
    );
    await controller.prepare();

    expect(() => controller.startCapture()).toThrow(RsvpSpeechControllerError);
    expect(controller.state).toBe("failed");
    expect(controller.failure?.code).toBe("captureFailed");
    expect(harness.session.cancelUtterance).toHaveBeenCalledTimes(1);
  });

  it("reports provider failure separately from a participant response", async () => {
    const harness = makeHarness();
    const controller = new RsvpSpeechController(
      makeConfiguration(),
      harness.dependencies,
    );
    await controller.prepare();
    controller.startCapture();

    harness.session.fail();

    await expect(controller.waitForResult()).rejects.toMatchObject({
      code: "transcriptionFailed",
    });
    expect(controller.state).toBe("failed");
    expect(harness.capture.close).toHaveBeenCalledTimes(1);
    expect(harness.session.close).toHaveBeenCalledTimes(1);
    expect(harness.microphone.close).toHaveBeenCalledTimes(1);
  });

  it("waits for late preparation resources and closes them on cancellation", async () => {
    const microphoneRequest = deferred<MicrophoneSession>();
    const connection = deferred<unknown>();
    const microphone = makeMicrophone();
    const session = new FakeSession();
    session.connect.mockImplementationOnce(() => connection.promise);
    const harness = makeHarness({
      microphone,
      session,
      dependencies: {
        openMicrophone: () => microphoneRequest.promise,
      },
    });
    const controller = new RsvpSpeechController(
      makeConfiguration(),
      harness.dependencies,
    );
    const preparation = controller.prepare();

    const firstClose = controller.close();
    const secondClose = controller.close();
    microphoneRequest.resolve(microphone);
    connection.resolve({});

    await expect(preparation).rejects.toMatchObject({ code: "closed" });
    await expect(firstClose).resolves.toBeUndefined();
    await expect(secondClose).resolves.toBeUndefined();
    expect(controller.state).toBe("closed");
    expect(microphone.close).toHaveBeenCalledTimes(1);
    expect(session.close).toHaveBeenCalledTimes(1);
  });

  it("isolates provider configuration across consecutive trial controllers", async () => {
    const first = makeHarness();
    const second = makeHarness();
    const firstController = new RsvpSpeechController(
      makeConfiguration({ utteranceId: "trial-1", targetWords: ["one"] }),
      first.dependencies,
    );
    const secondController = new RsvpSpeechController(
      makeConfiguration({ utteranceId: "trial-2", targetWords: ["two"] }),
      second.dependencies,
    );

    await firstController.prepare();
    await secondController.prepare();

    expect(first.seenConfigurations[0].targetWords).toEqual(["one"]);
    expect(second.seenConfigurations[0].targetWords).toEqual(["two"]);
    await firstController.close();
    expect(secondController.state).toBe("ready");
    await secondController.close();
  });

  it.each([
    ["empty utterance", { utteranceId: " " }],
    ["empty targets", { targetWords: [] }],
    ["blank target", { targetWords: ["cat", " "] }],
    ["empty language", { languageCode: " " }],
    ["invalid duration", { maximumResponseDurationMs: 0 }],
  ])("rejects %s before acquiring resources", (_, overrides) => {
    expect(
      () =>
        new RsvpSpeechController(
          makeConfiguration(overrides as Partial<RsvpSpeechTrialConfiguration>),
        ),
    ).toThrow(RsvpSpeechControllerError);
  });
});
