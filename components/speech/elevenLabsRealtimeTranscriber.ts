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

const ELEVENLABS_PROVIDER = "elevenlabs";
const DEFAULT_MODEL = "scribe_v2_realtime";
const DEFAULT_BASE_URL = "wss://api.elevenlabs.io/v1/speech-to-text/realtime";
const DEFAULT_CONNECT_TIMEOUT_MS = 8000;
const MAX_REALTIME_KEYTERMS = 50;
const MAX_REALTIME_KEYTERM_LENGTH = 20;
const DEFAULT_NO_VERBATIM = true;
const WEBSOCKET_OPEN = 1;
const WEBSOCKET_CLOSED = 3;

export interface ElevenLabsVadConfig {
  readonly silenceThresholdSecs: number;
  readonly threshold: number;
  readonly minimumSpeechDurationMs: number;
  readonly minimumSilenceDurationMs: number;
}

export const DEFAULT_ELEVENLABS_VAD_CONFIG: ElevenLabsVadConfig = {
  silenceThresholdSecs: 0.5,
  threshold: 0.4,
  minimumSpeechDurationMs: 100,
  minimumSilenceDurationMs: 100,
};

export type ElevenLabsTokenProvider = () => Promise<string>;

export interface WebSocketMessageEventLike {
  readonly data: unknown;
}

export interface WebSocketCloseEventLike {
  readonly code?: number;
  readonly reason?: string;
}

export interface WebSocketLike {
  readonly readyState: number;
  addEventListener(
    type: "message",
    listener: (event: WebSocketMessageEventLike) => void,
  ): void;
  addEventListener(type: "error", listener: (event: unknown) => void): void;
  addEventListener(
    type: "close",
    listener: (event: WebSocketCloseEventLike) => void,
  ): void;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

export interface ElevenLabsRealtimeTranscriberOptions {
  readonly tokenProvider: ElevenLabsTokenProvider;
  readonly languageCode: string;
  readonly keyterms?: readonly string[];
  readonly targetKeytermBiasEnabled: boolean;
  readonly noVerbatim?: boolean;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly vad?: Partial<ElevenLabsVadConfig>;
  readonly connectTimeoutMs?: number;
  readonly filterBackgroundAudio?: boolean;
  readonly webSocketFactory?: WebSocketFactory;
  readonly now?: () => number;
}

export type TokenProviderOptions = SpeechTokenProviderOptions;

interface ProviderMessage {
  readonly message_type?: unknown;
  readonly session_id?: unknown;
  readonly text?: unknown;
  readonly error?: unknown;
}

const defaultWebSocketFactory: WebSocketFactory = (url) => {
  if (typeof WebSocket === "undefined") {
    throw new TranscriberError(
      "unsupported",
      "Realtime transcription is unavailable in this browser.",
    );
  }
  return new WebSocket(url);
};

const finiteInRange = (
  value: number,
  minimum: number,
  maximum: number,
  name: string,
): void => {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TranscriberError(
      "invalidConfiguration",
      `${name} must be between ${minimum} and ${maximum}.`,
    );
  }
};

const validateLanguageCode = (languageCode: string): string => {
  const trimmed = languageCode.trim().toLowerCase();
  if (!/^[a-z]{2,3}$/.test(trimmed)) {
    throw new TranscriberError(
      "invalidConfiguration",
      "ElevenLabs languageCode must be an ISO-639-1 or ISO-639-3 code.",
    );
  }
  return trimmed;
};

export const normalizeElevenLabsKeyterms = (
  keyterms: readonly string[] = [],
): string[] => {
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const keyterm of keyterms) {
    const value = keyterm.trim();
    if (!value) {
      throw new TranscriberError(
        "invalidConfiguration",
        "ElevenLabs keyterms cannot be empty.",
      );
    }
    if ([...value].length > MAX_REALTIME_KEYTERM_LENGTH) {
      throw new TranscriberError(
        "invalidConfiguration",
        `Realtime keyterms cannot exceed ${MAX_REALTIME_KEYTERM_LENGTH} characters.`,
      );
    }
    if (!seen.has(value)) {
      seen.add(value);
      unique.push(value);
    }
  }

  if (unique.length > MAX_REALTIME_KEYTERMS) {
    throw new TranscriberError(
      "invalidConfiguration",
      `Realtime transcription accepts at most ${MAX_REALTIME_KEYTERMS} keyterms.`,
    );
  }
  return unique;
};

const resolveVadConfig = (
  overrides: Partial<ElevenLabsVadConfig> = {},
): ElevenLabsVadConfig => {
  const vad = { ...DEFAULT_ELEVENLABS_VAD_CONFIG, ...overrides };
  finiteInRange(vad.silenceThresholdSecs, 0.3, 3, "silenceThresholdSecs");
  finiteInRange(vad.threshold, 0.1, 0.9, "vadThreshold");
  finiteInRange(
    vad.minimumSpeechDurationMs,
    50,
    2000,
    "minimumSpeechDurationMs",
  );
  finiteInRange(
    vad.minimumSilenceDurationMs,
    50,
    2000,
    "minimumSilenceDurationMs",
  );
  return vad;
};

export const buildElevenLabsRealtimeUrl = (
  token: string,
  options: Omit<ElevenLabsRealtimeTranscriberOptions, "tokenProvider">,
): string => {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new TranscriberError(
      "credentialFailure",
      "The realtime transcription credential was empty.",
      { retryable: true },
    );
  }

  const model = options.model?.trim() || DEFAULT_MODEL;
  const languageCode = validateLanguageCode(options.languageCode);
  if (typeof options.targetKeytermBiasEnabled !== "boolean") {
    throw new TranscriberError(
      "invalidConfiguration",
      "The ElevenLabs keyterm policy must be explicit.",
    );
  }
  if (
    options.noVerbatim !== undefined &&
    typeof options.noVerbatim !== "boolean"
  ) {
    throw new TranscriberError(
      "invalidConfiguration",
      "The ElevenLabs verbatim policy must be a boolean when provided.",
    );
  }
  const keyterms = !options.targetKeytermBiasEnabled
    ? []
    : normalizeElevenLabsKeyterms(options.keyterms);
  const vad = resolveVadConfig(options.vad);
  const url = new URL(options.baseUrl ?? DEFAULT_BASE_URL);

  url.searchParams.set("token", trimmedToken);
  url.searchParams.set("model_id", model);
  url.searchParams.set("audio_format", "pcm_16000");
  url.searchParams.set("language_code", languageCode);
  url.searchParams.set("commit_strategy", "vad");
  url.searchParams.set(
    "vad_silence_threshold_secs",
    String(vad.silenceThresholdSecs),
  );
  url.searchParams.set("vad_threshold", String(vad.threshold));
  url.searchParams.set(
    "min_speech_duration_ms",
    String(vad.minimumSpeechDurationMs),
  );
  url.searchParams.set(
    "min_silence_duration_ms",
    String(vad.minimumSilenceDurationMs),
  );
  url.searchParams.set(
    "no_verbatim",
    String(options.noVerbatim ?? DEFAULT_NO_VERBATIM),
  );
  url.searchParams.set("include_timestamps", "false");
  url.searchParams.set("enable_logging", "false");
  if (options.filterBackgroundAudio !== undefined) {
    url.searchParams.set(
      "filter_background_audio",
      String(options.filterBackgroundAudio),
    );
  }
  for (const keyterm of keyterms) url.searchParams.append("keyterms", keyterm);

  return url.toString();
};

export const createElevenLabsTokenProvider = (
  options: TokenProviderOptions,
): ElevenLabsTokenProvider =>
  createSpeechTokenProvider(ELEVENLABS_PROVIDER, options);

const pcm16ToBase64 = (samples: Int16Array): string => {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < samples.length; index += 1) {
    view.setInt16(index * 2, samples[index], true);
  }

  let binary = "";
  const batchSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += batchSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + batchSize),
    );
  }
  return globalThis.btoa(binary);
};

const providerError = (messageType: string): TranscriberError => {
  switch (messageType) {
    case "auth_error":
      return new TranscriberError(
        "authenticationFailure",
        "ElevenLabs rejected the realtime credential.",
      );
    case "quota_exceeded":
      return new TranscriberError(
        "quotaExceeded",
        "The ElevenLabs transcription quota was exceeded.",
      );
    case "rate_limited":
    case "commit_throttled":
      return new TranscriberError(
        "rateLimited",
        "ElevenLabs rate-limited the transcription session.",
        { retryable: true },
      );
    case "unaccepted_terms":
      return new TranscriberError(
        "termsNotAccepted",
        "The ElevenLabs Scribe terms have not been accepted.",
      );
    case "session_time_limit_exceeded":
      return new TranscriberError(
        "sessionLimit",
        "The ElevenLabs realtime session reached its time limit.",
        { retryable: true },
      );
    case "input_error":
    case "invalid_request":
    case "chunk_size_exceeded":
      return new TranscriberError(
        "inputRejected",
        "ElevenLabs rejected the realtime audio input.",
      );
    case "queue_overflow":
    case "resource_exhausted":
    case "insufficient_audio_activity":
      return new TranscriberError(
        "providerUnavailable",
        "ElevenLabs could not continue the realtime session.",
        { retryable: true },
      );
    default:
      return new TranscriberError(
        "providerUnavailable",
        "ElevenLabs reported a transcription error.",
        { retryable: true },
      );
  }
};

export class ElevenLabsRealtimeTranscriber implements StreamingTranscriber {
  private readonly options: ElevenLabsRealtimeTranscriberOptions;
  private readonly webSocketFactory: WebSocketFactory;
  private readonly now: () => number;
  private readonly listeners = new Set<TranscriberListener>();
  private stateValue: TranscriberState = "idle";
  private socket?: WebSocketLike;
  private activeUtteranceId?: string;
  private info?: TranscriberConnectionInfo;
  private connectPromise?: Promise<TranscriberConnectionInfo>;
  private closeExpected = false;
  private closedEventSent = false;
  private connectTimeoutId?: ReturnType<typeof globalThis.setTimeout>;
  private resolveConnect?: (info: TranscriberConnectionInfo) => void;
  private rejectConnect?: (error: TranscriberError) => void;

  constructor(options: ElevenLabsRealtimeTranscriberOptions) {
    if (!options || typeof options.tokenProvider !== "function") {
      throw new TranscriberError(
        "invalidConfiguration",
        "An ElevenLabs token provider is required.",
      );
    }
    const connectTimeoutMs =
      options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
    if (!Number.isFinite(connectTimeoutMs) || connectTimeoutMs <= 0) {
      throw new TranscriberError(
        "invalidConfiguration",
        "Connection timeout must be a finite positive number.",
      );
    }

    validateLanguageCode(options.languageCode);
    if (options.targetKeytermBiasEnabled) {
      normalizeElevenLabsKeyterms(options.keyterms);
    }
    resolveVadConfig(options.vad);
    this.options = { ...options, connectTimeoutMs };
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
          "The realtime transcription connection cannot be started again.",
        ),
      );
    }

    this.stateValue = "connecting";
    this.connectPromise = this.performConnect();
    return this.connectPromise;
  }

  beginUtterance(utteranceId: string): void {
    this.assertReady();
    const normalizedId = utteranceId.trim();
    if (!normalizedId) {
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
    this.activeUtteranceId = normalizedId;
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

    this.send({
      message_type: "input_audio_chunk",
      audio_base_64: pcm16ToBase64(chunk.samples),
      sample_rate: TRANSCRIPTION_PCM_SAMPLE_RATE,
    });
  }

  requestCommit(utteranceId: string): void {
    this.assertActiveUtterance(utteranceId);
    this.send({
      message_type: "input_audio_chunk",
      audio_base_64: "",
      commit: true,
      sample_rate: TRANSCRIPTION_PCM_SAMPLE_RATE,
    });
  }

  endUtterance(utteranceId: string): void {
    this.assertActiveUtterance(utteranceId);
    this.activeUtteranceId = undefined;
  }

  cancelUtterance(utteranceId: string): void {
    this.assertActiveUtterance(utteranceId);
    this.activeUtteranceId = undefined;
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
    const closeError = new TranscriberError(
      "closed",
      "The realtime transcription connection was closed.",
    );
    this.rejectConnect?.(closeError);
    this.resolveConnect = undefined;
    this.rejectConnect = undefined;

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
      token = await this.options.tokenProvider();
    } catch (error) {
      const mapped =
        error instanceof TranscriberError
          ? error
          : new TranscriberError(
              "credentialFailure",
              "The realtime transcription credential request failed.",
              { retryable: true, originalError: error },
            );
      this.fail(mapped);
      throw mapped;
    }

    if (this.stateValue !== "connecting") {
      throw new TranscriberError(
        "closed",
        "The realtime transcription connection was cancelled.",
      );
    }

    const url = buildElevenLabsRealtimeUrl(token, this.options);
    try {
      this.socket = this.webSocketFactory(url);
    } catch (error) {
      const mapped =
        error instanceof TranscriberError
          ? error
          : new TranscriberError(
              "connectionFailure",
              "The ElevenLabs realtime connection could not be created.",
              { retryable: true, originalError: error },
            );
      this.fail(mapped);
      throw mapped;
    }

    this.socket.addEventListener("message", this.handleMessage);
    this.socket.addEventListener("error", this.handleSocketError);
    this.socket.addEventListener("close", this.handleSocketClose);

    return new Promise<TranscriberConnectionInfo>((resolve, reject) => {
      this.resolveConnect = resolve;
      this.rejectConnect = reject;
      this.connectTimeoutId = globalThis.setTimeout(() => {
        const error = new TranscriberError(
          "connectionTimeout",
          "The ElevenLabs realtime connection did not become ready in time.",
          { retryable: true },
        );
        this.fail(error);
        this.socket?.close(1000, "connection-timeout");
      }, this.options.connectTimeoutMs);
    });
  }

  private readonly handleMessage = (event: WebSocketMessageEventLike): void => {
    if (typeof event.data !== "string") {
      this.handleProviderFailure(
        new TranscriberError(
          "inputRejected",
          "ElevenLabs returned an unsupported realtime message.",
        ),
      );
      return;
    }

    let message: ProviderMessage;
    try {
      message = JSON.parse(event.data) as ProviderMessage;
    } catch (error) {
      this.handleProviderFailure(
        new TranscriberError(
          "providerUnavailable",
          "ElevenLabs returned malformed realtime data.",
          { retryable: true, originalError: error },
        ),
      );
      return;
    }

    if (typeof message.message_type !== "string") return;
    const receivedAtMs = this.now();

    switch (message.message_type) {
      case "session_started": {
        if (
          this.stateValue !== "connecting" ||
          typeof message.session_id !== "string"
        ) {
          return;
        }
        this.info = {
          provider: ELEVENLABS_PROVIDER,
          model: this.options.model?.trim() || DEFAULT_MODEL,
          sessionId: message.session_id,
          languageCode: validateLanguageCode(this.options.languageCode),
          sampleRate: TRANSCRIPTION_PCM_SAMPLE_RATE,
        };
        this.stateValue = "ready";
        this.clearConnectTimeout();
        this.resolveConnect?.(this.info);
        this.resolveConnect = undefined;
        this.rejectConnect = undefined;
        break;
      }
      case "partial_transcript":
      case "final_transcript": {
        if (!this.activeUtteranceId || typeof message.text !== "string") return;
        this.emit({
          type: "partial",
          utteranceId: this.activeUtteranceId,
          text: message.text,
          settled: message.message_type === "final_transcript",
          receivedAtMs,
        });
        break;
      }
      case "committed_transcript": {
        if (!this.activeUtteranceId || typeof message.text !== "string") return;
        this.emit({
          type: "commit",
          utteranceId: this.activeUtteranceId,
          text: message.text,
          receivedAtMs,
        });
        break;
      }
      case "committed_transcript_with_timestamps":
      case "final_transcript_with_timestamps":
      case "committed_transcript_entities":
        // These optional delayed messages do not define the utterance boundary.
        break;
      default:
        if (message.message_type.endsWith("error")) {
          this.handleProviderFailure(providerError(message.message_type));
        } else if (
          [
            "rate_limited",
            "commit_throttled",
            "quota_exceeded",
            "unaccepted_terms",
            "queue_overflow",
            "resource_exhausted",
            "session_time_limit_exceeded",
            "chunk_size_exceeded",
            "insufficient_audio_activity",
            "invalid_request",
          ].includes(message.message_type)
        ) {
          this.handleProviderFailure(providerError(message.message_type));
        }
    }
  };

  private readonly handleSocketError = (event: unknown): void => {
    this.handleProviderFailure(
      new TranscriberError(
        "connectionFailure",
        "The ElevenLabs realtime connection failed.",
        { retryable: true, originalError: event },
      ),
    );
  };

  private readonly handleSocketClose = (
    event: WebSocketCloseEventLike,
  ): void => {
    const expected = this.closeExpected || this.stateValue === "closed";
    if (!expected && this.stateValue !== "failed") {
      this.handleProviderFailure(
        new TranscriberError(
          "connectionFailure",
          `The ElevenLabs realtime connection closed unexpectedly${
            event.code ? ` (code ${event.code})` : ""
          }.`,
          { retryable: true },
        ),
      );
    }
    this.stateValue = expected ? "closed" : this.stateValue;
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
        "The realtime transcriber is not ready.",
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
    if (utteranceId !== this.activeUtteranceId) {
      throw new TranscriberError(
        "utteranceConflict",
        "Audio was sent for a stale transcription utterance.",
      );
    }
  }

  private send(payload: Record<string, unknown>): void {
    this.assertReady();
    try {
      this.socket?.send(JSON.stringify(payload));
    } catch (error) {
      throw new TranscriberError(
        "connectionFailure",
        "Realtime audio could not be sent to ElevenLabs.",
        { retryable: true, originalError: error },
      );
    }
  }

  private handleProviderFailure(error: TranscriberError): void {
    if (this.stateValue === "closed" || this.stateValue === "failed") return;
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
