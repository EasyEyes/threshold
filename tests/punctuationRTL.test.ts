/**
 * Tests for fontPunctuationRTL — RTL punctuation handling for canvas-rendered
 * text (Arabic/Urdu/Persian).
 *
 * These tests target the pure transform module directly. TextStim.getText()
 * delegates to applyPunctuationRTL(this._text) with no explicit mode, so the
 * "module-state via setPunctuationRTL" tests below validate the exact wiring
 * contract that the render path relies on. No canvas / no TextStim instance.
 *
 * Spec (per Denis Pelli, 2026-07):
 *   - default "none" => no-op (ZERO behavior change unless opted in)
 * All three are FINAL-ONLY: "final" = followed by whitespace or
 * end-of-string. This leaves embedded punctuation untouched (a,b,c / 3.14 /
 * 1,000 / a;b all unchanged), matching the glossary spec.
 *   - Comma   "," (U+002C) => REPLACED with Arabic comma ، (U+060C)
 *   - Semicolon ";" (U+003B) => REPLACED with Arabic semicolon ؛ (U+061B)
 *   - Period  "." (U+002E) => RTL mark (RLM U+200F or ALM U+061C) appended.
 * No Arabic period exists, so the period keeps the mark; comma/semicolon are
 * replaced (mark-after failed empirically for the comma, likely font glyph
 * positioning).
 *
 * Why comma/semicolon are replaced but period is marked: the mark-after approach
 * worked for the period (bidi class CS) but empirically FAILED for the comma
 * (also CS — the reason is unexplained, likely font glyph positioning). The Arabic
 * comma ، (U+060C) and semicolon ؛ (U+061B) are the agreed RTL substitutes.
 *
 * @jest-environment node
 */
import {
  applyPunctuationRTL,
  setPunctuationRTL,
  getPunctuationRTL,
} from "../psychojs/src/visual/punctuationRTL.js";

const RLM = "\u200F";
const ALM = "\u061C";
const ARABIC_COMMA = "\u060C"; // ،
const ARABIC_SEMICOLON = "\u061B"; // ؛

beforeEach(() => setPunctuationRTL("none"));

// ---------------------------------------------------------------------------
// Safety: default mode is "none" (no behavior change unless opted in)
// ---------------------------------------------------------------------------
describe("default mode", () => {
  test("initial mode is 'none'", () => {
    expect(getPunctuationRTL()).toBe("none");
  });

  test("'none' leaves text unchanged (the no-op guarantee)", () => {
    expect(applyPunctuationRTL("Hello. World, done; ok", "none")).toBe(
      "Hello. World, done; ok",
    );
  });

  test("explicit 'none' beats a previously-set non-none mode", () => {
    setPunctuationRTL("ALM");
    expect(applyPunctuationRTL("Hi.", "none")).toBe("Hi.");
  });

  test("unset mode (uses module default 'none') leaves text unchanged", () => {
    expect(applyPunctuationRTL("Hi.")).toBe("Hi.");
  });
});

// ---------------------------------------------------------------------------
// Mode normalization: garbage => "none" (defensive)
// ---------------------------------------------------------------------------
describe("mode normalization", () => {
  test("'RLM' is accepted", () => {
    setPunctuationRTL("RLM");
    expect(getPunctuationRTL()).toBe("RLM");
  });

  test("'ALM' is accepted", () => {
    setPunctuationRTL("ALM");
    expect(getPunctuationRTL()).toBe("ALM");
  });

  test("lowercase 'rlm' is treated as none (spec values are case-sensitive)", () => {
    setPunctuationRTL("rlm");
    expect(getPunctuationRTL()).toBe("none");
    expect(applyPunctuationRTL("Hi.")).toBe("Hi.");
  });

  test("undefined => none", () => {
    setPunctuationRTL(undefined);
    expect(getPunctuationRTL()).toBe("none");
  });

  test("empty string => none", () => {
    setPunctuationRTL("");
    expect(getPunctuationRTL()).toBe("none");
  });

  test("arbitrary string => none", () => {
    setPunctuationRTL("RTL");
    expect(getPunctuationRTL()).toBe("none");
    expect(applyPunctuationRTL("Hi.")).toBe("Hi.");
  });
});

// ---------------------------------------------------------------------------
// PERIOD: mark after final only (unchanged from v1 — works per Denis)
// ---------------------------------------------------------------------------
describe("period — RTL mark after final periods", () => {
  test("period at end of string (RLM)", () => {
    expect(applyPunctuationRTL("Hello.", "RLM")).toBe(`Hello.${RLM}`);
  });

  test("period at end of string (ALM)", () => {
    expect(applyPunctuationRTL("Hello.", "ALM")).toBe(`Hello.${ALM}`);
  });

  test("period followed by space then more text", () => {
    expect(applyPunctuationRTL("Hello. World", "RLM")).toBe(
      `Hello.${RLM} World`,
    );
  });

  test("two final periods both marked", () => {
    expect(applyPunctuationRTL("Hello. World.", "RLM")).toBe(
      `Hello.${RLM} World.${RLM}`,
    );
  });

  test("period followed by newline (multi-line stim text)", () => {
    expect(applyPunctuationRTL("Line one.\nLine two.", "RLM")).toBe(
      `Line one.${RLM}\nLine two.${RLM}`,
    );
  });

  test("period followed by tab", () => {
    expect(applyPunctuationRTL("a.\tb", "RLM")).toBe(`a.${RLM}\tb`);
  });

  test("RLM and ALM differ only in the inserted codepoint", () => {
    const r = applyPunctuationRTL("Hi.", "RLM");
    const a = applyPunctuationRTL("Hi.", "ALM");
    expect(r.length).toBe(a.length);
    expect(r.charAt(3)).toBe(RLM);
    expect(a.charAt(3)).toBe(ALM);
  });

  test("decimal point: '3.14' unchanged (not final)", () => {
    expect(applyPunctuationRTL("3.14", "RLM")).toBe("3.14");
  });

  test("period embedded mid-token 'file.txt' unchanged", () => {
    expect(applyPunctuationRTL("file.txt", "RLM")).toBe("file.txt");
  });

  test("lone period '.'", () => {
    expect(applyPunctuationRTL(".", "RLM")).toBe(`.${RLM}`);
  });

  test("only whitespace after period still marks", () => {
    expect(applyPunctuationRTL("Hi. ", "RLM")).toBe(`Hi.${RLM} `);
  });
});

// ---------------------------------------------------------------------------
// COMMA: replaced everywhere with Arabic comma ، (U+060C), no mark
// (mark-after failed empirically; Arabic comma is the agreed substitute)
// ---------------------------------------------------------------------------
describe("comma — replaced with Arabic comma ، (final only)", () => {
  test("comma followed by space", () => {
    expect(applyPunctuationRTL("a, b", "RLM")).toBe(`a${ARABIC_COMMA} b`);
  });

  test("comma at end of string", () => {
    expect(applyPunctuationRTL("done,", "RLM")).toBe(`done${ARABIC_COMMA}`);
  });

  test("comma list: 'a,b,c' unchanged (no final commas)", () => {
    expect(applyPunctuationRTL("a,b,c", "RLM")).toBe("a,b,c");
  });

  test("digit-group comma '1,000' unchanged (not final)", () => {
    // Per the glossary: embedded punctuation in numbers is left untouched.
    expect(applyPunctuationRTL("1,000", "RLM")).toBe("1,000");
  });

  test("decimal-comma '3,14' unchanged (not final)", () => {
    expect(applyPunctuationRTL("3,14", "RLM")).toBe("3,14");
  });

  test("comma between two words with no space 'a,b' unchanged", () => {
    expect(applyPunctuationRTL("a,b", "RLM")).toBe("a,b");
  });

  test("lone comma ',' (final: end of string)", () => {
    expect(applyPunctuationRTL(",", "RLM")).toBe(ARABIC_COMMA);
  });

  test("no mark appended after the Arabic comma", () => {
    // The replacement produces ، with NO trailing zero-width mark.
    expect(applyPunctuationRTL("a, b", "ALM")).not.toContain(ALM);
    expect(applyPunctuationRTL("a, b", "ALM")).not.toContain(RLM);
  });

  test("existing Arabic comma ، is left as-is (no mark added)", () => {
    expect(applyPunctuationRTL("كلمة، كلمة", "RLM")).toBe("كلمة، كلمة");
  });

  test("existing Arabic comma at end of string is left as-is", () => {
    expect(applyPunctuationRTL("كلمة،", "RLM")).toBe("كلمة،");
  });
});

// ---------------------------------------------------------------------------
// SEMICOLON: replaced everywhere with Arabic semicolon ؛ (U+061B), no mark
// ---------------------------------------------------------------------------
describe("semicolon — replaced with Arabic semicolon ؛ (final only)", () => {
  test("semicolon followed by space", () => {
    expect(applyPunctuationRTL("a; b", "RLM")).toBe(`a${ARABIC_SEMICOLON} b`);
  });

  test("semicolon at end of string", () => {
    expect(applyPunctuationRTL("done;", "RLM")).toBe(`done${ARABIC_SEMICOLON}`);
  });

  test("semicolon between letters 'a;b' unchanged (not final)", () => {
    expect(applyPunctuationRTL("a;b", "RLM")).toBe("a;b");
  });

  test("lone semicolon ';' (final: end of string)", () => {
    expect(applyPunctuationRTL(";", "RLM")).toBe(ARABIC_SEMICOLON);
  });

  test("two final semicolons both replaced", () => {
    expect(applyPunctuationRTL("a; b; c", "RLM")).toBe(
      `a${ARABIC_SEMICOLON} b${ARABIC_SEMICOLON} c`,
    );
  });

  test("no mark appended after the Arabic semicolon", () => {
    expect(applyPunctuationRTL("a; b", "ALM")).not.toContain(ALM);
    expect(applyPunctuationRTL("a; b", "ALM")).not.toContain(RLM);
  });

  test("existing Arabic semicolon ؛ is left as-is (no mark added)", () => {
    expect(applyPunctuationRTL("كلمة؛ كلمة", "RLM")).toBe("كلمة؛ كلمة");
  });
});

// ---------------------------------------------------------------------------
// Out of scope punctuation (must NOT be touched)
// ---------------------------------------------------------------------------
describe("must NOT touch other punctuation", () => {
  test("question mark '?' is NOT touched", () => {
    expect(applyPunctuationRTL("Why?", "RLM")).toBe("Why?");
  });

  test("exclamation '!' is NOT touched", () => {
    expect(applyPunctuationRTL("Wow!", "RLM")).toBe("Wow!");
  });

  test("colon ':' is NOT touched", () => {
    expect(applyPunctuationRTL("a: b", "RLM")).toBe("a: b");
  });
});

// ---------------------------------------------------------------------------
// Idempotency — re-running is a no-op.
// This is the contract readingAddons.js getWidestTextWidth relies on
// (it does getText() -> setText(oldText) round-trips).
// ---------------------------------------------------------------------------
describe("idempotency", () => {
  test("RLM: double-application == single application", () => {
    setPunctuationRTL("RLM");
    const once = applyPunctuationRTL("Hello. World, done.");
    const twice = applyPunctuationRTL(once);
    expect(twice).toBe(once);
    // Comma replaced → ،; final periods marked → .\u200F
    expect(twice).toBe(`Hello.${RLM} World${ARABIC_COMMA} done.${RLM}`);
  });

  test("ALM: double-application == single application", () => {
    setPunctuationRTL("ALM");
    const once = applyPunctuationRTL("Hello. World, done; ok.");
    const twice = applyPunctuationRTL(once);
    expect(twice).toBe(once);
    expect(twice).toBe(
      `Hello.${ALM} World${ARABIC_COMMA} done${ARABIC_SEMICOLON} ok.${ALM}`,
    );
  });

  test("a string already containing a stray RLM is not corrupted", () => {
    setPunctuationRTL("RLM");
    // period already followed by RLM => not re-marked
    expect(applyPunctuationRTL(`Hi.${RLM}`)).toBe(`Hi.${RLM}`);
  });

  test("Arabic comma/semicolon are not re-touched on second pass", () => {
    setPunctuationRTL("ALM");
    const once = applyPunctuationRTL("a, b; c.");
    const twice = applyPunctuationRTL(once);
    expect(twice).toBe(once);
    expect(twice).toBe(`a${ARABIC_COMMA} b${ARABIC_SEMICOLON} c.${ALM}`);
  });
});

// ---------------------------------------------------------------------------
// Module-state wiring contract (what TextStim.getText depends on)
// ---------------------------------------------------------------------------
describe("module-state wiring", () => {
  test("applyPunctuationRTL with no explicit mode uses the module mode", () => {
    setPunctuationRTL("ALM");
    expect(applyPunctuationRTL("Hi.")).toBe(`Hi.${ALM}`);
  });

  test("comma/semicolon replacement applies under the module mode", () => {
    setPunctuationRTL("RLM");
    expect(applyPunctuationRTL("a, b; c.")).toBe(
      `a${ARABIC_COMMA} b${ARABIC_SEMICOLON} c.${RLM}`,
    );
  });

  test("resetting to 'none' disables all transforms", () => {
    setPunctuationRTL("ALM");
    applyPunctuationRTL("Hi.");
    setPunctuationRTL("none");
    expect(applyPunctuationRTL("a, b; c.")).toBe("a, b; c.");
  });
});

// ---------------------------------------------------------------------------
// Defensive inputs
// ---------------------------------------------------------------------------
describe("defensive inputs", () => {
  test("empty string unchanged", () => {
    expect(applyPunctuationRTL("", "RLM")).toBe("");
  });

  test("null unchanged", () => {
    expect(applyPunctuationRTL(null, "RLM")).toBeNull();
  });

  test("undefined unchanged", () => {
    expect(applyPunctuationRTL(undefined, "RLM")).toBeUndefined();
  });

  test("string with no punctuation unchanged", () => {
    expect(applyPunctuationRTL("just words", "RLM")).toBe("just words");
  });
});

// ---------------------------------------------------------------------------
// Realistic Arabic/Urdu/Persian reading-text fragments
// ---------------------------------------------------------------------------
describe("realistic RTL passages", () => {
  test("Arabic sentence ending in period", () => {
    const s = "هذا اختبار.";
    expect(applyPunctuationRTL(s, "ALM")).toBe(`هذا اختبار.${ALM}`);
  });

  test("Arabic with ASCII comma + space → Arabic comma", () => {
    const s = "كلمة, كلمة";
    expect(applyPunctuationRTL(s, "ALM")).toBe(`كلمة${ARABIC_COMMA} كلمة`);
  });

  test("Arabic with ASCII semicolon → Arabic semicolon", () => {
    const s = "كلمة; كلمة";
    expect(applyPunctuationRTL(s, "ALM")).toBe(`كلمة${ARABIC_SEMICOLON} كلمة`);
  });

  test("mixed: English number 3.14 inside Arabic passage — dot unchanged", () => {
    const s = "النسبة 3.14 جيدة.";
    expect(applyPunctuationRTL(s, "ALM")).toBe(`النسبة 3.14 جيدة.${ALM}`);
  });

  test("paragraph with embedded LTR token stays correct", () => {
    const s = "استخدمت ChatGPT اليوم.";
    expect(applyPunctuationRTL(s, "RLM")).toBe(`استخدمت ChatGPT اليوم.${RLM}`);
  });

  test("mixed comma + semicolon + period in one passage", () => {
    const s = "كلمة, كلمة; كلمة.";
    expect(applyPunctuationRTL(s, "ALM")).toBe(
      `كلمة${ARABIC_COMMA} كلمة${ARABIC_SEMICOLON} كلمة.${ALM}`,
    );
  });
});
