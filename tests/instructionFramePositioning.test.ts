/**
 * @jest-environment jsdom
 */

const makeStim = () => ({ setPos: jest.fn() });

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
};

const loadPositioner = async () => {
  jest.resetModules();
  jest.doMock("../components/global.js", () => ({
    rc: {},
    status: {},
    viewingDistanceCm: { current: undefined, desired: undefined },
  }));
  jest.doMock("../components/multiple-displays/globals.ts", () => ({
    Screens: [],
  }));
  jest.doMock("../preprocess/phrases-loader", () => ({
    phrasesData: { version: "test", phrases: {} },
  }));
  return import("../components/trialCounter");
};

describe("instruction stim positioning", () => {
  beforeEach(() => setViewport(800, 600));

  it("positions on the first frame and skips unchanged frames", async () => {
    const { createInstructionStimPositioner } = await loadPositioner();
    const counter = makeStim();
    const hint = makeStim();
    const position = createInstructionStimPositioner(counter, hint);

    position();
    position();
    position();

    expect(counter.setPos).toHaveBeenCalledTimes(1);
    expect(hint.setPos).toHaveBeenCalledTimes(1);
    expect(counter.setPos).toHaveBeenCalledWith([400, -300]);
    expect(hint.setPos).toHaveBeenCalledWith([0, -300]);
  });

  it("repositions when the viewport changes", async () => {
    const { createInstructionStimPositioner } = await loadPositioner();
    const counter = makeStim();
    const hint = makeStim();
    const position = createInstructionStimPositioner(counter, hint);

    position();
    setViewport(1000, 700);
    position();

    expect(counter.setPos).toHaveBeenCalledTimes(2);
    expect(hint.setPos).toHaveBeenCalledTimes(2);
    expect(counter.setPos).toHaveBeenLastCalledWith([500, -350]);
    expect(hint.setPos).toHaveBeenLastCalledWith([0, -350]);
  });

  it("forces a reset at a routine boundary without changing resize behavior", async () => {
    const { createInstructionStimPositioner } = await loadPositioner();
    const counter = makeStim();
    const hint = makeStim();
    const position = createInstructionStimPositioner(counter, hint);

    position();
    position(true);
    position();

    expect(counter.setPos).toHaveBeenCalledTimes(2);
    expect(hint.setPos).toHaveBeenCalledTimes(2);
  });

  it("deduplicates response frames while preserving hint overrides and resets", async () => {
    const { createInstructionStimPositioner } = await loadPositioner();
    const counter = makeStim();
    const hint = makeStim();
    const position = createInstructionStimPositioner(counter, hint);

    position(false, -120);
    position(false, -120);
    expect(counter.setPos).toHaveBeenCalledTimes(1);
    expect(hint.setPos).toHaveBeenCalledTimes(1);
    expect(hint.setPos).toHaveBeenLastCalledWith([0, -120]);

    // Instruction frames restore the default; the next response frame must
    // reapply the override even though its value is unchanged.
    position();
    position(false, -120);
    expect(hint.setPos).toHaveBeenCalledTimes(3);
    expect(hint.setPos.mock.calls).toEqual([
      [[0, -120]],
      [[0, -300]],
      [[0, -120]],
    ]);
  });

  it("repositions both stims after a resize with a raised response hint", async () => {
    const { createInstructionStimPositioner } = await loadPositioner();
    const counter = makeStim();
    const hint = makeStim();
    const position = createInstructionStimPositioner(counter, hint);

    position(false, -120);
    setViewport(1000, 700);
    position(false, -80);

    expect(counter.setPos).toHaveBeenLastCalledWith([500, -350]);
    expect(hint.setPos).toHaveBeenLastCalledWith([0, -80]);
    expect(counter.setPos).toHaveBeenCalledTimes(2);
    expect(hint.setPos).toHaveBeenCalledTimes(2);
  });
});

describe("reading+Q&A response hint position", () => {
  it("raises the hint just above a top spare section", async () => {
    const { getReadingQuestionTinyHintY } = await loadPositioner();
    expect(getReadingQuestionTinyHintY("top", 0.3, 600)).toBe(-102);
  });

  it("defaults an invalid placement to top", async () => {
    const { getReadingQuestionTinyHintY } = await loadPositioner();
    expect(getReadingQuestionTinyHintY("invalid", 0.3, 600)).toBe(-102);
  });

  it.each(["bottom", "left", "right"])(
    "uses the default bottom hint for placement=%s",
    async (where) => {
      const { getReadingQuestionTinyHintY } = await loadPositioner();
      expect(getReadingQuestionTinyHintY(where, 0.3, 600)).toBeUndefined();
    },
  );

  it("clamps the spare fraction and treats an invalid number as zero", async () => {
    const { getReadingQuestionTinyHintY } = await loadPositioner();
    expect(getReadingQuestionTinyHintY("top", -1, 600)).toBe(-282);
    expect(getReadingQuestionTinyHintY("top", 2, 600)).toBe(318);
    expect(getReadingQuestionTinyHintY("top", "invalid", 600)).toBe(-282);
  });
});
