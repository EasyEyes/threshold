export type MicrophoneErrorCode =
  | "unsupported"
  | "permissionDenied"
  | "permissionTimeout"
  | "deviceNotFound"
  | "deviceUnavailable"
  | "constraintsUnsupported"
  | "noAudioTrack"
  | "audioGraphUnavailable"
  | "inputEnded"
  | "sessionClosed"
  | "invalidConfiguration"
  | "unexpected";

export class MicrophoneError extends Error {
  readonly code: MicrophoneErrorCode;
  readonly originalError?: unknown;

  constructor(
    code: MicrophoneErrorCode,
    message: string,
    originalError?: unknown,
  ) {
    super(message);
    this.name = "MicrophoneError";
    this.code = code;
    this.originalError = originalError;
  }
}

export type MicrophoneHealthState =
  | "ready"
  | "muted"
  | "disabled"
  | "ended"
  | "closed";

export interface MicrophoneHealth {
  state: MicrophoneHealthState;
  readyState: MediaStreamTrackState;
  enabled: boolean;
  muted: boolean;
}

export type MicrophoneHealthListener = (health: MicrophoneHealth) => void;

export interface MicrophoneSession {
  readonly stream: MediaStream;
  readonly track: MediaStreamTrack;
  readonly frameSize: number;
  readonly sampleRate: number;
  readonly frameDurationMs: number;
  getHealth(): MicrophoneHealth;
  getTrackSettings(): MediaTrackSettings;
  readFrame(target: Float32Array): void;
  subscribeToHealth(listener: MicrophoneHealthListener): () => void;
  close(): Promise<void>;
}

export interface OpenMicrophoneOptions {
  audioConstraints?: boolean | MediaTrackConstraints;
  analyserFftSize?: number;
  permissionTimeoutMs?: number;
  mediaDevices?: Pick<MediaDevices, "getUserMedia">;
  createAudioContext?: () => AudioContext;
}

const DEFAULT_ANALYSER_FFT_SIZE = 2048;
const MIN_ANALYSER_FFT_SIZE = 32;
const MAX_ANALYSER_FFT_SIZE = 32768;

const createFloatTimeDomainBuffer = (length: number) =>
  new Float32Array(length);
const createByteTimeDomainBuffer = (length: number) => new Uint8Array(length);

const isPowerOfTwo = (value: number): boolean =>
  value > 0 && (value & (value - 1)) === 0;

const validateAnalyserFftSize = (fftSize: number): void => {
  if (
    !Number.isInteger(fftSize) ||
    !isPowerOfTwo(fftSize) ||
    fftSize < MIN_ANALYSER_FFT_SIZE ||
    fftSize > MAX_ANALYSER_FFT_SIZE
  ) {
    throw new MicrophoneError(
      "invalidConfiguration",
      `analyserFftSize must be a power of two from ${MIN_ANALYSER_FFT_SIZE} through ${MAX_ANALYSER_FFT_SIZE}.`,
    );
  }
};

const validatePermissionTimeout = (timeoutMs?: number): void => {
  if (
    timeoutMs !== undefined &&
    (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
  ) {
    throw new MicrophoneError(
      "invalidConfiguration",
      "permissionTimeoutMs must be a finite positive number.",
    );
  }
};

const getDefaultMediaDevices = ():
  | Pick<MediaDevices, "getUserMedia">
  | undefined =>
  typeof navigator === "undefined" ? undefined : navigator.mediaDevices;

const createDefaultAudioContext = (): AudioContext => {
  const webkitGlobal = globalThis as typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextConstructor =
    typeof AudioContext === "undefined"
      ? webkitGlobal.webkitAudioContext
      : AudioContext;

  if (!AudioContextConstructor) {
    throw new MicrophoneError(
      "audioGraphUnavailable",
      "The Web Audio API is unavailable in this browser.",
    );
  }
  return new AudioContextConstructor();
};

const errorName = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return undefined;
  }
  return typeof error.name === "string" ? error.name : undefined;
};

const mapGetUserMediaError = (error: unknown): MicrophoneError => {
  if (error instanceof MicrophoneError) return error;

  switch (errorName(error)) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return new MicrophoneError(
        "permissionDenied",
        "Microphone permission was denied.",
        error,
      );
    case "NotFoundError":
    case "DevicesNotFoundError":
      return new MicrophoneError(
        "deviceNotFound",
        "No microphone input device was found.",
        error,
      );
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return new MicrophoneError(
        "deviceUnavailable",
        "The microphone is unavailable or could not be started.",
        error,
      );
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return new MicrophoneError(
        "constraintsUnsupported",
        "The requested microphone constraints are not supported.",
        error,
      );
    default:
      return new MicrophoneError(
        "unexpected",
        "An unexpected error occurred while opening the microphone.",
        error,
      );
  }
};

const stopAllTracks = (stream: MediaStream): void => {
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // One failed track must not prevent the remaining tracks from stopping.
    }
  }
};

const disconnectAudioNode = (node?: AudioNode): void => {
  try {
    node?.disconnect();
  } catch {
    // A disconnected node is already in the desired cleanup state.
  }
};

const closeAudioContext = async (
  audioContext?: AudioContext,
): Promise<void> => {
  if (!audioContext || audioContext.state === "closed") return;
  try {
    await audioContext.close();
  } catch {
    // Media tracks are already stopped; a close rejection must not leak cleanup.
  }
};

class BrowserMicrophoneSession implements MicrophoneSession {
  readonly stream: MediaStream;
  readonly track: MediaStreamTrack;
  readonly frameSize: number;
  readonly sampleRate: number;
  readonly frameDurationMs: number;

  private readonly audioContext: AudioContext;
  private readonly sourceNode: MediaStreamAudioSourceNode;
  private readonly analyserNode: AnalyserNode;
  private readonly floatFrame: ReturnType<typeof createFloatTimeDomainBuffer>;
  private readonly byteFrame: ReturnType<typeof createByteTimeDomainBuffer>;
  private readonly healthListeners = new Set<MicrophoneHealthListener>();
  private closePromise?: Promise<void>;
  private closed = false;

  constructor(
    stream: MediaStream,
    track: MediaStreamTrack,
    audioContext: AudioContext,
    sourceNode: MediaStreamAudioSourceNode,
    analyserNode: AnalyserNode,
  ) {
    this.stream = stream;
    this.track = track;
    this.audioContext = audioContext;
    this.sourceNode = sourceNode;
    this.analyserNode = analyserNode;
    this.frameSize = analyserNode.fftSize;
    this.sampleRate = audioContext.sampleRate;
    this.frameDurationMs = (this.frameSize / this.sampleRate) * 1000;
    this.floatFrame = createFloatTimeDomainBuffer(this.frameSize);
    this.byteFrame = createByteTimeDomainBuffer(this.frameSize);

    this.track.addEventListener("mute", this.handleTrackHealthChange);
    this.track.addEventListener("unmute", this.handleTrackHealthChange);
    this.track.addEventListener("ended", this.handleTrackHealthChange);
  }

  getHealth(): MicrophoneHealth {
    let state: MicrophoneHealthState;
    if (this.closed) state = "closed";
    else if (this.track.readyState === "ended") state = "ended";
    else if (!this.track.enabled) state = "disabled";
    else if (this.track.muted) state = "muted";
    else state = "ready";

    return {
      state,
      readyState: this.track.readyState,
      enabled: this.track.enabled,
      muted: this.track.muted,
    };
  }

  getTrackSettings(): MediaTrackSettings {
    return { ...this.track.getSettings() };
  }

  readFrame(target: Float32Array): void {
    if (this.closed) {
      throw new MicrophoneError(
        "sessionClosed",
        "Cannot read audio from a closed microphone session.",
      );
    }
    if (this.track.readyState === "ended") {
      throw new MicrophoneError(
        "inputEnded",
        "Cannot read audio because the microphone input has ended.",
      );
    }
    if (target.length !== this.frameSize) {
      throw new MicrophoneError(
        "invalidConfiguration",
        `Audio frame target must contain exactly ${this.frameSize} samples.`,
      );
    }

    if (typeof this.analyserNode.getFloatTimeDomainData === "function") {
      this.analyserNode.getFloatTimeDomainData(this.floatFrame);
      target.set(this.floatFrame);
      return;
    }

    this.analyserNode.getByteTimeDomainData(this.byteFrame);
    for (let index = 0; index < this.frameSize; index += 1) {
      target[index] = (this.byteFrame[index] - 128) / 128;
    }
  }

  subscribeToHealth(listener: MicrophoneHealthListener): () => void {
    if (this.closed) {
      listener(this.getHealth());
      return () => undefined;
    }

    this.healthListeners.add(listener);
    try {
      listener(this.getHealth());
    } catch (error) {
      this.healthListeners.delete(listener);
      throw error;
    }
    return () => this.healthListeners.delete(listener);
  }

  close(): Promise<void> {
    this.closePromise ??= this.performClose();
    return this.closePromise;
  }

  private readonly handleTrackHealthChange = (): void => {
    this.notifyHealthListeners();
  };

  private notifyHealthListeners(): void {
    const health = this.getHealth();
    for (const listener of this.healthListeners) {
      try {
        listener(health);
      } catch {
        // One observer must not interrupt resource cleanup or other observers.
      }
    }
  }

  private async performClose(): Promise<void> {
    this.closed = true;
    this.track.removeEventListener("mute", this.handleTrackHealthChange);
    this.track.removeEventListener("unmute", this.handleTrackHealthChange);
    this.track.removeEventListener("ended", this.handleTrackHealthChange);

    stopAllTracks(this.stream);

    disconnectAudioNode(this.sourceNode);
    disconnectAudioNode(this.analyserNode);
    await closeAudioContext(this.audioContext);

    this.notifyHealthListeners();
    this.healthListeners.clear();
  }
}

export const openMicrophone = async (
  options: OpenMicrophoneOptions = {},
): Promise<MicrophoneSession> => {
  const fftSize = options.analyserFftSize ?? DEFAULT_ANALYSER_FFT_SIZE;
  validateAnalyserFftSize(fftSize);
  validatePermissionTimeout(options.permissionTimeoutMs);

  const mediaDevices = options.mediaDevices ?? getDefaultMediaDevices();
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function") {
    throw new MicrophoneError(
      "unsupported",
      "Microphone capture is unavailable in this browser context.",
    );
  }

  let audioContext: AudioContext;
  try {
    audioContext = (options.createAudioContext ?? createDefaultAudioContext)();
  } catch (error) {
    if (error instanceof MicrophoneError) throw error;
    throw new MicrophoneError(
      "audioGraphUnavailable",
      "The microphone audio graph could not be initialized.",
      error,
    );
  }

  let resumePromise: Promise<void>;
  try {
    resumePromise =
      audioContext.state === "suspended"
        ? audioContext.resume()
        : Promise.resolve();
  } catch (error) {
    await closeAudioContext(audioContext);
    throw new MicrophoneError(
      "audioGraphUnavailable",
      "The microphone audio graph could not be started.",
      error,
    );
  }

  let mediaRequest: Promise<MediaStream>;
  try {
    mediaRequest = mediaDevices.getUserMedia({
      audio: options.audioConstraints ?? true,
      video: false,
    });
  } catch (error) {
    await closeAudioContext(audioContext);
    throw mapGetUserMediaError(error);
  }

  let streamPromise = mediaRequest;
  if (options.permissionTimeoutMs !== undefined) {
    streamPromise = new Promise<MediaStream>((resolve, reject) => {
      let settled = false;
      const timeoutId = globalThis.setTimeout(() => {
        settled = true;
        reject(
          new MicrophoneError(
            "permissionTimeout",
            "Microphone permission was not resolved before the timeout.",
          ),
        );
      }, options.permissionTimeoutMs);

      void mediaRequest.then(
        (stream) => {
          if (settled) {
            stopAllTracks(stream);
            return;
          }
          settled = true;
          globalThis.clearTimeout(timeoutId);
          resolve(stream);
        },
        (error) => {
          if (settled) return;
          settled = true;
          globalThis.clearTimeout(timeoutId);
          reject(error);
        },
      );
    });
  }

  // Start both before the first await so transient user activation is preserved.
  const [resumeResult, streamResult] = await Promise.allSettled([
    resumePromise,
    streamPromise,
  ]);

  if (streamResult.status === "rejected") {
    await closeAudioContext(audioContext);
    throw mapGetUserMediaError(streamResult.reason);
  }

  const stream = streamResult.value;
  if (resumeResult.status === "rejected") {
    stopAllTracks(stream);
    await closeAudioContext(audioContext);
    throw new MicrophoneError(
      "audioGraphUnavailable",
      "The microphone audio graph could not be started.",
      resumeResult.reason,
    );
  }

  const track = stream.getAudioTracks()[0];
  if (!track) {
    stopAllTracks(stream);
    await closeAudioContext(audioContext);
    throw new MicrophoneError(
      "noAudioTrack",
      "The captured media stream contains no audio track.",
    );
  }
  if (track.readyState === "ended") {
    stopAllTracks(stream);
    await closeAudioContext(audioContext);
    throw new MicrophoneError(
      "inputEnded",
      "The microphone input ended before capture could begin.",
    );
  }

  let sourceNode: MediaStreamAudioSourceNode | undefined;
  let analyserNode: AnalyserNode | undefined;

  try {
    sourceNode = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = fftSize;
    sourceNode.connect(analyserNode);
  } catch (error) {
    stopAllTracks(stream);
    disconnectAudioNode(sourceNode);
    disconnectAudioNode(analyserNode);
    await closeAudioContext(audioContext);
    if (error instanceof MicrophoneError) throw error;
    throw new MicrophoneError(
      "audioGraphUnavailable",
      "The microphone audio graph could not be initialized.",
      error,
    );
  }

  return new BrowserMicrophoneSession(
    stream,
    track,
    audioContext,
    sourceNode,
    analyserNode,
  );
};
