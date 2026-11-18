import { GoogleChirp3Transcriber } from "../components/speech/googleChirp3Transcriber";
import { SpeechSession } from "../components/speech/speechSession";
import type { DeepgramWebSocketLike } from "../components/speech/deepgramRealtimeTranscriber";
import type { TranscriberEvent } from "../components/speech/transcriber";

class FakeSocket {
  readyState = 0;
  sent: (string | ArrayBuffer)[] = [];
  listeners = new Map<string, ((event: any) => void)[]>();
  addEventListener(type: string, listener: (event: any) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  send(value: string | ArrayBuffer) {
    this.sent.push(value);
  }
  close = jest.fn((code?: number) => {
    if (code !== undefined && code !== 1000 && (code < 3000 || code > 4999))
      throw new DOMException("Invalid close code", "InvalidAccessError");
    this.readyState = 3;
  });
  open() {
    this.readyState = 1;
    this.listeners.get("open")?.forEach((listener) => listener(undefined));
  }
  message(value: unknown) {
    this.listeners
      .get("message")
      ?.forEach((listener) => listener({ data: JSON.stringify(value) }));
  }
}
const create = () => {
  const socket = new FakeSocket();
  const transcriber = new GoogleChirp3Transcriber({
    utteranceId: "trial",
    languageCode: "en-US",
    keyterms: ["cat", "dog", "fish"],
    targetKeytermBiasEnabled: true,
    credentialProvider: async () => ({
      token: "temporary-ticket",
      websocketUrl: "wss://relay.run.app/v1/stream",
    }),
    webSocketFactory: () => socket as unknown as DeepgramWebSocketLike,
  });
  const ready = async () => {
    const connecting = transcriber.connect();
    await Promise.resolve();
    socket.open();
    socket.message({
      type: "ready",
      utteranceId: "trial",
      model: "chirp_3",
      languageCode: "en-US",
      sampleRate: 16000,
    });
    await connecting;
  };
  return { socket, transcriber, ready };
};

describe("Google Chirp 3 transcriber", () => {
  it("sends its ticket in the initial message rather than the WebSocket URL", async () => {
    const h = create();
    await h.ready();
    expect(JSON.parse(h.socket.sent[0] as string)).toMatchObject({
      token: "temporary-ticket",
      keyterms: ["cat", "dog", "fish"],
      useKeyterms: true,
    });
    expect(h.transcriber.connectionInfo?.provider).toBe("chirp3");
    await h.transcriber.close();
  });
  it("uses the existing SpeechSession for segmented text and final acknowledgement", async () => {
    const h = create();
    const session = new SpeechSession(h.transcriber, {
      externallyControlledEnd: true,
      maximumUtteranceDurationMs: 20000,
    });
    const connecting = session.connect();
    await Promise.resolve();
    h.socket.open();
    h.socket.message({
      type: "ready",
      utteranceId: "trial",
      model: "chirp_3",
      languageCode: "en-US",
      sampleRate: 16000,
    });
    await connecting;
    const result = session.beginUtterance("trial");
    session.pushAudio({
      samples: new Int16Array([1, -2]),
      sampleRate: 16000,
      capturedAtMs: 1,
    });
    expect([...new Uint8Array(h.socket.sent[1] as ArrayBuffer)]).toEqual([
      1, 0, 254, 255,
    ]);
    h.socket.message({ type: "segment", utteranceId: "trial", text: "cat" });
    expect(session.state).toBe("listening");
    session.requestCommit();
    h.socket.message({
      type: "segment",
      utteranceId: "trial",
      text: "dog fish",
    });
    expect(session.state).toBe("finalizing");
    h.socket.message({ type: "complete", utteranceId: "trial" });
    await expect(result).resolves.toMatchObject({ text: "cat dog fish" });
    await session.close();
  });
  it("keeps empty success separate from provider failure", async () => {
    const h = create();
    await h.ready();
    const events: TranscriberEvent[] = [];
    h.transcriber.subscribe((event) => events.push(event));
    h.transcriber.beginUtterance("trial");
    h.transcriber.requestCommit("trial");
    h.socket.message({
      type: "error",
      code: "providerUnavailable",
      utteranceId: "trial",
    });
    expect(events.some((event) => event.type === "commit")).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "error",
        utteranceId: "trial",
      }),
    );
    expect(h.socket.readyState).toBe(3);
    expect(h.transcriber.state).toBe("failed");
    await h.transcriber.close();
  });
  it("reports a disconnect between readiness and capture to the session immediately", async () => {
    const h = create();
    await h.ready();
    const session = new SpeechSession(h.transcriber, {
      maximumUtteranceDurationMs: 20000,
    });
    await session.connect();
    const events: TranscriberEvent[] = [];
    h.transcriber.subscribe((event) => events.push(event));
    h.socket.message({
      type: "error",
      code: "quotaExceeded",
      utteranceId: "trial",
    });
    expect(session.state).toBe("failed");
    expect(h.socket.readyState).toBe(3);
    h.socket.listeners.get("close")?.forEach((listener) => listener({}));
    expect(events).toEqual([
      expect.objectContaining({ type: "error", utteranceId: undefined }),
      expect.objectContaining({ type: "closed", expected: false }),
    ]);
    expect(() => session.beginUtterance("trial")).toThrow();
    await expect(h.transcriber.connect()).rejects.toThrow();
    await session.close();
  });
  it("cancels a connection while credentials are pending", async () => {
    let resolve!: (credential: { token: string; websocketUrl: string }) => void;
    const socketFactory = jest.fn();
    const transcriber = new GoogleChirp3Transcriber({
      utteranceId: "trial",
      languageCode: "en-US",
      keyterms: [],
      targetKeytermBiasEnabled: false,
      webSocketFactory: socketFactory,
      credentialProvider: () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    const cancelled = expect(transcriber.connect()).rejects.toMatchObject({
      code: "closed",
    });
    await transcriber.close();
    resolve({ token: "ticket", websocketUrl: "wss://relay.run.app/v1/stream" });
    await cancelled;
    expect(socketFactory).not.toHaveBeenCalled();
  });

  it("does not complete from partials or segments before explicit finish", async () => {
    const h = create();
    await h.ready();
    const events: TranscriberEvent[] = [];
    h.transcriber.subscribe((event) => events.push(event));
    h.transcriber.beginUtterance("trial");
    h.socket.message({
      type: "partial",
      utteranceId: "trial",
      text: "cat dog fish",
    });
    h.socket.message({
      type: "segment",
      utteranceId: "trial",
      text: "cat dog fish",
    });
    expect(
      events.some(
        (event) => event.type === "commit" && event.finalAcknowledgement,
      ),
    ).toBe(false);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "partial", settled: false }),
        expect.objectContaining({
          type: "commit",
          finalAcknowledgement: false,
        }),
      ]),
    );
    await h.transcriber.close();
  });

  it("acknowledges healthy empty output only after finish", async () => {
    const h = create();
    await h.ready();
    const session = new SpeechSession(h.transcriber, {
      externallyControlledEnd: true,
      maximumUtteranceDurationMs: 20000,
    });
    await session.connect();
    const result = session.beginUtterance("trial");
    session.requestCommit();
    h.socket.message({ type: "complete", utteranceId: "trial" });
    await expect(result).resolves.toMatchObject({
      text: "",
      committedSegments: [],
    });
    await session.close();
  });

  it("rejects late output from another trial instead of registering it", async () => {
    const h = create();
    await h.ready();
    h.transcriber.beginUtterance("trial");
    h.socket.message({
      type: "segment",
      utteranceId: "previous-trial",
      text: "cat",
    });
    expect(h.transcriber.state).toBe("failed");
    await h.transcriber.close();
  });

  it("rejects a response acknowledging completion before finish", async () => {
    const h = create();
    await h.ready();
    h.transcriber.beginUtterance("trial");
    h.socket.message({ type: "complete", utteranceId: "trial" });
    expect(h.transcriber.state).toBe("failed");
    await h.transcriber.close();
  });
});
