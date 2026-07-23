import { rc, status, viewingDistanceCm } from "./global.js";
import { replacePlaceholders } from "./multiLang.js";
import { Screens } from "./multiple-displays/globals.ts";
import { readi18nPhrases } from "./readPhrases.js";

export function getTrialInfoStr(
  L,
  showCounterBool,
  showViewingDistanceBool,
  currentTrialIndex,
  currentTrialLength,
  currentBlockIndex,
  blockCount,
  viewingDistanceCm_,
  taskKind,
) {
  let res = "";
  if (showCounterBool) {
    if (currentTrialIndex && currentTrialLength) {
      const phrase =
        taskKind === "reading"
          ? "T_counterReadingPageBlock"
          : "T_counterTrialBlock";
      res = replacePlaceholders(
        readi18nPhrases(phrase, L),
        currentTrialIndex,
        currentTrialLength,
        currentBlockIndex,
        blockCount,
      );
    } else {
      // On block instructions, just show block#
      res = replacePlaceholders(
        readi18nPhrases("T_counterBlock", L),
        currentBlockIndex,
        blockCount,
      );
    }
  }

  if (showViewingDistanceBool) {
    viewingDistanceCm.current = rc.viewingDistanceCm
      ? rc.viewingDistanceCm.value
      : viewingDistanceCm.desired;
    Screens[0].viewingDistanceCm = viewingDistanceCm.current;
    Screens[0].nearestPointXYZPx =
      rc.improvedDistanceTrackingData !== undefined
        ? rc.improvedDistanceTrackingData.nearestXYPx
        : Screens[0].nearestPointXYZPx;

    res +=
      " " +
      replacePlaceholders(
        readi18nPhrases("T_counterCm", L),
        viewingDistanceCm.current?.toFixed(1) || viewingDistanceCm.current,
      );
  }

  return res;
}

// Wall-clock throttle: first call always paints, then at most once per
// periodMs, regardless of frame phase.
let lastUpdateMs = -Infinity;
const periodMs = 500;

// Force the next liveUpdateTrialCounter call to paint (call at block start).
export const resetTrialCounterThrottle = () => {
  lastUpdateMs = -Infinity;
};

export const liveUpdateTrialCounter = (
  L,
  showCounterBool,
  showViewingDistanceBool,
  currentTrialIndex,
  currentTrialLength,
  currentBlockIndex,
  blockCount,
  viewingDistanceCm,
  taskKind,
  trialCounterStim,
) => {
  const nowMs = performance.now();
  if (nowMs - lastUpdateMs >= periodMs) {
    lastUpdateMs = nowMs;
    trialCounterStim.setText(
      getTrialInfoStr(
        L,
        showCounterBool,
        showViewingDistanceBool,
        currentTrialIndex,
        currentTrialLength,
        currentBlockIndex,
        blockCount,
        viewingDistanceCm,
        taskKind,
      ),
    );
  }
};

/// Update trial counters
// Always called at the start of a trial,
// to increment our count of trials attempted.
export const incrementTrialsAttempted = (BC) => {
  const prev = status.nthTrialAttemptedByCondition.get(BC);
  status.nthTrialAttemptedByCondition.set(BC, prev + 1);
};
// Potentially called at the end of a trial, to increment
// our count of trials completed successfully,
// ie given to QUEST
export const incrementTrialsCompleted = (BC, paramReader) => {
  const prev = status.nthTrialByCondition.get(BC);
  status.nthTrialByCondition.set(BC, prev + 1);
  // TODO can this !rsvp&!repeated clause be removed?
  if (
    !["rsvpReading", "repeatedLetters", "image"].includes(
      paramReader.read("targetKind", BC),
    )
  )
    status.trialCompleted_thisBlock++;
};
