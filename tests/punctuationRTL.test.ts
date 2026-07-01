/**
 * Tests for fontPunctuationRTL — the zero-width RTL mark insertion that
 * anchors final ASCII commas/periods as RTL for the Unicode bidi algorithm.
 *
 * These tests target the pure transform module directly. TextStim.getText()
 * delegates to applyPunctuationRTL(this._text) with no explicit mode, so the
 * "module-state via setPunctuationRTL" tests below validate the exact wiring
 * contract that the render path relies on. No canvas / no TextStim instance.
 *
 * Spec (EasyEyes glossary, "fontPunctuationRTL"):
 *   - default "none" => no-op (ZERO behavior change for existing experiments)
 *   - RLM (U+200F) or ALM (U+061C) inserted after each FINAL ASCII "," or "."
 *   - "final" = followed by whitespace OR end of string
 *   - only ASCII "," (U+002C) and "." (U+002E); Arabic comma "،" (U+060C)
 *     is already unambiguously RTL and must be left untouched
 *   - do NOT touch embedded punctuation: "3.14", "a,b,c" unchanged
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

beforeEach(() => setPunctuationRTL("none"));

// ---------------------------------------------------------------------------
// Safety: default mode is "none" (no behavior change unless opted in)
// ---------------------------------------------------------------------------
describe("default mode", () => {
  test("initial mode is 'none'", () => {
    expect(getPunctuationRTL()).toBe("none");
  });

  test("'none' leaves text unchanged (the no-op guarantee)", () => {
    expect(applyPunctuationRTL("Hello. World, done.", "none")).toBe(
      "Hello. World, done.",
    );
  });

  test("explicit 'none' beats a previously-set non-none mode", () => {
    setPunctuationRTL("ALM");
    expect(applyPunctuationRTL("Hi.", "none")).toBe("Hi.");
  });

  test("unset mode (uses module default 'none') leaves text unchanged", () => {
    // no setPunctuationRTL call this test (beforeEach reset to none)
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
// Core: RLM insertion
// ---------------------------------------------------------------------------
describe("RLM insertion", () => {
  test("period at end of string", () => {
    expect(applyPunctuationRTL("Hello.", "RLM")).toBe(`Hello.${RLM}`);
  });

  test("comma followed by space", () => {
    expect(applyPunctuationRTL("a, b", "RLM")).toBe(`a,${RLM} b`);
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

  test("comma at end of string", () => {
    expect(applyPunctuationRTL("done,", "RLM")).toBe(`done,${RLM}`);
  });

  test("period followed by newline (multi-line stim text)", () => {
    expect(applyPunctuationRTL("Line one.\nLine two.", "RLM")).toBe(
      `Line one.${RLM}\nLine two.${RLM}`,
    );
  });

  test("period followed by tab", () => {
    expect(applyPunctuationRTL("a.\tb", "RLM")).toBe(`a.${RLM}\tb`);
  });
});

// ---------------------------------------------------------------------------
// Core: ALM insertion (same behavior, different codepoint)
// ---------------------------------------------------------------------------
describe("ALM insertion", () => {
  test("period at end of string uses U+061C", () => {
    expect(applyPunctuationRTL("Hello.", "ALM")).toBe(`Hello.${ALM}`);
  });

  test("comma followed by space uses U+061C", () => {
    expect(applyPunctuationRTL("a, b", "ALM")).toBe(`a,${ALM} b`);
  });

  test("RLM and ALM differ only in the inserted codepoint", () => {
    const r = applyPunctuationRTL("Hi.", "RLM"); // "Hi." + RLM  (mark at idx 3)
    const a = applyPunctuationRTL("Hi.", "ALM"); // "Hi." + ALM
    expect(r.length).toBe(a.length);
    expect(r.charAt(3)).toBe(RLM);
    expect(a.charAt(3)).toBe(ALM);
  });
});

// ---------------------------------------------------------------------------
// Spec: ONLY ASCII "," and "." — embedded / non-ASCII punctuation untouched
// ---------------------------------------------------------------------------
describe("must NOT mark", () => {
  test("decimal point: '3.14' unchanged", () => {
    expect(applyPunctuationRTL("3.14", "RLM")).toBe("3.14");
  });

  test("comma list: 'a,b,c' unchanged", () => {
    expect(applyPunctuationRTL("a,b,c", "RLM")).toBe("a,b,c");
  });

  test("Arabic comma '،' (U+060C) is NOT marked (already RTL)", () => {
    expect(applyPunctuationRTL("كلمة، كلمة", "RLM")).toBe("كلمة، كلمة");
  });

  test("Arabic comma at end of string is NOT marked", () => {
    expect(applyPunctuationRTL("كلمة،", "RLM")).toBe("كلمة،");
  });

  test("question mark '?' is NOT touched (out of spec)", () => {
    expect(applyPunctuationRTL("Why?", "RLM")).toBe("Why?");
  });

  test("exclamation '!' is NOT touched (out of spec)", () => {
    expect(applyPunctuationRTL("Wow!", "RLM")).toBe("Wow!");
  });

  test("semicolon ':' is NOT touched", () => {
    expect(applyPunctuationRTL("a: b", "RLM")).toBe("a: b");
  });

  test("period embedded mid-token 'file.txt' unchanged", () => {
    expect(applyPunctuationRTL("file.txt", "RLM")).toBe("file.txt");
  });

  test("digit-group comma '1,000' unchanged", () => {
    expect(applyPunctuationRTL("1,000", "RLM")).toBe("1,000");
  });
});

// ---------------------------------------------------------------------------
// Idempotency (RLM/ALM are not whitespace, so re-running is a no-op)
// This is the contract readingAddons.js getWidestTextWidth relies on
// (it does getText() -> setText(oldText) round-trips).
// ---------------------------------------------------------------------------
describe("idempotency", () => {
  test("RLM: double-application == single application", () => {
    setPunctuationRTL("RLM");
    const once = applyPunctuationRTL("Hello. World, done.");
    const twice = applyPunctuationRTL(once);
    expect(twice).toBe(once);
    expect(twice).toBe(`Hello.${RLM} World,${RLM} done.${RLM}`);
  });

  test("ALM: double-application == single application", () => {
    setPunctuationRTL("ALM");
    const once = applyPunctuationRTL("Hello. World, done.");
    const twice = applyPunctuationRTL(once);
    expect(twice).toBe(once);
  });

  test("a string already containing a stray RLM is not corrupted", () => {
    setPunctuationRTL("RLM");
    // "Hi.\u200F" — period already followed by RLM => not re-marked
    expect(applyPunctuationRTL(`Hi.${RLM}`)).toBe(`Hi.${RLM}`);
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

  test("changing the mode after first application does not double-mark", () => {
    setPunctuationRTL("RLM");
    const a = applyPunctuationRTL("Hi."); // "Hi.\u200F"
    setPunctuationRTL("ALM");
    const b = applyPunctuationRTL(a); // period now followed by RLM, not whitespace
    expect(b).toBe(a); // unchanged — no ALM appended
  });

  test("resetting to 'none' disables further marking", () => {
    setPunctuationRTL("ALM");
    applyPunctuationRTL("Hi.");
    setPunctuationRTL("none");
    expect(applyPunctuationRTL("Ok.")).toBe("Ok.");
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

  test("lone period '.'", () => {
    expect(applyPunctuationRTL(".", "RLM")).toBe(`.${RLM}`);
  });

  test("lone comma ','", () => {
    expect(applyPunctuationRTL(",", "RLM")).toBe(`,${RLM}`);
  });

  test("only whitespace after period still marks", () => {
    expect(applyPunctuationRTL("Hi. ", "RLM")).toBe(`Hi.${RLM} `);
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

  test("Arabic with comma + space", () => {
    // ASCII comma (not Arabic ،) — the exact case the glossary targets
    const s = "كلمة, كلمة";
    expect(applyPunctuationRTL(s, "ALM")).toBe(`كلمة,${ALM} كلمة`);
  });

  test("mixed: English number 3.14 inside Arabic passage unchanged at the dot", () => {
    const s = "النسبة 3.14 جيدة.";
    expect(applyPunctuationRTL(s, "ALM")).toBe(`النسبة 3.14 جيدة.${ALM}`);
  });

  test("paragraph with embedded LTR token stays correct", () => {
    // final period after Arabic => marked; internal "ChatGPT" untouched
    const s = "استخدمت ChatGPT اليوم.";
    expect(applyPunctuationRTL(s, "RLM")).toBe(`استخدمت ChatGPT اليوم.${RLM}`);
  });
});
