/**
 * @jest-environment node
 */
import { ExperimentTable } from "../preprocess/experimentTable";
import { resolveTildeValues } from "../preprocess/resolveTildeValues";
import type { PhraseTable } from "../../source/components/parsePhraseFile";
import { loadGlossaryForTests } from "./helpers/glossary";

beforeAll(async () => {
  await loadGlossaryForTests();
});

function makeTable(rows: string[][]): ExperimentTable {
  return new ExperimentTable(rows as readonly (readonly string[])[]);
}

function makePhraseTable(
  symbols: Record<string, Record<string, string>>,
): PhraseTable {
  const pt: PhraseTable = new Map();
  for (const [sym, langs] of Object.entries(symbols)) {
    const langMap = new Map<string, string>();
    for (const [lang, val] of Object.entries(langs)) {
      langMap.set(lang, val);
    }
    pt.set(sym.replace(/^~/, "").toLowerCase(), langMap);
  }
  return pt;
}

describe("resolveTildeValues — pass-through", () => {
  it("returns cells unchanged when no tilde values are present", () => {
    const table = makeTable([
      ["_about", "test"],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]);
    const { resolved, errors } = resolveTildeValues(table, undefined, "en");
    expect(errors).toHaveLength(0);
    expect(resolved.colB("_about")).toBe("test");
    expect(resolved.conditionValue("block", 0)).toBe("1");
    expect(resolved.conditionValue("conditionName", 0)).toBe("A");
  });

  it("is a no-op when phraseTable is undefined and no tilde values exist", () => {
    const table = makeTable([["_about", "hello"]]);
    const { resolved, errors } = resolveTildeValues(table, undefined, "en");
    expect(errors).toHaveLength(0);
    expect(resolved.colB("_about")).toBe("hello");
  });
});

describe("resolveTildeValues — fatal: tilde used without phrase table", () => {
  it("emits a fatal error when a tilde colB cell is found but phraseTable is undefined", () => {
    const table = makeTable([["_about", "~greeting"]]);
    const { errors } = resolveTildeValues(table, undefined, "en");
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("error");
    expect(errors[0].parameters).toContain("_languagePhrasesSpreadsheet");
  });

  it("emits a fatal error for a tilde condition value when phraseTable is undefined", () => {
    const table = makeTable([["conditionName", "", "~exit"]]);
    const { errors } = resolveTildeValues(table, undefined, "en");
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("error");
  });

  it("emits one error per tilde cell when phraseTable is undefined", () => {
    const table = makeTable([
      ["_about", "~greeting"],
      ["conditionName", "", "~exit"],
    ]);
    const { errors } = resolveTildeValues(table, undefined, "en");
    expect(errors).toHaveLength(2);
  });
});

describe("resolveTildeValues — successful resolution", () => {
  it("replaces a tilde colB value with the translated string", () => {
    const pt = makePhraseTable({ "~greeting": { en: "Hello" } });
    const table = makeTable([["_about", "~greeting"]]);
    const { resolved, errors } = resolveTildeValues(table, pt, "en");
    expect(errors).toHaveLength(0);
    expect(resolved.colB("_about")).toBe("Hello");
  });

  it("replaces a tilde condition value with the translated string", () => {
    const pt = makePhraseTable({ "~greeting": { en: "Hello" } });
    const table = makeTable([["conditionName", "", "~greeting", "plain"]]);
    const { resolved, errors } = resolveTildeValues(table, pt, "en");
    expect(errors).toHaveLength(0);
    expect(resolved.conditionValue("conditionName", 0)).toBe("Hello");
    expect(resolved.conditionValue("conditionName", 1)).toBe("plain");
  });

  it("leaves non-tilde values in the same row untouched", () => {
    const pt = makePhraseTable({ "~greeting": { en: "Hello" } });
    const table = makeTable([["conditionName", "", "~greeting", "plain"]]);
    const { resolved } = resolveTildeValues(table, pt, "en");
    expect(resolved.conditionValue("conditionName", 1)).toBe("plain");
  });
});

describe("resolveTildeValues — case-insensitive matching", () => {
  it("matches ~GREETING to a ~greeting key in the phrase table", () => {
    const pt = makePhraseTable({ "~greeting": { en: "Hello" } });
    const table = makeTable([["_about", "~GREETING"]]);
    const { resolved, errors } = resolveTildeValues(table, pt, "en");
    expect(errors).toHaveLength(0);
    expect(resolved.colB("_about")).toBe("Hello");
  });

  it("matches mixed-case tilde values", () => {
    const pt = makePhraseTable({ "~yes": { en: "Yes" } });
    const table = makeTable([["conditionName", "", "~Yes", "~YES"]]);
    const { resolved, errors } = resolveTildeValues(table, pt, "en");
    expect(errors).toHaveLength(0);
    expect(resolved.conditionValue("conditionName", 0)).toBe("Yes");
    expect(resolved.conditionValue("conditionName", 1)).toBe("Yes");
  });
});

describe("resolveTildeValues — fatal: symbol not found", () => {
  it("emits a fatal error when the symbol is not in the phrase table", () => {
    const pt = makePhraseTable({ "~greeting": { en: "Hello" } });
    const table = makeTable([["_about", "~unknown"]]);
    const { errors } = resolveTildeValues(table, pt, "en");
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("error");
  });

  it("leaves the original tilde value in place on symbol-not-found", () => {
    const pt = makePhraseTable({ "~greeting": { en: "Hello" } });
    const table = makeTable([["_about", "~unknown"]]);
    const { resolved } = resolveTildeValues(table, pt, "en");
    expect(resolved.colB("_about")).toBe("~unknown");
  });
});

describe("resolveTildeValues — fatal: language code not in table", () => {
  it("emits a fatal error when the language code has no column", () => {
    const pt = makePhraseTable({ "~greeting": { en: "Hello" } });
    const table = makeTable([["_about", "~greeting"]]);
    const { errors } = resolveTildeValues(table, pt, "fr");
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("error");
  });

  it("leaves the original tilde value in place on language-not-found", () => {
    const pt = makePhraseTable({ "~greeting": { en: "Hello" } });
    const table = makeTable([["_about", "~greeting"]]);
    const { resolved } = resolveTildeValues(table, pt, "fr");
    expect(resolved.colB("_about")).toBe("~greeting");
  });
});

describe("resolveTildeValues — warning: resolved value is blank", () => {
  it("emits a warning (not error) when the resolved string is empty", () => {
    const pt = makePhraseTable({ "~greeting": { en: "" } });
    const table = makeTable([["_about", "~greeting"]]);
    const { errors } = resolveTildeValues(table, pt, "en");
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("warning");
  });

  it("still replaces the cell with the empty string on blank resolution", () => {
    const pt = makePhraseTable({ "~greeting": { en: "" } });
    const table = makeTable([["_about", "~greeting"]]);
    const { resolved } = resolveTildeValues(table, pt, "en");
    expect(resolved.colB("_about")).toBe("");
  });
});
