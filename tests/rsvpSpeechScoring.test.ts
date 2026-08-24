import {
  RsvpSpeechScoringError,
  scoreRsvpSpeechResponse,
  type RsvpSpeechScoringPolicy,
} from "../components/rsvpSpeech/rsvpSpeechScoring";

const policy = (
  overrides: Partial<RsvpSpeechScoringPolicy> = {},
): RsvpSpeechScoringPolicy => ({
  wordOrder: "strict",
  repetition: "ignore",
  selfCorrection: "accept",
  ...overrides,
});

const score = (
  transcript: string,
  overrides: Partial<RsvpSpeechScoringPolicy> = {},
) =>
  scoreRsvpSpeechResponse({
    targetWords: ["dog", "cat", "book"],
    transcript,
    languageCode: "en-US",
    policy: policy(overrides),
  });

describe("RSVP speech scoring", () => {
  it("returns the same ordered 0/1 payload shape expected by RSVP QUEST", () => {
    const result = score("dog cat book");

    expect(result.responseVector).toEqual([1, 1, 1]);
    expect(result.targetResults.map((target) => target.correct)).toEqual([
      1, 1, 1,
    ]);
  });

  it("ignores unrelated filler while retaining diagnostics", () => {
    const result = score("dog um cat book");

    expect(result.responseVector).toEqual([1, 1, 1]);
    expect(result.diagnostics.fillerCount).toBe(1);
    expect(result.diagnostics.insertionCount).toBe(1);
  });

  it("scores words at the wrong positions as incorrect in strict mode", () => {
    const result = score("cat dog book");

    expect(result.responseVector).toEqual([0, 0, 1]);
    expect(result.targetResults.map((target) => target.outcome)).toEqual([
      "outOfOrder",
      "outOfOrder",
      "correct",
    ]);
    expect(result.diagnostics.outOfOrderCount).toBe(2);
  });

  it("can accept the same unique targets in any order when policy permits", () => {
    const result = score("cat dog book", { wordOrder: "anyOrder" });

    expect(result.responseVector).toEqual([1, 1, 1]);
  });

  it("preserves target positions around an omission", () => {
    const result = score("dog book");

    expect(result.responseVector).toEqual([1, 0, 1]);
    expect(result.diagnostics.omissionCount).toBe(1);
  });

  it("supports both repetition policies without changing alignment", () => {
    const ignored = score("dog dog cat book");
    const rejected = score("dog dog cat book", {
      repetition: "markIncorrect",
    });

    expect(ignored.responseVector).toEqual([1, 1, 1]);
    expect(rejected.responseVector).toEqual([0, 1, 1]);
    expect(ignored.diagnostics.repetitionCount).toBe(1);
    expect(rejected.diagnostics.repetitionCount).toBe(1);
  });

  it("supports both self-correction policies", () => {
    const accepted = score("dog cot cat book");
    const rejected = score("dog cot cat book", {
      selfCorrection: "markIncorrect",
    });

    expect(accepted.responseVector).toEqual([1, 1, 1]);
    expect(rejected.responseVector).toEqual([1, 0, 1]);
    expect(accepted.diagnostics.selfCorrectionCount).toBe(1);
    expect(rejected.diagnostics.selfCorrectionCount).toBe(1);
  });

  it("does not guess that unrelated extra speech is a self-correction", () => {
    const result = score("dog fish no cat book");

    expect(result.responseVector).toEqual([1, 1, 1]);
    expect(result.diagnostics.selfCorrectionCount).toBe(0);
    expect(result.diagnostics.fillerCount).toBe(2);
  });

  it("records an early target word as out-of-order even if repeated later", () => {
    const result = score("cat dog cat book");

    expect(result.responseVector).toEqual([0, 1, 1]);
    expect(result.diagnostics.outOfOrderCount).toBe(1);
  });

  it("rejects an empty transcript so it cannot be scored as incorrect", () => {
    expect(() => score(" ")).toThrow(
      expect.objectContaining<Partial<RsvpSpeechScoringError>>({
        code: "emptyTranscript",
      }),
    );
  });

  it("scores Persian targets across a provider-created half-space boundary", () => {
    const result = scoreRsvpSpeechResponse({
      targetWords: [
        "\u0645\u06CC\u200C\u0631\u0648\u062F",
        "\u06A9\u062A\u0627\u0628",
        "\u062E\u0627\u0646\u0647",
      ],
      transcript:
        "\u0645\u06CC \u0631\u0648\u062F \u0643\u062A\u0627\u0628 \u062E\u0627\u0646\u0647",
      languageCode: "fa-IR",
      policy: policy(),
    });

    expect(result.responseVector).toEqual([1, 1, 1]);
    expect(result.diagnostics.languageProfile).toBe("fa");
    expect(
      result.diagnostics.events.some(
        (event) => event.matchKind === "joinedTranscript",
      ),
    ).toBe(true);
  });

  it("scores a missing Persian ZWNJ through an approved affix boundary", () => {
    const result = scoreRsvpSpeechResponse({
      targetWords: [
        "\u0645\u06CC\u0631\u0648\u062F",
        "\u06A9\u062A\u0627\u0628",
        "\u062E\u0627\u0646\u0647",
      ],
      transcript:
        "\u0645\u06CC \u0631\u0648\u062F \u06A9\u062A\u0627\u0628 \u062E\u0627\u0646\u0647",
      languageCode: "fa-IR",
      policy: policy(),
    });

    expect(result.responseVector).toEqual([1, 1, 1]);
    expect(result.diagnostics.splitTranscriptCount).toBe(1);
  });

  it("scores one merged Persian STT token across adjacent targets", () => {
    const result = scoreRsvpSpeechResponse({
      targetWords: [
        "\u06A9\u062A\u0627\u0628",
        "\u062E\u0627\u0646\u0647",
        "\u0639\u062F\u0633",
      ],
      transcript:
        "\u06A9\u062A\u0627\u0628\u062E\u0627\u0646\u0647 \u0639\u062F\u0633",
      languageCode: "fa-IR",
      policy: policy(),
    });

    expect(result.responseVector).toEqual([1, 1, 1]);
    expect(result.diagnostics.mergedTargetGroupCount).toBe(1);
    expect(result.targetResults[0].responseText).toBe(
      "\u06A9\u062A\u0627\u0628\u062E\u0627\u0646\u0647",
    );
    expect(result.targetResults[1].responseText).toBe(
      "\u06A9\u062A\u0627\u0628\u062E\u0627\u0646\u0647",
    );
  });

  it("applies repetition policy to every target represented by a merged token", () => {
    const baseInput = {
      targetWords: [
        "\u06A9\u062A\u0627\u0628",
        "\u062E\u0627\u0646\u0647",
        "\u0639\u062F\u0633",
      ],
      transcript:
        "\u06A9\u062A\u0627\u0628\u062E\u0627\u0646\u0647 \u06A9\u062A\u0627\u0628\u062E\u0627\u0646\u0647 \u0639\u062F\u0633",
      languageCode: "fa",
    } as const;
    const ignored = scoreRsvpSpeechResponse({
      ...baseInput,
      policy: policy(),
    });
    const rejected = scoreRsvpSpeechResponse({
      ...baseInput,
      policy: policy({ repetition: "markIncorrect" }),
    });

    expect(ignored.responseVector).toEqual([1, 1, 1]);
    expect(rejected.responseVector).toEqual([0, 0, 1]);
    expect(rejected.diagnostics.repetitionCount).toBe(1);
  });

  it("never reuses one Persian token for an exact target and a merged group", () => {
    const result = scoreRsvpSpeechResponse({
      targetWords: [
        "\u06A9\u062A\u0627\u0628",
        "\u062E\u0627\u0646\u0647",
        "\u06A9\u062A\u0627\u0628\u062E\u0627\u0646\u0647",
      ],
      transcript: "\u06A9\u062A\u0627\u0628\u062E\u0627\u0646\u0647",
      languageCode: "fa",
      policy: policy({ wordOrder: "anyOrder" }),
    });

    expect(result.responseVector).toEqual([0, 0, 1]);
    expect(result.diagnostics.mergedTargetGroupCount).toBe(0);
  });

  it("does not turn a Persian phonetic candidate into a correct response", () => {
    const result = scoreRsvpSpeechResponse({
      targetWords: [
        "\u0635\u0628\u0631",
        "\u06A9\u062A\u0627\u0628",
        "\u062E\u0627\u0646\u0647",
      ],
      transcript:
        "\u062B\u0628\u0631 \u06A9\u062A\u0627\u0628 \u062E\u0627\u0646\u0647",
      languageCode: "fa",
      policy: policy(),
    });

    expect(result.responseVector).toEqual([0, 1, 1]);
    expect(result.diagnostics.phoneticCandidateCount).toBe(1);
  });

  it("does not turn two ordinary Persian words into one correct target", () => {
    const result = scoreRsvpSpeechResponse({
      targetWords: [
        "\u06A9\u062A\u0627\u0628\u062E\u0627\u0646\u0647",
        "\u062F\u0631\u062E\u062A",
        "\u062E\u0627\u0646\u0647",
      ],
      transcript:
        "\u06A9\u062A\u0627\u0628 \u062E\u0627\u0646\u0647 \u062F\u0631\u062E\u062A \u062E\u0627\u0646\u0647",
      languageCode: "fa-IR",
      policy: policy(),
    });

    expect(result.responseVector).toEqual([0, 1, 1]);
  });

  it("scores repeated target positions allowed by the existing RSVP setting", () => {
    const result = scoreRsvpSpeechResponse({
      targetWords: ["dog", "dog", "book"],
      transcript: "dog dog book",
      languageCode: "en",
      policy: policy(),
    });

    expect(result.responseVector).toEqual([1, 1, 1]);
  });

  it("keeps one repeated target position omitted when only one occurrence is spoken", () => {
    const result = scoreRsvpSpeechResponse({
      targetWords: ["dog", "dog", "book"],
      transcript: "dog book",
      languageCode: "en",
      policy: policy(),
    });

    expect(result.responseVector.filter(Boolean)).toHaveLength(2);
    expect(result.responseVector[2]).toBe(1);
    expect(result.diagnostics.omissionCount).toBe(1);
  });

  it("handles targets that become equal after language normalization", () => {
    const result = scoreRsvpSpeechResponse({
      targetWords: [
        "\u0645\u06CC\u200C\u0631\u0648\u062F",
        "\u0645\u06CC\u0631\u0648\u062F",
      ],
      transcript:
        "\u0645\u06CC\u0631\u0648\u062F \u0645\u06CC\u0631\u0648\u062F",
      languageCode: "fa",
      policy: policy(),
    });

    expect(result.responseVector).toEqual([1, 1]);
  });

  it("fails fast instead of silently applying an unknown scientific policy", () => {
    expect(() =>
      scoreRsvpSpeechResponse({
        targetWords: ["dog", "cat", "book"],
        transcript: "dog cat book",
        languageCode: "en",
        policy: {
          ...policy(),
          wordOrder: "unknown" as RsvpSpeechScoringPolicy["wordOrder"],
        },
      }),
    ).toThrow("valid word-order policy");
  });
});
