import { ParamReader } from "../parameters/paramReader";

// Whether a questionAndAnswer block has experimenter-supplied block
// instructions to show. Pure questionAndAnswer blocks (no image, no
// reading+spare-section) skip the block instruction routine entirely, so
// threshold.js uses this to decide whether to schedule it. "#NONE"
// suppresses block instructions (glossary spec), and pure Q&A has no default
// block instructions, so #NONE alone means there is nothing to show.
export const hasQuestionAndAnswerBlockInstructions = (
  reader: ParamReader,
  block: number,
): boolean => {
  const instructions = reader.read("instructionForBlock", block);
  return instructions.some((s: string) => s && s !== "#NONE");
};

// instructionForResponse text to show via the normal instruction stim while
// the Q&A modal is up. Empty string when unset or "#NONE" (glossary spec:
// empty has no effect, #NONE suppresses response instructions). Returns the
// raw text — the instruction stim renders Markdown itself.
export const getQuestionAndAnswerResponseInstruction = (
  reader: ParamReader,
  bc: string,
): string => {
  const instruction = reader.read("instructionForResponse", bc);
  if (!instruction || instruction === "#NONE") return "";
  return instruction;
};

// A questionAndAnswer string consists of several fields (nickname,
// correctAnswer, question, and possible answers) separated by either vertical
// bars | or linefeeds. Vertical bars work well with left-to-right languages,
// but are confusing to type amid right-to-left text (e.g. Arabic), so a
// linefeed may be used instead. Whichever separator comes FIRST in the string
// is THE separator for that string; the other character is then ordinary text
// (e.g. a |-separated string may contain linefeeds within its fields).
export const getQuestionAndAnswerSeparator = (text: string): string => {
  const barIndex = text.indexOf("|");
  const linefeedIndex = text.indexOf("\n");
  if (linefeedIndex !== -1 && (barIndex === -1 || linefeedIndex < barIndex))
    return "\n";
  return "|";
};

// Split a questionAndAnswer (or questionAnswer) string into its fields, using
// whichever separator (| or linefeed) appears first. Windows-style \r\n line
// endings are treated as linefeeds.
export const splitQuestionAndAnswerString = (text: string): string[] => {
  if (typeof text !== "string" || text.length === 0) return [];
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized.split(getQuestionAndAnswerSeparator(normalized));
};

// The column of responses in the saved data is named by the nickname
// concatenated with "-" and the conditionName:
//   columnName = nickname & "-" & conditionName
// (If the condition has no conditionName, the column is just the nickname.)
export const getQuestionAndAnswerColumnName = (
  nickname: string,
  conditionName: string,
): string => (conditionName ? `${nickname}-${conditionName}` : nickname);

export const isQuestionAndAnswerCondition = (
  reader: ParamReader,
  bc: string,
) => {
  const nQuestionsTotal = getNumberOfQuestionsInThisCondition(reader, bc);
  if (nQuestionsTotal === 0) return false;

  // Compiler enforces this (preprocess/experimentFileChecks.ts:1386-1390)
  // questionAndAnswer only valid for:
  // 1. targetTask is empty (default)
  // 2. targetTask === "questionAndAnswer" or "questionAnswer"
  // 3. targetTask === "identify" AND targetKind === "image"
  // This prevents crashes when invalid questionAndAnswer parameters are in the CSV
  const targetTask = reader.read("targetTask", bc);
  const targetKind = reader.read("targetKind", bc);

  const isAllowed =
    targetTask === "" ||
    targetTask === "questionAndAnswer" ||
    targetTask === "questionAnswer" ||
    (targetTask === "identify" && targetKind === "image");

  return isAllowed;
};

export const isQuestionAndAnswerBlock = (
  reader: ParamReader,
  block: number,
) => {
  const nQuestions = getNumberOfQuestionsInThisBlock(reader, block);
  return nQuestions > 0;
};

// Gets number of questions in this conditions,
//      by counting how many (non-empty) questionAndAnswer0n parameters are present
export const getNumberOfQuestionsInThisCondition = (
  reader: ParamReader,
  bc: string,
) => {
  const qAndARegex = /(questionAndAnswer|questionAnswer)(\d*|\@\@)$/g;
  const questionParameters: Map<string, string> = reader.readMatching(
    qAndARegex,
    bc,
  );
  const nQuestions = [...questionParameters.values()].filter((s) => s).length;
  return nQuestions;
};
const getNumberOfQuestionsInThisBlock = (
  reader: ParamReader,
  block: number,
) => {
  const qAndARegex = /(questionAndAnswer|questionAnswer)(\d*|\@\@)$/g;
  const questionParameters: Map<string, string[]> = reader.readMatching(
    qAndARegex,
    block,
  );
  const nQuestions = [...questionParameters.values()]
    .flat()
    .filter((s) => s).length;
  return nQuestions;
};
