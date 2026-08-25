import { resolveRsvpSpeechTrialValidity } from "../components/rsvpSpeech/rsvpSpeechValidity";

describe("RSVP automatic-speech trial validity", () => {
  it.each(["silent", "spoken"] as const)(
    "preserves the existing valid path for %s RSVP responses",
    (responseMode) => {
      expect(
        resolveRsvpSpeechTrialValidity({
          responseMode,
          runtimeStatus: "idle",
          captureStarted: false,
          registeredResponseCount: 0,
          expectedResponseCount: 3,
        }),
      ).toEqual({ validForQuest: true, consumeTargetWords: true });
    },
  );

  it("does not give a failed pre-exposure trial to QUEST or consume its unseen words", () => {
    expect(
      resolveRsvpSpeechTrialValidity({
        responseMode: "automaticSpeech",
        runtimeStatus: "failed",
        captureStarted: false,
        registeredResponseCount: 0,
        expectedResponseCount: 3,
      }),
    ).toEqual({
      validForQuest: false,
      consumeTargetWords: false,
      invalidReason: "preExposureTechnicalFailure",
    });
  });

  it("consumes exposed words but keeps a failed captured trial away from QUEST", () => {
    expect(
      resolveRsvpSpeechTrialValidity({
        responseMode: "automaticSpeech",
        runtimeStatus: "failed",
        captureStarted: true,
        registeredResponseCount: 0,
        expectedResponseCount: 3,
      }),
    ).toEqual({
      validForQuest: false,
      consumeTargetWords: true,
      invalidReason: "postExposureTechnicalFailure",
    });
  });

  it("requires one registered response for every target after STT completes", () => {
    expect(
      resolveRsvpSpeechTrialValidity({
        responseMode: "automaticSpeech",
        runtimeStatus: "completed",
        captureStarted: true,
        registeredResponseCount: 0,
        expectedResponseCount: 3,
      }).validForQuest,
    ).toBe(false);
    expect(
      resolveRsvpSpeechTrialValidity({
        responseMode: "automaticSpeech",
        runtimeStatus: "completed",
        captureStarted: true,
        registeredResponseCount: 3,
        expectedResponseCount: 3,
      }),
    ).toEqual({ validForQuest: true, consumeTargetWords: true });
  });
});
