/**
 * fontPixiMetricsString defaults are fontLanguage specific: the glossary
 * default is a comma-separated list of (language, metrics string) pairs, and
 * a condition that leaves the cell empty gets the entry for its fontLanguage.
 *
 * @jest-environment node
 */
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { getGlossary } from "../parameters/glossaryRegistry";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";
import { normalizeExperimentDfShape } from "../preprocess/transformExperimentTable";
import { dataframeFromPapaParsed, getColumnValues } from "../preprocess/utils";
import {
  parseFontPixiMetricsStringDefault,
  resolveFontPixiMetricsString,
} from "../preprocess/fontPixiMetricsStringDefault";

const DEFAULT =
  "ar, ٱغ, fa, آژ گچ, ja, 高黒, ur, گھڑی, zh-Hans, 高黑, zh-Hant, 高黑";

beforeAll(async () => {
  await loadGlossaryForTests();
});

/** Run the block of code with the glossary's fontPixiMetricsString default. */
function withDefault(rawDefault: string, run: () => void): void {
  const entry = getGlossary()["fontPixiMetricsString"];
  const original = entry.default;
  entry.default = rawDefault;
  try {
    run();
  } finally {
    entry.default = original;
  }
}

function normalize(csv: string): any {
  const parsed = Papa.parse(csv, { skipEmptyLines: true });
  const data = (parsed.data as string[][]).filter((row) => row.some((x) => x));
  return normalizeExperimentDfShape(dataframeFromPapaParsed({ data }));
}

describe("parsing the language-keyed default", () => {
  it("pairs each language with the string that follows it", () => {
    const { byLanguageId, unrecognizedLanguages, unpairedLanguage } =
      parseFontPixiMetricsStringDefault(DEFAULT);
    expect(unrecognizedLanguages).toEqual([]);
    expect(unpairedLanguage).toBeNull();
    expect(byLanguageId.get("ar_Arab")).toBe("ٱغ");
    expect(byLanguageId.get("fa_Arab")).toBe("آژ گچ");
    expect(byLanguageId.get("ja_Jpan")).toBe("高黒");
    expect(byLanguageId.get("ur_Arab")).toBe("گھڑی");
    expect(byLanguageId.get("zh_Hans")).toBe("高黑");
    expect(byLanguageId.get("zh_Hant")).toBe("高黑");
  });

  it("reads an empty default as no defaults at all", () => {
    const parsed = parseFontPixiMetricsStringDefault("");
    expect(parsed.byLanguageId.size).toBe(0);
    expect(parsed.unrecognizedLanguages).toEqual([]);
    expect(parsed.unpairedLanguage).toBeNull();
  });

  it("collects odd-numbered entries that name no known language", () => {
    const parsed = parseFontPixiMetricsStringDefault(
      "ar, ٱغ, klingon, x, zz-Zzzz, y",
    );
    expect(parsed.unrecognizedLanguages).toEqual(["klingon", "zz-Zzzz"]);
    expect(parsed.byLanguageId.get("ar_Arab")).toBe("ٱغ");
  });

  it("reports a final language with no metrics string", () => {
    expect(
      parseFontPixiMetricsStringDefault("ar, ٱغ, ja").unpairedLanguage,
    ).toBe("ja");
  });

  it("accepts anything but a comma as a metrics string", () => {
    const parsed = parseFontPixiMetricsStringDefault("en, |ÉqÅ 42 -");
    expect(parsed.unrecognizedLanguages).toEqual([]);
    expect(parsed.byLanguageId.get("en_Latn")).toBe("|ÉqÅ 42 -");
  });
});

describe("resolving one condition's value", () => {
  it("gives the language's default when the cell was left empty", () => {
    expect(resolveFontPixiMetricsString(DEFAULT, "ja", DEFAULT)).toBe("高黒");
  });

  it("keeps whatever the scientist wrote", () => {
    expect(resolveFontPixiMetricsString("|ÉqÅ", "ja", DEFAULT)).toBe("|ÉqÅ");
    expect(resolveFontPixiMetricsString("", "ja", DEFAULT)).toBe("");
  });

  it("gives nothing to a language the default omits, or no language", () => {
    expect(resolveFontPixiMetricsString(DEFAULT, "en", DEFAULT)).toBe("");
    expect(resolveFontPixiMetricsString(DEFAULT, "", DEFAULT)).toBe("");
    expect(resolveFontPixiMetricsString(DEFAULT, "none", DEFAULT)).toBe("");
  });

  it("matches languages by identity, not spelling", () => {
    // zh-CN and zh-TW are the same languages as zh-Hans and zh-Hant.
    expect(resolveFontPixiMetricsString(DEFAULT, "zh-CN", DEFAULT)).toBe(
      "高黑",
    );
    expect(resolveFontPixiMetricsString(DEFAULT, "ZH-hant", DEFAULT)).toBe(
      "高黑",
    );
  });

  it("changes nothing while the glossary default is empty", () => {
    expect(resolveFontPixiMetricsString("", "ja", "")).toBe("");
  });
});

describe("the compiler checks the glossary's default", () => {
  const findError = (errors: { name: string }[]) =>
    errors.find((e) => e.name.includes("fontPixiMetricsString"));
  const table = () =>
    new ExperimentTable(
      Papa.parse(`_about,test,,\nblock,,1,1\nconditionName,,A,B`, {
        skipEmptyLines: true,
      }).data as readonly (readonly string[])[],
    );

  it("accepts a default whose languages are all valid", () => {
    withDefault(DEFAULT, () => {
      expect(findError(validateExperimentTable(table()))).toBeUndefined();
    });
  });

  it("is fatal when an odd-numbered entry is not a language", () => {
    withDefault("ar, ٱغ, klingon, 高黒", () => {
      const error = findError(validateExperimentTable(table()));
      expect(error).toBeDefined();
      expect(error!.kind).toBe("error");
      expect(error!.message).toContain("klingon");
    });
  });

  it("is fatal when a language has no metrics string", () => {
    withDefault("ar, ٱغ, ja", () => {
      const error = findError(validateExperimentTable(table()));
      expect(error).toBeDefined();
      expect(error!.kind).toBe("error");
    });
  });
});

describe("the compiler resolves each condition's default", () => {
  it("fills empty cells per fontLanguage and leaves written values alone", () => {
    withDefault(DEFAULT, () => {
      const df = normalize(`_about,test,,,,
block,,1,1,1,1
fontLanguage,,ja,ur,en,ja
fontPixiMetricsString,,,,,|ÉqÅ`);
      expect(getColumnValues(df, "fontPixiMetricsString")).toEqual([
        "高黒",
        "گھڑی",
        "",
        "|ÉqÅ",
      ]);
    });
  });

  it("gives nothing when the study names no fontLanguage", () => {
    withDefault(DEFAULT, () => {
      const df = normalize(`_about,test,,
block,,1,1
fontPixiMetricsString,,,`);
      expect(getColumnValues(df, "fontPixiMetricsString")).toEqual(["", ""]);
    });
  });
});
