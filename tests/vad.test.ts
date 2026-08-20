import {
  EnergyVoiceActivityDetector,
  type EnergyVadConfig,
} from "../components/speech/vad";

const config: EnergyVadConfig = {
  initialNoiseFloorRms: 0.01,
  absoluteSpeechFloorRms: 0.02,
  speechThresholdDbAboveNoise: 6,
  minimumSpeechDurationMs: 100,
  endOfSpeechSilenceMs: 200,
  noiseFloorTimeConstantMs: 500,
};

const frame = (amplitude: number): Float32Array =>
  Float32Array.from({ length: 64 }, (_, index) =>
    index % 2 === 0 ? amplitude : -amplitude,
  );

describe("EnergyVoiceActivityDetector", () => {
  it("requires sustained energy before reporting speech onset", () => {
    const vad = new EnergyVoiceActivityDetector(config);

    expect(vad.process(frame(0.1), 0)).toMatchObject({
      state: "silence",
      speechStarted: false,
    });
    expect(vad.process(frame(0.1), 50)).toMatchObject({
      state: "silence",
      speechStarted: false,
    });
    expect(vad.process(frame(0.1), 100)).toMatchObject({
      state: "speech",
      speechStarted: true,
      speechEnded: false,
    });
  });

  it("keeps speech active until the configured trailing silence elapses", () => {
    const vad = new EnergyVoiceActivityDetector(config);
    vad.process(frame(0.1), 0);
    vad.process(frame(0.1), 100);

    expect(vad.process(frame(0), 150)).toMatchObject({
      state: "speech",
      speechEnded: false,
    });
    expect(vad.process(frame(0), 349)).toMatchObject({
      state: "speech",
      speechEnded: false,
    });
    expect(vad.process(frame(0), 350)).toMatchObject({
      state: "silence",
      speechEnded: true,
    });
  });

  it("does not classify a short energy spike as speech", () => {
    const vad = new EnergyVoiceActivityDetector(config);

    vad.process(frame(0.1), 0);
    const decision = vad.process(frame(0), 50);

    expect(decision).toMatchObject({
      state: "silence",
      speechStarted: false,
      speechEnded: false,
    });
  });

  it("adapts the noise floor only while not in speech", () => {
    const vad = new EnergyVoiceActivityDetector({
      ...config,
      initialNoiseFloorRms: 0.02,
      absoluteSpeechFloorRms: 0.001,
      noiseFloorTimeConstantMs: 100,
    });

    vad.process(frame(0.01), 0);
    const beforeSpeech = vad.process(frame(0.01), 100);
    const expectedNoiseFloor = (1 - Math.exp(-1)) * 0.01 + Math.exp(-1) * 0.02;
    expect(beforeSpeech.noiseFloorRms).toBeCloseTo(expectedNoiseFloor);

    vad.process(frame(0.1), 200);
    const duringSpeech = vad.process(frame(0.1), 300);
    expect(duringSpeech.state).toBe("speech");
    expect(duringSpeech.noiseFloorRms).toBeCloseTo(expectedNoiseFloor);
  });

  it("adapts by elapsed time rather than the number of processed frames", () => {
    const timeBasedConfig: EnergyVadConfig = {
      ...config,
      initialNoiseFloorRms: 0.02,
      absoluteSpeechFloorRms: 0.001,
      noiseFloorTimeConstantMs: 100,
    };
    const sparse = new EnergyVoiceActivityDetector(timeBasedConfig);
    const frequent = new EnergyVoiceActivityDetector(timeBasedConfig);

    sparse.process(frame(0.01), 0);
    const sparseDecision = sparse.process(frame(0.01), 100);

    frequent.process(frame(0.01), 0);
    frequent.process(frame(0.01), 25);
    frequent.process(frame(0.01), 50);
    frequent.process(frame(0.01), 75);
    const frequentDecision = frequent.process(frame(0.01), 100);

    expect(frequentDecision.noiseFloorRms).toBeCloseTo(
      sparseDecision.noiseFloorRms,
    );
  });

  it("does not classify a constant DC offset as speech", () => {
    const vad = new EnergyVoiceActivityDetector(config);
    const offsetFrame = new Float32Array(64).fill(0.1);

    vad.process(offsetFrame, 0);
    const decision = vad.process(offsetFrame, 100);

    expect(decision.signal.rms).toBeCloseTo(0.1);
    expect(decision.signal.acRms).toBe(0);
    expect(decision).toMatchObject({
      state: "silence",
      speechStarted: false,
    });
  });

  it("calibrates the noise floor without creating a speech candidate", () => {
    const vad = new EnergyVoiceActivityDetector({
      ...config,
      initialNoiseFloorRms: 0.02,
    });

    const signal = vad.calibrateNoise(frame(0.01));
    const decision = vad.process(frame(0.1), 100);

    expect(signal.acRms).toBeCloseTo(0.01);
    expect(decision.noiseFloorRms).toBeCloseTo(0.01);
    expect(decision.speechStarted).toBe(false);
  });

  it("does not allow noise calibration during active speech", () => {
    const vad = new EnergyVoiceActivityDetector(config);
    vad.process(frame(0.1), 0);
    vad.process(frame(0.1), 100);

    expect(() => vad.calibrateNoise(frame(0.01))).toThrow(/speech is active/);
  });

  it("reset removes pending onset and timestamp state", () => {
    const vad = new EnergyVoiceActivityDetector(config);
    vad.process(frame(0.1), 100);

    vad.reset(0.005);
    const decision = vad.process(frame(0.1), 0);

    expect(decision).toMatchObject({
      state: "silence",
      speechStarted: false,
      noiseFloorRms: 0.005,
    });
  });

  it("rejects invalid configuration and non-monotonic timestamps", () => {
    expect(
      () =>
        new EnergyVoiceActivityDetector({
          ...config,
          noiseFloorTimeConstantMs: 0,
        }),
    ).toThrow(/noiseFloorTimeConstantMs/);

    const vad = new EnergyVoiceActivityDetector(config);
    vad.process(frame(0), 10);
    expect(() => vad.process(frame(0), 9)).toThrow(/monotonic/);
  });
});
