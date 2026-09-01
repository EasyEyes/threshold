import { random } from "./rng";
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

// Zero-pad a number to a given length: the numbered question parameters
// (questionAnswer01..99) use 2 digits.
const fillNumberLength = (n: number, length: number): string => {
  let str = n.toString();
  while (str.length < length) str = "0" + str;
  return str;
};

// Fisher-Yates on a copy.
export const shuffleArray = <T>(arr: T[]): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random("questions") * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Extract the answer→value mapping from a new-format questionAnswer string.
 *  New format: NICKNAME|question|value1|answer1|value2|answer2|...
 *  Returns { [answerText]: numericValue }. E.g. { house: 0, sky: 0, apple: 1 }
 */
export const extractAnswerValueMap = (raw: string): Record<string, number> => {
  const parts = splitQuestionAndAnswerString(raw);
  if (parts.length < 4) return {}; // free-form, no answers
  const rest = parts.slice(2);
  const valueMap: Record<string, number> = {};
  for (let i = 0; i + 1 < rest.length; i += 2) {
    const value = rest[i] === "" ? 0 : Number(rest[i]);
    const answer = rest[i + 1];
    if (answer && answer.length) {
      valueMap[answer] = Number.isFinite(value) ? value : 0;
    }
  }
  return valueMap;
};

export const normalizeNewQuestionAnswerFormat = (
  raw: string,
  shuffleAnswersBool = false,
): string => {
  const parts = splitQuestionAndAnswerString(raw);
  if (parts.length < 2) return raw; // malformed, return as-is
  // Rejoin with the string's own separator (| or linefeed), so fields that
  // contain the other character are not corrupted.
  const separator = getQuestionAndAnswerSeparator(raw);
  const nickname = parts[0];
  const question = parts[1];
  // Everything after nickname and question is value/answer pairs
  const rest = parts.slice(2);
  let answers = rest.filter((_, i) => i % 2 === 1).filter((s) => s.length);
  // questionAnswerShuffleAnswersBool: randomize the order the answers are
  // offered in. The answer→value map is keyed by answer text, so it is
  // unaffected by the shuffle.
  if (shuffleAnswersBool) answers = shuffleArray(answers);
  // Build old-format: NICKNAME||question|answer1|answer2|...
  return [nickname, "", question, ...answers].join(separator);
};

export interface PureQaQuestion {
  /** Question string, old-format shape (nickname||question|answers). */
  text: string;
  /** answerText → reported value (new format only; {} for old format). */
  valueMap: Record<string, number>;
  /** Index (into the block's active condition list) of the condition this
   *  question belongs to — the TrialHandler trialList repeats that
   *  condition's entry for this question's trial. */
  conditionIndex: number;
}

export interface PureQaBlockPlan {
  /** Questions in TRIAL order: rep-major, condition-minor (c1q1, c2q1,
   *  c1q2, c2q2, …) — conditions with fewer questions drop out once
   *  exhausted. Indexed at trial time by (status.trial - 1). Each question
   *  carries the conditionIndex of the condition it belongs to. */
  questions: PureQaQuestion[];
  /** questions.length — feeds the trial counter and the end-of-block
   *  trial-break check (one trial per question). */
  totalTrials: number;
}

/** Gather a pure questionAndAnswer block's questions across ALL its
 *  conditions, interleaved in trial order.
 *
 *  A pure Q&A block asks one question per trial (glossary: "Any number of
 *  conditions can each have up to 99 questions" — counts may DIFFER across
 *  conditions). Per-condition question lists are gathered in numbered-
 *  parameter order (within one number, the new questionAnswer format
 *  precedes the old questionAndAnswer format, matching the historical
 *  single-condition order), optionally shuffled WITHIN each condition
 *  (glossary: questionAnswerShuffleQuestionsBool randomizes "the order of
 *  the questions in this condition"), then interleaved RANDOMLY across
 *  conditions with MultiStairHandler's FULLRANDOM schedule: a flat key
 *  repeats each condition's index once per ITS question count, the key is
 *  shuffled, and walking it consumes each condition's questions in order;
 *  a condition drops out once its questions are exhausted.
 *  Each question's conditionIndex says which condition's entry the
 *  TrialHandler trialList must repeat for that question's trial.
 */
export const planPureQaBlockQuestions = (opts: {
  /** Per-condition values of a named parameter, in block row order
   *  (paramReader.read(name, block)). */
  readAll: (name: string) => unknown[];
  /** Per-condition conditionTrials; conditions with 0 (or non-positive)
   *  trials are excluded, mirroring the TrialHandler trialList filter. */
  conditionTrials: unknown[];
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  /** Injectable shuffle (tests); defaults to Fisher-Yates. */
  shuffle?: <T>(arr: T[]) => T[];
}): PureQaBlockPlan => {
  const shuffle = opts.shuffle ?? shuffleArray;
  const conditionCount = opts.conditionTrials.length;
  const active = opts.conditionTrials
    .map((t, i) => ({ trials: Number(t), i }))
    .filter(({ trials }) => trials > 0)
    .map(({ i }) => i);

  // Gather per condition, in numbered-parameter order.
  const perCondition: PureQaQuestion[][] = active.map(() => []);
  const cache = new Map<string, unknown[]>();
  const readAll = (name: string): unknown[] => {
    if (!cache.has(name)) cache.set(name, opts.readAll(name));
    return cache.get(name)!;
  };
  const isQuestion = (v: unknown): v is string =>
    typeof v === "string" && v.length > 0;
  for (let n = 1; n <= 99; n++) {
    const names = [
      `questionAnswer${fillNumberLength(n, 2)}`, // new format
      `questionAndAnswer${fillNumberLength(n, 2)}`, // old format
    ];
    for (const name of names) {
      const values = readAll(name);
      active.forEach((conditionIndex, slot) => {
        const raw = values[conditionIndex];
        if (!isQuestion(raw)) return;
        if (name.startsWith("questionAnswer")) {
          perCondition[slot].push({
            text: normalizeNewQuestionAnswerFormat(raw, opts.shuffleAnswers),
            valueMap: extractAnswerValueMap(raw),
            conditionIndex: -1, // assigned at interleave time
          });
        } else {
          perCondition[slot].push({
            text: raw,
            valueMap: {},
            conditionIndex: -1, // assigned at interleave time
          });
        }
      });
    }
  }

  if (opts.shuffleQuestions)
    perCondition.forEach((list, i) => {
      perCondition[i] = shuffle(list);
    });

  // Random interleave — the same scheduling MultiStairHandler applies to
  // FULLRANDOM staircase blocks: a flat key repeats each condition's index
  // once per ITS question count; shuffling the key and walking it consumes
  // each condition's questions in order, so conditions with different
  // question counts drop out once exhausted and each asks exactly its own
  // questions.
  const key: number[] = [];
  perCondition.forEach((list, conditionIndex) => {
    for (let k = 0; k < list.length; k++) key.push(conditionIndex);
  });
  const next = perCondition.map(() => 0);
  const questions: PureQaQuestion[] = shuffle(key).map((conditionIndex) => {
    const question = perCondition[conditionIndex][next[conditionIndex]++];
    return { ...question, conditionIndex };
  });

  return {
    questions,
    totalTrials: questions.length,
  };
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
