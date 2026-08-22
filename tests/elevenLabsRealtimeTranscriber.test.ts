import {
  DEFAULT_ELEVENLABS_VAD_CONFIG,
  ElevenLabsRealtimeTranscriber,
  buildElevenLabsRealtimeUrl,
  createElevenLabsTokenProvider,
  normalizeElevenLabsKeyterms,
  type WebSocketCloseEventLike,
  type WebSocketLike,
  type WebSocketMessageEventLike,
} from "../components/speech/elevenLabsRealtimeTranscriber";
import {
  TRANSCRIPTION_PCM_SAMPLE_RATE,
  TranscriberError,
  type TranscriberEvent,
} from "../components/speech/transcriber";

type MessageListener = (event: WebSocketMessageEventLike) => void;
type ErrorListener = (event: unknown) => void;
type CloseListener = (event: WebSocketCloseEventLike) => void;

class FakeWebSocket implements WebSocketLike {
  readyState = 1;
  readonly sent: string[] = [];
  readonly close = jest.fn((code?: number, reason?: string) => {
    this.readyState = 3;
    this.emitClose({ code, reason });
  });

  private readonly messageListeners = new Set<MessageListener>();
  private readonly errorListeners = new Set<ErrorListener>();
  private readonly closeListeners = new Set<CloseListener>();

  addEventListener(type: "message", listener: MessageListener): void;
  addEventListener(type: "error", listener: ErrorListener): void;
  addEventListener(type: "close", listener: CloseListener): void;
  addEventListener(
    type: "message" | "error" | "close",
    listener: MessageListener | ErrorListener | CloseListener,
  ): void {
    if (type === "message")
      this.messageListeners.add(listener as MessageListener);
    else if (type === "error")
      this.errorListeners.add(listener as ErrorListener);
    else this.closeListeners.add(listener as CloseListener);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  emitMessage(message: unknown): void {
    const event = { data: JSON.stringify(message) };
    for (const listener of this.messageListeners) listener(event);
  }

  emitError(error: unknown): void {
    for (const listener of this.errorListeners) listener(error);
  }

  emitClose(event: WebSocketCloseEventLike): void {
    for (const listener of this.closeListeners) listener(event);
  }
}

const startConnection = async (
  options: Partial<
    ConstructorParameters<typeof ElevenLabsRealtimeTranscriber>[0]
  > = {},
) => {
  const socket = new FakeWebSocket();
  let connectionUrl = "";
  const transcriber = new ElevenLabsRealtimeTranscriber({
    tokenProvider: async () => "single-use-token",
    languageCode: "en",
    keyterms: ["cat", "dog", "fish"],
    targetKeytermBiasEnabled: true,
    noVerbatim: true,
    webSocketFactory: (url) => {
      connectionUrl = url;
      return socket;
    },
    now: () => 100,
    ...options,
  });

  const connecting = transcriber.connect();
  await Promise.resolve();
  socket.emitMessage({
    message_type: "session_started",
    session_id: "scribe-session",
  });
  const info = await connecting;
  return { transcriber, socket, connectionUrl, info };
};

describe("ElevenLabs realtime configuration", () => {
  it("uses provider VAD, cleaned output, PCM16 and repeated trial keyterms", () => {
    const url = new URL(
      buildElevenLabsRealtimeUrl("secret-token", {
        languageCode: "EN",
        keyterms: ["cat", "dog", "cat"],
        targetKeytermBiasEnabled: true,
        noVerbatim: true,
      }),
    );

    expect(url.origin).toBe("wss://api.elevenlabs.io");
    expect(url.searchParams.get("model_id")).toBe("scribe_v2_realtime");
    expect(url.searchParams.get("audio_format")).toBe("pcm_16000");
    expect(url.searchParams.get("language_code")).toBe("en");
    expect(url.searchParams.get("commit_strategy")).toBe("vad");
    expect(url.searchParams.get("no_verbatim")).toBe("true");
    expect(url.searchParams.getAll("keyterms")).toEqual(["cat", "dog"]);
    expect(url.searchParams.get("vad_silence_threshold_secs")).toBe(
      String(DEFAULT_ELEVENLABS_VAD_CONFIG.silenceThresholdSecs),
    );
  });

  it("can disable target-keyterm bias without changing the audio path", () => {
    const url = new URL(
      buildElevenLabsRealtimeUrl("secret-token", {
        languageCode: "en",
        keyterms: ["cat", "dog", "fish"],
        targetKeytermBiasEnabled: false,
        noVerbatim: true,
      }),
    );

    expect(url.searchParams.getAll("keyterms")).toEqual([]);
    expect(url.searchParams.get("no_verbatim")).toBe("true");
    expect(url.searchParams.get("commit_strategy")).toBe("vad");
  });

  it("uses cleaned output by default and permits a task-specific override", () => {
    const defaultUrl = new URL(
      buildElevenLabsRealtimeUrl("secret-token", {
        languageCode: "en",
        targetKeytermBiasEnabled: false,
      }),
    );
    const url = new URL(
      buildElevenLabsRealtimeUrl("secret-token", {
        languageCode: "en",
        targetKeytermBiasEnabled: false,
        noVerbatim: false,
      }),
    );

    expect(defaultUrl.searchParams.get("no_verbatim")).toBe("true");
    expect(url.searchParams.get("no_verbatim")).toBe("false");
  });

  it("always requests zero retention", () => {
    const url = new URL(
      buildElevenLabsRealtimeUrl("secret-token", {
        languageCode: "en",
        targetKeytermBiasEnabled: false,
      }),
    );

    expect(url.searchParams.get("enable_logging")).toBe("false");
  });

  it("rejects unsupported realtime keyterms without truncating them", () => {
    expect(() => normalizeElevenLabsKeyterms(["x".repeat(21)])).toThrow(
      TranscriberError,
    );
    expect(() =>
      normalizeElevenLabsKeyterms(
        Array.from({ length: 51 }, (_, index) => `word-${index}`),
      ),
    ).toThrow("at most 50");
  });

  it("requires a resolved ISO language code", () => {
    expect(() =>
      buildElevenLabsRealtimeUrl("token", {
        languageCode: "en-US",
        targetKeytermBiasEnabled: false,
        noVerbatim: true,
      }),
    ).toThrow("ISO-639");
  });
});

describe("createElevenLabsTokenProvider", () => {
  it("requests a no-store token without accepting an empty response", async () => {
    const fetchImpl = jest.fn(
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ token: "sutkn-test" }),
        }) as Response,
    );
    const provider = createElevenLabsTokenProvider({
      endpoint: "/token",
      fetchImpl: fetchImpl as typeof fetch,
      requestContext: () => ({
        experimentFullPath: "owner/experiment",
        pavloviaSessionToken: "session-token",
      }),
    });

    await expect(provider()).resolves.toBe("sutkn-test");
    expect(fetchImpl).toHaveBeenCalledWith(
      "/token",
      expect.objectContaining({ method: "POST", cache: "no-store" }),
    );
    expect(
      JSON.parse(fetchImpl.mock.calls[0][1]?.body as string),
    ).toMatchObject({
      protocolVersion: 1,
      provider: "elevenlabs",
      experimentFullPath: "owner/experiment",
    });
  });

  it("redacts upstream credential response details", async () => {
    const fetchImpl = jest.fn(
      async () =>
        ({
          ok: false,
          status: 401,
          json: async () => ({ error: "secret upstream detail" }),
        }) as Response,
    );
    const provider = createElevenLabsTokenProvider({
      endpoint: "/token",
      fetchImpl: fetchImpl as typeof fetch,
      requestContext: () => ({
        experimentFullPath: "owner/experiment",
        pavloviaSessionToken: "session-token",
      }),
    });

    await expect(provider()).rejects.toMatchObject({
      code: "credentialFailure",
      message: expect.not.stringContaining("secret upstream detail"),
    });
  });

  it("uses the EasyEyes function host when the experiment runs elsewhere", async () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: {
          hostname: "run.pavlovia.org",
          origin: "https://run.pavlovia.org",
          search: "",
        },
      },
    });
    const fetchImpl = jest.fn(
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ token: "sutkn-test" }),
        }) as Response,
    );

    try {
      const provider = createElevenLabsTokenProvider({
        fetchImpl: fetchImpl as typeof fetch,
        requestContext: () => ({
          experimentFullPath: "owner/experiment",
          pavloviaSessionToken: "session-token",
        }),
      });

      await expect(provider()).resolves.toBe("sutkn-test");
      expect(fetchImpl).toHaveBeenCalledWith(
        "https://easyeyes.app/.netlify/functions/speech-token",
        expect.any(Object),
      );
    } finally {
      if (originalWindow === undefined) {
        Reflect.deleteProperty(globalThis, "window");
      } else {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: originalWindow,
        });
      }
    }
  });
});

describe("ElevenLabsRealtimeTranscriber", () => {
  it("waits for session_started before becoming ready", async () => {
    const { transcriber, connectionUrl, info } = await startConnection();

    expect(transcriber.state).toBe("ready");
    expect(info).toEqual({
      provider: "elevenlabs",
      model: "scribe_v2_realtime",
      sessionId: "scribe-session",
      languageCode: "en",
      sampleRate: TRANSCRIPTION_PCM_SAMPLE_RATE,
    });
    expect(new URL(connectionUrl).searchParams.getAll("keyterms")).toEqual([
      "cat",
      "dog",
      "fish",
    ]);
  });

  it("rejects a pending connect when cleanup closes the socket", async () => {
    const socket = new FakeWebSocket();
    const transcriber = new ElevenLabsRealtimeTranscriber({
      tokenProvider: async () => "single-use-token",
      languageCode: "en",
      targetKeytermBiasEnabled: false,
      noVerbatim: true,
      webSocketFactory: () => socket,
    });

    const connecting = transcriber.connect();
    await Promise.resolve();
    await transcriber.close();

    await expect(connecting).rejects.toMatchObject({ code: "closed" });
    expect(transcriber.state).toBe("closed");
  });

  it("maps provider commits without ending the application utterance", async () => {
    const { transcriber, socket } = await startConnection();
    const events: TranscriberEvent[] = [];
    transcriber.subscribe((event) => events.push(event));
    transcriber.beginUtterance("trial-1");

    socket.emitMessage({ message_type: "partial_transcript", text: "ca" });
    socket.emitMessage({ message_type: "final_transcript", text: "cat" });
    expect(events).toEqual([
      expect.objectContaining({
        type: "partial",
        utteranceId: "trial-1",
        text: "ca",
        settled: false,
      }),
      expect.objectContaining({
        type: "partial",
        utteranceId: "trial-1",
        text: "cat",
        settled: true,
      }),
    ]);

    socket.emitMessage({ message_type: "committed_transcript", text: "cat" });
    expect(events.at(-1)).toEqual(
      expect.objectContaining({
        type: "commit",
        utteranceId: "trial-1",
        text: "cat",
      }),
    );

    expect(() => transcriber.beginUtterance("trial-2")).toThrow(
      "already active",
    );
    transcriber.endUtterance("trial-1");
    expect(() => transcriber.beginUtterance("trial-2")).not.toThrow();
  });

  it("sends little-endian PCM only for the active utterance", async () => {
    const { transcriber, socket } = await startConnection();
    const chunk = {
      samples: new Int16Array([1, -2]),
      sampleRate: TRANSCRIPTION_PCM_SAMPLE_RATE,
      capturedAtMs: 10,
    } as const;

    expect(() => transcriber.sendAudio("trial-1", chunk)).toThrow(
      "no active transcription utterance",
    );
    transcriber.beginUtterance("trial-1");
    transcriber.sendAudio("trial-1", chunk);

    const payload = JSON.parse(socket.sent[0]) as {
      audio_base_64: string;
      sample_rate: number;
    };
    const bytes = Uint8Array.from(atob(payload.audio_base_64), (value) =>
      value.charCodeAt(0),
    );
    expect([...bytes]).toEqual([1, 0, 254, 255]);
    expect(payload.sample_rate).toBe(16000);
    expect(() => transcriber.sendAudio("trial-old", chunk)).toThrow(
      "stale transcription utterance",
    );
  });

  it("supports a bounded manual commit without treating it as final", async () => {
    const { transcriber, socket } = await startConnection();
    transcriber.beginUtterance("trial-1");
    transcriber.requestCommit("trial-1");

    expect(JSON.parse(socket.sent[0])).toEqual({
      message_type: "input_audio_chunk",
      audio_base_64: "",
      commit: true,
      sample_rate: 16000,
    });
    expect(() => transcriber.beginUtterance("trial-2")).toThrow(
      "already active",
    );
  });

  it("maps provider failures to typed redacted events", async () => {
    const { transcriber, socket } = await startConnection();
    const events: TranscriberEvent[] = [];
    transcriber.subscribe((event) => events.push(event));
    transcriber.beginUtterance("trial-1");

    socket.emitMessage({
      message_type: "rate_limited",
      error: "account-sensitive provider response",
    });

    expect(transcriber.state).toBe("failed");
    expect(events[0]).toEqual(
      expect.objectContaining({
        type: "error",
        utteranceId: "trial-1",
        error: expect.objectContaining({
          code: "rateLimited",
          retryable: true,
          message: expect.not.stringContaining("account-sensitive"),
        }),
      }),
    );
  });

  it("closes the connection when an utterance is cancelled", async () => {
    const { transcriber, socket } = await startConnection();
    transcriber.beginUtterance("trial-1");

    transcriber.cancelUtterance("trial-1");

    expect(socket.close).toHaveBeenCalledWith(1000, "utterance-cancelled");
    expect(transcriber.state).toBe("closed");
  });
});
