import {
  SpeechSession,
  SpeechSessionError,
  type SpeechSessionEvent,
} from "../components/speech/speechSession";
import {
  TRANSCRIPTION_PCM_SAMPLE_RATE,
  TranscriberError,
  type PcmAudioChunk,
  type StreamingTranscriber,
  type TranscriberConnectionInfo,
  type TranscriberEvent,
  type TranscriberListener,
  type TranscriberState,
} from "../components/speech/transcriber";

const connectionInfo: TranscriberConnectionInfo = {
  provider: "fake",
  model: "fake-realtime",
  sessionId: "session-1",
  languageCode: "en",
  sampleRate: TRANSCRIPTION_PCM_SAMPLE_RATE,
};

const audioChunk: PcmAudioChunk = {
  samples: new Int16Array([1, -1, 2, -2]),
  sampleRate: TRANSCRIPTION_PCM_SAMPLE_RATE,
  capturedAtMs: 100,
};

class FakeTranscriber implements StreamingTranscriber {
  state: TranscriberState = "idle";
  connectionInfo?: TranscriberConnectionInfo;
  readonly beginUtterance = jest.fn((utteranceId: string) => {
    this.activeUtteranceId = utteranceId;
  });
  readonly sendAudio = jest.fn();
  readonly requestCommit = jest.fn();
  readonly endUtterance = jest.fn((utteranceId: string) => {
    if (this.activeUtteranceId === utteranceId) {
      this.activeUtteranceId = undefined;
    }
  });
  readonly cancelUtterance = jest.fn(() => {
    this.state = "closed";
    this.activeUtteranceId = undefined;
  });
  readonly close = jest.fn(async () => {
    this.state = "closed";
  });

  private readonly listeners = new Set<TranscriberListener>();
  private activeUtteranceId?: string;

  async connect(): Promise<TranscriberConnectionInfo> {
    this.state = "ready";
    this.connectionInfo = connectionInfo;
    return connectionInfo;
  }

  subscribe(listener: TranscriberListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: TranscriberEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

describe("SpeechSession", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("forwards audio only while the current utterance is listening", async () => {
    const transcriber = new FakeTranscriber();
    const session = new SpeechSession(transcriber, {
      maximumUtteranceDurationMs: 12000,
      now: () => 100,
    });
    const events: SpeechSessionEvent[] = [];
    session.subscribe((event) => events.push(event));

    await session.connect();
    expect(session.pushAudio(audioChunk)).toBe(false);

    const resultPromise = session.beginUtterance("trial-1");
    expect(session.state).toBe("listening");
    expect(session.pushAudio(audioChunk)).toBe(true);
    expect(transcriber.sendAudio).toHaveBeenCalledWith("trial-1", audioChunk);

    transcriber.emit({
      type: "partial",
      utteranceId: "trial-1",
      text: "ca",
      settled: false,
      receivedAtMs: 120,
    });
    session.allowProviderFinalization();
    transcriber.emit({
      type: "commit",
      utteranceId: "trial-1",
      text: "cat dog fish",
      receivedAtMs: 150,
    });

    await expect(resultPromise).resolves.toMatchObject({
      utteranceId: "trial-1",
      text: "cat dog fish",
      finalizationTrigger: "providerVad",
    });
    expect(session.state).toBe("ready");
    expect(session.pushAudio(audioChunk)).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "partial",
        utteranceId: "trial-1",
        text: "ca",
      }),
    );
  });

  it("ignores a commit carrying a stale utterance identifier", async () => {
    const transcriber = new FakeTranscriber();
    const session = new SpeechSession(transcriber, {
      maximumUtteranceDurationMs: 12000,
    });
    await session.connect();

    const resultPromise = session.beginUtterance("trial-2");
    transcriber.emit({
      type: "commit",
      utteranceId: "trial-old",
      text: "wrong callback",
      receivedAtMs: 10,
    });
    expect(session.state).toBe("listening");

    session.allowProviderFinalization();
    transcriber.emit({
      type: "commit",
      utteranceId: "trial-2",
      text: "dog",
      receivedAtMs: 20,
    });
    await expect(resultPromise).resolves.toMatchObject({ text: "dog" });
  });

  it("accumulates provider commits before presentation completion", async () => {
    const transcriber = new FakeTranscriber();
    const session = new SpeechSession(transcriber, {
      maximumUtteranceDurationMs: 12000,
    });
    await session.connect();

    const resultPromise = session.beginUtterance("trial-1");
    transcriber.emit({
      type: "commit",
      utteranceId: "trial-1",
      text: "cat",
      receivedAtMs: 100,
    });
    expect(session.state).toBe("listening");

    session.allowProviderFinalization();
    transcriber.emit({
      type: "commit",
      utteranceId: "trial-1",
      text: "dog fish",
      receivedAtMs: 200,
    });

    await expect(resultPromise).resolves.toMatchObject({
      text: "cat dog fish",
      finalizationTrigger: "providerVad",
      committedSegments: [
        { text: "cat", receivedAtMs: 100 },
        { text: "dog fish", receivedAtMs: 200 },
      ],
    });
    expect(transcriber.endUtterance).toHaveBeenCalledWith("trial-1");
  });

  it("starts each sequential utterance with an empty transcript buffer", async () => {
    const transcriber = new FakeTranscriber();
    const session = new SpeechSession(transcriber, {
      maximumUtteranceDurationMs: 12000,
    });
    await session.connect();

    const firstPromise = session.beginUtterance("trial-1");
    session.allowProviderFinalization();
    transcriber.emit({
      type: "commit",
      utteranceId: "trial-1",
      text: "cat",
      receivedAtMs: 100,
    });
    await expect(firstPromise).resolves.toMatchObject({ text: "cat" });

    const secondPromise = session.beginUtterance("trial-2");
    transcriber.emit({
      type: "commit",
      utteranceId: "trial-1",
      text: "stale callback",
      receivedAtMs: 150,
    });
    session.allowProviderFinalization();
    transcriber.emit({
      type: "commit",
      utteranceId: "trial-2",
      text: "dog",
      receivedAtMs: 200,
    });

    await expect(secondPromise).resolves.toMatchObject({
      text: "dog",
      committedSegments: [{ text: "dog", receivedAtMs: 200 }],
    });
  });

  it("uses a manual commit without accepting later audio", async () => {
    const transcriber = new FakeTranscriber();
    const session = new SpeechSession(transcriber, {
      maximumUtteranceDurationMs: 12000,
    });
    await session.connect();

    const resultPromise = session.beginUtterance("trial-1");
    session.requestCommit("manual");

    expect(session.state).toBe("finalizing");
    expect(session.pushAudio(audioChunk)).toBe(false);
    expect(transcriber.requestCommit).toHaveBeenCalledWith("trial-1");

    transcriber.emit({
      type: "commit",
      utteranceId: "trial-1",
      text: "fish",
      receivedAtMs: performance.now(),
    });
    await expect(resultPromise).resolves.toMatchObject({
      text: "fish",
      finalizationTrigger: "manual",
    });
  });

  it("commits at the hard duration bound and fails if no final arrives", async () => {
    jest.useFakeTimers();
    const transcriber = new FakeTranscriber();
    const session = new SpeechSession(transcriber, {
      maximumUtteranceDurationMs: 12000,
      finalizationTimeoutMs: 1000,
    });
    await session.connect();

    const resultPromise = session.beginUtterance("trial-timeout");
    jest.advanceTimersByTime(12000);
    expect(transcriber.requestCommit).toHaveBeenCalledWith("trial-timeout");
    expect(session.state).toBe("finalizing");

    jest.advanceTimersByTime(1000);
    await expect(resultPromise).rejects.toMatchObject({
      code: "finalizationTimeout",
      retryable: true,
    });
    expect(transcriber.cancelUtterance).toHaveBeenCalledWith("trial-timeout");
    expect(session.state).toBe("failed");
  });

  it("turns provider errors into a rejected technical utterance", async () => {
    const transcriber = new FakeTranscriber();
    const session = new SpeechSession(transcriber, {
      maximumUtteranceDurationMs: 12000,
    });
    await session.connect();
    const resultPromise = session.beginUtterance("trial-error");

    transcriber.emit({
      type: "error",
      utteranceId: "trial-error",
      error: new TranscriberError(
        "providerUnavailable",
        "Provider unavailable",
        { retryable: true },
      ),
      receivedAtMs: 10,
    });

    await expect(resultPromise).rejects.toMatchObject({
      code: "transcriberFailure",
      retryable: true,
    });
    expect(session.state).toBe("failed");
  });

  it("closes a cancelled utterance so provider context cannot leak", async () => {
    const transcriber = new FakeTranscriber();
    const session = new SpeechSession(transcriber, {
      maximumUtteranceDurationMs: 12000,
    });
    await session.connect();
    const resultPromise = session.beginUtterance("trial-cancelled");

    session.cancelUtterance();

    await expect(resultPromise).rejects.toBeInstanceOf(SpeechSessionError);
    expect(transcriber.cancelUtterance).toHaveBeenCalledWith("trial-cancelled");
    expect(session.state).toBe("closed");
  });

  it("closes idempotently", async () => {
    const transcriber = new FakeTranscriber();
    const session = new SpeechSession(transcriber, {
      maximumUtteranceDurationMs: 12000,
    });
    await session.connect();

    await Promise.all([session.close(), session.close()]);
    expect(transcriber.close).toHaveBeenCalledTimes(1);
    expect(session.state).toBe("closed");
  });
});
