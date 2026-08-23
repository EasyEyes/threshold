import {
  TRANSCRIPTION_PCM_SAMPLE_RATE,
  TranscriberError,
  type PcmAudioChunk,
  type StreamingTranscriber,
  type TranscriberConnectionInfo,
  type TranscriberEvent,
  type TranscriberListener,
  type TranscriberState,
} from "./transcriber";
import {
  createSpeechTokenProvider,
  type SpeechTokenProviderOptions,
} from "./speechToken";

const PROVIDER = "deepgram";
const DEFAULT_MODEL = "nova-3";
const DEFAULT_BASE_URL = "wss://api.deepgram.com/v1/listen";
const DEFAULT_CONNECT_TIMEOUT_MS = 8000;
const WEBSOCKET_OPEN = 1;
const WEBSOCKET_CLOSED = 3;

export type DeepgramTokenProvider = () => Promise<string>;

interface DeepgramAlternative {
  readonly transcript?: unknown;
}

interface DeepgramMessage {
  readonly type?: unknown;
  readonly is_final?: unknown;
  readonly speech_final?: unknown;
  readonly from_finalize?: unknown;
  readonly request_id?: unknown;
  readonly channel?: { readonly alternatives?: readonly DeepgramAlternative[] };
  readonly err_code?: unknown;
  readonly err_msg?: unknown;
}

export interface DeepgramWebSocketLike {
  readonly readyState: number;
  addEventListener(type: "open", listener: () => void): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  addEventListener(type: "error", listener: (event: unknown) => void): void;
  addEventListener(type: "close", listener: (event: CloseEvent) => void): void;
  send(data: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
}

export type DeepgramWebSocketFactory = (
  url: string,
  protocols: readonly string[],
) => DeepgramWebSocketLike;

export interface DeepgramRealtimeTranscriberOptions {
  readonly tokenProvider: DeepgramTokenProvider;
  readonly languageCode: string;
  readonly keyterms?: readonly string[];
  readonly targetKeytermBiasEnabled: boolean;
  readonly endpointingMs: number;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly connectTimeoutMs?: number;
  readonly webSocketFactory?: DeepgramWebSocketFactory;
  readonly now?: () => number;
}

export type DeepgramTokenProviderOptions = SpeechTokenProviderOptions;

const validateLanguageCode = (languageCode: string): string => {
  const value = languageCode.trim();
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value)) {
    throw new TranscriberError(
      "invalidConfiguration",
      "Deepgram languageCode must be a valid language or locale code.",
    );
  }
  return value;
};

const normalizeKeyterms = (keyterms: readonly string[] = []): string[] => {
  const values = [...new Set(keyterms.map((value) => value.trim()))];
  if (values.some((value) => !value)) {
    throw new TranscriberError(
      "invalidConfiguration",
      "Deepgram keyterms cannot be empty.",
    );
  }
  return values;
};

export const buildDeepgramRealtimeUrl = (
  options: Omit<DeepgramRealtimeTranscriberOptions, "tokenProvider">,
): string => {
  if (!Number.isFinite(options.endpointingMs) || options.endpointingMs < 10) {
    throw new TranscriberError(
      "invalidConfiguration",
      "Deepgram endpointingMs must be at least 10 milliseconds.",
    );
  }
  const url = new URL(options.baseUrl ?? DEFAULT_BASE_URL);
  url.searchParams.set("model", options.model?.trim() || DEFAULT_MODEL);
  url.searchParams.set("language", validateLanguageCode(options.languageCode));
  url.searchParams.set("encoding", "linear16");
  url.searchParams.set("sample_rate", String(TRANSCRIPTION_PCM_SAMPLE_RATE));
  url.searchParams.set("channels", "1");
  url.searchParams.set("interim_results", "true");
  url.searchParams.set("endpointing", String(options.endpointingMs));
  url.searchParams.set("mip_opt_out", "true");
  if (options.targetKeytermBiasEnabled) {
    for (const keyterm of normalizeKeyterms(options.keyterms)) {
      url.searchParams.append("keyterm", keyterm);
    }
  }
  return url.toString();
};

export const createDeepgramTokenProvider = (
  options: DeepgramTokenProviderOptions,
): DeepgramTokenProvider => createSpeechTokenProvider(PROVIDER, options);

const defaultWebSocketFactory: DeepgramWebSocketFactory = (url, protocols) => {
  if (typeof WebSocket === "undefined") {
    throw new TranscriberError(
      "unsupported",
      "Realtime transcription is unavailable in this browser.",
    );
  }
  return new WebSocket(url, [...protocols]);
};

const pcm16LittleEndianBuffer = (samples: Int16Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  for (let index = 0; index < samples.length; index += 1) {
    view.setInt16(index * 2, samples[index], true);
  }
  return buffer;
};

export class DeepgramRealtimeTranscriber implements StreamingTranscriber {
  private readonly options: DeepgramRealtimeTranscriberOptions;
  private readonly webSocketFactory: DeepgramWebSocketFactory;
  private readonly now: () => number;
  private readonly listeners = new Set<TranscriberListener>();
  private stateValue: TranscriberState = "idle";
  private socket?: DeepgramWebSocketLike;
  private info?: TranscriberConnectionInfo;
  private activeUtteranceId?: string;
  private committedParts: string[] = [];
  private connectPromise?: Promise<TranscriberConnectionInfo>;
  private resolveConnect?: (info: TranscriberConnectionInfo) => void;
  private rejectConnect?: (error: TranscriberError) => void;
  private connectTimeoutId?: ReturnType<typeof globalThis.setTimeout>;
  private closeExpected = false;
  private closedEventSent = false;

  constructor(options: DeepgramRealtimeTranscriberOptions) {
    if (!options || typeof options.tokenProvider !== "function") {
      throw new TranscriberError(
        "invalidConfiguration",
        "A Deepgram token provider is required.",
      );
    }
    validateLanguageCode(options.languageCode);
    buildDeepgramRealtimeUrl(options);
    const timeout = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
    if (!Number.isFinite(timeout) || timeout <= 0) {
      throw new TranscriberError(
        "invalidConfiguration",
        "Connection timeout must be a finite positive number.",
      );
    }
    this.options = { ...options, connectTimeoutMs: timeout };
    this.webSocketFactory = options.webSocketFactory ?? defaultWebSocketFactory;
    this.now = options.now ?? (() => performance.now());
  }

  get state(): TranscriberState {
    return this.stateValue;
  }

  get connectionInfo(): TranscriberConnectionInfo | undefined {
    return this.info;
  }

  connect(): Promise<TranscriberConnectionInfo> {
    if (this.connectPromise) return this.connectPromise;
    if (this.stateValue !== "idle") {
      return Promise.reject(
        new TranscriberError(
          this.stateValue === "closed" ? "closed" : "connectionFailure",
          "The Deepgram connection cannot be started again.",
        ),
      );
    }
    this.stateValue = "connecting";
    this.connectPromise = this.performConnect();
    return this.connectPromise;
  }

  beginUtterance(utteranceId: string): void {
    this.assertReady();
    const id = utteranceId.trim();
    if (!id) {
      throw new TranscriberError(
        "invalidConfiguration",
        "A non-empty utterance identifier is required.",
      );
    }
    if (this.activeUtteranceId) {
      throw new TranscriberError(
        "utteranceConflict",
        "A transcription utterance is already active.",
      );
    }
    this.activeUtteranceId = id;
    this.committedParts = [];
  }

  sendAudio(utteranceId: string, chunk: PcmAudioChunk): void {
    this.assertActiveUtterance(utteranceId);
    if (
      chunk.sampleRate !== TRANSCRIPTION_PCM_SAMPLE_RATE ||
      !(chunk.samples instanceof Int16Array) ||
      chunk.samples.length === 0
    ) {
      throw new TranscriberError(
        "invalidAudio",
        "Realtime audio must be non-empty 16-bit PCM at 16 kHz.",
      );
    }
    this.socket?.send(pcm16LittleEndianBuffer(chunk.samples));
  }

  requestCommit(utteranceId: string): void {
    this.assertActiveUtterance(utteranceId);
    this.socket?.send(JSON.stringify({ type: "Finalize" }));
  }

  endUtterance(utteranceId: string): void {
    this.assertActiveUtterance(utteranceId);
    this.activeUtteranceId = undefined;
    this.committedParts = [];
  }

  cancelUtterance(utteranceId: string): void {
    this.assertActiveUtterance(utteranceId);
    this.activeUtteranceId = undefined;
    this.committedParts = [];
    this.closeExpected = true;
    this.socket?.close(1000, "utterance-cancelled");
    this.stateValue = "closed";
  }

  subscribe(listener: TranscriberListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async close(): Promise<void> {
    if (this.stateValue === "closed") return;
    this.closeExpected = true;
    this.activeUtteranceId = undefined;
    this.clearConnectTimeout();
    this.rejectConnect?.(
      new TranscriberError(
        "closed",
        "The Deepgram transcription connection was closed.",
      ),
    );
    if (this.socket?.readyState === WEBSOCKET_OPEN) {
      this.socket.send(JSON.stringify({ type: "CloseStream" }));
    }
    if (this.socket && this.socket.readyState !== WEBSOCKET_CLOSED) {
      this.socket.close(1000, "client-close");
    }
    this.stateValue = "closed";
    this.emitClosed(true);
    this.listeners.clear();
  }

  private async performConnect(): Promise<TranscriberConnectionInfo> {
    let token: string;
    try {
      token = (await this.options.tokenProvider()).trim();
      if (!token) throw new Error("Empty token");
    } catch (error) {
      const mapped =
        error instanceof TranscriberError
          ? error
          : new TranscriberError(
              "credentialFailure",
              "The Deepgram credential request failed.",
              { retryable: true, originalError: error },
            );
      this.fail(mapped);
      throw mapped;
    }

    if (this.stateValue !== "connecting") {
      throw new TranscriberError(
        "closed",
        "The Deepgram transcription connection was cancelled.",
      );
    }

    const url = buildDeepgramRealtimeUrl(this.options);
    try {
      this.socket = this.webSocketFactory(url, ["bearer", token]);
    } catch (error) {
      const mapped = new TranscriberError(
        "connectionFailure",
        "The Deepgram realtime connection could not be created.",
        { retryable: true, originalError: error },
      );
      this.fail(mapped);
      throw mapped;
    }
    this.socket.addEventListener("open", this.handleOpen);
    this.socket.addEventListener("message", this.handleMessage);
    this.socket.addEventListener("error", this.handleSocketError);
    this.socket.addEventListener("close", this.handleSocketClose);

    return new Promise((resolve, reject) => {
      this.resolveConnect = resolve;
      this.rejectConnect = reject;
      this.connectTimeoutId = globalThis.setTimeout(() => {
        const error = new TranscriberError(
          "connectionTimeout",
          "The Deepgram realtime connection did not open in time.",
          { retryable: true },
        );
        this.fail(error);
        this.socket?.close(1000, "connection-timeout");
      }, this.options.connectTimeoutMs);
    });
  }

  private readonly handleOpen = (): void => {
    if (this.stateValue !== "connecting") return;
    this.info = {
      provider: PROVIDER,
      model: this.options.model?.trim() || DEFAULT_MODEL,
      sessionId: "pending-metadata",
      languageCode: validateLanguageCode(this.options.languageCode),
      sampleRate: TRANSCRIPTION_PCM_SAMPLE_RATE,
    };
    this.stateValue = "ready";
    this.clearConnectTimeout();
    this.resolveConnect?.(this.info);
    this.resolveConnect = undefined;
    this.rejectConnect = undefined;
  };

  private readonly handleMessage = (event: MessageEvent<unknown>): void => {
    if (typeof event.data !== "string") return;
    let message: DeepgramMessage;
    try {
      message = JSON.parse(event.data) as DeepgramMessage;
    } catch (error) {
      this.handleFailure(
        new TranscriberError(
          "providerUnavailable",
          "Deepgram returned malformed realtime data.",
          { retryable: true, originalError: error },
        ),
      );
      return;
    }

    if (message.type === "Metadata" && typeof message.request_id === "string") {
      if (this.info)
        this.info = { ...this.info, sessionId: message.request_id };
      return;
    }
    if (message.type === "Error") {
      this.handleFailure(
        new TranscriberError(
          message.err_code === "INVALID_AUTH"
            ? "authenticationFailure"
            : "providerUnavailable",
          "Deepgram reported a transcription error.",
          { retryable: message.err_code !== "INVALID_AUTH" },
        ),
      );
      return;
    }
    if (message.type !== "Results" || !this.activeUtteranceId) return;

    const text = message.channel?.alternatives?.[0]?.transcript;
    if (typeof text !== "string") return;
    const receivedAtMs = this.now();
    if (message.is_final === true && text.trim()) {
      this.committedParts.push(text.trim());
    }
    const accumulated = [...this.committedParts];
    if (message.is_final !== true && text.trim()) accumulated.push(text.trim());
    const transcript = accumulated.join(" ").trim();

    if (message.speech_final === true || message.from_finalize === true) {
      this.committedParts = [];
      this.emit({
        type: "commit",
        utteranceId: this.activeUtteranceId,
        text: transcript,
        receivedAtMs,
      });
    } else {
      this.emit({
        type: "partial",
        utteranceId: this.activeUtteranceId,
        text: transcript,
        settled: message.is_final === true,
        receivedAtMs,
      });
    }
  };

  private readonly handleSocketError = (event: unknown): void => {
    this.handleFailure(
      new TranscriberError(
        "connectionFailure",
        "The Deepgram realtime connection failed.",
        { retryable: true, originalError: event },
      ),
    );
  };

  private readonly handleSocketClose = (event: CloseEvent): void => {
    const expected = this.closeExpected || this.stateValue === "closed";
    if (!expected && this.stateValue !== "failed") {
      this.handleFailure(
        new TranscriberError(
          "connectionFailure",
          `The Deepgram connection closed unexpectedly${
            event.code ? ` (code ${event.code})` : ""
          }.`,
          { retryable: true },
        ),
      );
    }
    this.emitClosed(expected);
  };

  private assertReady(): void {
    if (
      this.stateValue !== "ready" ||
      !this.socket ||
      this.socket.readyState !== WEBSOCKET_OPEN
    ) {
      throw new TranscriberError(
        this.stateValue === "closed" ? "closed" : "notConnected",
        "The Deepgram realtime transcriber is not ready.",
      );
    }
  }

  private assertActiveUtterance(utteranceId: string): void {
    this.assertReady();
    if (!this.activeUtteranceId) {
      throw new TranscriberError(
        "noActiveUtterance",
        "There is no active transcription utterance.",
      );
    }
    if (this.activeUtteranceId !== utteranceId) {
      throw new TranscriberError(
        "utteranceConflict",
        "Audio was sent for a stale transcription utterance.",
      );
    }
  }

  private handleFailure(error: TranscriberError): void {
    if (this.stateValue === "failed" || this.stateValue === "closed") return;
    this.fail(error);
    this.socket?.close(1011, "provider-error");
  }

  private fail(error: TranscriberError): void {
    this.stateValue = "failed";
    this.clearConnectTimeout();
    this.rejectConnect?.(error);
    this.resolveConnect = undefined;
    this.rejectConnect = undefined;
    this.emit({
      type: "error",
      utteranceId: this.activeUtteranceId,
      error,
      receivedAtMs: this.now(),
    });
    this.activeUtteranceId = undefined;
    this.committedParts = [];
  }

  private clearConnectTimeout(): void {
    if (this.connectTimeoutId !== undefined) {
      globalThis.clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = undefined;
    }
  }

  private emit(event: TranscriberEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // A consumer exception must not interrupt the provider connection.
      }
    }
  }

  private emitClosed(expected: boolean): void {
    if (this.closedEventSent) return;
    this.closedEventSent = true;
    this.emit({ type: "closed", expected, receivedAtMs: this.now() });
  }
}
