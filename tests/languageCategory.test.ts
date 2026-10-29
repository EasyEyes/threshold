/** @jest-environment node */
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";

beforeAll(async () => {
  await loadGlossaryForTests();
});
const languageErrors = (language: string) =>
  validateExperimentTable(
    new ExperimentTable([
      ["_language", language],
      ["block", "", "1"],
      ["conditionName", "", "A"],
    ]),
  ).filter(
    (error) => error.parameters.includes("_language") && error.kind === "error",
  );

it.each(["not-a-language", "English", "en,fr"])(
  "blocks unsupported language value %s",
  (language) => {
    const errors = languageErrors(language);
    expect(errors.length).toBeGreaterThan(0);
    expect(
      errors.some((error) => error.message.includes("Valid categories are:")),
    ).toBe(true);
  },
);
it.each(["en", "fr", "fa"])("accepts allowed language %s", (language) => {
  expect(languageErrors(language)).toEqual([]);
});
