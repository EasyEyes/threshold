import {
  TranscriberError,
  type PcmAudioChunk,
  type StreamingTranscriber,
  type TranscriberConnectionInfo,
  type TranscriberEvent,
} from "./transcriber";

export type SpeechSessionState =
  | "idle"
  | "connecting"
  | "ready"
  | "listening"
  | "finalizing"
  | "failed"
  | "closed";

export type SpeechSessionErrorCode =
  | "invalidState"
  | "invalidUtterance"
  | "utteranceCancelled"
  | "finalizationTimeout"
  | "transcriberFailure"
  | "closed";

export class SpeechSessionError extends Error {
  readonly code: SpeechSessionErrorCode;
  readonly retryable: boolean;
  readonly originalError?: unknown;

  constructor(
    code: SpeechSessionErrorCode,
    message: string,
    options: { retryable?: boolean; originalError?: unknown } = {},
  ) {
    super(message);
    this.name = "SpeechSessionError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.originalError = options.originalError;
  }
}

export type UtteranceFinalizationTrigger =
  | "providerVad"
  | "manual"
  | "maxDuration";

export interface SpeechCommittedSegment {
  readonly text: string;
  readonly receivedAtMs: number;
}

export interface SpeechUtteranceResult {
  readonly utteranceId: string;
  readonly text: string;
  readonly committedSegments: readonly SpeechCommittedSegment[];
  readonly startedAtMs: number;
  readonly completedAtMs: number;
  readonly durationMs: number;
  readonly finalizationTrigger: UtteranceFinalizationTrigger;
}

export interface SpeechSessionStateEvent {
  readonly type: "state";
  readonly state: SpeechSessionState;
  readonly utteranceId?: string;
}

export interface SpeechSessionPartialEvent {
  readonly type: "partial";
  readonly utteranceId: string;
  readonly text: string;
  readonly settled: boolean;
  readonly receivedAtMs: number;
}

export interface SpeechSessionFinalEvent {
  readonly type: "final";
  readonly result: SpeechUtteranceResult;
}

export interface SpeechSessionFailureEvent {
  readonly type: "error";
  readonly utteranceId?: string;
  readonly error: SpeechSessionError;
}

export type SpeechSessionEvent =
  | SpeechSessionStateEvent
  | SpeechSessionPartialEvent
  | SpeechSessionFinalEvent
  | SpeechSessionFailureEvent;

export type SpeechSessionListener = (event: SpeechSessionEvent) => void;

export interface SpeechSessionOptions {
  readonly maximumUtteranceDurationMs: number;
  readonly finalizationTimeoutMs?: number;
  readonly now?: () => number;
}

interface PendingUtterance {
  readonly id: string;
  readonly startedAtMs: number;
  readonly promise: Promise<SpeechUtteranceResult>;
  readonly resolve: (result: SpeechUtteranceResult) => void;
  readonly reject: (error: SpeechSessionError) => void;
  readonly committedSegments: SpeechCommittedSegment[];
  finalizationTrigger: UtteranceFinalizationTrigger;
  providerFinalizationAllowed: boolean;
}

const DEFAULT_FINALIZATION_TIMEOUT_MS = 3000;

const positiveDuration = (value: number, name: string): number => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite positive number.`);
  }
  return value;
};

const deferredUtterance = (
  id: string,
  startedAtMs: number,
): PendingUtterance => {
  let resolve!: (result: SpeechUtteranceResult) => void;
  let reject!: (error: SpeechSessionError) => void;
  const promise = new Promise<SpeechUtteranceResult>(
    (resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    },
  );
  return {
    id,
    startedAtMs,
    promise,
    resolve,
    reject,
    committedSegments: [],
    finalizationTrigger: "providerVad",
    providerFinalizationAllowed: false,
  };
};

const asSessionError = (error: unknown): SpeechSessionError => {
  if (error instanceof SpeechSessionError) return error;
  if (error instanceof TranscriberError) {
    return new SpeechSessionError(
      error.code === "closed" ? "closed" : "transcriberFailure",
      error.message,
      { retryable: error.retryable, originalError: error },
    );
  }
  return new SpeechSessionError(
    "transcriberFailure",
    "The realtime transcription session failed.",
    { retryable: true, originalError: error },
  );
};

/**
 * Owns the audio gate and one-at-a-time utterance lifecycle. Audio is
 * forwarded only while an utterance is listening; callbacks for stale
 * utterance identifiers are ignored.
 */
export class SpeechSession {
  private readonly transcriber: StreamingTranscriber;
  private readonly maximumUtteranceDurationMs: number;
  private readonly finalizationTimeoutMs: number;
  private readonly now: () => number;
  private readonly listeners = new Set<SpeechSessionListener>();
  private readonly unsubscribeTranscriber: () => void;
  private stateValue: SpeechSessionState = "idle";
  private info?: TranscriberConnectionInfo;
  private pending?: PendingUtterance;
  private maximumDurationTimer?: ReturnType<typeof globalThis.setTimeout>;
  private finalizationTimer?: ReturnType<typeof globalThis.setTimeout>;
  private closePromise?: Promise<void>;
  private expectedClose = false;

  constructor(
    transcriber: StreamingTranscriber,
    options: SpeechSessionOptions,
  ) {
    this.transcriber = transcriber;
    this.maximumUtteranceDurationMs = positiveDuration(
      options.maximumUtteranceDurationMs,
      "maximumUtteranceDurationMs",
    );
    this.finalizationTimeoutMs = positiveDuration(
      options.finalizationTimeoutMs ?? DEFAULT_FINALIZATION_TIMEOUT_MS,
      "finalizationTimeoutMs",
    );
    this.now = options.now ?? (() => performance.now());
    this.unsubscribeTranscriber = transcriber.subscribe(
      this.handleTranscriberEvent,
    );
  }

  get state(): SpeechSessionState {
    return this.stateValue;
  }

  get connectionInfo(): TranscriberConnectionInfo | undefined {
    return this.info;
  }

  get activeUtteranceId(): string | undefined {
    return this.pending?.id;
  }

  async connect(): Promise<TranscriberConnectionInfo> {
    if (this.stateValue !== "idle") {
      throw new SpeechSessionError(
        "invalidState",
        "The speech session can only connect from its idle state.",
      );
    }

    this.setState("connecting");
    try {
      this.info = await this.transcriber.connect();
      if (this.state === "closed") {
        throw new SpeechSessionError(
          "closed",
          "The speech session was closed while connecting.",
        );
      }
      this.setState("ready");
      return this.info;
    } catch (error) {
      const mapped = asSessionError(error);
      this.fail(mapped);
      throw mapped;
    }
  }

  beginUtterance(utteranceId: string): Promise<SpeechUtteranceResult> {
    if (this.stateValue !== "ready" || this.pending) {
      throw new SpeechSessionError(
        "invalidState",
        "A speech utterance can only begin when the session is ready.",
      );
    }
    const id = utteranceId.trim();
    if (!id) {
      throw new SpeechSessionError(
        "invalidUtterance",
        "A non-empty speech utterance identifier is required.",
      );
    }

    const pending = deferredUtterance(id, this.now());
    this.pending = pending;
    try {
      this.transcriber.beginUtterance(id);
    } catch (error) {
      this.pending = undefined;
      const mapped = asSessionError(error);
      this.fail(mapped);
      throw mapped;
    }

    this.setState("listening", id);
    this.maximumDurationTimer = globalThis.setTimeout(() => {
      if (this.pending?.id !== id || this.stateValue !== "listening") return;
      this.requestCommit("maxDuration");
    }, this.maximumUtteranceDurationMs);
    return pending.promise;
  }

  pushAudio(chunk: PcmAudioChunk): boolean {
    if (this.stateValue !== "listening" || !this.pending) return false;
    try {
      this.transcriber.sendAudio(this.pending.id, chunk);
      return true;
    } catch (error) {
      this.fail(asSessionError(error));
      return false;
    }
  }

  /**
   * Allows a provider endpoint to finish the utterance. RSVP calls this only
   * after the final target has stopped drawing; earlier provider commits are
   * retained as transcript text while capture continues.
   */
  allowProviderFinalization(): void {
    if (this.stateValue !== "listening" || !this.pending) {
      throw new SpeechSessionError(
        "invalidState",
        "Provider finalization can only be enabled while listening.",
      );
    }
    this.pending.providerFinalizationAllowed = true;
  }

  requestCommit(
    trigger: Exclude<UtteranceFinalizationTrigger, "providerVad"> = "manual",
  ): void {
    if (this.stateValue !== "listening" || !this.pending) {
      throw new SpeechSessionError(
        "invalidState",
        "Only a listening speech utterance can be committed.",
      );
    }

    const utteranceId = this.pending.id;
    this.pending.finalizationTrigger = trigger;
    this.clearMaximumDurationTimer();
    try {
      this.transcriber.requestCommit(utteranceId);
    } catch (error) {
      this.fail(asSessionError(error));
      return;
    }

    this.setState("finalizing", utteranceId);
    this.finalizationTimer = globalThis.setTimeout(() => {
      if (this.pending?.id !== utteranceId) return;
      const error = new SpeechSessionError(
        "finalizationTimeout",
        "The speech utterance did not produce a committed transcript in time.",
        { retryable: true },
      );
      this.fail(error);
      try {
        this.transcriber.cancelUtterance(utteranceId);
      } catch {
        // The session is already failed; cancellation is best-effort cleanup.
      }
    }, this.finalizationTimeoutMs);
  }

  cancelUtterance(): void {
    if (!this.pending) return;
    const utteranceId = this.pending.id;
    const error = new SpeechSessionError(
      "utteranceCancelled",
      "The active speech utterance was cancelled.",
      { retryable: true },
    );
    this.clearUtteranceTimers();
    this.pending.reject(error);
    this.pending = undefined;
    this.expectedClose = true;
    try {
      this.transcriber.cancelUtterance(utteranceId);
    } finally {
      // Cancellation invalidates the connection so provider context cannot
      // leak into a later utterance.
      this.setState("closed");
    }
  }

  subscribe(listener: SpeechSessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close(): Promise<void> {
    this.closePromise ??= this.performClose();
    return this.closePromise;
  }

  private readonly handleTranscriberEvent = (event: TranscriberEvent): void => {
    if (this.stateValue === "closed") return;

    switch (event.type) {
      case "partial":
        if (event.utteranceId !== this.pending?.id) return;
        this.emit({
          type: "partial",
          utteranceId: event.utteranceId,
          text: this.withCommittedText(event.text),
          settled: event.settled,
          receivedAtMs: event.receivedAtMs,
        });
        break;
      case "commit":
        this.handleProviderCommit(event);
        break;
      case "error":
        if (event.utteranceId && event.utteranceId !== this.pending?.id) return;
        this.fail(asSessionError(event.error));
        break;
      case "closed":
        if (!event.expected && !this.expectedClose) {
          this.fail(
            new SpeechSessionError(
              "transcriberFailure",
              "The realtime transcription connection closed unexpectedly.",
              { retryable: true },
            ),
          );
        }
        break;
    }
  };

  private handleProviderCommit(
    event: Extract<TranscriberEvent, { type: "commit" }>,
  ): void {
    if (!this.pending || event.utteranceId !== this.pending.id) return;
    const text = event.text.trim();
    if (text) {
      this.pending.committedSegments.push({
        text,
        receivedAtMs: event.receivedAtMs,
      });
    }
    const accumulatedText = this.accumulatedCommittedText();
    this.emit({
      type: "partial",
      utteranceId: event.utteranceId,
      text: accumulatedText,
      settled: true,
      receivedAtMs: event.receivedAtMs,
    });

    if (
      this.stateValue === "finalizing" ||
      this.pending.providerFinalizationAllowed
    ) {
      this.completeUtterance(
        event.utteranceId,
        accumulatedText,
        event.receivedAtMs,
      );
    }
  }

  private withCommittedText(partialText: string): string {
    const committedText = this.accumulatedCommittedText();
    return [committedText, partialText.trim()].filter(Boolean).join(" ");
  }

  private accumulatedCommittedText(): string {
    return (
      this.pending?.committedSegments
        .map((segment) => segment.text)
        .join(" ") ?? ""
    ).trim();
  }

  private completeUtterance(
    utteranceId: string,
    text: string,
    completedAtMs: number,
  ): void {
    if (!this.pending || utteranceId !== this.pending.id) return;
    const pending = this.pending;
    try {
      this.transcriber.endUtterance(utteranceId);
    } catch (error) {
      this.fail(asSessionError(error));
      return;
    }
    const result: SpeechUtteranceResult = {
      utteranceId,
      text,
      committedSegments: pending.committedSegments.map((segment) => ({
        ...segment,
      })),
      startedAtMs: pending.startedAtMs,
      completedAtMs,
      durationMs: Math.max(0, completedAtMs - pending.startedAtMs),
      finalizationTrigger: pending.finalizationTrigger,
    };

    this.clearUtteranceTimers();
    this.pending = undefined;
    this.setState("ready");
    pending.resolve(result);
    this.emit({ type: "final", result });
  }

  private fail(error: SpeechSessionError): void {
    if (this.stateValue === "closed" || this.stateValue === "failed") return;
    const utteranceId = this.pending?.id;
    this.clearUtteranceTimers();
    this.pending?.reject(error);
    this.pending = undefined;
    this.setState("failed", utteranceId);
    this.emit({ type: "error", utteranceId, error });
  }

  private async performClose(): Promise<void> {
    if (this.stateValue === "closed") {
      this.unsubscribeTranscriber();
      this.listeners.clear();
      return;
    }
    this.expectedClose = true;
    this.clearUtteranceTimers();
    if (this.pending) {
      this.pending.reject(
        new SpeechSessionError("closed", "The speech session was closed."),
      );
      this.pending = undefined;
    }
    await this.transcriber.close();
    this.unsubscribeTranscriber();
    this.setState("closed");
    this.listeners.clear();
  }

  private setState(state: SpeechSessionState, utteranceId?: string): void {
    if (this.stateValue === state) return;
    this.stateValue = state;
    this.emit({ type: "state", state, utteranceId });
  }

  private clearMaximumDurationTimer(): void {
    if (this.maximumDurationTimer !== undefined) {
      globalThis.clearTimeout(this.maximumDurationTimer);
      this.maximumDurationTimer = undefined;
    }
  }

  private clearUtteranceTimers(): void {
    this.clearMaximumDurationTimer();
    if (this.finalizationTimer !== undefined) {
      globalThis.clearTimeout(this.finalizationTimer);
      this.finalizationTimer = undefined;
    }
  }

  private emit(event: SpeechSessionEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // A UI observer cannot interrupt utterance or cleanup state transitions.
      }
    }
  }
}
