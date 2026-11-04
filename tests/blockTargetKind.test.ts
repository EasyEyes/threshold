jest.mock("../components/utils", () => ({
  safeExecuteFunc: (handler: unknown) => {
    if (typeof handler === "function") return handler();
    return undefined;
  },
}));

import { switchKind, switchTask } from "../components/blockTargetKind";

describe("target kind/task dispatch", () => {
  it("executes only the selected existing kind", () => {
    const letter = jest.fn();
    const movie = jest.fn();

    switchKind("letter", { letter, movie });

    expect(letter).toHaveBeenCalledTimes(1);
    expect(movie).not.toHaveBeenCalled();
  });

  it("follows kind aliases, including chains", () => {
    const gabor = jest.fn();

    switchKind("reading", { reading: "letter", letter: "gabor", gabor });

    expect(gabor).toHaveBeenCalledTimes(1);
  });

  it("supports both question-and-answer task spellings", () => {
    const questionAndAnswer = jest.fn();

    switchTask("questionAnswer", { questionAndAnswer });
    switchTask("questionAndAnswer", { questionAndAnswer });

    expect(questionAndAnswer).toHaveBeenCalledTimes(2);
  });

  it("preserves explicit task aliases", () => {
    const identify = jest.fn();

    switchTask("questionAnswer", {
      questionAnswer: "identify",
      identify,
      questionAndAnswer: jest.fn(),
    });

    expect(identify).toHaveBeenCalledTimes(1);
  });

  it("applies the Q&A spelling alias throughout an alias chain", () => {
    const questionAndAnswer = jest.fn();

    switchTask("identify", {
      identify: "questionAnswer",
      questionAndAnswer,
    });

    expect(questionAndAnswer).toHaveBeenCalledTimes(1);
  });

  it("ignores unknown and inherited property names", () => {
    const letter = jest.fn();

    switchKind("unknown", { letter });
    switchKind("toString", { letter });

    expect(letter).not.toHaveBeenCalled();
  });

  it("supports a new kind without adding a dispatcher case", () => {
    const futureKind = jest.fn();

    switchKind("futureKind", { futureKind });

    expect(futureKind).toHaveBeenCalledTimes(1);
  });
});
