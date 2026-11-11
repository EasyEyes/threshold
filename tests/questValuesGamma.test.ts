/**
 * RED test: default QUEST gamma for letter targetKind with REPEATED letters
 * in fontCharacterSet.
 *
 * Spec (glossary, thresholdGamma):
 *   "In an identification task with n equally-probable possibilities, one
 *    should set gamma to 1/n ... if all the letters are unique, then
 *    n=length(fontCharacterSet) ... NOTE: You are allowed to have repeated
 *    letters in fontCharacterSet to give the letters unequal frequency. In
 *    that case, the default value of thresholdGamma is set to the probability
 *    of the most common letter being the right letter. For example, if
 *    fontCharacterSet='AAB', then the default value of thresholdGamma is 2/3."
 *
 * populateQuestDefaults (components/questValues.js) sorts the unique letters
 * by count DESCENDING, then pop()s the LAST element — the LEAST common
 * letter. So 'AAB' yields 1/3, not the specified 2/3. A wrong guess-rate
 * biases every QUEST threshold estimate in the block.
 *
 * @jest-environment node
 */

jest.mock("../components/utils", () => ({
  logger: jest.fn(),
}));

import { populateQuestDefaults } from "../components/questValues";

const makeReader = (values: Record<string, unknown>) => ({
  read: (name: string) => values[name],
});

const baseValues = {
  thresholdGamma: "", // empty → default computed from fontCharacterSet
  thresholdGuess: 1.2,
  thresholdGuessLogSd: 0.2,
  thresholdBeta: 3.5,
  thresholdDelta: 0.01,
  thresholdProportionCorrect: 0.75,
  conditionTrials: 40,
};

describe("populateQuestDefaults — default gamma (targetKind letter)", () => {
  it("unique letters: gamma = 1/n (control; currently correct)", () => {
    const conditions = [{ block_condition: "1_1" }];
    const reader = makeReader({
      ...baseValues,
      fontCharacterSet: "0123456789",
    });
    populateQuestDefaults(conditions, reader, "letter");
    expect(conditions[0].gamma).toBeCloseTo(0.1);
  });

  it("repeated letters 'AAB': gamma = probability of the MOST common letter (2/3)", () => {
    const conditions = [{ block_condition: "1_1" }];
    const reader = makeReader({ ...baseValues, fontCharacterSet: "AAB" });
    populateQuestDefaults(conditions, reader, "letter");
    // Spec example: fontCharacterSet='AAB' → 2/3
    expect(conditions[0].gamma).toBeCloseTo(2 / 3);
  });

  it("repeated letters 'ABBB': gamma = 3/4 (most common), not 1/4", () => {
    const conditions = [{ block_condition: "1_1" }];
    const reader = makeReader({ ...baseValues, fontCharacterSet: "ABBB" });
    populateQuestDefaults(conditions, reader, "letter");
    expect(conditions[0].gamma).toBeCloseTo(3 / 4);
  });
});
