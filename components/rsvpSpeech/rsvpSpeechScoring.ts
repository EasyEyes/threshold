import {
  normalizeSpeechToken,
  tokenizeSpeechTranscript,
  type NormalizedSpeechToken,
  type SpeechLanguageProfileId,
} from "../speech/textNormalization";
import {
  alignSpeechTokensToTargets,
  characterSimilarity,
  type SpeechTokenAlignmentEvent,
} from "../speech/tokenAlignment";

export const RSVP_SPEECH_SCORING_VERSION = "rsvp-position-aware-v1";

export type RsvpSpeechScoringErrorCode =
  | "emptyTranscript"
  | "invalidTargets"
  | "invalidPolicy";

export class RsvpSpeechScoringError extends Error {
  readonly code: RsvpSpeechScoringErrorCode;

  constructor(code: RsvpSpeechScoringErrorCode, message: string) {
    super(message);
    this.name = "RsvpSpeechScoringError";
    this.code = code;
  }
}

export type RsvpSpeechWordOrderPolicy = "strict" | "anyOrder";
export type RsvpSpeechRepetitionPolicy = "ignore" | "markIncorrect";
export type RsvpSpeechSelfCorrectionPolicy = "accept" | "markIncorrect";

export interface RsvpSpeechScoringPolicy {
  readonly wordOrder: RsvpSpeechWordOrderPolicy;
  readonly repetition: RsvpSpeechRepetitionPolicy;
  readonly selfCorrection: RsvpSpeechSelfCorrectionPolicy;
}

export interface RsvpSpeechScoringInput {
  readonly targetWords: readonly string[];
  readonly transcript: string;
  readonly languageCode: string;
  readonly policy: RsvpSpeechScoringPolicy;
}

export type RsvpSpeechInsertionKind =
  | "filler"
  | "repetition"
  | "selfCorrectionAttempt"
  | "outOfOrderTarget";

export interface RsvpSpeechScoringEvent extends SpeechTokenAlignmentEvent {
  readonly insertionKind?: RsvpSpeechInsertionKind;
  readonly relatedTargetIndex?: number;
  readonly relatedTargetIndices?: readonly number[];
  readonly similarityToTarget?: number;
}

export type RsvpSpeechTargetOutcome =
  | "correct"
  | "substitution"
  | "outOfOrder"
  | "omission"
  | "rejectedByPolicy";

export interface RsvpSpeechTargetResult {
  readonly targetIndex: number;
  readonly targetWord: string;
  readonly responseText: string | null;
  readonly correct: 0 | 1;
  readonly outcome: RsvpSpeechTargetOutcome;
}

export interface RsvpSpeechScoringDiagnostics {
  readonly scoringVersion: typeof RSVP_SPEECH_SCORING_VERSION;
  readonly languageCode: string;
  readonly languageProfile: SpeechLanguageProfileId;
  readonly languageProfileVersion: string;
  readonly normalizedTargetWords: readonly string[];
  readonly normalizedTranscript: string;
  readonly transcriptTokenCount: number;
  readonly insertionCount: number;
  readonly fillerCount: number;
  readonly repetitionCount: number;
  readonly selfCorrectionCount: number;
  readonly outOfOrderCount: number;
  readonly omissionCount: number;
  readonly substitutionCount: number;
  readonly splitTranscriptCount: number;
  readonly mergedTargetGroupCount: number;
  readonly phoneticCandidateCount: number;
  readonly alignmentCost: number;
  readonly events: readonly RsvpSpeechScoringEvent[];
}

export interface RsvpSpeechScoringResult {
  readonly responseVector: readonly (0 | 1)[];
  readonly targetResults: readonly RsvpSpeechTargetResult[];
  readonly policy: Readonly<RsvpSpeechScoringPolicy>;
  readonly diagnostics: RsvpSpeechScoringDiagnostics;
}

const validatePolicy = (policy: RsvpSpeechScoringPolicy): void => {
  if (!policy || !["strict", "anyOrder"].includes(policy.wordOrder)) {
    throw new RsvpSpeechScoringError(
      "invalidPolicy",
      "RSVP speech scoring requires a valid word-order policy.",
    );
  }
  if (!["ignore", "markIncorrect"].includes(policy.repetition)) {
    throw new RsvpSpeechScoringError(
      "invalidPolicy",
      "RSVP speech scoring requires a valid repetition policy.",
    );
  }
  if (!["accept", "markIncorrect"].includes(policy.selfCorrection)) {
    throw new RsvpSpeechScoringError(
      "invalidPolicy",
      "RSVP speech scoring requires a valid self-correction policy.",
    );
  }
};

const ensureValidTargets = (
  targets: readonly NormalizedSpeechToken[],
): void => {
  targets.forEach((target) => {
    if (!target.comparisonKey) {
      throw new RsvpSpeechScoringError(
        "invalidTargets",
        "RSVP speech target words cannot normalize to empty text.",
      );
    }
  });
};

const transcriptText = (
  event: SpeechTokenAlignmentEvent,
  transcript: readonly NormalizedSpeechToken[],
): string | null => {
  if (event.transcriptIndices.length === 0) return null;
  return event.transcriptIndices
    .map((index) => transcript[index]?.original ?? "")
    .filter(Boolean)
    .join(" ");
};

const targetEventMap = (
  events: readonly SpeechTokenAlignmentEvent[],
): ReadonlyMap<number, SpeechTokenAlignmentEvent> => {
  const map = new Map<number, SpeechTokenAlignmentEvent>();
  events.forEach((event) => {
    event.targetIndices.forEach((targetIndex) => map.set(targetIndex, event));
  });
  return map;
};

const APPROVED_EXACT_MATCH_KINDS = new Set([
  "exact",
  "joinedTranscript",
  "mergedTargets",
]);

/** Diagnostic similarity never makes a target correct. */
const isApprovedExactMatch = (event: SpeechTokenAlignmentEvent): boolean =>
  event.operation === "match" &&
  event.matchKind !== null &&
  APPROVED_EXACT_MATCH_KINDS.has(event.matchKind);

const similarityThreshold = (left: string, right: string): number =>
  Math.min([...left].length, [...right].length) <= 3 ? 2 / 3 : 0.6;

const classifyInsertions = (
  events: readonly SpeechTokenAlignmentEvent[],
  targets: readonly NormalizedSpeechToken[],
  transcript: readonly NormalizedSpeechToken[],
): RsvpSpeechScoringEvent[] => {
  const targetIndicesByKey = new Map<string, number[]>();
  targets.forEach((target, index) => {
    const indices = targetIndicesByKey.get(target.comparisonKey) ?? [];
    indices.push(index);
    targetIndicesByKey.set(target.comparisonKey, indices);
  });
  const eventIndexForMatchedTarget = new Map<number, number>();
  events.forEach((event, eventIndex) => {
    if (event.operation === "match") {
      event.targetIndices.forEach((targetIndex) =>
        eventIndexForMatchedTarget.set(targetIndex, eventIndex),
      );
    }
  });

  return events.map((event, eventIndex) => {
    if (event.operation !== "insertion") return event;
    const transcriptIndex = event.transcriptIndices[0];
    const insertedToken = transcript[transcriptIndex];
    const namedTargetIndices =
      targetIndicesByKey.get(insertedToken.comparisonKey) ?? [];
    if (namedTargetIndices.length > 0) {
      const matchedBefore = namedTargetIndices
        .map((targetIndex) => ({
          targetIndex,
          eventIndex: eventIndexForMatchedTarget.get(targetIndex),
        }))
        .filter(
          (
            candidate,
          ): candidate is { targetIndex: number; eventIndex: number } =>
            candidate.eventIndex !== undefined &&
            candidate.eventIndex < eventIndex,
        )
        .sort((left, right) => right.eventIndex - left.eventIndex)[0];
      const matchedAfter = namedTargetIndices
        .map((targetIndex) => ({
          targetIndex,
          eventIndex: eventIndexForMatchedTarget.get(targetIndex),
        }))
        .filter(
          (
            candidate,
          ): candidate is { targetIndex: number; eventIndex: number } =>
            candidate.eventIndex !== undefined &&
            candidate.eventIndex > eventIndex,
        )
        .sort((left, right) => left.eventIndex - right.eventIndex)[0];
      const namedTargetIndex =
        matchedBefore?.targetIndex ??
        matchedAfter?.targetIndex ??
        namedTargetIndices.reduce((closest, candidate) => {
          const anchor = event.beforeTargetIndex ?? targets.length;
          return Math.abs(candidate - anchor) < Math.abs(closest - anchor)
            ? candidate
            : closest;
        });
      return {
        ...event,
        insertionKind: matchedBefore ? "repetition" : "outOfOrderTarget",
        relatedTargetIndex: namedTargetIndex,
        relatedTargetIndices: [namedTargetIndex],
      };
    }

    const matchingMergedEventIndex = events.findIndex(
      (candidate) =>
        candidate.matchKind === "mergedTargets" &&
        candidate.transcriptIndices.some(
          (candidateTranscriptIndex) =>
            transcript[candidateTranscriptIndex]?.comparisonKey ===
            insertedToken.comparisonKey,
        ),
    );
    if (matchingMergedEventIndex >= 0) {
      const matchingMergedEvent = events[matchingMergedEventIndex];
      return {
        ...event,
        insertionKind:
          matchingMergedEventIndex < eventIndex
            ? "repetition"
            : "outOfOrderTarget",
        relatedTargetIndex: matchingMergedEvent.targetIndices[0],
        relatedTargetIndices: matchingMergedEvent.targetIndices,
      };
    }

    const nextEvent = events[eventIndex + 1];
    if (
      nextEvent?.operation === "match" &&
      nextEvent.targetIndices.length === 1 &&
      nextEvent.transcriptIndices[0] === transcriptIndex + 1
    ) {
      const relatedTargetIndex = nextEvent.targetIndices[0];
      const target = targets[relatedTargetIndex];
      const similarity = characterSimilarity(
        insertedToken.comparisonKey,
        target.comparisonKey,
      );
      if (
        similarity >=
        similarityThreshold(insertedToken.comparisonKey, target.comparisonKey)
      ) {
        return {
          ...event,
          insertionKind: "selfCorrectionAttempt",
          relatedTargetIndex,
          relatedTargetIndices: [relatedTargetIndex],
          similarityToTarget: similarity,
        };
      }
    }

    return { ...event, insertionKind: "filler" };
  });
};

const scoreWithoutOrder = (
  targets: readonly NormalizedSpeechToken[],
  transcript: readonly NormalizedSpeechToken[],
  alignmentEvents: readonly SpeechTokenAlignmentEvent[],
): {
  vector: (0 | 1)[];
  responseTextByTarget: Map<number, string>;
} => {
  const vector: (0 | 1)[] = Array(targets.length).fill(0);
  const responseTextByTarget = new Map<number, string>();
  const usedTranscriptIndices = new Set<number>();
  targets.forEach((target, targetIndex) => {
    const directIndex = transcript.findIndex(
      (token, transcriptIndex) =>
        !usedTranscriptIndices.has(transcriptIndex) &&
        token.comparisonKey === target.comparisonKey,
    );
    if (directIndex < 0) return;
    vector[targetIndex] = 1;
    usedTranscriptIndices.add(directIndex);
    responseTextByTarget.set(targetIndex, transcript[directIndex].original);
  });
  alignmentEvents.forEach((event) => {
    if (!isApprovedExactMatch(event) || event.matchKind === "exact") {
      return;
    }
    if (
      event.targetIndices.some((targetIndex) => vector[targetIndex] === 1) ||
      event.transcriptIndices.some((transcriptIndex) =>
        usedTranscriptIndices.has(transcriptIndex),
      )
    ) {
      return;
    }
    const responseText = transcriptText(event, transcript);
    if (responseText === null) return;
    event.transcriptIndices.forEach((transcriptIndex) =>
      usedTranscriptIndices.add(transcriptIndex),
    );
    event.targetIndices.forEach((targetIndex) => {
      vector[targetIndex] = 1;
      responseTextByTarget.set(targetIndex, responseText);
    });
  });
  return { vector, responseTextByTarget };
};

export const scoreRsvpSpeechResponse = (
  input: RsvpSpeechScoringInput,
): RsvpSpeechScoringResult => {
  if (!Array.isArray(input.targetWords) || input.targetWords.length === 0) {
    throw new RsvpSpeechScoringError(
      "invalidTargets",
      "RSVP speech scoring requires at least one target word.",
    );
  }
  validatePolicy(input.policy);
  const targets = input.targetWords.map((target) =>
    normalizeSpeechToken(target, input.languageCode),
  );
  ensureValidTargets(targets);
  const tokenization = tokenizeSpeechTranscript(
    input.transcript,
    input.languageCode,
  );
  const transcript = tokenization.tokens;
  if (transcript.length === 0) {
    throw new RsvpSpeechScoringError(
      "emptyTranscript",
      "RSVP speech scoring cannot score an empty transcript.",
    );
  }
  const alignment = alignSpeechTokensToTargets(targets, transcript);
  const events = classifyInsertions(alignment.events, targets, transcript);
  const eventsByTarget = targetEventMap(events);

  let responseTextByTarget = new Map<number, string>();
  let vector: (0 | 1)[];
  if (input.policy.wordOrder === "anyOrder") {
    const unordered = scoreWithoutOrder(targets, transcript, events);
    vector = unordered.vector;
    responseTextByTarget = unordered.responseTextByTarget;
  } else {
    vector = targets.map((_, targetIndex): 0 | 1 => {
      const event = eventsByTarget.get(targetIndex);
      if (!event || !isApprovedExactMatch(event)) return 0;
      const response = transcriptText(event, transcript);
      if (response !== null) responseTextByTarget.set(targetIndex, response);
      return 1;
    });

    events.forEach((event) => {
      if (
        event.insertionKind === "outOfOrderTarget" &&
        event.beforeTargetIndex !== null &&
        event.beforeTargetIndex < vector.length
      ) {
        vector[event.beforeTargetIndex] = 0;
      }
    });
  }

  if (input.policy.repetition === "markIncorrect") {
    events.forEach((event) => {
      if (event.insertionKind === "repetition") {
        event.relatedTargetIndices?.forEach((targetIndex) => {
          vector[targetIndex] = 0;
        });
      }
    });
  }
  if (input.policy.selfCorrection === "markIncorrect") {
    events.forEach((event) => {
      if (
        event.insertionKind === "selfCorrectionAttempt" &&
        event.relatedTargetIndex !== undefined
      ) {
        vector[event.relatedTargetIndex] = 0;
      }
    });
  }

  const outOfOrderTargets = new Set<number>();
  events.forEach((event) => {
    if (event.matchKind === "outOfOrderTarget") {
      event.targetIndices.forEach((targetIndex) =>
        outOfOrderTargets.add(targetIndex),
      );
    }
    if (
      event.insertionKind === "outOfOrderTarget" &&
      event.beforeTargetIndex !== null &&
      event.beforeTargetIndex < targets.length
    ) {
      outOfOrderTargets.add(event.beforeTargetIndex);
    }
  });

  const policyRejectedTargets = new Set<number>();
  events.forEach((event) => {
    const rejected =
      (event.insertionKind === "repetition" &&
        input.policy.repetition === "markIncorrect") ||
      (event.insertionKind === "selfCorrectionAttempt" &&
        input.policy.selfCorrection === "markIncorrect");
    if (rejected) {
      event.relatedTargetIndices?.forEach((targetIndex) =>
        policyRejectedTargets.add(targetIndex),
      );
    }
  });

  const targetResults = targets.map((target, targetIndex) => {
    const event = eventsByTarget.get(targetIndex);
    const correct = vector[targetIndex];
    let outcome: RsvpSpeechTargetOutcome;
    if (policyRejectedTargets.has(targetIndex)) outcome = "rejectedByPolicy";
    else if (correct) outcome = "correct";
    else if (outOfOrderTargets.has(targetIndex)) outcome = "outOfOrder";
    else if (event?.operation === "substitution") outcome = "substitution";
    else outcome = "omission";
    return {
      targetIndex,
      targetWord: input.targetWords[targetIndex],
      responseText:
        responseTextByTarget.get(targetIndex) ??
        (event ? transcriptText(event, transcript) : null),
      correct,
      outcome,
    };
  });

  const insertionEvents = events.filter(
    (event) => event.operation === "insertion",
  );
  return {
    responseVector: vector,
    targetResults,
    policy: { ...input.policy },
    diagnostics: {
      scoringVersion: RSVP_SPEECH_SCORING_VERSION,
      languageCode: tokenization.languageCode,
      languageProfile: tokenization.profileId,
      languageProfileVersion: tokenization.profileVersion,
      normalizedTargetWords: targets.map((target) => target.normalized),
      normalizedTranscript: transcript
        .map((token) => token.normalized)
        .join(" "),
      transcriptTokenCount: transcript.length,
      insertionCount: insertionEvents.length,
      fillerCount: insertionEvents.filter(
        (event) => event.insertionKind === "filler",
      ).length,
      repetitionCount: insertionEvents.filter(
        (event) => event.insertionKind === "repetition",
      ).length,
      selfCorrectionCount: insertionEvents.filter(
        (event) => event.insertionKind === "selfCorrectionAttempt",
      ).length,
      outOfOrderCount: events.filter(
        (event) =>
          event.matchKind === "outOfOrderTarget" ||
          event.insertionKind === "outOfOrderTarget",
      ).length,
      omissionCount: events.filter((event) => event.operation === "omission")
        .length,
      substitutionCount: events.filter(
        (event) => event.operation === "substitution",
      ).length,
      splitTranscriptCount: events.filter(
        (event) => event.matchKind === "joinedTranscript",
      ).length,
      mergedTargetGroupCount: events.filter(
        (event) => event.matchKind === "mergedTargets",
      ).length,
      phoneticCandidateCount: events.filter(
        (event) => event.matchKind === "phoneticCandidate",
      ).length,
      alignmentCost: alignment.totalCost,
      events,
    },
  };
};
