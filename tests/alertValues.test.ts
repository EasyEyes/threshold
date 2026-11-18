/**
 * @jest-environment node
 *
 * Canonical value markup for alerts. Parameter names use alert-parameter;
 * their VALUES (valid categories, defaults, supplied cells, recommended
 * settings, …) use alert-value instead of quotes or ad-hoc bold.
 */
import {
  alertOffendingValuesLabel,
  alertParameter,
  alertInvalid,
  alertDeleted,
  alertInserted,
  alertValue,
  alertValueHtml,
  alertValues,
} from "../preprocess/alertHtml";
import { annotateInvisibleCharacters } from "../preprocess/parameterName";
import { IMPULSE_RESPONSE_FILE_INVALID_FORMAT } from "../preprocess/alerts";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";
import { loadGlossaryForTests } from "./helpers/glossary";

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("alert object conventions", () => {
  test("parameters contains parameter names, not filenames", () => {
    expect(
      IMPULSE_RESPONSE_FILE_INVALID_FORMAT("ir.wav", "bad columns").parameters,
    ).toEqual([]);
    expect(
      IMPULSE_RESPONSE_FILE_INVALID_FORMAT(
        "ir.wav",
        "bad columns",
        "maskerSoundImpulseResponse",
      ).parameters,
    ).toEqual(["maskerSoundImpulseResponse"]);
  });
});

describe("alertOffendingValuesLabel", () => {
  test("singular for one offending column, even with several values in the cell", () => {
    expect(alertOffendingValuesLabel("erroneous", ["B", "B"])).toBe(
      "The erroneous value is",
    );
  });

  test("plural for several distinct offending columns", () => {
    expect(alertOffendingValuesLabel("unimplemented", ["C", "E"])).toBe(
      "The unimplemented values are",
    );
  });
});

describe("canonical alert markup", () => {
  test("parameters and semantic highlights escape their content", () => {
    expect(alertParameter('font<img src="x">')).toBe(
      '<span class="alert-parameter">font&lt;img src=&quot;x&quot;&gt;</span>',
    );
    expect(alertParameter("questionAndAnswer01", "questionAndAnswer@@")).toBe(
      '<span class="alert-parameter" data-glossary-key="questionAndAnswer@@">questionAndAnswer01</span>',
    );
    expect(alertInvalid("<bad>")).toBe(
      '<span class="alert-invalid">&lt;bad&gt;</span>',
    );
    expect(alertDeleted("old")).toBe('<span class="alert-deleted">old</span>');
    expect(alertInserted("new")).toBe(
      '<span class="alert-inserted">new</span>',
    );
  });
});

describe("alertValue", () => {
  test("uses the shared code element without adding quotes", () => {
    expect(alertValue("Chrome Mobile")).toBe(
      '<code class="alert-value">Chrome Mobile</code>',
    );
  });

  test("escapes table-supplied HTML", () => {
    expect(alertValue('<img src=x onerror="boom">')).toBe(
      '<code class="alert-value">&lt;img src=x onerror=&quot;boom&quot;&gt;</code>',
    );
  });

  test("styles every category in a list", () => {
    expect(alertValues(["ltr", "rtl"])).toBe(
      '<code class="alert-value">ltr</code>, <code class="alert-value">rtl</code>',
    );
  });

  test("escapes plain text around preformatted invisible-character labels", () => {
    expect(alertValueHtml(annotateInvisibleCharacters("<x>"))).toBe(
      '<code class="alert-value">&lt;x&gt;</code>',
    );
  });
});

describe("wrong-type diagnostics", () => {
  test("valid categories and offending values use the same value class", () => {
    const errors = validateExperimentTable(
      new ExperimentTable([
        ["block", "", "1"],
        ["_needBrowser", "Cgrome, Firefox, Edge"],
      ]),
    );
    const error = errors.find(
      (e) =>
        e.name === "Parameter contains values of the wrong type" &&
        e.parameters.includes("_needBrowser"),
    )!;
    expect(error).toBeDefined();
    for (const category of ["all", "Chrome", "Chrome Mobile", "Firefox"])
      expect(error.message).toContain(alertValue(category));
    expect(error.hint).toContain(alertValue("Cgrome, Firefox, Edge"));
    expect(error.hint).toContain("The erroneous value is:");
    expect(error.hint).not.toContain("The erroneous values are:");
    expect(error.hint).not.toContain('"Cgrome, Firefox, Edge"');
  });

  test("pluralizes by offending columns, not values within a cell", () => {
    const errors = validateExperimentTable(
      new ExperimentTable([
        ["block", "", "1", "1"],
        ["conditionTrials", "", "a", "b"],
      ]),
    );
    const error = errors.find(
      (e) =>
        e.name === "Parameter contains values of the wrong type" &&
        e.parameters.includes("conditionTrials"),
    )!;
    expect(error.hint).toContain("The erroneous values are:");
  });

  test("offending values are HTML-escaped", () => {
    const errors = validateExperimentTable(
      new ExperimentTable([
        ["block", "", "1"],
        ["conditionTrials", "", '<img src=x onerror="boom">'],
      ]),
    );
    const error = errors.find(
      (e) =>
        e.name === "Parameter contains values of the wrong type" &&
        e.parameters.includes("conditionTrials"),
    )!;
    expect(error.hint).toContain(alertValue('<img src=x onerror="boom">'));
    expect(error.hint).not.toContain('<img src=x onerror="boom">');
  });
});

describe("unimplemented-value diagnostics", () => {
  test("fontDirection uses singular for one offending column", () => {
    const errors = validateExperimentTable(
      new ExperimentTable([
        ["block", "", "1", "1"],
        ["fontDirection", "", "vertical-rl", "ltr"],
      ]),
    );
    const error = errors.find(
      (e) => e.name === "fontDirection vertical not yet implemented",
    )!;
    expect(error.hint).toContain("The unimplemented value is:");
  });

  test("fontDirection uses plural for several offending columns", () => {
    const errors = validateExperimentTable(
      new ExperimentTable([
        ["block", "", "1", "1"],
        ["fontDirection", "", "vertical-rl", "vertical-lr"],
      ]),
    );
    const error = errors.find(
      (e) => e.name === "fontDirection vertical not yet implemented",
    )!;
    expect(error.hint).toContain("The unimplemented values are:");
  });

  test("fontPreRender uses the same column-count rule", () => {
    const errors = validateExperimentTable(
      new ExperimentTable([
        ["block", "", "1", "1"],
        ["fontPreRender", "", "cache", "none"],
      ]),
    );
    const error = errors.find(
      (e) => e.name === "fontPreRender cache not yet implemented",
    )!;
    expect(error.hint).toContain("The unimplemented value is:");
  });
});
