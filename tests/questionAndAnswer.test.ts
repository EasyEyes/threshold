/**
 * RED tests for getNumberOfQuestionsInThisCondition / Block — Bug A symptom.
 *
 * These exercise the user-facing consequence of the stateful-`/g` regex bug in
 * paramReader.readMatching: questionAndAnswer counting undercounts, which makes
 * showCounterBool display a wrong "Trial X of N" denominator on Q&A pages
 * (e.g. "Trial 1 of 1" when there are several questions).
 *
 * Desired behavior: count every non-empty questionAndAnswerNN / questionAnswerNN
 * parameter present for the condition/block.
 */

const qaEntry = (name: string) => ({
  name,
  availability: "now",
  type: "text",
  default: "",
  explanation: "",
  example: "",
  categories: [],
});

const fixture = {
  version: "test",
  glossary: {
    questionAndAnswer01: qaEntry("questionAndAnswer01"),
    questionAndAnswer02: qaEntry("questionAndAnswer02"),
    questionAndAnswer03: qaEntry("questionAndAnswer03"),
    questionAnswer01: qaEntry("questionAnswer01"),
    showCounterBool: qaEntry("showCounterBool"),
  },
  glossaryFull: [],
  superMatchingParams: [],
};

describe("questionAndAnswer question counting (Bug A symptom)", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock("papaparse", () => ({
      __esModule: true,
      default: { parse: () => {} },
    }));
  });

  const buildReader = async () => {
    const { initGlossary } = await import("../parameters/glossaryRegistry");
    const { ParamReader } = await import("../parameters/paramReader");
    initGlossary(fixture as any);
    const reader = new ParamReader("conditions");
    (reader as any)._experiment = [
      {
        block: 1,
        block_condition: "1_1",
        questionAndAnswer01: "CHOICE|q1|a|b",
        questionAndAnswer02: "TEXT|q2",
        questionAndAnswer03: "YESNO|q3|Yes|No",
        questionAnswer01: "CHOICE|q4|c|d",
        showCounterBool: true,
      },
    ];
    return reader;
  };

  describe("getNumberOfQuestionsInThisCondition", () => {
    it("counts ALL non-empty questionAndAnswer/questionAnswer params", async () => {
      const reader = await buildReader();
      const { getNumberOfQuestionsInThisCondition } = await import(
        "../components/questionAndAnswer"
      );
      // 4 non-empty questions: qAA01, qAA02, qAA03, qA01
      expect(getNumberOfQuestionsInThisCondition(reader, "1_1")).toBe(4);
    });

    it("counts the middle question that the /g bug skips (questionAndAnswer02)", async () => {
      const reader = await buildReader();
      const { getNumberOfQuestionsInThisCondition } = await import(
        "../components/questionAndAnswer"
      );
      const n = getNumberOfQuestionsInThisCondition(reader, "1_1");
      // The /g bug returns 2 here; correct answer must be >= 3 to include qAA02.
      expect(n).toBeGreaterThanOrEqual(3);
    });
  });

  // getNumberOfQuestionsInThisBlock is NOT exported (private, used only by
  // isQuestionAndAnswerBlock). It shares the exact same readMatching(/g) bug,
  // so it is fixed transitively by the readMatching root-cause fix and covered
  // by the paramReaderReadMatching.test.ts suite.
});
