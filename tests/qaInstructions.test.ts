/**
 * RED tests — ALLOW questionAndAnswer WITH instructionForBlock &
 * instructionForResponse.
 *
 * Card: an experiment with questionAndAnswer and instructionForBlock /
 * instructionForResponse set did not show the instructions. They should
 * ALWAYS show, regardless of the task.
 *
 * Root causes:
 *  1. For pure questionAndAnswer blocks (no image, no reading+spare-section),
 *     the block instruction routine (initInstructionRoutine) is never
 *     scheduled, so instructionForBlock is never displayed.
 *  2. The pure questionAndAnswer Swal modal does not include
 *     instructionForResponse anywhere.
 *
 * These tests pin the desired behavior of the helpers used by threshold.js
 * to (a) decide whether to schedule block instructions for a Q&A block and
 * (b) get the response-instruction text shown via the normal instruction
 * stim while the Q&A modal is up.
 *
 * Glossary spec:
 *  - instructionForBlock: shown once at the beginning of the block; empty
 *    has no effect; "#NONE" suppresses block instructions.
 *  - instructionForResponse: shown after each stimulus; empty has no effect;
 *    "#NONE" suppresses response instructions.
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
    instructionForBlock: qaEntry("instructionForBlock"),
    instructionForResponse: qaEntry("instructionForResponse"),
  },
  glossaryFull: [],
  superMatchingParams: [],
};

const buildReader = async (rows: any[]) => {
  jest.resetModules();
  jest.doMock("papaparse", () => ({
    __esModule: true,
    default: { parse: () => {} },
  }));
  const { initGlossary } = await import("../parameters/glossaryRegistry");
  const { ParamReader } = await import("../parameters/paramReader");
  initGlossary(fixture as any);
  const reader = new ParamReader("conditions");
  (reader as any)._experiment = rows;
  (reader as any)._blockCount = Math.max(...rows.map((r) => r.block));
  return reader;
};

describe("hasQuestionAndAnswerBlockInstructions", () => {
  it("returns true when instructionForBlock is set for the block", async () => {
    const reader = await buildReader([
      {
        block: 1,
        block_condition: "1_1",
        questionAndAnswer01: "TEXT|q?",
        instructionForBlock: "Read this before the block.",
        instructionForResponse: "",
      },
    ]);
    const { hasQuestionAndAnswerBlockInstructions } = await import(
      "../components/questionAndAnswer"
    );
    expect(hasQuestionAndAnswerBlockInstructions(reader, 1)).toBe(true);
  });

  it("returns false when instructionForBlock is empty", async () => {
    const reader = await buildReader([
      {
        block: 1,
        block_condition: "1_1",
        questionAndAnswer01: "TEXT|q?",
        instructionForBlock: "",
        instructionForResponse: "",
      },
    ]);
    const { hasQuestionAndAnswerBlockInstructions } = await import(
      "../components/questionAndAnswer"
    );
    expect(hasQuestionAndAnswerBlockInstructions(reader, 1)).toBe(false);
  });

  it("returns false when instructionForBlock is #NONE (suppress)", async () => {
    const reader = await buildReader([
      {
        block: 1,
        block_condition: "1_1",
        questionAndAnswer01: "TEXT|q?",
        instructionForBlock: "#NONE",
        instructionForResponse: "",
      },
    ]);
    const { hasQuestionAndAnswerBlockInstructions } = await import(
      "../components/questionAndAnswer"
    );
    expect(hasQuestionAndAnswerBlockInstructions(reader, 1)).toBe(false);
  });

  it("returns true when any condition of the block sets it", async () => {
    const reader = await buildReader([
      {
        block: 1,
        block_condition: "1_1",
        questionAndAnswer01: "TEXT|q1?",
        instructionForBlock: "",
        instructionForResponse: "",
      },
      {
        block: 1,
        block_condition: "1_2",
        questionAndAnswer01: "TEXT|q2?",
        instructionForBlock: "Block intro for condition two.",
        instructionForResponse: "",
      },
    ]);
    const { hasQuestionAndAnswerBlockInstructions } = await import(
      "../components/questionAndAnswer"
    );
    expect(hasQuestionAndAnswerBlockInstructions(reader, 1)).toBe(true);
  });
});

describe("getQuestionAndAnswerResponseInstruction", () => {
  it("returns the instruction text when set", async () => {
    const reader = await buildReader([
      {
        block: 1,
        block_condition: "1_1",
        questionAndAnswer01: "TEXT|q?",
        instructionForBlock: "",
        instructionForResponse: "Click the best answer.",
      },
    ]);
    const { getQuestionAndAnswerResponseInstruction } = await import(
      "../components/questionAndAnswer"
    );
    expect(getQuestionAndAnswerResponseInstruction(reader, "1_1")).toBe(
      "Click the best answer.",
    );
  });

  it("passes Markdown through raw (the instruction stim renders it)", async () => {
    const reader = await buildReader([
      {
        block: 1,
        block_condition: "1_1",
        questionAndAnswer01: "TEXT|q?",
        instructionForBlock: "",
        instructionForResponse: "Press **RETURN** to continue.",
      },
    ]);
    const { getQuestionAndAnswerResponseInstruction } = await import(
      "../components/questionAndAnswer"
    );
    expect(getQuestionAndAnswerResponseInstruction(reader, "1_1")).toBe(
      "Press **RETURN** to continue.",
    );
  });

  it("returns empty string when instructionForResponse is empty", async () => {
    const reader = await buildReader([
      {
        block: 1,
        block_condition: "1_1",
        questionAndAnswer01: "TEXT|q?",
        instructionForBlock: "",
        instructionForResponse: "",
      },
    ]);
    const { getQuestionAndAnswerResponseInstruction } = await import(
      "../components/questionAndAnswer"
    );
    expect(getQuestionAndAnswerResponseInstruction(reader, "1_1")).toBe("");
  });

  it("returns empty string when instructionForResponse is #NONE (suppress)", async () => {
    const reader = await buildReader([
      {
        block: 1,
        block_condition: "1_1",
        questionAndAnswer01: "TEXT|q?",
        instructionForBlock: "",
        instructionForResponse: "#NONE",
      },
    ]);
    const { getQuestionAndAnswerResponseInstruction } = await import(
      "../components/questionAndAnswer"
    );
    expect(getQuestionAndAnswerResponseInstruction(reader, "1_1")).toBe("");
  });
});
