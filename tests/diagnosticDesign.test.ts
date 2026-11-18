/** @jest-environment node */
import {
  FONT_SHAPING_TABLE_REJECTED,
  FONT_WRONG_LANGUAGE,
  FONT_READING_CORPUS_CHARACTERS_MISSING,
  TYPEKIT_FONT_ONLY_AVAILABLE_WITH_SUBSCRIPTION,
  TYPEKIT_FONTS_MISSING,
  PROLIFIC_API_ERROR,
} from "../preprocess/errorMessages";

it.each([
  FONT_SHAPING_TABLE_REJECTED("Example", ["GSUB"], [0]),
  FONT_WRONG_LANGUAGE("Example", "Arabic", "ar", "Missing shapes", [], [0]),
  FONT_READING_CORPUS_CHARACTERS_MISSING("Example", "text.txt", "x", 1, [0]),
])(
  "retains production value markup and corrective advice for font errors",
  (error) => {
    expect(error.kind).toBe("error");
    expect(error.message).toContain('<code class="error-value">Example</code>');
    expect(error.hint).toContain('class="error-parameter"');
    expect(error.hint).toContain('class="error-value"');
    expect(error.parameters).toContain("font");
  },
);

it.each([TYPEKIT_FONT_ONLY_AVAILABLE_WITH_SUBSCRIPTION, TYPEKIT_FONTS_MISSING])(
  "retains Adobe file lists with production value markup",
  (factory) => {
    const error = factory("font", { Example: { columns: ["C"], blocks: [1] } });
    expect(error.message).toContain(
      '<li><code class="error-value">Example</code>',
    );
    expect(error.hint).toContain("https://");
    expect(error.kind).toBe("error");
    expect(error.parameters).toEqual(["font"]);
  },
);

it("uses production group-value markup and retains Prolific recovery details", () => {
  const error = PROLIFIC_API_ERROR(
    "_prolific2CompletionPathAddToGroup",
    "HTTP 503",
    "<img src=x>",
  );
  expect(error.message).toContain(
    '<code class="error-value">&lt;img src=x&gt;</code>',
  );
  expect(error.hint).toContain("HTTP 503");
  expect(error.hint).toContain("Prolific token and internet connection");
  expect(error.kind).toBe("error");
});
