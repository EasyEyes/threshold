import {
  status,
  viewingDistanceDesiredCm,
  viewingDistanceCm,
  preStimulus,
  rc,
  fixationConfig,
} from "./global";
import { logger } from "./utils";

/**
 * Set an interval to handle viewing distance changing during prestimulus (ie trialInstructionRoutineBegin),
 * ie regenerate stimuli if viewing distance has significantly changed.
 */
export const setPreStimulusRerunInterval = (
  paramReader,
  trialInstructionRoutineBegin,
  snapshot
) => {
  // TODO does RC provide callbacks, ie to do this every time the nudger activates?
  /**
   * NOTES
   * How to handle the variable viewing distance of the participant during trialInstructionRoutine?
   * We generate all our (ie viewing distance dependent) stimuli during trialInstructionRoutineBegin,
   * but we continue to track/nudge viewing distance during trialInstructionRoutineEachFrame.
   *
   * Early on we chose to do all our heavy/slow processing (ie generating stimuli) at that earlier
   * point (trialInstructionRoutineBegin) in order to minimize delay between fixation click and the
   * start of fixation.
   *
   * This means, however, that stimuli is being generated at the very start of the trial instructions,
   * instead of when fixation is clicked. Stimuli therefore does not reflect distance at actual
   * start of the trial.
   */

  // criterion for change in viewing distance to trigger rerun -- use the same criteria as the nudger
  if (!preStimulus.interval) {
    const rerunIntervalMs = 50;
    preStimulus.running = true;
    preStimulus.interval = setInterval(async () => {
      // Update viewing distance
      const nominalViewingDistance = viewingDistanceDesiredCm.current;
      viewingDistanceCm.current = rc.viewingDistanceCm
        ? rc.viewingDistanceCm.value
        : viewingDistanceCm.current;
      let allowedRatio = Math.max(
        paramReader.read("viewingDistanceAllowedRatio", status.block_condition),
        0.000000001
      );
      let bounds;
      if (allowedRatio > 1) {
        bounds = [
          nominalViewingDistance / allowedRatio,
          nominalViewingDistance * allowedRatio,
        ];
      } else {
        bounds = [
          nominalViewingDistance * allowedRatio,
          nominalViewingDistance / allowedRatio,
        ];
      }
      const significantChangeBool =
        viewingDistanceCm.current < bounds[0] ||
        viewingDistanceCm.current > bounds[1];
      // If not already in progress, rerun trialInstructionRoutineBegin
      if (!preStimulus.running && significantChangeBool) {
        preStimulus.running = true;
        fixationConfig.preserveOffset = true;
        const startTime = performance.now();
        await trialInstructionRoutineBegin(snapshot)();
        const stopTime = performance.now();
        const duration = stopTime - startTime;
        logger("!. Done rerunning.", duration);
        fixationConfig.preserveOffset = false;
        preStimulus.running = false;
      }
    }, rerunIntervalMs);
  }
};
