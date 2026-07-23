/**
 * fontVariantLigatures compiler validation — adversarial edge cases.
 *
 * Naive experimenters WILL: typo keywords, use wrong case, space-separate
 * (CSS style), quote keywords (fontFeatureSettings habit), combine
 * contradictory keywords, and set ligatures on browser fonts (which cannot
 * be baked — guaranteed silent no-op). All must be loud compile-time
 * ERRORS with the single most relevant parameter attached.
 *
 * Mirrors the fontFeatureSettingsCompiler.test.ts harness.
 * @jest-environment node
 */
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/experimentFileChecks";
import type { EasyEyesError } from "../preprocess/errorMessages";

function parse(csv: string): ExperimentTable {
  const p = Papa.parse(csv, { skipEmptyLines: true });
  return new ExperimentTable(p.data as readonly (readonly string[])[]);
}

function csvField(raw: string): string {
  if (raw.includes(",") || raw.includes('"')) {
    return '"' + raw.replace(/"/g, '""') + '"';
  }
  return raw;
}

beforeAll(async () => {
  await loadGlossaryForTests();
});

/** Minimal table: two conditions, fontVariantLigatures (+ optional fontSource). */
function table(
  ligatureValues: string[],
  fontSources?: string[],
): ExperimentTable {
  const rows = [
    `_about,test`,
    `block,,1,1`,
    `conditionName,,A,B`,
    fontSources ? `fontSource,,${fontSources.join(",")}` : null,
    `fontVariantLigatures,,${ligatureValues.map(csvField).join(",")}`,
  ].filter(Boolean);
  return parse(rows.join("\n"));
}

function ligatureErrors(t: ExperimentTable): EasyEyesError[] {
  return validateExperimentTable(t).filter((e) =>
    e.parameters.includes("fontVariantLigatures"),
  );
}

describe("valid values pass (generic multicategorical check)", () => {
  const ALL = [
    "normal",
    "none",
    "common-ligatures",
    "no-common-ligatures",
    "discretionary-ligatures",
    "no-discretionary-ligatures",
    "historical-ligatures",
    "no-historical-ligatures",
    "contextual",
    "no-contextual",
  ];
  it.each(ALL)("keyword %p passes", (kw) => {
    expect(ligatureErrors(table([kw, ""]))).toHaveLength(0);
  });

  it("comma-separated keywords pass", () => {
    expect(
      ligatureErrors(table(["discretionary-ligatures, contextual", ""])),
    ).toHaveLength(0);
  });

  it("blank passes (default normal)", () => {
    expect(ligatureErrors(table(["", ""]))).toHaveLength(0);
  });

  it("duplicate keyword is harmless (not a contradiction)", () => {
    expect(
      ligatureErrors(table(["common-ligatures, common-ligatures", ""])),
    ).toHaveLength(0);
  });
});

describe("invalid values are loud errors (generic check)", () => {
  it("typo", () => {
    const errs = ligatureErrors(table(["common-ligature", ""]));
    expect(errs).toHaveLength(1);
    expect(errs[0].kind).toBe("error");
    expect(errs[0].parameters).toEqual(["fontVariantLigatures"]);
  });

  it("wrong case (CSS keywords are case-insensitive; the table is not)", () => {
    expect(ligatureErrors(table(["Normal", ""]))).toHaveLength(1);
    expect(ligatureErrors(table(["DISCRETIONARY-LIGATURES", ""]))).toHaveLength(
      1,
    );
  });

  it("CSS-style space-separated keywords", () => {
    expect(
      ligatureErrors(table(["discretionary-ligatures contextual", ""])),
    ).toHaveLength(1);
  });

  it("quoted keyword (fontFeatureSettings habit)", () => {
    expect(
      ligatureErrors(table(['"discretionary-ligatures"', ""])),
    ).toHaveLength(1);
  });

  it("ALL offenders reported in ONE error across conditions", () => {
    const errs = ligatureErrors(table(["bogus-one", "bogus-two"]));
    expect(errs).toHaveLength(1);
    const blob = `${errs[0].message} ${errs[0].hint}`;
    expect(blob).toContain("bogus-one");
    expect(blob).toContain("bogus-two");
  });
});

describe("contradictory keywords (deterministic at runtime, but ambiguous intent)", () => {
  it("none combined with another keyword → error", () => {
    const errs = ligatureErrors(table(["none, common-ligatures", ""]));
    expect(errs).toHaveLength(1);
    expect(errs[0].kind).toBe("error");
    expect(errs[0].parameters).toEqual(["fontVariantLigatures"]);
  });

  it("keyword and its no- form → error", () => {
    expect(
      ligatureErrors(table(["common-ligatures, no-common-ligatures", ""])),
    ).toHaveLength(1);
  });

  it("normal combined with another keyword → error", () => {
    expect(
      ligatureErrors(table(["normal, discretionary-ligatures", ""])),
    ).toHaveLength(1);
  });
});

describe("fontSource=browser gate (browser fonts cannot be baked)", () => {
  it("browser + discretionary-ligatures → error on fontVariantLigatures", () => {
    const errs = ligatureErrors(
      table(["discretionary-ligatures", ""], ["browser", "file"]),
    );
    expect(errs).toHaveLength(1);
    expect(errs[0].kind).toBe("error");
    expect(errs[0].parameters).toEqual(["fontVariantLigatures"]);
  });

  it("browser + common-ligatures → error (any non-normal keyword)", () => {
    expect(
      ligatureErrors(table(["common-ligatures", ""], ["browser", "file"])),
    ).toHaveLength(1);
  });

  it("browser + none → error (disabling needs the bake)", () => {
    expect(
      ligatureErrors(table(["none", ""], ["browser", "file"])),
    ).toHaveLength(1);
  });

  it("browser + normal → no error (no-op anyway)", () => {
    expect(
      ligatureErrors(table(["normal", ""], ["browser", "file"])),
    ).toHaveLength(0);
  });

  it("browser + blank → no error", () => {
    expect(ligatureErrors(table(["", ""], ["browser", "file"]))).toHaveLength(
      0,
    );
  });

  it.each(["file", "google", "adobe"])(
    "%s + discretionary-ligatures → no error",
    (source) => {
      expect(
        ligatureErrors(
          table(["discretionary-ligatures", ""], [source, "file"]),
        ),
      ).toHaveLength(0);
    },
  );
});
