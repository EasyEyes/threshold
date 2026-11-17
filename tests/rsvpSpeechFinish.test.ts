import {
  stripRsvpSpeechFinishPhrase,
  hasAllRsvpSpeechTargets,
} from "../components/rsvpSpeech/rsvpSpeechFinish";

describe("RSVP spoken finish phrases", () => {
  it.each([
    "don't know",
    "dont know",
    "don’t know",
    "do not know",
    "dont no",
    "dunno",
  ])(
    "recognizes the bounded English variant %s and preserves preceding answers",
    (phrase) => {
      expect(
        stripRsvpSpeechFinishPhrase(`cat dog I ${phrase}.`, "en-US"),
      ).toEqual({ text: "cat dog", finished: true });
    },
  );
  it("does not match a phrase in the middle of speech or fuzzy target words", () => {
    expect(stripRsvpSpeechFinishPhrase("don't know cat", "en").finished).toBe(
      false,
    );
    expect(stripRsvpSpeechFinishPhrase("donut snow", "en").finished).toBe(
      false,
    );
    expect(stripRsvpSpeechFinishPhrase("know", "en").finished).toBe(false);
  });
  it("supports custom localized phrases and disabling the command", () => {
    expect(
      stripRsvpSpeechFinishPhrase("کتاب نمی‌دانم", "fa", "نمی‌دانم"),
    ).toEqual({ text: "کتاب", finished: true });
    expect(
      stripRsvpSpeechFinishPhrase("cat don't know", "en", "").finished,
    ).toBe(false);
  });
  it("uses the scoring policy rather than counting recognized words", () => {
    const targets = ["cat", "dog", "fish"];
    expect(
      hasAllRsvpSpeechTargets("cat wrong other", targets, "en", true),
    ).toBe(false);
    expect(hasAllRsvpSpeechTargets("dog cat fish", targets, "en", true)).toBe(
      true,
    );
    expect(hasAllRsvpSpeechTargets("dog cat fish", targets, "en", false)).toBe(
      false,
    );
  });
});
