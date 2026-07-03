/**
 * Tests for fontPunctuationRTL — RTL punctuation handling for canvas-rendered
 * text (Arabic/Urdu/Persian).
 *
 * These tests target the pure transform module directly. TextStim.getText()
 * delegates to applyPunctuationRTL(this._text) with no explicit mode, so the
 * "module-state via setPunctuationRTL" tests below validate the exact wiring
 * contract that the render path relies on. No canvas / no TextStim instance.
 *
 * BEHAVIOR (2026-07-03, empirically validated by Denis Pelli + Gus):
 * Three ASCII punctuation characters, each transformed only when FINAL
 * ("final" = followed by whitespace or end-of-string), so embedded
 * punctuation (3.14, a,b,c, 1,000, a;b, file.txt) is left untouched.
 *
 *   - Comma     "," (U+002C) => REPLACED with Arabic comma ، (U+060C) AND
 *                the active mark appended. U+060C is bidi class CS (neutral,
 *                the SAME class as the ASCII comma), so the replacement alone
 *                is NOT strongly RTL and still misplaces — the mark is
 *                required. (Comma-replacement-without-mark was empirically
 *                tested 2026-07-03 and does NOT fix the misplaced comma;
 *                adding the mark DOES.)
 *   - Semicolon ";" (U+003B) => REPLACED with Arabic semicolon ؛ (U+061B),
 *                NO mark. U+061B is bidi class AL (strongly RTL), so unlike
 *                the comma it needs no mark.
 *   - Period    "." (U+002E) & ellipsis "…" (U+2026) => active RTL mark
 *                appended (no Arabic replacement character exists).
 *
 * IDEMPOTENT: once a final period/ellipsis is followed by the mark it is no
 * longer "final" (the mark is not whitespace), so a second pass won't
 * re-mark it; ASCII comma/semicolon are consumed by the one-pass replacement.
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
const ELLIPSIS = "\u2026"; // …

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
// PERIOD: mark after FINAL only
// ---------------------------------------------------------------------------
describe("period — RTL mark after FINAL periods only", () => {
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

  // --- embedded periods are NOT final: left untouched ---
  test("decimal point: '3.14' unchanged (not final)", () => {
    expect(applyPunctuationRTL("3.14", "RLM")).toBe("3.14");
  });

  test("period embedded mid-token 'file.txt' unchanged", () => {
    expect(applyPunctuationRTL("file.txt", "RLM")).toBe("file.txt");
  });

  test("period between letters 'a.b.c' unchanged (no final period)", () => {
    expect(applyPunctuationRTL("a.b.c", "RLM")).toBe("a.b.c");
  });

  test("lone period '.'", () => {
    expect(applyPunctuationRTL(".", "RLM")).toBe(`.${RLM}`);
  });

  test("only whitespace after period still marks", () => {
    expect(applyPunctuationRTL("Hi. ", "RLM")).toBe(`Hi.${RLM} `);
  });

  test("leading period followed by space", () => {
    expect(applyPunctuationRTL(". Hello", "RLM")).toBe(`.${RLM} Hello`);
  });

  // --- ASCII three-dot '...': only the FINAL period is marked ---
  test("ASCII three-dot '...' — only the final period gets the mark", () => {
    // The first two periods are followed by another period (not final); only
    // the third (end-of-string) is final.
    expect(applyPunctuationRTL("Hello...", "RLM")).toBe(`Hello...${RLM}`);
  });

  test("ASCII three-dot followed by space — only final period marked", () => {
    expect(applyPunctuationRTL("Hello... World", "RLM")).toBe(
      `Hello...${RLM} World`,
    );
  });

  test("ASCII four-dot '....' — only the final period marked", () => {
    expect(applyPunctuationRTL("Wait....", "RLM")).toBe(`Wait....${RLM}`);
  });
});

// ---------------------------------------------------------------------------
// COMMA: FINAL ASCII comma → Arabic comma ، + the active mark.
// U+060C is bidi class CS (neutral), so the mark is REQUIRED — this is the
// empirically-validated fix (comma-replacement-without-mark misplaces).
// ---------------------------------------------------------------------------
describe("comma — FINAL comma → Arabic comma ، + mark", () => {
  test("comma followed by space", () => {
    expect(applyPunctuationRTL("a, b", "RLM")).toBe(`a${ARABIC_COMMA}${RLM} b`);
  });

  test("comma at end of string", () => {
    expect(applyPunctuationRTL("done,", "RLM")).toBe(
      `done${ARABIC_COMMA}${RLM}`,
    );
  });

  test("ALM mode uses ALM mark on the comma", () => {
    expect(applyPunctuationRTL("a, b", "ALM")).toBe(`a${ARABIC_COMMA}${ALM} b`);
  });

  test("RLM and ALM differ only in the mark codepoint for the comma", () => {
    const r = applyPunctuationRTL("a, b", "RLM");
    const a = applyPunctuationRTL("a, b", "ALM");
    expect(r).toBe(`a${ARABIC_COMMA}${RLM} b`);
    expect(a).toBe(`a${ARABIC_COMMA}${ALM} b`);
  });

  // --- embedded commas are NOT final: left untouched ---
  test("comma list: 'a,b,c' unchanged (no final commas)", () => {
    expect(applyPunctuationRTL("a,b,c", "RLM")).toBe("a,b,c");
  });

  test("digit-group comma '1,000' unchanged (not final)", () => {
    expect(applyPunctuationRTL("1,000", "RLM")).toBe("1,000");
  });

  test("decimal-comma '3,14' unchanged (not final)", () => {
    expect(applyPunctuationRTL("3,14", "RLM")).toBe("3,14");
  });

  test("comma between two words with no space 'a,b' unchanged", () => {
    expect(applyPunctuationRTL("a,b", "RLM")).toBe("a,b");
  });

  test("lone comma ',' (final: end of string)", () => {
    expect(applyPunctuationRTL(",", "RLM")).toBe(`${ARABIC_COMMA}${RLM}`);
  });

  test("the mark IS appended after the Arabic comma", () => {
    expect(applyPunctuationRTL("a, b", "ALM")).toContain(ALM);
    expect(applyPunctuationRTL("a, b", "RLM")).toContain(RLM);
  });

  test("existing Arabic comma ، is left as-is (no ASCII comma to replace)", () => {
    expect(applyPunctuationRTL("كلمة، كلمة", "RLM")).toBe("كلمة، كلمة");
  });

  test("existing Arabic comma at end of string is left as-is", () => {
    expect(applyPunctuationRTL("كلمة،", "RLM")).toBe("كلمة،");
  });

  test("comma followed by newline (multi-line)", () => {
    expect(applyPunctuationRTL("a,\nb", "RLM")).toBe(
      `a${ARABIC_COMMA}${RLM}\nb`,
    );
  });

  test("comma followed by tab", () => {
    expect(applyPunctuationRTL("a,\tb", "RLM")).toBe(
      `a${ARABIC_COMMA}${RLM}\tb`,
    );
  });
});

// ---------------------------------------------------------------------------
// SEMICOLON: FINAL ASCII semicolon → Arabic semicolon ؛ (NO mark).
// U+061B is bidi class AL (strongly RTL), so unlike the comma it needs no
// mark. This asymmetry is the whole point of treating them differently.
// ---------------------------------------------------------------------------
describe("semicolon — FINAL semicolon → Arabic semicolon ؛ (no mark)", () => {
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

  test("every FINAL semicolon in 'a; b; c' is replaced", () => {
    expect(applyPunctuationRTL("a; b; c", "RLM")).toBe(
      `a${ARABIC_SEMICOLON} b${ARABIC_SEMICOLON} c`,
    );
  });

  test("NO mark appended after the Arabic semicolon (strongly RTL)", () => {
    expect(applyPunctuationRTL("a; b", "ALM")).not.toContain(ALM);
    expect(applyPunctuationRTL("a; b", "RLM")).not.toContain(RLM);
  });

  test("existing Arabic semicolon ؛ is left as-is (no ASCII semicolon)", () => {
    expect(applyPunctuationRTL("كلمة؛ كلمة", "RLM")).toBe("كلمة؛ كلمة");
  });
});

// ---------------------------------------------------------------------------
// ELLIPSIS: mark after FINAL only
// ---------------------------------------------------------------------------
describe("ellipsis — RTL mark after FINAL ellipses (U+2026)", () => {
  test("ellipsis at end of string (RLM)", () => {
    expect(applyPunctuationRTL(`Hello${ELLIPSIS}`, "RLM")).toBe(
      `Hello${ELLIPSIS}${RLM}`,
    );
  });

  test("ellipsis at end of string (ALM)", () => {
    expect(applyPunctuationRTL(`Hello${ELLIPSIS}`, "ALM")).toBe(
      `Hello${ELLIPSIS}${ALM}`,
    );
  });

  test("ellipsis followed by space then more text", () => {
    expect(applyPunctuationRTL(`Hello${ELLIPSIS} World`, "RLM")).toBe(
      `Hello${ELLIPSIS}${RLM} World`,
    );
  });

  test("ellipsis followed by newline", () => {
    expect(applyPunctuationRTL(`Line one${ELLIPSIS}\nLine two`, "RLM")).toBe(
      `Line one${ELLIPSIS}${RLM}\nLine two`,
    );
  });

  test("ellipsis followed by tab", () => {
    expect(applyPunctuationRTL(`a${ELLIPSIS}\tb`, "RLM")).toBe(
      `a${ELLIPSIS}${RLM}\tb`,
    );
  });

  test("two final ellipses both marked", () => {
    expect(applyPunctuationRTL(`Hi${ELLIPSIS} Bye${ELLIPSIS}`, "RLM")).toBe(
      `Hi${ELLIPSIS}${RLM} Bye${ELLIPSIS}${RLM}`,
    );
  });

  // --- embedded ellipses are NOT final: left untouched ---
  test("ellipsis mid-word 'a…b' unchanged (not final)", () => {
    expect(applyPunctuationRTL(`a${ELLIPSIS}b`, "RLM")).toBe(`a${ELLIPSIS}b`);
  });

  test("ellipsis in '3…14' unchanged (not final)", () => {
    expect(applyPunctuationRTL(`3${ELLIPSIS}14`, "RLM")).toBe(`3${ELLIPSIS}14`);
  });

  test("ellipses between letters 'a…b…c' unchanged (no final ellipsis)", () => {
    expect(applyPunctuationRTL(`a${ELLIPSIS}b${ELLIPSIS}c`, "RLM")).toBe(
      `a${ELLIPSIS}b${ELLIPSIS}c`,
    );
  });

  test("lone ellipsis '…'", () => {
    expect(applyPunctuationRTL(ELLIPSIS, "RLM")).toBe(`${ELLIPSIS}${RLM}`);
  });

  test("RLM and ALM differ only in inserted codepoint for ellipsis", () => {
    const r = applyPunctuationRTL(`Hi${ELLIPSIS}`, "RLM");
    const a = applyPunctuationRTL(`Hi${ELLIPSIS}`, "ALM");
    expect(r.length).toBe(a.length);
    expect(r.charAt(3)).toBe(RLM);
    expect(a.charAt(3)).toBe(ALM);
  });

  test("ellipsis in 'none' mode unchanged", () => {
    expect(applyPunctuationRTL(`Hi${ELLIPSIS}`, "none")).toBe(`Hi${ELLIPSIS}`);
  });
});

// ---------------------------------------------------------------------------
// Regex stress: the (?=\s|$) final-lookahead edge cases
// ---------------------------------------------------------------------------
describe("regex stress — final-lookahead edge cases", () => {
  test("period-then-comma-at-end '.': period not final, comma final", () => {
    // '.' is followed by ',' (not whitespace/end) → not final → unchanged.
    // ',' is at end → final → ، + mark.
    expect(applyPunctuationRTL(".,", "RLM")).toBe(`.${ARABIC_COMMA}${RLM}`);
  });

  test("comma-then-period-at-end ',.': comma not final, period final", () => {
    // ',' is followed by '.' → not final → unchanged.
    // '.' is at end → final → . + mark.
    expect(applyPunctuationRTL(",.", "RLM")).toBe(`,.${RLM}`);
  });

  test("two commas ',,' : only the final one is transformed", () => {
    // First ',' followed by ',' → not final → unchanged.
    // Second ',' at end → final → ، + mark.
    expect(applyPunctuationRTL(",,", "RLM")).toBe(`,${ARABIC_COMMA}${RLM}`);
  });

  test("three commas ',,,' : only the final one is transformed", () => {
    expect(applyPunctuationRTL("a,,,b,", "RLM")).toBe(
      `a,,,b${ARABIC_COMMA}${RLM}`,
    );
  });

  test("three semicolons ';;;' : only the final one is transformed", () => {
    expect(applyPunctuationRTL(";;;", "RLM")).toBe(`;;${ARABIC_SEMICOLON}`);
  });

  test("two ellipses '……' : only the final one is marked", () => {
    expect(applyPunctuationRTL(`${ELLIPSIS}${ELLIPSIS}`, "RLM")).toBe(
      `${ELLIPSIS}${ELLIPSIS}${RLM}`,
    );
  });

  test("only-periods string '...': only final marked", () => {
    expect(applyPunctuationRTL("...", "RLM")).toBe(`...${RLM}`);
  });

  test("only-commas string ',,': only final transformed", () => {
    expect(applyPunctuationRTL(",,", "RLM")).toBe(`,${ARABIC_COMMA}${RLM}`);
  });

  test("whitespace between periods 'a. .b': only the first (space-followed) is final", () => {
    // '.' (after 'a') followed by space → final → marked.
    // '.' (before 'b') followed by 'b' → NOT final → unchanged.
    expect(applyPunctuationRTL("a. .b", "RLM")).toBe(`a.${RLM} .b`);
  });

  test("space-period-space 'a . b' (isolated final period)", () => {
    expect(applyPunctuationRTL("a . b", "RLM")).toBe(`a .${RLM} b`);
  });

  test("mixed final punctuation '.,;.' — all final transformed", () => {
    // '.,;.' → ',' preceded by '.' (not final), ';' preceded by ',' (not
    // final), '.' at end (final). Actually walk it char by char:
    //   '.' followed by ',' → not final
    //   ',' followed by ';' → not final
    //   ';' followed by '.' → not final
    //   '.' at end → final → . + mark
    expect(applyPunctuationRTL(".,;.", "RLM")).toBe(`.,;.${RLM}`);
  });

  test("string of only final punctuation '. , ;'", () => {
    // Each is followed by space (or end for the last) → all final.
    expect(applyPunctuationRTL(". , ;", "RLM")).toBe(
      `.${RLM} ${ARABIC_COMMA}${RLM} ${ARABIC_SEMICOLON}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Mixed: period + ellipsis together
// ---------------------------------------------------------------------------
describe("mixed period and ellipsis", () => {
  test("both period and ellipsis in same string get marks (both final)", () => {
    expect(applyPunctuationRTL(`Hi. Bye${ELLIPSIS}`, "RLM")).toBe(
      `Hi.${RLM} Bye${ELLIPSIS}${RLM}`,
    );
  });

  test("mixed in Arabic passage", () => {
    const s = `مرحبا. كلام${ELLIPSIS}`;
    expect(applyPunctuationRTL(s, "ALM")).toBe(
      `مرحبا.${ALM} كلام${ELLIPSIS}${ALM}`,
    );
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

  test("pre-existing Arabic comma ، is NOT re-marked or doubled", () => {
    expect(applyPunctuationRTL("كلمة، كلمة", "RLM")).toBe("كلمة، كلمة");
  });

  test("pre-existing Arabic semicolon ؛ is NOT touched", () => {
    expect(applyPunctuationRTL("كلمة؛ كلمة", "RLM")).toBe("كلمة؛ كلمة");
  });
});

// ---------------------------------------------------------------------------
// Idempotency — re-running is a no-op.
// This is the contract readingAddons.js getWidestTextWidth relies on
// (it does getText() -> setText(oldText) round-trips). Final-only is
// naturally idempotent: once a final punct is followed by the mark/Arabic
// char, it is no longer "final" on a second pass.
// ---------------------------------------------------------------------------
describe("idempotency", () => {
  test("RLM: double-application == single application", () => {
    setPunctuationRTL("RLM");
    const once = applyPunctuationRTL("Hello. World, done.");
    const twice = applyPunctuationRTL(once);
    expect(twice).toBe(once);
    // Final comma → ، + RLM; final periods marked → .\u200F
    expect(twice).toBe(`Hello.${RLM} World${ARABIC_COMMA}${RLM} done.${RLM}`);
  });

  test("ALM: double-application == single application", () => {
    setPunctuationRTL("ALM");
    const once = applyPunctuationRTL("Hello. World, done; ok.");
    const twice = applyPunctuationRTL(once);
    expect(twice).toBe(once);
    expect(twice).toBe(
      `Hello.${ALM} World${ARABIC_COMMA}${ALM} done${ARABIC_SEMICOLON} ok.${ALM}`,
    );
  });

  test("a period already followed by a stray RLM is not re-marked", () => {
    setPunctuationRTL("RLM");
    expect(applyPunctuationRTL(`Hi.${RLM}`)).toBe(`Hi.${RLM}`);
  });

  test("a period already followed by a stray ALM is not re-marked", () => {
    setPunctuationRTL("ALM");
    expect(applyPunctuationRTL(`Hi.${ALM}`)).toBe(`Hi.${ALM}`);
  });

  test("cross-mode: a period followed by ALM is not re-marked under RLM", () => {
    setPunctuationRTL("RLM");
    // Final-only: the period is followed by ALM (not whitespace/end), so it's
    // not final → not re-marked regardless of which mark is present.
    expect(applyPunctuationRTL(`Hi.${ALM}`)).toBe(`Hi.${ALM}`);
  });

  test("cross-mode: a period followed by RLM is not re-marked under ALM", () => {
    setPunctuationRTL("ALM");
    expect(applyPunctuationRTL(`Hi.${RLM}`)).toBe(`Hi.${RLM}`);
  });

  test("Arabic comma/semicolon are not re-touched on second pass", () => {
    setPunctuationRTL("ALM");
    const once = applyPunctuationRTL("a, b; c.");
    const twice = applyPunctuationRTL(once);
    expect(twice).toBe(once);
    expect(twice).toBe(`a${ARABIC_COMMA}${ALM} b${ARABIC_SEMICOLON} c.${ALM}`);
  });

  test("triple-application still stable", () => {
    setPunctuationRTL("RLM");
    const once = applyPunctuationRTL("a, b. c; d.");
    const twice = applyPunctuationRTL(once);
    const thrice = applyPunctuationRTL(twice);
    expect(thrice).toBe(once);
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
      `a${ARABIC_COMMA}${RLM} b${ARABIC_SEMICOLON} c.${RLM}`,
    );
  });

  test("resetting to 'none' disables all transforms", () => {
    setPunctuationRTL("ALM");
    applyPunctuationRTL("Hi.");
    setPunctuationRTL("none");
    expect(applyPunctuationRTL("a, b; c.")).toBe("a, b; c.");
  });

  test("a stim constructed under 'none' reflects a later mode switch", () => {
    // Mode is read at access time, not captured — mirrors the TextStim
    // contract (see textStimTextContract.test.ts).
    setPunctuationRTL("none");
    const a = applyPunctuationRTL("Hi.");
    expect(a).toBe("Hi.");
    setPunctuationRTL("ALM");
    expect(applyPunctuationRTL("Hi.")).toBe(`Hi.${ALM}`);
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

  test("whitespace-only string unchanged", () => {
    expect(applyPunctuationRTL("   \n\t  ", "RLM")).toBe("   \n\t  ");
  });

  test("numbers without punctuation unchanged", () => {
    expect(applyPunctuationRTL("12345", "RLM")).toBe("12345");
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

  test("Arabic with ASCII comma + space → Arabic comma + mark", () => {
    const s = "كلمة, كلمة";
    expect(applyPunctuationRTL(s, "ALM")).toBe(
      `كلمة${ARABIC_COMMA}${ALM} كلمة`,
    );
  });

  test("Arabic with ASCII semicolon → Arabic semicolon (no mark)", () => {
    const s = "كلمة; كلمة";
    expect(applyPunctuationRTL(s, "ALM")).toBe(`كلمة${ARABIC_SEMICOLON} كلمة`);
  });

  test("embedded English number 3.14 inside Arabic passage — dot untouched", () => {
    const s = "النسبة 3.14 جيدة.";
    expect(applyPunctuationRTL(s, "ALM")).toBe(`النسبة 3.14 جيدة.${ALM}`);
  });

  test("paragraph with embedded LTR token stays correct", () => {
    const s = "استخدمت ChatGPT اليوم.";
    expect(applyPunctuationRTL(s, "RLM")).toBe(`استخدمت ChatGPT اليوم.${RLM}`);
  });

  test("mixed comma + semicolon + period in one passage (all final)", () => {
    const s = "كلمة, كلمة; كلمة.";
    expect(applyPunctuationRTL(s, "ALM")).toBe(
      `كلمة${ARABIC_COMMA}${ALM} كلمة${ARABIC_SEMICOLON} كلمة.${ALM}`,
    );
  });

  test("enumeration ending in a comma at the line end (the bug case)", () => {
    // The reported symptom: a comma that lands at the left edge of an RTL
    // line. The corpus token "كلمة," with a trailing ASCII comma is the
    // case that lands at the line end after word-wrapping.
    const s = "الألوان هي الأحمر, والأزرق, والأخضر,";
    expect(applyPunctuationRTL(s, "ALM")).toBe(
      `الألوان هي الأحمر${ARABIC_COMMA}${ALM} والأزرق${ARABIC_COMMA}${ALM} والأخضر${ARABIC_COMMA}${ALM}`,
    );
  });
});
