import { readFileSync } from "fs";
import * as path from "path";

const readSource = (...segments: string[]): string =>
  readFileSync(path.join(__dirname, "..", ...segments), "utf8").replace(
    /\r\n/g,
    "\n",
  );

const rsvpReadingSource = readSource("components", "rsvpReading.js");
const trialRoutinesSource = readSource("components", "trialRoutines.js");
const thresholdSource = readSource("threshold.js");

describe("legacy RSVP response-path isolation", () => {
  it("keeps automatic registration behind the automatic-speech branch", () => {
    const responsePhaseStart = rsvpReadingSource.indexOf(
      "const automaticSpeechRegistration = automaticSpeech",
    );
    const responsePhaseEnd = rsvpReadingSource.indexOf(
      "const responseComplete",
      responsePhaseStart,
    );
    const registrationBlock = rsvpReadingSource.slice(
      responsePhaseStart,
      responsePhaseEnd,
    );

    expect(responsePhaseStart).toBeGreaterThan(0);
    expect(registrationBlock).toContain("? registerRsvpSpeechResult({");
    expect(registrationBlock).toContain(": undefined;");
  });

  it("keeps the established matrix/experimenter completion expression", () => {
    expect(rsvpReadingSource).toContain(
      `: phraseIdentificationResponse.current.length >=
        rsvpReadingTargetSets.numberOfIdentifications;`,
    );
  });

  it("keeps the established RSVP feedback-counter implementation unchanged", () => {
    expect(rsvpReadingSource).toContain(
      `export const updateTrialCounterNumbersForRSVPReading = () => {
  incrementTrialCompletedThisBlock(status.block_condition);
  // Just for use with end-of-block feedback, QUEST actually interprets each response individually
  if (phraseIdentificationResponse.correct.every((bool) => bool))
    incrementTrialCorrectThisBlock(status.block_condition);
};`,
    );
  });

  it("uses the existing RSVP response column instead of adding speech-only output columns", () => {
    expect(rsvpReadingSource).toContain('"rsvpReadingParticipantResponses"');
    expect(rsvpReadingSource).toContain(
      "isRsvpReadingAutomaticSpeechResponseMode(rsvpReadingResponse.responseType)",
    );
    expect(trialRoutinesSource).not.toContain(
      "rsvpSpeechScoringDiagnosticsJson",
    );
    expect(trialRoutinesSource).not.toContain(
      "rsvpSpeechResponseRegistrationError",
    );
    expect(thresholdSource).not.toContain("rsvpSpeechPreparationSucceededBool");
  });
});
