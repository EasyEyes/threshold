import { ParamReader } from "../parameters/paramReader";
import { logger } from "./utils";

export const isQuestionAndAnswerCondition = (
  reader: ParamReader,
  bc: string,
) => {
  const nQuestionsTotal = getNumberOfQuestionsInThisCondition(reader, bc);
  return nQuestionsTotal > 0;
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
