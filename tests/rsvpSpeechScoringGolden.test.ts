import { readFileSync } from "fs";
import * as path from "path";
import {
  RsvpSpeechScoringError,
  scoreRsvpSpeechResponse,
  type RsvpSpeechScoringDiagnostics,
  type RsvpSpeechScoringPolicy,
  type RsvpSpeechTargetOutcome,
} from "../components/rsvpSpeech/rsvpSpeechScoring";

interface GoldenCase {
  readonly id: string;
  readonly description: string;
  readonly languageCode: string;
  readonly targetWords: readonly string[];
  readonly transcript: string;
  readonly policy: RsvpSpeechScoringPolicy;
  readonly expectedVector?: readonly (0 | 1)[];
  readonly expectedOutcomes?: readonly RsvpSpeechTargetOutcome[];
  readonly expectedNormalizedTranscript?: string;
  readonly expectedDiagnostics?: Partial<RsvpSpeechScoringDiagnostics>;
  readonly expectedErrorCode?: string;
}

interface GoldenFixture {
  readonly schemaVersion: number;
  readonly reviewStatus: string;
  readonly cases: readonly GoldenCase[];
}

const fixturePath = path.join(
  __dirname,
  "fixtures",
  "rsvpSpeechScoringCases.json",
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as GoldenFixture;

describe("RSVP speech scoring golden cases", () => {
  it("keeps the fixture explicitly marked as proposed pending scientific review", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.reviewStatus).toBe("proposed");
    expect(
      fixture.cases.filter((testCase) => testCase.languageCode.startsWith("en"))
        .length,
    ).toBeGreaterThan(
      fixture.cases.filter((testCase) => testCase.languageCode.startsWith("fa"))
        .length,
    );
  });

  it.each(fixture.cases)("$id — $description", (testCase) => {
    const score = () =>
      scoreRsvpSpeechResponse({
        targetWords: testCase.targetWords,
        transcript: testCase.transcript,
        languageCode: testCase.languageCode,
        policy: testCase.policy,
      });

    if (testCase.expectedErrorCode) {
      try {
        score();
        throw new Error(
          `Expected scoring case ${testCase.id} to fail with ${testCase.expectedErrorCode}.`,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(RsvpSpeechScoringError);
        expect((error as RsvpSpeechScoringError).code).toBe(
          testCase.expectedErrorCode,
        );
      }
      return;
    }

    const result = score();
    expect(result.responseVector).toEqual(testCase.expectedVector);
    if (testCase.expectedOutcomes) {
      expect(result.targetResults.map((target) => target.outcome)).toEqual(
        testCase.expectedOutcomes,
      );
    }
    if (testCase.expectedNormalizedTranscript !== undefined) {
      expect(result.diagnostics.normalizedTranscript).toBe(
        testCase.expectedNormalizedTranscript,
      );
    }
    if (testCase.expectedDiagnostics) {
      expect(result.diagnostics).toEqual(
        expect.objectContaining(testCase.expectedDiagnostics),
      );
    }
  });
});
