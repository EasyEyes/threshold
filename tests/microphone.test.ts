import {
  MicrophoneError,
  openMicrophone,
} from "../components/speech/microphone";

type Listener = EventListenerOrEventListenerObject;

class FakeTrack {
  readonly kind: string;
  enabled = true;
  muted = false;
  readyState: MediaStreamTrackState = "live";
  readonly stop = jest.fn(() => {
    this.readyState = "ended";
  });

  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly settings: MediaTrackSettings;

  constructor(kind = "audio", settings: MediaTrackSettings = {}) {
    this.kind = kind;
    this.settings = settings;
  }

  addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  getSettings(): MediaTrackSettings {
    return { ...this.settings };
  }

  emit(type: string): void {
    const event = { type } as Event;
    for (const listener of this.listeners.get(type) ?? []) {
      if (typeof listener === "function") listener(event);
      else listener.handleEvent(event);
    }
  }
}

class FakeStream {
  constructor(private readonly tracks: FakeTrack[]) {}

  getAudioTracks(): MediaStreamTrack[] {
    return this.tracks.filter(
      (track) => track.kind === "audio",
    ) as unknown as MediaStreamTrack[];
  }

  getTracks(): MediaStreamTrack[] {
    return this.tracks as unknown as MediaStreamTrack[];
  }
}

class FakeAnalyser {
  fftSize = 2048;
  readonly disconnect = jest.fn();
  floatSamples = new Float32Array(this.fftSize);
  byteSamples = new Uint8Array(this.fftSize).fill(128);

  getFloatTimeDomainData(target: Float32Array): void {
    target.set(this.floatSamples.subarray(0, target.length));
  }

  getByteTimeDomainData(target: Uint8Array): void {
    target.set(this.byteSamples.subarray(0, target.length));
  }
}

class FakeSource {
  readonly connect = jest.fn();
  readonly disconnect = jest.fn();
}

class FakeAudioContext {
  state: AudioContextState = "suspended";
  readonly sampleRate = 48000;
  readonly analyser = new FakeAnalyser();
  readonly source = new FakeSource();
  readonly resume = jest.fn(async () => {
    this.state = "running";
  });
  readonly close = jest.fn(async () => {
    this.state = "closed";
  });
  readonly createMediaStreamSource = jest.fn(() => this.source);
  readonly createAnalyser = jest.fn(() => this.analyser);
}

const asStream = (stream: FakeStream): MediaStream =>
  stream as unknown as MediaStream;

const asAudioContext = (context: FakeAudioContext): AudioContext =>
  context as unknown as AudioContext;

const namedError = (name: string): Error =>
  Object.assign(new Error(name), { name });

describe("openMicrophone", () => {
  it("reports unsupported environments before creating an audio graph", async () => {
    const createAudioContext = jest.fn(() =>
      asAudioContext(new FakeAudioContext()),
    );

    await expect(openMicrophone({ createAudioContext })).rejects.toMatchObject({
      code: "unsupported",
    });
    expect(createAudioContext).not.toHaveBeenCalled();
  });

  it("does not access media devices until explicitly opened", async () => {
    const track = new FakeTrack();
    const stream = new FakeStream([track]);
    const getUserMedia = jest.fn(async () => asStream(stream));
    const context = new FakeAudioContext();

    expect(getUserMedia).not.toHaveBeenCalled();

    await openMicrophone({
      mediaDevices: { getUserMedia },
      createAudioContext: () => asAudioContext(context),
    });

    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("opens one audio track and exposes pull-based frames", async () => {
    const track = new FakeTrack("audio", { sampleRate: 48000 });
    const stream = new FakeStream([track]);
    const getUserMedia = jest.fn(async () => asStream(stream));
    const context = new FakeAudioContext();
    context.analyser.floatSamples = new Float32Array(64).fill(0.25);

    const session = await openMicrophone({
      analyserFftSize: 64,
      audioConstraints: { channelCount: 1 },
      mediaDevices: { getUserMedia },
      createAudioContext: () => asAudioContext(context),
    });

    expect(getUserMedia).toHaveBeenCalledWith({
      audio: { channelCount: 1 },
      video: false,
    });
    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(context.source.connect).toHaveBeenCalledWith(context.analyser);
    expect(session.frameSize).toBe(64);
    expect(session.sampleRate).toBe(48000);
    expect(session.frameDurationMs).toBeCloseTo((64 / 48000) * 1000);
    expect(session.getHealth().state).toBe("ready");
    expect(session.getTrackSettings()).toEqual({ sampleRate: 48000 });

    const target = new Float32Array(session.frameSize);
    session.readFrame(target);
    expect(Array.from(target)).toEqual(Array(64).fill(0.25));
  });

  it("publishes mute, disabled, ended, and closed health", async () => {
    const track = new FakeTrack();
    const context = new FakeAudioContext();
    const session = await openMicrophone({
      mediaDevices: {
        getUserMedia: jest.fn(async () => asStream(new FakeStream([track]))),
      },
      createAudioContext: () => asAudioContext(context),
    });
    const states: string[] = [];
    session.subscribeToHealth((health) => states.push(health.state));

    track.muted = true;
    track.emit("mute");
    track.muted = false;
    track.enabled = false;
    track.emit("unmute");
    track.enabled = true;
    track.readyState = "ended";
    track.emit("ended");
    await session.close();

    expect(states).toEqual(["ready", "muted", "disabled", "ended", "closed"]);
  });

  it("isolates health-listener failures", async () => {
    const track = new FakeTrack();
    const context = new FakeAudioContext();
    const session = await openMicrophone({
      mediaDevices: {
        getUserMedia: jest.fn(async () => asStream(new FakeStream([track]))),
      },
      createAudioContext: () => asAudioContext(context),
    });
    let failingListenerCalls = 0;
    session.subscribeToHealth(() => {
      failingListenerCalls += 1;
      if (failingListenerCalls > 1) throw new Error("observer failed");
    });
    const healthyListener = jest.fn();
    session.subscribeToHealth(healthyListener);

    track.muted = true;
    expect(() => track.emit("mute")).not.toThrow();

    expect(healthyListener).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: "muted" }),
    );
    await expect(session.close()).resolves.toBeUndefined();
  });

  it("closes every track and audio node exactly once", async () => {
    const audioTrack = new FakeTrack("audio");
    const otherTrack = new FakeTrack("video");
    const context = new FakeAudioContext();
    const session = await openMicrophone({
      mediaDevices: {
        getUserMedia: jest.fn(async () =>
          asStream(new FakeStream([audioTrack, otherTrack])),
        ),
      },
      createAudioContext: () => asAudioContext(context),
    });

    await Promise.all([session.close(), session.close()]);

    expect(audioTrack.stop).toHaveBeenCalledTimes(1);
    expect(otherTrack.stop).toHaveBeenCalledTimes(1);
    expect(context.source.disconnect).toHaveBeenCalledTimes(1);
    expect(context.analyser.disconnect).toHaveBeenCalledTimes(1);
    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["NotAllowedError", "permissionDenied"],
    ["NotFoundError", "deviceNotFound"],
    ["NotReadableError", "deviceUnavailable"],
    ["OverconstrainedError", "constraintsUnsupported"],
    ["UnknownError", "unexpected"],
  ])("maps %s to %s", async (browserErrorName, expectedCode) => {
    const getUserMedia = jest.fn(async () => {
      throw namedError(browserErrorName);
    });

    await expect(
      openMicrophone({
        mediaDevices: { getUserMedia },
        createAudioContext: () => asAudioContext(new FakeAudioContext()),
      }),
    ).rejects.toMatchObject({
      name: "MicrophoneError",
      code: expectedCode,
    });
  });

  it("stops a stream that contains no audio track", async () => {
    const nonAudioTrack = new FakeTrack("video");
    const context = new FakeAudioContext();
    const createAudioContext = jest.fn(() => asAudioContext(context));

    await expect(
      openMicrophone({
        mediaDevices: {
          getUserMedia: jest.fn(async () =>
            asStream(new FakeStream([nonAudioTrack])),
          ),
        },
        createAudioContext,
      }),
    ).rejects.toMatchObject({ code: "noAudioTrack" });

    expect(nonAudioTrack.stop).toHaveBeenCalledTimes(1);
    expect(createAudioContext).toHaveBeenCalledTimes(1);
    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it("stops the stream when audio graph initialization fails", async () => {
    const track = new FakeTrack();
    const context = new FakeAudioContext();
    context.createMediaStreamSource.mockImplementation(() => {
      throw new Error("source failed");
    });

    await expect(
      openMicrophone({
        mediaDevices: {
          getUserMedia: jest.fn(async () => asStream(new FakeStream([track]))),
        },
        createAudioContext: () => asAudioContext(context),
      }),
    ).rejects.toMatchObject({ code: "audioGraphUnavailable" });

    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it("stops an acquired stream when AudioContext resume fails", async () => {
    const track = new FakeTrack();
    const context = new FakeAudioContext();
    context.resume.mockRejectedValue(new Error("resume failed"));

    await expect(
      openMicrophone({
        mediaDevices: {
          getUserMedia: jest.fn(async () => asStream(new FakeStream([track]))),
        },
        createAudioContext: () => asAudioContext(context),
      }),
    ).rejects.toMatchObject({ code: "audioGraphUnavailable" });

    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it("falls back to byte-domain frames when float-domain sampling is unavailable", async () => {
    const track = new FakeTrack();
    const context = new FakeAudioContext();
    context.analyser.byteSamples = new Uint8Array(64).fill(192);
    Object.assign(context.analyser, { getFloatTimeDomainData: undefined });
    const session = await openMicrophone({
      analyserFftSize: 64,
      mediaDevices: {
        getUserMedia: jest.fn(async () => asStream(new FakeStream([track]))),
      },
      createAudioContext: () => asAudioContext(context),
    });

    const target = new Float32Array(64);
    session.readFrame(target);

    expect(Array.from(target)).toEqual(Array(64).fill(0.5));
  });

  it("rejects invalid frame sizes and reads after input end or close", async () => {
    const track = new FakeTrack();
    const context = new FakeAudioContext();
    const session = await openMicrophone({
      analyserFftSize: 64,
      mediaDevices: {
        getUserMedia: jest.fn(async () => asStream(new FakeStream([track]))),
      },
      createAudioContext: () => asAudioContext(context),
    });

    expect(() => session.readFrame(new Float32Array(32))).toThrow(
      expect.objectContaining({ code: "invalidConfiguration" }),
    );

    track.readyState = "ended";
    expect(() => session.readFrame(new Float32Array(64))).toThrow(
      expect.objectContaining({ code: "inputEnded" }),
    );

    await session.close();
    expect(() => session.readFrame(new Float32Array(64))).toThrow(
      expect.objectContaining({ code: "sessionClosed" }),
    );
  });

  it("validates analyser size before requesting permission", async () => {
    const getUserMedia = jest.fn();

    await expect(
      openMicrophone({
        analyserFftSize: 100,
        mediaDevices: { getUserMedia },
      }),
    ).rejects.toBeInstanceOf(MicrophoneError);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("bounds an unresolved permission request and stops a late stream", async () => {
    jest.useFakeTimers();
    const track = new FakeTrack();
    const stream = new FakeStream([track]);
    const context = new FakeAudioContext();
    let resolveMediaRequest: ((stream: MediaStream) => void) | undefined;
    const getUserMedia = jest.fn(
      () =>
        new Promise<MediaStream>((resolve) => {
          resolveMediaRequest = resolve;
        }),
    );

    try {
      const opening = openMicrophone({
        permissionTimeoutMs: 100,
        mediaDevices: { getUserMedia },
        createAudioContext: () => asAudioContext(context),
      });
      const rejection = expect(opening).rejects.toMatchObject({
        code: "permissionTimeout",
      });

      await jest.advanceTimersByTimeAsync(100);
      await rejection;
      expect(context.close).toHaveBeenCalledTimes(1);

      resolveMediaRequest?.(asStream(stream));
      await Promise.resolve();
      await Promise.resolve();
      expect(track.stop).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("validates permission timeout before requesting access", async () => {
    const getUserMedia = jest.fn();

    await expect(
      openMicrophone({
        permissionTimeoutMs: 0,
        mediaDevices: { getUserMedia },
      }),
    ).rejects.toMatchObject({ code: "invalidConfiguration" });
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
