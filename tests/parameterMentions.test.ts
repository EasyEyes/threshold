/**
 * @jest-environment node
 *
 * Future-proofing: every parameter name referenced in an error's message or
 * hint must carry the standard `<span class="error-parameter">` markup, so it
 * renders bold and links to its glossary entry. A bare mention (plain text)
 * looks like prose and is not clickable — the "Text file is missing" family
 * shipped that way for readingCorpus/readingCorpusFoils.
 *
 * The registry below must list EVERY exported error factory; a missing (or
 * stale) entry fails the completeness test, so new errors are scanned from
 * the day they are written. Table-level checks (validateExperimentTable) are
 * scanned too, via the example-table corpus.
 *
 * The error NAME is not scanned: names render through .error-name, where
 * links are not applied and nested emphasis is invisible.
 */
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import * as ErrorMessages from "../preprocess/errorMessages";
import * as ExportErrors from "../preprocess/exportBeforeCompile";
import { loadGlossaryForTests } from "./helpers/glossary";
import { getGlossary } from "../parameters/glossaryRegistry";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";

beforeAll(async () => {
  await loadGlossaryForTests();
});

/** Representative args per factory. Parameter-name args use real glossary
 * names so the scanner sees realistic mentions. */
const FACTORY_ARGS: Record<string, unknown[]> = {
  UNBALANCED_COMMAS: [[{ parameter: "block", length: 5, correctLength: 4 }]],
  PROLIFIC_TITLE_TOO_LONG: [121, 120],
  PROLIFIC_CURRENCY_NOT_SUPPORTED: ["EUR", ["USD", "GBP"]],
  PROLIFIC_PARTICIPANT_GROUP_NOT_FOUND: ["_online2PayCurrencyCode", "grp"],
  PROLIFIC_API_ERROR: ["_online2PayCurrencyCode", "boom", "grp"],
  LOGGING_REQUIRES_AUTHOR_EMAIL: [["_loggingBool"]],
  LOGGING_CAUTION: [["_loggingBool"], { used: 1, limit: 10 }],
  INVALID_FOLDER_STRUCTURE: ["myFolder", "maskerSoundFolder"],
  FONT_FILES_MISSING: ["font", ["SomeFont.ttf"]],
  IMAGE_FILES_MISSING: ["targetImage", ["a.png"]],
  FONT_FILES_MISSING_WEB: ["font", ["SomeFont.ttf"]],
  ERROR_CREATING_TYPEKIT_KIT: [],
  TYPEKIT_FONT_ONLY_AVAILABLE_WITH_SUBSCRIPTION: [
    "font",
    { "My Font": { columns: ["C"], blocks: [1] } },
  ],
  TYPEKIT_FONTS_MISSING: [
    "font",
    { "My Font": { columns: ["C"], blocks: [1] } },
  ],
  IMAGE_FOLDER_INVALID_NUMBER_OF_FILES: ["targetImageFolder", "imgs", 3, "C"],
  IMAGE_FOLDER_INVALID_NUMBER_OF_OPTIONS: ["targetImageFolder", "imgs", 9, "C"],
  IMAGE_FOLDER_INVALID_EXTENSION_FILES: ["targetImageFolder", "imgs", "C"],
  IMAGE_FOLDER_MISSING: ["targetImageFolder", "imgs"],
  SOUND_FOLDER_MISSING: ["maskerSoundFolder", ["a.wav"]],
  FORM_FILES_MISSING: ["_debriefForm", ["f.pdf"]],
  TEXT_FILES_MISSING: ["readingCorpus", ["corpus.txt"]],
  CODE_FILES_MISSING: ["evaluateJSCode", ["code.js"]],
  INVALID_STARTING_BLOCK: ["3"],
  EMPTY_BLOCK_VALUES: [[2]],
  NONSEQUENTIAL_BLOCK_VALUE: [
    [{ value: 3, previous: 1, index: 4 }],
    ["1", "1"],
  ],
  IMPROPER_GLOSSARY_FONT_PIXI_METRICS_STRING_DEFAULT: [["zz"], "en"],
  READING_CORPUS_TOO_SHORT: [
    {
      condition: 1,
      corpusFile: "corpus.txt",
      corpusCharacters: 100,
      requestedPages: 5,
      lineLength: 30,
      wordsPerPage: 10,
    },
  ],
  READING_CORPUS_INSUFFICIENT_FOILS: [
    {
      condition: 1,
      corpusFile: "corpus.txt",
      uniqueWords: 10,
      unavailableWords: 3,
      foilsNeeded: 5,
      foilColumn: "C",
    },
  ],
  IMPULSE_RESPONSE_FILES_MISSING: ["maskerSoundImpulseResponse", ["ir.wav"]],
  IMPULSE_RESPONSE_FILE_INVALID_FORMAT: ["ir.wav", "not audio"],
  FREQUENCY_RESPONSE_FILES_MISSING: [
    "maskerSoundFrequencyResponse",
    ["fr.csv"],
  ],
  FREQUENCY_RESPONSE_FILE_INVALID_FORMAT: ["fr.csv", "bad columns"],
  TARGET_SOUND_LIST_FILES_MISSING: ["targetSoundList", ["list.csv"], ["C"]],
  TARGET_SOUND_LIST_FILE_INVALID_FORMAT: ["list.csv", "bad columns"],
  GOOGLE_FONT_VARIABLE_SETTINGS_INVALID: ["SomeFont", "wght=700", [0]],
  FONT_NOT_VARIABLE: ["SomeFont", [0]],
  FONT_SHAPING_TABLE_REJECTED: ["SomeFont", ["GSUB"], [0]],
  FONT_WRONG_LANGUAGE: [
    "SomeFont",
    "ar",
    "ar",
    // External text (ShaperGlot summary) — realistic value ends a sentence.
    "The font does not support 3 characters.",
    [],
    [0],
  ],
  FONT_READING_CORPUS_CHARACTERS_MISSING: [
    "SomeFont",
    "corpus.txt",
    "你",
    1,
    [0],
  ],
  FONT_AXIS_NOT_FOUND: ["SomeFont", ["wght"], [], [0]],
  FONT_AXIS_VALUE_OUT_OF_RANGE: ["SomeFont", [], [], [0]],
  FONT_WEIGHT_NOT_VARIABLE: ["SomeFont", [0]],
  FONT_WEIGHT_MISSING_WGHT_AXIS: ["SomeFont", [], [0]],
  FONT_WEIGHT_OUT_OF_RANGE: ["SomeFont", 900, 100, 700, 400, [0]],
  PHRASE_FILE_MISSING: ["requestedPhrases", "phrases.csv"],
  TILDE_WITHOUT_PHRASE_TABLE: ["targetKind", "~greeting"],
  TILDE_SYMBOL_NOT_FOUND: ["targetKind", "~greeting"],
  TILDE_LANGUAGE_NOT_IN_TABLE: ["targetKind", "~greeting", "ur"],
  TILDE_RESOLVED_BLANK: ["targetKind", "~greeting", "ur"],
  FONT_FEATURE_ANALYSIS_ERROR: [
    [
      {
        tag: "liga",
        block: 1,
        kind: "k",
        fontName: "F",
        param: "font",
        keyword: "dlig",
      },
    ],
  ],
};

/** Factories from exportBeforeCompile render in the same error list. */
const EXPORT_FACTORY_ARGS: Record<string, unknown[]> = {
  NO_SPREADSHEET_TO_EXPORT: [["a.pdf"]],
  UNREADABLE_SPREADSHEET_FOR_EXPORT: ["a.pdf", "oops"],
  EXPORT_FAILED: ["a.pdf", "Download failed."],
};

/**
 * Bare parameter mentions: strip the standard param spans (repeatedly, so
 * spans nested inside spans — e.g. NONSEQUENTIAL_BLOCK_VALUE's row echo —
 * are removed whole), strip all other tags, then find any glossary
 * parameter name standing as its own token. Word boundaries use the
 * identifier charset, so "font" inside "fontTolerateFaults" or inside
 * "fonts" does not match.
 */
const stripParamSpans = (html: string): string => {
  let out = html;
  let next = out.replace(/<span class="error-parameter">[^<]*<\/span>/g, " ");
  while (next !== out) {
    out = next;
    next = out.replace(/<span class="error-parameter">[^<]*<\/span>/g, " ");
  }
  return out;
};

const bareParameterMentions = (html: string): string[] => {
  const glossaryNames = Object.keys(getGlossary());
  const text = stripParamSpans(html).replace(/<[^>]+>/g, " ");
  const found: string[] = [];
  for (const name of glossaryNames) {
    const re = new RegExp(`(?<![A-Za-z0-9_@])${name}(?![A-Za-z0-9_@])`);
    if (re.test(text)) found.push(name);
  }
  return found;
};

/**
 * Documented exceptions: parameter names used as English prose or as
 * positional references, where markup would be wrong. Keep this list short
 * and give each a reason.
 */
const PROSE_EXCEPTIONS: Record<string, string[]> = {
  // "choosing a font that supports…", "The font "X" …" — the common noun,
  // not a reference to the font parameter's value.
  FONT_READING_CORPUS_CHARACTERS_MISSING: ["font"],
  FONT_NOT_VARIABLE: ["font"],
  FONT_SHAPING_TABLE_REJECTED: ["font"],
  FONT_AXIS_NOT_FOUND: ["font"],
  FONT_AXIS_VALUE_OUT_OF_RANGE: ["font"],
  FONT_WEIGHT_NOT_VARIABLE: ["font"],
  FONT_WEIGHT_MISSING_WGHT_AXIS: ["font"],
  FONT_WEIGHT_OUT_OF_RANGE: ["font"],
  FONT_FEATURE_ANALYSIS_ERROR: ["font"],
  FONT_WRONG_LANGUAGE: ["font"],
  GOOGLE_FONT_VARIABLE_SETTINGS_INVALID: ["font"],
  TYPEKIT_FONT_ONLY_AVAILABLE_WITH_SUBSCRIPTION: ["font", "block"],
  TYPEKIT_FONTS_MISSING: ["font", "block"],
  // "Are both font source and name correct?" — the common noun.
  FONT_FILES_MISSING: ["font"],
  FONT_FILES_MISSING_WEB: ["font"],
  // ".targetSoundList.xlsx" — the file-extension pattern, not the parameter.
  TARGET_SOUND_LIST_FILE_INVALID_FORMAT: ["targetSoundList"],
  // "block 3 in column C" — positional references like "column C".
};

/** Corpus-level exceptions, keyed by error name. */
const CORPUS_EXCEPTIONS: Record<string, string[]> = {
  // The suggestion-diff parenthetical echoes the suggestion as plain text
  // by design (deliberately not a glossary link); the standalone suggestion
  // IS spanned.
  "Parameter is unrecognized": ["message"],
};

/**
 * Terminal-punctuation check: a non-empty message/hint must end like a
 * sentence — trailing whitespace stripped, then a final `.`, `?`, `!`, or
 * `)` (parenthesized column note), or a list (`</ul>`/`</ol>`), where the
 * sentence punctuation precedes the list.
 */
const endsLikeSentence = (html: string): boolean => {
  const t = html.replace(/\s+$/g, "");
  if (t === "") return true;
  if (/<\/(ul|ol)>$/.test(t)) return true;
  return /[.?!)]$/.test(t);
};

describe("factory registry completeness", () => {
  it("every exported error factory has registered args (and none are stale)", () => {
    const modules = [
      [ErrorMessages, FACTORY_ARGS],
      [ExportErrors, EXPORT_FACTORY_ARGS],
    ] as const;
    for (const [module, registry] of modules) {
      // Factories are SCREAMING_CASE; camelCase helpers are ignored.
      const exported = Object.keys(module).filter(
        (k) =>
          /^[A-Z][A-Z0-9_]*$/.test(k) &&
          typeof (module as Record<string, unknown>)[k] === "function",
      );
      if (registry === FACTORY_ARGS)
        expect(exported.length).toBeGreaterThan(40);
      for (const name of exported)
        expect(Object.keys(registry)).toContain(name);
      for (const name of Object.keys(registry))
        expect(exported).toContain(name);
    }
  });
});

describe("parameter references in error text are param-spanned", () => {
  const allFactories = [
    [ErrorMessages, FACTORY_ARGS],
    [ExportErrors, EXPORT_FACTORY_ARGS],
  ] as const;

  it.each(
    [
      ...Object.entries(FACTORY_ARGS),
      ...Object.entries(EXPORT_FACTORY_ARGS),
    ].map(([name, args]) => [name, args] as const),
  )("%s: no bare parameter mentions", (name, args) => {
    const module = allFactories.find(([, registry]) =>
      Object.prototype.hasOwnProperty.call(registry, name),
    )![0] as Record<
      string,
      (...a: unknown[]) => { message: string; hint: string }
    >;
    const error = module[name](...args);
    const allowed = PROSE_EXCEPTIONS[name] ?? [];
    // Names render as plain text on the compiler page — no HTML allowed.
    expect(error.name).not.toMatch(/<[a-zA-Z]/);
    for (const field of ["message", "hint"] as const) {
      expect(endsLikeSentence(error[field] ?? "")).toBe(true);
      const bare = bareParameterMentions(error[field] ?? "").filter(
        (found) => !allowed.includes(found),
      );
      expect(bare).toEqual([]);
    }
  });

  it("example-table corpus (table checks): no bare parameter mentions", () => {
    const dir = path.resolve(__dirname, "../examples/tables");
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".csv"))
      .sort();
    expect(files.length).toBeGreaterThan(10);
    const violations: string[] = [];
    for (const file of files) {
      const csv = fs.readFileSync(path.join(dir, file), "utf8");
      const parsed = Papa.parse(csv, { skipEmptyLines: true });
      const errors = validateExperimentTable(
        new ExperimentTable(parsed.data as readonly (readonly string[])[]),
      );
      for (const error of errors) {
        if (/<[a-zA-Z]/.test(error.name))
          violations.push(`${file} · ${error.name} · name contains HTML`);
        for (const field of ["message", "hint"] as const)
          if (
            !endsLikeSentence(
              (error as unknown as Record<string, string>)[field] ?? "",
            )
          )
            violations.push(
              `${file} · ${error.name} · ${field} lacks terminal punctuation`,
            );
        const skipFields = CORPUS_EXCEPTIONS[error.name] ?? [];
        for (const field of ["message", "hint"] as const) {
          if (skipFields.includes(field)) continue;
          for (const bare of bareParameterMentions(
            (error as unknown as Record<string, string>)[field] ?? "",
          )) {
            violations.push(`${file} · ${error.name} · ${field} · ${bare}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
