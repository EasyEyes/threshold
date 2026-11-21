import {
  getGlossary,
  getSuperMatchingParams,
  initGlossary,
} from "../parameters/glossaryRegistry";
import { linkGlossaryParameters } from "../parameters/glossaryLink";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";
import {
  checkObsoleteGlossaryReferences,
  collectStudyGlossaryReferences,
} from "../preprocess/glossaryAudit";
import type { GlossaryEntry } from "../../source/components/types";

const entry = (
  name: string,
  type = "text",
  explanation = "",
): GlossaryEntry => ({
  name,
  type,
  explanation,
  availability: "",
  default: "",
  example: "",
  categories: [],
});
beforeEach(() => {
  initGlossary({
    version: "test",
    glossary: {
      _online2PayCurrency: entry(
        "_online2PayCurrency",
        "obsolete",
        "❌ Use _online2PayCurrencyCode instead.",
      ),
      _online2PayCurrencyCode: entry("_online2PayCurrencyCode"),
      fontLeftToRightBool: entry(
        "fontLeftToRightBool",
        "obsolete",
        "❌ Use fontDirection instead.",
      ),
      fontDirection: entry("fontDirection"),
      fontDirections: entry("fontDirections", "obsolete"),
      retiredWithoutReplacement: entry("retiredWithoutReplacement", "obsolete"),
    },
    glossaryFull: [],
    superMatchingParams: [],
  });
});

const errorsFor = (name: string) =>
  validateExperimentTable(new ExperimentTable([[name, "", "TRUE"]])).filter(
    (e) =>
      ["Parameter is obsolete", "Parameter is unrecognized"].includes(e.name),
  );

it.each([
  ["_online2PayCurrency", "_online2PayCurrencyCode"],
  ["fontLeftToRightBool", "fontDirection"],
])(
  "reports %s as obsolete with the Glossary replacement",
  (name, replacement) => {
    const errors = errorsFor(name);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      name: "Parameter is obsolete",
      kind: "error",
      parameters: [name],
    });
    expect(errors[0].hint).toContain(
      `<span class="alert-parameter">${replacement}</span>`,
    );
    expect(linkGlossaryParameters(errors[0].hint)).toContain("<a ");
  },
);

it("checks obsolete Glossary entries without audit data", () => {
  const name = "fontLeftToRightBool";
  const references = collectStudyGlossaryReferences([[name, "", "TRUE"]]);
  expect(checkObsoleteGlossaryReferences(references)).toEqual(errorsFor(name));
});

it("rejects numbered members of an obsolete Glossary family", () => {
  getGlossary()["retiredFont@@"] = entry("retiredFont@@", "obsolete");
  getSuperMatchingParams().push("retiredFont@@");
  const references = collectStudyGlossaryReferences([
    ["retiredFont01", "", "Arial"],
  ]);
  expect(checkObsoleteGlossaryReferences(references)).toEqual([
    expect.objectContaining({
      name: "Parameter is obsolete",
      kind: "error",
      parameters: ["retiredFont01"],
    }),
  ]);
});

it("does not invent a replacement when the Glossary has none", () => {
  expect(errorsFor("retiredWithoutReplacement")[0].hint).toContain(
    "No replacement is specified",
  );
});

it("treats the Glossary explanation as text while linking parameter names", () => {
  getGlossary().fontLeftToRightBool.explanation =
    "<img src=x onerror=alert(1)>\nUse fontDirection & check its values.";
  const [error] = errorsFor("fontLeftToRightBool");
  expect(error.hint).not.toContain("<img");
  expect(error.hint).toContain("&lt;img");
  expect(error.hint).toContain("&amp;");
  expect(error.hint).toContain(
    '<br/>Use <span class="alert-parameter">fontDirection</span>',
  );
});

it("explains undefined names and only suggests similar non-obsolete entries", () => {
  const [error] = errorsFor("fontDirectionz");
  expect(error.message).toContain("not defined in the Parameter Glossary");
  expect(error.message).toContain(
    '<span class="alert-parameter">fontDirection</span>',
  );
  expect(error.message + error.hint).not.toContain(">fontDirections<");
  expect(error.message + error.hint).not.toContain("undefined");
});

it("omits unrelated guesses for an unknown name", () => {
  const [error] = errorsFor("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");
  expect(error.message).toContain("not defined in the Parameter Glossary");
  expect(error.message + error.hint).not.toContain('class="alert-parameter"');
  expect(error.hint).toContain("No similarly spelled");
});
