import {
  DeepgramRealtimeTranscriber,
  buildDeepgramRealtimeUrl,
  type DeepgramWebSocketLike,
} from "../components/speech/deepgramRealtimeTranscriber";
import {
  TRANSCRIPTION_PCM_SAMPLE_RATE,
  type TranscriberEvent,
} from "../components/speech/transcriber";

class FakeWebSocket implements DeepgramWebSocketLike {
  readyState = 0;
  readonly sent: Array<string | ArrayBuffer> = [];
  readonly close = jest.fn(() => {
    this.readyState = 3;
  });
  private readonly listeners = new Map<
    string,
    Set<(event?: unknown) => void>
  >();

  addEventListener(type: "open", listener: () => void): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  addEventListener(type: "error", listener: (event: unknown) => void): void;
  addEventListener(type: "close", listener: (event: CloseEvent) => void): void;
  addEventListener(type: string, listener: (event?: unknown) => void): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  send(data: string | ArrayBuffer): void {
    this.sent.push(data);
  }

  open(): void {
    this.readyState = 1;
    for (const listener of this.listeners.get("open") ?? []) listener();
  }

  message(message: unknown): void {
    const event = { data: JSON.stringify(message) };
    for (const listener of this.listeners.get("message") ?? []) listener(event);
  }
}

const options = {
  tokenProvider: async () => "temporary-jwt",
  languageCode: "en-US",
  keyterms: ["cat", "dog", "cat"],
  targetKeytermBiasEnabled: true,
  endpointingMs: 500,
} as const;

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe("Deepgram realtime transcription", () => {
  it("builds an explicit Nova-3 PCM configuration", () => {
    const url = new URL(buildDeepgramRealtimeUrl(options));

    expect(url.searchParams.get("model")).toBe("nova-3");
    expect(url.searchParams.get("encoding")).toBe("linear16");
    expect(url.searchParams.get("sample_rate")).toBe("16000");
    expect(url.searchParams.get("endpointing")).toBe("500");
    expect(url.searchParams.get("mip_opt_out")).toBe("true");
    expect(url.searchParams.getAll("keyterm")).toEqual(["cat", "dog"]);
  });

  it("authenticates with a short-lived bearer token and accumulates final pieces", async () => {
    const socket = new FakeWebSocket();
    let protocols: readonly string[] = [];
    const transcriber = new DeepgramRealtimeTranscriber({
      ...options,
      webSocketFactory: (_url, receivedProtocols) => {
        protocols = receivedProtocols;
        return socket;
      },
      now: () => 100,
    });
    const events: TranscriberEvent[] = [];
    transcriber.subscribe((event) => events.push(event));

    const connecting = transcriber.connect();
    await Promise.resolve();
    socket.open();
    await connecting;
    expect(protocols).toEqual(["bearer", "temporary-jwt"]);

    transcriber.beginUtterance("trial-1");
    transcriber.sendAudio("trial-1", {
      samples: new Int16Array([1, -2]),
      sampleRate: TRANSCRIPTION_PCM_SAMPLE_RATE,
      capturedAtMs: 50,
    });
    expect(socket.sent[0]).toBeInstanceOf(ArrayBuffer);

    socket.message({
      type: "Results",
      is_final: true,
      speech_final: false,
      channel: { alternatives: [{ transcript: "cat dog" }] },
    });
    socket.message({
      type: "Results",
      is_final: true,
      speech_final: true,
      channel: { alternatives: [{ transcript: "fish" }] },
    });

    expect(events.at(-1)).toEqual(
      expect.objectContaining({
        type: "commit",
        utteranceId: "trial-1",
        text: "cat dog fish",
      }),
    );
  });

  it("sends an explicit finalize message at the safety bound", async () => {
    const socket = new FakeWebSocket();
    const transcriber = new DeepgramRealtimeTranscriber({
      ...options,
      webSocketFactory: () => socket,
    });
    const connecting = transcriber.connect();
    await Promise.resolve();
    socket.open();
    await connecting;

    transcriber.beginUtterance("trial-1");
    transcriber.requestCommit("trial-1");

    expect(socket.sent.at(-1)).toBe(JSON.stringify({ type: "Finalize" }));
  });

  it("does not open a socket when closed during credential retrieval", async () => {
    const token = deferred<string>();
    const webSocketFactory = jest.fn(() => new FakeWebSocket());
    const transcriber = new DeepgramRealtimeTranscriber({
      ...options,
      tokenProvider: () => token.promise,
      webSocketFactory,
    });

    const connecting = transcriber.connect();
    await transcriber.close();
    token.resolve("late-token");

    await expect(connecting).rejects.toMatchObject({ code: "closed" });
    expect(webSocketFactory).not.toHaveBeenCalled();
  });
});
