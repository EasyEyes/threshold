/**
 * @jest-environment node
 *
 * Compiler check: reading end-of-block questions (readingNumberOfQuestions >
 * 0) are answered by clicking the answer words on screen or by the EasyEyes
 * keypad (the keypad alphabet syncs to the answer options; keypad presses
 * invoke the matching word's responder). Plain typing cannot answer them.
 * So responseClickedBool FALSE is legal ONLY when the keypad is in use
 * (viewingDistanceDesiredCm > needKeypadBeyondCm); otherwise it is a
 * compile ERROR (illegal state).
 *
 * Verified runtime facts this check encodes:
 *  - threshold.js blockSchedulerFinalRoutineEachFrame (the reading-questions
 *    routine) consumes no keyboard input; the answer words' responders
 *    advance it (click, or keypad press via keypad.js _onReceiverData).
 *  - rsvpReading identification is NOT affected: its phrase-identification
 *    screen accepts clicks unconditionally and also supports speech and the
 *    keypad (keypad responses click the matching phrase item).
 */

import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";

const parse = (csv: string): ExperimentTable =>
  new ExperimentTable(
    Papa.parse(csv, { skipEmptyLines: true })
      .data as readonly (readonly string[])[],
  );

// The check names BOTH the questions parameter and the click parameter.
const isReadingQuestionsClickError = (e: any): boolean =>
  e.parameters.includes("readingNumberOfQuestions") &&
  e.parameters.includes("responseClickedBool");

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("reading questions with clicking disabled are an illegal state", () => {
  it("ERROR: reading + questions + responseClickedBool FALSE", () => {
    const errors = validateExperimentTable(
      parse(`_about,test,,
block,,1
conditionName,,reading-no-click
readingCorpus,,short-reading.txt
readingNumberOfQuestions,,2
readingNumberOfPossibleAnswers,,3
readingPages,,2
responseClickedBool,,FALSE
targetKind,,reading
thresholdParameter,,targetSizeDeg`),
    );
    const err = errors.find(isReadingQuestionsClickError);
    expect(err).toBeDefined();
    expect(err.kind).toBe("error");
  });

  it("NO error when a keypad is in use — keypad now answers reading questions", () => {
    const errors = validateExperimentTable(
      parse(`_about,test,,
block,,1
conditionName,,reading-no-click-keypad
needKeypadBeyondCm,,100
readingCorpus,,short-reading.txt
readingNumberOfQuestions,,2
readingNumberOfPossibleAnswers,,3
readingPages,,2
responseClickedBool,,FALSE
targetKind,,reading
thresholdParameter,,targetSizeDeg
viewingDistanceDesiredCm,,200`),
    );
    expect(errors.some(isReadingQuestionsClickError)).toBe(false);
  });

  it("ERROR when the keypad is NOT in use (viewing distance within keypad threshold)", () => {
    const errors = validateExperimentTable(
      parse(`_about,test,,
block,,1
conditionName,,reading-no-click-no-keypad
needKeypadBeyondCm,,100
readingCorpus,,short-reading.txt
readingNumberOfQuestions,,2
readingNumberOfPossibleAnswers,,3
readingPages,,2
responseClickedBool,,FALSE
targetKind,,reading
thresholdParameter,,targetSizeDeg
viewingDistanceDesiredCm,,50`),
    );
    expect(errors.some(isReadingQuestionsClickError)).toBe(true);
  });

  it("no error when clicking is enabled (explicit TRUE)", () => {
    const errors = validateExperimentTable(
      parse(`_about,test,,
block,,1
conditionName,,reading-click
readingCorpus,,short-reading.txt
readingNumberOfQuestions,,2
readingNumberOfPossibleAnswers,,3
readingPages,,2
responseClickedBool,,TRUE
targetKind,,reading
thresholdParameter,,targetSizeDeg`),
    );
    expect(errors.some(isReadingQuestionsClickError)).toBe(false);
  });

  it("no error when clicking is enabled (glossary default, param absent)", () => {
    const errors = validateExperimentTable(
      parse(`_about,test,,
block,,1
conditionName,,reading-default-click
readingCorpus,,short-reading.txt
readingNumberOfQuestions,,2
readingNumberOfPossibleAnswers,,3
readingPages,,2
targetKind,,reading
thresholdParameter,,targetSizeDeg`),
    );
    expect(errors.some(isReadingQuestionsClickError)).toBe(false);
  });

  it("no error for reading with clicking disabled but NO questions (SPACE turns pages)", () => {
    // NB: readingNumberOfQuestions defaults to 3, so "no questions" must be
    // explicit.
    const errors = validateExperimentTable(
      parse(`_about,test,,
block,,1
conditionName,,reading-pages-only
readingCorpus,,short-reading.txt
readingNumberOfQuestions,,0
readingPages,,2
responseClickedBool,,FALSE
targetKind,,reading
thresholdParameter,,targetSizeDeg`),
    );
    expect(errors.some(isReadingQuestionsClickError)).toBe(false);
  });

  it("NO error for a conditionEnabledBool FALSE condition (disabled conditions are not checked)", () => {
    const errors = validateExperimentTable(
      parse(`_about,test,,
block,,1
conditionEnabledBool,,FALSE
conditionName,,reading-disabled
readingCorpus,,short-reading.txt
readingNumberOfQuestions,,2
readingNumberOfPossibleAnswers,,3
readingPages,,2
responseClickedBool,,FALSE
targetKind,,reading
thresholdParameter,,targetSizeDeg`),
    );
    expect(errors.some(isReadingQuestionsClickError)).toBe(false);
  });

  it("ERROR for an ENABLED sibling condition even when another is disabled", () => {
    const errors = validateExperimentTable(
      parse(`_about,test,,,
block,,1,1
conditionEnabledBool,,FALSE,TRUE
conditionName,,reading-disabled,reading-enabled
readingCorpus,,short-reading.txt,short-reading.txt
readingNumberOfQuestions,,2,2
readingNumberOfPossibleAnswers,,3,3
readingPages,,2,2
responseClickedBool,,FALSE,FALSE
targetKind,,reading,reading
thresholdParameter,,targetSizeDeg,targetSizeDeg`),
    );
    const err = errors.find(isReadingQuestionsClickError);
    expect(err).toBeDefined();
    // The hint names the OFFENDING (enabled) column D, not the disabled C.
    expect(err.hint).toContain("column is: D");
    expect(err.hint).not.toContain(": C");
  });

  it("no error for rsvpReading with clicking disabled (identification accepts clicks unconditionally + keypad/speech)", () => {
    const errors = validateExperimentTable(
      parse(`_about,test,,
block,,1
conditionName,,rsvp-no-click
responseClickedBool,,FALSE
rsvpReadingCorpus,,short-reading.txt
rsvpReadingNumberOfWords,,2
rsvpReadingNumberOfResponseOptions,,3
targetKind,,rsvpReading
thresholdParameter,,targetSizeDeg`),
    );
    expect(errors.some(isReadingQuestionsClickError)).toBe(false);
  });
});
