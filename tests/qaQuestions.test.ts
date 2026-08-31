/**
 * RED tests for pure questionAndAnswer blocks with MULTIPLE conditions.
 *
 * Bug (notes/TODO-questionAndAnswer-multi-condition-blocks.md): block-prep
 * gathered questions with `paramReader.read(qName, block)[0]` — only the
 * FIRST condition's questions. The TrialHandler then scheduled
 * nReps × nConditions trials, so condition 2's trial indexed past the
 * gathered list ("thisQuestionAndAnswer is undefined") and showed an empty
 * modal.
 *
 * Desired behavior, encoded here: planPureQaBlockQuestions gathers each
 * condition's questions and interleaves them RANDOMLY in trial order (the
 * same scheduling MultiStairHandler applies to FULLRANDOM staircase blocks:
 * a flat key repeats each condition's index once per ITS question count;
 * the key is shuffled, then walked, consuming each condition's questions
 * in order; conditions drop out when exhausted). Within one condition,
 * questionAnswerShuffleQuestionsBool governs order. The TrialHandler stays
 * SEQUENTIAL over the flattened per-question trialList, so question text,
 * answer valueMap, and condition stay index-aligned.
 *
 * Also captures the moved pure helpers extractAnswerValueMap and
 * normalizeNewQuestionAnswerFormat (moved from components/image.js so this
 * module stays import-light; behavior unchanged).
 *
 * @jest-environment node
 */
import {
  extractAnswerValueMap,
  normalizeNewQuestionAnswerFormat,
  planPureQaBlockQuestions,
} from "../components/questionAndAnswer";

/** A readAll stub over a param->per-condition-values map. */
const readAllFrom =
  (table: Record<string, unknown[]>) =>
  (name: string): unknown[] =>
    table[name] ?? [];

/** Deterministic shuffle for tests: reverse the array. */
const reverse = <T>(a: T[]): T[] => [...a].reverse();

describe("extractAnswerValueMap (moved helper, behavior unchanged)", () => {
  test("free-form question (fewer than 4 fields) has no value map", () => {
    expect(extractAnswerValueMap("CITY||Favorite city?")).toEqual({});
  });

  test("new format: value/answer pairs become an answer→value map", () => {
    expect(
      extractAnswerValueMap("FRUIT|Favorite fruit?|1|apple|0|banana|2|cherry"),
    ).toEqual({ apple: 1, banana: 0, cherry: 2 });
  });

  test("empty value defaults to 0; non-numeric value also to 0", () => {
    expect(extractAnswerValueMap("Q|Question?||sky|x1|apple")).toEqual({
      sky: 0,
      apple: 0,
    });
  });
});

describe("normalizeNewQuestionAnswerFormat (moved helper, behavior unchanged)", () => {
  test("rebuilds old format with empty correctAnswer, answers in order", () => {
    expect(
      normalizeNewQuestionAnswerFormat(
        "FRUIT|Favorite fruit?|1|apple|0|banana",
        false,
      ),
    ).toBe("FRUIT||Favorite fruit?|apple|banana");
  });

  test("shuffling answers keeps the nickname and question", () => {
    const out = normalizeNewQuestionAnswerFormat(
      "FRUIT|Favorite fruit?|1|apple|0|banana|2|cherry",
      true,
    );
    const fields = out.split("|");
    expect(fields[0]).toBe("FRUIT");
    expect(fields[2]).toBe("Favorite fruit?");
    expect(fields.slice(3).sort()).toEqual(["apple", "banana", "cherry"]);
  });

  test("malformed string (fewer than 2 fields) passes through as-is", () => {
    expect(normalizeNewQuestionAnswerFormat("onlyfield", false)).toBe(
      "onlyfield",
    );
  });
});

describe("planPureQaBlockQuestions — single condition (GREEN behavior)", () => {
  test("old-format questions land in NN order; reps = question count", () => {
    const plan = planPureQaBlockQuestions({
      readAll: readAllFrom({
        questionAndAnswer01: ["CITY||Favorite city?"],
        questionAndAnswer02: ["FRUIT||Favorite fruit?|apple|banana"],
      }),
      conditionTrials: [1],
      shuffleQuestions: false,
      shuffleAnswers: false,
    });
    expect(plan.questions.map((q) => q.text)).toEqual([
      "CITY||Favorite city?",
      "FRUIT||Favorite fruit?|apple|banana",
    ]);
    expect(plan.totalTrials).toBe(2);
    expect(plan.questions.every((q) => q.conditionIndex === 0)).toBe(true);
    // Old format carries no answer→value map.
    expect(
      plan.questions.every((q) => Object.keys(q.valueMap).length === 0),
    ).toBe(true);
  });

  test("new-format questions are normalized and carry their value map", () => {
    const plan = planPureQaBlockQuestions({
      readAll: readAllFrom({
        questionAnswer01: ["FRUIT|Favorite fruit?|1|apple|0|banana"],
      }),
      conditionTrials: [1],
      shuffleQuestions: false,
      shuffleAnswers: false,
    });
    expect(plan.questions[0].text).toBe("FRUIT||Favorite fruit?|apple|banana");
    expect(plan.questions[0].valueMap).toEqual({ apple: 1, banana: 0 });
  });

  test("within one NN index, the new format precedes the old", () => {
    const plan = planPureQaBlockQuestions({
      readAll: readAllFrom({
        questionAnswer01: ["NEW|New-format question?"],
        questionAndAnswer01: ["OLD||Old-format question?"],
      }),
      conditionTrials: [1],
      shuffleQuestions: false,
      shuffleAnswers: false,
    });
    expect(plan.questions.map((q) => q.text)).toEqual([
      "NEW||New-format question?",
      "OLD||Old-format question?",
    ]);
  });

  test("no questions at all → reps 0, total 0 (block skipped)", () => {
    const plan = planPureQaBlockQuestions({
      readAll: readAllFrom({}),
      conditionTrials: [1],
      shuffleQuestions: false,
      shuffleAnswers: false,
    });
    expect(plan.questions).toEqual([]);
    expect(plan.totalTrials).toBe(0);
  });

  test("shuffleQuestions permutes the single condition's questions", () => {
    const plan = planPureQaBlockQuestions({
      readAll: readAllFrom({
        questionAndAnswer01: ["Q1||One?"],
        questionAndAnswer02: ["Q2||Two?"],
        questionAndAnswer03: ["Q3||Three?"],
      }),
      conditionTrials: [1],
      shuffleQuestions: true,
      shuffleAnswers: false,
      shuffle: reverse,
    });
    expect(plan.questions.map((q) => q.text)).toEqual([
      "Q3||Three?",
      "Q2||Two?",
      "Q1||One?",
    ]);
  });
});

describe("planPureQaBlockQuestions — multiple conditions", () => {
  // The interleave uses MultiStairHandler's FULLRANDOM scheduling: a flat
  // key repeats each condition's index once per ITS question count; the key
  // is shuffled, then walked. `shuffle: reverse` pins the walk: key
  // [0,0,1,1] reverses to [1,1,0,0], so condition 2's questions come first.
  test("conditions interleave RANDOMLY (shuffled trial key), not fixed rep-major", () => {
    const plan = planPureQaBlockQuestions({
      readAll: readAllFrom({
        questionAndAnswer01: ["A1||Cond1 Q1", "B1||Cond2 Q1"],
        questionAndAnswer02: ["A2||Cond1 Q2", "B2||Cond2 Q2"],
      }),
      conditionTrials: [1, 1],
      shuffleQuestions: false,
      shuffleAnswers: false,
      shuffle: reverse,
    });
    expect(plan.questions.map((q) => q.text)).toEqual([
      "B1||Cond2 Q1",
      "B2||Cond2 Q2",
      "A1||Cond1 Q1",
      "A2||Cond1 Q2",
    ]);
    // Per-question condition index drives the TrialHandler trialList.
    expect(plan.questions.map((q) => q.conditionIndex)).toEqual([1, 1, 0, 0]);
    // totalTrials feeds the trial counter and trial-break check: it must
    // count every scheduled trial, not just one condition's questions.
    expect(plan.totalTrials).toBe(4);
  });

  test("UNEQUAL counts are schedulable: conditions drop out as questions end", () => {
    // Glossary: "Any number of conditions can each have up to 99 questions"
    // — counts may differ. One trial per question; the trialList repeats
    // each condition once per ITS question, so no phantom trials.
    // Key [0,0,1] reverses to [1,0,0]: the short condition's question first.
    const plan = planPureQaBlockQuestions({
      readAll: readAllFrom({
        questionAndAnswer01: ["A1||Cond1 Q1", "B1||Cond2 Q1"],
        questionAndAnswer02: ["A2||Cond1 Q2", ""],
      }),
      conditionTrials: [1, 1],
      shuffleQuestions: false,
      shuffleAnswers: false,
      shuffle: reverse,
    });
    expect(plan.questions.map((q) => q.text)).toEqual([
      "B1||Cond2 Q1",
      "A1||Cond1 Q1",
      "A2||Cond1 Q2",
    ]);
    expect(plan.questions.map((q) => q.conditionIndex)).toEqual([1, 0, 0]);
    expect(plan.totalTrials).toBe(3);
  });

  test("UNEQUAL, other direction: one short condition", () => {
    // Key [0,1,1,1] reverses to [1,1,1,0]: all of c2, then c1.
    const plan = planPureQaBlockQuestions({
      readAll: readAllFrom({
        questionAndAnswer01: ["A1", "B1"],
        questionAndAnswer02: ["", "B2"],
        questionAndAnswer03: ["", "B3"],
      }),
      conditionTrials: [1, 1],
      shuffleQuestions: false,
      shuffleAnswers: false,
      shuffle: reverse,
    });
    expect(plan.questions.map((q) => q.text)).toEqual(["B1", "B2", "B3", "A1"]);
    expect(plan.questions.map((q) => q.conditionIndex)).toEqual([1, 1, 1, 0]);
    expect(plan.totalTrials).toBe(4);
  });

  test("value maps stay aligned with the interleaved flat order", () => {
    // Key [0,1] reverses to [1,0]: B's question first.
    const plan = planPureQaBlockQuestions({
      readAll: readAllFrom({
        questionAnswer01: ["A|Q1?|1|a", "B|Q1?|2|b"],
      }),
      conditionTrials: [1, 1],
      shuffleQuestions: false,
      shuffleAnswers: false,
      shuffle: reverse,
    });
    expect(plan.questions[0].valueMap).toEqual({ b: 2 });
    expect(plan.questions[1].valueMap).toEqual({ a: 1 });
  });

  test("a condition with conditionTrials = 0 is excluded from the interleave", () => {
    // Active conditions [0,2], key [0,2] reverses to [2,0].
    const plan = planPureQaBlockQuestions({
      readAll: readAllFrom({
        questionAndAnswer01: ["A1||Cond1 Q1", "SKIP||Skipped", "B1||Cond3 Q1"],
      }),
      conditionTrials: [1, 0, 2],
      shuffleQuestions: false,
      shuffleAnswers: false,
      shuffle: reverse,
    });
    expect(plan.questions.map((q) => q.text)).toEqual([
      "B1||Cond3 Q1",
      "A1||Cond1 Q1",
    ]);
    expect(plan.totalTrials).toBe(2);
  });

  test("all conditions empty → no throw, total 0", () => {
    expect(() =>
      planPureQaBlockQuestions({
        readAll: readAllFrom({
          questionAndAnswer01: ["", ""],
        }),
        conditionTrials: [1, 1],
        shuffleQuestions: false,
        shuffleAnswers: false,
      }),
    ).not.toThrow();
  });

  test("shuffleQuestions permutes WITHIN each condition, then the key shuffle interleaves", () => {
    const plan = planPureQaBlockQuestions({
      readAll: readAllFrom({
        questionAndAnswer01: ["A1", "B1"],
        questionAndAnswer02: ["A2", "B2"],
      }),
      conditionTrials: [1, 1],
      shuffleQuestions: true,
      shuffleAnswers: false,
      shuffle: reverse,
    });
    // Each condition reversed independently, then key [0,0,1,1] reversed.
    expect(plan.questions.map((q) => q.text)).toEqual(["B2", "B1", "A2", "A1"]);
    expect(plan.questions.map((q) => q.conditionIndex)).toEqual([1, 1, 0, 0]);
  });
});

describe("planPureQaBlockQuestions — randomized interleave (real shuffle)", () => {
  const readAll = readAllFrom({
    questionAndAnswer01: ["A1||Cond1 Q1", "B1||Cond2 Q1"],
    questionAndAnswer02: ["A2||Cond1 Q2", "B2||Cond2 Q2"],
  });
  const opts = () => ({
    readAll,
    conditionTrials: [1, 1] as unknown[],
    shuffleQuestions: false,
    shuffleAnswers: false,
  });

  test("interleave order varies across plans (not fixed rep-major)", () => {
    const orders = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const plan = planPureQaBlockQuestions(opts());
      orders.add(plan.questions.map((q) => q.conditionIndex).join(","));
    }
    // 2×2 questions → C(4,2) = 6 possible interleavings.
    expect(orders.size).toBeGreaterThanOrEqual(3);
  });

  test("shuffleQuestions=false keeps each condition's LISTED order", () => {
    // Only the interleave is random; within a condition, questions stay in
    // numbered-parameter order (glossary questionAnswerShuffleQuestionsBool).
    for (let i = 0; i < 40; i++) {
      const plan = planPureQaBlockQuestions(opts());
      expect(
        plan.questions.filter((q) => q.conditionIndex === 0).map((q) => q.text),
      ).toEqual(["A1||Cond1 Q1", "A2||Cond1 Q2"]);
      expect(
        plan.questions.filter((q) => q.conditionIndex === 1).map((q) => q.text),
      ).toEqual(["B1||Cond2 Q1", "B2||Cond2 Q2"]);
    }
  });

  test("every question scheduled exactly once per plan", () => {
    for (let i = 0; i < 40; i++) {
      const plan = planPureQaBlockQuestions(opts());
      expect(plan.questions.map((q) => q.text).sort()).toEqual(
        ["A1||Cond1 Q1", "A2||Cond1 Q2", "B1||Cond2 Q1", "B2||Cond2 Q2"].sort(),
      );
      expect(plan.totalTrials).toBe(4);
    }
  });
});
