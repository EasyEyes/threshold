// Guard: a malformed choice question (trailing separator, e.g.
// "NICK|answer|Question||") parses to a radio question with ZERO options —
// combined with the hidden confirm button and allowEscapeKey:false, an
// optionless radio is an unescapable modal (a future "silent" session that
// dies in-place). Parsing must classify a question as choice-type ONLY when
// at least one non-empty option survives.
import { parseQuestionComponents } from "../components/questionAndAnswer";

describe("parseQuestionComponents", () => {
  it("well-formed choice question: choices detected", () => {
    const q = parseQuestionComponents(
      "FLNCY1|banana|Which is a fruit?|leaf|table|banana",
    );
    expect(q.choiceQuestionBool).toBe(true);
    expect(q.answers).toEqual(["leaf", "table", "banana"]);
    expect(q.correctAnswer).toBe("banana");
    expect(q.question).toBe("Which is a fruit?");
    expect(q.shortcut).toBe("FLNCY1");
  });

  it("trailing separator does NOT make an optionless radio", () => {
    const q = parseQuestionComponents("BRTHYR||What year were you born?|");
    expect(q.choiceQuestionBool).toBe(false);
    expect(q.answers).toEqual([]);
  });

  it("empty separators between options are dropped but real ones keep it choice-type", () => {
    const q = parseQuestionComponents("N|a|Q?||opt|");
    expect(q.choiceQuestionBool).toBe(true);
    expect(q.answers).toEqual(["opt"]);
  });

  it("free-text question (3 components) stays free-text", () => {
    const q = parseQuestionComponents("BRTHYR||What year were you born?");
    expect(q.choiceQuestionBool).toBe(false);
    expect(q.answers).toEqual([]);
  });
});
