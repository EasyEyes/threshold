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
});
