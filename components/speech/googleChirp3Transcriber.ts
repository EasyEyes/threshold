import {
  TranscriberError,
  TRANSCRIPTION_PCM_SAMPLE_RATE,
  type PcmAudioChunk,
  type StreamingTranscriber,
  type TranscriberConnectionInfo,
  type TranscriberEvent,
  type TranscriberListener,
  type TranscriberState,
  type TranscriberErrorCode,
} from "./transcriber";
import type { SpeechCredential } from "./speechToken";
import type {
  DeepgramWebSocketFactory,
  DeepgramWebSocketLike,
} from "./deepgramRealtimeTranscriber";

export interface GoogleChirp3TranscriberOptions {
  readonly credentialProvider: () => Promise<SpeechCredential>;
  readonly utteranceId: string;
  readonly languageCode: string;
  readonly keyterms: readonly string[];
  readonly targetKeytermBiasEnabled: boolean;
  readonly webSocketFactory?: DeepgramWebSocketFactory;
  readonly connectTimeoutMs?: number;
  readonly now?: () => number;
}

const errorCodes = new Set<TranscriberErrorCode>([
  "authenticationFailure",
  "invalidConfiguration",
  "invalidAudio",
  "quotaExceeded",
  "providerUnavailable",
  "connectionFailure",
  "sessionLimit",
]);

export class GoogleChirp3Transcriber implements StreamingTranscriber {
  private stateValue: TranscriberState = "idle";
  private info?: TranscriberConnectionInfo;
  private socket?: DeepgramWebSocketLike;
  private active = false;
  private finishing = false;
  private expectedClose = false;
  private readonly listeners = new Set<TranscriberListener>();
  private connectPromise?: Promise<TranscriberConnectionInfo>;
  private resolveConnect?: (info: TranscriberConnectionInfo) => void;
  private rejectConnect?: (error: TranscriberError) => void;
  private connectTimer?: ReturnType<typeof setTimeout>;
  private readonly now: () => number;

  constructor(private readonly options: GoogleChirp3TranscriberOptions) {
    if (
      !/^[\w-]{1,180}$/.test(options.utteranceId) ||
      !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(options.languageCode) ||
      typeof options.credentialProvider !== "function" ||
      typeof options.targetKeytermBiasEnabled !== "boolean" ||
      !Array.isArray(options.keyterms) ||
      options.keyterms.length > 1000 ||
      options.keyterms.some(
        (term) => typeof term !== "string" || !term.trim() || term.length > 100,
      ) ||
      options.keyterms.join("").length > 10000 ||
      !Number.isFinite(options.connectTimeoutMs ?? 12000) ||
      (options.connectTimeoutMs ?? 12000) <= 0
    )
      throw new TranscriberError(
        "invalidConfiguration",
        "Invalid Chirp 3 connection settings.",
      );
    this.options = { ...options, keyterms: [...options.keyterms] };
    this.now = options.now ?? (() => performance.now());
  }

  get state(): TranscriberState {
    return this.stateValue;
  }
  get connectionInfo(): TranscriberConnectionInfo | undefined {
    return this.info;
  }

  connect(): Promise<TranscriberConnectionInfo> {
    if (
      this.connectPromise &&
      (this.stateValue === "connecting" || this.stateValue === "ready")
    )
      return this.connectPromise;
    if (this.stateValue !== "idle")
      return Promise.reject(
        new TranscriberError("closed", "Chirp 3 is closed."),
      );
    this.stateValue = "connecting";
    this.connectPromise = new Promise((resolve, reject) => {
      this.resolveConnect = resolve;
      this.rejectConnect = reject;
    });
    this.connectTimer = setTimeout(
      () =>
        this.fail(
          new TranscriberError(
            "connectionTimeout",
            "Chirp 3 did not become ready in time.",
            { retryable: true },
          ),
        ),
      this.options.connectTimeoutMs ?? 12000,
    );
    void this.openSocket();
    return this.connectPromise;
  }

  private async openSocket(): Promise<void> {
    try {
      const credential = await this.options.credentialProvider();
      if (this.stateValue !== "connecting") return;
      if (!credential.token?.trim() || !credential.websocketUrl)
        throw new Error("Missing Chirp 3 credential.");
      const url = new URL(credential.websocketUrl);
      const local =
        url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (
        (url.protocol !== "wss:" && !(local && url.protocol === "ws:")) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/v1/stream"
      )
        throw new Error("Invalid Chirp 3 relay URL.");
      const factory =
        this.options.webSocketFactory ??
        ((address: string) => new WebSocket(address));
      this.socket = factory(url.toString(), []);
      this.socket.addEventListener("open", () => {
        if (this.stateValue !== "connecting") return;
        try {
          this.socket!.send(
            JSON.stringify({
              type: "start",
              protocolVersion: 1,
              token: credential.token,
              utteranceId: this.options.utteranceId,
              languageCode: this.options.languageCode,
              keyterms: this.options.targetKeytermBiasEnabled
                ? this.options.keyterms
                : [],
              useKeyterms: this.options.targetKeytermBiasEnabled,
            }),
          );
        } catch {
          this.fail(
            new TranscriberError("connectionFailure", "Chirp 3 setup failed.", {
              retryable: true,
            }),
          );
        }
      });
      this.socket.addEventListener("message", this.handleMessage);
      this.socket.addEventListener("error", () =>
        this.fail(
          new TranscriberError(
            "connectionFailure",
            "The Chirp 3 connection failed.",
            { retryable: true },
          ),
        ),
      );
      this.socket.addEventListener("close", () => {
        const expected = this.expectedClose;
        if (!expected)
          this.fail(
            new TranscriberError(
              "connectionFailure",
              "The Chirp 3 connection closed unexpectedly.",
              { retryable: true },
            ),
          );
        this.emit({ type: "closed", expected, receivedAtMs: this.now() });
      });
    } catch (error) {
      this.fail(
        error instanceof TranscriberError
          ? error
          : new TranscriberError(
              "credentialFailure",
              "Chirp 3 could not connect.",
              { retryable: true },
            ),
      );
    }
  }

  beginUtterance(id: string): void {
    this.assertReady();
    if (this.active || id !== this.options.utteranceId)
      throw new TranscriberError(
        "utteranceConflict",
        "Chirp 3 accepts only its prepared trial.",
      );
    this.active = true;
  }

  sendAudio(id: string, chunk: PcmAudioChunk): void {
    this.assertActive(id);
    if (
      this.finishing ||
      chunk.sampleRate !== TRANSCRIPTION_PCM_SAMPLE_RATE ||
      !(chunk.samples instanceof Int16Array) ||
      !chunk.samples.length ||
      chunk.samples.byteLength > 24000
    )
      throw new TranscriberError(
        "invalidAudio",
        "Chirp 3 requires 16 kHz PCM audio.",
      );
    if (
      ((this.socket as unknown as { bufferedAmount?: number }).bufferedAmount ??
        0) >
      256 * 1024
    )
      throw new TranscriberError(
        "connectionFailure",
        "The Chirp 3 audio connection is congested.",
        { retryable: true },
      );
    const buffer = new ArrayBuffer(chunk.samples.byteLength);
    const view = new DataView(buffer);
    chunk.samples.forEach((sample, index) =>
      view.setInt16(index * 2, sample, true),
    );
    this.socket!.send(buffer);
  }

  requestCommit(id: string): void {
    this.assertActive(id);
    if (this.finishing)
      throw new TranscriberError(
        "invalidAudio",
        "Chirp 3 is already finalizing.",
      );
    this.finishing = true;
    this.socket!.send(JSON.stringify({ type: "finish", utteranceId: id }));
  }
  endUtterance(id: string): void {
    if (!this.active || id !== this.options.utteranceId)
      throw new TranscriberError(
        "noActiveUtterance",
        "No matching Chirp 3 trial.",
      );
    this.active = false;
    this.expectedClose = true;
  }
  cancelUtterance(id: string): void {
    if (id !== this.options.utteranceId)
      throw new TranscriberError("utteranceConflict", "Stale Chirp 3 trial.");
    void this.close();
  }
  subscribe(listener: TranscriberListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  async close(): Promise<void> {
    if (this.stateValue === "closed") return;
    this.expectedClose = true;
    this.active = false;
    this.rejectConnect?.(new TranscriberError("closed", "Chirp 3 was closed."));
    this.clearConnect();
    this.stateValue = "closed";
    this.socket?.close(1000, "client-close");
    this.listeners.clear();
  }

  private readonly handleMessage = (event: MessageEvent<unknown>): void => {
    if (this.stateValue === "closed" || this.stateValue === "failed") return;
    try {
      if (typeof event.data !== "string")
        throw new Error("Non-text relay response.");
      const message = JSON.parse(event.data);
      if (message.type === "error") {
        const code: TranscriberErrorCode = errorCodes.has(message.code)
          ? message.code
          : "providerUnavailable";
        this.fail(
          new TranscriberError(code, "Chirp 3 transcription failed.", {
            retryable:
              code !== "invalidConfiguration" &&
              code !== "authenticationFailure",
          }),
        );
        return;
      }
      if (message.utteranceId !== this.options.utteranceId)
        throw new Error("Mismatched trial.");
      if (message.type === "ready" && this.stateValue === "connecting") {
        if (
          message.model !== "chirp_3" ||
          message.sampleRate !== 16000 ||
          message.languageCode !== this.options.languageCode
        )
          throw new Error("Unexpected Chirp 3 settings.");
        this.info = {
          provider: "chirp3",
          model: "chirp_3",
          sessionId: this.options.utteranceId,
          languageCode: message.languageCode,
          sampleRate: 16000,
        };
        this.stateValue = "ready";
        this.resolveConnect?.(this.info);
        this.clearConnect();
        return;
      }
      if (!this.active) throw new Error("No active trial.");
      const receivedAtMs = this.now();
      if (message.type === "complete" && this.finishing) {
        this.expectedClose = true;
        this.emit({
          type: "commit",
          utteranceId: this.options.utteranceId,
          text: "",
          receivedAtMs,
          finalAcknowledgement: true,
        });
      } else if (
        message.type === "segment" &&
        typeof message.text === "string"
      ) {
        this.emit({
          type: "commit",
          utteranceId: this.options.utteranceId,
          text: message.text,
          receivedAtMs,
          finalAcknowledgement: false,
        });
      } else if (
        message.type === "partial" &&
        typeof message.text === "string"
      ) {
        this.emit({
          type: "partial",
          utteranceId: this.options.utteranceId,
          text: message.text,
          receivedAtMs,
          settled: false,
        });
      } else throw new Error("Unexpected relay response.");
    } catch {
      this.fail(
        new TranscriberError(
          "providerUnavailable",
          "Invalid Chirp 3 response.",
          { retryable: true },
        ),
      );
    }
  };
  private assertReady(): void {
    if (this.stateValue !== "ready" || this.socket?.readyState !== 1)
      throw new TranscriberError("notConnected", "Chirp 3 is not ready.");
  }
  private assertActive(id: string): void {
    this.assertReady();
    if (!this.active || id !== this.options.utteranceId)
      throw new TranscriberError(
        "noActiveUtterance",
        "No matching Chirp 3 trial.",
      );
  }
  private clearConnect(): void {
    clearTimeout(this.connectTimer);
    this.connectTimer = undefined;
    this.resolveConnect = undefined;
    this.rejectConnect = undefined;
  }
  private fail(error: TranscriberError): void {
    if (this.stateValue === "failed" || this.stateValue === "closed") return;
    this.stateValue = "failed";
    this.rejectConnect?.(error);
    this.clearConnect();
    this.emit({
      type: "error",
      utteranceId: this.active ? this.options.utteranceId : undefined,
      error,
      receivedAtMs: this.now(),
    });
    if (this.socket && this.socket.readyState < 2) this.socket.close();
  }
  private emit(event: TranscriberEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        /* Observers cannot interrupt cleanup. */
      }
    }
  }
}
