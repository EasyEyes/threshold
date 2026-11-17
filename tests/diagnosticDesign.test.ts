/** @jest-environment node */
import {
  FONT_SHAPING_TABLE_REJECTED,
  FONT_WRONG_LANGUAGE,
  FONT_READING_CORPUS_CHARACTERS_MISSING,
} from "../preprocess/errorMessages";

it.each([
  FONT_SHAPING_TABLE_REJECTED("Example", ["GSUB"], [0]),
  FONT_WRONG_LANGUAGE("Example", "Arabic", "ar", "Missing shapes", [], [0]),
  FONT_READING_CORPUS_CHARACTERS_MISSING("Example", "text.txt", "x", 1, [0]),
])("keeps font background guidance in message sections", (error) => {
  expect(error.message).toContain('class="diagnostic-section"');
  expect(error.hint).not.toContain("<br><br>");
  expect(error.hint).not.toContain("The EasyEyes compiler uses");
  expect(error.hint).not.toContain("Unsupported characters may appear");
});

import {
  TYPEKIT_FONT_ONLY_AVAILABLE_WITH_SUBSCRIPTION,
  TYPEKIT_FONTS_MISSING,
} from "../preprocess/errorMessages";
it.each([
  TYPEKIT_FONT_ONLY_AVAILABLE_WITH_SUBSCRIPTION("font", {}),
  TYPEKIT_FONTS_MISSING("font", {}),
])("uses sections rather than literal newlines for Adobe guidance", (error) => {
  expect(error.message).toContain('class="diagnostic-section"');
  expect(error.message + error.hint).not.toContain("\n");
  expect(error.hint).not.toContain("Copy the");
});

import { PROLIFIC_API_ERROR } from "../preprocess/errorMessages";
it("keeps Prolific API details out of the corrective hint and escapes them", () => {
  const error = PROLIFIC_API_ERROR(
    "_online2PayCurrencyCode",
    "<img src=x> denied",
    "group",
  );
  expect(error.message).toContain("&lt;img src=x&gt; denied");
  expect(error.message).toContain("<strong>API details.</strong>");
  expect(error.hint).toBe(
    "Check your Prolific token and internet connection, then try again.",
  );
});
