import { ParamReader } from "../parameters/paramReader";

export const isQuestionAndAnswerCondition = (
  reader: ParamReader,
  bc: string,
) => {
  const nQuestionsTotal = getNumberOfQuestionsInThisCondition(reader, bc);
  if (nQuestionsTotal === 0) return false;

  // Compiler enforces this (preprocess/experimentFileChecks.ts:1294-1300)
  // questionAndAnswer only valid for:
  // 1. targetTask is empty (default)
  // 2. targetTask === "identify" AND targetKind === "image"
  // This prevents crashes when invalid questionAndAnswer parameters are in the CSV
  const targetTask = reader.read("targetTask", bc);
  const targetKind = reader.read("targetKind", bc);

  const isAllowed =
    targetTask === "" || (targetTask === "identify" && targetKind === "image");

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
