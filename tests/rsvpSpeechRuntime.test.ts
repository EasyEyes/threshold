jest.mock("../components/global", () => ({
  rsvpSpeechRuntime: {
    controller: undefined,
    status: "idle",
    simulated: false,
    blockCondition: undefined,
    utteranceId: undefined,
    result: undefined,
    error: undefined,
    preparationStartedAtMs: undefined,
    readyAtMs: undefined,
    captureStartedAtMs: undefined,
    finalizationAllowedAtMs: undefined,
  },
}));

import { rsvpSpeechRuntime } from "../components/global";
import type { RsvpSpeechController } from "../components/rsvpSpeech/rsvpSpeechController";
import {
  allowRsvpSpeechProviderFinalization,
  buildRsvpSpeechTrialConfiguration,
  clearRsvpSpeechRuntimeState,
  getRsvpSpeechResult,
  hasActiveRsvpSpeechResources,
  injectRsvpSpeechTranscriptForSimulation,
  prepareRsvpSpeechTrial,
  prepareSimulatedRsvpSpeechTrial,
  resolveRsvpSpeechLanguageCode,
  startRsvpSpeechCapture,
  type RsvpSpeechTrialSetup,
} from "../components/rsvpSpeech/rsvpSpeechRuntime";
import type { SpeechUtteranceResult } from "../components/speech/speechSession";

const baseSetup = (): RsvpSpeechTrialSetup => ({
  blockCondition: "2_3",
  trialNumber: 7,
  provider: "ElevenLabs",
  targetWords: ["cat", "dog", "fish"],
  experimentLanguage: "en-US",
  targetKeytermBiasEnabled: true,
  maximumResponseDurationSec: 6,
  stimulusDurationMs: 750,
  requestTokenContext: () => ({
    experimentFullPath: "scientist/study",
    pavloviaSessionToken: "session-token",
  }),
});

const utteranceResult = (utteranceId: string): SpeechUtteranceResult => ({
  utteranceId,
  text: "cat dog fish",
  committedSegments: [{ text: "cat dog fish", receivedAtMs: 40 }],
  startedAtMs: 20,
  completedAtMs: 40,
  durationMs: 20,
  finalizationTrigger: "providerVad",
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

beforeEach(async () => {
  await clearRsvpSpeechRuntimeState();
});

afterAll(async () => {
  await clearRsvpSpeechRuntimeState();
});

describe("RSVP speech trial configuration", () => {
  it("maps the experiment locale to the provider-specific language format", () => {
    expect(resolveRsvpSpeechLanguageCode("elevenlabs", "pt-BR")).toBe("pt");
    expect(resolveRsvpSpeechLanguageCode("deepgram", "pt_BR")).toBe("pt-BR");
  });

  it("uses only the current trial targets and converts seconds to milliseconds", () => {
    const configuration = buildRsvpSpeechTrialConfiguration(baseSetup());

    expect(configuration.provider).toBe("elevenlabs");
    expect(configuration.targetWords).toEqual(["cat", "dog", "fish"]);
    expect(configuration.languageCode).toBe("en");
    expect(configuration.targetKeytermBiasEnabled).toBe(true);
    expect(configuration.maximumResponseDurationMs).toBe(6000);
    expect(configuration.utteranceId).toContain("rsvp-2_3-7-");
  });

  it("rejects a response timeout that could expire during presentation", () => {
    expect(() =>
      buildRsvpSpeechTrialConfiguration({
        ...baseSetup(),
        maximumResponseDurationSec: 0.5,
      }),
    ).toThrow("must extend beyond the RSVP stimulus sequence");
  });

  it.each([
    ["provider", "unknown"],
    ["targetKeytermBiasEnabled", "true"],
    ["maximumResponseDurationSec", 0],
  ] as const)("rejects invalid %s values", (field, value) => {
    expect(() =>
      buildRsvpSpeechTrialConfiguration({
        ...baseSetup(),
        [field]: value,
      }),
    ).toThrow();
  });
});

describe("RSVP speech runtime lifecycle", () => {
  it("prepares before capture and forwards onset/finalization exactly once", async () => {
    const result = deferred<SpeechUtteranceResult>();
    const prepare = jest.fn(async () => undefined);
    const startCapture = jest.fn();
    const allowProviderFinalization = jest.fn();
    const waitForResult = jest.fn(() => result.promise);
    const close = jest.fn(async () => undefined);
    const controller = {
      prepare,
      startCapture,
      allowProviderFinalization,
      waitForResult,
      close,
    } as unknown as RsvpSpeechController;
    const now = jest
      .fn<ReturnType<() => number>, []>()
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(15);

    await expect(
      prepareRsvpSpeechTrial(baseSetup(), {
        createController: () => controller,
        now,
      }),
    ).resolves.toBe(true);
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(rsvpSpeechRuntime.status).toBe("ready");
    expect(hasActiveRsvpSpeechResources()).toBe(true);

    expect(startRsvpSpeechCapture(() => 20)).toBe(true);
    expect(startCapture).toHaveBeenCalledTimes(1);
    expect(waitForResult).toHaveBeenCalledTimes(1);
    expect(rsvpSpeechRuntime.captureStartedAtMs).toBe(20);

    expect(allowRsvpSpeechProviderFinalization(() => 30)).toBe(true);
    expect(allowProviderFinalization).toHaveBeenCalledTimes(1);
    expect(rsvpSpeechRuntime.finalizationAllowedAtMs).toBe(30);

    result.resolve(utteranceResult(rsvpSpeechRuntime.utteranceId!));
    await result.promise;
    await Promise.resolve();
    expect(rsvpSpeechRuntime.status).toBe("completed");
    expect(getRsvpSpeechResult()?.text).toBe("cat dog fish");
  });

  it("does not open a timing gate before preparation succeeds", () => {
    expect(hasActiveRsvpSpeechResources()).toBe(false);
    expect(startRsvpSpeechCapture()).toBe(false);
    expect(allowRsvpSpeechProviderFinalization()).toBe(false);
  });

  it("keeps preparation failures in speech state instead of throwing into RSVP", async () => {
    const controller = {
      prepare: jest.fn(async () => {
        throw new Error("provider unavailable");
      }),
      close: jest.fn(async () => undefined),
    } as unknown as RsvpSpeechController;

    await expect(
      prepareRsvpSpeechTrial(baseSetup(), {
        createController: () => controller,
      }),
    ).resolves.toBe(false);
    expect(hasActiveRsvpSpeechResources()).toBe(false);
    expect(rsvpSpeechRuntime.status).toBe("failed");
    expect(rsvpSpeechRuntime.error).toBeInstanceOf(Error);
  });

  it("supports transcript injection without microphone or provider access", () => {
    prepareSimulatedRsvpSpeechTrial({
      blockCondition: "2_3",
      trialNumber: 7,
    });
    expect(startRsvpSpeechCapture(() => 100)).toBe(true);
    expect(allowRsvpSpeechProviderFinalization(() => 120)).toBe(true);

    const result = injectRsvpSpeechTranscriptForSimulation(
      "cat dog fish",
      () => 140,
    );
    expect(result.durationMs).toBe(40);
    expect(result.text).toBe("cat dog fish");
    expect(rsvpSpeechRuntime.status).toBe("completed");
  });
});
