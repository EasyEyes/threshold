/**
 * Contract tests: the relationship between the `.text` property and
 * `.getText()` on a PsychoJS TextStim, in the presence of the
 * fontPunctuationRTL transform.
 *
 * WHY THIS MATTERS
 * ---------------
 * `fontPunctuationRTL` lives inside `TextStim.getText()` (consistent with the
 * pre-existing `_medialShape` transform, which also lives there). A common —
 * and INCORRECT — assumption is that the `.text` property returns the raw
 * authored string while `.getText()` returns the rendered/transformed string.
 *
 * In fact they are IDENTICAL. PsychoJS's `_addAttribute` (psychobject.js)
 * defines the `.text` getter as `() => this[getPropertyName]()` — i.e. it
 * calls `this.getText()`. Since TextStim OVERRIDES `getText()` (for
 * `_medialShape` and now `fontPunctuationRTL`), both `.text` and
 * `.getText()` return the transformed string. This was already true for
 * `_medialShape` before fontPunctuationRTL existed.
 *
 * These tests pin that contract so a future refactor cannot silently diverge
 * the two (which would either double-apply or skip the bidi marks depending
 * on which path a caller uses).
 *
 * We cannot instantiate a real TextStim here (it transitively imports
 * PsychoJS → ExperimentHandler → components/global.js, which has browser
 * side effects). Instead we replicate PsychoJS's `_addAttribute` getter
 * generation verbatim (sourced from psychojs/src/util/PsychObject.js) and
 * confirm an overridden `getText` is what `.text` returns. This is the exact
 * mechanism the real TextStim relies on.
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

/**
 * Faithful replica of PsychoJS PsychObject._addAttribute getter/setter
 * generation (see psychojs/src/util/PsychObject.js). Only the property-access
 * machinery is reproduced; onChange/log omitted as irrelevant here.
 */
function addAttribute(obj, name, value, defaultValue) {
  const getName = "get" + name[0].toUpperCase() + name.slice(1);
  // Auto-generate getX ONLY if the subclass hasn't defined its own.
  if (typeof obj[getName] === "undefined") {
    obj[getName] = () => obj["_" + name];
  }
  Object.defineProperty(obj, name, {
    configurable: true,
    get() {
      return this[getName](); // <- the linchpin: .text delegates to getText()
    },
    set(v) {
      this["_" + name] = v;
    },
  });
  obj[name] = value;
}

// A minimal TextStim stand-in: it OVERRIDES getText (like the real one does
// for _medialShape + fontPunctuationRTL) and registers "text" via the same
// _addAttribute machinery.
class TextStimLike {
  constructor(text) {
    addAttribute(this, "text", text, "Hello World");
  }
  // Override — mirrors psychojs TextStim.getText (minus the medial wrap,
  // which is irrelevant to the delegation contract under test).
  getText() {
    return applyPunctuationRTL(this._text);
  }
}

beforeEach(() => setPunctuationRTL("none"));

describe(".text vs .getText() — the core contract", () => {
  test(".text and .getText() return the SAME string", () => {
    setPunctuationRTL("ALM");
    const s = new TextStimLike("Hello.");
    expect(s.text).toBe(s.getText());
  });

  test("in default 'none' mode, .text returns the raw authored string", () => {
    const s = new TextStimLike("Hello. World, done.");
    expect(s.text).toBe("Hello. World, done.");
    expect(s.getText()).toBe("Hello. World, done.");
  });

  test("in ALM mode, BOTH .text and .getText() carry the mark", () => {
    setPunctuationRTL("ALM");
    const s = new TextStimLike("Hello.");
    expect(s.text).toBe(`Hello.${ALM}`);
    expect(s.getText()).toBe(`Hello.${ALM}`);
  });

  test("._text (the backing field) stays RAW — marks are not baked in", () => {
    setPunctuationRTL("RLM");
    const s = new TextStimLike("Hello.");
    // The authored value is pristine; only the accessors transform.
    expect(s._text).toBe("Hello.");
  });
});

describe("mode is read at access time (not captured at construction)", () => {
  test("a stim constructed under 'none' reflects a later mode switch", () => {
    const s = new TextStimLike("Hi.");
    expect(s.text).toBe("Hi."); // none at construction
    setPunctuationRTL("ALM");
    expect(s.text).toBe(`Hi.${ALM}`); // picks up new mode on next access
    setPunctuationRTL("none");
    expect(s.text).toBe("Hi."); // and reverts
  });
});

describe("consumer-facing guarantee: idempotent save/restore round-trip", () => {
  // readingAddons.js getWidestTextWidth does: old = stim.getText(); ...;
  // stim.setText(old). The round-trip must not accumulate marks.
  test("getText() -> setText(getText()) is idempotent under any mode", () => {
    setPunctuationRTL("RLM");
    const s = new TextStimLike("Hello. World, done.");
    const once = s.text;
    s.text = once; // setText round-trip
    const twice = s.text;
    expect(twice).toBe(once);
    // comma replaced → ، (Arabic comma); final periods marked → .\u200F
    expect(twice).toBe(`Hello.${RLM} World\u060C done.${RLM}`);
    // and a third pass still stable
    s.text = twice;
    expect(s.text).toBe(once);
  });
});

describe("delimiter: only ASCII , and . are affected via .text", () => {
  test("letters-only triplet (the threshold.js:8646 consumer) is a no-op", () => {
    setPunctuationRTL("ALM");
    const target = new TextStimLike("K");
    const flanker1 = new TextStimLike("A");
    const flanker2 = new TextStimLike("B");
    // Mirrors threshold.js:8648: flanker1.text + target.text + flanker2.text
    const triplet = flanker1.text + target.text + flanker2.text;
    expect(triplet).toBe("AKB"); // no marks — letters have no ASCII punctuation
  });

  test("Arabic comma ، (U+060C) is not marked via .text", () => {
    setPunctuationRTL("RLM");
    const s = new TextStimLike("كلمة، كلمة");
    expect(s.text).toBe("كلمة، كلمة");
  });
});
