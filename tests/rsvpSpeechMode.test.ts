import {
  RsvpReadingResponseModeConfigurationError,
  getRsvpReadingQuestionResponseType,
  isRsvpReadingAutomaticSpeechResponseMode,
  isRsvpReadingExperimenterResponseMode,
  isRsvpReadingMatrixResponseMode,
  resolveRsvpReadingBlockResponseModes,
  resolveRsvpReadingResponseMode,
} from "../components/rsvpSpeech/rsvpSpeechMode";

describe("resolveRsvpReadingResponseMode", () => {
  it("preserves the existing matrix response mode", () => {
    expect(
      resolveRsvpReadingResponseMode({
        responseSpokenBool: false,
        responseSpokenToExperimenterBool: false,
      }),
    ).toBe("silent");
  });

  it("preserves the existing human experimenter response mode", () => {
    expect(
      resolveRsvpReadingResponseMode({
        responseSpokenBool: false,
        responseSpokenToExperimenterBool: true,
      }),
    ).toBe("spoken");
  });

  it("selects automatic speech recognition independently", () => {
    expect(
      resolveRsvpReadingResponseMode({
        responseSpokenBool: true,
        responseSpokenToExperimenterBool: false,
      }),
    ).toBe("automaticSpeech");
  });

  it("rejects simultaneous automatic and human-scored speech", () => {
    expect(() =>
      resolveRsvpReadingResponseMode({
        responseSpokenBool: true,
        responseSpokenToExperimenterBool: true,
      }),
    ).toThrow(RsvpReadingResponseModeConfigurationError);
  });

  it.each([
    ["responseSpokenBool", "true", false],
    ["responseSpokenToExperimenterBool", false, "true"],
  ])("rejects a non-Boolean %s value", (_, responseSpoken, experimenter) => {
    expect(() =>
      resolveRsvpReadingResponseMode({
        responseSpokenBool: responseSpoken as unknown as boolean,
        responseSpokenToExperimenterBool: experimenter as unknown as boolean,
      }),
    ).toThrow(RsvpReadingResponseModeConfigurationError);
  });
});

describe("resolveRsvpReadingBlockResponseModes", () => {
  it("preserves condition order in a mixed four-condition RSVP block", () => {
    expect(
      resolveRsvpReadingBlockResponseModes({
        responseSpokenBool: [false, true, false, true],
        responseSpokenToExperimenterBool: [false, false, true, false],
      }),
    ).toEqual(["silent", "automaticSpeech", "spoken", "automaticSpeech"]);
  });

  it("does not retain mode state between repeated trial resolutions", () => {
    const automaticCondition = {
      responseSpokenBool: true,
      responseSpokenToExperimenterBool: false,
    };
    const matrixCondition = {
      responseSpokenBool: false,
      responseSpokenToExperimenterBool: false,
    };

    expect(
      Array.from({ length: 20 }, () =>
        resolveRsvpReadingResponseMode(automaticCondition),
      ),
    ).toEqual(Array(20).fill("automaticSpeech"));
    expect(resolveRsvpReadingResponseMode(matrixCondition)).toBe("silent");
  });

  it("rejects block parameter arrays with different condition counts", () => {
    expect(() =>
      resolveRsvpReadingBlockResponseModes({
        responseSpokenBool: [false, true],
        responseSpokenToExperimenterBool: [false],
      }),
    ).toThrow(RsvpReadingResponseModeConfigurationError);
  });

  it("rejects a non-Boolean condition without affecting adjacent modes", () => {
    expect(() =>
      resolveRsvpReadingBlockResponseModes({
        responseSpokenBool: [false, "true", false] as unknown as boolean[],
        responseSpokenToExperimenterBool: [false, false, true],
      }),
    ).toThrow(RsvpReadingResponseModeConfigurationError);
  });
});

describe("RSVP response-mode capabilities", () => {
  it("keeps choice foils only in the existing matrix mode", () => {
    expect(getRsvpReadingQuestionResponseType("silent")).toBe("silent");
    expect(getRsvpReadingQuestionResponseType("spoken")).toBe("spoken");
    expect(getRsvpReadingQuestionResponseType("automaticSpeech")).toBe(
      "spoken",
    );
  });

  it("keeps matrix, human scoring, and automatic speech mutually exclusive", () => {
    expect(isRsvpReadingMatrixResponseMode("silent")).toBe(true);
    expect(isRsvpReadingMatrixResponseMode("spoken")).toBe(false);
    expect(isRsvpReadingMatrixResponseMode("automaticSpeech")).toBe(false);

    expect(isRsvpReadingExperimenterResponseMode("silent")).toBe(false);
    expect(isRsvpReadingExperimenterResponseMode("spoken")).toBe(true);
    expect(isRsvpReadingExperimenterResponseMode("automaticSpeech")).toBe(
      false,
    );

    expect(isRsvpReadingAutomaticSpeechResponseMode("silent")).toBe(false);
    expect(isRsvpReadingAutomaticSpeechResponseMode("spoken")).toBe(false);
    expect(isRsvpReadingAutomaticSpeechResponseMode("automaticSpeech")).toBe(
      true,
    );
  });
});
