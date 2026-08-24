import {
  normalizeSpeechToken,
  tokenizeSpeechTranscript,
} from "../components/speech/textNormalization";

describe("speech text normalization", () => {
  it("normalizes English case and punctuation without removing lexical marks", () => {
    const tokenization = tokenizeSpeechTranscript(
      "DOG, cat! Don\u2019t co\u2011operate.",
      "en-US",
    );

    expect(tokenization.profileId).toBe("en");
    expect(tokenization.tokens.map((token) => token.normalized)).toEqual([
      "dog",
      "cat",
      "don't",
      "co-operate",
    ]);
  });

  it("keeps Persian ZWNJ for audit while ignoring it during comparison", () => {
    const withZwnj = normalizeSpeechToken(
      "\u0645\u06CC\u200C\u0631\u0648\u062F",
      "fa-IR",
    );
    const withoutZwnj = normalizeSpeechToken(
      "\u0645\u06CC\u0631\u0648\u062F",
      "fa",
    );

    expect(withZwnj.normalized).toBe("\u0645\u06CC\u200C\u0631\u0648\u062F");
    expect(withZwnj.comparisonKey).toBe("\u0645\u06CC\u0631\u0648\u062F");
    expect(withZwnj.comparisonKey).toBe(withoutZwnj.comparisonKey);
  });

  it("normalizes Persian Arabic-codepoint variants, tatweel, and diacritics", () => {
    const token = normalizeSpeechToken(
      "\u0643\u0650\u0640\u062A\u0627\u0628\u064A",
      "fas",
    );

    expect(token.normalized).toBe("\u06A9\u062A\u0627\u0628\u06CC");
    expect(token.profileId).toBe("fa");
  });

  it("keeps Persian spelling distinct while exposing phonetic evidence", () => {
    const target = normalizeSpeechToken("\u0635\u0628\u0631", "fa");
    const providerSpelling = normalizeSpeechToken("\u062B\u0628\u0631", "fa");

    expect(target.comparisonKey).not.toBe(providerSpelling.comparisonKey);
    expect(target.phoneticKeys).toEqual(providerSpelling.phoneticKeys);
  });

  it("does not invent phonetic evidence for English", () => {
    expect(normalizeSpeechToken("sea", "en").phoneticKeys).toEqual([]);
  });

  it("keeps Persian words separated by ordinary whitespace as separate tokens", () => {
    const tokenization = tokenizeSpeechTranscript(
      "\u0645\u06CC \u0631\u0648\u062F",
      "fa",
    );

    expect(tokenization.tokens.map((token) => token.normalized)).toEqual([
      "\u0645\u06CC",
      "\u0631\u0648\u062F",
    ]);
  });

  it("treats visible whitespace around an existing ZWNJ as formatting noise", () => {
    const tokenization = tokenizeSpeechTranscript(
      "\u0645\u06CC \u200C \u0631\u0648\u062F",
      "fa",
    );

    expect(tokenization.tokens).toHaveLength(1);
    expect(tokenization.tokens[0].normalized).toBe(
      "\u0645\u06CC\u200C\u0631\u0648\u062F",
    );
  });

  it("uses a separate conservative Arabic profile", () => {
    const token = normalizeSpeechToken("\u06CC\u06A9\u0629\u0622", "ar-SA");

    expect(token.profileId).toBe("ar");
    expect(token.normalized).toBe("\u064A\u0643\u0629\u0622");
  });

  it("splits Arabic-script punctuation boundaries", () => {
    const tokenization = tokenizeSpeechTranscript(
      "\u0633\u0644\u0627\u0645\u060C\u062F\u0646\u06CC\u0627",
      "fa",
    );

    expect(tokenization.tokens.map((token) => token.normalized)).toEqual([
      "\u0633\u0644\u0627\u0645",
      "\u062F\u0646\u06CC\u0627",
    ]);
  });
});
