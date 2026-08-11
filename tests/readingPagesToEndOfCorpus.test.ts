/**
 * readingPages = -1 — paginate until the end of the corpus.
 *
 * We use the very short IReST stories and test comprehension, so the
 * participant must read the WHOLE story; guessing the page count is
 * error-prone. readingPages = -1 asks EasyEyes to keep making pages until the
 * corpus runs out. This suite pins the pagination contract in
 * components/readingAddons.js (preprocessCorpusToSentenceList):
 *
 *   - -1 yields as many pages as the corpus fills, no blank pages, and the
 *     whole corpus appears in them (nothing dropped, nothing repeated);
 *   - a positive readingPages is unchanged: exactly that many pages, blank
 *     ones once the corpus is exhausted;
 *   - -1 never loops forever, even with readingCorpusEndlessBool (the
 *     compiler rejects that combination; here we pin the runtime backstop);
 *   - per-page stats (characters, words, lines) are recorded per page, which
 *     is what the CSV reports for each page.
 */
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// readingAddons.js reaches the whole app through its imports (psychoJS,
// the paramReader, the browser-only globals). The pagination itself needs
// none of that, so we stub the modules and hand it a fake text stimulus.
const mockGlobals = () => {
  class DefaultMap extends Map {
    default: () => any;
    constructor(defaultFunction: () => any, entries?: any) {
      super(entries);
      this.default = defaultFunction;
    }
    get(key: any) {
      if (!this.has(key)) this.set(key, this.default());
      return super.get(key);
    }
  }
  const readingPageStats = {
    readingPageSkipCorpusWords: new DefaultMap(() => []),
    readingPageDurationSec: new DefaultMap(() => []),
    readingPageLines: new DefaultMap(() => []),
    readingPageWords: new DefaultMap(() => []),
    readingPageNonblankCharacters: new DefaultMap(() => []),
  };
  jest.doMock("../components/global", () => ({
    __esModule: true,
    DefaultMap,
    readingPageStats,
    readingLineLengthUnit: { current: "character" },
    readingConfig: { height: 20, actualLinesPerPage: undefined },
    readingCorpusArchive: {},
    readingCorpusDepleted: new DefaultMap(() => false),
    readingCorpusFoilsArchive: new Map(),
    readingCorpusPastFoils: new Set(),
    readingCorpusPastTargets: new Set(),
    readingFrequencyToWordArchive: {},
    readingPageIndex: { current: 0 },
    readingThisBlockPages: new DefaultMap(() => []),
    readingUsedText: {},
    readingWordFrequencyArchive: {},
    readingWordListArchive: {},
    displayOptions: {},
    font: { name: "Roboto Mono", padding: 0, letterSpacing: 0 },
    fontCharacterSet: { current: [] },
    status: { block: 1, block_condition: "1_1" },
    targetEccentricityDeg: { x: 0, y: 0 },
    timing: {},
  }));
  return readingPageStats;
};

beforeEach(() => {
  jest.resetModules();
  jest.doMock("axios", () => ({
    __esModule: true,
    default: { get: jest.fn() },
  }));
  jest.doMock("../components/bounding", () => ({
    __esModule: true,
    _getCharacterSetBoundingBox: jest.fn(),
  }));
  jest.doMock("../preprocess/fontPixiMetricsStringDefault", () => ({
    __esModule: true,
    readFontMetricsCharacterSet: jest.fn(),
  }));
  jest.doMock("../components/utils", () => ({
    __esModule: true,
    degreesToPixels: jest.fn(),
    getRandomInt: jest.fn(),
    logger: jest.fn(),
    Rectangle: class {},
    xyPxOfDeg: jest.fn(),
    colorRGBASnippetToRGBA: jest.fn(),
    debug: false,
    getUnionRect: jest.fn(),
    isReadingWithSimultaneousQuestionAndAnswer: () => false,
  }));
  jest.doMock("../components/misc", () => ({
    __esModule: true,
    findLongestMatchingTail: jest.fn(),
  }));
  jest.doMock("../components/reading", () => {
    const tokenizer = jest.requireActual<any>("../components/readingTokenizer");
    return {
      __esModule: true,
      ...tokenizer,
      getWordFrequencies: jest.fn(),
      processWordFreqToFreqToWords: jest.fn(),
    };
  });
  jest.doMock("../components/globalPsychoJS", () => ({
    __esModule: true,
    psychoJS: { window: {} },
  }));
  jest.doMock("../components/letter", () => ({
    __esModule: true,
    readTrialLevelLetterParams: jest.fn(),
  }));
  jest.doMock("../psychojs/src", () => ({
    __esModule: true,
    visual: { TextStim: class {} },
    util: { Color: class {} },
  }));
  jest.doMock("../components/errorHandling", () => ({
    __esModule: true,
    warning: jest.fn(),
  }));
  jest.doMock("../threshold", () => ({
    __esModule: true,
    paramReader: { read: jest.fn() },
  }));
  jest.doMock("../components/multiple-displays/globals", () => ({
    __esModule: true,
    Screens: [{ pxPerCm: 40 }],
  }));
  jest.doMock("../components/multiple-displays/utils", () => ({
    __esModule: true,
    XYPxOfDeg: jest.fn(() => [0, 0]),
  }));
  jest.doMock("../components/color", () => ({
    __esModule: true,
    getInstructionColor: jest.fn(),
  }));
  jest.doMock("../components/fontDirection", () => ({
    __esModule: true,
    isFontLTR: () => true,
    readFontDirection: jest.fn(),
  }));
});

/**
 * A stand-in for the reading paragraph stimulus: a monospace-like text whose
 * width is proportional to its length, and whose lines are 10 px tall.
 */
const makeStimulus = (pxPerCharacter = 10) => {
  let text = "";
  return {
    height: 20,
    setLetterSpacingByProportion: () => {},
    measureText: (s: string) => ({ width: s.length * pxPerCharacter }),
    setText: (s: string) => {
      text = s;
    },
    getBoundingBox: () => ({ height: 10 * (text.split("\n").length || 1) }),
  };
};

const paginate = async (
  corpus: string,
  numberOfPages: number,
  {
    lineLength = 20,
    linesPerPage = 2,
    endless = false,
    // Wide/tall enough that only lineLength and linesPerPage bound the page.
    availableWidthPx = 100000,
    availableHeightPx = 100000,
  } = {},
) => {
  const { preprocessCorpusToSentenceList } = await import(
    "../components/readingAddons"
  );
  return preprocessCorpusToSentenceList(
    corpus,
    corpus,
    lineLength,
    linesPerPage,
    numberOfPages,
    makeStimulus(),
    "reading",
    0, // letterSpacing
    endless,
    "1_1",
    "none",
    availableWidthPx,
    availableHeightPx,
    "",
  );
};

/** 60 words: "w00 w01 … w59" — 4 characters each with its space. */
const WORDS = Array.from(
  { length: 60 },
  (_, i) => `w${String(i).padStart(2, "0")}`,
);
const CORPUS = WORDS.join(" ");

describe("readingPages = -1 — paginate to the end of the corpus", () => {
  it("makes as many pages as the corpus fills, with no blank page", async () => {
    mockGlobals();
    const { sentences } = await paginate(CORPUS, -1);
    // 5 words/line × 2 lines = 10 words/page, 60 words → 6 pages.
    expect(sentences).toHaveLength(6);
    expect(sentences.every((p: string) => p.length > 0)).toBe(true);
  });

  it("shows the whole corpus, in order, dropping and repeating nothing", async () => {
    mockGlobals();
    const { sentences } = await paginate(CORPUS, -1);
    expect(sentences.join(" ").split(/\s+/).filter(Boolean)).toEqual(WORDS);
  });

  it("leaves the last page partial rather than padding it", async () => {
    mockGlobals();
    // 25 words → 2 full pages of 10, then a page of 5.
    const short = WORDS.slice(0, 25).join(" ");
    const { sentences } = await paginate(short, -1);
    expect(sentences).toHaveLength(3);
    expect(sentences[2].split(/\s+/).filter(Boolean)).toHaveLength(5);
  });

  it("makes one page when the corpus is shorter than a page", async () => {
    mockGlobals();
    const { sentences } = await paginate("one two three", -1);
    // A line that ends because the corpus ran out keeps its trailing space.
    expect(sentences).toEqual(["one two three "]);
  });

  it("makes no page at all from an empty corpus", async () => {
    mockGlobals();
    const { sentences } = await paginate("", -1);
    expect(sentences).toEqual([]);
  });

  it("terminates even when readingCorpusEndlessBool is TRUE", async () => {
    mockGlobals();
    // The compiler rejects this combination; the runtime must not hang.
    const { sentences } = await paginate(CORPUS, -1, { endless: true });
    expect(sentences).toHaveLength(6);
  });

  it("records characters, words, and lines for every page", async () => {
    const stats = mockGlobals();
    const { sentences } = await paginate(CORPUS, -1);
    const chars = stats.readingPageNonblankCharacters.get("1_1");
    const words = stats.readingPageWords.get("1_1");
    const lines = stats.readingPageLines.get("1_1");
    expect(chars).toHaveLength(sentences.length);
    expect(words).toHaveLength(sentences.length);
    expect(lines).toHaveLength(sentences.length);
    expect(words.every((w: number) => w === 10)).toBe(true);
    expect(lines.every((l: number) => l === 2)).toBe(true);
  });

  it("reports the lines actually laid out on a partial last page", async () => {
    const stats = mockGlobals();
    // 12 words → a full page of 10, then a page of one line of 2 words.
    await paginate(WORDS.slice(0, 12).join(" "), -1);
    expect(stats.readingPageLines.get("1_1")).toEqual([2, 1]);
  });
});

describe("readingPages ≥ 0 — unchanged behavior", () => {
  it("makes exactly the requested number of pages", async () => {
    mockGlobals();
    const { sentences } = await paginate(CORPUS, 3);
    expect(sentences).toHaveLength(3);
    expect(sentences.join(" ").split(/\s+/).filter(Boolean)).toEqual(
      WORDS.slice(0, 30),
    );
  });

  it("pads with blank pages when the corpus runs out first", async () => {
    mockGlobals();
    const { sentences } = await paginate("one two three", 3);
    expect(sentences).toEqual(["one two three ", "", ""]);
  });

  it("makes no page when asked for zero pages", async () => {
    mockGlobals();
    const { sentences } = await paginate(CORPUS, 0);
    expect(sentences).toEqual([]);
  });
});
