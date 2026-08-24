jest.mock("../components/global", () => ({
  phraseIdentificationResponse: {
    current: [],
    correct: [],
    targetWord: [],
    clickTime: [],
  },
  rsvpSpeechRuntime: {
    status: "completed",
    result: undefined,
    responseRegistrationStatus: "pending",
    responseRegistrationError: undefined,
    responseDiagnostics: undefined,
  },
}));

import {
  phraseIdentificationResponse,
  rsvpSpeechRuntime,
} from "../components/global";
import {
  registerRsvpSpeechResult,
  resetRsvpSpeechResponseRegistration,
} from "../components/rsvpSpeech/rsvpSpeechRegistrar";

const result = (text: string) => ({
  utteranceId: "rsvp-test-1",
  text,
  committedSegments: text ? [{ text, receivedAtMs: 20 }] : [],
  startedAtMs: 10,
  completedAtMs: 20,
  durationMs: 10,
  finalizationTrigger: "providerVad" as const,
});

beforeEach(() => {
  phraseIdentificationResponse.current = [];
  phraseIdentificationResponse.correct = [];
  phraseIdentificationResponse.targetWord = [];
  phraseIdentificationResponse.clickTime = [];
  rsvpSpeechRuntime.status = "completed";
  rsvpSpeechRuntime.result = undefined;
  resetRsvpSpeechResponseRegistration();
});

describe("RSVP speech response registrar", () => {
  it("populates the existing response registers once", () => {
    rsvpSpeechRuntime.result = result("cat dog fish");

    const registered = registerRsvpSpeechResult({
      targetWords: ["cat", "dog", "fish"],
      languageCode: "en",
    });

    expect(registered.status).toBe("registered");
    expect(phraseIdentificationResponse.current).toEqual([
      "cat",
      "dog",
      "fish",
    ]);
    expect(phraseIdentificationResponse.correct).toEqual([1, 1, 1]);
    expect(phraseIdentificationResponse.targetWord).toEqual([
      "cat",
      "dog",
      "fish",
    ]);

    const second = registerRsvpSpeechResult({
      targetWords: ["cat", "dog", "fish"],
      languageCode: "en",
      speechResult: result("wrong words"),
    });
    expect(second.status).toBe("registered");
    expect(phraseIdentificationResponse.correct).toEqual([1, 1, 1]);
  });

  it("marks an empty committed transcript invalid instead of fabricating zeros", () => {
    rsvpSpeechRuntime.result = result("");

    const registration = registerRsvpSpeechResult({
      targetWords: ["cat", "dog", "fish"],
      languageCode: "en",
    });

    expect(registration).toEqual({
      status: "invalid",
      errorCode: "emptyTranscript",
    });
    expect(phraseIdentificationResponse.current).toEqual([]);
    expect(phraseIdentificationResponse.correct).toEqual([]);
    expect(rsvpSpeechRuntime.responseRegistrationStatus).toBe("invalid");
  });

  it("waits while the provider result is still pending", () => {
    rsvpSpeechRuntime.status = "finalizing";

    expect(
      registerRsvpSpeechResult({
        targetWords: ["cat"],
        languageCode: "en",
      }),
    ).toEqual({ status: "waiting" });
  });
});
