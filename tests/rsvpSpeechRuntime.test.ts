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
import * as glossaryRegistry from "../parameters/glossaryRegistry";
import type { ParamReader } from "../parameters/paramReader";
import type { RsvpSpeechController } from "../components/rsvpSpeech/rsvpSpeechController";
import {
  RSVP_SPEECH_PARAMETER_NAMES,
  allowRsvpSpeechProviderFinalization,
  buildRsvpSpeechTrialConfiguration,
  clearRsvpSpeechRuntimeState,
  closeActiveRsvpSpeechTrial,
  getRsvpSpeechResult,
  hasActiveRsvpSpeechResources,
  injectRsvpSpeechTranscriptForSimulation,
  prepareRsvpSpeechTrial,
  prepareSimulatedRsvpSpeechTrial,
  readRsvpSpeechFinishSettings,
  resolveRsvpSpeechProviderLanguageCode,
  startRsvpSpeechCapture,
  type RsvpSpeechTrialSetup,
} from "../components/rsvpSpeech/rsvpSpeechRuntime";
import type { SpeechUtteranceResult } from "../components/speech/speechSession";

const baseSetup = (): RsvpSpeechTrialSetup => ({
  blockCondition: "2_3",
  trialNumber: 7,
  provider: "ElevenLabs",
  targetWords: ["cat", "dog", "fish"],
  conditionLanguage: "en-US",
  targetKeytermBiasEnabled: true,
  maximumResponseBeyondFinalWordSec: 6,
  finalizationTimeoutSec: 5,
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
  it("uses defaults without reading unpublished parameters", () => {
    const glossary = jest
      .spyOn(glossaryRegistry, "getGlossary")
      .mockReturnValue({});
    const read = jest.fn(() => true);
    try {
      expect(
        readRsvpSpeechFinishSettings({ read } as unknown as ParamReader, "2_3"),
      ).toEqual({
        responseSilenceSec: 8,
        finishPhrase: "don't know",
        ignoreWordOrder: true,
      });
      expect(read.mock.calls).toEqual([
        [RSVP_SPEECH_PARAMETER_NAMES.ignoreOrder, "2_3"],
      ]);
    } finally {
      glossary.mockRestore();
    }
  });

  it.each(["finished", ""])(
    "reads the current condition's published finish phrase (%j)",
    (phrase) => {
      const glossary = jest
        .spyOn(glossaryRegistry, "getGlossary")
        .mockReturnValue({
          [RSVP_SPEECH_PARAMETER_NAMES.finishPhrase]: {
            name: RSVP_SPEECH_PARAMETER_NAMES.finishPhrase,
            availability: "TRUE",
            type: "text",
            default: phrase,
            explanation: "Spoken response completion phrase.",
            example: "finished",
            categories: [],
          },
          [RSVP_SPEECH_PARAMETER_NAMES.silenceSec]: {
            name: RSVP_SPEECH_PARAMETER_NAMES.silenceSec,
            availability: "TRUE",
            type: "numerical",
            default: "8",
            explanation: "Silence duration before response completion.",
            example: "8",
            categories: [],
          },
        });
      const read = jest.fn((name: string) =>
        name === RSVP_SPEECH_PARAMETER_NAMES.finishPhrase
          ? phrase
          : name === RSVP_SPEECH_PARAMETER_NAMES.silenceSec
          ? 9
          : false,
      );
      try {
        const settings = readRsvpSpeechFinishSettings(
          { read } as unknown as ParamReader,
          "2_3",
        );
        expect(settings).toEqual({
          responseSilenceSec: 9,
          finishPhrase: phrase,
          ignoreWordOrder: false,
        });
        expect(read).toHaveBeenCalledWith(
          RSVP_SPEECH_PARAMETER_NAMES.finishPhrase,
          "2_3",
        );
        expect(
          buildRsvpSpeechTrialConfiguration({ ...baseSetup(), ...settings })
            .finishPhrase,
        ).toBe(phrase);
      } finally {
        glossary.mockRestore();
      }
    },
  );
  it("uses the published RSVP speech glossary names", () => {
    expect(RSVP_SPEECH_PARAMETER_NAMES.provider).toBe("rsvpReadingSTTProvider");
    expect(RSVP_SPEECH_PARAMETER_NAMES.targetKeytermBiasEnabled).toBe(
      "rsvpReadingSTTUseKeytermsBool",
    );
    expect(RSVP_SPEECH_PARAMETER_NAMES.responseTimeoutSec).toBe(
      "rsvpReadingSpeechTimeoutSec",
    );
    expect(RSVP_SPEECH_PARAMETER_NAMES.finalizationTimeoutSec).toBe(
      "rsvpReadingSTTMaxSec",
    );
    expect(RSVP_SPEECH_PARAMETER_NAMES.ignoreOrder).toBe(
      "rsvpReadingSTTIgnoreOrderBool",
    );
  });

  it("maps the condition locale to the provider-specific language format", () => {
    expect(resolveRsvpSpeechProviderLanguageCode("elevenlabs", "pt-BR")).toBe(
      "pt",
    );
    expect(resolveRsvpSpeechProviderLanguageCode("deepgram", "pt_BR")).toBe(
      "pt-BR",
    );
  });

  it("uses current-trial targets and keeps the response and STT waits separate", () => {
    const configuration = buildRsvpSpeechTrialConfiguration(baseSetup());

    expect(configuration.provider).toBe("elevenlabs");
    expect(configuration.targetWords).toEqual(["cat", "dog", "fish"]);
    expect(configuration.languageCode).toBe("en");
    expect(configuration.targetKeytermBiasEnabled).toBe(true);
    expect(configuration.maximumResponseDurationMs).toBe(6000);
    expect(configuration.finalizationTimeoutMs).toBe(5000);
    expect(configuration.utteranceId).toContain("rsvp-2_3-7-");
  });

  it("accepts the trailing-period Deepgram value published by glossary v32.0", () => {
    const configuration = buildRsvpSpeechTrialConfiguration({
      ...baseSetup(),
      provider: "deepgram.",
    });

    expect(configuration.provider).toBe("deepgram");
  });

  it("accepts Chirp 3 and preserves the condition locale", () => {
    const config = buildRsvpSpeechTrialConfiguration({
      ...baseSetup(),
      provider: "chirp3",
    });
    expect(config.provider).toBe("chirp3");
    expect(config.languageCode).toBe("en-US");
  });

  it.each([
    ["en", "en-US"],
    ["fa", "fa-IR"],
    ["en-GB", "en-GB"],
    ["fa_IR", "fa-IR"],
  ])(
    "maps Chirp 3 condition language %s to %s without changing other providers",
    (input, expected) => {
      expect(resolveRsvpSpeechProviderLanguageCode("chirp3", input)).toBe(
        expected,
      );
      expect(resolveRsvpSpeechProviderLanguageCode("deepgram", input)).toBe(
        input.replace(/_/g, "-"),
      );
    },
  );

  it.each([
    ["provider", "unknown"],
    ["targetKeytermBiasEnabled", "true"],
    ["maximumResponseBeyondFinalWordSec", 0],
    ["finalizationTimeoutSec", 0],
    ["finishPhrase", true],
    ["responseSilenceSec", 0],
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

  it("does not count a failed Chirp capture as exposure", async () => {
    const error = new Error("Disconnected before the first word");
    const controller = {
      configuration: { provider: "chirp3" },
      prepare: jest.fn(async () => undefined),
      startCapture: jest.fn(() => {
        throw error;
      }),
      close: jest.fn(async () => undefined),
    } as unknown as RsvpSpeechController;
    await prepareRsvpSpeechTrial(
      { ...baseSetup(), provider: "chirp3" },
      {
        createController: () => controller,
      },
    );
    expect(startRsvpSpeechCapture()).toBe(false);
    expect(rsvpSpeechRuntime.error).toBe(error);
    expect(rsvpSpeechRuntime.captureStartedAtMs).toBeUndefined();
    expect(rsvpSpeechRuntime.responseRegistrationStatus).toBe("pending");
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
    expect(controller.close).toHaveBeenCalledTimes(1);
  });

  it("waits for skipped-trial cleanup before preparing another controller", async () => {
    const firstClose = deferred<void>();
    const firstController = {
      prepare: jest.fn(async () => undefined),
      close: jest.fn(() => firstClose.promise),
    } as unknown as RsvpSpeechController;
    const secondController = {
      prepare: jest.fn(async () => undefined),
      close: jest.fn(async () => undefined),
    } as unknown as RsvpSpeechController;

    await expect(
      prepareRsvpSpeechTrial(baseSetup(), {
        createController: () => firstController,
      }),
    ).resolves.toBe(true);

    const closePromise = closeActiveRsvpSpeechTrial();
    expect(hasActiveRsvpSpeechResources()).toBe(true);

    const createSecondController = jest.fn(() => secondController);
    const nextPreparation = prepareRsvpSpeechTrial(
      { ...baseSetup(), trialNumber: 8 },
      { createController: createSecondController },
    );
    await Promise.resolve();
    expect(createSecondController).not.toHaveBeenCalled();

    firstClose.resolve();
    await closePromise;
    await expect(nextPreparation).resolves.toBe(true);
    expect(createSecondController).toHaveBeenCalledTimes(1);
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
