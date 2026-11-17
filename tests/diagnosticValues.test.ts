/**
 * @jest-environment node
 *
 * Canonical value markup for compiler diagnostics. Parameter names use
 * error-parameter; their VALUES (valid categories, defaults, supplied cells,
 * recommended settings, …) use error-value instead of quotes or ad-hoc bold.
 */
import {
  diagnosticOffendingValuesLabel,
  diagnosticValue,
  diagnosticValueHtml,
  diagnosticValues,
} from "../preprocess/diagnosticHtml";
import { annotateInvisibleCharacters } from "../preprocess/parameterName";
import { IMPULSE_RESPONSE_FILE_INVALID_FORMAT } from "../preprocess/errorMessages";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";
import { loadGlossaryForTests } from "./helpers/glossary";

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("diagnostic object conventions", () => {
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

describe("diagnosticOffendingValuesLabel", () => {
  test("singular for one offending column, even with several values in the cell", () => {
    expect(diagnosticOffendingValuesLabel("erroneous", ["B", "B"])).toBe(
      "The erroneous value is",
    );
  });

  test("plural for several distinct offending columns", () => {
    expect(diagnosticOffendingValuesLabel("unimplemented", ["C", "E"])).toBe(
      "The unimplemented values are",
    );
  });
});

describe("diagnosticValue", () => {
  test("uses the shared code element without adding quotes", () => {
    expect(diagnosticValue("Chrome Mobile")).toBe(
      '<code class="error-value">Chrome Mobile</code>',
    );
  });

  test("escapes table-supplied HTML", () => {
    expect(diagnosticValue('<img src=x onerror="boom">')).toBe(
      '<code class="error-value">&lt;img src=x onerror=&quot;boom&quot;&gt;</code>',
    );
  });

  test("styles every category in a list", () => {
    expect(diagnosticValues(["ltr", "rtl"])).toBe(
      '<code class="error-value">ltr</code>, <code class="error-value">rtl</code>',
    );
  });

  test("escapes plain text around preformatted invisible-character labels", () => {
    expect(diagnosticValueHtml(annotateInvisibleCharacters("<x>"))).toBe(
      '<code class="error-value">&lt;x&gt;</code>',
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
      expect(error.message).toContain(diagnosticValue(category));
    expect(error.hint).toContain(diagnosticValue("Cgrome, Firefox, Edge"));
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
    expect(error.hint).toContain(diagnosticValue('<img src=x onerror="boom">'));
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
