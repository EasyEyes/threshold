import {
  alignSpeechTokensToTargets,
  characterSimilarity,
} from "../components/speech/tokenAlignment";
import {
  normalizeSpeechToken,
  tokenizeSpeechTranscript,
} from "../components/speech/textNormalization";

const targets = (words: readonly string[], language = "en") =>
  words.map((word) => normalizeSpeechToken(word, language));

const transcript = (text: string, language = "en") =>
  tokenizeSpeechTranscript(text, language).tokens;

describe("position-aware speech token alignment", () => {
  it("aligns an exact ordered response", () => {
    const result = alignSpeechTokensToTargets(
      targets(["dog", "cat", "book"]),
      transcript("dog cat book"),
    );

    expect(result.events.map((event) => event.operation)).toEqual([
      "match",
      "match",
      "match",
    ]);
    expect(result.totalCost).toBe(0);
  });

  it("keeps unrelated fillers as insertions without shifting later matches", () => {
    const result = alignSpeechTokensToTargets(
      targets(["dog", "cat", "book"]),
      transcript("dog um cat book"),
    );

    expect(result.events.map((event) => event.operation)).toEqual([
      "match",
      "insertion",
      "match",
      "match",
    ]);
  });

  it("treats target words spoken at another position as substitutions", () => {
    const result = alignSpeechTokensToTargets(
      targets(["dog", "cat", "book"]),
      transcript("cat dog book"),
    );

    expect(
      result.events.map((event) => [event.operation, event.matchKind]),
    ).toEqual([
      ["substitution", "outOfOrderTarget"],
      ["substitution", "outOfOrderTarget"],
      ["match", "exact"],
    ]);
  });

  it("represents a missing target as an omission", () => {
    const result = alignSpeechTokensToTargets(
      targets(["dog", "cat", "book"]),
      transcript("dog book"),
    );

    expect(result.events.map((event) => event.operation)).toEqual([
      "match",
      "omission",
      "match",
    ]);
  });

  it("keeps the leftmost exact occurrence and emits a trailing duplicate", () => {
    const result = alignSpeechTokensToTargets(
      targets(["dog", "cat", "book"]),
      transcript("dog dog cat book"),
    );

    expect(
      result.events.map((event) => [
        event.operation,
        event.targetIndex,
        event.transcriptIndices[0],
      ]),
    ).toEqual([
      ["match", 0, 0],
      ["insertion", null, 1],
      ["match", 1, 2],
      ["match", 2, 3],
    ]);
  });

  it("matches one Persian target against provider-split ZWNJ parts", () => {
    const result = alignSpeechTokensToTargets(
      targets(["\u0645\u06CC\u200C\u0631\u0648\u062F"], "fa"),
      transcript("\u0645\u06CC \u0631\u0648\u062F", "fa"),
    );

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      operation: "match",
      matchKind: "joinedTranscript",
      transcriptIndices: [0, 1],
    });
  });

  it("repairs a common Persian prefix boundary when the source omitted ZWNJ", () => {
    const result = alignSpeechTokensToTargets(
      targets(["\u0645\u06CC\u0631\u0648\u062F"], "fa"),
      transcript("\u0645\u06CC \u0631\u0648\u062F", "fa"),
    );

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      operation: "match",
      matchKind: "joinedTranscript",
      boundaryMatchKind: "persianAffixBoundary",
      transcriptIndices: [0, 1],
    });
  });

  it("repairs a common Persian suffix boundary when the source omitted ZWNJ", () => {
    const result = alignSpeechTokensToTargets(
      targets(["\u06A9\u062A\u0627\u0628\u0647\u0627"], "fa"),
      transcript("\u06A9\u062A\u0627\u0628 \u0647\u0627", "fa"),
    );

    expect(result.events[0]).toMatchObject({
      operation: "match",
      boundaryMatchKind: "persianAffixBoundary",
    });
  });

  it("does not merge ordinary Persian words when the target has no ZWNJ", () => {
    const result = alignSpeechTokensToTargets(
      targets(["\u06A9\u062A\u0627\u0628\u062E\u0627\u0646\u0647"], "fa"),
      transcript("\u06A9\u062A\u0627\u0628 \u062E\u0627\u0646\u0647", "fa"),
    );

    expect(result.events.some((event) => event.operation === "match")).toBe(
      false,
    );
  });

  it("maps one merged Persian STT token to adjacent target positions", () => {
    const result = alignSpeechTokensToTargets(
      targets(
        [
          "\u06A9\u062A\u0627\u0628",
          "\u062E\u0627\u0646\u0647",
          "\u0639\u062F\u0633",
        ],
        "fa",
      ),
      transcript(
        "\u06A9\u062A\u0627\u0628\u062E\u0627\u0646\u0647 \u0639\u062F\u0633",
        "fa",
      ),
    );

    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      operation: "match",
      matchKind: "mergedTargets",
      targetIndex: 0,
      targetIndices: [0, 1],
      transcriptIndices: [0],
    });
    expect(result.events[1]).toMatchObject({
      operation: "match",
      matchKind: "exact",
      targetIndices: [2],
    });
  });

  it("prefers an exact Persian target over a competing concatenated span", () => {
    const result = alignSpeechTokensToTargets(
      targets(
        [
          "\u06A9\u062A\u0627\u0628",
          "\u062E\u0627\u0646\u0647",
          "\u06A9\u062A\u0627\u0628\u062E\u0627\u0646\u0647",
        ],
        "fa",
      ),
      transcript("\u06A9\u062A\u0627\u0628\u062E\u0627\u0646\u0647", "fa"),
    );

    expect(
      result.events.some((event) => event.matchKind === "mergedTargets"),
    ).toBe(false);
    expect(result.events.at(-1)).toMatchObject({
      operation: "match",
      matchKind: "exact",
      targetIndices: [2],
    });
  });

  it("does not concatenate adjacent English targets", () => {
    const result = alignSpeechTokensToTargets(
      targets(["cat", "dog"], "en"),
      transcript("catdog", "en"),
    );

    expect(
      result.events.some((event) => event.matchKind === "mergedTargets"),
    ).toBe(false);
    expect(result.events.some((event) => event.operation === "match")).toBe(
      false,
    );
  });

  it("uses Persian phonetic equivalence as a substitution diagnostic only", () => {
    const result = alignSpeechTokensToTargets(
      targets(["\u0635\u0628\u0631"], "fa"),
      transcript("\u062B\u0628\u0631", "fa"),
    );

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      operation: "substitution",
      matchKind: "phoneticCandidate",
    });
  });

  it("does not force an unrelated word onto a target", () => {
    const result = alignSpeechTokensToTargets(
      targets(["cat"]),
      transcript("fish"),
    );

    expect(result.events.map((event) => event.operation).sort()).toEqual([
      "insertion",
      "omission",
    ]);
  });

  it("computes Unicode-aware character similarity", () => {
    expect(characterSimilarity("cat", "cot")).toBeCloseTo(2 / 3);
    expect(
      characterSimilarity("\u06A9\u062A\u0627\u0628", "\u06A9\u062A\u0628"),
    ).toBe(0.75);
  });
});
