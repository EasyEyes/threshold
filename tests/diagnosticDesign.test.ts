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
