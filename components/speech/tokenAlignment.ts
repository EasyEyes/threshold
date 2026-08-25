import {
  speechTokenSplitMatchKind,
  type NormalizedSpeechToken,
  type SpeechTokenSplitMatchKind,
} from "./textNormalization";

export type SpeechTokenAlignmentOperation =
  | "match"
  | "substitution"
  | "omission"
  | "insertion";

export type SpeechTokenAlignmentMatchKind =
  | "exact"
  | "joinedTranscript"
  | "mergedTargets"
  | "phoneticCandidate"
  | "outOfOrderTarget"
  | "unrelated"
  | null;

export interface SpeechTokenAlignmentEvent {
  readonly operation: SpeechTokenAlignmentOperation;
  readonly matchKind: SpeechTokenAlignmentMatchKind;
  readonly targetIndex: number | null;
  readonly targetIndices: readonly number[];
  readonly transcriptIndices: readonly number[];
  readonly beforeTargetIndex: number | null;
  readonly boundaryMatchKind?: SpeechTokenSplitMatchKind;
  readonly cost: number;
}

export interface SpeechTokenAlignmentResult {
  readonly events: readonly SpeechTokenAlignmentEvent[];
  readonly totalCost: number;
}

type BacktrackOperation =
  | "diagonal"
  | "omission"
  | "insertion"
  | "joinedTranscript"
  | "mergedTargets";

interface BacktrackDecision {
  readonly operation: BacktrackOperation;
  readonly matchKind: SpeechTokenAlignmentMatchKind;
  readonly transcriptTokenCount: number;
  readonly targetTokenCount?: number;
  readonly boundaryMatchKind?: SpeechTokenSplitMatchKind;
  readonly stepCost: number;
}

const OMISSION_COST = 1;
const INSERTION_COST = 1;
const OUT_OF_ORDER_TARGET_COST = 0.4;
const PHONETIC_CANDIDATE_COST = 0.8;
const UNRELATED_SUBSTITUTION_COST = 2.1;
const JOINED_TRANSCRIPT_COST = 0.05;
const MERGED_TARGETS_COST = 0.05;
const MAX_JOINED_TRANSCRIPT_TOKENS = 3;
const MAX_MERGED_TARGET_TOKENS = 3;

const targetIndexLookup = (
  targets: readonly NormalizedSpeechToken[],
): ReadonlyMap<string, readonly number[]> => {
  const mutable = new Map<string, number[]>();
  targets.forEach((target, index) => {
    const indexes = mutable.get(target.comparisonKey) ?? [];
    indexes.push(index);
    mutable.set(target.comparisonKey, indexes);
  });
  return mutable;
};

const substitution = (
  target: NormalizedSpeechToken,
  transcript: NormalizedSpeechToken,
  targetIndex: number,
  targetIndexesByKey: ReadonlyMap<string, readonly number[]>,
): Pick<BacktrackDecision, "matchKind" | "stepCost"> => {
  if (target.comparisonKey === transcript.comparisonKey) {
    return { matchKind: "exact", stepCost: 0 };
  }
  const matchingTargetIndexes =
    targetIndexesByKey.get(transcript.comparisonKey) ?? [];
  if (matchingTargetIndexes.some((index) => index !== targetIndex)) {
    return {
      matchKind: "outOfOrderTarget",
      stepCost: OUT_OF_ORDER_TARGET_COST,
    };
  }
  const transcriptPhoneticKeys = new Set(transcript.phoneticKeys);
  if (target.phoneticKeys.some((key) => transcriptPhoneticKeys.has(key))) {
    return {
      matchKind: "phoneticCandidate",
      stepCost: PHONETIC_CANDIDATE_COST,
    };
  }
  return {
    matchKind: "unrelated",
    stepCost: UNRELATED_SUBSTITUTION_COST,
  };
};

const joinedTranscriptMatchesTarget = (
  target: NormalizedSpeechToken,
  transcriptParts: readonly NormalizedSpeechToken[],
): SpeechTokenSplitMatchKind | null =>
  speechTokenSplitMatchKind(target, transcriptParts);

const mergedTargetsMatchTranscript = (
  targetParts: readonly NormalizedSpeechToken[],
  transcript: NormalizedSpeechToken,
  targetIndexesByKey: ReadonlyMap<string, readonly number[]>,
  mergedTargetKeyCounts: ReadonlyMap<string, number>,
): boolean =>
  targetParts.length >= 2 &&
  transcript.profileId === "fa" &&
  targetParts.every((target) => target.profileId === "fa") &&
  targetParts.map((target) => target.comparisonKey).join("") ===
    transcript.comparisonKey &&
  !targetIndexesByKey.has(transcript.comparisonKey) &&
  mergedTargetKeyCounts.get(transcript.comparisonKey) === 1;

const mergedTargetKeyCountLookup = (
  targets: readonly NormalizedSpeechToken[],
): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();
  for (let start = 0; start < targets.length; start += 1) {
    for (
      let count = 2;
      count <= MAX_MERGED_TARGET_TOKENS && start + count <= targets.length;
      count += 1
    ) {
      const parts = targets.slice(start, start + count);
      if (parts.some((target) => target.profileId !== "fa")) continue;
      const key = parts.map((target) => target.comparisonKey).join("");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
};

/**
 * Produces a deterministic monotonic alignment. Exact matches are free,
 * tokens naming another target position become substitutions, and unrelated
 * speech remains an insertion instead of being forced onto a target.
 */
export const alignSpeechTokensToTargets = (
  targets: readonly NormalizedSpeechToken[],
  transcript: readonly NormalizedSpeechToken[],
): SpeechTokenAlignmentResult => {
  const targetCount = targets.length;
  const transcriptCount = transcript.length;
  const targetIndexesByKey = targetIndexLookup(targets);
  const mergedTargetKeyCounts = mergedTargetKeyCountLookup(targets);
  const costs = Array.from({ length: targetCount + 1 }, () =>
    Array<number>(transcriptCount + 1).fill(Number.POSITIVE_INFINITY),
  );
  const backtrack = Array.from({ length: targetCount + 1 }, () =>
    Array<BacktrackDecision | undefined>(transcriptCount + 1).fill(undefined),
  );

  costs[0][0] = 0;
  for (let targetIndex = 1; targetIndex <= targetCount; targetIndex += 1) {
    costs[targetIndex][0] = targetIndex * OMISSION_COST;
    backtrack[targetIndex][0] = {
      operation: "omission",
      matchKind: null,
      transcriptTokenCount: 0,
      stepCost: OMISSION_COST,
    };
  }
  for (
    let transcriptIndex = 1;
    transcriptIndex <= transcriptCount;
    transcriptIndex += 1
  ) {
    costs[0][transcriptIndex] = transcriptIndex * INSERTION_COST;
    backtrack[0][transcriptIndex] = {
      operation: "insertion",
      matchKind: null,
      transcriptTokenCount: 1,
      stepCost: INSERTION_COST,
    };
  }

  for (let targetIndex = 1; targetIndex <= targetCount; targetIndex += 1) {
    for (
      let transcriptIndex = 1;
      transcriptIndex <= transcriptCount;
      transcriptIndex += 1
    ) {
      const diagonal = substitution(
        targets[targetIndex - 1],
        transcript[transcriptIndex - 1],
        targetIndex - 1,
        targetIndexesByKey,
      );
      const diagonalCost =
        costs[targetIndex - 1][transcriptIndex - 1] + diagonal.stepCost;
      const omissionCost =
        costs[targetIndex - 1][transcriptIndex] + OMISSION_COST;
      const insertionCost =
        costs[targetIndex][transcriptIndex - 1] + INSERTION_COST;

      let bestCost = diagonalCost;
      let bestDecision: BacktrackDecision = {
        operation: "diagonal",
        matchKind: diagonal.matchKind,
        transcriptTokenCount: 1,
        stepCost: diagonal.stepCost,
      };

      if (omissionCost < bestCost) {
        bestCost = omissionCost;
        bestDecision = {
          operation: "omission",
          matchKind: null,
          transcriptTokenCount: 0,
          stepCost: OMISSION_COST,
        };
      }

      const exactTrailingDuplicate =
        diagonal.matchKind === "exact" &&
        insertionCost === diagonalCost &&
        omissionCost > diagonalCost;
      if (insertionCost < bestCost || exactTrailingDuplicate) {
        bestCost = insertionCost;
        bestDecision = {
          operation: "insertion",
          matchKind: null,
          transcriptTokenCount: 1,
          stepCost: INSERTION_COST,
        };
      }

      for (
        let partCount = 2;
        partCount <= MAX_JOINED_TRANSCRIPT_TOKENS &&
        partCount <= transcriptIndex;
        partCount += 1
      ) {
        const transcriptParts = transcript.slice(
          transcriptIndex - partCount,
          transcriptIndex,
        );
        const boundaryMatchKind = joinedTranscriptMatchesTarget(
          targets[targetIndex - 1],
          transcriptParts,
        );
        if (!boundaryMatchKind) continue;
        const joinedCost =
          costs[targetIndex - 1][transcriptIndex - partCount] +
          JOINED_TRANSCRIPT_COST;
        if (joinedCost < bestCost) {
          bestCost = joinedCost;
          bestDecision = {
            operation: "joinedTranscript",
            matchKind: "joinedTranscript",
            transcriptTokenCount: partCount,
            boundaryMatchKind,
            stepCost: JOINED_TRANSCRIPT_COST,
          };
        }
      }

      for (
        let partCount = 2;
        partCount <= MAX_MERGED_TARGET_TOKENS && partCount <= targetIndex;
        partCount += 1
      ) {
        const targetParts = targets.slice(targetIndex - partCount, targetIndex);
        if (
          !mergedTargetsMatchTranscript(
            targetParts,
            transcript[transcriptIndex - 1],
            targetIndexesByKey,
            mergedTargetKeyCounts,
          )
        ) {
          continue;
        }
        const mergedCost =
          costs[targetIndex - partCount][transcriptIndex - 1] +
          MERGED_TARGETS_COST;
        if (mergedCost < bestCost) {
          bestCost = mergedCost;
          bestDecision = {
            operation: "mergedTargets",
            matchKind: "mergedTargets",
            transcriptTokenCount: 1,
            targetTokenCount: partCount,
            stepCost: MERGED_TARGETS_COST,
          };
        }
      }

      costs[targetIndex][transcriptIndex] = bestCost;
      backtrack[targetIndex][transcriptIndex] = bestDecision;
    }
  }

  const events: SpeechTokenAlignmentEvent[] = [];
  let targetIndex = targetCount;
  let transcriptIndex = transcriptCount;
  while (targetIndex > 0 || transcriptIndex > 0) {
    const decision = backtrack[targetIndex][transcriptIndex];
    if (!decision) throw new Error("Speech token alignment is incomplete.");

    switch (decision.operation) {
      case "diagonal": {
        const resolvedTargetIndex = targetIndex - 1;
        const resolvedTranscriptIndex = transcriptIndex - 1;
        events.unshift({
          operation: decision.matchKind === "exact" ? "match" : "substitution",
          matchKind: decision.matchKind,
          targetIndex: resolvedTargetIndex,
          targetIndices: [resolvedTargetIndex],
          transcriptIndices: [resolvedTranscriptIndex],
          beforeTargetIndex: null,
          cost: decision.stepCost,
        });
        targetIndex -= 1;
        transcriptIndex -= 1;
        break;
      }
      case "joinedTranscript": {
        const resolvedTargetIndex = targetIndex - 1;
        const firstTranscriptIndex =
          transcriptIndex - decision.transcriptTokenCount;
        events.unshift({
          operation: "match",
          matchKind: "joinedTranscript",
          targetIndex: resolvedTargetIndex,
          targetIndices: [resolvedTargetIndex],
          transcriptIndices: Array.from(
            { length: decision.transcriptTokenCount },
            (_, index) => firstTranscriptIndex + index,
          ),
          beforeTargetIndex: null,
          boundaryMatchKind: decision.boundaryMatchKind,
          cost: decision.stepCost,
        });
        targetIndex -= 1;
        transcriptIndex -= decision.transcriptTokenCount;
        break;
      }
      case "mergedTargets": {
        const targetTokenCount = decision.targetTokenCount ?? 0;
        if (targetTokenCount < 2) {
          throw new Error("Merged speech targets are incomplete.");
        }
        const firstTargetIndex = targetIndex - targetTokenCount;
        const resolvedTargetIndices = Array.from(
          { length: targetTokenCount },
          (_, index) => firstTargetIndex + index,
        );
        events.unshift({
          operation: "match",
          matchKind: "mergedTargets",
          targetIndex: firstTargetIndex,
          targetIndices: resolvedTargetIndices,
          transcriptIndices: [transcriptIndex - 1],
          beforeTargetIndex: null,
          cost: decision.stepCost,
        });
        targetIndex -= targetTokenCount;
        transcriptIndex -= 1;
        break;
      }
      case "omission":
        events.unshift({
          operation: "omission",
          matchKind: null,
          targetIndex: targetIndex - 1,
          targetIndices: [targetIndex - 1],
          transcriptIndices: [],
          beforeTargetIndex: null,
          cost: decision.stepCost,
        });
        targetIndex -= 1;
        break;
      case "insertion":
        events.unshift({
          operation: "insertion",
          matchKind: null,
          targetIndex: null,
          targetIndices: [],
          transcriptIndices: [transcriptIndex - 1],
          beforeTargetIndex: targetIndex,
          cost: decision.stepCost,
        });
        transcriptIndex -= 1;
        break;
    }
  }

  return {
    events,
    totalCost: costs[targetCount][transcriptCount],
  };
};

export const characterSimilarity = (left: string, right: string): number => {
  const leftCharacters = [...left];
  const rightCharacters = [...right];
  if (leftCharacters.join("") === rightCharacters.join("")) return 1;
  if (leftCharacters.length === 0 || rightCharacters.length === 0) return 0;

  let previous = Array.from(
    { length: rightCharacters.length + 1 },
    (_, index) => index,
  );
  let current = Array<number>(rightCharacters.length + 1).fill(0);
  for (let leftIndex = 1; leftIndex <= leftCharacters.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (
      let rightIndex = 1;
      rightIndex <= rightCharacters.length;
      rightIndex += 1
    ) {
      current[rightIndex] =
        leftCharacters[leftIndex - 1] === rightCharacters[rightIndex - 1]
          ? previous[rightIndex - 1]
          : 1 +
            Math.min(
              previous[rightIndex - 1],
              previous[rightIndex],
              current[rightIndex - 1],
            );
    }
    [previous, current] = [current, previous];
  }
  return (
    1 -
    previous[rightCharacters.length] /
      Math.max(leftCharacters.length, rightCharacters.length)
  );
};
