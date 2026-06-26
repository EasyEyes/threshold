import { selectPhraseSource } from "../preprocess/selectPhraseSource";

// Minimal File-like; the selector only reads `.name`.
const f = (name: string): File => ({ name }) as unknown as File;

describe("selectPhraseSource — precedence", () => {
  it("uses an in-memory file whose name matches the request (non-archive)", () => {
    const file = f("DenisLanguage.phrases.xlsx");
    const decision = selectPhraseSource("DenisLanguage.phrases.xlsx", false, [
      file,
    ]);
    expect(decision).toEqual({ kind: "use", file });
  });

  it("returns 'none' when no phrase file is requested", () => {
    expect(selectPhraseSource("", false, [])).toEqual({ kind: "none" });
  });

  it("requests a repo fetch when the file is absent in memory (non-archive)", () => {
    expect(selectPhraseSource("DenisLanguage.phrases.xlsx", false, [])).toEqual(
      { kind: "fetch", name: "DenisLanguage.phrases.xlsx" },
    );
  });

  it("never falls back to a repo fetch for an archive compile (exclusive)", () => {
    expect(selectPhraseSource("DenisLanguage.phrases.xlsx", true, [])).toEqual({
      kind: "missing",
    });
  });

  it("uses the bundled file for an archive compile when present", () => {
    const file = f("DenisLanguage.phrases.xlsx");
    expect(
      selectPhraseSource("DenisLanguage.phrases.xlsx", true, [file]),
    ).toEqual({ kind: "use", file });
  });
});
