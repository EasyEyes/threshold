import {
  TRANSCRIPTION_PCM_SAMPLE_RATE,
  type PcmAudioChunk,
} from "./audioCapture";

export { TRANSCRIPTION_PCM_SAMPLE_RATE, type PcmAudioChunk };

export type TranscriberState =
  | "idle"
  | "connecting"
  | "ready"
  | "closed"
  | "failed";

export type TranscriberErrorCode =
  | "unsupported"
  | "invalidConfiguration"
  | "credentialFailure"
  | "connectionFailure"
  | "connectionTimeout"
  | "notConnected"
  | "utteranceConflict"
  | "noActiveUtterance"
  | "invalidAudio"
  | "authenticationFailure"
  | "quotaExceeded"
  | "rateLimited"
  | "termsNotAccepted"
  | "providerUnavailable"
  | "sessionLimit"
  | "inputRejected"
  | "closed"
  | "unexpected";

export class TranscriberError extends Error {
  readonly code: TranscriberErrorCode;
  readonly retryable: boolean;
  readonly originalError?: unknown;

  constructor(
    code: TranscriberErrorCode,
    message: string,
    options: { retryable?: boolean; originalError?: unknown } = {},
  ) {
    super(message);
    this.name = "TranscriberError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.originalError = options.originalError;
  }
}

export interface TranscriberConnectionInfo {
  readonly provider: string;
  readonly model: string;
  readonly sessionId: string;
  readonly languageCode: string;
  readonly sampleRate: typeof TRANSCRIPTION_PCM_SAMPLE_RATE;
}

export interface TranscriberPartialEvent {
  readonly type: "partial";
  readonly utteranceId: string;
  readonly text: string;
  readonly settled: boolean;
  readonly receivedAtMs: number;
}

export interface TranscriberCommitEvent {
  readonly type: "commit";
  readonly utteranceId: string;
  readonly text: string;
  readonly receivedAtMs: number;
}

export interface TranscriberErrorEvent {
  readonly type: "error";
  readonly utteranceId?: string;
  readonly error: TranscriberError;
  readonly receivedAtMs: number;
}

export interface TranscriberClosedEvent {
  readonly type: "closed";
  readonly expected: boolean;
  readonly receivedAtMs: number;
}

export type TranscriberEvent =
  | TranscriberPartialEvent
  | TranscriberCommitEvent
  | TranscriberErrorEvent
  | TranscriberClosedEvent;

export type TranscriberListener = (event: TranscriberEvent) => void;

/**
 * Provider-neutral boundary for one realtime transcription connection.
 * A connection may contain sequential utterances, but never more than one
 * active utterance. Provider commits are exposed separately so a task can
 * retain early endpointed text without ending its application-level response.
 */
export interface StreamingTranscriber {
  readonly state: TranscriberState;
  readonly connectionInfo?: TranscriberConnectionInfo;
  connect(): Promise<TranscriberConnectionInfo>;
  beginUtterance(utteranceId: string): void;
  sendAudio(utteranceId: string, chunk: PcmAudioChunk): void;
  requestCommit(utteranceId: string): void;
  endUtterance(utteranceId: string): void;
  cancelUtterance(utteranceId: string): void;
  subscribe(listener: TranscriberListener): () => void;
  close(): Promise<void>;
}
