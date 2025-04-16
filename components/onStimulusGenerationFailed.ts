import type {
  StimulusGenerationFailedInput,
  StimulusGenerationFailedInputLetter,
} from "./stimulus";
import { warning } from "./errorHandling.js";
import { skipTrial } from "./skipTrialOrBlock";
import { logLetterParamsToFormspree } from "./letter.js";
import { getFormspreeLoggingInfoLetter } from "./misc";

export const onStimulusGenerationFailed = (
  targetKind: string,
  input: StimulusGenerationFailedInput,
) => {
  const experimentPointInTime = "onStimulusGenerated";
  warning(
    `Failed to get viable stimulus (${experimentPointInTime} failed), skipping trial. Error: ${input.error}`,
  );
  skipTrial();

  switch (targetKind) {
    case "letter":
      const {
        error,
        level,
        debug,
        screen,
        block_condition,
        reader,
        characters,
        viewingDistanceCm,
      } = input as StimulusGenerationFailedInputLetter;
      warning(
        `Failed to get viable stimulus (restrictLevelAfterFixation failed), skipping trial. level: ${level}. Error: ${error}`,
      );
      if (!debug) {
        logLetterParamsToFormspree(
          getFormspreeLoggingInfoLetter(
            block_condition,
            reader,
            characters,
            screen,
            viewingDistanceCm,
          ),
        );
      }
      screen.fixationConfig.fixationPosAfterDelay = undefined;
    default:
      break;
  }
};
